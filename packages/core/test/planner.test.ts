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
    id: "recipe.shared",
    version: "1.0.0",
    capabilityTags: ["mechanic:match-pairs"],
    build: () => {
      throw new Error("test should not build profiles");
    }
  },
  {
    id: "recipe.specific",
    version: "1.0.0",
    capabilityTags: ["game:shape-memory", "mechanic:match-pairs"],
    build: () => {
      throw new Error("test should not build profiles");
    }
  },
  {
    id: "recipe.tie",
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
    expect(planner.selectRecipe(request(["game:shape-memory", "mechanic:match-pairs"])).id).toBe("recipe.specific");
  });

  it("rejects equal-score recipe matches instead of using recipe order", () => {
    expect(() => planner.selectRecipe(request(["mechanic:match-pairs"]))).toThrow(
      /ambiguous deterministic recipes matched requested capabilities: recipe.shared, recipe.specific, recipe.tie/u
    );
  });
});
