import { describe, expect, it } from "vitest";
import {
  AgentLoop,
  StubLocalInferenceEngine,
  type AgentToolExecutor
} from "@playcraft/core";
import { PLAYCRAFT_SCHEMA_VERSION } from "@playcraft/contracts";

function echoTool(): AgentToolExecutor {
  return {
    toolName: "tool:echo",
    async execute(arguments_) {
      return { echoed: arguments_.text ?? null };
    }
  };
}

function finalOnlyEngine() {
  return new StubLocalInferenceEngine();
}

describe("AgentLoop", () => {
  it("drives a stub engine through tool calls until it emits a final result", async () => {
    let calls = 0;
    const engine = {
      manifest: new StubLocalInferenceEngine().manifest,
      async infer(): Promise<
        | { kind: "tool-call"; call: { callId: string; toolName: string; arguments: Record<string, unknown> } }
        | { kind: "final"; message: string; bundleId?: string }
      > {
        calls += 1;
        if (calls === 1) {
          return {
            kind: "tool-call",
            call: {
              callId: "agent-call.linear.1",
              toolName: "tool:echo",
              arguments: { text: "Memory game with dinosaurs" }
            }
          };
        }
        return { kind: "final", message: "Memory game with dinosaurs ready" };
      }
    };
    const loop = new AgentLoop({
      engine,
      systemPrompt: "stub system prompt",
      tools: [echoTool()],
      maxSteps: 8,
      temperature: 0
    });

    const result = await loop.run("agent-request.linear", "Memory game with dinosaurs");

    expect(result.finished).toBe(true);
    expect(result.finalMessage).toBe("Memory game with dinosaurs ready");
    const toolCallSteps = result.transcript.steps.filter((step) => step.kind === "tool-call");
    const toolResultSteps = result.transcript.steps.filter((step) => step.kind === "tool-result");
    const finalSteps = result.transcript.steps.filter((step) => step.kind === "final");
    expect(toolCallSteps.length).toBeGreaterThanOrEqual(1);
    expect(toolResultSteps.length).toBe(toolCallSteps.length);
    expect(finalSteps).toHaveLength(1);
    expect(result.transcript.kind).toBe("agent-transcript");
    expect(result.transcript.schemaVersion).toBe(PLAYCRAFT_SCHEMA_VERSION);
    expect(result.transcript.engine).toBe("stub");
    expect(result.transcript.requestId).toBe("agent-request.linear");
    expect(result.transcript.finished).toBe(true);
    expect(result.transcript.finishedAt).toBeDefined();
  });

  it("uses unique step ids across tool-call, tool-result, and final steps", async () => {
    const loop = new AgentLoop({
      engine: finalOnlyEngine(),
      systemPrompt: "stub system prompt",
      tools: [echoTool()],
      maxSteps: 4
    });

    const result = await loop.run("agent-request.unique-ids", "/final done");

    const ids = result.transcript.steps.map((step) => step.stepId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("exhausts the step budget when the engine keeps requesting tool calls", async () => {
    const engine = new StubLocalInferenceEngine();
    const loop = new AgentLoop({
      engine,
      systemPrompt: "stub system prompt",
      tools: [echoTool()],
      maxSteps: 3
    });

    const result = await loop.run("agent-request.budget", "loop forever");

    expect(result.finished).toBe(false);
    expect(result.finalMessage).toBeNull();
    expect(result.transcript.steps.length).toBeLessThanOrEqual(3 * 2);
    expect(result.transcript.finished).toBe(false);
    expect(result.transcript.finishedAt).toBeUndefined();
  });

  it("records an unsupported tool result when the engine emits a tool name not registered with the loop", async () => {
    const engine = {
      manifest: new StubLocalInferenceEngine().manifest,
      async infer(): Promise<{ kind: "tool-call"; call: { callId: string; toolName: string; arguments: Record<string, unknown> } }> {
        return {
          kind: "tool-call",
          call: {
            callId: "agent-call.unknown",
            toolName: "tool:not-registered",
            arguments: {}
          }
        };
      }
    };
    const loop = new AgentLoop({
      engine,
      systemPrompt: "stub system prompt",
      tools: [echoTool()],
      maxSteps: 1
    });

    const result = await loop.run("agent-request.unsupported", "trigger unsupported tool");

    expect(result.finished).toBe(false);
    const toolResultStep = result.transcript.steps.find((step) => step.kind === "tool-result");
    expect(toolResultStep).toBeDefined();
    if (toolResultStep && toolResultStep.kind === "tool-result") {
      expect(toolResultStep.result.status).toBe("unsupported");
      expect(toolResultStep.result.toolName).toBe("tool:not-registered");
      expect(toolResultStep.result.error).toMatch(/not registered/u);
    }
  });

  it("records an error tool result when the executor throws", async () => {
    const failingTool: AgentToolExecutor = {
      toolName: "tool:explode",
      async execute() {
        throw new Error("boom");
      }
    };
    const engine = {
      manifest: new StubLocalInferenceEngine().manifest,
      async infer(): Promise<{ kind: "tool-call"; call: { callId: string; toolName: string; arguments: Record<string, unknown> } }> {
        return {
          kind: "tool-call",
          call: {
            callId: "agent-call.explode",
            toolName: "tool:explode",
            arguments: {}
          }
        };
      }
    };
    const loop = new AgentLoop({
      engine,
      systemPrompt: "stub system prompt",
      tools: [failingTool],
      maxSteps: 1
    });

    const result = await loop.run("agent-request.error", "trigger error");

    expect(result.finished).toBe(false);
    const toolResultStep = result.transcript.steps.find((step) => step.kind === "tool-result");
    expect(toolResultStep).toBeDefined();
    if (toolResultStep && toolResultStep.kind === "tool-result") {
      expect(toolResultStep.result.status).toBe("error");
      expect(toolResultStep.result.error).toBe("boom");
    }
  });

  it("returns a final step immediately when the engine emits a final on the first turn", async () => {
    const engine = {
      manifest: new StubLocalInferenceEngine().manifest,
      async infer(): Promise<{ kind: "final"; message: string; bundleId?: string }> {
        return { kind: "final", message: "direct final", bundleId: "game-bundle.fixture" };
      }
    };
    const loop = new AgentLoop({
      engine,
      systemPrompt: "stub system prompt",
      tools: [echoTool()],
      maxSteps: 2
    });

    const result = await loop.run("agent-request.final-only", "anything");

    expect(result.finished).toBe(true);
    expect(result.finalMessage).toBe("direct final");
    expect(result.transcript.steps).toHaveLength(1);
    const finalStep = result.transcript.steps[0];
    expect(finalStep?.kind).toBe("final");
    if (finalStep && finalStep.kind === "final") {
      expect(finalStep.bundleId).toBe("game-bundle.fixture");
    }
  });
});
