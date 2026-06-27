import {
  createBuilderCommandHandler,
  type BuilderAgUiEvent,
  type BuilderExecutionResult
} from "@playcraft/builder";
import {
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderAssetEdit,
  type BuilderCommand,
  type BuilderProfilePreset,
  type GameAssemblyProfile
} from "@playcraft/contracts";

import type { StudioClient, StudioSessionSnapshot, StudioTimelineEntry, StudioTimelineKind } from "./types.js";

export function createLocalStudioClient(): StudioClient {
  const handler = createBuilderCommandHandler();
  const profiles = new Map<string, GameAssemblyProfile>();
  const timeline: StudioTimelineEntry[] = [];
  let commandCounter = 0;
  let activePreset: BuilderProfilePreset = "profile-a";
  let activeAssetEdit: BuilderAssetEdit | undefined;

  function execute(
    sessionId: string,
    commandName: BuilderCommand["commandName"],
    preset: BuilderProfilePreset,
    assetEdit: BuilderAssetEdit | undefined
  ): StudioSessionSnapshot {
    commandCounter += 1;
    const output = handler.execute({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-command.${sessionId}.${commandCounter}`,
      version: "1.0.0",
      kind: "builder-command",
      sessionId,
      commandName,
      preset,
      assetEdit
    });

    return snapshotFromOutput(sessionId, output);
  }

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
      const sessionId = input.sessionId ?? "studio.session";
      activePreset = presetForText(input.idea, activePreset);
      activeAssetEdit = assetEditForText(input.idea) ?? activeAssetEdit;
      return execute(sessionId, "build-profile", activePreset, activeAssetEdit);
    },
    requestChange(input) {
      activePreset = presetForText(input.changeRequest, nextPreset(activePreset));
      activeAssetEdit = assetEditForText(input.changeRequest) ?? activeAssetEdit;
      return execute(input.sessionId, "update-profile", activePreset, activeAssetEdit);
    },
    reset() {
      profiles.clear();
      timeline.length = 0;
      commandCounter = 0;
      activePreset = "profile-a";
      activeAssetEdit = undefined;
    }
  };
}

function timelineEntry(event: BuilderAgUiEvent, sequence: number): StudioTimelineEntry {
  return {
    id: `timeline.${String(sequence).padStart(4, "0")}`,
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

function presetForText(text: string, fallback: BuilderProfilePreset): BuilderProfilePreset {
  const normalized = text.toLowerCase();
  if (normalized.includes("sort") || normalized.includes("category") || normalized.includes("color")) {
    return "profile-b";
  }
  if (normalized.includes("sequence") || normalized.includes("pattern") || normalized.includes("repeat")) {
    return "sequence-repeat";
  }
  if (normalized.includes("memory") || normalized.includes("match") || normalized.includes("card")) {
    return "profile-a";
  }
  return fallback;
}

function nextPreset(current: BuilderProfilePreset): BuilderProfilePreset {
  return current === "profile-b" || current === "sorting" ? "profile-a" : "profile-b";
}

function assetEditForText(text: string): BuilderAssetEdit | undefined {
  const normalized = text.toLowerCase();
  const theme =
    matchTheme(normalized, /\breplace\s+(?:the\s+)?(?:assets?|cards?|card images?|images?|art)\s+with\s+([a-z0-9][a-z0-9 ,.-]{1,80})/u) ??
    matchTheme(normalized, /\b(?:assets?|cards?|card images?|images?|art|theme)\s+(?:to|with|as|for)\s+([a-z0-9][a-z0-9 ,.-]{1,80})/u) ??
    matchTheme(normalized, /\b(?:with|using|about|featuring)\s+([a-z0-9][a-z0-9 ,.-]{1,80})/u);

  if (!theme) {
    return undefined;
  }

  const items = theme
    .split(/\s*(?:,| and )\s*/u)
    .map((entry) => cleanAssetTheme(entry))
    .filter((entry) => entry.length > 0)
    .slice(0, 12);

  return items.length > 1 ? { theme, items } : { theme };
}

function matchTheme(text: string, pattern: RegExp): string | undefined {
  const match = pattern.exec(text);
  if (!match) {
    return undefined;
  }

  const candidate = cleanAssetTheme(match[1]);
  return candidate.length > 0 ? candidate : undefined;
}

function cleanAssetTheme(value: string): string {
  return value
    .split(/[.!?;]/u)[0]
    .replace(/\b(?:game|profile|challenge|assets?|cards?|card images?|images?|art|theme)\b/gu, " ")
    .replace(/\b(?:a|an|the)\b/gu, " ")
    .replace(/[^a-z0-9 ,.-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 80);
}
