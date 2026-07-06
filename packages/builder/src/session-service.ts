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
  toolResult
} from "@playcraft/ag-ui";
import { DeterministicLocalAssetSource } from "@playcraft/assets";
import {
  BuilderCommandResultSchema,
  BuilderCommandSchema,
  BuilderPreviewStateSchema,
  BuilderSessionOwnershipSchema,
  BuilderTemplateIdSchema,
  GameAssemblyProfileSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderCommand,
  type BuilderSessionOwnership,
  type BuilderSessionSnapshot,
  type BuilderTemplateId,
  type GameAssemblyProfile,
  type JsonValue
} from "@playcraft/contracts";
import { replayProfile } from "@playcraft/core";
import {
  createDefaultPlanner,
  createDefaultRegistries,
  gameTemplateDefinitions
} from "@playcraft/packs";
import { applyAssetEdit } from "./profile-build.js";
import {
  createBuilderSessionOwnership,
  expiredOwnershipFor,
  expiredSessionResult,
  previewForReplay,
  requirePreviewComponentId,
  requireRenderRequestComponentId,
  requireSessionTemplateId,
  requireSinglePreviewReplayEvent,
  requireSinglePreviewToolName,
  renderRequestForTemplatePrimary,
  snapshotForSession,
  type BuilderExecutionEvent,
  type BuilderExecutionResult,
  type BuilderSessionRecord
} from "./ownership.js";
import {
  cloneGameAssemblyProfile,
  customTemplateSnapshotFor,
  requireBuildOrUpdateCommand,
  requestForTemplate,
  templateForBuildOrUpdate,
  validateTemplateForImport,
  type BuildOrUpdateCommand
} from "./templates.js";
import {
  BUILDER_SESSION_POLICY,
  BuilderPreviewPayloadSchema,
  builderToolDefinitions,
  type BuilderCommandHandler
} from "./index.js";

export class PlaycraftBuilderSessionService implements BuilderCommandHandler {
  private readonly registries = createDefaultRegistries();
  private readonly assetSource = new DeterministicLocalAssetSource();
  private readonly planner = createDefaultPlanner({ registries: this.registries, assetSource: this.assetSource });
  private readonly sessions = new Map<string, BuilderSessionRecord>();

  execute(commandInput: BuilderCommand): BuilderExecutionResult {
    const command = BuilderCommandSchema.parse(commandInput);
    const session = this.getOrCreateSession(command.sessionId);

    const expired = expiredOwnershipFor(command.sessionId, session.ownership);
    if (expired) {
      return expiredSessionResult(command.sessionId, expired);
    }

    switch (command.actionName) {
      case "assemble-game":
      case "update-game":
        return this.buildOrUpdate(session, requireBuildOrUpdateCommand(command));
      case "preview-action":
        return this.previewAction(session, command);
      case "list-builder-tools":
        return this.catalogResult(session, command);
      case "get-session":
      case "export-profile":
        return this.sessionResult(session, command);
      case "import-profile":
        if (!command.profile) {
          throw new Error("import-profile requires a profile");
        }
        return this.importProfile(command.sessionId, command.profile, command.id);
      default:
        throw new Error(`unsupported command ${(command as { actionName: string }).actionName}`);
    }
  }

  setSessionOwnership(sessionId: string, ownership: BuilderSessionOwnership): void {
    const session = this.getOrCreateSession(sessionId);
    session.ownership = BuilderSessionOwnershipSchema.parse(ownership);
  }

  assembleTemplates(templateIds: BuilderTemplateId[], sessionId: string = BUILDER_SESSION_POLICY.defaultBatchSessionId): BuilderExecutionResult[] {
    return templateIds.map((templateId, index) =>
      this.execute({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: `builder-command.${sessionId}.${index + 1}`,
        version: "1.0.0",
        kind: "builder-command",
        sessionId,
        actionName: index === 0 ? "assemble-game" : "update-game",
        templateId
      })
    );
  }

  listTools(): typeof builderToolDefinitions {
    return [...builderToolDefinitions];
  }

  listTemplates(): typeof gameTemplateDefinitions {
    return [...gameTemplateDefinitions];
  }

  getSessionSnapshot(sessionId: string): BuilderSessionSnapshot {
    return snapshotForSession(this.getOrCreateSession(sessionId));
  }

  importProfile(sessionId: string, profileInput: GameAssemblyProfile, commandId = `builder-command.${sessionId}.import-profile`): BuilderExecutionResult {
    const session = this.getOrCreateSession(sessionId);
    const parsedProfile = GameAssemblyProfileSchema.parse(profileInput);
    validateTemplateForImport(parsedProfile);
    const profile = cloneGameAssemblyProfile(parsedProfile);
    const template = customTemplateSnapshotFor(profile);
    const replay = replayProfile(profile, this.registries);
    const preview = previewForReplay(sessionId, template.id, profile, replay, session.preview);

    session.templateId = template.id;
    session.profile = profile;
    session.replay = replay;
    session.preview = preview;
    session.ownership = createBuilderSessionOwnership(Date.now());

    const result = BuilderCommandResultSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-result.${commandId}`,
      version: "1.0.0",
      kind: "builder-command-result",
      commandId,
      sessionId: session.sessionId,
      profile,
      preview,
      validation: profile.validation
    });
    const runId = `${sessionId}.${template.id}.import`;

    return {
      result,
      events: [
        runStarted(runId, 0),
        toolCall(runId, "tool:import-profile", { profileId: profile.id, templateId: template.id }, 1),
        toolResult(runId, "tool:import-profile", { profileId: profile.id, valid: profile.validation.valid }, 2),
        stateSnapshot(runId, { sessionId, templateId: template.id, profileId: profile.id }, 3),
        playcraftCustomEvent(
          createPlaycraftEnvelope({
            eventId: `event.${profile.id}.imported`,
            profileId: profile.id,
            runId,
            payloadType: "profile.validated",
            payload: profile,
            provenance: { role: "validator", sourceId: "builder-session-service" }
          }),
          { sequence: 4 }
        ),
        playcraftCustomEvent(
          createPlaycraftEnvelope({
            eventId: `event.${profile.id}.import.replay.ready`,
            profileId: profile.id,
            runId,
            payloadType: "replay.ready",
            payload: { profileId: profile.id, replayable: profile.validation.valid },
            provenance: { role: "validator", sourceId: "builder-session-service" }
          }),
          { sequence: 5 }
        ),
        runFinished(runId, 6)
      ]
    };
  }

  private buildOrUpdate(session: BuilderSessionRecord, command: BuildOrUpdateCommand): BuilderExecutionResult {
    const templateId = BuilderTemplateIdSchema.parse(command.templateId);
    const template = templateForBuildOrUpdate(session, command.actionName, templateId);
    const runId = `${command.sessionId}.${templateId}`;
    const baseProfile =
      command.actionName === "update-game" && session.profile && session.templateId === templateId
        ? session.profile
        : this.planner.assemble(requestForTemplate(templateId));
    const profile = applyAssetEdit(baseProfile, command.assetEdit, this.assetSource, this.registries);
    const replay = replayProfile(profile, this.registries);
    const preview = previewForReplay(session.sessionId, templateId, profile, replay, session.preview);

    session.templateId = templateId;
    session.profile = profile;
    session.replay = replay;
    session.preview = preview;
    session.ownership = createBuilderSessionOwnership(Date.now());

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

    const toolName = command.actionName === "update-game" ? "tool:update-game" : "tool:assemble-game";
    const stateEvent =
      command.actionName === "update-game"
        ? stateDelta(runId, { sessionId: session.sessionId, templateId, profileId: profile.id, assetEdit: command.assetEdit ?? null }, 3)
        : stateSnapshot(runId, { sessionId: session.sessionId, templateId, profileId: profile.id, assetEdit: command.assetEdit ?? null }, 3);

    const events: BuilderExecutionEvent[] = [
      runStarted(runId, 0),
      stepStarted(runId, `${command.actionName}.plan`, `${command.actionName} planner`, 1),
      activity(runId, "builder.profile", "started", `assembling ${template.displayName}`, 2),
      stateEvent,
      toolCall(runId, toolName, { requestId: template.assemblyRequestId, templateId, assetEdit: command.assetEdit ?? null, input: command.input ?? null }, 4),
      toolResult(runId, toolName, { profileId: profile.id, valid: result.validation?.valid ?? false }, 5),
      playcraftCustomEvent(
        createPlaycraftEnvelope({
          eventId: `event.${profile.id}.proposed`,
          profileId: profile.id,
          runId,
          payloadType: "profile.proposed",
          payload: profile,
          provenance: { role: "planner", sourceId: "builder-session-service" }
        }),
        { sequence: 6 }
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
        { sequence: 7 }
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
        { sequence: 8 }
      ),
      playcraftCustomEvent(
        createPlaycraftEnvelope({
          eventId: `event.${profile.id}.preview.rendered`,
          profileId: profile.id,
          runId,
          payloadType: "preview.rendered",
          payload: {
            componentId: requirePreviewComponentId(preview),
            renderedComponentIds: preview.renderedComponentIds,
            interactionCount: preview.interactionCount
          },
          provenance: { role: "renderer", sourceId: "builder-session-service" }
        }),
        { extraPayloadSchemas: { "preview.rendered": BuilderPreviewPayloadSchema }, sequence: 9 }
      ),
      activity(runId, "builder.profile", "finished", `assembled ${profile.profileName}`, 10),
      stepFinished(runId, `${command.actionName}.plan`, 11),
      runFinished(runId, 12)
    ];

    return { result, events };
  }

  private catalogResult(session: BuilderSessionRecord, command: BuilderCommand): BuilderExecutionResult {
    const preview = BuilderPreviewStateSchema.parse(session.preview);
    const result = BuilderCommandResultSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-result.${command.id}`,
      version: "1.0.0",
      kind: "builder-command-result",
      commandId: command.id,
      sessionId: session.sessionId,
      preview
    });
    const runId = `${command.sessionId}.catalog`;

    return {
      result,
      events: [
        toolCall(runId, "tool:list-builder-tools", { localOnly: true }, 0),
        toolResult(runId, "tool:list-builder-tools", {
          tools: this.listTools().map((toolDefinition) => toolDefinition.toolName),
          templates: this.listTemplates().map((template) => template.id)
        }, 1),
        stateSnapshot(runId, {
          toolCount: this.listTools().length,
          templateCount: this.listTemplates().length
        }, 2)
      ]
    };
  }

  private previewAction(session: BuilderSessionRecord, command: BuilderCommand): BuilderExecutionResult {
    if (!session.profile || !session.replay) {
      throw new Error("preview-action requires an existing built session");
    }

    const renderRequest = renderRequestForTemplatePrimary(session.profile, session.replay);

    const componentId = requireRenderRequestComponentId(renderRequest);
    const toolName = requireSinglePreviewToolName(renderRequest);

    const action = command.interaction?.action;
    if (!action) {
      throw new Error("preview-action requires an interaction action");
    }

    const interaction = {
      toolName,
      payload: {
        componentId,
        action
      } satisfies JsonValue
    };
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

    const runId = `${command.sessionId}.${requireSessionTemplateId(session)}`;
    const replayEvent = requireSinglePreviewReplayEvent(session.profile);
    const events: BuilderExecutionEvent[] = [
      toolCall(runId, interaction.toolName, { action }, 0),
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
            componentId: requirePreviewComponentId(nextPreview),
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

  private sessionResult(session: BuilderSessionRecord, command: BuilderCommand): BuilderExecutionResult {
    const result = BuilderCommandResultSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-result.${command.id}`,
      version: "1.0.0",
      kind: "builder-command-result",
      commandId: command.id,
      sessionId: session.sessionId,
      profile: session.profile,
      preview: session.preview,
      validation: session.profile?.validation
    });
    const runId = `${command.sessionId}.${command.actionName}`;
    const toolName = command.actionName === "export-profile" ? "tool:export-profile" : "tool:get-session";

    return {
      result,
      events: [
        toolCall(runId, toolName, { sessionId: session.sessionId }, 0),
        toolResult(runId, toolName, { profileId: session.profile?.id ?? null, templateId: session.templateId ?? null }, 1),
        stateSnapshot(runId, snapshotForSession(session), 2)
      ]
    };
  }

  private getOrCreateSession(sessionId: string): BuilderSessionRecord {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing;
    }

    const created: BuilderSessionRecord = {
      sessionId,
      preview: BuilderPreviewStateSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        sessionId,
        renderedComponentIds: [],
        interactionCount: 0
      })
    };
    this.sessions.set(sessionId, created);
    return created;
  }
}

export function createBuilderCommandHandler(): import("./index.js").BuilderCommandHandler {
  return new PlaycraftBuilderSessionService();
}
