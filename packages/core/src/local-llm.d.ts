import { z } from "zod";
import { AgentMessageRoleSchema, AgentStepSchema, type AgentMessage, type AgentStep, type LocalInferenceEngineId, type LocalInferenceEngineManifest, type PlaycraftAgentTranscript } from "@playcraft/contracts";
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
export type AgentInferenceResult = {
    readonly kind: "tool-call";
    readonly call: import("@playcraft/contracts").AgentToolCall;
} | {
    readonly kind: "final";
    readonly message: string;
    readonly bundleId?: string;
};
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
export declare class StubLocalInferenceEngine implements LocalInferenceEngine {
    readonly manifest: LocalInferenceEngineManifest;
    constructor(manifest?: LocalInferenceEngineManifest);
    infer(prompt: AgentPrompt): Promise<AgentInferenceResult>;
}
export declare function defaultStubEngineManifest(): LocalInferenceEngineManifest;
export declare const AGENT_STUB_ENGINE_ID = "stub";
/**
 * The wired production engine. Currently a stub that returns a deterministic
 * tool call. Real Moonshine Streaming CPU wiring with LFM2.5-VL-450M-Extract
 * will replace the `infer` implementation when the runtime is available.
 */
export declare class MoonshineStreamingCpuEngine implements LocalInferenceEngine {
    readonly manifest: LocalInferenceEngineManifest;
    constructor(manifest?: LocalInferenceEngineManifest);
    infer(_prompt: AgentPrompt): Promise<AgentInferenceResult>;
}
export declare function defaultMoonshineStreamingCpuEngineManifest(): LocalInferenceEngineManifest;
/**
 * Build the Outlines-compatible JSON schema descriptor for a tool's arguments.
 * Outlines uses this to constrain generation so the engine can only emit
 * argument values that validate against the tool's `argumentsSchema`.
 */
export declare function outlinesJsonSchemaForToolArguments(schema: AgentToolArgumentsSchema): Record<string, unknown>;
/**
 * Re-export the schemas for convenience.
 */
export { AgentMessageRoleSchema, AgentStepSchema };
export type { AgentMessage, AgentStep, PlaycraftAgentTranscript };
export { z };
//# sourceMappingURL=local-llm.d.ts.map