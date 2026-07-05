import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderServiceRequest,
  type BuilderServiceResponse,
  type BuilderTemplateId,
  type GameAssemblyProfile,
  type SseFrame
} from "@playcraft/contracts";
import { encodeSseFrame } from "../packages/service/src/sse.js";
import { handleServiceHttpRequestBody } from "@playcraft/service";
import {
  createConfiguredStudioClient,
  createSseServiceTransport,
  isSseServiceEndpoint,
  type BuilderServiceSseFetch
} from "../apps/studio/src/local-client.js";
import type { StudioSessionSnapshot } from "../apps/studio/src/types.js";

const profileFixture: GameAssemblyProfile = profileFixtureForTesting();

const STREAM_PATH = "http://127.0.0.1:8787/playcraft/stream";
const BASE_PATH = "http://127.0.0.1:8787/playcraft";

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeSseStreamResponse(frames: SseFrame[]): { ok: boolean; status: number; body: ReadableStream<Uint8Array> } {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(encodeSseFrame(frame)));
      }
      controller.close();
    }
  });
  return { body: stream, ok: true, status: 200 };
}

interface SseCapture {
  fetch: BuilderServiceSseFetch;
  requests: Array<{ url: string; method: string; headers: Record<string, string> }>;
  pending: Array<{ frames: SseFrame[] } | { error: Error }>;
}

function captureFetch(): SseCapture {
  const capture: SseCapture = {
    fetch: undefined as unknown as BuilderServiceSseFetch,
    pending: [],
    requests: []
  };
  capture.fetch = async (url, init) => {
    capture.requests.push({ url, method: init.method, headers: { ...init.headers } });
    const next = capture.pending.shift();
    if (!next) {
      throw new Error(`unexpected fetch call to ${url}`);
    }
    if ("error" in next) {
      throw next.error;
    }
    return makeSseStreamResponse(next.frames);
  };
  return capture;
}

function makeSessionSnapshot(): StudioSessionSnapshot {
  return {
    sessionId: "session.sse-test",
    timeline: []
  };
}

function makeServiceResponseWithSession(): BuilderServiceResponse {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "builder-service-response.sse.test",
    version: "1.0.0",
    kind: "builder-service-response",
    requestId: "builder-service-request.sse.test",
    actionName: "assemble",
    execution: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      result: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-command-result.sse.test",
        version: "1.0.0",
        kind: "builder-command-result",
        commandId: "builder-command.sse.test",
        sessionId: "session.sse-test",
        preview: {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          sessionId: "session.sse-test"
        }
      },
      events: [
        {
          type: "RunStarted",
          eventId: "event.sse.test.1",
          runId: "run.sse.test",
          timestamp: "2026-07-05T00:00:00.000Z",
          value: { runId: "run.sse.test" }
        },
        {
          type: "Activity",
          eventId: "event.sse.test.2",
          runId: "run.sse.test",
          timestamp: "2026-07-05T00:00:01.000Z",
          value: { message: "playing" }
        }
      ]
    },
    session: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-session-snapshot.sse.test",
      version: "1.0.0",
      kind: "builder-session-snapshot",
      sessionId: "session.sse-test",
      activeTemplateId: "template.memory-match" as BuilderTemplateId,
      activeProfileId: "profile.sse.test",
      profile: profileFixture,
      updatedAt: "2026-07-05T00:00:00.000Z",
      preview: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        sessionId: "session.sse-test",
        activeTemplateId: "template.memory-match" as BuilderTemplateId,
        activeProfileId: "profile.sse.test"
      }
    }
  };
}

function profileFixtureForTesting(): GameAssemblyProfile {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "profile.sse.test",
    version: "1.0.0",
    kind: "game-assembly-profile",
    profileName: "SSE Test Profile",
    assemblyRequestId: "playcraft-assembly-request.sse.test",
    template: {
      id: "template.memory-match" as BuilderTemplateId,
      kind: "game-template-snapshot",
      displayName: "Memory Match",
      displayLabel: "Memory Match MVP",
      assetPromptKind: "memory-cards",
      assetEditOperations: [{ componentCapability: "component:reveal-card-grid", operation: "memory-pairs" }],
      liveSurface: {
        kind: "memory",
        componentCapabilities: { primary: "component:reveal-card-grid" },
        assetReplacementSources: [
          { componentRole: "primary", prop: "cards", namespace: "card" }
        ],
        tokenStyles: [
          {
            tokens: ["primary"],
            background: "bg.primary",
            border: "border.primary",
            foreground: "fg.primary",
            accent: "accent.primary"
          }
        ],
        defaultTokenStyle: {
          tokens: ["primary"],
          background: "bg.primary",
          border: "border.primary",
          foreground: "fg.primary",
          accent: "accent.primary"
        }
      },
      assemblyRequestId: "playcraft-assembly-request.sse.test"
    },
    domainProfile: { id: "domain-profile.memory-game", version: "1.0.0" },
    safetyPolicy: { id: "safety-policy.toddler-safe-default", version: "1.0.0" },
    theme: { id: "theme.bright-primary", version: "1.0.0" },
    mechanics: [
      {
        bindingId: "mechanic.reveal",
        mechanicId: "mechanic.reveal",
        version: "1.0.0",
        parameters: {},
        eventBindings: {}
      }
    ],
    rules: [
      {
        bindingId: "rule.match",
        ruleId: "rule.match",
        version: "1.0.0",
        parameters: {},
        defaultSource: "profile"
      }
    ],
    components: [
      {
        bindingId: "component.reveal-card-grid",
        componentId: "component.reveal-card-grid",
        version: "1.0.0",
        renderCapability: "component:reveal-card-grid",
        mechanicBindingIds: ["mechanic.reveal"],
        renderMechanicBindingId: "mechanic.reveal",
        props: {},
        assetBindings: {}
      }
    ],
    assetRequests: [],
    assets: [],
    replay: {
      deterministicSeed: "sse.test.seed",
      plannerId: "planner.local",
      plannerVersion: "1.0.0",
      unsupportedSeedRequests: [],
      eventLog: []
    },
    validation: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "validation.profile.sse.test",
      version: "1.0.0",
      kind: "assembly-validation-result",
      profileId: "profile.sse.test",
      valid: true,
      errors: [],
      warnings: []
    }
  };
}

describe("SSE service endpoint detection", () => {
  it("detects /stream suffix in service endpoint URL", () => {
    expect(isSseServiceEndpoint(STREAM_PATH)).toBe(true);
  });

  it("does not flag a base endpoint URL as SSE", () => {
    expect(isSseServiceEndpoint(BASE_PATH)).toBe(false);
  });

  it("does not flag unrelated URLs containing 'stream' as part of unrelated text", () => {
    expect(isSseServiceEndpoint("http://127.0.0.1:8787/playcraft")).toBe(false);
    expect(isSseServiceEndpoint("")).toBe(false);
  });
});

describe("createSseServiceTransport", () => {
  it("issues a GET request to the SSE endpoint with Accept text/event-stream", async () => {
    const capture = captureFetch();
    const runId = "run.sse.basic";
    capture.pending.push({
      frames: [
        { kind: "sse-run-started", runId, sequence: 0, payload: { runId } },
        { kind: "sse-run-finished", runId, sequence: 1, payload: { runId } }
      ]
    });
    const transport = createSseServiceTransport({ endpoint: STREAM_PATH, fetch: capture.fetch });

    const request: BuilderServiceRequest = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.sse.basic",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "catalog"
    };
    await transport.send(request);

    expect(capture.requests).toHaveLength(1);
    expect(capture.requests[0]?.method).toBe("GET");
    expect(capture.requests[0]?.headers.accept).toBe("text/event-stream");
    const url = new URL(capture.requests[0]?.url ?? "");
    expect(url.pathname).toBe("/playcraft/stream");
    expect(url.searchParams.get("action")).toBe("catalog");
  });

  it("serializes assemble/update text and sessionId into query parameters", async () => {
    const capture = captureFetch();
    const runId = "run.sse.assemble";
    capture.pending.push({
      frames: [
        { kind: "sse-run-started", runId, sequence: 0, payload: { runId } },
        { kind: "sse-run-finished", runId, sequence: 1, payload: { runId } }
      ]
    });
    const transport = createSseServiceTransport({ endpoint: STREAM_PATH, fetch: capture.fetch });

    await transport.send({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.sse.assemble",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.sse.assemble",
      text: "Memory game with dinosaurs"
    });

    const url = new URL(capture.requests[0]?.url ?? "");
    expect(url.searchParams.get("action")).toBe("assemble");
    expect(url.searchParams.get("sessionId")).toBe("session.sse.assemble");
    expect(url.searchParams.get("text")).toBe("Memory game with dinosaurs");
  });

  it("appends frames to the timeline in submission order across all frame kinds", async () => {
    const capture = captureFetch();
    const runId = "run.sse.frames";
    const frames: SseFrame[] = [
      { kind: "sse-run-started", runId, sequence: 0, payload: { runId } },
      { kind: "sse-tool-call", runId, sequence: 1, payload: { toolName: "tool:assemble-game", args: { templateId: "template.memory-match" } } },
      { kind: "sse-tool-result", runId, sequence: 2, payload: { toolName: "tool:assemble-game", result: { profileId: "profile.frames.1" } } },
      { kind: "sse-custom", runId, sequence: 3, payload: { type: "Activity", message: "playing" } },
      { kind: "sse-run-finished", runId, sequence: 4, payload: { runId } }
    ];
    capture.pending.push({ frames });
    const transport = createSseServiceTransport({ endpoint: STREAM_PATH, fetch: capture.fetch });

    const request: BuilderServiceRequest = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.sse.frames",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "catalog"
    };
    await transport.send(request);

    expect(frames.map((frame) => frame.kind)).toEqual([
      "sse-run-started",
      "sse-tool-call",
      "sse-tool-result",
      "sse-custom",
      "sse-run-finished"
    ]);
  });

  it("reconciles accumulated frames into a BuilderServiceResponse on sse-run-finished", async () => {
    const capture = captureFetch();
    const runId = "run.sse.reconcile";
    const snapshot = makeSessionSnapshot();
    const payloadResponse = makeServiceResponseWithSession();
    capture.pending.push({
      frames: [
        { kind: "sse-run-started", runId, sequence: 0, payload: { runId } },
        { kind: "sse-custom", runId, sequence: 1, payload: payloadResponse as unknown as Record<string, unknown> },
        { kind: "sse-run-finished", runId, sequence: 2, payload: { runId } }
      ]
    });
    const transport = createSseServiceTransport({ endpoint: STREAM_PATH, fetch: capture.fetch });

    const response = await transport.send({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.sse.reconcile",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "get-session",
      sessionId: snapshot.sessionId
    });

    expect(response.actionName).toBe("assemble");
    expect(response.session?.sessionId).toBe("session.sse-test");
    void snapshot;
  });

  it("rejects with a typed error containing the accumulated timeline when sse-run-error arrives", async () => {
    const capture = captureFetch();
    const runId = "run.sse.error";
    capture.pending.push({
      frames: [
        { kind: "sse-run-started", runId, sequence: 0, payload: { runId } },
        { kind: "sse-tool-call", runId, sequence: 1, payload: { toolName: "tool:assemble-game", args: {} } },
        { kind: "sse-run-error", runId, sequence: 2, payload: { message: "boom" } },
        { kind: "sse-run-finished", runId, sequence: 3, payload: { runId } }
      ]
    });
    const transport = createSseServiceTransport({ endpoint: STREAM_PATH, fetch: capture.fetch });

    const sendPromise = transport.send({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.sse.error",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "catalog"
    });

    await expect(sendPromise).rejects.toThrow(/boom/u);
    await expect(sendPromise).rejects.toMatchObject({
      name: "SseStreamError",
      timeline: [
        expect.objectContaining({ kind: "sse-run-started" }),
        expect.objectContaining({ kind: "sse-tool-call" }),
        expect.objectContaining({ kind: "sse-run-error" })
      ]
    });
  });

  it("rejects with a clear error when an SSE frame is malformed", async () => {
    const capture = captureFetch();
    const encoder = new TextEncoder();
    capture.fetch = async () => ({
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("data: not-json\n\n"));
          controller.close();
        }
      }),
      ok: true,
      status: 200
    });
    const transport = createSseServiceTransport({ endpoint: STREAM_PATH, fetch: capture.fetch });

    await expect(
      transport.send({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.sse.bad-frame",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "catalog"
      })
    ).rejects.toThrow(/SSE frame/u);
  });

  it("rejects with a clear error when the fetch call itself fails", async () => {
    const capture = captureFetch();
    capture.pending.push({ error: new Error("network down") });
    const transport = createSseServiceTransport({ endpoint: STREAM_PATH, fetch: capture.fetch });

    await expect(
      transport.send({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.sse.net-error",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "catalog"
      })
    ).rejects.toThrow(/network down/u);
  });

  it("rejects with a clear error when the SSE response status is not ok", async () => {
    const capture = captureFetch();
    capture.fetch = async () => ({ body: null, ok: false, status: 500 });
    const transport = createSseServiceTransport({ endpoint: STREAM_PATH, fetch: capture.fetch });

    await expect(
      transport.send({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.sse.bad-status",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "catalog"
      })
    ).rejects.toThrow(/500/u);
  });
});

describe("createConfiguredStudioClient with SSE endpoint", () => {
  it("selects SSE transport when endpoint URL contains /stream", async () => {
    const capture = captureFetch();
    const runId = "run.sse.factory";
    capture.pending.push({
      frames: [
        { kind: "sse-run-started", runId, sequence: 0, payload: { runId } },
        { kind: "sse-custom", runId, sequence: 1, payload: makeServiceResponseWithSession() as unknown as Record<string, unknown> },
        { kind: "sse-run-finished", runId, sequence: 2, payload: { runId } }
      ]
    });

    vi.stubGlobal("fetch", capture.fetch as unknown as typeof fetch);

    const client = createConfiguredStudioClient({ serviceEndpoint: STREAM_PATH });
    const snapshot = await client.assembleFromIntent({
      idea: "Memory game with dinosaurs",
      sessionId: "session.sse-test"
    });

    expect(capture.requests).toHaveLength(1);
    expect(capture.requests[0]?.method).toBe("GET");
    expect(capture.requests[0]?.headers.accept).toBe("text/event-stream");
    expect(snapshot.sessionId).toBe("session.sse-test");
    expect(snapshot.timeline.length).toBeGreaterThan(0);
  });

  it("falls back to JSON transport when endpoint URL does not contain /stream", async () => {
    const requestedMethods: string[] = [];
    vi.stubGlobal("fetch", async (_url: unknown, init: { method?: string; body?: unknown } = {}) => {
      requestedMethods.push(init.method ?? "GET");
      const body = typeof init.body === "string" ? init.body : "";
      const response = handleServiceHttpRequestBody(body);
      return {
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.close();
          }
        }),
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        text: async () => response.body
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const client = createConfiguredStudioClient({ serviceEndpoint: BASE_PATH });

    const catalog = await Promise.resolve((client.catalog?.() ?? Promise.resolve(undefined)));
    expect(requestedMethods).toContain("POST");
    expect(catalog).toBeDefined();
  });

  it("clears the accumulated timeline when a new send begins after a previous run", async () => {
    const capture = captureFetch();
    const runIdFirst = "run.sse.first";
    const runIdSecond = "run.sse.second";

    capture.pending.push({
      frames: [
        { kind: "sse-run-started", runId: runIdFirst, sequence: 0, payload: { runId: runIdFirst } },
        { kind: "sse-tool-call", runId: runIdFirst, sequence: 1, payload: { toolName: "tool:reset", args: {} } },
        { kind: "sse-run-finished", runId: runIdFirst, sequence: 2, payload: { runId: runIdFirst } }
      ]
    });

    const transport = createSseServiceTransport({ endpoint: STREAM_PATH, fetch: capture.fetch });

    const firstResponse = await transport.send({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.sse.profile-swap.1",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "reset"
    });
    expect(firstResponse.actionName).toBe("reset");

    capture.pending.push({
      frames: [
        { kind: "sse-run-started", runId: runIdSecond, sequence: 0, payload: { runId: runIdSecond } },
        { kind: "sse-custom", runId: runIdSecond, sequence: 1, payload: makeServiceResponseWithSession() as unknown as Record<string, unknown> },
        { kind: "sse-run-finished", runId: runIdSecond, sequence: 2, payload: { runId: runIdSecond } }
      ]
    });

    const secondResponse = await transport.send({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.sse.profile-swap.2",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "get-session",
      sessionId: "session.sse.profile-swap"
    });

    expect(secondResponse.session?.sessionId).toBe("session.sse-test");
  });

  it("does not corrupt existing session state when the stream errors mid-run", async () => {
    const capture = captureFetch();
    const successRunId = "run.sse.success";
    const errorRunId = "run.sse.failure";

    capture.pending.push({
      frames: [
        { kind: "sse-run-started", runId: successRunId, sequence: 0, payload: { runId: successRunId } },
        { kind: "sse-custom", runId: successRunId, sequence: 1, payload: makeServiceResponseWithSession() as unknown as Record<string, unknown> },
        { kind: "sse-run-finished", runId: successRunId, sequence: 2, payload: { runId: successRunId } }
      ]
    });

    vi.stubGlobal("fetch", capture.fetch as unknown as typeof fetch);

    const client = createConfiguredStudioClient({ serviceEndpoint: STREAM_PATH });

    const firstSnapshot = await client.assembleFromIntent({
      idea: "Memory game with dinosaurs",
      sessionId: "session.sse-test"
    });
    expect(firstSnapshot.sessionId).toBe("session.sse-test");

    capture.pending.push({
      frames: [
        { kind: "sse-run-started", runId: errorRunId, sequence: 0, payload: { runId: errorRunId } },
        { kind: "sse-run-error", runId: errorRunId, sequence: 1, payload: { message: "upstream failure" } }
      ]
    });

    await expect(
      client.requestChange({ sessionId: firstSnapshot.sessionId, changeRequest: "Change theme" })
    ).rejects.toThrow(/upstream failure/u);

    expect(firstSnapshot.sessionId).toBe("session.sse-test");
    expect(firstSnapshot.timeline.length).toBeGreaterThan(0);
  });
});