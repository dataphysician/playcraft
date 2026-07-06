# Playcraft Overhaul — Aggressive Forward-Only Code + Spec Refresh

## TL;DR

> **Quick Summary**: Aggressive forward-only overhaul. Service (1493) and contracts (2486) finally split via a leaf-first dep graph rebuild. WorkflowCondition regex (500+ chars, brittle heuristic) replaced with a typed recursive-descent parser. Greenfield spec docs (PRD/ARCHITECTURE/DEV_GUIDE/ROADMAP/README) rewritten to reflect the post-overhaul reality. Wave 6 features (axe-core, Tauri signing, Server-Ready plan doc, NEXT_WAVE.md) finally completed. F1–F4 re-audit + atomic commit.
>
> **Deliverables**:
> - All 6 source god files split; max file ≤ 1000 LOC
> - WorkflowCondition is a typed AST, not a regex heuristic
> - PRD/ARCHITECTURE/DEV_GUIDE/ROADMAP/README fully rewritten — no "Version 1.0.0-cleanroom", no "future server transport", no "v1.1 reservations"
> - `axe-core` integrated into CI
> - Tauri signing config staged for mobile-shell
> - `SERVER_RETRIEVAL_PLAN.md` (capability contracts + threat model)
> - `NEXT_WAVE.md` (deferred features)
> - F1–F4 re-audit APPROVE → atomic commit
>
> **Estimated Effort**: Large (24 tasks across 6 waves, ~3-5 weeks wall clock for a human team; here delegated in serial subagents)
> **Parallel Execution**: NO — high cross-file coupling; mostly sequential
> **Critical Path**: Contracts leaf-first rebuild → Service conservative split → Heuristic parser → Docs → F1–F4 audit → atomic commit

---

## Context

### Original Request
"Plan the major fixes for all the major and minor gaps. For any proposed changes/recent commits/updated coding heuristics, make sure to oversee and overhaul the contracts, abstractions, coding heuristics aggressively if needed. No backwards compatibility or migration code. Just pure forward only code updates that purge legacy code and stale assumptions in both the code base and the greenfield_specs PRD/Tech/Dev implementation guides."

### Interview Summary

**User-confirmed scope** (all four "aggressive / Recommended" options chosen):

- **Contracts split**: Rebuild leaf-first dep graph. Move every primitive to `base.ts`. Other files depend ONLY on `base.ts`. No mutual dependencies. ~1-2 days of careful refactoring.
- **Service split**: Conservative — extract only pure constants + helpers. Keep `executeWorkflow` and `LocalPlaycraftService` class verbatim inline. Target index.ts to ~950 LOC.
- **Workflow condition language**: Replace 500+ char regex with a typed recursive-descent parser producing an AST (discriminated union of `eq | neq | gt | gte | lt | lte | len_*`).
- **Greenfield spec docs**: Full rewrite of PRD, ARCHITECTURE, DEV_GUIDE, ROADMAP, README to reflect the post-overhaul reality. ~2000 lines of doc updates. No "Version 1.0.0-cleanroom", no "future server transport" notes, no v1.1 reservations.

**Research findings**:

- `service/src/index.ts` (1493 LOC) — circular-dep risk comes from `LocalPlaycraftService.executeWorkflow` body. Keeping it verbatim inline is the safe path.
- `contracts/src/index.ts` (2486 LOC) — circular deps are `mcp.ts ↔ builder.ts` (via `McpToolSchema` ↔ `BuilderActionNameSchema`) and `builder.ts ↔ game-template.ts` (via `GameTemplateDefinitionSchema` ↔ `BuilderTemplateIdSchema`). Leaf-first graph resolves both.
- `WorkflowConditionSchema` regex is ~500 chars, brittle, with no AST for the executor to consume (it does ad-hoc string parsing inside `executeWorkflowGraphSync`).
- `playcraft-agentic-framework/PRD.md` says `Version: 1.0.0-cleanroom` — but no v1.1/v2 schemas exist. Doc is misleading.
- `playcraft-agentic-framework/ARCHITECTURE.md` says "in-process and HTTP JSON service transports over the same envelope" and "future server transport" — the future language is forward-only antipattern.
- `playcraft-agentic-framework/DEV_GUIDE.md` and `ROADMAP.md` reference dated V1 milestones and "lightweight V1" content that is no longer aspirational — it is the current state.
- The previous cleanup run already split 4 of 6 god files. The other 2 are the targets here.

### Metis Review

**Identified Gaps** (addressed):

1. **Wave 6 features were never started** — axe-core, Tauri, Server-Ready plan, NEXT_WAVE.md. All queued here.
2. **F1–F4 re-audit never ran** — the previous atomic commit bypassed the audit. This run gates the final commit on F1–F4 APPROVE.
3. **`BuilderServiceResponseSchema` TS7056 preservation rule** — must be preserved through the contracts rebuild. Mitigation: explicit `z.ZodType<Output, z.ZodTypeDef, Input>` annotation, leaf-first dep graph, validate with `tsc -b packages/contracts --force --clean` after each file added.
4. **`import-light-and-scans` test reads source as raw text and asserts specific literals** — 850 assertions. Splitting the god files requires extending the test's `readXxxSources()` helpers to concatenate all sub-module files. The pattern is already established in the previous run.
5. **Workflow condition AST must produce identical evaluation result for every existing public-contract fixture** — TDD RED-first: write evaluation tests from existing fixtures, then build parser, then validate.
6. **Heuristic overhaul scope creep risk** — the parser change is invasive. Limit to WorkflowCondition only. Leave other heuristics (planner scoring, asset edit heuristics) for NEXT_WAVE.md.
7. **Service split circular dep risk** — keep `executeWorkflow` body verbatim inline. This is the only safe path.

---

## Work Objectives

### Core Objective

Produce a strictly greenfield, forward-only Playcraft codebase where:
- Every TypeScript source file is ≤ 1000 LOC
- Every heuristic that can be expressed as a typed AST is expressed as a typed AST
- Every greenfield spec doc reflects the post-overhaul reality (no dated "future" notes, no v1.1 reservations)
- F1–F4 audit passes; atomic commit lands

### Concrete Deliverables

| # | File(s) | Deliverable |
|---|---|---|
| 1 | `packages/contracts/src/base.ts` | ALL primitives (enums, regexes, type aliases) — leaf module, no internal deps |
| 2 | `packages/contracts/src/mcp.ts`, `sse.ts`, `workflow.ts`, `asset.ts`, `ag-ui.ts`, `builder-catalog.ts`, `packs.ts` | Single-purpose modules, depend only on `base.ts` |
| 3 | `packages/contracts/src/builder.ts`, `game-template.ts` | Single-purpose modules, depend only on `base.ts` (no mutual cycles) |
| 4 | `packages/contracts/src/index.ts` | Barrel re-exports only (≤ 100 LOC) |
| 5 | `packages/service/src/local-catalog.ts`, `intent-resolution.ts`, `json-helpers.ts` | New sub-modules, ≤ 1000 LOC each |
| 6 | `packages/service/src/index.ts` | Reduced to ~950 LOC (class body + factories intact) |
| 7 | `packages/contracts/src/condition.ts` | New `parseWorkflowCondition(input: string): WorkflowConditionExpr` + `evaluateCondition(expr, payload): boolean` |
| 8 | `packages/contracts/src/index.ts` | `WorkflowConditionSchema` switches from regex `.refine` to parser `.refine` |
| 9 | `packages/service/src/workflow/executor.ts` | `executeWorkflowGraphSync` uses `evaluateCondition` from contracts instead of inline string parsing |
| 10 | `playcraft-agentic-framework/PRD.md` | Full rewrite — current state, no future reservations |
| 11 | `playcraft-agentic-framework/ARCHITECTURE.md` | Full rewrite — current layer model, no "future" notes |
| 12 | `playcraft-agentic-framework/DEV_GUIDE.md` | Rewrite to match post-overhaul structure |
| 13 | `playcraft-agentic-framework/ROADMAP.md` | Rewrite to V1-complete + V2-deferred |
| 14 | `playcraft-agentic-framework/README.md` | Update doc map + status |
| 15 | `playcraft-agentic-framework/SERVER_RETRIEVAL_PLAN.md` | New doc — capability contracts + threat model |
| 16 | `playcraft-agentic-framework/NEXT_WAVE.md` | New doc — deferred features (multi-tenant, npm publish, E2E harness) |
| 17 | Tests | `tests/studio-a11y.test.tsx` with `vitest-axe` + Playwright axe scan |
| 18 | `apps/mobile-shell/tauri.conf.json` | Tauri signing config staged |
| 19 | `tests/import-light-and-scans.test.ts` | Add `readServiceSources()`, `readContractSources()` helpers |
| 20 | F1–F4 audit runs | APPROVE on all four |
| 21 | Atomic commit | All changes captured |

### Definition of Done

- [x] `pnpm typecheck` zero errors with strict TS on
- [x] `pnpm test` ≥ 564 passing, 0 failing
- [x] No source file > 1000 LOC (verified via `wc -l`)
- [x] `WorkflowConditionSchema` is a typed parser, not a regex
- [x] `playcraft-agentic-framework/PRD.md` no longer says "Version 1.0.0-cleanroom"
- [x] `playcraft-agentic-framework/ARCHITECTURE.md` no longer says "future server transport" or "Server-Ready Retrieval is OUT for now"
- [x] `SERVER_RETRIEVAL_PLAN.md` exists with capability contracts + threat model
- [x] `NEXT_WAVE.md` exists with deferred features roadmap
- [x] axe-core scan returns zero critical violations on Studio
- [x] F1–F4 audit APPROVE
- [ ] Atomic commit pushed

### Must Have

- All 6 source god files split
- WorkflowCondition is a typed parser
- Greenfield spec docs reflect post-overhaul reality
- axe-core integrated
- Tauri signing config staged
- Server-Ready plan + NEXT_WAVE roadmap docs
- F1–F4 audit APPROVE

### Must NOT Have (Guardrails)

- **NO backwards-compat shims, NO migration code, NO v1.1/v2 schema reservations** (everything stays `"playcraft.v1"`)
- **NO legacy comments** (`// FIXME`, `// TODO`, `// legacy`, `// deprecated`, `// v1-compat`)
- **NO `as any`, `@ts-ignore`, `@ts-expect-error`**
- **NO preserved narrow brownfield abstractions** — if a heuristic can be a typed AST, it must be
- **NO "future" reservations in docs** — every doc must describe current state
- **NO file > 1000 LOC** (except generated `dist/*` artifacts)
- **NO broad speculative features** beyond axe-core, Tauri, Server-Ready plan, NEXT_WAVE

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** during implementation. F1–F4 audit gate before atomic commit.

### Test Decision

- **Infrastructure exists**: YES (vitest + @testing-library/react)
- **Automated tests**: TDD RED-first for every split, parser, and heuristic change
- **Framework**: vitest + new vitest-axe for accessibility
- **Each contract split**: RED test asserts on the new file shape; existing tests stay green
- **Each WorkflowCondition test**: RED test evaluates existing public-contract fixtures against the new parser; ensure identical boolean outcome

### QA Policy

- `pnpm typecheck` + `pnpm test` after every wave
- `wc -l` to assert no source file > 1000 LOC
- `grep -rE '"playcraft\.v1\.1"|"v2"|legacy|deprecated' packages apps` empty
- axe-core CI gate returns zero critical
- F1–F4 final audit gate (must APPROVE before atomic commit)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Foundation — sequential):
├── T0.  Audit current state: grep all 850 import-light assertions, list all schema files, document circular dep points
└── T1.  Update test helper for service+contracts (readServiceSources, readContractSources)

Wave 1 (Contracts — leaf-first dep graph rebuild, sequential, RED-first):
├── [x] T2.  base.ts — collect ALL primitives (StableId, Version, CapabilityTag, enums, regexes)
├── [x] T3.  mcp.ts (depends only on base)
├── [x] T4.  sse.ts (depends only on base)
├── [x] T5.  workflow.ts (depends only on base)
├── [x] T6.  asset.ts (depends only on base)
├── [x] T7.  ag-ui.ts (depends only on base)
├── [x] T8.  builder-catalog.ts (depends only on base)
├── [x] T9.  packs.ts (depends only on base)
├── [x] T10. game-template.ts (depends only on base)
├── [x] T11. builder.ts (depends only on base — BREAKS circular dep with game-template)
├── [x] T11b. manifests.ts (component/mechanic/theme/safety/domain schemas)
├── [x] T12. contracts/src/index.ts barrel re-exports (≤ 100 LOC)
└── [x] T13. Run `tsc -b packages/contracts --force --clean` to verify TS7056 preserved

Wave 2 (Workflow condition parser, sequential, RED-first):
├── [x] T14. Add `condition.ts` with `parseWorkflowCondition` + `evaluateCondition` + AST types
├── [x] T15. Add `WorkflowConditionExprSchema` (typed AST schema)
├── [x] T16. Change `WorkflowConditionSchema` to parser `.transform(parseWorkflowCondition)`
├── [x] T17. Update `executor.ts` to use `evaluateCondition` instead of inline string parsing
└── [x] T18. Update `import-light-and-scans.test.ts` for the new structure (if any literal assertions break)

Wave 3 (Service split — conservative, sequential):
├── [x] T19. local-catalog.ts (constants + createSessionOwnership)
├── [x] T20. intent-resolution.ts (pure helpers)
├── [x] T21. json-helpers.ts (toJsonValue, serializeExecution, serviceResponse, etc.)
├── [x] T22. service/src/index.ts trimmed to ~950 LOC (class + factories intact)
└── [x] T23. Update `import-light-and-scans.test.ts` `readServiceSources()` helper

Wave 4 (Wave 6 features, sequential):
├── [x] T24. axe-core integration (vitest-axe + Playwright)
├── [x] T25. Tauri signing config staging
├── [x] T26. SERVER_RETRIEVAL_PLAN.md draft
├── [x] T27. NEXT_WAVE.md draft

Wave 5 (Spec docs, sequential):
├── [x] T28. PRD.md full rewrite
├── [x] T29. ARCHITECTURE.md full rewrite
├── [x] T30. DEV_GUIDE.md full rewrite
├── [x] T31. ROADMAP.md full rewrite
├── [x] T32. README.md update

Wave FINAL (F1–F4 audit + atomic commit, sequential):
├── F1.  Plan Compliance Audit (oracle) — VERDICT: APPROVE
├── F2.  Code Quality Review (unspecified-high) — VERDICT: APPROVE
├── F3.  Agent-Executed QA (unspecified-high) — VERDICT: APPROVE
├── F4.  Scope Fidelity Check + guards (deep) — VERDICT: APPROVE
└── T33. Atomic commit

Critical Path: T0 → T1 → T2 (base.ts) → T3-T11 (parallel) → T12 (index barrel) → T13 (TS7056 verify) → T14-T18 (condition parser) → T19-T22 (service) → T24-T27 (features) → T28-T32 (docs) → F1-F4 → T33 (atomic commit)
```

---

## TODOs

> RED-first for every split, parser, and heuristic change. Strict TS catches unused imports.

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Then atomic commit.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read end-to-end. All 6 god files split? WorkflowCondition is a typed parser? Spec docs rewritten? F1–F4 plan boxes in plan file updated. No `v1.1`/`v2` schema strings. No file > 1000 LOC. Approved?

- [x] F2. **Code Quality Review** — `unspecified-high`
  Strict TS clean? No forbidden patterns? No legacy comments? No narrow brownfield heuristics (WorkflowCondition regex gone, etc.)? RED tests added per split? Approved?

- [x] F3. **Agent-Executed QA** — `unspecified-high`
  Smoke-test both CLI binaries via `pnpm exec`. axe-core scan returns zero critical? Touch every split module via vitest. Run all 4 example workflows via CLI. Approved?

- [x] F4. **Scope Fidelity Check + Guards** — `deep`
  All 6 files split? `grep -r "v1\.1\|v2\|legacy\|deprecated\|// TODO: remove"` empty? `wc -l` shows all source files ≤ 1000 LOC? Spec docs free of "future" notes and "v1.0.0-cleanroom" version banner? Approved?

After F1–F4 APPROVE → atomic commit.

---

## Commit Strategy

Atomic wave commit at the end. No per-task commits. All changes captured in one commit at the end of the wave, after F1–F4 approve.

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck                                                       # Expected: zero errors
pnpm test                                                            # Expected: ≥ 564 passing, 0 failing
pnpm exec playcraft-service --help                                  # Expected: usage printed
pnpm exec playcraft-service-http --help                             # Expected: usage printed
pnpm exec vitest run tests/studio-a11y.test.tsx                     # Expected: zero critical violations
wc -l packages/contracts/src/index.ts packages/service/src/index.ts packages/builder/src/index.ts packages/packs/src/index.ts apps/studio/src/live-game.tsx apps/studio/src/studio-app.tsx  # Expected: each ≤ 1000 LOC
grep -rE '"playcraft\.v1\.1"|"v2"|legacy|deprecated' packages apps 2>/dev/null   # Expected: empty
grep -E '"Version.*1\.0\.0-cleanroom"|"future server transport"|"Server-Ready Retrieval is OUT"' playcraft-agentic-framework/*.md  # Expected: empty
```

### Final Checklist
- [x] All 6 source god files split
- [x] No migration code, no v1.1/v2 strings, no legacy comments
- [x] Strict TS clean
- [x] WorkflowCondition is a typed parser (not a regex)
- [x] Both CLI bins wired and functional
- [x] axe-core scan integrated
- [x] Tauri signing config staged
- [x] SERVER_RETRIEVAL_PLAN.md + NEXT_WAVE.md drafted
- [x] All 5 spec docs (PRD, ARCHITECTURE, DEV_GUIDE, ROADMAP, README) rewritten — no dated language
- [x] F1–F4 re-audit APPROVE
- [ ] Atomic commit pushed
