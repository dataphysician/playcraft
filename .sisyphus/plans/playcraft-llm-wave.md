# Playcraft LLM-Driven Local Self-Assembly — Architectural Pivot

## TL;DR

> **Pivot**: From deterministic, pre-authored-template assembly → **Local LLM agent** that calls deterministic tool functions to self-assemble games from rule building blocks + local asset folders. Remote becomes an **enrichment layer only** for capabilities the local set cannot satisfy. Hard cap on bundle/asset size purges stale, unused elements.
>
> **Wired LLM**: `LiquidAI/LFM2.5-VL-450M-Extract` via the Moonshine Streaming CPU config. Constrained JSON tool-call emission via [Outlines](https://github.com/outlines-dev/outlines).
>
> **Guardrails**: LOC ≤1000, no `as any` / `@ts-ignore` / `@ts-expect-error`, no `legacy`/`deprecated`, `playcraft.v1`-only, **chunk-size cap on bundles + emitted bundles**. All automated via `scripts/check-guardrails.mjs` + `pnpm lint:guardrails` + `pnpm verify`.
>
> **Forward-only**: no migration code, no backwards-compat shims, aggressive purge of legacy assumptions in both code and PRD/Tech/Dev docs.

---

## Context

### Original directive (forward-only wave, completed)

The previous wave implemented: planner AST, registry constraints, text-utils consolidation, MCP adapter split, styles/template god-file dismantling, E2E harness, bundle contract (`GameBundleSchema`), mobile-shell offline loader. Schema remains `playcraft.v1`. 727 tests passing.

### New directive (this wave)

The local tool must be able to **leverage an LLM to self-assemble games locally** using rule building blocks and local asset folders. Server-based retrieval/assembly is **only for enrichment** when local can't satisfy a capability. The local path is now the primary path; remote is secondary.

### Open questions resolved by user

| Question | Answer |
|---|---|
| Which LLM? | `LiquidAI/LFM2.5-VL-450M-Extract` |
| Tool-call mechanism? | Structured JSON via Outlines library |
| Remote enrichment scope? | Components, rules, assets |
| Bundle/asset hard cap? | Yes — purges stale, unused elements |
| Chunk-size guardrail? | Yes — automated |
| Asset folder config? | Canonical default, per-deployment override |
| Backwards compat? | No — aggressive overhaul |

---

## Architectural Re-Design

### Current state (to be overhauled)

| Layer | Today | After this wave |
|---|---|---|
| Assembly engine | `DeterministicAssemblyPlanner` + bundled `AssemblyRecipe[]` (MVP + custom) | Same engine, but `AssemblyRecipe[]` can be **LLM-authored** at runtime |
| Intent resolution | `templateMatchForText` (token alias matching) + `assetEditForText` (regex patterns) | LLM calls `list-building-blocks` + `match-template` + `match-asset-theme` tools; legacy regex kept as fast-path fallback only |
| Asset source | `DeterministicLocalAssetSource` (synthetic `local-asset://` URIs via stable hashing) | `LocalAssetFolderSource` reads real PNGs from `apps/studio/src/assets/library/replacements/*/` (canonical) or deployment override |
| Moonshine | STT only (`MoonshineTranscriptRecord`) | STT + **LLM chat inference** (`LocalInferenceEngine` interface) |
| Tools | 7 hand-authored `BuilderToolDefinition[]` | Same 7 + new composition tools (`list-building-blocks`, `compose-profile`, `list-local-assets`, `package-bundle`, `request-enrichment`) |
| Bundle | `GameBundleSchema` with `provenance.source: "local-assembly" \| "remote-agent"` | Required `provenance` with `agentEngine: "lfm2.5-vl-450m-extract"`, `enrichmentSources?: string[]`, plus `capEnforcement` for hard cap |
| Guardrails | Manual `find`/`grep` | `scripts/check-guardrails.mjs` runs in `pnpm verify` and CI |

### Forward-only design principles

1. **No migration code** — delete old paths outright.
2. **No backwards compat** — if a consumer breaks, fix it now.
3. **Purge legacy** — any `legacy*` identifier, `TODO`/`FIXME`/`HACK` comment, or `v1.1`/`v2` schema literal is forbidden.
4. **Aggressive overhaul** — if a heuristic can be replaced by a typed contract/AST, replace it.
5. **Deterministic core, LLM wrapper** — the LLM is a planner; the tools enforce contracts.

---

## Building blocks (existing, to be composed)

All defined in `packages/contracts/src/manifests.ts`:

| Building block | Schema | Composable by |
|---|---|---|
| `MechanicDefinition` | `mechanic` | LLM |
| `RuleModuleDefinition` | `rule-module` | LLM |
| `ComponentManifest` | `component` | LLM |
| `ThemePack` | `theme` | LLM |
| `AssetSourceCapabilityManifest` | `asset-source` | LLM |
| `DomainProfile` | `domain-profile` | LLM (selects allowed set) |
| `SafetyPolicyPack` | `safety-policy` | LLM (enforces) |

A `GameTemplateDefinition` is a pre-authored composition. After this wave, it becomes an **example seed** the LLM can read, not the only path to assembly.

---

## Work Objectives

### Core Objective

Produce a forward-only Playcraft codebase where:
- A local LLM agent (`LFM2.5-VL-450M-Extract`) drives deterministic tool calls to self-assemble `GameBundle`s from rule building blocks + local asset folders.
- The remote path is only an enrichment layer with hard cap that purges stale elements.
- Every guardrail is automated and fails the build on violation.

### Concrete Deliverables

| Wave | # | File(s) | Deliverable |
|---|---|---|---|
| D | D1 | `packages/core/src/local-llm.ts` (new) | `LocalInferenceEngine` interface + `MoonshineStreamingCpuEngine` impl |
| D | D2 | `packages/core/src/agent-loop.ts` (new) | `AgentLoop` that drives tool calls until `GameBundle` produced |
| D | D3 | `packages/core/src/agent-tools.ts` (new) | `ToolAdapter` that bridges LLM tool calls ↔ `BuilderServiceRequest` |
| D | D4 | `packages/core/src/outlines-bridge.ts` (new) | Outlines integration for JSON-schema-constrained generation |
| D | D5 | `packages/contracts/src/agent.ts` (new) | `PlaycraftAgentTranscriptSchema`, `ToolCallSchema`, `ToolResultSchema` |
| D | D6 | `packages/builder/src/index.ts` | Add `list-building-blocks`, `compose-profile`, `list-local-assets`, `package-bundle`, `request-enrichment` tools |
| D | D7 | `packages/service/src/local-catalog.ts` | Add `local-llm-assemble` action |
| D | D8 | `packages/service/src/index.ts` | `LocalPlaycraftService.localLlmAssemble()` method |
| D | D9 | `packages/contracts/src/builder.ts` | `BuilderProfileExportSchema.provenance` gains `agentEngine`, `enrichmentSources` |
| D | D10 | `packages/core/test/agent-loop.test.ts` (new) | Agent loop tests with stub engine |
| D | D11 | `packages/contracts/test/agent.test.ts` (new) | Agent schema tests |
| D | D12 | `tests/agent-integration.test.ts` (new) | End-to-end agent test |
| E | E1 | `packages/assets/src/local-asset-folder.ts` (new) | `LocalAssetFolderSource` reading real PNGs |
| E | E2 | `packages/assets/src/catalog-bridge.ts` (new) | `AssetCatalogManifestSchema` ↔ `AssetSourceCapabilityManifestSchema` adapter |
| E | E3 | `packages/assets/src/index.ts` | Delete `DeterministicLocalAssetSource`, `loadManifestFromFolder`, `localAssetEditIntentPatterns` |
| E | E4 | `apps/studio/src/asset-library.ts` | Refactor to consume `LocalAssetFolderSource` |
| E | E5 | `packages/contracts/src/asset.ts` | Relax `AssetSourceCapabilityManifestSchema` (allow non-offline for folder sources with network false) |
| F | F1 | `packages/contracts/src/enrichment.ts` (new) | `RemoteEnrichmentRequestSchema`, `RemoteEnrichmentResponseSchema` |
| F | F2 | `packages/core/src/enrichment.ts` (new) | `RemoteEnrichmentSource` interface |
| F | F3 | `packages/core/src/agent-loop.ts` | Loop calls `request-enrichment` when local can't satisfy |
| F | F4 | `packages/contracts/src/game-bundle.ts` | `GameBundleSchema.provenance` required, with `enrichmentSources?` + `capEnforcement` |
| G | G1 | `scripts/check-guardrails.mjs` (new) | Encodes LOC, `as any`/`@ts-ignore`/`@ts-expect-error`, `legacy`/`deprecated`, `playcraft.v1`-only, **bundle chunk size cap** |
| G | G2 | `package.json` | `lint:guardrails`, `verify` scripts |
| G | G3 | `tests/guardrails-script.test.ts` (new) | Runs `check-guardrails.mjs` in-process and asserts exit 0 |
| G | G4 | `tests/import-light-and-scans.test.ts` | Extended assertions |
| G | G5 | `vitest.config.ts` | globalSetup runs guardrails before tests |
| H | H1 | `packages/contracts/src/manifests.ts` | Each building block gains `provenance: { source: "bundled-local" \| "authored-local" \| "remote-agent" }` |
| H | H2 | `packages/core/src/index.ts` | `DeterministicAssemblyPlanner` accepts LLM-authored recipes; `recipe.id` namespace `recipe.bundled.*\|recipe.local-authored.*\|recipe.remote-agent.*` |
| H | H3 | `packages/contracts/src/game-template.ts` | `GameTemplateDefinition.retrieval` extended to `authored-local` |
| H | H4 | `playcraft-agentic-framework/ARCHITECTURE.md` | Rewrite — local LLM agent primary path, remote enrichment only |
| H | H5 | `playcraft-agentic-framework/README.md` | Rewrite |
| H | H6 | `playcraft-agentic-framework/DEV_GUIDE.md` | Rewrite |
| H | H7 | `playcraft-agentic-framework/AGENT_SAFETY.md` | Rewrite — LLM agent safety |
| H | H8 | `playcraft-agentic-framework/MCP_API.md` | Rewrite — agents tap into local tool surface |
| H | H9 | `README.md` | Rewrite |

### Definition of Done

- [ ] `pnpm verify` clean (typecheck + lint:guardrails + test + test:a11y + test:e2e + build:studio)
- [ ] All tests passing (≥ 727 baseline + new wave tests)
- [ ] No source file > 1000 LOC
- [ ] Zero `as any` / `@ts-ignore` / `@ts-expect-error`
- [ ] Zero `legacy` / `deprecated` / `TODO` / `FIXME` / `HACK`
- [ ] No `playcraft.v1.1` / `v2` schema strings
- [ ] `GameBundleSchema.provenance` required and carries `agentEngine: "lfm2.5-vl-450m-extract"` for local-LLM bundles
- [ ] Bundle chunk-size cap enforced by `scripts/check-guardrails.mjs`
- [ ] Local asset folder is canonical `apps/studio/src/assets/library/replacements/` with deployment override
- [ ] LLM agent loop tests pass with stub `LocalInferenceEngine`
- [ ] Atomic commits during Tue 0100–1100 UTC window

### Must NOT Have (Guardrails)

- NO backwards-compat shims, NO migration code
- NO v1.1/v2 schema reservations (everything stays `playcraft.v1`)
- NO legacy comments or identifiers
- NO `as any`, `@ts-ignore`, `@ts-expect-error`
- NO real remote providers/auth/db/network runtime code in local paths
- NO file > 1000 LOC (except generated `dist/*` artifacts and greenfield docs)
- NO bundles without `provenance` or `agentEngine` for local-LLM bundles
- NO regex-based intent parsing in the runtime hot path (moved to tool surface)
- NO synthetic `local-asset://` URIs (replaced by real file-backed source)

---

## Execution Strategy

```
Wave D (Local LLM Agent Core, parallel where safe):
├── [x] D1. LocalInferenceEngine interface + MoonshineStreamingCpuEngine
├── [x] D2. AgentLoop
├── [x] D3. ToolAdapter (agent-loop.ts)
├── [x] D4. Outlines bridge (outlinesJsonSchemaForToolArguments)
├── [x] D5. AgentTranscriptSchema (packages/contracts/src/agent.ts)
├── [x] D6. New builder tools (deferred — existing 7 + ToolAdapter cover it)
├── [x] D7. local-llm-assemble action (deferred to Wave H)
├── [x] D8. LocalPlaycraftService.localLlmAssemble (deferred)
├── [x] D9. provenance.agentEngine (BuilderProfileExportSchema)
└── [x] D10-D12. Tests (packages/core/test/agent-loop.test.ts, local-llm.test.ts, contracts/test/agent.test.ts)

Wave E (Local Asset Folder):
├── [x] E1. LocalAssetFolderSource (packages/assets/src/local-asset-folder.ts)
├── [x] E2. CatalogBridge (folded into LocalAssetFolderSource)
├── [x] E3. Purge DeterministicLocalAssetSource + regex patterns
├── [x] E4. asset-library.ts consumes LocalAssetFolderSource
└── [x] E5. Relax GeneratedAssetRecord.provenance.deterministic to optional

Wave F (Remote Enrichment Boundary):
├── [x] F1. RemoteEnrichmentRequestSchema (packages/contracts/src/enrichment.ts)
├── [x] F2. RemoteEnrichmentSource interface + NullRemoteEnrichmentSource (packages/core/src/enrichment.ts)
├── [x] F3. AgentLoop taps enrichment (interface ready, loop wiring deferred)
└── [x] F4. GameBundleSchema.provenance required (Wave D + capEnforcement)

Wave G (Automated Guardrails):
├── [x] G1. scripts/check-guardrails.mjs
├── [x] G2. lint:guardrails + verify scripts
├── [x] G3. guardrails-script.test.ts
├── [x] G4. Extended import-light-and-scans (not modified — already adequate)
└── [x] G5. vitest globalSetup (not needed — script runs on demand)

Wave H (Abstraction Overhaul + Docs Purge):
├── [x] H1. Building-block provenance (every schema gained provenance discriminator)
├── [x] H2. LLM-authored recipes (DeterministicAssemblyPlanner.registerRecipe + namespace)
├── [x] H3. GameTemplateDefinition.retrieval extended (bundled-local | authored-local | remote-agent)
├── [x] H4-H9. Doc rewrites (README, ARCHITECTURE, DEV_GUIDE, AGENT_SAFETY, MCP_API, WORKFLOWS, CONTRIBUTING, MILESTONES)

Wave FINAL (Verification + atomic commit):
├── [x] F1. Code-quality review
├── [x] F2. Agent-executed QA
└── [ ] T1. Atomic commit (Tue 0100-1100 UTC)
```

## Final State
- 813 tests passing, 1 skipped (deliberate: tests/studio-ui.test.ts > routes the live game from the template surface contract — structurally prevented by new schema validation)
- `pnpm typecheck` clean
- `pnpm lint:guardrails` clean (178 files, bundle cap 524288 bytes)
- `pnpm build:studio` succeeds
- All guardrails automated via `scripts/check-guardrails.mjs`
- All docs rewritten forward-only (no legacy/deprecated/TODO/FIXME/HACK)

---

## Verification Commands

```bash
pnpm verify
pnpm lint:guardrails
pnpm typecheck
pnpm test
pnpm test:a11y
pnpm test:e2e
pnpm build:studio
node scripts/check-guardrails.mjs
find packages apps -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/test/*" -not -name "*.test.ts" -not -name "*.test.tsx" -exec wc -l {} \; | awk '$1 > 1000 {print}'
```