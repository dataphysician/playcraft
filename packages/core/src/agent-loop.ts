import {
  AgentStepSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  StableIdSchema,
  type AgentMessage,
  type AgentStep,
  type BuilderToolDefinition,
  type PlaycraftAgentTranscript
} from "@playcraft/contracts";
import type { AgentPrompt, AgentToolDescriptor, LocalInferenceEngine } from "./local-llm.js";

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
 * The deterministic local agent loop. Drives the BAML-backed local LLM
 * through tool calls until the engine emits a `final` result or the step
 * budget is exhausted. The loop is purely local — it has no references to
 * remote enrichment sources or paid online assembly. When the local
 * registries cannot satisfy a request, the loop surfaces a `final` message
 * and lets the studio UI prompt the user to escalate to a paid action.
 */
export class AgentLoop {
  private readonly engine: LocalInferenceEngine;
  private readonly systemPrompt: string;
  private readonly toolsByName: ReadonlyMap<string, AgentToolExecutor>;
  private readonly maxSteps: number;
  private readonly temperature: number;

  constructor(options: AgentLoopOptions) {
    this.engine = options.engine;
    this.systemPrompt = options.systemPrompt;
    this.toolsByName = new Map(options.tools.map((tool) => [tool.toolName, tool]));
    this.maxSteps = options.maxSteps ?? 16;
    this.temperature = options.temperature ?? 0;
  }

  async run(requestId: string, userMessage: string): Promise<AgentLoopResult> {
    const steps: AgentStep[] = [];
    const messages: AgentMessage[] = [{ role: "user", content: userMessage }];
    let finished = false;
    let finalMessage: string | null = null;

    for (let stepCount = 0; stepCount < this.maxSteps; stepCount += 1) {
      const result = await this.engine.infer(this.buildPrompt(messages));
      if (result.kind === "final") {
        const step: AgentStep = {
          kind: "final",
          stepId: `step.${requestId}.${stepCount}.final`,
          message: result.message,
          bundleId: result.bundleId,
          emittedAt: new Date().toISOString()
        } as const;
        steps.push(AgentStepSchema.parse(step));
        finished = true;
        finalMessage = result.message;
        break;
      }

      const call = result.call;
      const stepId = `step.${requestId}.${stepCount}.call`;
      steps.push(
        AgentStepSchema.parse({
          kind: "tool-call",
          stepId,
          engine: this.engine.manifest.engineId,
          call,
          emittedAt: new Date().toISOString()
        })
      );
      messages.push({ role: "assistant", content: JSON.stringify(call), toolCallId: call.callId, toolName: call.toolName });

      const toolResult = await this.executeTool(call.toolName, call.arguments, {
        requestId,
        stepCount
      });

      steps.push(
        AgentStepSchema.parse({
          kind: "tool-result",
          stepId: `step.${requestId}.${stepCount}.result`,
          result: toolResult,
          emittedAt: new Date().toISOString()
        })
      );
      messages.push({
        role: "tool",
        content: JSON.stringify(toolResult),
        toolCallId: toolResult.callId,
        toolName: toolResult.toolName
      });
    }

    const transcript: PlaycraftAgentTranscript = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `agent-transcript.${requestId}`,
      version: "1.0.0",
      kind: "agent-transcript",
      engine: this.engine.manifest.engineId,
      engineManifestId: `local-inference-engine.${this.engine.manifest.engineId}`,
      engineManifestVersion: this.engine.manifest.version,
      requestId,
      steps,
      finished,
      ...(finished ? { finishedAt: new Date().toISOString() } : {})
    };

    return { transcript, finished, finalMessage };
  }

  private buildPrompt(messages: AgentMessage[]): AgentPrompt {
    return {
      engine: this.engine.manifest.engineId,
      systemPrompt: this.systemPrompt,
      messages,
      availableTools: [...this.toolsByName.values()].map((tool) => describeTool(tool.toolName, this.toolsByName.get(tool.toolName)!)),
      temperature: this.temperature,
      maxSteps: this.maxSteps
    };
  }

  private async executeTool(
    toolName: string,
    arguments_: Record<string, unknown>,
    context: AgentToolExecutionContext
  ): Promise<import("@playcraft/contracts").AgentToolResult> {
    const executor = this.toolsByName.get(toolName);
    if (!executor) {
      return {
        callId: StableIdSchema.parse(`unsupported.${Date.now().toString(36)}`),
        toolName,
        status: "unsupported",
        error: `tool ${toolName} is not registered with this agent loop`
      };
    }
    try {
      const value = await executor.execute(arguments_, context);
      return {
        callId: StableIdSchema.parse(`result.${Date.now().toString(36)}`),
        toolName,
        status: "ok",
        value: value as import("@playcraft/contracts").AgentToolResult["value"]
      };
    } catch (error) {
      return {
        callId: StableIdSchema.parse(`error.${Date.now().toString(36)}`),
        toolName,
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

function describeTool(toolName: string, executor: AgentToolExecutor): AgentToolDescriptor {
  const registered = (executor as unknown as { descriptor?: AgentToolDescriptor }).descriptor;
  if (registered) return registered;
  return {
    toolName,
    displayName: toolName,
    description: `${toolName} tool`,
    argumentsSchema: {},
    capabilityTags: []
  };
}

export function agentLoopToolsFromBuilderDefinitions(
  definitions: readonly BuilderToolDefinition[]
): AgentToolDescriptor[] {
  return definitions.map((definition) => ({
    toolName: definition.toolName,
    displayName: definition.displayName,
    description: definition.description,
    argumentsSchema: argumentsSchemaFromJsonObjectDescriptor(definition.argumentsSchema),
    capabilityTags: definition.emittedEvents
  }));
}

function argumentsSchemaFromJsonObjectDescriptor(
  descriptor: BuilderToolDefinition["argumentsSchema"]
): AgentToolDescriptor["argumentsSchema"] {
  const out: Record<string, import("./local-llm.js").AgentToolField> = {};
  for (const [name, field] of Object.entries(descriptor.fields)) {
    out[name] = {
      type: field.type,
      required: field.required ?? true,
      ...(field.allowedValues ? { allowedValues: field.allowedValues } : {}),
      ...(field.fields ? { fields: fieldsToRecord(field.fields) } : {})
    };
  }
  return out;
}

function fieldsToRecord(
  fields: Readonly<Record<string, import("@playcraft/contracts").JsonField>>
): Readonly<Record<string, import("./local-llm.js").AgentToolField>> {
  const out: Record<string, import("./local-llm.js").AgentToolField> = {};
  for (const [name, field] of Object.entries(fields)) {
    out[name] = {
      type: field.type,
      required: field.required ?? true,
      ...(field.allowedValues ? { allowedValues: field.allowedValues } : {}),
      ...(field.fields ? { fields: fieldsToRecord(field.fields) } : {})
    };
  }
  return out;
}