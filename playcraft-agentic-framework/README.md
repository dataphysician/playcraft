# Playcraft Agentic Game Framework Cleanroom Docs

| Attribute | Value |
|-----------|-------|
| Status | Canonical cleanroom specification |
| Date | 2026-06-27 |
| Scope | Documentation-only framework direction |
| Source of truth | `docs/cleanroom/playcraft-agentic-framework/` |

This folder is the canonical source of truth for the Playcraft Agentic Game Framework.

It supersedes the older PlayCraft AI app/product framing. That older framing described an app-specific child-game product with third-party runtime, persistence, dashboard, auth, and route assumptions. That history can be useful context, but it is not the foundation for the framework spec.

## Positioning

Playcraft is "GDevelop-inspired for coding agents": a lightweight game-assembly SDK/framework where agents assemble mini games from typed contracts, template definitions, event/rule semantics, registries, trusted components, theme packs, asset records, safety policies, and replayable profiles.

The user-facing builder accepts local text input and local Moonshine transcripts. Moonshine transcripts are modeled as Moonshine Streaming CPU-only input records; Playcraft input handling does not require a third-party runtime.

Playcraft is not an AI game generator. AI or agents may help interpret intent, plan assemblies, or request assets, but the playable result must be a validated `GameAssemblyProfile` made from registered capabilities.

AG-UI is the standard outer protocol for agent/frontend interaction. Playcraft owns the game DSL, manifests, registries, replay model, safety semantics, trusted component runtime, and pack model.

## Doc Map

| Document | Purpose |
|----------|---------|
| [PRD.md](PRD.md) | Product/framework requirements for the AG-UI-native game-assembly SDK. |
| [DEV_GUIDE.md](DEV_GUIDE.md) | Lightweight implementation guide, package boundaries, contracts, tests, and milestones. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Protocol boundaries, AG-UI mapping, registries, replay, trusted runtime, and pack model. |
| [ROADMAP.md](ROADMAP.md) | Lightweight v1, middleweight path, and heavyweight non-goals. |
| [MCP_API.md](MCP_API.md) | MCP-compatible HTTP surface for the local Playcraft service. |
| [WORKFLOWS.md](WORKFLOWS.md) | Workflow graph schema, patterns, CLI and MCP entry points, best practices. |
| [AGENT_SAFETY.md](AGENT_SAFETY.md) | Hard safety guardrails for agent-facing surfaces. |

## Using Playcraft as an Agent Backend

Playcraft is designed to be driven by a coding agent. Three documents cover
the agent-facing surfaces:

- [MCP_API.md](MCP_API.md) — the MCP-compatible HTTP server (`/playcraft/catalog`,
  `/playcraft/tools/list`, `/playcraft/tools/call`), the seven-tool allowlist,
  and ownership enforcement. Use this when integrating with an MCP-aware
  coding agent or any HTTP-capable client.
- [WORKFLOWS.md](WORKFLOWS.md) — workflow graphs (`WorkflowGraphSchema`),
  patterns (linear, parallel, conditional, error handling), the
  `playcraft-service run-workflow` CLI, and the `execute-workflow` MCP tool.
  Use this when an agent needs to chain multiple builder actions in a single
  local session.
- [AGENT_SAFETY.md](AGENT_SAFETY.md) — hard guardrails: local-only constraint,
  no authentication, no database, no network execution, and the allowlist of
  seven builder tools. Every agent integration must respect these constraints.

Agents that need a local HTTP service should run
`playcraft-service-http` and call the MCP routes. Agents that need to script
multi-step flows should read the workflow graph examples in
`examples/workflows/` and reuse the `execute-workflow` MCP tool or the
`run-workflow` CLI.

## Lightweight V1

The v1 target is intentionally small and local-first:

- TypeScript contracts and Zod schemas.
- Mechanic, rule, component, theme, and asset source registries.
- Deterministic local planner and deterministic local asset source.
- Builder tool contracts for assembling a game, updating a game, previewing trusted interactions, listing local tools/templates, inspecting sessions, and exporting/importing profiles.
- AG-UI adapter with validated Playcraft `Custom` envelopes.
- Trusted React renderer for registered components only.
- Replay harness for saved `GameAssemblyProfile` records.
- Three MVP profiles: memory match, sorting, and sequence repeat.
- Local service facade with validated `BuilderServiceRequest`, `BuilderServiceRequestBatchSchema`, and `BuilderServiceResponse` contracts for text requests and `MoonshineTranscriptRecord` inputs from Moonshine Streaming CPU transcript records.
- In-process and HTTP JSON service transports over the same request/response envelope, including a local `playcraft-service-http` server.
- Studio and Tauri Mobile-facing shells that default to the in-process local service and can call the HTTP service by setting `VITE_PLAYCRAFT_SERVICE_URL`.
- `playcraft-service` CLI surface for catalog, assemble, update, preview, get-session, export-profile, import-profile, reset, raw `BuilderServiceRequest` envelopes and request batches, `--transcript` Moonshine transcript input, and asset-edit requests with callable argument schemas, surfaced per-action required contracts, service facade summaries, request field summaries, exclusive and forbidden field groups, catalog-driven template aliases, and discoverable local replacement themes.
- Vite Studio and a Tauri Mobile-facing shell that assemble games through the shared service transport.
- Studio Developer profile tools that export/import validated profile bundles through the same service transport.
- Studio Developer catalog tools that render callable action schemas, template aliases, and local asset levers from `BuilderCatalog`.

The core framework packages must be buildable and testable without network access, credentials, AI SDKs, GPU, model weights, a database, or a native shell. The mobile shell is an app layer around the same local service, not a core dependency.

## Middleweight Later Path

Current middleweight app work includes the Vite studio, local service, visual game preview, developer timeline, and a Tauri Mobile-facing webview scaffold. Later docs may specify richer curated local packs, server catalog retrieval, and asset-library adapters. Third-party runtime adapters are not part of the framework path.

## Explicit Rejections

The framework docs reject the old app-centered abstractions:

- No hardcoded `GameType` enum as the core model.
- No source-name branching.
- No arbitrary generated React/runtime code.
- No app-route handlers as framework core.
- No app-specific database, auth, dashboard, or deployment assumptions in core docs.

## Acceptance Checklist

The cleanroom documentation is acceptable when:

- This folder is named as the canonical source of truth.
- The old root PRD reads as superseded, not active architecture.
- The root README no longer advertises the old app stack as the future target.
- V1 can be implemented offline with deterministic local tools and import-light packages.
- Middleweight studio/runtime features are clearly later path items.
- The developer guide includes schema, registry, AG-UI envelope, replay, trusted renderer, import-light, and source-scan gates.
