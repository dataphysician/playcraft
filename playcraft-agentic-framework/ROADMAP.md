# Playcraft Agentic Game Framework Roadmap

**Lightweight first, middleweight later**

| Attribute | Value |
|-----------|-------|
| Version | 1.0.0-cleanroom |
| Date | 2026-06-27 |
| Status | Canonical roadmap |

## 1. Roadmap Principle

Playcraft should start as a small local framework that a coding agent can implement, test, and reason about. Studio UX, native packaging, server catalog retrieval, local asset libraries, and richer debugging should grow around a stable core after the lightweight v1 proves the contracts.

## 2. Lightweight V1 Scope

V1 includes:

- TypeScript contracts and Zod schemas.
- Mechanic/rule/component/theme/asset source/domain/safety registries.
- Deterministic stub planner.
- Deterministic stub asset source.
- AG-UI adapter with validated Playcraft `Custom` envelopes.
- Trusted React renderer for registered components only.
- Replay harness for saved `GameAssemblyProfile` records.
- Three MVP profiles: memory match, sorting, and sequence repeat.
- Local builder service that exposes catalog, assemble, update, preview, session lookup, and profile export/import actions to user-facing shells.

V1 core excludes network, credentials, AI SDKs, GPU, model weights, database services, native-shell APIs, auth, dashboards, billing, and production deployment assumptions. App shells may wrap the local service as long as the core packages remain import-light.

## 3. V1 Milestone Path

| Milestone | Exit criteria |
|-----------|---------------|
| Contract kernel | Public schemas, fixtures, and schema tests exist. |
| Registry kernel | Mechanics, rules, components, themes, asset sources, domains, and safety policies register and select by capability. |
| Deterministic assembly | Stub planner and stub asset source produce stable MVP profiles. |
| AG-UI adapter | Lifecycle/state/activity/tool/custom event mapping is tested, and Playcraft envelopes validate. |
| Trusted renderer | Registered MVP components render from manifests and reject unknown/invalid requests. |
| Replay harness | Saved MVP profiles replay without planning or asset generation. |
| Import-light verification | Core imports without SDKs, network, GPU, model weights, database, Next.js, or Tauri. |
| Source scans | Scans block hardcoded `GameType`, source-name branching, generated code execution, and app-specific core assumptions. |

## 4. MVP Profiles

| Profile | Why it matters |
|---------|----------------|
| Memory Match | Proves reveal, pair matching, completion, hints, celebration, and card-grid rendering. |
| Sorting | Proves categorization, guided retry, bin components, and validation feedback. |
| Sequence Repeat | Proves ordered prompts, progression, replay timing, and input sequence validation. |

These profiles are fixtures assembled from registries, not hardcoded game types.

## 5. Middleweight Path

After v1 gates pass, continue hardening middleweight runtime/studio features:

- Vite studio app for authoring, preview, replay, and inspection. Current package: `apps/studio`.
- Local shell/API facade for catalog, assemble, update, preview, session lookup, profile export/import, and text/transcript normalization. Current package: `packages/service`.
- Tauri Mobile-facing webview scaffold around the Studio UI. Current package: `apps/mobile-shell`.
- Visual inspector and debug timeline for AG-UI events, Playcraft events, state snapshots, rule traces, safety findings, and asset provenance.
- Profile import/export for `GameAssemblyProfile` bundles.
- Curated local packs for mechanics, components, themes, sounds, icons, and safe starter assets.
- Server catalog retrieval for curated local asset packs and trusted components.
- Repository interfaces for optional persistence.
- Native packaging hardening after static client behavior, local cache policy, and offline profile import/export are proven.

Middleweight work must not move core assembly semantics into app routes, Tauri commands, database models, or hosted SDK adapters.

Current implementation notes, July 4, 2026:

- Milestones reached: local service envelope, HTTP service transport, CLI service surface, Studio and Mobile shell service wiring, local Moonshine transcript input, bundled asset-edit catalog, catalog-driven Studio request tips, per-session service state, and profile export/import.
- Supportive changes: stale hosted-avatar references are covered by source scans, app entrypoints are documented, request examples come from service catalog data instead of hardcoded Studio text, and imported profiles are replay-checked before becoming active.

## 6. Server Catalog and Asset Source Path

Hosted SDK adapters are not part of the framework path. The future server path retrieves trusted component manifests, templates, and curated asset-source metadata while preserving the same local service contracts.

Server retrieval requirements:

- Register local asset-source capability through `AssetSourceCapabilityManifest`.
- Declare network, credential, safety, format, dimension, and seed support.
- Return `GeneratedAssetRecord` values with provenance.
- Keep default tests local and deterministic.
- Never require hosted SDK SDK imports from contracts/core packages.

Asset-source selection must be capability-driven and must not branch on source names in core.

## 7. Studio Path

The studio is a later Vite React app, not the framework core.

Likely studio features:

- Request builder.
- Profile preview.
- Component preview.
- Registry browser.
- Validation panel.
- Replay runner.
- Debug timeline.
- Import/export.
- Pack compatibility view.

Studio features consume framework packages. They do not define framework contracts.

## 8. Tauri Path

Tauri and Tauri Mobile are later shells around the static client.

Use Tauri for:

- Desktop/mobile packaging.
- Safe filesystem cache.
- Optional native audio/haptic hooks.
- OS permissions and lifecycle.
- Offline profile and asset cache.

Do not put game assembly, registries, rule evaluation, replay, or AG-UI semantics in Rust commands unless a platform capability strictly requires a native bridge.

## 9. Heavyweight Non-Goals

Playcraft should not become:

- Unity.
- Godot.
- A physics-heavy 2D/3D engine.
- A general arbitrary-code game generator.
- A marketplace platform in v1.
- A model-hosting stack.
- A database/auth/dashboard application framework.
- A Next.js API route architecture.
- A production asset-generation service as a core requirement.

## 10. Graduation Criteria

Move from lightweight v1 to middleweight work only when:

- All v1 acceptance gates pass.
- The three MVP profiles are replayable from saved records.
- AG-UI custom payloads are schema-validated.
- The renderer fails closed for unknown components and invalid props.
- Core packages pass import-light tests.
- Source scans catch old abstractions and hosted-stack-specific shortcuts.
- The docs still identify this folder as the canonical source of truth.
