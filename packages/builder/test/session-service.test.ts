import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  BuilderCommandResultSchema,
  JsonValueSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderCommand
} from "@playcraft/contracts";
import {
  BUILDER_SESSION_POLICY,
  BuilderPreviewPayloadSchema,
  PlaycraftBuilderSessionService,
  createBuilderCommandHandler as createHandler
} from "../src/index.js";
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
    const defaultOutputs = handler.assembleTemplates(["template.memory-match"]);

    expect(outputs).toHaveLength(2);
    expect(outputs[0].result.profile?.id).toBe("profile.memory-match.mvp");
    expect(outputs[1].result.profile?.id).toBe("profile.sorting.mvp");
    expect(defaultOutputs[0]?.result.sessionId).toBe(BUILDER_SESSION_POLICY.defaultBatchSessionId);
    expect(handler.listTemplates()).toHaveLength(24);
    expect(handler.listTemplates().slice(0, 3).map((template) => template.id)).toEqual([
      "template.memory-match",
      "template.sorting",
      "template.sequence-repeat"
    ]);
  });

  it("publishes callable argument schemas for every builder tool", () => {
    const tools = createHandler().listTools();

    expect(tools.every((tool) => tool.argumentsSchema.schemaVersion === PLAYCRAFT_SCHEMA_VERSION)).toBe(true);
    expect(tools.map((tool) => [tool.actionName, tool.displayName])).toEqual([
      ["assemble-game", "Assemble Game"],
      ["update-game", "Update Game"],
      ["preview-action", "Preview Action"],
      ["list-builder-tools", "List Builder Tools"],
      ["get-session", "Get Session"],
      ["export-profile", "Export Profile"],
      ["import-profile", "Import Profile"]
    ]);
    expect(tools.find((tool) => tool.actionName === "assemble-game")?.acceptedInputSources).toEqual(["text", "moonshine-transcript"]);
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
      allowUnknown: false,
      fields: {
        action: {
          allowedValues: ["primary"],
          required: true,
          type: "string"
        }
      },
      type: "object",
      required: true
    });
    expect(tools.find((tool) => tool.actionName === "import-profile")?.argumentsSchema.fields.profile).toEqual({
      type: "object",
      required: true
    });
  });

  it("publishes builder-local CLI session policy for first-run commands", () => {
    expect(BUILDER_SESSION_POLICY).toEqual({
      defaultAssembleSessionId: "builder.cli",
      defaultBatchSessionId: "builder.batch",
      defaultCatalogSessionId: "builder.cli"
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

  it("uses catalog suggested items for known asset theme aliases", () => {
    const service = new PlaycraftBuilderSessionService();
    const edited = service.execute(command({ templateId: "template.memory-match", assetEdit: { theme: "ocean animals" } }));

    expect(cardsFor(edited.result.profile)).toEqual(["dolphin-1-a", "dolphin-1-b", "dolphin-2-a", "dolphin-2-b"]);
    expect(edited.result.profile?.assetRequests[0]?.prompt).toContain("ocean animals memory card illustrations");
    expect(edited.result.validation?.valid).toBe(true);
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

  it("rejects profile imports with unknown assembly contracts even when components match", () => {
    const source = new PlaycraftBuilderSessionService();
    const exported = source.execute(command({ templateId: "template.memory-match" })).result.profile;
    expect(exported).toBeDefined();
    const unknownAssemblyProfile = {
      ...exported!,
      id: "profile.custom-memory",
      assemblyRequestId: "request.custom-memory"
    };

    const target = new PlaycraftBuilderSessionService();

    expect(() => target.importProfile("session.unknown-assembly", unknownAssemblyProfile)).toThrow(/assembly request request\.custom-memory/u);
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
    expect(parsed).toHaveLength(24);
    expect(parsed.slice(0, 3).map((entry) => entry.result.profile?.id)).toEqual([
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

  it("prints a contract-shaped builder CLI catalog summary", () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = runBuilderCli(["catalog"], {
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message)
    });

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    expect(stdout).toEqual(expect.arrayContaining([
      "tools:",
      "- Assemble Game [tool:assemble-game -> assemble-game] args: assetEdit:object, input:object, sessionId:string, templateId*:string",
      "- Preview Action [tool:preview-action -> preview-action] args: interaction*:object, sessionId*:string",
      "templates:",
      "- Memory Match [template.memory-match] try: Memory game; aliases: memory, memory game, memory match"
    ]));
    expect(stdout).not.toContain(`${BUILDER_SESSION_POLICY.defaultCatalogSessionId}: preview`);
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

  it("requires explicit sessions for session-bound builder CLI commands", () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const io = {
      stdout: (message: string) => stdout.push(message),
      stderr: (message: string) => stderr.push(message)
    };

    expect(runBuilderCli(["update", "--template", "template.memory-match"], io)).toBe(1);
    expect(stderr.pop()).toMatch(/update requires --session/u);
    expect(runBuilderCli(["preview"], io)).toBe(1);
    expect(stderr.pop()).toMatch(/preview requires --session/u);
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
