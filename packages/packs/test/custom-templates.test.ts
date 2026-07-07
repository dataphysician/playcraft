import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BuilderTemplateNamespaceSchema,
  GameAssemblyProfileSchema,
  type GameAssemblyProfile,
  type PlaycraftAssemblyRequest
} from "@playcraft/contracts";
import { replayProfile } from "@playcraft/core";
import {
  createDefaultPlanner,
  createDefaultRegistries,
  customAssemblyRequests,
  customGameTemplateDefinitions,
  customTemplateRecipes,
  DEFAULT_PLANNER_ID
} from "@playcraft/packs";

const customFixturePaths = [
  "../../../examples/profiles/custom-toy-memory.json",
  "../../../examples/profiles/custom-dolphin-sorting.json",
  "../../../examples/profiles/custom-fruit-sequence.json"
] as const;

function loadFixture(relativePath: string): GameAssemblyProfile {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  return GameAssemblyProfileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

describe("custom template recipes", () => {
  it("exports three custom template recipes under the recipe.bundled.* namespace, paired 1-to-1 with template.custom.* template definitions", () => {
    expect(customTemplateRecipes).toHaveLength(3);
    expect(customTemplateRecipes.map((recipe) => recipe.id)).toEqual([
      "recipe.bundled.toy-memory",
      "recipe.bundled.dolphin-sorting",
      "recipe.bundled.fruit-sequence"
    ]);
    for (const recipe of customTemplateRecipes) {
      expect(recipe.id.startsWith("recipe.bundled.")).toBe(true);
      expect(() => BuilderTemplateNamespaceSchema.parse(recipe.id.replace(/^recipe\.bundled\./u, "template.custom."))).not.toThrow();
    }
  });

  it("exports matching assembly requests and game template definitions for each custom recipe", () => {
    expect(customAssemblyRequests).toHaveLength(3);
    expect(customGameTemplateDefinitions).toHaveLength(3);
    expect(customAssemblyRequests.map((request) => request.id)).toEqual([
      "request.toy-memory.custom",
      "request.dolphin-sorting.custom",
      "request.fruit-sequence.custom"
    ]);
    expect(customGameTemplateDefinitions.map((definition) => definition.id)).toEqual([
      "template.custom.toy-memory",
      "template.custom.dolphin-sorting",
      "template.custom.fruit-sequence"
    ]);
    for (const request of customAssemblyRequests) {
      expect(request.intent.requestedCapabilities.some((capability) => capability.startsWith("game:custom-"))).toBe(true);
      expect(request.deterministicSeed).toMatch(/^seed-custom-/u);
    }
  });

  it.each(customFixturePaths)("assembles %s and returns a valid profile with template.custom.* ids", (relativePath) => {
    const expected = loadFixture(relativePath);
    const planner = createDefaultPlanner();
    const request: PlaycraftAssemblyRequest = {
      ...customAssemblyRequests.find((candidate) => candidate.id === `request.${expected.template.id.slice("template.custom.".length)}.custom`)!,
      id: expected.assemblyRequestId
    };

    const assembled = planner.assemble(request);

    expect(assembled.id).toBe(expected.id);
    expect(assembled.assemblyRequestId).toBe(expected.assemblyRequestId);
    expect(assembled.template.id).toBe(expected.template.id);
    expect(assembled.template.id.startsWith("template.custom.")).toBe(true);
    expect(assembled.template.assemblyRequestId).toBe(expected.assemblyRequestId);
    expect(assembled.template.liveSurface.kind).toBe(expected.template.liveSurface.kind);
    expect(assembled.template.liveSurface.componentCapabilities).toEqual(expected.template.liveSurface.componentCapabilities);
    expect(assembled.validation.valid).toBe(true);
    expect(assembled.replay.plannerId).toBe(DEFAULT_PLANNER_ID);
  });

  it.each(customFixturePaths)("round-trips %s via JSON export + replayProfile with id, liveSurface, and assemblyRequestId preserved", (relativePath) => {
    const original = loadFixture(relativePath);
    const serialized = JSON.parse(JSON.stringify(original)) as unknown;

    const replayed = replayProfile(serialized, createDefaultRegistries());

    expect(replayed.profile.id).toBe(original.id);
    expect(replayed.profile.assemblyRequestId).toBe(original.assemblyRequestId);
    expect(replayed.profile.template.id).toBe(original.template.id);
    expect(replayed.profile.template.id.startsWith("template.custom.")).toBe(true);
    expect(replayed.profile.template.liveSurface.kind).toBe(original.template.liveSurface.kind);
    expect(replayed.profile.template.liveSurface.componentCapabilities).toEqual(original.template.liveSurface.componentCapabilities);
    expect(replayed.profile.template.assemblyRequestId).toBe(original.assemblyRequestId);
    expect(replayed.validation.valid).toBe(true);
  });

  it.each(customFixturePaths)("parses saved %s against GameAssemblyProfileSchema", (relativePath) => {
    const path = fileURLToPath(new URL(relativePath, import.meta.url));
    const raw = JSON.parse(readFileSync(path, "utf8"));

    expect(() => GameAssemblyProfileSchema.parse(raw)).not.toThrow();
  });

  it("registers custom recipes alongside MVP recipes in the default planner without ambiguity", () => {
    const planner = createDefaultPlanner();

    for (const request of customAssemblyRequests) {
      const profile = planner.assemble(request);
      expect(profile.template.id.startsWith("template.custom.")).toBe(true);
      expect(profile.id).toMatch(/^profile\.custom\./u);
    }
  });
});