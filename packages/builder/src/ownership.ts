import type { AgUiEvent } from "@playcraft/ag-ui";
import {
  BuilderCommandResultSchema,
  BuilderPreviewStateSchema,
  BuilderSessionOwnershipSchema,
  BuilderSessionSnapshotSchema,
  PLAYCRAFT_LOCAL_TIMESTAMP,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderCommand,
  type BuilderCommandResult,
  type BuilderPreviewState,
  type BuilderSessionOwnership,
  type BuilderSessionSnapshot,
  type BuilderTemplateId,
  type GameAssemblyProfile,
  type PlaycraftEventRecord
} from "@playcraft/contracts";
import type { ReplayResult } from "@playcraft/core";

export const BUILDER_SESSION_POLICY = {
  defaultAssembleSessionId: "builder.cli",
  defaultBatchSessionId: "builder.batch",
  defaultCatalogSessionId: "builder.cli"
} as const;

export const BUILDER_SESSION_TTL_MS = 60 * 60 * 1000;

export const BUILDER_DEFAULT_OWNER_ID = "builder.local.owner";

export const BUILDER_ARGUMENT_SUMMARY_LABELS = {
  empty: "none",
  prefix: "args"
} as const;

export const BUILDER_SESSION_CAPABILITIES = [
  "assemble-game",
  "update-game",
  "preview-action",
  "list-builder-tools",
  "get-session",
  "export-profile",
  "import-profile"
] as const;

export interface BuilderSessionRecord {
  sessionId: string;
  templateId?: BuilderTemplateId;
  profile?: GameAssemblyProfile;
  replay?: ReplayResult;
  preview: BuilderPreviewState;
  ownership?: BuilderSessionOwnership;
}

export interface BuilderExecutionResult {
  result: BuilderCommandResult;
  events: BuilderExecutionEvent[];
  error?: BuilderExecutionError;
}

export interface BuilderExecutionError {
  kind: "session-expired";
  sessionId: string;
  ownerId: string;
  expiresAt: string;
}

export type BuilderExecutionEvent = AgUiEvent;

export type BuildOrUpdateCommand = BuilderCommand & {
  actionName: Extract<BuilderCommand["actionName"], "assemble-game" | "update-game">;
};

export function createBuilderSessionOwnership(nowMs: number): BuilderSessionOwnership {
  const createdAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + BUILDER_SESSION_TTL_MS).toISOString();
  return BuilderSessionOwnershipSchema.parse({
    ownerId: BUILDER_DEFAULT_OWNER_ID,
    createdAt,
    expiresAt,
    capabilities: [...BUILDER_SESSION_CAPABILITIES]
  });
}

export function expiredOwnershipFor(_sessionId: string, ownership: BuilderSessionOwnership | undefined): BuilderSessionOwnership | undefined {
  if (!ownership) {
    return undefined;
  }

  const expiresAtMs = new Date(ownership.expiresAt).getTime();
  if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) {
    return ownership;
  }

  return undefined;
}

export function expiredSessionResult(sessionId: string, ownership: BuilderSessionOwnership): BuilderExecutionResult {
  const preview = BuilderPreviewStateSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    sessionId,
    renderedComponentIds: [],
    interactionCount: 0
  });
  const result = BuilderCommandResultSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-result.expired.${sessionId}`,
    version: "1.0.0",
    kind: "builder-command-result",
    commandId: `builder-command.expired.${sessionId}`,
    sessionId,
    preview
  });

  return {
    result,
    events: [],
    error: {
      kind: "session-expired",
      sessionId,
      ownerId: ownership.ownerId,
      expiresAt: ownership.expiresAt
    }
  };
}

export function snapshotForSession(session: BuilderSessionRecord): BuilderSessionSnapshot {
  return BuilderSessionSnapshotSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    kind: "builder-session-snapshot",
    sessionId: session.sessionId,
    activeTemplateId: session.templateId,
    activeProfileId: session.profile?.id,
    profile: session.profile,
    preview: session.preview,
    validation: session.profile?.validation,
    updatedAt: PLAYCRAFT_LOCAL_TIMESTAMP,
    ownership: session.ownership
  });
}

export function previewForReplay(
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

export function requirePreviewComponentId(preview: BuilderPreviewState): string {
  if (!preview.activeComponentId) {
    throw new Error(`preview state for session ${preview.sessionId} does not include an active component id`);
  }

  return preview.activeComponentId;
}

export function requireSessionTemplateId(session: BuilderSessionRecord): BuilderTemplateId {
  if (!session.templateId) {
    throw new Error(`session ${session.sessionId} does not include an active template id`);
  }

  return session.templateId;
}

export function requireSinglePreviewReplayEvent(profile: GameAssemblyProfile): PlaycraftEventRecord {
  if (profile.replay.eventLog.length !== 1) {
    throw new Error(`profile ${profile.id} preview requires exactly one replay event`);
  }

  const [replayEvent] = profile.replay.eventLog;
  if (!replayEvent) {
    throw new Error(`profile ${profile.id} preview requires exactly one replay event`);
  }

  return replayEvent;
}

export function requireRenderRequestComponentId(renderRequest: ReplayResult["renderRequests"][number] | undefined): string {
  if (!renderRequest?.componentId) {
    throw new Error("replay render request does not include a concrete component id");
  }

  return renderRequest.componentId;
}

export function renderRequestForTemplatePrimary(profile: GameAssemblyProfile, replay: ReplayResult): ReplayResult["renderRequests"][number] {
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

export function requireSinglePreviewToolName(renderRequest: ReplayResult["renderRequests"][number]): string {
  if (renderRequest.emittedToolNames.length !== 1) {
    throw new Error(`interactive render request ${renderRequest.id} must declare exactly one emitted tool`);
  }

  return renderRequest.emittedToolNames.at(0)!;
}

function requireSingleValue<TValue>(values: TValue[], label: string): TValue {
  const value = singleValue(values);
  if (value === undefined) {
    throw new Error(`${label} requires exactly one value`);
  }

  return value;
}

function singleValue<TValue>(values: TValue[]): TValue | undefined {
  return values.length === 1 ? values[0] : undefined;
}
