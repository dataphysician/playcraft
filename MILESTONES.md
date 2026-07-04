# Playcraft Milestones

## 2026-07-04 - Interactive Preview Contract Hardening

Milestone:
- Backend preview now selects the first render request with a registered emitted frontend tool.
- Visual-only components are no longer treated as generic preview interactions.
- Preview state points at the interactive component when a profile renders non-interactive components first.

Supportive changes:
- Removed the `tool:preview-interaction` fallback from backend preview execution.
- Added builder coverage for imported profiles whose component order starts with a visual-only component.
- Tightened the Studio asset-swap test to wait for both matched card pairs before comparing visual styles.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/mobile-shell.test.tsx`

Constraint notes:
- Keeps preview behavior driven by component manifests and replay contracts.
- Does not add app-local preview heuristics, generated runtime code, provider calls, auth, or database state.

## 2026-07-04 - Service Preview Tool Loop

Milestone:
- Studio Developer tab can call the backend `preview` service action against the active session.
- Core replay render requests carry trusted component manifest tool names through `expectedEmittedEvents`.
- Backend preview events use the registered frontend tool contract, such as `tool:reveal-card`, instead of a generic fallback action.

Supportive changes:
- Extended `StudioClient` with optional `previewAction(sessionId)`.
- Wired local and HTTP Studio clients to the service `preview` action.
- Added a Developer tab "Run Preview Tool" command with pending/error/status handling.
- Added replay coverage for manifest emitted tool propagation.
- Added Studio coverage for HTTP service preview and Developer tab preview execution.

Validation:
- `pnpm --filter @playcraft/studio typecheck`
- `pnpm build`
- `pnpm test packages/core/test/replay.test.ts packages/builder/test/session-service.test.ts tests/studio-ui.test.ts tests/mobile-shell.test.tsx`

Constraint notes:
- Keeps runtime rendering on trusted registered components.
- Does not generate runtime code.
- Does not introduce auth, databases, provider calls, or core migration.
