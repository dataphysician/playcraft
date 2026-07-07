# Playcraft Agentic Game Framework Architecture

**Protocol, registry, provenance, recipe namespace, replay, runtime, and pack architecture for the local-LLM, agent-driven game-assembly SDK**

| Attribute | Value |
|-----------|-------|
| Status | Active architecture spec |
| Date | 2026-07-06 |
| Schema version | `playcraft.v1` |
| Wave pivot | Wave H — local LLM agent is the primary path; remote enrichment is an opt-in layer for capability gaps. |

## 1. Architecture Goals

Playcraft architecture must keep coding-agent output constrained, inspectable, replayable, and **provable**: every building block carries a `provenance` discriminator that names the path that produced it (bundled-local / authored-local / remote-agent). The framework must do this without external dependencies: no hosted retrieval, no third-party runtime, no model SDK at the core boundary.

The framework provides:

- A typed game DSL (manifests, profiles, replays).
- Strict Zod schemas stamped with the `playcraft.v1` discriminator.
- Capability registries carrying the `provenance.source` field on every entry.
- AG-UI protocol mapping.
- A `DeterministicAssemblyPlanner` that accepts LLM-authored recipes through `registerRecipe()` at runtime.
- A local asset folder (`apps/studio/src/assets/library/replacements/`, overridable via `PLAYCRAFT_REPLACEMENTS_FOLDER`) as the canonical asset source.
- A `RemoteEnrichmentSource` interface plus a `NullRemoteEnrichmentSource` default; no HTTP source ships.
- `AgentLoop` driving the `MoonshineStreamingCpuEngine` (LFM2.5-VL-450M-Extract over Moonshine Streaming CPU) with `Outlines`-constrained JSON tool calls.
- Bundle size enforcement via `GAME_BUNDLE_MAX_BYTES`, `GAME_BUNDLE_MAX_REGISTRY_ENTRIES`, and `purgedEntryIds`.
- Pack-based extension.
- Import-light local verification.

The core must not depend on cloud-side framework SDKs, app frameworks, route systems, databases, auth services, GPU, model weights at runtime, or native shells.

## 2. Layer Model

| Layer | Responsibility |
|-------|----------------|
| AG-UI transport | Standard agent/frontend lifecycle, state, activity, tool, and custom events. |
| Playcraft AG-UI adapter | Validates Playcraft `Custom` envelopes and maps framework operations to AG-UI. |
| Contracts | Zod schemas and TypeScript types for every public object. The `@playcraft/contracts` barrel re-exports `base`, `condition`, `workflow`, `mcp`, `sse`, `asset`, `ag-ui`, `packs`, `game-template`, `builder-catalog`, `manifests`, `builder`, `game-bundle`, `agent`, `enrichment`. Every domain module stamps `schemaVersion: "playcraft.v1"`. Every building block carries a `provenance` discriminator. |
| Core | Capability registries, the `DeterministicAssemblyPlanner` (with `registerRecipe`), the `AgentLoop`, the `LocalInferenceEngine` interface, the bundle cap enforcer, the replay model, and the rule / safety evaluators. |
| Packs | Versioned mechanics, rules, components, themes, asset sources, domain profiles, and safety policies. `packages/packs` exports `gameTemplateDefinitions`, `mvpAssemblyRecipes`, `customTemplateRecipes`, and `DEFAULT_GAME_TEMPLATE_ID`. |
| Assets | `LocalAssetFolderSource` reads the canonical local folder (`apps/studio/src/assets/library/replacements/`) or the override target set by `PLAYCRAFT_REPLACEMENTS_FOLDER`. `RemoteEnrichmentSource` is an opt-in interface; the default is the null source. |
| Renderer | Trusted React renderer over the registered component manifests, including the `provenance` field on each `ComponentManifest`. |
| Builder tools | `packages/builder`'s `BuilderCommandHandler` executes `assemble-game`, `update-game`, `preview-action`, `listTemplates`, `listTools`, and `getSessionSnapshot`. |
| Service | `LocalPlaycraftService` in `packages/service` plus `playcraft-service-http` over the same `BuilderServiceRequest` / `BuilderServiceResponse` envelope. Supports `BuilderServiceRequestBatchSchema` for same-process request batches. |
| Studio / mobile shell | `apps/studio` (Vite React) and `apps/mobile-shell` (Tauri Mobile-facing webview) consume the service transport. They default to `createLocalServiceTransport` and switch to `createHttpServiceTransport` when `VITE_PLAYCRAFT_SERVICE_URL` is set. |

## 3. Protocol Boundaries

| Boundary | Playcraft owns | External layer owns |
|----------|----------------|---------------------|
| Agent/frontend stream | Custom payload schemas, validation, game semantics | AG-UI event transport and event categories |
| Local asset fulfillment | Folder scanning, capability selection, generation records | Local filesystem reads via `LocalAssetFolderSource` |
| Remote asset fulfillment | The `RemoteEnrichmentSource` interface, the `RemoteEnrichmentRequest` / `RemoteEnrichmentResponse` schemas | Whatever the host wires up; the framework ships no HTTP source |
| Rendering | Component manifests (with `provenance`), trusted registry, replay events | React DOM implementation details |
| Persistence | Profile shape, replay requirements, import/export semantics | The host filesystem or app-specific store |
| Native shell | Framework contracts and static client compatibility | Tauri permissions, native APIs, app lifecycle |
| Product app | Game assembly framework semantics | Auth, billing, dashboards, deployment, analytics |

Builder input is local-first: text requests and Moonshine Streaming CPU-only transcript records both become `BuilderInputRequest` records before they reach the builder service. Transcript input is represented as a validated `MoonshineTranscriptRecord`; the framework stores transcript text, CPU/local-only engine metadata, optional timing segments, and provenance.

The current user-facing app path is `apps/studio` for the web studio and `apps/mobile-shell` for a Tauri Mobile-facing shell. Both route assembly through `@playcraft/service` over the in-process transport by default and switch to the local HTTP service (`playcraft-service-http`) when `VITE_PLAYCRAFT_SERVICE_URL` is set.

The service package includes `createLocalServiceTransport`, `createHttpServiceTransport`, `handleServiceHttpRequestBody`, and `handleLocalServiceRequestBatch` over the same envelope. The local HTTP service is the loopback service that ships with the framework. Remote enrichment is reachable only when the host explicitly provides a `RemoteEnrichmentSource` implementation.

Agents can also use the `playcraft-service` CLI bin for `catalog`, `assemble`, `update`, `preview`, `get-session`, `export-profile`, `import-profile`, `reset`, `execute-workflow`, raw `BuilderServiceRequest` commands, or same-process `BuilderServiceRequestBatchSchema` request batches over the validated service boundary. The catalog surfaces bundled templates, default and transcript input sources, callable builder tool argument schemas, surfaced per-action required contracts, service facade action summaries, request field summaries, exclusive and forbidden field groups, exact-envelope helpers, transport helpers, and available local replacement themes (dinosaurs, toys, dolphins/ocean animals, fruits); Studio request tips and the Developer tool catalog render from that same catalog.

Live app surfaces are template-owned: each `GameTemplateLiveSurface` declares the component capabilities, asset replacement sources, explicit token styles, and a default token style used when a profile introduces new local asset tokens.

## 4. AG-UI Mapping

AG-UI is the outer protocol. Playcraft uses standard event categories and places framework-specific data in validated `Custom` event values.

| Playcraft operation | AG-UI mapping |
|---------------------|---------------|
| Assembly run begins | Run lifecycle start event |
| Assembly run completes | Run lifecycle finish event |
| Assembly run fails | Run lifecycle error event |
| Agent loop starts/finishes | Step events |
| Planner starts/finishes | Step events |
| Asset request/generation progresses | Activity events plus Playcraft custom events |
| Safety/validation findings | Step events plus Playcraft custom events |
| Full editor/profile/game state | State snapshot event |
| Incremental state change | State delta event |
| Frontend interaction request | Tool call events |
| Frontend interaction result | Tool result event |
| Render, asset, replay, profile, safety payloads | `Custom` event with `PlaycraftAgUiEventEnvelope` |

Initial custom event names include `playcraft.profile.proposed`, `playcraft.profile.validated`, `playcraft.component.renderRequested`, `playcraft.asset.requested`, `playcraft.asset.progress`, `playcraft.asset.generated`, `playcraft.safety.finding`, `playcraft.replay.ready`, `playcraft.replay.event`, and `playcraft.recipe.registered`.

## 5. Playcraft Custom Envelope

Every AG-UI `Custom` event value must be a validated envelope whose envelope shape carries `schemaVersion`, `eventId`, optional `profileId`, optional `runId`, `payloadType`, `payload`, and a `provenance.role` plus `provenance.sourceId`. Validation rejects unknown `payloadType` unless explicitly allowed by a registered pack, validates `payload` against the schema for its type, preserves `eventId`, `runId`, `profileId`, `role`, and schema version for replay and debugging, and refuses to trust raw frontend payloads until tool arguments are schema-validated.

## 6. Game DSL

The DSL is represented by profile and manifest contracts, not a scripting language.

DSL objects:

- `GameAssemblyProfile`
- `MechanicDefinition` (with `provenance`)
- `RuleModuleDefinition` (with `provenance`)
- `ComponentManifest` (with `provenance`)
- `ComponentRenderRequest`
- `ThemePack` (with `provenance`)
- `AssetGenerationRequest`
- `GeneratedAssetRecord`
- `SafetyPolicyPack` (with `provenance`)
- `DomainProfile` (with `provenance`)
- `AssetSourceCapabilityManifest` (with `provenance`)
- `PlaycraftEventRecord`
- `LocalInferenceEngineManifest`, `AgentToolCall`, `AgentStep`, `PlaycraftAgentTranscript`
- `RemoteEnrichmentRequest`, `RemoteEnrichmentResponse`

The DSL describes what the game is, how mechanics connect, which rules consume and emit events, which components may render state, which assets bind to entities, which path (bundled-local / authored-local / remote-agent) produced each manifest, and how replay reconstructs behavior.

## 7. Provenance Discriminator

Every building block ships with a required `provenance` field:

```ts
provenance: z.object({
  source: z.enum(["bundled-local", "authored-local", "remote-agent"]),
  authoredBy: z.string().min(1).max(120).optional(),
  authoredAt: z.string().datetime().optional(),
  remoteUrl: z.string().url().optional()
}).strict()
```

Semantics:

| `source` | Meaning |
|----------|---------|
| `bundled-local` | The manifest is shipped in a `@playcraft/packs` package. Use `BUNDLED_LOCAL_PROVENANCE = { source: "bundled-local" }` as the default stamp. |
| `authored-local` | The manifest was authored by the local LLM agent at runtime (Outlines-constrained JSON via `AgentLoop`). `authoredBy` carries the engine id; `authoredAt` is the agent-loop timestamp. |
| `remote-agent` | The manifest was returned by the `RemoteEnrichmentSource` (only when a host wires one up). `remoteUrl` carries the source URL; `authoredAt` carries the fetch timestamp. |

There is no migration between sources. A manifest authored by the agent loop but later promoted into a packed release gets a new id under `recipe.bundled.*` and ships with `provenance.source: "bundled-local"`.

## 8. Recipe Namespace

`AssemblyRecipe.id` follows three namespaces:

| Prefix | Meaning |
|--------|---------|
| `recipe.bundled.<slug>` | Shipped recipes from a `@playcraft/packs` package. Discovered by the default planner. |
| `recipe.local-authored.<slug>` | Recipes the local LLM agent loop registered at runtime through `DeterministicAssemblyPlanner.registerRecipe()`. Validated on registration: id namespace, non-empty `capabilityTags`, dedupe. |
| `recipe.remote-agent.<slug>` | Recipes returned by the `RemoteEnrichmentSource` and registered the same way. |

`DeterministicAssemblyPlanner.registerRecipe()`:

- Validates `recipe.id` against the three prefixes.
- Validates `recipe.version` is non-empty.
- Validates `recipe.capabilityTags` is a non-empty array.
- Validates `recipe.build` is a function.
- Dedupes by `recipe.id`.
- Throws on any violation. No migration; no out-of-scope prefix.

The constructor path (`new DeterministicAssemblyPlanner({ recipes })`) accepts the out-of-scope test fixtures without namespace enforcement because tests need to set up ambiguous scenarios. Packed recipes must use the namespace or `registerRecipe()` rejects them.

## 9. Registry Architecture

Registries are the central selection mechanism.

| Registry | Required behavior |
|----------|-------------------|
| Mechanic registry | Lookup by capability, id/version, event compatibility, modality, age/domain support, asset requirements, and `provenance.source`. |
| Rule registry | Lookup by category, consumed/emitted events, supported mechanics, policy constraints, default source, and provenance. |
| Component registry | Lookup by render capability, supported mechanics, props schema, emitted tools, accessibility, replay behavior, and provenance. |
| Theme registry | Lookup by domain, visual/audio style, accessibility, allowed content, asset prompt constraints, and provenance. |
| Asset source registry | Lookup by content type, format, seed support, safety support, offline/network mode, credentials, and provenance. |
| Domain registry | Lookup domain profiles and allowed pack sets, plus provenance. |
| Safety policy registry | Lookup policy packs and validation rules, plus provenance. |

All registries return structured match results. Rejections are as important as selected candidates because the agent needs actionable feedback.

## 10. Local Asset Folder

`apps/studio/src/assets/library/replacements/` is the canonical local asset folder. Each deployment may override it through the `PLAYCRAFT_REPLACEMENTS_FOLDER` environment variable; the override must point at an absolute path. `LocalAssetFolderSource` scans the folder at startup, loads `catalog.json` per theme, and exposes `listThemes`, `listSpritesForTheme`, `generate`, and `generateBatch`.

The folder is the **only** asset source that ships with the framework. There is no `local-asset://` URI scheme, no synthetic hash scheme, no in-memory placeholder source for the wired path. Any source that returns the forward-only asset source tagging terms is out of scope.

## 11. Bundle Cap and Purged Entries

Hard cap on bundle and asset size purges stale, unused elements:

- `GAME_BUNDLE_MAX_BYTES = 512 * 1024`
- `GAME_BUNDLE_MAX_REGISTRY_ENTRIES = 256`
- `GameBundleCapEnforcementSchema.purgedEntryIds` records the ids the cap dropped.

`GameBundleSchema.superRefine` enforces both caps, including the case where `purgedEntryIds` is populated but `registry` count still exceeds `maxRegistryEntries` (i.e. the cap enforcer failed). The cap is the only path that lets old, unused building blocks leave a `GameBundle`.

## 12. Replay Model

Replay is product behavior. A saved `GameAssemblyProfile` must preserve mechanic chain with ids, versions, parameters, event bindings, compatibility decisions; rule modules with ids, versions, parameters, default sources, validation decisions; component bindings with manifest versions and props; theme pack reference and version; asset requests and generated asset records (each generated asset record's `provenance.sourceManifestId`/`sourceManifestVersion`); safety policy and domain profile references; replay metadata, deterministic seeds, and unsupported-seed status; validation result and schema versions; runtime event records needed to reconstruct or audit play; and per-block `provenance.source` for every manifest inside `registries`.

Replay must not rerun planning or asset generation. It may load registered mechanics, rules, and components by id and version, validate that compatible packs are available, and reconstruct the playable surface from saved profile data.

## 13. Trusted Component Runtime

The runtime is a trusted React renderer over registered manifests. Render registered components only. Validate all render request props before rendering. Bind assets through profile asset records, not arbitrary URLs from agents. Emit typed frontend tools/events only. Fail closed on unknown component ids, unsupported capability requests, invalid props, missing assets, or safety violations. Never execute generated React code, generated JavaScript, `eval`, or dynamic function bodies for play surfaces.

The renderer is allowed to be implemented with React. The framework core must not require React imports.

## 14. Pack Model

Packs are versioned extension units. Required pack types: mechanic pack, rule pack, component pack, theme pack, asset source pack, domain profile pack, safety policy pack. Every pack manifest must declare pack id and version, schema version (`playcraft.v1`), provided capabilities, required peer capabilities, compatible domain profiles, compatible safety policies, public contract schemas, fixtures and validation tests, import-light status, and network / credential / native requirements if any.

Packs are local and import-light. The bundle cap means a pack cannot ship stale, unused registries. New wave releases replace older packs at the same id and version, never behind a out-of-scope flag.

## 15. Safety and Privacy

Safety is enforced through policy packs, registries, and validation. The child-friendly policy must enforce no arbitrary generated play-surface code, no unregistered components, no private child data in shared profiles, no punitive failure states for ages 2-6, text/transcript-only input policy for the current local builder surface, asset provenance and safety status for every generated or selected asset, and age-band, content, retry, hint, session, and quiet-mode constraints. Non-child domains may define different policies later, but they must not weaken child-safe policy behavior.

## 16. Local LLM Agent

The wired agent engine is `MoonshineStreamingCpuEngine` (LiquidAI LFM2.5-VL-450M-Extract over Moonshine Streaming CPU). The agent loop (`AgentLoop` in `@playcraft/core`) drives the engine through tool calls until the engine emits a `final` result or the step budget (default 16) is exhausted.

Tool call generation is constrained to JSON Schemas by the `Outlines` library. `outlinesJsonSchemaForToolArguments` converts a tool's `AgentToolDescriptor.argumentsSchema` into an `Outlines`-compatible JSON Schema; the engine cannot emit argument values that fail the schema. This is the single mechanism that lets a small local model produce reproducible tool calls without a permissive validator.

The engine never sees raw tool output; it sees only `ok` / `error` / `unsupported` status plus a JSON-serializable value or string error. The transcript is append-only; the loop never rewinds. Tools never call the engine directly; tools return values, the loop emits the next inference step.

`AgentLoop` is constructed with an `AgentLoopOptions` shape that carries the engine, the system prompt, the registered tools, an optional `maxSteps`, and an optional `temperature`. Tools are `AgentToolExecutor` implementations identified by `toolName`; unknown tools produce an `unsupported` result without halting the loop.

## 17. Remote Enrichment Layer

`RemoteEnrichmentSource` is a forward-only interface. The shipped default is `NullRemoteEnrichmentSource`, which always responds with `status: "unsupported"` and an error message explaining that the local registries must satisfy every capability.

The interface surface:

```ts
export interface RemoteEnrichmentSource {
  readonly id: string;
  readonly version: string;
  enrich(
    request: RemoteEnrichmentRequest,
    options: { timeoutMs: number }
  ): Promise<RemoteEnrichmentResponse>;
}
```

Invariants:

- Never blocks the agent loop for more than `timeoutMs`.
- Never returns partial responses; the response is either fully `ok` with all requested building blocks (components, rules, asset sources) or a non-ok status that must include an `error`.
- The total response bytes must fit within the bundle cap. The implementation is responsible for capping.

No HTTP transport ships with the framework. Hosts that want one wire up their own `RemoteEnrichmentSource`; the framework does not specify or validate the wire format.

## 18. Import-Light Boundary

Core packages must import and test without third-party runtime libraries, network clients, GPU/model packages, model weights, credentials or environment variables in the core path, database clients, app framework route APIs, or Tauri APIs. App routes, persistence repositories, retrieval services, and native shells live outside the import-light boundary.

## 19. Old Architecture Rejections

Do not carry these older abstractions into the framework core:

- `GameType` enum as the primary selection model.
- Provider-name conditionals.
- App route handlers as framework boundaries.
- Provider/auth/persistence/dashboard assumptions.
- Provider-specific core paths.
- Generated React or runtime code as a play-surface strategy.
- Hardcoded scoring, age difficulty, asset pools, or seed lists in core logic.
- Cloud-side framework SDK assumptions (third-party cloud runtimes, hosted retrieval catalogs).
- out-of-scope / out-of-scope source markers in the core.

## 20. Schema Versioning Posture

The public contracts ship a single schema discriminator: `PLAYCRAFT_SCHEMA_VERSION = "playcraft.v1"`. A future v2 discriminator would require a written policy for opening v2, migration tooling for saved `GameAssemblyProfile` records, a deprecation window for v1, and a new entry in `PublicContractSchemas` accepting `playcraft.v2`. None of those exists yet. Until then, the only schema discriminator shipped is `playcraft.v1`.

## 21. Deferred Architecture Items

The following items are out of scope for the current architecture and ship only if and when a future wave graduates them through the criteria in [CONTRIBUTING.md](CONTRIBUTING.md):

- A hosted server-retrieval implementation that satisfies `RemoteEnrichmentSource`.
- Federated discovery.
- Cross-host profile replay.
- Remote asset library sync beyond the canonical local folder.
- Marketplace and pack publishing.
- Telemetry and observability.
- Multi-tenant session isolation.
- npm package publishing.
- End-to-end test harness.
- Schema versioning beyond `playcraft.v1`.
