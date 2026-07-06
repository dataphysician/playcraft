import {
  BuilderPreviewStateSchema,
  BuilderServiceExecutionSchema,
  BuilderServiceResponseSchema,
  JsonValueSchema,
  MoonshineTranscriptRecordSchema,
  PLAYCRAFT_LOCAL_TIMESTAMP,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderCatalog,
  type BuilderCommandResult,
  type BuilderPreviewState,
  type BuilderProfileExport,
  type BuilderServiceError,
  type BuilderServiceExecution,
  type BuilderServiceRequest,
  type BuilderServiceResponse,
  type BuilderSessionSnapshot,
  type BuilderTemplateId,
  type JsonValue,
  type MoonshineTranscriptRecord,
  type MoonshineTranscriptSegment
} from "@playcraft/contracts";
import type { BuilderExecutionResult } from "@playcraft/builder";
import { MOONSHINE_STREAMING_CPU_CONFIG } from "./intent-resolution.js";

export function toJsonValue(value: unknown): JsonValue {
  return JsonValueSchema.parse(normalizeJsonValue(value));
}

function normalizeJsonValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("service event value contains a non-finite number");
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (entry === undefined) {
        throw new Error("service event value contains undefined inside an array");
      }

      return normalizeJsonValue(entry);
    });
  }

  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("service event value contains a non-plain object");
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, normalizeJsonValue(entry)])
    );
  }

  throw new Error(`service event value contains unsupported JSON type ${typeof value}`);
}

export function serializeExecution(output: BuilderExecutionResult): BuilderServiceExecution {
  return BuilderServiceExecutionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    result: output.result,
    events: output.events.map((event) => toJsonValue(event))
  });
}

export function buildWorkflowCommandResult(commandId: string, sessionId: string, executedNodeCount: number): BuilderCommandResult {
  const preview: BuilderPreviewState = BuilderPreviewStateSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    sessionId,
    renderedComponentIds: [],
    interactionCount: executedNodeCount
  });
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-command-result.workflow.${commandId}`,
    version: "1.0.0",
    kind: "builder-command-result",
    commandId: `builder-command.workflow.${commandId}`,
    sessionId,
    preview
  };
}

export function serviceResponse(
  request: BuilderServiceRequest,
  payload: {
    catalog?: BuilderCatalog;
    execution?: BuilderServiceExecution;
    profileExport?: BuilderProfileExport;
    reset?: true;
    session?: BuilderSessionSnapshot;
    error?: BuilderServiceError | { kind: "ownership-mismatch"; ownerId: string };
  }
): BuilderServiceResponse {
  return BuilderServiceResponseSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-service-response.${request.id}`,
    version: "1.0.0",
    kind: "builder-service-response",
    requestId: request.id,
    actionName: request.actionName,
    ...payload
  });
}

export function serviceRequestSessionId(request: BuilderServiceRequest): string {
  if (!request.sessionId) {
    throw new Error(`${request.actionName} requires sessionId`);
  }

  return request.sessionId;
}

export function requireResultTemplateId(result: BuilderExecutionResult["result"]): BuilderTemplateId {
  if (!result.preview.activeTemplateId) {
    throw new Error(`${result.commandId} result preview requires activeTemplateId`);
  }

  return result.preview.activeTemplateId;
}

export function streamRunId(): string {
  return `stream.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
}

export interface BuilderServiceHttpFetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type BuilderServiceHttpFetch = (
  url: string,
  init: {
    body: string;
    headers: Record<string, string>;
    method: "POST";
  }
) => Promise<BuilderServiceHttpFetchResponse>;

export function defaultFetch(...args: Parameters<BuilderServiceHttpFetch>): ReturnType<BuilderServiceHttpFetch> {
  const fetcher = (globalThis as { fetch?: BuilderServiceHttpFetch }).fetch;
  if (!fetcher) {
    throw new Error("HTTP service transport requires a fetch implementation");
  }

  return fetcher(...args);
}

export function createMoonshineTranscriptRecord(input: {
  id?: string;
  metadata?: Record<string, JsonValue>;
  receivedAt?: string;
  segments?: MoonshineTranscriptSegment[];
  sequence?: number;
  text: string;
  transcriptId?: string;
}): MoonshineTranscriptRecord {
  const id = input.id ?? `moonshine-transcript.local.${input.sequence ?? 1}`;
  return MoonshineTranscriptRecordSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "moonshine-transcript",
    transcriptId: input.transcriptId ?? id,
    engine: MOONSHINE_STREAMING_CPU_CONFIG.engine,
    runtime: MOONSHINE_STREAMING_CPU_CONFIG.runtime,
    localOnly: MOONSHINE_STREAMING_CPU_CONFIG.localOnly,
    finalized: true,
    text: input.text.trim(),
    receivedAt: input.receivedAt ?? PLAYCRAFT_LOCAL_TIMESTAMP,
    segments: input.segments ?? [],
    metadata: {
      origin: "playcraft.local-moonshine-streaming-cpu",
      ...input.metadata
    }
  });
}