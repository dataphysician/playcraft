import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { assembleMvpProfiles } from "@playcraft/packs";
import {
  BuilderProfileExportSchema,
  BuilderServiceRequestSchema,
  type BuilderServiceRequest,
  type BuilderServiceResponse
} from "@playcraft/contracts";
import {
  createLocalPlaycraftService,
  createMoonshineTranscriptRecord,
  handleLocalServiceRequest,
  handleServiceHttpRequestBody,
  resolveBuilderInputCommand
} from "@playcraft/service";
import {
  STUDIO_CLIENT_POLICY,
  STUDIO_RUNTIME_POLICY,
  createConfiguredStudioClient,
  createLocalStudioClient,
  createStudioClientFromServiceTransport,
  serviceEndpointFromStudioRuntimeEnv,
  studioRuntimeEnvFromServiceEndpoint
} from "../apps/studio/src/local-client.js";
import { LiveGame } from "../apps/studio/src/live-game.js";
import { StudioApp } from "../apps/studio/src/studio-app.js";
import { TrustedPreview, getTrustedPreviewComponents } from "../apps/studio/src/trusted-preview.js";
import type { StudioClient, StudioSessionSnapshot, StudioTimelineEntry } from "../apps/studio/src/types.js";

const [profileA, profileB, profileC] = assembleMvpProfiles();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function timelineEntry(id: string, title: string, kind: StudioTimelineEntry["kind"], profileId?: string): StudioTimelineEntry {
  return {
    id,
    kind,
    title,
    detail: `${title} detail`,
    timestamp: "2026-06-27T00:00:00.000Z",
    profileId
  };
}

function setElementRect(
  element: Element,
  rect: { bottom: number; height: number; left: number; right: number; top: number; width: number }
): void {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      ...rect,
      x: rect.left,
      y: rect.top,
      toJSON: () => rect
    })
  });
}

describe("studio UI", () => {
  it("publishes Studio client defaults for local session and timeline IDs", () => {
    expect(STUDIO_CLIENT_POLICY).toEqual({
      defaultSessionId: "studio.session",
      defaultTimelineIdPrefix: "timeline"
    });
  });

  it("publishes Studio runtime endpoint policy for app shells", () => {
    expect(STUDIO_RUNTIME_POLICY).toEqual({
      serviceEndpointEnvName: "VITE_PLAYCRAFT_SERVICE_URL"
    });
    expect(serviceEndpointFromStudioRuntimeEnv({ VITE_PLAYCRAFT_SERVICE_URL: " http://127.0.0.1:8787/playcraft " })).toBe(
      "http://127.0.0.1:8787/playcraft"
    );
    expect(studioRuntimeEnvFromServiceEndpoint(" http://127.0.0.1:8787/playcraft ")).toEqual({
      VITE_PLAYCRAFT_SERVICE_URL: " http://127.0.0.1:8787/playcraft "
    });
    expect(serviceEndpointFromStudioRuntimeEnv({ VITE_PLAYCRAFT_SERVICE_URL: " " })).toBeUndefined();
    expect(serviceEndpointFromStudioRuntimeEnv({})).toBeUndefined();
  });

  it("normalizes local text and Moonshine transcript inputs into template commands", () => {
    const transcript = createMoonshineTranscriptRecord({
      id: "moonshine-transcript.test.resolve",
      text: "Repeat a pattern with gems"
    });
    const text = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 1,
      source: "text",
      text: "Sort shapes by color"
    });
    const speech = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 2,
      source: "moonshine-transcript",
      moonshineTranscript: transcript,
      text: transcript.text
    });

    expect(text.templateId).toBe("template.sorting");
    expect(text.resolution.templateDecision.matchedRequestAliases).toContain("sort");
    expect(text.input.source).toBe("text");
    expect(text.input.transcription).toBeUndefined();
    expect(speech.templateId).toBe("template.sequence-repeat");
    expect(speech.resolution.templateDecision.matchedRequestAliases).toContain("pattern");
    expect(speech.assetEdit?.theme).toBe("gems");
    expect(speech.input.transcription).toEqual({
      engine: "moonshine-streaming",
      runtime: "cpu",
      localOnly: true
    });
  });

  it("lets transcript input replace typed game requests", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.click(screen.getByRole("button", { name: "Transcript" }));
    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with dinosaurs" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByText("Memory Match MVP")).toBeDefined();
    expect(await screen.findByRole("button", { name: "dinosaur-1-a" })).toBeDefined();

    fireEvent.click(screen.getByRole("tab", { name: "Developer" }));
    expect(await screen.findByLabelText("Chat history")).toBeDefined();
    expect(screen.getAllByText("Transcript").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/memory game with dinosaurs/iu).length).toBeGreaterThanOrEqual(1);
  });

  it("passes explicit Moonshine transcript records through the Studio service transport", async () => {
    const requests: BuilderServiceRequest[] = [];
    const transcript = createMoonshineTranscriptRecord({
      id: "moonshine-transcript.test.studio-client",
      segments: [
        {
          text: "Repeat a pattern with gems",
          startMs: 0,
          endMs: 1400
        }
      ],
      text: "Repeat a pattern with gems"
    });
    const client = createStudioClientFromServiceTransport({
      defaultSessionId: "studio.transcript",
      timelineIdPrefix: "timeline.transcript",
      transport: {
        send(request) {
          requests.push(request);
          return handleLocalServiceRequest(request);
        }
      }
    });
    const session = await Promise.resolve(client.assembleFromIntent({
      idea: "ignored once transcript exists",
      moonshineTranscript: transcript
    }));

    expect(requests[0]).toMatchObject({
      actionName: "assemble",
      sessionId: "studio.transcript",
      moonshineTranscript: {
        transcriptId: "moonshine-transcript.test.studio-client"
      },
      text: "Repeat a pattern with gems"
    });
    expect(requests[0]?.source).toBeUndefined();
    expect(session.activeProfileId).toBe("profile.sequence-repeat.mvp");
    expect(session.activeProfile?.id).toBe("profile.sequence-repeat.mvp");
    expect(session.timeline.some((entry) => entry.detail.includes("moonshine-transcript.test.studio-client"))).toBe(true);
  });

  it("uses Studio client policy defaults for transport-backed clients", async () => {
    const requests: BuilderServiceRequest[] = [];
    const client = createStudioClientFromServiceTransport({
      transport: {
        send(request) {
          requests.push(request);
          return handleLocalServiceRequest(request);
        }
      }
    });
    const session = await Promise.resolve(client.assembleFromIntent({ idea: "Memory game with dinosaurs" }));

    expect(requests[0]?.id).toBe("builder-service-request.studio.session.1");
    expect(requests[0]?.sessionId).toBe(STUDIO_CLIENT_POLICY.defaultSessionId);
    expect(session.sessionId).toBe(STUDIO_CLIENT_POLICY.defaultSessionId);
    expect(session.timeline[0]?.id).toBe("timeline.0001");
  });

  it("validates Studio service requests before sending them to transport", async () => {
    const send = vi.fn();
    const client = createStudioClientFromServiceTransport({
      defaultSessionId: "studio.invalid-request",
      timelineIdPrefix: "timeline.invalid-request",
      transport: {
        send
      }
    });

    await expect(async () => client.assembleFromIntent({
      idea: "Memory game with dinosaurs",
      moonshineTranscript: {
        transcriptId: "moonshine-transcript.test.invalid"
      } as never
    })).rejects.toThrow(/schemaVersion|text|Required/u);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects unknown AG-UI event types from service transport responses", () => {
    const client = createStudioClientFromServiceTransport({
      defaultSessionId: "studio.invalid-event",
      timelineIdPrefix: "timeline.invalid-event",
      transport: {
        send(request) {
          const response = handleLocalServiceRequest(request);
          if (!response.execution) {
            return response;
          }

          return {
            ...response,
            execution: {
              ...response.execution,
              events: [
                {
                  eventId: "builder-event.invalid-event.1",
                  runId: "studio.invalid-event.run",
                  timestamp: "2026-07-04T00:00:00.000Z",
                  type: "NotAnAgUiEvent",
                  value: {}
                }
              ]
            }
          };
        }
      }
    });

    expect(() => client.assembleFromIntent({ idea: "Memory game with dinosaurs" })).toThrow(/unknown AG-UI event type/u);
  });

  it("requires service execution responses to include the session snapshot", () => {
    const client = createStudioClientFromServiceTransport({
      defaultSessionId: "studio.missing-session",
      timelineIdPrefix: "timeline.missing-session",
      transport: {
        send(request) {
          const response: Partial<BuilderServiceResponse> = { ...handleLocalServiceRequest(request) };
          delete response.session;
          return response as BuilderServiceResponse;
        }
      }
    });

    expect(() => client.assembleFromIntent({ idea: "Memory game with dinosaurs" })).toThrow(/session snapshot/u);
  });

  it("can assemble through a configured HTTP service endpoint", async () => {
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

    const client = createConfiguredStudioClient({ serviceEndpoint: "http://127.0.0.1:8787/playcraft" });
    const catalog = await Promise.resolve(client.catalog?.());
    const session = await client.assembleFromIntent({
      idea: "Sort shapes by color",
      source: "text"
    });

    expect(catalog?.assetEdit.availableThemes.map((entry) => entry.theme)).toContain("dinosaurs");
    expect(requestedUrls).toEqual(["http://127.0.0.1:8787/playcraft", "http://127.0.0.1:8787/playcraft"]);
    expect(session.activeProfileId).toBe("profile.sorting.mvp");
    expect(session.activeProfile?.profileName).toBe("Sorting MVP");
    expect(session.timeline.length).toBeGreaterThan(0);
    expect(session.timeline.some((entry) => entry.detail.includes("template.sorting"))).toBe(true);
  });

  it("can run service preview actions through a configured HTTP service endpoint", async () => {
    const requestedActions: string[] = [];
    const service = createLocalPlaycraftService();
    vi.stubGlobal("fetch", async (_url: unknown, init: { body?: unknown } = {}) => {
      const body = typeof init.body === "string" ? init.body : "";
      requestedActions.push(BuilderServiceRequestSchema.parse(JSON.parse(body)).actionName);
      const response = handleServiceHttpRequestBody(body, service);
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        text: async () => response.body
      };
    });

    const client = createConfiguredStudioClient({ serviceEndpoint: "http://127.0.0.1:8787/playcraft" });
    const assembled = await client.assembleFromIntent({
      idea: "Memory game with dinosaurs",
      source: "text"
    });
    const previewed = await Promise.resolve(client.previewAction?.(assembled.sessionId));

    expect(requestedActions).toEqual(["assemble", "preview"]);
    expect(previewed?.activeProfileId).toBe("profile.memory-match.mvp");
    expect(previewed?.timeline.some((entry) => entry.title === "ToolCall" && entry.detail.includes("tool:reveal-card"))).toBe(true);
    expect(previewed?.timeline.some((entry) => entry.title === "Custom: replay.event")).toBe(true);
  });

  it("shows catalog-driven available games and asset edits in the request tips tooltip", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    expect(screen.queryByText("Generate a game to play it here.")).toBeNull();
    expect(screen.getByRole("img", { name: "Children playing a colorful game together" })).toBeDefined();
    expect(screen.queryByLabelText("Chat history")).toBeNull();
    expect(screen.queryByText("Available games: Memory Match, Sorting, Sequence Repeat.")).toBeNull();

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Request tips" }));

    expect(screen.getByRole("tooltip")).toBeDefined();
    expect(await screen.findByText("Available games: Memory Match, Sorting, Sequence Repeat, Shape Memory, Color Memory, plus 19 more.")).toBeDefined();
    expect(screen.getByText("Asset edits: with dinosaurs, with toys, with ocean animals, with fruit.")).toBeDefined();
    expect(screen.getByText("Try: Memory game with dinosaurs; Sorting game with toys; Sequence repeat with ocean animals.")).toBeDefined();
  });

  it("renders input source controls from the service catalog", async () => {
    const catalog = createLocalPlaycraftService().catalog();
    const client: StudioClient = {
      catalog: () => ({
        ...catalog,
        tools: catalog.tools.map((tool) =>
          tool.actionName === "preview-action"
            ? {
                ...tool,
                inputSourceSummary: "input: unavailable",
                argumentSummary: "params: empty",
                argumentsSchema: {
                  ...tool.argumentsSchema,
                  fields: {}
                }
              }
            : {
                ...tool,
                inputSourceSummary: tool.acceptedInputSources.length > 0 ? "input: Typed, Moon CPU" : "input: unavailable",
                argumentSummary: tool.argumentSummary.replace(/^args:/u, "params:")
              }
        ),
        input: {
          ...catalog.input,
          noInputLabel: "unavailable",
          sourceOptions: [
            {
              source: "text",
              displayLabel: "Typed",
              generatePlaceholder: "Typed request from catalog",
              updatePlaceholder: "Typed update from catalog"
            },
            {
              source: "moonshine-transcript",
              displayLabel: "Moon CPU",
              generatePlaceholder: "Moonshine request from catalog",
              updatePlaceholder: "Moonshine update from catalog"
            }
          ]
        }
      }),
      assembleFromIntent() {
        throw new Error("not used");
      },
      requestChange() {
        throw new Error("not used");
      }
    };

    render(React.createElement(StudioApp, { client }));

    expect(await screen.findByRole("button", { name: "Typed" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Moon CPU" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Text" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Transcript" })).toBeNull();
    expect((screen.getByLabelText("Request") as HTMLInputElement).placeholder).toBe("Typed request from catalog");

    fireEvent.click(screen.getByRole("button", { name: "Moon CPU" }));

    expect((screen.getByLabelText("Request") as HTMLInputElement).placeholder).toBe("Moonshine request from catalog");

    fireEvent.click(screen.getByRole("tab", { name: "Developer" }));

    expect((await screen.findAllByText("input: Typed, Moon CPU")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("input: unavailable").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/params: .*templateId\*:string/u).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("params: empty").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the service catalog as an agent tool surface in the Developer tab", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.click(screen.getByRole("tab", { name: "Developer" }));

    expect(await screen.findByLabelText("Agent tool catalog")).toBeDefined();
    expect(screen.getByText("tool:assemble-game")).toBeDefined();
    expect(screen.getByText("tool:export-profile")).toBeDefined();
    expect(screen.getByText("assemble-game")).toBeDefined();
    expect(screen.getByText("Service facade")).toBeDefined();
    expect(screen.getAllByText("assemble").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("request / request-batch")).toBeDefined();
    expect(screen.getByText("BuilderServiceRequestSchema / BuilderServiceRequestBatchSchema")).toBeDefined();
    expect(screen.getByText("handleLocalServiceRequest / handleLocalServiceRequestBatch")).toBeDefined();
    expect(screen.getByText("createHttpServiceTransport")).toBeDefined();
    expect(screen.getAllByText("fields: sessionId, text, source, moonshineTranscript, templateId, assetEdit").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("required: sessionId").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("one-of: text|moonshineTranscript").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("request: Requires text or a Moonshine transcript record; sessionId, templateId, source, and assetEdit are optional.")).toBeDefined();
    expect(screen.getAllByText("input: Text, Transcript").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("input: none").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/args: .*templateId\*:string/u).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Memory Match MVP")).toBeDefined();
    expect(screen.getByText("memory, memory game, memory match")).toBeDefined();
    expect(screen.getAllByText("dinosaurs").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("ocean animals")).toBeDefined();
    expect(screen.getByText("dinosaur-1, dinosaur-2, dinosaur-3")).toBeDefined();
  });

  it("keeps the command bar in the viewport after game generation", async () => {
    const view = render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with dinosaurs" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByRole("button", { name: "dinosaur-1-a" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Update Game" })).toBeDefined();
    expect(screen.queryByLabelText("Chat history")).toBeNull();
    const appRoot = view.container.querySelector("main");
    expect(appRoot?.getAttribute("style")).toContain("height: 100vh");
    expect(appRoot?.getAttribute("style")).toContain("overflow: hidden");
  });

  it("runs the backend preview tool from the Developer tab", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with dinosaurs" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByRole("button", { name: "dinosaur-1-a" })).toBeDefined();
    fireEvent.click(screen.getByRole("tab", { name: "Developer" }));
    fireEvent.click(await screen.findByRole("button", { name: "Run Preview Tool" }));

    expect(await screen.findByText("Ran service preview action.")).toBeDefined();
    expect(screen.getAllByText("ToolCall").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/tool:reveal-card/u)).toBeDefined();
  });

  it("assembles a profile, shows trusted preview metadata, updates it, and records preview interactions", async () => {
    const assembleFromIntent = vi.fn<StudioClient["assembleFromIntent"]>().mockResolvedValue({
      sessionId: "session.demo",
      activeProfileId: profileA.id,
      activeProfile: profileA,
      timeline: [
        timelineEntry("timeline.1", "Run started", "lifecycle"),
        timelineEntry("timeline.2", "Profile A assembled", "activity", profileA.id)
      ]
    } satisfies StudioSessionSnapshot);

    const requestChange = vi.fn<StudioClient["requestChange"]>().mockResolvedValue({
      sessionId: "session.demo",
      activeProfileId: profileB.id,
      activeProfile: profileB,
      timeline: [
        timelineEntry("timeline.1", "Run started", "lifecycle"),
        timelineEntry("timeline.2", "Profile A assembled", "activity", profileA.id),
        timelineEntry("timeline.3", "Profile B assembled", "activity", profileB.id)
      ]
    } satisfies StudioSessionSnapshot);

    render(React.createElement(StudioApp, { client: { assembleFromIntent, requestChange } }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Build a memory game for kids" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    await waitFor(() => expect(assembleFromIntent).toHaveBeenCalledWith({ idea: "Build a memory game for kids", sessionId: undefined, source: "text" }));
    expect(await screen.findByText(profileA.profileName)).toBeDefined();
    expect(screen.getByRole("button", { name: "memory-card-1-a" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "memory-card-1-a" }));
    fireEvent.click(screen.getByRole("tab", { name: "Developer" }));
    expect((await screen.findAllByText((text) => text.startsWith("Preview interaction:"))).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Validation: valid")).toBeDefined();
    expect(screen.getByRole("button", { name: /component\.reveal-card-grid/u })).toBeDefined();
    expect(screen.getByRole("button", { name: /component\.celebration-overlay/u })).toBeDefined();
    expect(screen.getByText("tools: tool:reveal-card")).toBeDefined();
    expect(screen.getAllByText("events: none").length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("button", { name: /component\.celebration-overlay/u }));
    expect(await screen.findByText("You found every pair.")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Switch it to a sorting challenge" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Game" }));

    await waitFor(() => expect(requestChange).toHaveBeenCalledWith({ changeRequest: "Switch it to a sorting challenge", sessionId: "session.demo", source: "text" }));
    expect(await screen.findByText(profileB.profileName)).toBeDefined();
    expect(screen.getByRole("button", { name: /component\.sort-bins/u })).toBeDefined();

    fireEvent.click(await screen.findByRole("button", { name: "red circle" }));
    const interactions = await screen.findAllByText((text) => text.startsWith("Preview interaction:"));
    expect(interactions.length).toBeGreaterThanOrEqual(2);
  });

  it("uses concrete component identities for trusted preview summaries", () => {
    const summaries = getTrustedPreviewComponents(profileA);

    expect(summaries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        componentId: "component.reveal-card-grid",
        componentCapability: "component:reveal-card-grid",
        interactionSummary: "tools: tool:reveal-card"
      })
    ]));
    expect(summaries.map((summary) => summary.componentId)).not.toContain("component.unresolved");
    expect(summaries.map((summary) => summary.componentCapability)).not.toContain("component:unresolved");
  });

  it("keeps the memory game selected while swapping requested card assets", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with dinosaurs" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByText("Memory Match MVP")).toBeDefined();
    expect(await screen.findByRole("button", { name: "dinosaur-1-a" })).toBeDefined();
    expect(screen.getByRole("button", { name: "dinosaur-1-b" })).toBeDefined();

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Change the memory game to toys" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Game" }));

    const toy1A = await screen.findByRole("button", { name: "toy-1-a" });
    const toy1B = screen.getByRole("button", { name: "toy-1-b" });
    const toy2A = screen.getByRole("button", { name: "toy-2-a" });
    const toy2B = screen.getByRole("button", { name: "toy-2-b" });
    expect(toy1A).toBeDefined();
    expect(toy1B).toBeDefined();
    expect(screen.queryByRole("button", { name: "dinosaur-1-a" })).toBeNull();
    expect(screen.queryByLabelText("Chat history")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "toy-1-a" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "toy-1-a" }).textContent?.toLowerCase()).toContain("toy 1"));
    fireEvent.click(screen.getByRole("button", { name: "toy-1-b" }));
    await waitFor(() => expect(screen.getByText("1 of 2 pairs")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "toy-2-a" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "toy-2-a" }).textContent?.toLowerCase()).toContain("toy 2"));
    fireEvent.click(screen.getByRole("button", { name: "toy-2-b" }));
    await waitFor(() => expect(screen.getByText("All pairs found")).toBeDefined());
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "toy-1-a" }).style.background).toBe(
        screen.getByRole("button", { name: "toy-1-b" }).style.background
      );
      expect(screen.getByRole("button", { name: "toy-2-a" }).style.background).toBe(
        screen.getByRole("button", { name: "toy-2-b" }).style.background
      );
    });
    const revealedToy1A = screen.getByRole("button", { name: "toy-1-a" });
    const revealedToy1B = screen.getByRole("button", { name: "toy-1-b" });
    const revealedToy2A = screen.getByRole("button", { name: "toy-2-a" });
    const revealedToy2B = screen.getByRole("button", { name: "toy-2-b" });
    expect(revealedToy1A.style.borderColor).toBe(revealedToy1B.style.borderColor);
    expect(revealedToy2A.style.borderColor).toBe(revealedToy2B.style.borderColor);
    expect(revealedToy1A.style.background).not.toBe(revealedToy2A.style.background);
    expect(revealedToy1A.textContent).toContain("T1");
    expect(revealedToy2A.textContent).toContain("T2");

    fireEvent.click(screen.getByRole("tab", { name: "Developer" }));
    expect(await screen.findByLabelText("Chat history")).toBeDefined();
    expect(screen.getByText("Generated Memory Match MVP with dinosaurs assets.")).toBeDefined();
    expect(screen.getByText("Updated Memory Match MVP with toys assets.")).toBeDefined();
  });

  it("summarizes active asset edits from service session state instead of profile prompts", async () => {
    const activeProfile = {
      ...profileA,
      assetRequests: []
    };
    const client: StudioClient = {
      assembleFromIntent: () => ({
        activeAssetEdit: { theme: "dinosaurs" },
        activeProfileId: "profile.memory-match.mvp",
        activeProfile,
        sessionId: "session.summary",
        timeline: []
      }),
      requestChange: () => {
        throw new Error("not used");
      }
    };
    render(React.createElement(StudioApp, { client }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with dinosaurs" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));
    fireEvent.click(await screen.findByRole("tab", { name: "Developer" }));

    expect(await screen.findByText("Generated Memory Match MVP with dinosaurs assets.")).toBeDefined();
  });

  it("does not infer the active profile from profile list order", () => {
    const client: StudioClient = {
      assembleFromIntent: () => {
        throw new Error("not used");
      },
      requestChange: () => {
        throw new Error("not used");
      }
    };
    render(React.createElement(StudioApp, {
      client,
      initialSession: {
        activeProfileId: profileA.id,
        sessionId: "session.stale-active-profile",
        timeline: []
      }
    }));

    expect(screen.queryByText("Memory Match MVP")).toBeNull();
    expect(screen.queryByRole("button", { name: "dinosaur-1-a" })).toBeNull();
  });

  it("uses explicit memory pairs instead of card id suffix heuristics", async () => {
    const profile = {
      ...profileA,
      components: profileA.components.map((component) =>
        component.renderCapability === "component:reveal-card-grid"
          ? {
              ...component,
              props: {
                ...component.props,
                cards: ["moon", "sock", "drum", "bell"],
                pairs: {
                  moon: "pair-one",
                  drum: "pair-one",
                  sock: "pair-two",
                  bell: "pair-two"
                }
              }
            }
          : component
      )
    };

    render(React.createElement(LiveGame, { profile }));

    fireEvent.click(await screen.findByRole("button", { name: "moon" }));
    fireEvent.click(screen.getByRole("button", { name: "drum" }));

    expect(await screen.findByText("1 of 2 pairs")).toBeDefined();
  });

  it("exports and imports profiles from the Developer tab through the Studio client", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with dinosaurs" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByRole("button", { name: "dinosaur-1-a" })).toBeDefined();
    fireEvent.click(screen.getByRole("tab", { name: "Developer" }));
    fireEvent.click(await screen.findByRole("button", { name: "Export Profile" }));

    expect(await screen.findByText("Exported Memory Match MVP.")).toBeDefined();
    const exported = screen.getByLabelText("Profile export JSON") as HTMLTextAreaElement;
    const exportJson = exported.value;
    const parsedExport = BuilderProfileExportSchema.parse(JSON.parse(exportJson));
    expect(parsedExport).toMatchObject({
      kind: "builder-profile-export",
      profile: {
        id: "profile.memory-match.mvp"
      },
      assetEdit: {
        theme: "dinosaurs"
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Start Over" }));
    fireEvent.click(screen.getByRole("tab", { name: "Developer" }));
    fireEvent.change(screen.getByLabelText("Import profile export JSON"), { target: { value: exportJson } });
    fireEvent.click(screen.getByRole("button", { name: "Import Profile" }));

    expect(await screen.findByText("Import requires an active target session.")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Sort shapes by color" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));
    expect(await screen.findByText("Sorting MVP")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Import Profile" }));

    expect(await screen.findByText("Imported Memory Match MVP.")).toBeDefined();
    expect(screen.getAllByText("Memory Match MVP").length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole("tab", { name: "Live App" }));
    expect(await screen.findByRole("button", { name: "dinosaur-1-a" })).toBeDefined();
  });

  it("validates pasted profile exports before importing them in the Studio UI", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with toys" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));
    expect(await screen.findByText("Memory Match MVP")).toBeDefined();
    fireEvent.click(screen.getByRole("tab", { name: "Developer" }));
    fireEvent.change(screen.getByLabelText("Import profile export JSON"), {
      target: {
        value: JSON.stringify({
          kind: "builder-profile-export"
        })
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import Profile" }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/schemaVersion|profile|Required/u);
  });

  it("plays the sorting profile with bin validation", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Sort shapes by color" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByText("Sorting MVP")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "red circle" }));
    const blueBin = screen.getByRole("button", { name: "blue bin" });
    fireEvent.click(blueBin);
    expect(await screen.findByText("red circle does not belong in blue.")).toBeDefined();
    expect(blueBin.getAttribute("style")).toContain("rgb(239, 68, 68)");

    const redBin = screen.getByRole("button", { name: "red bin" });
    fireEvent.click(redBin);
    expect(await screen.findByText("red circle belongs in red.")).toBeDefined();
    expect(redBin.getAttribute("style")).toContain("rgb(22, 163, 74)");
    expect(screen.getByText("1 / 3")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "blue square" }));
    fireEvent.click(screen.getByRole("button", { name: "blue bin" }));
    fireEvent.click(screen.getByRole("button", { name: "red triangle" }));
    fireEvent.click(screen.getByRole("button", { name: "red bin" }));

    expect(await screen.findByText("Sort complete")).toBeDefined();
    expect(screen.getByText("3 items sorted with 1 miss.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Play Again" })).toBeDefined();
  });

  it("uses explicit sorting targets instead of item label heuristics", async () => {
    const profile = {
      ...profileB,
      components: profileB.components.map((component) =>
        component.renderCapability === "component:sort-bins"
          ? {
              ...component,
              props: {
                ...component.props,
                items: ["moon", "star"],
                bins: ["red", "blue"],
                targets: {
                  moon: "red",
                  star: "blue"
                }
              }
            }
          : component
      )
    };

    render(React.createElement(LiveGame, { profile }));

    fireEvent.click(await screen.findByRole("button", { name: "moon" }));
    fireEvent.click(screen.getByRole("button", { name: "red bin" }));

    expect(await screen.findByText("moon belongs in red.")).toBeDefined();
    expect(screen.getByText("1 / 2")).toBeDefined();
  });

  it("supports drag/drop sorting with ghost and target feedback", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Sort shapes by color" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    const item = await screen.findByRole("button", { name: "red circle" });
    const redBin = screen.getByRole("button", { name: "red bin" });
    setElementRect(item, { left: 10, top: 10, right: 190, bottom: 58, width: 180, height: 48 });
    setElementRect(redBin, { left: 240, top: 80, right: 430, bottom: 270, width: 190, height: 190 });

    fireEvent.mouseDown(item, { clientX: 30, clientY: 30, button: 0 });
    fireEvent.mouseMove(item, { clientX: 300, clientY: 140, buttons: 1 });

    expect((await screen.findByTestId("sort-drag-ghost")).textContent).toContain("red circle");
    expect(redBin.getAttribute("style")).toContain("rgb(249, 115, 22)");

    fireEvent.mouseUp(item, { clientX: 300, clientY: 140, button: 0 });

    expect(await screen.findByText("red circle belongs in red.")).toBeDefined();
    expect(redBin.getAttribute("style")).toContain("rgb(22, 163, 74)");
    expect(screen.queryByTestId("sort-drag-ghost")).toBeNull();
  });

  it("uses explicit sequence rounds instead of generated progression heuristics", async () => {
    const profile = {
      ...profileC,
      components: profileC.components.map((component) => {
        if (component.renderCapability === "component:sequence-pad") {
          return {
            ...component,
            props: {
              ...component.props,
              sequence: ["moon"],
              rounds: [["moon"], ["star", "moon"]]
            }
          };
        }

        if (component.renderCapability === "component:choice-grid") {
          return {
            ...component,
            props: {
              ...component.props,
              items: ["moon", "star"]
            }
          };
        }

        return component;
      })
    };

    render(React.createElement(LiveGame, { profile }));

    fireEvent.click(screen.getByRole("button", { name: "Start Round" }));
    fireEvent.click(screen.getByRole("button", { name: "moon" }));
    expect(await screen.findByText("Round 2 unlocked. Watch the next pattern.")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "star" }));
    fireEvent.click(screen.getByRole("button", { name: "moon" }));

    expect(await screen.findByText("Sequence complete.")).toBeDefined();
  });

  it("routes the live game from the template surface contract instead of component priority", async () => {
    const memoryComponent = profileA.components.find((component) => component.renderCapability === "component:reveal-card-grid");
    expect(memoryComponent).toBeDefined();

    const profile = {
      ...profileC,
      components: [memoryComponent!, ...profileC.components]
    };

    render(React.createElement(LiveGame, { profile }));

    expect(screen.getByRole("button", { name: "Start Round" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "memory-card-1-a" })).toBeNull();
  });

  it("uses exact token color aliases instead of substring token styling", () => {
    const profile = {
      ...profileC,
      components: profileC.components.map((component) => {
        if (component.renderCapability === "component:sequence-pad") {
          return {
            ...component,
            props: {
              ...component.props,
              sequence: ["blueberry"],
              rounds: [["blueberry"]]
            }
          };
        }

        if (component.renderCapability === "component:choice-grid") {
          return {
            ...component,
            props: {
              ...component.props,
              items: ["blue", "blueberry"]
            }
          };
        }

        return component;
      })
    };

    render(React.createElement(LiveGame, { profile }));

    expect(screen.getByRole("button", { name: "blue" }).getAttribute("style")).toContain("rgb(37, 99, 235)");
    expect(screen.getByRole("button", { name: "blueberry" }).getAttribute("style")).not.toContain("rgb(37, 99, 235)");
  });

  it("plays the sequence profile through completion", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Repeat a friendly light pattern" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByText("Sequence Repeat MVP")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Start Round" }));
    expect(await screen.findByText("Round 1: repeat the pattern.")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "blue" }));
    expect(await screen.findByText("Not blue. Try green next; watch the pattern again.")).toBeDefined();
    expect(screen.getByRole("button", { name: "blue" }).getAttribute("style")).toContain("rgb(239, 68, 68)");
    expect(screen.getByLabelText("Sequence pattern").getAttribute("style")).toContain("rgb(239, 68, 68)");

    fireEvent.click(screen.getByRole("button", { name: "Start Round" }));
    fireEvent.click(screen.getByRole("button", { name: "green" }));
    expect(await screen.findByText("Correct.")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "yellow" }));
    fireEvent.click(screen.getByRole("button", { name: "green" }));
    expect(await screen.findByText("Round 2 unlocked. Watch the next pattern.")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "green" }));
    fireEvent.click(screen.getByRole("button", { name: "yellow" }));
    fireEvent.click(screen.getByRole("button", { name: "green" }));
    fireEvent.click(screen.getByRole("button", { name: "blue" }));
    expect(await screen.findByText("Round 3 unlocked. Watch the next pattern.")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "yellow" }));
    fireEvent.click(screen.getByRole("button", { name: "green" }));
    fireEvent.click(screen.getByRole("button", { name: "blue" }));
    fireEvent.click(screen.getByRole("button", { name: "green" }));
    fireEvent.click(screen.getByRole("button", { name: "yellow" }));

    expect(await screen.findByText("Sequence complete.")).toBeDefined();
    expect(screen.getByText("Sequence master")).toBeDefined();
    expect(screen.getByRole("button", { name: "Play Again" })).toBeDefined();
  });

  it("resets the local session from the shared command bar", async () => {
    render(React.createElement(StudioApp, { client: createLocalStudioClient() }));

    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with toys" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));
    expect(await screen.findByRole("button", { name: "toy-1-a" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Start Over" }));
    expect(screen.getByRole("button", { name: "Generate Game" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "toy-1-a" })).toBeNull();
  });

  it("surfaces trusted preview failures instead of suppressing them", () => {
    const invalidProfile = {
      ...profileA,
      components: profileA.components.map((component, index) =>
        index === 0 ? { ...component, componentId: "component.unknown" } : component
      )
    };

    render(React.createElement(TrustedPreview, { profile: invalidProfile }));

    expect(screen.getByTestId("trusted-preview-error").textContent).toContain("invalid-request");
    expect(screen.getByTestId("trusted-preview-error").textContent).toContain("component.unknown");
  });

  it("fails closed when a selected trusted preview component is not in the replay", () => {
    render(React.createElement(TrustedPreview, {
      profile: profileA,
      selectedComponentKey: "component.not-in-profile"
    }));

    expect(screen.getByTestId("trusted-preview-error").textContent).toContain("invalid-request");
    expect(screen.getByTestId("trusted-preview-error").textContent).toContain("component.not-in-profile");
    expect(screen.queryByTestId("trusted-preview-surface")).toBeNull();
  });
});
