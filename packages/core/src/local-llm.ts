import { z } from "zod";
import {
  AgentMessageRoleSchema,
  AgentStepSchema,
  LocalInferenceEngineManifestSchema,
  MOONSHINE_STREAMING_CPU_ENGINE_ID,
  type AgentMessage,
  type AgentStep,
  type LocalInferenceEngineId,
  type LocalInferenceEngineManifest,
  type PlaycraftAgentTranscript
} from "@playcraft/contracts";

/**
 * Prompt envelope passed to a local inference engine. The engine is expected
 * to emit structured JSON tool calls (validated by Outlines) or a final
 * message. The agent loop is the only caller; tools never receive this type.
 */
export interface AgentPrompt {
  readonly engine: LocalInferenceEngineId;
  readonly systemPrompt: string;
  readonly messages: readonly AgentMessage[];
  readonly availableTools: readonly AgentToolDescriptor[];
  readonly temperature: number;
  readonly maxSteps: number;
}

/**
 * A tool descriptor the engine can choose to call. Mirrors the public contract
 * shape of `BuilderToolDefinition` so the agent loop can map a tool call back
 * to a typed deterministic tool execution.
 */
export interface AgentToolDescriptor {
  readonly toolName: string;
  readonly displayName: string;
  readonly description: string;
  readonly argumentsSchema: AgentToolArgumentsSchema;
  readonly capabilityTags: readonly string[];
}

export interface AgentToolField {
  readonly type: "string" | "number" | "boolean" | "object" | "array" | "record";
  readonly required: boolean;
  readonly allowedValues?: readonly (string | number | boolean | null)[];
  readonly fields?: Readonly<Record<string, AgentToolField>>;
}

export type AgentToolArgumentsSchema = Readonly<Record<string, AgentToolField>>;

/**
 * Result of one engine invocation. Either a tool call to be executed by the
 * agent loop, or a final message declaring the loop done.
 */
export type AgentInferenceResult =
  | { readonly kind: "tool-call"; readonly call: import("@playcraft/contracts").AgentToolCall }
  | { readonly kind: "final"; readonly message: string; readonly bundleId?: string };

/**
 * The deterministic interface every local inference engine must satisfy.
 *
 * Implementations:
 *   - `MoonshineStreamingCpuEngine` (default, wired LFM2.5-VL-450M-Extract)
 *   - `StubLocalInferenceEngine` (tests, deterministic mock)
 *
 * Implementations must:
 *   - be local-only / offline
 *   - emit JSON-constrained tool calls via Outlines (or equivalent)
 *   - never call out to a network
 *   - never persist state outside the call
 */
export interface LocalInferenceEngine {
  readonly manifest: LocalInferenceEngineManifest;
  infer(prompt: AgentPrompt): Promise<AgentInferenceResult>;
}

/**
 * Stub implementation for tests and offline development. Returns a
 * deterministic tool call or final message based on the first user message.
 */
export class StubLocalInferenceEngine implements LocalInferenceEngine {
  readonly manifest: LocalInferenceEngineManifest;

  constructor(manifest?: LocalInferenceEngineManifest) {
    this.manifest = manifest ?? defaultStubEngineManifest();
  }

  async infer(prompt: AgentPrompt): Promise<AgentInferenceResult> {
    const lastUser = [...prompt.messages].reverse().find((message) => message.role === "user");
    const text = lastUser?.content ?? "";
    if (text.startsWith("/final ")) {
      return { kind: "final", message: text.slice("/final ".length) };
    }
    const toolName = prompt.availableTools[0]?.toolName;
    if (!toolName) {
      return { kind: "final", message: "no tools available" };
    }
    return {
      kind: "tool-call",
      call: {
        callId: `call.${Date.now().toString(36)}`,
        toolName,
        arguments: { text }
      }
    };
  }
}

export function defaultStubEngineManifest(): LocalInferenceEngineManifest {
  return LocalInferenceEngineManifestSchema.parse({
    schemaVersion: "playcraft.v1",
    id: "local-inference-engine.stub",
    version: "1.0.0",
    kind: "local-inference-engine",
    engineId: "stub",
    displayName: "Stub Local Inference Engine (tests)",
    capabilityTags: ["llm:local", "llm:stub"],
    offline: true,
    localOnly: true,
    maxContextTokens: 4096,
    supportsStructuredJson: true,
    supportsImageInput: false,
    supportsToolCalls: true,
    outboxModule: "@playcraft/core/local-llm.js"
  });
}

export const AGENT_STUB_ENGINE_ID = "stub";

/**
 * The wired production engine. Currently a stub that returns a deterministic
 * tool call. Real Moonshine Streaming CPU wiring with LFM2.5-VL-450M-Extract
 * will replace the `infer` implementation when the runtime is available.
 */
export class MoonshineStreamingCpuEngine implements LocalInferenceEngine {
  readonly manifest: LocalInferenceEngineManifest;

  constructor(manifest?: LocalInferenceEngineManifest) {
    this.manifest = manifest ?? defaultMoonshineStreamingCpuEngineManifest();
  }

  async infer(_prompt: AgentPrompt): Promise<AgentInferenceResult> {
    return {
      kind: "final",
      message: `${MOONSHINE_STREAMING_CPU_ENGINE_ID} runtime not yet wired; use StubLocalInferenceEngine for development`
    };
  }
}

export function defaultMoonshineStreamingCpuEngineManifest(): LocalInferenceEngineManifest {
  return LocalInferenceEngineManifestSchema.parse({
    schemaVersion: "playcraft.v1",
    id: MOONSHINE_STREAMING_CPU_ENGINE_ID,
    version: "1.0.0",
    kind: "local-inference-engine",
    engineId: "lfm2.5-vl-450m-extract",
    displayName: "LiquidAI LFM2.5-VL-450M Extract via Moonshine Streaming CPU",
    capabilityTags: ["llm:local", "llm:extract", "llm:tool-call", "llm:image-input"],
    offline: true,
    localOnly: true,
    maxContextTokens: 8192,
    supportsStructuredJson: true,
    supportsImageInput: true,
    supportsToolCalls: true,
    outboxModule: "@playcraft/core/local-llm.js"
  });
}

/**
 * Build the Outlines-compatible JSON schema descriptor for a tool's arguments.
 * Outlines uses this to constrain generation so the engine can only emit
 * argument values that validate against the tool's `argumentsSchema`.
 */
export function outlinesJsonSchemaForToolArguments(
  schema: AgentToolArgumentsSchema
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [name, field] of Object.entries(schema)) {
    properties[name] = outlinesJsonSchemaForField(field);
    if (field.required) required.push(name);
  }
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required
  };
}

function outlinesJsonSchemaForField(field: AgentToolField): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  switch (field.type) {
    case "string":
      base.type = "string";
      break;
    case "number":
      base.type = "number";
      break;
    case "boolean":
      base.type = "boolean";
      break;
    case "array":
      base.type = "array";
      base.items = { type: "string" };
      break;
    case "record":
      base.type = "object";
      base.additionalProperties = true;
      break;
    case "object":
      base.type = "object";
      base.additionalProperties = false;
      if (field.fields) {
        const subProperties: Record<string, unknown> = {};
        const subRequired: string[] = [];
        for (const [subName, subField] of Object.entries(field.fields)) {
          subProperties[subName] = outlinesJsonSchemaForField(subField);
          if (subField.required) subRequired.push(subName);
        }
        base.properties = subProperties;
        if (subRequired.length > 0) base.required = subRequired;
      }
      break;
  }
  if (field.allowedValues && field.allowedValues.length > 0) {
    base.enum = field.allowedValues;
  }
  return base;
}

/**
 * Re-export the schemas for convenience.
 */
export { AgentMessageRoleSchema, AgentStepSchema };
export type { AgentMessage, AgentStep, PlaycraftAgentTranscript };
export { z };