import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assembleMvpProfiles,
  componentManifests,
  createDefaultPlanner,
  DEFAULT_GAME_TEMPLATE_ID,
  gameTemplateDefinitions,
  mechanicDefinitions,
  packManifests,
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
    expect(profiles.every((profile) => profile.template?.assemblyRequestId === profile.assemblyRequestId)).toBe(true);
    expect(profiles.slice(0, 3).map((profile) => profile.template?.id)).toEqual([
      "template.memory-match",
      "template.sorting",
      "template.sequence-repeat"
    ]);
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
    expect(profileA.mechanics.map((binding) => binding.eventBindings)).toEqual([
      { primary: "frontend:revealed" },
      { primary: "rule:pair-matched" },
      { primary: "frontend:celebrated" }
    ]);
    expect(profileB.mechanics.map((binding) => binding.eventBindings)).toEqual([
      { primary: "frontend:selected" },
      { primary: "rule:item-sorted" },
      { primary: "rule:retry-ready" },
      { primary: "frontend:hint-shown" }
    ]);
    expect(profileC.mechanics.map((binding) => binding.eventBindings)).toEqual([
      { primary: "rule:sequence-progressed" },
      { primary: "frontend:selected" },
      { primary: "frontend:celebrated" }
    ]);
    expect(profileA.components.map((component) => component.renderMechanicBindingId)).toEqual([
      "profile.memory-match.mvp.mechanic.1",
      "profile.memory-match.mvp.mechanic.3"
    ]);
    expect(profileA.components.map((component) => component.mechanicBindingIds)).toEqual([
      ["profile.memory-match.mvp.mechanic.1", "profile.memory-match.mvp.mechanic.2"],
      ["profile.memory-match.mvp.mechanic.3"]
    ]);
    expect(profileB.components.map((component) => component.renderMechanicBindingId)).toEqual([
      "profile.sorting.mvp.mechanic.1",
      "profile.sorting.mvp.mechanic.2",
      "profile.sorting.mvp.mechanic.4"
    ]);
    expect(profileB.components.map((component) => component.mechanicBindingIds)).toEqual([
      ["profile.sorting.mvp.mechanic.1"],
      ["profile.sorting.mvp.mechanic.2"],
      ["profile.sorting.mvp.mechanic.4"]
    ]);
    expect(profileC.components.map((component) => component.renderMechanicBindingId)).toEqual([
      "profile.sequence-repeat.mvp.mechanic.1",
      "profile.sequence-repeat.mvp.mechanic.2",
      "profile.sequence-repeat.mvp.mechanic.3"
    ]);
    expect(profileC.components.map((component) => component.mechanicBindingIds)).toEqual([
      ["profile.sequence-repeat.mvp.mechanic.1", "profile.sequence-repeat.mvp.mechanic.2"],
      ["profile.sequence-repeat.mvp.mechanic.2"],
      ["profile.sequence-repeat.mvp.mechanic.3"]
    ]);
    expect(profileA.components.find((component) => component.renderCapability === "component:reveal-card-grid")?.assetBindings.illustration).toBe(
      profileA.assets.find((asset) => asset.requestId === "asset-request.profile.memory-match.mvp")?.assetId
    );
    expect(profileB.components.find((component) => component.renderCapability === "component:sort-bins")?.assetBindings.illustration).toBe(
      profileB.assets.find((asset) => asset.requestId === "asset-request.profile.sorting.mvp")?.assetId
    );
    expect(profileC.components.find((component) => component.renderCapability === "component:sequence-pad")?.assetBindings.illustration).toBe(
      profileC.assets.find((asset) => asset.requestId === "asset-request.profile.sequence-repeat.mvp")?.assetId
    );
  });

  it("publishes bundled game templates for the builder catalog", () => {
    expect(gameTemplateDefinitions).toHaveLength(24);
    expect(DEFAULT_GAME_TEMPLATE_ID).toBe("template.memory-match");
    expect(gameTemplateDefinitions[0]?.id).toBe(DEFAULT_GAME_TEMPLATE_ID);
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
    expect(gameTemplateDefinitions.slice(0, 5).map((template) => template.displayLabel)).toEqual([
      "Memory Match",
      "Sorting",
      "Sequence Repeat",
      "Shape Memory",
      "Color Memory"
    ]);
    expect(gameTemplateDefinitions.slice(0, 3).map((template) => template.assetPromptKind)).toEqual([
      "memory-cards",
      "sorting-game",
      "sequence-buttons"
    ]);
    expect(gameTemplateDefinitions.slice(0, 3).map((template) => template.assetEditOperations.map((entry) => entry.operation))).toEqual([
      ["memory-pairs", "completion-message"],
      ["choice-items", "sorting-items", "hint-message"],
      ["sequence-items", "choice-items", "completion-message"]
    ]);
    expect(gameTemplateDefinitions.slice(0, 3).map((template) => template.liveSurface.kind)).toEqual([
      "memory",
      "sorting",
      "sequence"
    ]);
    expect(gameTemplateDefinitions.slice(0, 3).map((template) => template.liveSurface.componentCapabilities.primary)).toEqual([
      "component:reveal-card-grid",
      "component:sort-bins",
      "component:sequence-pad"
    ]);
    expect(gameTemplateDefinitions.find((template) => template.id === "template.sequence-repeat")?.liveSurface.componentCapabilities.choice).toBe(
      "component:choice-grid"
    );
    expect(gameTemplateDefinitions.slice(0, 3).map((template) => template.liveSurface.assetReplacementSources.map((source) => source.namespace))).toEqual([
      ["card"],
      ["item"],
      ["choice", "choice"]
    ]);
    expect(gameTemplateDefinitions.find((template) => template.id === "template.memory-match")?.liveSurface.assetReplacementSources[0]).toMatchObject({
      componentRole: "primary",
      prop: "cards",
      pairMapProp: "pairs"
    });
    expect(gameTemplateDefinitions.find((template) => template.id === "template.memory-match")?.liveSurface.tokenStyles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tokens: ["pair-1"], background: "#fee2e2", accent: "#fecaca" }),
        expect.objectContaining({ tokens: ["pair-2"], background: "#dbeafe", accent: "#bfdbfe" })
      ])
    );
    expect(gameTemplateDefinitions.find((template) => template.id === "template.memory-match")?.liveSurface.defaultTokenStyle).toEqual(
      expect.objectContaining({ tokens: ["default"], background: "#fce7f3", accent: "#fbcfe8" })
    );
    expect(gameTemplateDefinitions.find((template) => template.id === "template.sorting")?.liveSurface.tokenStyles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tokens: ["red"], background: "#fee2e2" }),
        expect.objectContaining({ tokens: ["blue"], background: "#dbeafe" })
      ])
    );
    expect(gameTemplateDefinitions.find((template) => template.id === "template.sorting")?.liveSurface.defaultTokenStyle).toEqual(
      expect.objectContaining({ tokens: ["default"], background: "#ede9fe", accent: "#ddd6fe" })
    );
    expect(gameTemplateDefinitions.find((template) => template.id === "template.sequence-repeat")?.liveSurface.tokenStyles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tokens: ["green"], background: "#dcfce7" }),
        expect.objectContaining({ tokens: ["yellow"], background: "#fef3c7" })
      ])
    );
    expect(gameTemplateDefinitions.find((template) => template.id === "template.sequence-repeat")?.liveSurface.defaultTokenStyle).toEqual(
      expect.objectContaining({ tokens: ["default"], background: "#ede9fe", accent: "#ddd6fe" })
    );
    expect(gameTemplateDefinitions.map((template) => template.assemblyRequestId)).toEqual(
      mvpAssemblyRequests.map((request) => request.id)
    );
    expect(gameTemplateDefinitions.find((template) => template.id === "template.memory-match")?.requestAliasSummary).toBe("memory, memory game, memory match");
    expect(gameTemplateDefinitions.find((template) => template.id === "template.sorting")?.requestAliasSummary).toBe("sort, sorting, sorting game");
    expect(gameTemplateDefinitions.find((template) => template.id === "template.shape-memory")?.requestAliasSummary).toBe(
      "shape memory, shape match cards, matching shapes"
    );
    expect(gameTemplateDefinitions.find((template) => template.id === "template.color-sorting")?.requestAliasSummary).toBe(
      "color sorting, sort by color, put colors in bins"
    );
  });

  it("keeps memory template card counts authored by pair items instead of truncating to two pairs", () => {
    const profile = createDefaultPlanner().assemble(
      mvpAssemblyRequests.find((request) => request.id === "request.number-memory.mvp")!
    );
    const revealGrid = profile.components.find((component) => component.renderCapability === "component:reveal-card-grid");

    expect(revealGrid?.props.cards).toEqual([
      "number-1-a",
      "number-1-b",
      "number-2-a",
      "number-2-b",
      "number-3-a",
      "number-3-b"
    ]);
    expect(revealGrid?.props.pairs).toMatchObject({
      "number-1-a": "pair-1",
      "number-1-b": "pair-1",
      "number-2-a": "pair-2",
      "number-2-b": "pair-2",
      "number-3-a": "pair-3",
      "number-3-b": "pair-3"
    });
  });

  it("keeps bundled mechanics and templates free of runtime audio capture modalities", () => {
    const removedModality = `vo${"ice"}`;

    expect(mechanicDefinitions.map((mechanic) => mechanic.id)).not.toContain("mechanic.sound-matching");
    expect(mechanicDefinitions.flatMap((mechanic) => mechanic.supportedModalities)).not.toContain("audio");
    expect(mechanicDefinitions.flatMap((mechanic) => mechanic.supportedModalities)).not.toContain(removedModality);
    expect(gameTemplateDefinitions.flatMap((template) => template.supportedModalities)).not.toContain("audio");
    expect(gameTemplateDefinitions.flatMap((template) => template.supportedModalities)).not.toContain(removedModality);
  });

  it("keeps trusted component interaction tools single-emitter", () => {
    const emittingComponents = componentManifests.filter((manifest) => manifest.emittedTools.length > 0);

    expect(emittingComponents).toHaveLength(6);
    expect(emittingComponents.every((manifest) => manifest.emittedTools.length === 1)).toBe(true);
    expect(emittingComponents.map((manifest) => {
      const [tool] = manifest.emittedTools;
      return tool.toolName;
    })).toEqual([
      "tool:select-item",
      "tool:reveal-card",
      "tool:select-item",
      "tool:move-item",
      "tool:repeat-sequence",
      "tool:move-item"
    ]);
  });

  it("keeps pack manifest capabilities complete instead of truncating advertised tags", () => {
    const mechanicsPack = packManifests.find((manifest) => manifest.id === "pack.mechanics.mvp");
    const expectedMechanicCapabilities = [...new Set(mechanicDefinitions.flatMap((definition) => definition.capabilityTags))];

    expect(expectedMechanicCapabilities.length).toBeGreaterThan(12);
    expect(mechanicsPack?.providedCapabilities).toEqual(expectedMechanicCapabilities);
  });
});
