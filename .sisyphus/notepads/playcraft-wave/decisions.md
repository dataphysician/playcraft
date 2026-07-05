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

## [2026-07-05] T8 Custom Template Decisions

- **Conflict detection signal**: The collision between a custom template ID and a bundled template ID is detected via the `assemblyRequestId` field, not via the template id alone. A bundled-id re-import is a legitimate user flow (sharing a session). The signal that distinguishes "valid re-import" from "custom override attempt" is whether the profile's `assemblyRequestId` matches the bundled template's expected `assemblyRequestId`. This preserves the existing re-import flow in the CLI and service tests while rejecting custom-override attempts.
- **Three-way import validation**: `validateTemplateForImport` in builder handles three cases. (1) `template.custom.*` → validate namespace refinement, accept. (2) Bundled id with matching `assemblyRequestId` → accept (re-import). (3) Bundled id with different `assemblyRequestId` → reject as collision (with descriptive error). (4) Anything else (not bundled, not custom prefix) → reject as namespace violation. The collision and namespace errors have distinct messages.
- **Deep-clone via `structuredClone`**: Available in ES2022 target. Re-parsing through `GameAssemblyProfileSchema.parse` after the clone is a free integrity check — any deep-clone loss is caught immediately. No JSON round-trip needed (which would lose non-serializable fields if any existed).
- **Cross-package redundancy for snapshot helpers**: Both `customTemplateSnapshotFor` (in builder) and `buildCustomTemplateSnapshotFromProfile` (in packs) derive a `GameProfileTemplateSnapshot` from a profile. The builder-side helper is a thin typed accessor for the import path. The packs-side helper transforms the id into the custom namespace (used for the test fixture). Splitting them by responsibility keeps the import path lean and lets packs own template derivation.
- **Existing test ID migration**: Pre-T8 tests used hyphenated template IDs (e.g., `template.custom-template-memory`) which fail the new namespace refinement. Migrated to dot-separated (`template.custom.template-memory`) per the contract. This is a one-time migration; future tests must use the dot form.
- **T8 file scope honored**: Touched only `packages/builder/src/index.ts`, `packages/packs/src/index.ts`, `packages/core/src/index.ts`, and the specified test files. Did not modify any pre-existing dirty files (`apps/studio/src/App.tsx`, `local-client.ts`, `packages/assets/src/index.ts`) — those have typecheck errors that belong to T6/T9 cleanup.

## [2026-07-05] T9 Asset Catalog Decisions

- **File scope**: T9 only touches `packages/assets/src/index.ts`, `packages/assets/test/local-asset-source.test.ts`, `apps/studio/src/App.tsx`, and the four `apps/studio/src/assets/library/replacements/*/catalog.json` files. NO changes to the service package's catalog output, NO changes to `localAssetEditCatalog` array contents (the bundled array is preserved as-is, the new manifest mechanism adds on top).
- **Discovery at build time**: `import.meta.glob("./assets/library/replacements/*/catalog.json", { eager: true, import: "default" })` is preferred over a runtime `fs.readdir` scan. Build-time discovery means the Vite bundle knows the exact set of catalogs at compile time, eliminates runtime fs dependencies in the browser bundle, and aligns with the studio's existing `replacementImageModules` pattern in `asset-library.ts`.
- **Merge without mutating bundled**: `mergeAssetCatalogs` clones the bundled array via `bundledSnapshot = bundled.map(entry => entry)` (shallow array copy, entries reused) so callers can keep using the exported `localAssetEditCatalog` constant unchanged. Discovered entries with matching themes REPLACE bundled entries in-place in the output array (last-wins), preserving the theme slot so other code that indexes by theme still works.
- **Sort key**: theme `localeCompare` (case-sensitive, Unicode-aware default) — gives deterministic alphabetical order regardless of discovery order. Verified by the "sorts the merged result by theme" test.
- **`loadManifestFromFolder` returns Promise**: even though the implementation is currently sync (`existsSync` + `readFileSync`), the signature is `Promise<AssetCatalogManifest | null>` to allow for future async fs backends (e.g. a remote catalog endpoint) without breaking callers. Tests use `await` consistently.
- **Validation strictness**: `loadManifestFromFolder` calls `AssetCatalogManifestSchema.parse(parsed)` and lets the ZodError propagate. Malformed manifests in `apps/studio/src/assets/library/replacements/*/catalog.json` cause the Studio mount effect to throw, which the error boundary catches. NO silent repair, NO defaulting.
- **Studio override**: The `withCatalogOverride` wrapper is the chosen wiring point because:
  - The service layer's `catalog()` returns the hardcoded `localAssetEditCatalog`-based catalog (out of T9 file scope).
  - The studio-app reads the catalog from `client.catalog()` (a single point of access).
  - Wrapping the client in App.tsx lets us transparently substitute a merged catalog without touching studio-app or service code.
- **No filename auto-discovery**: `import.meta.glob("./assets/library/replacements/*/catalog.json")` only matches literal `catalog.json` filenames. Sprite PNGs alone in a folder (`dinosaur-1.png`, `dinosaur-2.png`) do NOT trigger catalog discovery — `loadManifestFromFolder` on such a folder returns `null`, verified by the "returns null for a folder that only contains sprite PNGs without catalog.json" test.
- **No mutating bundled at runtime**: T9 explicitly does NOT change the runtime contents of `localAssetEditCatalog` exported from `@playcraft/assets`. The merged catalog is computed on-demand in the Studio. Service consumers continue to see the original `localAssetEditCatalog` (preserves the existing service contract test `publishes the shared local asset edit catalog used by service and Studio`).
