# Playcraft Agentic Game Framework Developer Guide

**Implementation guide for the local-first, AG-UI-native game-assembly SDK**

| Attribute | Value |
|-----------|-------|
| Status | Active developer guide |
| Date | 2026-07-06 |
| Schema version | `playcraft.v1` |
| Primary stack | TypeScript, Zod, React, AG-UI events, deterministic local tools, Vitest, vitest-axe |

## 1. Implementation Posture

The shipped core is local-first and import-light. Build new work as TypeScript packages and Vitest tests; do not start from the older app-route, database schema, auth model, dashboard, or third-party runtime route shape.

The core must remain usable without network access, credentials, AI SDKs, GPU, model weights, database services, or native-shell APIs. Third-party runtime adapters, the Vite studio UX, and the Tauri mobile shell are app layers around the core, not prerequisites.

## 2. Current Package Layout

| Package / App | Responsibility |
|---------------|----------------|
| `packages/contracts` | Zod schemas, TypeScript types, schema versions, fixture builders. The barrel `src/index.ts` re-exports the twelve domain modules: `base`, `condition`, `workflow`, `mcp`, `sse`, `asset`, `ag-ui`, `packs`, `game-template`, `builder-catalog`, `manifests`, `builder`. All schemas stamp `schemaVersion: "playcraft.v1"`. |
| `packages/core` | Registries, deterministic local planner, deterministic local asset source, rule evaluation, safety policy evaluation, replay model. Imports `@playcraft/contracts` via the barrel. |
| `packages/ag-ui` | AG-UI event mapping, Playcraft `Custom` envelope adapters, stream helpers. |
| `packages/renderer` | Trusted React renderer, component registry, component manifest validation. |
| `packages/assets` | Asset request schemas, deterministic local asset source, asset source manifest helpers, `localAssetEditCatalog`, `localAssetEditMaxItems`, `localAssetEditFreeformItemSuffixes`, `localAssetEditGenericThemeTokens`. |
| `packages/packs` | Initial mechanic, rule, component, theme, domain, safety, and asset source packs. Exports `gameTemplateDefinitions` and `DEFAULT_GAME_TEMPLATE_ID`. |
| `packages/builder` | Local builder tool handler. `createBuilderCommandHandler()` returns a `BuilderCommandHandler` for `assemble-game`, `update-game`, `preview-action`, `importProfile`, `listTemplates`, `listTools`, `getSessionSnapshot`. |
| `packages/mcp` | MCP-compatible HTTP adapter. Implements the seven-tool allowlist. |
| `packages/service` | Local app/API facade and `playcraft-service` CLI. Split into `index.ts` (class + workflow executor), `local-catalog.ts` (catalog constants + session state helpers), `intent-resolution.ts` (text/transcript resolution + Moonshine config), `json-helpers.ts` (envelope helpers, `defaultFetch`, `createMoonshineTranscriptRecord`). |
| `apps/studio` | Vite React studio rendering the Live tab, Developer tab, and trusted preview from the service transport. |
| `apps/mobile-shell` | Tauri Mobile-facing webview shell reusing the Studio UI and local service transport. Tauri v2 bundle signing is staged (see §15). |
| `examples/profiles` | Saved `GameAssemblyProfile` fixtures for memory match, sorting, sequence repeat, and `template.custom.*` recipes. |
| `examples/workflows` | `WorkflowGraph` JSON examples (linear, parallel, conditional, error-handling). |

Do not put framework core logic behind app-route handlers, native commands, or app-specific stores. The service, studio, and mobile shell consume the packages; they do not define framework contracts.

## 3. Contracts Module Layout

`packages/contracts/src/index.ts` is the only public entry point. Consumers always import from `@playcraft/contracts`; they never reach into individual domain modules, so a future schema split never breaks a downstream consumer.

The barrel re-exports:

| Module | Surface |
|--------|---------|
| `base.ts` | `PLAYCRAFT_SCHEMA_VERSION = "playcraft.v1"`, `PLAYCRAFT_LOCAL_TIMESTAMP`, `StableIdSchema`, `VersionSchema`, `CapabilityTagSchema`, `AgeBandSchema`, `InputModalitySchema`, `AssetContentTypeSchema`, `AssetFormatSchema`, `SafetyStatusSchema`, `ValidationSeveritySchema`, `JsonValueSchema`, `JsonFieldSchema`, `JsonObjectSchemaDescriptorSchema`, `SchemaIssueSchema`, `CompatibilityConstraintsSchema`, the public-contract base and discriminator, `BuilderServiceActionNameSchema`, `BuilderActionNameSchema`, `BuilderInputSourceSchema`, `BuilderInputRequestSchema`, `BuilderTemplateIdSchema`, `BuilderAssetEditSchema`, `BuilderToolDefinitionSchema`, `BuilderIntentResolutionSchema`, `BuilderPreviewInteractionSchema`, `BuilderPreviewStateSchema`, `BuilderSessionOwnershipSchema`, `BuilderServiceErrorSchema`, `MoonshineTranscriptRecordSchema`, `schemaIssue`. |
| `condition.ts` | `WorkflowConditionSchema`, `parseWorkflowCondition`, `evaluateCondition`, `WorkflowConditionExpr`, `PayloadPath`, `PayloadMeasure`, `CompareOp`, `LenOp`, `ConditionEvaluationContext`, `ConditionEvaluationResult`. |
| `workflow.ts` | `WorkflowGraphSchema`, `WorkflowNodeSchema`, `WorkflowEdgeSchema`, `WORKFLOW_NODE_CAP` (20). |
| `mcp.ts` | `McpManifestSchema`, `McpServerPolicySchema` (the seven-tool allowlist). |
| `sse.ts` | `SseFrameSchema`, `SseFrame` helpers used by `playcraft-service-http`. |
| `asset.ts` | `AssetGenerationRequestSchema`, `AssetSourceCapabilityManifestSchema`, `GeneratedAssetRecordSchema`, `AssemblyValidationResultSchema`, `AssetCatalogManifestSchema`. |
| `ag-ui.ts` | `PlaycraftAgUiEventEnvelopeSchema`, `PlaycraftEventRecordSchema`. |
| `packs.ts` | `PackManifestSchema`, `BuilderTemplateNamespaceSchema`. |
| `game-template.ts` | `GameAssemblyProfileSchema`, `GameProfileTemplateSnapshotSchema`, `GameTemplateDefinitionSchema`. |
| `builder-catalog.ts` | `BuilderCatalogSchema`, `BuilderCatalog`. |
| `manifests.ts` | `MechanicDefinitionSchema`, `RuleModuleDefinitionSchema`, `ComponentManifestSchema`, `ComponentRenderRequestSchema`, `ThemePackSchema`, `DomainProfileSchema`, `SafetyPolicyPackSchema`, `FrontendToolDefinitionSchema`. |
| `builder.ts` | `BuilderServiceRequestSchema`, `BuilderServiceRequestBatchSchema`, `BuilderServiceResponseSchema`, `BuilderServiceExecutionSchema`, `BuilderProfileExportSchema`, plus the `BuilderServiceRequest` / `BuilderServiceResponse` / `BuilderServiceError` / `BuilderSessionSnapshot` / `BuilderAssetEdit` / `BuilderPreviewInteraction` / `BuilderCommand` / `BuilderInputSource` / `BuilderServiceActionName` / `BuilderTemplateId` / `GameAssemblyProfile` / `JsonValue` / `MoonshineTranscriptRecord` / `SseFrame` types. |

### 3.1 Lazy-wrap pattern

`JsonValueSchema` and `JsonFieldSchema` are declared with `z.lazy(...)` so the recursive JSON types terminate cleanly:

```ts
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([JsonPrimitiveSchema, z.array(JsonValueSchema), z.record(JsonValueSchema)])
);

export const JsonFieldSchema: z.ZodType<JsonField> = z.lazy(() =>
  z
    .object({
      type: z.enum(["string", "number", "boolean", "object", "array", "record"]),
      required: z.boolean().default(true),
      minItems: z.number().int().nonnegative().optional(),
      allowedValues: z.array(JsonPrimitiveSchema).optional(),
      fields: z.record(JsonFieldSchema).optional(),
      allowUnknown: z.boolean().optional()
    })
    .strict()
);
```

The lazy-wrap keeps the type alias and the runtime schema in sync. The explicit `z.ZodType<T>` annotation is the marker that tells Zod "trust me on the recursive type" — without it, `z.lazy(() => z.record(...))` produces a self-referencing schema that TypeScript cannot infer. Any new recursive schema in the contracts package should follow the same `z.lazy` + `z.ZodType<T>` shape.

### 3.2 `WorkflowCondition` AST parser

`packages/contracts/src/condition.ts` exposes a typed AST parser rather than a free-form string. Workflow graph `condition` fields accept either a string or a pre-parsed `WorkflowConditionExpr`:

```ts
export type WorkflowConditionExpr =
  | { kind: "compare"; path: PayloadPath; op: CompareOp; value: JsonPrimitive }
  | { kind: "len"; path: PayloadPath; op: LenOp; value: number };
```

`WorkflowConditionSchema` is a Zod union of a string (parsed through `parseWorkflowCondition`) and the two pre-parsed shapes; both branches converge to `WorkflowConditionExpr` via the trailing `.transform`.

The parser supports two expression families:

- `payload.<key> == <literal>` / `!=` — `kind: "compare"`, accepts string, number, boolean, null literals.
- `len(payload.<key>) <op> <number>` — `kind: "len"`, where `<op>` is `==`, `!=`, `>`, `>=`, `<`, `<=`. Optional measure suffixes `.length`, `.count`, `.size` are parsed and stored on `PayloadPath.measure`.

Malformed input throws `ConditionParseError` ("workflow condition ... is not a supported payload equality or length check"). `parseWorkflowCondition` is exported so workflow tools and tests can validate condition strings before serializing them into a `WorkflowGraph`; `evaluateCondition(expr, { payload })` runs the AST against a payload object and returns `{ satisfied, detail }`.

## 4. Service Split

`packages/service/src/index.ts` is the `LocalPlaycraftService` class body plus the `executeWorkflow` body. Both stay inline (a previous attempt to extract `executeWorkflow` broke 143 tests; keep it inline). The pure helpers that the class body used to inline are now in three sibling modules:

| Module | LOC | Exports |
|--------|-----|---------|
| `index.ts` | ~686 | `LocalPlaycraftService`, `createLocalPlaycraftService`, `createLocalServiceTransport`, `createHttpServiceTransport`, `handleServiceHttpRequestBody`, `handleLocalServiceRequest`, `handleLocalServiceRequestBatch`, `BuilderServiceTransport`, `BuilderServiceHttpResponse`, `BuilderServiceHttpFetch`, `BuilderServiceHttpFetchResponse`, `LocalBuilderInput`, `BuilderServiceHttpFetchResponse`, re-exports of `WorkflowGraphSchema` / `WorkflowNodeSchema` / `WorkflowEdgeSchema` / `WorkflowConditionSchema` / `WORKFLOW_NODE_CAP`, `executeWorkflow` / `executeWorkflowSse` / `executeWorkflowSync`, `PLAYCRAFT_SERVICE_PACKAGE`, `localAssetEditCatalog`. |
| `local-catalog.ts` | ~290 | `LOCAL_SERVICE_SESSION_POLICY`, `LOCAL_SERVICE_SESSION_TTL_MS`, `LOCAL_SERVICE_DEFAULT_OWNER_ID`, `LOCAL_SERVICE_INPUT_POLICY`, `LOCAL_SERVICE_REQUEST_TIP_EXAMPLES`, `LOCAL_SERVICE_REQUEST_TIP_FEATURED_TEMPLATE_IDS`, `LOCAL_SERVICE_CATALOG`, `LocalSessionState`, `createSessionOwnership`, `requestTipsForCatalog`, `mergeSessionState`. |
| `intent-resolution.ts` | ~416 | `resolveBuilderInputCommand`, `createBuilderInputRequest`, `MOONSHINE_STREAMING_CPU_CONFIG`, `textForBuilderInputSource`, `sourceForServiceRequest`, `textForServiceRequest`, `ResolvedBuilderInputCommand`, plus the text/asset matching internals. |
| `json-helpers.ts` | ~188 | `toJsonValue`, `serializeExecution`, `buildWorkflowCommandResult`, `serviceResponse`, `serviceRequestSessionId`, `requireResultTemplateId`, `streamRunId`, `defaultFetch`, `createMoonshineTranscriptRecord`, `BuilderServiceHttpFetch`, `BuilderServiceHttpFetchResponse`. |

`index.ts` re-exports the public surface of all three sibling modules so consumers see a single `@playcraft/service` barrel. Cross-module dependencies are acyclic: `intent-resolution.ts` imports `toJsonValue` from `json-helpers.ts`; `json-helpers.ts` imports `MOONSHINE_STREAMING_CPU_CONFIG` from `intent-resolution.ts`; `local-catalog.ts` has no outbound dependency on the other two.

`gameTemplateDefinitions` is imported from `@playcraft/packs` (not from `@playcraft/contracts`). `@playcraft/contracts` exports only the `GameTemplateDefinition` *type/schema*; the runtime array is a packs-package concern.

The `BuilderServiceHttpFetch` / `BuilderServiceHttpFetchResponse` types live in `json-helpers.ts` because `defaultFetch` lives there. `index.ts` re-exports the types so consumers see a single barrel.

## 5. Stack Defaults

| Area | Default |
|------|---------|
| Language | TypeScript strict mode. |
| Schemas | Zod. |
| Tests | Vitest for contracts/core, React Testing Library for renderer, vitest-axe for the Studio a11y gate. |
| Client layer | Vite + React in `apps/studio` and `apps/mobile-shell`. |
| Styling | Tailwind plus focused component CSS for game surfaces, only in renderer/studio layers. |
| Protocol | AG-UI standard events plus validated Playcraft `Custom` envelopes. |
| Persistence | JSON fixtures first; repository interfaces later. |
| Native shell | Tauri/Tauri Mobile only in app shells; never required by core. |

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

Every contract must include:

- `schemaVersion: "playcraft.v1"`.
- Stable ID and version.
- Capability tags where selection applies.
- Compatibility constraints.
- Structured validation errors.
- Fixtures used by tests.

Behavior-changing defaults must live in profile/config/manifest records, not as unowned literals in core logic.

## 7. Registries

Required registries:

| Registry | Selects by |
|----------|------------|
| `mechanicRegistry` | ID, version, age band, input modality, event compatibility, asset requirements, capability tags. |
| `ruleRegistry` | Category, consumed events, emitted events, supported mechanics, safety policy, default source. |
| `componentRegistry` | Render capability, supported mechanics, props schema, emitted tools, accessibility, safety policy. |
| `themeRegistry` | Domain, age band, accessibility, visual style, audio style, allowed content. |
| `assetSourceRegistry` | Content type, format, seed support, safety support, offline/network mode, credential requirement. |
| `domainRegistry` | Domain profile ID, allowed packs, defaults, safety policy, UX assumptions. |

Registry lookup must return structured match results:

- Selected candidate.
- Rejected candidates.
- Missing capabilities.
- Version conflicts.
- Warnings.

Tests must prove that registry selection does not rely on `GameType`, source names, or hardcoded app route logic.

## 8. Deterministic Local Tools

V1 ships deterministic local tools:

- Local deterministic planner: converts known fixture requests into memory match, sorting, and sequence repeat profiles through registries.
- Deterministic local asset source: returns stable local asset records for the same request and seed policy.
- Local safety evaluator: applies explicit local policy fixtures.
- Fixture persistence: reads/writes JSON fixtures only if needed by tests or examples.

Stub outputs are replayable and stable in default tests.

## 9. AG-UI Adapter

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
  schemaVersion: string; // "playcraft.v1"
  eventId: string;
  profileId?: string;
  runId?: string;
  payloadType: string;
  payload: TPayload;
  provenance: {
    role:
      | "planner"
      | "asset_requester"
      | "asset_source"
      | "safety_evaluator"
      | "validator"
      | "renderer"
      | "frontend";
    sourceId: string;
  };
};
```

Every adapter test must validate both the AG-UI event wrapper and the Playcraft envelope payload.

## 10. Trusted Renderer

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

## 11. Assembly Pipeline

Implement pure steps first:

1. Validate `PlaycraftAssemblyRequest`.
2. Select `DomainProfile` and `SafetyPolicyPack`.
3. Select mechanics by capability, modality, domain, and event compatibility.
4. Select rules by mechanic events and policy.
5. Select components by mechanic render needs and props schemas.
6. Select theme pack.
7. Generate local asset-source asset requests.
8. Resolve assets through the deterministic local asset source.
9. Build `GameAssemblyProfile`.
10. Validate profile schemas, registry references, event graph, component bindings, assets, policy, and replay readiness.
11. Emit AG-UI lifecycle/state/custom events through the adapter.

Each step must be independently testable.

## 12. MVP Profiles

Build these profiles first:

| Profile | Mechanics | Rules | Components |
|---------|-----------|-------|------------|
| Memory Match | `tap-to-reveal`, `match-pairs`, `timed-celebration` | Pair matching, retry, hint, completion | `RevealCardGrid`, `CelebrationOverlay` |
| Sorting | `tap-to-select`, `sort-into-bins`, `retry-loop` | Category validation, guided retry, completion | `ChoiceGrid`, `SortBins`, `HintBubble` |
| Sequence Repeat | `sequence-repeat`, `tap-to-select`, `timed-celebration` | Progression, attempt feedback, hint | `SequencePad`, `ChoiceGrid`, `CelebrationOverlay` |

These are profile fixtures assembled through registries, not enum branches.

## 13. Service Wiring

Studio clients talk to a `BuilderServiceTransport`. The shipped transports:

- `createLocalServiceTransport(service?)` — in-process transport. Default for both Vite apps.
- `createHttpServiceTransport({ endpoint, fetch?, headers? })` — HTTP JSON transport. Activated by `VITE_PLAYCRAFT_SERVICE_URL=http://127.0.0.1:8787/playcraft`.
- `handleServiceHttpRequestBody(body, service?)` — server-side helper for any HTTP wrapper.
- `handleLocalServiceRequestBatch(requests, service?)` — same-process batch helper for `BuilderServiceRequestBatchSchema`.
- `playcraft-service-http` — the local loopback server.

The studio and mobile shell default to the in-process transport. Set `VITE_PLAYCRAFT_SERVICE_URL=http://127.0.0.1:8787/playcraft` for either Vite app to route assembly, update, preview, session lookup, profile export/import, and reset requests through the HTTP service boundary instead. Local transcript adapters should pass a validated `MoonshineTranscriptRecord` into the Studio client; typed transcript text must be converted into a local Moonshine transcript record before crossing the service envelope.

Agents that need the exact API boundary can call `playcraft-service request --request-json '<BuilderServiceRequest JSON>' --json` and receive the full `BuilderServiceResponse` envelope. Use `playcraft-service request-batch --request-json '<BuilderServiceRequest JSON array>' --json` or `handleLocalServiceRequestBatch` when multiple `BuilderServiceRequestBatchSchema` envelopes need to share one local session in the same process, such as assemble then export. Friendly CLI commands may keep concise output for humans, and `playcraft-service assemble --transcript '<local transcript text>' --json` creates a validated Moonshine Streaming CPU transcript record before calling the same service envelope. Read `playcraft-service catalog --json` before assembly to discover template aliases, default and transcript input sources, accepted asset edit keys, profile get/export/import tools, exact-envelope service helpers, exact-envelope required contracts, request field summaries, exclusive and forbidden field groups, transport helpers, and bundled local replacement themes/items/folders; the Studio request tips are generated from the same catalog data. Use `export-profile` and `import-profile` to move validated `GameAssemblyProfile` records between local sessions without rerunning planning or accepting generated runtime code.

Template request phrases belong in `GameTemplateDefinition.requestAliases`. Do not add service-side `if game == ...` branches when adding a template; the local service resolves template switches from catalog aliases and records the matched alias in `BuilderIntentResolution`.

Live app visual levers belong in `GameTemplateDefinition.liveSurface`. Each template must provide component capabilities, asset replacement sources, explicit token styles, and a default token style so Studio/Mobile renderers do not invent local color palettes for custom asset tokens.

## 14. Required Acceptance Gates

Default verification must include:

- Schema tests for every public contract.
- Registry tests for mechanics, rules, components, themes, asset sources, domains, and safety policies.
- AG-UI envelope tests for lifecycle/state/activity/tool/custom mapping and Playcraft `Custom` payload validation.
- Replay tests reconstructing memory match, sorting, and sequence repeat from saved `GameAssemblyProfile` records.
- Trusted renderer tests that reject unknown component IDs, unregistered capabilities, invalid props, and generated runtime code.
- Import-light tests proving contracts/core/registries import without AI SDKs, network clients, GPU/model packages, credentials, database clients, app-route frameworks, or native shell APIs.
- Source scans against hardcoded defaults, `GameType` core branching, source-name branching, arbitrary generated React/runtime code, app-route dependencies in core, database/auth/dashboard assumptions, and third-party runtime paths.
- `pnpm typecheck` reports zero errors.
- `pnpm test` reports ≥ 652 tests passing.
- `pnpm test:a11y` (vitest-axe) reports zero critical-impact accessibility violations against the Studio and `LiveGame` surfaces.

Suggested scan targets:

```bash
rg "GameType|MEMORY_MATCH|PATTERN_MATCH|SORTING" packages/core packages/contracts
rg "sourceName|if \\(source|switch \\(source" packages/core packages/assets packages/builder packages/service apps/studio
rg "route-handler|provider-client|database-client|auth-client|API_KEY|process\\.env" packages/core packages/contracts packages/service
rg "eval\\(|new Function|dangerouslySetInnerHTML" packages/renderer packages/builder packages/service apps/studio
```

The exact paths can change, but the gates cannot.

## 15. Tauri Mobile Shell Signing & Distribution

The Tauri Mobile-facing shell (`apps/mobile-shell/src-tauri/`) is staged for code signing across Apple, Windows, Android, and iOS without committing any secrets. All real credentials are injected at build / CI time through environment variables, and the committed `tauri.conf.json` keeps only the shape of the signing stanzas (with `null` values for the secret-bearing fields).

### 15.1 Files involved

- `apps/mobile-shell/src-tauri/tauri.conf.json` — `bundle.macOS`, `bundle.windows`, `bundle.android`, `bundle.iOS` stanzas with `null` for fields that carry secrets. The Tauri CLI resolves these at build time from environment variables documented below.
- `apps/mobile-shell/.env.example` — placeholder environment file enumerating every variable the bundle pipeline reads. Commit only this template; the real `.env` is gitignored.
- `playcraft-agentic-framework/DEV_GUIDE.md` (this section) — operator-facing notes for signing setup.

### 15.2 Environment variables (resolve at build time)

The Tauri CLI and supporting build tools read these from the build environment. Set them in your local shell, CI secrets manager, or a provisioning script before invoking `pnpm build:mobile` or `tauri build`.

| Variable | Platform | Purpose |
|----------|----------|---------|
| `TAURI_SIGNING_PRIVATE_KEY` | All | PEM private key string or filesystem path used to sign updater artifacts. |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | All | Optional password for the private key. |
| `APPLE_ID` | macOS / iOS | Apple ID email used for notarization. |
| `APPLE_PASSWORD` | macOS / iOS | App-specific password for `APPLE_ID`. |
| `APPLE_TEAM_ID` | macOS / iOS | Apple Developer Team ID. |
| `APPLE_CERTIFICATE` | macOS / iOS | base64-encoded `.p12` Developer ID Application cert. |
| `APPLE_CERTIFICATE_PASSWORD` | macOS / iOS | Password for `APPLE_CERTIFICATE`. |
| `APPLE_SIGNING_IDENTITY` | macOS / iOS | Optional explicit identity name from Keychain Access. |
| `APPLE_API_KEY` / `APPLE_API_ISSUER` | macOS / iOS | App Store Connect API key pair (alternative to APPLE_ID). |
| `APPLE_IOS_DEVELOPMENT_TEAM` | iOS | Apple Developer Team ID used by Xcode when exporting the archive. |
| `WINDOWS_CERTIFICATE` | Windows | base64-encoded `.pfx` Authenticode cert. |
| `WINDOWS_CERTIFICATE_PASSWORD` | Windows | Password for `WINDOWS_CERTIFICATE`. |
| `WINDOWS_SIGN_COMMAND` | Windows | Optional full `signCommand` template for Azure Trusted Signing or a third-party signer; secrets stay in CI, not in `tauri.conf.json`. |
| `TAURI_ANDROID_KEYSTORE_PATH` | Android | Path to upload keystore (`.jks` / `.keystore`). |
| `TAURI_ANDROID_KEYSTORE_PASSWORD` | Android | Password for the keystore and key (Tauri expects one password for both). |
| `TAURI_ANDROID_KEY_ALIAS` | Android | Alias of the signing key inside the keystore. |

### 15.3 CI invocation pattern

1. Hydrate the environment variables above from the CI secrets store (GitHub Actions secrets, GitLab masked variables, etc.). Never echo the values into logs.
2. Run `pnpm --filter @playcraft/mobile-shell exec pnpm tauri build` (or the equivalent `tauri-action` step) on a runner that has the platform signing toolchain (`codesign`, `xcodebuild`, `signtool`, `apksigner`, `bundletool`).
3. Promote the generated updater artifacts via the matching `tauri-action` `release` workflow once notarization and store validation succeed.

### 15.4 Local development

For local builds without signing, leave the variables unset and keep `bundle.active: false` in `tauri.conf.json`. The webview scaffold runs unmodified as long as the in-process service or local HTTP service is reachable (`pnpm serve:service`). No certificate is required to develop or test the Studio UI through the mobile shell.

### 15.5 What must never be committed

- Real `.p12`, `.pfx`, `.jks`, `.key`, or `.pem` files.
- Provisioning profiles, App Store Connect API keys, or notarization credentials.
- Concrete `signingIdentity`, `providerShortName`, `certificateThumbprint`, `minimumSystemVersion`-bumping overrides, or other secret-bearing values inline in `tauri.conf.json`.

If a CI secret is leaked, rotate it immediately and audit the signing stanzas to confirm no committed fallback was added.

## 16. Building Custom Templates and Workflows

Custom templates extend the local planner with namespaced recipes without touching bundled MVP templates. Custom workflows chain builder actions into graph files that the CLI and MCP server both accept.

### 16.1 Custom templates

Custom template recipes live in `examples/profiles/custom-*.json`:

- [`examples/profiles/custom-toy-memory.json`](../examples/profiles/custom-toy-memory.json)
- [`examples/profiles/custom-dolphin-sorting.json`](../examples/profiles/custom-dolphin-sorting.json)
- [`examples/profiles/custom-fruit-sequence.json`](../examples/profiles/custom-fruit-sequence.json)

Each fixture is a complete `GameAssemblyProfile` produced by the deterministic planner from a `template.custom.<slug>` request. The corresponding template ids (`template.custom.toy-memory`, `template.custom.dolphin-sorting`, `template.custom.fruit-sequence`) live in the custom template pack and are discoverable through `playcraft-service catalog --json`. To add a new custom recipe:

1. Declare a `GameTemplateDefinition` with `id: "template.custom.<slug>"` and a unique `game:custom-<slug>` capability tag in both `capabilityTags` and `requestedCapabilities`. The custom tag wins planner selection against the bundled MVP recipes.
2. Provide `requestAliases`, `liveSurface` (component capabilities, asset replacement sources, explicit token styles, and a default token style), `assetEditOperations`, and `assetPromptKind` so Studio/Mobile renderers do not invent local palettes.
3. Generate the profile fixture with the deterministic planner and commit it under `examples/profiles/custom-<slug>.json` so round-trip and replay tests have a stable input.
4. Verify the namespace with `BuilderTemplateNamespaceSchema.parse(id)`: only ids under the `template.custom.*` prefix are accepted.

### 16.2 Custom workflows

Workflow graph JSON lives in `examples/workflows/`:

- [`examples/workflows/assemble-preview-export.json`](../examples/workflows/assemble-preview-export.json) — linear 3-node example.
- [`examples/workflows/assemble-with-custom-template.json`](../examples/workflows/assemble-with-custom-template.json) — linear graph using a `template.custom.*` recipe.
- [`examples/workflows/parallel-assemble-three.json`](../examples/workflows/parallel-assemble-three.json) — fan-out of three independent `assemble` nodes merging into a tail node.
- [`examples/workflows/conditional-export-only-on-success.json`](../examples/workflows/conditional-export-only-on-success.json) — `condition`-based skip on the export node (parsed through `WorkflowConditionSchema` and `parseWorkflowCondition`).

To add a new example workflow:

1. Build a `WorkflowGraph` JSON object with `schemaVersion: "playcraft.v1"`, `kind: "workflow-graph"`, `version`, a stable `id` (under 96 characters), `nodes`, `edges`, and `startNodeId`. Node ids and `startNodeId` must match `StableIdSchema`. Each node's `actionName` must be one of the `BuilderServiceActionName` values.
2. Keep the graph under the 20-node cap (`WORKFLOW_NODE_CAP`). Cycles, dangling edge references, and malformed `condition` strings are rejected at parse time, so a quick `WorkflowGraphSchema.parse(json)` is enough validation for a fixture.
3. Save the file under `examples/workflows/<slug>.json`.
4. Add a parse + run test to `tests/workflow-examples.test.ts` so the example is exercised by both `WorkflowGraphSchema` and the `run-workflow` CLI in CI.
5. Document the pattern in `playcraft-agentic-framework/WORKFLOWS.md` alongside the existing linear, parallel, conditional, and error-handling entries.

## 17. Milestones

### Milestone 1: Contract Kernel — Complete

- `packages/contracts` created.
- Schemas and fixtures defined.
- Schema tests and import-light tests passing.

### Milestone 2: Registries and Packs — Complete

- Registry APIs implemented in `packages/core`.
- Initial mechanic, rule, component, theme, domain, safety, and asset source manifests shipped in `packages/packs`.
- Structured registry match results.

### Milestone 3: Deterministic Assembly — Complete

- Deterministic local planner and deterministic local asset source.
- Saved profile fixtures for memory match, sorting, and sequence repeat.
- Replay readiness validated.

### Milestone 4: AG-UI Adapter — Complete

- Compliant lifecycle, step, state, activity, tool, and custom events.
- Every Playcraft custom envelope validated.

### Milestone 5: Trusted Renderer — Complete

- React component registry.
- MVP profiles render through registered components only.
- Typed frontend tool events emitted.

### Milestone 6: Replay Harness — Complete

- MVP profiles replay without planning or asset generation.
- Replay event traces compared against fixtures.

### Milestone 7: Service and Shells — Complete

- `packages/service` ships the in-process `LocalPlaycraftService`, the `playcraft-service` CLI, and the `playcraft-service-http` loopback server over the same `BuilderServiceRequest` / `BuilderServiceResponse` envelope.
- `apps/studio` and `apps/mobile-shell` consume the service transport without duplicating command logic.
- Tauri v2 bundle signing staged for macOS, Windows, Android, iOS (see §15).

### Milestone 8: Workflows and Accessibility — Complete

- `WorkflowGraphSchema` + `WorkflowConditionSchema` AST parser + `WORKFLOW_NODE_CAP` (20).
- `execute-workflow` action wired through the service facade and the `playcraft-service run-workflow` CLI.
- vitest-axe + axe-core accessibility gate against the Studio and `LiveGame` surfaces (`pnpm test:a11y`).

### Milestone 9: Deferred Waves — Tracked in `NEXT_WAVE.md`

Server retrieval, multi-tenant isolation, federated discovery, cross-host replay, remote asset library sync, marketplace publishing, schema versioning beyond `playcraft.v1`, npm publishing, E2E harness, and telemetry are tracked in `NEXT_WAVE.md` with rationale, dependencies, and graduation criteria. Server retrieval is specified in `SERVER_RETRIEVAL_PLAN.md`.

## 18. Development Rules

- Contracts before integrations.
- Deterministic local asset sources before any remote asset source.
- Registries over conditionals.
- Profiles and manifests over hardcoded defaults.
- AG-UI standard events over custom transport.
- Validated Playcraft `Custom` envelopes only.
- Trusted React components only.
- No arbitrary generated play-surface code.
- Import-light core.
- Replay is product behavior, not debug logging.
- All public objects stamp `schemaVersion: "playcraft.v1"`. No v1.1 / v2 reservations in the public contracts.
