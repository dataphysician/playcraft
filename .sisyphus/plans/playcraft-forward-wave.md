# Playcraft Forward-Only Wave — Heuristic Cleanup, God-File Dismantling, E2E Harness, Remote-Assembly Prep

## TL;DR

> **Quick Summary**: Implement the code-only, guardrail-safe gaps from the previous overhaul audit. Replace remaining narrow heuristics with typed ASTs/contracts, dismantle any remaining god files, add a Playwright E2E harness, and prepare the contract boundary for a future remote AI-agent self-assembly package — all without migration code, backwards compatibility, auth/db/network, or v1.1/v2 schema changes.
>
> **Deliverables**:
> - Core planner scoring → typed `RecipeScore` AST
> - Catalog action/tool validation constraints extracted from `base.ts`
> - Duplicated text/token utilities consolidated
> - `http-server.ts` MCP adapter split into `packages/mcp/src/`
> - `live-game/styles.ts` split into CSS/factories/theme modules
> - `mvp-template-data.ts` split into per-template files
> - Playwright E2E harness under `tests/e2e/`
> - `GameBundleSchema` + optional `provenance` on `BuilderProfileExportSchema`
> - Mobile-shell bundle loader for offline runnable game bundles
> - All source files ≤ 1000 LOC; strict TS clean; all tests green
>
> **Estimated Effort**: Large (multiple waves, ~2-4 days wall clock; delegated in tight batches)
> **Parallel Execution**: Limited — many tasks touch shared contracts/tests
> **Critical Path**: Contract changes first → consumer updates → tests → E2E harness → docs

---

## Context

### Original Request
"Implement all these changes except migration paths. Make sure all the updates are forward only (no backwards compatibility, no migration code, purging all stale and legacy code, removing all narrow brownfield abstractions, updating all incorrect heuristics, no v1 code with v1.1 or v2 type updates), dismantling all god files (no files like app.js in the codebase that are larger than 1000 LOC, except greenfield documentation)."

### Scope Clarification

| In Scope | Out of Scope (Guardrails) |
|---|---|
| Typed AST replacements for remaining heuristics | Server-Ready Retrieval runtime code |
| God-file dismantling | Real auth / authorization |
| Playwright E2E harness | Persistent database / storage |
| Remote-assembly contract prep (`GameBundleSchema`) | Multi-tenant features |
| Mobile-shell offline bundle loader | v1.1 / v2 schema evolution |
| Greenfield doc updates | Real Tauri signing certificates |

### Research Findings

- **Heuristics remaining**: core planner scoring, registry rejection chain, asset intent regex, profile-build operation switch, intent-resolution matching, asset-library fallbacks, live-game helpers, MCP adapter request builder, base.ts validation superRefines.
- **God files/near-god files**: `base.ts` (834), `styles.ts` (862), `http-server.ts` (819), `mvp-template-data.ts` (807).
- **Mobile shell**: currently reuses `StudioApp`; has no assembly logic; consumes `GameAssemblyProfile`/`BuilderProfileExport`.
- **Remote prep**: `BuilderProfileExportSchema` already has a `retrieval` discriminator. The future repo needs a `GameBundleSchema` composition around the export plus a registry snapshot.

---

## Work Objectives

### Core Objective

Produce a strictly greenfield, forward-only Playcraft codebase where:
- Every TypeScript source file is ≤ 1000 LOC
- Every remaining heuristic that can be expressed as a typed AST/contract is expressed as one
- The mobile shell can load a pre-assembled offline game bundle
- Contracts are ready for a future remote-assembly package without breaking V1
- Playwright E2E harness runs a smoke test against Studio + Service

### Concrete Deliverables

| # | File(s) | Deliverable |
|---|---|---|
| A1 | `packages/core/src/index.ts`, `packages/core/src/planner.ts` | `RecipeScore` AST + typed planner scoring |
| A2 | `packages/contracts/src/base.ts`, `packages/contracts/src/builder-catalog-constraints.ts` | Extract validation superRefines into declarative constraints |
| A3 | `packages/text-utils/src/index.ts` (new), consumers | Consolidate `normalizedTokens`, `tokenSequenceIncludes`, `singularize`, `cleanLabel`, `slugLabel` |
| A4 | `packages/service/src/http-server.ts`, `packages/mcp/src/` | Split MCP adapter/request builder out of http-server |
| A5 | `apps/studio/src/live-game/styles-css.ts`, `styles-factories.ts`, `styles-theme.ts` | Split styles.ts by responsibility |
| A6 | `packages/packs/src/mvp-templates/` (new), `mvp-template-data.ts` | Split template data into per-template files |
| B1 | `tests/e2e/package.json`, `playwright.config.ts` | E2E workspace package |
| B2 | `tests/e2e/tests/studio-smoke.spec.ts` | First smoke test |
| B3 | `vitest.config.ts`, root `package.json` | Wire scripts, exclude e2e from vitest |
| C1 | `packages/contracts/src/builder.ts` | Optional `provenance` field on `BuilderProfileExportSchema` |
| C2 | `packages/contracts/src/game-bundle.ts` (new) | `GameBundleSchema`, `PlaycraftRegistriesSnapshotSchema` |
| C3 | `packages/contracts/src/index.ts`, `base.ts` | Register `GameBundleSchema` in public contract registry |
| C4 | `packages/contracts/test/game-bundle.test.ts` | Contract tests |
| C5 | `apps/mobile-shell/src/bundle-loader.ts` | Offline bundle loader using `replayProfile()` + `TrustedComponentRegistry` |
| C6 | `apps/mobile-shell/src/App.tsx` | Use bundle loader when bundle supplied |
| C7 | `playcraft-agentic-framework/*.md` | Doc updates for bundle composition |

### Definition of Done

- [x] `pnpm typecheck` zero errors with strict TS on
- [x] `pnpm test` ≥ 653 passing, 0 failing
- [x] `pnpm test:a11y` 18 passing
- [x] `pnpm test:e2e` first smoke test passing (headed/CI)
- [x] No source file > 1000 LOC
- [x] Zero `@ts-ignore` / `@ts-expect-error` / `as any`
- [x] Zero `legacy` / `deprecated` / `TODO` / `FIXME` comments
- [x] No v1.1/v2 schema strings
- [ ] Atomic commit pushed (commits removed; waiting for next weekday 0100–1100 UTC window)

### Must NOT Have (Guardrails)

- NO backwards-compat shims, NO migration code
- NO v1.1/v2 schema reservations (everything stays `"playcraft.v1"`)
- NO legacy comments
- NO `as any`, `@ts-ignore`, `@ts-expect-error`
- NO real remote providers/auth/db/network runtime code
- NO file > 1000 LOC (except generated `dist/*` artifacts and greenfield docs)

---

## Execution Strategy

### Waves

```
Wave A (Heuristic cleanup + god-file dismantling, sequential/parallel where safe):
├── [x] A1. Replace core planner scoring with RecipeScore AST
├── [x] A2. Extract builder-catalog constraints from base.ts
├── [x] A3. Consolidate duplicated text/token utilities
├── [x] A4. Split MCP adapter out of http-server.ts
├── [x] A5. Split live-game/styles.ts
└── [x] A6. Split mvp-template-data.ts

Wave B (E2E harness):
├── [x] B1. Create tests/e2e workspace package
├── [x] B2. Add playwright.config.ts with Studio + Service webServer array
├── [x] B3. Wire root scripts and exclude e2e from vitest
└── [x] B4. Write studio-smoke.spec.ts

Wave C (Remote-assembly prep):
├── [x] C1. Add provenance to BuilderProfileExportSchema
├── [x] C2. Add GameBundleSchema + PlaycraftRegistriesSnapshotSchema
├── [x] C3. Register GameBundleSchema in public contracts
├── [x] C4. Add contract tests
├── [x] C5. Add mobile-shell bundle-loader.ts
├── [x] C6. Update mobile-shell App.tsx
└── [x] C7. Update framework docs

Wave FINAL (Verification + atomic commit):
├── [x] F1. Code-quality review
├── [x] F2. Agent-executed QA
└── [ ] T1. Atomic commit (removed from main; waiting for weekday 0100-1100 UTC window)
```

---

## Verification Commands

```bash
pnpm typecheck
pnpm test
pnpm test:a11y
pnpm test:e2e
find packages apps -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/test/*" -not -name "*.test.ts" -not -name "*.test.tsx" -exec wc -l {} \; | awk '$1 > 1000 {print}'
grep -rE '"playcraft\.v1\.1"|"v2"|legacy|deprecated' packages apps 2>/dev/null
```
