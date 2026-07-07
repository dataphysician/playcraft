# Contributing to Playcraft

This document describes the guardrails, coding heuristics, and forward-only rules every contributor to the Playcraft framework must follow. Read it before opening a pull request.

The framework is **forward-only**: no migration code, no backwards-compat shims, no `forward-only` markers, no `forward-only` alternatives. New work replaces old work at the same call site, in the same commit, with the same schema stamp (`playcraft.v1`).

## Core Posture

- Local-first. The wired path is the local LLM agent (`MoonshineStreamingCpuEngine` over Moonshine Streaming CPU) plus the local asset folder (`apps/studio/src/assets/library/replacements/`, overridable via `PLAYCRAFT_REPLACEMENTS_FOLDER`).
- Import-light. Core packages import without third-party runtimes, network clients, GPU/model SDKs, model weights, credentials, or database clients.
- Strict schemas. Every public object stamps `schemaVersion: "playcraft.v1"`; no v1.1 / v2 reservation exists.
- Provenance-tagged. Every building block carries `provenance: { source: "bundled-local" | "authored-local" | "remote-agent" }`.
- Recipe-namespaced. Every `AssemblyRecipe.id` matches one of `recipe.bundled.*`, `recipe.local-authored.*`, `recipe.remote-agent.*`.

## Coding Heuristics

### Forward-only, no migration

- Replace old code at the same call site. Do not branch on `if (forward-only) { ... }`.
- Do not re-introduce out-of-scope terminology (`forward-only`, `forward-only`, `tracker-item`, `tracker-item`, `workaround-note`, `providerName`, `if (provider)`, `switch (provider)`).
- Do not add backwards-compat type aliases, runtime feature flags, or environment switches. New flags go in the contract.

### Building blocks always carry provenance

Every `MechanicDefinition`, `RuleModuleDefinition`, `ComponentManifest`, `ThemePack`, `AssetSourceCapabilityManifest`, `DomainProfile`, and `SafetyPolicyPack` ships with:

```ts
provenance: z.object({
  source: z.enum(["bundled-local", "authored-local", "remote-agent"]),
  authoredBy: z.string().min(1).max(120).optional(),
  authoredAt: z.string().datetime().optional(),
  remoteUrl: z.string().url().optional()
}).strict()
```

Pack builders use `BUNDLED_LOCAL_PROVENANCE = { source: "bundled-local" }` from `@playcraft/contracts` as the default stamp. Runtime-authored blocks set `source: "authored-local"` and fill `authoredBy` / `authoredAt` from the agent loop. Host-supplied remote enrichment responses set `source: "remote-agent"` and fill `remoteUrl`.

### Recipe namespace

- Shipped recipes: `id: "recipe.bundled.<slug>"`.
- LLM-authored recipes: `id: "recipe.local-authored.<slug>"`, registered at runtime through `DeterministicAssemblyPlanner.registerRecipe()`.
- Remote recipes: `id: "recipe.remote-agent.<slug>"`, also registered at runtime.

`registerRecipe()` validates the namespace prefix, the version, the non-empty `capabilityTags` array, the `build` function, and dedupes. Throw on any violation. Never bypass `registerRecipe` for runtime recipes.

### Out of scope, never to be introduced

- Cloud-side framework SDK assumptions in the core.
- Hosted retrieval catalogs as the default path.
- Generated React or JavaScript code as a play-surface strategy (`eval`, `new Function`, `dangerouslySetInnerHTML`).
- App-route handlers, native commands, or app-specific stores as framework boundaries.
- Authentication flows, identity providers, or token storage in the core.
- Database connections (SQL or NoSQL).
- Schema versioning beyond `playcraft.v1`.
- Migration code for any prior shape.

## Guardrails

The repo enforces guardrails through two pipelines. Both must stay green.

### Automated source scan

`scripts/check-guardrails.mjs` scans every `.ts` / `.tsx` file under `packages`, `apps`, `tests` and reports violations. It exits 0 on success and 1 on any violation. The rules:

- (a) No source file > 1000 LOC (test files excluded).
- (b) No `as any`, `@ts-ignore`, `@ts-expect-error`.
- (c) No `// tracker-item`, `// tracker-item`, `// workaround-note` or the identifiers `forward-only` / `forward-only` in source (test files excluded; opt-out with `// eslint-disable` or `// cspell:disable`).
- (d) Only `playcraft.v1` schema literals (`"v2"` and `"playcraft.v1.1"` are banned).
- (e) `GAME_BUNDLE_MAX_BYTES === 512 * 1024` exported by `packages/contracts/dist/game-bundle.js`.

Run it locally:

```bash
pnpm build && pnpm lint:guardrails
```

### Hosted-provider phrasing scan

`tests/import-light-and-scans.test.ts` walks the source tree and fails if any source file or framework doc contains remotely-operated-service phrasing (e.g., references to cloud-side framework SDKs, hosted brokers, video representations, or vendor / discussion surfaces). The same scan also asserts the positive phrases the framework documentation promises (`playcraft-service request-batch`, `BuilderServiceRequestBatchSchema`, `handleLocalServiceRequestBatch`, `exact-envelope required contracts`, `request field summaries`, `exclusive and forbidden field groups`, `export-profile`, `import-profile`, `get-session`).

Run it locally:

```bash
pnpm test -- tests/import-light-and-scans.test.ts
```

### Bundle cap enforcer

`GameBundleSchema.superRefine` enforces `GAME_BUNDLE_MAX_BYTES` (512 KiB) and `GAME_BUNDLE_MAX_REGISTRY_ENTRIES` (256). The cap is the only mechanism by which old, unused registries leave a saved bundle. Never raise the cap to accommodate unused blocks; purge them instead.

## Acceptance Gates

The umbrella `pnpm verify` script runs every gate below in order. Every gate must pass before a PR merges.

```bash
pnpm verify
```

which expands to:

```bash
pnpm typecheck
pnpm lint:guardrails
pnpm test
pnpm test:a11y
pnpm test:e2e
pnpm build:studio
```

### Gate details

- `pnpm typecheck` — runs `tsc -b` against the workspace. Zero errors required.
- `pnpm lint:guardrails` — see "Automated source scan" above. Zero violations required.
- `pnpm test` — Vitest run across the workspace. At or above the current milestone baseline.
- `pnpm test:a11y` — `vitest-axe` runs against the Studio and `LiveGame` surfaces. Zero critical-impact violations required.
- `pnpm test:e2e` — Playwright e2e suite passes.
- `pnpm build:studio` — Vite Studio bundle builds.

## Adding a New Building Block

1. Add the manifest shape (or extend an existing one) in `packages/contracts/src/manifests.ts` and `packages/contracts/src/asset.ts`.
2. Stamp it with the required `provenance` field. Treat the field as `strict()`.
3. Re-export the new schema and type from `packages/contracts/src/index.ts`.
4. Register the schema name in `PublicContractNameSchema` and `PublicContractSchemas` so the source-scan gate covers it.
5. Add at least one happy-path parse test, one strictness test, and one `provenance`-required test in `packages/contracts/test/`.
6. Add a fixture in `packages/packs/src/` (or a sibling file) using `BUNDLED_LOCAL_PROVENANCE`.
7. Update the relevant doc (`ARCHITECTURE.md`, `DEV_GUIDE.md`) so the new manifest is documented.

## Adding a New Recipe

1. Pick the correct namespace prefix: `recipe.bundled.` for shipped recipes, `recipe.local-authored.` for runtime LLM-authored recipes, `recipe.remote-agent.` for runtime remote-sourced recipes.
2. Define the `AssemblyRecipe` with `id`, `version`, `capabilityTags` (non-empty), and `build`.
3. For packed recipes, register the recipe in `packages/packs/src/mvp-template-data.ts` or `packages/packs/src/custom.ts`.
4. For runtime recipes, register through `DeterministicAssemblyPlanner.registerRecipe()`. Never call `new DeterministicAssemblyPlanner({ recipes: [...] })` with a runtime recipe; the constructor path skips namespace validation and is reserved for forward-only test fixtures.
5. Add a `template.*` definition plus a profile fixture in `examples/profiles/` if the recipe introduces a new template.
6. Update [ARCHITECTURE.md](ARCHITECTURE.md) §8 (Recipe Namespace) and [DEV_GUIDE.md](DEV_GUIDE.md) §11 (Deterministic Assembly Planner and Recipe Registration) with the new entry.

## Adding a New Doc or Section

1. Use sentence-case headings, ASCII characters, and `playcraft.v1`-stamped code fences.
2. Avoid phrases the guardrail scan blocks (cloud-side framework SDK / broker / provider, discussion surface, video representation, etc.). The list is enforced by `tests/import-light-and-scans.test.ts`.
3. Avoid the literal words `forward-only`, `forward-only`, `tracker-item`, `tracker-item`, `workaround-note` anywhere in the docs. Forward-only.
4. Use the template format from the existing docs (top-matter table, doc map, status table, prose, code fences). Match the table of contents pattern.

## Code Review Checklist

Before opening a PR, walk through:

- [ ] Every new contract stamps `schemaVersion: "playcraft.v1"`.
- [ ] Every new building block carries `provenance`.
- [ ] Every new recipe uses the namespace prefix and is registered through `registerRecipe` (or constructor for forward-only test fixtures).
- [ ] No TypeScript escape hatches (`as any`, `@ts-ignore`, `@ts-expect-error`).
- [ ] No `// tracker-item`, `// tracker-item`, `// workaround-note`, or out-of-scope identifiers in source.
- [ ] No third-party SDK imports in the core. Core is import-light.
- [ ] Local asset folder is the canonical source. No `local-asset://` URI scheme.
- [ ] Bundle cap is unchanged. Old registries are purged, not preserved.
- [ ] Every doc update keeps the Wave H pivot framing (local-first LLM, Outlines-constrained JSON, provenance, recipe namespace, guardrails).
- [ ] `pnpm verify` exits 0.
