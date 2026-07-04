# Playcraft Milestones

## 2026-07-04 - Strict HTTP Service CLI Arguments

Milestone:
- The local `playcraft-service-http` CLI now rejects unknown options instead of silently ignoring them.
- `--host`, `--port`, and `--route` now fail with explicit missing-value errors.
- HTTP server CLI ports are validated as integers from 0 to 65535, and routes are normalized at parse time.

Supportive changes:
- Exported a testable HTTP server CLI parser for local/server transport setup.
- Service tests now cover valid parser normalization, missing values, invalid ports, and unknown options.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps the local HTTP transport setup explicit and contract-shaped without silent server CLI fallbacks, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Strict Local CLI Arguments

Milestone:
- Builder and service CLIs now reject unknown options instead of silently ignoring them.
- Value-bearing CLI flags now fail with explicit missing-value errors.
- Service CLI `--source` now accepts only contract-supported input sources instead of defaulting unsupported values to text.

Supportive changes:
- Builder CLI tests cover unknown options and missing template values.
- Service CLI tests cover unsupported input sources, missing request text values, and unknown options.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- Preview placeholder component ID scan.
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `pnpm test`
- `git diff --check`

Constraint notes:
- Keeps the local agent-facing CLI surface explicit and contract-shaped without silent fallbacks, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Concrete Preview Component IDs

Milestone:
- Builder preview payloads now require concrete replay component IDs instead of serializing placeholder component IDs.
- Preview state rendered-component lists are built from validated replay component IDs only.
- Preview-action payloads now fail closed if replay state lacks a concrete component ID.

Supportive changes:
- Builder tests assert preview payload component IDs are present in rendered component IDs.
- Source scans now block placeholder preview component IDs in builder and service code.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Preview placeholder component ID scan in builder and service source.
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `pnpm test`
- `git diff --check`

Constraint notes:
- Keeps agent-facing preview events contract-shaped and inspectable without fake component identifiers, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Neutral Memory Profile Baseline

Milestone:
- The bundled Memory Match profile now starts from neutral `memory-card-*` IDs instead of baked-in sample animal/object card IDs.
- The default memory template prompt now asks for starter card illustrations instead of an implicit animal theme.
- The saved memory profile fixture was regenerated to the matching deterministic local asset digest.

Supportive changes:
- Trusted renderer and Studio tests now exercise the neutral baseline card IDs.
- Source scans now ignore generated `web-dist` output and block the retired sample memory-card IDs in source and fixtures.

Validation:
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm test packages/packs/test/mvp-profiles.test.ts`
- `pnpm test packages/renderer/test/trusted-renderer.test.tsx`
- `pnpm test tests/studio-ui.test.ts`
- Retired sample card ID/source wording scan.
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `pnpm test`
- `git diff --check`

Constraint notes:
- Keeps asset theming edit-aware and profile-defined without hard-coded starter card themes, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Clean App Browser Bundle Output

Milestone:
- Studio and Mobile Vite builds now emit browser bundles into `web-dist` instead of sharing TypeScript's `dist` output.
- Vite builds clean `web-dist` on each run instead of preserving stale hashed app bundles.
- The Tauri mobile shell now points at the dedicated browser bundle directory.

Supportive changes:
- Added `apps/*/web-dist/` to ignored local build artifacts.
- Scaffold tests now lock in the browser-bundle output directory and cleaned Vite builds.
- Mobile shell tests now verify Tauri reads the dedicated browser bundle directory.

Validation:
- `pnpm test tests/builder-studio-scaffold.test.tsx`
- `pnpm test tests/mobile-shell.test.tsx`
- Stale Vite/Tauri app output-setting scan.
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- Verified each `web-dist` has one current hashed app entry while TypeScript declarations remain in `dist`.
- `pnpm test`
- `git diff --check`

Constraint notes:
- Keeps user-facing Studio/Mobile build artifacts reproducible and forward-only without stale mixed outputs, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Scaffold JSON Fixture Schema Parsing

Milestone:
- Builder/Studio scaffold tests now parse package and tsconfig JSON through Zod schemas before assertions.
- Mobile shell tests now parse package and Tauri config JSON through Zod schemas before assertions.
- Test JSON helpers infer return types from schemas instead of caller-supplied structural generics.

Supportive changes:
- Removed the remaining generic `JSON.parse(...) as T` fixture assertions from workspace and mobile shell scaffold tests.
- Stabilized the Studio asset-library sprite assertion so it follows the shuffled memory-card label it clicks.

Validation:
- `pnpm test tests/builder-studio-scaffold.test.tsx`
- `pnpm test tests/mobile-shell.test.tsx`
- `pnpm test tests/studio-asset-library.test.tsx`
- JSON fixture cast scan across tests, apps, and packages.
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps Studio/Mobile shell scaffold verification contract-shaped and local without hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Generic Text Resolution Label Scan

Milestone:
- Source scans now block the old generic template/asset text resolution label across milestones, apps, packages, tests, and public docs.
- The scan guard builds the blocked label dynamically, so the guard itself does not preserve the stale label.
- Historical milestone notes now describe the old resolution source generically instead of storing the stale literal.

Supportive changes:
- Preserved the catalog-specific `catalog-template-alias`, `catalog-asset-alias`, and `freeform-asset-request` decision labels.

Validation:
- `pnpm test tests/import-light-and-scans.test.ts`
- Generic text resolution-label scan across milestones, apps, packages, tests, and public docs.
- Removed vendor/conversation-stack literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps intent resolution catalog-specific and forward-only without legacy generic text labels, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Catalog Template Alias Resolution Source

Milestone:
- `BuilderIntentResolution.templateDecision.source` now reports catalog-driven template matches as `catalog-template-alias`.
- The local service emits the new forward-only decision source when request text matches a bundled template `requestAliases` entry.
- Contract and service tests no longer assert the generic template text label.

Supportive changes:
- Kept explicit, ambiguous, active-template, and default-template decision sources unchanged.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- Generic template text-label scan across packages, apps, tests, and public docs.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps template switching inspectable and catalog-driven without legacy generic text labels, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Removed-Stack Scan Literal Hygiene

Milestone:
- Source-scan tests now build removed conversation-stack phrases dynamically instead of storing those phrases as literal repo text.
- Public roadmap and historical milestone notes no longer preserve stale removed-stack wording.
- Repo-wide literal scans for removed vendor and conversation-stack phrases are now useful signals instead of matching the scan guard itself.

Supportive changes:
- Preserved the public docs scan coverage while eliminating self-referential blocked text from the test source.

Validation:
- `pnpm test tests/import-light-and-scans.test.ts`
- Repo-wide removed vendor/conversation-stack literal scan.
- Public docs removed-stack literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps stale-stack detection forward-only and text/Moonshine aligned without hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Public Docs Hosted-Stack Phrase Cleanup

Milestone:
- Public framework docs now describe local text and Moonshine transcript input without removed video/avatar phrasing.
- Duplicate hosted SDK wording in framework README, architecture, and roadmap docs was collapsed into clear adapter rejection language.
- Source scans now guard public framework docs against removed hosted-stack phrasing regressions.

Supportive changes:
- Updated the root README and cleanroom framework docs without changing runtime contracts or service behavior.

Validation:
- `pnpm test tests/import-light-and-scans.test.ts`
- Public docs removed hosted-stack phrase scan.
- Hidden-file removed vendor/avatar marker scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps public documentation aligned with the text/Moonshine-only local builder path without hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Registry Kind-Specific Compatibility Fields

Milestone:
- Core registry compatibility checks now read supported domains, safety policies, age bands, and modalities only from current kind-specific contract fields.
- Loose registry entries no longer get opportunistic support from stale top-level compatibility aliases.
- Mechanics and rules continue to use the canonical `compatibility` object while components, themes, domains, and safety policies use their explicit current contract fields.

Supportive changes:
- Strengthened core registry coverage with stale loose-entry aliases for domains, safety policies, age bands, and modalities.

Validation:
- `pnpm test packages/core/test/registries.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps registry selection forward-only and contract-shaped without migration compatibility probing, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Operational Resume Prompt De-Hosted

Milestone:
- The repo-local OMX resume helper no longer preserves the removed hosted avatar vendor name in its scheduled prompt text.
- Operational goal resumption now describes the forward-only local audio/text direction without stale vendor terminology.

Supportive changes:
- Kept the application source scan boundaries unchanged while separately cleaning the repo-local automation helper that lives outside app/package source.

Validation:
- `pnpm test tests/import-light-and-scans.test.ts`
- Hidden-file removed vendor-name scan across repo-local text files.
- Hidden-file removed avatar/persona marker scan across repo-local text files.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps repo-local goal automation aligned with the text/Moonshine-only builder direction without hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Builder CLI Batch Output Parsing

Milestone:
- Builder CLI batch JSON tests now parse direct CLI output through a Zod batch result schema.
- Batch result bodies validate against `BuilderCommandResultSchema`.
- JSON-serialized builder events validate as contract `JsonValueSchema` records before assertions read profile IDs.

Supportive changes:
- Removed the structural `JSON.parse(...) as Array<...>` assertion from builder CLI batch coverage.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps agent-facing builder CLI verification contract-backed and local without hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Studio Replacement Sprite Module Validation

Milestone:
- Studio replacement sprite modules now pass through runtime URL validation before becoming local asset-library records.
- Edit-aware card, item, and choice replacements no longer depend on an unchecked Vite glob `Record<string, string>` assertion.
- Public asset replacement coverage confirms generated game profiles receive non-empty local sprite URLs.

Supportive changes:
- Added asset-library coverage for toy memory cards through the public `createProfileLibraryAssetReplacements` path.

Validation:
- `pnpm test tests/studio-asset-library.test.tsx`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps local edit-aware asset replacement schema-first and folder-driven without hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Studio Contract Test Parsing

Milestone:
- Studio HTTP transport tests now parse intercepted service requests through `BuilderServiceRequestSchema`.
- Studio Developer export/import tests now parse exported profile JSON through `BuilderProfileExportSchema`.
- Studio UI contract assertions no longer rely on ad hoc JSON object casts for service request and profile export payloads.

Supportive changes:
- Preserved the raw exported JSON string for the import textarea while validating the parsed profile export contract separately.

Validation:
- `pnpm test tests/studio-ui.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps Studio-side local service exchanges schema-first and forward-only without hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - CLI Payload Schema Parsing

Milestone:
- Service CLI catalog JSON tests now parse through `BuilderCatalogSchema`.
- Service CLI assemble/import JSON tests now parse through `BuilderServiceExecutionSchema`.
- Service CLI export JSON tests now parse through `BuilderProfileExportSchema`.

Supportive changes:
- Removed test-only structural casts from service CLI payload assertions.
- Kept CLI output validation aligned with the public service payload shapes emitted by `playcraft-service --json`.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps agent-facing CLI payload verification schema-first and local without hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Service Response Test Parsing

Milestone:
- Service HTTP, live HTTP, and CLI response tests now parse payloads through `BuilderServiceResponseSchema`.
- Public service response fixtures in tests enforce the same contract schema used by the local service boundary.
- Removed test-only `BuilderServiceResponse` casts from service response body checks.

Supportive changes:
- Tightened service validation coverage without changing runtime behavior or public envelope shape.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps CLI/API response verification schema-first and local without hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Catalog Template Alias Asset Guard

Milestone:
- Service text asset parsing now suppresses template-only asset edits through bundled template `requestAliases`.
- The game/profile/challenge asset matcher no longer carries a hard-coded memory/sorting/sequence prefix list.
- Template switch requests such as `Change this game to repeat pattern` stay asset-edit free because the catalog owns that alias.

Supportive changes:
- Added service resolver coverage for catalog alias-driven suppression of template-only asset edits.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps text/Moonshine intent resolution catalog-driven and forward-only without template-name compatibility lists, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Service JSON Boundary Parsing

Milestone:
- Studio service event ingestion now reads JSON envelope fields through runtime checks instead of unchecked object retyping.
- Service execution serialization now validates cloned events with `JsonValueSchema` before exposing them as service response JSON.
- Promise response detection in the Studio service adapter no longer retypes arbitrary values as promises.

Supportive changes:
- Tightened local service and Studio adapter boundaries without changing the public service envelope shape.

Validation:
- `pnpm test tests/studio-ui.test.ts packages/service/test/local-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps local text/Moonshine service exchanges schema-first and forward-only without hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Canonical Registry Compatibility

Milestone:
- Capability registry selection now reads domain, safety policy, age-band, and modality compatibility from current contract fields only.
- Rule modules are filtered through their canonical `compatibility` constraints instead of bypassing policy/domain checks.
- Stale compatibility alias fields no longer influence registry selection.

Supportive changes:
- Removed opportunistic multi-name compatibility probing from the core registry.
- Added core registry coverage for canonical rule compatibility and ignored stale alias fields.

Validation:
- `pnpm test packages/core/test/registries.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps agent-facing registry selection forward-only and contract-driven without legacy alias compatibility, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Studio Event Boundary Validation

Milestone:
- Studio service transport now validates AG-UI event type strings before adding service events to the Developer timeline.
- Unknown service event types fail at the Studio adapter boundary instead of being retyped into known lifecycle/activity/tool events.
- Studio timeline mapping now depends directly on the shared AG-UI event type contract rather than the builder package alias.

Supportive changes:
- Added Studio client coverage for rejecting malformed service event envelopes from a transport response.

Validation:
- `pnpm test tests/studio-ui.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps UI event ingestion schema-first and local without hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Import CLI Template Rejection

Milestone:
- `playcraft-service import-profile` now rejects `--template` with a clear CLI error instead of producing an invalid import envelope.
- Friendly CLI import requests no longer attach request-level `templateId`; imported template identity remains profile-derived.
- CLI usage text now documents `--template` as a flag while command handling scopes it to assemble/update behavior.

Supportive changes:
- Added service CLI coverage for rejecting `import-profile --template` while preserving normal profile-export import.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps agent-facing CLI producers aligned with service envelope contracts without compatibility shims, hosted providers, auth, database state, or generated runtime code.

## 2026-07-04 - Import Request Template Scope

Milestone:
- `BuilderServiceRequestSchema` now rejects request-level `templateId` on `import-profile`.
- Import requests can still carry profile/profileExport payloads and asset edit metadata, but the imported profile contract owns template identity.
- Stale `templateId` metadata inside a profile export remains non-authoritative and cannot be reinforced by a request override.

Supportive changes:
- Added contract coverage for rejecting import requests with `templateId`.
- Extended service import coverage to prove stale export metadata is ignored while request-level template overrides are rejected.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps service envelopes action-scoped and profile-import behavior contract-first without compatibility shims, hosted providers, auth, database state, or generated runtime code.

## 2026-07-04 - Import Template State Authority

Milestone:
- Imported profile active-template state now comes from the builder's replay/import result, not from request or profile-export template metadata.
- Stale or mismatched `templateId` values on import requests can no longer override the imported profile contract.
- Profile export/import remains portable while keeping active session state derived from the validated profile.

Supportive changes:
- Added service coverage for importing a sequence profile with deliberately stale export and request template IDs.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps profile import contract-first for agent-built games without migration code, compatibility shims, hosted providers, auth, database state, or generated runtime code.

## 2026-07-04 - Active Profile Update Semantics

Milestone:
- Builder `update-game` now applies asset edits to the active session profile when the template is unchanged instead of reassembling from the bundled template.
- Imported/custom sequence profiles keep their profile ID and authored `rounds` structure when assets are renamed.
- Sequence asset edits remap existing sequence and round tokens through one token map rather than generating new progression rounds from a formula.

Supportive changes:
- Added builder coverage for updating an imported custom sequence profile with authored rounds.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps updates profile-contract driven for agent-built games without migration code, generated runtime code, hosted providers, auth, database state, or compatibility shims.

## 2026-07-04 - Token Color Catalog

Milestone:
- Live game token styling now resolves named colors through an exact local token color catalog instead of substring checks.
- Labels such as `blueberry` no longer receive the `blue` styling just because they contain the word fragment.
- Sequence, sorting, and hero token visuals keep deterministic fallback colors for arbitrary toddler-friendly labels.

Supportive changes:
- Added Studio Live App coverage comparing exact `blue` token styling against non-matching `blueberry`.

Validation:
- `pnpm test tests/studio-ui.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps visual defaults profile-token driven and local without generated runtime code, hosted providers, auth, database state, or compatibility shims.

## 2026-07-04 - Replaceable Asset Theme Matching

Milestone:
- Studio replaceable sprites now require an explicit local theme-folder match before substituting card/item/choice art.
- Theme matching uses normalized token sequences instead of substring checks, so names such as `toybox` do not accidentally select the `toys` folder.
- Unknown requested themes now leave profile cards/items without local replacement sprites until a matching asset folder is added.

Supportive changes:
- Added Studio asset-library coverage for an unknown `toybox` theme that must not borrow unrelated toy sprites.

Validation:
- `pnpm test tests/studio-asset-library.test.tsx`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps `+with {asset}` replacement behavior folder-driven and forward-extensible without generated runtime code, hosted providers, auth, database state, or compatibility fallbacks.

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
- Replaced the generic asset text resolution source with `catalog-asset-alias` and `freeform-asset-request`.
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
- Updated docs and source-scan tests so stale removed-stack terminology is not preserved as a public framework concept.
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
