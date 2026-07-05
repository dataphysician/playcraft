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
