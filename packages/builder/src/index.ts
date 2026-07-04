import { z } from "zod";
import { DeterministicLocalAssetSource } from "@playcraft/assets";
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
  GameAssemblyProfileSchema,
  BuilderCommandResultSchema,
  BuilderCommandSchema,
  BuilderPreviewStateSchema,
  BuilderSessionSnapshotSchema,
  BuilderTemplateIdSchema,
  BuilderToolDefinitionSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderAssetEdit,
  type BuilderCommand,
  type BuilderCommandResult,
  type BuilderPreviewState,
  type BuilderSessionSnapshot,
  type BuilderTemplateId,
  type BuilderToolDefinition,
  type GameAssemblyProfile,
  type GameTemplateDefinition,
  type GeneratedAssetRecord,
  type JsonObjectSchemaDescriptor,
  type JsonValue,
  type PlaycraftAssemblyRequest
} from "@playcraft/contracts";
import { replayProfile, validateGameAssemblyProfile, type PlaycraftRegistries, type ReplayResult } from "@playcraft/core";
import {
  createDefaultPlanner,
  createDefaultRegistries,
  gameTemplateDefinitions,
  mvpAssemblyRequests
} from "@playcraft/packs";

export const PLAYCRAFT_BUILDER_PACKAGE = "@playcraft/builder";

export const BuilderPreviewPayloadSchema = z
  .object({
    componentId: z.string().min(1),
    renderedComponentIds: z.array(z.string().min(1)).min(1),
    interactionCount: z.number().int().nonnegative()
  })
  .strict();

export type BuilderAgUiEvent = AgUiEvent;

export const builderToolDefinitions: BuilderToolDefinition[] = [
  builderTool("builder-tool.assemble-game", "tool:assemble-game", "Assemble a mini-game from a registered local template.", "assemble-game", ["text", "speech-transcript"]),
  builderTool("builder-tool.update-game", "tool:update-game", "Update the active mini-game template or its asset edit levers.", "update-game", ["text", "speech-transcript"]),
  builderTool("builder-tool.preview-action", "tool:preview-action", "Replay one trusted UI interaction against the active profile.", "preview-action", []),
  builderTool("builder-tool.list-builder-tools", "tool:list-builder-tools", "List the local Playcraft builder tools and bundled game templates.", "list-builder-tools", []),
  builderTool("builder-tool.get-session", "tool:get-session", "Inspect the active local builder session snapshot.", "get-session", []),
  builderTool("builder-tool.export-profile", "tool:export-profile", "Export the active validated game profile for reuse.", "export-profile", []),
  builderTool("builder-tool.import-profile", "tool:import-profile", "Import a validated game profile into a local session.", "import-profile", [])
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
        return this.buildOrUpdate(session, command);
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

  assembleTemplates(templateIds: BuilderTemplateId[], sessionId = "builder.batch"): BuilderExecutionResult[] {
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
    const profile = GameAssemblyProfileSchema.parse(profileInput);
    const template = templateForProfile(profile);
    const replay = replayProfile(profile, this.registries);
    const preview = previewForReplay(sessionId, template.id as BuilderTemplateId, profile, replay, session.preview);

    session.templateId = template.id as BuilderTemplateId;
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

  private buildOrUpdate(session: BuilderSessionRecord, command: BuilderCommand): BuilderExecutionResult {
    const templateId = BuilderTemplateIdSchema.parse(command.templateId);
    const template = templateForId(templateId);
    const request = requestForTemplate(templateId);
    const runId = `${command.sessionId}.${templateId}`;
    const profile = applyAssetEdit(this.planner.assemble(request), command.assetEdit, this.assetSource, this.registries);
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
      toolCall(runId, toolName, { requestId: request.id, templateId, assetEdit: command.assetEdit ?? null, input: command.input ?? null }, 4),
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
            componentId: preview.activeComponentId ?? "unknown.component",
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

    const renderRequest = interactiveRenderRequestForReplay(session.replay);
    if (!renderRequest) {
      throw new Error("session has no interactive render requests to preview");
    }

    const componentId = renderRequest.componentId ?? renderRequest.componentCapability ?? "component.unknown";
    const toolName = renderRequest.expectedEmittedEvents[0];
    if (!toolName) {
      throw new Error(`interactive render request ${renderRequest.id} does not declare an emitted tool`);
    }

    const interaction = {
      toolName,
      payload: {
        componentId,
        action: command.interaction?.action ?? "primary"
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

    const runId = `${command.sessionId}.${session.templateId ?? "preview"}`;
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
    updatedAt: "2026-07-04T00:00:00.000Z"
  });
}

function previewForReplay(
  sessionId: string,
  templateId: BuilderTemplateId,
  profile: GameAssemblyProfile,
  replay: ReplayResult,
  previousPreview: BuilderPreviewState
): BuilderPreviewState {
  const interactiveRequest = interactiveRenderRequestForReplay(replay);

  return BuilderPreviewStateSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    sessionId,
    activeProfileId: profile.id,
    activeTemplateId: templateId,
    activeComponentId: interactiveRequest?.componentId ?? replay.renderRequests[0]?.componentId,
    renderedComponentIds: replay.renderRequests.map((entry) => entry.componentId ?? entry.componentCapability ?? "unknown"),
    interactionCount: previousPreview.interactionCount,
    lastToolName: previousPreview.lastToolName,
    lastToolPayload: previousPreview.lastToolPayload
  });
}

function interactiveRenderRequestForReplay(replay: ReplayResult): ReplayResult["renderRequests"][number] | undefined {
  return replay.renderRequests.find((request) => request.expectedEmittedEvents.length > 0);
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

function templateForProfile(profile: GameAssemblyProfile): GameTemplateDefinition {
  const profileComponentIds = new Set(profile.components.map((component) => component.componentId));
  const template =
    gameTemplateDefinitions.find((entry) => entry.assemblyRequestId === profile.assemblyRequestId) ??
    gameTemplateDefinitions.find((entry) => entry.requiredComponentIds.every((componentId) => profileComponentIds.has(componentId)));

  if (!template) {
    throw new Error(`profile ${profile.id} is not backed by a known game template contract`);
  }

  return template;
}

function builderTool(
  id: string,
  toolName: string,
  description: string,
  actionName: BuilderToolDefinition["actionName"],
  acceptedInputSources: BuilderToolDefinition["acceptedInputSources"]
): BuilderToolDefinition {
  return BuilderToolDefinitionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "builder-tool",
    toolName,
    displayName: description.split(".")[0],
    description,
    actionName,
    argumentsSchema: builderToolArgumentsSchema(actionName),
    acceptedInputSources,
    localOnly: true,
    emittedEvents: ["builder:command", "builder:profile-ready"],
    requiredContracts: ["BuilderCommandSchema", "BuilderInputRequestSchema", "GameTemplateDefinitionSchema"]
  });
}

function builderToolArgumentsSchema(actionName: BuilderToolDefinition["actionName"]): JsonObjectSchemaDescriptor {
  const optionalString = { type: "string", required: false } as const;
  const requiredString = { type: "string", required: true } as const;
  const optionalObject = { type: "object", required: false } as const;

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
      interaction: optionalObject,
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

  const assetRequests = profile.assetRequests.map((request) =>
    AssetGenerationRequestSchema.parse({
      ...request,
      prompt: promptForAssetEdit(profile, edit),
      metadata: {
        ...request.metadata,
        assetEditTheme: edit.theme,
        assetEditItems: edit.items
      }
    })
  );
  const assets = assetSource.generateBatch(assetRequests);
  const components = profile.components.map((component) => ({
    ...component,
    props: editComponentProps(component.renderCapability, component.props, edit),
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

function normalizeAssetEdit(assetEdit: BuilderAssetEdit | undefined): NormalizedAssetEdit | undefined {
  if (!assetEdit) {
    return undefined;
  }

  const theme = cleanLabel(assetEdit.theme ?? assetEdit.items?.join(" ") ?? "");
  const items = (assetEdit.items ?? []).map(cleanLabel).filter(Boolean);
  const normalizedTheme = theme || items.join(" ") || "custom assets";
  const singularTheme = singularize(normalizedTheme);

  return {
    theme: normalizedTheme,
    singularTheme,
    items: items.length > 0 ? items : defaultItemsForTheme(singularTheme)
  };
}

function editComponentProps(
  renderCapability: string,
  props: Record<string, JsonValue>,
  edit: NormalizedAssetEdit
): Record<string, JsonValue> {
  switch (renderCapability) {
    case "component:reveal-card-grid":
      const cards = pairedCardIds(edit);
      return {
        ...props,
        title: `${titleCase(edit.theme)} pairs`,
        cards,
        pairs: pairMapForCards(cards),
        columns: props.columns ?? 2
      };
    case "component:choice-grid":
      return {
        ...props,
        title: `Choose ${articleFor(edit.singularTheme)} ${edit.singularTheme}`,
        prompt: `Pick one ${edit.singularTheme}.`,
        items: edit.items
      };
    case "component:sort-bins": {
      const bins = stringArrayProp(props, "bins");
      const activeBins = bins.length > 0 ? bins : ["red", "blue"];
      const items = activeBins.map((bin) => `${bin} ${edit.singularTheme}`);
      return {
        ...props,
        title: `${titleCase(edit.theme)} bins`,
        items,
        bins: activeBins,
        targets: Object.fromEntries(items.map((item, index) => [item, activeBins[index]]))
      };
    }
    case "component:sequence-pad":
      return {
        ...props,
        title: `Repeat the ${edit.singularTheme} pattern`,
        prompt: `Tap the ${edit.singularTheme} buttons in the same order.`,
        sequence: [edit.items[0], edit.items[1] ?? edit.items[0], edit.items[0]]
      };
    case "component:celebration-overlay":
      return {
        ...props,
        message: `${titleCase(edit.theme)} round complete.`
      };
    case "component:hint-bubble":
      return {
        ...props,
        hint: `Look for the ${edit.singularTheme} clue first.`
      };
    default:
      return props;
  }
}

function promptForAssetEdit(profile: GameAssemblyProfile, edit: NormalizedAssetEdit): string {
  if (hasComponentCapability(profile, "component:reveal-card-grid")) {
    return `child-safe ${edit.theme} memory card illustrations for paired cards ${pairedCardIds(edit).join(", ")}`;
  }

  if (hasComponentCapability(profile, "component:sort-bins")) {
    return `child-safe ${edit.theme} sorting game illustrations for ${edit.items.join(", ")}`;
  }

  if (hasComponentCapability(profile, "component:sequence-pad")) {
    return `child-safe ${edit.theme} sequence game button illustrations for ${edit.items.join(", ")}`;
  }

  return `child-safe ${edit.theme} game illustrations for ${profile.profileName}`;
}

function hasComponentCapability(profile: GameAssemblyProfile, renderCapability: string): boolean {
  return profile.components.some((component) => component.renderCapability === renderCapability);
}

function pairedCardIds(edit: NormalizedAssetEdit): string[] {
  const bases = edit.items.slice(0, 2);
  return bases.flatMap((item) => {
    const cardBase = slugLabel(item);
    return [`${cardBase}-a`, `${cardBase}-b`];
  });
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

function defaultItemsForTheme(singularTheme: string): string[] {
  const base = slugLabel(singularTheme);
  return [`${base}-1`, `${base}-2`, `${base}-3`];
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

  return value.map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)));
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
