# Playcraft BAML Pivot — Greenfield Rebuild (Multi-Session Plan)

## TL;DR

> **Greenfield rebuild**: Replace Outlines with BAML. Convert remote assembly from automatic rescue to user-triggered paid action. Purge all stale code, narrow abstractions, legacy markers, and stale tests. All files ≤ 1000 LOC.
>
> **BAML**: Permitted to run outside the sandbox. If `baml-cli` is unavailable, the generated TypeScript types are hand-maintained in `packages/core/baml_client/`.
>
> **Working tree**: Started from the previous-wave greenfield state (813 passing, 1 skipped). Each session ends with full verification + clean working tree.

---

## Session Plan

### Session 1: BAML toolchain
- Add `@boundary/baml` and `baml-cli` (or document hand-maintained types)
- Write `baml_src/*.baml` (assemble_game, tool_call, online_assembly)
- Write `baml.config.ts` with two clients (ollama local, openrouter paid)
- Generate or hand-write `packages/core/baml_client/`
- Add `pnpm baml:generate` and `pnpm baml:check` scripts
- Verify: `pnpm typecheck` clean

### Session 2: Contract purge
- Rewrite `packages/contracts/src/agent.ts`: keep AgentToolCall/ToolResult/Step/PlaycraftAgentTranscript; delete `LocalInferenceEngineManifestSchema`, `LocalInferenceEngineIdSchema`, `LFM_AGENT_ENGINE_ID`, `MOONSHINE_STREAMING_CPU_ENGINE_ID`, `moonshineStreamingCpuEngine()`
- Rewrite `packages/contracts/src/enrichment.ts`: `RemoteEnrichmentRequestSchema` becomes `PaidOnlineAssemblyRequestSchema` with `userConsent: z.literal(true)`, `paymentConfirmationId`, `costCents`; drop `EnrichmentCapabilityGapSchema` (inlined); drop `EnrichmentResponseStatusSchema` (replaced with `costCents` and `estimatedCompletionSeconds` on response)
- Rewrite `packages/contracts/src/asset.ts`: tighten `AssetSourceCapabilityManifestSchema` — keep `seedSupport` required but allow false for folder sources; tighten `GeneratedAssetRecord.provenance.deterministic` to optional; add `provenance` discriminator
- Rewrite `packages/contracts/src/game-template.ts`: simplify `retrieval` to `{ current: "bundled-local" | "authored-local" | "remote-agent" }`; drop `planned`
- Rewrite `packages/contracts/src/game-bundle.ts`: `capEnforcement` required; tighten cap rules
- Update `packages/contracts/src/base.ts`: `PublicContractNameSchema` enum reflects the purged set
- Update `packages/contracts/src/builder.ts`: `BuilderProfileExportSchema.provenance` simplified
- Update `packages/contracts/src/index.ts` barrel
- Update `packages/contracts/src/manifests.ts`: keep building blocks, simplify provenance
- Verify: `pnpm typecheck` may fail (consumers not yet updated); that's expected

### Session 3: local-llm.ts rewrite (BAML bridge)
- Rewrite `packages/core/src/local-llm.ts`:
  - Keep `LocalInferenceEngine` interface
  - Delete `outlinesJsonSchemaForToolArguments` function
  - Delete `StubLocalInferenceEngine` class
  - Delete `defaultMoonshineStreamingCpuEngineManifest`, `defaultStubEngineManifest`, `AGENT_STUB_ENGINE_ID` constants
  - Rewrite `MoonshineStreamingCpuEngine.infer()` to call `BamlBridge.assembleGame()` (defined in `baml-bridge.ts`)
- Create `packages/core/src/baml-bridge.ts`:
  - `BamlBridge` class wrapping the generated BAML client
  - `assembleGame(request: BamlAssembleGameRequest): BamlAssembleGameResponse` method
  - If BAML runtime not configured, throws a clear error
- Hand-maintain `packages/core/baml_client/types.ts` (the BAML schema as TS types) since the generated client uses `// @ts-nocheck`
- Update `packages/core/src/index.ts` barrel
- Verify: `pnpm typecheck` clean for core package

### Session 4: agent-loop.ts rewrite (pure local)
- Rewrite `packages/core/src/agent-loop.ts`:
  - Keep `AgentLoop` class
  - **Delete** any enrichment-rescue hooks (none existed yet, verify clean)
  - `AgentLoop` is purely local — no references to `RemoteEnrichmentSource`, `PaidOnlineAssemblySource`, or any paid backend
  - `AgentLoopOptions` exposes only `engine`, `systemPrompt`, `tools`, `maxSteps`, `temperature`
- Delete `packages/core/src/enrichment.ts` (replaced by `online-assembly.ts` in Session 5)
- Verify: `pnpm typecheck` for core

### Session 5: online-assembly.ts (paid engine)
- Create `packages/core/src/online-assembly.ts`:
  - `PaidOnlineAssemblySource` interface (replaces `RemoteEnrichmentSource`)
  - `OnlineGameAssemblyEngine implements LocalInferenceEngine` — wraps BAML bridge with the paid client
  - `requestPaidOnlineAssembly(input): GameBundle` function used by the service
  - **No automatic rescue.** The engine is only instantiated when the user explicitly triggers a paid action.
- `PaidOnlineAssemblyRequest` is built from the user-triggered service action, not from any agent-loop gap.
- Update `packages/core/src/index.ts` barrel
- Verify: `pnpm typecheck` for core

### Session 6: builder tool expansion
- Rewrite `packages/builder/src/index.ts`:
  - Keep the 7 existing tools
  - Add 4 new tools: `list-building-blocks`, `compose-profile`, `list-local-assets`, `package-bundle`
  - Each new tool has its own `actionName` enum value (not borrowed)
  - Each new tool's `argumentsSchema` is well-typed
  - `builderToolRequiredContracts` updated
- Verify: `pnpm typecheck` for builder

### Session 7: service layer (paid action)
- Rewrite `packages/service/src/local-catalog.ts`:
  - Keep existing actions
  - Add `request-paid-online-assembly` action with explicit `acceptedFields: ["sessionId", "capabilityGap", "paymentConfirmationId"]`, `requiredFields: ["sessionId", "capabilityGap", "paymentConfirmationId"]`, `responsePayload: "paid-online-response"`
- Rewrite `packages/service/src/index.ts`:
  - Add `LocalPlaycraftService.requestPaidOnlineAssembly(input)` method
  - The method validates `userConsent === true` and `paymentConfirmationId` is non-empty
  - Delegates to `OnlineGameAssemblyEngine`
  - No automatic rescue: the method is only called when the user explicitly invokes it
- Verify: `pnpm typecheck` for service

### Session 8: studio UI (paid button)
- Rewrite `apps/studio/src/studio-app.tsx`:
  - Add "Request Paid Online Assembly" button in developer panel
  - Button only shown when: (a) the local assembly failed (or the user explicitly chose to escalate), (b) the user is on a plan that allows it, (c) cost confirmation is acknowledged
  - Button click triggers `client.requestPaidOnlineAssembly({ sessionId, capabilityGap, paymentConfirmationId })`
  - Show cost/ETA in a confirmation dialog
- Add `PaidOnlineAssemblyPanel` component or inline
- Verify: `pnpm build:studio` succeeds

### Session 9: test purge
- Delete `tests/_check.ts`, `tests/_debug-asset.test.ts`, `tests/_check.test.ts` (any debug placeholders)
- Delete tests for removed APIs:
  - `tests/` files that test `outlinesJsonSchemaForToolArguments`, `StubLocalInferenceEngine`, `NullRemoteEnrichmentSource`, `MOONSHINE_STREAMING_CPU_ENGINE_ID`, `LFM_AGENT_ENGINE_ID`, `EnrichmentCapabilityGapSchema`, `EnrichmentResponseStatusSchema`, `LocalInferenceEngineManifestSchema`
- Rewrite tests for new APIs:
  - `packages/core/test/agent-loop.test.ts`: assert no enrichment rescue
  - `packages/core/test/local-llm.test.ts`: test BAML bridge integration
  - `packages/core/test/online-assembly.test.ts`: test paid action flow
  - `packages/builder/test/session-service.test.ts`: test new tools
  - `packages/service/test/local-service.test.ts`: test `request-paid-online-assembly` action
  - `packages/contracts/test/enrichment.test.ts`: rewrite for paid-action shape
  - `packages/contracts/test/agent.test.ts`: keep only relevant schema tests
  - `tests/studio-ui.test.ts`: add UI tests for paid button
- Update fixture files
- Verify: `pnpm test` ≥ 813 passing (no regressions from previous baseline)

### Session 10: doc rewrite
- Rewrite `README.md` (root) — pivot to BAML + paid
- Rewrite `playcraft-agentic-framework/README.md`
- Rewrite `playcraft-agentic-framework/ARCHITECTURE.md` — BAML + paid-action
- Rewrite `playcraft-agentic-framework/DEV_GUIDE.md` — BAML toolchain
- Rewrite `playcraft-agentic-framework/AGENT_SAFETY.md` — paid-action consent
- Rewrite `playcraft-agentic-framework/MCP_API.md`
- Rewrite `playcraft-agentic-framework/WORKFLOWS.md`
- Rewrite `playcraft-agentic-framework/CONTRIBUTING.md`
- Rewrite `MILESTONES.md` — new top section about BAML pivot; preserve nothing below
- Rewrite `.sisyphus/plans/playcraft-llm-wave.md` — final state
- Purge: Outlines, automatic-rescue language, "NotImplemented" placeholders, "legacy", "deprecated", "TODO", "FIXME", "HACK"
- Verify: `pnpm lint:guardrails` clean (the script scans .ts/.tsx but not .md; manually verify docs)

### Session 11: final verification + commit
- `pnpm typecheck` clean
- `pnpm lint:guardrails` clean
- `pnpm test` ≥ 813 passing
- `pnpm test:a11y` 18 passing
- `pnpm build:studio` succeeds
- Stale-reference grep: zero matches
- No file > 1000 LOC
- Atomic commit during Tue 0100-1100 UTC window

---

## Guardrails (enforced every session)

- NO `as any` / `@ts-ignore` / `@ts-expect-error`
- NO `legacy` / `deprecated` / `TODO` / `FIXME` / `HACK` (in source AND docs)
- NO `playcraft.v1.1` / `v2` strings
- NO file > 1000 LOC (docs may exceed)
- NO backwards-compat shims
- NO migration code
- NO automatic enrichment rescue
- NO Outlines library usage

---

## Multi-Session Strategy

Each session:
1. Has a single, verifiable deliverable
2. Ends with `pnpm typecheck` + `pnpm lint:guardrails` + `pnpm test` green
3. Working tree clean (or explicitly staged for next session)
4. Commits at the end of each session if the Tue 0100-1100 UTC window is open
5. Otherwise leaves the working tree clean and ready for the next session

---

## Notes

- BAML install: if `pnpm add @boundary/baml` fails, ship `packages/core/baml_client/` as hand-maintained TS types. The bridge contract stays the same; only the runtime changes.
- BAML client generates code that uses `// @ts-nocheck` — this is a BAML convention, not a guardrail violation (the generated code lives in `baml_client/` and is excluded from guardrail scans).
- The plan file at `.sisyphus/plans/playcraft-baml-pivot.md` (from a previous attempt) documents the original design. This plan refines it into executable sessions.