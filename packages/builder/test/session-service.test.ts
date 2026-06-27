import { describe, expect, it } from "vitest";
import { PLAYCRAFT_SCHEMA_VERSION, type BuilderCommand } from "@playcraft/contracts";
import { BuilderPreviewPayloadSchema, PlaycraftBuilderSessionService, createBuilderCommandHandler as createHandler } from "../src/index.js";
import { runBuilderCli } from "../src/cli.js";

function command(overrides: Partial<BuilderCommand>): BuilderCommand {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "builder-command.test",
    version: "1.0.0",
    kind: "builder-command",
    sessionId: "session.test",
    commandName: "build-profile",
    preset: "profile-a",
    ...overrides
  };
}

describe("builder session service", () => {
  it("builds Profile A and Profile B through the shared command handler", () => {
    const handler = createHandler();
    const outputs = handler.buildProfiles(["profile-a", "profile-b"], "session.batch");

    expect(outputs).toHaveLength(2);
    expect(outputs[0].result.profile?.id).toBe("profile.memory-match.mvp");
    expect(outputs[1].result.profile?.id).toBe("profile.sorting.mvp");
  });

  it("emits validated lifecycle, state, activity, tool, custom, replay, and preview events for builds", () => {
    const service = new PlaycraftBuilderSessionService();
    const output = service.execute(command({ preset: "profile-a" }));
    const types = output.events.map((event) => event.type);
    const customEvents = output.events.filter((event) => event.type === "Custom");
    const payloadTypes = customEvents.map((event) => (event.value as { payloadType: string }).payloadType);

    expect(types).toEqual(expect.arrayContaining(["RunStarted", "StepStarted", "StateSnapshot", "Activity", "ToolCall", "ToolResult", "Custom", "StepFinished", "RunFinished"]));
    expect(payloadTypes).toEqual(expect.arrayContaining(["profile.proposed", "profile.validated", "replay.ready", "preview.rendered"]));

    const previewEvent = customEvents.find((event) => (event.value as { payloadType: string }).payloadType === "preview.rendered");
    expect(previewEvent).toBeDefined();
    expect(() => BuilderPreviewPayloadSchema.parse((previewEvent?.value as { payload: unknown }).payload)).not.toThrow();
  });

  it("emits a state delta for profile updates", () => {
    const service = new PlaycraftBuilderSessionService();
    service.execute(command({ preset: "profile-a" }));
    const output = service.execute(command({ commandName: "update-profile", preset: "profile-b" }));

    expect(output.events.map((event) => event.type)).toEqual(expect.arrayContaining(["RunStarted", "StateDelta", "ToolCall", "ToolResult", "Custom", "RunFinished"]));
    expect(output.result.profile?.id).toBe("profile.sorting.mvp");
  });

  it("edits memory profile assets without switching the game recipe", () => {
    const service = new PlaycraftBuilderSessionService();
    const dinosaurs = service.execute(command({ preset: "profile-a", assetEdit: { theme: "dinosaurs" } }));
    const toys = service.execute(command({ commandName: "update-profile", preset: "profile-a", assetEdit: { theme: "toys" } }));

    expect(dinosaurs.result.profile?.id).toBe("profile.memory-match.mvp");
    expect(toys.result.profile?.id).toBe("profile.memory-match.mvp");
    expect(cardsFor(dinosaurs.result.profile)).toEqual(["dinosaur-1-a", "dinosaur-1-b", "dinosaur-2-a", "dinosaur-2-b"]);
    expect(cardsFor(toys.result.profile)).toEqual(["toy-1-a", "toy-1-b", "toy-2-a", "toy-2-b"]);
    expect(dinosaurs.result.profile?.assetRequests[0]?.prompt).toContain("dinosaurs memory card illustrations");
    expect(toys.result.profile?.assetRequests[0]?.prompt).toContain("toys memory card illustrations");
    expect(dinosaurs.result.profile?.assets[0]?.assetId).not.toBe(toys.result.profile?.assets[0]?.assetId);
    expect(toys.result.profile?.components[0]?.assetBindings.illustration).toBe(toys.result.profile?.assets[0]?.assetId);
    expect(toys.result.validation?.valid).toBe(true);
  });

  it("supports real trusted preview interactions before and after an update", () => {
    const service = new PlaycraftBuilderSessionService();
    service.execute(command({ preset: "profile-a" }));
    const before = service.execute(command({ commandName: "preview-action", interaction: { action: "primary" }, preset: undefined }));
    service.execute(command({ commandName: "update-profile", preset: "profile-b" }));
    const after = service.execute(command({ commandName: "preview-action", interaction: { action: "primary" }, preset: undefined }));

    for (const output of [before, after]) {
      expect(output.events.map((event) => event.type)).toEqual(expect.arrayContaining(["ToolCall", "ToolResult", "StateDelta", "Custom"]));
      expect(output.result.preview.interactionCount).toBeGreaterThan(0);
      expect(output.result.preview.lastToolName).toMatch(/^tool:/u);
      expect(output.result.preview.lastToolPayload).toEqual(expect.objectContaining({ componentId: expect.any(String) }));
    }

    expect(after.result.profile?.id).toBe("profile.sorting.mvp");
    expect(after.result.preview.interactionCount).toBe(2);
  });

  it("keeps CLI batch output in parity with the shared command handler", () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = runBuilderCli(["batch", "--json", "--session", "session.cli"], {
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message)
    });

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);

    const parsed = JSON.parse(stdout.join("\n")) as Array<{ result: { profile?: { id: string } } }>;
    expect(parsed.map((entry) => entry.result.profile?.id)).toEqual(["profile.memory-match.mvp", "profile.sorting.mvp"]);
  });
});

function cardsFor(profile: ReturnType<PlaycraftBuilderSessionService["execute"]>["result"]["profile"]): unknown {
  const revealGrid = profile?.components.find((component) => component.componentId === "component.reveal-card-grid");
  return revealGrid?.props.cards;
}
