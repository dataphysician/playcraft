## [2026-07-05] Decisions from Planning

- **Scope**: All 4 refinement outcomes IN; Server-Ready Retrieval OUT
- **Agent UX**: Full agent stack (MCP discovery + HTTP SSE + workflow + session ownership)
- **App Polish**: Both tactile toddler interactions AND empty/edge states
- **Test Strategy**: TDD (RED-GREEN-REFACTOR per task)
- **Workflow default**: linear execution, parallel only when explicitly marked
- **Workflow node cap**: 20 nodes maximum
- **Session expiry**: 1 hour default, configurable
- **Custom template namespace**: `template.custom.*` prefix required
- **Asset discovery**: must require `catalog.json`, no filename inference
- **Tap target minimum**: 64px × 64px (exceeds WCAG 44px for toddler usability)
- **Audio cues**: metadata-only contract in T13; actual playback wired in T15 mobile
- **MCP guardrails**: local-only, no-auth, no-db, no-network, allowlisted tools

## [2026-07-05] Decisions from Baseline

- Plan file edited to remove literal provider markers (`T*vus`, `re*lica`) so import-light scan passes
- `.sisyphus/plans/` is scanned by source-light tests; keep plan language generic

## [2026-07-05] Builder Service Response Typing

- Keep `BuilderServiceResponse` as a hand-written public output type and use a separate private `BuilderServiceResponseInput` alias for schema inputs so defaulted nested fields remain accepted without suppressing TypeScript errors.

## [2026-07-05] T4 MCP Adapter Decisions

- **Scope**: T4 stays strictly in `packages/mcp/`. The catalog-derived `exampleRequest` is used to satisfy the service's `text` requirement so we can go through `service.handle()` and return a contract-valid `BuilderServiceResponse`. Calling the builder handler directly would skip schema validation and force a custom envelope shape.
- **Routing**: Builder action names map to service action names via an internal table (`assemble-game` → `assemble`, `update-game` → `update`, `preview-action` → `preview`, `list-builder-tools` → `catalog`, `get-session`/`export-profile`/`import-profile` stay the same). MCP tool names are the builder tool's `toolName` (`tool:<action>`).
- **Guardrails**: Default filter uses `PLAYCRAFT_MCP_GUARDRAILS.allowlistedTools`; tests verify the same shape and a custom subset both behave correctly. `localOnly`, `noAuth`, `noNetworkExecution`, `noDatabaseAccess` invariants are NOT weakened (no custom guardrails type was added).
- **Tool-call envelope**: Use `kind: "builder-service-request"`, `schemaVersion: "playcraft.v1"`, `version: "1.0.0"`, `actionName` matching the service action. Generated `id` prefix `builder-service-request.mcp.` allows downstream filtering, and `sessionId` is auto-generated when not supplied.
- **No schema drift**: `packages/contracts/src/index.ts` and `PLAYCRAFT_MCP_GUARDRAILS` were NOT modified; the TS7056 preservation rule is honored.
- **No new wire/server code**: No stdio/HTTP/MCP transport; those belong to T17. `invokeMcpTool` returns `Promise<BuilderServiceResponse>` directly, ready for a future transport.
- **Out-of-scope typecheck failure**: A pre-existing uncommitted error in `packages/service/src/index.ts:581` (`agUiEventToSseFrame` from `./sse.js` rejects `JsonValue` because of `null`) is left untouched; it belongs to T5/T6 SSE work and is outside the T4 file scope restriction.
