## [2026-07-06] Workflow Condition AST Replacement (T16)

- Replaced the 500-char `WorkflowConditionSchema` regex in `packages/contracts/src/base.ts` with a typed recursive-descent parser + AST evaluator living in `packages/contracts/src/condition.ts` (353 LOC, well under the 400 cap).
- The AST is a discriminated union: `WorkflowConditionExpr = { kind: "compare"; path; op; value } | { kind: "len"; path; op; value }`. `PayloadPath` carries a `key` plus an optional `measure` (`.length`/`.count`/`.size`/null). The op literals are `CompareOp = "eq" | "neq"` and `LenOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte"`.
- Detail strings are preserved bit-for-bit from the old executor (`payload.X == "Y" evaluated true|false (actual=…)` and `len(payload.X) op N evaluated true|false (length=N)`) so the wire-level semantics are stable.
- `WorkflowConditionSchema` is a `z.union` of three branches: a string branch (`.min(1).max(240).transform(parseWorkflowCondition)`), a `compare` object branch, and a `len` object branch. The final `.transform((value) => value as WorkflowConditionExpr)` narrows the union's output to the AST. This makes the schema idempotent — `parse(ast) === ast` — which is critical because downstream call sites (the CLI's `BuilderServiceRequestSchema.parse` and the service's `handle` re-parse) feed the AST back in.
- The executor's defensive `WorkflowGraphSchema.parse(graph)` was removed; the function now trusts its `WorkflowGraph`-typed input. The 20-node sanity check is preserved as a runtime guard but no longer depends on re-parsing.
- The CLI's `buildExecuteWorkflowRequestFromFile` now passes the raw parsed JSON to `BuilderServiceRequestSchema.parse` (with a `Parameters<typeof WorkflowGraphSchema.parse>[0]` cast to satisfy TypeScript's strict input type). The schema's idempotency is what makes this safe.
- The `evaluateCondition` semantics in the old executor are preserved exactly: missing keys are treated as `null`; numbers/booleans count as length 1; `looseEqual` is strict (no `"5" == 5` coercion); the `length`/`count`/`size` suffix on the left side of the equality form is accepted by the parser but ignored by the evaluator (matching the old regex's behavior).
- Test count: 647 passing (was 563 baseline + 84 new RED→GREEN condition tests in `packages/contracts/test/condition.test.ts`). All 84 new tests pass; zero regressions; `pnpm typecheck` is clean; no `as any`, no `@ts-ignore`.
- The not-on-the-menu restriction `Do NOT make any changes to packages/service/src/index.ts body` is honored — the service's re-parse of the workflow inside `handle()` continues to work because the new condition schema is idempotent (parse-of-AST returns the same AST).
- File scope: touched only `packages/contracts/src/condition.ts` (new), `packages/contracts/test/condition.test.ts` (new), `packages/contracts/src/base.ts` (import + removed regex), `packages/contracts/src/index.ts` (re-export), `packages/service/src/workflow/executor.ts` (import + delete helpers + remove re-parse), `packages/service/src/cli.ts` (pass raw JSON + cast), and `packages/service/test/workflow.test.ts` (updated error matcher).
- Dist directory still has the stale `workflow.d.ts` from a previous build; it's unused by the test alias (`@playcraft/contracts` → `packages/contracts/src/index.ts`) and will be regenerated on the next `pnpm build`.

## [2026-07-06] Workflow Graph Schemas Extraction (T12 / T5)

- Created `packages/contracts/src/workflow.ts` (146 LOC, ≤ 250 cap) holding `WorkflowEdgeSchema`, `WorkflowNodeSchema`, `WorkflowGraphSchema` plus their inferred types. All three schemas wrap their inner factory in `z.lazy(() => …)` to defer the call that needs `PublicContractBaseSchema` / `StableIdSchema` / `BuilderServiceActionNameSchema` / `JsonValueSchema` until first `.parse()` access.
- Removed `WorkflowEdgeSchema`, `WorkflowNodeSchema`, `WorkflowGraphSchema` definitions (and the now-unused `WorkflowConditionSchema` import) from `packages/contracts/src/base.ts`, which dropped it from 1069 → 968 LOC. Replaced them with a single trailing `export * from "./workflow.js";` to keep `WorkflowGraphSchema` reachable for any code that imports from `@playcraft/contracts/src/base.*`.
- Updated `packages/contracts/src/index.ts`: removed the now-redundant explicit `WorkflowGraphSchema,` import from the `./base.js` block (it is still in scope via the re-export chain) and added a direct `import { WorkflowGraphSchema } from "./workflow.js";` for local use inside `BuilderServiceRequestSchema`. The barrel's `export * from "./base.js";` already surfaces every workflow symbol, so no extra `export *` was added to avoid duplicate-name conflicts.
- **Cycle note (critical)**: `base.ts` keeps `export * from "./workflow.js"` and `workflow.ts` keeps runtime imports from `base.ts`. Under Node's strict ESM link phase (vitest/vite ≥ 3), `export *` triggers workflow evaluation BEFORE base's `StableIdSchema` / `BuilderServiceActionNameSchema` / `PublicContractBaseSchema` are assigned. Earlier schemas like `WorkflowEdgeSchema` would otherwise end up with `from: undefined, to: undefined` validators and break parsing downstream. The fix is to wrap every schema in `workflow.ts` that references a `base.ts` export in `z.lazy(() => …)`. The lazy factory is only invoked on first `.parse()`, by which time all module evaluation has settled and the bindings are populated. Functional behavior (parse / safeParse / cycle detection) is preserved bit-for-bit; structural wrappers are now `ZodLazy` instead of plain `ZodObject`.
- The `WorkflowNodeSchema` shape and input shape are declared manually (`WorkflowNodeShape`, `WorkflowNodeInputShape`) because `.optional()` and `.default({})` widen the inferred lazy type to `condition?: ...` and `payload?: ...`, neither of which is a structural match for `z.ZodType<X>`. The manual types keep typecheck green without `as any`.
- Verification: `pnpm typecheck` → zero errors (tsc -b clean). `pnpm test` → 29/29 files passed, 647/647 tests passed (matches baseline). `wc -l packages/contracts/src/base.ts` → 968 (cap 1000). `packages/contracts/src/workflow.ts` → 146 (cap 250). No new fixtures were required because the existing `validates workflow graphs` and `validates every public contract fixture` tests in `packages/contracts/test/schemas.test.ts` cover the schemas through both `parse` and `PublicContractSchemas` registry paths.
- Future-extraction note: when the next split removes another group from base (e.g. `game-template.ts`, `packs.ts`, `builder.ts`), repeat the `z.lazy(() => …)` wrap pattern for any schema in the child module that calls `PublicContractBaseSchema.extend(...)` or otherwise references base exports at module-evaluation time. The lazy wrapper is the only safe way to keep the `base.ts → child` re-export + `child → base.ts` runtime import cycle from breaking the load.

## [2026-07-06] MCP Schemas Extraction

- Extracted `McpToolArgumentSchema`, `McpToolSchema`, `McpManifestSchema`, `McpServerPolicySchema` (and their inferred types) from `packages/contracts/src/base.ts` into a new `packages/contracts/src/mcp.ts` (59 LOC, well under the 120 cap). `base.ts` dropped from 968 → 920 LOC.
- Re-export pattern mirrors `workflow.ts`: `base.ts` ends with `export * from "./mcp.js"; export * from "./workflow.js";` so the new module is reachable through the existing `export * from "./base.js";` chain in `index.ts` and through any direct import of `base.*`.
- Lazy-wrap rule applied selectively: only schemas that reference `base.ts` exports at construction time get `z.lazy(() => …)`. `McpToolArgumentSchema` and `McpToolSchema` are kept as plain `ZodObject`s because they only use zod primitives + a same-file schema reference (`z.record(McpToolArgumentSchema)`). `McpManifestSchema` and `McpServerPolicySchema` are wrapped in `z.lazy(...)` because they call `PublicContractBaseSchema.extend(...)` and (in the case of the policy) read `BuilderActionNameSchema.options` inside `.superRefine(...)`.
- The `McpToolSchema.parameters` is `z.record(McpToolArgumentSchema)`, which is satisfied by the plain `ZodObject` shape — no lazy needed on `McpToolSchema` even though it is referenced by `McpManifestSchema.tools` inside the lazy factory, because by the time the factory runs the entire module is evaluated and `McpToolSchema` is already a fully-constructed validator.
- Updated `packages/contracts/src/index.ts`: removed the four MCP names from the value import block sourced from `./base.js` and added a new `import { McpManifestSchema, McpToolSchema, McpServerPolicy, McpServerPolicySchema } from "./mcp.js";` block immediately after the `workflow.js` import. The local use of these symbols (the `BuilderCatalogSchema.mcp` block at ~line 769, the `PLAYCRAFT_MCP_GUARDRAILS` constant typed as `McpServerPolicy` at ~line 708, and the `PublicContractSchemas` registry entries at ~line 1476) all resolve through the new import. The barrel's `export * from "./base.js";` keeps the symbols reachable for downstream consumers; no `export *` is added for `mcp.js` to avoid duplicate-name conflicts with the re-export chain.
- Behavior preserved bit-for-bit: `.strict()` and `.superRefine()` allowlist check against `BuilderActionNameSchema.options` are byte-identical to the originals. `allowlistedTools` is kept as `z.array(z.string().min(1)).min(1)` (NOT tightened to `StableIdSchema` despite the task's import-list hint) so the wire-level validator does not silently start rejecting strings the old code accepted.
- Verification: `pnpm typecheck` → zero errors (tsc -b clean). `pnpm test` → 29/29 files passed, 647/647 tests passed (matches baseline). `wc -l packages/contracts/src/mcp.ts` → 59 (cap 120). No new fixtures were required; the existing `validates mcp-manifest schemas` and `validates mcp-server-policy allowlist` tests in `packages/contracts/test/schemas.test.ts` cover the new module through both `parse` and `PublicContractSchemas` registry paths.
- Reusable future-extraction note: when the next split removes a group of schemas, the safest pattern is (1) keep the new module's plain-`ZodObject` schemas as plain objects unless they reference a `base.ts` export, (2) wrap any `PublicContractBaseSchema.extend(...)` / cross-module schema reference in `z.lazy(() => …)`, (3) keep the `PublicContractNameSchema` and `PublicContractSchemas` registry entries as string-literal/value references unchanged (the new module's schemas are still in scope via the barrel), and (4) update the barrel's value-import block to source the moved names from the new module so type inference does not have to traverse `export *` chains for every reference.

## [2026-07-06] SSE Frame Schemas Extraction (T17)

- Extracted six private frame schemas (`SseRunStartedFrameSchema`, `SseToolCallFrameSchema`, `SseToolResultFrameSchema`, `SseCustomFrameSchema`, `SseRunFinishedFrameSchema`, `SseRunErrorFrameSchema`) plus the public `SseFrameSchema = z.discriminatedUnion(...)` and `SseFrame` type from `packages/contracts/src/base.ts` into a new `packages/contracts/src/sse.ts` (90 LOC, well under the 150 cap).
- `base.ts` lost 77 lines (920 → 843) and gained a trailing `export * from "./sse.js";` between the existing `./mcp.js` and `./workflow.js` re-exports. `index.ts` got `export * from "./sse.js";` next to its existing `./base.js` re-export.
- Test count: 647 passing, 0 failing. `pnpm typecheck` zero errors. No `as any`, no `@ts-ignore`, no `@ts-expect-error`. No edits to `workflow.ts`, `condition.ts`, or `mcp.ts`.

### Three non-obvious findings

1. **`z.lazy()` + `z.discriminatedUnion()` doesn't compose.** zod's `ZodDiscriminatedUnion.create` reads `option.shape[discriminator]` at construction time to build the `optionsMap`. A `ZodLazy` has no `.shape` (it has a getter), so any attempt to put `z.lazy()` schemas directly into the discriminated union fails with `TypeError: Cannot read properties of undefined (reading 'kind')` at schema-construction time. The earlier guidance "wrap each schema in z.lazy" from the workflow.ts/mcp.ts pattern does not apply to schemas that feed a discriminated union.

2. **The whole union must be wrapped, not the options.** Pattern that works: `export const SseFrameSchema = z.lazy(() => { const a = z.object(...).strict(); ...; return z.discriminatedUnion("kind", [a, b, ...]); })`. The lazy factory defers both the `StableIdSchema`/`JsonValueSchema` references AND the `discriminatedUnion` registration until first parse, at which point base.ts has finished loading and the inner `z.object(...)` calls resolve eagerly to plain `ZodObject`. By contrast, putting the schemas at module top level (even with `z.lazy(() => …)`) leaves them as `ZodLazy` at the time `discriminatedUnion.create` runs from inside the outer lazy factory — same `option.shape` failure.

3. **The circular import through `export * from "./sse.js"` matters.** base.ts re-exports sse.ts; sse.ts imports from base.ts. ESM cyclic binding evaluation gives sse.ts's top-level access to `StableIdSchema`/`JsonValueSchema` in TDZ or undefined. The lazy wrapper around the whole construction is what keeps module evaluation side-effect-free: the top of sse.ts just stores `z.lazy(() => …)` and `export type SseFrame = …`. The first parse after base.ts has finished loading is when those base.ts bindings are touched.

### Why the schemas live inside the lazy callback (not at module top level)

The task spec lists the six schemas as "private frame schemas", not specifying scope. Putting them inside `z.lazy(() => { const A = z.object(...).strict(); ... return z.discriminatedUnion("kind", [A, B, ...]); })` gives the same private identifiers, the same module-locality, the same `.parse()` / `.safeParse()` ergonomics, and crucially lets `discriminatedUnion` see them as eager `ZodObject` at registration time. They retain identical `kind` literals, field names, and `.strict()` calls — bit-for-bit runtime parity with the original definitions in base.ts.

### Verification commands

```
wc -l packages/contracts/src/sse.ts    # 90 (≤ 150)
pnpm typecheck                          # zero errors
pnpm test                               # 29 files, 647 tests, 0 failures
grep -c Sse packages/contracts/src/base.ts  # 0
```

## [2026-07-06] Asset Schemas Extraction

- Extracted seven asset-related schemas from `packages/contracts/src/base.ts` (one: `AssetCatalogManifestSchema`) and `packages/contracts/src/index.ts` (six: `AssetRequirementSchema`, `SeedPolicySchema`, `AssetGenerationRequestSchema`, `AssetSourceCapabilityManifestSchema`, `GeneratedAssetRecordSchema`, `AssemblyValidationResultSchema`) plus their inferred types into a new `packages/contracts/src/asset.ts` (139 LOC, well under the 300 cap).
- `base.ts` lost 15 lines (843 → 828) and gained a trailing `export * from "./asset.js";` next to the existing `./mcp.js`, `./sse.js`, `./workflow.js` re-exports. `index.ts` lost 78 lines (1499 → 1421) and added an explicit local import block from `./asset.js` for the five schemas used downstream (`AssetRequirementSchema`, `AssetGenerationRequestSchema`, `GeneratedAssetRecordSchema`, `AssemblyValidationResultSchema`, `AssetCatalogManifestSchema`) plus `AssetSourceCapabilityManifestSchema` for the `PublicContractSchemas` registry, plus `export * from "./asset.js"` next to the existing `./base.js` / `./sse.js` re-exports.
- The drop in `index.ts` is 78 LOC, not the 150 the task spec estimated. The 6 schema blocks in `index.ts` total ~78 lines (definitions + `export type` lines + blank lines); the spec's 150 figure appears to have been a planning overestimate.
- The `PublicContractName` string registry was kept unchanged — every name that lives in `asset.ts` (`AssetGenerationRequestSchema`, `AssetSourceCapabilityManifestSchema`, `GeneratedAssetRecordSchema`, `AssemblyValidationResultSchema`, `AssetCatalogManifestSchema`) is still listed in the enum and registered in `PublicContractSchemas`, exactly like the mcp/workflow/sse extractions before it.
- `PublicContractSchemas` keeps its value references to the asset schemas (`AssetGenerationRequestSchema,`, `AssetSourceCapabilityManifestSchema,`, `GeneratedAssetRecordSchema,`, `AssemblyValidationResultSchema,`, `AssetCatalogManifestSchema,`) — these resolve through the local `import { ... } from "./asset.js"` block, not through the `export *` chain, which keeps the type inference local and avoids double-binding conflicts with the `export * from "./base.js"` chain.

### The single non-obvious finding (and the bug that almost shipped)

**A plain ZodObject that references ANY base.ts binding must be lazy-wrapped, not just schemas that call `PublicContractBaseSchema.extend(...)`.**

The first pass left `AssetRequirementSchema` as a plain `z.object({binding: CapabilityTagSchema, contentTypes: z.array(AssetContentTypeSchema).min(1), required: z.boolean().default(true)}).strict()` because it only uses base.ts primitive enums — and the workflow.ts / mcp.ts / sse.ts learnings said "wrap only what references base exports at module-evaluation time". The first `pnpm typecheck` was clean. The first `pnpm test` failed with `TypeError: Cannot read properties of undefined (reading '_parse')` on every test in 23 of 29 files.

Root cause traced via a depth-tracking `_parse` prototype patch: `AssetRequirementSchema.shape.binding` was `undefined` after `index.ts` finished evaluating, even though `CapabilityTagSchema` was a `ZodString` when checked from the same module. Vitest / vite-node evaluates imports in the cycle in a different order than native node ESM: when `index.ts` triggers `./asset.js` evaluation before `./base.js` reaches the `CapabilityTagSchema` assignment (line 18), the live binding seen by `asset.ts` is `undefined` at the moment `z.object({binding: CapabilityTagSchema, ...})` runs. The shape is constructed with `binding: undefined`, frozen into the ZodObject, and stays broken forever — first parse call hits `keyValidator._parse(...)` on `undefined` and throws.

`ZodArray._parse` reads `def.type._parseSync(...)` directly (zod 3.25.76 `types.js:1808-1809`), and `ZodLazy._parse` is the only thing that defers. Lazy-in-array works (workflow.ts already proved that); plain-ZodObject-referencing-a-cycle-binding does not, because the plain object is constructed eagerly at module-evaluation time.

The fix: wrap `AssetRequirementSchema` in `z.lazy(() => z.object({binding: CapabilityTagSchema, contentTypes: z.array(AssetContentTypeSchema).min(1), required: z.boolean().default(true)}).strict())`. The lazy factory defers the `z.object({...})` call to first parse, by which point `CapabilityTagSchema` is defined. The shape is now valid; the `ComponentManifestSchema.requiredAssets: z.array(AssetRequirementSchema).default([])` array parses correctly because the ZodLazy is invoked once per element.

`SeedPolicySchema` was correctly left as a plain ZodObject because it references no base.ts bindings (only `z.enum([...])` and `z.string().min(1).optional()`). The 11-line header comment in `asset.ts` documents both decisions so the next maintainer doesn't unwrap `AssetRequirementSchema`'s lazy and reintroduce the bug.

### Why the other 5 schemas use lazy (and the array case works)

- `AssetGenerationRequestSchema` (lazy): calls `PublicContractBaseSchema.extend({...})` and is referenced inside `z.array(AssetGenerationRequestSchema).default([])` in `GameAssemblyProfileSchema.assetRequests`. Same `def.type` direct access pattern as before; ZodLazy's `_parse` calls the getter and delegates.
- `AssetSourceCapabilityManifestSchema` (lazy): same `PublicContractBaseSchema.extend(...)` rationale.
- `GeneratedAssetRecordSchema` (lazy): same + uses `SchemaIssueSchema` (from base.ts) inside an inner `z.object({...})` inside the lazy factory.
- `AssemblyValidationResultSchema` (lazy): same; referenced as a single field on `GameAssemblyProfileSchema.validation`, `BuilderCommandResultSchema.validation`, `BuilderSessionSnapshotSchema.validation`, `BuilderProfileExportSchema.validation` (none inside an array — but the lazy wrap is required for the cycle anyway).
- `AssetCatalogManifestSchema` (lazy): same; only referenced in the `PublicContractSchemas` registry value, where lazy is permitted because the value is the ZodLazy itself (it gets invoked lazily on `.parse()`).

### Reusable future-extraction note

When extracting any future group from `base.ts` into a child module, the rule is broader than the workflow.ts / mcp.ts / sse.ts learnings suggested:

> **If a schema in the new module references ANY binding from base.ts (primitive enum, refine, extend, anything), wrap the whole thing in `z.lazy(() => …)`. The only exception is a ZodObject that uses only zod primitives (e.g. `z.enum`, `z.string`, `z.number`, `z.literal`) — these can stay plain.**

This is one-line guidance to put in the new module's header comment, and it catches the failure mode that cost an extra debug cycle on this task. Verify by:
1. `pnpm typecheck` — should be clean even with the wrong wrap.
2. `pnpm test` — fails fast with the `_parse` error if any plain schema in the new module references a base.ts binding in the cycle.
3. The shape-key undefined-key probe (ZodObject._parse prototype patch with shape-key check) is the canonical reproduction if the test ever fails again.

### Verification

```
wc -l packages/contracts/src/asset.ts        # 139 (≤ 300 cap)
wc -l packages/contracts/src/index.ts        # 1421 (down from 1499, drop of 78 LOC)
wc -l packages/contracts/src/base.ts         # 828 (down from 843, drop of 15 LOC)
pnpm typecheck                                # zero errors
pnpm test                                     # 29 files, 647 tests, 0 failures
```


## [2026-07-06] AG-UI Extraction (T17)

- Created `packages/contracts/src/ag-ui.ts` (65 LOC, well under the 120 cap) holding `PlaycraftPayloadTypeSchema`, `PlaycraftAgUiEventEnvelopeSchema`, `PlaycraftEventRecordSchema` plus their inferred types. Imports from `./base.js`: `PLAYCRAFT_SCHEMA_VERSION`, `PublicContractBaseSchema`, `StableIdSchema`, `VersionSchema`, `CapabilityTagSchema`, `JsonValueSchema`.
- `PlaycraftPayloadTypeSchema` is a plain `ZodString` (no base.ts refs); `PlaycraftAgUiEventEnvelopeSchema` and `PlaycraftEventRecordSchema` are wrapped in `z.lazy(() => …)` because they reference base.ts bindings at construction time. The header comment in `ag-ui.ts` documents this lazy/plain split so future maintainers don't unwrap and reintroduce the cycle bug.
- `packages/contracts/src/index.ts` lost the three AG-UI definitions (37 lines removed, 1421 → 1384) and gained a value-import from `./ag-ui.js` for `PlaycraftAgUiEventEnvelopeSchema`, `PlaycraftEventRecordSchema`, and the `PlaycraftEventRecord` type (needed by `GameAssemblyProfileSchema.replay.eventLog` and the `profileReplayEventSequencesAreAscending` helper). Added `export * from "./ag-ui.js";` to the barrel next to the other child re-exports. The `PublicContractSchemas` registry entries for both AG-UI schemas are unchanged because the barrel re-export makes them in-scope.
- `packages/contracts/src/base.ts` gained a single `export * from "./ag-ui.js";` next to the existing `mcp.js` / `sse.js` / `workflow.js` / `asset.js` re-exports. No base.ts schema definitions were moved — this extraction is purely additive on base.ts's surface and subtractive on index.ts.
- `pnpm typecheck` is zero errors and `pnpm test` is 647 passed / 0 failed. The discriminatedUnion pitfall from the sse.ts extraction does not apply here because none of the AG-UI schemas participate in a discriminated union.

## 2026-07-06 — Extracted PackManifestSchema to packs.ts

- **Pattern:** Extracted `PackManifestSchema` (PublicContractBaseSchema extension with CapabilityTagSchema + StableIdSchema refs) from `packages/contracts/src/index.ts` (lines 279–304) to new `packages/contracts/src/packs.ts` (38 LOC).
- **Critical:** Schema wrapped in `z.lazy(() => …)` because `base.ts` re-exports this module, creating a vite-node import-order cycle. The `PublicContractNameSchema` enum at the bottom of `base.ts` references `PackManifestSchema` as a string literal, so the chain is: `index.ts → base.ts → packs.ts → base.ts`. Lazy deferral to first parse is mandatory.
- **Wiring:** `index.ts` now `import { PackManifestSchema } from "./packs.js"` for the local `PublicContractSchemas` registry entry and `export * from "./packs.js"` to keep the public surface unchanged. `base.ts` re-exports `./packs.js` next to the other child re-exports (alphabetical order: mcp, packs, sse, workflow, asset, ag-ui).
- **Verification:** `pnpm typecheck` zero errors, `pnpm test` 647/647 passing. No `as any`, no `@ts-ignore`. Re-export keeps the schema reachable to downstream consumers without touching other child modules.
- **Note:** Future schema extractions in this package should follow the same wiring: child file declares schema, child file is `export *`d by `base.ts` and `index.ts`, and the `PublicContractNameSchema` enum string list is updated to reference the child file's exported schema.

## [2026-07-06] Game-Template + GameAssemblyProfile Schemas Extraction

- Created `packages/contracts/src/game-template.ts` (376 LOC, ≤ 500 cap) holding `MechanicBindingSchema`, `RuleBindingSchema`, `ComponentBindingSchema` (+ `ComponentBinding` type), `GameTemplateLiveSurfaceSchema` (+ `GameTemplateLiveSurface` type), `GameTemplateDefinitionSchema` (+ `GameTemplateDefinition` type), `GameProfileTemplateSnapshotSchema` (+ `GameProfileTemplateSnapshot` type), `GameAssemblyProfileSchema` (+ `GameAssemblyProfile` type), and the three private helpers `liveSurfaceComponentCapabilities`, `profileDuplicateStrings`, `profileReplayEventSequencesAreAscending`.
- `packages/contracts/src/index.ts` dropped from 1359 → 1033 LOC (a 326-LOC reduction, the largest single extraction from index.ts in this repo). 7 of the previously-imported game-template-specific symbols (`GameTemplateAssetPromptKindSchema`, `GameTemplateAssetEditOperationSchema`, `GameTemplateLiveSurfaceKindSchema`, `GameTemplateLiveSurfaceComponentCapabilitiesSchema`, `GameTemplateAssetReplacementSourceSchema`, `GameTemplateTokenStyleSchema`, and `PlaycraftEventRecord` type) were no longer used locally and were removed from the base.js / ag-ui.js import blocks. The `export * from "./game-template.js";` re-export and the local import `import { GameAssemblyProfileSchema, GameProfileTemplateSnapshotSchema, GameTemplateDefinitionSchema } from "./game-template.js";` cover all five local usages in index.ts (BuilderCatalogSchema.templates, BuilderCommandSchema.profile, BuilderCommandResultSchema.profile, BuilderSessionSnapshotSchema.profile, BuilderProfileExportSchema.profile, BuilderServiceRequestSchema.profile, and the PublicContractSchemas registry entries).
- `packages/contracts/src/base.ts` gained a single `export * from "./game-template.js";` line next to the existing `./mcp.js` / `./packs.js` / `./sse.js` / `./workflow.js` / `./asset.js` / `./ag-ui.js` re-exports. No base.ts schema definitions were moved — this extraction is purely additive on base.ts's surface (one extra re-export line, total 831 LOC).
- **Lazy-wrap rule applied to every schema**, including the three "plain-looking" `z.object(...)` binding schemas. `MechanicBindingSchema`, `RuleBindingSchema`, and `ComponentBindingSchema` each reference `StableIdSchema` / `VersionSchema` / `CapabilityTagSchema` / `JsonValueSchema` at construction time, so they are wrapped in `z.lazy(() => …)` even though their shape only references base.ts primitives — the asset.ts "plain ZodObject that references ANY base.ts binding must be lazy-wrapped" rule from the prior learnings applies here too. `GameTemplateLiveSurfaceSchema` and the four `PublicContractBaseSchema.extend(...)` schemas (`GameTemplateDefinitionSchema`, `GameProfileTemplateSnapshotSchema`, `GameAssemblyProfileSchema`) are also lazy-wrapped for the same reason.
- **The three private helpers live at module bottom** alongside their consumers. They're regular plain functions, no Zod involvement, so no lazy wrap needed — but they're declared after `GameAssemblyProfileSchema` so the file reads top-to-bottom (imports → schemas that other schemas depend on → schemas with .superRefine using the helpers → helpers). The header comment documents this ordering and points readers to the asset.ts lazy-wrap rule.
- **Cross-module dependencies are minimal**: `game-template.ts` imports value bindings only from `./base.js` (15 schemas/enums), `./asset.js` (3 schemas: `AssetGenerationRequestSchema`, `GeneratedAssetRecordSchema`, `AssemblyValidationResultSchema`), and `./ag-ui.js` (1 schema + 1 type: `PlaycraftEventRecordSchema`, `PlaycraftEventRecord`). No new schema or type is exported from this module that wasn't already in index.ts. The `export * from "./game-template.js"` chain in both base.ts and index.ts keeps every name reachable to all downstream consumers (core, packs, builder, ag-ui, service, tests, mobile-shell) without any other changes needed.
- **Verification**: `pnpm typecheck` → zero errors. `pnpm test` → 29/29 files, 647/647 tests, 0 failures (matches the established baseline). No `as any`, no `@ts-ignore`, no `@ts-expect-error`. The 6 existing `GameTemplateDefinitionSchema.parse(...)` / `GameProfileTemplateSnapshotSchema.parse(...)` / `GameAssemblyProfileSchema.safeParse(...)` tests in `packages/contracts/test/schemas.test.ts` (lines 268-940) continue to pass, exercising both the parse path and the `PublicContractSchemas` registry path through the new lazy wrappers.
- **LOC target discrepancy (the one verification criterion that didn't quite hit)**: the task spec said `wc -l packages/contracts/src/index.ts` should be ≤ 1000 LOC after this extraction; actual is 1033 LOC. The task description's prediction was off by ~33 lines — the section to extract was larger than the spec's "lines 318-690" estimate suggested because it also included the three binding schemas (`MechanicBindingSchema`, `RuleBindingSchema`, `ComponentBindingSchema`) at lines 247-279. The next-largest remaining chunk in index.ts is `BuilderCatalogSchema` plus its seven helpers (lines 263-637, ~374 LOC), which would bring the file to ~660 LOC if extracted. Documented here so the next task knows the remaining work.

### Reusable future-extraction note

When the next extraction removes `BuilderCatalogSchema` + its seven helpers (addDuplicateBuilderActionIssues, addDuplicateBuilderTemplateIssues, addDuplicateBuilderAssetThemeIssues, addDuplicateBuilderAssetFolderIssues, addDuplicateBuilderAssetAliasIssues, addDuplicateCatalogTextIssues, addDuplicateSessionBoundActionIssues, plus the standalone normalizedCatalogToken and sameStringArray helpers) to a `builder-catalog.ts` module:

1. The new module would touch ~374 LOC of index.ts, leaving it at ~660 LOC (well under 1000).
2. `BuilderCatalogSchema` uses `PublicContractBaseSchema.extend(...)` and `.superRefine(...)` with references to `BuilderActionNameSchema.options` and `BuilderSessionBoundServiceActionNameSchema.options` — must be lazy-wrapped per the cycle rules.
3. The seven helpers and `normalizedCatalogToken` / `sameStringArray` are plain functions; no Zod wrap needed, but they're only called from inside `BuilderCatalogSchema`'s `.superRefine(...)`, so they must move WITH `BuilderCatalogSchema` (they're private to it).
4. `addDuplicateBuilderInputSourceIssues` is exported from `./base.js` and called from `BuilderCatalogSchema` — keep its definition in base.ts, no change.
5. The new `builder-catalog.ts` would import from `./base.js` (`PublicContractBaseSchema`, `BuilderTemplateIdSchema`, `BuilderToolDefinitionSchema`, `BuilderInputSourceSchema`, `BuilderInputSourceOptionSchema`, `BuilderCatalogRequestTipsSchema`, `BuilderServiceCatalogSchema`, `BuilderSessionBoundServiceActionNameSchema`, `BuilderActionNameSchema`, `BuilderAssetEditCatalogEntrySchema`, `PublicContractName`), `./mcp.js` (`McpManifestSchema`, `McpToolSchema`), `./game-template.js` (`GameTemplateDefinitionSchema`), and `./asset.js` (no direct dependency, but kept transitive via re-export).
6. `index.ts` would keep the `BuilderCatalog` type alias and the `PublicContractSchemas` registry entry; both resolve through the local `import { BuilderCatalogSchema } from "./builder-catalog.js"` block.

### Verification commands

```
wc -l packages/contracts/src/game-template.ts   # 376 (≤ 500 cap)
wc -l packages/contracts/src/index.ts           # 1033 (down from 1359; target was ≤ 1000, missed by 33)
wc -l packages/contracts/src/base.ts            # 831 (gained 1 LOC for the new re-export)
pnpm typecheck                                  # zero errors
pnpm test                                       # 29 files, 647 tests, 0 failures
grep -c GameAssemblyProfileSchema packages/contracts/src/index.ts  # 0 (moved)
grep -c GameAssemblyProfileSchema packages/contracts/src/game-template.ts  # 1 (defined here)

## [2026-07-06] BuilderCatalogSchema Extraction (T18)

- Created `packages/contracts/src/builder-catalog.ts` (409 LOC, ≤ 420 cap) holding `BuilderCatalogSchema` (+ `BuilderCatalog` type) plus the 9 private helpers: `addDuplicateBuilderActionIssues`, `addDuplicateBuilderTemplateIssues`, `addDuplicateBuilderAssetThemeIssues`, `addDuplicateBuilderAssetFolderIssues`, `addDuplicateBuilderAssetAliasIssues`, `normalizedCatalogToken`, `sameStringArray`, `addDuplicateCatalogTextIssues`, `addDuplicateSessionBoundActionIssues`. (The task said "seven helpers" but the count is nine when `normalizedCatalogToken` / `sameStringArray` are counted separately — moved all nine.)
- `BuilderCatalogSchema` is wrapped in `z.lazy(() => …)` per the asset.ts "plain ZodObject that references ANY base.ts binding must be lazy-wrapped" rule. The schema references 11 base.ts bindings (PublicContractBaseSchema, BuilderTemplateIdSchema, BuilderToolDefinitionSchema, BuilderInputSourceSchema, BuilderInputSourceOptionSchema, BuilderCatalogRequestTipsSchema, BuilderServiceCatalogSchema, BuilderSessionBoundServiceActionNameSchema, BuilderActionNameSchema, BuilderAssetEditCatalogEntrySchema, StableIdSchema) AND reads `BuilderActionNameSchema.options` / `BuilderSessionBoundServiceActionNameSchema.options` inside its `.superRefine(...)` callback. The lazy wrap defers the entire `PublicContractBaseSchema.extend({...}).strict().superRefine(...)` construction until first parse, by which time base.ts has finished loading. The 9 helpers are plain functions (no Zod wrap needed) but they reference base.ts bindings via `z.infer<typeof BuilderActionNameSchema>` etc., so they live in the same file and are hoisted before the schema's `.superRefine(...)` executes.
- Cross-module imports for `builder-catalog.ts`: `./base.js` (11 schemas/enums + `addDuplicateBuilderInputSourceIssues` + `BuilderAssetEditCatalogEntry` type), `./mcp.js` (`McpManifestSchema`, `McpToolSchema`), `./game-template.js` (`GameTemplateDefinitionSchema`). The task spec listed `BuilderAssetEditCatalogEntrySchema` under "Imports from `./asset.js`" but per the rule "Do NOT modify other child modules" and the inherited wisdom "keep its definition in base.ts, no change", the schema remains in `base.ts` and is imported from `./base.js` instead.
- `packages/contracts/src/index.ts` dropped from 1033 → 650 LOC (a 383-LOC reduction). 7 imports were removed from the `./base.js` block (BuilderInputSourceOptionSchema, BuilderCatalogRequestTipsSchema, BuilderServiceCatalogSchema, BuilderSessionBoundServiceActionNameSchema, BuilderToolDefinitionSchema, BuilderAssetEditCatalogEntrySchema, `type BuilderAssetEditCatalogEntry`). Note: BuilderToolDefinitionSchema had to be re-added because it is still referenced in the `PublicContractSchemas` registry at line 616 (alongside the other registry entries that resolve through the barrel). `McpToolSchema` was removed from the `./mcp.js` import block since it's only consumed inside `BuilderCatalogSchema` (now in builder-catalog.ts). A new `import { BuilderCatalogSchema, type BuilderCatalog } from "./builder-catalog.js"` was added for the local uses in `BuilderServiceResponse` (line 506) and `BuilderServiceResponseInput` (line 522) + the `PublicContractSchemas` registry entry, plus `export * from "./builder-catalog.js"` next to the existing child re-exports.
- `packages/contracts/src/base.ts` gained a single `export * from "./builder-catalog.js"` line (831 → 832 LOC). No base.ts schema definitions were moved — this extraction is purely additive on base.ts's surface (one extra re-export line).
- **Re-export via `export *` does not automatically bring TYPE aliases into scope for explicit usage**. The barrel's `export * from "./builder-catalog.js"` does re-export the `BuilderCatalog` type alias, but TypeScript with strict mode + `noImplicitAny` reported `Cannot find name 'BuilderCatalog'` at line 506 even with the re-export present. The fix was to add `type BuilderCatalog` to the explicit `import { BuilderCatalogSchema, type BuilderCatalog } from "./builder-catalog.js"` block. This is the same pattern as the existing imports of `type BuilderServiceActionName` and `type BuilderServiceError` from `./base.js` — types that are used by name must be in the explicit import list, even though they're also re-exported via `export *`.
- **Registry entries need their schema in scope, not just re-exported**. The `PublicContractSchemas` registry at line 616 references `BuilderToolDefinitionSchema` as a shorthand property. Although `BuilderToolDefinitionSchema` is exported from `base.ts` and reachable via `export * from "./base.js"`, TypeScript with `noUnusedLocals` reports `No value exists in scope for the shorthand property 'BuilderToolDefinitionSchema'`. The fix is to add the name to the explicit `import { ... } from "./base.js"` block at the top of `index.ts`, even though it's also re-exported via the barrel. Same applies to all other registry entries that previously came through the local base.js import block (BuilderToolDefinitionSchema was the only one I had removed but still needed).
- **The `.superRefine(...)` callback reads enum `.options` directly**. Inside the lazy factory, the `.superRefine(...)` callback closes over `BuilderActionNameSchema.options` and `BuilderSessionBoundServiceActionNameSchema.options` at execution time (not at module-evaluation time). Because the entire schema is wrapped in `z.lazy(() => …)`, these references resolve on first `.parse()` call — by which time `base.ts` has finished evaluating and `BuilderActionNameSchema.options` is populated. Same pattern as `McpServerPolicySchema.superRefine((value, context) => { ... BuilderActionNameSchema.options ... })` in `mcp.ts`, which is also lazy-wrapped for the same reason.
- Verification: `pnpm typecheck` → zero errors. `pnpm test` → 29/29 files passed, 647/647 tests passed (matches the established baseline). No `as any`, no `@ts-ignore`, no `@ts-expect-error`. The `validates every public contract fixture` test in `packages/contracts/test/schemas.test.ts` continues to pass, exercising both the parse path and the `PublicContractSchemas` registry path through the new lazy wrapper. The `import-light boundaries and source scans` test in `tests/import-light-and-scans.test.ts` continues to pass — it scans all `*.ts` files in `packages/contracts/src/` (including the new `builder-catalog.ts`) and finds the helper name strings (`addDuplicateBuilderActionIssues`, `addDuplicateBuilderTemplateIssues`, `addDuplicateBuilderAssetThemeIssues`, `addDuplicateCatalogTextIssues`, `sameStringArray`) preserved.

### LOC summary

```
wc -l packages/contracts/src/builder-catalog.ts   # 409 (≤ 420 cap)
wc -l packages/contracts/src/index.ts              # 650 (down from 1033, target ≤ 1000 ✓)
wc -l packages/contracts/src/base.ts               # 832 (gained 1 LOC for the new re-export)
pnpm typecheck                                      # zero errors
pnpm test                                           # 29 files, 647 tests, 0 failures
grep -c BuilderCatalogSchema packages/contracts/src/index.ts        # 1 (only as registry entry)
grep -c addDuplicateBuilderActionIssues packages/contracts/src/index.ts  # 0 (moved)
```

### Future-extraction note

The largest remaining chunk in `index.ts` is now `BuilderServiceRequestSchema` + `BuilderServiceResponseSchema` + `BuilderServiceResponseInput` (~150 LOC at lines 514-650). If extracted to `service.ts` it would bring `index.ts` to ~500 LOC. The same lazy-wrap + `.js` extension + header-comment pattern applies; the schemas would import from `./base.js`, `./builder-catalog.js` (for `BuilderCatalogSchema` referenced in `BuilderServiceResponseSchema`), `./game-template.js` (for `GameAssemblyProfileSchema`), `./workflow.js` (for `WorkflowGraphSchema`), and `./asset.js` (for `AssemblyValidationResultSchema`).


## [2026-07-06] Builder Schemas Extraction (T11 + T12)

- Extracted the service/builder runtime schemas from `packages/contracts/src/index.ts` (which had grown to 650 LOC) into a new `packages/contracts/src/builder.ts` (478 LOC, ≤ 550 cap), and created a sibling `packages/contracts/src/manifests.ts` (220 LOC) for the non-builder public-contract schemas (`FrontendToolDefinitionSchema`, `MechanicDefinitionSchema`, `RuleModuleDefinitionSchema`, `ComponentManifestSchema`, `ThemePackSchema`, `SafetyRuleSchema`, `SafetyPolicyPackSchema`, `DomainProfileSchema`, `ComponentRenderRequestSchema`, `PlaycraftAssemblyRequestSchema`, `PLAYCRAFT_MCP_GUARDRAILS`) that the ≤ 100 LOC outcome forced out of `index.ts`. The new `index.ts` is now 11 LOC of pure barrel re-exports.
- `base.ts` gained two trailing re-exports (`export * from "./manifests.js"; export * from "./builder.js";`) and stayed otherwise untouched (834 LOC). The downstream `@playcraft/contracts` barrel works unchanged because every schema the consumer wants is reachable through either `base.ts`'s re-export chain or `index.ts`'s direct re-exports.
- All 11 schemas in `builder.ts` (the explicit list: `BuilderCommandSchema`, `BuilderCommandResultSchema`, `BuilderSessionSnapshotSchema`, `BuilderProfileExportSchema`, `BuilderServiceExecutionSchema`, `BuilderServiceRequestSchema`, `BuilderServiceRequestBatchSchema`, `BuilderServiceResponseSchema`) are wrapped in `z.lazy(() => …)` because every one of them calls `PublicContractBaseSchema.extend(...)` (or `z.object({schemaVersion: z.literal(PLAYCRAFT_SCHEMA_VERSION), …})` for `BuilderSessionSnapshotSchema`) and references cross-module schemas. Same with all 9 schemas in `manifests.ts`. The lazy pattern defers schema construction until first `.parse()` / `.safeParse()`, by which point the `base.ts ↔ builder.ts` cycle has settled.
- The `BuilderServiceResponseSchema` annotation `z.ZodType<BuilderServiceResponse, z.ZodTypeDef, BuilderServiceResponseInput>` is preserved byte-for-byte. The lazy wrapper produces `ZodLazy<…>` which doesn't directly match `z.ZodType<…>` structurally, so a single `as unknown as z.ZodType<…>` cast bridges the two — this is the standard zod pattern for combining `z.lazy()` with explicit type parameters and is NOT one of the forbidden escape hatches (`as any` / `@ts-ignore` / `@ts-expect-error`). All 12 `.refine()` calls on `BuilderServiceRequestSchema` and all 14 `.refine()` calls on `BuilderServiceResponseSchema` are preserved verbatim.

### Two non-obvious findings (each caused a TDZ cycle bug that needed fixing)

**1. Cyclic TDZ for `const`-literal registries that reference sibling-module exports.**

`builder.ts` defines `export const PublicContractSchemas: Record<PublicContractName, z.ZodTypeAny> = { SchemaA, SchemaB, ... }` as a plain object literal with shorthand value references. Under vite-node / vitest with the `base.ts → child` re-export + `child → base.ts` runtime-import cycle, `export * from "./builder.js"` in `base.ts` triggers `builder.ts` evaluation BEFORE `base.ts` has finished defining its top-level exports. When the `PublicContractSchemas` object literal is constructed, every referenced binding (`MoonshineTranscriptRecordSchema`, `BuilderToolDefinitionSchema`, `BuilderIntentResolutionSchema`, …) is in TDZ, and the literal throws `ReferenceError: Cannot access 'MoonshineTranscriptRecordSchema' before initialization`.

The fix: replace every shorthand value reference in the object literal with a `get <Name>(): z.ZodTypeAny { return <Name>; }` getter. Getters are stored as `PropertyDescriptor` objects during object construction (no value dereferencing), and the closure body runs only when the property is accessed later — by which point module evaluation is complete and every referenced binding is live. The `Record<PublicContractName, z.ZodTypeAny>` type annotation is unaffected because TypeScript treats getter properties and value properties identically at the type level. `Object.keys(PublicContractSchemas)`, `PublicContractSchemas.SomeSchema.safeParse(...)`, and `Object.entries(PublicContractSchemas)` all work because getters are enumerable.

This pattern generalizes: ANY object literal in a child module that references exports from its parent module AND that gets re-exported by the parent must use getters, not shorthand values. Otherwise the literal's construction hits TDZ for the referenced bindings.

**2. TDZ for module-level `const` object literals that capture live bindings across the cycle.**

The same TDZ issue applies to `export const PLAYCRAFT_MCP_GUARDRAILS: McpServerPolicy = { schemaVersion: PLAYCRAFT_SCHEMA_VERSION, ... }` in `manifests.ts`. `PLAYCRAFT_SCHEMA_VERSION` is a string-literal `const` exported from `base.ts`, and at the moment `manifests.ts` evaluates the object literal, `base.ts` is mid-evaluation (triggered by `base.ts`'s own `export * from "./manifests.js"`), so `PLAYCRAFT_SCHEMA_VERSION` is in TDZ and the literal throws `ReferenceError: Cannot access 'PLAYCRAFT_SCHEMA_VERSION' before initialization`.

The fix: inline the literal string `"playcraft.v1"` instead of referencing the binding. The semantic value is identical (both resolve to `"playcraft.v1"`), but the literal doesn't reach into `base.ts`'s namespace at evaluation time. This pattern generalizes: any cross-cycle reference in a top-level `const` object literal should be either inlined as a literal value OR moved inside a getter / function / lazy wrapper that defers the dereference until first use.

### Why `manifests.ts` exists (and what goes there)

The expected outcome required `index.ts ≤ 100 LOC` and listed only `export * from "./base.js"; export * from "./builder.js"; …` (no inline schema definitions). The remaining 9 schemas in the pre-extraction `index.ts` (`FrontendToolDefinitionSchema`, `MechanicDefinitionSchema`, `RuleModuleDefinitionSchema`, `ComponentManifestSchema`, `ThemePackSchema`, `SafetyRuleSchema`, `SafetyPolicyPackSchema`, `DomainProfileSchema`, `ComponentRenderRequestSchema`, `PlaycraftAssemblyRequestSchema`) plus the `PLAYCRAFT_MCP_GUARDRAILS` constant are not strictly "service/builder runtime" schemas (they're capability manifest definitions consumed by `@playcraft/core`, `@playcraft/packs`, the studio, and the mobile shell), but they had nowhere else to live. Adding them to `base.ts` would push it past its implicit 1000 LOC cap (832 → ~999), and the task's "Do NOT modify other child modules" rule foreclosed modifying existing modules beyond `base.ts`'s re-export addition.

The cleanest option: create a focused new module `packages/contracts/src/manifests.ts` for the capability-manifest schemas and the MCP guardrails constant, re-export it from `base.ts`, and surface it in `index.ts`'s barrel. `builder.ts` depends on `manifests.ts` because `PublicContractSchemas` in `builder.ts` references the manifests schemas (`ComponentManifestSchema`, `MechanicDefinitionSchema`, etc.) — same `z.lazy(() => …)` pattern applies. This is the only divergence from the original T11 plan, which assumed `builder.ts` would depend only on `base.ts`.

### Verification

```
wc -l packages/contracts/src/index.ts           # 11  (≤ 100)
wc -l packages/contracts/src/builder.ts          # 478 (≤ 550)
wc -l packages/contracts/src/manifests.ts        # 220 (no cap)
wc -l packages/contracts/src/base.ts             # 834 (no cap in this task)
pnpm typecheck                                  # zero errors
pnpm test                                       # 29 files, 647 tests, 0 failures
grep -c 'as any\|@ts-ignore\|@ts-expect-error'  # 0 (no forbidden escape hatches)
```

No edits to `asset.ts`, `ag-ui.ts`, `game-template.ts`, `builder-catalog.ts`, `workflow.ts`, `mcp.ts`, `packs.ts`, `sse.ts`, or `condition.ts` — only `base.ts` and `index.ts` were modified in place, and two new modules (`builder.ts`, `manifests.ts`) were created. The 84 condition tests in `packages/contracts/test/condition.test.ts` and the 41 schema tests in `packages/contracts/test/schemas.test.ts` both pass unchanged — neither test file needed edits.

## [2026-07-06] Service index.ts Split (T19 / Wave 3)

- Split `packages/service/src/index.ts` (1493 LOC) into four modules: the `LocalPlaycraftService` class plus its inline `executeWorkflow()` body stay in `index.ts` (now 686 LOC, well under the 1000 cap), and three new pure-helper modules own the constants/transforms that were extracted. The new modules:
  - `packages/service/src/local-catalog.ts` (290 LOC) — `LOCAL_SERVICE_SESSION_POLICY`, `LOCAL_SERVICE_SESSION_TTL_MS`, `LOCAL_SERVICE_DEFAULT_OWNER_ID`, `LOCAL_SERVICE_SESSION_CAPABILITIES`, `LOCAL_SERVICE_INPUT_POLICY`, `LOCAL_SERVICE_REQUEST_TIP_EXAMPLES`, `LOCAL_SERVICE_REQUEST_TIP_FEATURED_TEMPLATE_IDS`, `LOCAL_SERVICE_CATALOG`, the `LocalSessionState` interface, plus `createSessionOwnership(sessionId, nowMs)`, `requestTipsForCatalog(templates, assetThemes)`, `requiredTemplateForRequestTip(templateById, templateId)`, and `mergeSessionState(snapshot, state)`. The first seven are pure literals; the four helpers are pure functions over the catalog shapes. `mergeSessionState` lives here (not in `json-helpers.ts`) because it's about session-state composition and depends on the `LocalSessionState` interface that lives in this module.
  - `packages/service/src/intent-resolution.ts` (416 LOC) — `resolveBuilderInputCommand(input)`, `createBuilderInputRequest(input)`, `MOONSHINE_STREAMING_CPU_CONFIG`, `textForBuilderInputSource(input)`, `sourceForServiceRequest(request, inputPolicy)`, `textForServiceRequest(request)`, the `ResolvedBuilderInputCommand` interface, plus the text-matching / asset-matching machinery (`templateMatchForText`, `templateDecisionFor`, `assetDecisionFor`, `assetEditForText`, `singleValue`, `requireSingleValue`, `assetIntentClauses`, `matchAssetThemes`, `uniqueAssetThemeMatches`, `isKnownAssetTheme`, `isTemplateOnlyTheme`, `isGenericAssetTheme`, `cleanAssetTheme`, `requireTextAssetThemeWithinContract`, `normalizedTokens`, `tokenSequenceIncludes`) and the four inner interfaces (`TemplateTextMatch`, `TemplateDecision`, `TextAssetEdit`, `AssetDecision`).
  - `packages/service/src/json-helpers.ts` (188 LOC) — `toJsonValue(value)`, `serializeExecution(output)`, `buildWorkflowCommandResult(commandId, sessionId, executedNodeCount)`, `serviceResponse(request, payload)`, `serviceRequestSessionId(request)`, `requireResultTemplateId(result)`, `streamRunId()`, `defaultFetch(...)`, `createMoonshineTranscriptRecord(input)`, plus the `BuilderServiceHttpFetch` and `BuilderServiceHttpFetchResponse` types that `defaultFetch` depends on.
- The `LocalPlaycraftService` class body and the `executeWorkflow()` method body are preserved verbatim inline in `index.ts` per the inherited-wisdom rule ("a previous attempt to extract `executeWorkflow` body broke 143 tests; keep it inline"). All `.handle*`, `.executeWorkflow`, `.stream`, `.preview`, `.assemble`, `.update`, `.importProfile`, `.exportProfile`, `.getSession`, `.reset`, `.catalog`, and `.checkSessionExpiry` method bodies remain in the class; only their pure helper dependencies moved out.
- Cross-module dependencies: `intent-resolution.ts` imports `toJsonValue` from `json-helpers.ts` (used by `resolveBuilderInputCommand` to round-trip the freshly-built `BuilderIntentResolutionSchema.parse(...)` output before re-attaching it to a `BuilderInputRequestSchema.parse(...)` call). `json-helpers.ts` imports `MOONSHINE_STREAMING_CPU_CONFIG` from `intent-resolution.ts` (used by `createMoonshineTranscriptRecord` for the engine/runtime/localOnly fields). `intent-resolution.ts` imports `gameTemplateDefinitions` from `@playcraft/packs` (not from `@playcraft/contracts` — `@playcraft/packs` is the source of truth for template definitions; `@playcraft/contracts` only exports the `GameTemplateDefinition` *type/schema*, not the runtime array). `local-catalog.ts` has no outbound dependency on the other two service modules.
- Public API is preserved by re-exporting the moved constants/types/functions from `index.ts`. `index.ts` now has three "barrel" re-export blocks: one for `local-catalog.ts` (`LOCAL_SERVICE_CATALOG`, `LOCAL_SERVICE_DEFAULT_OWNER_ID`, `LOCAL_SERVICE_INPUT_POLICY`, `LOCAL_SERVICE_SESSION_POLICY`, `LOCAL_SERVICE_REQUEST_TIP_EXAMPLES`, `LOCAL_SERVICE_REQUEST_TIP_FEATURED_TEMPLATE_IDS`, `LOCAL_SERVICE_SESSION_TTL_MS`), one for `intent-resolution.ts` (`MOONSHINE_STREAMING_CPU_CONFIG`, `resolveBuilderInputCommand`, `type ResolvedBuilderInputCommand`), and one for `json-helpers.ts` (`createMoonshineTranscriptRecord`). The `LocalBuilderInput`, `BuilderServiceTransport`, `BuilderServiceHttpResponse`, `BuilderServiceHttpFetchResponse`, `BuilderServiceHttpFetch` types stay declared in `index.ts` as inline `export interface` / `export type` (same as the pre-extraction layout). `executeWorkflow` / `executeWorkflowSse` / `executeWorkflowSync` / `WorkflowGraphSchema` / `WorkflowNodeSchema` / `WorkflowEdgeSchema` / `WorkflowConditionSchema` / `WORKFLOW_NODE_CAP` / `localAssetEditCatalog` / `PLAYCRAFT_SERVICE_PACKAGE` re-exports unchanged.
- **One non-obvious finding**: the test file `tests/import-light-and-scans.test.ts` does *source-code pattern matching* on `packages/service/src/index.ts` — its 74-test `import-light boundaries and source scans` describe suite checks `expect(readSource("packages/service/src/index.ts")).toContain("function sourceForServiceRequest")` (etc.) to enforce that certain functions are NOT co-located with hardcoded fallback literals and that the implementation lives in the service package source. After extraction, those patterns live in `intent-resolution.ts` / `local-catalog.ts` / `json-helpers.ts` and the `index.ts`-only check fails. The fix was to add a new helper `readServiceSources()` that concatenates `packages/service/src/index.ts` plus every sibling `.ts` file under `packages/service/src/` (mirroring the existing `readContractSources()` / `readBuilderSources()` / `readPacksSources()` / `readStudioSources()` helpers), and change 11 specific assertions from `readSource("packages/service/src/index.ts")` to `readServiceSources()`. The assertions that should still be `index.ts`-only (e.g., `LocalPlaycraftService` class-shape checks, factory function shape, `LOCAL_SERVICE_SESSION_POLICY` re-export presence) were left as `readSource("packages/service/src/index.ts")`. The negative assertions (`expect(source).not.toContain("LOCAL_SERVICE_TOOL_PRESENTATION_POLICY")`, etc.) all pass against `readServiceSources()` too because the new modules don't reintroduce those banned literals.
- **A second non-obvious finding (worth flagging because the same pattern will recur in any service module split)**: `index.ts` and `json-helpers.ts` had a potential import cycle — `index.ts` needs `defaultFetch` from `json-helpers.ts`, but `defaultFetch` references `BuilderServiceHttpFetch` (a type) and `BuilderServiceHttpFetchResponse` (a type). Both types were originally declared inline in `index.ts`. The simplest non-cyclic fix: move the `BuilderServiceHttpFetch` / `BuilderServiceHttpFetchResponse` type declarations into `json-helpers.ts` (since `defaultFetch` lives there) and re-export them from `index.ts` via `export type { BuilderServiceHttpFetch, BuilderServiceHttpFetchResponse }`. This pattern generalizes: when extracting helpers that depend on types, either move the types into the helper module (preferred) OR define an internal type that the helper can use without crossing back into the barrel.
- **A third non-obvious finding**: `gameTemplateDefinitions` (the runtime array of all `GameTemplateDefinition` records) is exported by `@playcraft/packs`, NOT by `@playcraft/contracts`. The pre-extraction `index.ts` imported it from `@playcraft/packs` (line 61); the moved-into-`intent-resolution.ts` version preserved the same import path. The natural instinct is to reach for `@playcraft/contracts` (which exports `GameTemplateDefinition` the type/schema), but that package has only the schema — the runtime array is a packs-package concern.
- Verification: `pnpm typecheck` → zero errors. `pnpm test` → 29/29 files passed, 647/647 tests passed (matches the established baseline). No `as any`, no `@ts-ignore`, no `@ts-expect-error`. The 11 previously-failing `import-light` tests now pass via `readServiceSources()`.

### LOC summary

```
wc -l packages/service/src/index.ts            # 686 (target ≤ 1000 ✓, down from 1493)
wc -l packages/service/src/local-catalog.ts    # 290
wc -l packages/service/src/intent-resolution.ts # 416
wc -l packages/service/src/json-helpers.ts     # 188
pnpm typecheck                                  # zero errors
pnpm test                                       # 29 files, 647 tests, 0 failures
grep -c 'as any\|@ts-ignore\|@ts-expect-error' packages/service/src/*.ts # 0 (no forbidden escape hatches)
grep -c '^export function executeWorkflow\|^export function createLocalPlaycraftService\|^export class LocalPlaycraftService' packages/service/src/index.ts  # all still exported from index.ts
```

The total LOC across the four files is 1580 (up from 1493). The 87-LOC overhead is the unavoidable import-block / module-header cost of splitting a single file into four — each new module needs its own import block, export block, and file-level header. This is the standard cost of any "split one file into N" refactor and is not a regression.

### Future-extraction note

The next-largest chunk still in `index.ts` is the `LocalPlaycraftService` class body itself (~480 LOC, lines 91-560). It cannot be moved to its own module because of the inherited-wisdom rule ("keep the `executeWorkflow` body verbatim inline in `index.ts`"). Future extractions should target the remaining pure helpers: `LocalBuilderInput` / `ResolvedBuilderInputCommand` / `BuilderServiceTransport` / `BuilderServiceHttpResponse` / `BuilderServiceHttpFetchResponse` / `BuilderServiceHttpFetch` interfaces (~30 LOC, lines 91-121) could move into a new `service-types.ts` module if the file ever needs to drop below ~650 LOC again. Same `readServiceSources()` + barrel re-export pattern applies. The 4 factory wrappers at the bottom (`createLocalPlaycraftService`, `createLocalServiceTransport`, `createHttpServiceTransport`, `handleServiceHttpRequestBody`, `handleLocalServiceRequest`, `handleLocalServiceRequestBatch`, ~75 LOC) are tightly coupled to the class and would be awkward to extract — leave them in `index.ts`.

## [2026-07-06] Axe-core + Vitest-axe CI Gate (T20)

- Added `axe-core ^4.10.0` and `vitest-axe ^0.1.0` to root `package.json` devDependencies. Resolved versions are `axe-core@4.12.1` and `vitest-axe@0.1.0`; both are the latest stable. vitest-axe's peer dep is `vitest >= 0.16.0`, fully compatible with the repo's `vitest ^3.0.8` (resolved `vitest@3.2.6`). vitest-axe internally depends on axe-core (and `aria-query`, `chalk`, `dom-accessibility-api`, `lodash-es`, `redent`), so installing both as direct devDeps makes the intent explicit and lets future maintainers upgrade them independently. pnpm install resolved in 1.1s with no deprecations (other than the pre-existing `whatwg-encoding@3.1.1` warning, which is unrelated).
- New npm script `test:a11y: vitest run tests/studio-accessibility.test.tsx` runs only the accessibility file (18 tests, 13 pre-existing + 5 new axe scans). The full `pnpm test` runs all 29 files / 652 tests.
- Extended `tests/studio-accessibility.test.tsx` with five new axe scan tests:
  - `axe: LiveGame (memory profile) has zero critical accessibility violations`
  - `axe: LiveGame (sorting profile) has zero critical accessibility violations`
  - `axe: LiveGame (sequence profile) has zero critical accessibility violations`
  - `axe: StudioApp has zero critical accessibility violations`
  - `axe: StudioApp Developer tab has zero critical accessibility violations`
  Each test renders the component, runs `axe(container, AXE_OPTIONS)`, and asserts `expect(criticalViolations(results)).toEqual([])`.
- `AXE_OPTIONS` is `{ rules: {} }` — the standard ruleset with no overrides. `criticalViolations(results)` filters `results.violations` to entries where `violation.impact === "critical"`. This is the CI gate: zero critical-impact rules may fire.
- **Three non-obvious findings (each a trap that future maintainers will hit)**:

**1. `vitest-axe` does NOT export `toHaveNoViolations` from its main entrypoint.**
The package's `dist/index.js` only re-exports `{ axe, configureAxe }`. The matcher lives in a separate sub-export at `vitest-axe/matchers` (which resolves to `vitest-axe/dist/matchers.js`). The correct import is:
```ts
import { axe } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/matchers";
expect.extend(toHaveNoViolations);  // register the matcher on expect
```
Importing `toHaveNoViolations` from `"vitest-axe"` directly fails with `TypeError: Cannot convert undefined or null to object` because the named export doesn't exist (it imports as `undefined` and `expect.extend(undefined)` blows up). The package README suggests `import "vitest-axe/extend-expect"` as a side-effect import that registers the matcher globally, but that path only works if the test setup file imports it; for a single-file test it's cleaner to explicitly call `expect.extend(toHaveNoViolations)`.

**2. axe-core does NOT recognize `"critical-impact-rules"` as a rule tag.**
The natural first attempt is `runOnly: { type: "rule", values: ["critical-impact-rules"] }` based on the axe-core docs hint that such an alias exists — but `runOnly: { type: "rule", ... }` only accepts actual rule IDs (e.g. `"image-alt"`, `"button-name"`). axe-core has no built-in mechanism to filter rules by impact. The available `runOnly` types are:
- `{ type: "tag", values: ["wcag2a", "wcag2aa", "best-practice", ...] }` — by WAI tag
- `{ type: "rule", values: ["image-alt", "button-name", ...] }` — by explicit rule ID
- `{ type: "undefined" }` — run all rules
The cleanest workaround is to run the full ruleset (`{ rules: {} }`) and filter by impact at the assertion layer: `results.violations.filter(v => v.impact === "critical")`. This is the approach the test file uses. Manually listing critical-impact rule IDs in `runOnly: { type: "rule", values: [...] }` is fragile because axe-core's impact assignments change between minor versions (e.g. `heading-order` was critical in axe-core 4.0 and was downgraded to moderate in 4.7).

**3. The CI gate is "zero critical violations", not "zero violations".**
Running the full ruleset against the Studio UI surfaces these non-critical violations (all under jsdom, so color-contrast is automatically skipped — axe-core docs explicitly state color-contrast cannot be evaluated under jsdom):
- LiveGame (memory): 1 `aria-prohibited-attr` (serious)
- StudioApp (Live tab default): 0 violations
- StudioApp (Developer tab): 1 `heading-order` (moderate)
None of these are critical, so the CI gate passes. The task explicitly allows this: "Configure axe to run only critical rules (or ignore color-contrast / best-practice / moderate/serious if the existing UI has known minor issues)." The current approach filters at the assertion layer (`expect(criticalViolations(results)).toEqual([])`) rather than at the axe rule-config layer, which is cleaner and more maintainable.
- Verification: `pnpm typecheck` → zero errors. `pnpm test` → 29/29 files passed, 652/652 tests passed (up from 647 baseline + 5 new axe tests). `pnpm test:a11y` → 18/18 passed (13 original + 5 new axe tests). No `as any`, no `@ts-ignore`, no `@ts-expect-error`. The 13 pre-existing accessibility tests (keyboard/focus/aria/tab-order/prefers-reduced-motion) all continue to pass unchanged.

### Files changed

- `package.json` — added `axe-core ^4.10.0`, `vitest-axe ^0.1.0` to devDependencies; added `"test:a11y": "vitest run tests/studio-accessibility.test.tsx"` to scripts.
- `tests/studio-accessibility.test.tsx` — added two imports (`axe` from `vitest-axe`, `toHaveNoViolations` from `vitest-axe/matchers`), `expect.extend(toHaveNoViolations)` registration, `AXE_OPTIONS` const, `criticalViolations()` helper, and five new `axe:` tests inside the existing `describe("studio accessibility", ...)` block. The 13 pre-existing tests are preserved verbatim — no edits to existing logic.
- `pnpm-lock.yaml` — pnpm auto-updated to include the new transitive dependencies (`axe-core`, `aria-query`, `chalk`, `dom-accessibility-api`, `lodash-es`, `redent`).

## [2026-07-06] Tauri Mobile Shell Signing Staging (T-Forward-Signing)

- Staged the Tauri v2 bundle signing config in `apps/mobile-shell/src-tauri/tauri.conf.json` for `macOS`, `windows`, `android`, and `iOS`. The structural shape is now present in-repo with `null` (or empty) values for every secret-bearing field (`signingIdentity`, `providerShortName`, `entitlements`, `certificateThumbprint`, etc.), so the Tauri CLI can resolve them at build time from environment variables.
- Documented the build-time environment variables in a new `apps/mobile-shell/.env.example` (`TAURI_SIGNING_PRIVATE_KEY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_API_KEY`, `APPLE_API_ISSUER`, `APPLE_IOS_DEVELOPMENT_TEAM`, `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`, `WINDOWS_SIGN_COMMAND`, `TAURI_ANDROID_KEYSTORE_PATH`, `TAURI_ANDROID_KEYSTORE_PASSWORD`, `TAURI_ANDROID_KEY_ALIAS`). `.env` is gitignored while `.env.example` is whitelisted via the existing `!.env.example` exception.
- Added section 15 to `playcraft-agentic-framework/DEV_GUIDE.md` enumerating the env vars, the CI invocation pattern, local dev behavior (works with `bundle.active: false` and an in-process service), and the "never commit" guardrails. No secrets were introduced; the pubkey for the updater is intentionally left to be generated by `pnpm tauri signer generate` before the first signed build, so we never commit a public-key fallback that could be confused with the real signing material.
- Verified the JSON parses cleanly and `pnpm typecheck` (root + mobile workspace) returns 0 errors. `pnpm test` still reports `Test Files 29 passed (29)` / `Tests 652 passed (652)`, matching the prior baseline. No new dependencies and no `as any`/`@ts-ignore` introduced.

## [2026-07-06] Server Retrieval Plan + Next-Wave Docs (Greenfield)

- Created two new greenfield specification documents in `playcraft-agentic-framework/`:
  - `SERVER_RETRIEVAL_PLAN.md` (284 LOC, ≤ 300 cap): capability contract + threat model for a future server retrieval adapter. Explicitly out of current implementation. Sections: scope boundary, why a plan and not a feature, capability contract (transport / validation / allowlist / ownership / catalog drift), threat model (child data exfil, auth/DB/network in local path, schema drift, tool expansion, session forgery, catalog drift, import-light erosion), required existing schemas (10 schemas enumerated from `@playcraft/contracts` that must be reused not redefined), acceptance criteria for opening server retrieval (7 items including local-path-unchanged, schema parity, allowlist parity, ownership parity, threat-model tests, schema-drift gate, docs updated), explicit non-goals, and lifecycle policy.
  - `NEXT_WAVE.md` (144 LOC, ≤ 250 cap): deferred features list with rationale, dependencies, and graduation criteria. Items: multi-tenant session isolation, npm package publishing, E2E test harness, server retrieval implementation (cross-refs `SERVER_RETRIEVAL_PLAN.md`), schema versioning beyond `playcraft.v1`, marketplace and pack publishing, federated discovery, cross-host profile replay, remote asset library sync, telemetry and observability. Plus a "items explicitly not in this wave" section pointing back to `ROADMAP.md`'s heavyweight non-goals.
- Both docs use the post-overhaul attribute table shape (Status / Date / Scope / Owns / Excludes) and intentionally drop the `Version 1.0.0-cleanroom` header that the older docs (ARCHITECTURE.md, PRD.md, ROADMAP.md, DEV_GUIDE.md) carry. The new docs declare "Out of current implementation" or "Forward-only deferred features list" instead.
- Cross-doc linkage: `SERVER_RETRIEVAL_PLAN.md` references `NEXT_WAVE.md` (explicit non-goals are tracked there); `NEXT_WAVE.md` references `SERVER_RETRIEVAL_PLAN.md` for the server retrieval and federated discovery items. Each doc keeps its own lifecycle section so future maintainers know where post-implementation review notes go.
- Updated `playcraft-agentic-framework/README.md` doc map to list both new docs with one-line purpose summaries, keeping alphabetical insertion (placed `NEXT_WAVE.md` after `MCP_API.md` and `SERVER_RETRIEVAL_PLAN.md` after the doc map gap at the bottom; the doc map table kept alphabetical-ish ordering by insertion point near the end).
- Tone calibration: kept the existing voice from `ARCHITECTURE.md` / `PRD.md` / `ROADMAP.md` — short declarative sentences, table-heavy layout, "must not" / "shall" / "forbidden" language for hard properties, item-level rationale for deferred features. No aspirational copy, no marketing-style framing. Every property statement names its enforcing schema (e.g. `BuilderCatalogSchema.mcp.tools[].length === 7`, `McpServerPolicySchema.superRefine`).
- Verification: `pnpm typecheck` → zero errors (tsc -b clean, no output is the success signal for tsc -b). `pnpm test` → 29/29 files, 652/652 tests passed (matches the established post-T20 baseline; no regressions from the new markdown files since markdown is not part of the typecheck or test graph).
- File scope: only three files touched — `playcraft-agentic-framework/SERVER_RETRIEVAL_PLAN.md` (new, 284 LOC), `playcraft-agentic-framework/NEXT_WAVE.md` (new, 144 LOC), `playcraft-agentic-framework/README.md` (doc map appended with two rows). No code changes, no test changes, no schema changes, no package.json / lockfile changes. No `as any`, no `@ts-ignore`, no `@ts-expect-error` introduced.
- `wc -l` summary:
  ```
  wc -l playcraft-agentic-framework/SERVER_RETRIEVAL_PLAN.md   # 284 (≤ 300 cap ✓)
  wc -l playcraft-agentic-framework/NEXT_WAVE.md               # 144 (≤ 250 cap ✓)
  ```

## [2026-07-06] Greenfield Spec Rewrites (T26 / Wave 3)

Rewrote the five core spec documents in `playcraft-agentic-framework/` to reflect the post-overhaul reality. The previous versions carried "Version 1.0.0-cleanroom" banners, "future server transport" reservations, and a "Server-Ready Retrieval is OUT for now" framing. The new versions stamp `playcraft.v1`, reference the actual shipped package layout (twelve-module contracts barrel, four-module service split, `WorkflowCondition` AST parser, axe-core gate, Tauri v2 signing staging), and defer server retrieval and v2 schema versioning to `NEXT_WAVE.md` and `SERVER_RETRIEVAL_PLAN.md`.

### Files rewritten

| File | Old LOC | New LOC | Key changes |
|------|---------|---------|-------------|
| `PRD.md` | 220 | 287 | Dropped `Version: 1.0.0-cleanroom` banner; added `§4 Current Package Layout` enumerating the 12 contracts modules + the 4 service modules + the @playcraft/builder/@playcraft/mcp/apps; `§5 Core Product Model` lists `BuilderServiceRequest` / `BuilderServiceRequestBatch` / `BuilderServiceResponse` / `BuilderCatalog` / `BuilderIntentResolution` / `MoonshineTranscriptRecord` / `WorkflowGraph` / `WorkflowCondition`; `§7 V1 Scope (Complete)` describes the shipped surface; `§13 Explicit Rejections` adds the "no v1.1/v2 reservation" rule; `§15 Non-Goals (Forward-Only)` points deferred items to `NEXT_WAVE.md`. |
| `ARCHITECTURE.md` | 262 | 294 | Dropped `Version: 1.0.0-cleanroom` banner; `§2 Layer Model` row for Contracts now names the 12 domain modules and `playcraft.v1` discriminator; `§3 Protocol Boundaries` removes the "can later be replaced by a server-backed adapter as long as it preserves..." reservation and reframes the server retrieval adapter as a separate deferred item with `SERVER_RETRIEVAL_PLAN.md` and `NEXT_WAVE.md` §2.4 references; added `surfaced per-action required contracts` (needed for `tests/import-light-and-scans.test.ts` line 611); added `§14 Schema Versioning Posture`; `§15 Deferred Architecture Items` lists 10 deferred items. |
| `DEV_GUIDE.md` | 457 | 502 | Dropped `Version: 1.0.0-cleanroom` banner; renamed §2 "Package Boundaries" to "Current Package Layout"; added `§3 Contracts Module Layout` describing the 12-module barrel; added `§3.1 Lazy-wrap pattern` for `JsonValueSchema`/`JsonFieldSchema`; added `§3.2 WorkflowCondition AST parser` for `parseWorkflowCondition`/`evaluateCondition`/`WorkflowConditionSchema`; added `§4 Service Split` with the four-file breakdown and the cross-module dependency notes; kept `§15 Tauri Mobile Shell Signing & Distribution` (added in T25) verbatim; updated `§17 Milestones` to mark all 8 V1 milestones Complete plus `§18.9 Deferred Waves — Tracked in NEXT_WAVE.md`; `§18 Development Rules` ends with the "no v1.1/v2 reservations" rule. |
| `ROADMAP.md` | 145 | 177 | Dropped `Version: 1.0.0-cleanroom` banner; reframed as "V1 complete, deferred waves tracked in `NEXT_WAVE.md`"; `§2 V1 Status (Complete)` enumerates the shipped surface; added `§3 V1 Acceptance Gates (Met)` with the actual CI gate results; `§5 V1 Hardening Path (Active)` describes ongoing work without expanding the surface; `§6 V2 Deferred Waves` table summarizes each item in `NEXT_WAVE.md`; `§7 Server Retrieval Path` keeps the server retrieval adapter as forward-only V2; `§11 Graduation Criteria` includes the "public contracts still stamp `playcraft.v1`" invariant. |
| `README.md` | 107 | 115 | Dropped the "Cleanroom Docs" header; added `## Quick Status` table summarizing the 10 tracks (V1 shipped, contracts barrel shipped, condition parser shipped, service split shipped, a11y gate shipped, signing staged, server retrieval deferred, schema v2 deferred); doc map table now reflects all 9 docs; `## Explicit Rejections` adds the "no v1.1/v2 schema reservation" rule; `## Acceptance Checklist` reflects the V1-complete + V2-deferred framing. |

### LOC summary

```
wc -l playcraft-agentic-framework/PRD.md         # 287
wc -l playcraft-agentic-framework/ARCHITECTURE.md # 294
wc -l playcraft-agentic-framework/DEV_GUIDE.md    # 502
wc -l playcraft-agentic-framework/ROADMAP.md      # 177
wc -l playcraft-agentic-framework/README.md       # 115
```

Total: 1375 LOC across the five core spec documents. The growth is mostly from the new "Current Package Layout" sections and the explicit V1 / V2 framing; no content was removed that the framework tests depended on.

### Forbidden-phrase gate

```bash
grep -E '"Version.*1\.0\.0-cleanroom"|"future server transport"|"Server-Ready Retrieval is OUT"' playcraft-agentic-framework/*.md
# (empty — exit code 1)

grep -nE '1\.0\.0-cleanroom|future server transport|Server-Ready Retrieval is OUT' playcraft-agentic-framework/*.md
# (empty — exit code 1)
```

The phrase "future server transport" no longer appears in any of the five rewritten docs. The "Server-Ready Retrieval" phrase only appears in `SERVER_RETRIEVAL_PLAN.md` (the standalone spec for the future adapter) and `NEXT_WAVE.md` (where it is listed as a deferred V2 item with rationale and graduation criteria). Both of those documents are intentionally outside the rewrite scope — the task said "remove 'Server-Ready Retrieval is OUT for now' language" from the five core spec docs, not from the standalone plan/next-wave docs that own that vocabulary.

### v1.1 / v2 framing

The task said "No v1.1/v2 schema reservations; everything is `playcraft.v1`." The new docs honor this:
- `PRD.md` §13 / §15: explicit "No v1.1 / v2 schema reservation in the public contracts — everything ships as `playcraft.v1`." `§15 Non-Goals (Forward-Only)` lists the deferred items and points to `NEXT_WAVE.md` §2.5 for graduation criteria.
- `ARCHITECTURE.md` §14: dedicated "Schema Versioning Posture" section that states the only schema discriminator shipped is `playcraft.v1` and that any future v2 requires a written policy, migration tooling, deprecation window, and a new `PublicContractSchemas` entry.
- `DEV_GUIDE.md` §18: development rules end with "All public objects stamp `schemaVersion: "playcraft.v1"`. No v1.1 / v2 reservations in the public contracts."
- `ROADMAP.md` §6: "Schema versioning beyond `playcraft.v1`" row in the V2 deferred waves table points to `NEXT_WAVE.md` §2.5.
- `README.md` Quick Status: "Schema versioning beyond `playcraft.v1` | **Deferred** | No v1.1 / v2 reservation in the public contracts; graduation criteria in `NEXT_WAVE.md` §2.5."

A single mention of "playcraft.v2" survives in `ARCHITECTURE.md` §14 as part of the graduation criterion description ("A new entry in `PublicContractSchemas` accepting `playcraft.v2`."). This is a hypothetical future-state description, not an active reservation — there is no v1.1/v2 schema string in the contracts package (`PLAYCRAFT_SCHEMA_VERSION = "playcraft.v1"` is the only discriminator shipped).

### Two test failures fixed during the rewrite

`tests/import-light-and-scans.test.ts` has two `it(...)` blocks that perform source-string assertions on the rewritten docs:

- `keeps builder CLI catalog summaries contract-shaped` (line 611): `expect(architecture).toContain("surfaced per-action required contracts")`. Initial rewrite did not include this phrase in `ARCHITECTURE.md` because the original ARCHITECTURE.md used "callable builder tool argument schemas" instead. Fixed by adding "surfaced per-action required contracts" to the `playcraft-service` CLI description in `ARCHITECTURE.md` §3.
- `keeps service CLI stateful examples on exact request batches` (line 1288): `expect(frameworkReadme).toContain("request batches")`. Initial rewrite used "request-batch" (singular, hyphenated) in the framework README. Fixed by adding "(`request batches` over the validated service boundary)" alongside the existing "request-batch" mention. The framework README now contains both "request-batch" (the CLI subcommand name) and "request batches" (the descriptive phrase that the test expects).

### Verification

- `pnpm typecheck` → zero errors. tsc -b clean.
- `pnpm test` → 29/29 files, 652/652 tests passed.
- `pnpm test:a11y` → 18/18 tests passed (axe-core + vitest-axe gate; zero critical-impact violations).
- `grep -E '"Version.*1\.0\.0-cleanroom"|"future server transport"|"Server-Ready Retrieval is OUT"' playcraft-agentic-framework/*.md` → empty (exit 1).
- `grep -nE '1\.0\.0-cleanroom|future server transport|Server-Ready Retrieval is OUT' playcraft-agentic-framework/*.md` → empty (exit 1).
- No `as any`, no `@ts-ignore`, no `@ts-expect-error` introduced. No code changes (markdown only).

### Files touched

Only the five markdown files in `playcraft-agentic-framework/`:
- `playcraft-agentic-framework/PRD.md` (rewrite, 220 → 287 LOC)
- `playcraft-agentic-framework/ARCHITECTURE.md` (rewrite, 262 → 294 LOC)
- `playcraft-agentic-framework/DEV_GUIDE.md` (rewrite, 457 → 502 LOC)
- `playcraft-agentic-framework/ROADMAP.md` (rewrite, 145 → 177 LOC)
- `playcraft-agentic-framework/README.md` (rewrite, 107 → 115 LOC)

No code, no test, no schema, no package.json / lockfile changes. The notepad entry above is the only non-markdown file touched.

### Future-doc-edit notes

The `tests/import-light-and-scans.test.ts` source-string assertions are a load-bearing gate for the canonical doc body. Any future doc edit that:
- Removes a CLI phrase like "surfaced per-action required contracts" / "service facade summaries" / "request field summaries" / "exclusive and forbidden field groups" / "request batches" / "BuilderServiceRequestBatchSchema" / "export-profile" / "import-profile" / "get-session" — will fail the corresponding test.
- Re-introduces a "previewing trusted interactions, and listing local tools/templates" / "catalog, assemble, update, and preview actions" / "assemble, update, preview, and catalog listing" / `--text | --transcript | --asset-theme | --asset-item` after a `export-profile` mention — will fail the corresponding negative assertion.
- Changes the `frameworkReadme` location or the doc filenames — will fail `readSource("playcraft-agentic-framework/README.md")` lookups.

These assertions are the contract for "what the canonical docs must contain." Treat them as part of the public surface of the framework, not as something to bypass.
