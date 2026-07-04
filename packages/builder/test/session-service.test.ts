import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  BuilderCommandResultSchema,
  JsonValueSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderCommand
} from "@playcraft/contracts";
import { BuilderPreviewPayloadSchema, PlaycraftBuilderSessionService, createBuilderCommandHandler as createHandler } from "../src/index.js";
import { runBuilderCli } from "../src/cli.js";

const BuilderCliBatchOutputSchema = z.array(
  z
    .object({
      events: z.array(JsonValueSchema),
      result: BuilderCommandResultSchema
    })
    .strict()
);

function command(overrides: Partial<BuilderCommand>): BuilderCommand {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "builder-command.test",
    version: "1.0.0",
    kind: "builder-command",
    sessionId: "session.test",
    actionName: "assemble-game",
    templateId: "template.memory-match",
    ...overrides
  };
}

describe("builder session service", () => {
  it("assembles bundled templates through the shared command handler", () => {
    const handler = createHandler();
    const outputs = handler.assembleTemplates(["template.memory-match", "template.sorting"], "session.batch");

    expect(outputs).toHaveLength(2);
    expect(outputs[0].result.profile?.id).toBe("profile.memory-match.mvp");
    expect(outputs[1].result.profile?.id).toBe("profile.sorting.mvp");
    expect(handler.listTemplates().map((template) => template.id)).toEqual([
      "template.memory-match",
      "template.sorting",
      "template.sequence-repeat"
    ]);
  });

  it("publishes callable argument schemas for every builder tool", () => {
    const tools = createHandler().listTools();

    expect(tools.every((tool) => tool.argumentsSchema.schemaVersion === PLAYCRAFT_SCHEMA_VERSION)).toBe(true);
    expect(tools.find((tool) => tool.actionName === "assemble-game")?.acceptedInputSources).toEqual(["text", "speech-transcript"]);
    expect(tools.find((tool) => tool.actionName === "preview-action")?.acceptedInputSources).toEqual([]);
    expect(tools.find((tool) => tool.actionName === "export-profile")?.acceptedInputSources).toEqual([]);
    expect(tools.find((tool) => tool.actionName === "assemble-game")?.argumentsSchema.fields.templateId).toEqual({
      type: "string",
      required: true
    });
    expect(tools.find((tool) => tool.actionName === "update-game")?.argumentsSchema.fields.sessionId).toEqual({
      type: "string",
      required: true
    });
    expect(tools.find((tool) => tool.actionName === "preview-action")?.argumentsSchema.fields.interaction).toEqual({
      type: "object",
      required: false
    });
    expect(tools.find((tool) => tool.actionName === "import-profile")?.argumentsSchema.fields.profile).toEqual({
      type: "object",
      required: true
    });
  });

  it("emits validated lifecycle, state, activity, tool, custom, replay, and preview events for builds", () => {
    const service = new PlaycraftBuilderSessionService();
    const output = service.execute(command({ templateId: "template.memory-match" }));
    const types = output.events.map((event) => event.type);
    const customEvents = output.events.filter((event) => event.type === "Custom");
    const payloadTypes = customEvents.map((event) => (event.value as { payloadType: string }).payloadType);

    expect(types).toEqual(expect.arrayContaining(["RunStarted", "StepStarted", "StateSnapshot", "Activity", "ToolCall", "ToolResult", "Custom", "StepFinished", "RunFinished"]));
    expect(payloadTypes).toEqual(expect.arrayContaining(["profile.proposed", "profile.validated", "replay.ready", "preview.rendered"]));

    const previewEvent = customEvents.find((event) => (event.value as { payloadType: string }).payloadType === "preview.rendered");
    expect(previewEvent).toBeDefined();
    const previewPayload = BuilderPreviewPayloadSchema.parse((previewEvent?.value as { payload: unknown }).payload);
    expect(previewPayload.componentId).toBe("component.reveal-card-grid");
    expect(previewPayload.renderedComponentIds).toContain(previewPayload.componentId);
  });

  it("emits a state delta for profile updates", () => {
    const service = new PlaycraftBuilderSessionService();
    service.execute(command({ templateId: "template.memory-match" }));
    const output = service.execute(command({ actionName: "update-game", templateId: "template.sorting" }));

    expect(output.events.map((event) => event.type)).toEqual(expect.arrayContaining(["RunStarted", "StateDelta", "ToolCall", "ToolResult", "Custom", "RunFinished"]));
    expect(output.result.profile?.id).toBe("profile.sorting.mvp");
  });

  it("edits memory profile assets without switching the game recipe", () => {
    const service = new PlaycraftBuilderSessionService();
    const dinosaurs = service.execute(command({ templateId: "template.memory-match", assetEdit: { theme: "dinosaurs" } }));
    const toys = service.execute(command({ actionName: "update-game", templateId: "template.memory-match", assetEdit: { theme: "toys" } }));

    expect(dinosaurs.result.profile?.id).toBe("profile.memory-match.mvp");
    expect(toys.result.profile?.id).toBe("profile.memory-match.mvp");
    expect(cardsFor(dinosaurs.result.profile)).toEqual(["dinosaur-1-a", "dinosaur-1-b", "dinosaur-2-a", "dinosaur-2-b"]);
    expect(cardsFor(toys.result.profile)).toEqual(["toy-1-a", "toy-1-b", "toy-2-a", "toy-2-b"]);
    expect(pairsFor(toys.result.profile)).toEqual({
      "toy-1-a": "pair-1",
      "toy-1-b": "pair-1",
      "toy-2-a": "pair-2",
      "toy-2-b": "pair-2"
    });
    expect(dinosaurs.result.profile?.assetRequests[0]?.prompt).toContain("dinosaurs memory card illustrations");
    expect(toys.result.profile?.assetRequests[0]?.prompt).toContain("toys memory card illustrations");
    expect(dinosaurs.result.profile?.assets[0]?.assetId).not.toBe(toys.result.profile?.assets[0]?.assetId);
    expect(toys.result.profile?.components[0]?.assetBindings.illustration).toBe(toys.result.profile?.assets[0]?.assetId);
    expect(toys.result.validation?.valid).toBe(true);
  });

  it("keeps sorting targets in sync when asset edits rename items", () => {
    const service = new PlaycraftBuilderSessionService();
    const edited = service.execute(command({ templateId: "template.sorting", assetEdit: { theme: "toys" } }));
    const sortBins = edited.result.profile?.components.find((component) => component.renderCapability === "component:sort-bins");

    expect(sortBins?.props.items).toEqual(["red toy", "blue toy"]);
    expect(sortBins?.props.targets).toEqual({
      "red toy": "red",
      "blue toy": "blue"
    });
    expect(edited.result.validation?.valid).toBe(true);
  });

  it("keeps sequence rounds in sync when asset edits rename tokens", () => {
    const service = new PlaycraftBuilderSessionService();
    const edited = service.execute(command({ templateId: "template.sequence-repeat", assetEdit: { theme: "gems" } }));
    const sequencePad = edited.result.profile?.components.find((component) => component.renderCapability === "component:sequence-pad");

    expect(sequencePad?.props.sequence).toEqual(["gem-1", "gem-2", "gem-1"]);
    expect(sequencePad?.props.rounds).toEqual([
      ["gem-1", "gem-2", "gem-1"],
      ["gem-1", "gem-2", "gem-1", "gem-3"],
      ["gem-2", "gem-1", "gem-3", "gem-1", "gem-2"]
    ]);
    expect(edited.result.validation?.valid).toBe(true);
  });

  it("updates imported sequence profiles without regenerating authored rounds from the bundled template", () => {
    const source = new PlaycraftBuilderSessionService();
    const exported = source.execute(command({ templateId: "template.sequence-repeat" })).result.profile;
    expect(exported).toBeDefined();
    const custom = {
      ...exported!,
      id: "profile.custom-sequence",
      components: exported!.components.map((component) => {
        if (component.renderCapability === "component:sequence-pad") {
          return {
            ...component,
            props: {
              ...component.props,
              sequence: ["moon"],
              rounds: [["moon"], ["star", "moon"], ["moon", "star", "star"]]
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

    const target = new PlaycraftBuilderSessionService();
    target.importProfile("session.custom-sequence", custom);
    const edited = target.execute(command({
      actionName: "update-game",
      assetEdit: { theme: "gems" },
      sessionId: "session.custom-sequence",
      templateId: "template.sequence-repeat"
    }));
    const sequencePad = edited.result.profile?.components.find((component) => component.renderCapability === "component:sequence-pad");

    expect(edited.result.profile?.id).toBe("profile.custom-sequence");
    expect(sequencePad?.props.sequence).toEqual(["gem-1"]);
    expect(sequencePad?.props.rounds).toEqual([["gem-1"], ["gem-2", "gem-1"], ["gem-1", "gem-2", "gem-2"]]);
    expect(edited.result.validation?.valid).toBe(true);
  });

  it("supports real trusted preview interactions before and after an update", () => {
    const service = new PlaycraftBuilderSessionService();
    service.execute(command({ templateId: "template.memory-match" }));
    const before = service.execute(command({ actionName: "preview-action", interaction: { action: "primary" }, templateId: undefined }));
    service.execute(command({ actionName: "update-game", templateId: "template.sorting" }));
    const after = service.execute(command({ actionName: "preview-action", interaction: { action: "primary" }, templateId: undefined }));

    for (const output of [before, after]) {
      expect(output.events.map((event) => event.type)).toEqual(expect.arrayContaining(["ToolCall", "ToolResult", "StateDelta", "Custom"]));
      expect(output.result.preview.interactionCount).toBeGreaterThan(0);
      expect(output.result.preview.lastToolName).toMatch(/^tool:/u);
      expect(output.result.preview.lastToolPayload).toEqual(expect.objectContaining({ componentId: output.result.preview.activeComponentId }));
      expect(output.result.preview.renderedComponentIds).toContain(output.result.preview.activeComponentId);
    }

    expect(after.result.profile?.id).toBe("profile.sorting.mvp");
    expect(after.result.preview.interactionCount).toBe(2);
  });

  it("imports a validated profile into a previewable session", () => {
    const source = new PlaycraftBuilderSessionService();
    const exported = source.execute(command({ templateId: "template.sequence-repeat" })).result.profile;
    expect(exported).toBeDefined();

    const target = new PlaycraftBuilderSessionService();
    const imported = target.importProfile("session.imported", exported!);
    const preview = target.execute(command({
      actionName: "preview-action",
      id: "builder-command.test.preview-imported",
      interaction: { action: "primary" },
      sessionId: "session.imported",
      templateId: undefined
    }));
    const snapshot = target.getSessionSnapshot("session.imported");

    expect(imported.result.profile?.id).toBe("profile.sequence-repeat.mvp");
    expect(imported.events.map((event) => event.type)).toEqual(expect.arrayContaining(["RunStarted", "ToolCall", "StateSnapshot", "Custom", "RunFinished"]));
    expect(snapshot.activeTemplateId).toBe("template.sequence-repeat");
    expect(preview.result.preview.interactionCount).toBe(1);
    expect(preview.result.profile?.id).toBe("profile.sequence-repeat.mvp");
  });

  it("imports renamed profiles by assembly contract instead of bundled profile id", () => {
    const source = new PlaycraftBuilderSessionService();
    const exported = source.execute(command({ templateId: "template.memory-match" })).result.profile;
    expect(exported).toBeDefined();
    const renamed = {
      ...exported!,
      id: "profile.custom-memory",
      profileName: "Custom Memory"
    };

    const target = new PlaycraftBuilderSessionService();
    const imported = target.importProfile("session.renamed", renamed);
    const preview = target.execute(command({
      actionName: "preview-action",
      id: "builder-command.test.preview-renamed",
      interaction: { action: "primary" },
      sessionId: "session.renamed",
      templateId: undefined
    }));

    expect(imported.result.profile?.id).toBe("profile.custom-memory");
    expect(imported.result.preview.activeTemplateId).toBe("template.memory-match");
    expect(preview.result.preview.lastToolName).toBe("tool:reveal-card");
  });

  it("previews the first interactive component when visual components render first", () => {
    const source = new PlaycraftBuilderSessionService();
    const exported = source.execute(command({ templateId: "template.memory-match" })).result.profile;
    expect(exported).toBeDefined();
    const visualFirstProfile = {
      ...exported!,
      components: [...exported!.components].reverse()
    };

    const target = new PlaycraftBuilderSessionService();
    const imported = target.importProfile("session.visual-first", visualFirstProfile);
    const preview = target.execute(command({
      actionName: "preview-action",
      id: "builder-command.test.preview-visual-first",
      interaction: { action: "primary" },
      sessionId: "session.visual-first",
      templateId: undefined
    }));

    expect(imported.result.preview.activeComponentId).toBe("component.reveal-card-grid");
    expect(preview.result.preview.lastToolName).toBe("tool:reveal-card");
    expect(preview.result.preview.lastToolPayload).toEqual(expect.objectContaining({
      componentId: "component.reveal-card-grid"
    }));
    expect(preview.events.some((event) => event.type === "ToolCall" && JSON.stringify(event.value).includes("tool:preview-interaction"))).toBe(false);
  });

  it("keeps CLI batch output in parity with all registered templates", () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = runBuilderCli(["batch", "--json", "--session", "session.cli"], {
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message)
    });

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);

    const parsed = BuilderCliBatchOutputSchema.parse(JSON.parse(stdout.join("\n")));
    expect(parsed.map((entry) => entry.result.profile?.id)).toEqual([
      "profile.memory-match.mvp",
      "profile.sorting.mvp",
      "profile.sequence-repeat.mvp"
    ]);
  });

  it("validates builder CLI template IDs before command execution", () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = runBuilderCli(["assemble", "--template", "memory-match"], {
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message)
    });

    expect(exitCode).toBe(1);
    expect(stdout).toEqual([]);
    expect(stderr.join("\n")).toMatch(/builder template IDs must start with template/u);
  });

  it("rejects unknown builder CLI options and missing values", () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const io = {
      stdout: (message: string) => stdout.push(message),
      stderr: (message: string) => stderr.push(message)
    };

    expect(runBuilderCli(["catalog", "--provider", "remote"], io)).toBe(1);
    expect(stderr.pop()).toMatch(/unknown option: --provider/u);
    expect(runBuilderCli(["assemble", "--template"], io)).toBe(1);
    expect(stderr.pop()).toMatch(/--template requires a value/u);
    expect(stdout).toEqual([]);
  });
});

function cardsFor(profile: ReturnType<PlaycraftBuilderSessionService["execute"]>["result"]["profile"]): unknown {
  const revealGrid = profile?.components.find((component) => component.componentId === "component.reveal-card-grid");
  return revealGrid?.props.cards;
}

function pairsFor(profile: ReturnType<PlaycraftBuilderSessionService["execute"]>["result"]["profile"]): unknown {
  const revealGrid = profile?.components.find((component) => component.componentId === "component.reveal-card-grid");
  return revealGrid?.props.pairs;
}
