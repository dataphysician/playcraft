# Playcraft Milestones

## 2026-07-04 - Sorting Bin Asset Catalog

Milestone:
- Studio sorting bin sprites now resolve through an explicit local static asset catalog instead of color-name substring checks.
- Bin asset matching uses normalized token sequences, so unrelated labels such as `blueberry` or `greenhouse` do not select color bins.
- The static Playcraft UI asset layer remains local and catalog-shaped for future server/catalog retrieval.

Supportive changes:
- Exported the sorting bin asset catalog for tests and UI inspection.
- Added Studio asset-library coverage for catalog order, alias matching, and no-substring false positives.

Validation:
- `pnpm test tests/studio-asset-library.test.tsx`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps toddler-game visual assets local and explicit without generated runtime code, hosted providers, auth, database state, or migration shims.

## 2026-07-04 - Ambiguous Template Resolution

Milestone:
- `BuilderIntentResolution` now has an explicit `ambiguous-template-match` source for text that matches multiple game templates.
- The local service resolver keeps selecting the active or default template for ambiguous requests, but no longer reports that selection as a normal active/default decision.
- Ambiguous requests still preserve matched template IDs, aliases, and asset-edit decisions for Studio/agent inspection.

Supportive changes:
- Added resolver coverage for ambiguous active-template and default-template selection paths.

Validation:
- `pnpm test packages/service/test/local-service.test.ts packages/contracts/test/schemas.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Makes template switching heuristics inspectable without introducing hosted providers, compatibility migration code, generated runtime code, auth, or database state.
- Keeps local text/Moonshine transcript flows deterministic and contract-first.

## 2026-07-04 - Template ID Contract Tightening

Milestone:
- `GameTemplateDefinitionSchema` now requires template IDs to use the `template.*` builder namespace.
- Service and builder template flows no longer use raw `as BuilderTemplateId` assertions for bundled template IDs.
- The default service template ID is parsed through the shared contract schema.

Supportive changes:
- Added public contract coverage for rejecting malformed game-template IDs.
- Added a source scan guard blocking `as BuilderTemplateId` in implementation seams.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- `rg -n "as BuilderTemplateId" packages apps tests playcraft-agentic-framework examples --glob '!**/dist/**'`

Constraint notes:
- Keeps template identity schema-derived for local agent CLI/API and future server catalog retrieval.
- Does not add migration code, compatibility aliases, hosted services, generated runtime code, auth, or database state.

## 2026-07-04 - Service CLI Template Validation

Milestone:
- `playcraft-service --template` now validates template IDs through `BuilderTemplateIdSchema` before constructing local service requests.
- Service CLI argument parsing now runs inside the CLI error boundary, so malformed template IDs report as normal CLI failures instead of escaping.
- Invalid template strings are rejected before agent-facing assemble/update/import commands can reach service dispatch.

Supportive changes:
- Added CLI coverage for rejecting a malformed service `--template` value with the shared contract error message.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps the local agent CLI surface schema-first and aligned with the builder CLI.
- Does not add hosted services, generated runtime code, auth, database state, or compatibility aliases.

## 2026-07-04 - Sequence Round Contract

Milestone:
- Sequence profiles now carry explicit `rounds` on the SequencePad component props.
- The Live App sequence interaction uses profile-defined rounds instead of generating later rounds from the first sequence and choice labels.
- Asset-edited sequence profiles keep renamed token sequences and rounds in sync.

Supportive changes:
- Extended the SequencePad component manifest props to require `rounds`.
- Updated deterministic sequence fixtures and pack coverage for authored round progressions.
- Added builder and Studio UI coverage proving custom round order comes from the profile contract.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts packages/packs/test/mvp-profiles.test.ts packages/renderer/test/trusted-renderer.test.tsx tests/studio-ui.test.ts`

Constraint notes:
- Keeps sequence progression profile-defined and reusable for arbitrary toddler-friendly token labels and replacement assets.
- Does not add hosted services, generated runtime code, auth, database state, or compatibility fallbacks.

## 2026-07-04 - Memory Pair Contract

Milestone:
- Memory profiles now carry an explicit `pairs` record on the RevealCardGrid component props.
- The Live App memory interaction validates matches against profile-defined card pairs instead of deriving pairs from `-a`/`-b` card ID suffixes.
- Local card sprite replacement grouping now uses the same profile pair map as gameplay.

Supportive changes:
- Extended the RevealCardGrid component manifest props to require `pairs`.
- Updated deterministic memory fixtures and asset-edit output to keep cards and pair maps in sync.
- Added builder, pack, Studio UI, and asset-library coverage for profile-defined memory pairs.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts packages/packs/test/mvp-profiles.test.ts packages/renderer/test/trusted-renderer.test.tsx tests/studio-ui.test.ts tests/studio-asset-library.test.tsx`

Constraint notes:
- Keeps matching rules profile-defined and reusable for arbitrary toddler-friendly card labels and replacement assets.
- Does not add hosted services, generated runtime code, auth, database state, or compatibility fallbacks.

## 2026-07-04 - Sorting Target Contract

Milestone:
- Sorting profiles now carry an explicit `targets` record on the SortBins component props.
- The Live App sorting interaction validates drops against profile-defined item targets instead of inferring correctness from item labels.
- Saved sorting fixtures now include the target map emitted by deterministic assembly.

Supportive changes:
- Extended the SortBins component manifest props to require `targets`.
- Added pack coverage for deterministic sorting target output.
- Added Studio Live App coverage proving an item label without the bin name still sorts correctly through the explicit target map.

Validation:
- `pnpm test packages/packs/test/mvp-profiles.test.ts packages/renderer/test/trusted-renderer.test.tsx tests/studio-ui.test.ts`

Constraint notes:
- Keeps game rules profile-defined and reusable for agent-built toddler games with arbitrary assets and labels.
- Does not add hosted services, generated runtime code, auth, database state, or compatibility fallbacks.

## 2026-07-04 - Builder CLI Catalog Parity

Milestone:
- `playcraft-builder batch` now assembles every registered local template from the builder handler catalog instead of a hard-coded MVP subset.
- The lower-level builder CLI now validates `--template` through `BuilderTemplateIdSchema` before command execution.
- Sequence Repeat is included in batch assembly parity with Memory Match and Sorting.

Supportive changes:
- Added builder CLI coverage for all registered template batch output.
- Added builder CLI coverage for rejecting malformed template IDs at the argument boundary.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts`

Constraint notes:
- Keeps CLI assembly surfaces catalog-driven as new local templates are registered.
- Does not add hosted services, generated runtime code, auth, database state, or compatibility aliases.

## 2026-07-04 - Service Envelope Producer Validation

Milestone:
- CLI `request --request-json` now parses exact service envelopes through `BuilderServiceRequestSchema` before dispatch.
- Studio's service-backed client now validates every locally produced `BuilderServiceRequest` before sending it to local or HTTP transport.
- Invalid outgoing service envelopes fail at the producer boundary instead of relying on downstream service handling.

Supportive changes:
- Added CLI coverage for rejecting an invalid exact service envelope with input text on a no-input action.
- Added Studio client coverage proving malformed transcript payloads are rejected before transport send.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/studio-ui.test.ts`

Constraint notes:
- Keeps local CLI/API and Studio transport contracts schema-first.
- Does not add hosted services, generated runtime code, auth, database state, or compatibility aliases.

## 2026-07-04 - Profile Import Payload Validation

Milestone:
- Studio pasted profile exports now parse through `BuilderProfileExportSchema` before reaching the Studio client adapter.
- CLI `--profile-export-json` and `--profile-json` inputs now parse through shared contract schemas before service envelopes are built.
- Invalid profile import payloads fail at the local edge with schema errors instead of entering the service path as unchecked casts.

Supportive changes:
- Added CLI coverage for rejecting an invalid profile export payload before import service handling.
- Added Studio UI coverage for surfacing invalid pasted profile export JSON in the shared request error alert.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/studio-ui.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps profile portability contract-first at CLI and Studio boundaries.
- Does not add hosted services, generated runtime code, auth, database state, or compatibility aliases.

## 2026-07-04 - Service Request Action Contract Cleanup

Milestone:
- `BuilderServiceRequest` now rejects input text/transcripts on no-input actions such as preview, catalog, reset, get-session, export-profile, and import-profile.
- Profile import payloads are accepted only by `import-profile`; assemble and update no longer accept profile import bodies.
- CLI seed-and-run conveniences still work, but follow the clean envelope by sending text only to the seed assemble request.

Supportive changes:
- Added schema coverage for action-specific request payload rejection.
- Added service runtime coverage rejecting preview requests with input text.
- Updated the CLI request builder to include text/transcript fields only for assemble/update and profile payloads only for import-profile.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts`

Constraint notes:
- Keeps the local service transport aligned with the builder tool input contract.
- Does not add hosted services, generated runtime code, auth, database state, or compatibility aliases.

## 2026-07-04 - Builder Tool Input Contract Cleanup

Milestone:
- Builder tool definitions now distinguish input-driven tools from session/profile actions.
- Assemble and update advertise text plus Moonshine transcript input; preview, list, get-session, export, and import advertise no input source.
- The Studio Developer catalog shows each tool's input source contract instead of implying every action takes text.

Supportive changes:
- Relaxed `BuilderToolDefinitionSchema.acceptedInputSources` so action-only tools can declare an empty source list.
- Added builder and service catalog coverage for no-input session/profile tools.
- Added Studio UI coverage for visible input-source summaries in the agent tool catalog.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts`

Constraint notes:
- Keeps the CLI/API tool surface contract-first and honest about which tools consume user text/transcripts.
- Does not add hosted services, generated runtime code, auth, database state, or compatibility aliases.

## 2026-07-04 - Deterministic Local Asset Source Cleanup

Milestone:
- Public asset-source IDs, capability tags, generated asset URIs, metadata, fixtures, and docs now describe the bundled asset path as deterministic local infrastructure instead of placeholder infrastructure.
- Generated assets now use `asset-source.local-deterministic`, `local-asset://...`, and `deterministic-local` provenance metadata.
- Pack validation helper naming no longer describes successful validation records as placeholders.

Supportive changes:
- Updated saved profile fixtures and asset/core/AG-UI expectations to the local deterministic source ID.
- Reworded framework docs to deterministic local planner/source/tools.
- Added a source-scan guard against reintroducing old placeholder asset-source IDs, URI schemes, and public placeholder planner/source terminology.

Validation:
- `pnpm test packages/assets/test/local-asset-source.test.ts packages/packs/test/mvp-profiles.test.ts packages/core/test/registries.test.ts packages/ag-ui/test/events.test.ts tests/import-light-and-scans.test.ts`

Constraint notes:
- Keeps asset generation local, deterministic, offline, and credential-free.
- Does not add hosted asset services, generated runtime code, auth, database state, or migration compatibility.

## 2026-07-04 - Profile Contract Portability Cleanup

Milestone:
- Imported profiles no longer need bundled profile IDs to recover their template context.
- Builder import resolves profiles from `assemblyRequestId` or component contracts, so renamed/custom profile implementations can still replay and preview.
- Asset-edit prompts now derive game purpose from component capabilities instead of profile ID substrings.

Supportive changes:
- Removed `profile.id.includes(...)` game branching from builder asset prompt generation.
- Added builder coverage for importing and previewing a renamed memory profile.
- Added a source-scan guard against reintroducing profile-ID substring dispatch.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`

Constraint notes:
- Keeps profile portability forward-only through current contracts rather than migration aliases.
- Does not add hosted services, generated runtime code, auth, database state, or legacy game-type branching.

## 2026-07-04 - Moonshine Transcript Boundary Tightening

Milestone:
- Transcript-sourced builder input now requires an explicit `MoonshineTranscriptRecord` at the service contract boundary.
- The Studio and Mobile client path can still accept transcript-mode text, but converts it into a local Moonshine Streaming CPU transcript record before sending the service envelope.
- The Studio input toggle now says "Transcript" instead of implying live speech capture.

Supportive changes:
- Added schema and service tests rejecting `source: "speech-transcript"` without a transcript record.
- Removed service-side transcript record fabrication from plain text.
- Added a clearer CLI error for `--source speech-transcript` without `--transcript`.
- Updated docs to state transcript records are created at the client/CLI edge, not inside the service.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/mobile-shell.test.tsx`

Constraint notes:
- Keeps input limited to text and local Moonshine Streaming CPU transcript records.
- Does not add microphone capture, hosted conversation services, generated runtime code, auth, database state, or migration compatibility.

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
