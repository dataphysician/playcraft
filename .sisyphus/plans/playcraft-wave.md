# Playcraft Wave: Agent Stack + Templates + Assets + Polish

## TL;DR

> **Quick Summary**: Extend Playcraft into a reusable "GDevelop for agents" surface by adding MCP-style discovery, HTTP SSE streaming, tool composition, session ownership, custom template support, explicit asset catalogs, and Studio polish (tactile toddler interactions + empty/edge states). Excludes Server-Ready Retrieval.
>
> **Deliverables**:
> - MCP-compatible tool discovery package (`@playcraft/mcp`) over existing builder/service tools
> - HTTP SSE streaming layer (AG-UI events over wire)
> - SSE client transport + state reconciliation in Studio + Mobile
> - Tool composition/workflow graph executor
> - Custom template round-trip + `template.custom.*` namespace + conflict detection
> - Asset `catalog.json` manifest schema + folder discovery + bundled-merge
> - Session ownership + expiry types and enforcement
> - Studio Developer panel + Live App streamed updates
> - Studio tactile toddler interactions (tap targets, audio cues, error forgiveness)
> - Studio empty/edge states (loading/error/empty)
> - Accessibility (keyboard, screen reader, contrast, reduced-motion)
> - Custom template assembly recipes + tool composition examples
>
> **Estimated Effort**: Large (24 implementation tasks + 4 final reviews)
> **Parallel Execution**: YES - 4 waves, ~5-7 tasks per wave
> **Critical Path**: Wave 1 (Contracts) → Wave 2 (MCP/SSE/Workflow/Assets/Session) → Wave 3 (Studio/Mobile UX) → Wave 4 (Integration) → Wave FINAL

---

## Context

### Original Request

Build out a wave of refinements covering the 5 planned outcomes in the status doc:
1. Agent Assembly UX (full agent stack: MCP + SSE + workflow + session ownership)
2. Template Extensibility (custom template snapshots beyond MVP)
3. Asset Library Growth (explicit catalogs for sprite drops)
4. App Polish (tactile toddler interactions + empty/edge states)
5. Server-Ready Retrieval (OUT — planned, not real provider)

### Interview Summary

**Key Decisions**:
- **Scope**: All 4 refinement outcomes IN; Server-Ready Retrieval OUT.
- **Agent UX**: Full agent stack (MCP discovery + HTTP SSE + tool composition + session ownership).
- **App Polish**: Both tactile toddler interactions AND empty/edge states.
- **Test Strategy**: TDD (RED-GREEN-REFACTOR per task, growing the 350-test suite).

**Research Findings** (from 3 parallel explore agents):
- 8 packages: `contracts`, `core`, `packs`, `assets`, `builder`, `service`, `ag-ui`, `renderer`; 2 apps: `studio`, `mobile-shell`
- 7 builder tools, 8 service actions, 24 bundled templates, 4 bundled asset themes
- 350 tests passing in 15 files (vitest + @testing-library/react with jsdom)
- Existing AG-UI events cover run/stream/tool lifecycle; service transport is request/response only (no HTTP streaming)
- No MCP/OpenAPI/JSON-RPC surface exists; AG-UI is frontend-oriented, not agent-ORC (OpenAI/Anthropic) friendly
- Asset catalog is hardcoded in code; no folder-level discovery mechanism
- Custom template snapshot tests: only 1 (`studio-asset-library.test.tsx:675`)

### Metis Review

**Identified Gaps (addressed)**:
1. **Contract-first foundation missing** → Added Wave 1 contract-schema task before any package implementation. All new invariants (MCP, SSE, workflow, session ownership, asset catalog manifest, custom template namespace) get schemas in `@playcraft/contracts` first.
2. **Client-side streaming/reconciliation missing** → Added Wave 2 task `SSE client transport + state reconciliation` (Studio + Mobile).
3. **Local-only guardrails missing** → Added Wave 1 task to explicitly constrain MCP to local discovery + allowlisted tool calls + no auth/db/network.
4. **Fixtures before implementation** → Asset catalog fixtures and SSE frame fixtures created in Wave 1 before Wave 2 implementation.
5. **TDD granularity** → T1/T2/T8/T15 split into smaller subtasks to keep RED-GREEN-REFACTOR tight.
6. **Sequencing** → SSE wire format (T7) before SSE server (T5); asset fixtures before catalog discovery (T9); session ownership before MCP endpoints (T10).

---

## Work Objectives

### Core Objective

Elevate Playcraft from a functional demo into a reusable, agent-friendly assembly surface. Concrete user outcome: an OpenAI/Anthropic agent can connect, discover tools, run workflows, observe streamed progress, and produce validated game profiles — without writing custom integration code — while toddlers get a more forgiving, polished Studio experience.

### Concrete Deliverables

| # | File(s) | Deliverable |
|---|---------|-------------|
| 1 | `packages/contracts/src/index.ts` (+ tests) | MCP manifest, SSE frame, workflow graph, session ownership, asset catalog manifest, custom template namespace schemas |
| 2 | `packages/mcp/src/**` (new) | MCP tool discovery adapter over builder/service tools |
| 3 | `packages/service/src/http-server.ts` | SSE endpoint, MCP endpoints (GET /catalog, POST /tools/list, POST /tools/call) |
| 4 | `apps/studio/src/local-client.ts` + `apps/mobile-shell/src/mobile-client.ts` | SSE client transport + state reconciliation |
| 5 | `packages/service/src/**` (workflow) | Tool composition graph executor |
| 6 | `packages/builder/src/**` + `packages/packs/src/**` | Custom template round-trip + `template.custom.*` namespace + conflict detection + recipes |
| 7 | `packages/assets/src/**` + `apps/studio/src/assets/library/replacements/*/catalog.json` | Asset catalog manifest schema + folder discovery + bundled-merge |
| 8 | `packages/contracts/src/index.ts` + `packages/service/src/**` | Session ownership types + expiry enforcement |
| 9 | `apps/studio/src/studio-app.tsx` | Developer panel: catalog browser, run inspector, workflow view |
| 10 | `apps/studio/src/live-game.tsx` | Live App: streamed state updates, profile-swap state reset |
| 11 | `apps/studio/src/live-game.tsx` | Tactile interactions: tap targets, audio cues, error forgiveness |
| 12 | `apps/studio/src/studio-app.tsx` + new state components | Empty/edge states: loading, error, empty |
| 13 | All Studio/Mobile components | Accessibility: keyboard, labels, contrast, focus, reduced-motion |
| 14 | `examples/profiles/` + `examples/workflows/` | Custom template fixtures + workflow examples |
| 15 | `apps/studio/src/assets/library/replacements/{theme}/catalog.json` (×4 themes) | Asset catalog manifests |

### Definition of Done

- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm test` passes (current 350 + ~200 new = ~550 tests)
- [ ] Studio Developer panel shows MCP catalog + run inspector
- [ ] Studio Live App streams AG-UI events during assembly
- [ ] Mobile shell parity verified for new surfaces
- [ ] OpenAI/Anthropic agent can connect to local HTTP, list tools, call `assemble-game`, observe streamed `toolCall`/`toolResult` events
- [ ] Custom template snapshot round-trips through full assemble → export → import → replay
- [ ] Dropping `catalog.json` into `replacements/<new-theme>/` adds theme to catalog on next Studio start
- [ ] Studio tap targets ≥ 44px; audio cues fire on success/error; failure forgiving (no losing progress on mis-tap)
- [ ] Every loading/error/empty state has explicit visual + a11y text
- [ ] Keyboard navigation reaches every interactive element; screen reader announces state changes
- [ ] Custom template IDs namespace as `template.custom.*` and conflict with bundled is detected

### Must Have

- MCP discovery surface (allowlisted tools, local-only, no auth)
- HTTP SSE streaming (AG-UI events over wire, server → client)
- SSE client reconciliation (Studio + Mobile, profile-swap state reset)
- Tool composition workflow (deterministic command graphs, dependency ordering, conditional)
- Custom template round-trip (assemble → export → import → replay preserves custom ID + live surface)
- Custom template `template.custom.*` namespace + conflict detection
- Asset catalog `catalog.json` manifest schema + folder discovery + bundled-merge
- Session ownership types + expiry enforcement
- Studio Developer panel: catalog browser + run inspector
- Studio Live App: streamed state updates + profile-swap reset
- Tactile toddler interactions: tap targets ≥ 44px, audio cues, error forgiveness
- Empty/edge states: loading, error, empty (visual + a11y text)
- Accessibility: keyboard, labels, contrast, focus order, reduced-motion
- Test coverage: TDD per task, growing suite ~+200 tests

### Must NOT Have (Guardrails)

- NO real remote providers / auth / database / network execution (Server-Ready Retrieval stays OUT)
- NO MCP auth flows, credentials, OAuth, tokens
- NO filename/provider auto-discovery for assets (must require `catalog.json`)
- NO runtime replay/UI checks of profile invariants — all invariants must be in `@playcraft/contracts`
- NO duplicating schema checks across packages
- NO hardcoded asset IDs in new code (use catalog-driven lookup)
- NO marketing-page polish at the expense of toddler usability
- NO bundled-only theme dependencies in new catalog mechanism
- NO removing existing fail-closed validation posture
- NO avatar or conversation abstractions from hosted provider stacks
- NO backcompat/migration logic for old profile shapes
- NO silent repair of malformed profiles
- NO session-bound shortcuts that don't propagate to all surfaces (Studio + Mobile + Builder + Service)
- NO general DAG engine for workflow (keep to deterministic local command graphs over existing service requests)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision

- **Infrastructure exists**: YES (vitest + @testing-library/react with jsdom, 350 tests passing)
- **Automated tests**: TDD (RED-GREEN-REFACTOR per task)
- **Framework**: vitest
- **TDD ordering**: Contracts RED → Fixtures → Package unit RED → Package unit GREEN → Surface integration RED → Surface integration GREEN → Full suite

### QA Policy

Every task MUST include agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Schema/Contract**: `pnpm exec vitest run packages/contracts/test/...`
- **MCP/SSE/Wire**: `pnpm exec vitest run packages/mcp/test/...`, `curl http://127.0.0.1:8787/catalog`, SSE client test
- **API/HTTP**: `curl` with exact status/JSON assertions
- **UI/Studio**: Playwright navigation, click, fill, assert DOM, screenshot
- **CLI**: tmux run + keystroke validation
- **Visual**: screenshot comparison

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Contract Foundation + Guardrails — STRICT SEQUENTIAL):
├── T1. Contract schemas for new surfaces [RED-first]                 [quick]
├── T2. Test fixtures for new contracts                                [quick]
└── T3. Local-only MCP guardrails (no auth/db/network constraint)     [quick]

Wave 2 (Core Implementation — MAX PARALLEL, 7 tasks):
├── T4.  MCP tool discovery adapter (over builder/service tools)       [unspecified-high]
├── T5.  SSE frame codec + HTTP server route                          [unspecified-high]
├── T6.  SSE client transport + state reconciliation (Studio+Mobile)  [unspecified-high]
├── T7.  Tool composition workflow graph schema + executor            [deep]
├── T8.  Custom template round-trip + namespace + conflict detection   [unspecified-high]
├── T9.  Asset catalog manifest schema + folder discovery + merge     [unspecified-high]
└── T10. Session ownership types + expiry enforcement                 [unspecified-high]

Wave 3 (Studio/Mobile UX — MAX PARALLEL, 6 tasks):
├── T11. Studio Developer panel — catalog browser + run inspector     [visual-engineering]
├── T12. Studio Live App — streamed state updates + profile-swap reset [visual-engineering]
├── T13. Studio tactile toddler interactions (tap/audio/forgiveness)  [visual-engineering]
├── T14. Studio empty/edge states (loading/error/empty)                [visual-engineering]
├── T15. Mobile shell parity for new surfaces                          [unspecified-high]
└── T16. Accessibility (keyboard/labels/contrast/focus/reduced-motion) [visual-engineering]

Wave 4 (Integration + Examples — 4 tasks):
├── T17. MCP HTTP endpoints (GET /catalog, POST /tools/list, /tools/call) [unspecified-high]
├── T18. Workflow integration with handleLocalServiceRequestBatch      [deep]
├── T19. Custom template assembly recipes                              [unspecified-high]
└── T20. Tool composition examples + docs                              [writing]

Wave FINAL (4 parallel agent-executed reviews):
├── F1. Plan compliance audit                                          [oracle]
├── F2. Code quality review                                            [unspecified-high]
├── F3. Agent-executed QA (4 sub-surfaces: studio-local, studio-http, mobile, service-streaming) [unspecified-high]
└── F4. Scope fidelity check                                           [deep]

Critical Path: T1 (contracts) → T4-T10 (parallel core) → T11-T16 (parallel UX) → T17-T20 (integration) → F1-F4 → user OK
Parallel Speedup: ~70% vs sequential; max concurrent: 7 (Wave 2 + Wave 3)
```

### Dependency Matrix

- **T1**: none → T4-T10 (all new schemas land here)
- **T2**: T1 → T4-T10 fixtures
- **T3**: T1 → T4, T17 (MCP constraints)
- **T4**: T1, T3 → T17
- **T5**: T1 → T6, T11
- **T6**: T5 → T11, T12, T15
- **T7**: T1 → T18
- **T8**: T1 → T19
- **T9**: T1, T2 → T11 (catalog browser)
- **T10**: T1 → T17
- **T11**: T4, T6, T9 → T15
- **T12**: T6 → T15
- **T13**: none (parallel to T11/T12)
- **T14**: none (parallel to T11/T12)
- **T15**: T11, T12 → T20
- **T16**: T11-T15 (parallel a11y pass)
- **T17**: T4, T10 → F1-F4
- **T18**: T7 → F1-F4
- **T19**: T8 → F1-F4
- **T20**: T7, T8, T17, T18, T19 → F1-F4
- **F1-F4**: T17-T20 → user OK

### Agent Dispatch Summary

- **Wave 1**: T1-T3 → `quick` (3 sequential)
- **Wave 2**: T4-T10 → mix `unspecified-high` + `deep` (7 parallel)
- **Wave 3**: T11-T16 → `visual-engineering` + `unspecified-high` (6 parallel)
- **Wave 4**: T17-T20 → mix `unspecified-high` + `deep` + `writing` (4 parallel)
- **Wave FINAL**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high` ×4 surfaces, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> Every task is TDD: RED (failing test) → GREEN (minimal impl) → REFACTOR.
> Every task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.

---

### Wave 1 — Contract Foundation + Guardrails (STRICT SEQUENTIAL)

- [x] 1. Contract schemas for new surfaces (RED-first)

  **What to do**:
  - Add Zod schemas to `packages/contracts/src/index.ts`:
    - `McpManifestSchema`, `McpToolSchema`, `McpToolArgumentSchema` — MCP-compatible tool discovery (function-call friendly)
    - `SseFrameSchema` — discriminated union for AG-UI event wire format (`RunStarted`, `ToolCall`, `ToolResult`, `Custom`, `RunFinished`, `RunError`)
    - `WorkflowGraphSchema`, `WorkflowNodeSchema`, `WorkflowEdgeSchema` — tool composition graph (deterministic, no loops)
    - `BuilderSessionOwnershipSchema` — `ownerId`, `createdAt`, `expiresAt`, `capabilities`
    - `AssetCatalogManifestSchema` — `{ theme, displayLabel, aliases, suggestedItems, spriteNaming: { kind: "ordinal" | "exact" | "paired", rules } }`
    - `BuilderTemplateNamespaceSchema` — refinement enforcing `template.custom.*` prefix for custom templates
  - Extend `BuilderCatalogSchema` with `mcp?: { manifest, tools }` field
  - Extend `BuilderSessionSnapshotSchema` with `ownership?: BuilderSessionOwnershipSchema` (optional, fail-open for old sessions)
  - All schemas MUST include `schemaVersion`, `id`, `version`, `kind` per existing convention
  - Export TypeScript types alongside schemas
  - Update `schemas.test.ts` with RED tests for each new schema (validation passes for valid inputs, fails for malformed)

  **Must NOT do**:
  - No implementation of MCP server, SSE transport, workflow executor, session enforcement yet
  - No validation logic outside contracts
  - No breaking changes to existing schemas (additive only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Schema additions are mechanical Zod patterns following existing convention
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed for uncommitted contract work

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 1 is strict sequential — all Wave 2+ depend on this)
  - **Parallel Group**: Wave 1 sequential step 1
  - **Blocks**: T4, T5, T6, T7, T8, T9, T10, T17, T18, T19
  - **Blocked By**: None (first task)

  **References**:
  - **Pattern References**:
    - `packages/contracts/src/index.ts:611-790` — `GameAssemblyProfileSchema` pattern for cross-field refinements
    - `packages/contracts/src/index.ts:1310-1497` — `BuilderCatalogSchema` structure to extend
    - `packages/contracts/src/index.ts:1827-1865` — `BuilderSessionSnapshotSchema` to extend
    - `packages/contracts/src/index.ts:1921-2065` — `BuilderServiceRequestSchema` / `ResponseSchema` pair
  - **Test References**:
    - `packages/contracts/test/schemas.test.ts` — existing schema test patterns (Zod parse with valid/invalid inputs)
  - **External References**:
    - MCP spec (llms.txt-style): function-calling shape `{ name, description, parameters: JSONSchema }`
    - SSE spec: `data: <json>\n\n` framing
    - AG-UI events: existing `packages/ag-ui/src/index.ts:18-30`

  **Acceptance Criteria**:
  - [ ] Test file updated: `packages/contracts/test/schemas.test.ts`
  - [ ] `pnpm exec vitest run packages/contracts/test/schemas.test.ts` → PASS (all new + existing tests)
  - [ ] `pnpm typecheck` → zero errors
  - [ ] New exports visible from `@playcraft/contracts` package

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Valid MCP manifest parses
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test exists that asserts McpManifestSchema accepts a minimal manifest { name, version, tools: [] }
    Steps:
      1. Run: pnpm exec vitest run packages/contracts/test/schemas.test.ts -t "MCP manifest"
      2. Assert: exit code 0, test count >= 1, all PASS
    Expected Result: All MCP manifest tests PASS
    Evidence: .sisyphus/evidence/task-1-mcp-manifest-test.txt

  Scenario: SSE frame discriminated union parses RunStarted/ToolCall/ToolResult/RunFinished
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test asserts SseFrameSchema discriminates by `kind`
    Steps:
      1. Run: pnpm exec vitest run packages/contracts/test/schemas.test.ts -t "SSE frame"
      2. Assert: exit code 0
    Expected Result: All SSE frame tests PASS
    Evidence: .sisyphus/evidence/task-1-sse-frame-test.txt

  Scenario: Workflow graph rejects cycles (depth-first detection)
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test asserts WorkflowGraphSchema rejects graphs with circular dependencies
    Steps:
      1. Run: pnpm exec vitest run packages/contracts/test/schemas.test.ts -t "workflow graph"
      2. Assert: cycle test FAILS the schema (parse throws ZodError)
    Expected Result: Cycle detection works
    Evidence: .sisyphus/evidence/task-1-workflow-cycle-test.txt

  Scenario: Custom template namespace refinement rejects template.* (non-custom) in custom-only context
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test asserts BuilderTemplateNamespaceSchema rejects IDs not starting with template.custom.
    Steps:
      1. Run: pnpm exec vitest run packages/contracts/test/schemas.test.ts -t "custom namespace"
      2. Assert: bundled template IDs (template.memory-match) FAIL the custom namespace refinement
    Expected Result: Custom namespace enforcement works
    Evidence: .sisyphus/evidence/task-1-custom-namespace-test.txt

  Scenario: Asset catalog manifest requires catalog.json source field (no auto-discovery)
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test asserts AssetCatalogManifestSchema requires `source: "catalog.json"` field
    Steps:
      1. Run: pnpm exec vitest run packages/contracts/test/schemas.test.ts -t "asset catalog manifest"
      2. Assert: manifest without source field fails parse
    Expected Result: Source field is required
    Evidence: .sisyphus/evidence/task-1-asset-manifest-test.txt
  ```

  **Commit**: YES
  - Message: `feat(contracts): add MCP/SSE/workflow/session/asset catalog schemas`
  - Files: `packages/contracts/src/index.ts`, `packages/contracts/test/schemas.test.ts`
  - Pre-commit: `pnpm exec vitest run packages/contracts/test/`

- [x] 2. Test fixtures for new contracts

  **What to do**:
  - Create fixtures directory: `tests/fixtures/new-contracts/`
  - Add fixture JSON files (valid + invalid examples for each new schema):
    - `mcp-manifest.valid.json`, `mcp-manifest.missing-tools.json`
    - `sse-frame.run-started.json`, `sse-frame.tool-call.json`, `sse-frame.tool-result.json`, `sse-frame.run-finished.json`, `sse-frame.malformed.json`
    - `workflow-graph.valid.json` (assemble → preview → export), `workflow-graph.cycle.json`, `workflow-graph.unknown-dep.json`
    - `session-ownership.valid.json`, `session-ownership.expired.json`
    - `asset-catalog-manifest.valid.json` (ordinal sprites), `asset-catalog-manifest.paired.json` (memory cards), `asset-catalog-manifest.missing-source.json`
    - `template-snapshot.custom.toy-memory.json` (valid custom template), `template-snapshot.collision.memory-match.json` (conflicts with bundled)
  - Each fixture includes a small README describing what it validates
  - Add fixture-loading helper to `tests/fixtures/load-fixture.ts` (typed loader)

  **Must NOT do**:
  - No implementation of consumers of these fixtures (just data)
  - No fixture that silently passes despite malformed (every invalid fixture must fail a known assertion)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical fixture creation following test patterns
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (must come after T1 to know what shapes to fixture)
  - **Parallel Group**: Wave 1 sequential step 2
  - **Blocks**: T4, T5, T6, T7, T8, T9, T10 (consumers reference fixtures)
  - **Blocked By**: T1

  **References**:
  - **Pattern References**:
    - `examples/profiles/memory-match.json` — example of validated exported profile shape
    - `tests/studio-asset-library.test.tsx:675-733` — custom template snapshot shape
  - **Test References**:
    - `tests/import-light-and-scans.test.ts` — fixture-based test pattern

  **Acceptance Criteria**:
  - [ ] All fixture files created and parse against schemas added in T1
  - [ ] Loader helper exported and typed
  - [ ] `pnpm typecheck` → zero errors

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Valid MCP manifest fixture parses without error
    Tool: Bash (node -e)
    Preconditions: T1 complete; McpManifestSchema exported
    Steps:
      1. Run: node -e "const {McpManifestSchema} = require('./packages/contracts/dist'); const fs = require('fs'); const data = JSON.parse(fs.readFileSync('./tests/fixtures/new-contracts/mcp-manifest.valid.json')); console.log(McpManifestSchema.parse(data).tools.length)"
      2. Assert: exit 0, output is a positive integer
    Expected Result: Fixture loads and parses
    Evidence: .sisyphus/evidence/task-2-mcp-manifest-fixture.txt

  Scenario: Invalid asset catalog manifest fixture FAILS parse (missing source field)
    Tool: Bash (node -e)
    Preconditions: T1 complete; AssetCatalogManifestSchema exported
    Steps:
      1. Run: node -e "const {AssetCatalogManifestSchema} = require('./packages/contracts/dist'); const fs = require('fs'); const data = JSON.parse(fs.readFileSync('./tests/fixtures/new-contracts/asset-catalog-manifest.missing-source.json')); try { AssetCatalogManifestSchema.parse(data); console.log('UNEXPECTED PASS'); } catch (e) { console.log('EXPECTED FAIL:', e.message) }"
      2. Assert: output contains "EXPECTED FAIL"
    Expected Result: Missing-source fixture correctly fails
    Evidence: .sisyphus/evidence/task-2-asset-manifest-invalid.txt

  Scenario: Workflow cycle fixture is rejected by schema
    Tool: Bash (node -e)
    Preconditions: T1 complete; WorkflowGraphSchema exported
    Steps:
      1. Run: node -e "const {WorkflowGraphSchema} = require('./packages/contracts/dist'); const fs = require('fs'); const data = JSON.parse(fs.readFileSync('./tests/fixtures/new-contracts/workflow-graph.cycle.json')); try { WorkflowGraphSchema.parse(data); console.log('UNEXPECTED PASS'); } catch (e) { console.log('EXPECTED FAIL:', e.message) }"
      2. Assert: output contains "EXPECTED FAIL"
    Expected Result: Cycle fixture fails parse
    Evidence: .sisyphus/evidence/task-2-workflow-cycle-fixture.txt
  ```

  **Commit**: YES
  - Message: `test(fixtures): add new-contract fixtures (MCP/SSE/workflow/session/assets/templates)`
  - Files: `tests/fixtures/new-contracts/*`, `tests/fixtures/load-fixture.ts`

- [x] 3. Local-only MCP guardrails

  **What to do**:
  - Add `McpServerPolicySchema` to `packages/contracts/src/index.ts`:
    - `localOnly: true` (literal)
    - `noAuth: true` (literal)
    - `allowlistedTools: string[]` (MUST be subset of registered builder tool names)
    - `noNetworkExecution: true` (literal)
    - `noDatabaseAccess: true` (literal)
  - Add constant `PLAYCRAFT_MCP_GUARDRAILS` exporting the policy with all `true` literals and the current allowlist (the 7 existing builder tools)
  - Add RED tests in `packages/contracts/test/schemas.test.ts`:
    - Assert policy schema rejects `localOnly: false`
    - Assert allowlist must be non-empty and each tool must exist in `BuilderToolDefinitionSchema` enum
    - Assert no future schema field can drop a `true` literal
  - Document guardrails in `playcraft-agentic-framework/AGENT_SAFETY.md` (new file) — explicitly state "Playcraft MCP stays local-only; no real remote providers/auth/db until Server-Ready Retrieval wave"

  **Must NOT do**:
  - No auth flows, no credentials handling
  - No remote provider integration
  - No weakening of any literal `true` constraint

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Schema + constant + docs; mechanical
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 1 sequential)
  - **Parallel Group**: Wave 1 sequential step 3
  - **Blocks**: T4 (MCP adapter enforces guardrails), T17 (MCP HTTP endpoints must check guardrails)
  - **Blocked By**: T1, T2

  **References**:
  - **Pattern References**:
    - `packages/contracts/src/index.ts` — existing literal-value pattern in schemas (e.g., `schemaVersion: "playcraft.v1"`)
    - `packages/assets/src/index.ts:32-43` — `localAssetEditGenericThemeTokens` as a similar "policy" constant
  - **Test References**:
    - `packages/contracts/test/schemas.test.ts` — schema parse + failure tests

  **Acceptance Criteria**:
  - [ ] `McpServerPolicySchema` exported with all `true` literals
  - [ ] `PLAYCRAFT_MCP_GUARDRAILS` constant exported
  - [ ] RED tests in `schemas.test.ts` PASS
  - [ ] `playcraft-agentic-framework/AGENT_SAFETY.md` documents the guardrails

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: McpServerPolicySchema rejects localOnly: false
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test exists asserting literal true enforcement
    Steps:
      1. Run: pnpm exec vitest run packages/contracts/test/schemas.test.ts -t "MCP server policy"
      2. Assert: exit 0, all tests PASS
    Expected Result: Policy schema enforces all true literals
    Evidence: .sisyphus/evidence/task-3-mcp-policy-test.txt

  Scenario: PLAYCRAFT_MCP_GUARDRAILS allowlist contains all 7 builder tools
    Tool: Bash (node -e)
    Preconditions: Constant exported
    Steps:
      1. Run: node -e "const {PLAYCRAFT_MCP_GUARDRAILS, builderToolDefinitions} = require('./packages/contracts/dist'); console.log(PLAYCRAFT_MCP_GUARDRAILS.allowlistedTools.length === builderToolDefinitions.length)"
      2. Assert: output is "true"
    Expected Result: Allowlist is complete
    Evidence: .sisyphus/evidence/task-3-mcp-allowlist.txt

  Scenario: AGENT_SAFETY.md documents the no-auth/no-db/no-network constraints
    Tool: Bash (cat + grep)
    Preconditions: Doc file exists
    Steps:
      1. Run: grep -E "(no auth|no remote|no database|local-only)" playcraft-agentic-framework/AGENT_SAFETY.md | wc -l
      2. Assert: output >= 4 (each constraint mentioned)
    Expected Result: Doc mentions all 4 guardrails
    Evidence: .sisyphus/evidence/task-3-safety-doc.txt
  ```

  **Commit**: YES
  - Message: `feat(contracts): add MCP local-only guardrails policy`
  - Files: `packages/contracts/src/index.ts`, `packages/contracts/test/schemas.test.ts`, `playcraft-agentic-framework/AGENT_SAFETY.md`
  - Pre-commit: `pnpm exec vitest run packages/contracts/test/`

### Wave 2 — Core Implementation (MAX PARALLEL, 7 tasks)

- [x] 4. MCP tool discovery adapter (over builder/service tools)

  **What to do**:
  - Create new package `packages/mcp/` with:
    - `package.json` named `@playcraft/mcp`, depends on `@playcraft/contracts`, `@playcraft/builder`, `@playcraft/service`
    - `src/index.ts` exporting `createMcpManifest(builderTools, serviceCatalog)` returning `McpManifestSchema`-validated object
    - `src/adapter.ts` exporting `adapterToolsToMcp(tools: BuilderToolDefinition[]): McpTool[]`
      - Maps `BuilderToolDefinition.argumentsSchema` (custom JsonObjectSchemaDescriptor) → MCP `parameters` (JSONSchema)
      - Validates against `PLAYCRAFT_MCP_GUARDRAILS.allowlistedTools` (filters to allowlist)
    - `src/tool-call.ts` exporting `invokeMcpTool(name, args, builderService): Promise<BuilderServiceResponse>` that wraps an existing builder/service action
  - Add RED tests in `packages/mcp/test/adapter.test.ts`:
    - Adapter produces valid `McpManifest` from existing 7 builder tools
    - Adapter rejects tools not in allowlist
    - JSONSchema translation is correct (required/optional fields preserved)
    - `invokeMcpTool('assemble-game', { templateId: 'template.memory-match' }, mockService)` returns a valid response

  **Must NOT do**:
  - No real MCP wire protocol implementation (just manifest + invocation wrapper)
  - No new tool capabilities beyond existing builder/service
  - No auth, no credentials, no remote execution

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New package with translation logic + tests + integration with existing builder/service
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5-T10)
  - **Blocks**: T17 (MCP HTTP endpoints use this adapter)
  - **Blocked By**: T1, T2, T3

  **References**:
  - **Pattern References**:
    - `packages/builder/src/index.ts:77-85` — existing `builderToolDefinitions` array
    - `packages/builder/src/index.ts:627-654` — `builderTool()` factory function
    - `packages/builder/src/index.ts:687-742` — `builderToolArgumentsSchema()` per-action schemas
    - `packages/service/src/index.ts:102-239` — `LOCAL_SERVICE_CATALOG` shape
  - **Test References**:
    - `packages/builder/test/session-service.test.ts` — builder test patterns with mock sessions
    - `packages/service/test/local-service.test.ts` — service test patterns
  - **External References**:
    - MCP function-calling shape: `{ name, description, inputSchema: { type: "object", properties, required } }`

  **Acceptance Criteria**:
  - [ ] Test file created: `packages/mcp/test/adapter.test.ts`
  - [ ] `pnpm exec vitest run packages/mcp/test/` → PASS
  - [ ] `pnpm typecheck` → zero errors
  - [ ] `createMcpManifest()` returns valid McpManifest for all 7 builder tools
  - [ ] `invokeMcpTool()` works for at least `assemble-game` and `update-game`

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: MCP manifest generated from builder tools passes schema validation
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test exists
    Steps:
      1. Run: pnpm exec vitest run packages/mcp/test/adapter.test.ts -t "manifest from builder tools"
      2. Assert: exit 0
    Expected Result: Manifest validates against McpManifestSchema
    Evidence: .sisyphus/evidence/task-4-mcp-manifest-validation.txt

  Scenario: Adapter rejects tool not in PLAYCRAFT_MCP_GUARDRAILS.allowlistedTools
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test exists
    Steps:
      1. Run: pnpm exec vitest run packages/mcp/test/adapter.test.ts -t "rejects non-allowlisted"
      2. Assert: exit 0
    Expected Result: Non-allowlisted tool filtered out
    Evidence: .sisyphus/evidence/task-4-mcp-allowlist-enforcement.txt

  Scenario: invokeMcpTool('assemble-game', ...) calls underlying builder and returns valid response
    Tool: Bash (pnpm exec vitest)
    Preconditions: Mock service set up
    Steps:
      1. Run: pnpm exec vitest run packages/mcp/test/adapter.test.ts -t "invokeMcpTool assemble-game"
      2. Assert: exit 0, response.kind === "execution" or "session"
    Expected Result: Tool invocation routes to builder correctly
    Evidence: .sisyphus/evidence/task-4-mcp-tool-invocation.txt
  ```

  **Commit**: YES
  - Message: `feat(mcp): add MCP tool discovery adapter over builder/service`
  - Files: `packages/mcp/**`, `pnpm-workspace.yaml`, root `package.json`
  - Pre-commit: `pnpm exec vitest run packages/mcp/test/`

- [x] 5. SSE frame codec + HTTP server route

  **What to do**:
  - Extend `packages/service/src/http-server.ts`:
    - Add SSE endpoint: `GET /playcraft/stream` (or configurable route)
    - Returns `text/event-stream` content type
    - Accepts `Accept: text/event-stream` header check
    - Emits `SseFrameSchema`-validated frames as `data: <json>\n\n`
  - Create `packages/service/src/sse.ts`:
    - `encodeSseFrame(frame: SseFrame): string` (JSON serialize + validate)
    - `parseSseFrame(raw: string): SseFrame` (parse + validate)
    - `createSseResponse(fetcher: () => AsyncIterable<SseFrame>): Response` (for HTTP)
  - Wire AG-UI events from service execution into SSE frames:
    - When `LocalPlaycraftService.handle()` produces AG-UI events, stream them as SSE frames during long-running operations
  - Add RED tests in `packages/service/test/sse.test.ts`:
    - `encodeSseFrame` produces valid wire format
    - `parseSseFrame` round-trips
    - Invalid frame throws
    - HTTP server route emits frames in order

  **Must NOT do**:
  - No persistent connections that bypass HTTP server lifecycle
  - No mixing of JSON and SSE on same endpoint
  - No emitting frames that fail `SseFrameSchema` validation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: HTTP streaming, schema validation, lifecycle management
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T6-T10)
  - **Blocks**: T6 (client consumes this endpoint)
  - **Blocked By**: T1, T2

  **References**:
  - **Pattern References**:
    - `packages/service/src/http-server.ts:95-152` — existing POST /playcraft route
    - `packages/ag-ui/src/index.ts:67-77` — built-in AG-UI payload schemas
    - `packages/builder/src/index.ts:272-274, 347-350` — example of where toolCall/toolResult events are emitted
  - **Test References**:
    - `packages/service/test/local-service.test.ts` — service test patterns
  - **External References**:
    - Server-Sent Events spec: `text/event-stream` MIME, `data:` prefix, `\n\n` terminator

  **Acceptance Criteria**:
  - [ ] Test file created: `packages/service/test/sse.test.ts`
  - [ ] `pnpm exec vitest run packages/service/test/` → PASS (existing + new)
  - [ ] `pnpm typecheck` → zero errors
  - [ ] SSE endpoint emits at least one frame in response to a request that produces AG-UI events

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: SSE frame encodes/encodes round-trip
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test exists
    Steps:
      1. Run: pnpm exec vitest run packages/service/test/sse.test.ts -t "round-trip"
      2. Assert: exit 0
    Expected Result: Encoded frame parses back to equivalent object
    Evidence: .sisyphus/evidence/task-5-sse-roundtrip.txt

  Scenario: GET /playcraft/stream returns text/event-stream content type
    Tool: Bash (curl)
    Preconditions: Local service running on 127.0.0.1:8787
    Steps:
      1. Start: pnpm exec playcraft-service-http &
      2. curl -i http://127.0.0.1:8787/playcraft/stream -H "Accept: text/event-stream" --max-time 2
      3. Assert: HTTP 200, Content-Type: text/event-stream
      4. Kill background process
    Expected Result: Endpoint serves SSE
    Evidence: .sisyphus/evidence/task-5-sse-curl.txt

  Scenario: Invalid SSE frame rejected by parser
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test exists
    Steps:
      1. Run: pnpm exec vitest run packages/service/test/sse.test.ts -t "invalid frame"
      2. Assert: exit 0
    Expected Result: Parser throws on malformed input
    Evidence: .sisyphus/evidence/task-5-sse-invalid.txt
  ```

  **Commit**: YES
  - Message: `feat(service): add HTTP SSE streaming endpoint for AG-UI events`
  - Files: `packages/service/src/sse.ts`, `packages/service/src/http-server.ts`, `packages/service/test/sse.test.ts`
  - Pre-commit: `pnpm exec vitest run packages/service/test/`

- [x] 6. SSE client transport + state reconciliation (Studio + Mobile)

  **What to do**:
  - Add `createSseClientTransport(url): StudioClient`-compatible interface to `apps/studio/src/local-client.ts`
  - Implementation:
    - Opens `EventSource` (or fetch with streaming body) on the SSE endpoint
    - Accumulates frames in a timeline (append-only)
    - On `RunFinished`, reconciles accumulated events into final `BuilderSessionSnapshot`
    - On stream error, returns current state with `error` flag (does not silently corrupt state)
    - On `profile-swap` or `reset`, clears accumulated state before reconnecting
  - Wire into `StudioClient` factory: if `VITE_PLAYCRAFT_SERVICE_URL` ends with SSE-aware path, use SSE transport; else use existing JSON transport
  - Same change for `apps/mobile-shell/src/mobile-client.ts`
  - Add RED tests in `tests/studio-sse-client.test.tsx`:
    - Frames append to timeline
    - RunFinished triggers reconciliation
    - Stream error does not corrupt existing session state
    - Profile swap clears accumulated timeline

  **Must NOT do**:
  - No auto-reconnect loops that hide errors
  - No mixing SSE and JSON snapshot responses in same client
  - No silent state replacement when stream errors mid-way

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Client-side state machine + EventSource + reconciliation logic
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T5, T7-T10)
  - **Blocks**: T11 (Developer panel uses streamed timeline), T12 (Live App uses streamed state), T15 (Mobile parity)
  - **Blocked By**: T5

  **References**:
  - **Pattern References**:
    - `apps/studio/src/local-client.ts:60-89` — existing client snapshot logic
    - `apps/mobile-shell/src/mobile-client.ts:8-13` — mobile wrapper to extend
    - `packages/ag-ui/src/index.ts:127-133` — `toolCall`/`toolResult` event construction
  - **Test References**:
    - `tests/studio-ui.test.ts` — Studio client test patterns
    - `tests/mobile-shell.test.tsx` — mobile client test patterns

  **Acceptance Criteria**:
  - [ ] Test file created: `tests/studio-sse-client.test.tsx`
  - [ ] `pnpm exec vitest run tests/` → PASS
  - [ ] `pnpm typecheck` → zero errors
  - [ ] Studio + Mobile clients both have SSE transport option

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: SSE frames append to timeline in order
    Tool: Bash (pnpm exec vitest)
    Preconditions: Mock EventSource emitting 3 frames
    Steps:
      1. Run: pnpm exec vitest run tests/studio-sse-client.test.tsx -t "timeline append"
      2. Assert: exit 0
    Expected Result: 3 frames appear in timeline in correct order
    Evidence: .sisyphus/evidence/task-6-sse-timeline.txt

  Scenario: RunFinished frame triggers snapshot reconciliation
    Tool: Bash (pnpm exec vitest)
    Preconditions: Mock stream emits RunStarted + ToolCall + ToolResult + RunFinished
    Steps:
      1. Run: pnpm exec vitest run tests/studio-sse-client.test.tsx -t "reconciliation"
      2. Assert: exit 0, snapshot reflects assembled profile
    Expected Result: Final snapshot matches toolResult payload
    Evidence: .sisyphus/evidence/task-6-sse-reconcile.txt

  Scenario: Stream error mid-run does NOT corrupt existing session state
    Tool: Bash (pnpm exec vitest)
    Preconditions: Existing session snapshot set; mock stream errors after 2 frames
    Steps:
      1. Run: pnpm exec vitest run tests/studio-sse-client.test.tsx -t "stream error"
      2. Assert: exit 0, snapshot remains valid, error surfaced
    Expected Result: Session state preserved + error visible to caller
    Evidence: .sisyphus/evidence/task-6-sse-error-handling.txt

  Scenario: Mobile shell SSE transport matches Studio
    Tool: Bash (pnpm exec vitest)
    Preconditions: Mobile client wrapper exists
    Steps:
      1. Run: pnpm exec vitest run tests/mobile-shell.test.tsx -t "SSE parity"
      2. Assert: exit 0
    Expected Result: Mobile uses same SSE transport
    Evidence: .sisyphus/evidence/task-6-mobile-sse.txt
  ```

  **Commit**: YES
  - Message: `feat(studio+mobile): add SSE client transport with state reconciliation`
  - Files: `apps/studio/src/local-client.ts`, `apps/mobile-shell/src/mobile-client.ts`, `tests/studio-sse-client.test.tsx`
  - Pre-commit: `pnpm exec vitest run tests/`

- [x] 7. Tool composition workflow graph schema + executor

  **What to do**:
  - Add to `packages/service/src/workflow/`:
    - `schema.ts` — `WorkflowGraphSchema`, `WorkflowNodeSchema` (extends existing service request), `WorkflowEdgeSchema` (dependency), `WorkflowConditionSchema` (simple equality/length checks only)
    - `executor.ts` — `executeWorkflow(graph, service, sessionId): AsyncGenerator<WorkflowEvent>`:
      - Topological sort from dependency edges
      - Sequential execution by default; parallel only when explicitly marked
      - Conditional skip: if condition fails, skip node + descendants unless `cascade: false`
      - Failed node: emit `WorkflowEvent.failed`, halt unless `continueOnError: true`
      - Strict cap: no more than 20 nodes per graph (enforced in schema)
  - Add to `packages/service/src/index.ts`: `service.executeWorkflow(graph, sessionId)` entrypoint
  - Wire into existing `handleLocalServiceRequestBatch` as a new action `execute-workflow`
  - Add RED tests in `packages/service/test/workflow.test.ts`:
    - Topological order respected
    - Cycle rejected (schema-level, from T1)
    - Conditional node skipped correctly
    - Failed node halts unless `continueOnError`
    - 21-node graph rejected at parse time
    - Workflow emits AG-UI frames (RunStarted per node, ToolCall/ToolResult, RunFinished)

  **Must NOT do**:
  - No general-purpose DAG engine (limited to service-request nodes + linear-with-conditions)
  - No parallel execution by default (explicit only — keeps determinism)
  - No loops in graph (cycles rejected)
  - No infinite recursion or unbounded expansion

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Graph executor with cycle detection, conditional logic, error handling — non-trivial
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4-T6, T8-T10)
  - **Blocks**: T18 (integration with batch endpoint)
  - **Blocked By**: T1, T2

  **References**:
  - **Pattern References**:
    - `packages/service/src/index.ts:629-656` — existing `handleLocalServiceRequestBatch` pattern
    - `packages/contracts/src/index.ts:1921-2065` — existing request envelope shape (WorkflowNode reuses this)
  - **Test References**:
    - `packages/service/test/local-service.test.ts` — service test patterns
  - **External References**:
    - Topological sort (Kahn's algorithm): deterministic, no cycles

  **Acceptance Criteria**:
  - [ ] Test file created: `packages/service/test/workflow.test.ts`
  - [ ] `pnpm exec vitest run packages/service/test/` → PASS
  - [ ] `pnpm typecheck` → zero errors
  - [ ] Linear workflow (assemble → preview → export) executes in order
  - [ ] Workflow with conditional (skip preview if no interaction) works
  - [ ] Workflow with failed node halts

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Linear 3-node workflow executes in topological order
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test exists with fixture workflow-graph.valid.json
    Steps:
      1. Run: pnpm exec vitest run packages/service/test/workflow.test.ts -t "linear order"
      2. Assert: exit 0
    Expected Result: assemble → preview → export runs in order
    Evidence: .sisyphus/evidence/task-7-workflow-linear.txt

  Scenario: Conditional skip works (skip node + descendants)
    Tool: Bash (pnpm exec vitest)
    Preconditions: Test workflow with condition that fails
    Steps:
      1. Run: pnpm exec vitest run packages/service/test/workflow.test.ts -t "conditional skip"
      2. Assert: exit 0
    Expected Result: Skipped nodes not executed
    Evidence: .sisyphus/evidence/task-7-workflow-conditional.txt

  Scenario: Failed node halts workflow (no continueOnError)
    Tool: Bash (pnpm exec vitest)
    Preconditions: Mock node throws
    Steps:
      1. Run: pnpm exec vitest run packages/service/test/workflow.test.ts -t "halt on failure"
      2. Assert: exit 0
    Expected Result: Subsequent nodes not executed
    Evidence: .sisyphus/evidence/task-7-workflow-halt.txt

  Scenario: 21-node workflow rejected at parse
    Tool: Bash (pnpm exec vitest)
    Preconditions: Schema enforces max 20
    Steps:
      1. Run: pnpm exec vitest run packages/service/test/workflow.test.ts -t "node cap"
      2. Assert: exit 0
    Expected Result: Parse throws ZodError
    Evidence: .sisyphus/evidence/task-7-workflow-cap.txt
  ```

  **Commit**: YES
  - Message: `feat(service): add deterministic workflow executor with cycle/conditional/error handling`
  - Files: `packages/service/src/workflow/**`, `packages/service/src/index.ts`, `packages/service/test/workflow.test.ts`
  - Pre-commit: `pnpm exec vitest run packages/service/test/`

- [x] 8. Custom template round-trip + `template.custom.*` namespace + conflict detection

  **What to do**:
  - In `packages/builder/src/index.ts`:
    - Add `customTemplateSnapshotFor(profile: GameAssemblyProfile): GameProfileTemplateSnapshot` that derives a custom snapshot from imported profile
    - Apply `BuilderTemplateNamespaceSchema` refinement to imported custom templates (must start with `template.custom.`)
    - On `import-profile` action, validate against namespace refinement BEFORE merging into session
    - On conflict (custom ID collides with bundled `template.*` ID), reject import with descriptive error
  - In `packages/packs/src/index.ts`:
    - Add `buildCustomTemplateSnapshotFromProfile()` helper
    - Ensure `TEMPLATE_BY_ID` lookup falls through to profile-carried snapshot when bundled lookup fails
  - In `packages/core/src/index.ts`:
    - Add round-trip helper: `roundTripCustomTemplate(snapshot) → snapshot` that validates export → import produces byte-equal snapshot (modulo timestamps)
  - Add RED tests:
    - `packages/builder/test/session-service.test.ts`: import profile with custom ID succeeds
    - `packages/builder/test/session-service.test.ts`: import with ID colliding with bundled template fails
    - `packages/builder/test/session-service.test.ts`: round-trip preserves custom ID + liveSurface
    - `packages/packs/test/mvp-profiles.test.ts`: custom template survives `assemble → export → import → replay`
    - `tests/studio-asset-library.test.tsx`: extend line 675 test to include round-trip via service

  **Must NOT do**:
  - No allowing non-namespaced custom IDs
  - No silent rename on conflict
  - No mutating the original imported profile (deep clone before session merge)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Schema enforcement + builder/packs/core coordination + round-trip tests
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4-T7, T9, T10)
  - **Blocks**: T19 (custom template recipes)
  - **Blocked By**: T1, T2

  **References**:
  - **Pattern References**:
    - `packages/builder/src/index.ts:607` — `templateForBuildOrUpdate()` fallback to profile snapshot
    - `packages/builder/src/index.ts:858` — existing custom template import test (single test to expand)
    - `packages/packs/src/index.ts:1036-1049` — `templateSnapshotForProfileTemplate()`
    - `examples/profiles/memory-match.json` — full profile structure for round-trip fixtures
  - **Test References**:
    - `packages/builder/test/session-service.test.ts:858` — "imports custom template snapshots"
    - `packages/builder/test/session-service.test.ts:929` — "updates imported custom template snapshots"
    - `tests/studio-asset-library.test.tsx:675` — single custom template test to extend

  **Acceptance Criteria**:
  - [ ] Test files updated in `packages/builder/test/`, `packages/packs/test/`, `tests/`
  - [ ] `pnpm exec vitest run` → PASS (all custom template tests)
  - [ ] `pnpm typecheck` → zero errors
  - [ ] Custom template ID `template.custom.toy-memory` survives full round-trip
  - [ ] Conflicting ID `template.memory-match` (bundled) rejected on import

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Custom template round-trip preserves snapshot byte-equal (modulo timestamps)
    Tool: Bash (pnpm exec vitest)
    Preconditions: Fixture profile with custom template ID
    Steps:
      1. Run: pnpm exec vitest run packages/packs/test/mvp-profiles.test.ts -t "custom template round-trip"
      2. Assert: exit 0
    Expected Result: Export → import produces equal snapshot
    Evidence: .sisyphus/evidence/task-8-custom-roundtrip.txt

  Scenario: Custom template namespace refinement rejects non-prefixed IDs
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test exists
    Steps:
      1. Run: pnpm exec vitest run packages/builder/test/session-service.test.ts -t "namespace enforcement"
      2. Assert: exit 0
    Expected Result: ID without template.custom. prefix fails
    Evidence: .sisyphus/evidence/task-8-namespace.txt

  Scenario: Conflict detection rejects ID colliding with bundled template
    Tool: Bash (pnpm exec vitest)
    Preconditions: Test imports profile with template.memory-match ID as "custom"
    Steps:
      1. Run: pnpm exec vitest run packages/builder/test/session-service.test.ts -t "conflict detection"
      2. Assert: exit 0, import rejects
    Expected Result: Bundled ID collision detected
    Evidence: .sisyphus/evidence/task-8-conflict.txt

  Scenario: Studio asset library round-trips custom template via service
    Tool: Bash (pnpm exec vitest)
    Preconditions: Extends existing test at line 675
    Steps:
      1. Run: pnpm exec vitest run tests/studio-asset-library.test.tsx -t "custom template round-trip"
      2. Assert: exit 0
    Expected Result: Full round-trip preserves assets + template
    Evidence: .sisyphus/evidence/task-8-studio-roundtrip.txt
  ```

  **Commit**: YES
  - Message: `feat(builder+packs+core): custom template namespace + round-trip + conflict detection`
  - Files: `packages/builder/src/index.ts`, `packages/packs/src/index.ts`, `packages/core/src/index.ts`, test files
  - Pre-commit: `pnpm exec vitest run`

- [x] 9. Asset catalog manifest schema + folder discovery + bundled-merge

  **What to do**:
  - In `packages/assets/src/index.ts`:
    - Add `AssetCatalogManifestSchema` (already in T1 contracts; here is the consumer)
    - Add `loadManifestFromFolder(folderPath): Promise<AssetCatalogManifest | null>`:
      - Reads `<folder>/catalog.json` if present
      - Returns null if absent (NO auto-discovery from filenames)
      - Validates against `AssetCatalogManifestSchema` (throws on malformed)
    - Add `mergeAssetCatalogs(bundled, discovered): BuilderAssetEditCatalogEntry[]`:
      - Discovered entries with same `theme` REPLACE bundled (last-wins, deterministic)
      - Discovered entries with new `theme` are appended
      - Sort result by `theme` for determinism
  - Create `catalog.json` files for each existing bundled theme:
    - `apps/studio/src/assets/library/replacements/dinosaurs/catalog.json`
    - `apps/studio/src/assets/library/replacements/toys/catalog.json`
    - `apps/studio/src/assets/library/replacements/dolphins/catalog.json`
    - `apps/studio/src/assets/library/replacements/fruits/catalog.json`
    - Each declares `source: "catalog.json"`, theme, displayLabel, aliases, suggestedItems, spriteNaming: { kind: "ordinal", rules }
  - Wire discovery into Studio startup: at `App.tsx` mount, scan `apps/studio/src/assets/library/replacements/*/catalog.json`, merge with bundled, expose via `BuilderCatalog.assetEdit.availableThemes`
  - Add RED tests in `packages/assets/test/local-asset-source.test.ts`:
    - Folder with `catalog.json` → manifest loaded
    - Folder without `catalog.json` → null returned (no auto-discovery)
    - Malformed `catalog.json` → throws ZodError
    - Merge: discovered theme replaces bundled; new theme appended; sorted result
    - Integration test: dropping a new folder with valid `catalog.json` adds theme to catalog

  **Must NOT do**:
  - No filename-only discovery (must require `catalog.json`)
  - No silent ignoring of malformed manifests (throw + log)
  - No mutating bundled catalog at runtime (immutable; merge produces new array)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New schema consumer + filesystem discovery + merge logic + integration
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4-T8, T10)
  - **Blocks**: T11 (Developer panel catalog browser shows discovered themes)
  - **Blocked By**: T1, T2

  **References**:
  - **Pattern References**:
    - `packages/assets/src/index.ts:67-92` — existing `localAssetEditCatalog` shape
    - `apps/studio/src/asset-library.ts:108` — existing `createProfileLibraryAssetReplacements()` (asset consumer, separate from catalog)
    - `apps/studio/src/assets/library/replacements/dinosaurs/` — existing folder structure
  - **Test References**:
    - `packages/assets/test/local-asset-source.test.ts` — existing test patterns
  - **External References**:
    - JSON Schema: simple JSON object, no schema-in-schema

  **Acceptance Criteria**:
  - [ ] 4 `catalog.json` files created in existing replacement folders
  - [ ] `packages/assets/test/local-asset-source.test.ts` updated with new tests
  - [ ] `pnpm exec vitest run packages/assets/test/` → PASS
  - [ ] `pnpm typecheck` → zero errors
  - [ ] Discovery returns null for folder without `catalog.json`
  - [ ] Merge replaces bundled for matching theme

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Folder with valid catalog.json loads manifest
    Tool: Bash (pnpm exec vitest)
    Preconditions: Test fixture folder exists
    Steps:
      1. Run: pnpm exec vitest run packages/assets/test/local-asset-source.test.ts -t "loads manifest"
      2. Assert: exit 0
    Expected Result: Manifest parsed successfully
    Evidence: .sisyphus/evidence/task-9-manifest-load.txt

  Scenario: Folder without catalog.json returns null (no filename auto-discovery)
    Tool: Bash (pnpm exec vitest)
    Preconditions: Test fixture folder with no catalog.json
    Steps:
      1. Run: pnpm exec vitest run packages/assets/test/local-asset-source.test.ts -t "no auto-discovery"
      2. Assert: exit 0
    Expected Result: Returns null, does NOT infer from folder name
    Evidence: .sisyphus/evidence/task-9-no-autodiscovery.txt

  Scenario: Malformed catalog.json throws ZodError
    Tool: Bash (pnpm exec vitest)
    Preconditions: Test fixture with malformed manifest (missing source field)
    Steps:
      1. Run: pnpm exec vitest run packages/assets/test/local-asset-source.test.ts -t "malformed"
      2. Assert: exit 0, error thrown
    Expected Result: Malformed manifest rejected
    Evidence: .sisyphus/evidence/task-9-malformed.txt

  Scenario: Merge replaces bundled for matching theme; appends new theme; sorted result
    Tool: Bash (pnpm exec vitest)
    Preconditions: Bundled + discovered catalogs provided
    Steps:
      1. Run: pnpm exec vitest run packages/assets/test/local-asset-source.test.ts -t "merge"
      2. Assert: exit 0
    Expected Result: Merged array has correct count, alphabetical order
    Evidence: .sisyphus/evidence/task-9-merge.txt

  Scenario: Integration — dropping new folder with catalog.json adds theme
    Tool: Bash (pnpm exec vitest)
    Preconditions: Test creates temp folder + catalog.json
    Steps:
      1. Run: pnpm exec vitest run tests/studio-asset-library.test.tsx -t "discovered theme"
      2. Assert: exit 0
    Expected Result: New theme appears in catalog
    Evidence: .sisyphus/evidence/task-9-integration.txt
  ```

  **Commit**: YES
  - Message: `feat(assets): add catalog.json discovery + bundled-merge`
  - Files: `packages/assets/src/index.ts`, `packages/assets/test/local-asset-source.test.ts`, `apps/studio/src/assets/library/replacements/*/catalog.json`, `tests/studio-asset-library.test.tsx`
  - Pre-commit: `pnpm exec vitest run`

- [x] 10. Session ownership types + expiry enforcement

  **What to do**:
  - Extend `BuilderSessionSnapshotSchema` (from T1) with optional `ownership?: BuilderSessionOwnershipSchema`
  - In `packages/service/src/index.ts` (`LocalPlaycraftService`):
    - On `assemble`/`update`/`import-profile` (session-creating actions): generate `ownership` with `ownerId`, `createdAt`, `expiresAt = createdAt + 1 hour` (configurable)
    - On every request: validate session ownership not expired; if expired, return error response with `kind: "session-expired"` (not silent reset)
  - Add `reset` action extension: takes optional `ownerId` arg; if matches current owner, resets normally; if mismatched, returns ownership-mismatch error
  - In `packages/builder/src/index.ts` (`PlaycraftBuilderSessionService`):
    - Pass through ownership from service; surface `session-expired` errors as typed `BuilderExecutionResult`
  - Add RED tests:
    - `packages/service/test/local-service.test.ts`: new session has ownership with future expiry
    - `packages/service/test/local-service.test.ts`: session past expiry returns `session-expired`
    - `packages/service/test/local-service.test.ts`: reset with mismatched ownerId returns ownership-mismatch error
    - `packages/builder/test/session-service.test.ts`: session-expired surfaces as typed result

  **Must NOT do**:
  - No silent reset on expired session (must surface error)
  - No ownership downgrade for old sessions (optional field, fail-open for legacy)
  - No tying ownership to real auth/credentials (just an opaque ID string)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Schema extension + service enforcement + builder surface
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4-T9)
  - **Blocks**: T17 (MCP HTTP endpoints check ownership)
  - **Blocked By**: T1, T2

  **References**:
  - **Pattern References**:
    - `packages/service/src/index.ts:629-656` — existing session handling
    - `packages/builder/src/index.ts:107-145` — `BuilderCommandHandler` interface
    - `packages/contracts/src/index.ts:1827-1865` — `BuilderSessionSnapshotSchema` (to extend)
  - **Test References**:
    - `packages/service/test/local-service.test.ts` — service test patterns

  **Acceptance Criteria**:
  - [ ] Test files updated
  - [ ] `pnpm exec vitest run` → PASS
  - [ ] `pnpm typecheck` → zero errors
  - [ ] New session has ownership with `expiresAt` 1h in future
  - [ ] Expired session returns `session-expired` error (not silent reset)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: New session created with ownership + future expiry
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test exists
    Steps:
      1. Run: pnpm exec vitest run packages/service/test/local-service.test.ts -t "ownership on new session"
      2. Assert: exit 0
    Expected Result: ownership field populated with expiresAt > now
    Evidence: .sisyphus/evidence/task-10-ownership.txt

  Scenario: Session past expiry returns session-expired (not silent reset)
    Tool: Bash (pnpm exec vitest)
    Preconditions: Mock clock at t+2h
    Steps:
      1. Run: pnpm exec vitest run packages/service/test/local-service.test.ts -t "session expired"
      2. Assert: exit 0
    Expected Result: Response kind === "session-expired"
    Evidence: .sisyphus/evidence/task-10-expiry.txt

  Scenario: Reset with mismatched ownerId returns ownership-mismatch error
    Tool: Bash (pnpm exec vitest)
    Preconditions: Session owned by "agent-A"; reset called with "agent-B"
    Steps:
      1. Run: pnpm exec vitest run packages/service/test/local-service.test.ts -t "ownership mismatch"
      2. Assert: exit 0
    Expected Result: Reset rejected with ownership-mismatch error
    Evidence: .sisyphus/evidence/task-10-mismatch.txt

  Scenario: Builder surfaces session-expired as typed result
    Tool: Bash (pnpm exec vitest)
    Preconditions: Service returns session-expired; builder receives
    Steps:
      1. Run: pnpm exec vitest run packages/builder/test/session-service.test.ts -t "session expired surface"
      2. Assert: exit 0
    Expected Result: BuilderExecutionResult.kind reflects expired
    Evidence: .sisyphus/evidence/task-10-builder-surface.txt
  ```

  **Commit**: YES
  - Message: `feat(service+builder): session ownership types + expiry enforcement`
  - Files: `packages/service/src/index.ts`, `packages/builder/src/index.ts`, test files
  - Pre-commit: `pnpm exec vitest run`

### Wave 3 — Studio/Mobile UX (MAX PARALLEL, 6 tasks)

- [x] 11. Studio Developer panel — catalog browser + run inspector

  **What to do**:
  - In `apps/studio/src/studio-app.tsx`:
    - Replace `AgentToolCatalogPanel` (lines 452-572) with new `McpCatalogBrowser`:
      - Shows MCP manifest (from T4) grouped by category (templates, tools, service actions)
      - Searchable; click to expand tool details (description, args schema, example)
      - "Run with..." button opens a workflow builder (uses T7 workflow executor)
    - Add new `RunInspector` panel:
      - Shows live timeline (uses T6 SSE client) with collapsible frames
      - Filterable by event kind
      - Click a frame to see full payload
      - "Stop run" button halts active stream
  - In `apps/studio/src/studio-app.tsx` DeveloperPanel layout:
    - 3-column grid: Catalog (left) | Profile Portability (center) | Run Inspector (right)
    - Each column ≥ 280px wide, scrollable independently
  - Update `tests/studio-ui.test.tsx` with new tests:
    - Catalog browser renders MCP manifest with all 7 tools
    - Search filters tools by name
    - Run Inspector shows streamed frames
    - 3-column layout renders correctly

  **Must NOT do**:
  - No auto-running tools without user click (every run must be explicit)
  - No hiding of tool errors (always surface)
  - No infinite-scroll loading (explicit pagination or scroll-to-load)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI refresh with real-time timeline + catalog browsing
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T12-T16)
  - **Blocks**: T15 (Mobile parity)
  - **Blocked By**: T4, T6, T9

  **References**:
  - **Pattern References**:
    - `apps/studio/src/studio-app.tsx:357-450` — `DeveloperPanel` layout to extend
    - `apps/studio/src/studio-app.tsx:452-572` — existing `AgentToolCatalogPanel` to replace
    - `apps/studio/src/studio-app.tsx:857-908` — existing `TimelinePanel` to merge with new RunInspector
  - **Test References**:
    - `tests/studio-ui.test.tsx` — existing Studio UI test patterns

  **Acceptance Criteria**:
  - [ ] `McpCatalogBrowser` renders all 7 MCP tools
  - [ ] `RunInspector` shows streamed frames in real time
  - [ ] 3-column layout works at viewport widths 1024px+
  - [ ] `pnpm exec vitest run tests/studio-ui.test.tsx` → PASS
  - [ ] `pnpm typecheck` → zero errors

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: McpCatalogBrowser renders all 7 MCP tools from manifest
    Tool: Playwright (browser)
    Preconditions: Studio dev server running, MCP manifest available
    Steps:
      1. Navigate to http://localhost:5173/?tab=developer
      2. Wait for .mcp-catalog-browser visible
      3. Assert: 7 tool cards visible (.mcp-tool-card count = 7)
      4. Assert: each card has data-tool-name matching a known tool
    Expected Result: All tools displayed
    Evidence: .sisyphus/evidence/task-11-catalog-render.png

  Scenario: Search filters tools by name
    Tool: Playwright (browser)
    Preconditions: Catalog browser open
    Steps:
      1. Type "assemble" in .mcp-catalog-search input
      2. Assert: only tool cards with "assemble" in name visible
      3. Clear search
      4. Assert: all 7 cards visible again
    Expected Result: Search works
    Evidence: .sisyphus/evidence/task-11-search.png

  Scenario: Run Inspector shows streamed frames as they arrive
    Tool: Playwright (browser)
    Preconditions: SSE stream active, mock sending 3 frames
    Steps:
      1. Click "Run assemble-game" button
      2. Wait 1s
      3. Assert: .run-inspector-frame count = 3
      4. Assert: each frame has visible timestamp + kind
    Expected Result: Frames stream in real time
    Evidence: .sisyphus/evidence/task-11-run-inspector.png

  Scenario: 3-column layout at 1280px viewport
    Tool: Playwright (browser)
    Preconditions: Developer tab open
    Steps:
      1. Set viewport: 1280x800
      2. Assert: .catalog-column width >= 280px
      3. Assert: .profile-column width >= 280px
      4. Assert: .run-inspector-column width >= 280px
    Expected Result: 3 columns fit
    Evidence: .sisyphus/evidence/task-11-layout-1280.png
  ```

  **Commit**: YES
  - Message: `feat(studio): MCP catalog browser + run inspector in Developer panel`
  - Files: `apps/studio/src/studio-app.tsx`, `tests/studio-ui.test.tsx`
  - Pre-commit: `pnpm exec vitest run tests/studio-ui.test.tsx`

- [x] 12. Studio Live App — streamed state updates + profile-swap reset

  **What to do**:
  - In `apps/studio/src/live-game.tsx`:
    - Subscribe to SSE timeline events from T6 client transport
    - Update `LiveGame` state incrementally as `toolCall`/`toolResult` frames arrive (show progress: "Assembling...", "Generating assets...", "Ready")
    - On profile-swap event: clear all internal state (no stale game state from previous profile), show "Loading new game..." for ≤ 300ms
    - On `RunError` frame: show user-friendly error + "Try again" button (no raw stack trace)
  - In `apps/studio/src/live-game.tsx` (per-game components):
    - `MemoryGame`, `SortingGame`, `SequenceGame` use streamed state from parent
    - Each shows a brief "Loading" placeholder during profile-swap reset
  - Add RED tests in `tests/studio-live-streaming.test.tsx`:
    - Frames update progress text
    - Profile-swap clears state (no leftover cards/items from previous profile)
    - RunError shows friendly error, not raw exception

  **Must NOT do**:
  - No keeping stale game state across profile swaps
  - No raw error messages shown to toddlers/parents
  - No infinite loading states (timeout + retry after 10s)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Live UI with streaming + state reset + error UX
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11, T13-T16)
  - **Blocks**: T15 (Mobile parity)
  - **Blocked By**: T6

  **References**:
  - **Pattern References**:
    - `apps/studio/src/live-game.tsx` — existing LiveGame dispatch + per-template components
    - `apps/studio/src/local-client.ts` — client interface with timeline events
  - **Test References**:
    - `tests/studio-asset-library.test.tsx` — live game test patterns

  **Acceptance Criteria**:
  - [ ] Live game shows progress during streamed assembly
  - [ ] Profile-swap clears state (test verifies zero leftover cards/items)
  - [ ] Errors shown friendly, no raw stack traces
  - [ ] `pnpm exec vitest run tests/studio-live-streaming.test.tsx` → PASS
  - [ ] `pnpm typecheck` → zero errors

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Streamed frames update progress text in Live App
    Tool: Playwright (browser)
    Preconditions: Studio dev server running, mock stream emits 3 frames
    Steps:
      1. Click "Assemble new game" in chat
      2. Wait 500ms
      3. Assert: .live-game-progress text changes through "Assembling" → "Generating assets" → "Ready"
    Expected Result: Progress reflects stream
    Evidence: .sisyphus/evidence/task-12-progress.png

  Scenario: Profile-swap clears stale state (no leftover cards/items)
    Tool: Playwright (browser)
    Preconditions: Memory game active with 6 cards visible
    Steps:
      1. Click "Swap to sorting" in profile menu
      2. Wait 500ms
      3. Assert: no .memory-card elements (DOM cleared)
      4. Assert: sorting bins appear
    Expected Result: Clean state after swap
    Evidence: .sisyphus/evidence/task-12-profile-swap.png

  Scenario: RunError shows user-friendly error, not stack trace
    Tool: Playwright (browser)
    Preconditions: Mock service returns RunError frame
    Steps:
      1. Trigger failing action
      2. Wait for error to surface
      3. Assert: .error-message text matches /^[A-Z][a-z]+/ (sentence, not "Error: stack trace")
      4. Assert: "Try again" button visible
    Expected Result: Friendly error UX
    Evidence: .sisyphus/evidence/task-12-error-ux.png
  ```

  **Commit**: YES
  - Message: `feat(studio): Live App streamed state updates + profile-swap reset + friendly errors`
  - Files: `apps/studio/src/live-game.tsx`, `tests/studio-live-streaming.test.tsx`
  - Pre-commit: `pnpm exec vitest run tests/studio-live-streaming.test.tsx`

- [x] 13. Studio tactile toddler interactions (tap targets, audio cues, error forgiveness)

  **What to do**:
  - In `apps/studio/src/live-game.tsx`:
    - All interactive elements (cards, bins, sequence items) have `min-width: 64px; min-height: 64px` (≥ 44px tap target with toddler-friendly buffer)
    - Tap detection uses `pointerdown`/`pointerup` with 200ms hold tolerance (toddlers often hold longer)
    - Mis-tap (drag > 10px before release) does NOT count as tap (forgiving)
  - Add audio cue system (CUE METADATA ONLY, not actual playback in this task):
    - `audioCueForEvent(kind: "success" | "error" | "reveal" | "complete"): { kind, volume, duration }`
    - Each game component emits cues at key moments
    - Cue consumption hook exposed for future audio playback (T15+ mobile will wire actual playback)
  - In `apps/studio/src/live-game.tsx` error forgiveness:
    - Failed match (Memory Game): card flips back after 1.5s, no penalty
    - Wrong bin (Sorting Game): item returns to source after 1s, gentle shake
    - Wrong sequence (Sequence Game): partial progress preserved
  - Add RED tests in `tests/studio-tactile.test.tsx`:
    - All interactive elements have ≥ 64px min size (computed style assertion)
    - Mis-tap (drag > 10px) does NOT trigger tap action
    - Failed match flips back after timeout, no score penalty
    - Wrong bin returns item to source
    - Audio cue metadata emitted at correct moments (mock listener)

  **Must NOT do**:
  - No actual audio file playback in this task (just cue metadata contract)
  - No hard penalties for mis-taps (toddlers will mis-tap constantly)
  - No reducing visual quality for accessibility (a11y is separate concern in T16)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Tactile UX for young children + cue system
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11, T12, T14-T16)
  - **Blocks**: T15 (Mobile can use the same cues for actual playback)
  - **Blocked By**: None (parallel to T11, T12)

  **References**:
  - **Pattern References**:
    - `apps/studio/src/live-game.tsx` — per-game components
    - `apps/studio/src/live-game.tsx` — interaction event handlers
  - **Test References**:
    - `tests/studio-asset-library.test.tsx` — existing live game test patterns

  **Acceptance Criteria**:
  - [ ] All interactive elements ≥ 64px × 64px
  - [ ] Mis-tap does not count
  - [ ] Failed match flips back, no penalty
  - [ ] Wrong bin returns item to source
  - [ ] Audio cue metadata emitted at success/error/reveal/complete
  - [ ] `pnpm exec vitest run tests/studio-tactile.test.tsx` → PASS
  - [ ] `pnpm typecheck` → zero errors

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: All interactive elements have ≥ 64px tap target
    Tool: Playwright (browser)
    Preconditions: Memory game loaded
    Steps:
      1. Query all .memory-card elements
      2. For each, get computed width and height
      3. Assert: all >= 64
    Expected Result: All cards toddler-friendly sized
    Evidence: .sisyphus/evidence/task-13-tap-targets.png

  Scenario: Mis-tap (drag > 10px before release) does not trigger card flip
    Tool: Playwright (browser)
    Preconditions: Memory game with unflipped cards
    Steps:
      1. Mouse down on card at (100, 100)
      2. Move to (115, 115) (15px drag)
      3. Mouse up
      4. Assert: card remains unflipped
    Expected Result: Drag treated as scroll, not tap
    Evidence: .sisyphus/evidence/task-13-mistap.png

  Scenario: Failed match flips cards back after 1.5s with no score change
    Tool: Playwright (browser)
    Preconditions: Memory game, two non-matching cards flipped
    Steps:
      1. Click two non-matching cards (flip them)
      2. Wait 1.6s
      3. Assert: both cards flipped back
      4. Assert: score unchanged
    Expected Result: No penalty for mis-matches
    Evidence: .sisyphus/evidence/task-13-forgive.png

  Scenario: Audio cue metadata emitted at success moment
    Tool: Playwright (browser)
    Preconditions: Mock cue listener attached
    Steps:
      1. Match two cards
      2. Assert: cue listener received { kind: "success", ... }
    Expected Result: Cue contract emits on success
    Evidence: .sisyphus/evidence/task-13-cue-success.txt
  ```

  **Commit**: YES
  - Message: `feat(studio): tactile toddler interactions + audio cue metadata + error forgiveness`
  - Files: `apps/studio/src/live-game.tsx`, `tests/studio-tactile.test.tsx`
  - Pre-commit: `pnpm exec vitest run tests/studio-tactile.test.tsx`

- [x] 14. Studio empty/edge states (loading, error, empty)

  **What to do**:
  - Create new component `apps/studio/src/states/EmptyState.tsx`:
    - Props: `{ icon: string, title: string, description: string, action?: { label: string, onClick: () => void } }`
    - Visual: centered icon + title + description + optional action button
    - a11y: `role="status"`, `aria-live="polite"`
  - Create new component `apps/studio/src/states/LoadingState.tsx`:
    - Props: `{ label: string }`
    - Shows spinner + label, max 10s before transitioning to error state
    - a11y: `role="status"`, `aria-busy="true"`, `aria-live="polite"`
  - Create new component `apps/studio/src/states/ErrorState.tsx`:
    - Props: `{ message: string, retry?: () => void, details?: string }`
    - Shows error icon + message + retry button (if provided)
    - Expandable "Show details" for technical info
    - a11y: `role="alert"`, `aria-live="assertive"`
  - Wire into `apps/studio/src/studio-app.tsx`:
    - Empty state when no profile assembled yet (with "Assemble your first game" CTA)
    - Loading state during initial catalog load
    - Error state if catalog fails to load (with retry)
    - Loading state during streamed assembly (T12)
  - Add RED tests in `tests/studio-states.test.tsx`:
    - EmptyState renders title/description/action
    - LoadingState shows spinner + label
    - LoadingState transitions to ErrorState after 10s timeout
    - ErrorState shows retry button when retry provided

  **Must NOT do**:
  - No infinite loading (always timeout to error)
  - No raw error stacks shown to user (only friendly message + collapsible details)
  - No hiding empty states behind "loading..." placeholders

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: New state components with a11y + integration into shell
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11-T13, T15, T16)
  - **Blocks**: T15 (Mobile gets same states)
  - **Blocked By**: None (parallel to T11-T13)

  **References**:
  - **Pattern References**:
    - `apps/studio/src/studio-app.tsx` — Studio shell to wire states into
    - `apps/studio/src/assets/empty-game-hero.png` — existing empty-state visual reference
  - **Test References**:
    - `tests/studio-ui.test.tsx` — existing component test patterns

  **Acceptance Criteria**:
  - [ ] 3 new state components created
  - [ ] Empty state shown when no profile
  - [ ] Loading state shown during catalog load
  - [ ] Error state shown on catalog load failure
  - [ ] Loading → Error transition after 10s timeout
  - [ ] `pnpm exec vitest run tests/studio-states.test.tsx` → PASS
  - [ ] `pnpm typecheck` → zero errors

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Empty state shows when no profile assembled
    Tool: Playwright (browser)
    Preconditions: Fresh Studio, no session
    Steps:
      1. Navigate to /?tab=live
      2. Assert: .empty-state visible with title "No game yet"
      3. Assert: action button "Assemble your first game" visible
    Expected Result: Empty state UX
    Evidence: .sisyphus/evidence/task-14-empty.png

  Scenario: Loading state shown during catalog load
    Tool: Playwright (browser)
    Preconditions: Mock slow catalog (2s delay)
    Steps:
      1. Navigate to /?tab=developer
      2. Within 100ms, assert: .loading-state visible with "Loading catalog..."
      3. Wait 2.5s
      4. Assert: catalog now loaded, .loading-state hidden
    Expected Result: Loading visible during fetch
    Evidence: .sisyphus/evidence/task-14-loading.png

  Scenario: Error state shown when catalog fetch fails
    Tool: Playwright (browser)
    Preconditions: Mock catalog fetch returns 500
    Steps:
      1. Navigate to /?tab=developer
      2. Wait for error
      3. Assert: .error-state visible
      4. Assert: "Retry" button visible
      5. Click Retry
      6. Assert: loading state appears again
    Expected Result: Error UX with retry
    Evidence: .sisyphus/evidence/task-14-error.png

  Scenario: Loading → Error transition after 10s timeout
    Tool: Playwright (browser)
    Preconditions: Mock catalog never resolves
    Steps:
      1. Navigate to /?tab=developer
      2. Wait 11s
      3. Assert: .error-state visible with "Loading took too long" message
    Expected Result: Timeout fallback
    Evidence: .sisyphus/evidence/task-14-timeout.png
  ```

  **Commit**: YES
  - Message: `feat(studio): empty/loading/error state components with a11y`
  - Files: `apps/studio/src/states/**`, `apps/studio/src/studio-app.tsx`, `tests/studio-states.test.tsx`
  - Pre-commit: `pnpm exec vitest run tests/studio-states.test.tsx`

- [x] 15. Mobile shell parity for new surfaces

  **What to do**:
  - Verify `apps/mobile-shell/src/mobile-client.ts` reuses Studio SSE transport (T6)
  - Verify Mobile Studio shell shows new surfaces:
    - MCP catalog browser (T11)
    - Run Inspector (T11)
    - Streamed live game updates (T12)
    - Tactile interactions (T13) — Mobile already has touch, but verify pointer events route correctly
    - Empty/loading/error states (T14)
    - Audio cue metadata (T13) — Mobile can wire actual playback here using platform audio
  - Add RED tests in `tests/mobile-shell.test.tsx`:
    - Mobile renders McpCatalogBrowser
    - Mobile receives SSE frames via shared client
    - Mobile shows empty state when no profile
    - Audio cue listener (mobile-platform) receives success/error/reveal/complete cues
    - Touch events trigger same interactions as Studio pointer events

  **Must NOT do**:
  - No creating a parallel mobile implementation path (must share contracts + client)
  - No mobile-specific shortcuts that bypass service ownership (T10)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Cross-platform parity verification + mobile audio wiring
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11-T14, T16)
  - **Blocks**: T20 (mobile in docs)
  - **Blocked By**: T11, T12, T13, T14

  **References**:
  - **Pattern References**:
    - `apps/mobile-shell/src/mobile-client.ts:8-13` — existing mobile client (uses Studio contract)
    - `apps/mobile-shell/src/App.tsx` — mobile shell root
  - **Test References**:
    - `tests/mobile-shell.test.tsx` — existing mobile test patterns

  **Acceptance Criteria**:
  - [ ] Mobile renders all new surfaces from T11-T14
  - [ ] Mobile receives SSE frames via shared client
  - [ ] Touch events trigger interactions
  - [ ] Mobile audio cue listener receives cues
  - [ ] `pnpm exec vitest run tests/mobile-shell.test.tsx` → PASS
  - [ ] `pnpm typecheck` → zero errors

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Mobile renders McpCatalogBrowser
    Tool: Playwright (mobile viewport)
    Preconditions: Mobile dev server running
    Steps:
      1. Set viewport: 390x844 (iPhone 14)
      2. Navigate to mobile app URL
      3. Switch to Developer tab
      4. Assert: .mcp-catalog-browser visible
      5. Assert: 7 tool cards visible (responsive layout may collapse to 1 column)
    Expected Result: Mobile shows catalog
    Evidence: .sisyphus/evidence/task-15-mobile-catalog.png

  Scenario: Mobile receives SSE frames via shared client
    Tool: Bash (pnpm exec vitest)
    Preconditions: Mock SSE stream
    Steps:
      1. Run: pnpm exec vitest run tests/mobile-shell.test.tsx -t "SSE parity"
      2. Assert: exit 0
    Expected Result: Mobile client streams
    Evidence: .sisyphus/evidence/task-15-mobile-sse.txt

  Scenario: Touch tap on mobile card triggers flip
    Tool: Playwright (mobile viewport)
    Preconditions: Memory game loaded on mobile
    Steps:
      1. dispatchTouchEvent tap on .memory-card
      2. Assert: card flipped
    Expected Result: Touch events work
    Evidence: .sisyphus/evidence/task-15-mobile-touch.png

  Scenario: Mobile audio cue listener receives success cue
    Tool: Bash (pnpm exec vitest)
    Preconditions: Mock listener attached
    Steps:
      1. Run: pnpm exec vitest run tests/mobile-shell.test.tsx -t "audio cue listener"
      2. Assert: exit 0
    Expected Result: Mobile receives cues
    Evidence: .sisyphus/evidence/task-15-mobile-cue.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile): parity for new surfaces (catalog, SSE, states, cues)`
  - Files: `apps/mobile-shell/src/**`, `tests/mobile-shell.test.tsx`
  - Pre-commit: `pnpm exec vitest run tests/mobile-shell.test.tsx`

- [ ] 16. Accessibility (keyboard, labels, contrast, focus, reduced-motion)

  **What to do**:
  - In all Studio components (T11-T14 work):
    - Every interactive element has `aria-label` or visible label
    - All buttons/links focusable via Tab; focus order matches visual order
    - Focus indicators: `outline: 2px solid #4A90E2` (visible against all backgrounds)
    - Color contrast ≥ 4.5:1 for text (verify with axe-core)
    - `prefers-reduced-motion`: disable non-essential animations (transitions on cards, profile swap)
  - In all interactive game components (T13):
    - Keyboard alternatives to tap: Space/Enter on focused card flips it
    - Screen reader announces game events ("Memory match found!", "Try again")
  - Add RED tests in `tests/studio-accessibility.test.tsx`:
    - All interactive elements have `aria-label` or text content
    - Tab order is correct (focus moves left→right, top→bottom)
    - `prefers-reduced-motion: reduce` disables transitions
    - Axe-core scan finds zero critical violations on Developer + Live tabs

  **Must NOT do**:
  - No removing visible labels for "cleaner" design
  - No motion-only feedback (always have non-motion alternative)
  - No color-only state indication (use icons + text)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Cross-cutting a11y pass with axe-core verification
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11-T15)
  - **Blocks**: F3 (QA checks a11y)
  - **Blocked By**: T11, T12, T13, T14, T15

  **References**:
  - **Pattern References**:
    - All new components from T11-T15
  - **Test References**:
    - axe-core: `@axe-core/playwright` or vitest-axe
  - **External References**:
    - WCAG 2.1 AA: contrast, keyboard, labels, reduced-motion

  **Acceptance Criteria**:
  - [ ] Zero critical axe-core violations
  - [ ] All interactive elements keyboard-reachable
  - [ ] Focus indicators visible
  - [ ] `prefers-reduced-motion` respected
  - [ ] `pnpm exec vitest run tests/studio-accessibility.test.tsx` → PASS
  - [ ] `pnpm typecheck` → zero errors

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: All interactive elements have aria-label or visible text
    Tool: Playwright + axe-core
    Preconditions: Studio loaded
    Steps:
      1. Run axe-core scan on Developer tab
      2. Assert: zero violations of "aria-label-required" or "label-required"
    Expected Result: No a11y violations
    Evidence: .sisyphus/evidence/task-16-axe.txt

  Scenario: Tab order matches visual order
    Tool: Playwright (keyboard navigation)
    Preconditions: Developer tab open
    Steps:
      1. Focus first interactive element (Tab)
      2. Assert: focused element matches first in visual order
      3. Tab 5 times
      4. Assert: each focused element matches next visual position
    Expected Result: Logical tab order
    Evidence: .sisyphus/evidence/task-16-tab-order.txt

  Scenario: prefers-reduced-motion: reduce disables transitions
    Tool: Playwright (emulate media)
    Preconditions: Live game loaded
    Steps:
      1. Emulate: prefers-reduced-motion: reduce
      2. Trigger card flip
      3. Assert: card flips instantly (transition-duration: 0s)
    Expected Result: Motion reduced
    Evidence: .sisyphus/evidence/task-16-reduced-motion.png

  Scenario: Keyboard activates memory card flip
    Tool: Playwright (keyboard navigation)
    Preconditions: Memory game loaded, first card focused
    Steps:
      1. Press Space
      2. Assert: first card flipped
    Expected Result: Keyboard works
    Evidence: .sisyphus/evidence/task-16-keyboard.txt
  ```

  **Commit**: YES
  - Message: `feat(studio+mobile): accessibility pass (keyboard, labels, contrast, focus, reduced-motion)`
  - Files: All Studio/Mobile components touched in T11-T15, `tests/studio-accessibility.test.tsx`
  - Pre-commit: `pnpm exec vitest run tests/studio-accessibility.test.tsx`

### Wave 4 — Integration + Examples (4 tasks)

- [ ] 17. MCP HTTP endpoints (GET /catalog, POST /tools/list, POST /tools/call)

  **What to do**:
  - In `packages/service/src/http-server.ts`:
    - Add `GET /playcraft/catalog`:
      - Returns `BuilderCatalog` with `mcp` field populated by T4 adapter
      - Content-Type: application/json
      - Validates ownership policy (`PLAYCRAFT_MCP_GUARDRAILS` is active)
    - Add `POST /playcraft/tools/list`:
      - Returns array of `McpTool` (from manifest)
      - Optional `?include=` filter
    - Add `POST /playcraft/tools/call`:
      - Body: `{ name: string, arguments: object }`
      - Calls `invokeMcpTool` (from T4)
      - Returns `BuilderServiceResponse` JSON
      - Validates: name must be in allowlist; arguments must validate against tool schema
      - Validates: ownership check (T10) — caller's sessionId (in header) must own the target session
      - On session expired: returns 401 with `{ kind: "session-expired" }`
      - On allowlist violation: returns 403 with `{ kind: "tool-not-allowed" }`
  - Document endpoints in `playcraft-agentic-framework/MCP_API.md`:
    - List all routes, methods, request/response shapes, error codes
    - Example curl invocations
  - Add RED tests in `packages/service/test/mcp-endpoints.test.ts`:
    - GET /playcraft/catalog returns valid BuilderCatalog
    - POST /playcraft/tools/list returns McpTool array
    - POST /playcraft/tools/call invokes assemble-game successfully
    - POST /playcraft/tools/call with non-allowlisted name returns 403
    - POST /playcraft/tools/call with expired session returns 401
    - POST /playcraft/tools/call with invalid args returns 400

  **Must NOT do**:
  - No MCP auth flows (no API keys, OAuth, tokens)
  - No bypassing allowlist
  - No silent acceptance of malformed requests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: HTTP endpoints + ownership/allowlist enforcement + docs
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T18, T19, T20)
  - **Blocks**: F1-F4 (final QA), T20 (docs reference these)
  - **Blocked By**: T4, T10

  **References**:
  - **Pattern References**:
    - `packages/service/src/http-server.ts:95-152` — existing route patterns
    - `packages/service/src/index.ts:629-656` — request envelope handling
  - **Test References**:
    - `packages/service/test/local-service.test.ts` — service test patterns
  - **External References**:
    - HTTP semantics: 200/400/401/403 status codes

  **Acceptance Criteria**:
  - [ ] 3 MCP HTTP endpoints added
  - [ ] Allowlist + ownership enforced
  - [ ] `MCP_API.md` documents all endpoints
  - [ ] `pnpm exec vitest run packages/service/test/` → PASS
  - [ ] `pnpm typecheck` → zero errors

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: GET /playcraft/catalog returns valid BuilderCatalog
    Tool: Bash (curl)
    Preconditions: Service running
    Steps:
      1. Start: pnpm exec playcraft-service-http &
      2. curl -i http://127.0.0.1:8787/playcraft/catalog
      3. Assert: HTTP 200, Content-Type: application/json
      4. Assert: response.mcp.tools.length = 7
      5. Kill background process
    Expected Result: Catalog endpoint works
    Evidence: .sisyphus/evidence/task-17-catalog-endpoint.txt

  Scenario: POST /playcraft/tools/call invokes assemble-game successfully
    Tool: Bash (curl)
    Preconditions: Service running
    Steps:
      1. Start: pnpm exec playcraft-service-http &
      2. curl -X POST http://127.0.0.1:8787/playcraft/tools/call -H "Content-Type: application/json" -d '{"name":"assemble-game","arguments":{"templateId":"template.memory-match"}}'
      3. Assert: HTTP 200, response.kind matches expected
      4. Kill background process
    Expected Result: Tool call works
    Evidence: .sisyphus/evidence/task-17-tool-call.txt

  Scenario: POST /playcraft/tools/call with non-allowlisted name returns 403
    Tool: Bash (curl)
    Preconditions: Service running
    Steps:
      1. Start: pnpm exec playcraft-service-http &
      2. curl -X POST http://127.0.0.1:8787/playcraft/tools/call -H "Content-Type: application/json" -d '{"name":"evil-tool","arguments":{}}'
      3. Assert: HTTP 403, response.kind === "tool-not-allowed"
      4. Kill background process
    Expected Result: Allowlist enforced
    Evidence: .sisyphus/evidence/task-17-allowlist-403.txt

  Scenario: POST /playcraft/tools/call with expired session returns 401
    Tool: Bash (curl)
    Preconditions: Service running, session expired
    Steps:
      1. Start: pnpm exec playcraft-service-http &
      2. curl -X POST http://127.0.0.1:8787/playcraft/tools/call -H "Content-Type: application/json" -H "X-Session-Id: expired-session" -d '{"name":"update-game","arguments":{"templateId":"template.memory-match"}}'
      3. Assert: HTTP 401, response.kind === "session-expired"
      4. Kill background process
    Expected Result: Ownership enforced
    Evidence: .sisyphus/evidence/task-17-expired-401.txt
  ```

  **Commit**: YES
  - Message: `feat(service): MCP HTTP endpoints (catalog/tools-list/tools-call) with ownership + allowlist`
  - Files: `packages/service/src/http-server.ts`, `packages/service/test/mcp-endpoints.test.ts`, `playcraft-agentic-framework/MCP_API.md`
  - Pre-commit: `pnpm exec vitest run packages/service/test/`

- [ ] 18. Workflow integration with `handleLocalServiceRequestBatch`

  **What to do**:
  - In `packages/service/src/index.ts`:
    - Add new action `execute-workflow` to `BuilderServiceCatalogActionSchema`
    - Wire `handleLocalServiceRequestBatch` to dispatch workflow actions to `executeWorkflow()` (from T7)
    - For each node in the workflow, emit a corresponding AG-UI `ToolCall`/`ToolResult` frame (using SSE from T5)
  - In `packages/service/src/cli.ts`:
    - Add `playcraft-service run-workflow <graph.json>` CLI command for human testing
  - Add RED tests in `packages/service/test/workflow-integration.test.ts`:
    - CLI loads graph JSON and executes
    - Service handles `execute-workflow` action in batch
    - AG-UI frames emitted during workflow execution
    - Workflow failure surfaces as `RunError` frame

  **Must NOT do**:
  - No auto-executing workflows on service startup
  - No swallowing workflow errors (must surface)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Cross-package integration + AG-UI frame emission + CLI
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T17, T19, T20)
  - **Blocks**: F1-F4, T20 (docs)
  - **Blocked By**: T7

  **References**:
  - **Pattern References**:
    - `packages/service/src/index.ts:629-656` — existing batch handling
    - `packages/service/src/cli.ts:374-402` — existing CLI catalog rendering
  - **Test References**:
    - `packages/service/test/local-service.test.ts` — service test patterns

  **Acceptance Criteria**:
  - [ ] `execute-workflow` action added to catalog
  - [ ] CLI command `playcraft-service run-workflow` works
  - [ ] AG-UI frames emitted during workflow
  - [ ] `pnpm exec vitest run packages/service/test/` → PASS
  - [ ] `pnpm typecheck` → zero errors

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: CLI loads workflow JSON and executes
    Tool: Bash (CLI + jq)
    Preconditions: Fixture graph file
    Steps:
      1. Create /tmp/workflow.json with linear assemble → preview → export
      2. pnpm exec playcraft-service run-workflow /tmp/workflow.json
      3. Assert: exit 0, output shows 3 node executions
    Expected Result: CLI works
    Evidence: .sisyphus/evidence/task-18-cli-workflow.txt

  Scenario: execute-workflow action in batch emits AG-UI frames
    Tool: Bash (pnpm exec vitest)
    Preconditions: Mock frame listener
    Steps:
      1. Run: pnpm exec vitest run packages/service/test/workflow-integration.test.ts -t "AG-UI frames"
      2. Assert: exit 0
    Expected Result: Frames emitted per node
    Evidence: .sisyphus/evidence/task-18-frames.txt

  Scenario: Workflow failure surfaces as RunError frame
    Tool: Bash (pnpm exec vitest)
    Preconditions: Mock node throws
    Steps:
      1. Run: pnpm exec vitest run packages/service/test/workflow-integration.test.ts -t "error frame"
      2. Assert: exit 0, RunError frame received
    Expected Result: Errors surfaced
    Evidence: .sisyphus/evidence/task-18-error-frame.txt
  ```

  **Commit**: YES
  - Message: `feat(service): execute-workflow action + CLI + AG-UI frame emission`
  - Files: `packages/service/src/index.ts`, `packages/service/src/cli.ts`, `packages/service/test/workflow-integration.test.ts`
  - Pre-commit: `pnpm exec vitest run packages/service/test/`

- [ ] 19. Custom template assembly recipes

  **What to do**:
  - In `packages/packs/src/index.ts`:
    - Add `customTemplateRecipes: AssemblyRecipe[]` array
    - Provide 3 example recipes:
      - "Custom toy memory": `template.custom.toy-memory` with toys theme, paired card sprites
      - "Custom dolphin sorting": `template.custom.dolphin-sorting` with ocean animals, color bins
      - "Custom fruit sequence": `template.custom.fruit-sequence` with fruits, ordinal sprites
    - Each recipe is a complete template definition that passes the existing schema
  - Add `examples/profiles/custom-toy-memory.json` etc. as exported fixtures
  - Add RED tests in `packages/packs/test/custom-templates.test.ts`:
    - All 3 recipes parse and assemble successfully
    - Each recipe can be exported + imported + replayed
    - Custom namespace enforced

  **Must NOT do**:
  - No removing existing MVP templates (only add custom recipes alongside)
  - No changing bundled template IDs

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Template authoring + fixtures + integration with existing packs
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T17, T18, T20)
  - **Blocks**: F1-F4, T20
  - **Blocked By**: T8

  **References**:
  - **Pattern References**:
    - `packages/packs/src/index.ts:267-770` — existing template definitions
    - `examples/profiles/memory-match.json` — exported profile structure
  - **Test References**:
    - `packages/packs/test/mvp-profiles.test.ts` — existing template test patterns

  **Acceptance Criteria**:
  - [ ] 3 custom recipes defined
  - [ ] 3 example profile fixtures added
  - [ ] `pnpm exec vitest run packages/packs/test/` → PASS
  - [ ] `pnpm typecheck` → zero errors

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: All 3 custom recipes assemble successfully
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test exists
    Steps:
      1. Run: pnpm exec vitest run packages/packs/test/custom-templates.test.ts -t "recipes assemble"
      2. Assert: exit 0, all 3 recipes pass
    Expected Result: Recipes work
    Evidence: .sisyphus/evidence/task-19-recipes.txt

  Scenario: Custom recipe exports + imports + replays
    Tool: Bash (pnpm exec vitest)
    Preconditions: Round-trip test exists
    Steps:
      1. Run: pnpm exec vitest run packages/packs/test/custom-templates.test.ts -t "round-trip"
      2. Assert: exit 0
    Expected Result: Round-trip works
    Evidence: .sisyphus/evidence/task-19-roundtrip.txt

  Scenario: Custom namespace enforced on recipes
    Tool: Bash (pnpm exec vitest)
    Preconditions: RED test exists
    Steps:
      1. Run: pnpm exec vitest run packages/packs/test/custom-templates.test.ts -t "namespace"
      2. Assert: exit 0
    Expected Result: Namespace enforced
    Evidence: .sisyphus/evidence/task-19-namespace.txt
  ```

  **Commit**: YES
  - Message: `feat(packs): add custom template assembly recipes + example fixtures`
  - Files: `packages/packs/src/index.ts`, `examples/profiles/custom-*.json`, `packages/packs/test/custom-templates.test.ts`
  - Pre-commit: `pnpm exec vitest run packages/packs/test/`

- [ ] 20. Tool composition examples + docs

  **What to do**:
  - Create `examples/workflows/`:
    - `assemble-preview-export.json` — basic 3-node workflow
    - `assemble-with-custom-template.json` — uses custom namespace
    - `parallel-assemble-three.json` — demonstrates parallel execution (3 simultaneous assembles)
    - `conditional-export-only-on-success.json` — conditional skip pattern
  - Create `playcraft-agentic-framework/WORKFLOWS.md`:
    - Overview of workflow graph shape
    - Examples for each pattern (linear, parallel, conditional, error-handling)
    - How to run via CLI: `playcraft-service run-workflow`
    - How to invoke via MCP: POST /playcraft/tools/call with `execute-workflow`
    - Best practices (keep graphs small, prefer linear, use continueOnError sparingly)
  - Update `playcraft-agentic-framework/README.md`:
    - New section: "Using Playcraft as an Agent Backend"
    - Link to `MCP_API.md`, `WORKFLOWS.md`, `AGENT_SAFETY.md`
  - Update `playcraft-agentic-framework/DEV_GUIDE.md`:
    - New section: "Building Custom Templates and Workflows"
    - Link to custom template examples
  - Add RED tests in `tests/workflow-examples.test.ts`:
    - Each example workflow JSON parses against `WorkflowGraphSchema`
    - Each example runs without error (CLI execution)

  **Must NOT do**:
  - No tutorial-style prose (concise reference docs only)
  - No markdown that bloats with marketing language (keep factual)
  - No documenting features that don't exist yet

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation + example fixtures + verification tests
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T17, T18, T19)
  - **Blocks**: F1-F4
  - **Blocked By**: T7, T8, T17, T18, T19

  **References**:
  - **Pattern References**:
    - `examples/profiles/*.json` — existing example fixture style
    - `playcraft-agentic-framework/ARCHITECTURE.md` — existing doc style
    - `playcraft-agentic-framework/PRD.md` — existing doc style
  - **Test References**:
    - `tests/import-light-and-scans.test.ts` — example validation pattern

  **Acceptance Criteria**:
  - [ ] 4 example workflow JSONs created
  - [ ] `WORKFLOWS.md` written
  - [ ] `README.md` updated
  - [ ] `DEV_GUIDE.md` updated
  - [ ] `pnpm exec vitest run tests/workflow-examples.test.ts` → PASS
  - [ ] `pnpm typecheck` → zero errors

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: All example workflow JSONs parse against WorkflowGraphSchema
    Tool: Bash (pnpm exec vitest)
    Preconditions: Workflow schema exists (T1)
    Steps:
      1. Run: pnpm exec vitest run tests/workflow-examples.test.ts -t "parses"
      2. Assert: exit 0, all 4 examples pass
    Expected Result: Examples valid
    Evidence: .sisyphus/evidence/task-20-examples-parse.txt

  Scenario: Each example workflow runs without error via CLI
    Tool: Bash (CLI)
    Preconditions: Service running
    Steps:
      1. For each of 4 examples, run: pnpm exec playcraft-service run-workflow examples/workflows/<file>
      2. Assert: all exit 0
    Expected Result: Examples executable
    Evidence: .sisyphus/evidence/task-20-examples-run.txt

  Scenario: WORKFLOWS.md mentions all 4 patterns
    Tool: Bash (grep)
    Preconditions: Doc file exists
    Steps:
      1. grep -E "(linear|parallel|conditional|error)" playcraft-agentic-framework/WORKFLOWS.md | wc -l
      2. Assert: output >= 8 (each pattern mentioned at least twice)
    Expected Result: Doc covers patterns
    Evidence: .sisyphus/evidence/task-20-docs.txt
  ```

  **Commit**: YES
  - Message: `docs: tool composition examples + WORKFLOWS.md + README/DEV_GUIDE updates`
  - Files: `examples/workflows/*`, `playcraft-agentic-framework/WORKFLOWS.md`, `playcraft-agentic-framework/README.md`, `playcraft-agentic-framework/DEV_GUIDE.md`, `tests/workflow-examples.test.ts`
  - Pre-commit: `pnpm exec vitest run tests/workflow-examples.test.ts`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.
> Never mark F1-F4 as checked before getting user's okay. Rejection or user feedback → fix → re-run → present again → wait for okay.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns (hosted-provider markers, mcp auth, runtime replay validation, hardcoded asset IDs in new code, etc.) — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm typecheck` + `pnpm exec vitest run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify TDD discipline (RED tests exist before GREEN impl).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Agent-Executed QA** — `unspecified-high` (split by surface, run in parallel)
  4 parallel QA tasks (each is a separate sub-agent):
  - **F3a**: Studio local transport (StudioClient + SSE timeline + Run Inspector + empty states + tactile)
  - **F3b**: Studio HTTP transport (curl MCP endpoints, real OpenAI-style agent call sequence: list → call → observe)
  - **F3c**: Mobile shell parity (mobile gets all surfaces, touch + audio cues)
  - **F3d**: Service streaming/workflow (SSE frames, workflow execution, custom template round-trip, asset catalog discovery)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (`git log`/`git diff`). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes. Specifically verify Server-Ready Retrieval stayed OUT (no real remote providers, no auth/db/network code).
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | Server-Ready [OUT/IN] | VERDICT`

---

## Commit Strategy

- T1, T2, T3: each is its own commit (Wave 1 sequential)
- Wave 2 (T4-T10): each task is its own commit (parallel; one commit per task)
- Wave 3 (T11-T16): each task is its own commit
- Wave 4 (T17-T20): each task is its own commit
- Total: ~24 commits, each independently revertable

Pre-commit for every commit:
- `pnpm typecheck` → zero errors
- `pnpm exec vitest run <changed-package-or-test-path>` → PASS

---

## Success Criteria

### Verification Commands

```bash
pnpm typecheck                                              # Expected: zero errors
pnpm exec vitest run                                        # Expected: ~550 tests, all PASS (350 existing + ~200 new)
pnpm exec vitest run packages/contracts/test/               # Expected: PASS (all schemas including MCP/SSE/workflow)
pnpm exec vitest run packages/mcp/test/                     # Expected: PASS (MCP adapter)
pnpm exec vitest run packages/service/test/                 # Expected: PASS (SSE + workflow + MCP endpoints + ownership)
pnpm exec vitest run packages/builder/test/                 # Expected: PASS (custom templates)
pnpm exec vitest run packages/packs/test/                   # Expected: PASS (MVP + custom recipes)
pnpm exec vitest run packages/assets/test/                  # Expected: PASS (catalog discovery + merge)
pnpm exec vitest run tests/                                 # Expected: PASS (integration + UI + mobile + SSE client + states + tactile + accessibility + workflow examples)
pnpm exec playcraft-service-http &                          # Start service
curl -i http://127.0.0.1:8787/health                        # Expected: HTTP 200, kind: "builder-service-health"
curl -i http://127.0.0.1:8787/playcraft/catalog             # Expected: HTTP 200, response.mcp.tools.length = 7
curl -i http://127.0.0.1:8787/playcraft/stream -H "Accept: text/event-stream" --max-time 2  # Expected: text/event-stream content type
```

### Final Checklist

- [ ] All "Must Have" present (MCP discovery, SSE streaming, SSE client, workflow, custom templates, asset catalog, session ownership, Developer panel, Live App streamed, tactile, empty/edge states, accessibility, test coverage)
- [ ] All "Must NOT Have" absent (no hosted-provider markers, no remote providers, no auth/db/network, no filename auto-discovery, no runtime validation outside contracts, no hardcoded asset IDs, no marketing polish over usability)
- [ ] Server-Ready Retrieval stays OUT (verified by F4 scope fidelity)
- [ ] All tests pass (~550 total)
- [ ] `pnpm typecheck` clean
- [ ] MCP HTTP endpoints respond with correct status codes (200/400/401/403)
- [ ] Custom template `template.custom.*` namespace enforced
- [ ] Asset catalog discovery requires `catalog.json` (no filename auto-discovery)
- [ ] Studio tap targets ≥ 64px × 64px
- [ ] Audio cue metadata emitted at success/error/reveal/complete
- [ ] Empty/loading/error states present on every shell surface
- [ ] Zero critical axe-core a11y violations
- [ ] `prefers-reduced-motion` respected
- [ ] F1-F4 all APPROVE
- [ ] User gives explicit "okay" on F1-F4 consolidated results

### Anti-Pattern Self-Check

- [ ] No silent profile repair (fail-closed maintained)
- [ ] No marketing copy over real usability (polish is functional, not cosmetic)
- [ ] No scope inflation into Server-Ready Retrieval
- [ ] No general DAG engine (workflow stays service-request-node-based)
- [ ] No MCP auth flows
- [ ] No filename-based asset auto-discovery
- [ ] No duplication of schema checks outside `@playcraft/contracts`
- [ ] No bundled-only theme dependencies (catalog discovery is open)
- [ ] No session-bound shortcuts that don't propagate to all surfaces
- [ ] No hardcoded asset IDs in new code