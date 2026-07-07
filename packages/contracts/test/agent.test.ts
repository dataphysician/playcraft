import { describe, expect, it } from "vitest";
import {
  AgentMessageRoleSchema,
  AgentStepSchema,
  AgentToolCallSchema,
  AgentToolResultSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  PlaycraftAgentTranscriptSchema
} from "@playcraft/contracts";

describe("AgentToolCallSchema", () => {
  it("accepts a happy-path tool call with structured arguments", () => {
    const parsed = AgentToolCallSchema.parse({
      callId: "agent-call.happy",
      toolName: "tool:assemble-game",
      arguments: {
        text: "Memory game with dinosaurs",
        count: 4
      }
    });
    expect(parsed.toolName).toBe("tool:assemble-game");
    expect(parsed.arguments.text).toBe("Memory game with dinosaurs");
  });

  it("rejects unknown additional properties on a strict AgentToolCall", () => {
    const result = AgentToolCallSchema.safeParse({
      callId: "agent-call.strict",
      toolName: "tool:assemble-game",
      arguments: {},
      surprise: "nope"
    });
    expect(result.success).toBe(false);
  });

  it("rejects tool calls that omit the arguments record", () => {
    const result = AgentToolCallSchema.safeParse({
      callId: "agent-call.no-args",
      toolName: "tool:assemble-game"
    });
    expect(result.success).toBe(false);
  });
});

describe("AgentToolResultSchema", () => {
  it("accepts a happy-path ok result with a value payload", () => {
    const parsed = AgentToolResultSchema.parse({
      callId: "agent-call.happy",
      toolName: "tool:assemble-game",
      status: "ok",
      value: { profileId: "profile.fixture" }
    });
    expect(parsed.status).toBe("ok");
  });

  it("rejects ok results that omit a value payload", () => {
    const result = AgentToolResultSchema.safeParse({
      callId: "agent-call.missing-value",
      toolName: "tool:assemble-game",
      status: "ok"
    });
    expect(result.success).toBe(false);
  });

  it("rejects error results that omit an error message", () => {
    const result = AgentToolResultSchema.safeParse({
      callId: "agent-call.missing-error",
      toolName: "tool:assemble-game",
      status: "error"
    });
    expect(result.success).toBe(false);
  });

  it("accepts error results with an error message", () => {
    const parsed = AgentToolResultSchema.parse({
      callId: "agent-call.error",
      toolName: "tool:assemble-game",
      status: "error",
      error: "tool failed"
    });
    expect(parsed.error).toBe("tool failed");
  });

  it("accepts unsupported results with an error message", () => {
    const parsed = AgentToolResultSchema.parse({
      callId: "agent-call.unsupported",
      toolName: "tool:unknown",
      status: "unsupported",
      error: "tool tool:unknown is not registered"
    });
    expect(parsed.status).toBe("unsupported");
  });

  it("rejects unknown additional properties on a strict AgentToolResult", () => {
    const result = AgentToolResultSchema.safeParse({
      callId: "agent-call.strict",
      toolName: "tool:assemble-game",
      status: "ok",
      value: { ok: true },
      surprise: "nope"
    });
    expect(result.success).toBe(false);
  });
});

describe("AgentStepSchema", () => {
  it("accepts a tool-call step", () => {
    const parsed = AgentStepSchema.parse({
      kind: "tool-call",
      stepId: "agent-step.tool-call",
      engine: "lfm2.5-vl-450m-extract",
      call: {
        callId: "agent-call.1",
        toolName: "tool:assemble-game",
        arguments: { text: "Memory game" }
      },
      emittedAt: "2026-07-06T00:00:00.000Z"
    });
    expect(parsed.kind).toBe("tool-call");
  });

  it("accepts a tool-result step", () => {
    const parsed = AgentStepSchema.parse({
      kind: "tool-result",
      stepId: "agent-step.tool-result",
      result: {
        callId: "agent-call.1",
        toolName: "tool:assemble-game",
        status: "ok",
        value: { profileId: "profile.fixture" }
      },
      emittedAt: "2026-07-06T00:00:00.000Z"
    });
    expect(parsed.kind).toBe("tool-result");
  });

  it("accepts a final step with a final message", () => {
    const parsed = AgentStepSchema.parse({
      kind: "final",
      stepId: "agent-step.final",
      message: "Memory game with dinosaurs ready",
      bundleId: "game-bundle.fixture",
      emittedAt: "2026-07-06T00:00:00.000Z"
    });
    expect(parsed.kind).toBe("final");
    expect(parsed.bundleId).toBe("game-bundle.fixture");
  });

  it("rejects a step with an unknown kind discriminator", () => {
    const result = AgentStepSchema.safeParse({
      kind: "nonsense",
      stepId: "agent-step.bad",
      message: "nope",
      emittedAt: "2026-07-06T00:00:00.000Z"
    });
    expect(result.success).toBe(false);
  });
});

describe("PlaycraftAgentTranscriptSchema", () => {
  function baseTranscript() {
    return {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "agent-transcript.fixture",
      version: "1.0.0",
      kind: "agent-transcript" as const,
      engine: "lfm2.5-vl-450m-extract" as const,
      engineManifestId: `local-inference-engine.${"lfm2.5-vl-450m-extract"}`,
      engineManifestVersion: "1.0.0",
      requestId: "agent-request.fixture",
      steps: [
        {
          kind: "final" as const,
          stepId: "agent-step.fixture.final",
          message: "Memory game with dinosaurs ready",
          emittedAt: "2026-07-06T00:00:00.000Z"
        }
      ],
      finished: true,
      finishedAt: "2026-07-06T00:00:00.000Z"
    };
  }

  it("accepts a happy-path transcript with a single final step", () => {
    const parsed = PlaycraftAgentTranscriptSchema.parse(baseTranscript());
    expect(parsed.engine).toBe("lfm2.5-vl-450m-extract");
    expect(parsed.steps).toHaveLength(1);
  });

  it("rejects duplicate step ids across the transcript", () => {
    const result = PlaycraftAgentTranscriptSchema.safeParse({
      ...baseTranscript(),
      steps: [
        {
          kind: "tool-call",
          stepId: "agent-step.duplicate",
          engine: "lfm2.5-vl-450m-extract",
          call: {
            callId: "agent-call.1",
            toolName: "tool:assemble-game",
            arguments: {}
          },
          emittedAt: "2026-07-06T00:00:00.000Z"
        },
        {
          kind: "tool-result",
          stepId: "agent-step.duplicate",
          result: {
            callId: "agent-call.1",
            toolName: "tool:assemble-game",
            status: "ok",
            value: { profileId: "profile.fixture" }
          },
          emittedAt: "2026-07-06T00:00:00.000Z"
        }
      ]
    });
    expect(result.success).toBe(false);
  });

  it("rejects a transcript that omits the steps array", () => {
    const result = PlaycraftAgentTranscriptSchema.safeParse({
      ...baseTranscript(),
      steps: undefined
    });
    expect(result.success).toBe(false);
  });

  it("rejects a transcript with an empty steps array", () => {
    const result = PlaycraftAgentTranscriptSchema.safeParse({
      ...baseTranscript(),
      steps: []
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown additional properties on a strict PlaycraftAgentTranscript", () => {
    const result = PlaycraftAgentTranscriptSchema.safeParse({
      ...baseTranscript(),
      surprise: "nope"
    });
    expect(result.success).toBe(false);
  });
});

describe("AgentMessageRoleSchema", () => {
  it("accepts the four declared roles", () => {
    for (const role of ["system", "user", "assistant", "tool"] as const) {
      expect(AgentMessageRoleSchema.parse(role)).toBe(role);
    }
  });

  it("rejects unknown roles", () => {
    const result = AgentMessageRoleSchema.safeParse("manager");
    expect(result.success).toBe(false);
  });
});