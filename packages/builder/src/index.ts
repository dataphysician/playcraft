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
  type AgUiEvent
} from "@playcraft/ag-ui";
import {
  BuilderCommandResultSchema,
  BuilderCommandSchema,
  BuilderPreviewStateSchema,
  BuilderProfilePresetSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderCommand,
  type BuilderCommandResult,
  type BuilderPreviewState,
  type BuilderProfilePreset,
  type GameAssemblyProfile,
  type JsonValue,
  type PlaycraftAssemblyRequest
} from "@playcraft/contracts";
import { replayProfile, type ReplayResult } from "@playcraft/core";
import {
  createDefaultPlanner,
  createDefaultRegistries,
  mvpAssemblyRequests,
  registerPlaycraftTrustedComponents
} from "@playcraft/packs";
import { TrustedComponentRegistry } from "@playcraft/renderer";

export const BuilderPreviewPayloadSchema = z
  .object({
    componentId: z.string().min(1),
    renderedComponentIds: z.array(z.string().min(1)).min(1),
    interactionCount: z.number().int().nonnegative()
  })
  .strict();

export type BuilderAgUiEvent = AgUiEvent;

const PRESET_TO_REQUEST_INDEX: Record<BuilderProfilePreset, number> = {
  "profile-a": 0,
  "profile-b": 1,
  "memory-match": 0,
  sorting: 1,
  "sequence-repeat": 2
};

export interface BuilderSessionRecord {
  sessionId: string;
  preset?: BuilderProfilePreset;
  profile?: GameAssemblyProfile;
  replay?: ReplayResult;
  preview: BuilderPreviewState;
}

export interface BuilderExecutionResult {
  result: BuilderCommandResult;
  events: BuilderAgUiEvent[];
}

export interface BuilderCommandHandler {
  execute(command: BuilderCommand): BuilderExecutionResult;
  buildProfiles(presets: BuilderProfilePreset[], sessionId?: string): BuilderExecutionResult[];
}

export class PlaycraftBuilderSessionService implements BuilderCommandHandler {
  private readonly planner = createDefaultPlanner();
  private readonly registries = createDefaultRegistries();
  private readonly renderer: TrustedComponentRegistry = registerPlaycraftTrustedComponents(new TrustedComponentRegistry());
  private readonly sessions = new Map<string, BuilderSessionRecord>();

  execute(commandInput: BuilderCommand): BuilderExecutionResult {
    const command = BuilderCommandSchema.parse(commandInput);
    const session = this.getOrCreateSession(command.sessionId);

    switch (command.commandName) {
      case "build-profile":
      case "update-profile":
        return this.buildOrUpdate(session, command);
      case "preview-action":
        return this.previewAction(session, command);
      default:
        throw new Error(`unsupported command ${(command as { commandName: string }).commandName}`);
    }
  }

  buildProfiles(presets: BuilderProfilePreset[], sessionId = "builder.batch"): BuilderExecutionResult[] {
    return presets.map((preset, index) =>
      this.execute({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: `builder-command.${sessionId}.${index + 1}`,
        version: "1.0.0",
        kind: "builder-command",
        sessionId,
        commandName: index === 0 ? "build-profile" : "update-profile",
        preset
      })
    );
  }

  private buildOrUpdate(session: BuilderSessionRecord, command: BuilderCommand): BuilderExecutionResult {
    const preset = BuilderProfilePresetSchema.parse(command.preset);
    const request = requestForPreset(preset);
    const runId = `${command.sessionId}.${preset}`;
    const profile = this.planner.assemble(request);
    const replay = replayProfile(profile, this.registries);
    const preview = BuilderPreviewStateSchema.parse({
      sessionId: session.sessionId,
      activeProfileId: profile.id,
      activePreset: preset,
      activeComponentId: replay.renderRequests[0]?.componentId,
      renderedComponentIds: replay.renderRequests.map((entry) => entry.componentId ?? entry.componentCapability ?? "unknown"),
      interactionCount: session.preview.interactionCount,
      lastToolName: session.preview.lastToolName,
      lastToolPayload: session.preview.lastToolPayload
    });

    session.preset = preset;
    session.profile = profile;
    session.replay = replay;
    session.preview = preview;

    const result = BuilderCommandResultSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-result.${command.id}`,
      version: "1.0.0",
      kind: "builder-command-result",
      commandId: command.id,
      sessionId: session.sessionId,
      profile,
      preview,
      validation: profile.validation
    });

    const events: BuilderAgUiEvent[] = [
      runStarted(runId, 0),
      stepStarted(runId, `${command.commandName}.plan`, `${command.commandName} planner`, 1),
      activity(runId, "builder.profile", "started", `assembling ${preset}`, 2),
      stateSnapshot(runId, { sessionId: session.sessionId, preset, profileId: profile.id }, 3),
      playcraftCustomEvent(
        createPlaycraftEnvelope({
          eventId: `event.${profile.id}.proposed`,
          profileId: profile.id,
          runId,
          payloadType: "profile.proposed",
          payload: profile,
          provenance: { role: "planner", sourceId: "builder-session-service" }
        }),
        { sequence: 4 }
      ),
      playcraftCustomEvent(
        createPlaycraftEnvelope({
          eventId: `event.${profile.id}.validated`,
          profileId: profile.id,
          runId,
          payloadType: "profile.validated",
          payload: profile,
          provenance: { role: "validator", sourceId: "builder-session-service" }
        }),
        { sequence: 5 }
      ),
      playcraftCustomEvent(
        createPlaycraftEnvelope({
          eventId: `event.${profile.id}.replay.ready`,
          profileId: profile.id,
          runId,
          payloadType: "replay.ready",
          payload: { profileId: profile.id, replayable: result.validation?.valid ?? false },
          provenance: { role: "validator", sourceId: "builder-session-service" }
        }),
        { sequence: 6 }
      ),
      playcraftCustomEvent(
        createPlaycraftEnvelope({
          eventId: `event.${profile.id}.preview.rendered`,
          profileId: profile.id,
          runId,
          payloadType: "preview.rendered",
          payload: {
            componentId: preview.activeComponentId ?? "unknown.component",
            renderedComponentIds: preview.renderedComponentIds,
            interactionCount: preview.interactionCount
          },
          provenance: { role: "renderer", sourceId: "builder-session-service" }
        }),
        { extraPayloadSchemas: { "preview.rendered": BuilderPreviewPayloadSchema }, sequence: 7 }
      ),
      activity(runId, "builder.profile", "finished", `assembled ${profile.profileName}`, 8),
      stepFinished(runId, `${command.commandName}.plan`, `${command.commandName} planner`, 9),
      runFinished(runId, 10)
    ];

    return { result, events };
  }

  private previewAction(session: BuilderSessionRecord, command: BuilderCommand): BuilderExecutionResult {
    if (!session.profile || !session.replay) {
      throw new Error("preview-action requires an existing built session");
    }

    const renderRequest = session.replay.renderRequests[0];
    if (!renderRequest) {
      throw new Error("session has no render requests to preview");
    }

    const emitted: Array<{ toolName: string; payload: JsonValue }> = [];
    const element = this.renderer.renderOrThrow(renderRequest, session.profile.assets, (toolName, payload) => {
      emitted.push({ toolName, payload });
    });
    triggerPrimaryButton(element);

    const interaction = emitted[0] ?? { toolName: "tool.none", payload: { componentId: renderRequest.componentId ?? "unknown" } };
    const nextPreview = BuilderPreviewStateSchema.parse({
      ...session.preview,
      interactionCount: session.preview.interactionCount + 1,
      lastToolName: interaction.toolName,
      lastToolPayload: interaction.payload
    });
    session.preview = nextPreview;

    const result = BuilderCommandResultSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-result.${command.id}`,
      version: "1.0.0",
      kind: "builder-command-result",
      commandId: command.id,
      sessionId: session.sessionId,
      profile: session.profile,
      preview: nextPreview,
      validation: session.profile.validation
    });

    const runId = `${command.sessionId}.${session.preset ?? "preview"}`;
    const replayEvent = session.profile.replay.eventLog[0];
    const events: BuilderAgUiEvent[] = [
      toolCall(runId, interaction.toolName, { action: command.interaction?.action ?? "primary" }, 0),
      toolResult(runId, interaction.toolName, interaction.payload, 1),
      stateDelta(runId, {
        interactionCount: nextPreview.interactionCount,
        lastToolName: nextPreview.lastToolName,
        lastToolPayload: nextPreview.lastToolPayload
      }, 2),
      playcraftCustomEvent(
        createPlaycraftEnvelope({
          eventId: `event.${session.profile.id}.replay.event.${nextPreview.interactionCount}`,
          profileId: session.profile.id,
          runId,
          payloadType: "replay.event",
          payload: replayEvent,
          provenance: { role: "frontend", sourceId: "builder-session-service" }
        }),
        { sequence: 3 }
      ),
      playcraftCustomEvent(
        createPlaycraftEnvelope({
          eventId: `event.${session.profile.id}.preview.rendered.${nextPreview.interactionCount}`,
          profileId: session.profile.id,
          runId,
          payloadType: "preview.rendered",
          payload: {
            componentId: nextPreview.activeComponentId ?? "unknown.component",
            renderedComponentIds: nextPreview.renderedComponentIds,
            interactionCount: nextPreview.interactionCount
          },
          provenance: { role: "renderer", sourceId: "builder-session-service" }
        }),
        { extraPayloadSchemas: { "preview.rendered": BuilderPreviewPayloadSchema }, sequence: 4 }
      )
    ];

    return { result, events };
  }

  private getOrCreateSession(sessionId: string): BuilderSessionRecord {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing;
    }

    const created: BuilderSessionRecord = {
      sessionId,
      preview: BuilderPreviewStateSchema.parse({
        sessionId,
        renderedComponentIds: [],
        interactionCount: 0
      })
    };
    this.sessions.set(sessionId, created);
    return created;
  }
}

export function createBuilderCommandHandler(): BuilderCommandHandler {
  return new PlaycraftBuilderSessionService();
}

export function requestForPreset(preset: BuilderProfilePreset): PlaycraftAssemblyRequest {
  return mvpAssemblyRequests[PRESET_TO_REQUEST_INDEX[preset]];
}

export function triggerPrimaryButton(node: unknown): boolean {
  if (!node || typeof node !== "object") {
    return false;
  }

  const element = node as { type?: unknown; props?: { onClick?: () => void; children?: unknown } };
  if (element.type === "button" && typeof element.props?.onClick === "function") {
    element.props.onClick();
    return true;
  }

  const children = element.props?.children;
  if (Array.isArray(children)) {
    return children.some((child) => triggerPrimaryButton(child));
  }

  return triggerPrimaryButton(children);
}
