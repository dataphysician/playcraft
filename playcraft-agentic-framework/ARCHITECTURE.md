# Playcraft Agentic Game Framework Architecture

**Protocol, registry, replay, runtime, and pack architecture**

| Attribute | Value |
|-----------|-------|
| Version | 1.0.0-cleanroom |
| Date | 2026-06-27 |
| Status | Canonical architecture spec |

## 1. Architecture Goals

Playcraft architecture must make coding-agent output constrained, inspectable, and replayable.

The framework should provide:

- A small game DSL.
- Strict schemas.
- Capability registries.
- AG-UI protocol mapping.
- Deterministic assembly and replay.
- Trusted component rendering.
- Pack-based extension.
- Import-light local verification.

The core must not depend on a specific app framework, route system, database, auth provider, model provider, or native shell.

## 2. Layer Model

| Layer | Responsibility |
|-------|----------------|
| AG-UI transport | Standard agent/frontend lifecycle, state, activity, tool, and custom events. |
| Playcraft AG-UI adapter | Validates Playcraft custom envelopes and maps framework operations to AG-UI. |
| Contracts | Zod schemas and TypeScript types for every public object. |
| Core | Registries, assembly validation, rules, safety evaluation, replay, deterministic planner interfaces. |
| Packs | Versioned mechanics, rules, components, themes, providers, domain profiles, and safety policies. |
| Assets | Provider-neutral asset requests, capability manifests, deterministic stub provider, provenance records. |
| Renderer | Trusted React component registry and render requests. |
| Builder tools | Local CLI/API actions that assemble templates, update asset levers, preview trusted interactions, and expose the tool/template catalog. |
| Studio/shells | Later Vite, Tauri, and mobile apps that consume the framework packages. |

## 3. Protocol Boundaries

| Boundary | Playcraft owns | External layer owns |
|----------|----------------|---------------------|
| Agent/frontend stream | Custom payload schemas, validation, game semantics | AG-UI event transport and event categories |
| Asset fulfillment | Provider-neutral request/record contracts and capability selection | Real provider SDKs and network calls in adapters |
| Rendering | Component manifests, props schemas, trusted registry, replay events | React DOM implementation details |
| Persistence | Profile shape, replay requirements, import/export semantics | Database, filesystem, or app-specific storage |
| Native shell | Framework contracts and static client compatibility | Tauri permissions, native APIs, app lifecycle |
| Product app | Game assembly framework semantics | Auth, billing, dashboards, deployment, analytics |

Builder input is provider-neutral: text requests and Moonshine Streaming CPU-only speech transcripts both become `BuilderInputRequest` records before they reach the builder service.

## 4. AG-UI Mapping

AG-UI is the outer protocol. Playcraft uses standard event categories and places framework-specific data in validated `Custom` event values.

| Playcraft operation | AG-UI mapping |
|---------------------|---------------|
| Assembly run begins | Run lifecycle start event. |
| Assembly run completes | Run lifecycle finish event. |
| Assembly run fails | Run lifecycle error event. |
| Planner starts/finishes | Step events. |
| Asset request/generation progresses | Activity events plus Playcraft custom events. |
| Safety/validation findings | Step events plus Playcraft custom events. |
| Full editor/profile/game state | State snapshot event. |
| Incremental state change | State delta event. |
| Frontend interaction request | Tool call events. |
| Frontend interaction result | Tool result event. |
| Render, asset, replay, profile, safety payloads | `Custom` event with `PlaycraftAgUiEventEnvelope`. |

Initial custom event names:

- `playcraft.profile.proposed`
- `playcraft.profile.validated`
- `playcraft.component.renderRequested`
- `playcraft.asset.requested`
- `playcraft.asset.progress`
- `playcraft.asset.generated`
- `playcraft.safety.finding`
- `playcraft.replay.ready`
- `playcraft.replay.event`

## 5. Playcraft Custom Envelope

Every AG-UI `Custom` event value must be a validated envelope:

```ts
type PlaycraftAgUiEventEnvelope<TPayload> = {
  schemaVersion: string;
  eventId: string;
  profileId?: string;
  runId?: string;
  payloadType: string;
  payload: TPayload;
  provenance: {
    role:
      | "planner"
      | "asset_requester"
      | "asset_provider"
      | "safety_evaluator"
      | "validator"
      | "renderer"
      | "frontend";
    sourceId: string;
  };
};
```

Validation requirements:

- Reject unknown `payloadType` unless explicitly allowed by a registered pack.
- Validate `payload` against the schema for its type.
- Preserve `eventId`, `runId`, `profileId`, role, and schema version for replay/debugging.
- Do not trust raw frontend payloads until tool arguments are schema-validated.

## 6. Game DSL

The game DSL is represented by profile and manifest contracts, not a scripting language.

Core DSL objects:

- `GameAssemblyProfile`
- `MechanicDefinition`
- `RuleModuleDefinition`
- `ComponentManifest`
- `ComponentRenderRequest`
- `ThemePack`
- `AssetGenerationRequest`
- `GeneratedAssetRecord`
- `SafetyPolicyPack`
- `DomainProfile`
- `PlaycraftEventRecord`

The DSL describes what the game is, how mechanics connect, which rules consume and emit events, which components may render state, which assets bind to entities, and how replay reconstructs behavior.

## 7. Registry Architecture

Registries are the central selection mechanism.

| Registry | Required behavior |
|----------|-------------------|
| Mechanic registry | Lookup by capability, ID/version, event compatibility, modality, age/domain support, asset requirements. |
| Rule registry | Lookup by category, consumed/emitted events, supported mechanics, policy constraints, default source. |
| Component registry | Lookup by render capability, supported mechanics, props schema, emitted tools, accessibility, replay behavior. |
| Theme registry | Lookup by domain, visual/audio style, accessibility, allowed content, asset prompt constraints. |
| Asset provider registry | Lookup by content type, format, seed support, safety support, offline/network mode, credentials. |
| Domain registry | Lookup domain profiles and allowed pack sets. |
| Safety policy registry | Lookup policy packs and validation rules. |

All registries return structured match results. Rejections are as important as selected candidates because agents need actionable feedback.

## 8. Replay Model

Replay is product behavior.

A saved `GameAssemblyProfile` must preserve:

- Mechanic chain with IDs, versions, parameters, event bindings, and compatibility decisions.
- Rule modules with IDs, versions, parameters, default sources, and validation decisions.
- Component bindings with manifest versions and props.
- Theme pack reference and version.
- Asset requests and generated asset records.
- Safety policy and domain profile references.
- Replay metadata, deterministic seeds, and unsupported-seed status.
- Validation result and schema versions.
- Runtime event records needed to reconstruct or audit play.

Replay must not rerun planning or asset generation. It may load registered mechanics/rules/components by ID and version, validate that compatible packs are available, and reconstruct the playable surface from saved profile data.

## 9. Trusted Component Runtime

The runtime is a trusted React renderer over registered manifests.

Rules:

- Render registered components only.
- Validate all render request props before rendering.
- Bind assets through profile asset records, not arbitrary URLs from agents.
- Emit typed frontend tools/events only.
- Fail closed on unknown component IDs, unsupported capability requests, invalid props, missing assets, or safety violations.
- Never execute generated React code, generated JavaScript, `eval`, or dynamic function bodies for play surfaces.

The renderer is allowed to be implemented with React. The framework core must not require React imports.

## 10. Pack Model

Packs are versioned extension units.

Required pack types:

- `MechanicPack`
- `RulePack`
- `ComponentPack`
- `ThemePack`
- `AssetProviderPack`
- `DomainProfilePack`
- `SafetyPolicyPack`

Every pack manifest must declare:

- Pack ID and version.
- Schema version.
- Provided capabilities.
- Required peer capabilities.
- Compatible domain profiles.
- Compatible safety policies.
- Public contract schemas.
- Fixtures and validation tests.
- Import-light status.
- Network/credential/native requirements, if any.

V1 packs must be local and import-light. Middleweight packs may wrap real providers or richer studio components, but those adapters must stay outside core packages.

## 11. Safety and Privacy

Safety is enforced through policy packs, registries, and validation.

Child-friendly v1 policy must enforce:

- No arbitrary generated play-surface code.
- No unregistered components.
- No private child data in shared profiles.
- No punitive failure states for ages 2-6.
- Parent-approved modality policy for voice capture or pronunciation attempts.
- Asset provenance and safety status for every generated or selected asset.
- Age-band, content, retry, hint, session, and quiet-mode constraints.

Non-child domains may define different policies later, but they must not weaken child-safe policy behavior.

## 12. Import-Light Boundary

Core packages must import and test without:

- AI provider SDKs.
- Network clients.
- GPU/model packages.
- Model weights.
- Credentials or environment variables.
- Database clients.
- Next.js APIs.
- Tauri APIs.

Provider adapters, app routes, persistence repositories, and native shells live outside the import-light boundary.

## 13. Old Architecture Rejections

Do not carry these old app abstractions into the framework core:

- `GameType` enum as the primary selection model.
- Provider-name conditionals.
- Next.js route handlers as framework boundaries.
- Prisma/Auth/dashboard assumptions.
- OpenAI-specific core paths.
- Generated React/runtime code as a play-surface strategy.
- Hardcoded scoring, age difficulty, asset pools, or seed lists in core logic.
