import { describe, expect, it } from "vitest";
import {
  PLAYCRAFT_SERVICE_PACKAGE,
  createLocalPlaycraftService,
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
    expect(catalog.templates.map((template) => template.id)).toEqual([
      "template.memory-match",
      "template.sorting",
      "template.sequence-repeat"
    ]);
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
  });

  it("exposes a CLI surface for catalog, transcript, and asset-edit requests", () => {
    const out: string[] = [];
    const err: string[] = [];
    const io = {
      stdout: (message: string) => out.push(message),
      stderr: (message: string) => err.push(message)
    };

    expect(runLocalServiceCli(["catalog", "--json"], io)).toBe(0);
    const catalog = JSON.parse(out.pop() ?? "{}") as { kind: string; templates: Array<{ id: string }> };
    expect(catalog.kind).toBe("builder-catalog");
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
});
