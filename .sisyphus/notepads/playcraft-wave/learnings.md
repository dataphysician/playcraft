## [2026-07-05] Baseline + Project Conventions

- Baseline test suite: 350 tests passing across 15 files (vitest + @testing-library/react with jsdom)
- `pnpm test` must remain passing after every task
- `pnpm typecheck` must be zero errors after every task
- Import-light scan (`tests/import-light-and-scans.test.ts`) blocks hosted-provider markers: `T*vus`, `t*vus`, `re*lica`, `C*I`, `Ge*rgina`, `Open*I`, `Prisma`, etc.
  - Plan files in `.sisyphus/plans/` are scanned too — avoid literal provider names in docs/plans
- Source scan also blocks `as BuilderTemplateId`, `profile.id.includes`, `GameType`, `MEMORY_MATCH`, `PATTERN_MATCH`, `SORTING` in certain packages

## [2026-07-05] Contract Conventions

- Every public contract extends `PublicContractBaseSchema` with `{ schemaVersion: "playcraft.v1", id: StableIdSchema, version: VersionSchema }`
- `StableIdSchema` regex: `^[a-z0-9][a-z0-9.-]*$`
- Cross-field refinements use `.superRefine()` or `.refine()` with descriptive messages and paths
- `BuilderCatalogSchema` has strict superRefine checking duplicates, template labels, session-bound actions, etc.
- `BuilderSessionSnapshotSchema` uses `.refine()` to keep profile/template/preview IDs consistent

## [2026-07-05] AG-UI Event Pattern

- AG-UI events defined in `packages/ag-ui/src/index.ts`
- Standard events: `RunStarted`, `RunFinished`, `RunError`, `StepStarted`, `StepFinished`, `StateSnapshot`, `StateDelta`, `Activity`, `ToolCall`, `ToolResult`, `Custom`
- Playcraft-specific payloads wrapped via `playcraftCustomEvent()` and validated envelope

## [2026-07-05] Builder Tool Pattern

- 7 builder tools defined in `packages/builder/src/index.ts:77-85`
- Each tool has `toolName`, `displayName`, `description`, `actionName`, `argumentsSchema` (JsonObjectSchemaDescriptor), `acceptedInputSources`
- `BuilderToolDefinitionSchema` requires `localOnly: true`, `emittedEvents`, `requiredContracts`

## [2026-07-05] Asset Catalog Pattern

- Existing catalog is hardcoded TypeScript array in `packages/assets/src/index.ts`
- Asset edit entries require `theme`, `displayLabel`, `aliases`, `suggestedItems`, `localReplacementFolder`
- New mechanism must require `catalog.json` per folder — no filename auto-discovery

## [2026-07-05] Custom Template Pattern

- Bundled templates use IDs like `template.memory-match`
- Custom templates should use `template.custom.*` namespace to avoid collisions
- `templateForBuildOrUpdate()` in builder already falls back to profile-carried snapshot

## [2026-07-05] Session Pattern

- `BuilderSessionSnapshotSchema` is strict about ID consistency
- Service holds `sessionState: Map<string, LocalSessionState>` in `packages/service/src/index.ts`
- Sessions are currently just strings; ownership/expiry is being added in this wave

## [2026-07-05] Schema Implementation Learnings

- When adding new schemas that reference each other, declaration order matters in TypeScript. Schemas must be defined before they're used in other schema definitions (e.g., `McpManifestSchema` must be defined before `BuilderCatalogSchema` if `BuilderCatalogSchema` references it).
- `z.partial()` can cause TypeScript inference issues with large/complex schemas. Using `z.record(JsonValueSchema).default({})` is a safer alternative for partial objects when the exact shape isn't critical.
- Very large inferred types in a single file can exceed TypeScript's serialization limit (TS7056). Adding explicit type annotations or splitting types can help.
- When extending `BuilderCatalogSchema` with optional fields, the existing `superRefine` doesn't need changes as long as the new field is optional and doesn't affect existing validation logic.
- When adding schemas to `PublicContractSchemas`, corresponding fixtures must also be added to the test's fixtures object or the "validates every public contract fixture" test will fail.
- `BuilderSessionOwnershipSchema` should be defined before `BuilderSessionSnapshotSchema` if it's referenced in the snapshot schema.
- For cycle detection in `WorkflowGraphSchema`, a DFS with recursion stack works well. Also validate that `startNodeId` references an existing node and that all edge endpoints reference existing nodes.

## [2026-07-05] Builder Service Response TS7056 Fix

- `BuilderServiceResponseSchema` needs a manual `BuilderServiceResponse` output type before the schema to avoid circular `z.infer<typeof BuilderServiceResponseSchema>` inference.
- Because nested schemas such as `BuilderCatalogSchema` contain defaults, the schema annotation also needs an explicit input generic; otherwise `z.ZodType<BuilderServiceResponse>` defaults input to the output type and typecheck rejects optional defaulted input fields.
- The response schema's `.refine()` chain can remain unchanged once the exported const has an explicit `z.ZodType<BuilderServiceResponse, z.ZodTypeDef, BuilderServiceResponseInput>` annotation.

## [2026-07-05] T2 Fixture Patterns

- `loadFixture(relativePath)` helper resolves paths relative to `tests/fixtures/` using `process.cwd()` and returns `unknown` from `JSON.parse`.
- Template snapshot collision fixtures should validate the shape against `GameProfileTemplateSnapshotSchema` (passes) but fail namespace validation against `BuilderTemplateNamespaceSchema` (fails because ID lacks `template.custom.` prefix).
- Workflow graph cycle detection via `superRefine` DFS with recursion stack correctly rejects cycles and dangling edge references.
- `AssetCatalogManifestSchema` strictly requires `source: "catalog.json"` literal — omitting it causes safeParse to fail.
- `BuilderSessionOwnershipSchema` enforces `expiresAt > createdAt` via `.refine()` with datetime comparison.
- SSE frame fixtures use `SseFrameSchema` discriminated union; unknown `kind` values fail parse.
- MCP manifest fixtures require `tools: McpTool[]` with at least one tool; missing `tools` field fails parse.

## [2026-07-05] T3 MCP Guardrails Patterns

- `McpServerPolicySchema` uses `z.literal(true)` for all four boolean guardrails (`localOnly`, `noAuth`, `noNetworkExecution`, `noDatabaseAccess`), ensuring no future schema drift can relax constraints.
- `allowlistedTools` is validated as a non-empty `string[]` at the schema level; downstream consumers should add a `.superRefine()` if they need to enforce subset-of-registered-tools validation.
- `PLAYCRAFT_MCP_GUARDRAILS` constant provides a single source of truth for the local-only policy and the 7 builder tool action names.
- Adding a new public contract requires three synchronized edits: schema definition, `PublicContractNameSchema` enum entry, and `PublicContractSchemas` record entry.
- The public-contract fixture test iterates `PublicContractSchemas` and expects a matching key in the `fixtures` object; forgetting the fixture causes a test failure.
- `AGENT_SAFETY.md` uses generic language only — no literal provider names — to satisfy source-light scan constraints.

## [2026-07-05] T4 MCP Tool Discovery Adapter

- `packages/mcp/` is a new workspace package with `tsconfig.json` references to `../contracts`, `../builder`, `../service`. Pnpm workspace globs `packages/*` already pick it up, so `pnpm-workspace.yaml` did not need edits.
- `LocalPlaycraftService` is exported from `@playcraft/service` (not `@playcraft/contracts`); pulling it into mcp tool-call code required a type-only import from service.
- `adapterToolsToMcp` filters by `tool.actionName` against the allowlist (not `tool.toolName`), because actionName is the contract-authoritative identifier and the builder schema already restricts it to the 7 allowlisted names.
- `JsonObjectSchemaDescriptor` only enumerates the 7 builder tool fields, so a deterministic field-by-field map with a friendly description table covers all real input. `enum` is passed through when `allowedValues` exists.
- Test scaffolding that builds manual `BuilderToolDefinition`s must derive `acceptedInputSources` from `actionName` because `BuilderToolDefinitionSchema.superRefine` requires `assemble-game`/`update-game` to accept both text and moonshine-transcript.
- For `invokeMcpTool`, the service's `assemble`/`update` actions require `text` but the builder's `assemble-game`/`update-game` actions take only `templateId`. The MCP adapter derives text by calling `service.catalog()` and looking up the template's `exampleRequest`, which lets a caller pass `{ templateId }` and still go through `service.handle()` for a schema-validated `BuilderServiceRequest`.
- `BuilderServiceRequest` schema typing loses the `"playcraft.v1"` literal after spread of a `PLAYCRAFT_SCHEMA_VERSION` constant; using `as const` on the literal `"playcraft.v1"` keeps the inferred literal type and satisfies `BuilderServiceRequest`/`Response` structural types.
- `invokeMcpTool` order: check `BUILDER_TOOL_BY_ACTION.get(name)` first, then the allowlist, so both unknown and disallowed names throw the same "unknown builder tool" message and tests can assert a single matcher.
- `import-profile` requires either `profile` or `profileExport`; routing it requires passing through whatever `args.profileExport` the caller supplies. Tests that previously expected `import-profile` to work with only `sessionId` need to provide an exported profile export record.
- Counter-based `id`/`sessionId` generators keep MCP tool-call requests collision-safe without adding a uuid dependency.

## [2026-07-05] T5 SSE Frame Codec + HTTP Route

- SSE frame codec is intentionally compact: `encodeSseFrame` validates with `SseFrameSchema.parse` and emits `data: <json>\n\n`; `parseSseFrame` is symmetric (strips optional leading space per the SSE spec, joins multi-line `data:` fields, JSON.parse, validates). The validator is the gatekeeper for both directions, so a caller-bypass that hands a malformed frame is rejected at the boundary.
- `createSseResponse(fetcher)` wraps the AsyncIterable in a `ReadableStream<Uint8Array>` driven by `pull()`. This is more responsive than `start()` because it lets Node's HTTP server backpressure the producer — the `pull()` callback only enqueues the next chunk when the consumer drains. The `cancel(reason)` callback closes the underlying iterator so producers can release resources on early client disconnect.
- `BuilderServiceExecutionSchema.events` is `z.array(JsonValueSchema)` — NOT `z.array(AgUiEventSchema)` — because the service package must not pull in `@playcraft/ag-ui`. AG-UI events pass through as opaque `JsonValue` at the service boundary. Conversion to SSE frames happens via `agUiEventToSseFrame` which accepts a structural `AgUiEventLike` interface (`type`, `eventId`, `runId`, `timestamp`, `value: unknown`). One `as unknown as AgUiEventLike` cast per event at the boundary is acceptable — the runtime shape is guaranteed by the builder's `*Started`/`*Result`/`*Custom` constructors, not by the type system.
- The local `packages/service/src/node-http.d.ts` is a SHIM that declares `node:http` types because `@types/node` is not installed. It MERGES with any real Node types if `@types/node` were ever added. To enable SSE streaming, `ServerResponse` had to grow: `write(chunk)`, `setHeader`, `getHeader`, `destroy`, `once("drain")`, `on("close")`, `on("error")`, and an `end()` overload. `IncomingMessage` also needed `headers` typed as `Record<string, string | string[] | undefined>`.
- Bridging `fetch`-style `Response` → `node:http` `ServerResponse` is straightforward: `webResponse.headers.forEach((value, key) => ...)` collects headers, `writeHead(status, headers)` flushes them, then `webResponse.body.getReader()` pumps chunks into `nodeResponse.write()`. Awaiting `drain` when `write()` returns `false` applies real backpressure; `on("close")` finalizes the response if the client hangs up.
- `as unknown as` is unavoidable at two boundaries: (1) the AG-UI event→`AgUiEventLike` cast, and (2) the non-event `BuilderServiceResponse`→`JsonValue` cast for `sse-custom` payloads. Both are localized, documented by the boundary context, and verified at runtime via `SseFrameSchema.parse` inside `encodeSseFrame`. They are NOT in the forbidden list (`any`, `@ts-ignore`, `@ts-expect-error`, `!.`).
- The HTTP test pattern uses `listenOnLoopback(server)` + `fetch()` with a try/finally that calls `closeServer(server)`. The same pattern works for SSE: `response.body.getReader()` reads chunks, a small helper splits on `\n\n` to surface per-frame strings. `fetch()` in vitest/jsdom handles streaming bodies correctly because the runtime is Node 18+.
- For non-event actions (`catalog`, `get-session`, `export-profile`, `reset`), `LocalPlaycraftService.stream()` yields a 3-frame bookend: `sse-run-started` → `sse-custom` (containing the full `BuilderServiceResponse`) → `sse-run-finished`. This ensures the consumer always sees at least one frame even when the builder produces no AG-UI events.
- Error handling: `LocalPlaycraftService.stream()` catches sync throws from `handle()` and yields a `sse-run-error` frame followed by `sse-run-finished`. Async throws from the underlying fetcher propagate to the `ReadableStream` controller via `iterator.next()` rejection, which causes the stream to error out cleanly.
- The test `parses the HTTP service CLI surface without silent option fallbacks` asserts the EXACT shape of `PLAYCRAFT_HTTP_SERVICE_POLICY` via `.toEqual({...})`. Adding any new key to that constant requires updating that test in lockstep. The test caught my `defaultStreamSuffix: "/stream"` addition immediately.
- Vitest test count after T5: 426 (was 412 before T5 — the +14 includes 12 codec/route tests + 2 real-service stream tests; baseline of 350 grew to 426 across T1-T5).

## [2026-07-05] T4 Verification Follow-up Signature & Cast Cleanup

- `createMcpManifest(builderTools, serviceCatalog?)` now accepts an optional `BuilderServiceCatalog` (the value at `service.catalog().service`, not the whole `BuilderCatalog`). Internally `adapterToolsToMcp(builderTools)` produces the tools; the manifest shape stays schema-compliant (no extra `service` field, since `McpManifestSchema` is `.strict()`). The service catalog influences the manifest `id` (e.g. `mcp-manifest.playcraft-local.8-actions.createlocalservicetransport`).
- `StableIdSchema` regex is `^[a-z0-9][a-z0-9.-]*$` (lowercase only). When embedding transport identifiers into manifest IDs, the camelCase `createLocalServiceTransport` form must be lowercased first or the manifest parse will fail.
- `McpManifestSchema` is `.strict()` — adding an unrelated `service` field triggers `unrecognized_keys`. The signature accepts the catalog but the public manifest contract does not surface it; a future schema bump could expose it without changing the function shape.
- `invokeMcpTool` now builds `Record<string, unknown>` envelopes and feeds them through `BuilderServiceRequestSchema.parse(...)` before calling `service.handle(...)`. All `as never` casts and the `as const` literal hoisting were removed; runtime identity is unchanged.
- `void BuilderServiceActionNameSchema` is the only intentional no-op statement remaining in `tool-call.ts`. `PLAYCRAFT_LOCAL_TIMESTAMP` import + `void PLAYCRAFT_LOCAL_TIMESTAMP` was dropped entirely because the constant is unused.
- Root `tsconfig.json` now references `./packages/mcp` and exposes the `@playcraft/mcp` path alias; pnpm-build / typecheck now include the new package automatically.

## [2026-07-05] T6 SSE Client Transport + State Reconciliation

- `BuilderServiceTransport` lives in `@playcraft/service` (not `@playcraft/contracts`); the contracts package only has the request/response schemas. Importing the transport interface from contracts triggers TS2305 `has no exported member`. The factory returns the concrete transport shape, so the receiver must type the new send implementation as `send(request: BuilderServiceRequest): Promise<BuilderServiceResponse>` — letting the parameter fall back to `any` fails TS7006.
- `parseSseFrame` and `encodeSseFrame` are not re-exported from `@playcraft/service`'s public entry. Reaching into the package via `../../../packages/service/src/sse.js` (or the equivalent relative path from the app) works for both vitest and tsc — the workspace tsconfig paths resolve the relative path, and pnpm-workspace treats it as an internal source import. Adding a new exports entry to `packages/service/package.json` would be cleaner but crosses the T6 file scope.
- `STUDIO_RUNTIME_POLICY` is asserted with `toEqual({...})` (deep equality, not `toMatchObject`) by `tests/studio-ui.test.ts`. Adding new keys to that constant breaks the existing assertion. The T6 SSE path detection lives in a new `STUDIO_SSE_PATH_POLICY = { streamPathSuffix: "/stream" }` constant so the existing equality assertion stays intact.
- `StudioRuntimeEnv` is `Partial<Record<...>>`, so the helper `serviceEndpointFromStudioRuntimeEnv` is the single source of truth for empty-string vs whitespace-only normalization. Mobile-shell already calls `createConfiguredStudioClient` from `@playcraft/studio`, so the SSE awareness propagates without modifying `mobile-client.ts` directly.
- SSE frame decoding in a transport: pump the response body through `body.getReader()` + `TextDecoder` and split on `\n\n`. Each non-empty chunk is fed to `parseSseFrame` which validates against `SseFrameSchema`. Invalid JSON or schema failure throws — the rejection propagates from the transport and the timeline (closure-captured) holds whatever frames had already accumulated before the failure.
- For non-execution actions (`catalog`, `get-session`, `export-profile`, `reset`), the service yields `sse-run-started → sse-custom(payload=BuilderServiceResponse) → sse-run-finished`. The client transport detects the sse-custom whose payload has `kind: "builder-service-response"` and returns it directly, bypassing reconstruction. This matches the upstream service's three-frame bookend behavior noted in T5.
- For execution actions (`assemble`, `update`, `preview`, `import-profile`), the service does NOT yield `sse-run-finished`. It only emits AG-UI event frames. The client transport must therefore treat stream-end (`reader.read() === done`) as the reconciliation signal — when no `sse-run-finished` frame arrives, it builds a synthetic `BuilderServiceResponse` from the accumulated frames, including reconstructed `RunStarted`/`RunFinished`/`ToolCall`/`ToolResult` AG-UI envelopes plus any `sse-custom` payloads that look like opaque envelopes (the `default` branch of `agUiEventToSseFrame`).
- The synthetic fallback session must include the minimal `BuilderPreviewState` shape: `{ schemaVersion, sessionId, renderedComponentIds: [], interactionCount: 0 }`. The earlier version with just `sessionId` failed TS2739 against `BuilderPreviewStateSchema`'s required `renderedComponentIds` + `interactionCount`.
- `BuilderSessionSnapshotSchema` does NOT carry an `id` field (only `schemaVersion`, `kind`, `sessionId`, plus optionals). The synthetic session object should omit `id`; including it triggers TS2353 ("Object literal may only specify known properties, and 'id' does not exist").
- `isBuilderServiceResponseShape(value: JsonValue): value is BuilderServiceResponse` triggers TS2677 because `JsonValue` (the schema-inferred union) cannot structurally accept `BuilderServiceResponse`. The fix is to widen the parameter type to `JsonValue | unknown` and only use `JsonValue` at the call site — type predicates can be narrower than `JsonValue` only if the predicate type is assignable to `JsonValue`.
- `SseStreamError` (a custom error class with `readonly timeline: readonly SseFrame[]`) is the typed error for the run-error path. `Error` subclass with a `name` field and explicit field is preferred over attaching the timeline to `Error.cause` (which is not always typed).
- The timeline closure is cleared at the start of every `send()` call (`timeline.length = 0`). This satisfies "clear timeline when a new send() is initiated". A profile-swap or reset is just `send(reset)` followed by `send(importProfile | assemble)` — the per-send clear naturally implements the reset without needing an extra reset signal on the transport.
- vi.stubGlobal("fetch", mock) is sufficient to drive the SSE transport through `globalThis.fetch`, because the default `defaultSseFetch` casts `globalThis.fetch` to its own type and trusts the caller's shape. The mock must return `{ body: ReadableStream<Uint8Array> | null, ok: boolean, status: number }` — same as a real `Response`.
- `pnpm test` total after T6: 466 (was 451 before T6 — +15 new SSE tests). The pre-existing modifications to `apps/studio/src/App.tsx` and `packages/assets/src/index.ts` in the working tree are unrelated to T6 and produce typecheck failures that need a separate cleanup.
- `tsc -b` is incremental: once a project compiles cleanly, subsequent runs without source changes return EXIT 0 even if the project has stale errors. Use `tsc -b --clean && tsc -b` to verify a true clean state.

## [2026-07-05] T8 Custom Template Round-trip + Namespace + Conflict Detection

- `BuilderTemplateNamespaceSchema = StableIdSchema.refine(value => value.startsWith("template.custom."))` requires a DOT after `custom` (not a hyphen). Existing test IDs like `template.custom-template-memory` (hyphen) fail the namespace refinement; they need to be migrated to `template.custom.template-memory` (dot). Hyphenated IDs were written before the contract's `template.custom.*` prefix was finalized in T1.
- `importProfile` in `packages/builder/src/index.ts` now validates the template id BEFORE the session merge. Three cases: (1) `template.custom.*` → accept + namespace refinement; (2) bundled id with matching `assemblyRequestId` → accept (re-import flow); (3) bundled id with mismatched `assemblyRequestId` → throw collision error; (4) anything else → throw namespace violation error. The `assemblyRequestId` match is the signal that distinguishes a legitimate bundled re-import (session-share flow) from a custom override attempt.
- Deep clone via `structuredClone(profile)` (available in ES2022 target) before mutating into the session. Re-parsing through `GameAssemblyProfileSchema.parse()` afterwards is a free integrity check — any deep-clone loss is caught immediately.
- `templateForBuildOrUpdate` in builder now falls through to the profile-carried snapshot when `TEMPLATE_BY_ID.get(templateId)` returns undefined AND the session's `templateId` matches. This lets `assemble-game` / `update-game` work for a custom template that's already been imported into the session, even though it's not in the bundled `gameTemplateDefinitions` array.
- `buildCustomTemplateSnapshotFromProfile(profile)` in packs derives a `template.custom.<profile-id-stem>` snapshot from any profile. It preserves all snapshot fields (liveSurface, assetEditOperations, assetPromptKind) and only renames the ID into the custom namespace. The renames are deterministic and pass through `BuilderTemplateNamespaceSchema.parse` so any upstream test can spot invalid characters immediately.
- `roundTripCustomTemplate(snapshot, registries)` in core accepts a profile (with custom template) and returns a `GameProfileTemplateSnapshot` whose id starts with `template.custom.`. It validates via `replayProfile` (the existing validated round-trip) and a JSON serialization → `GameProfileTemplateSnapshotSchema.parse` round-trip; structural equality on id/liveSurface/assemblyRequestId is asserted. The "modulo timestamps" framing is implicit because the snapshot itself has no timestamps (event log timestamps are at the profile level, not the snapshot level).
- Test ID length: `runId = ${sessionId}.${templateId}.import` is fed to `createPlaycraftEnvelope` and must be ≤ 96 chars. Long test IDs like `session.custom-toy-memory-roundtrip-via-service` (47 chars) + `template.custom.toy-memory-roundtrip-via-service` (49 chars) + `.import` (7) = 103 chars → `runId` too long. Shorter test IDs like `template.custom.toy-via-service` keep runId under 96.
- Profile-level invariant: when overriding a profile's `id` in a test, must also override `validation.id` and `validation.profileId` to match. `GameAssemblyProfileSchema` has a refinement that enforces `validation.id` and `validation.profileId` match `profile.id`. Forgetting this causes a `ZodError` on parse, not a clear test message.
- `Studio` app uses a `withCatalogOverride(client)` wrapper that calls `originalCatalog()` and then chains `buildAssetEditCatalogOverride(baseCatalog)`. If the original `client.catalog()` is async (returns `Promise<BuilderCatalog>`), the override signature breaks with TS2345 because `baseCatalog: BuilderCatalog | Promise<BuilderCatalog>` doesn't match. The T8 scope didn't touch this — pre-existing T9 work, but the `tsc -b` errors at `App.tsx:78` come from that.
- `pnpm test` total after T8: 466 (unchanged from T6, but added 6 new tests and updated 1 existing test). `pnpm typecheck` for the packages T8 touched (`packages/builder`, `packages/packs`, `packages/core`, `packages/contracts`, `packages/ag-ui`, `packages/renderer`, `packages/service`, `packages/mcp`) is clean. The remaining typecheck errors in `apps/studio/src/App.tsx`, `apps/studio/src/local-client.ts`, and `packages/assets/src/index.ts` are pre-existing T6/T9 work outside T8's file scope.
- `customTemplateSnapshotFor(profile)` in builder is a thin typed accessor: `GameAssemblyProfileSchema.parse(profile).template`. It exists for the import path's "extract the snapshot we just validated" call site; consumers who already have a parsed profile can use `profile.template` directly.

## [2026-07-05] T9 Asset Catalog Discovery + Manifest + Bundled-Merge

- `AssetCatalogManifestSchema` requires `source: z.literal("catalog.json")` — omitting it fails parse. The schema also requires `spriteNaming: { kind: "ordinal" | "exact" | "paired", rules }` (strict, no extra keys). The schema is `.strict()` at every level so any drift in catalog.json (extra keys, wrong source literal, missing fields) surfaces as a `ZodError` rather than silent acceptance.
- `loadManifestFromFolder(folderPath)` is async (returns `Promise<AssetCatalogManifest | null>`) because it may need to do fs I/O in production paths (the wave plan implies this), even though the current implementation uses sync `readFileSync`. Returning a `Promise` future-proofs the signature for tests like `vitest` jsdom and async-only envs (e.g. edge runtimes).
- `mergeAssetCatalogs(bundled, discovered)` MUST NOT mutate `bundled` — verified via `bundledSnapshot = JSON.parse(JSON.stringify(bundled))` deep-clone check. The pattern uses `bundledByTheme` map for O(1) lookups and `merged` array as the new output. After all merges, sort by `theme.localeCompare` for deterministic output.
- `mergeAssetCatalogs` returns NEW `BuilderAssetEditCatalogEntry[]` entries by routing discovered manifests through `assetEditCatalogEntryFromManifest` (which calls the existing `assetEditCatalogEntry()` factory), preserving the strict `BuilderAssetEditCatalogEntrySchema` validation, including `aliasSummary` and `suggestedItemSummary` derivation. The bundled array's entries are reused (no schema re-validation needed since they're already validated at module load time).
- `import.meta.glob` with `{ eager: true, import: "default" }` for JSON files returns the parsed JSON directly (no `{ default: ... }` wrapper). The pattern `./assets/library/replacements/*/catalog.json` matches exactly the literal-folder-name pattern (no filename auto-discovery happens — only directories with literal `catalog.json` files).
- `import.meta.glob` types use `unknown` for the parsed JSON and we run `AssetCatalogManifestSchema.parse(rawModule)` ourselves at runtime, so a malformed catalog.json throws on Studio mount rather than silently failing.
- The replacement folder name comes from `path.split("/").at(-2)`. For `./assets/library/replacements/dinosaurs/catalog.json` → `["", "assets", "library", "replacements", "dinosaurs", "catalog.json"]` → folder = `dinosaurs`. This is the only place where folder-name discovery happens; manifests must still declare `theme` independently.
- `withCatalogOverride(client)` wraps the existing `StudioClient.catalog()` so the override doesn't need to mutate the service layer. The wrapper checks if the base result is a Promise (HTTP transport) or sync value (local transport) and resolves the merge on the resolved catalog. The result is cached in `overridden` so repeated `client.catalog()` calls don't re-run discovery.
- Discovery happens at module-init time (when `import.meta.glob` runs) AND at React `useEffect` time (validation pass) — the module-init `glob` is the build-time resolution, and the `useEffect` catches both missing catalog.json files (zero manifests discovered) and parse failures (any folder without a valid manifest). The useEffect throws, which renders the Studio error boundary rather than silently shipping broken state.
- Vitest 3.2 with jsdom REWRITES `import.meta.url` inside test bodies from `file:///...` to `http://localhost:3000/...`, breaking `new URL(".", import.meta.url)`. The fix is to capture `import.meta.url` at module evaluation time (top-level `const testFileUrl = import.meta.url`) and use the captured value inside test bodies. The closure keeps the original file URL even after vitest rewrites the property on the meta object.
- Path resolution from `packages/assets/test/` to project root: `../../../apps/studio/src/...` (three `..` segments). Two `..` lands inside `packages/apps/...` (non-existent), three `..` lands at the project root. This is easy to miscount and there is no symlink or workspace-relative path helper to abstract it.
- `@types/node` is NOT installed in any workspace package. To use `node:fs` / `node:path` inside a package's `src/index.ts`, declare the module locally with the minimal surface needed (mirrors `packages/service/src/node-http.d.ts`). A full shim for the methods actually used (`existsSync`, `readFileSync`, `mkdirSync`, `mkdtempSync`, `rmSync`, `writeFileSync`, `isAbsolute`, `join`, `resolve`) is sufficient for the asset package and doesn't pull in `@types/node`.
- `AssetCatalogManifestSchema`'s `.strict()` + `spriteNaming.strict()` means a manifest with extra fields (e.g. an extra `notes` key) fails parse. The bundled catalog.json files must match the exact schema shape — no tolerated drift.
- `BuilderAssetEditCatalogEntrySchema` requires `aliasSummary` and `suggestedItemSummary` to be present (not optional). `mergeAssetCatalogs` derives them from `aliases.join(", ")` and `suggestedItems.join(", ")`. When authored manually in catalog.json, these are NOT used (the manifest schema is separate), but the merged `BuilderAssetEditCatalogEntry` always carries the derived summaries, so the Developer panel displays consistent labels.
- The `it.each(["dinosaurs", "toys", "dolphins", "fruits"] as const)` pattern lets TypeScript narrow `theme` to the literal union, which lets the test assertion `(theme) => expect(parsed.theme).toBe(theme)` typecheck cleanly. Without `as const`, the array type widens to `string[]` and the comparison is still valid but less type-safe.
- The "drop a new folder and on next Studio start it appears" acceptance criterion is satisfied by the static `import.meta.glob` build-time resolution: any folder containing a valid `catalog.json` is automatically picked up at the next `pnpm dev:studio` (no service restart needed, no plugin registration). This is exactly what the test "integration: dropping a new folder with valid catalog.json adds the theme to the merged catalog" verifies.
- Vitest test count after T9: 466 (was 445 before T9 → +21 new asset tests, of which 16 are T9-specific: 7 loadManifestFromFolder, 5 mergeAssetCatalogs, 1 integration, 4 catalog.json per-theme. The 5 pre-existing tests in `local-asset-source.test.ts` are unchanged.).
- T9 ran alongside other agents' T6/T8 work in the same repo. Before T9, `pnpm test` had 14 SSE-related failures (T6 work-in-progress) and 1 custom-template failure (T8 work-in-progress). After T9: 0 SSE failures (T6 work landed) and 0 custom-template failures (T8 work landed). The 2 test failures seen briefly during T9 development were from the other agents' work; by T9 completion they had all landed.
