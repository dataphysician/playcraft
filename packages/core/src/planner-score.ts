import type { CapabilityTag } from "@playcraft/contracts";

export type RecipeScoreExpr =
  | { readonly kind: "intersection-count"; readonly required?: readonly CapabilityTag[] }
  | {
      readonly kind: "weighted-intersection";
      readonly weights: Readonly<Record<CapabilityTag, number>>;
      readonly required?: readonly CapabilityTag[];
    }
  | { readonly kind: "exact-capability-set"; readonly capabilities: readonly CapabilityTag[] };

// Default scoring rule preserves deterministic parity with the original
// imperative `capabilityTags.filter(...).length` expression. The planner's
// recipe iteration order, score>0 filter, max selection, and ambiguity
// detection are unchanged, so the chosen recipe is bit-identical.
export const DEFAULT_RECIPE_SCORE: RecipeScoreExpr = { kind: "intersection-count" };

export function evaluateRecipeScore(
  expr: RecipeScoreExpr,
  recipeTags: readonly string[],
  requested: ReadonlySet<string>
): number {
  switch (expr.kind) {
    case "intersection-count": {
      if (expr.required && !expr.required.every((capability) => requested.has(capability))) {
        return 0;
      }
      let count = 0;
      for (const tag of recipeTags) {
        if (requested.has(tag)) count += 1;
      }
      return count;
    }
    case "weighted-intersection": {
      if (expr.required && !expr.required.every((capability) => requested.has(capability))) {
        return 0;
      }
      let total = 0;
      for (const tag of recipeTags) {
        if (requested.has(tag)) {
          total += expr.weights[tag] ?? 1;
        }
      }
      return total;
    }
    case "exact-capability-set": {
      if (recipeTags.length !== expr.capabilities.length) return 0;
      const recipeSet = new Set(recipeTags);
      for (const capability of expr.capabilities) {
        if (!recipeSet.has(capability)) return 0;
        if (!requested.has(capability)) return 0;
      }
      return expr.capabilities.length;
    }
  }
}
