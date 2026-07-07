# Playcraft Agentic Game Framework Developer Guide

**Implementation guide for the local-first, LLM-driven game-assembly SDK**

| Attribute | Value |
|-----------|-------|
| Status | Active developer guide |
| Date | 2026-07-06 |
| Schema version | `playcraft.v1` |
| Wave pivot | Wave H — local-first LLM agent is the primary path. Remote enrichment is an opt-in layer for capability gaps. |
| Primary stack | TypeScript, Zod, React, AG-UI events, `MoonshineStreamingCpuEngine` (LFM2.5-VL-450M-Extract over Moonshine Streaming CPU), `Outlines`-constrained JSON tool calls, Vitest, vitest-axe |

## 1. Implementation Posture

The shipped core is local-first and import-light. Build new work as TypeScript packages and Vitest tests; do not start from the older app-route, database schema, auth model, dashboard, retrieval broker, or hosted-runtime shape.

The core must remain usable without network access, hosted credentials, third-party SDKs, GPU, model weights, database services, or native-shell APIs. The Studio and the Tauri Mobile shell are app layers around the core, not prerequisites.

Forward-only policy. There are **no migration paths** from older shapes. New code replaces old code at the same call site. The repo's automated guardrail script (`scripts/check-guardrails.mjs`, invoked by `pnpm lint:guardrails` and `pnpm verify`) blocks out-of-scope, out-of-scope, `tracker-item`, `tracker-item`, and `workaround-note` markers in source; `tests/import-light-and-scans.test.ts` blocks remotely-operated-service phrasing in code and docs.

## 2. Current Package Layout

| Package / App | Responsibility |
|---------------|----------------|
| `packages/contracts` | Zod schemas, TypeScript types, schema versions, fixture builders. The barrel `src/index.ts` re-exports the domain modules: `base`, `condition`, `workflow`, `mcp`, `sse`, `asset`, `ag-ui`, `packs`, `game-template`, `builder-catalog`, `manifests`, `builder`, `game-bundle`, `agent`, `enrichment`. All schemas stamp `schemaVersion: "playcraft.v1"`. Building blocks carry a `provenance` discriminator. |
| `packages/core` | Capability registries, `DeterministicAssemblyPlanner` (with `registerRecipe`), `AgentLoop`, `MoonshineStreamingCpuEngine`, `LocalInferenceEngine`, bundle cap enforcer, `Outlines`-constrained JSON schema helpers, replay model. |
| `packages/ag-ui` | AG-UI event mapping, Playcraft `Custom` envelope adapters, stream helpers. |
| `packages/renderer` | Trusted React renderer, component registry, manifest validation (with provenance checks). |
| `packages/assets` | `LocalAssetFolderSource` (scans the canonical local asset folder; honors `PLAYCRAFT_REPLACEMENTS_FOLDER`), capability manifest helpers, asset request schemas, generated asset records. |
| `packages/packs` | MVP and custom mechanic, rule, component, theme, domain, safety, and asset source packs. Exports `gameTemplateDefinitions`, `mvpAssemblyRecipes`, `customTemplateRecipes`, and `DEFAULT_GAME_TEMPLATE_ID`. |
| `packages/builder` | Local builder tool handler. `createBuilderCommandHandler()` returns a `BuilderCommandHandler` for `assemble-game`, `update-game`, `preview-action`, `importProfile`, `listTemplates`, `listTools`, `getSessionSnapshot`. |
| `packages/mcp` | MCP-compatible HTTP adapter. Implements the allowlisted builder actions. |
| `packages/service` | Local app/API facade and `playcraft-service` CLI. Split into `index.ts` (class + workflow executor), `local-catalog.ts` (catalog constants + session state helpers), `intent-resolution.ts` (text/transcript resolution + Moonshine config), `json-helpers.ts` (envelope helpers, `defaultFetch`, `createMoonshineTranscriptRecord`). |
| `apps/studio` | Vite React studio rendering the Live tab, Developer tab, and trusted preview from the service transport. |
| `apps/mobile-shell` | Tauri Mobile-facing webview shell reusing the Studio UI and local service transport. Tauri v2 bundle signing is staged (see §15). |
| `examples/profiles` | Saved `GameAssemblyProfile` fixtures for the 24 MVP templates and the 3 `template.custom.*` recipes. |
| `examples/workflows` | `WorkflowGraph` JSON examples (linear, parallel, conditional, error-handling). |
| `scripts/check-guardrails.mjs` | Automated source scanner for out-of-scope/`tracker-item`/`tracker-item`/`workaround-note` markers; also enforces `GAME_BUNDLE_MAX_BYTES === 512 * 1024`. Invoked by `pnpm lint:guardrails`. |

Do not put framework core logic behind app-route handlers, native commands, or app-specific stores. The service, studio, and mobile shell consume the packages; they do not define framework contracts.

## 3. Contracts Module Layout

`packages/contracts/src/index.ts` is the only public entry point. Consumers always import from `@playcraft/contracts`; they never reach into individual domain modules, so a future schema split never breaks a downstream consumer.

Domain modules include `base`, `condition`, `workflow`, `mcp`, `sse`, `asset`, `ag-ui`, `packs`, `game-template`, `builder-catalog`, `manifests`, `builder`, `game-bundle`, `agent`, and `enrichment`. Every domain module re-exports from a single barrel; consumers do not import from individual files.

New exports from any module are forward-only additions. Removing an export is a breaking change; the replacement goes under a new name and the old call site is rewritten in the same commit.

### 3.1 Lazy-wrap pattern

`JsonValueSchema` and `JsonFieldSchema` are declared with `z.lazy(...)` so the recursive JSON types terminate cleanly. `base.ts` re-exports the rest of the contracts barrel, which creates a circular import. Every schema in any other module that references a `base.ts` binding — directly or transitively — must be wrapped in `z.lazy(() => ...)` to defer construction until first parse. The repo-wide rule: any `z.object(...)` shape that reads `StableIdSchema`, `VersionSchema`, `CapabilityTagSchema`, `JsonValueSchema`, or any other binding from `base.ts` is wrapped in `z.lazy(() => ...)`, even when the body looks plain. The top of every contracts module restates the rule and lists which schemas it wraps.

The recursive type alias marker `z.ZodType<T>` is the marker that tells Zod "trust me on the recursive type"; without it, `z.lazy(() => z.record(...))` produces a self-referencing schema that TypeScript cannot infer. Any new recursive schema in the contracts package follows the same `z.lazy` + `z.ZodType<T>` shape.

### 3.2 `WorkflowCondition` AST parser

`packages/contracts/src/condition.ts` exposes a typed AST parser rather than a free-form string. Workflow graph `condition` fields accept either a string or a pre-parsed `WorkflowConditionExpr`:

```ts
export type WorkflowConditionExpr =
  | { kind: "compare"; path: PayloadPath; op: CompareOp; value: JsonPrimitive }
  | { kind: "len"; path: PayloadPath; op: LenOp; value: number };
```

The parser supports two expression families:

- `payload.<key> == <literal>` / `!=` — `kind: "compare"`, accepts string, number, boolean, null literals.
- `len(payload.<key>) <op> <number>` — `kind: "len"`, where `<op>` is `==`, `!=`, `>`, `>=`, `<`, `<=`. Optional measure suffixes `.length`, `.count`, `.size` are parsed and stored on `PayloadPath.measure`.

Malformed input throws `ConditionParseError`. `parseWorkflowCondition` is exported so workflow tools and tests can validate condition strings before serializing them into a `WorkflowGraph`; `evaluateCondition(expr, { payload })` runs the AST against a payload object and returns `{ satisfied, detail }`.

## 4. Service Split

`packages/service/src/index.ts` is the `LocalPlaycraftService` class body plus the `executeWorkflow` body. Both stay inline (a previous attempt to extract `executeWorkflow` broke 143 tests; keep it inline). The pure helpers the class body used to inline are in three sibling modules:

| Module | Exports |
|--------|---------|
| `index.ts` | `LocalPlaycraftService`, `createLocalPlaycraftService`, `createLocalServiceTransport`, `createHttpServiceTransport`, `handleServiceHttpRequestBody`, `handleLocalServiceRequest`, `handleLocalServiceRequestBatch`, `BuilderServiceTransport`, the same-process `BuilderServiceRequestBatchSchema` request batches, `executeWorkflow`, `executeWorkflowSse`, `executeWorkflowSync`, `PLAYCRAFT_SERVICE_PACKAGE`. |
| `local-catalog.ts` | `LOCAL_SERVICE_SESSION_POLICY`, `LOCAL_SERVICE_SESSION_TTL_MS`, `LOCAL_SERVICE_DEFAULT_OWNER_ID`, `LOCAL_SERVICE_INPUT_POLICY`, `LOCAL_SERVICE_REQUEST_TIP_EXAMPLES`, `LOCAL_SERVICE_REQUEST_TIP_FEATURED_TEMPLATE_IDS`, `LOCAL_SERVICE_CATALOG`, `LocalSessionState`, `createSessionOwnership`, `requestTipsForCatalog`, `mergeSessionState`. |
| `intent-resolution.ts` | `resolveBuilderInputCommand`, `createBuilderInputRequest`, `MOONSHINE_STREAMING_CPU_CONFIG`, `textForBuilderInputSource`, `sourceForServiceRequest`, `textForServiceRequest`. |
| `json-helpers.ts` | `toJsonValue`, `serializeExecution`, `buildWorkflowCommandResult`, `serviceResponse`, `serviceRequestSessionId`, `requireResultTemplateId`, `streamRunId`, `defaultFetch`, `createMoonshineTranscriptRecord`, `BuilderServiceHttpFetch`, `BuilderServiceHttpFetchResponse`. |

`index.ts` re-exports the public surface of all three sibling modules so consumers see a single `@playcraft/service` barrel. Cross-module dependencies are acyclic: `intent-resolution.ts` imports `toJsonValue` from `json-helpers.ts`; `json-helpers.ts` imports `MOONSHINE_STREAMING_CPU_CONFIG` from `intent-resolution.ts`; `local-catalog.ts` has no outbound dependency on the other two.

`gameTemplateDefinitions` is imported from `@playcraft/packs` (not from `@playcraft/contracts`). `@playcraft/contracts` exports only the `GameTemplateDefinition` type/schema; the runtime array is a packs-package concern.

The CLI exposes:

- `playcraft-service catalog --json` — service facade actions, request field summaries, exact-envelope required contracts, exact-envelope service helpers, transport helpers, bundled local replacement themes, template aliases, and the discovered starter set. The catalog exposes the bundled local replacement themes/items/folders alongside per-template aliases and discoverable starter sets.
- `playcraft-service assemble --text '<request>' --json` and `--transcript '<local Moonshine transcript text>' --json`.
- `playcraft-service request --request-json '<BuilderServiceRequest JSON>' --json` and `playcraft-service request-batch --request-json '<BuilderServiceRequestBatchSchema>' --json` for full envelopes.
- `playcraft-service export-profile` and `playcraft-service import-profile`.
- `playcraft-service run-workflow <path>` for `WorkflowGraphSchema` JSON files.
- `playcraft-service-http` to expose the loopback MCP surface.

## 5. Stack Defaults

| Area | Default |
|------|---------|
| Language | TypeScript strict mode |
| Schemas | Zod |
| Tests | Vitest for contracts/core, React Testing Library for renderer, vitest-axe for the Studio a11y gate |
| Client layer | Vite + React in `apps/studio` and `apps/mobile-shell` |
| Styling | Tailwind plus focused component CSS for game surfaces, only in renderer/studio layers |
| Protocol | AG-UI standard events plus validated Playcraft `Custom` envelopes |
| Persistence | JSON fixtures first; repository interfaces later |
| Native shell | Tauri/Tauri Mobile only in app shells; never required by core |
| Local LLM | `MoonshineStreamingCpuEngine` (LFM2.5-VL-450M-Extract) over Moonshine Streaming CPU; CPU-only; local-only |
| JSON tool-call constraints | `Outlines` over the wired engine |

## 6. Contract Order

Implement new contracts in this order:

1. `MechanicDefinition`
2. `RuleModuleDefinition`
3. `ComponentManifest`
4. `ThemePack`
5. `SafetyPolicyPack`
6. `DomainProfile`
7. `FrontendToolDefinition`
8. `AssetGenerationRequest`
9. `AssetSourceCapabilityManifest`
10. `GeneratedAssetRecord`
11. `GameAssemblyProfile`
12. `AssemblyValidationResult`
13. `PlaycraftAgUiEventEnvelope`
14. `PlaycraftEventRecord`
15. `LocalInferenceEngineManifest`
16. `AgentToolCall` / `AgentToolResult` / `AgentStep`
17. `PlaycraftAgentTranscript`
18. `RemoteEnrichmentRequest` / `RemoteEnrichmentResponse`

Every contract includes `schemaVersion: "playcraft.v1"`, stable id and version, capability tags where selection applies, compatibility constraints, structured validation errors, fixtures used by tests, and a `provenance` discriminator for every building block.

Behavior-changing defaults live in profile/config/manifest records, not as unowned literals in core logic.

## 7. Registries

Required registries:

| Registry | Selects by |
|----------|------------|
| `mechanicRegistry` | id, version, age band, input modality, event compatibility, asset requirements, capability tags, provenance |
| `ruleRegistry` | category, consumed events, emitted events, supported mechanics, safety policy, default source, provenance |
| `componentRegistry` | render capability, supported mechanics, props schema, emitted tools, accessibility, safety policy, provenance |
| `themeRegistry` | domain, age band, accessibility, visual style, audio style, allowed content, provenance |
| `assetSourceRegistry` | content type, format, seed support, safety support, offline/network mode, credential requirement, provenance |
| `domainRegistry` | domain profile id, allowed packs, defaults, safety policy, UX assumptions, provenance |
| `safetyPolicyRegistry` | policy pack id, age bands, supported domains, rules, privacy, content rules, provenance |

Registry lookup returns structured match results: selected candidate, rejected candidates, missing capabilities, version conflicts, warnings. Tests must prove that registry selection does not rely on `GameType`, source names, or hardcoded app-route logic.

## 8. Local Asset Folder and Override

`packages/assets/src/local-asset-folder.ts` exports `LocalAssetFolderSource`, which takes a `LocalAssetFolderSourceOptions` shape:

```ts
export interface LocalAssetFolderSourceOptions {
  canonical?: boolean;
  deploymentOverride?: string;
  folder: string;
}
```

The default `folder` shipped by `@playcraft/packs` is `apps/studio/src/assets/library/replacements/`. Deployments override the folder through the `PLAYCRAFT_REPLACEMENTS_FOLDER` environment variable; the override must resolve to an absolute path on disk. The source scans the folder at construction time, reads `catalog.json` per theme directory, and exposes `listThemes`, `listSpritesForTheme`, `listAllSprites`, `listThemeManifests`, `resolveThemeByAliasOrName`, `generate`, and `generateBatch`.

There is no `local-asset://` URI scheme; every asset URI is a `file://` URL pointing at a real path on disk. The folder is the only asset source that ships with the framework.

## 9. Agent Loop and Local LLM Inference

`packages/core/src/agent-loop.ts` exports `AgentLoop` and `agentLoopToolsFromBuilderDefinitions`. `AgentLoop` is built from `AgentLoopOptions`:

```ts
export interface AgentLoopOptions {
  readonly engine: LocalInferenceEngine;
  readonly systemPrompt: string;
  readonly tools: readonly AgentToolExecutor[];
  readonly maxSteps?: number;
  readonly temperature?: number;
}
```

`packages/core/src/local-llm.ts` defines:

- `AgentPrompt` — the engine input envelope.
- `AgentToolDescriptor` and `AgentToolArgumentsSchema` — the mirror of the public `BuilderToolDefinition` shape so the agent loop maps a tool call back to a typed deterministic tool execution.
- `AgentInferenceResult` — `{ kind: "tool-call", call } | { kind: "final", message, bundleId? }`.
- `LocalInferenceEngine` — the deterministic interface every wired engine satisfies.
- `MoonshineStreamingCpuEngine` — the wired engine; manifest is `defaultMoonshineStreamingCpuEngineManifest()` returning a `LocalInferenceEngineManifest` with `engineId: "lfm2.5-vl-450m-extract"`, `displayName: "LiquidAI LFM2.5-VL-450M Extract via Moonshine Streaming CPU"`, `offline: true`, `localOnly: true`, `maxContextTokens: 8192`, `supportsStructuredJson: true`, `supportsImageInput: true`, `supportsToolCalls: true`, and `outboxModule: "@playcraft/core/local-llm.js"`.
- `outlinesJsonSchemaForToolArguments(schema)` — converts an `AgentToolArgumentsSchema` into an `Outlines`-compatible JSON Schema with `additionalProperties: false`. The schema tells Outlines which values the engine is allowed to emit; engine output is constrained at generation time, not validated permissively after the fact.

The engine id `"lfm2.5-vl-450m-extract"` is declared by the `LocalInferenceEngineIdSchema` enum in `packages/contracts/src/agent.ts`. The `LocalInferenceEngineManifestSchema` is `strict()`; an unknown `engineId` rejects at parse time.

Invariants for any `LocalInferenceEngine`:

- Local-only / offline.
- Emits JSON-constrained tool calls via `Outlines` (or an equivalent constrained-decoder library).
- Never calls out to a network.
- Never persists state outside the call.

## 10. Provenance and Building Blocks

Every building-block manifest carries a `provenance` field with the same shape:

```ts
provenance: z.object({
  source: z.enum(["bundled-local", "authored-local", "remote-agent"]),
  authoredBy: z.string().min(1).max(120).optional(),
  authoredAt: z.string().datetime().optional(),
  remoteUrl: z.string().url().optional()
}).strict()
```

The default stamp for every shipped pack is `BUNDLED_LOCAL_PROVENANCE = { source: "bundled-local" }` exported from `@playcraft/contracts`. Manually building a manifest requires a `provenance` entry. The strict modifier rejects unknown keys.

Manifests affected: `MechanicDefinition`, `RuleModuleDefinition`, `ComponentManifest`, `ThemePack`, `AssetSourceCapabilityManifest`, `DomainProfile`, `SafetyPolicyPack`. `GeneratedAssetRecord.provenance` is a separate, existing field and is unchanged.

When a recipe registers a runtime-authored building block, the new manifest sets `provenance.source: "authored-local"`. When a `RemoteEnrichmentSource` returns building blocks, the response carries `provenance.source: "remote-agent"` plus `remoteUrl`.

## 11. Deterministic Assembly Planner and Recipe Registration

`packages/core/src/index.ts` exports `DeterministicAssemblyPlanner` and `AssemblyRecipe`. Recipes follow the `recipe.bundled.* | recipe.local-authored.* | recipe.remote-agent.*` id namespace. `AssemblyRecipe` is the public type:

```ts
export interface AssemblyRecipe {
  id: string;
  version: string;
  capabilityTags: string[];
  build(context: AssemblyRecipeBuildContext): GameAssemblyProfile;
}
```

`DeterministicAssemblyPlanner` exposes:

- `assemble(requestInput)` — parses the request, picks the unique strongest-capability recipe, runs its `build`, and stamps `replay.plannerId` / `plannerVersion` on the resulting profile.
- `selectRecipe(request)` — returns the recipe that would win `assemble()` for the request.
- `registerRecipe(recipeInput)` — adds a runtime-authored recipe. Validates that `recipe.id` matches one of the three namespaces; `recipe.version` is non-empty; `recipe.capabilityTags` is a non-empty array; `recipe.build` is a function. Dedupes by `recipe.id`. Throws on any violation. Returns `this` so callers can chain.

Packed recipes ship with the namespace baked in:

```ts
// from packages/packs/src/mvp-template-data.ts
export const mvpAssemblyRecipes = mvpTemplates.map((template) => ({
  id: `recipe.bundled.${template.id.slice("template.".length)}`,
  version: "1.0.0",
  capabilityTags: template.capabilityTags,
  build: (context) => buildProfileFromTemplate(template, context)
}));
```

The constructor path (`new DeterministicAssemblyPlanner({ recipes })`) still accepts the unreplaced id strings used by older test fixtures; those tests don't go through `registerRecipe`. Packed recipes and runtime recipes both use the namespace.

## 12. Trusted Renderer

The renderer renders registered components only. Agents may request component capabilities or component ids; they may not provide source code.

`ComponentManifest` declares: component id and version, supported mechanics, supported domain profiles and age bands, required props schema, required assets, emitted frontend tools/events, accessibility requirements, safety constraints, replay behavior, and `provenance`.

`ComponentRenderRequest` includes target component capability or component id, profile id, mechanic binding, validated props, asset bindings, expected emitted events, and a strict `fallbackPolicy: "fail-closed"`. Unknown component ids and invalid props fail closed.

## 13. Assembly Pipeline

Implement pure steps first:

1. Validate `PlaycraftAssemblyRequest`.
2. Select `DomainProfile` and `SafetyPolicyPack` by capability and provenance.
3. Select mechanics by capability, modality, domain, and event compatibility.
4. Select rules by mechanic events and policy.
5. Select components by mechanic render needs and props schemas.
6. Select theme pack.
7. Generate local asset-source asset requests.
8. Resolve assets through `LocalAssetFolderSource`.
9. Build `GameAssemblyProfile`.
10. Validate profile schemas, registry references, event graph, component bindings, assets, policy, replay readiness, and cap enforcement.
11. Stamp `provenance.source` on each generated asset record before building the profile.

Each step is independently testable.

## 14. MVP Profiles

Build the 24 MVP profiles first; each lives at `packages/packs/src/mvp-templates/<slug>.ts` and assembles through registries. The shapes are profile fixtures, not enum branches. Custom templates add to the same registries under `recipe.bundled.*` ids.

## 15. Service Wiring

Studio clients talk to a `BuilderServiceTransport`. The shipped transports:

- `createLocalServiceTransport(service?)` — in-process transport. Default for both Vite apps.
- `createHttpServiceTransport({ endpoint, fetch?, headers? })` — HTTP JSON transport. Activated by `VITE_PLAYCRAFT_SERVICE_URL=http://127.0.0.1:8787/playcraft`.
- `handleServiceHttpRequestBody(body, service?)` — server-side helper for any HTTP wrapper.
- `handleLocalServiceRequestBatch(requests, service?)` — same-process batch helper for `BuilderServiceRequestBatchSchema`.
- `playcraft-service-http` — the local loopback server.

The studio and mobile shell default to the in-process transport. Set `VITE_PLAYCRAFT_SERVICE_URL=http://127.0.0.1:8787/playcraft` for either Vite app to route assembly, update, preview, session lookup, profile export/import, and reset requests through the HTTP service boundary instead. Local transcript adapters pass a validated `MoonshineTranscriptRecord` into the Studio client; typed transcript text is converted into a local Moonshine transcript record before crossing the service envelope.

Agents that need the exact API boundary call `playcraft-service request --request-json '<BuilderServiceRequest JSON>' --json` and receive the full `BuilderServiceResponse` envelope. Use `playcraft-service request-batch --request-json '<BuilderServiceRequest JSON array>' --json` or `handleLocalServiceRequestBatch` when multiple `BuilderServiceRequestBatchSchema` envelopes need to share one local session in the same process. Friendly CLI commands keep concise output for humans; `playcraft-service assemble --transcript '<local transcript text>' --json` creates a validated Moonshine Streaming CPU transcript record before calling the same service envelope. Read `playcraft-service catalog --json` before assembly to discover exact-envelope required contracts, request field summaries, exclusive and forbidden field groups, exact-envelope service helpers, transport helpers, and bundled local replacement themes; the Studio request tips are generated from the same catalog data.

Template request phrases belong in `GameTemplateDefinition.requestAliases`. Do not add service-side `if game == ...` branches when adding a template; the local service resolves template switches from catalog aliases and records the matched alias in `BuilderIntentResolution`.

Live app visual levers belong in `GameTemplateDefinition.liveSurface`. Each template provides component capabilities, asset replacement sources, explicit token styles, and a default token style so the Studio and Mobile renderers do not invent local color palettes for custom asset tokens.

## 16. Required Acceptance Gates

Default verification runs through `pnpm verify`, which executes every gate below in order:

- `pnpm typecheck` — reports zero errors.
- `pnpm lint:guardrails` — `scripts/check-guardrails.mjs` finds zero out-of-scope, out-of-scope, `tracker-item`, `tracker-item`, `workaround-note` markers; rejects any non-`playcraft.v1` schema literal; enforces `GAME_BUNDLE_MAX_BYTES === 512 * 1024`.
- `pnpm test` — at or above the previous milestone baseline.
- `pnpm test:a11y` — `vitest-axe` reports zero critical-impact accessibility violations against the Studio and `LiveGame` surfaces.
- `pnpm test:e2e` — Playwright e2e tests pass.
- `pnpm build:studio` — the Vite Studio bundle builds.

Suggested ripgrep targets that the source-scan gate covers:

```bash
rg "GameType|MEMORY_MATCH|PATTERN_MATCH|SORTING" packages/core packages/contracts
rg "sourceName|if \\(source|switch \\(source" packages/core packages/assets packages/builder packages/service apps/studio
rg "route-handler|provider-client|database-client|auth-client|API_KEY|process\\.env" packages/core packages/contracts packages/service
rg "eval\\(|new Function|dangerouslySetInnerHTML" packages/renderer packages/builder packages/service apps/studio
rg "out-of-scope|out-of-scope|// tracker-item|// tracker-item|// workaround-note" packages apps tests scripts
```

Exact paths can change; the gates cannot.

## 17. Tauri Mobile Shell Signing & Distribution

The Tauri Mobile-facing shell (`apps/mobile-shell/src-tauri/`) is staged for code signing across Apple, Windows, Android, and iOS without committing any secrets. All real credentials are injected at build / CI time through environment variables, and the committed `tauri.conf.json` keeps only the shape of the signing stanzas (with `null` values for the secret-bearing fields).

### 17.1 Files involved

- `apps/mobile-shell/src-tauri/tauri.conf.json` — `bundle.macOS`, `bundle.windows`, `bundle.android`, `bundle.iOS` stanzas with `null` for fields that carry secrets. The Tauri CLI resolves these at build time from environment variables.
- `apps/mobile-shell/.env.example` — placeholder environment file enumerating every variable the bundle pipeline reads. Commit only this template; the real `.env` is gitignored.
- This guide section — operator-facing notes for signing setup.

### 17.2 Environment variables (resolve at build time)

The Tauri CLI and supporting build tools read these from the build environment. Set them in your local shell, CI secrets manager, or a provisioning script before invoking `pnpm build:mobile` or `tauri build`.

| Variable | Platform | Purpose |
|----------|----------|---------|
| `TAURI_SIGNING_PRIVATE_KEY` | All | PEM private key string or filesystem path used to sign updater artifacts |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | All | Optional password for the private key |
| `APPLE_ID` | macOS / iOS | Apple ID email used for notarization |
| `APPLE_PASSWORD` | macOS / iOS | App-specific password for `APPLE_ID` |
| `APPLE_TEAM_ID` | macOS / iOS | Apple Developer Team ID |
| `APPLE_CERTIFICATE` | macOS / iOS | base64-encoded `.p12` Developer ID Application cert |
| `APPLE_CERTIFICATE_PASSWORD` | macOS / iOS | Password for `APPLE_CERTIFICATE` |
| `APPLE_SIGNING_IDENTITY` | macOS / iOS | Optional explicit identity name from Keychain Access |
| `APPLE_API_KEY` / `APPLE_API_ISSUER` | macOS / iOS | App Store Connect API key pair (alternative to `APPLE_ID`) |
| `APPLE_IOS_DEVELOPMENT_TEAM` | iOS | Apple Developer Team ID used by Xcode when exporting the archive |
| `WINDOWS_CERTIFICATE` | Windows | base64-encoded `.pfx` Authenticode cert |
| `WINDOWS_CERTIFICATE_PASSWORD` | Windows | Password for `WINDOWS_CERTIFICATE` |
| `WINDOWS_SIGN_COMMAND` | Windows | Optional full `signCommand` template for Azure Trusted Signing or a third-party signer; secrets stay in CI, not in `tauri.conf.json` |
| `TAURI_ANDROID_KEYSTORE_PATH` | Android | Path to upload keystore (`.jks` / `.keystore`) |
| `TAURI_ANDROID_KEYSTORE_PASSWORD` | Android | Password for the keystore and key |
| `TAURI_ANDROID_KEY_ALIAS` | Android | Alias of the signing key inside the keystore |

### 17.3 CI invocation pattern

1. Hydrate the environment variables above from the CI secrets store. Never echo the values into logs.
2. Run `pnpm --filter @playcraft/mobile-shell exec pnpm tauri build` (or the equivalent `tauri-action` step) on a runner that has the platform signing toolchain (`codesign`, `xcodebuild`, `signtool`, `apksigner`, `bundletool`).
3. Promote the generated updater artifacts via the matching `tauri-action` `release` workflow once notarization and store validation succeed.

### 17.4 Local development

For local builds without signing, leave the variables unset and keep `bundle.active: false` in `tauri.conf.json`. The webview scaffold runs unmodified as long as the in-process service or local HTTP service is reachable (`pnpm serve:service`). No certificate is required to develop or test the Studio UI through the mobile shell.

### 17.5 What must never be committed

- Real `.p12`, `.pfx`, `.jks`, `.key`, or `.pem` files.
- Provisioning profiles, App Store Connect API keys, or notarization credentials.
- Concrete `signingIdentity`, `providerShortName`, `certificateThumbprint`, or other secret-bearing values inline in `tauri.conf.json`.

If a CI secret is leaked, rotate it immediately and audit the signing stanzas to confirm no committed fallback was added.

## 18. Building Custom Templates and Workflows

Custom templates extend the local planner with namespaced recipes without touching bundled MVP templates. Custom workflows chain builder actions into graph files that the CLI and MCP server both accept.

### 18.1 Custom templates

Custom template recipes live in `examples/profiles/custom-*.json`:

- `examples/profiles/custom-toy-memory.json`
- `examples/profiles/custom-dolphin-sorting.json`
- `examples/profiles/custom-fruit-sequence.json`

Each fixture is a complete `GameAssemblyProfile` produced by the deterministic planner from a `template.custom.<slug>` request. The corresponding recipe ids live in the custom template pack under `recipe.bundled.<slug>` (the bundled template id is `template.custom.<slug>`, but the recipe id uses the recipe namespace).

To add a new custom recipe:

1. Declare a `GameTemplateDefinition` with `id: "template.custom.<slug>"` and a unique `game:custom-<slug>` capability tag in both `capabilityTags` and `requestedCapabilities`. The custom tag wins planner selection against the bundled MVP recipes.
2. Provide `requestAliases`, `liveSurface` (component capabilities, asset replacement sources, explicit token styles, and a default token style), `assetEditOperations`, and `assetPromptKind`.
3. Add the matching `AssemblyRecipe` with `id: "recipe.bundled.<slug>"`, `version`, and `build` that calls `buildProfileFromTemplate(template, context)`.
4. Generate the profile fixture with the deterministic planner and commit it under `examples/profiles/custom-<slug>.json` so round-trip and replay tests have a stable input.
5. Verify the namespace with `BuilderTemplateNamespaceSchema.parse(id)`: only ids under the `template.custom.*` prefix are accepted.

### 18.2 Custom workflows

Workflow graph JSON lives in `examples/workflows/`:

- `examples/workflows/assemble-preview-export.json` — linear 3-node example.
- `examples/workflows/assemble-with-custom-template.json` — linear graph using a `template.custom.*` recipe.
- `examples/workflows/parallel-assemble-three.json` — fan-out of three independent `assemble` nodes merging into a tail node.
- `examples/workflows/conditional-export-only-on-success.json` — `condition`-based skip on the export node.

To add a new example workflow:

1. Build a `WorkflowGraph` JSON object with `schemaVersion: "playcraft.v1"`, `kind: "workflow-graph"`, `version`, a stable `id` (under 96 characters), `nodes`, `edges`, and `startNodeId`. Node ids and `startNodeId` must match `StableIdSchema`. Each node's `actionName` must be one of the `BuilderServiceActionName` values.
2. Keep the graph under the 20-node cap (`WORKFLOW_NODE_CAP`). Cycles, dangling edge references, and malformed `condition` strings are rejected at parse time, so a quick `WorkflowGraphSchema.parse(json)` is enough validation for a fixture.
3. Save the file under `examples/workflows/<slug>.json`.
4. Add a parse + run test to `tests/workflow-examples.test.ts` so the example is exercised by both `WorkflowGraphSchema` and the `run-workflow` CLI in CI.
5. Document the pattern in [WORKFLOWS.md](WORKFLOWS.md) alongside the existing linear, parallel, conditional, and error-handling entries.

## 19. Milestones

The 1–8 milestones from V1 are complete. Wave H adds milestones 9 and 10.

### Milestone 9: LLM-Driven Local-First Architecture (Wave H)

- `MoonshineStreamingCpuEngine` (LFM2.5-VL-450M-Extract over Moonshine Streaming CPU) wired as the default local inference engine.
- `AgentLoop` + `ToolAdapter` + `Outlines`-constrained JSON tool-call generation.
- `ProvenanceSchema` added to every building-block manifest.
- `DeterministicAssemblyPlanner.registerRecipe()` accepting LLM-authored recipes under the `recipe.local-authored.*` namespace.
- `LocalAssetFolderSource` reading the canonical local folder (`apps/studio/src/assets/library/replacements/`) with `PLAYCRAFT_REPLACEMENTS_FOLDER` override.
- `RemoteEnrichmentSource` interface + `NullRemoteEnrichmentSource` default.
- Bundle cap enforcer (`GAME_BUNDLE_MAX_BYTES = 512 * 1024`, `GAME_BUNDLE_MAX_REGISTRY_ENTRIES = 256`, `purgedEntryIds`).
- Guardrail script (`scripts/check-guardrails.mjs`) blocking out-of-scope/`tracker-item`/`tracker-item`/`workaround-note`.

### Milestone 10: Forward-Only Doc Rewrite (Wave H)

- [README.md](README.md) and the architecture, dev guide, MCP API, workflows, safety, and contributing docs rewritten to reflect the local-first LLM-driven architecture.
- Root [README.md](../../README.md) updated to match.
- All PRD / roadmap / retrieval-plan files purged of remotely-operated-service phrasing.

## 20. Development Rules

- Local-first contracts and integrations before anything else.
- Local asset folder before any remote source.
- Registries over conditionals; provenance-tagged manifests over hardcoded defaults.
- AG-UI standard events over custom transport.
- Validated Playcraft `Custom` envelopes only.
- Trusted React components only.
- No arbitrary generated play-surface code.
- Import-light core.
- Replay is product behavior, not debug logging.
- All public objects stamp `schemaVersion: "playcraft.v1"`. No v1.1 / v2 reservations in the public contracts.
- Every building block ships with `provenance`. The default is `BUNDLED_LOCAL_PROVENANCE`.
- Every recipe id uses the `recipe.bundled.* | recipe.local-authored.* | recipe.remote-agent.*` namespace.
- Forward-only; no migration code; no out-of-scope shim.
