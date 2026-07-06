# Playcraft Agentic Game Framework PRD

**GDevelop-inspired game assembly for coding agents**

| Attribute | Value |
|-----------|-------|
| Status | Active framework specification |
| Date | 2026-07-06 |
| Schema version | `playcraft.v1` |
| Audience | Product, engineering, design, coding-agent/tooling developers |

## 1. Vision

Playcraft is a local-first, AG-UI-native SDK/framework for assembling mini games from typed contracts, event/rule semantics, trusted components, registries, assets, safety policies, and replayable profiles. A coding agent or a human through the Studio supplies intent; the framework validates and produces a `GameAssemblyProfile` made only from registered, replay-checked primitives.

The product analogy is "GDevelop-inspired for coding agents." GDevelop shows that games can be authored through objects, events, behaviors, extensions, preview, and export. Playcraft adapts that lesson for agentic software development: agents assemble a constrained event/behavior graph instead of inventing a bespoke game runtime.

Playcraft is not an AI game generator. Agents may plan, suggest, and assemble. The framework must validate what they produce.

## 2. Product Thesis

Coding agents are good at following explicit contracts and bad at safely inventing ad hoc runtimes under vague requirements. Playcraft gives agents a small target:

- A game DSL expressed as TypeScript types and Zod schemas, with a single `playcraft.v1` schema discriminator across all public objects.
- Registries for mechanics, rules, components, themes, and asset sources.
- AG-UI event mapping for frontend/agent interaction.
- A trusted React rendering surface.
- Replayable `GameAssemblyProfile` records.
- Safety and privacy policies that are explicit, versioned, and testable.

The first useful domain is child-friendly educational mini games, but the framework must not bake child-specific assumptions into the generic core. Child behavior belongs in domain profiles, safety policy packs, rule packs, component packs, and theme packs.

## 3. Target Users

| User | Need |
|------|------|
| Coding agents | A strict DSL and registries they can target without inventing one-off game systems. |
| Product developers | A reusable way to assemble safe, replayable mini games. |
| Designers | Theme/component packs that keep assembled games coherent. |
| QA and safety reviewers | Inspectable profiles, event logs, validation results, provenance, and deterministic replay. |
| Future pack authors | A stable extension model for mechanics, rules, components, themes, and local asset sources. |
| Parents and educators | Predictable child-friendly games assembled from reviewed primitives. |

## 4. Current Package Layout

| Package / App | Responsibility |
|---------------|----------------|
| `packages/contracts` | Zod schemas, TypeScript types, schema versions, fixture builders. The barrel `src/index.ts` re-exports the twelve domain modules: `base`, `condition`, `workflow`, `mcp`, `sse`, `asset`, `ag-ui`, `packs`, `game-template`, `builder-catalog`, `manifests`, `builder`. |
| `packages/contracts/src/condition.ts` | `WorkflowConditionSchema` plus the `parseWorkflowCondition` AST parser (`parseExpression` / `parseLenExpression` / `parseCompareExpression`) and `evaluateCondition` evaluation. |
| `packages/contracts/src/workflow.ts` | `WorkflowGraphSchema`, `WorkflowNodeSchema`, `WorkflowEdgeSchema`, `WORKFLOW_NODE_CAP` (20). |
| `packages/contracts/src/builder.ts` | `BuilderServiceRequestSchema`, `BuilderServiceRequestBatchSchema`, `BuilderServiceResponseSchema`, `BuilderServiceErrorSchema`, `BuilderServiceExecutionSchema`, `BuilderProfileExportSchema`, `BuilderToolDefinitionSchema`, `BuilderInputRequestSchema`, `BuilderIntentResolutionSchema`, `BuilderPreviewInteractionSchema`, `BuilderPreviewStateSchema`, `BuilderSessionOwnershipSchema`, `BuilderServiceActionNameSchema`, `BuilderTemplateIdSchema`, `BuilderAssetEditSchema`, `BuilderActionNameSchema`, `BuilderInputSourceSchema`, `MoonshineTranscriptRecordSchema`. |
| `packages/contracts/src/builder-catalog.ts` | `BuilderCatalogSchema` — the `BuilderCatalog` the service emits. |
| `packages/contracts/src/mcp.ts` | `McpManifestSchema`, `McpServerPolicySchema` (the seven-tool allowlist). |
| `packages/contracts/src/sse.ts` | `SseFrameSchema` and SSE frame helpers used by the local HTTP server. |
| `packages/contracts/src/ag-ui.ts` | `PlaycraftAgUiEventEnvelopeSchema`, `PlaycraftEventRecordSchema`. |
| `packages/contracts/src/asset.ts` | `AssetGenerationRequestSchema`, `AssetSourceCapabilityManifestSchema`, `GeneratedAssetRecordSchema`, `AssemblyValidationResultSchema`, `AssetCatalogManifestSchema`. |
| `packages/contracts/src/game-template.ts` | `GameAssemblyProfileSchema`, `GameProfileTemplateSnapshotSchema`, `GameTemplateDefinitionSchema`. |
| `packages/contracts/src/manifests.ts` | `MechanicDefinitionSchema`, `RuleModuleDefinitionSchema`, `ComponentManifestSchema`, `ComponentRenderRequestSchema`, `ThemePackSchema`, `DomainProfileSchema`, `SafetyPolicyPackSchema`, `FrontendToolDefinitionSchema`. |
| `packages/contracts/src/packs.ts` | `PackManifestSchema`, `BuilderTemplateNamespaceSchema`. |
| `packages/contracts/src/base.ts` | `PLAYCRAFT_SCHEMA_VERSION = "playcraft.v1"`, `StableIdSchema`, `VersionSchema`, `CapabilityTagSchema`, `AgeBandSchema`, `InputModalitySchema`, `AssetContentTypeSchema`, `AssetFormatSchema`, `SafetyStatusSchema`, `ValidationSeveritySchema`, `JsonValueSchema`, `JsonFieldSchema`, `JsonObjectSchemaDescriptorSchema`, `SchemaIssueSchema`, `CompatibilityConstraintsSchema`, plus the public-contract base and discriminator. |
| `packages/core` | Registries, deterministic local planner, deterministic local asset source, rule evaluation, safety evaluation, replay model. |
| `packages/ag-ui` | AG-UI event mapping, Playcraft `Custom` envelope adapters, stream helpers. |
| `packages/renderer` | Trusted React renderer, component registry, component manifest validation. |
| `packages/assets` | Local asset request schemas, deterministic local asset source, asset-edit catalog, local replacement folders (dinosaurs, toys, dolphins/ocean animals, fruits). |
| `packages/packs` | Initial mechanic, rule, component, theme, domain, safety, and asset-source packs. Defines `DEFAULT_GAME_TEMPLATE_ID` and `gameTemplateDefinitions`. |
| `packages/builder` | Local builder tool handler. `createBuilderCommandHandler()` returns a `BuilderCommandHandler` that executes `assemble-game`, `update-game`, `preview-action`, `importProfile`, `listTemplates`, `listTools`, and `getSessionSnapshot`. |
| `packages/mcp` | MCP-compatible HTTP adapter for the seven-tool allowlist. |
| `packages/service` | Local app/API facade and `playcraft-service` CLI over the in-process `LocalPlaycraftService`. Split into `index.ts` (class body + workflow executor), `local-catalog.ts` (catalog constants + session state helpers), `intent-resolution.ts` (text/transcript resolution + Moonshine transcript config), `json-helpers.ts` (envelope helpers, `defaultFetch`, `createMoonshineTranscriptRecord`). |
| `apps/studio` | Vite React studio (Live tab + Developer tab) consuming `@playcraft/service` over `createLocalServiceTransport` (default) or `createHttpServiceTransport` (when `VITE_PLAYCRAFT_SERVICE_URL` is set). |
| `apps/mobile-shell` | Tauri Mobile-facing webview shell reusing the Studio UI and the same service transport. Tauri v2 bundle signing is staged (see `DEV_GUIDE.md` §15). |
| `examples/profiles` | Saved `GameAssemblyProfile` fixtures (memory match, sorting, sequence repeat, and `template.custom.*` recipes). |
| `examples/workflows` | `WorkflowGraph` JSON examples (linear, parallel, conditional, error-handling). |

`packages/contracts` is the only public schema source. Other packages and apps import the barrel `@playcraft/contracts`; they do not import individual domain modules directly, so a schema split never breaks a downstream consumer.

## 5. Core Product Model

| Object | Meaning |
|--------|---------|
| `PlaycraftAssemblyRequest` | Structured request to assemble a game from intent, domain constraints, target modality, and policy. |
| `DomainProfile` | Domain defaults and constraints, such as child-friendly educational games. |
| `SafetyPolicyPack` | Safety, privacy, rating, content, and modality rules. |
| `GameAssemblyProfile` | Saved recipe for one playable mini game. |
| `GameTemplateDefinition` | Reusable local template that bounds game rules, required mechanics, trusted components, and the default assembly request. |
| `MechanicDefinition` | Reusable interaction primitive such as reveal, match, sort, sequence, choose, trace, or guided response. |
| `RuleModuleDefinition` | Event/rule logic for progression, hints, retry, scoring, completion, safety, and celebration. |
| `ComponentManifest` | Trusted frontend render capability for one or more mechanics. |
| `ThemePack` | Visual/audio style bundle with accessibility and policy constraints. |
| `AssetGenerationRequest` | Local asset-source request for image, audio, animation, or text assets. |
| `AssetSourceCapabilityManifest` | Machine-readable local asset-source capability and constraint record. |
| `GeneratedAssetRecord` | Provenance-rich output of an asset request. |
| `PlaycraftAgUiEventEnvelope` | Validated Playcraft payload carried inside AG-UI `Custom` events. |
| `PlaycraftEventRecord` | Normalized runtime/replay event emitted by mechanics, rules, components, and tools. |
| `BuilderInputRequest` | Local text or Moonshine Streaming CPU transcript input accepted by the builder. |
| `BuilderToolDefinition` | Contract for reusable builder actions such as `assemble`, `update`, `preview`, `catalog`, `get-session`, `export-profile`, `import-profile`, `reset`, `execute-workflow`. |
| `BuilderServiceRequest` | Validated request envelope accepted by `LocalPlaycraftService.handle`. The `schemaVersion` discriminator is `playcraft.v1`. |
| `BuilderServiceRequestBatch` | Array of `BuilderServiceRequest` envelopes sharing one local session. |
| `BuilderServiceResponse` | Response envelope carrying a `catalog`, `execution`, `session`, `profileExport`, or `error` payload. |
| `BuilderCatalog` | The catalog exposed by `LocalPlaycraftService.catalog()`: templates, tools, accepted input sources, request tips, asset-edit levers, retrieval status, session policy. |
| `BuilderIntentResolution` | Outcome of `resolveBuilderInputCommand`: matched template, matched asset edit, recorded `BuilderInputRequest`. |
| `MoonshineTranscriptRecord` | Validated local Moonshine Streaming CPU transcript record (transcript text + engine/runtime/localOnly metadata + optional timing). |
| `WorkflowGraph` / `WorkflowNode` / `WorkflowEdge` / `WorkflowCondition` | Workflow graph schema with the typed `WorkflowConditionSchema` AST parser. |

## 6. AG-UI Strategy

AG-UI is the standard outer protocol between agentic backends and Playcraft frontends. Playcraft does not define a parallel streaming protocol.

AG-UI handles:

- Run lifecycle.
- Step progress.
- State snapshots and deltas.
- Activity/progress events.
- Tool calls and tool results.
- Custom events.

Playcraft handles:

- The game DSL and schemas.
- Registry selection and compatibility checks.
- Playcraft-specific `Custom` event payload validation.
- Trusted component render semantics.
- Domain profiles and safety policies.
- Replayable profile persistence semantics.

AG-UI is domain-neutral. Playcraft custom payloads carry game semantics.

## 7. V1 Scope (Complete)

V1 is complete. The shipped surface covers:

- TypeScript contracts and Zod schemas for every public object, all stamped with `schemaVersion: "playcraft.v1"`.
- Mechanic, rule, component, theme, asset source, domain, and safety registries.
- Deterministic local planner.
- Deterministic local asset source.
- AG-UI adapter with validated Playcraft `Custom` envelopes.
- Trusted React renderer that can render registered components only.
- Replay harness that reconstructs a game from saved `GameAssemblyProfile` records.
- Three MVP profiles: memory match, sorting, and sequence repeat.
- Local `LocalPlaycraftService` facade with `BuilderServiceRequest`, `BuilderServiceRequestBatch`, and `BuilderServiceResponse` envelopes for text input and `MoonshineTranscriptRecord` input.
- In-process and HTTP JSON service transports over the same envelope (`createLocalServiceTransport`, `createHttpServiceTransport`, `handleServiceHttpRequestBody`, `playcraft-service-http`).
- Vite Studio and a Tauri Mobile-facing shell that consume the shared service transport.
- `playcraft-service` CLI surface for catalog, assemble, update, preview, get-session, export-profile, import-profile, reset, raw `BuilderServiceRequest` envelopes, `request-batch`, `--transcript` Moonshine transcript input, asset-edit requests, exact-envelope helpers, surfaced per-action required contracts, service facade summaries, request field summaries, exclusive and forbidden field groups, catalog-driven template aliases, and discoverable local replacement themes.
- Studio Developer profile tools that export/import validated profile bundles through the same service transport.
- Studio Developer catalog tools that render callable action schemas, template aliases, and local asset levers from `BuilderCatalog`.
- Workflow graphs: `WorkflowGraphSchema`, `WorkflowNodeSchema`, `WorkflowEdgeSchema`, `WorkflowConditionSchema` (typed AST parser), and `WORKFLOW_NODE_CAP` (20).
- Axe-core accessibility gate: `pnpm test:a11y` runs `vitest-axe` against the Studio and `LiveGame` surfaces; the CI gate is "zero critical-impact violations".
- Tauri v2 bundle signing staged for macOS, Windows, Android, iOS (see `DEV_GUIDE.md` §15).
- Server retrieval: planned only. See `SERVER_RETRIEVAL_PLAN.md` for the contract + threat model. See `NEXT_WAVE.md` for deferred work.

V1 runs and tests without:

- Network access.
- Credentials or secrets.
- AI SDKs.
- GPU or model weights.
- Database services.
- Third-party runtime adapters in the framework path.
- Real-time call stacks or remote session state.

## 8. Initial Mechanics

| Mechanic | Purpose |
|----------|---------|
| `tap-to-select` | Select one visible object. |
| `tap-to-reveal` | Reveal hidden object content. |
| `match-pairs` | Match related objects. |
| `sort-into-bins` | Assign objects to categories. |
| `sequence-repeat` | Repeat a visual sequence. |
| `choose-one` | Pick one answer from a small safe set. |
| `trace-path` | Follow a simple path with touch or pointer input. |
| `drag-or-tap-move` | Move an object, with tap fallback. |
| `hint-prompt` | Offer contextual help. |
| `retry-loop` | Retry without punitive feedback. |
| `timed-celebration` | Play short success feedback. |

These mechanics are registry entries, not a hardcoded `GameType` enum.

## 9. Initial Rules

Initial rule categories:

- Completion.
- Attempt and retry.
- Hint timing.
- Noncompetitive progress.
- Age-band difficulty.
- Safety/content blocking.
- Session bounds and quiet mode.
- Celebration and feedback.

Rules consume `PlaycraftEventRecord` events and emit state patches, normalized events, validation warnings, and replay records. Rule defaults must come from profiles, manifests, themes, domain profiles, or explicit config records.

## 10. Trusted Components

Agents may request registered component capabilities. They may not generate arbitrary React or runtime code for play surfaces.

Initial component capabilities:

- `ChoiceGrid`
- `RevealCardGrid`
- `PairMatchBoard`
- `SortBins`
- `SequencePad`
- `AudioPromptPanel`
- `TraceCanvas`
- `CelebrationOverlay`
- `HintBubble`

Every component must have a `ComponentManifest` with props schema, supported mechanics, emitted frontend tools, asset requirements, accessibility requirements, policy constraints, and replay behavior.

## 11. MVP Profiles

| Profile | Mechanics | Rules | Components |
|---------|-----------|-------|------------|
| Memory Match | `tap-to-reveal`, `match-pairs`, `timed-celebration` | Pair match, retry, hint, completion | `RevealCardGrid`, `CelebrationOverlay` |
| Sorting | `tap-to-select`, `sort-into-bins`, `retry-loop` | Category validation, guided retry, completion | `ChoiceGrid`, `SortBins`, `HintBubble` |
| Sequence Repeat | `sequence-repeat`, `tap-to-select`, `timed-celebration` | Progression, attempt feedback, hint | `SequencePad`, `ChoiceGrid`, `CelebrationOverlay` |

Each profile is assembled through registries and deterministic local tools, then replayed from the saved `GameAssemblyProfile`.

## 12. Authoring Flow

1. User or agent provides intent.
2. Intent parser emits `PlaycraftAssemblyRequest` (or a `BuilderInputRequest` through the service).
3. Planner selects domain profile, safety policy pack, mechanics, rules, theme, components, and asset needs from registries.
4. Asset requester emits local asset-source `AssetGenerationRequest` records.
5. Deterministic local asset source returns `GeneratedAssetRecord` values.
6. Safety evaluator checks text, asset metadata, mechanics, age/domain fit, privacy, and policy.
7. Assembly validator checks schemas, registry references, event graph, component bindings, assets, safety, and replay readiness.
8. AG-UI stream reports progress, state, custom events, policy findings, and validation results.
9. Frontend renders trusted components only.
10. Saved profile can be replayed without re-running planning or asset generation.

## 13. Explicit Rejections

The framework must reject these old abstractions:

- No hardcoded `GameType` enum as the core model.
- No source-name branching.
- No arbitrary generated React/runtime code.
- No app-route handlers as framework core.
- No app-specific database, auth, dashboard, or deployment assumptions in core docs.
- No behavior-changing defaults hidden as bare constants in core logic.
- No third-party runtime integration in the framework path.
- No v1.1 / v2 schema reservation in the public contracts — everything ships as `playcraft.v1`. Any future v2 discriminator is a deferred wave (see `NEXT_WAVE.md` §2.5).

## 14. Success Criteria

V1 is considered shipped when:

- An agent can assemble memory match, sorting, and sequence repeat from registered primitives.
- AG-UI carries lifecycle, state, activity, tool, and Playcraft custom messages.
- Every Playcraft `Custom` event envelope is schema-validated.
- The frontend renders only registered trusted React components.
- Deterministic local tools build and replay profiles offline.
- A saved `GameAssemblyProfile` reconstructs the same playable game.
- Safety policy and domain profile selection can change validation behavior without changing AG-UI handling.
- Registry tests prove selection is capability-driven, not game-type or source-name branching.
- `pnpm typecheck` reports zero errors.
- `pnpm test` reports ≥ 652 tests passing.
- `pnpm test:a11y` reports zero critical-impact axe violations.

## 15. Non-Goals (Forward-Only)

V1 is intentionally small. The following are out of scope for the current implementation; they are tracked in `NEXT_WAVE.md` with rationale and graduation criteria:

- Multi-tenant session isolation.
- npm package publishing.
- End-to-end test harness.
- Server retrieval implementation (see `SERVER_RETRIEVAL_PLAN.md`).
- Schema versioning beyond `playcraft.v1`.
- Marketplace and pack publishing.
- Federated discovery.
- Cross-host profile replay.
- Remote asset library sync.
- Telemetry and observability.

Heavyweight non-goals (rejected at the framework level, not deferred):

- General-purpose 2D/3D engine.
- Physics-heavy gameplay.
- Marketplace or community extension publishing.
- Full visual game editor.
- Real asset generation as a dependency for local development or tests.
- Runtime-generated play-surface code.
- Database/auth/dashboard product assumptions in core framework contracts.
