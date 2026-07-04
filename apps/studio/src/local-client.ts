import {
  createBuilderCommandHandler,
  type BuilderAgUiEvent,
  type BuilderExecutionResult
} from "@playcraft/builder";
import {
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderAssetEdit,
  type BuilderCommand,
  type BuilderInputRequest,
  type BuilderTemplateId,
  type GameAssemblyProfile
} from "@playcraft/contracts";

import { DEFAULT_TEMPLATE_ID, resolveStudioInputCommand } from "./input-adapter.js";
import type { StudioClient, StudioSessionSnapshot, StudioTimelineEntry, StudioTimelineKind } from "./types.js";

export function createLocalStudioClient(): StudioClient {
  const handler = createBuilderCommandHandler();
  const profiles = new Map<string, GameAssemblyProfile>();
  const timeline: StudioTimelineEntry[] = [];
  let commandCounter = 0;
  let inputCounter = 0;
  let activeTemplateId: BuilderTemplateId = DEFAULT_TEMPLATE_ID;
  let activeAssetEdit: BuilderAssetEdit | undefined;

  function execute(
    sessionId: string,
    actionName: BuilderCommand["actionName"],
    templateId: BuilderTemplateId,
    assetEdit: BuilderAssetEdit | undefined,
    input: BuilderInputRequest
  ): StudioSessionSnapshot {
    commandCounter += 1;
    const output = handler.execute({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-command.${sessionId}.${commandCounter}`,
      version: "1.0.0",
      kind: "builder-command",
      sessionId,
      actionName,
      templateId,
      input,
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
      inputCounter += 1;
      const resolved = resolveStudioInputCommand({
        activeTemplateId,
        sequence: inputCounter,
        source: input.source ?? "text",
        text: input.idea
      });
      activeTemplateId = resolved.templateId;
      activeAssetEdit = resolved.assetEdit ?? activeAssetEdit;
      return execute(sessionId, "assemble-game", activeTemplateId, activeAssetEdit, resolved.input);
    },
    requestChange(input) {
      inputCounter += 1;
      const resolved = resolveStudioInputCommand({
        activeTemplateId,
        sequence: inputCounter,
        source: input.source ?? "text",
        text: input.changeRequest
      });
      activeTemplateId = resolved.templateId;
      activeAssetEdit = resolved.assetEdit ?? activeAssetEdit;
      return execute(input.sessionId, "update-game", activeTemplateId, activeAssetEdit, resolved.input);
    },
    reset() {
      profiles.clear();
      timeline.length = 0;
      commandCounter = 0;
      inputCounter = 0;
      activeTemplateId = DEFAULT_TEMPLATE_ID;
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
