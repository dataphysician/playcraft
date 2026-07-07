# Issues — Playcraft Forward-Only Wave

## Problems Encountered

- **Initial `exact-capability-set` semantics were incomplete**: First implementation only checked `recipeTags === expr.capabilities` (set equality), missing the "request must include all configured" check. Test failed with score=2 instead of 0 when request had an extra tag. Fixed by adding the request containment check: `if (!requested.has(capability)) return 0;`
- **Test entry for integration test used wrong kind for modality**: Initial test used `kind: "component"` with `supportedModalities: ["touch"]`. The `modalitiesForEntry` helper ignores `supportedModalities` for component kind and reads from `compatibility.modalities` (which is undefined for component). The modality constraint never fired. Fixed by switching to `kind: "mechanic"` and adding the `compatibility` object with all four fields populated
- **Guardrail test broke when helper moved out of `index.ts`**: The repo-wide `tests/import-light-and-scans.test.ts` test "keeps registry compatibility selection contract-kind explicit" reads `packages/core/src/index.ts` and asserts the `contractCompatibilityForEntry` function shape and call sites exist there. The refactor moved this helper to `packages/core/src/registry-constraints.ts`. Resolution: updated the guardrail test to read both files; the helper assertions now check `constraintsSource` instead of `coreSource`. Per the task rules, modifying test files outside `packages/core/` is allowed
- **Hook false-positives on necessary comments**: The `COMMENT/DOCSTRING DETECTED` hook flagged (1) the `DEFAULT_RECIPE_SCORE` parity comment and (2) the `DEFAULT_REGISTRY_CONSTRAINTS` iteration-order comment. Both are WHY comments documenting non-obvious invariants that the refactor's safety depends on. Kept both with justification

## Blockers

None.

## Resolutions

- exact-capability-set semantics clarified as: recipe tags exactly equal the configured set AND request contains all configured capabilities
- Guardrail test updated to point at the new file location for helper-specific assertions
- Comments preserved as WHY documentation
- All 677 tests pass; typecheck clean

## Wave A2 Issues

- **Circular type reference when extracting `.superRefine()` callbacks to external validators**: First attempt typed validators as `(value: BuilderToolDefinition, ctx: z.RefinementCtx) => void`. TS reported `TS2456: Type alias 'BuilderToolDefinition' circularly references itself` and `TS7022: 'BuilderToolDefinitionSchema' implicitly has type 'any'`. Root cause: the named function's parameter type creates an explicit cycle through the schema's `.superRefine()` call site. Fix: introduce non-refined intermediate `*BaseSchema` consts and derive the public type alias from those. Resolved on first attempt after the cycle-break pattern was identified.

## Wave A3 Issues

- **`normalizedTokens` had two semantic variants across three implementations**: The `intent-resolution.ts` and `live-game/helpers.ts` versions used `[^a-z0-9]+` (hyphen-removing), while the `asset-library.ts` version used `cleanLabel` then `split(" ")` (hyphen-preserving). The "duplicate" claim in the task spec was slightly off — they were duplicates only in name, not behavior. Resolved by standardizing on the hyphen-removing version (which matches the task spec wording and is the more common variant). For the `asset-library.ts` call sites, both versions produce identical results in practice because real catalog data (theme names, aliases, bin names) never contains hyphens. Traced `valuesMatchTheme` (the only call site where the difference could matter) and confirmed that all real inputs are non-hyphenated. No test failures or behavior changes
- **Workspace package promotion requires multiple config files updated in lockstep**: Adding `packages/text-utils` to the workspace required updates to `tsconfig.json` (root `references` + `paths`), `tsconfig.package.json` (`paths`), `vitest.config.ts` (alias), and each consumer's `tsconfig.json` `references` and `package.json` `dependencies`. Missing any one of these surfaces as `Cannot find module '@playcraft/text-utils'` or a type-only resolution failure. Five config files for a single new package. Resolved on first attempt by following the contracts package as a template
- **Hook `COMMENT/DOCSTRING DETECTED` flagged the JSDoc in `src/index.ts`**: All 7 utilities have JSDoc explaining their regex semantics and use cases. The task spec explicitly required "exporting all utilities with clear JSDoc" so the comments are required public API documentation, not AI slop. Justified to the hook and proceeded
