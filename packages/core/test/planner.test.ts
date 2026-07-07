import { describe, expect, it } from "vitest";
import {
  createEmptyRegistries,
  DeterministicAssemblyPlanner,
  type AssetRecordGenerator,
  type AssemblyRecipe,
  type PlaycraftAssemblyRequest
} from "../src/index.js";

const recipes: AssemblyRecipe[] = [
  {
    id: "recipe.bundled.shared",
    version: "1.0.0",
    capabilityTags: ["mechanic:match-pairs"],
    build: () => {
      throw new Error("test should not build profiles");
    }
  },
  {
    id: "recipe.bundled.specific",
    version: "1.0.0",
    capabilityTags: ["game:shape-memory", "mechanic:match-pairs"],
    build: () => {
      throw new Error("test should not build profiles");
    }
  },
  {
    id: "recipe.bundled.tie",
    version: "1.0.0",
    capabilityTags: ["game:other-memory", "mechanic:match-pairs"],
    build: () => {
      throw new Error("test should not build profiles");
    }
  }
];

const planner = new DeterministicAssemblyPlanner({
  id: "planner.test",
  version: "1.0.0",
  recipes,
  registries: createEmptyRegistries(),
  assetSource: {} as AssetRecordGenerator
});

function request(capabilities: string[]): PlaycraftAssemblyRequest {
  return {
    intent: {
      requestedCapabilities: capabilities
    }
  } as PlaycraftAssemblyRequest;
}

describe("deterministic assembly planner", () => {
  it("selects a unique strongest capability match", () => {
    expect(planner.selectRecipe(request(["game:shape-memory", "mechanic:match-pairs"])).id).toBe("recipe.bundled.specific");
  });

  it("rejects equal-score recipe matches instead of using recipe order", () => {
    expect(() => planner.selectRecipe(request(["mechanic:match-pairs"]))).toThrow(
      /ambiguous deterministic recipes matched requested capabilities: recipe\.bundled\.shared, recipe\.bundled\.specific, recipe\.bundled\.tie/u
    );
  });
});

describe("DeterministicAssemblyPlanner.registerRecipe", () => {
  const emptyRegistries = createEmptyRegistries();
  const emptyAssetSource = {} as AssetRecordGenerator;

  function llmAuthoredRecipe(overrides: Partial<AssemblyRecipe> = {}): AssemblyRecipe {
    return {
      id: "recipe.local-authored.fixture-shape-sorting",
      version: "1.0.0",
      capabilityTags: ["game:shape-sorting-fixture", "mechanic:sort-into-bins"],
      build: () => {
        throw new Error("test should not build profiles");
      },
      ...overrides
    };
  }

  it("accepts a recipe in the recipe.local-authored.* namespace and lets it win planner selection", () => {
    const localPlanner = new DeterministicAssemblyPlanner({
      id: "planner.local-authored",
      version: "1.0.0",
      recipes: [],
      registries: emptyRegistries,
      assetSource: emptyAssetSource
    });
    localPlanner.registerRecipe(llmAuthoredRecipe());

    const selected = localPlanner.selectRecipe(request(["game:shape-sorting-fixture", "mechanic:sort-into-bins"]));
    expect(selected.id).toBe("recipe.local-authored.fixture-shape-sorting");
  });

  it("accepts a recipe in the recipe.remote-agent.* namespace", () => {
    const remotePlanner = new DeterministicAssemblyPlanner({
      id: "planner.remote-agent",
      version: "1.0.0",
      recipes: [],
      registries: emptyRegistries,
      assetSource: emptyAssetSource
    });
    const remoteRecipe: AssemblyRecipe = {
      id: "recipe.remote-agent.fixture-typo-spelling",
      version: "1.0.0",
      capabilityTags: ["game:typo-spelling-fixture"],
      build: () => {
        throw new Error("test should not build profiles");
      }
    };
    remotePlanner.registerRecipe(remoteRecipe);
    const selected = remotePlanner.selectRecipe(request(["game:typo-spelling-fixture"]));
    expect(selected.id).toBe("recipe.remote-agent.fixture-typo-spelling");
  });

  it("dedupes by recipe id when the same recipe is registered twice", () => {
    const dedupePlanner = new DeterministicAssemblyPlanner({
      id: "planner.dedupe",
      version: "1.0.0",
      recipes: [],
      registries: emptyRegistries,
      assetSource: emptyAssetSource
    });
    dedupePlanner.registerRecipe(llmAuthoredRecipe());
    expect(() => dedupePlanner.registerRecipe(llmAuthoredRecipe())).toThrow(
      /recipe recipe\.local-authored\.fixture-shape-sorting is already registered/u
    );
  });

  it("rejects a recipe whose id is not in any declared namespace", () => {
    const strictPlanner = new DeterministicAssemblyPlanner({
      id: "planner.strict",
      version: "1.0.0",
      recipes: [],
      registries: emptyRegistries,
      assetSource: emptyAssetSource
    });
    expect(() =>
      strictPlanner.registerRecipe(llmAuthoredRecipe({ id: "template.custom.bypass" }))
    ).toThrow(/recipe id template\.custom\.bypass must start with one of: recipe\.bundled\., recipe\.local-authored\., recipe\.remote-agent\./u);
  });

  it("rejects a recipe with an empty capabilityTags array", () => {
    const strictPlanner = new DeterministicAssemblyPlanner({
      id: "planner.strict-2",
      version: "1.0.0",
      recipes: [],
      registries: emptyRegistries,
      assetSource: emptyAssetSource
    });
    expect(() =>
      strictPlanner.registerRecipe(llmAuthoredRecipe({ capabilityTags: [] }))
    ).toThrow(/recipe recipe\.local-authored\.fixture-shape-sorting must declare a non-empty capabilityTags array/u);
  });

  it("returns the planner itself so registration chains", () => {
    const chainPlanner = new DeterministicAssemblyPlanner({
      id: "planner.chain",
      version: "1.0.0",
      recipes: [],
      registries: emptyRegistries,
      assetSource: emptyAssetSource
    });
    const returned = chainPlanner
      .registerRecipe(llmAuthoredRecipe({ id: "recipe.local-authored.chain-a" }))
      .registerRecipe(llmAuthoredRecipe({ id: "recipe.local-authored.chain-b" }));
    expect(returned).toBe(chainPlanner);
  });
});
