import { type BuilderToolDefinition, type PlaycraftAgentTranscript } from "@playcraft/contracts";
import type { AgentToolDescriptor, LocalInferenceEngine } from "./local-llm.js";
export interface AgentToolExecutor {
    readonly toolName: string;
    execute(arguments_: Record<string, unknown>, context: AgentToolExecutionContext): Promise<unknown>;
}
export interface AgentToolExecutionContext {
    readonly requestId: string;
    readonly stepCount: number;
}
export interface AgentLoopOptions {
    readonly engine: LocalInferenceEngine;
    readonly systemPrompt: string;
    readonly tools: readonly AgentToolExecutor[];
    readonly maxSteps?: number;
    readonly temperature?: number;
}
export interface AgentLoopResult {
    readonly transcript: PlaycraftAgentTranscript;
    readonly finished: boolean;
    readonly finalMessage: string | null;
}
/**
 * The deterministic agent loop. Drives the local LLM through tool calls until
 * the engine emits a `final` result or the step budget is exhausted.
 *
 * Invariants:
 *   - The engine never sees raw tool output; only `ok`/`error`/`unsupported`
 *     status plus a JSON-serializable value or string error.
 *   - Tool execution is synchronous from the engine's perspective: the engine
 *     receives one assistant message per tool call, with a matching
 *     tool message carrying the result.
 *   - The transcript is append-only; the loop never rewinds.
 *   - Tools never call the engine directly; tools return values, the loop
 *     emits the next inference step.
 */
export declare class AgentLoop {
    private readonly engine;
    private readonly systemPrompt;
    private readonly toolsByName;
    private readonly maxSteps;
    private readonly temperature;
    constructor(options: AgentLoopOptions);
    run(requestId: string, userMessage: string): Promise<AgentLoopResult>;
    private buildPrompt;
    private executeTool;
}
export declare function agentLoopToolsFromBuilderDefinitions(definitions: readonly BuilderToolDefinition[]): AgentToolDescriptor[];
//# sourceMappingURL=agent-loop.d.ts.map