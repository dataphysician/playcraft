# Playcraft Milestones

## 2026-07-05 - Exact Trusted Preview Selected Keys

Milestone:
- Studio trusted preview now requires a selected component key to match exactly one replay render request.
- Imported/custom profiles with duplicate selected render request keys fail closed instead of rendering the first matching request.

Supportive changes:
- Studio UI tests cover duplicate non-primary selected render request keys.
- Source scans block returning to first-match selected render request lookup.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`
- removed-provider exact scan

Constraint notes:
- Keeps Developer-tab trusted preview selection replay-owned and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or render-request key order inference.

## 2026-07-05 - Exact Pack Requirement Lookup

Milestone:
- Pack template metadata now resolves mechanic capabilities, rule categories, and component capabilities through exact-one authored pack matches.
- Duplicate pack entries fail closed instead of letting template required ids come from whichever definition appears first.

Supportive changes:
- Pack tests verify exported template required ids resolve back to exactly one authored mechanic, rule, and component definition.
- Source scans block first-match pack requirement lookup from returning.

Validation:
- `pnpm test packages/packs/test/mvp-profiles.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`
- removed-provider exact scan

Constraint notes:
- Keeps template catalog requirements explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or pack definition order inference.

## 2026-07-05 - Fail-Closed Studio Transcript Source Mismatch

Milestone:
- Studio service clients now reject Moonshine transcript records when callers explicitly mark the request source as text.
- The Studio transport boundary no longer silently rewrites contradictory text-source transcript input into a transcript request.

Supportive changes:
- Studio UI tests prove mismatched text source plus transcript records fail before transport send.
- Source scans pin the Studio client mismatch guard in the Moonshine-explicit input contract.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`
- removed-provider exact scan

Constraint notes:
- Keeps user-facing Studio input source contracts explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or silent text/transcript source coercion.

## 2026-07-05 - Exact Asset Edit Operation Components

Milestone:
- Builder asset request metadata now requires exactly one profile component for each authored asset edit operation.
- Imported/custom profiles with duplicate operation components fail closed instead of editing whichever matching component appears first.

Supportive changes:
- Builder tests cover duplicate sorting operation components during asset edits.
- Source scans block returning to first matching component lookup for asset edit request props.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`
- removed-provider exact scan

Constraint notes:
- Keeps imported profile asset edits explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or first-match component inference.

## 2026-07-05 - Authored Template Input Modality

Milestone:
- MVP template assembly now selects mechanics through a template-authored primary input modality.
- Mechanic selection no longer depends on the first entry in `PlaycraftAssemblyRequest.targetModalities`.

Supportive changes:
- Pack tests prove reversed modality order still assembles the same mechanics and pointer-only requests fail for touch-authored templates.
- Source scans require `requiredTemplateTargetModality` and block `context.request.targetModalities[0]`.

Validation:
- `pnpm test packages/packs/test/mvp-profiles.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`
- removed-provider exact scan

Constraint notes:
- Keeps toddler play input explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or request-array-order modality inference.

## 2026-07-05 - Stable Trusted Preview Component Keys

Milestone:
- Studio trusted preview component selection now uses the replay render request id as the component key.
- Component keys no longer depend on `componentId` plus render request array index.

Supportive changes:
- Studio UI tests assert preview summaries expose the stable render request id derived from the profile and component binding.
- Source scans block returning to index-based `renderRequestKey` calls.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`
- removed-provider exact scan

Constraint notes:
- Keeps Studio preview selection replay-owned and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or array-order component identity.

## 2026-07-05 - Fail-Closed Replay Manifest Tool Metadata

Milestone:
- Replay render requests now require registered component manifests before copying emitted tool names into trusted render metadata.
- Studio trusted preview summaries now require trusted registry manifests instead of reporting missing manifests as empty tool lists.

Supportive changes:
- Core replay tests cover missing component manifests during emitted-tool metadata construction.
- Source scans block optional `manifest?.emittedTools` fallbacks in replay and Studio preview summaries.

Validation:
- `pnpm test packages/core/test/replay.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`
- removed-provider exact scan

Constraint notes:
- Keeps trusted local preview metadata explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or non-interactive fallbacks for missing component manifests.

## 2026-07-05 - Explicit Text Asset Theme Length Errors

Milestone:
- Text-derived asset edit themes now fail with a service error when they exceed the 80-character `BuilderAssetEdit.theme` contract.
- Asset intent regexes no longer cap captured theme text before the service can validate it.

Supportive changes:
- Local service tests cover over-long freeform asset themes.
- Source scans block both service `.slice(0, 80)` truncation and the old asset intent regex `{1,80}` capture cap.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`
- removed-provider exact scan

Constraint notes:
- Keeps text and Moonshine-derived local asset requests forward-only and non-lossy without hosted providers, generated runtime code, auth, database state, compatibility shims, or silent theme truncation.

## 2026-07-05 - Complete Pack Manifest Capabilities

Milestone:
- Pack manifests now preserve every unique authored provided capability instead of silently capping advertised tags at 12.
- The mechanics pack advertises the full capability surface needed by local agent tooling and future catalog retrieval.

Supportive changes:
- Pack tests compare the mechanics pack manifest to the complete unique capability set from authored mechanic definitions.
- Source scans require `uniqueCapabilityTags` and block returning to the `.slice(0, 12)` manifest cap.

Validation:
- `pnpm test packages/packs/test/mvp-profiles.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`
- removed-provider exact scan

Constraint notes:
- Keeps local pack discovery explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or truncated capability advertisement.

## 2026-07-05 - Authored Helper Template Alias Summaries

Milestone:
- Helper-created memory, sorting, and sequence templates now require authored `requestAliasSummary` copy.
- Pack catalog summaries no longer derive user-facing game tips from the first three request aliases.

Supportive changes:
- Pack tests assert authored summaries for helper-created templates such as Shape Memory and Color Sorting.
- Source scans block `requestAliasSummary(input.aliases)`, the removed helper function, and `aliases.slice(0, 3)` in pack source.

Validation:
- `pnpm test packages/packs/test/mvp-profiles.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`
- removed-provider exact scan

Constraint notes:
- Keeps agent-facing catalog text authored and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or alias-order summary heuristics.

## 2026-07-05 - Authored Component Mechanic Bindings

Milestone:
- MVP pack profile assembly now uses template-authored component mechanic capability lists for every component binding.
- Component `mechanicBindingIds` no longer come from selected component manifest support order capped to the first two matches.

Supportive changes:
- Pack tests assert exact component mechanic binding IDs for memory, sorting, and sequence profiles.
- Source scans require `componentMechanicCapabilities` and `requiredComponentMechanicBindingIds`, and block the old supported-mechanic filter plus `.slice(0, 2)` cap.

Validation:
- `pnpm test packages/packs/test/mvp-profiles.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`
- removed-provider exact scan

Constraint notes:
- Keeps bundled template assembly explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or list-order component mechanic inference.

## 2026-07-05 - Exact Text Asset Item Limits

Milestone:
- Service text-derived asset edits now reject over-long explicit item lists instead of truncating them before contract validation.
- `+with` and asset-request text keeps the 12-item `BuilderAssetEdit` limit visible as an error path.

Supportive changes:
- Local service tests cover 13 text-derived asset items.
- Source scans block returning to `.slice(0, 12)` truncation in service text asset parsing.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`

Constraint notes:
- Keeps text and Moonshine-derived local asset requests forward-only and non-lossy without hosted providers, generated runtime code, auth, database state, compatibility shims, or silent item truncation.

## 2026-07-05 - Exact Explicit Asset Edit Items

Milestone:
- Builder asset edits now distinguish explicit agent-supplied item lists from catalog and freeform theme item pools.
- Explicit `assetEdit.items` must match the authored profile shape exactly for memory pairs, sorting bins, and sequence tokens instead of silently dropping unused extras.

Supportive changes:
- Catalog and freeform themes can still provide broader local asset pools while profile-specific prompts and props select the needed subset.
- Builder tests cover under-specified and over-specified explicit item lists, and source scans require explicit/catalog/freeform item-source handling.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`

Constraint notes:
- Keeps agent asset requests deterministic and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or silent loss of explicitly requested asset items.

## 2026-07-05 - Explicit Featured Request Tip Games

Milestone:
- Builder catalog request tips now expose `featuredGames` as contract data separate from the complete `availableGames` list.
- The service request-tip summary now uses explicit featured template IDs instead of truncating catalog order with `availableGames.slice(0, 5)`.

Supportive changes:
- Request-tip examples and featured games now validate their authored template IDs against the current catalog instead of silently filtering missing entries.
- Service, Studio, contract, and source-scan tests cover the new featured-game contract and block returning to visible-game slicing.

Validation:
- `pnpm test tests/studio-ui.test.ts packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`

Constraint notes:
- Keeps agent-facing catalog guidance explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, catalog-order truncation, or silent request-tip filtering.

## 2026-07-05 - Authored Pack Template Examples

Milestone:
- Reusable MVP template helpers now require authored `exampleRequest` text for every game template instance.
- Pack examples no longer fall back to sentence-casing the first request alias when new memory, sorting, or sequence templates are added.

Supportive changes:
- Every helper-created bundled toddler game template now provides explicit example request copy.
- Source scans block optional helper examples, `sentenceCase`, and first-alias-derived example text in packs.

Validation:
- `pnpm test packages/packs/test/mvp-profiles.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`

Constraint notes:
- Keeps agent-facing template catalog copy authored and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or alias-derived text heuristics.

## 2026-07-05 - Versioned Trusted Render Requests

Milestone:
- Component render requests now carry the exact component manifest version selected by profile replay.
- Trusted renderer and Studio preview manifest lookup now resolve by component id plus version, matching the registry key used for trusted component registration.

Supportive changes:
- Renderer tests cover same-id multi-version registration and reject unregistered component versions.
- Contract/source scans require `componentVersion` and block returning to id-only trusted component dispatch.

Validation:
- `pnpm --filter @playcraft/renderer test`
- `pnpm --filter @playcraft/contracts test`
- `pnpm test -- tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `git diff --check`

Constraint notes:
- Keeps trusted preview dispatch deterministic and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or first-registered component version fallback.

## 2026-07-05 - Explicit Service Request Tip Examples

Milestone:
- Service catalog request-tip examples are now authored in an explicit local policy keyed by template id.
- The catalog no longer pairs the first three templates with asset themes by list index or modulo arithmetic.

Supportive changes:
- Service/source tests continue to assert the same user-facing tips while source scans block the old index-derived example path and removed `sentenceCase` helper.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`

Constraint notes:
- Keeps agent-facing catalog guidance local, explicit, and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or asset-theme order-derived examples.

## 2026-07-05 - Authored Memory Template Pair Counts

Milestone:
- Bundled memory template construction now uses every authored `pairItems` entry instead of truncating generated cards to the first two pairs.
- Number Memory now exercises a three-pair bundled profile, proving the reusable template helper supports more than the default Memory Match shape.

Supportive changes:
- Pack tests assert Number Memory emits six cards and three explicit pair groups.
- Source scans block the old `items.slice(0, 2).flatMap` memory template truncation path.

Validation:
- `pnpm test packages/packs/test/mvp-profiles.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`

Constraint notes:
- Keeps bundled toddler memory templates profile-authored and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or hard-coded two-pair template assumptions.

## 2026-07-05 - Exact Asset Request Item Metadata

Milestone:
- Builder asset requests now store and prompt for only the replacement items actually used by the authored profile shape.
- Studio local replacement folder discovery now uses asset edit theme metadata only, so exact item metadata such as `toy-1` and `toy-2` does not mask the real `toys` sprite folder.

Supportive changes:
- Builder tests assert memory, sorting, sequence, and imported custom memory prompts/metadata expose exact used items and omit unused catalog suggestions.
- Studio asset-library and UI tests assert exact item metadata still maps local replacement sprites.
- Source scans block returning to `assetEditItems: edit.items`, old prompt-wide item lists, and item metadata as a folder hint.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/studio-asset-library.test.tsx tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`

Constraint notes:
- Keeps local asset generation requests profile-authored and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, unused catalog item prompts, or item-token folder inference.

## 2026-07-05 - Template-Scoped Asset Edit Inheritance

Milestone:
- Active asset edits now carry forward only when an update resolves to the same active template.
- Switching to another game without an explicit asset request clears stale asset edit state instead of applying the previous game theme to the new profile.

Supportive changes:
- Local service tests cover resolver-level template switches, active-template updates, and service-envelope session state after a game switch.
- Source scans require the explicit `allowActiveAssetEdit` gate and block unconditional active asset edit inheritance.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`

Constraint notes:
- Keeps game switching and asset replacement independently explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or stale cross-template asset inheritance.

## 2026-07-05 - Authored Memory Pair Asset Coverage

Milestone:
- Memory asset edits now derive replacement card counts from authored profile `cards` and `pairs` props instead of assuming the bundled two-pair layout.
- Memory pair edits require authored `cards`, `pairs`, and `columns` props and reject under-covered replacement item sets.

Supportive changes:
- Builder tests cover imported three-pair memory profiles and rejection of short explicit replacement item lists.
- Source scans require authored memory pair-count helpers and block the old column fallback and pair-helper call without a pair count.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`

Constraint notes:
- Keeps edit-aware local memory assets profile-authored and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, bundled-template pair-count assumptions, or missing-column defaults.

## 2026-07-04 - Exact Sequence Asset Item Coverage

Milestone:
- Sequence asset edits now require enough replacement items to cover every authored sequence token.
- Sequence remapping no longer cycles short replacement lists by modulo, preventing accidental duplicated or mismatched sequence choices.

Supportive changes:
- Builder tests cover successful catalog-backed sequence edits and rejection of explicit under-covered sequence edits.
- Source scans block the old modulo replacement path and require the new sequence coverage error.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`

Constraint notes:
- Keeps edit-aware local sequence assets explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or token-order cycling fallback.

## 2026-07-04 - Fail-Closed Ambiguous Template Requests

Milestone:
- Text and Moonshine transcript requests that match multiple game templates now fail closed with an explicit `templateId` instruction instead of staying on the active game.
- `BuilderIntentResolution` no longer exposes `ambiguous-template-match` as a successful template decision source.

Supportive changes:
- Local service tests cover ambiguous active-session update text and first-run ambiguous text.
- Source scans assert ambiguous template errors require explicit template IDs and block the retired intent-resolution enum value.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`

Constraint notes:
- Keeps game switching explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, default-template fallback, or active-session ambiguity inheritance.

## 2026-07-04 - Explicit Sorting Asset Item Tokens

Milestone:
- Sorting asset edits now emit explicit asset item IDs such as `toy-1` and `toy-2` mapped to authored bins instead of color-prefixed theme labels.
- Studio local item sprite replacement no longer assigns unmatched tokens to sprites by token order.

Supportive changes:
- Builder tests assert sorting item IDs and target mappings stay explicit after asset edits.
- Studio asset-library tests assert sorting replacements use namespaced exact item IDs and do not create stale color-prefixed replacement keys.
- Source scans block the old color-label sorting item generation and the old index-based sprite fallback.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/studio-asset-library.test.tsx tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-stack exact scan confirmed no active removed hosted-runtime markers in source.
- Sorting asset token source scan confirmed explicit item IDs and no index-based replacement sprite fallback.

Constraint notes:
- Keeps edit-aware local asset replacement explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or token-order sprite substitution.

## 2026-07-04 - Fail-Closed Planner Recipe Ties

Milestone:
- Deterministic planner recipe selection now rejects equal-score recipe matches instead of choosing by recipe list order.
- Unique strongest recipe matches still assemble normally, preserving bundled MVP profile assembly while making future extension conflicts explicit.

Supportive changes:
- Core planner tests cover unique strongest matches and equal-score ambiguity.
- Source scans require best-score candidate filtering and block the old sort-and-first recipe selection path.

Validation:
- `pnpm test packages/core/test/planner.test.ts packages/packs/test/mvp-profiles.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-stack exact scan confirmed no active removed hosted-runtime markers in source.
- Planner source scan confirmed fail-closed best-candidate selection and no recipe-order tie path.

Constraint notes:
- Keeps local agent recipe assembly explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or recipe list-order selection.

## 2026-07-04 - Exact-One Registry Candidate Selection

Milestone:
- Core capability registry selection now returns a selected candidate only when exactly one registry entry matches the query.
- Unversioned registry lookups now reject ids with multiple registered versions instead of returning the first registered version.

Supportive changes:
- Core registry tests cover ambiguous multi-candidate selection and unversioned multi-version lookup.
- Source scans require the exact-one selection helper and block first-match registry selection/get paths.

Validation:
- `pnpm test packages/core/test/registries.test.ts packages/packs/test/mvp-profiles.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-stack exact scan confirmed no active removed hosted-runtime markers in source.
- Core registry source scan confirmed exact-one selected candidates and no first-match registry get path.

Constraint notes:
- Keeps reusable agent-facing registries explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or registry insertion-order selection.

## 2026-07-04 - Fail-Closed Paired Card Replacement Sprites

Milestone:
- Studio edit-aware memory card asset replacements now require each paired card group to resolve to exactly one local sprite.
- Conflicting or partially missing local sprites for a card pair now fail closed instead of using the first resolved pair token.

Supportive changes:
- Studio asset-library tests cover conflicting paired-card sprite IDs and partial local sprite coverage.
- Source scans require the single-pair sprite guard and block the old first-resolved replacement sprite lookup.

Validation:
- `pnpm test tests/studio-asset-library.test.tsx tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-stack exact scan confirmed no active removed hosted-runtime markers in source.
- Paired card replacement source scan confirmed the exact-one local sprite guard and no first-resolved lookup path.

Constraint notes:
- Keeps edit-aware local asset replacement explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or pair-token order heuristics.

## 2026-07-04 - Reject Default Template Assembly Fallback

Milestone:
- First-run assemble requests now require an explicit template id or recognizable game request text before selecting a game template.
- The public intent-resolution contract no longer advertises a `default-template` decision source for hidden first-run template selection.

Supportive changes:
- Service tests cover vague first-run assemble requests through both the local service and resolver API.
- Source scans require the explicit assemble error and block the old service default-template decision and catalog-default active-template fallback.

Validation:
- `pnpm test packages/service/test/local-service.test.ts packages/contracts/test/schemas.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-stack exact scan confirmed no active removed hosted-runtime markers in source.
- Default-template source scan confirmed the explicit first-run assemble error and no old default-template decision path.

Constraint notes:
- Keeps first-run game assembly explicit and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or hidden catalog-default game selection.

## 2026-07-04 - Explicit Studio Timeline Detail Selection

Milestone:
- Studio Developer timeline detail rendering now shows only the explicitly selected timeline event.
- Stale or missing selected timeline ids now surface a visible status instead of falling back to the latest timeline event.

Supportive changes:
- Studio timeline selection now uses named initial, latest, and selected-entry helpers rather than inline timeline indexing fallbacks.
- Source scans require the explicit timeline selection helpers and block latest-event detail fallback paths.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-stack exact scan confirmed no active removed hosted-runtime markers in source.
- Studio timeline source scan confirmed explicit helpers and no latest-event detail fallback path.

Constraint notes:
- Keeps Studio timeline inspection explicit and fail-closed without hosted providers, generated runtime code, auth, database state, compatibility shims, or timeline event-order display fallbacks.

## 2026-07-04 - Fail-Closed Builder Preview Replay Events

Milestone:
- Builder preview actions now require a single replay event before emitting replay.event custom events.
- Imported or custom profiles with empty or multi-event replay logs no longer let preview actions publish a first replay event by event-log order.

Supportive changes:
- Builder session tests cover imported profiles with ambiguous replay event logs before preview actions.
- Source scans require the single replay-event guard and block first replay-event indexing from the builder preview action path.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-stack exact scan confirmed no active removed hosted-runtime markers in source.
- Builder replay-event source scan confirmed the single-event guard and no first replay-event indexing path.

Constraint notes:
- Keeps agent-facing preview replay events explicit and fail-closed without hosted providers, generated runtime code, auth, database state, compatibility shims, or replay event-order heuristics.

## 2026-07-04 - Fail-Closed Studio Primary Preview Auto-Selection

Milestone:
- Studio Developer tab now auto-selects a trusted preview primary surface only when exactly one primary preview component summary exists.
- Duplicate primary preview surfaces now flow to the trusted preview fail-closed error instead of being hidden by first-primary UI auto-selection.
- Live App profile contract failures now render a visible fail-closed app error instead of crashing the Studio shell.

Supportive changes:
- Studio UI tests cover duplicate primary profiles through the full Developer tab path.
- Studio asset-library tests cover visible Live App failures for ambiguous live-surface components.
- Source scans require exact-one primary preview auto-selection and block first-match primary summary selection from returning.
- Source scans require the Live App failure boundary for ambiguous live-surface component resolution.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/studio-asset-library.test.tsx tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-stack exact scan confirmed no active removed hosted-runtime markers in source.
- Studio primary preview auto-selection source scan confirmed exact-one filtering and no first-match summary lookup path.
- Live App failure-boundary source scan confirmed ambiguous profile errors are surfaced in UI.

Constraint notes:
- Keeps Studio trusted preview selection and Live App profile handling explicit and fail-closed without hosted providers, generated runtime code, auth, database state, compatibility shims, or component-summary order heuristics.

## 2026-07-04 - Fail-Closed Studio Trusted Preview Primary Requests

Milestone:
- Studio trusted preview now rejects duplicate render requests for the template-declared primary live surface capability.
- Default trusted preview rendering no longer selects the first primary render request when imported or custom profiles create duplicate primary component bindings.

Supportive changes:
- Studio UI tests cover duplicate primary trusted preview render requests and assert a visible fail-closed preview error.
- Source scans require duplicate-aware trusted preview primary filtering and block first-match primary lookup from returning.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-stack exact scan confirmed no active removed hosted-runtime markers in source.
- Trusted preview primary source scan confirmed duplicate-aware filtering and no first-match render-request lookup path.

Constraint notes:
- Keeps Studio trusted preview selection template-owned and fail-closed without hosted providers, generated runtime code, auth, database state, compatibility shims, or replay render-request order heuristics.

## 2026-07-04 - Fail-Closed Builder Primary Preview Requests

Milestone:
- Builder preview state now rejects replay output with multiple render requests for the template-declared primary live surface capability.
- Builder preview actions no longer select the first primary render request when imported or custom profiles create duplicate primary component bindings.

Supportive changes:
- Builder session tests cover duplicate primary preview render requests through imported profiles.
- Source scans require duplicate-aware primary render-request filtering and block first-match primary preview lookup from returning.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-stack exact scan confirmed no active removed hosted-runtime markers in source.
- Builder primary preview source scan confirmed duplicate-aware filtering and no first-match render-request lookup path.

Constraint notes:
- Keeps agent-facing preview state template-owned and fail-closed without hosted providers, generated runtime code, auth, database state, compatibility shims, or replay render-request order heuristics.

## 2026-07-04 - Fail-Closed Live Surface Component Resolution

Milestone:
- Live App component resolution now rejects duplicate components for a template-declared live surface capability instead of selecting the first profile component.
- Studio local asset replacement publishing now rejects duplicate components for a template-declared asset replacement source instead of selecting the first profile component.

Supportive changes:
- Studio asset-library tests cover duplicate profile components for local replacement publishing.
- Live App tests cover duplicate profile components for playable rendering.
- Source scans block first-match component capability lookup from returning in the Live App and local asset library.

Validation:
- `pnpm test tests/studio-asset-library.test.tsx tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Component capability source scan confirmed duplicate-aware filtering and no first-match lookup path.

Constraint notes:
- Keeps template-declared live surface and asset replacement roles fail-closed and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or component-order heuristics.

## 2026-07-04 - Namespaced Live App Asset Replacements

Milestone:
- Studio local asset library now publishes token replacement sprites only under template-authored namespaces such as `card:`, `item:`, and `choice:`.
- Live App token rendering now consumes namespaced token replacements only and no longer falls back to bare token keys.

Supportive changes:
- Studio asset-library tests verify local sprites are not exposed under bare token keys.
- Live App tests verify caller-provided bare card replacements are ignored when a namespaced local replacement exists.
- Source scans block bare token replacement publishing and consumption from returning.

Validation:
- `pnpm test tests/studio-asset-library.test.tsx tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Asset replacement namespace source scan confirmed no bare token publishing or consumption paths.

Constraint notes:
- Keeps Live App asset substitution template-owned and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or bare-token replacement heuristics.

## 2026-07-04 - Concrete Studio Success Profiles

Milestone:
- Studio generate/update success summaries now require a concrete active profile.
- Studio profile import success messages now require the imported session to include an active profile payload.
- Removed generic `"game"` and `"profile"` success-name fallbacks from the Studio command/import path.

Supportive changes:
- Studio UI tests reject imported sessions that omit active profile payloads.
- Source scans guard the active-profile requirement and block generic success-name fallbacks from returning.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Studio active-profile source scan confirmed `requireSessionActiveProfile` usage and no generic profile-name fallback.

Constraint notes:
- Keeps user-facing Studio command/import success states profile-owned and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or vague active-profile recovery.

## 2026-07-04 - Template-Owned Builder Preview Run IDs

Milestone:
- Builder preview-action events now derive their run id from the active session template id.
- The previous `"preview"` placeholder run-id branch was removed from the builder preview path.

Supportive changes:
- Builder preview code now fails closed when a preview session lacks an active template id.
- Builder tests verify preview events use the concrete template run id for imported visual-first profiles.
- Source scans block the removed `session.templateId ?? "preview"` expression.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Builder preview run-id source scan confirmed explicit `requireSessionTemplateId` usage and no preview placeholder recovery.

Constraint notes:
- Keeps builder preview AG-UI events template-owned and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or placeholder run provenance.

## 2026-07-04 - Session-Bound Service Updates

Milestone:
- Local service `update` now requires an existing active game session before resolving intent.
- Service update intent resolution uses the active session template id instead of falling back to the catalog default template.
- Empty-session update requests now fail with an explicit "assemble a game before updating" error.

Supportive changes:
- Service tests cover direct and envelope update requests against sessions without active games.
- Source scans guard the service update boundary and block the removed empty-session default-template recovery expression.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Service update source scan confirmed `requireActiveSessionForUpdate` is used and the old `state?.activeTemplateId ?? catalog.defaultTemplateId` recovery is absent.

Constraint notes:
- Keeps user-facing service updates session-bound and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or default-template recovery for empty sessions.

## 2026-07-04 - Run-Owned AG-UI Custom Events

Milestone:
- `PlaycraftAgUiEventEnvelopeSchema` now requires `runId`.
- `createPlaycraftEnvelope` requires callers to provide a run id.
- `playcraftCustomEvent` now emits custom AG-UI events with the envelope run id instead of a placeholder run.

Supportive changes:
- AG-UI tests reject custom envelopes without run ids.
- Contract tests reject Playcraft AG-UI envelopes with missing run ids.
- Source scans block the removed `run.unspecified` and `envelope.runId ??` recovery paths.

Validation:
- `pnpm test packages/ag-ui/test/events.test.ts packages/contracts/test/schemas.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- AG-UI run-id source scan confirmed no placeholder run-id fallback.

Constraint notes:
- Keeps agent-facing AG-UI event streams run-owned and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or placeholder event provenance.

## 2026-07-04 - Self-Describing Service Session Templates

Milestone:
- `BuilderSessionSnapshotSchema` now requires profile-bearing snapshots to include an active template id.
- Session active template ids must match both the profile template snapshot and preview active template id.
- Local service session merging no longer restores missing snapshot template ids from service-local state.

Supportive changes:
- Contract tests cover missing and mismatched session template ids.
- Service tests reject builder snapshots that omit active template ids instead of recovering from stored session state.
- Source scans guard the stricter snapshot messages and block the removed stale-template recovery expression.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Service snapshot source scan confirmed no `state?.activeTemplateId ?? snapshot.activeTemplateId` recovery path.

Constraint notes:
- Keeps service session snapshots self-describing and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or stale session-template recovery.

## 2026-07-04 - Studio Trusted Preview Primary Surface

Milestone:
- Studio trusted preview now defaults to `profile.template.liveSurface.componentCapabilities.primary` instead of `replay.renderRequests[0]`.
- Developer tab component selection now resets to the new profile's primary preview surface when the active profile changes.

Supportive changes:
- Trusted preview summaries mark the primary preview surface for UI selection and inspection.
- Studio UI tests cover visual-first component ordering and primary-surface summaries.
- Source scans block render-request and component-summary order fallbacks from returning in the Studio preview path.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Studio preview source scan confirmed template-primary selection and no active `renderRequests[0]` or `componentSummaries[0]` fallback.

Constraint notes:
- Keeps Developer-tab trusted previews template-owned and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or render-request/component-order heuristics.

## 2026-07-04 - Template-Primary Builder Preview Surface

Milestone:
- Builder preview state now selects the active preview component from `profile.template.liveSurface.componentCapabilities.primary`.
- Builder preview interactions now target the template live-surface primary render request instead of the first interactive render request.

Supportive changes:
- Builder tests cover visual-first component ordering while preserving live-surface primary preview behavior.
- Source scans block render-request order fallback and the removed first-interactive helper.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Preview surface source scan confirmed live-surface primary selection and no render-request order fallback.

Constraint notes:
- Keeps preview surface selection template-owned and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or render-request order heuristics.

## 2026-07-04 - Request-Owned Generated Asset Binding

Milestone:
- MVP pack assembly now resolves generated illustration assets by `requestId`.
- Component asset bindings no longer depend on generated asset array order.

Supportive changes:
- Pack tests assert memory, sorting, and sequence component illustration bindings match assets generated for the authored request ids.
- Source scans block the removed first-generated-asset binding path.

Validation:
- `pnpm test packages/packs/test/mvp-profiles.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Generated asset binding source scan confirmed request-id lookup and removed first-generated-asset selection.

Constraint notes:
- Keeps generated asset binding request-owned and contract-shaped without hosted providers, generated runtime code, auth, database state, compatibility shims, or generated asset order heuristics.

## 2026-07-04 - Single-Tool Trusted Component Emission

Milestone:
- Trusted component interaction emission now requires exactly one declared emitted tool before emitting.
- Pack trusted components no longer select emitted tools through first-item array indexing.

Supportive changes:
- Pack tests assert every emitting component manifest has exactly one emitted tool.
- Source scans pin the single-tool emission helper and block the removed first-tool helper.

Validation:
- `pnpm test packages/packs/test/mvp-profiles.test.ts packages/renderer/test/trusted-renderer.test.tsx tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Trusted component emission source scan confirmed the single-tool helper and removed first-tool selection.

Constraint notes:
- Keeps trusted component interactions contract-shaped and fail-closed without hosted providers, generated runtime code, auth, database state, compatibility shims, or emitted-tool order heuristics.

## 2026-07-04 - Explicit Component Render Mechanic Bindings

Milestone:
- Component bindings now carry a required `renderMechanicBindingId`.
- Replay render requests now use the explicit render mechanic binding instead of reading the first component mechanic binding.
- MVP template assembly now authors component render mechanic capabilities and validates them against selected component mechanics.

Supportive changes:
- Saved profile fixtures were refreshed with explicit render mechanic bindings.
- Pack tests assert the explicit render bindings for memory, sorting, and sequence profiles.
- Source scans block list-order render mechanic inference.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/core/test/replay.test.ts packages/packs/test/mvp-profiles.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Render mechanic binding source scan confirmed explicit component render bindings and removed list-order replay inference.

Constraint notes:
- Keeps replay and template assembly contract-authored and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or component mechanic binding order heuristics.

## 2026-07-04 - Single-Tool Preview Interaction Contract

Milestone:
- Builder preview actions now require the selected interactive render request to declare exactly one emitted tool.
- Preview tool selection no longer reads the first emitted event by array index.

Supportive changes:
- Source scans pin the strict preview tool helper and block index-based emitted-tool selection.
- Existing builder preview tests continue to cover real memory and sorting preview interactions through the stricter path.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Preview tool source scan confirmed strict single-tool selection and removed index-based emitted-tool selection.

Constraint notes:
- Keeps preview interactions fail-closed and contract-shaped without hosted providers, generated runtime code, auth, database state, compatibility shims, or emitted-tool order heuristics.

## 2026-07-04 - Template-Authored Mechanic Event Bindings

Milestone:
- MVP templates now publish explicit mechanic event-binding maps for memory, sorting, and sequence families.
- Pack assembly now validates authored mechanic event bindings against the selected mechanic instead of using the first emitted event.

Supportive changes:
- Pack tests assert assembled memory, sorting, and sequence mechanic event bindings.
- Source scans block the removed emitted-event-order inference path.

Validation:
- `pnpm test packages/packs/test/mvp-profiles.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Mechanic event-binding source scan confirmed authored template maps and removed emitted-event-order inference.

Constraint notes:
- Keeps template assembly contract-authored and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or mechanic event-order heuristics.

## 2026-07-04 - Explicit Builder CLI Preview Interaction

Milestone:
- Builder CLI preview commands now require caller-provided `--interaction primary`.
- Builder CLI command construction no longer creates a preview interaction payload internally.

Supportive changes:
- Builder CLI tests reject missing preview interaction, interaction flags on non-preview commands, and missing interaction flag values.
- Source scans pin the builder CLI interaction flag and block the removed preview-action interaction default.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Builder CLI interaction source scan confirmed the explicit flag/schema path and removed preview-action interaction default.

Constraint notes:
- Keeps builder preview interactions caller-owned and contract-shaped without hosted providers, generated runtime code, auth, database state, compatibility shims, or CLI-owned interaction defaults.

## 2026-07-04 - Catalog-Owned Freeform Asset Item Suffixes

Milestone:
- Builder catalog now publishes `freeformItemSuffixes` for local freeform asset-folder item naming.
- Builder freeform asset edits now use the shared assets package suffix policy instead of builder-owned hard-coded fallback item IDs.

Supportive changes:
- Contract and service catalog tests validate the published `freeformItemSuffixes` metadata.
- Source scans pin the shared suffix policy and block the removed builder-local generated item fallback.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Freeform suffix source scan confirmed the shared policy and removed builder-local generated item fallback.

Constraint notes:
- Keeps freeform local replacement folders discoverable and contract-shaped without hosted providers, generated runtime code, auth, database state, compatibility shims, or builder-local item suffix heuristics.

## 2026-07-04 - Moonshine Streaming CPU Config Schema

Milestone:
- `BuilderInputRequestSchema` now uses `MoonshineStreamingCpuConfigSchema` for `moonshineConfig`.
- Local service input records now use `MOONSHINE_STREAMING_CPU_CONFIG` when creating Moonshine transcript-backed builder inputs.

Supportive changes:
- Source scans block the removed generic config schema and service constant names.
- Older milestone text now references the current Moonshine Streaming CPU config schema name.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-name scan returned only guard assertions; removed-provider/key scan returned only guard/planning references.

Constraint notes:
- Keeps the input config contract Moonshine Streaming CPU-specific without hosted providers, generated runtime code, auth, database state, compatibility shims, or generic audio config aliases.

## 2026-07-04 - Moonshine-Named Builder Input Config

Milestone:
- `BuilderInputRequestSchema` now uses `moonshineConfig` with `MoonshineStreamingCpuConfigSchema`.
- Local service builder input construction now emits the Moonshine-named config when the input source is `moonshine-transcript`.

Supportive changes:
- Contract fixtures and Studio UI assertions now validate `moonshineConfig`.
- Source scans pin the Moonshine-named field and block the removed generic builder-input config field.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Exact removed-vendor source scan returned no matches; removed-provider/key scan returned only guard/planning references.

Constraint notes:
- Keeps the input contract Moonshine Streaming CPU-specific without hosted providers, generated runtime code, auth, database state, compatibility shims, or generic audio-input config abstractions.

## 2026-07-04 - Moonshine Terminology In UI Tests

Milestone:
- Studio UI tests now name transcript command fixtures after Moonshine instead of the removed speech abstraction.
- The Moonshine-explicit transcript source scan now covers Studio and Mobile UI tests in addition to source and framework docs.

Supportive changes:
- Source scan coverage blocks legacy `speech-transcript`, `speechTranscript`, and `SpeechTranscriptionConfig` markers from UI tests.

Validation:
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm test tests/studio-ui.test.ts tests/mobile-shell.test.tsx`
- `pnpm build`
- `pnpm test`

Constraint notes:
- Keeps text/Moonshine-only input vocabulary forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or stale speech abstractions.

## 2026-07-04 - Explicit Service Preview Interactions

Milestone:
- `BuilderServiceRequestSchema` now carries an explicit preview interaction payload.
- Local service preview no longer injects `{ action: "primary" }` internally.
- Studio and CLI preview paths send explicit preview interaction payloads through the service envelope.

Supportive changes:
- Contract tests reject preview requests without interaction and non-preview requests with interaction.
- Service catalog and CLI tests expose `interaction` as a required preview request field.
- Source scans block service-side preview interaction injection while preserving Studio-owned replay intent.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/studio-ui.test.ts tests/mobile-shell.test.tsx`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps preview tooling callable and contract-shaped without hosted providers, generated runtime code, auth, database state, compatibility shims, or service-side interaction defaults.

## 2026-07-04 - Ambiguous Asset Requests Fail Closed

Milestone:
- Asset request parsing now collects all matching asset directives instead of selecting the first match.
- Multiple distinct asset targets in one request fail explicitly and direct callers can use structured `assetEdit`.
- Asset intent parsing is clause-based so repeated directives such as multiple `Use assets with ...` clauses are visible.

Supportive changes:
- Service tests reject ambiguous asset edit text instead of selecting the first match.
- Source scans pin clause-based asset parsing and block the removed first-match parser.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps asset replacement requests explicit and source-owned without hosted providers, generated runtime code, auth, database state, compatibility shims, or first-match asset inference.

## 2026-07-04 - Ambiguous Template Requests Fail Closed

Milestone:
- First-time requests that match multiple game templates now fail explicitly instead of selecting the default template.
- Ambiguous update requests still preserve the active template and record `ambiguous-template-match`.
- Default template selection remains limited to genuinely unmatched first-time requests.

Supportive changes:
- Service tests reject ambiguous first-time template text instead of defaulting to Memory Match.
- Source scans block the removed `input.activeTemplateId ?? DEFAULT_GAME_TEMPLATE_ID` ambiguous fallback.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps game switching explicit and catalog-owned without hosted providers, generated runtime code, auth, database state, compatibility shims, or ambiguous default-template recovery.

## 2026-07-04 - Source-Owned Direct Local Inputs

Milestone:
- `LocalBuilderInput` and `resolveBuilderInputCommand` now accept transcript-owned input without duplicated plain text.
- Direct local text input rejects Moonshine transcript records instead of accepting mixed source payloads.
- Direct local `moonshine-transcript` input requires a Moonshine transcript record before builder input construction.

Supportive changes:
- Service tests assemble through the direct local API with transcript-only payloads for transcript source.
- Service tests cover direct API rejection for transcript source without records and text source with transcript records.
- Source scans block direct test fixtures from reintroducing `text: transcript.text` duplication.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps direct local API text and Moonshine Streaming CPU inputs source-owned without hosted providers, generated runtime code, auth, database state, compatibility shims, or transcript/text duplication.

## 2026-07-04 - Explicit Transcript Service Source

Milestone:
- `BuilderServiceRequestSchema` now requires Moonshine transcript records to declare `source: "moonshine-transcript"`.
- Studio transport requests now include explicit `source: "moonshine-transcript"` whenever they send a Moonshine transcript record.
- Service source selection no longer infers transcript source from the presence of `moonshineTranscript`.

Supportive changes:
- Contract tests reject transcript service requests with omitted source.
- Studio transport tests assert explicit transcript source on outgoing service requests.
- Service tests update Moonshine transcript fixtures to use explicit source.
- Source scans pin the explicit source helper and Studio transcript payload behavior.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps local Moonshine Streaming CPU inputs explicit at the service boundary without hosted providers, generated runtime code, auth, database state, compatibility shims, or transcript-source inference.

## 2026-07-04 - Source-Owned Builder Input Text

Milestone:
- `createBuilderInputRequest` now branches by declared input source instead of using transcript/text precedence.
- `moonshine-transcript` input construction fails explicitly when the Moonshine transcript record is missing.
- Text input construction uses the supplied text directly and never borrows transcript text.

Supportive changes:
- Service tests continue to reject transcript-sourced requests without Moonshine transcript records.
- Source scans block the removed `moonshineTranscript?.text ?? input.text` fallback expression.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps local text and Moonshine Streaming CPU inputs source-owned without hosted providers, generated runtime code, auth, database state, compatibility shims, or transcript/text precedence recovery.

## 2026-07-04 - Required Profile Template Snapshots Contract

Milestone:
- `GameAssemblyProfileSchema` now requires every game profile to carry a `GameProfileTemplateSnapshot`.
- Profile template snapshots must still match the profile `assemblyRequestId`.
- Builder and Studio template lookup now use `profile.template` directly instead of rechecking for missing snapshots.

Supportive changes:
- Contract tests reject snapshotless profiles at the public profile boundary.
- Builder import tests reject snapshotless imports through `GameAssemblyProfileSchema`.
- Studio live-game and asset-library tests validate snapshotless profiles at the contract boundary instead of consumer-side recovery checks.
- Source scans pin required profile templates and block reintroducing builder/UI missing-template fallback branches.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test tests/studio-asset-library.test.tsx`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps game profiles self-describing at the public contract boundary without hosted providers, generated runtime code, auth, database state, compatibility shims, snapshotless imports, or consumer-side template recovery.

## 2026-07-04 - Profile Export Template Ownership Contract

Milestone:
- `BuilderProfileExportSchema` now requires `templateId` for every portable profile export.
- Profile exports require a profile-carried template snapshot and preview `activeTemplateId`.
- Export `templateId`, `profile.template.id`, and `preview.activeTemplateId` must agree before import.

Supportive changes:
- Contract tests cover missing export template IDs, missing profile template snapshots, missing preview active template IDs, and mismatched template IDs.
- Service tests now reject stale profile export template metadata before import instead of deriving around it.
- Source scans pin profile export template ownership and stale export rejection.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps imported/exported game profiles template-owned and self-describing without hosted providers, generated runtime code, auth, database state, compatibility shims, stale metadata recovery, or importer-side template inference.

## 2026-07-04 - Self-Describing Profile Export Contract

Milestone:
- `BuilderProfileExportSchema` now requires preview metadata and validation output.
- Profile exports require `preview.activeProfileId`.
- Exported profile IDs must match `preview.activeProfileId`, so portable profile handoff cannot rely on importer-side recovery.

Supportive changes:
- Contract tests cover valid profile exports, missing preview metadata, missing validation, missing preview active IDs, and mismatched active IDs.
- Source scans pin the profile export invariant alongside session snapshot and command result active profile checks.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps exported/imported game profiles self-describing without hosted providers, generated runtime code, auth, database state, compatibility shims, or consumer-side profile recovery.

## 2026-07-04 - Command Result Active Profile Contract

Milestone:
- `BuilderCommandResultSchema` now requires preview `activeProfileId` when a result carries a profile payload.
- Command result profile IDs must match `preview.activeProfileId`.
- Empty/profileless command results remain valid for non-profile service states.

Supportive changes:
- Contract tests cover valid profile results, valid profileless results, missing preview active IDs, and mismatched IDs.
- Source scans pin the command result invariant alongside session snapshot active profile checks.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps execution results coherent with validated profile ownership without hosted providers, generated runtime code, auth, database state, compatibility shims, or consumer-side profile recovery.

## 2026-07-04 - Session Snapshot Active Profile Contract

Milestone:
- `BuilderSessionSnapshotSchema` now requires `profile` when `activeProfileId` is present.
- Session snapshots with profile payloads now require `activeProfileId`.
- Session snapshot profile IDs must match `activeProfileId`, while empty pre-assembly snapshots remain valid.

Supportive changes:
- Contract tests cover valid active sessions, valid empty sessions, missing profile payloads, missing active IDs, and mismatched IDs.
- Source scans pin the public session snapshot invariant alongside the Studio response guard.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps active profile ownership in the public local service contract without hosted providers, generated runtime code, auth, database state, compatibility shims, or consumer-side profile recovery.

## 2026-07-04 - Studio Active Profile Response Guard

Milestone:
- Studio transport-backed execution snapshots now require `activeProfileId` and an active profile payload.
- Studio rejects service responses where `session.profile.id` does not match `session.activeProfileId`.
- Mobile shell inherits the same guard through the shared Studio client.

Supportive changes:
- Studio UI tests cover missing active profile payloads and mismatched active profile IDs from transport responses.
- Source scans pin the session-owned active profile helper and block falling back to execution result profile data.

Validation:
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps user-facing app sessions tied to the validated service session snapshot without hosted providers, generated runtime code, auth, database state, compatibility shims, or app-local active profile recovery.

## 2026-07-04 - Authored Asset Edit Props

Milestone:
- Builder sorting asset edits now require authored `bins` props instead of inventing red/blue bins.
- Builder sequence asset edits now require authored `sequence` and `rounds` props instead of fabricating a token or round.
- Imported/custom profiles with incomplete editable props fail explicitly before asset rewrites.

Supportive changes:
- Builder tests cover missing sorting bins, missing sequence tokens, and missing sequence rounds.
- Source scans block the removed red/blue bin fallback and generated sequence fallback shapes.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps profile-specific asset edit operations authored and contract-driven without hosted providers, generated runtime code, auth, database state, compatibility shims, or profile-shape synthesis.

## 2026-07-04 - Schema-Backed Asset Edit Normalization

Milestone:
- Builder asset-edit normalization now parses `BuilderAssetEditSchema` before rewriting profile assets.
- Empty asset edits now fail at the builder boundary instead of recovering to invented `custom assets`.
- Freeform themes such as gems remain supported, but only after the request satisfies the public asset-edit contract.

Supportive changes:
- Builder tests cover empty asset-edit rejection.
- Source scans require schema-backed normalization and block the removed custom-assets recovery literal.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps local builder asset edits aligned with the published contracts without hosted providers, generated runtime code, auth, database state, compatibility shims, or empty-payload fallback behavior.

## 2026-07-04 - Studio Template Snapshot Enforcement

Milestone:
- Studio live-game rendering now requires `profile.template` before selecting a live surface.
- Studio local asset replacement discovery now requires `profile.template` before mapping edit-aware sprites.
- Snapshotless imported/custom profiles fail closed in the UI layer instead of rendering a placeholder surface or silently skipping asset replacements.

Supportive changes:
- Studio UI and asset-library tests cover snapshotless profile rejection.
- Source scans now block optional `template?.liveSurface` dispatch and UI-side missing-template skips.

Validation:
- `pnpm test tests/studio-asset-library.test.tsx`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps Studio aligned with self-describing game profiles and avoids hosted providers, generated runtime code, auth, database state, compatibility shims, or UI-local bundled-template recovery.

## 2026-07-04 - Required Profile Template Snapshots

Milestone:
- Builder profile import/update paths now require `profile.template` instead of recovering templates from bundled assembly request IDs.
- Missing template snapshots now fail explicitly before imported/custom profiles are previewed or asset-edited.
- Pack-generated profiles already carry snapshots, so current generated and example profiles remain self-describing.

Supportive changes:
- Builder tests model missing-snapshot imports directly.
- Source scans block `assemblyRequestId`-based bundled template lookup in `templateForProfile`.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm --filter @playcraft/service test`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps imported/custom profile handling self-describing without hosted providers, generated runtime code, auth, database state, compatibility shims, or bundled-template inference.

## 2026-07-04 - Profile-Carried Template Snapshots

Milestone:
- Deterministic pack assembly now embeds a `GameProfileTemplateSnapshot` in generated MVP profiles.
- Studio live rendering and asset replacement now read live-surface metadata from `profile.template` instead of importing bundled template definitions.
- Saved example profiles were refreshed so exported examples are self-describing with their template snapshots.

Supportive changes:
- Pack tests assert generated profiles carry matching template snapshots.
- Builder import tests explicitly model missing-snapshot custom profiles.
- Source scans guard Studio live-game and asset-library code against bundled template lookup by `assemblyRequestId`.

Validation:
- `pnpm test packages/packs/test/mvp-profiles.test.ts tests/studio-asset-library.test.tsx tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps generated and imported game profiles self-describing for local/server retrieval without hosted providers, generated runtime code, auth, database state, compatibility shims, or UI-local bundled-template inference.

## 2026-07-04 - Exclusive Service Input Envelopes

Milestone:
- `BuilderServiceRequestSchema` now rejects requests that include both `text` and `moonshineTranscript`.
- Service catalog metadata advertises `text|moonshineTranscript` as both required-one-of and exclusive-one-of for assemble/update.
- Direct service, HTTP, and CLI exact-envelope transcript examples now use transcript-only payloads.

Supportive changes:
- Contract tests cover dual text/transcript request rejection.
- Service, Studio Developer tab, and source-scan tests pin the published exclusivity metadata.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm --filter @playcraft/service test`
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps the public local service/API contract explicit for text or local Moonshine Streaming CPU transcripts without hosted providers, generated runtime code, auth, database state, compatibility shims, or dual-source request ambiguity.

## 2026-07-04 - Single-Source Service CLI Input Payloads

Milestone:
- Service CLI assemble/update now accepts either `--text` or `--transcript`, not both.
- CLI transcript input no longer seeds `request.text` from transcript text.
- Conflicting `--source text --transcript` requests now fail before service request construction.

Supportive changes:
- Service CLI tests cover mixed text/transcript rejection and source/transcript conflict rejection.
- Source scans guard the old transcript-text coalescing and `text || undefined` request assignment.

Validation:
- `pnpm --filter @playcraft/service test`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps the agent-facing service CLI input contract explicit for text or local Moonshine Streaming CPU transcripts without hosted providers, generated runtime code, auth, database state, compatibility shims, or dual-source payload ambiguity.

## 2026-07-04 - Single-Source Studio Input Payloads

Milestone:
- Studio client assemble/update requests now send either text or a Moonshine transcript record, not duplicated transcript text.
- Moonshine transcript requests remain service-routable through the transcript record without a redundant `text` payload.
- Text requests continue to send text payloads through the same service envelope contract.

Supportive changes:
- Studio transport tests assert explicit transcript requests omit the `text` field.
- Source scans guard against reintroducing transcript-text fallback payload expressions in Studio request construction.

Validation:
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps Studio input transport explicit for text or local Moonshine Streaming CPU transcripts without hosted providers, generated runtime code, auth, database state, compatibility shims, or dual-source payload ambiguity.

## 2026-07-04 - Strict Imported Template State

Milestone:
- Profile import persistence now requires imported builder results to carry `preview.activeTemplateId`.
- Local session state now requires an active template id whenever persisted service state exists.
- Import results can no longer write an undefined template id and rely on later session snapshot fallback.

Supportive changes:
- Service tests cover a custom profile import handler that strips `activeTemplateId`.
- Source scans guard import persistence against direct result preview template-id reads.

Validation:
- `pnpm --filter @playcraft/service test`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps imported profile sessions explicit without hosted providers, generated runtime code, auth, database state, compatibility shims, or stale snapshot fallback.

## 2026-07-04 - Strict Result Template State

Milestone:
- Local service execution persistence now requires builder results to carry `preview.activeTemplateId`.
- Missing active template ids now fail at the service boundary instead of preserving stale session template state.
- Session state remains driven by the latest validated execution result rather than previous fallback state.

Supportive changes:
- Service tests cover a custom builder handler that omits `activeTemplateId`.
- Source scans guard `refreshSessionStateFromResult` against reintroducing the stale-template fallback.

Validation:
- `pnpm --filter @playcraft/service test`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps local service sessions explicit without hosted providers, generated runtime code, auth, database state, compatibility shims, or stale profile/game state fallback.

## 2026-07-04 - Strict Service Input Text

Milestone:
- Service request text normalization now returns Moonshine transcript text or explicit request text only.
- Missing assemble/update input now throws at the helper boundary instead of falling through to an empty string.
- The implementation now mirrors `BuilderServiceRequestSchema` input requirements after parse.

Supportive changes:
- Source scans guard `textForServiceRequest` against the old empty-string fallback.
- Focused service/source tests verify the service boundary remains schema-owned.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps local text/Moonshine input handling strict without hosted providers, generated runtime code, auth, database state, compatibility shims, or silent empty-request coercion.

## 2026-07-04 - Strict Sequence Round Props

Milestone:
- Builder sequence asset-edit rewrites now ignore non-string nested round entries instead of stringifying JSON values into sequence tokens.
- Empty malformed custom rounds are dropped before remapping sequence tokens.
- Imported custom sequence profiles keep authored string rounds while malformed JSON-like entries are excluded from updated profiles.

Supportive changes:
- Builder tests cover malformed custom sequence rounds during an imported-profile asset edit.
- Source scans guard nested matrix token readers against JSON-stringified token fallback.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps custom sequence profiles contract-shaped without hosted providers, generated runtime code, auth, database state, compatibility shims, or JSON-derived token heuristics.

## 2026-07-04 - Strict Live Token Props

Milestone:
- Studio live-game token readers now ignore non-string component prop array entries instead of stringifying JSON values into playable labels.
- Studio asset replacement token readers now use the same string-only behavior for replacement keys.
- Builder asset-edit rewrites and trusted pack component rendering now use string-only token arrays.

Supportive changes:
- Studio UI tests cover malformed non-string card entries so JSON labels are not rendered or playable.
- Source scans guard the shared string-only token reader pattern across Studio live-game, Studio asset library, builder, and packs.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts packages/builder/test/session-service.test.ts packages/packs/test/mvp-profiles.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps malformed profile props from becoming inferred runtime tokens without hosted providers, generated runtime code, auth, database state, compatibility shims, or app-owned JSON-label heuristics.

## 2026-07-04 - Local Asset Folder Discovery

Milestone:
- `BuilderAssetEditCatalogEntry` now publishes `localReplacementFolder` for each cataloged asset theme.
- The shared local asset edit catalog supplies folder names alongside labels, aliases, and suggested items.
- Service CLI catalog summaries and the Studio Developer asset lever panel now render replacement folder names for agents.

Supportive changes:
- Studio asset lookup resolves catalog aliases through `localReplacementFolder` instead of assuming theme IDs always equal folder names.
- Contract, asset, service, Studio UI, and source-scan tests pin folder discovery.
- README and DEV guide describe local replacement themes/items/folders as catalog-discoverable.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/assets/test/local-asset-source.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/studio-asset-library.test.tsx tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Makes edit-aware local asset folders agent-discoverable without hosted providers, generated runtime code, auth, database state, compatibility shims, or Studio-only asset-folder conventions.

## 2026-07-04 - Registry Compatibility Contract Lookup

Milestone:
- Core registry compatibility selection now reads mechanic and rule compatibility through an explicit `ContractCompatibilityFields` helper.
- Domain, safety, age-band, and modality filtering now use named compatibility fields instead of a generic compatibility key lookup.
- Loose registry entries that only partially resemble mechanic compatibility data are ignored for compatibility filtering.

Supportive changes:
- Registry tests cover partial loose compatibility objects and preserve canonical rule compatibility selection.
- Source scans guard explicit compatibility-field reads and block a return to key-parameter compatibility lookups.

Validation:
- `pnpm test packages/core/test/registries.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps registry selection contract-shaped and forward-only without hardcoded game-type branches, provider dispatch, generated runtime code, auth, database state, or compatibility alias shims.

## 2026-07-04 - Exact Envelope Contract Discovery

Milestone:
- `BuilderServiceRequestBatchSchema` is now a named public contract and registry entry.
- The service catalog exact-envelope metadata now publishes required contracts for direct request, batch request, and response handling.
- The service CLI and Studio Developer catalog render exact-envelope required contracts for agent discovery.

Supportive changes:
- Contract fixtures validate `BuilderServiceRequestBatchSchema` through the public contract fixture loop.
- Service CLI and Studio UI tests pin the exact-envelope contract list.
- Source scans guard exact-envelope required contract rendering and docs mention exact-envelope required contracts.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps same-process request batches contract-addressable without hosted providers, generated runtime code, auth, database state, compatibility shims, or prose-only service envelope discovery.

## 2026-07-04 - Catalog Required Contract Rendering

Milestone:
- Builder CLI catalog summaries now render each tool's `requiredContracts`.
- Service CLI catalog summaries now render the same required contract names from `catalog.tools`.
- The Studio Developer catalog view now surfaces required contract dependencies for callable builder actions.

Supportive changes:
- Builder CLI, service CLI, and Studio UI tests verify required-contract text in agent-facing catalog views.
- Source scans guard `tool.requiredContracts.join` usage in CLI catalog summaries and documented surfaced per-action required contracts.
- Canonical docs now describe surfaced per-action required contracts as part of the tool catalog.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps required-contract discovery visible through local agent-facing surfaces without hosted providers, generated runtime code, auth, database state, compatibility shims, or UI-local contract dependency prose.

## 2026-07-04 - Public Contract Name Guard

Milestone:
- `BuilderToolDefinition.requiredContracts` now accepts only names from `PublicContractNameSchema`.
- `PublicContractSchemas` is keyed by the same public contract name type, so schema registry entries and advertised required contracts stay aligned.
- Unknown required contract names are rejected at the contract boundary instead of being accepted as arbitrary strings.

Supportive changes:
- Contract tests verify every public contract enum name exists in `PublicContractSchemas`.
- Contract tests reject a builder tool that advertises a missing contract name.
- Source scans guard the typed required-contract schema and block the old arbitrary string validation.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps builder tool contract dependencies strict and discoverable without hosted providers, generated runtime code, auth, database state, compatibility shims, or stale contract-name strings.

## 2026-07-04 - Builder Required Contract Discovery

Milestone:
- Builder tool definitions now publish action-specific `requiredContracts` instead of applying the assemble/update contract set to every tool.
- Session/profile tools advertise the contracts agents actually need, such as `BuilderSessionSnapshotSchema`, `BuilderProfileExportSchema`, and `GameAssemblyProfileSchema`.
- The service catalog exposes the corrected builder tool contract dependencies through `catalog.tools`.

Supportive changes:
- Builder tests pin the required contract map for every published tool.
- Service catalog tests verify get-session, export-profile, and import-profile contract dependencies.
- Source scans and canonical docs now guard per-action required contract discovery.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps builder tool metadata precise and catalog-owned without hosted providers, generated runtime code, auth, database state, compatibility shims, or noisy tool-level contract dependencies.

## 2026-07-04 - Builder Tool Schema Parity

Milestone:
- Builder tests now validate every published `BuilderToolDefinition.argumentsSchema` against `BuilderCommandSchema`.
- The parity guard proves advertised required tool arguments are required by the command schema.
- The parity guard also proves unadvertised command payload fields are rejected for each builder action.

Supportive changes:
- Test fixtures provide valid command samples for template, input, asset edit, profile, interaction, and session arguments.
- Source scans pin the builder tool/schema parity test so tool descriptors cannot drift quietly from command validation.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps builder tool discovery executable against the command contract without hosted providers, generated runtime code, auth, database state, compatibility shims, or CLI/UI-local argument heuristics.

## 2026-07-04 - Catalog Request Schema Parity

Milestone:
- `BuilderServiceRequestSchema` now rejects `sessionId` on no-payload `catalog` and `reset` actions, matching their catalog-owned accepted field metadata.
- Service tests now generate minimal requests from every `catalog.service.actions[].request` shape and validate them against the exact request schema.
- The parity guard checks required fields, required one-of groups, exclusive groups, forbidden combinations, and unaccepted fields for every service action.

Supportive changes:
- Contract tests pin `catalog` and `reset` session payload rejection.
- Source scans guard the catalog/schema parity test so service request metadata cannot drift quietly from request validation.
- The change keeps the already-published service catalog metadata executable against the schema rather than prose-only.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps service request discovery and validation aligned without hosted providers, generated runtime code, auth, database state, compatibility shims, or permissive no-payload action fallbacks.

## 2026-07-04 - Catalog Service Constraint Discovery

Milestone:
- `BuilderCatalog.service.actions[].request` now publishes exclusive one-of groups and forbidden field combinations alongside accepted and required fields.
- The local service catalog marks `import-profile` as exactly one of `profile` or `profileExport`, and forbids `profileExport` with top-level `assetEdit`.
- Service CLI output and the Studio Developer catalog view render those stricter request constraints from the catalog.

Supportive changes:
- Contract fixtures cover the new exclusive and forbidden request metadata.
- Service tests pin profile-import constraints in JSON catalog output and CLI summaries.
- Studio UI and source-scan tests guard catalog-owned constraint rendering across contracts, service, CLI, Developer tab, and docs.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps stricter service-call rules contract-owned and discoverable without hosted providers, generated runtime code, auth, database state, compatibility shims, or CLI/UI-local request heuristics.

## 2026-07-04 - Catalog Request Shape Discovery

Milestone:
- `BuilderCatalog.service.actions` now publishes accepted request fields, required fields, and required one-of field groups for each service action.
- The service CLI catalog summary and Studio Developer catalog view render request-shape metadata from `catalog.service.actions`.
- Agent clients can discover how to call `assemble`, `update`, `preview`, `get-session`, `export-profile`, `import-profile`, `catalog`, and `reset` before constructing exact service envelopes.

Supportive changes:
- Contract fixtures cover nested service action request metadata.
- Service tests pin JSON catalog metadata for assemble/import and human CLI output for request fields.
- Studio UI tests and source scans guard request field summaries across contracts, service catalog, CLI, Developer tab, and canonical docs.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps request-shape discovery local, contract-owned, and forward-only without hosted providers, generated runtime code, auth, database state, compatibility shims, or UI-local service heuristics.

## 2026-07-04 - Catalog Service Facade Discovery

Milestone:
- `BuilderCatalog` now advertises the service facade actions, exact-envelope commands, direct request helpers, and transport helpers alongside builder tools.
- Service CLI catalog output and the Studio Developer catalog view now render service actions from `catalog.service`.
- Agent clients can discover `request`, `request-batch`, `handleLocalServiceRequest`, and `handleLocalServiceRequestBatch` through the same local catalog surface used by the app.

Supportive changes:
- Contract fixtures cover the nested service catalog shape.
- Service and Studio UI tests verify service facade discovery in JSON catalog, CLI summary, and Developer tab.
- Source scans pin catalog-owned service action and helper rendering across contracts, service, CLI, Studio, and canonical docs.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps agent-facing service discovery contract-owned and local without hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Move Live Token Defaults Into Templates

Milestone:
- `GameTemplateLiveSurface` now requires non-empty token styles plus a template-owned `defaultTokenStyle`.
- Built-in memory, sorting, sequence, and generated template definitions publish default token styles with their explicit token style catalogs.
- The Studio Live App renderer now uses the template style catalog for unmatched tokens instead of a local hard-coded palette.

Supportive changes:
- Custom template snapshot tests now carry self-contained token style defaults.
- Contract, pack, Studio asset, and source-scan tests guard required default token styles and block local palette fallback code.
- Canonical architecture and developer guide docs now state that live-surface visual defaults belong in template contracts.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts packages/contracts/test/schemas.test.ts packages/packs/test/mvp-profiles.test.ts tests/studio-asset-library.test.tsx tests/studio-ui.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps Live App visual behavior template-owned and forward-only without renderer-local palette heuristics, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Promote Service Request Batch Contract

Milestone:
- `BuilderServiceRequestBatchSchema` now validates non-empty arrays of exact service request envelopes.
- The local service exposes `handleBatch` and `handleLocalServiceRequestBatch` so API callers can share one same-process session across assemble/export workflows.
- The service CLI now parses `request-batch` payloads through the shared contract instead of owning ad hoc array validation.

Supportive changes:
- Contract tests cover valid request batches, empty-batch rejection, and invalid-envelope rejection inside a batch.
- Service tests prove the local API helper shares state across assemble then export.
- Canonical docs and source scans now pin the shared batch schema and API helper alongside the CLI batch command.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps multi-step agent workflows contract-shaped and local without adding persistence, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Align Framework Tool Surface Docs

Milestone:
- Canonical framework docs now describe builder tools as assemble/update/preview/catalog plus get-session, export-profile, and import-profile.
- Service CLI docs now name exact-envelope request batches alongside raw request envelopes.
- PRD, architecture, README, and developer guide agree that profile portability is part of the reusable local tool surface.

Supportive changes:
- Source scans pin request-batch docs and expanded builder tool descriptions across canonical framework docs.
- Source scans block stale assemble/update/preview-only builder tool wording from returning.

Validation:
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps documentation aligned with the local reusable tool contract without adding hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Reject Mixed Envelope CLI Flags

Milestone:
- Exact-envelope service CLI commands now reject friendly CLI flags instead of silently ignoring them.
- `playcraft-service request` and `request-batch` only accept `--request-json` plus `--json`.
- The exact-envelope path remains contract-shaped while friendly commands remain the only text/transcript/asset flag surface.

Supportive changes:
- Service CLI tests cover rejected `--text` on `request` and rejected `--session` on `request-batch`.
- Source scans pin the envelope flag guard and its explicit error text.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps CLI contract boundaries forward-only and explicit without hidden flag precedence, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Add Service CLI Request Batches

Milestone:
- `playcraft-service request-batch` now executes a JSON array of validated `BuilderServiceRequest` envelopes on one local service instance.
- Agents can run stateful CLI workflows such as assemble then export without adding persistence or hidden session defaults.
- The root README no longer advertises `export-profile` with input flags and now shows the exact-envelope batch path.

Supportive changes:
- Service CLI tests cover a same-process assemble/export request batch and validate the exported profile.
- Service CLI tests reject empty batches and missing `--request-json`.
- Source scans pin `request-batch` docs and block stale input-flag export examples.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Stale service CLI example scan returned no matches.
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps the CLI agent surface explicit and forward-only through validated service envelopes without CLI persistence, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Prove Mobile Profile Tool Surface

Milestone:
- The Tauri Mobile-facing shell now has test coverage for profile export, profile import, and preview actions through the shared Studio service client.
- Mobile profile import is verified into a separate local session before running a service preview action against the imported profile.
- The Mobile shell README now names profile export/import as part of the local Playcraft builder tool surface.

Supportive changes:
- Mobile shell tests assert profile exports preserve dinosaur asset edits from text input.
- Mobile shell tests assert imported sessions keep the mobile timeline prefix and emit import plus reveal-card tool events.
- Source scans guard the Mobile shell documentation against omitting profile export/import from the local tool surface.

Validation:
- `pnpm test tests/mobile-shell.test.tsx tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps the Mobile shell aligned with the reusable local builder service contract without adding hosted providers, generated runtime code, auth, database state, native permissions, or compatibility shims.

## 2026-07-04 - Narrow Frontend Runtime Env Exposure

Milestone:
- Studio and Mobile app shells no longer pass the whole Vite `import.meta.env` object into runtime configuration.
- App shells now expose only `VITE_PLAYCRAFT_SERVICE_URL` through a typed Studio runtime-env helper before endpoint parsing.
- Production frontend bundles no longer embed unrelated `VITE_*` provider environment values from the developer shell.

Supportive changes:
- Studio runtime tests cover the new narrow env helper.
- Source scans now reject passing the full `import.meta.env` object to the Studio endpoint parser.
- Build-output scans cover Studio and Mobile `web-dist` bundles for removed provider names and env keys.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Generated Studio and Mobile `web-dist` scans returned no matches for removed provider env keys, removed hosted-stack identifiers, OpenAI API keys, or `sk-` shaped keys.
- Source scan across active app/package/test/docs/spec/plan files returned only guard/planning references.

Constraint notes:
- Keeps runtime endpoint configuration local and forward-only while preventing stale provider environment leakage in web bundles, without adding hosted providers, generated runtime code, auth, database state, or native shell work.

## 2026-07-04 - Expose Builder Profile CLI Tools

Milestone:
- `playcraft-builder` now exposes the advertised session/profile tool commands: `get-session`, `export-profile`, and `import-profile`.
- Profile imports accept explicit `--profile-json` payloads and validate them with `GameAssemblyProfileSchema` before command execution.
- Profile payload flags are rejected on non-import CLI commands instead of being silently ignored.

Supportive changes:
- Builder CLI tests cover importing a dinosaur-themed memory profile through `import-profile`.
- Builder CLI tests require explicit sessions for all session-bound profile commands.
- Source scans guard the CLI command mapping and schema-backed profile JSON parsing.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts packages/contracts/test/schemas.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across app source, package source, tests, milestones, framework docs, specs, and plans returned only guard/planning references.

Constraint notes:
- Keeps the lower-level builder tool surface local, schema-backed, and forward-only without adding hosted providers, generated runtime code, auth, database state, or persistence shims.

## 2026-07-04 - Update Imported Template Snapshots

Milestone:
- Builder `update-game` now resolves the active profile's custom template snapshot when updating an imported custom profile.
- Service text updates can edit assets on imported custom template profiles without requiring the template to exist in the bundled catalog.
- Tool events for custom updates retain the profile snapshot assembly request ID instead of inventing a bundled request.

Supportive changes:
- Builder tests cover custom snapshot import, preview, and asset update through `update-game`.
- Service tests cover importing a custom snapshot profile and updating it through the text/API path.
- Builder dispatch now narrows assemble/update commands before reaching the build/update implementation.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts packages/contracts/test/schemas.test.ts tests/import-light-and-scans.test.ts tests/studio-ui.test.ts tests/studio-asset-library.test.tsx`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Custom-template update scan confirmed active code uses the snapshot update helper without profile-ID or component-set inference.
- Removed-provider/key source scan across app, package, test, milestone, framework, and README sources returned no matches.

Constraint notes:
- Keeps imported custom profile updates contract-owned through template snapshots without bundled-template lookup fallbacks, profile-ID branching, component-set inference, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Support Profile Template Snapshots

Milestone:
- Game assembly profiles can now carry an optional `game-template-snapshot` contract for custom, agent-authored profiles.
- Builder imports use a profile-carried template snapshot when the profile is not backed by a bundled assembly request.
- Studio live rendering and local asset replacement lookup prefer the profile template snapshot before consulting bundled templates.

Supportive changes:
- Contract tests validate matching template snapshots and reject mismatched profile/template assembly request IDs.
- Builder tests keep unknown assembly imports fail-closed unless a template snapshot is present, then prove preview uses the custom template ID and frontend tool contract.
- Studio asset-library tests prove local sprites can be mapped through a custom template snapshot without bundled template lookup.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/builder/test/session-service.test.ts tests/studio-asset-library.test.tsx tests/import-light-and-scans.test.ts tests/studio-ui.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Active-code component-heuristic scan returned no matches outside source-scan assertions.
- Removed-provider/key source scan across app, package, test, milestone, framework, and README sources returned no matches.

Constraint notes:
- Moves custom profile support forward through explicit contracts instead of component-set inference, profile-ID branching, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Require Metadata-Owned Asset Replacements

Milestone:
- Studio local replacement folders now resolve from builder-authored `assetEditTheme` and `assetEditItems` metadata only.
- Prompt text and component props no longer influence which local sprite folder is selected for edit-aware assets.
- Asset replacement remains driven by template-owned replacement sources after the metadata-selected folder is known.

Supportive changes:
- Asset-library tests now prove stripped metadata prevents local toy sprite substitution even when prompts and profile props still mention toys.
- Source scans block prompt-derived and component-prop-derived replacement folder selection from returning.

Validation:
- `pnpm test tests/studio-asset-library.test.tsx tests/import-light-and-scans.test.ts tests/studio-ui.test.ts packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Asset replacement source scan returned no active-code matches for prompt or component-prop folder selection.
- Removed-provider/key source scan across app, package, test, milestone, framework, and README sources returned no matches.

Constraint notes:
- Keeps edit-aware replacement selection forward-only on local builder metadata without stale prompt heuristics, component-prop folder inference, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Remove Tool Presentation Policy

Milestone:
- Builder catalogs no longer publish the stale `toolPresentation` policy object.
- The public tool contract keeps fully rendered `inputSourceSummary` and `argumentSummary` fields as the only agent-facing presentation surface for tool catalog rows.
- Builder and service code no longer export or consume catalog-level argument formatting knobs.

Supportive changes:
- Contract, builder, service, Studio UI, and source-scan tests validate the removal and keep the old presentation policy names out of active code.
- Memory, sorting, and sequence games now skip post-mount reset effects so fast first interactions are not overwritten after a loaded game appears.

Validation:
- `pnpm test tests/studio-ui.test.ts packages/contracts/test/schemas.test.ts packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Active app/package presentation-policy scan returned no matches outside the source-scan tests that forbid those names.
- Removed-provider/key source scan across app, package, test, milestone, framework, and README sources returned no matches.

Constraint notes:
- Keeps catalog presentation forward-only on tool-owned summaries without compatibility shims, UI/CLI formatting policy objects, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Publish Tool Argument Summaries

Milestone:
- Builder tool definitions now include `argumentSummary` as the agent-facing argument presentation field.
- Builder, service, and Studio Developer catalog surfaces render tool-owned argument summaries instead of rebuilding schema display strings locally.
- CLI catalog output for both builder and service tools now reads `tool.argumentSummary` from the public tool contract.

Supportive changes:
- Contract, builder, service, Studio UI, and source-scan tests validate tool-owned argument summaries.
- Source scans block removed Studio, service CLI, and builder CLI argument-summary helpers from returning.
- Sequence gameplay now skips the post-mount reset effect so a fast first Start Round click is not overwritten back to the watch state.

Validation:
- `pnpm test tests/studio-ui.test.ts packages/contracts/test/schemas.test.ts packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across app, package, test, milestone, framework, and README sources returned no matches.

Constraint notes:
- Keeps agent-facing tool argument presentation contract-owned and forward-only without UI/CLI argument formatting, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Publish Tool Input Source Summaries

Milestone:
- Builder tool definitions now include `inputSourceSummary` as the agent-facing input presentation field.
- Builder and service catalogs publish text/Moonshine and no-input tool summaries directly on each tool.
- Studio Developer tool catalog and service CLI now render `tool.inputSourceSummary` instead of rebuilding input labels from accepted source IDs.

Supportive changes:
- Contract, builder, service, Studio UI, and source-scan tests validate tool-owned input source summaries.
- Source scans block the removed Studio and service CLI input-summary helpers from returning.
- The memory-game asset-swap UI test now waits for first-card reveal state before clicking the matching card, avoiding a React batching race.

Validation:
- `pnpm test tests/studio-ui.test.ts packages/contracts/test/schemas.test.ts packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across app, package, test, milestone, framework, and README sources returned no matches.

Constraint notes:
- Keeps agent-facing tool input presentation contract-owned and forward-only without UI/CLI source-label reconstruction, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Publish Asset Edit Catalog Summaries

Milestone:
- Asset edit catalog entries now include contract-owned alias and suggested-item summaries.
- The local asset catalog publishes those summaries alongside theme, aliases, and suggested replacement item IDs.
- Studio Developer asset levers now read `entry.aliasSummary` and `entry.suggestedItemSummary` instead of joining catalog arrays locally.

Supportive changes:
- Contract and asset-source tests validate the new asset-edit presentation fields.
- Source scans block Studio-local asset alias and suggested-item joins from returning.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/assets/test/local-asset-source.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across app, package, test, milestone, framework, and README sources returned no matches.

Constraint notes:
- Keeps asset replacement levers catalog-owned and forward-only for local UI/CLI/API clients without UI-local presentation joins, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Publish Template Alias Summaries

Milestone:
- Game template contracts now include `requestAliasSummary` as the agent-facing alias presentation field.
- Bundled toddler-game templates publish alias summaries from the pack layer.
- Studio Developer catalog, builder CLI, and service CLI now read template alias summaries from the contract instead of slicing request aliases locally.

Supportive changes:
- Pack and source-scan tests validate template-owned alias summaries.
- Source scans block local `requestAliases.slice(0, 3)` presentation shortcuts from returning in Studio and CLI catalog surfaces.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/packs/test/mvp-profiles.test.ts packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across app, package, test, milestone, framework, and README sources returned no matches.

Constraint notes:
- Keeps agent-facing template presentation contract-owned and forward-only without UI/CLI alias truncation shortcuts, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Publish Catalog-Owned Request Tips

Milestone:
- Builder catalogs now expose structured request tips for available games, asset edits, and example requests.
- The local Playcraft service owns request-tip summary lines used by Studio and CLI clients.
- Studio request-tip tooltips now render `catalog.requestTips.summaryLines` instead of composing game/theme examples locally.

Supportive changes:
- Service CLI catalog output includes a `request tips` block backed by the same catalog contract.
- Contract, service, Studio UI, and source-scan tests cover catalog-owned request tips.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across app, package, test, milestone, framework, and README sources returned no matches.

Constraint notes:
- Keeps request guidance reusable and contract-shaped for UI, CLI, and future server catalogs without app-local tip composition, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Remove Studio Profile History Cache

Milestone:
- Studio session snapshots now expose only the explicit `activeProfile` from the service session.
- The Studio local client no longer stores or publishes a cached ordered `profiles` list.
- Mobile shell and Studio tests read active game data from `activeProfile` instead of profile history order.

Supportive changes:
- Studio asset-library, Studio UI, and Mobile shell tests now validate active-profile data directly.
- Source scans block reintroducing the Studio client profile cache or `profiles` on the app-facing session snapshot.

Validation:
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key source scan across app, package, test, milestone, framework, and README sources returned no matches.

Constraint notes:
- Keeps user-facing app state session-owned and forward-only without client-side profile history caches, profile ordering heuristics, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Explicit Studio Active Profile Selection

Milestone:
- Studio sessions now carry `activeProfile` explicitly from the service session snapshot.
- The Studio Live App and Developer views render `session.activeProfile` instead of inferring from profile-list order.
- Stale or incomplete Studio sessions now fail closed instead of displaying the last available profile as active.

Supportive changes:
- Studio UI tests verify transport-backed clients populate the active profile and stale profile lists do not render as active games.
- Source scans now block the removed `findActiveProfile` profile-list fallback and require `activeProfile` to come from `response.session.profile`.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key literal scan returned no matches.

Constraint notes:
- Keeps user-facing profile selection session-owned and forward-only without UI-local profile ordering heuristics, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Contract-Owned Builder Tool Presentation

Milestone:
- Builder tool argument presentation now has a named `BuilderToolPresentationSchema` contract fragment.
- `playcraft-builder catalog` consumes `BUILDER_TOOL_PRESENTATION_POLICY` instead of owning local `args`/`none` summary labels.
- Local service tool presentation policy is parsed through the same contract fragment used by the builder package.

Supportive changes:
- Contract tests validate strict builder tool presentation fragments without public-object wrappers.
- Builder tests verify the exported presentation policy alongside callable tool schemas.
- Source scans now require the builder CLI to pass the parsed presentation policy into catalog summaries.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key literal scan returned no matches.

Constraint notes:
- Keeps agent-facing tool presentation contract-shaped and forward-only across builder and service CLIs without local label shortcuts, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Service CLI Tool Argument Summaries

Milestone:
- `playcraft-service catalog` now prints each agent tool's argument summary in the plain-text CLI catalog output.
- Local service CLI argument summaries render from `catalog.toolPresentation` and each tool's `argumentsSchema`.
- Agent-facing CLI users can inspect input sources and callable tool arguments without requiring JSON output.

Supportive changes:
- Service CLI tests verify plain catalog rows include both input-source and argument-contract summaries.
- Source scans now require the service CLI to consume `tool.argumentsSchema` and catalog-published argument presentation labels.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key literal scan returned no matches.

Constraint notes:
- Keeps the local agent-facing service CLI catalog contract-shaped and forward-only without app-local argument labels, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Catalog-Owned Tool Argument Presentation

Milestone:
- Builder catalogs now publish tool argument presentation policy with an argument prefix and no-argument label.
- Studio Developer tool argument summaries render from `catalog.toolPresentation` instead of app-local fallback text.
- Custom catalog clients can override both argument summary prefix and empty-argument wording.

Supportive changes:
- Contract and service tests validate the new catalog presentation policy.
- Studio UI tests verify custom tool argument presentation in the Developer tab.
- Source scans now block app-local `"no arguments"` summaries from returning.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Removed-provider/key literal scan returned no matches.

Constraint notes:
- Keeps agent-facing tool presentation catalog-owned and forward-only without Studio-local summary fallbacks, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Replay-Owned Component Interaction Summaries

Milestone:
- Trusted preview component summaries now include an `interactionSummary` derived from emitted tools or replay expected events.
- Studio Developer component rows render that summary instead of app-local `display-only` text.
- Non-interactive trusted components now show explicit replay-owned event information.

Supportive changes:
- Studio UI tests verify tool-backed and no-event component summaries in the Developer tab.
- Source scans now block app-local `display-only` component summaries from returning.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps Studio Developer component metadata replay-owned and forward-only without local presentation fallbacks, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Explicit Paired Card Sprite Matching

Milestone:
- Studio asset replacement now maps paired memory card IDs to local sprites through an explicit paired-card suffix rule.
- `dinosaur-1-a` can resolve to the `dinosaur-1` sprite, while unrelated suffix matches no longer map indirectly to catalog sprites.
- Stale `ocean-animal-*` card IDs no longer resolve to dolphin sprites through suffix matching.

Supportive changes:
- Studio asset-library tests cover direct catalog-suggested card IDs and stale indirect card IDs.
- Source scans now block the old `normalized.endsWith` sprite suffix matcher from returning.

Validation:
- `pnpm test tests/studio-asset-library.test.tsx tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps edit-aware asset replacement profile-driven and forward-only without suffix-guess compatibility matching, hosted providers, generated runtime code, auth, database state, or migration shims.

## 2026-07-04 - Explicit CLI Execution Summaries

Milestone:
- Builder CLI non-JSON execution output now summarizes profile results or preview state explicitly.
- Service CLI non-JSON execution output now summarizes profile results or preview state explicitly.
- Generic `"preview"` fallback text has been removed from CLI execution summaries.

Supportive changes:
- Source scans now guard both CLI surfaces against reintroducing preview fallback text.
- Summary helpers read validated `BuilderCommandResult` and `BuilderServiceExecution` preview fields instead of inferring from missing profile data.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps local CLI output inspectable and contract-shaped without missing-profile fallbacks, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Contract-Shaped Builder CLI Catalog Summary

Milestone:
- `playcraft-builder catalog` now prints a builder-local tool/template summary for non-JSON agent use.
- Tool rows show explicit display names, tool/action identifiers, and argument schema summaries from `BuilderToolDefinition`.
- Template rows show catalog-owned display labels, stable IDs, example requests, and leading request aliases from `GameTemplateDefinition`.
- JSON catalog output still returns the validated builder execution result for exact event/result inspection.

Supportive changes:
- Builder CLI tests verify the non-JSON catalog output no longer collapses to `builder.cli: preview`.
- Source scans now guard the builder CLI catalog path against returning to opaque command-result summaries.
- The change keeps the lower-level builder CLI aligned with the richer service CLI while preserving its narrower package boundary.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps local CLI agent discovery contract-shaped and forward-only without preview-like placeholder summaries, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Catalog-Suggested Asset Edit Items

Milestone:
- Builder asset-edit normalization now reads known theme aliases from the shared local asset catalog.
- Known catalog themes use `suggestedItems` for generated profile component IDs instead of locally guessing item names from the request phrase.
- Freeform future asset-folder themes still get deterministic generated item IDs when they are not in the catalog.

Supportive changes:
- Builder tests verify the `ocean animals` alias produces dolphin card IDs from catalog metadata.
- Studio asset-library tests verify local replacements attach directly to catalog-suggested card IDs and no longer rely on indirect `ocean-animal-*` IDs.
- Source scans now guard against reintroducing the old builder-local default item helper for catalog-known asset edits.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts tests/studio-asset-library.test.tsx tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps asset replacement levers catalog-aware and forward-extensible without profile-ID guessing, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Contract-Shaped CLI Catalog Summary

Milestone:
- `playcraft-service catalog` now prints a richer agent-facing summary for humans and CLI agents without requiring JSON parsing.
- Template rows show catalog-owned display labels, stable IDs, example requests, and leading request aliases.
- Tool rows show explicit display names, callable tool/action identifiers, and catalog-owned input source labels.
- Asset-edit rows show catalog-owned display labels for replacement themes.

Supportive changes:
- Local service CLI tests verify non-JSON catalog output includes labels, examples, tool inputs, and asset edit labels.
- Source scans now block the old ID-only template/tool summary from returning.
- The CLI catalog summary fails closed when a tool advertises an input source without catalog display metadata.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps the local CLI agent surface contract-shaped and forward-only without ID-only presentation shortcuts, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Catalog-Owned Tool Input Summaries

Milestone:
- Builder catalog input metadata now publishes the display label for tools that accept no direct request input.
- Studio Developer tool summaries render accepted input sources through catalog-owned source option labels.
- Malformed catalogs that omit display metadata for accepted input sources now fail closed instead of leaking source IDs into the UI.

Supportive changes:
- Studio UI tests verify custom catalog source labels and no-input labels in the Developer tab.
- Service and contract tests validate the new catalog input presentation field.
- Source scans now block local source-ID joining and hard-coded no-input Developer summary text from returning.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps Developer-tab tool presentation catalog-owned and forward-only without UI-local source formatting heuristics, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Explicit Builder Tool Display Names

Milestone:
- Builder tool display names are now explicit metadata in the builder tool table.
- The agent-facing catalog no longer derives `displayName` from the first sentence of `description`.
- Callable action schemas, accepted input sources, and emitted events remain unchanged.

Supportive changes:
- Builder tests validate display names for every tool action.
- Source scans now block description-derived builder tool display names from returning.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps agent-facing tool metadata explicit and forward-only without description parsing heuristics, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Catalog-Owned Studio Input Source Controls

Milestone:
- Builder catalog input metadata now publishes source options with labels and generate/update placeholders.
- The local service owns Text and Moonshine transcript input source presentation through `LOCAL_SERVICE_INPUT_POLICY`.
- Studio command bar source buttons and request placeholders now render from `catalog.input.sourceOptions` instead of app-local hard-coded controls.

Supportive changes:
- Studio now initializes synchronous local catalogs on first render while preserving async catalog loading for HTTP transports.
- Studio UI tests verify custom catalog source labels/placeholders replace default labels.
- Source scans now block direct Studio input-source handlers and hard-coded source placeholders from returning.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps text/Moonshine input presentation catalog-owned and forward-only without app-local source heuristics, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Template-Owned Memory Pair Styles

Milestone:
- Live-surface token styles now include an `accent` color for richer game-specific visuals.
- Bundled memory templates publish `memoryPairTokenStyles` for pair-key card faces through the template catalog.
- The Live App resolves memory pair visuals from `liveSurface.tokenStyles` instead of owning an index-based memory-pair palette.

Supportive changes:
- Contract tests now reject token styles that omit `accent`.
- Pack tests validate memory pair styles alongside sorting and sequence token styles.
- Source scans now block reintroducing a Live App-local memory-pair palette.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/packs/test/mvp-profiles.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps memory-game visual levers template-owned and forward-only without UI-local pair-color heuristics, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Template-Owned Live Token Styles

Milestone:
- Game template live surfaces now require `tokenStyles` as part of the public contract.
- Bundled sorting and sequence templates publish toddler-safe token color styles through the pack catalog.
- The Live App consumes `liveSurface.tokenStyles` instead of owning a red/blue/green/yellow token alias table.

Supportive changes:
- Contract tests now reject live surfaces that omit `tokenStyles`.
- Pack tests validate memory, sorting, and sequence token-style publication.
- Source scans now block reintroducing a Live App-local token color catalog.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/packs/test/mvp-profiles.test.ts tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps game visual levers template-owned and forward-only without UI-local color alias heuristics, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Studio Runtime Endpoint Policy

Milestone:
- The Studio package now exports `STUDIO_RUNTIME_POLICY` for the app-shell service endpoint environment variable.
- Studio and Mobile shell app entrypoints resolve `VITE_PLAYCRAFT_SERVICE_URL` through `serviceEndpointFromStudioRuntimeEnv` instead of reading the env variable directly.
- The local in-process default and optional local HTTP service endpoint remain behaviorally unchanged while the future server retrieval boundary is explicit.

Supportive changes:
- Studio tests validate endpoint policy export, trimming, blank-env handling, and absent-env handling.
- Source scans now block direct service endpoint env reads from Studio and Mobile shell app entrypoints.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps app-shell service endpoint resolution explicit and forward-only without hosted providers, generated runtime code, auth, database state, native shell work, or removed hosted conversation stack instances.

## 2026-07-04 - Mobile Shell Client Policy

Milestone:
- The Mobile shell now exports `MOBILE_SHELL_CLIENT_POLICY` for default local session and timeline IDs.
- Mobile shell Studio client construction consumes that policy instead of owning private `mobile.session` and `mobile.timeline` literals.
- Tauri Mobile-facing client defaults stay inspectable for later native-shell or server retrieval work without adding those surfaces now.

Supportive changes:
- Mobile shell tests now validate the published policy and default generated session/timeline IDs.
- Source scans now block private Mobile shell session and timeline literals from returning to client construction.

Validation:
- `pnpm test tests/mobile-shell.test.tsx tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps Mobile shell client defaults explicit and forward-only without hosted providers, generated runtime code, auth, database state, native shell work, or removed hosted conversation stack instances.

## 2026-07-04 - Studio Client Policy

Milestone:
- The Studio client now exports `STUDIO_CLIENT_POLICY` for default local session and timeline IDs.
- Configured and transport-backed Studio clients consume that policy instead of owning private `studio.session` and `timeline` fallback literals.
- Tests can instantiate transport-backed Studio clients without re-declaring default IDs.

Supportive changes:
- Studio tests now validate the published policy and default transport-backed request/session/timeline IDs.
- Source scans now block private Studio default session and timeline fallback expressions from returning.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps Studio client defaults explicit and forward-only without hosted providers, generated runtime code, auth, database state, or removed hosted conversation stack instances.

## 2026-07-04 - Service HTTP Policy

Milestone:
- The service HTTP helper now exports `PLAYCRAFT_HTTP_SERVICE_POLICY` for local route, host, port, URL parse base, and request body limit defaults.
- HTTP server creation, startup, request parsing, and service error/health envelopes consume that policy and shared schema version instead of private route/host/port/schema literals.
- Local HTTP remains lightweight while its future server boundary defaults are inspectable.

Supportive changes:
- Service tests validate the published HTTP policy.
- Source scans now block private HTTP route, host, port, max-body, and schema-version defaults from returning.

Validation:
- `pnpm test packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps local/server transport setup explicit and forward-only without hosted providers, generated runtime code, auth, database state, or removed hosted conversation stack instances.

## 2026-07-04 - Contract-Owned Local Timestamp

Milestone:
- The contracts package now exports `PLAYCRAFT_LOCAL_TIMESTAMP` for deterministic local records.
- Builder session snapshots, service profile exports, builder input records, and Moonshine transcript records consume that contract timestamp instead of embedding date literals in runtime paths.
- Deterministic local test behavior is preserved while timestamp ownership is explicit.

Supportive changes:
- Source scans now block builder/service timestamp literals from returning in runtime record construction.

Validation:
- `pnpm test tests/import-light-and-scans.test.ts packages/contracts/test/schemas.test.ts packages/builder/test/session-service.test.ts packages/service/test/local-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps local-only deterministic records contract-owned and forward-only without hosted providers, generated runtime code, auth, database state, or removed hosted conversation stack instances.

## 2026-07-04 - Builder CLI Session Policy

Milestone:
- The lower-level builder package now publishes `BUILDER_SESSION_POLICY` for first-run CLI session IDs.
- Builder batch assembly and builder CLI assemble/catalog commands consume that policy instead of scattering `builder.cli` and `builder.batch` fallback literals through command construction.
- Session-bound builder CLI commands still require explicit `--session`.

Supportive changes:
- Builder tests now validate the published session policy and default batch session behavior.
- Source scans now block returning to direct `builder.cli` or `builder.batch` fallback expressions in the builder CLI.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps lower-level builder CLI defaults explicit and forward-only without hidden session targeting for session-bound commands, hosted providers, generated runtime code, auth, database state, or removed hosted conversation stack instances.

## 2026-07-04 - Studio Delegates Input Source Policy

Milestone:
- The Studio service client no longer duplicates text or Moonshine input-source fallback logic when constructing assemble/update requests.
- Studio requests now pass an input source only when the caller supplied one; omitted text defaults and transcript-record source decisions stay inside the service catalog policy.
- Explicit Moonshine transcript records can cross the Studio transport without app-local source-label rewriting.

Supportive changes:
- Studio transport tests now verify explicit transcript records no longer require duplicated source labels.
- Source scans now block Studio-local text and Moonshine source fallback literals.

Validation:
- `pnpm test tests/studio-ui.test.ts tests/import-light-and-scans.test.ts packages/service/test/local-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps Studio input routing service-owned and forward-only without hosted providers, generated runtime code, auth, database state, or removed hosted conversation stack instances.

## 2026-07-04 - Catalog-Owned Input Source Policy

Milestone:
- The builder catalog now publishes the default text input source and the Moonshine transcript input source.
- Local service assembly and raw service requests consume the catalog input policy instead of embedding private text-source fallbacks.
- The service CLI uses the same catalog input policy when mapping typed text versus local Moonshine transcript arguments.

Supportive changes:
- Contract and service tests now validate `catalog.input`.
- Source scans now block service and service-CLI text-source fallback literals from returning.
- Framework docs now tell agents to inspect catalog input policy before assembly.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps text/Moonshine-only input behavior forward-only and catalog-discoverable without hosted providers, generated runtime code, auth, database state, or removed hosted conversation stack instances.

## 2026-07-04 - Catalog-Owned Session Policy

Milestone:
- The builder catalog now publishes the default assemble session ID and the service actions that require an explicit session.
- Local assembly consumes the catalog session policy instead of embedding a private fallback session literal in the assemble path.
- CLI and shell agents can inspect session behavior from the same catalog surface they use for tools, templates, input sources, and asset edits.

Supportive changes:
- Contract and service tests now validate `catalog.sessions`.
- Source scans now pin explicit session-bound methods while requiring assemble fallback behavior to flow through catalog session policy.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps session behavior forward-only and catalog-discoverable without hosted providers, generated runtime code, auth, database state, or removed hosted conversation stack instances.

## 2026-07-04 - Pack-Owned Default Template

Milestone:
- The bundled pack now exports `DEFAULT_GAME_TEMPLATE_ID` as the catalog-owned default template.
- The local service consumes the pack default instead of defining its own service-local `template.memory-match` default.
- Default template resolution and catalog output now share the same pack-owned default identity.

Supportive changes:
- Pack and service tests now verify the default template comes from the bundled template catalog.
- Source scans now block a service-local `DEFAULT_TEMPLATE_ID` and direct service parsing of the memory template ID.

Validation:
- `pnpm test packages/packs/test/mvp-profiles.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps template selection defaults catalog-owned and forward-only without service-local defaults, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Asset-Owned Intent Patterns

Milestone:
- Asset edit intent phrase patterns now live in `@playcraft/assets` with the local replacement catalog.
- The service consumes `localAssetEditIntentPatterns` instead of owning hardcoded asset request regex chains.
- Catalog-owned generic theme guards and asset-owned intent patterns now sit together as the local asset edit lever surface.

Supportive changes:
- Asset tests verify the exported pattern ordering and decision source categories.
- Source scans now block service-local asset intent pattern helpers from returning.

Validation:
- `pnpm test packages/assets/test/local-asset-source.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps asset replacement intent parsing asset-catalog-owned and forward-extensible without service-local phrase heuristics, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Catalog-Owned Asset Theme Guards

Milestone:
- Generic asset-theme suppression tokens are now exposed through the builder catalog asset-edit contract.
- The local asset package owns the generic token list used to reject vague asset edit requests such as bare "assets" or "card images".
- The service now consumes asset-edit guard data from `@playcraft/assets` instead of owning a service-local denylist.

Supportive changes:
- Contract, asset, service, and source-scan tests now verify catalog-owned generic theme tokens.
- The service catalog JSON now returns `assetEdit.genericThemeTokens` alongside available replacement themes.

Validation:
- `pnpm test packages/assets/test/local-asset-source.test.ts packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps asset edit levers catalog-owned and forward-extensible without service-local guard constants, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Moonshine-Explicit Transcript Source

Milestone:
- Builder input source contracts now expose `moonshine-transcript` instead of a generic transcript source label.
- Service, CLI, Studio, Mobile shell, and tests now use the `moonshineTranscript` payload field for transcript records.

Supportive changes:
- Contract schema names now use `MoonshineStreamingCpuConfig` for the local CPU transcript config.
- Source scans now block the retired generic transcript source/property/config labels from product and docs sources.
- Public docs now describe transcript input as local Moonshine Streaming CPU transcript records without generic speech-input API names.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts packages/service/test/local-service.test.ts packages/builder/test/session-service.test.ts tests/studio-ui.test.ts tests/mobile-shell.test.tsx tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Exact removed vendor-name scan across tracked and repo-local hidden text returned no matches.
- Retired generic transcript source/property literal scan returned no matches.

Constraint notes:
- Keeps the input API forward-only and Moonshine-explicit without generic speech-source compatibility aliases, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Touch-Only Play Input Modalities

Milestone:
- Runtime play/input modality contracts now exclude generic audio input; text and Moonshine transcript input stay modeled through builder input sources.
- Bundled mechanics and domain profiles now use touch/pointer/keyboard play modalities only, while audio remains an asset content type for local sound assets.
- Removed the unused sound-matching mechanic that implied audio prompt/input semantics.

Supportive changes:
- Contract tests now reject audio and voice as input modalities while preserving audio asset content types.
- Pack and source-scan tests now block audio play modalities and sound-matching mechanics from returning.
- Framework docs now describe visual sequence/play interactions without audio-response mechanics.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/packs/test/mvp-profiles.test.ts`
- `pnpm test packages/core/test/registries.test.ts tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan returned no matches.

Constraint notes:
- Keeps runtime interaction contracts aligned with text and local Moonshine transcript input without live audio capture, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Conversation-Free Active Docs

Milestone:
- Active docs now describe text and local Moonshine transcript input without live/vendor conversation, avatar, or conversation-state vocabulary.
- The input boundary now points to local transcript records and excludes real-time call/session state without referencing the removed stack shape.

Supportive changes:
- Public doc scans now block avatar and conversation-runtime/state/stack phrases.

Validation:
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps active docs aligned with local text/Moonshine-only input without live conversation abstractions, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Third-Party Runtime Doc Boundary

Milestone:
- Public docs now describe old hosted SDK/provider/conversation exclusions as third-party runtime exclusions and local/server catalog boundaries.
- Root and framework docs no longer preserve hosted SDK, hosted provider, or hosted conversation phrasing in the active product direction.

Supportive changes:
- Public doc scans now block hosted SDK/provider/conversation phrases.
- Import-light test labels now use third-party runtime language.

Validation:
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps active documentation aligned with local text/Moonshine-only assembly without hosted provider vocabulary, generated runtime code, auth, database state, or live conversation stack assumptions.

## 2026-07-04 - Provider-Neutral Framework Docs

Milestone:
- Public framework docs now describe rejected old app/provider architecture generically instead of preserving named hosted-provider, app-route, auth, and database stack examples.
- Import-light guidance now uses provider-neutral scan examples for route, provider, database, auth, and environment boundaries.

Supportive changes:
- Public framework doc scans now block stale provider/app stack names from returning.

Validation:
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps canonical docs aligned with the local text/Moonshine-only builder direction without hosted providers, generated runtime code, auth, database state, or legacy stack vocabulary.

## 2026-07-04 - Explicit Builder CLI Sessions

Milestone:
- Builder CLI `update` and `preview` commands now require `--session` instead of defaulting to `builder.cli`.
- Builder CLI `assemble` remains the first-run session creation path and can still use the local CLI default.

Supportive changes:
- Builder CLI tests now reject session-bound commands without `--session`.
- Source scans now block the removed session-bound `builder.cli` fallback in mapped CLI command construction.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps the agent-facing builder CLI explicit and forward-only without hidden session targeting, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Explicit Studio Import Targets

Milestone:
- Studio profile imports now require an active target session instead of falling back to the exported source session or default Studio session.
- The Studio client import contract now requires `sessionId` for profile imports.

Supportive changes:
- Studio UI coverage now proves importing after Start Over is blocked until a new active session exists.
- Source scans now block Studio-side `profileExport.sessionId` import fallback from returning.

Validation:
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps Studio profile transfer explicit and forward-only without hidden session targeting, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Explicit Service Method Sessions

Milestone:
- Session-bound `LocalPlaycraftService` methods now require callers to pass an explicit session ID.
- Public preview, session snapshot, export, and import methods no longer carry `service.session` defaults.

Supportive changes:
- Source scans now pin explicit service method signatures and block default service-session regressions.

Validation:
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps service API calls forward-only and intentional without hidden default sessions, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Explicit Service Request Sessions

Milestone:
- Session-bound service actions now require `sessionId` at the request schema boundary.
- Service request handling now uses an explicit session helper for update, preview, get-session, export-profile, and import-profile.
- Profile-export imports no longer fall back to the exported source session when the request omits a target session.

Supportive changes:
- Contract tests now reject missing-session update, preview, export, and raw import requests.
- Service CLI tests now reject preview/get-session calls without `--session`.
- Source scans now block profile-export session fallback in service imports.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps service-session operations explicit and forward-only without hidden session fallbacks, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Required Preview Tool Action

Milestone:
- Builder command preview interactions no longer default `action` to `primary` at the schema layer.
- Published preview tool arguments now require the `interaction` object and its `action` field.

Supportive changes:
- Contract tests now reject preview commands with empty interaction objects.
- Builder and service catalog tests now assert required preview interaction/action tool arguments.
- Source scans now block preview action defaults from returning to command and tool contracts.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps agent-facing preview calls explicit and forward-only without hidden default actions, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Explicit Preview Interaction Actions

Milestone:
- Builder preview runtime now requires a concrete interaction action instead of defaulting missing actions to `primary`.
- Preview tool call payloads now reuse the validated interaction action directly.

Supportive changes:
- Source scans now block preview-action interaction defaulting from returning to the builder runtime.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps preview interactions contract-shaped and forward-only without hidden default actions, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Action-Scoped Builder Commands

Milestone:
- `BuilderCommandSchema` now scopes template/input/asset-edit payloads to assemble and update actions.
- Profile payloads are now accepted only by `import-profile` builder commands.
- Preview commands now require `interaction` and reject interaction payloads on other actions.

Supportive changes:
- Contract tests now cover valid assemble/preview commands and reject cross-action payload fields.
- Source scans now pin the action-scoped builder command refinement messages.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps builder tool commands contract-shaped and forward-only without ignored cross-action payloads, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Session-Owned Studio Service State

Milestone:
- Studio service client execution responses now require the service session snapshot.
- Studio active profile state now comes from `response.session.activeProfileId` instead of falling back to execution result profile IDs.
- Studio profile cache now records the profile from the session snapshot.

Supportive changes:
- Studio UI tests now reject service execution responses that omit the session snapshot.
- Source scans now block optional session active-profile fallback in the Studio service client.

Validation:
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps Studio service state contract-shaped and forward-only without execution-payload fallback inference, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Action-Scoped Service CLI Output

Milestone:
- Service CLI JSON output now selects payloads from `actionName` instead of response payload precedence.
- Service CLI human summaries now align their branches with the response action contract.

Supportive changes:
- Source scans now block `catalog ?? profileExport ?? execution ?? session` response precedence from returning to the service CLI.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps agent-facing CLI output contract-shaped and forward-only without payload precedence fallbacks, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Explicit Profile Import Payloads

Milestone:
- Service `import-profile` now handles raw profiles and profile exports through exclusive payload branches instead of profile/export precedence fallback.
- Profile-export imports keep asset edits from the export and reject separate top-level asset edit overrides.
- Profile-export imports still allow an explicit target session while preserving the exported profile metadata.

Supportive changes:
- Service request schema tests now reject profile-export imports with top-level asset edit overrides.
- Service CLI tests now cover rejected `--profile-export-json` plus `--asset-theme` imports.
- Source scans now block profile/profileExport and assetEdit/profileExport nullish precedence fallbacks in the service import path.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps profile import behavior explicit and forward-only without migration-style payload precedence, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Self-Describing Render Request Identity

Milestone:
- Component render requests now require both a concrete `componentId` and `componentCapability`.
- Trusted preview summaries no longer derive missing render capabilities from registered manifests.
- Trusted renderer capability validation now checks the requested capability directly for every render request.

Supportive changes:
- Contract tests now reject render requests that omit `componentCapability`.
- Source scans now block optional render capability fields and Studio manifest-derived capability fallback.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/renderer/test/trusted-renderer.test.tsx`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps render requests fully self-describing and forward-only without capability fallback inference, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Fail-Closed Render Requests Only

Milestone:
- Component render requests now publish a single allowed fallback policy: `fail-closed`.
- The public render contract no longer accepts component skipping as a fallback mode.

Supportive changes:
- Contract schema tests now prove `fail-closed` render requests parse and component-skipping fallback policies are rejected.
- Source scans now pin the render request schema to a fail-closed literal and confirm replay emits fail-closed render requests.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps trusted component rendering fail-closed and forward-only without skipped component fallbacks, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Explicit Service CLI Session Actions

Milestone:
- Service CLI `preview`, `get-session`, and `export-profile` no longer seed a hidden assemble from text/transcript input.
- Non-input service CLI actions now reject text/source flags explicitly.
- Non-import inspection commands now reject asset edit flags explicitly.

Supportive changes:
- Service CLI tests now cover rejected preview/get/export input shortcuts.
- Source scans now block the removed hidden preview assemble seed and outdated `preview-with-assemble` wording.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`
- Refined provider/key literal scan.

Constraint notes:
- Keeps the local service CLI action model explicit and forward-only without hidden assembly fallbacks, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Structured Preview Tool Arguments

Milestone:
- `JsonFieldSchema` now supports nested object fields for callable tool argument descriptors.
- The builder preview tool now publishes `interaction.action` with the explicit local action value `primary`.
- Service catalog output exposes the same concrete preview interaction argument shape for agent clients.

Supportive changes:
- Builder and service catalog tests now assert the nested preview interaction descriptor.
- Source scans now block reverting preview interactions to an unstructured object argument.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm build`
- Refined provider/key literal scan.
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps the agent-facing preview action contract explicit and local without broad object payload guessing, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Concrete Component Render Requests

Milestone:
- `ComponentRenderRequest` now requires a concrete `componentId`.
- Trusted renderer dispatch now resolves components by manifest ID only.
- Studio trusted preview keys and manifest lookup now use component IDs instead of capability fallback matching.

Supportive changes:
- Renderer tests now reject render requests that omit `componentId`.
- Source scans now block capability-fallback dispatch from returning in contracts, renderer, and Studio trusted preview.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/renderer/test/trusted-renderer.test.tsx`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Refined provider/key literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps trusted rendering profile-contract driven and forward-only without component-capability fallback dispatch, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Template-Owned Asset Edit Operations

Milestone:
- `GameTemplateDefinition` now publishes `assetEditOperations` for template-specific asset edit behavior.
- Bundled memory, sorting, and sequence templates declare named operations for editable components and support text.
- Builder asset edits now apply operation kinds from the selected template instead of switching on component render capability strings.

Supportive changes:
- Pack and service catalog tests now assert starter template asset edit operation plans.
- Builder tests continue to verify memory, sorting, and sequence asset edits preserve game rules and imported authored rounds.
- Source scans now block the removed render-capability switch cases from returning to the builder asset edit path.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/packs/test/mvp-profiles.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Refined provider/key literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps builder asset edits template-owned and forward-only without render-capability behavior inference, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Template-Owned Asset Replacement Sources

Milestone:
- `GameTemplateDefinition.liveSurface` now publishes `assetReplacementSources` for replaceable local sprites.
- Bundled memory, sorting, and sequence templates declare the component role, prop, namespace, and pair-map prop used for sprite replacement.
- Studio asset-library replacement projection now follows those template sources instead of branching on specific component render capabilities.

Supportive changes:
- Pack and service catalog tests now assert starter template replacement namespaces.
- Studio asset-library behavior tests continue to cover memory card sprites, card backs, and sorting bin assets.
- Source scans now block capability-specific replacement branches in the Studio asset library.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/packs/test/mvp-profiles.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/studio-asset-library.test.tsx`
- `pnpm test tests/import-light-and-scans.test.ts`
- Refined provider/key literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps edit-aware local asset replacement contract-owned and forward-only without Studio-local capability branching, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Template-Owned Live Surface Component Roles

Milestone:
- `GameTemplateDefinition` now publishes a structured `liveSurface` contract with surface kind and component capability roles.
- Bundled templates declare the primary live component role for memory, sorting, and sequence games.
- Sequence templates also declare the optional choice component role used by the Live App renderer.

Supportive changes:
- Studio LiveGame now selects required/optional live components from `template.liveSurface.componentCapabilities`.
- Pack and service catalog tests now assert the starter templates' live surface roles.
- Source scans now block reintroducing `liveSurfaceKind` and LiveGame-local component capability literals.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/packs/test/mvp-profiles.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm test tests/studio-ui.test.ts`
- Removed vendor/conversation-stack/private-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps playable Live App component selection contract-owned and forward-only without UI-local component role decisions, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Shared Live Surface Kind Type

Milestone:
- Studio LiveGame now imports `GameTemplateLiveSurfaceKind` from the public contracts package for surface-specific styling.
- The local duplicate `GameSurfaceKind` union was removed from the Studio app.

Supportive changes:
- Source scans now require LiveGame to use the contract surface kind and block reintroducing the local duplicate union.

Validation:
- `pnpm test tests/import-light-and-scans.test.ts`
- `pnpm test tests/studio-ui.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps Live App surface vocabulary contract-owned and forward-only without app-local duplicate kind aliases, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Template-Owned Live App Surface Selection

Milestone:
- `GameTemplateDefinition` now publishes `liveSurfaceKind` for the playable Live App renderer surface.
- Bundled templates declare whether they render as memory, sorting, or sequence games.
- Studio LiveGame now resolves the profile template by `assemblyRequestId` and routes from `template.liveSurfaceKind` instead of probing components in priority order.

Supportive changes:
- Pack and service catalog tests now assert starter template live surface kinds.
- Studio UI tests cover a sequence profile that includes an extra memory component and still renders as sequence.
- Source scans now block the removed LiveGame component-priority selection helper from returning.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/packs/test/mvp-profiles.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps Live App rendering contract-owned and forward-only without component-presence priority heuristics, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Literal Freeform Asset Folder Names

Milestone:
- Service text intent parsing now preserves captured freeform asset folder names instead of stripping generic words out of them.
- Fully generic asset phrases such as `card images` are rejected explicitly instead of being normalized into a misleading theme.
- Catalog asset aliases still resolve through the local asset catalog, while explicit freeform asset-folder requests remain literal.

Supportive changes:
- Service tests now cover literal folder names that include asset-ish words and rejection of generic placeholder asset nouns.
- Source scans now block the removed broad service asset-theme stripping regex from returning.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps asset edit intent parsing forward-only and folder-literal without broad text cleanup heuristics, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Catalog-Owned Game Tip Labels

Milestone:
- `GameTemplateDefinition` now publishes `displayLabel` for user-facing game names in request tips.
- Bundled templates carry both full profile-facing `displayName` values and concise catalog labels such as `Memory Match` and `Sequence Repeat`.
- Studio request tips now render `template.displayLabel` instead of stripping `MVP` suffixes locally.

Supportive changes:
- Pack and service catalog tests now assert starter template display labels.
- Source scans now block the removed Studio suffix-stripping helper from returning.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/packs/test/mvp-profiles.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps game request-tip presentation catalog-owned and forward-only without app-local name rewriting heuristics, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Catalog-Owned Asset Tip Labels

Milestone:
- Builder asset edit catalog entries now publish `displayLabel` for user-facing asset tip text.
- The local asset catalog owns labels such as `ocean animals` and `fruit` instead of making Studio pick labels from aliases.
- Studio request tips and Developer-tab asset lever rows now render the catalog label directly.

Supportive changes:
- Asset, service, Studio UI, and schema tests now assert the label contract.
- Source scans now block Studio alias-scanning presentation helpers from returning.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/assets/test/local-asset-source.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps asset edit presentation catalog-owned and forward-only without app-local alias display heuristics, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Template-Owned Asset Prompt Kinds

Milestone:
- `GameTemplateDefinition` now declares the asset prompt kind used for edit-aware local asset generation.
- The builder now formats asset edit prompts from the selected template contract instead of inferring game type from component capabilities.
- Imported profiles continue resolving template ownership by assembly request ID before asset edits are applied.

Supportive changes:
- Pack tests assert starter templates publish memory, sorting, and sequence asset prompt kinds.
- Source scans now block the removed component-capability prompt heuristic from returning.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/packs/test/mvp-profiles.test.ts`
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps asset edit behavior catalog-owned and forward-only without component-presence heuristics, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Session-Owned Studio Asset Summaries

Milestone:
- Studio chat summaries now report asset edits from `session.activeAssetEdit` instead of parsing the generated asset prompt.
- Prompt wording is no longer a hidden UI data contract for displaying active asset themes.
- Session snapshots remain the source of truth for active builder levers surfaced to the user.

Supportive changes:
- Studio UI tests now cover a profile with no asset prompts while still summarizing the active session asset edit.
- Source scans now block the removed prompt parser from returning.

Validation:
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps Studio status copy contract-shaped and forward-only without prompt parsing heuristics, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Catalog-Owned Request Examples

Milestone:
- `GameTemplateDefinition` now includes `exampleRequest` so agent and UI clients can display sample requests without interpreting alias lists.
- Bundled templates publish explicit example requests, with the starter templates preserving the user-facing examples shown in Studio tips.
- Studio request tips now read `template.exampleRequest` instead of selecting aliases by local word heuristics.

Supportive changes:
- Pack and service catalog tests now assert starter template examples.
- Source scans now block the old Studio `preferredTemplateAlias` helper from returning.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/packs/test/mvp-profiles.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps request guidance catalog-owned and forward-only without app-local alias heuristics, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Non-Coercive Service Event Serialization

Milestone:
- Local service execution events now pass through `JsonValueSchema` directly instead of a `JSON.stringify`/`JSON.parse` round trip.
- Non-JSON builder event payloads are rejected at the service boundary instead of being silently converted.
- Studio and CLI clients continue receiving schema-validated JSON event arrays from service responses.

Supportive changes:
- Service tests now inject a malformed builder event with a `Date` payload and assert the service rejects it.
- Source scans now block reintroducing stringify/parse event coercion in `@playcraft/service`.

Validation:
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps CLI/API event exchange schema-first and forward-only without lossy JSON coercion, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Fail-Closed Trusted Preview Selection

Milestone:
- Trusted preview now treats an explicitly selected component key that is missing from replay as an invalid request.
- The preview still defaults to the first render request only when no component was selected.
- Stale or incorrect Developer-tab component selections no longer silently render a different component.

Supportive changes:
- Studio UI tests now cover selected trusted preview misses and assert the preview surface is not rendered.
- Source scans now block the old selected-key miss fallback to the first render request.

Validation:
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps Developer-tab preview selection contract-shaped and fail-closed without app-local component fallbacks, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Assembly Request Template Selection

Milestone:
- Imported profiles now resolve their builder template through the explicit `assemblyRequestId` contract.
- Custom or renamed profile IDs remain supported when they preserve a known assembly request.
- Profiles with unknown assembly requests are rejected even when their component IDs resemble a bundled template.

Supportive changes:
- Builder import tests now cover renamed-profile success and unknown-assembly rejection.
- Source scans now block component-set template inference from returning to the builder import path.

Validation:
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test tests/studio-asset-library.test.tsx`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps profile import/update behavior contract-shaped and forward-only without component-set heuristics, migration aliases, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Concrete Trusted Preview Identities

Milestone:
- Studio trusted preview component summaries now require concrete component identities instead of fabricating unresolved component IDs.
- Trusted preview request keys now fail closed if replay ever provides a request without component identity.
- Preview placeholder scans now cover the Studio trusted preview surface in addition to builder and service preview payloads.

Supportive changes:
- Studio UI tests now assert trusted preview summaries expose concrete replay component IDs and capabilities.
- Source scans now block `component.unresolved` placeholders from trusted preview code.

Validation:
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps Studio preview metadata aligned with replay contracts and forward-only component identities without placeholder IDs, app-local preview shims, hosted providers, generated runtime code, auth, or database state.

## 2026-07-04 - Shared Local Asset Edit Catalog

Milestone:
- `@playcraft/assets` now owns the local edit-aware asset theme catalog used for `+with {asset}` requests.
- The service builder catalog and text asset-trigger matching now consume the shared assets package catalog instead of a service-local alias table.
- Studio local replacement-folder matching now consumes the same shared catalog instead of maintaining a separate alias map.

Supportive changes:
- Asset tests now verify the shared edit catalog themes, aliases, and suggested items.
- Source scans now keep service and Studio asset-edit theme metadata pointed at `@playcraft/assets`.
- Workspace metadata and TypeScript project references now declare the direct assets dependency where service and Studio consume it.

Validation:
- `pnpm test packages/assets/test/local-asset-source.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- `pnpm test tests/studio-asset-library.test.tsx`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps local asset replacement levers folder-aware and forward-extensible without duplicated alias heuristics, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Schema-Backed Studio Event Ingestion

Milestone:
- `@playcraft/ag-ui` now exports a strict AG-UI event type schema and parser for inbound service events.
- Studio local-client timeline ingestion now delegates service event validation to `parseAgUiEvent` instead of reflecting fields from unknown JSON.
- Unknown AG-UI event types and malformed event envelopes fail through the shared AG-UI parser.

Supportive changes:
- AG-UI tests now cover valid inbound event parsing, unknown event-type rejection, and malformed event rejection.
- Studio source scans now keep service event ingestion schema-backed and free of app-local `Reflect.get` parsing.

Validation:
- `pnpm test packages/ag-ui/test/events.test.ts`
- `pnpm test tests/studio-ui.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps the local service-to-Studio event boundary contract-owned and forward-only without app-local event heuristics, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Contract-Kind Registry Compatibility

Milestone:
- Core registry compatibility selection now reads `compatibility` constraints only from contract kinds that own that field: mechanics and rule modules.
- Unknown loose registry entries no longer get generic compatibility-object interpretation.
- Stale compatibility alias fields are rejected at the public contract boundary instead of being treated as runtime selection metadata.

Supportive changes:
- Core registry tests now cover strict rejection of compatibility alias fields on mechanic contracts.
- Source scans now prevent the generic compatibility fallback helper and old loose-entry alias fixture from returning.

Validation:
- `pnpm test packages/core/test/registries.test.ts`
- `pnpm test packages/core/test/planner.test.ts`
- `pnpm test tests/import-light-and-scans.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps registry selection forward-only and contract-shaped without compatibility shims, hosted providers, generated runtime code, auth, database state, or broad legacy metadata inference.

## 2026-07-04 - Expanded Local Game Catalog And Catalog-Only Rethemes

Milestone:
- The local MVP game catalog now publishes 24 deterministic toddler-safe templates across memory, sorting, and sequence-repeat families.
- Each expanded template now carries its own request label, request capabilities, deterministic seed, profile metadata, and local assembly recipe path.
- Game/profile/challenge retheme wording now triggers asset edits only for catalog-known local asset themes.

Supportive changes:
- Builder, pack, and service tests now assert the expanded template catalog count while preserving the original three starter templates first.
- Service intent tests preserve catalog rethemes such as "Change game to toys" while rejecting vague freeform game rethemes such as "Change game to space robots".

Validation:
- `pnpm test packages/core/test/planner.test.ts`
- `pnpm test packages/packs/test/mvp-profiles.test.ts`
- `pnpm test packages/builder/test/session-service.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- Broad service asset-intent heuristic scan.
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `pnpm test`
- `git diff --check`

Constraint notes:
- Keeps game assembly and text/Moonshine intent resolution catalog-driven and forward-only without broad game retheme guessing, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Action-Exact Service Responses

Milestone:
- `BuilderServiceResponse` envelopes now allow only the payload fields owned by their `actionName`.
- Assemble, update, preview, and import responses now require both execution output and a session snapshot.
- Catalog, get-session, export-profile, and reset responses now reject unrelated extra payloads.

Supportive changes:
- Public contract fixtures now model assemble responses with the required session snapshot.
- Contract tests cover extra-payload response rejection for catalog, export-profile, reset, and build responses without sessions.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- `pnpm build`
- `pnpm test`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `git diff --check`

Constraint notes:
- Keeps service responses unambiguous for agent clients without payload precedence rules, hosted providers, generated runtime code, auth, database state, or compatibility shims.

## 2026-07-04 - Exact Profile Import Payloads

Milestone:
- `BuilderServiceRequest` import-profile envelopes now accept exactly one of `profile` or `profileExport`.
- Ambiguous import requests fail at schema validation instead of letting service code choose one payload.
- CLI-built import-profile requests with both payload flags now return a contract error.

Supportive changes:
- Contract tests cover the exact-one import payload rule.
- Service CLI tests cover ambiguous profile import flags.

Validation:
- `pnpm test packages/contracts/test/schemas.test.ts`
- `pnpm test packages/service/test/local-service.test.ts`
- Removed vendor/conversation-stack/text-label literal scan.
- Preview placeholder component ID scan.
- Retired sample card ID/source wording scan.
- `pnpm build`
- `pnpm --filter @playcraft/studio build`
- `pnpm --filter @playcraft/mobile-shell build`
- `pnpm test`
- `git diff --check`

Constraint notes:
- Keeps profile import behavior forward-only and unambiguous for agents without migration-style payload precedence, hosted providers, generated runtime code, auth, database state, or compatibility shims.

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
- Added schema and service tests rejecting `source: "moonshine-transcript"` without a transcript record.
- Removed service-side transcript record fabrication from plain text.
- Added a clearer CLI error for `--source moonshine-transcript` without `--transcript`.
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
