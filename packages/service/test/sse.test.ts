import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SseFrameSchema, PLAYCRAFT_SCHEMA_VERSION, type SseFrame } from "@playcraft/contracts";
import {
  encodeSseFrame,
  parseSseFrame,
  createSseResponse
} from "../src/sse.js";
import { createPlaycraftHttpServer } from "../src/http-server.js";
import { createLocalPlaycraftService, type LocalPlaycraftService } from "../src/index.js";

function loadFixture(relativePath: string): unknown {
  const filePath = resolve(
    process.cwd(),
    "tests",
    "fixtures",
    "new-contracts",
    relativePath
  );
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

async function readSseChunks(body: ReadableStream<Uint8Array>): Promise<string[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const frames: string[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      if (buffer.length > 0) {
        frames.push(buffer);
      }
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      frames.push(buffer.slice(0, boundary + 2));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }
  }
  return frames;
}

describe("sse codec", () => {
  it("loads the fixture contract samples for the run-started frame", () => {
    const fixture = loadFixture("sse-frame.run-started.json") as Record<string, unknown>;
    expect(() => SseFrameSchema.parse(fixture)).not.toThrow();
  });

  it("encodes a run-started frame into the canonical SSE wire format", () => {
    const frame: SseFrame = {
      kind: "sse-run-started",
      runId: "run.codec.1",
      sequence: 0,
      payload: { runId: "run.codec.1" }
    };

    const encoded = encodeSseFrame(frame);

    expect(encoded).toBe(`data: ${JSON.stringify(frame)}\n\n`);
    expect(encoded.endsWith("\n\n")).toBe(true);
    expect(encoded.startsWith("data: ")).toBe(true);
  });

  it("encodes a tool-call frame with the canonical payload shape", () => {
    const frame: SseFrame = {
      kind: "sse-tool-call",
      runId: "run.codec.1",
      sequence: 1,
      payload: {
        toolName: "tool:assemble-game",
        args: { templateId: "template.memory-match" }
      }
    };

    const encoded = encodeSseFrame(frame);

    expect(encoded).toBe(`data: ${JSON.stringify(frame)}\n\n`);
  });

  it("round-trips a run-started frame through encode and parse", () => {
    const frame: SseFrame = {
      kind: "sse-run-started",
      runId: "run.codec.1",
      sequence: 0,
      payload: { runId: "run.codec.1" }
    };

    const encoded = encodeSseFrame(frame);
    const parsed = parseSseFrame(encoded);

    expect(parsed).toEqual(frame);
  });

  it("round-trips a tool-result frame containing nested result payload", () => {
    const frame: SseFrame = {
      kind: "sse-tool-result",
      runId: "run.codec.2",
      sequence: 2,
      payload: {
        toolName: "tool:assemble-game",
        result: { profileId: "profile.fixture.1", valid: true }
      }
    };

    const parsed = parseSseFrame(encodeSseFrame(frame));

    expect(parsed).toEqual(frame);
  });

  it("rejects an invalid frame when encoding", () => {
    const invalid = {
      kind: "sse-unknown",
      runId: "run.codec.bad",
      sequence: 0,
      payload: {}
    };

    expect(() => encodeSseFrame(invalid as SseFrame)).toThrow();
  });

  it("rejects malformed raw input when parsing", () => {
    expect(() => parseSseFrame("not a sse frame")).toThrow();
    expect(() => parseSseFrame("data: not-json")).toThrow();
    expect(() => parseSseFrame("data: {\"kind\":\"sse-unknown\"}")).toThrow();
  });

  it("rejects raw input that does not start with the data prefix", () => {
    expect(() => parseSseFrame("event: custom\ndata: {\"kind\":\"sse-run-started\"}")).toThrow();
  });

  it("creates a Response with text/event-stream content type and a readable body", async () => {
    const frames: SseFrame[] = [
      { kind: "sse-run-started", runId: "run.codec.3", sequence: 0, payload: { runId: "run.codec.3" } },
      { kind: "sse-tool-call", runId: "run.codec.3", sequence: 1, payload: { toolName: "tool:catalog", args: {} } },
      { kind: "sse-run-finished", runId: "run.codec.3", sequence: 2, payload: { runId: "run.codec.3" } }
    ];

    const response = createSseResponse(async function* () {
      for (const frame of frames) {
        yield frame;
      }
    });

    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("cache-control")).toBe("no-cache");
    expect(response.headers.get("connection")).toBe("keep-alive");

    const body = response.body;
    if (!body) {
      throw new Error("expected SSE response body stream");
    }

    const chunks = await readSseChunks(body);

    expect(chunks).toEqual(frames.map((frame) => `${encodeSseFrame(frame)}`));
  });
});

describe("playcraft SSE HTTP route", () => {
  function createMockService(frameLists: SseFrame[][]): { service: LocalPlaycraftService; calls: number } {
    const state = { calls: 0 };
    const service = {
      stream: async function* () {
        const index = state.calls;
        state.calls += 1;
        const frames = frameLists[index] ?? [];
        for (const frame of frames) {
          yield frame;
        }
      }
    } as unknown as LocalPlaycraftService;
    return { service, calls: state.calls };
  }

  async function listenOnLoopback(
    server: ReturnType<typeof createPlaycraftHttpServer>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      server.on("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (typeof address !== "object" || !address) {
          reject(new Error("expected HTTP server address"));
          return;
        }
        resolve(`http://127.0.0.1:${address.port}`);
      });
    });
  }

  async function closeServer(server: ReturnType<typeof createPlaycraftHttpServer>): Promise<void> {
    return new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  it("returns 406 when the Accept header does not request text/event-stream", async () => {
    const frames: SseFrame[] = [
      { kind: "sse-run-started", runId: "run.http.1", sequence: 0, payload: { runId: "run.http.1" } }
    ];
    const { service } = createMockService([frames]);
    const server = createPlaycraftHttpServer({ service });
    const baseUrl = await listenOnLoopback(server).catch(() => undefined);

    if (!baseUrl) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/playcraft/stream?action=assemble&sessionId=run.http.1`, {
        headers: { accept: "application/json" }
      });
      expect(response.status).toBe(406);
      expect(response.headers.get("accept")).toContain("text/event-stream");
    } finally {
      await closeServer(server);
    }
  });

  it("emits frames in submission order over the SSE stream", async () => {
    const frames: SseFrame[] = [
      { kind: "sse-run-started", runId: "run.http.2", sequence: 0, payload: { runId: "run.http.2" } },
      { kind: "sse-tool-call", runId: "run.http.2", sequence: 1, payload: { toolName: "tool:assemble-game", args: { templateId: "template.memory-match" } } },
      { kind: "sse-tool-result", runId: "run.http.2", sequence: 2, payload: { toolName: "tool:assemble-game", result: { profileId: "profile.http.2" } } },
      { kind: "sse-run-finished", runId: "run.http.2", sequence: 3, payload: { runId: "run.http.2" } }
    ];
    const { service } = createMockService([frames]);
    const server = createPlaycraftHttpServer({ service });
    const baseUrl = await listenOnLoopback(server).catch(() => undefined);

    if (!baseUrl) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/playcraft/stream?action=assemble&sessionId=run.http.2&text=Memory%20game`, {
        headers: { accept: "text/event-stream" }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/event-stream");
      if (!response.body) {
        throw new Error("expected SSE response body stream");
      }

      const chunks = await readSseChunks(response.body);
      expect(chunks).toEqual(frames.map((frame) => encodeSseFrame(frame)));
    } finally {
      await closeServer(server);
    }
  });

  it("honors PLAYCRAFT_HTTP_ROUTE_PREFIX when constructing the stream path", async () => {
    const frames: SseFrame[] = [
      { kind: "sse-run-started", runId: "run.http.3", sequence: 0, payload: { runId: "run.http.3" } }
    ];
    const { service } = createMockService([frames]);
    const server = createPlaycraftHttpServer({ route: "/custom/playcraft", service });
    const baseUrl = await listenOnLoopback(server).catch(() => undefined);

    if (!baseUrl) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/custom/playcraft/stream?action=catalog`, {
        headers: { accept: "text/event-stream" }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/event-stream");
    } finally {
      await closeServer(server);
    }
  });
});

describe("LocalPlaycraftService.stream", () => {
  it("emits SSE frames converted from AG-UI events for an assemble request", async () => {
    const service = createLocalPlaycraftService();
    const request = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.stream.assemble",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble" as const,
      sessionId: "session.stream.assemble",
      text: "Memory game with dinosaurs"
    };

    const frames: SseFrame[] = [];
    for await (const frame of service.stream(request)) {
      frames.push(frame);
    }

    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      expect(() => SseFrameSchema.parse(frame)).not.toThrow();
    }
    const kinds = frames.map((frame) => frame.kind);
    expect(kinds).toContain("sse-tool-call");
    expect(kinds).toContain("sse-tool-result");
    expect(kinds).toContain("sse-run-finished");

    const toolCall = frames.find((frame) => frame.kind === "sse-tool-call");
    expect(toolCall?.kind).toBe("sse-tool-call");
    if (toolCall?.kind === "sse-tool-call") {
      expect(toolCall.payload.toolName).toBe("tool:assemble-game");
    }
  });

  it("yields a run-error frame when the request fails validation", async () => {
    const service = createLocalPlaycraftService();
    const frames: SseFrame[] = [];
    for await (const frame of service.stream({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.stream.bad",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "update" as const,
      sessionId: "session.stream.bad",
      text: "Change the memory game"
    })) {
      frames.push(frame);
    }

    expect(frames.length).toBe(3);
    expect(frames[0]?.kind).toBe("sse-run-started");
    expect(frames[1]?.kind).toBe("sse-run-error");
    expect(frames[2]?.kind).toBe("sse-run-finished");
    if (frames[1]?.kind === "sse-run-error") {
      expect(frames[1].payload.message).toMatch(/active session|assemble/i);
    }
  });
});