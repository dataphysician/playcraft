import type { CapabilityTag } from "@playcraft/contracts";
export type RecipeScoreExpr = {
    readonly kind: "intersection-count";
    readonly required?: readonly CapabilityTag[];
} | {
    readonly kind: "weighted-intersection";
    readonly weights: Readonly<Record<CapabilityTag, number>>;
    readonly required?: readonly CapabilityTag[];
} | {
    readonly kind: "exact-capability-set";
    readonly capabilities: readonly CapabilityTag[];
};
export declare const DEFAULT_RECIPE_SCORE: RecipeScoreExpr;
export declare function evaluateRecipeScore(expr: RecipeScoreExpr, recipeTags: readonly string[], requested: ReadonlySet<string>): number;
//# sourceMappingURL=planner-score.d.ts.map