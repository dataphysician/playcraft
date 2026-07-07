import { parseAgUiEvent, type AgUiEvent } from "@playcraft/ag-ui";
import {
  BuilderServiceRequestSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type AgUiEventEnvelopeContract,
  type BuilderCatalog,
  type BuilderInputSource,
  type BuilderProfileExport,
  type BuilderPreviewState,
  type BuilderServiceRequest,
  type BuilderServiceResponse,
  type GameAssemblyProfile,
  type JsonValue,
  type MoonshineTranscriptRecord,
  type PaidOnlineAssemblyResponse,
  type SseFrame
} from "@playcraft/contracts";

import {
  createHttpServiceTransport,
  createLocalServiceTransport,
  createMoonshineTranscriptRecord,
  type BuilderServiceTransport
} from "@playcraft/service";
import { parseSseFrame } from "../../../packages/service/src/sse.js";
import type { StudioClient, StudioSessionSnapshot, StudioTimelineEntry, StudioTimelineKind } from "./types.js";

export interface ConfiguredStudioClientOptions {
  defaultSessionId?: string;
  serviceEndpoint?: string;
  timelineIdPrefix?: string;
}

export const STUDIO_CLIENT_POLICY = {
  defaultSessionId: "studio.session",
  defaultTimelineIdPrefix: "timeline"
} as const;

export const STUDIO_RUNTIME_POLICY = {
  serviceEndpointEnvName: "VITE_PLAYCRAFT_SERVICE_URL"
} as const;

export const STUDIO_SSE_PATH_POLICY = {
  streamPathSuffix: "/stream"
} as const;

export type StudioRuntimeEnv = Partial<Record<typeof STUDIO_RUNTIME_POLICY.serviceEndpointEnvName, string | undefined>>;

export function studioRuntimeEnvFromServiceEndpoint(serviceEndpoint?: string): StudioRuntimeEnv {
  return {
    [STUDIO_RUNTIME_POLICY.serviceEndpointEnvName]: serviceEndpoint
  };
}

export function serviceEndpointFromStudioRuntimeEnv(env: StudioRuntimeEnv): string | undefined {
  const serviceEndpoint = env[STUDIO_RUNTIME_POLICY.serviceEndpointEnvName]?.trim();
  return serviceEndpoint ? serviceEndpoint : undefined;
}

export function isSseServiceEndpoint(endpoint: string): boolean {
  return endpoint.includes(STUDIO_SSE_PATH_POLICY.streamPathSuffix);
}

export class SseStreamError extends Error {
  readonly timeline: readonly SseFrame[];

  constructor(message: string, timeline: readonly SseFrame[]) {
    super(message);
    this.name = "SseStreamError";
    this.timeline = timeline;
  }
}

export interface BuilderServiceSseFetchResponse {
  body: ReadableStream<Uint8Array> | null;
  ok: boolean;
  status: number;
}

export type BuilderServiceSseFetch = (
  url: string,
  init: {
    method: "GET";
    headers: Record<string, string>;
  }
) => Promise<BuilderServiceSseFetchResponse>;

export interface CreateSseServiceTransportInput {
  endpoint: string;
  fetch?: BuilderServiceSseFetch;
}

export function createSseServiceTransport(input: CreateSseServiceTransportInput): BuilderServiceTransport {
  const fetcher = input.fetch ?? defaultSseFetch;
  const timeline: SseFrame[] = [];

  return {
    async send(request: BuilderServiceRequest): Promise<BuilderServiceResponse> {
      timeline.length = 0;

      const url = buildSseRequestUrl(input.endpoint, request);

      const response = await fetcher(url, {
        method: "GET",
        headers: {
          accept: "text/event-stream"
        }
      });

      if (!response.ok) {
        throw new Error(`builder service SSE HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("builder service SSE response missing body");
      }

      for (const frame of await readSseFrames(response.body)) {
        timeline.push(frame);
        if (frame.kind === "sse-run-error") {
          throw new SseStreamError(frame.payload.message, [...timeline]);
        }
      }

      return reconcileFrames(request, timeline);
    }
  };
}

export function createConfiguredStudioClient(options: ConfiguredStudioClientOptions = {}): StudioClient {
  const serviceEndpoint = options.serviceEndpoint?.trim();
  const transport: BuilderServiceTransport = serviceEndpoint
    ? isSseServiceEndpoint(serviceEndpoint)
      ? createSseServiceTransport({ endpoint: serviceEndpoint })
      : createHttpServiceTransport({ endpoint: serviceEndpoint })
    : createLocalServiceTransport();

  return createStudioClientFromServiceTransport({
    defaultSessionId: options.defaultSessionId,
    timelineIdPrefix: options.timelineIdPrefix,
    transport
  });
}

export function createLocalStudioClient(): StudioClient {
  return createConfiguredStudioClient();
}

export function createStudioClientFromServiceTransport(options: {
  defaultSessionId?: string;
  timelineIdPrefix?: string;
  transport: BuilderServiceTransport;
}): StudioClient {
  const defaultSessionId = options.defaultSessionId ?? STUDIO_CLIENT_POLICY.defaultSessionId;
  const timelineIdPrefix = options.timelineIdPrefix ?? STUDIO_CLIENT_POLICY.defaultTimelineIdPrefix;
  const timeline: StudioTimelineEntry[] = [];
  let requestCounter = 0;

  function snapshotFromResponse(sessionId: string, response: BuilderServiceResponse): StudioSessionSnapshot {
    if (!response.execution) {
      throw new Error(`${response.actionName} response did not include execution output`);
    }
    if (!response.session) {
      throw new Error(`${response.actionName} response did not include session snapshot`);
    }

    const activeProfile = activeProfileFromResponse(response);
    const entries = response.execution.events.map((event: JsonValue, index: number) => timelineEntry(event, timeline.length + index + 1, timelineIdPrefix));
    timeline.push(...entries);

    return {
      activeAssetEdit: response.session.activeAssetEdit,
      sessionId,
      activeProfileId: response.session.activeProfileId,
      activeProfile,
      timeline: [...timeline]
    };
  }

  function nextRequest(
    actionName: BuilderServiceRequest["actionName"],
    input: Partial<BuilderServiceRequest>
  ): BuilderServiceRequest {
    requestCounter += 1;
    return BuilderServiceRequestSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-service-request.${defaultSessionId}.${requestCounter}`,
      version: "1.0.0",
      kind: "builder-service-request",
      actionName,
      ...input
    });
  }

  return {
    catalog() {
      return mapTransportResponse(
        options.transport.send(nextRequest("catalog", {})),
        (response) => catalogFromResponse(response)
      );
    },
    assembleFromIntent(input) {
      const sessionId = input.sessionId ?? defaultSessionId;
      const inputPayload = serviceInputPayloadForClientInput({
        requestId: `moonshine-transcript.${defaultSessionId}.${requestCounter + 1}`,
        source: input.source,
        moonshineTranscript: input.moonshineTranscript,
        text: input.idea
      });
      return mapTransportResponse(
        options.transport.send(
          nextRequest("assemble", {
            sessionId,
            ...inputPayload
          })
        ),
        (response) => snapshotFromResponse(sessionId, response)
      );
    },
    exportProfile(sessionId) {
      return mapTransportResponse(
        options.transport.send(nextRequest("export-profile", { sessionId })),
        (response) => profileExportFromResponse(response)
      );
    },
    importProfile(input) {
      return mapTransportResponse(
        options.transport.send(
          nextRequest("import-profile", {
            profileExport: input.profileExport,
            sessionId: input.sessionId
          })
        ),
        (response) => snapshotFromResponse(input.sessionId, response)
      );
    },
    previewAction(input) {
      return mapTransportResponse(
        options.transport.send(nextRequest("preview", {
          interaction: input.interaction,
          sessionId: input.sessionId
        })),
        (response) => snapshotFromResponse(input.sessionId, response)
      );
    },
    requestChange(input) {
      const inputPayload = serviceInputPayloadForClientInput({
        requestId: `moonshine-transcript.${defaultSessionId}.${requestCounter + 1}`,
        source: input.source,
        moonshineTranscript: input.moonshineTranscript,
        text: input.changeRequest
      });
      return mapTransportResponse(
        options.transport.send(
          nextRequest("update", {
            sessionId: input.sessionId,
            ...inputPayload
          })
        ),
        (response) => snapshotFromResponse(input.sessionId, response)
      );
    },
    requestPaidOnlineAssembly(input) {
      const request = nextRequest("request-paid-online-assembly", {
        sessionId: input.sessionId,
        capabilityGap: input.capabilityGap,
        paymentConfirmationId: input.paymentConfirmationId
      });
      return mapTransportResponse(
        options.transport.send(request),
        (response) => paidResponseFromResponse(response)
      );
    },
    reset() {
      void options.transport.send(nextRequest("reset", {}));
      timeline.length = 0;
    }
  };
}

function serviceInputPayloadForClientInput(input: {
  requestId: string;
  source?: BuilderInputSource;
  moonshineTranscript?: MoonshineTranscriptRecord;
  text: string;
}): Partial<Pick<BuilderServiceRequest, "moonshineTranscript" | "source" | "text">> {
  const moonshineTranscript = moonshineTranscriptForClientInput(input);
  const source = input.source ? { source: input.source } : {};

  if (moonshineTranscript) {
    return {
      source: "moonshine-transcript",
      moonshineTranscript
    };
  }

  return {
    ...source,
    text: input.text
  };
}

function moonshineTranscriptForClientInput(input: {
  requestId: string;
  source?: BuilderInputSource;
  moonshineTranscript?: MoonshineTranscriptRecord;
  text: string;
}): MoonshineTranscriptRecord | undefined {
  if (input.moonshineTranscript) {
    if (input.source && input.source !== "moonshine-transcript") {
      throw new Error("Moonshine transcript records require moonshine-transcript source");
    }

    return input.moonshineTranscript;
  }

  if (input.source !== "moonshine-transcript") {
    return undefined;
  }

  return createMoonshineTranscriptRecord({
    id: input.requestId,
    metadata: {
      origin: "playcraft-studio-transcript-input"
    },
    text: input.text
  });
}

function activeProfileFromResponse(response: BuilderServiceResponse): GameAssemblyProfile {
  if (!response.session) {
    throw new Error(`${response.actionName} response did not include session snapshot`);
  }

  const session = response.session;
  if (!session.activeProfileId) {
    throw new Error(`${response.actionName} response session did not include activeProfileId`);
  }
  if (!session.profile) {
    throw new Error(`${response.actionName} response session did not include active profile`);
  }
  if (session.profile.id !== session.activeProfileId) {
    throw new Error(`${response.actionName} response active profile ${session.profile.id} did not match activeProfileId ${session.activeProfileId}`);
  }

  return session.profile;
}

function profileExportFromResponse(response: BuilderServiceResponse): BuilderProfileExport {
  if (!response.profileExport) {
    throw new Error(`${response.actionName} response did not include profile export output`);
  }

  return response.profileExport;
}

function catalogFromResponse(response: BuilderServiceResponse): BuilderCatalog {
  if (!response.catalog) {
    throw new Error(`${response.actionName} response did not include catalog output`);
  }

  return response.catalog;
}

function paidResponseFromResponse(response: BuilderServiceResponse): PaidOnlineAssemblyResponse {
  if (!response.paidOnline) {
    throw new Error(`${response.actionName} response did not include paidOnline output`);
  }

  return response.paidOnline;
}

function mapTransportResponse<T>(
  response: BuilderServiceResponse | Promise<BuilderServiceResponse>,
  mapper: (response: BuilderServiceResponse) => T
): T | Promise<T> {
  return isPromiseLike(response) ? response.then(mapper) : mapper(response);
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value && typeof value.then === "function";
}

function timelineEntry(eventInput: JsonValue, sequence: number, timelineIdPrefix: string): StudioTimelineEntry {
  const event = agUiEventFromJson(eventInput);
  return {
    id: `${timelineIdPrefix}.${String(sequence).padStart(4, "0")}`,
    kind: kindForEvent(event),
    title: titleForEvent(event),
    detail: JSON.stringify(event.value, null, 2),
    timestamp: event.timestamp,
    profileId: profileIdForEvent(event),
    rawEvent: event
  };
}

function agUiEventFromJson(eventInput: JsonValue): StudioAgUiEvent {
  return parseAgUiEvent(eventInput);
}

type StudioAgUiEvent = AgUiEvent;

function kindForEvent(event: StudioAgUiEvent): StudioTimelineKind {
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

function titleForEvent(event: StudioAgUiEvent): string {
  if (event.type === "Custom" && typeof event.value === "object" && event.value !== null && "payloadType" in event.value) {
    return `Custom: ${String(event.value.payloadType)}`;
  }
  if (event.type === "Activity" && typeof event.value === "object" && event.value !== null && "message" in event.value) {
    return String(event.value.message);
  }
  return event.type;
}

function profileIdForEvent(event: StudioAgUiEvent): string | undefined {
  if (event.type !== "Custom" || typeof event.value !== "object" || event.value === null || !("profileId" in event.value)) {
    return undefined;
  }
  const profileId = event.value.profileId;
  return typeof profileId === "string" ? profileId : undefined;
}

function buildSseRequestUrl(endpoint: string, request: BuilderServiceRequest): string {
  const url = new URL(endpoint);
  url.searchParams.set("action", request.actionName);

  if (request.sessionId) {
    url.searchParams.set("sessionId", request.sessionId);
  }
  if (request.text) {
    url.searchParams.set("text", request.text);
  }
  if (request.source) {
    url.searchParams.set("source", request.source);
  }
  if (request.templateId) {
    url.searchParams.set("templateId", request.templateId);
  }
  if (request.moonshineTranscript) {
    url.searchParams.set("moonshineTranscript", JSON.stringify(request.moonshineTranscript));
  }
  if (request.assetEdit) {
    url.searchParams.set("assetEdit", JSON.stringify(request.assetEdit));
  }
  if (request.interaction) {
    url.searchParams.set("interaction", JSON.stringify(request.interaction));
  }

  return url.toString();
}

async function readSseFrames(body: ReadableStream<Uint8Array>): Promise<SseFrame[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const frames: SseFrame[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      if (buffer.trim().length > 0) {
        frames.push(parseSseFrame(buffer));
      }
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      frames.push(parseSseFrame(chunk));
      boundary = buffer.indexOf("\n\n");
    }
  }

  return frames;
}

function defaultSseFetch(
  url: string,
  init: { headers: Record<string, string>; method: "GET" }
): Promise<BuilderServiceSseFetchResponse> {
  const fetcher = (globalThis as { fetch?: (url: string, init: unknown) => Promise<BuilderServiceSseFetchResponse> }).fetch;
  if (!fetcher) {
    return Promise.reject(new Error("SSE service transport requires a fetch implementation"));
  }

  return fetcher(url, init);
}

function reconcileFrames(
  request: BuilderServiceRequest,
  frames: readonly SseFrame[]
): BuilderServiceResponse {
  const events: AgUiEventEnvelopeContract[] = [];
  let lastResponse: BuilderServiceResponse | undefined;

  for (const frame of frames) {
    switch (frame.kind) {
      case "sse-run-started":
        events.push({
          type: "RunStarted",
          eventId: `event.${frame.runId}.${frame.sequence}`,
          runId: frame.runId,
          timestamp: "",
          value: { runId: frame.payload.runId }
        });
        break;
      case "sse-tool-call":
        events.push({
          type: "ToolCall",
          eventId: `event.${frame.runId}.${frame.sequence}`,
          runId: frame.runId,
          timestamp: "",
          value: { toolName: frame.payload.toolName, args: frame.payload.args }
        });
        break;
      case "sse-tool-result":
        events.push({
          type: "ToolResult",
          eventId: `event.${frame.runId}.${frame.sequence}`,
          runId: frame.runId,
          timestamp: "",
          value: { toolName: frame.payload.toolName, result: frame.payload.result }
        });
        break;
      case "sse-custom": {
        const payload = frame.payload;
        if (isBuilderServiceResponseShape(payload)) {
          lastResponse = payload;
        } else {
          events.push({
            type: "Custom",
            eventId: `event.${frame.runId}.${frame.sequence}`,
            runId: frame.runId,
            timestamp: "",
            value: payload
          });
        }
        break;
      }
      case "sse-run-finished":
        events.push({
          type: "RunFinished",
          eventId: `event.${frame.runId}.${frame.sequence}`,
          runId: frame.runId,
          timestamp: "",
          value: { runId: frame.payload.runId }
        });
        break;
      case "sse-run-error":
        break;
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-service-response.${request.id}`,
    version: "1.0.0",
    kind: "builder-service-response",
    requestId: request.id,
    actionName: request.actionName,
    execution: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      result: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: `builder-command-result.${request.id}`,
        version: "1.0.0",
        kind: "builder-command-result",
        commandId: `builder-command.${request.id}`,
        sessionId: request.sessionId ?? `${request.id}.session`,
        preview: emptyPreviewFor(request)
      },
      events
    },
    session: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      kind: "builder-session-snapshot",
      sessionId: request.sessionId ?? `${request.id}.session`,
      updatedAt: "2026-07-05T00:00:00.000Z",
      preview: emptyPreviewFor(request)
    }
  };
}

function emptyPreviewFor(request: BuilderServiceRequest): BuilderPreviewState {
  const sessionId = request.sessionId ?? `${request.id}.session`;
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    sessionId,
    renderedComponentIds: [],
    interactionCount: 0
  };
}

function isBuilderServiceResponseShape(value: JsonValue | unknown): value is BuilderServiceResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return candidate.kind === "builder-service-response"
    && typeof candidate.actionName === "string"
    && typeof candidate.requestId === "string";
}