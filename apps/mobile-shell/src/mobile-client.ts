import type { BuilderAgUiEvent, BuilderExecutionResult } from "@playcraft/builder";
import type { GameAssemblyProfile } from "@playcraft/contracts";
import { createLocalPlaycraftService } from "@playcraft/service";
import type { StudioClient, StudioSessionSnapshot, StudioTimelineEntry, StudioTimelineKind } from "@playcraft/studio";

export function createMobileShellStudioClient(): StudioClient {
  const service = createLocalPlaycraftService();
  const profiles = new Map<string, GameAssemblyProfile>();
  const timeline: StudioTimelineEntry[] = [];

  function snapshotFromOutput(sessionId: string, output: BuilderExecutionResult): StudioSessionSnapshot {
    if (output.result.profile) {
      profiles.set(output.result.profile.id, output.result.profile);
    }

    const entries = output.events.map((event, index) => timelineEntry(event, timeline.length + index + 1));
    timeline.push(...entries);

    return {
      sessionId,
      activeProfileId: output.result.profile?.id,
      profiles: Array.from(profiles.values()),
      timeline: [...timeline]
    };
  }

  return {
    assembleFromIntent(input) {
      const sessionId = input.sessionId ?? "mobile.session";
      return snapshotFromOutput(
        sessionId,
        service.assemble({
          sessionId,
          source: input.source ?? "text",
          text: input.idea
        })
      );
    },
    requestChange(input) {
      return snapshotFromOutput(
        input.sessionId,
        service.update({
          sessionId: input.sessionId,
          source: input.source ?? "text",
          text: input.changeRequest
        })
      );
    },
    reset() {
      service.reset();
      profiles.clear();
      timeline.length = 0;
    }
  };
}

function timelineEntry(event: BuilderAgUiEvent, sequence: number): StudioTimelineEntry {
  return {
    id: `mobile.timeline.${String(sequence).padStart(4, "0")}`,
    kind: kindForEvent(event),
    title: titleForEvent(event),
    detail: JSON.stringify(event.value, null, 2),
    timestamp: event.timestamp,
    profileId: profileIdForEvent(event),
    rawEvent: event
  };
}

function kindForEvent(event: BuilderAgUiEvent): StudioTimelineKind {
  if (event.type === "StateSnapshot" || event.type === "StateDelta") {
    return "state";
  }
  if (event.type === "Activity") {
    return "activity";
  }
  if (event.type === "ToolCall" || event.type === "ToolResult") {
    return "tool";
  }
  if (event.type === "Custom") {
    return "custom";
  }
  return "lifecycle";
}

function titleForEvent(event: BuilderAgUiEvent): string {
  if (event.type === "Custom" && typeof event.value === "object" && event.value !== null && "payloadType" in event.value) {
    return `Custom: ${String(event.value.payloadType)}`;
  }
  if (event.type === "Activity" && typeof event.value === "object" && event.value !== null && "message" in event.value) {
    return String(event.value.message);
  }
  return event.type;
}

function profileIdForEvent(event: BuilderAgUiEvent): string | undefined {
  if (event.type !== "Custom" || typeof event.value !== "object" || event.value === null || !("profileId" in event.value)) {
    return undefined;
  }
  const profileId = event.value.profileId;
  return typeof profileId === "string" ? profileId : undefined;
}
