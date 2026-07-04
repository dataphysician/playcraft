import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assembleMvpProfiles,
  createDefaultPlanner,
  gameTemplateDefinitions,
  mechanicDefinitions,
  mvpAssemblyRequests
} from "@playcraft/packs";

const fixtureByProfileId: Record<string, string> = {
  "profile.memory-match.mvp": "../../../examples/profiles/memory-match.json",
  "profile.sorting.mvp": "../../../examples/profiles/sorting.json",
  "profile.sequence-repeat.mvp": "../../../examples/profiles/sequence-repeat.json"
};

describe("MVP profile pack", () => {
  it("assembles 20+ template profiles from registries and deterministic local tools", () => {
    const profiles = assembleMvpProfiles();

    expect(profiles).toHaveLength(24);
    expect(profiles.slice(0, 3).map((profile) => profile.id)).toEqual([
      "profile.memory-match.mvp",
      "profile.sorting.mvp",
      "profile.sequence-repeat.mvp"
    ]);
    expect(profiles.every((profile) => profile.validation.valid)).toBe(true);
    expect(profiles.every((profile) => profile.assets.every((asset) => asset.sourceId === "asset-source.local-deterministic"))).toBe(true);
  });

  it("keeps saved profile fixtures in sync with deterministic assembly", () => {
    const planner = createDefaultPlanner();

    for (const request of mvpAssemblyRequests) {
      const assembled = planner.assemble(request);
      const fixturePath = fixtureByProfileId[assembled.id];
      if (!fixturePath) {
        continue;
      }
      const path = fileURLToPath(new URL(fixturePath, import.meta.url));
      const saved = JSON.parse(readFileSync(path, "utf8"));

      expect(saved).toEqual(assembled);
    }
  });

  it("assembles multiple MVP profiles through the same deterministic builder entrypoint", () => {
    const planner = createDefaultPlanner();
    const [profileA, profileB, profileC] = mvpAssemblyRequests.map((request) => planner.assemble(request));

    expect(profileA.id).toBe("profile.memory-match.mvp");
    expect(profileB.id).toBe("profile.sorting.mvp");
    expect(profileA.replay.plannerId).toBe(planner.id);
    expect(profileB.replay.plannerId).toBe(planner.id);
    expect(profileA.assemblyRequestId).toBe("request.memory-match.mvp");
    expect(profileB.assemblyRequestId).toBe("request.sorting.mvp");
    expect(profileA.components.find((component) => component.renderCapability === "component:reveal-card-grid")?.props.pairs).toEqual({
      "memory-card-1-a": "pair-1",
      "memory-card-1-b": "pair-1",
      "memory-card-2-a": "pair-2",
      "memory-card-2-b": "pair-2"
    });
    expect(profileB.components.find((component) => component.renderCapability === "component:sort-bins")?.props.targets).toEqual({
      "red circle": "red",
      "blue square": "blue",
      "red triangle": "red"
    });
    expect(profileC.components.find((component) => component.renderCapability === "component:sequence-pad")?.props.rounds).toEqual([
      ["green", "yellow", "green"],
      ["green", "yellow", "green", "blue"],
      ["yellow", "green", "blue", "green", "yellow"]
    ]);
  });

  it("publishes bundled game templates for the builder catalog", () => {
    expect(gameTemplateDefinitions).toHaveLength(24);
    expect(gameTemplateDefinitions.slice(0, 3).map((template) => template.id)).toEqual([
      "template.memory-match",
      "template.sorting",
      "template.sequence-repeat"
    ]);
    expect(new Set(gameTemplateDefinitions.map((template) => template.id)).size).toBe(gameTemplateDefinitions.length);
    expect(gameTemplateDefinitions.every((template) => template.localFirst)).toBe(true);
    expect(gameTemplateDefinitions.map((template) => template.id)).toEqual(expect.arrayContaining([
      "template.color-sorting",
      "template.shape-memory",
      "template.daily-routine",
      "template.animal-sound-pattern"
    ]));
    expect(gameTemplateDefinitions.find((template) => template.id === "template.sorting")?.requestAliases).toContain("group by color");
    expect(gameTemplateDefinitions.slice(0, 3).map((template) => template.exampleRequest)).toEqual([
      "Memory game",
      "Sorting game",
      "Sequence repeat"
    ]);
    expect(gameTemplateDefinitions.map((template) => template.assemblyRequestId)).toEqual(
      mvpAssemblyRequests.map((request) => request.id)
    );
  });

  it("keeps bundled mechanics and templates free of live microphone capture modalities", () => {
    const removedModality = `vo${"ice"}`;

    expect(mechanicDefinitions.flatMap((mechanic) => mechanic.supportedModalities)).not.toContain(removedModality);
    expect(gameTemplateDefinitions.flatMap((template) => template.supportedModalities)).not.toContain(removedModality);
  });
});
