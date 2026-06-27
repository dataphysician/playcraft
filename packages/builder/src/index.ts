import { z } from "zod";
import { DeterministicStubAssetProvider } from "@playcraft/assets";
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
  BuilderProfilePresetSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderAssetEdit,
  type BuilderCommand,
  type BuilderCommandResult,
  type BuilderPreviewState,
  type BuilderProfilePreset,
  type GameAssemblyProfile,
  type GeneratedAssetRecord,
  type JsonValue,
  type PlaycraftAssemblyRequest
} from "@playcraft/contracts";
import { replayProfile, validateGameAssemblyProfile, type PlaycraftRegistries, type ReplayResult } from "@playcraft/core";
import {
  createDefaultPlanner,
  createDefaultRegistries,
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
  private readonly registries = createDefaultRegistries();
  private readonly assetProvider = new DeterministicStubAssetProvider();
  private readonly planner = createDefaultPlanner({ registries: this.registries, assetProvider: this.assetProvider });
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
    const profile = applyAssetEdit(this.planner.assemble(request), command.assetEdit, this.assetProvider, this.registries);
    const replay = replayProfile(profile, this.registries);
    const preview = BuilderPreviewStateSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
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

    const toolName = command.commandName === "update-profile" ? "tool:update-profile" : "tool:assemble-profile";
    const stateEvent =
      command.commandName === "update-profile"
        ? stateDelta(runId, { sessionId: session.sessionId, preset, profileId: profile.id, assetEdit: command.assetEdit ?? null }, 3)
        : stateSnapshot(runId, { sessionId: session.sessionId, preset, profileId: profile.id, assetEdit: command.assetEdit ?? null }, 3);

    const events: BuilderAgUiEvent[] = [
      runStarted(runId, 0),
      stepStarted(runId, `${command.commandName}.plan`, `${command.commandName} planner`, 1),
      activity(runId, "builder.profile", "started", `assembling ${preset}`, 2),
      stateEvent,
      toolCall(runId, toolName, { requestId: request.id, preset, assetEdit: command.assetEdit ?? null }, 4),
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
      stepFinished(runId, `${command.commandName}.plan`, 11),
      runFinished(runId, 12)
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

    const componentId = renderRequest.componentId ?? renderRequest.componentCapability ?? "component.unknown";
    const interaction = {
      toolName: renderRequest.expectedEmittedEvents[0] ?? "tool:preview-interaction",
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

export function createBuilderCommandHandler(): BuilderCommandHandler {
  return new PlaycraftBuilderSessionService();
}

export function requestForPreset(preset: BuilderProfilePreset): PlaycraftAssemblyRequest {
  return mvpAssemblyRequests[PRESET_TO_REQUEST_INDEX[preset]];
}

interface NormalizedAssetEdit {
  theme: string;
  singularTheme: string;
  items: string[];
}

function applyAssetEdit(
  profile: GameAssemblyProfile,
  assetEdit: BuilderAssetEdit | undefined,
  assetProvider: DeterministicStubAssetProvider,
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
  const assets = assetProvider.generateBatch(assetRequests);
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
      return {
        ...props,
        title: `${titleCase(edit.theme)} pairs`,
        cards: pairedCardIds(edit),
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
      return {
        ...props,
        title: `${titleCase(edit.theme)} bins`,
        items: activeBins.map((bin) => `${bin} ${edit.singularTheme}`),
        bins: activeBins
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
  if (profile.id.includes("memory-match")) {
    return `child-safe ${edit.theme} memory card illustrations for paired cards ${pairedCardIds(edit).join(", ")}`;
  }

  if (profile.id.includes("sorting")) {
    return `child-safe ${edit.theme} sorting game illustrations for ${edit.items.join(", ")}`;
  }

  if (profile.id.includes("sequence-repeat")) {
    return `child-safe ${edit.theme} sequence game button illustrations for ${edit.items.join(", ")}`;
  }

  return `child-safe ${edit.theme} game illustrations for ${profile.profileName}`;
}

function pairedCardIds(edit: NormalizedAssetEdit): string[] {
  const bases = edit.items.slice(0, 2);
  return bases.flatMap((item) => {
    const cardBase = slugLabel(item);
    return [`${cardBase}-a`, `${cardBase}-b`];
  });
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
