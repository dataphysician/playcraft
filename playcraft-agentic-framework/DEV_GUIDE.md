# Playcraft Agentic Game Framework Developer Guide

**Lightweight implementation guide for an AG-UI-native game-assembly SDK**

| Attribute | Value |
|-----------|-------|
| Version | 1.0.0-cleanroom |
| Date | 2026-06-27 |
| Status | Canonical developer guide |
| Primary stack | TypeScript, Zod, React, AG-UI events, deterministic stubs |

## 1. Implementation Posture

Build the lightweight v1 as import-light TypeScript packages first. Do not start from the older Next.js app, database schema, auth model, dashboard, or OpenAI route shape.

The v1 core must be usable without network access, credentials, AI SDKs, GPU, model weights, database services, or native-shell APIs. Real providers, Vite studio UX, and Tauri shells are app layers around the core, not prerequisites.

## 2. Package Boundaries

Recommended package boundaries:

| Package | Responsibility |
|---------|----------------|
| `packages/contracts` | Zod schemas, TypeScript types, schema versions, fixture builders. |
| `packages/core` | Registries, assembly validation, deterministic planning interfaces, rule evaluation, safety policy evaluation, replay model. |
| `packages/ag-ui` | AG-UI event mapping, Playcraft custom envelopes, typed frontend tools, stream helpers. |
| `packages/renderer` | Trusted React renderer, component registry, component manifest validation. |
| `packages/assets` | Asset request schemas, deterministic stub provider, provider manifest helpers. |
| `packages/packs` | Initial mechanic, rule, component, theme, domain, and safety policy packs. |
| `packages/builder` | Local builder tool handler for catalog, assemble, update, and preview actions with published argument schemas. |
| `packages/service` | Local app/API and `playcraft-service` CLI facade for validated `BuilderServiceRequest`, `BuilderServiceResponse`, `BuilderCatalog`, `BuilderIntentResolution`, text input, Moonshine Streaming CPU transcript records, template resolution, and asset edit levers. |
| `apps/studio` | Vite React studio that renders the live toddler game, developer timeline, and trusted preview from the service transport. |
| `apps/mobile-shell` | Tauri Mobile-facing webview shell that reuses the Studio UI and local service transport. |
| `examples/profiles` | Saved profile fixtures for memory match, sorting, and sequence repeat. |

Do not put framework core logic behind Next.js API routes, native commands, or app-specific stores. The service, studio, and mobile shell consume the packages; they do not define framework contracts.

Studio clients should talk to a `BuilderServiceTransport`; the local implementation can be in-process or HTTP JSON today, and future server adapters should preserve the same request/response schemas rather than adding app-local command formats.

Use `createHttpServiceTransport` for clients that call a local/server endpoint, `handleServiceHttpRequestBody` inside a server wrapper that receives raw JSON, and `pnpm serve:service` or `playcraft-service-http` to run the dependency-light local HTTP server. These helpers intentionally avoid framework-specific server dependencies.

Agents that need the exact API boundary can call `playcraft-service request --request-json '<BuilderServiceRequest JSON>' --json` and receive the full `BuilderServiceResponse` envelope. Friendly CLI commands may keep concise output for humans.

Template request phrases belong in `GameTemplateDefinition.requestAliases`. Do not add service-side `if game == ...` branches when adding a template; the local service resolves template switches from catalog aliases and records the matched alias in `BuilderIntentResolution`.

## 3. Stack Defaults

| Area | Default |
|------|---------|
| Language | TypeScript strict mode. |
| Schemas | Zod. |
| Tests | Vitest for contracts/core, React Testing Library for renderer, Playwright smoke tests when a client exists. |
| Client layer | Vite + React later, after contracts/core can run locally. |
| Styling | Tailwind plus focused component CSS for game surfaces, only in renderer/studio layers. |
| Protocol | AG-UI standard events plus validated Playcraft `Custom` envelopes. |
| Persistence | JSON fixtures first; repository interfaces later. |
| Native shell | Tauri/Tauri Mobile only in app shells; never required by core. |

## 4. Contract Order

Implement contracts in this order:

1. `MechanicDefinition`
2. `RuleModuleDefinition`
3. `ComponentManifest`
4. `ThemePack`
5. `SafetyPolicyPack`
6. `DomainProfile`
7. `FrontendToolDefinition`
8. `AssetGenerationRequest`
9. `AssetProviderCapabilityManifest`
10. `GeneratedAssetRecord`
11. `GameAssemblyProfile`
12. `AssemblyValidationResult`
13. `PlaycraftAgUiEventEnvelope`
14. `PlaycraftEventRecord`

Every contract must include:

- `schemaVersion`.
- Stable ID and version.
- Capability tags where selection applies.
- Compatibility constraints.
- Structured validation errors.
- Fixtures used by tests.

Behavior-changing defaults must live in profile/config/manifest records, not as unowned literals in core logic.

## 5. Registries

Required registries:

| Registry | Selects by |
|----------|------------|
| `mechanicRegistry` | ID, version, age band, input modality, event compatibility, asset requirements, capability tags. |
| `ruleRegistry` | Category, consumed events, emitted events, supported mechanics, safety policy, default source. |
| `componentRegistry` | Render capability, supported mechanics, props schema, emitted tools, accessibility, safety policy. |
| `themeRegistry` | Domain, age band, accessibility, visual style, audio style, allowed content. |
| `assetProviderRegistry` | Content type, format, seed support, safety support, offline/network mode, credential requirement. |
| `domainRegistry` | Domain profile ID, allowed packs, defaults, safety policy, UX assumptions. |

Registry lookup must return structured match results:

- Selected candidate.
- Rejected candidates.
- Missing capabilities.
- Version conflicts.
- Warnings.

Tests must prove that registry selection does not rely on `GameType`, provider names, or hardcoded app route logic.

## 6. Deterministic Stubs

V1 needs deterministic local stubs:

- Stub planner: converts known fixture requests into memory match, sorting, and sequence repeat profiles through registries.
- Stub asset provider: returns stable fake asset records for the same request and seed policy.
- Stub safety evaluator: applies explicit local policy fixtures.
- Stub persistence: reads/writes JSON fixtures only if needed by tests or examples.

Stub outputs must be replayable and stable in default tests.

## 7. AG-UI Adapter

Use AG-UI as the outer protocol. Map Playcraft work to standard event categories:

| Playcraft need | AG-UI event category |
|----------------|----------------------|
| Start and finish assembly | Run lifecycle events. |
| Planner, asset, safety, validation phases | Step events. |
| Full profile/editor/game state | State snapshot events. |
| Incremental state changes | State delta events. |
| Long-running asset or validation work | Activity events. |
| Frontend actions | Tool call events and tool results. |
| Playcraft-specific payloads | `Custom` events with validated envelope values. |

Initial Playcraft custom event names:

- `playcraft.profile.proposed`
- `playcraft.profile.validated`
- `playcraft.component.renderRequested`
- `playcraft.asset.requested`
- `playcraft.asset.progress`
- `playcraft.asset.generated`
- `playcraft.safety.finding`
- `playcraft.replay.ready`
- `playcraft.replay.event`

Envelope shape:

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

Every adapter test must validate both the AG-UI event wrapper and the Playcraft envelope payload.

## 8. Trusted Renderer

The renderer may render registered components only. Agents may request component capabilities or component IDs; they may not provide source code.

`ComponentManifest` must declare:

- Component ID and version.
- Supported mechanics.
- Supported domain profiles and age bands.
- Required props schema.
- Required assets.
- Emitted frontend tools/events.
- Accessibility requirements.
- Safety constraints.
- Replay behavior.

`ComponentRenderRequest` must include:

- Target component capability or component ID.
- Profile ID.
- Mechanic binding.
- Validated props.
- Asset bindings.
- Expected emitted events.
- Fallback policy.

Unknown component IDs and invalid props must fail closed.

## 9. Assembly Pipeline

Implement pure steps first:

1. Validate `PlaycraftAssemblyRequest`.
2. Select `DomainProfile` and `SafetyPolicyPack`.
3. Select mechanics by capability, modality, domain, and event compatibility.
4. Select rules by mechanic events and policy.
5. Select components by mechanic render needs and props schemas.
6. Select theme pack.
7. Generate provider-neutral asset requests.
8. Resolve assets through deterministic stub provider.
9. Build `GameAssemblyProfile`.
10. Validate profile schemas, registry references, event graph, component bindings, assets, policy, and replay readiness.
11. Emit AG-UI lifecycle/state/custom events through the adapter.

Each step must be independently testable.

## 10. MVP Profiles

Build these profiles first:

| Profile | Mechanics | Rules | Components |
|---------|-----------|-------|------------|
| Memory Match | `tap-to-reveal`, `match-pairs`, `timed-celebration` | Pair matching, retry, hint, completion | `RevealCardGrid`, `CelebrationOverlay` |
| Sorting | `tap-to-select`, `sort-into-bins`, `retry-loop` | Category validation, guided retry, completion | `ChoiceGrid`, `SortBins`, `HintBubble` |
| Sequence Repeat | `sequence-repeat`, `tap-to-select`, `timed-celebration` | Progression, attempt feedback, hint | `SequencePad`, `ChoiceGrid`, `CelebrationOverlay` |

These are profile fixtures assembled through registries, not enum branches.

## 11. Required Acceptance Gates

Default verification must include:

- Schema tests for every public contract.
- Registry tests for mechanics, rules, components, themes, asset providers, domains, and safety policies.
- AG-UI envelope tests for lifecycle/state/activity/tool/custom mapping and Playcraft `Custom` payload validation.
- Replay tests reconstructing memory match, sorting, and sequence repeat from saved `GameAssemblyProfile` records.
- Trusted renderer tests that reject unknown component IDs, unregistered capabilities, invalid props, and generated runtime code.
- Import-light tests proving contracts/core/registries import without AI SDKs, network clients, GPU/model packages, credentials, database clients, Next.js, or Tauri.
- Source scans against hardcoded defaults, `GameType` core branching, provider-name branching, arbitrary generated React/runtime code, Next.js route dependencies in core, database/auth/dashboard assumptions, and real-provider-only paths.

Suggested scan targets:

```bash
rg "GameType|MEMORY_MATCH|PATTERN_MATCH|SORTING" packages/core packages/contracts
rg "providerName|if \\(provider|switch \\(provider" packages/core packages/assets packages/builder packages/service apps/studio
rg "next/server|NextRequest|PrismaClient|NextAuth|OPENAI_API_KEY|process\\.env" packages/core packages/contracts packages/service
rg "eval\\(|new Function|dangerouslySetInnerHTML" packages/renderer packages/builder packages/service apps/studio
```

The exact paths can change, but the gates cannot.

## 12. Milestones

### Milestone 1: Contract Kernel

- Create contracts package.
- Define schemas and fixtures.
- Add schema tests and import-light tests.

### Milestone 2: Registries and Packs

- Implement registry APIs.
- Add initial mechanic, rule, component, theme, domain, safety, and provider manifests.
- Add structured registry match results.

### Milestone 3: Deterministic Assembly

- Add stub planner and stub asset provider.
- Generate saved profile fixtures for memory match, sorting, and sequence repeat.
- Validate replay readiness.

### Milestone 4: AG-UI Adapter

- Emit compliant lifecycle, step, state, activity, tool, and custom events.
- Validate every Playcraft custom envelope.

### Milestone 5: Trusted Renderer

- Build React component registry.
- Render MVP profiles through registered components only.
- Emit typed frontend tool events.

### Milestone 6: Replay Harness

- Reconstruct MVP profiles without planning or asset generation.
- Compare replay event traces against fixtures.

### Milestone 7: Middleweight Shells

- Keep Vite studio wired to `@playcraft/service`, not direct duplicated command execution.
- Keep the Tauri Mobile-facing shell as a thin webview adapter over the Studio client contract.
- Keep native permissions empty until a platform capability strictly requires a bridge.

## 13. Development Rules

- Contracts before integrations.
- Deterministic stubs before real providers.
- Registries over conditionals.
- Profiles and manifests over hardcoded defaults.
- AG-UI standard events over custom transport.
- Validated Playcraft `Custom` envelopes only.
- Trusted React components only.
- No arbitrary generated play-surface code.
- Import-light core.
- Replay is product behavior, not debug logging.
