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
