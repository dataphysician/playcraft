import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderServiceResponse,
  type BuilderTemplateId,
  type GameAssemblyProfile,
  type SseFrame
} from "@playcraft/contracts";
import { createMoonshineTranscriptRecord, handleServiceHttpRequestBody } from "@playcraft/service";
import { LiveGame } from "../apps/studio/src/live-game.js";
import { encodeSseFrame } from "../packages/service/src/sse.js";

import { App } from "../apps/mobile-shell/src/App.js";
import {
  MOBILE_AUDIO_CUE_LISTENER_POLICY,
  MOBILE_SHELL_CLIENT_POLICY,
  createMobileAudioCueListener,
  createMobileShellStudioClient,
  type MobileAudioCueListener
} from "../apps/mobile-shell/src/mobile-client.js";

if (typeof globalThis.PointerEvent === "undefined") {
  class PointerEvent extends MouseEvent {
    pointerId: number;
    width: number;
    height: number;
    pressure: number;
    tangentialPressure: number;
    tiltX: number;
    tiltY: number;
    twist: number;
    pointerType: string;
    isPrimary: boolean;

    constructor(type: string, params?: PointerEventInit) {
      super(type, params);
      this.pointerId = params?.pointerId ?? 0;
      this.width = params?.width ?? 0;
      this.height = params?.height ?? 0;
      this.pressure = params?.pressure ?? 0;
      this.tangentialPressure = params?.tangentialPressure ?? 0;
      this.tiltX = params?.tiltX ?? 0;
      this.tiltY = params?.tiltY ?? 0;
      this.twist = params?.twist ?? 0;
      this.pointerType = params?.pointerType ?? "mouse";
      this.isPrimary = params?.isPrimary ?? true;
    }
  }

  (globalThis as unknown as Record<string, unknown>).PointerEvent = PointerEvent;
}

const root = process.cwd();
const packageJsonSchema = z
  .object({
    dependencies: z.record(z.string()),
    name: z.string()
  })
  .passthrough();
const tauriConfigSchema = z
  .object({
    app: z
      .object({
        security: z.object({ csp: z.string() }).passthrough()
      })
      .passthrough(),
    build: z
      .object({
        devUrl: z.string(),
        frontendDist: z.string()
      })
      .passthrough(),
    bundle: z.object({ active: z.boolean() }).passthrough(),
    identifier: z.string(),
    productName: z.string()
  })
  .passthrough();

function readJson<TSchema extends z.ZodTypeAny>(path: string, schema: TSchema): z.infer<TSchema> {
  return schema.parse(JSON.parse(readFileSync(join(root, path), "utf8")));
}

const MOBILE_STREAM_PATH = "http://127.0.0.1:8787/playcraft/stream";
const MOBILE_BASE_PATH = "http://127.0.0.1:8787/playcraft";

function mobileMemoryProfileFixture(): GameAssemblyProfile {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "profile.mobile.test",
    version: "1.0.0",
    kind: "game-assembly-profile",
    profileName: "Mobile Memory Test",
    assemblyRequestId: "playcraft-assembly-request.mobile.test",
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
      assemblyRequestId: "playcraft-assembly-request.mobile.test"
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
        componentId: "component:reveal-card-grid",
        version: "1.0.0",
        capability: "component:reveal-card-grid",
        props: {
          cards: ["toy-1-a", "toy-1-a", "toy-1-b", "toy-1-b"],
          pairs: { "toy-1-a": "a", "toy-1-b": "b" },
          title: "Memory Match MVP"
        }
      }
    ],
    assetRequests: [
      {
        prompt: "toys memory card illustrations",
        kind: "memory-cards",
        replacements: {}
      }
    ],
    validation: {
      id: "profile.mobile.test",
      profileId: "profile.mobile.test",
      templateId: "template.memory-match",
      status: "valid",
      checkedAt: "2026-07-05T00:00:00.000Z"
    }
  };
}

function mobileServiceResponseWithSession(): BuilderServiceResponse {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "builder-service-response.mobile.test",
    version: "1.0.0",
    kind: "builder-service-response",
    requestId: "builder-service-request.mobile.test",
    actionName: "assemble",
    execution: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      result: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-command-result.mobile.test",
        version: "1.0.0",
        kind: "builder-command-result",
        commandId: "builder-command.mobile.test",
        sessionId: "mobile.session",
        preview: {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          sessionId: "mobile.session",
          renderedComponentIds: ["component:reveal-card-grid"],
          interactionCount: 0
        }
      },
      events: [
        {
          type: "RunStarted",
          eventId: "event.mobile.test.1",
          runId: "run.mobile.test",
          timestamp: "2026-07-05T00:00:00.000Z",
          value: { runId: "run.mobile.test" }
        },
        {
          type: "Activity",
          eventId: "event.mobile.test.2",
          runId: "run.mobile.test",
          timestamp: "2026-07-05T00:00:01.000Z",
          value: { message: "playing" }
        }
      ]
    },
    session: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-session-snapshot.mobile.test",
      version: "1.0.0",
      kind: "builder-session-snapshot",
      sessionId: "mobile.session",
      activeTemplateId: "template.memory-match" as BuilderTemplateId,
      activeProfileId: "profile.mobile.test",
      profile: mobileMemoryProfileFixture(),
      updatedAt: "2026-07-05T00:00:00.000Z",
      preview: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        sessionId: "mobile.session",
        activeTemplateId: "template.memory-match" as BuilderTemplateId,
        activeProfileId: "profile.mobile.test"
      }
    }
  };
}

function makeMobileSseStreamResponse(frames: SseFrame[]): {
  body: ReadableStream<Uint8Array>;
  ok: boolean;
  status: number;
} {
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

interface MobileSseCapture {
  fetch: (url: string, init: { method: string; headers: Record<string, string> }) => Promise<{
    body: ReadableStream<Uint8Array>;
    ok: boolean;
    status: number;
  }>;
  requests: Array<{ url: string; method: string; headers: Record<string, string> }>;
  pending: Array<{ frames: SseFrame[] } | { error: Error }>;
}

function captureMobileSseFetch(): MobileSseCapture {
  const capture: MobileSseCapture = {
    fetch: undefined as unknown as MobileSseCapture["fetch"],
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
    return makeMobileSseStreamResponse(next.frames);
  };
  return capture;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Tauri mobile shell", () => {
  it("declares a local-first Tauri Mobile-facing package and config", () => {
    const packageJson = readJson("apps/mobile-shell/package.json", packageJsonSchema);
    const tauriConfig = readJson("apps/mobile-shell/src-tauri/tauri.conf.json", tauriConfigSchema);

    expect(packageJson.name).toBe("@playcraft/mobile-shell");
    expect(packageJson.dependencies).toMatchObject({
      "@playcraft/service": "workspace:*",
      "@playcraft/studio": "workspace:*"
    });
    expect(tauriConfig.productName).toBe("Playcraft Mobile");
    expect(tauriConfig.identifier).toBe("dev.playcraft.mobile");
    expect(tauriConfig.build.devUrl).toBe("http://127.0.0.1:5174");
    expect(tauriConfig.build.frontendDist).toBe("../web-dist");
    expect(tauriConfig.bundle.active).toBe(false);
    expect(tauriConfig.app.security.csp).toContain("http://127.0.0.1:8787");
  });

  it("publishes Mobile shell client defaults for local service sessions", () => {
    expect(MOBILE_SHELL_CLIENT_POLICY).toEqual({
      defaultSessionId: "mobile.session",
      defaultTimelineIdPrefix: "mobile.timeline"
    });

    const client = createMobileShellStudioClient();
    const session = client.assembleFromIntent({ idea: "Sort shapes by color" });

    expect(session.sessionId).toBe(MOBILE_SHELL_CLIENT_POLICY.defaultSessionId);
    expect(session.timeline[0]?.id).toContain(MOBILE_SHELL_CLIENT_POLICY.defaultTimelineIdPrefix);
  });

  it("assembles games through the local Playcraft service client", () => {
    const client = createMobileShellStudioClient();
    const session = client.assembleFromIntent({
      idea: "Memory game with toys",
      source: "moonshine-transcript"
    });

    expect(session.activeProfileId).toBe("profile.memory-match.mvp");
    expect(session.activeProfile?.assetRequests[0]?.prompt).toContain("toys memory card illustrations");
    expect(session.timeline.some((entry) => entry.detail.includes("moonshine-streaming"))).toBe(true);
  });

  it("passes explicit Moonshine transcript records through the mobile Studio client", async () => {
    const transcript = createMoonshineTranscriptRecord({
      id: "moonshine-transcript.test.mobile-client",
      text: "Memory game with dinosaurs"
    });
    const client = createMobileShellStudioClient();
    const session = await Promise.resolve(client.assembleFromIntent({
      idea: "ignored once transcript exists",
      moonshineTranscript: transcript
    }));

    expect(session.activeProfileId).toBe("profile.memory-match.mvp");
    expect(session.activeProfile?.assetRequests[0]?.prompt).toContain("dinosaurs memory card illustrations");
    expect(session.timeline.some((entry) => entry.detail.includes("moonshine-transcript.test.mobile-client"))).toBe(true);
  });

  it("uses mobile Studio client profile export, import, and preview tools", async () => {
    const client = createMobileShellStudioClient();
    const assembled = await Promise.resolve(client.assembleFromIntent({
      idea: "Memory game with dinosaurs",
      source: "text"
    }));
    const exported = await Promise.resolve(client.exportProfile?.(assembled.sessionId));

    expect(exported?.sessionId).toBe(MOBILE_SHELL_CLIENT_POLICY.defaultSessionId);
    expect(exported?.profile.id).toBe("profile.memory-match.mvp");
    expect(exported?.profile.assetRequests[0]?.prompt).toContain("dinosaurs memory card illustrations");

    const imported = await Promise.resolve(client.importProfile?.({
      profileExport: exported!,
      sessionId: "mobile.session.imported"
    }));
    const previewed = await Promise.resolve(client.previewAction?.({
      interaction: { action: "primary" },
      sessionId: "mobile.session.imported"
    }));

    expect(imported?.sessionId).toBe("mobile.session.imported");
    expect(imported?.activeProfileId).toBe("profile.memory-match.mvp");
    expect(imported?.timeline.some((entry) => entry.detail.includes("tool:import-profile"))).toBe(true);
    expect(previewed?.activeProfileId).toBe("profile.memory-match.mvp");
    expect(previewed?.timeline.some((entry) => entry.title === "ToolCall" && entry.detail.includes("tool:reveal-card"))).toBe(true);
    expect(previewed?.timeline.every((entry) => entry.id.startsWith(`${MOBILE_SHELL_CLIENT_POLICY.defaultTimelineIdPrefix}.`))).toBe(true);
  });

  it("can target the local HTTP service endpoint instead of the in-process transport", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal("fetch", async (url: unknown, init: { body?: unknown } = {}) => {
      requestedUrls.push(String(url));
      const response = handleServiceHttpRequestBody(typeof init.body === "string" ? init.body : "");
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        text: async () => response.body
      };
    });

    const client = createMobileShellStudioClient("http://127.0.0.1:8787/playcraft");
    const session = await client.assembleFromIntent({
      idea: "Repeat a pattern with gems",
      source: "moonshine-transcript"
    });

    expect(requestedUrls).toEqual(["http://127.0.0.1:8787/playcraft"]);
    expect(session.activeProfileId).toBe("profile.sequence-repeat.mvp");
    expect(session.activeProfile?.assetRequests[0]?.prompt).toContain("gems sequence game button illustrations");
    expect(session.timeline.some((entry) => entry.detail.includes("moonshine-streaming"))).toBe(true);
  });

  it("renders the mobile shell and generates a live game", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Transcript" }));
    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with toys" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByText("Memory Match MVP")).toBeDefined();
    expect(await screen.findByRole("button", { name: "toy-1-a" })).toBeDefined();
  });

  it("shows the mobile shell's empty state before a game is assembled", () => {
    render(<App />);

    const emptyState = screen.getByLabelText("Live app empty state");
    expect(emptyState).toBeDefined();
    expect(emptyState.querySelector("img")?.getAttribute("alt")).toBe("Children playing a colorful game together");
  });

  it("exposes the MCP catalog browser and Run inspector in the Developer tab", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Developer" }));

    expect(await screen.findByLabelText("MCP catalog browser")).toBeDefined();
    expect(screen.getByLabelText("Run inspector")).toBeDefined();
    expect(screen.getByText("Run Inspector")).toBeDefined();
    expect(screen.getByText("MCP Catalog")).toBeDefined();
  });

  it("renders the Developer empty state when no profile is active", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Developer" }));

    expect(await screen.findByText("No game assembled yet")).toBeDefined();
    expect(screen.getByText("Assemble your first game to inspect the trusted preview and timeline.")).toBeDefined();
  });

  it("flips a memory card via a mobile pointer tap on the live game", async () => {
    vi.useFakeTimers();
    try {
      const client = createMobileShellStudioClient();
      const session = client.assembleFromIntent({ idea: "Memory game with toys" });
      const profile = session.activeProfile;
      expect(profile).toBeDefined();

      render(
        React.createElement(LiveGame, { profile, onInteraction: () => undefined })
      );

      const cards = screen.getAllByRole("button", { name: /toy-/ });
      const firstCard = cards[0]!;
      const rect = firstCard.getBoundingClientRect();
      const backsBefore = screen.queryAllByTestId("playcraft-card-back").length;

      await act(async () => {
        fireEvent.pointerDown(firstCard, {
          pointerId: 1,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        });
        fireEvent.pointerUp(firstCard, {
          pointerId: 1,
          clientX: rect.left + rect.width / 2 + 4,
          clientY: rect.top + rect.height / 2 + 4
        });
      });

      const backsAfter = screen.queryAllByTestId("playcraft-card-back").length;
      expect(backsAfter).toBeLessThan(backsBefore);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses the shared SSE-capable transport when a /stream service endpoint is configured", async () => {
    const capture = captureMobileSseFetch();
    const runId = "run.mobile.stream";
    capture.pending.push({
      frames: [
        { kind: "sse-run-started", runId, sequence: 0, payload: { runId } },
        {
          kind: "sse-custom",
          runId,
          sequence: 1,
          payload: mobileServiceResponseWithSession() as unknown as Record<string, unknown>
        },
        { kind: "sse-run-finished", runId, sequence: 2, payload: { runId } }
      ]
    });

    vi.stubGlobal("fetch", capture.fetch as unknown as typeof fetch);

    const client = createMobileShellStudioClient(MOBILE_STREAM_PATH);
    const session = await client.assembleFromIntent({
      idea: "Memory game with toys",
      source: "text"
    });

    expect(capture.requests).toHaveLength(1);
    expect(capture.requests[0]?.method).toBe("GET");
    expect(capture.requests[0]?.headers.accept).toBe("text/event-stream");
    expect(capture.requests[0]?.url.startsWith(MOBILE_STREAM_PATH)).toBe(true);
    expect(session.activeProfileId).toBe("profile.mobile.test");
    expect(session.timeline.length).toBeGreaterThan(0);
    expect(session.timeline.every((entry) => entry.id.startsWith(`${MOBILE_SHELL_CLIENT_POLICY.defaultTimelineIdPrefix}.`))).toBe(true);
  });

  it("does not select SSE transport when the service endpoint lacks the /stream suffix", async () => {
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

    const client = createMobileShellStudioClient(MOBILE_BASE_PATH);
    const catalog = await Promise.resolve((client.catalog?.() ?? Promise.resolve(undefined)));

    expect(requestedMethods).toContain("POST");
    expect(catalog).toBeDefined();
  });

  it("receives audio cues through the mobile audio cue listener when LiveGame emits them", async () => {
    vi.useFakeTimers();
    try {
      const listener = createMobileAudioCueListener();
      expect(listener.cues).toEqual([]);
      expect(typeof listener.onAudioCue).toBe("function");

      const client = createMobileShellStudioClient();
      const session = client.assembleFromIntent({ idea: "Memory game with toys" });
      const profile = session.activeProfile;
      expect(profile).toBeDefined();

      render(
        React.createElement(LiveGame, { profile, onAudioCue: listener.onAudioCue })
      );

      const cards = screen.getAllByRole("button", { name: /toy-/ });
      const [cardA, cardB] = cards.slice(0, 2);
      const rectA = cardA.getBoundingClientRect();
      const rectB = cardB.getBoundingClientRect();

      await act(async () => {
        fireEvent.pointerDown(cardA, { pointerId: 1, clientX: rectA.left + rectA.width / 2, clientY: rectA.top + rectA.height / 2 });
        fireEvent.pointerUp(cardA, { pointerId: 1, clientX: rectA.left + rectA.width / 2, clientY: rectA.top + rectA.height / 2 });
      });

      expect(listener.cues.some((cue) => cue.kind === "reveal")).toBe(true);

      await act(async () => {
        fireEvent.pointerDown(cardB, { pointerId: 2, clientX: rectB.left + rectB.width / 2, clientY: rectB.top + rectB.height / 2 });
        fireEvent.pointerUp(cardB, { pointerId: 2, clientX: rectB.left + rectB.width / 2, clientY: rectB.top + rectB.height / 2 });
      });

      const observedKinds = new Set(listener.cues.map((cue) => cue.kind));
      expect(observedKinds.has("success") || observedKinds.has("error") || observedKinds.has("complete")).toBe(true);
      expect(listener.cues.every((cue) => cue.volume >= 0 && cue.volume <= MOBILE_AUDIO_CUE_LISTENER_POLICY.maxVolume)).toBe(true);
      expect(listener.cues.every((cue) => cue.duration >= 0 && cue.duration <= MOBILE_AUDIO_CUE_LISTENER_POLICY.maxDurationMs)).toBe(true);

      listener.clear();
      expect(listener.cues).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("routes the mobile App's audio cue listener through the same AudioCue contract used by Studio", () => {
    const listener: MobileAudioCueListener = createMobileAudioCueListener();
    render(<App audioCueListener={listener} />);

    listener.onAudioCue({ kind: "success", volume: 0.8, duration: 200 });
    listener.onAudioCue({ kind: "error", volume: 0.6, duration: 300 });
    listener.onAudioCue({ kind: "reveal", volume: 0.5, duration: 150 });
    listener.onAudioCue({ kind: "complete", volume: 1, duration: 400 });

    expect(listener.cues.map((cue) => cue.kind)).toEqual(["success", "error", "reveal", "complete"]);

    listener.onAudioCue({ kind: "success", volume: 99, duration: 0 });
    expect(listener.cues).toHaveLength(4);
  });

  it("forwards AudioCue metadata from the mobile App into the registered listener after a pointer tap", async () => {
    const listener = createMobileAudioCueListener();
    render(<App audioCueListener={listener} />);

    fireEvent.click(screen.getByRole("button", { name: "Transcript" }));
    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with toys" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    const firstCard = await screen.findByRole("button", { name: "toy-1-a" });
    const rect = firstCard.getBoundingClientRect();

    await act(async () => {
      fireEvent.pointerDown(firstCard, {
        pointerId: 1,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      });
      fireEvent.pointerUp(firstCard, {
        pointerId: 1,
        clientX: rect.left + rect.width / 2 + 3,
        clientY: rect.top + rect.height / 2 + 3
      });
    });

    expect(listener.cues.length).toBeGreaterThan(0);
    expect(listener.cues.some((cue) => cue.kind === "reveal")).toBe(true);
  });
});
