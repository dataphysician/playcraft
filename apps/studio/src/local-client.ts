import type { BuilderAgUiEvent } from "@playcraft/builder";
import {
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderCatalog,
  type BuilderInputSource,
  type BuilderProfileExport,
  type BuilderServiceRequest,
  type BuilderServiceResponse,
  type GameAssemblyProfile,
  type JsonValue,
  type MoonshineTranscriptRecord
} from "@playcraft/contracts";

import { createHttpServiceTransport, createLocalServiceTransport, createMoonshineTranscriptRecord, type BuilderServiceTransport } from "@playcraft/service";
import type { StudioClient, StudioSessionSnapshot, StudioTimelineEntry, StudioTimelineKind } from "./types.js";

export interface ConfiguredStudioClientOptions {
  defaultSessionId?: string;
  serviceEndpoint?: string;
  timelineIdPrefix?: string;
}

export function createConfiguredStudioClient(options: ConfiguredStudioClientOptions = {}): StudioClient {
  const serviceEndpoint = options.serviceEndpoint?.trim();

  return createStudioClientFromServiceTransport({
    defaultSessionId: options.defaultSessionId ?? "studio.session",
    timelineIdPrefix: options.timelineIdPrefix ?? "timeline",
    transport: serviceEndpoint ? createHttpServiceTransport({ endpoint: serviceEndpoint }) : createLocalServiceTransport()
  });
}

export function createLocalStudioClient(): StudioClient {
  return createConfiguredStudioClient();
}

export function createStudioClientFromServiceTransport(options: {
  defaultSessionId: string;
  timelineIdPrefix: string;
  transport: BuilderServiceTransport;
}): StudioClient {
  const profiles = new Map<string, GameAssemblyProfile>();
  const timeline: StudioTimelineEntry[] = [];
  let requestCounter = 0;

  function snapshotFromResponse(sessionId: string, response: BuilderServiceResponse): StudioSessionSnapshot {
    if (!response.execution) {
      throw new Error(`${response.actionName} response did not include execution output`);
    }

    if (response.execution.result.profile) {
      profiles.set(response.execution.result.profile.id, response.execution.result.profile);
    }

    const entries = response.execution.events.map((event, index) => timelineEntry(event, timeline.length + index + 1, options.timelineIdPrefix));
    timeline.push(...entries);

    return {
      activeAssetEdit: response.session?.activeAssetEdit,
      sessionId,
      activeProfileId: response.session?.activeProfileId ?? response.execution.result.profile?.id,
      profiles: Array.from(profiles.values()),
      timeline: [...timeline]
    };
  }

  function nextRequest(
    actionName: BuilderServiceRequest["actionName"],
    input: Partial<BuilderServiceRequest>
  ): BuilderServiceRequest {
    requestCounter += 1;
    return {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-service-request.${options.defaultSessionId}.${requestCounter}`,
      version: "1.0.0",
      kind: "builder-service-request",
      actionName,
      ...input
    };
  }

  return {
    catalog() {
      return mapTransportResponse(
        options.transport.send(nextRequest("catalog", {})),
        (response) => catalogFromResponse(response)
      );
    },
    assembleFromIntent(input) {
      const sessionId = input.sessionId ?? options.defaultSessionId;
      const speechTranscript = speechTranscriptForClientInput({
        requestId: `moonshine-transcript.${options.defaultSessionId}.${requestCounter + 1}`,
        source: input.source,
        speechTranscript: input.speechTranscript,
        text: input.idea
      });
      return mapTransportResponse(
        options.transport.send(
          nextRequest("assemble", {
            sessionId,
            source: speechTranscript ? "speech-transcript" : input.source ?? "text",
            speechTranscript,
            text: speechTranscript?.text ?? input.idea
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
      const sessionId = input.sessionId ?? input.profileExport.sessionId ?? options.defaultSessionId;
      return mapTransportResponse(
        options.transport.send(
          nextRequest("import-profile", {
            profileExport: input.profileExport,
            sessionId
          })
        ),
        (response) => snapshotFromResponse(sessionId, response)
      );
    },
    previewAction(sessionId) {
      return mapTransportResponse(
        options.transport.send(nextRequest("preview", { sessionId })),
        (response) => snapshotFromResponse(sessionId, response)
      );
    },
    requestChange(input) {
      const speechTranscript = speechTranscriptForClientInput({
        requestId: `moonshine-transcript.${options.defaultSessionId}.${requestCounter + 1}`,
        source: input.source,
        speechTranscript: input.speechTranscript,
        text: input.changeRequest
      });
      return mapTransportResponse(
        options.transport.send(
          nextRequest("update", {
            sessionId: input.sessionId,
            source: speechTranscript ? "speech-transcript" : input.source ?? "text",
            speechTranscript,
            text: speechTranscript?.text ?? input.changeRequest
          })
        ),
        (response) => snapshotFromResponse(input.sessionId, response)
      );
    },
    reset() {
      void options.transport.send(nextRequest("reset", {}));
      profiles.clear();
      timeline.length = 0;
    }
  };
}

function speechTranscriptForClientInput(input: {
  requestId: string;
  source?: BuilderInputSource;
  speechTranscript?: MoonshineTranscriptRecord;
  text: string;
}): MoonshineTranscriptRecord | undefined {
  if (input.speechTranscript) {
    return input.speechTranscript;
  }

  if (input.source !== "speech-transcript") {
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

function mapTransportResponse<T>(
  response: BuilderServiceResponse | Promise<BuilderServiceResponse>,
  mapper: (response: BuilderServiceResponse) => T
): T | Promise<T> {
  return isPromiseLike(response) ? response.then(mapper) : mapper(response);
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof (value as Promise<T>).then === "function";
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

function agUiEventFromJson(eventInput: JsonValue): BuilderAgUiEvent {
  if (typeof eventInput !== "object" || eventInput === null || Array.isArray(eventInput)) {
    throw new Error("service event must be a JSON object");
  }

  const event = eventInput as Record<string, JsonValue>;
  if (
    typeof event.type !== "string" ||
    typeof event.eventId !== "string" ||
    typeof event.runId !== "string" ||
    typeof event.timestamp !== "string"
  ) {
    throw new Error("service event is missing AG-UI envelope fields");
  }

  return {
    type: event.type as BuilderAgUiEvent["type"],
    eventId: event.eventId,
    runId: event.runId,
    timestamp: event.timestamp,
    value: event.value
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
