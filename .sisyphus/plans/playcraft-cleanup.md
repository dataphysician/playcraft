# Playcraft Cleanup — Forward-Only Refactor + Greenfield Polish

## TL;DR

> **Quick Summary**: Forward-only cleanup with **no** backwards-compat shims, **no** migration code, **no** `v1.1`/`v2` schema bumps. Splits every source file >1000 LOC into focused modules, wires the service CLI bins, enables strict TypeScript, integrates axe-core into CI, drafts a Server-Ready Retrieval prep document, and stages Tauri signing config. Deferred items go into a `NEXT_WAVE.md` roadmap.
>
> **Deliverables**:
> - 6 source god files split (live-game, studio-app, builder, service, packs, contracts)
> - F2 nits removed (unused imports, JSON-parse catch swallow)
> - Strict TS enabled (`noUnusedLocals`, `noUnusedParameters`)
> - `playcraft-service` + `playcraft-service-http` CLI binaries wired
> - axe-core scan in CI gate
> - `SERVER_RETRIEVAL_PLAN.md` (capability contracts + gate conditions)
> - Tauri signing config staged
> - `NEXT_WAVE.md` roadmap
> - Atomic commit at end of wave
>
> **Estimated Effort**: Large (24 implementation tasks across 6 waves, 4-6 weeks)
> **Parallel Execution**: YES — 5 waves + final review
> **Critical Path**: Wave 1 (bins/strict-TS/nits) → Wave 5 (contracts split) → Final audit → atomic commit

---

## Context

### Original Request
Implement all changes from the post-wave gap list, with these hard constraints:

- Forward only — **no** backwards-compat, **no** migration code, **no** v1.1/v2 schema bumps
- Purge all stale and legacy code
- Remove all narrow brownfield abstractions
- Update all incorrect heuristics
- Dismantle all god files (no source file >1000 LOC except greenfield docs)
- Strict clean-room greenfield implementation

### Interview Summary

**Key Decisions** (user-confirmed):
- **Scope**: All 6 source files >1000 LOC will be split (live-game 2841, contracts 2486, packs 2178, studio-app 1511, service 1493, builder 1359)
- **Contracts split**: HIGH RISK — split by domain, RED-first, document TS7056 mitigation
- **Service split**: RED-first per concern (local-service, session-ownership, workflow-integration, node-shims)
- **Features bundle**: axe-core CI, Server-Ready prep doc, Tauri signing hardening
- **Deferred items**: Draft `NEXT_WAVE.md` only (no implementation)
- **Approval gate**: Atomic wave commit at the end (no per-task approvals)

**Research Findings** (from post-wave F1-F4 audit):
- All 12 Must-Have items satisfied; 20/20 implementation tasks compliant
- 563/563 tests passing across 28 test files
- F2 flagged: 3 unused type imports, 1 `void 0` JSON-parse catch swallow, 4 documented `as unknown as` casts, 1 `void BuilderServiceActionNameSchema` (idiomatic)
- F3 flagged: `playcraft-service`/`playcraft-service-http` bins missing from workspace tooling (works only via in-process)
- F4 flagged: T11/T12 were bundled in one commit (procedural note, not deviation)
- No file currently exceeds 1000 LOC except: `dist/*` (build artifacts), greenfield docs (`WORKFLOWS.md`)

### Metis Review

**Identified Gaps** (addressed):
1. **Contracts split could re-trigger TS7056** → Mitigation: extract by domain into separate files with thin re-export shim; preserve `BuilderServiceResponseSchema`'s explicit `z.ZodType<...>` annotation; keep cycle-free dependency graph.
2. **Forward-only constraint forbids `schemaVersion: "playcraft.v1.1"`** → All schema strings remain `"playcraft.v1"`; existing tests that round-trip fixtures must keep working without version bumps.
3. **Strict TS will fail current test scaffolding** → Use vitest globals, valid import patterns; remove all unused imports BEFORE enabling flags.
4. **Atomic commit risk** → Run incremental verification between waves; user reviews at the very end; if any wave fails, the patch set is broken but not committed.
5. **Live-game split creates inter-module dependencies** (audio cues, asset replacements, color tokens) → Extract helpers into `live-game/helpers/` before splitting game components.

---

## Work Objectives

### Core Objective
Produce a clean-room greenfield Playcraft codebase where:
- Every TypeScript source file is ≤1000 LOC (test files may exceed — they are organized by `describe` blocks)
- Every CLI binary works via `pnpm exec`
- Strict TypeScript is on and clean
- axe-core scan enforces accessibility in CI
- No migration code, no v1.1/v2 schema versions, no preserved legacy types

### Concrete Deliverables

| # | File(s) | Deliverable |
|---|---|---|
| 1 | `packages/service/package.json` | `bin` entries for `playcraft-service` + `playcraft-service-http` |
| 2 | `tsconfig.package.json` (root) | Enable `noUnusedLocals` + `noUnusedParameters` |
| 3 | `apps/studio/src/local-client.ts`, `studio-app.tsx` | Remove unused type imports |
| 4 | `apps/studio/src/components/McpCatalogBrowser.tsx` | Replace `void 0` catch with `aria-invalid` feedback |
| 5 | `apps/studio/src/live-game.tsx` (2841) → `live-game/{index,memory,sorting,sequence,helpers,audio}/...` | Split |
| 6 | `apps/studio/src/studio-app.tsx` (1511) → `studio-app/{index,panels,command}/...` | Split |
| 7 | `packages/builder/src/index.ts` (1359) → `builder/{core,ownership}/...` | Split |
| 8 | `packages/service/src/index.ts` (1493) → `service/{local-service,ownership,workflow-integration,node-shims}/...` | Split |
| 9 | `packages/packs/src/index.ts` (2178) → `packs/{domains,recipes,custom}/...` | Split |
| 10 | `packages/contracts/src/index.ts` (2486) → `contracts/{base,mcp,sse,workflow,session,asset,custom}/...` | Split (high risk) |
| 11 | Test files | Add `vitest-axe` + Playwright axe scan |
| 12 | `apps/mobile-shell/` | Tauri signing config |
| 13 | `playcraft-agentic-framework/SERVER_RETRIEVAL_PLAN.md` | Capability + threat model doc |
| 14 | `playcraft-agentic-framework/NEXT_WAVE.md` | Deferred items roadmap |

### Definition of Done

- [ ] `pnpm typecheck` passes with strict mode ON
- [ ] `pnpm test` passes (563 existing + new RED tests per split)
- [ ] `pnpm exec playcraft-service --help` works
- [ ] `pnpm exec playcraft-service-http --help` works
- [ ] axe-core scan returns zero critical violations
- [ ] No source file >1000 LOC (verified via `wc -l`)
- [ ] No `schemaVersion: "playcraft.v1.1"` or `v2` strings in code/fixtures
- [ ] No `// v1-compat`, `// legacy`, `// TODO: remove`, `// deprecated` comments
- [ ] Atomic commit captures all changes

### Must Have
- All 6 source god files split into focused modules with RED tests
- Strict TS enabled and clean
- Both CLI binaries wired and usable
- axe-core CI integration
- Tauri signing config staged
- Server-Ready plan and NEXT_WAVE roadmap docs

### Must NOT Have (Guardrails)

- **NO migration code, NO backwards-compat shims, NO `v1.1`/`v2` schema versions** (everything stays `"playcraft.v1"`)
- **NO preserved legacy types** (e.g., delete `LiveGameFailure` alias if no longer needed)
- **NO narrow brownfield abstractions** (split or remove one-off `as Record<string, unknown>` type assertions)
- **NO commented-out code, NO `// FIXME`, NO `// HACK`, NO `// TODO: remove`**
- **NO file >1000 LOC except**: build artifacts (`dist/`), greenfield documentation (`WORKFLOWS.md`, `ARCHITECTURE.md`, etc.)
- **NO `as any`, `@ts-ignore`, `@ts-expect-error`** anywhere
- **NO Server-Ready runtime implementation** (Server-Ready stays OUT — only plan doc)
- **NO broad speculative features** beyond axe-core, Tauri config, Server-Ready plan

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** during implementation. Atomic commit at the very end with user review.

### Test Decision
- **Infrastructure exists**: YES (vitest + @testing-library/react)
- **Automated tests**: TDD RED-first for every split
- **Framework**: vitest + new vitest-axe for accessibility
- **Each split**: RED test asserts on the new file shape; existing tests stay green

### QA Policy
- Run `pnpm typecheck` + `pnpm test` after every wave
- Run `pnpm exec` smoke tests for CLI bins
- Run axe-core scan on Studio build
- Run `wc -l` to assert no source file >1000 LOC
- Verify no `v1.1`/`v2` schema strings via `grep`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundations — STRICT SEQUENTIAL: bins + strict TS + F2 nits):
├── T1.  Wire playcraft-service bin                              [quick]
├── T2.  Wire playcraft-service-http bin                          [quick]
├── T3.  Remove unused type imports (F2 nits)                    [quick]
├── T4.  Replace void 0 catch swallow with aria-invalid          [quick]
└── T5.  Enable strict TypeScript (noUnusedLocals/Parameters)    [quick]

Wave 2 (live-game split — sequential within wave, RED-first):
├── T6.  Extract live-game helpers (audio cues, asset helper)    [visual-engineering]
├── T7.  Split MemoryGame into live-game/memory/memory-game.tsx  [visual-engineering]
├── T8.  Split SortingGame into live-game/sorting/sorting-game.tsx [visual-engineering]
└── T9.  Split SequenceGame into live-game/sequence/sequence-game.tsx [visual-engineering]

Wave 3 (studio-app split — after T9):
├── T10. Extract studio-app panels (Timeline, DeveloperPanel)    [visual-engineering]
└── T11. Extract studio-app CommandBar + CommandBarInput        [visual-engineering]

Wave 4 (builder + packs + service — service first via RED):
├── T12. Split builder/index.ts into builder/{core,ownership}/   [unspecified-high]
├── T13. Split packs/index.ts into packs/{domains,recipes}/      [unspecified-high]
└── T14. Split service/index.ts into service/{local-service,ownership,workflow-integration}/ [deep]
└── T15. Service node-shims into separate file                  [deep]

Wave 5 (contracts split — HIGH RISK, RED-first + TS7056 mitigation):
├── T16. Carve out session + ownership schemas                   [unspecified-high]
├── T17. Carve out MCP + SSE schemas                              [unspecified-high]
├── T18. Carve out workflow + asset + custom-template schemas    [deep]
└── T19. Re-export base + re-validate fixture test cycle         [deep]

Wave 6 (New features + docs):
├── T20. Integrate axe-core via vitest-axe + Playwright         [unspecified-high]
├── T21. Tauri signing config staging                            [unspecified-high]
├── T22. SERVER_RETRIEVAL_PLAN.md draft                          [writing]
└── T23. NEXT_WAVE.md draft                                       [writing]

Wave FINAL (re-audit + atomic commit):
├── F1. Plan Compliance Audit                                    [oracle]
├── F2. Code Quality Review                                       [unspecified-high]
├── F3. Agent-Executed QA                                       [unspecified-high]
└── F4. Scope Fidelity Check + strict TS + LOC guard + version guard [deep]

Critical Path: T1-T5 (foundation) → T6-T15 (file splits) → T16-T19 (contracts) → T20-T23 (features) → F1-F4 (audit) → atomic commit
```

### Dependency Matrix

- **1-5**: - - 6-23 (foundation blocks all)
- **6**: - - 7-9 (helpers before game splits)
- **7**: 6 - 8-9, 10
- **8**: 6 - 7, 9, 10
- **9**: 6 - 10
- **10**: 9 - 11, 12
- **11**: 10 - 12-23
- **12**: 11 - 13-23
- **13-15**: 11 - 16-23
- **16-19**: 12-15 - 20-23
- **20-23**: 19 - F1-F4
- **F1-F4**: 23 - atomic commit

### Agent Dispatch Summary

- **Wave 1**: 5 quick tasks
- **Wave 2-3**: visual-engineering (live-game/studio-app)
- **Wave 4**: unspecified-high / deep
- **Wave 5**: unspecified-high / deep
- **Wave 6**: unspecified-high / writing
- **Wave FINAL**: oracle / unspecified-high / deep

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> RED-first for every file split. Strict TS catches unused imports.

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Then atomic commit at the end.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read end-to-end: all 6 files split? CLI bins work? axe-core integrated? Server-Ready plan exists? NEXT_WAVE.md exists? No `v1.1`/`v2` schema strings? No file >1000 LOC? Approved?

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Strict TS clean? No forbidden patterns? No legacy comments? No narrow brownfield heuristics? RED tests added per split? Approved?

- [ ] F3. **Agent-Executed QA** — `unspecified-high`
  Smoke-test both CLI binaries via `pnpm exec`? axe-core scan returns zero critical? Touch every split module via vitest? Approved?

- [ ] F4. **Scope Fidelity Check + Guards** — `deep`
  All 6 files split? `grep -r "v1\.1\|v2\|legacy\|deprecated\|// TODO: remove"` empty? `wc -l` shows all source files ≤1000 LOC? Approved?

After F1-F4 APPROVE → atomic commit.

---

## Commit Strategy

This is an **atomic wave commit at the end**. No per-task commits. All changes captured in one commit at the end of the wave, after F1-F4 approve.

---

## Success Criteria

### Verification Commands
```bash
pnpm typecheck                                       # Expected: zero errors
pnpm test                                            # Expected: 563 passing + RED tests
pnpm exec playcraft-service --help                   # Expected: usage printed
pnpm exec playcraft-service-http --help              # Expected: usage printed
pnpm exec vitest run tests/axe-accessibility.test.ts # Expected: zero critical violations
wc -l packages/contracts/src/index.ts packages/service/src/index.ts packages/builder/src/index.ts packages/packs/src/index.ts apps/studio/src/live-game.tsx apps/studio/src/studio-app.tsx # Expected: each ≤ 1000 LOC
grep -rE '"playcraft\.v1\.1"|"v2"|legacy|deprecated' packages/apps/playcraft-agentic-framework 2>/dev/null # Expected: empty
```

### Final Checklist
- [ ] All 6 source god files split
- [ ] No migration code, no v1.1/v2 strings, no legacy comments
- [ ] Strict TS clean
- [ ] Both CLI bins wired and functional
- [ ] axe-core scan integrated
- [ ] Tauri signing config staged
- [ ] SERVER_RETRIEVAL_PLAN.md + NEXT_WAVE.md drafted
- [ ] F1-F4 re-audit APPROVE
- [ ] Atomic commit pushed to main
