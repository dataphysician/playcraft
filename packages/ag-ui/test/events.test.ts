import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  activity,
  createPlaycraftEnvelope,
  playcraftCustomEvent,
  runFinished,
  runStarted,
  stateDelta,
  stateSnapshot,
  stepFinished,
  stepStarted,
  toolCall,
  toolResult,
  validatePlaycraftEnvelope
} from "@playcraft/ag-ui";
import { assembleMvpProfiles } from "@playcraft/packs";

describe("AG-UI-compatible events", () => {
  it("creates lifecycle, state, activity, and tool events", () => {
    expect(runStarted("run.test").type).toBe("RunStarted");
    expect(runFinished("run.test").type).toBe("RunFinished");
    expect(stepStarted("run.test", "planner", "Planner").value.stepId).toBe("planner");
    expect(stepFinished("run.test", "planner").type).toBe("StepFinished");
    expect(stateSnapshot("run.test", { ready: true }).value.state).toEqual({ ready: true });
    expect(stateDelta("run.test", { ready: false }).value.patch).toEqual({ ready: false });
    expect(activity("run.test", "asset", "progress", "Generating").value.status).toBe("progress");
    expect(toolCall("run.test", "tool:select-item", { itemId: "a" }).value.args).toEqual({ itemId: "a" });
    expect(toolResult("run.test", "tool:select-item", { accepted: true }).value.result).toEqual({ accepted: true });
  });

  it("validates Playcraft custom envelopes before emission", () => {
    const profile = assembleMvpProfiles()[0];
    const envelope = createPlaycraftEnvelope({
      eventId: "event.agui.profile",
      runId: "run.agui",
      profileId: profile.id,
      payloadType: "profile.proposed",
      payload: profile,
      provenance: {
        role: "planner",
        sourceId: "planner.deterministic.mvp"
      }
    });
    const event = playcraftCustomEvent(envelope);

    expect(event.type).toBe("Custom");
    expect(event.value.payloadType).toBe("profile.proposed");
  });

  it("rejects unknown and invalid custom payloads", () => {
    const profile = assembleMvpProfiles()[0];
    const unknown = createPlaycraftEnvelope({
      eventId: "event.agui.unknown",
      runId: "run.agui",
      profileId: profile.id,
      payloadType: "pack.custom.unknown",
      payload: { ok: true },
      provenance: {
        role: "planner",
        sourceId: "planner.deterministic.mvp"
      }
    });

    expect(() => validatePlaycraftEnvelope(unknown)).toThrow(/unregistered/u);

    const invalid = createPlaycraftEnvelope({
      eventId: "event.agui.invalid",
      runId: "run.agui",
      profileId: profile.id,
      payloadType: "asset.generated",
      payload: { not: "an asset record" },
      provenance: {
        role: "asset_source",
        sourceId: "asset-source.stub-deterministic"
      }
    });

    expect(() => validatePlaycraftEnvelope(invalid)).toThrow(/invalid Playcraft custom payload/u);
  });

  it("validates replay and preview custom events alongside standard AG-UI events", () => {
    const profile = assembleMvpProfiles()[1];
    const replayReady = playcraftCustomEvent(
      createPlaycraftEnvelope({
        eventId: "event.agui.replay",
        runId: "run.agui",
        profileId: profile.id,
        payloadType: "replay.ready",
        payload: {
          profileId: profile.id,
          replayable: true
        },
        provenance: {
          role: "planner",
          sourceId: "planner.deterministic.mvp"
        }
      })
    );
    const previewUpdated = playcraftCustomEvent(
      createPlaycraftEnvelope({
        eventId: "event.agui.preview",
        runId: "run.agui",
        profileId: profile.id,
        payloadType: "preview.updated",
        payload: {
          profileId: profile.id,
          state: "interactive",
          interactionCount: 2
        },
        provenance: {
          role: "frontend",
          sourceId: "studio.preview"
        }
      }),
      {
        extraPayloadSchemas: {
          "preview.updated": z
            .object({
              profileId: z.string().min(1),
              state: z.enum(["interactive", "updated"]),
              interactionCount: z.number().int().nonnegative()
            })
            .strict()
        }
      }
    );

    const stream = [
      runStarted("run.agui"),
      stateSnapshot("run.agui", { profileId: profile.id, mode: "preview" }),
      stateDelta("run.agui", { interactionCount: 1 }),
      activity("run.agui", "preview", "progress", "Preview synced"),
      toolCall("run.agui", "tool:select-item", { itemId: "red circle" }),
      toolResult("run.agui", "tool:select-item", { accepted: true }),
      replayReady,
      previewUpdated,
      runFinished("run.agui")
    ];

    expect(stream.map((event) => event.type)).toEqual([
      "RunStarted",
      "StateSnapshot",
      "StateDelta",
      "Activity",
      "ToolCall",
      "ToolResult",
      "Custom",
      "Custom",
      "RunFinished"
    ]);
    expect(replayReady.value.payloadType).toBe("replay.ready");
    expect(previewUpdated.value.payloadType).toBe("preview.updated");
  });
});
