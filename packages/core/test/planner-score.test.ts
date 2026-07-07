import { describe, expect, it } from "vitest";
import {
  DEFAULT_RECIPE_SCORE,
  evaluateRecipeScore,
  type RecipeScoreExpr
} from "../src/planner-score.js";

function requested(capabilities: string[]): ReadonlySet<string> {
  return new Set(capabilities);
}

describe("recipe score AST", () => {
  it("uses intersection-count as the default rule for parity with the original planner", () => {
    expect(DEFAULT_RECIPE_SCORE).toEqual({ kind: "intersection-count" });

    const expr: RecipeScoreExpr = DEFAULT_RECIPE_SCORE;
    const recipeTags = ["game:shape-memory", "mechanic:match-pairs"];

    expect(evaluateRecipeScore(expr, recipeTags, requested(["mechanic:match-pairs"]))).toBe(1);
    expect(evaluateRecipeScore(expr, recipeTags, requested(["game:shape-memory", "mechanic:match-pairs"]))).toBe(2);
    expect(evaluateRecipeScore(expr, recipeTags, requested([]))).toBe(0);
  });

  it("returns zero for an intersection-count recipe whose required capabilities are unmet", () => {
    const expr: RecipeScoreExpr = {
      kind: "intersection-count",
      required: ["mechanic:match-pairs", "game:shape-memory"]
    };

    expect(evaluateRecipeScore(expr, ["mechanic:match-pairs"], requested(["mechanic:match-pairs"]))).toBe(0);
    expect(
      evaluateRecipeScore(
        expr,
        ["game:shape-memory", "mechanic:match-pairs"],
        requested(["game:shape-memory", "mechanic:match-pairs"])
      )
    ).toBe(2);
  });

  it("scores weighted-intersection by summing configured weights, defaulting missing weights to 1", () => {
    const expr: RecipeScoreExpr = {
      kind: "weighted-intersection",
      weights: {
        "game:shape-memory": 10,
        "mechanic:match-pairs": 1
      }
    };

    expect(evaluateRecipeScore(expr, ["mechanic:match-pairs"], requested(["mechanic:match-pairs"]))).toBe(1);
    expect(
      evaluateRecipeScore(
        expr,
        ["game:shape-memory", "mechanic:match-pairs"],
        requested(["game:shape-memory", "mechanic:match-pairs"])
      )
    ).toBe(11);
    expect(evaluateRecipeScore(expr, ["game:other"], requested(["game:other"]))).toBe(1);
  });

  it("returns zero for weighted-intersection when required capabilities are not all in the request", () => {
    const expr: RecipeScoreExpr = {
      kind: "weighted-intersection",
      weights: { "game:shape-memory": 5 },
      required: ["game:shape-memory", "mechanic:match-pairs"]
    };

    expect(
      evaluateRecipeScore(
        expr,
        ["game:shape-memory", "mechanic:match-pairs"],
        requested(["mechanic:match-pairs"])
      )
    ).toBe(0);
    expect(
      evaluateRecipeScore(
        expr,
        ["game:shape-memory", "mechanic:match-pairs"],
        requested(["game:shape-memory", "mechanic:match-pairs"])
      )
    ).toBe(6);
  });

  it("scores exact-capability-set only when the recipe's tags match exactly and the request contains them", () => {
    const expr: RecipeScoreExpr = {
      kind: "exact-capability-set",
      capabilities: ["game:shape-memory", "mechanic:match-pairs"]
    };

    expect(
      evaluateRecipeScore(
        expr,
        ["game:shape-memory", "mechanic:match-pairs"],
        requested(["game:shape-memory", "mechanic:match-pairs"])
      )
    ).toBe(2);
    expect(evaluateRecipeScore(expr, ["mechanic:match-pairs"], requested(["mechanic:match-pairs"]))).toBe(0);
    expect(
      evaluateRecipeScore(
        expr,
        ["game:shape-memory", "mechanic:match-pairs", "extra:tag"],
        requested(["game:shape-memory", "mechanic:match-pairs"])
      )
    ).toBe(0);
    expect(
      evaluateRecipeScore(
        expr,
        ["game:shape-memory", "mechanic:match-pairs"],
        requested(["mechanic:match-pairs"])
      )
    ).toBe(0);
  });

  it("produces the same score as the original planner for the canonical test fixtures", () => {
    const expr: RecipeScoreExpr = DEFAULT_RECIPE_SCORE;
    const recipes = [
      { id: "recipe.shared", tags: ["mechanic:match-pairs"] },
      { id: "recipe.specific", tags: ["game:shape-memory", "mechanic:match-pairs"] },
      { id: "recipe.tie", tags: ["game:other-memory", "mechanic:match-pairs"] }
    ];

    const allRequested = requested(["game:shape-memory", "mechanic:match-pairs"]);
    const scores = recipes.map((recipe) => ({
      id: recipe.id,
      score: evaluateRecipeScore(expr, recipe.tags, allRequested)
    }));

    expect(scores).toEqual([
      { id: "recipe.shared", score: 1 },
      { id: "recipe.specific", score: 2 },
      { id: "recipe.tie", score: 1 }
    ]);

    const singleRequested = requested(["mechanic:match-pairs"]);
    const tiedScores = recipes.map((recipe) => ({
      id: recipe.id,
      score: evaluateRecipeScore(expr, recipe.tags, singleRequested)
    }));

    expect(tiedScores).toEqual([
      { id: "recipe.shared", score: 1 },
      { id: "recipe.specific", score: 1 },
      { id: "recipe.tie", score: 1 }
    ]);
  });
});
