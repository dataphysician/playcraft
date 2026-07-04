# Playcraft Milestones

## 2026-07-04 - Asset Intent Resolution Hardening

Milestone:
- Asset decisions now distinguish catalog asset aliases from explicit freeform asset-folder requests.
- Text requests such as "Change the memory game to toys" keep the selected game profile while switching assets through the catalog alias path.
- Generic polish requests such as "make it more colorful" and template-only switches such as "Switch game to sorting" no longer become accidental asset edits.

Supportive changes:
- Replaced the generic asset `text-match` resolution source with `catalog-asset-alias` and `freeform-asset-request`.
- Split catalog-only update parsing from freeform asset/card/theme parsing in the local service resolver.
- Added service regression coverage for catalog alias edits, template-only switches, and future dropped-folder style asset requests.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts`

Constraint notes:
- Keeps template switching catalog-driven through request aliases.
- Keeps asset expansion local and edit-aware without adding hosted asset services, generated runtime code, auth, database state, or migration compatibility.

## 2026-07-04 - Live Speech Capture Surface Removal

Milestone:
- Public input modalities no longer include live microphone capture.
- Bundled mechanics, templates, safety policy fixtures, and trusted component manifests no longer expose speech-capture gameplay primitives.
- Text input and Moonshine Streaming CPU transcript records remain the only user-input paths.

Supportive changes:
- Removed unused speech-prompt, repeat-after-audio, and microphone-attempt mechanics from the bundled pack.
- Removed the audio prompt panel manifest and speech-capture safety fixture fields.
- Added contract and pack regression coverage for the removed modality.
- Updated framework docs to keep audio as local asset/playback support and speech as transcript input only.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/packs/test/mvp-profiles.test.ts packages/core/test/registries.test.ts tests/import-light-and-scans.test.ts`

Constraint notes:
- Keeps Moonshine Streaming CPU transcripts as local text-bearing records.
- Does not add microphone capture, hosted conversation services, generated runtime code, auth, database state, or migration compatibility.

## 2026-07-04 - Asset Source Contract Rename

Milestone:
- Public asset contracts now use asset-source terminology throughout.
- Generated asset records now store `sourceId`, `sourceManifestId`, and `sourceManifestVersion`.
- Core registries, pack manifests, deterministic local asset generation, fixtures, and tests now use asset-source APIs.

Supportive changes:
- Renamed the deterministic asset test to `local-asset-source.test.ts`.
- Updated docs and source-scan tests so stale hosted-stack terminology is not preserved as a public framework concept.
- Updated saved MVP profile fixtures to the new generated asset provenance shape.

Validation:
- `pnpm build`
- `pnpm test packages/contracts/test/schemas.test.ts packages/assets/test/local-asset-source.test.ts packages/packs/test/mvp-profiles.test.ts packages/core/test/registries.test.ts packages/ag-ui/test/events.test.ts tests/import-light-and-scans.test.ts`

Constraint notes:
- Keeps asset expansion framed as local sources and server catalog retrieval.
- Does not add hosted SDKs, migration aliases, generated runtime code, auth, database state, or legacy-stack compatibility.

## 2026-07-04 - Local Asset Contract Cleanup

Milestone:
- V1 asset content contracts now accept only image, audio, animation, and text.
- Canonical framework docs now describe local asset sources, curated packs, and server catalog retrieval instead of hosted SDK adapters.
- Root docs no longer advertise any hosted SDK dependency in the framework path.

Supportive changes:
- Added schema coverage that rejects `video` as an `AssetContentTypeSchema` value.
- Updated pack helper types to match the narrowed public asset content contract.
- Reworded roadmap, PRD, architecture, and developer guide language around asset-source retrieval.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/assets/test/local-asset-source.test.ts packages/packs/test/mvp-profiles.test.ts tests/import-light-and-scans.test.ts`

Constraint notes:
- Keeps text and Moonshine Streaming CPU transcript input as the only user-input path.
- Keeps future expansion focused on local/server catalog retrieval rather than hosted SDK stacks.

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
- Does not add app-local preview heuristics, generated runtime code, hosted calls, auth, or database state.

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
- Does not introduce auth, databases, hosted calls, or core migration.
