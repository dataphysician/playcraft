# Playcraft Agentic Game Framework

| Attribute | Value |
|-----------|-------|
| Status | Active framework specification |
| Date | 2026-07-06 |
| Schema version | `playcraft.v1` |
| Source of truth | `playcraft-agentic-framework/` |
| Architecture pivot | Wave H — local-first LLM agent is the primary path; remote enrichment is an opt-in layer for capability gaps |

This folder is the canonical source of truth for the Playcraft Agentic Game Framework. It describes a GDevelop-inspired, **local-first**, agent-driven mini-game assembly SDK where a local small language model running on CPU assembles toddler-focused games from typed contracts, bundled local registries, and a canonical local asset folder. Remote building blocks and asset retrieval are an opt-in extension layer that fills capability gaps; they are never the default.

The framework spec is forward-only. There is no migration from prior versions, no backwards-compatibility shim, and no out-of-scope mode. Every wave replaces what came before by editing the source instead of layering compatibility code.

## Quick Status

| Track | Status | Notes |
|-------|--------|-------|
| Local-first architecture | **Shipped** | Bundled MVP templates; local LFM2.5-VL-450M-Extract over Moonshine Streaming CPU is the wired primary path. |
| Local asset folder | **Shipped** | `apps/studio/src/assets/library/replacements/` is the canonical folder; overridable per deployment via `PLAYCRAFT_REPLACEMENTS_FOLDER`. |
| Building-block provenance | **Shipped** | `MechanicDefinition`, `RuleModuleDefinition`, `ComponentManifest`, `ThemePack`, `AssetSourceCapabilityManifest`, `DomainProfile`, `SafetyPolicyPack` carry `provenance: { source: "bundled-local" \| "authored-local" \| "remote-agent" }`. |
| Recipe namespace | **Shipped** | `recipe.bundled.*`, `recipe.local-authored.*`, `recipe.remote-agent.*` are the three declared namespaces. `DeterministicAssemblyPlanner.registerRecipe()` validates and dedupes. |
| Retrieval discriminator | **Shipped** | `GameTemplateDefinition.retrieval` accepts `current` and `planned` from the same enum: `bundled-local`, `authored-local`, `remote-agent`. |
| Local LLM agent | **Shipped** | `MoonshineStreamingCpuEngine` is the wired engine. `AgentLoop` + `ToolAdapter` + `Outlines`-constrained JSON tool calls run on CPU. |
| Remote enrichment | **Opt-in** | `RemoteEnrichmentSource` interface + `NullRemoteEnrichmentSource` default. No HTTP transport ships. |
| Bundle cap | **Shipped** | `GAME_BUNDLE_MAX_BYTES = 512 * 1024`, `GAME_BUNDLE_MAX_REGISTRY_ENTRIES = 256`, `GameBundleCapEnforcementSchema.purgedEntryIds`. |
| Guardrail enforcement | **Shipped** | `scripts/check-guardrails.mjs` + `pnpm lint:guardrails` block out-of-scope/`tracker-item`/`tracker-item`/`workaround-note` markers in source; `tests/import-light-and-scans.test.ts` blocks remotely-operated-service phrasing in code and docs. |
| Schema versioning beyond `playcraft.v1` | **Deferred** | Forward-only. |

## Architecture Pivot (Wave H)

Wave H replaces the older V1 framing — which described a deterministic-only local planner with a future server-retrieval adapter — with an **LLM-driven, local-first, forward-only architecture**:

- **Primary path** is the local LLM agent loop. Local inference runs the `MoonshineStreamingCpuEngine` (LFM2.5-VL-450M-Extract) on CPU; tool calls are constrained to JSON schemas by the `Outlines` library.
- **Primary asset source** is the local asset folder, scanned at startup. Per-deployment override via `PLAYCRAFT_REPLACEMENTS_FOLDER` keeps deployments local.
- **Remote enrichment** is an opt-in layer behind the `RemoteEnrichmentSource` interface. The shipped default is `NullRemoteEnrichmentSource`, which returns `status: "unsupported"`. A real HTTP source is **not** part of the framework.
- **Building-block contracts** carry a `provenance.source` discriminator (`bundled-local | authored-local | remote-agent`) so consumers can tell which path produced a manifest.
- **Recipes** carry a `recipe.bundled.* | recipe.local-authored.* | recipe.remote-agent.*` id namespace; agents add LLM-authored recipes at runtime through `DeterministicAssemblyPlanner.registerRecipe()`.
- **Bundle cap** ships as `GAME_BUNDLE_MAX_BYTES = 512 * 1024` and `GAME_BUNDLE_MAX_REGISTRY_ENTRIES = 256`. The `purgedEntryIds` field on `GameBundleCapEnforcementSchema` records what the cap dropped.

There are no migration paths, no out-of-scope fields, no out-of-scope alternatives. Anything not present in this document is **out of scope** for the framework.

## Positioning

Playcraft is "GDevelop-inspired for coding agents": a lightweight game-assembly SDK/framework where a local LLM agent assembles mini games from typed contracts, capability registries, event/rule semantics, trusted components, theme packs, asset records, safety policies, and replayable profiles.

The agent's primary input is a local text request or a local Moonshine Streaming CPU transcript record. The agent loop runs locally; tool calls resolve against local registries; asset selection resolves against the local replacement folder. Remote calls are reachable only when the host explicitly enables a `RemoteEnrichmentSource` implementation.

The playable result is always a validated `GameAssemblyProfile` made from registered building blocks. The framework never executes generated UI code, generated JavaScript, `eval`, or dynamic function bodies for play surfaces.

AG-UI is the standard outer protocol for agent/frontend interaction. Playcraft owns the game DSL, manifests, registries, replay model, safety semantics, trusted component runtime, and pack model.

## Doc Map

| Document | Purpose |
|----------|---------|
| [PRD.md](PRD.md) | Framework requirements for the local-LLM, agent-driven game-assembly SDK. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Protocol boundaries, provenance, recipe namespace, registries, replay, trusted runtime, pack model, bundle cap. |
| [DEV_GUIDE.md](DEV_GUIDE.md) | Implementation guide, package layout, contracts lazy-wrap pattern, AgentLoop wiring, Tauri signing, milestones. |
| [MCP_API.md](MCP_API.md) | MCP-compatible HTTP surface for the local Playcraft service. |
| [WORKFLOWS.md](WORKFLOWS.md) | Workflow graph schema, AST condition parser, patterns, CLI and MCP entry points. |
| [AGENT_SAFETY.md](AGENT_SAFETY.md) | Hard safety guardrails: local-only, no auth, no database, no network execution. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Guardrails, coding heuristics, forward-only rules, acceptance gates. |

## Agent Surfaces

Three documents cover how a coding agent interacts with the framework:

- [MCP_API.md](MCP_API.md) — the local MCP HTTP server (`/playcraft/catalog`, `/playcraft/tools/list`, `/playcraft/tools/call`), the allowlisted builder actions, and ownership enforcement. Use this for any HTTP-capable MCP-aware agent.
- [WORKFLOWS.md](WORKFLOWS.md) — workflow graphs (`WorkflowGraphSchema`), the typed `WorkflowCondition` AST parser, and the `execute-workflow` MCP action. Use this when a workflow needs to chain multiple builder actions in one local session.
- [AGENT_SAFETY.md](AGENT_SAFETY.md) — hard guardrails: local-only constraint, no authentication, no database, no network execution, exact allowlist of builder actions.

Agents that need the loopback HTTP service should run `playcraft-service-http` and call the MCP routes. Agents that need multi-step flows should read the examples under `examples/workflows/` and reuse the `execute-workflow` MCP tool or the `run-workflow` CLI. The CLI exposes `playcraft-service catalog --json`, `assemble`, `update`, `preview`, `get-session`, `export-profile`, `import-profile`, `reset`, `execute-workflow`, raw `BuilderServiceRequest` envelopes, same-process `BuilderServiceRequestBatchSchema` request batches, `--transcript` Moonshine input, catalog-driven surfaced per-action required contracts, service facade summaries, and request field summaries plus exclusive and forbidden field groups.

## Current Surface

The shipped Wave H surface covers:

- TypeScript contracts and Zod schemas, all stamped with `schemaVersion: "playcraft.v1"`. The `@playcraft/contracts` barrel re-exports `base`, `condition`, `workflow`, `mcp`, `sse`, `asset`, `ag-ui`, `packs`, `game-template`, `builder-catalog`, `manifests`, `builder`, `game-bundle`, `agent`, `enrichment`.
- Mechanic, rule, component, theme, asset source, domain, and safety registries (`packages/core`) with provenance stamps on every building block.
- `DeterministicAssemblyPlanner` with `registerRecipe()` for runtime LLM-authored recipes under the `recipe.local-authored.*` namespace.
- `LocalAssetFolderSource` reading `apps/studio/src/assets/library/replacements/` (overridable via `PLAYCRAFT_REPLACEMENTS_FOLDER`).
- `BuilderToolDefinition` contracts for `assemble`, `update`, `preview`, `catalog`, `get-session`, `export-profile`, `import-profile`, `reset`, `execute-workflow`.
- `AgentLoop` + `ToolAdapter` + `MoonshineStreamingCpuEngine` (LFM2.5-VL-450M-Extract over Moonshine Streaming CPU).
- `Outlines`-constrained JSON tool-call generation so the engine cannot produce arguments that fail the tool schema.
- `RemoteEnrichmentSource` interface plus `NullRemoteEnrichmentSource` default. No HTTP transport ships.
- AG-UI adapter with validated Playcraft `Custom` envelopes.
- Trusted React renderer for registered components only.
- Replay harness for saved `GameAssemblyProfile` records.
- 24 MVP `template.*` recipes under `examples/profiles/*.json`, plus 3 `template.custom.*` recipes.
- `LocalPlaycraftService` with the same `BuilderServiceRequest` / `BuilderServiceRequestBatch` / `BuilderServiceResponse` envelope across three transports: `createLocalServiceTransport`, `createHttpServiceTransport`, `handleServiceHttpRequestBody`, and `handleLocalServiceRequestBatch`.
- Workflow graphs (`WorkflowGraphSchema`, `WorkflowNodeSchema`, `WorkflowEdgeSchema`, `WorkflowConditionSchema` typed AST parser), `WORKFLOW_NODE_CAP = 20`, and `execute-workflow`.
- Studio and Tauri Mobile-facing shells that default to the in-process local service. Set `VITE_PLAYCRAFT_SERVICE_URL` to route through the local HTTP service. The mobile shell additionally exposes an offline path: when a `GameBundle` is supplied to `App`, the bundle-loader in `apps/mobile-shell/src/bundle-loader.ts` validates the bundle, registers the snapshot into a fresh `PlaycraftRegistries`, replays the profile, and renders it through `OfflineGame` without touching the service.
- Studio Developer profile tools for export/import of validated profile bundles through the shared service transport.
- Studio Developer catalog tools that render callable action schemas, template aliases, asset edit entries, exclusive and forbidden field groups, transport helpers, exact-envelope helpers, and the available local replacement themes (dinosaurs, toys, dolphins/ocean animals, fruits).
- Axe-core accessibility gate (`pnpm test:a11y` runs `vitest-axe` against the Studio and `LiveGame` surfaces; gate is "zero critical-impact violations").
- Tauri v2 bundle signing staged for macOS, Windows, Android, iOS (see [DEV_GUIDE.md](DEV_GUIDE.md) §15).
- Automated guardrail script `scripts/check-guardrails.mjs` invoked by `pnpm lint:guardrails` and the umbrella `pnpm verify` pipeline.

The core packages are buildable and testable without network access, credentials, hosted model SDKs, GPU, model weights, a database, or a native shell.

## Deferred Items

Server retrieval as a hosted implementation is not part of the framework. The contract surface exists for forward-only preparation but no HTTP source ships. Federated discovery, cross-host profile replay, remote asset library sync, marketplace publishing, telemetry, multi-tenant session isolation, npm package publishing, end-to-end harness wiring, and schema versioning beyond `playcraft.v1` are all out of scope until a future wave graduates them through the criteria in [CONTRIBUTING.md](CONTRIBUTING.md).

## Explicit Rejections

The framework docs reject the older app-style abstractions:

- No hardcoded `GameType` enum as the core model.
- No source-name branching.
- No arbitrary generated React or runtime code.
- No app-route handlers as framework boundaries.
- No app-specific database, auth, dashboard, or deployment assumptions in the core.
- No v1.1 / v2 schema reservation. Everything ships as `playcraft.v1`.
- No out-of-scope or out-of-scope markers in source. New code replaces old code at the same call site.
- No migration code. Forward-only.

## Acceptance Checklist

The framework documentation is acceptable when:

- This folder is named as the canonical source of truth.
- The Wave H pivot is summarized in the top matter and reflected across every doc.
- Every building-block schema described in the docs carries the `provenance` discriminator.
- The recipe namespace (`recipe.bundled.* | recipe.local-authored.* | recipe.remote-agent.*`) is documented and enforced by `registerRecipe()`.
- The local-first LLM agent path (LFM2.5-VL-450M-Extract over Moonshine Streaming CPU), the Outlines-constrained JSON tool calls, and the canonical local asset folder are documented.
- The framework README no longer advertises hosted retrieval or third-party runtime as future targets.
- The `pnpm verify` pipeline (`pnpm typecheck && pnpm lint:guardrails && pnpm test && pnpm test:a11y && pnpm test:e2e && pnpm build:studio`) is the single acceptance gate and exits 0.
- Tests are at or above the previous milestone baseline.
