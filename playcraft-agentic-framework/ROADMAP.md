# Playcraft Agentic Game Framework Roadmap

**V1 complete, deferred waves tracked in `NEXT_WAVE.md`**

| Attribute | Value |
|-----------|-------|
| Status | Active roadmap |
| Date | 2026-07-06 |
| Schema version | `playcraft.v1` |

## 1. Roadmap Principle

Playcraft starts as a small local framework a coding agent can implement, test, and reason about. Studio UX, native packaging, server retrieval, local asset libraries, multi-tenant isolation, federated discovery, and richer debugging are deliberate additions on top of a stable core — they are deferred, not blocked, and each carries a written rationale and graduation criterion.

The v1 core is shipped. New work proceeds along three tracks:

1. **V1 hardening.** Keep the local-first, import-light boundary intact. Resolve bugs, expand deterministic fixtures, broaden axe-core coverage. Anything that touches the public contracts must respect the `playcraft.v1` discriminator and the lazy-wrap recursive schema pattern.
2. **V2 deferred waves.** Items in `NEXT_WAVE.md` graduate one at a time. Each item opens a new plan when its graduation criterion is met; promotion does not mean implementation begins immediately.
3. **Heavyweight non-goals.** Items rejected at the framework level (general 2D/3D engine, physics, marketplace, model hosting, etc.) — not deferred, never built.

## 2. V1 Status (Complete)

V1 is shipped. The current implementation includes:

- TypeScript contracts and Zod schemas, all stamped with `schemaVersion: "playcraft.v1"` (see `PRD.md` §4 and `ARCHITECTURE.md` §14).
- Mechanic / rule / component / theme / asset source / domain / safety registries (`packages/core`).
- Deterministic local planner (`packages/core`).
- Deterministic local asset source (`packages/assets`, exposed via `localAssetEditCatalog`).
- AG-UI adapter with validated Playcraft `Custom` envelopes (`packages/ag-ui`).
- Trusted React renderer for registered components only (`packages/renderer`).
- Replay harness for saved `GameAssemblyProfile` records.
- Three MVP profiles: memory match, sorting, and sequence repeat (`examples/profiles/`).
- Local `LocalPlaycraftService` facade with `BuilderServiceRequest`, `BuilderServiceRequestBatch`, and `BuilderServiceResponse` envelopes for text and `MoonshineTranscriptRecord` input (`packages/service`).
- In-process and HTTP JSON service transports over the same envelope (`createLocalServiceTransport`, `createHttpServiceTransport`, `handleServiceHttpRequestBody`, `playcraft-service-http`).
- Vite Studio (`apps/studio`) and Tauri Mobile-facing shell (`apps/mobile-shell`) consuming the shared service transport.
- `playcraft-service` CLI surface for catalog, assemble, update, preview, get-session, export-profile, import-profile, reset, execute-workflow, raw `BuilderServiceRequest` envelopes, request-batch, `--transcript` Moonshine transcript input, asset-edit requests, exact-envelope helpers, surfaced per-action required contracts, service facade summaries, request field summaries, exclusive and forbidden field groups, catalog-driven template aliases, and discoverable local replacement themes.
- Workflow graphs: `WorkflowGraphSchema`, `WorkflowNodeSchema`, `WorkflowEdgeSchema`, `WorkflowConditionSchema` (typed AST parser), and `WORKFLOW_NODE_CAP` (20).
- `execute-workflow` action in the service facade and the `playcraft-service run-workflow` CLI.
- Axe-core accessibility gate: `pnpm test:a11y` runs `vitest-axe` against the Studio and `LiveGame` surfaces; the CI gate is "zero critical-impact violations".
- Tauri v2 bundle signing staged for macOS, Windows, Android, iOS (see `DEV_GUIDE.md` §15).

V1 core excludes:

- Network access.
- Credentials or secrets.
- AI SDKs.
- GPU or model weights.
- Database services.
- Native-shell APIs in the framework path.
- Auth, dashboards, billing, production deployment assumptions.
- Third-party runtime adapters.

App shells may wrap the local service as long as the core packages remain import-light.

## 3. V1 Acceptance Gates (Met)

| Gate | Status | Verification |
|------|--------|--------------|
| Public schemas stamp `playcraft.v1` | Complete | `BasePublicContractSchema` in `packages/contracts/src/base.ts`. |
| Registry selection is capability-driven | Complete | `packages/core` registry tests; `GameType` / source-name forbidden by source scans. |
| Deterministic local tools produce stable MVP profiles | Complete | Replay harness in `packages/core`; `examples/profiles/*.json` fixtures. |
| AG-UI custom payloads are schema-validated | Complete | `PlaycraftAgUiEventEnvelopeSchema` in `packages/contracts/src/ag-ui.ts`. |
| Trusted renderer fails closed for unknown components | Complete | `packages/renderer` tests reject unknown component IDs, invalid props, generated runtime code. |
| Core imports are import-light | Complete | `tests/import-light-and-scans.test.ts` reads source files under `packages/contracts/src/`, `packages/core/src/`, `packages/service/src/`, and asserts no banned imports or core branching. |
| Source scans catch old abstractions | Complete | `pnpm test` includes the source-scan suite. |
| `pnpm typecheck` reports zero errors | Complete | Root `tsc -b` clean. |
| `pnpm test` reports ≥ 652 tests passing | Complete | 29/29 files, ≥ 652/652 tests. |
| `pnpm test:a11y` reports zero critical-impact axe violations | Complete | vitest-axe gate against `LiveGame` and `StudioApp` (Live + Developer tabs). |

## 4. MVP Profiles (Complete)

| Profile | Why it matters |
|---------|----------------|
| Memory Match | Proves reveal, pair matching, completion, hints, celebration, and card-grid rendering. |
| Sorting | Proves categorization, guided retry, bin components, and validation feedback. |
| Sequence Repeat | Proves ordered prompts, progression, replay timing, and input sequence validation. |

These profiles are fixtures assembled from registries, not hardcoded game types. Custom recipes (`template.custom.*`) extend the local planner with namespaced recipes without touching the bundled MVP profiles; see `DEV_GUIDE.md` §16.1.

## 5. V1 Hardening Path (Active)

After V1 shipped, hardening work continues without expanding the framework surface:

- Source-scan coverage expansion in `tests/import-light-and-scans.test.ts` (new helpers, new banned-pattern assertions).
- Axe-core rule coverage in `tests/studio-accessibility.test.tsx` (additional `LiveGame` profiles, additional tabs).
- Replay fixture additions (`examples/profiles/custom-*.json`, `examples/workflows/*.json`).
- Workflow graph `condition` round-trips through `parseWorkflowCondition` / `evaluateCondition`.
- Import-light boundary enforcement for any new package added under `packages/`.
- Mobile-shell signing configuration expansion in `apps/mobile-shell/src-tauri/tauri.conf.json` as Tauri v2 stabilizes (see `DEV_GUIDE.md` §15).

Hardening work must not move core assembly semantics into app routes, Tauri commands, database models, third-party runtime adapters, or a new schema discriminator.

## 6. V2 Deferred Waves

The V2 wave is forward-only. Each item in `NEXT_WAVE.md` carries a one-paragraph rationale, dependencies, and a graduation criterion. Promotion does not mean implementation begins immediately — it means the item is ready to be specified in detail.

| Item | Why deferred | Reference |
|------|--------------|-----------|
| Multi-tenant session isolation | Requires an identity model the framework rejects today (no auth, no DB, no remote discovery). | `NEXT_WAVE.md` §2.1 |
| npm package publishing | Workspace-local tooling is sufficient; semver/release process not yet needed. | `NEXT_WAVE.md` §2.2 |
| End-to-end test harness | Local package tests are sufficient until user journeys stabilize. | `NEXT_WAVE.md` §2.3 |
| Server retrieval implementation | Contract and threat model specified; implementation waits for plan acceptance. | `SERVER_RETRIEVAL_PLAN.md`, `NEXT_WAVE.md` §2.4 |
| Schema versioning beyond `playcraft.v1` | No breaking-change threshold reached; v1 is sufficient. | `NEXT_WAVE.md` §2.5 |
| Marketplace and pack publishing | Requires third-party discovery, signatures, moderation — none exist today. | `NEXT_WAVE.md` §2.6 |
| Federated discovery | Requires a registry server and trust model the framework rejects. | `NEXT_WAVE.md` §2.7 |
| Cross-host profile replay | Requires portability story and content-hash verification. | `NEXT_WAVE.md` §2.8 |
| Remote asset library sync | Local deterministic asset source is sufficient. | `NEXT_WAVE.md` §2.9 |
| Telemetry and observability | Network destination implied; threat model not yet updated. | `NEXT_WAVE.md` §2.10 |

The contract + threat model for a future server retrieval adapter is in `SERVER_RETRIEVAL_PLAN.md`. The current implementation uses only the local loopback `playcraft-service-http` server and the in-process `LocalPlaycraftService`; both are local-only and import-light.

## 7. Server Retrieval Path

A server retrieval adapter is a forward-only V2 wave. The current implementation does not include a remote catalog, remote asset library, or remote template retrieval. The shipped local path covers all required use cases.

When the V2 server retrieval wave opens, it must:

- Reuse the schemas in `@playcraft/contracts` (see `SERVER_RETRIEVAL_PLAN.md` "Required existing schemas").
- Preserve the seven-tool MCP allowlist (`McpServerPolicySchema`).
- Preserve the ownership semantics (`BuilderSessionOwnershipSchema`).
- Preserve the import-light boundary — the server adapter ships in its own package that is not on the import-light critical path.
- Pass the threat-model tests enumerated in `SERVER_RETRIEVAL_PLAN.md` before any catalog swap is enabled.

The local path stays unchanged. The local `BuilderCatalog` is the source of truth for templates, tools, asset-edit levers, request tips, and accepted input sources; the future server adapter is a different catalog, not a replacement for the local one.

## 8. Studio Path

The studio is a Vite React app layer around the service transport, not a framework core concern.

Shipped studio features:

- Live tab: `LiveGame` rendering the active `GameAssemblyProfile` through registered components.
- Developer tab: session timeline, profile import/export, callable action schemas, template aliases, local asset levers from `BuilderCatalog`.
- Request builder with surfaced per-action required contracts and request tips.
- Service-backed game assembly through `createLocalServiceTransport` (default) or `createHttpServiceTransport` (when `VITE_PLAYCRAFT_SERVICE_URL` is set).

Studio features consume framework packages. They do not define framework contracts.

## 9. Tauri Path

Tauri and Tauri Mobile are app shells around the static client.

Use Tauri for:

- Desktop/mobile packaging.
- Safe filesystem cache.
- Optional local playback and haptic hooks.
- OS permissions and lifecycle.
- Offline profile and asset cache.

Tauri v2 bundle signing is staged for macOS, Windows, Android, iOS (see `DEV_GUIDE.md` §15). The committed `tauri.conf.json` keeps only the shape of the signing stanzas (with `null` for the secret-bearing fields); real credentials are injected at build time through environment variables.

Do not put game assembly, registries, rule evaluation, replay, or AG-UI semantics in Rust commands unless a platform capability strictly requires a native bridge.

## 10. Heavyweight Non-Goals

Playcraft will not become:

- Unity.
- Godot.
- A physics-heavy 2D/3D engine.
- A general arbitrary-code game generator.
- A marketplace platform in V1 or V2.
- A model-hosting stack.
- A database/auth/dashboard application framework.
- An app-route-handler architecture.
- A production asset-generation service as a core requirement.

## 11. Graduation Criteria

V1 is shipped. New work in any wave begins only when:

- All V1 acceptance gates continue to pass.
- The local path remains import-light and offline-runnable.
- The public contracts still stamp `schemaVersion: "playcraft.v1"` (no in-flight schema drift).
- `NEXT_WAVE.md` is updated when a deferred item graduates, when a new item is added, or when an item's graduation criterion changes.
- The canonical source of truth remains this folder (`playcraft-agentic-framework/`).
