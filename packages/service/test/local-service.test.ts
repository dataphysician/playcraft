import { describe, expect, it } from "vitest";
import { PLAYCRAFT_SCHEMA_VERSION, type BuilderServiceResponse } from "@playcraft/contracts";
import {
  PLAYCRAFT_SERVICE_PACKAGE,
  createHttpServiceTransport,
  createLocalServiceTransport,
  createLocalPlaycraftService,
  handleServiceHttpRequestBody,
  handleLocalServiceRequest,
  resolveBuilderInputCommand
} from "../src/index.js";
import { runLocalServiceCli } from "../src/cli.js";

describe("local Playcraft service", () => {
  it("publishes local tools and bundled templates for shells", () => {
    const service = createLocalPlaycraftService();
    const catalog = service.catalog();

    expect(PLAYCRAFT_SERVICE_PACKAGE).toBe("@playcraft/service");
    expect(catalog.kind).toBe("builder-catalog");
    expect(catalog.defaultTemplateId).toBe("template.memory-match");
    expect(catalog.retrieval).toEqual({
      current: "bundled-local",
      planned: "server-catalog"
    });
    expect(catalog.assetEdit).toMatchObject({
      supported: true,
      acceptedKeys: ["theme", "items"],
      maxItems: 12,
      localReplacementFolders: true
    });
    expect(catalog.tools.map((tool) => tool.toolName)).toEqual([
      "tool:assemble-game",
      "tool:update-game",
      "tool:preview-action",
      "tool:list-builder-tools"
    ]);
    expect(catalog.tools.find((tool) => tool.actionName === "assemble-game")?.argumentsSchema.fields.templateId).toEqual({
      type: "string",
      required: true
    });
    expect(catalog.tools.find((tool) => tool.actionName === "update-game")?.argumentsSchema.fields.sessionId).toEqual({
      type: "string",
      required: true
    });
    expect(catalog.templates.map((template) => template.id)).toEqual([
      "template.memory-match",
      "template.sorting",
      "template.sequence-repeat"
    ]);
    expect(catalog.templates.find((template) => template.id === "template.memory-match")?.requestAliases).toContain("matching cards");
  });

  it("assembles and updates games through text or local speech transcripts", () => {
    const service = createLocalPlaycraftService();
    const assembled = service.assemble({
      source: "speech-transcript",
      text: "Memory game with dinosaurs"
    });
    const updated = service.update({
      sessionId: assembled.result.sessionId,
      source: "text",
      text: "Change to sorting with fruits"
    });

    expect(assembled.result.profile?.id).toBe("profile.memory-match.mvp");
    expect(assembled.events.some((event) => JSON.stringify(event.value).includes("moonshine-streaming"))).toBe(true);
    expect(updated.result.profile?.id).toBe("profile.sorting.mvp");
    expect(updated.result.profile?.assetRequests[0]?.prompt).toContain("fruits sorting game illustrations");
  });

  it("handles validated service API requests for local and future server transports", () => {
    const service = createLocalPlaycraftService();
    const catalog = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.catalog",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "catalog"
    });
    const assembled = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.assemble",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.service-api",
      source: "speech-transcript",
      text: "Memory game with toys"
    });
    const updated = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.update",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "update",
      sessionId: "session.service-api",
      text: "Please group by color with fruit"
    });

    expect(catalog.catalog?.templates.map((template) => template.id)).toContain("template.sequence-repeat");
    expect(assembled.execution?.result.profile?.id).toBe("profile.memory-match.mvp");
    expect(assembled.execution?.events.some((event) => JSON.stringify(event).includes("moonshine-streaming"))).toBe(true);
    expect(updated.execution?.result.profile?.id).toBe("profile.sorting.mvp");
    expect(updated.execution?.result.profile?.assetRequests[0]?.prompt).toContain("fruit sorting game illustrations");
  });

  it("routes in-process transport requests through the same service envelope", () => {
    const transport = createLocalServiceTransport();
    const response = transport.send({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.transport",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.transport",
      text: "Repeat a pattern with gems"
    });

    expect(response).toMatchObject({
      kind: "builder-service-response",
      actionName: "assemble",
      execution: {
        result: {
          sessionId: "session.transport",
          profile: {
            id: "profile.sequence-repeat.mvp"
          }
        }
      }
    });
  });

  it("handles service requests through a server-neutral HTTP JSON body adapter", () => {
    const response = handleServiceHttpRequestBody(JSON.stringify({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.http-body",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.http-body",
      text: "Memory game with dinosaurs"
    }));
    const parsed = JSON.parse(response.body) as BuilderServiceResponse;

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/json");
    expect(parsed.execution?.result.sessionId).toBe("session.http-body");
    expect(parsed.execution?.result.profile?.assetRequests[0]?.prompt).toContain("dinosaurs memory card illustrations");

    const invalid = handleServiceHttpRequestBody("{");
    expect(invalid.status).toBe(400);
    expect(JSON.parse(invalid.body)).toMatchObject({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      kind: "builder-service-error"
    });
  });

  it("creates an HTTP client transport over the same service envelope", async () => {
    const service = createLocalPlaycraftService();
    const transport = createHttpServiceTransport({
      endpoint: "http://127.0.0.1:8787/playcraft",
      fetch: async (url, init) => {
        const response = handleServiceHttpRequestBody(init.body, service);
        expect(url).toBe("http://127.0.0.1:8787/playcraft");
        expect(init.method).toBe("POST");
        expect(init.headers["content-type"]).toBe("application/json");

        return {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          text: async () => response.body
        };
      }
    });
    const response = await transport.send({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.http-client",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.http-client",
      source: "speech-transcript",
      text: "Repeat a pattern with gems"
    });

    expect(response.kind).toBe("builder-service-response");
    expect(response.execution?.result.profile?.id).toBe("profile.sequence-repeat.mvp");
    expect(JSON.stringify(response.execution?.events)).toContain("moonshine-streaming");
  });

  it("accepts explicit asset edit records for future local asset-library adapters", () => {
    const service = createLocalPlaycraftService();
    const assembled = service.assemble({
      text: "Memory game",
      assetEdit: {
        theme: "ocean animals",
        items: ["dolphin", "turtle"]
      }
    });

    expect(assembled.result.profile?.id).toBe("profile.memory-match.mvp");
    expect(assembled.result.profile?.assetRequests[0]?.prompt).toContain("ocean animals memory card illustrations");
    expect(assembled.result.profile?.components[0]?.props.cards).toEqual(["dolphin-a", "dolphin-b", "turtle-a", "turtle-b"]);
  });

  it("resolves input without implicit game switching when no template is named", () => {
    const resolved = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 1,
      source: "text",
      text: "make it more colorful"
    });

    expect(resolved.templateId).toBe("template.memory-match");
    expect(resolved.assetEdit).toBeUndefined();
    expect(resolved.resolution.kind).toBe("builder-intent-resolution");
    expect(resolved.resolution.templateDecision.source).toBe("active-template");
    expect(resolved.resolution.assetDecision.source).toBe("none");
    expect(resolved.input.metadata.intentResolution).toMatchObject({
      kind: "builder-intent-resolution",
      selectedTemplateId: "template.memory-match"
    });
  });

  it("switches templates from catalog request aliases", () => {
    const resolved = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 1,
      source: "text",
      text: "Please group by color with fruit"
    });

    expect(resolved.templateId).toBe("template.sorting");
    expect(resolved.resolution.templateDecision).toMatchObject({
      source: "text-match",
      matchedRequestAliases: ["group by color"],
      matchedTemplateIds: ["template.sorting"]
    });
    expect(resolved.input.metadata.intentResolution).toMatchObject({
      templateDecision: {
        matchedRequestAliases: ["group by color"]
      }
    });
  });

  it("records explicit template and asset-edit decisions without text guessing", () => {
    const resolved = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      assetEdit: {
        theme: "ocean animals",
        items: ["dolphin", "turtle"]
      },
      sequence: 1,
      source: "text",
      templateId: "template.sequence-repeat",
      text: "make it playful"
    });

    expect(resolved.templateId).toBe("template.sequence-repeat");
    expect(resolved.resolution.templateDecision.source).toBe("explicit-template-id");
    expect(resolved.resolution.assetDecision.source).toBe("explicit-asset-edit");
    expect(resolved.resolution.assetEdit?.items).toEqual(["dolphin", "turtle"]);
  });

  it("exposes a CLI surface for catalog, transcript, and asset-edit requests", () => {
    const out: string[] = [];
    const err: string[] = [];
    const io = {
      stdout: (message: string) => out.push(message),
      stderr: (message: string) => err.push(message)
    };

    expect(runLocalServiceCli(["catalog", "--json"], io)).toBe(0);
    const catalog = JSON.parse(out.pop() ?? "{}") as {
      kind: string;
      templates: Array<{ id: string }>;
      tools: Array<{ actionName: string; argumentsSchema: { fields: Record<string, { required: boolean; type: string }> } }>;
    };
    expect(catalog.kind).toBe("builder-catalog");
    expect(catalog.tools.find((tool) => tool.actionName === "assemble-game")?.argumentsSchema.fields.templateId.required).toBe(true);
    expect(catalog.templates.map((template) => template.id)).toEqual([
      "template.memory-match",
      "template.sorting",
      "template.sequence-repeat"
    ]);

    expect(
      runLocalServiceCli([
        "assemble",
        "--text",
        "Memory game",
        "--source",
        "speech-transcript",
        "--asset-theme",
        "ocean animals",
        "--asset-item",
        "dolphin",
        "--asset-item",
        "turtle",
        "--json"
      ], io)
    ).toBe(0);
    const assembled = JSON.parse(out.pop() ?? "{}") as {
      events: Array<{ value: unknown }>;
      result: { profile?: { assetRequests: Array<{ prompt: string }>; components: Array<{ props: { cards?: string[] } }> } };
    };

    expect(JSON.stringify(assembled.events)).toContain("moonshine-streaming");
    expect(assembled.result.profile?.assetRequests[0]?.prompt).toContain("ocean animals memory card illustrations");
    expect(assembled.result.profile?.components[0]?.props.cards).toEqual(["dolphin-a", "dolphin-b", "turtle-a", "turtle-b"]);
    expect(err).toEqual([]);
  });

  it("lets agents submit the exact service request envelope through the CLI", () => {
    const out: string[] = [];
    const err: string[] = [];
    const request = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.cli-envelope",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.cli-envelope",
      source: "speech-transcript",
      text: "Memory game with dinosaurs"
    };

    expect(
      runLocalServiceCli(["request", "--request-json", JSON.stringify(request), "--json"], {
        stdout: (message) => out.push(message),
        stderr: (message) => err.push(message)
      })
    ).toBe(0);

    const response = JSON.parse(out.pop() ?? "{}") as BuilderServiceResponse;
    expect(response.kind).toBe("builder-service-response");
    expect(response.requestId).toBe("builder-service-request.test.cli-envelope");
    expect(response.execution?.result.sessionId).toBe("session.cli-envelope");
    expect(response.execution?.result.profile?.assetRequests[0]?.prompt).toContain("dinosaurs memory card illustrations");
    expect(JSON.stringify(response.execution?.events)).toContain("moonshine-streaming");
    expect(err).toEqual([]);
  });

  it("exposes a direct service request handler for adapters without a CLI process", () => {
    const response = handleLocalServiceRequest({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.direct",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.direct",
      text: "Memory game with ocean animals"
    });

    expect(response.execution?.result.sessionId).toBe("session.direct");
    expect(response.execution?.result.profile?.assetRequests[0]?.prompt).toContain("ocean animals memory card illustrations");
  });
});
