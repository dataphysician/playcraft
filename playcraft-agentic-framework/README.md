# Playcraft Agentic Game Framework

| Attribute | Value |
|-----------|-------|
| Status | Active framework specification |
| Date | 2026-07-06 |
| Schema version | `playcraft.v1` |
| Source of truth | `playcraft-agentic-framework/` |

This folder is the canonical source of truth for the Playcraft Agentic Game Framework. It supersedes the older PlayCraft AI app/product framing. That older framing described an app-specific child-game product with third-party runtime, persistence, dashboard, auth, and route assumptions. That history can be useful context, but it is not the foundation for the framework spec.

## Quick Status

| Track | Status | Notes |
|-------|--------|-------|
| V1 (local-first, import-light) | **Shipped** | 9 milestones complete; `pnpm typecheck` zero errors; `pnpm test` ≥ 652 passing; `pnpm test:a11y` zero critical-impact axe violations. |
| Contracts barrel | **Shipped** | `packages/contracts/src/index.ts` re-exports 12 domain modules; all schemas stamp `schemaVersion: "playcraft.v1"`. |
| `WorkflowCondition` AST parser | **Shipped** | `parseWorkflowCondition` + `evaluateCondition` in `packages/contracts/src/condition.ts`; `WorkflowConditionSchema` is a typed AST, not a free-form string. |
| Service split | **Shipped** | `packages/service` is four files: `index.ts` (class + workflow executor), `local-catalog.ts`, `intent-resolution.ts`, `json-helpers.ts`. |
| Studio accessibility gate | **Shipped** | axe-core + vitest-axe; CI gate is "zero critical-impact violations". |
| Tauri v2 bundle signing | **Staged** | `apps/mobile-shell/src-tauri/tauri.conf.json` carries the shape; secrets injected at build time (see `DEV_GUIDE.md` §15). |
| Server retrieval | **Deferred** | Contract + threat model in `SERVER_RETRIEVAL_PLAN.md`; deferred to a future wave (see `NEXT_WAVE.md` §2.4). |
| Schema versioning beyond `playcraft.v1` | **Deferred** | No v1.1 / v2 reservation in the public contracts; graduation criteria in `NEXT_WAVE.md` §2.5. |

## Positioning

Playcraft is "GDevelop-inspired for coding agents": a lightweight game-assembly SDK/framework where agents assemble mini games from typed contracts, template definitions, event/rule semantics, registries, trusted components, theme packs, asset records, safety policies, and replayable profiles.

The user-facing builder accepts local text input and local Moonshine transcripts. Moonshine transcripts are modeled as Moonshine Streaming CPU-only input records; Playcraft input handling does not require a third-party runtime.

Playcraft is not an AI game generator. AI or agents may help interpret intent, plan assemblies, or request assets, but the playable result must be a validated `GameAssemblyProfile` made from registered capabilities.

AG-UI is the standard outer protocol for agent/frontend interaction. Playcraft owns the game DSL, manifests, registries, replay model, safety semantics, trusted component runtime, and pack model.

## Doc Map

| Document | Purpose |
|----------|---------|
| [PRD.md](PRD.md) | Product/framework requirements for the AG-UI-native game-assembly SDK. Reflects the shipped V1 surface. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Protocol boundaries, AG-UI mapping, registries, replay, trusted runtime, and pack model. References the contracts barrel and the service split. |
| [DEV_GUIDE.md](DEV_GUIDE.md) | Implementation guide, package boundaries, contracts lazy-wrap pattern, `WorkflowCondition` AST parser, service split, Tauri v2 signing, and milestones. |
| [ROADMAP.md](ROADMAP.md) | V1-complete + V2-deferred framing. Heavyweight non-goals stay rejected. |
| [MCP_API.md](MCP_API.md) | MCP-compatible HTTP surface for the local Playcraft service. |
| [WORKFLOWS.md](WORKFLOWS.md) | Workflow graph schema, `WorkflowCondition` AST parser, patterns, CLI and MCP entry points, best practices. |
| [AGENT_SAFETY.md](AGENT_SAFETY.md) | Hard safety guardrails for agent-facing surfaces. |
| [SERVER_RETRIEVAL_PLAN.md](SERVER_RETRIEVAL_PLAN.md) | Out-of-current-implementation contract + threat model for a future server retrieval adapter. |
| [NEXT_WAVE.md](NEXT_WAVE.md) | Deferred features list (multi-tenant, npm publish, E2E harness, schema v2, etc.) with rationale and graduation criteria. |

## Using Playcraft as an Agent Backend

Playcraft is designed to be driven by a coding agent. Three documents cover the agent-facing surfaces:

- [MCP_API.md](MCP_API.md) — the MCP-compatible HTTP server (`/playcraft/catalog`, `/playcraft/tools/list`, `/playcraft/tools/call`), the seven-tool allowlist, and ownership enforcement. Use this when integrating with an MCP-aware coding agent or any HTTP-capable client.
- [WORKFLOWS.md](WORKFLOWS.md) — workflow graphs (`WorkflowGraphSchema`), `WorkflowCondition` AST parser, patterns (linear, parallel, conditional, error handling), the `playcraft-service run-workflow` CLI, and the `execute-workflow` MCP tool. Use this when an agent needs to chain multiple builder actions in a single local session.
- [AGENT_SAFETY.md](AGENT_SAFETY.md) — hard guardrails: local-only constraint, no authentication, no database, no network execution, and the allowlist of seven builder tools. Every agent integration must respect these constraints.

Agents that need a local HTTP service should run `playcraft-service-http` and call the MCP routes. Agents that need to script multi-step flows should read the workflow graph examples in `examples/workflows/` and reuse the `execute-workflow` MCP tool or the `run-workflow` CLI.

## Current Surface (V1, Shipped)

The shipped V1 surface covers:

- TypeScript contracts and Zod schemas, all stamped with `schemaVersion: "playcraft.v1"`. The `@playcraft/contracts` barrel re-exports `base`, `condition`, `workflow`, `mcp`, `sse`, `asset`, `ag-ui`, `packs`, `game-template`, `builder-catalog`, `manifests`, `builder`.
- Mechanic, rule, component, theme, asset source, domain, and safety registries (`packages/core`).
- Deterministic local planner and deterministic local asset source.
- `BuilderToolDefinition` contracts for `assemble`, `update`, `preview`, `catalog`, `get-session`, `export-profile`, `import-profile`, `reset`, `execute-workflow`.
- AG-UI adapter with validated Playcraft `Custom` envelopes.
- Trusted React renderer for registered components only.
- Replay harness for saved `GameAssemblyProfile` records.
- Three MVP profiles (memory match, sorting, sequence repeat) plus `template.custom.*` recipes.
- Local `LocalPlaycraftService` facade with `BuilderServiceRequest`, `BuilderServiceRequestBatch`, and `BuilderServiceResponse` envelopes for text and `MoonshineTranscriptRecord` input.
- In-process and HTTP JSON service transports over the same envelope (`createLocalServiceTransport`, `createHttpServiceTransport`, `handleServiceHttpRequestBody`, `playcraft-service-http`).
- Workflow graphs: `WorkflowGraphSchema`, `WorkflowNodeSchema`, `WorkflowEdgeSchema`, `WorkflowConditionSchema` (typed AST parser), `WORKFLOW_NODE_CAP` (20), and `execute-workflow` action.
- Studio and Tauri Mobile-facing shells that default to the in-process local service and switch to the HTTP service with `VITE_PLAYCRAFT_SERVICE_URL`.
- `playcraft-service` CLI surface for catalog, assemble, update, preview, get-session, export-profile, import-profile, reset, execute-workflow, raw `BuilderServiceRequest` envelopes, request-batch (`request batches` over the validated service boundary), `--transcript` Moonshine transcript input, asset-edit requests with callable argument schemas, surfaced per-action required contracts, service facade summaries, request field summaries, exclusive and forbidden field groups, catalog-driven template aliases, and discoverable local replacement themes.
- Studio Developer profile tools that export/import validated profile bundles through the same service transport.
- Studio Developer catalog tools that render callable action schemas, template aliases, and local asset levers from `BuilderCatalog`.
- Axe-core accessibility gate: `pnpm test:a11y` runs `vitest-axe` against the Studio and `LiveGame` surfaces; CI gate is "zero critical-impact violations".
- Tauri v2 bundle signing staged for macOS, Windows, Android, iOS (see `DEV_GUIDE.md` §15).

The core framework packages are buildable and testable without network access, credentials, AI SDKs, GPU, model weights, a database, or a native shell. The mobile shell is an app layer around the same local service, not a core dependency.

## Deferred Waves (V2)

The V2 waves are tracked in [NEXT_WAVE.md](NEXT_WAVE.md). Each item carries a one-paragraph rationale, dependencies, and a graduation criterion. Server retrieval is specified in [SERVER_RETRIEVAL_PLAN.md](SERVER_RETRIEVAL_PLAN.md) (contract + threat model) and graduates through the criteria in `NEXT_WAVE.md` §2.4.

## Middleweight Path (Active)

Current middleweight work includes the Vite studio, local service, visual game preview, developer timeline, and the Tauri Mobile-facing webview scaffold. Later docs may specify richer curated local packs and (when the V2 server retrieval wave opens) asset-library adapters. Third-party runtime adapters are not part of the framework path.

## Explicit Rejections

The framework docs reject the old app-centered abstractions:

- No hardcoded `GameType` enum as the core model.
- No source-name branching.
- No arbitrary generated React/runtime code.
- No app-route handlers as framework core.
- No app-specific database, auth, dashboard, or deployment assumptions in core docs.
- No v1.1 / v2 schema reservation in the public contracts — everything ships as `playcraft.v1`. Any future v2 discriminator is a deferred wave (see `NEXT_WAVE.md` §2.5).

## Acceptance Checklist

The framework documentation is acceptable when:

- This folder is named as the canonical source of truth.
- The old root PRD reads as superseded, not active architecture.
- The root README no longer advertises the old app stack as the future target.
- V1 can be implemented offline with deterministic local tools and import-light packages.
- V2 deferred waves are tracked in `NEXT_WAVE.md` with rationale and graduation criteria.
- The developer guide includes the contracts lazy-wrap pattern, the `WorkflowCondition` AST parser, the service split, the workflow graph schema, the axe-core gate, and the Tauri v2 signing configuration.
- `pnpm typecheck` reports zero errors.
- `pnpm test` reports ≥ 652 tests passing.
- `pnpm test:a11y` reports zero critical-impact axe violations.
- Source scans block hardcoded defaults, `GameType` core branching, source-name branching, generated code execution, app-route dependencies in core, database/auth/dashboard assumptions, and third-party runtime paths.
