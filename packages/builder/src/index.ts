import { z } from "zod";
import { DeterministicLocalAssetSource, localAssetEditCatalog, localAssetEditFreeformItemSuffixes } from "@playcraft/assets";
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
  AssetGenerationRequestSchema,
  BuilderCommandResultSchema,
  BuilderCommandSchema,
  BuilderPreviewStateSchema,
  BuilderSessionSnapshotSchema,
  BuilderAssetEditSchema,
  BuilderTemplateIdSchema,
  BuilderTemplateNamespaceSchema,
  BuilderToolDefinitionSchema,
  GameAssemblyProfileSchema,
  PLAYCRAFT_LOCAL_TIMESTAMP,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderAssetEdit,
  type BuilderCommand,
  type BuilderCommandResult,
  type BuilderPreviewState,
  type BuilderSessionSnapshot,
  type BuilderTemplateId,
  type BuilderToolDefinition,
  type GameAssemblyProfile,
  type GameProfileTemplateSnapshot,
  type GameTemplateAssetEditOperation,
  type GameTemplateDefinition,
  type GeneratedAssetRecord,
  type JsonObjectSchemaDescriptor,
  type JsonValue,
  type PlaycraftAssemblyRequest,
  type PlaycraftEventRecord
} from "@playcraft/contracts";
import { replayProfile, validateGameAssemblyProfile, type PlaycraftRegistries, type ReplayResult } from "@playcraft/core";
import {
  createDefaultPlanner,
  createDefaultRegistries,
  gameTemplateDefinitions,
  mvpAssemblyRequests
} from "@playcraft/packs";

export const PLAYCRAFT_BUILDER_PACKAGE = "@playcraft/builder";

export const BUILDER_SESSION_POLICY = {
  defaultAssembleSessionId: "builder.cli",
  defaultBatchSessionId: "builder.batch",
  defaultCatalogSessionId: "builder.cli"
} as const;

const BUILDER_ARGUMENT_SUMMARY_LABELS = {
  empty: "none",
  prefix: "args"
} as const;

export const BuilderPreviewPayloadSchema = z
  .object({
    componentId: z.string().min(1),
    renderedComponentIds: z.array(z.string().min(1)).min(1),
    interactionCount: z.number().int().nonnegative()
  })
  .strict();

export type BuilderAgUiEvent = AgUiEvent;

export const builderToolDefinitions: BuilderToolDefinition[] = [
  builderTool("builder-tool.assemble-game", "tool:assemble-game", "Assemble Game", "Assemble a mini-game from a registered local template.", "assemble-game", ["text", "moonshine-transcript"]),
  builderTool("builder-tool.update-game", "tool:update-game", "Update Game", "Update the active mini-game template or its asset edit levers.", "update-game", ["text", "moonshine-transcript"]),
  builderTool("builder-tool.preview-action", "tool:preview-action", "Preview Action", "Replay one trusted UI interaction against the active profile.", "preview-action", []),
  builderTool("builder-tool.list-builder-tools", "tool:list-builder-tools", "List Builder Tools", "List the local Playcraft builder tools and bundled game templates.", "list-builder-tools", []),
  builderTool("builder-tool.get-session", "tool:get-session", "Get Session", "Inspect the active local builder session snapshot.", "get-session", []),
  builderTool("builder-tool.export-profile", "tool:export-profile", "Export Profile", "Export the active validated game profile for reuse.", "export-profile", []),
  builderTool("builder-tool.import-profile", "tool:import-profile", "Import Profile", "Import a validated game profile into a local session.", "import-profile", [])
];

const TEMPLATE_BY_ID = new Map(gameTemplateDefinitions.map((template) => [template.id, template]));
const REQUEST_BY_ID = new Map(mvpAssemblyRequests.map((request) => [request.id, request]));

export interface BuilderSessionRecord {
  sessionId: string;
  templateId?: BuilderTemplateId;
  profile?: GameAssemblyProfile;
  replay?: ReplayResult;
  preview: BuilderPreviewState;
}

export interface BuilderExecutionResult {
  result: BuilderCommandResult;
  events: BuilderAgUiEvent[];
}

type BuildOrUpdateCommand = BuilderCommand & {
  actionName: Extract<BuilderCommand["actionName"], "assemble-game" | "update-game">;
};

export interface BuilderCommandHandler {
  execute(command: BuilderCommand): BuilderExecutionResult;
  assembleTemplates(templateIds: BuilderTemplateId[], sessionId?: string): BuilderExecutionResult[];
  getSessionSnapshot(sessionId: string): BuilderSessionSnapshot;
  importProfile(sessionId: string, profile: GameAssemblyProfile, commandId?: string): BuilderExecutionResult;
  listTools(): BuilderToolDefinition[];
  listTemplates(): GameTemplateDefinition[];
}

export class PlaycraftBuilderSessionService implements BuilderCommandHandler {
  private readonly registries = createDefaultRegistries();
  private readonly assetSource = new DeterministicLocalAssetSource();
  private readonly planner = createDefaultPlanner({ registries: this.registries, assetSource: this.assetSource });
  private readonly sessions = new Map<string, BuilderSessionRecord>();

  execute(commandInput: BuilderCommand): BuilderExecutionResult {
    const command = BuilderCommandSchema.parse(commandInput);
    const session = this.getOrCreateSession(command.sessionId);

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

  assembleTemplates(templateIds: BuilderTemplateId[], sessionId = BUILDER_SESSION_POLICY.defaultBatchSessionId): BuilderExecutionResult[] {
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

  listTools(): BuilderToolDefinition[] {
    return [...builderToolDefinitions];
  }

  listTemplates(): GameTemplateDefinition[] {
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

    const events: BuilderAgUiEvent[] = [
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
    const events: BuilderAgUiEvent[] = [
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

function snapshotForSession(session: BuilderSessionRecord): BuilderSessionSnapshot {
  return BuilderSessionSnapshotSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    kind: "builder-session-snapshot",
    sessionId: session.sessionId,
    activeTemplateId: session.templateId,
    activeProfileId: session.profile?.id,
    profile: session.profile,
    preview: session.preview,
    validation: session.profile?.validation,
    updatedAt: PLAYCRAFT_LOCAL_TIMESTAMP
  });
}

function previewForReplay(
  sessionId: string,
  templateId: BuilderTemplateId,
  profile: GameAssemblyProfile,
  replay: ReplayResult,
  previousPreview: BuilderPreviewState
): BuilderPreviewState {
  const primaryRequest = renderRequestForTemplatePrimary(profile, replay);

  return BuilderPreviewStateSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    sessionId,
    activeProfileId: profile.id,
    activeTemplateId: templateId,
    activeComponentId: requireRenderRequestComponentId(primaryRequest),
    renderedComponentIds: replay.renderRequests.map(requireRenderRequestComponentId),
    interactionCount: previousPreview.interactionCount,
    lastToolName: previousPreview.lastToolName,
    lastToolPayload: previousPreview.lastToolPayload
  });
}

function requirePreviewComponentId(preview: BuilderPreviewState): string {
  if (!preview.activeComponentId) {
    throw new Error(`preview state for session ${preview.sessionId} does not include an active component id`);
  }

  return preview.activeComponentId;
}

function requireSessionTemplateId(session: BuilderSessionRecord): BuilderTemplateId {
  if (!session.templateId) {
    throw new Error(`session ${session.sessionId} does not include an active template id`);
  }

  return session.templateId;
}

function requireSinglePreviewReplayEvent(profile: GameAssemblyProfile): PlaycraftEventRecord {
  if (profile.replay.eventLog.length !== 1) {
    throw new Error(`profile ${profile.id} preview requires exactly one replay event`);
  }

  const [replayEvent] = profile.replay.eventLog;
  if (!replayEvent) {
    throw new Error(`profile ${profile.id} preview requires exactly one replay event`);
  }

  return replayEvent;
}

function requireRenderRequestComponentId(renderRequest: ReplayResult["renderRequests"][number] | undefined): string {
  if (!renderRequest?.componentId) {
    throw new Error("replay render request does not include a concrete component id");
  }

  return renderRequest.componentId;
}

function renderRequestForTemplatePrimary(profile: GameAssemblyProfile, replay: ReplayResult): ReplayResult["renderRequests"][number] {
  const primaryCapability = profile.template.liveSurface.componentCapabilities.primary;
  const matches = replay.renderRequests.filter((request) => request.componentCapability === primaryCapability);
  if (matches.length === 0) {
    throw new Error(`profile ${profile.id} does not include live-surface primary component ${primaryCapability}`);
  }
  if (matches.length > 1) {
    throw new Error(`profile ${profile.id} has multiple live-surface primary render requests for ${primaryCapability}`);
  }

  return requireSingleValue(matches, `live-surface primary render request for ${primaryCapability}`);
}

function requireSinglePreviewToolName(renderRequest: ReplayResult["renderRequests"][number]): string {
  if (renderRequest.emittedToolNames.length !== 1) {
    throw new Error(`interactive render request ${renderRequest.id} must declare exactly one emitted tool`);
  }

  return renderRequest.emittedToolNames.at(0)!;
}

export function createBuilderCommandHandler(): BuilderCommandHandler {
  return new PlaycraftBuilderSessionService();
}

export function requestForTemplate(templateIdInput: BuilderTemplateId): PlaycraftAssemblyRequest {
  const templateId = BuilderTemplateIdSchema.parse(templateIdInput);
  const template = templateForId(templateId);
  const request = REQUEST_BY_ID.get(template.assemblyRequestId);
  if (!request) {
    throw new Error(`template ${templateId} references missing request ${template.assemblyRequestId}`);
  }
  return request;
}

function templateForId(templateId: BuilderTemplateId): GameTemplateDefinition {
  const template = TEMPLATE_BY_ID.get(templateId);
  if (!template) {
    throw new Error(`unknown game template ${templateId}`);
  }
  return template;
}

function templateForProfile(profile: GameAssemblyProfile): GameProfileTemplateSnapshot {
  return profile.template;
}

export function customTemplateSnapshotFor(profile: GameAssemblyProfile): GameProfileTemplateSnapshot {
  const parsed = GameAssemblyProfileSchema.parse(profile);
  return parsed.template;
}

function validateTemplateForImport(profile: GameAssemblyProfile): void {
  const snapshot = profile.template;
  const parsedSnapshotId = BuilderTemplateIdSchema.parse(snapshot.id);

  if (parsedSnapshotId.startsWith("template.custom.")) {
    BuilderTemplateNamespaceSchema.parse(parsedSnapshotId);
    return;
  }

  const bundled = TEMPLATE_BY_ID.get(parsedSnapshotId);
  if (bundled) {
    if (bundled.assemblyRequestId !== profile.assemblyRequestId || bundled.assemblyRequestId !== snapshot.assemblyRequestId) {
      throw new Error(
        `${parsedSnapshotId} collides with bundled template ${bundled.id}; re-imported profiles must reuse the bundled assemblyRequestId ${bundled.assemblyRequestId}`
      );
    }
    return;
  }

  throw new Error(`${parsedSnapshotId} must start with template.custom. to import as a custom template`);
}

function cloneGameAssemblyProfile(profile: GameAssemblyProfile): GameAssemblyProfile {
  const cloned = structuredClone(profile) as GameAssemblyProfile;
  return GameAssemblyProfileSchema.parse(cloned);
}

function templateForBuildOrUpdate(
  session: BuilderSessionRecord,
  actionName: Extract<BuilderCommand["actionName"], "assemble-game" | "update-game">,
  templateId: BuilderTemplateId
): GameTemplateDefinition | GameProfileTemplateSnapshot {
  if (actionName === "update-game" && session.profile && session.templateId === templateId) {
    return templateForProfile(session.profile);
  }

  const bundled = TEMPLATE_BY_ID.get(templateId);
  if (bundled) {
    return bundled;
  }

  if (session.profile && session.templateId === templateId) {
    return templateForProfile(session.profile);
  }

  throw new Error(`unknown game template ${templateId}`);
}

function requireBuildOrUpdateCommand(command: BuilderCommand): BuildOrUpdateCommand {
  if (command.actionName === "assemble-game" || command.actionName === "update-game") {
    return command as BuildOrUpdateCommand;
  }

  throw new Error(`command ${command.actionName} is not a build or update command`);
}

function builderTool(
  id: string,
  toolName: string,
  displayName: string,
  description: string,
  actionName: BuilderToolDefinition["actionName"],
  acceptedInputSources: BuilderToolDefinition["acceptedInputSources"]
): BuilderToolDefinition {
  const argumentsSchema = builderToolArgumentsSchema(actionName);

  return BuilderToolDefinitionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "builder-tool",
    toolName,
    displayName,
    description,
    actionName,
    argumentsSchema,
    argumentSummary: builderToolArgumentSummary(argumentsSchema),
    acceptedInputSources,
    inputSourceSummary: builderToolInputSourceSummary(acceptedInputSources),
    localOnly: true,
    emittedEvents: ["builder:command", "builder:profile-ready"],
    requiredContracts: builderToolRequiredContracts(actionName)
  });
}

function builderToolRequiredContracts(actionName: BuilderToolDefinition["actionName"]): BuilderToolDefinition["requiredContracts"] {
  const contractsByAction: Record<BuilderToolDefinition["actionName"], BuilderToolDefinition["requiredContracts"]> = {
    "assemble-game": ["BuilderCommandSchema", "BuilderInputRequestSchema", "GameTemplateDefinitionSchema"],
    "update-game": ["BuilderCommandSchema", "BuilderInputRequestSchema", "GameTemplateDefinitionSchema"],
    "preview-action": ["BuilderCommandSchema", "BuilderPreviewStateSchema"],
    "list-builder-tools": ["BuilderToolDefinitionSchema", "GameTemplateDefinitionSchema"],
    "get-session": ["BuilderCommandSchema", "BuilderSessionSnapshotSchema"],
    "export-profile": ["BuilderCommandSchema", "BuilderProfileExportSchema"],
    "import-profile": ["BuilderCommandSchema", "GameAssemblyProfileSchema"]
  };

  return contractsByAction[actionName];
}

function builderToolArgumentSummary(schema: JsonObjectSchemaDescriptor): string {
  const summary = Object.entries(schema.fields).map(([name, field]) => `${name}${field.required ? "*" : ""}:${field.type}`);
  return `${BUILDER_ARGUMENT_SUMMARY_LABELS.prefix}: ${summary.length > 0 ? summary.join(", ") : BUILDER_ARGUMENT_SUMMARY_LABELS.empty}`;
}

function builderToolInputSourceSummary(sources: BuilderToolDefinition["acceptedInputSources"]): string {
  if (sources.length === 0) {
    return "input: none";
  }

  const labels: Record<BuilderToolDefinition["acceptedInputSources"][number], string> = {
    text: "Text",
    "moonshine-transcript": "Transcript"
  };
  return `input: ${sources.map((source) => labels[source]).join(", ")}`;
}

function builderToolArgumentsSchema(actionName: BuilderToolDefinition["actionName"]): JsonObjectSchemaDescriptor {
  const optionalString = { type: "string", required: false } as const;
  const requiredString = { type: "string", required: true } as const;
  const optionalObject = { type: "object", required: false } as const;
  const previewInteraction: JsonObjectSchemaDescriptor["fields"][string] = {
    type: "object",
    required: true,
    fields: {
      action: {
        type: "string",
        required: true,
        allowedValues: ["primary"]
      }
    },
    allowUnknown: false
  };

  const fieldsByAction: Record<BuilderToolDefinition["actionName"], JsonObjectSchemaDescriptor["fields"]> = {
    "assemble-game": {
      assetEdit: optionalObject,
      input: optionalObject,
      sessionId: optionalString,
      templateId: requiredString
    },
    "update-game": {
      assetEdit: optionalObject,
      input: optionalObject,
      sessionId: requiredString,
      templateId: requiredString
    },
    "preview-action": {
      interaction: previewInteraction,
      sessionId: requiredString
    },
    "list-builder-tools": {
      sessionId: optionalString
    },
    "get-session": {
      sessionId: requiredString
    },
    "export-profile": {
      sessionId: requiredString
    },
    "import-profile": {
      profile: { type: "object", required: true },
      sessionId: requiredString
    }
  };

  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    type: "object",
    fields: fieldsByAction[actionName],
    allowUnknown: false
  };
}

interface NormalizedAssetEdit {
  theme: string;
  singularTheme: string;
  items: string[];
  itemsSource: "explicit" | "catalog" | "freeform";
}

function applyAssetEdit(
  profile: GameAssemblyProfile,
  assetEdit: BuilderAssetEdit | undefined,
  assetSource: DeterministicLocalAssetSource,
  registries: PlaycraftRegistries
): GameAssemblyProfile {
  const edit = normalizeAssetEdit(assetEdit);
  if (!edit) {
    return profile;
  }
  const template = templateForProfile(profile);
  const assetRequestItems = assetEditItemsForAssetRequests(template, profile, edit);

  const assetRequests = profile.assetRequests.map((request) =>
    AssetGenerationRequestSchema.parse({
      ...request,
      prompt: promptForAssetEdit(template, edit, assetRequestItems),
      metadata: {
        ...request.metadata,
        assetEditTheme: edit.theme,
        assetEditItems: assetRequestItems
      }
    })
  );
  const assets = assetSource.generateBatch(assetRequests);
  const components = profile.components.map((component) => ({
    ...component,
    props: editComponentProps(
      assetEditOperationForComponent(template, component.renderCapability),
      component.props,
      edit
    ),
    assetBindings: rewriteAssetBindings(component.assetBindings, profile.assets, assets)
  }));
  const editedProfile = GameAssemblyProfileSchema.parse({
    ...profile,
    components,
    assetRequests,
    assets
  });

  return GameAssemblyProfileSchema.parse({
    ...editedProfile,
    validation: validateGameAssemblyProfile(editedProfile, registries)
  });
}

function assetEditOperationForComponent(
  template: GameProfileTemplateSnapshot,
  componentCapability: string
): GameTemplateAssetEditOperation | undefined {
  const operations = template.assetEditOperations.filter((operation) => operation.componentCapability === componentCapability);
  if (operations.length > 1) {
    throw new Error(`${template.id} has multiple asset edit operations for ${componentCapability}`);
  }
  return singleValue(operations);
}

function normalizeAssetEdit(assetEdit: BuilderAssetEdit | undefined): NormalizedAssetEdit | undefined {
  if (!assetEdit) {
    return undefined;
  }

  const parsedAssetEdit = BuilderAssetEditSchema.parse(assetEdit);
  const theme = cleanLabel(parsedAssetEdit.theme ?? parsedAssetEdit.items?.join(" ") ?? "");
  const items = (parsedAssetEdit.items ?? []).map(cleanLabel).filter(Boolean);
  const normalizedTheme = theme || items.join(" ");
  const singularTheme = singularize(normalizedTheme);
  const catalogEntry = assetEditCatalogEntryFor(normalizedTheme);
  const itemsSource = parsedAssetEdit.items ? "explicit" : catalogEntry ? "catalog" : "freeform";

  return {
    theme: normalizedTheme,
    singularTheme,
    items: items.length > 0 ? items : catalogEntry?.suggestedItems ?? freeformItemsForTheme(singularTheme),
    itemsSource
  };
}

function editComponentProps(
  operation: GameTemplateAssetEditOperation | undefined,
  props: Record<string, JsonValue>,
  edit: NormalizedAssetEdit
): Record<string, JsonValue> {
  switch (operation?.operation) {
    case "memory-pairs":
      const pairCount = requireMemoryPairCount(props);
      const cards = pairedCardIds(edit, pairCount);
      return {
        ...props,
        title: `${titleCase(edit.theme)} pairs`,
        cards,
        pairs: pairMapForCards(cards),
        columns: requireNumberProp(props, "columns", "memory-pairs")
      };
    case "choice-items":
      return {
        ...props,
        title: `Choose ${articleFor(edit.singularTheme)} ${edit.singularTheme}`,
        prompt: `Pick one ${edit.singularTheme}.`,
        items: edit.items
      };
    case "sorting-items": {
      const activeBins = requireStringArrayProp(props, "bins", "sorting-items");
      const items = requireAssetEditItemsForBins(edit, activeBins);
      return {
        ...props,
        title: `${titleCase(edit.theme)} bins`,
        items,
        bins: activeBins,
        targets: Object.fromEntries(items.map((item, index) => [item, activeBins[index]]))
      };
    }
    case "sequence-items":
      const sourceSequence = requireStringArrayProp(props, "sequence", "sequence-items");
      const sourceRounds = requireStringMatrixProp(props, "rounds", "sequence-items");
      const sequenceTokenMap = tokenMapForSequence([...sourceSequence, ...sourceRounds.flat()], edit);
      const sequence = remapSequenceTokens(sourceSequence, sequenceTokenMap);
      const rounds = remapSequenceRounds(sourceRounds, sequenceTokenMap);
      return {
        ...props,
        title: `Repeat the ${edit.singularTheme} pattern`,
        prompt: `Tap the ${edit.singularTheme} buttons in the same order.`,
        sequence,
        rounds
      };
    case "completion-message":
      return {
        ...props,
        message: `${titleCase(edit.theme)} round complete.`
      };
    case "hint-message":
      return {
        ...props,
        hint: `Look for the ${edit.singularTheme} clue first.`
      };
    default:
      return props;
  }
}

function promptForAssetEdit(
  template: GameTemplateDefinition | GameProfileTemplateSnapshot,
  edit: NormalizedAssetEdit,
  assetRequestItems: string[]
): string {
  switch (template.assetPromptKind) {
    case "memory-cards":
      return `child-safe ${edit.theme} memory card illustrations for ${assetRequestItems.join(", ")}`;
    case "sorting-game":
      return `child-safe ${edit.theme} sorting game illustrations for ${assetRequestItems.join(", ")}`;
    case "sequence-buttons":
      return `child-safe ${edit.theme} sequence game button illustrations for ${assetRequestItems.join(", ")}`;
    case "general-game":
      return `child-safe ${edit.theme} game illustrations for ${template.displayName}`;
  }
}

function assetEditItemsForAssetRequests(
  template: GameTemplateDefinition | GameProfileTemplateSnapshot,
  profile: GameAssemblyProfile,
  edit: NormalizedAssetEdit
): string[] {
  switch (template.assetPromptKind) {
    case "memory-cards":
      return requireAssetEditItemsForMemoryPairs(
        edit,
        requireMemoryPairCount(propsForAssetEditOperation(template, profile, "memory-pairs"))
      );
    case "sorting-game":
      return requireAssetEditItemsForBins(
        edit,
        requireStringArrayProp(propsForAssetEditOperation(template, profile, "sorting-items"), "bins", "sorting-items")
      );
    case "sequence-buttons": {
      const props = propsForAssetEditOperation(template, profile, "sequence-items");
      const sourceSequence = requireStringArrayProp(props, "sequence", "sequence-items");
      const sourceRounds = requireStringMatrixProp(props, "rounds", "sequence-items");
      return requireAssetEditItemsForSequence(edit, [...sourceSequence, ...sourceRounds.flat()]);
    }
    case "general-game":
      return edit.items;
  }
}

function propsForAssetEditOperation(
  template: GameTemplateDefinition | GameProfileTemplateSnapshot,
  profile: GameAssemblyProfile,
  operationKind: GameTemplateAssetEditOperation["operation"]
): Record<string, JsonValue> {
  const operations = template.assetEditOperations.filter((operation) => operation.operation === operationKind);
  if (operations.length !== 1) {
    throw new Error(`${template.id} requires exactly one ${operationKind} asset edit operation for asset requests`);
  }

  const [operation] = operations;
  const components = profile.components.filter((entry) => entry.renderCapability === operation.componentCapability);
  if (components.length === 0) {
    throw new Error(`${profile.id} is missing component ${operation.componentCapability} for ${operationKind} asset requests`);
  }
  if (components.length > 1) {
    throw new Error(`${profile.id} has multiple components for ${operation.componentCapability} ${operationKind} asset requests`);
  }
  const [component] = components;

  return component.props;
}

function pairedCardIds(edit: NormalizedAssetEdit, pairCount: number): string[] {
  const bases = requireAssetEditItemsForMemoryPairs(edit, pairCount);
  return bases.flatMap((item) => {
    const cardBase = slugLabel(item);
    return [`${cardBase}-a`, `${cardBase}-b`];
  });
}

function requireAssetEditItemsForMemoryPairs(edit: NormalizedAssetEdit, pairCount: number): string[] {
  if (edit.itemsSource === "explicit" && edit.items.length !== pairCount) {
    throw new Error(`memory-pairs explicit asset edit items require exactly ${pairCount} items for authored pairs`);
  }

  if (edit.items.length < pairCount) {
    throw new Error(`memory-pairs requires at least ${pairCount} asset edit items for authored pairs`);
  }

  return edit.items.slice(0, pairCount);
}

function requireMemoryPairCount(props: Record<string, JsonValue>): number {
  const cards = requireStringArrayProp(props, "cards", "memory-pairs");
  const pairs = requireStringRecordProp(props, "pairs", "memory-pairs");
  const pairIds = cards.map((card) => {
    const pairId = pairs[card];
    if (!pairId) {
      throw new Error(`memory-pairs card ${card} is missing an authored pair id`);
    }

    return pairId;
  });
  const uniquePairIds = uniqueStrings(pairIds);
  const cardsPerPair = new Map(uniquePairIds.map((pairId) => [pairId, 0]));
  for (const pairId of pairIds) {
    cardsPerPair.set(pairId, (cardsPerPair.get(pairId) ?? 0) + 1);
  }
  const invalidPairs = [...cardsPerPair.entries()].filter(([, count]) => count !== 2);
  if (invalidPairs.length > 0) {
    throw new Error(`memory-pairs authored pairs must contain exactly two cards: ${invalidPairs.map(([pairId]) => pairId).join(", ")}`);
  }

  return uniquePairIds.length;
}

function pairMapForCards(cards: string[]): Record<string, string> {
  const pairs: Record<string, string> = {};
  for (let index = 0; index < cards.length; index += 2) {
    const first = cards[index];
    const second = cards[index + 1];
    const pairKey = `pair-${Math.floor(index / 2) + 1}`;
    if (first) {
      pairs[first] = pairKey;
    }
    if (second) {
      pairs[second] = pairKey;
    }
  }

  return pairs;
}

function assetEditCatalogEntryFor(theme: string): typeof localAssetEditCatalog[number] | undefined {
  const candidate = cleanLabel(theme);
  const matches = localAssetEditCatalog.filter((entry) =>
    [entry.theme, ...entry.aliases].some((alias) => cleanLabel(alias) === candidate)
  );
  if (matches.length > 1) {
    throw new Error(`asset edit theme ${theme} maps to multiple builder asset edit catalog entries: ${matches.map((entry) => entry.theme).join(", ")}`);
  }

  return singleValue(matches);
}

function freeformItemsForTheme(singularTheme: string): string[] {
  const base = slugLabel(singularTheme);
  return localAssetEditFreeformItemSuffixes.map((suffix) => `${base}-${suffix}`);
}

function requireAssetEditItemsForBins(edit: NormalizedAssetEdit, bins: string[]): string[] {
  if (edit.itemsSource === "explicit" && edit.items.length !== bins.length) {
    throw new Error(`sorting-items explicit asset edit items require exactly ${bins.length} items for bins ${bins.join(", ")}`);
  }

  if (edit.items.length < bins.length) {
    throw new Error(`sorting-items requires at least ${bins.length} asset edit items for bins ${bins.join(", ")}`);
  }

  return edit.items.slice(0, bins.length);
}

function requireAssetEditItemsForSequence(edit: NormalizedAssetEdit, tokens: string[]): string[] {
  const uniqueTokens = uniqueStrings(tokens);
  if (edit.itemsSource === "explicit" && edit.items.length !== uniqueTokens.length) {
    throw new Error(`sequence-items explicit asset edit items require exactly ${uniqueTokens.length} items for sequence tokens ${uniqueTokens.join(", ")}`);
  }

  if (edit.items.length < uniqueTokens.length) {
    throw new Error(`sequence-items requires at least ${uniqueTokens.length} asset edit items for sequence tokens ${uniqueTokens.join(", ")}`);
  }

  return edit.items.slice(0, uniqueTokens.length);
}

function remapSequenceTokens(tokens: string[], tokenMap: Map<string, string>): string[] {
  return tokens.map((token) => tokenMap.get(token) ?? token);
}

function remapSequenceRounds(rounds: string[][], tokenMap: Map<string, string>): string[][] {
  return rounds.map((round) => round.map((token) => tokenMap.get(token) ?? token));
}

function tokenMapForSequence(tokens: string[], edit: NormalizedAssetEdit): Map<string, string> {
  const uniqueTokens = uniqueStrings(tokens);
  const sequenceItems = requireAssetEditItemsForSequence(edit, tokens);

  return new Map(uniqueTokens.map((token, index) => [token, sequenceItems[index]!]));
}

function rewriteAssetBindings(
  assetBindings: Record<string, string>,
  previousAssets: GeneratedAssetRecord[],
  nextAssets: GeneratedAssetRecord[]
): Record<string, string> {
  const requestIdByPreviousAssetId = new Map(previousAssets.map((asset) => [asset.assetId, asset.requestId]));
  const nextAssetIdByRequestId = new Map(nextAssets.map((asset) => [asset.requestId, asset.assetId]));

  return Object.fromEntries(
    Object.entries(assetBindings).map(([binding, assetId]) => {
      const requestId = requestIdByPreviousAssetId.get(assetId);
      return [binding, requestId ? nextAssetIdByRequestId.get(requestId) ?? assetId : assetId];
    })
  );
}

function stringArrayProp(props: Record<string, JsonValue>, key: string): string[] {
  const value = props[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function requireStringArrayProp(
  props: Record<string, JsonValue>,
  key: string,
  operation: GameTemplateAssetEditOperation["operation"]
): string[] {
  const values = stringArrayProp(props, key);
  if (values.length === 0) {
    throw new Error(`asset edit operation ${operation} requires non-empty string array prop ${key}`);
  }

  return values;
}

function requireStringRecordProp(
  props: Record<string, JsonValue>,
  key: string,
  operation: GameTemplateAssetEditOperation["operation"]
): Record<string, string> {
  const value = props[key];
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`asset edit operation ${operation} requires non-empty string record prop ${key}`);
  }

  const record = Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
  if (Object.keys(record).length === 0) {
    throw new Error(`asset edit operation ${operation} requires non-empty string record prop ${key}`);
  }

  return record;
}

function requireNumberProp(
  props: Record<string, JsonValue>,
  key: string,
  operation: GameTemplateAssetEditOperation["operation"]
): number {
  const value = props[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`asset edit operation ${operation} requires numeric prop ${key}`);
  }

  return value;
}

function stringMatrixProp(props: Record<string, JsonValue>, key: string): string[][] {
  const value = props[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is JsonValue[] => Array.isArray(entry))
    .map((entry) => entry.filter((item): item is string => typeof item === "string"))
    .filter((entry) => entry.length > 0);
}

function requireStringMatrixProp(
  props: Record<string, JsonValue>,
  key: string,
  operation: GameTemplateAssetEditOperation["operation"]
): string[][] {
  const values = stringMatrixProp(props, key);
  if (values.length === 0) {
    throw new Error(`asset edit operation ${operation} requires non-empty string matrix prop ${key}`);
  }

  return values;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function singleValue<TValue>(values: TValue[]): TValue | undefined {
  return values.length === 1 ? values[0] : undefined;
}

function requireSingleValue<TValue>(values: TValue[], label: string): TValue {
  const value = singleValue(values);
  if (value === undefined) {
    throw new Error(`${label} requires exactly one value`);
  }

  return value;
}

function cleanLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 -]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function slugLabel(value: string): string {
  return cleanLabel(value).replace(/\s+/gu, "-");
}

function singularize(value: string): string {
  return value
    .split(" ")
    .map((word) => {
      if (word.endsWith("ies") && word.length > 3) {
        return `${word.slice(0, -3)}y`;
      }
      if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) {
        return word.slice(0, -1);
      }
      return word;
    })
    .join(" ");
}

function titleCase(value: string): string {
  return value.replace(/\b[a-z]/gu, (match) => match.toUpperCase());
}

function articleFor(value: string): "a" | "an" {
  return /^[aeiou]/u.test(value) ? "an" : "a";
}
