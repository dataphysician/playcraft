# Playcraft Agentic Game Framework Cleanroom Docs

| Attribute | Value |
|-----------|-------|
| Status | Canonical cleanroom specification |
| Date | 2026-06-27 |
| Scope | Documentation-only framework direction |
| Source of truth | `docs/cleanroom/playcraft-agentic-framework/` |

This folder is the canonical source of truth for the Playcraft Agentic Game Framework.

It supersedes the older PlayCraft AI app/product framing. The older framing described a Next.js/OpenAI/Postgres child-game application with app-specific auth, database, dashboard, and route assumptions. That history can be useful context, but it is not the foundation for the framework spec.

## Positioning

Playcraft is "GDevelop-inspired for coding agents": a lightweight game-assembly SDK/framework where agents assemble mini games from typed contracts, template definitions, event/rule semantics, registries, trusted components, theme packs, asset records, safety policies, and replayable profiles.

The user-facing builder accepts local text input and local speech transcripts. Speech transcripts are modeled as Moonshine Streaming CPU-only input records; there is no hosted-stack-specific video-avatar or hosted conversation stack in the Playcraft runtime.

Playcraft is not an AI game generator. AI or agents may help interpret intent, plan assemblies, or request assets, but the playable result must be a validated `GameAssemblyProfile` made from registered capabilities.

AG-UI is the standard outer protocol for agent/frontend interaction. Playcraft owns the game DSL, manifests, registries, replay model, safety semantics, trusted component runtime, and pack model.

## Doc Map

| Document | Purpose |
|----------|---------|
| [PRD.md](PRD.md) | Product/framework requirements for the AG-UI-native game-assembly SDK. |
| [DEV_GUIDE.md](DEV_GUIDE.md) | Lightweight implementation guide, package boundaries, contracts, tests, and milestones. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Protocol boundaries, AG-UI mapping, registries, replay, trusted runtime, and pack model. |
| [ROADMAP.md](ROADMAP.md) | Lightweight v1, middleweight path, and heavyweight non-goals. |

## Lightweight V1

The v1 target is intentionally small and local-first:

- TypeScript contracts and Zod schemas.
- Mechanic, rule, component, theme, and asset source registries.
- Deterministic local planner and deterministic local asset source.
- Builder tool contracts for assembling a game, updating a game, previewing trusted interactions, and listing local tools/templates.
- AG-UI adapter with validated Playcraft `Custom` envelopes.
- Trusted React renderer for registered components only.
- Replay harness for saved `GameAssemblyProfile` records.
- Three MVP profiles: memory match, sorting, and sequence repeat.
- Local service facade with validated `BuilderServiceRequest` and `BuilderServiceResponse` envelopes for text requests and `MoonshineTranscriptRecord` inputs from Moonshine Streaming CPU transcript records.
- In-process and HTTP JSON service transports over the same request/response envelope, including a local `playcraft-service-http` server.
- Studio and Tauri Mobile-facing shells that default to the in-process local service and can call the HTTP service by setting `VITE_PLAYCRAFT_SERVICE_URL`.
- `playcraft-service` CLI surface for catalog, assemble, update, preview, get-session, export-profile, import-profile, reset, raw `BuilderServiceRequest` envelopes, `--transcript` Moonshine transcript input, and asset-edit requests with callable argument schemas, catalog-driven template aliases, and discoverable local replacement themes.
- Vite Studio and a Tauri Mobile-facing shell that assemble games through the shared service transport.
- Studio Developer profile tools that export/import validated profile bundles through the same service transport.
- Studio Developer catalog tools that render callable action schemas, template aliases, and local asset levers from `BuilderCatalog`.

The core framework packages must be buildable and testable without network access, credentials, AI SDKs, GPU, model weights, a database, or a native shell. The mobile shell is an app layer around the same local service, not a core dependency.

## Middleweight Later Path

Current middleweight app work includes the Vite studio, local service, visual game preview, developer timeline, and a Tauri Mobile-facing webview scaffold. Later docs may specify richer curated local packs, server catalog retrieval, and asset-library adapters. Hosted hosted SDK adapters are not part of the framework path.

## Explicit Rejections

The framework docs reject the old app-centered abstractions:

- No hardcoded `GameType` enum as the core model.
- No source-name branching.
- No arbitrary generated React/runtime code.
- No Next.js API routes as framework core.
- No app-specific database, auth, dashboard, or deployment assumptions in core docs.

## Acceptance Checklist

The cleanroom documentation is acceptable when:

- This folder is named as the canonical source of truth.
- The old root PRD reads as superseded, not active architecture.
- The root README no longer advertises the old app stack as the future target.
- V1 can be implemented offline with deterministic local tools and import-light packages.
- Middleweight studio/runtime features are clearly later path items.
- The developer guide includes schema, registry, AG-UI envelope, replay, trusted renderer, import-light, and source-scan gates.
