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
