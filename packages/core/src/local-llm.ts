import {
  type AgentMessage,
  type AgentToolCall,
  JsonValueSchema
} from "@playcraft/contracts";
import { bamlBridge } from "./baml-bridge.js";
import type {
  BamlAgentMessage,
  BamlAgentToolDescriptor,
  BamlAssembleGameRequest,
  BamlAssembleGameResponse
} from "./baml-types.js";

/**
 * Manifest stamped on every `LocalInferenceEngine` instance. The BAML bridge
 * is the wired runtime; the fields below describe its surface to the agent
 * loop without coupling to any third-party schema library.
 */
export interface LocalInferenceEngineManifest {
  readonly engineId: string;
  readonly displayName: string;
  readonly version: string;
  readonly capabilityTags: readonly string[];
  readonly offline: true;
  readonly localOnly: true;
  readonly maxContextTokens: number;
  readonly supportsStructuredJson: true;
  readonly supportsImageInput: true;
  readonly supportsToolCalls: true;
  readonly outboxModule: "@playcraft/core/local-llm.js";
}

/**
 * Prompt envelope passed to a local inference engine. The engine emits
 * structured JSON tool calls constrained by the BAML schema (see
 * `baml_src/assemble_game.baml`) or a final message declaring the loop done.
 */
export interface AgentPrompt {
  readonly engine: string;
  readonly systemPrompt: string;
  readonly messages: readonly AgentMessage[];
  readonly availableTools: readonly AgentToolDescriptor[];
  readonly temperature: number;
  readonly maxSteps: number;
}

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

export type AgentInferenceResult =
  | { readonly kind: "tool-call"; readonly call: AgentToolCall }
  | { readonly kind: "final"; readonly message: string; readonly bundleId?: string };

/**
 * The deterministic interface every local inference engine must satisfy.
 * Implementations must:
 *   - be local-only / offline
 *   - emit JSON-constrained tool calls via the BAML bridge
 *   - never call out to a network
 *   - never persist state outside the call
 */
export interface LocalInferenceEngine {
  readonly manifest: LocalInferenceEngineManifest;
  infer(prompt: AgentPrompt): Promise<AgentInferenceResult>;
}

export function defaultLocalInferenceEngineManifest(): LocalInferenceEngineManifest {
  return {
    engineId: "lfm2.5-vl-450m-extract",
    displayName: "LiquidAI LFM2.5-VL-450M Extract (BAML local bridge)",
    version: "1.0.0",
    capabilityTags: ["llm:local", "llm:extract", "llm:tool-call", "llm:image-input"],
    offline: true,
    localOnly: true,
    maxContextTokens: 8192,
    supportsStructuredJson: true,
    supportsImageInput: true,
    supportsToolCalls: true,
    outboxModule: "@playcraft/core/local-llm.js"
  };
}

/**
 * Wired production engine. Delegates every `infer` call to the BAML bridge
 * (see `baml_src/assemble_game.baml`). When the BAML runtime cannot reach
 * the configured Ollama client, the bridge rejects with a clear error that
 * the agent loop surfaces to the studio UI as a `final` message.
 */
export class MoonshineStreamingCpuEngine implements LocalInferenceEngine {
  readonly manifest: LocalInferenceEngineManifest;

  constructor(manifest?: LocalInferenceEngineManifest) {
    this.manifest = manifest ?? defaultLocalInferenceEngineManifest();
  }

  async infer(prompt: AgentPrompt): Promise<AgentInferenceResult> {
    const request = buildBamlAssembleGameRequest(prompt);
    let response: BamlAssembleGameResponse;
    try {
      response = await bamlBridge.assembleGame(request);
    } catch (error) {
      return {
        kind: "final",
        message: `lfm2.5-vl-450m-extract bridge error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
    return interpretBamlResponse(response);
  }
}

export function buildBamlAssembleGameRequest(prompt: AgentPrompt): BamlAssembleGameRequest {
  return {
    system_prompt: prompt.systemPrompt,
    messages: prompt.messages.map(toBamlMessage),
    tools: prompt.availableTools.map(toBamlToolDescriptor),
    max_steps: prompt.maxSteps,
    temperature: prompt.temperature
  };
}

export function interpretBamlResponse(response: BamlAssembleGameResponse): AgentInferenceResult {
  if (response.kind === "final") {
    return {
      kind: "final",
      message: response.message ?? ""
    };
  }
  const toolCall = response.tool_call;
  if (!toolCall) {
    return { kind: "final", message: "" };
  }
  let parsedArguments: Record<string, unknown> = {};
  if (toolCall.arguments) {
    try {
      const decoded: unknown = JSON.parse(toolCall.arguments);
      if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
        parsedArguments = decoded as Record<string, unknown>;
      }
    } catch {
      parsedArguments = {};
    }
  }
  return {
    kind: "tool-call",
    call: {
      callId: toolCall.call_id,
      toolName: toolCall.tool_name,
      arguments: JsonValueSchema.parse(parsedArguments) as Record<string, never>
    }
  };
}

function toBamlMessage(message: AgentMessage): BamlAgentMessage {
  return {
    role: message.role,
    content: message.content,
    ...(message.toolCallId !== undefined ? { tool_call_id: message.toolCallId } : {}),
    ...(message.toolName !== undefined ? { tool_name: message.toolName } : {})
  };
}

function toBamlToolDescriptor(tool: AgentToolDescriptor): BamlAgentToolDescriptor {
  return {
    tool_name: tool.toolName,
    display_name: tool.displayName,
    description: tool.description,
    arguments_schema: JSON.stringify(tool.argumentsSchema),
    capability_tags: [...tool.capabilityTags]
  };
}

export { AgentStepSchema, AgentMessageRoleSchema } from "@playcraft/contracts";
export type { AgentMessage, AgentStep, PlaycraftAgentTranscript } from "@playcraft/contracts";