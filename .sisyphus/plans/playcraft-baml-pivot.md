# Playcraft BAML Pivot + Greenfield Purge — Architectural Pivot

## TL;DR

> **Pivot**: Replace Outlines with [BAML](https://github.com/BoundaryML/baml) as the constrained-output runtime for the local LLM. Remove automatic enrichment rescue from the agent loop. Make remote assembly a **user-initiated paid action** (`request-paid-online-assembly`) with explicit consent/cost surface, not a silent fallback.
>
> **Greenfield purge**: No backwards compat, no migration code, no narrow brownfield abstractions, no stale code, no v1.1/v2 schema strings, no god files > 1000 LOC. Forward-only.

---

## Context

### Current state (to be torn down)

The previous wave implemented a local LLM agent loop (`AgentLoop` + `LocalInferenceEngine` + `MoonshineStreamingCpuEngine`) with these characteristics:

- `packages/core/src/local-llm.ts` defines `outlinesJsonSchemaForToolArguments()` — a JSON schema builder intended for the Outlines library. **Outlines is never imported; the schema builder is unused.**
- `MoonshineStreamingCpuEngine.infer()` returns a placeholder final message: "runtime not yet wired". **The LFM2.5-VL-450M-Extract model is never invoked.**
- `packages/core/src/agent-loop.ts` drives tool calls. It has no enrichment wiring (it was deferred), but the `RemoteEnrichmentSource` interface and `NullRemoteEnrichmentSource` exist in `packages/core/src/enrichment.ts` and imply an automatic-rescue pattern.
- The `packages/contracts/src/enrichment.ts` contract schemas (`RemoteEnrichmentRequestSchema`, `RemoteEnrichmentResponseSchema`, `EnrichmentCapabilityGapSchema`) describe a gap-driven rescue flow.
- The plan called for a `"local-llm-assemble"` service action and new tools (`list-building-blocks`, `compose-profile`, `list-local-assets`, `package-bundle`, `request-enrichment`) — none were built. The 7 existing tools are unchanged.

### Why a greenfield purge

The user explicitly demands:
> "No backwards compatibility, no migration code, purging all stale and legacy code, removing all narrow brownfield abstractions, updating all incorrect heuristics, no v1 code with v1.1 or v2 type updates, dismantling all god files (no files like app.js in the codebase that are larger than 1000 LOC, except greenfield documentation). This is a clean room greenfield implementation, and must only remain as cleanly coded work. No breadcrumbing code."

Plus the design shift:
- BAML replaces Outlines (TypeScript-first vs Python-first)
- Enrichment is user-triggered, not automatic rescue

---

## Architectural Decision: BAML

[BAML](https://github.com/BoundaryML/baml) is the constrained-output runtime. It compiles `.baml` schema files into a typed TypeScript client with built-in JSON-schema validation, retry, and provider abstraction (Ollama for local, OpenRouter/etc. for remote).

- `@boundary/baml` is the npm package
- `baml-cli` (Rust binary) generates the client from `.baml` files
- Generated client is committed to the repo (checked in, not gitignored)
- Provider config via `baml_config.yaml` or env-driven

BAML handles:
- Schema-first structured output (replaces Outlines' constrained generation)
- Provider abstraction (local Ollama / hosted OpenRouter / etc. with one config change)
- TypeScript-native (no Python sidecar)
- Retry on invalid JSON (replaces Outlines' regex/JSON-schema enforcement)

---

## Architectural Decision: User-Triggered Enrichment

Remote assembly becomes a **paid opt-in feature**, not a silent fallback.

- No automatic rescue when the local LLM can't assemble.
- If the local assembly fails, the UI surfaces a "Request Paid Online Assembly" button.
- The button triggers a `request-paid-online-assembly` service action.
- The action requires: explicit user consent, payment confirmation, a capability gap descriptor.
- The action produces an enriched `GameBundle` (or returns a `paid-online-response` with cost + ETA).
- The local LLM agent loop **never** calls this action autonomously.

The `NullRemoteEnrichmentSource` and the `EnrichmentCapabilityGapSchema` are repurposed: the gap schema becomes the input to the paid action, and `NullRemoteEnrichmentSource` becomes the "no paid backend configured" stub.

---

## Work Objectives

### Core Objective

Produce a forward-only Playcraft codebase where:
- BAML is the constrained-output runtime for the local LFM2.5-VL-450M-Extract engine.
- The local agent loop is self-contained — no automatic enrichment rescue.
- Remote assembly is a first-class user-triggered paid action with consent/cost/ETA.
- Zero narrow abstractions, zero stale code, zero god files > 1000 LOC.
- All docs and plans reflect the BAML/pivot architecture.

### Concrete Deliverables

| # | File(s) | Deliverable |
|---|---|---|
| 1 | `baml_src/` (new) | BAML schema files: `assemble_game.baml`, `tool_call.baml`, `online_assembly.baml` |
| 2 | `baml.config.ts` (new) | BAML generator config (TypeScript target, ollama/openrouter providers) |
| 3 | `packages/core/baml_client/` (new) | Generated BAML TypeScript client (checked in) |
| 4 | `packages/core/src/baml-bridge.ts` (new) | Wraps the generated BAML client behind the `LocalInferenceEngine` interface |
| 5 | `packages/core/src/local-llm.ts` (rewrite) | `LocalInferenceEngine` interface; `MoonshineStreamingCpuEngine` calls the BAML bridge; **DELETE** `outlinesJsonSchemaForToolArguments`, `StubLocalInferenceEngine` (replace with a single test double that lives in the test file), and all Outlines references |
| 6 | `packages/contracts/src/enrichment.ts` (rewrite) | Keep `RemoteEnrichmentRequestSchema` and `RemoteEnrichmentResponseSchema` but repurpose: the request is now a **paid action** with `userConsent: true` and `paymentConfirmationId: string` required. Drop `EnrichmentCapabilityGapSchema` (replaced by an inline gap object in the request). |
| 7 | `packages/contracts/src/agent.ts` (rewrite) | Keep `AgentToolCallSchema`, `AgentToolResultSchema`, `AgentStepSchema`, `PlaycraftAgentTranscriptSchema`. **DELETE** the BAML-agnostic `LocalInferenceEngineManifestSchema` (replaced by BAML-native engine config). |
| 8 | `packages/core/src/enrichment.ts` (rewrite) | Replace `RemoteEnrichmentSource` with `PaidOnlineAssemblySource` interface. Delete `NullRemoteEnrichmentSource` (replaced by a no-backend stub). |
| 9 | `packages/core/src/online-assembly.ts` (new) | The paid-online engine implementation: accepts a paid request, returns a `GameBundle`. Reads `capability-gap`, queries a remote BAML-generated client with provider `openrouter`, produces an enriched bundle. **No implementation details of any remote provider** — only the contract and a stub. |
| 10 | `packages/core/src/agent-loop.ts` (rewrite) | Remove all enrichment-rescue hooks (none existed yet — keep it that way). The loop is purely local. The loop accepts an `engine: LocalInferenceEngine` and tools; that's it. |
| 11 | `packages/service/src/local-catalog.ts` (rewrite) | Add the `"request-paid-online-assembly"` service action. Add `PAID_ONLINE_ASSEMBLY_REQUEST_TIP_FEATURED_GAP_DESCRIPTORS` for the UI tip system. |
| 12 | `packages/service/src/index.ts` (rewrite) | `LocalPlaycraftService.requestPaidOnlineAssembly(input)` method that validates the paid action request and delegates to the `PaidOnlineAssemblySource`. |
| 13 | `packages/builder/src/index.ts` (rewrite) | Add 5 new `BuilderToolDefinition[]` for the local LLM surface: `list-building-blocks`, `compose-profile`, `list-local-assets`, `package-bundle`, `request-paid-online-assembly`. Wait — `request-paid-online-assembly` is a **service action**, not a builder tool. So add 4 new builder tools, and the paid-online flow is invoked via the service catalog, not the tool surface. |
| 14 | `apps/studio/src/studio-app.tsx` (rewrite) | Add the "Request Paid Online Assembly" button in the developer panel, shown only when: (a) local assembly failed, (b) the user is on a plan that allows it, (c) cost confirmation is acknowledged. |
| 15 | `packages/contracts/src/index.ts`, `base.ts`, `builder.ts` | Update `PublicContractNameSchema` enum and `PublicContractSchemas` registry to match the rewritten contracts. Remove references to deleted types (`EnrichmentCapabilityGapSchema`, `LocalInferenceEngineManifestSchema` if removed). |
| 16 | `scripts/check-guardrails.mjs` | Update the bundle-cap constant reference (it still reads `packages/contracts/dist/game-bundle.js` which now may have changed exports — verify and update). |
| 17 | All docs | `README.md`, `playcraft-agentic-framework/{README,ARCHITECTURE,DEV_GUIDE,AGENT_SAFETY,MCP_API,WORKFLOWS,CONTRIBUTING}.md`, `MILESTONES.md`, `.sisyphus/plans/playcraft-llm-wave.md` — rewrite to reflect BAML + user-triggered paid enrichment. Purge: Outlines, automatic-rescue language, "NotImplemented" placeholders, any stale terminology. |
| 18 | All existing test files | Update fixtures and expectations to match the rewritten contracts. Delete tests for removed APIs. Add tests for new APIs. |
| 19 | `.gitignore` | Add `node_modules/baml_client/` if generated, or commit it explicitly (per BAML docs, the generated client is typically committed). |
| 20 | `package.json` (root + per-package) | Add `@boundary/baml` to root devDependencies; add `baml` scripts. |

### Definition of Done

- [ ] `pnpm typecheck` zero errors
- [ ] `pnpm lint:guardrails` clean
- [ ] `pnpm test` ≥ 813 passing (no regressions from previous wave)
- [ ] `pnpm test:a11y` 18 passing
- [ ] `pnpm build:studio` succeeds
- [ ] No source file > 1000 LOC
- [ ] Zero `as any` / `@ts-ignore` / `@ts-expect-error`
- [ ] Zero `legacy` / `deprecated` / `TODO` / `FIXME` / `HACK`
- [ ] No `playcraft.v1.1` / `v2` schema strings
- [ ] BAML `.baml` files compile and produce a valid TypeScript client
- [ ] `MoonshineStreamingCpuEngine` calls the BAML-generated client (not a stub)
- [ ] No automatic enrichment rescue anywhere — `AgentLoop` is local-only
- [ ] `request-paid-online-assembly` service action exists with consent/payment fields
- [ ] At least one atomic commit during Tue 0100-1100 UTC window
- [ ] No backwards-compat shims anywhere
- [ ] No migration code anywhere

### Must NOT Have (Guardrails)

- NO Outlines library usage (no imports, no schema builder) — purge completely
- NO automatic enrichment rescue in the agent loop — explicit user consent required
- NO backwards-compat shims (e.g. `LegacyEnrichmentSource` aliases)
- NO migration code (no `if v2 use X else use Y` branches)
- NO v1.1/v2 schema reservations (everything stays `playcraft.v1`)
- NO legacy comments or identifiers
- NO `as any`, `@ts-ignore`, `@ts-expect-error`
- NO real remote provider/auth/db/network runtime code in local paths
- NO file > 1000 LOC (except generated `dist/*` artifacts and greenfield docs)
- NO bundled "capability gap" auto-rescue logic
- NO heuristic regex-based intent parsing in the runtime hot path (moved to LLM tool surface)
- NO synthetic `local-asset://` URIs (already purged in Wave E)
- NO `StubLocalInferenceEngine` class — replace with an inline test double
- NO `NullRemoteEnrichmentSource` class — replace with an inline no-backend stub

---

## Execution Strategy

Run in **this exact order** to minimize broken-state windows:

### Phase 1: Add BAML toolchain (additive, no breakage)
1. Add `@boundary/baml` to root devDependencies
2. Add `baml_src/` with `assemble_game.baml`, `tool_call.baml`, `online_assembly.baml`
3. Add `baml.config.ts`
4. Install + run `baml-cli generate` (or document the generated client as committed)
5. Add `packages/core/baml_client/` to the repo
6. Add `baml:generate` and `baml:check` scripts

### Phase 2: Rewrite local-llm.ts to use BAML
1. Delete `outlinesJsonSchemaForToolArguments`
2. Delete `StubLocalInferenceEngine` class (move test double inline)
3. Rewrite `MoonshineStreamingCpuEngine.infer()` to call the BAML bridge
4. Add `packages/core/src/baml-bridge.ts` that wraps the generated client
5. Update tests in `packages/core/test/local-llm.test.ts` to use the new shape

### Phase 3: Rewrite contracts (agent.ts, enrichment.ts)
1. Rewrite `packages/contracts/src/agent.ts`:
   - Keep `AgentToolCallSchema`, `AgentToolResultSchema`, `AgentStepSchema`, `PlaycraftAgentTranscriptSchema`
   - DELETE `LocalInferenceEngineManifestSchema` and `LocalInferenceEngineIdSchema` (BAML-native config replaces)
   - DELETE `MOONSHINE_STREAMING_CPU_ENGINE_ID` constant (BAML native)
   - DELETE `LFM_AGENT_ENGINE_ID` constant
   - DELETE `moonshineStreamingCpuEngine()` function
2. Rewrite `packages/contracts/src/enrichment.ts`:
   - Keep `RemoteEnrichmentRequestSchema` but add: `userConsent: z.literal(true)` and `paymentConfirmationId: z.string().min(1)` as required fields
   - Keep `RemoteEnrichmentResponseSchema` but add: `costCents: z.number().int().nonnegative()` and `estimatedCompletionSeconds: z.number().int().positive()`
   - DELETE `EnrichmentCapabilityGapSchema` (replaced by inline object on the request)
3. Update `packages/contracts/src/base.ts` `PublicContractNameSchema` enum: remove deleted types, add nothing new
4. Update `packages/contracts/src/builder.ts` `PublicContractSchemas` registry: remove deleted types
5. Update `packages/contracts/src/index.ts` barrel: remove deleted type exports

### Phase 4: Rewrite core packages
1. Rewrite `packages/core/src/enrichment.ts`:
   - Replace `RemoteEnrichmentSource` interface with `PaidOnlineAssemblySource`
   - Replace `NullRemoteEnrichmentSource` class with an inline no-backend stub in the test file
2. Add `packages/core/src/online-assembly.ts`:
   - `PaidOnlineAssemblySource` interface
   - `OnlineGameAssemblyEngine implements LocalInferenceEngine` — calls the paid backend via BAML
   - `requestPaidOnlineAssembly(input)` function used by the service layer
3. Rewrite `packages/core/src/agent-loop.ts`:
   - Remove all enrichment references (none existed yet, but verify)
   - Keep `AgentLoop` purely local
   - Update tests
4. Rewrite `packages/core/src/local-llm.ts`:
   - Already done in Phase 2
5. Rewrite `packages/core/src/index.ts` barrel to match

### Phase 5: Rewrite service + builder + apps
1. Rewrite `packages/service/src/local-catalog.ts`:
   - Add `request-paid-online-assembly` action with explicit paid-action metadata
2. Rewrite `packages/service/src/index.ts`:
   - Add `LocalPlaycraftService.requestPaidOnlineAssembly(input)` method
3. Rewrite `packages/builder/src/index.ts`:
   - Add 4 new local-builder tools: `list-building-blocks`, `compose-profile`, `list-local-assets`, `package-bundle`
   - Keep existing 7 builder tools
4. Rewrite `apps/studio/src/studio-app.tsx`:
   - Add "Request Paid Online Assembly" button in developer panel
5. Update `apps/studio/src/asset-library.ts` if needed for new tools

### Phase 6: Update tests
1. Update `packages/contracts/test/agent.test.ts`: remove tests for deleted types
2. Update `packages/contracts/test/enrichment.test.ts`: rewrite for paid-action shape
3. Update `packages/contracts/test/schemas.test.ts`: remove deleted fixture types
4. Update `packages/contracts/test/game-bundle.test.ts`: no schema changes; verify still passes
5. Update `packages/core/test/local-llm.test.ts`: rewrite for BAML-bridge
6. Update `packages/core/test/agent-loop.test.ts`: rewrite if signatures changed
7. Update `packages/core/test/enrichment.test.ts`: rewrite for paid-action
8. Update `packages/core/test/planner.test.ts`: may need update if `registerRecipe` signatures changed
9. Update `packages/service/test/local-service.test.ts`: add tests for `request-paid-online-assembly` action
10. Update `packages/builder/test/session-service.test.ts`: add tests for new tools
11. Update `tests/studio-ui.test.ts`: add UI tests for the paid button (consent + cost confirmation)
12. Update `tests/mobile-bundle-loader.test.ts`: no changes (bundle shape unchanged)
13. Delete `tests/_check.ts`, `tests/_debug-asset.test.ts` (debug placeholders)

### Phase 7: Update docs
1. Rewrite `README.md` (root) — pivot to BAML + paid
2. Rewrite `playcraft-agentic-framework/README.md`
3. Rewrite `playcraft-agentic-framework/ARCHITECTURE.md` — BAML + paid-action
4. Rewrite `playcraft-agentic-framework/DEV_GUIDE.md` — BAML toolchain
5. Rewrite `playcraft-agentic-framework/AGENT_SAFETY.md` — paid-action consent
6. Rewrite `playcraft-agentic-framework/MCP_API.md`
7. Rewrite `playcraft-agentic-framework/WORKFLOWS.md`
8. Rewrite `playcraft-agentic-framework/CONTRIBUTING.md`
9. Rewrite `MILESTONES.md` — new top section about BAML pivot; preserve nothing below (forward-only)
10. Rewrite `.sisyphus/plans/playcraft-llm-wave.md` — final state

### Phase 8: Update guardrail script
1. Update `scripts/check-guardrails.mjs` if `GAME_BUNDLE_MAX_BYTES` import path changed
2. Verify `pnpm lint:guardrails` still passes

### Phase 9: Final verification + commit
1. `pnpm typecheck`
2. `pnpm lint:guardrails`
3. `pnpm test`
4. `pnpm test:a11y`
5. `pnpm build:studio`
6. If Tue 0100-1100 UTC window: commit and push

---

## BAML File Sketches (you implement)

### `baml_src/assemble_game.baml`

```baml
class AssembleGameRequest {
  system_prompt string
  messages Message[]
  tools ToolDescriptor[]
  max_steps int
  temperature float
}

class Message {
  role "system" | "user" | "assistant" | "tool"
  content string
  tool_call_id string?
  tool_name string?
}

class ToolDescriptor {
  tool_name string
  display_name string
  description string
  arguments_schema string  // JSON-stringified JSON schema
  capability_tags string[]
}

class AssembleGameResponse {
  kind "tool-call" | "final"
  message string?
  tool_call ToolCall?
}

class ToolCall {
  call_id string
  tool_name string
  arguments string  // JSON-stringified arguments
}
```

### `baml_src/online_assembly.baml`

```baml
class PaidOnlineAssemblyRequest {
  capability_gap CapabilityGap
  user_consent true  // literal true — enforced at BAML layer
  payment_confirmation_id string
  context_assembly_request_id string
}

class CapabilityGap {
  missing_capabilities string[]
  requested_mechanic_ids string[]
  requested_rule_ids string[]
  requested_component_ids string[]
  context string  // JSON-stringified
}

class PaidOnlineAssemblyResponse {
  bundle GameBundle  // BAML will reference the @playcraft/contracts-generated type OR we inline
  cost_cents int
  estimated_completion_seconds int
  remote_url string
}

class GameBundle {
  schema_version string
  id string
  version string
  kind string
  // ... rest from GameBundleSchema
}
```

### `baml.config.ts`

```ts
import { defineBamlConfig } from "@boundary/baml";

export default defineBamlConfig({
  generator: {
    language: "typescript",
    outputDir: "./packages/core/baml_client",
    clientType: "sync"
  },
  clients: {
    local: {
      provider: "ollama",
      model: "lfm2.5-vl-450m-extract",
      base_url: process.env.PLAYCRAFT_OLLAMA_URL ?? "http://127.0.0.1:11434"
    },
    paid: {
      provider: "openrouter",
      model: "liquid/lfm-2.5-450m",
      api_key: process.env.PLAYCRAFT_OPENROUTER_API_KEY ?? ""
    }
  }
});
```

---

## Implementation Constraints (strict)

- **NO backwards compat.** If a test or consumer breaks, update it. Do not add alias exports like `LegacyEnrichmentSource` or `LocalInferenceEngineManifestSchema` re-exports.
- **NO migration code.** No `if (v2) use X else use Y` branches.
- **NO Outlines.** Delete `outlinesJsonSchemaForToolArguments`. Do not import `outlines` from any package.json.
- **NO automatic rescue.** The agent loop never invokes `request-paid-online-assembly`. Only the user (via the UI) can invoke it.
- **NO `as any` / `@ts-ignore` / `@ts-expect-error`.** Use BAML's generated types directly.
- **NO `legacy` / `deprecated` / `TODO` / `FIXME` / `HACK` comments anywhere.**
- **NO `v1.1` / `v2` schema strings.** Everything stays `playcraft.v1`.
- **NO god files > 1000 LOC.** If any file grows past this, split it.
- **NO heuristic regex-based intent parsing.** That's the LLM's job now.
- **NO `null` / `undefined` soup.** Use explicit types.

---

## Files to Touch (additive/modified)

### New files
- `baml_src/assemble_game.baml`
- `baml_src/tool_call.baml`
- `baml_src/online_assembly.baml`
- `baml.config.ts`
- `packages/core/baml_client/` (generated, checked in)
- `packages/core/src/baml-bridge.ts`
- `packages/core/src/online-assembly.ts`
- `baml.lock` (BAML generator lock)

### Rewrites
- `packages/contracts/src/agent.ts`
- `packages/contracts/src/enrichment.ts`
- `packages/core/src/local-llm.ts`
- `packages/core/src/agent-loop.ts`
- `packages/core/src/enrichment.ts`
- `packages/core/src/index.ts`
- `packages/service/src/local-catalog.ts`
- `packages/service/src/index.ts`
- `packages/builder/src/index.ts`
- `apps/studio/src/studio-app.tsx`
- `scripts/check-guardrails.mjs` (minor)
- `package.json` (root + per-package)
- All docs
- All affected test files

### Deletes
- `outlinesJsonSchemaForToolArguments` (function)
- `StubLocalInferenceEngine` (class — replace with inline test double)
- `NullRemoteEnrichmentSource` (class — replace with inline no-backend stub)
- `LocalInferenceEngineManifestSchema` (schema — BAML-native)
- `LocalInferenceEngineIdSchema` (schema — BAML-native)
- `MOONSHINE_STREAMING_CPU_ENGINE_ID` (constant)
- `LFM_AGENT_ENGINE_ID` (constant)
- `moonshineStreamingCpuEngine()` (function)
- `EnrichmentCapabilityGapSchema` (schema — inlined)
- `EnrichmentResponseStatusSchema` (schema — replaced)
- `tests/_check.ts`, `tests/_debug-asset.test.ts` (debug placeholders)

---

## Verification Before Commit

Run **all** of these and capture output:

```bash
cd /home/damaso/python/hackathons/playcraft

# 1. TypeScript compile
pnpm typecheck

# 2. Guardrails
pnpm lint:guardrails

# 3. Unit + integration tests
pnpm test

# 4. Accessibility tests
pnpm test:a11y

# 5. Studio production build
pnpm build:studio

# 6. Confirm no stale references
grep -rE "Outlines|outlinesJsonSchema|StubLocalInferenceEngine|NullRemoteEnrichmentSource|LocalInferenceEngineManifest|EnrichmentCapabilityGap|EnrichmentResponseStatus|MOONSHINE_STREAMING_CPU_ENGINE_ID|LFM_AGENT_ENGINE_ID|moonshineStreamingCpuEngine" packages apps tests --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v node_modules || echo "No stale references found."
```

All must exit 0 with zero stale references.

---

## Commit Strategy

If Tue 0100-1100 UTC window is open:
- Stage all changes with `GIT_MASTER=1 git add -A`
- Commit with detailed message following the existing `feat:` / `chore:` convention
- Push with `GIT_MASTER=1 git push`
- **Do NOT force-push.**

If window is closed: leave changes staged in the working tree and report.

---

## Report Format

After implementation, report:
- New test count
- Files added/modified/deleted
- Any consumer code that needed updating beyond what was specified
- Any open questions or deferred decisions
- Verification command outputs

---

## Notes

- BAML may not be installable in this sandboxed environment. If `pnpm add @boundary/baml` fails, write the `.baml` files and the bridge contract, but ship the bridge as a typed stub that calls a clearly-marked TODO function. The user understands the runtime may need to be wired separately.
- BAML's generated client is typically committed. If we can't generate it, write the equivalent TypeScript types by hand that the bridge uses.
- The `playcraft-agentic-framework/MCP_API.md` may need to be deleted if MCP is not in scope for this wave.
- The Wave H agent left a `MILESTONES.md` top section about the pivot. Rewrite it entirely (forward-only = no preservation of old milestones).