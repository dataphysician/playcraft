# Playcraft

Playcraft is a **local-first**, **LLM-driven**, GDevelop-inspired mini-game framework for coding agents. A local small language model running on CPU (`MoonshineStreamingCpuEngine` — LiquidAI LFM2.5-VL-450M-Extract over Moonshine Streaming CPU) assembles toddler-focused games from typed contracts, capability registries, trusted React components, theme packs, asset records, safety policies, and replayable profiles. The local asset folder `apps/studio/src/assets/library/replacements/` is the canonical asset source; deployments override it through `PLAYCRAFT_REPLACEMENTS_FOLDER`. Remote enrichment is an opt-in layer for capability gaps; the shipped default is `NullRemoteEnrichmentSource`, and no HTTP transport ships.

Inputs are text and local Moonshine Streaming CPU transcript records. There is no real-time call stack, authentication, database layer, generated runtime code, cloud-side framework SDK, third-party runtime dependency, or model-weight download in the framework path.

The current app surface is:

- `apps/studio`: Vite React Studio with a Live App tab, Developer tab, service-backed game assembly, profile tools, and an agent tool catalog.
- `apps/mobile-shell`: Tauri Mobile-facing webview shell that reuses the Studio UI and client contract.
- `packages/service`: local app/API facade and CLI over `BuilderServiceRequest`, `BuilderServiceRequestBatchSchema`, and `BuilderServiceResponse`.

## Run Locally

```bash
pnpm install
pnpm build
pnpm test
pnpm lint:guardrails
```

Run the umbrella acceptance gate:

```bash
pnpm verify
```

which runs `pnpm typecheck`, `pnpm lint:guardrails`, `pnpm test`, `pnpm test:a11y`, `pnpm test:e2e`, and `pnpm build:studio` in order.

Run the Studio with the default in-process local service:

```bash
pnpm dev:studio
```

Run the local HTTP service and point the Studio or Mobile shell at it:

```bash
pnpm serve:service
VITE_PLAYCRAFT_SERVICE_URL=http://127.0.0.1:8787/playcraft pnpm dev:studio
VITE_PLAYCRAFT_SERVICE_URL=http://127.0.0.1:8787/playcraft pnpm dev:mobile
```

Override the canonical asset folder for a deployment:

```bash
PLAYCRAFT_REPLACEMENTS_FOLDER=/srv/playcraft/assets pnpm dev:studio
```

Ask the CLI what an agent can assemble:

```bash
pnpm --filter @playcraft/service exec playcraft-service catalog --json
pnpm --filter @playcraft/service exec playcraft-service assemble --text "Memory game with dinosaurs" --json
pnpm --filter @playcraft/service exec playcraft-service assemble --transcript "Sort shapes by color" --json
pnpm --filter @playcraft/service exec playcraft-service request-batch --request-json '[{"schemaVersion":"playcraft.v1","id":"builder-service-request.readme.assemble","version":"1.0.0","kind":"builder-service-request","actionName":"assemble","sessionId":"session.readme","text":"Memory game with dinosaurs"},{"schemaVersion":"playcraft.v1","id":"builder-service-request.readme.export","version":"1.0.0","kind":"builder-service-request","actionName":"export-profile","sessionId":"session.readme"}]' --json
```

The catalog exposes bundled templates, callable builder tools, surfaced per-action required contracts, service facade actions, request field summaries, exclusive and forbidden field groups, exact-envelope helpers, exact-envelope required contracts, accepted input sources, profile get/export/import actions, and local replacement themes and folders such as dinosaurs, toys, dolphins/ocean animals, and fruits. Use `request-batch` or `handleLocalServiceRequestBatch` when an agent workflow needs multiple validated service envelopes to share one local session.

## Architecture

The canonical framework docs live in [playcraft-agentic-framework](playcraft-agentic-framework/README.md). The important boundaries are:

- Every public object stamps `schemaVersion: "playcraft.v1"`.
- Every building block carries a `provenance: { source: "bundled-local" | "authored-local" | "remote-agent" }` discriminator.
- Every `AssemblyRecipe.id` uses the `recipe.bundled.* | recipe.local-authored.* | recipe.remote-agent.*` namespace.
- The wired LLM engine is `MoonshineStreamingCpuEngine`; tool calls are constrained by `Outlines` to JSON Schemas.
- The canonical asset source is `LocalAssetFolderSource`; `PLAYCRAFT_REPLACEMENTS_FOLDER` overrides the folder for a deployment.
- The remote enrichment layer is reachable only when the host wires a custom `RemoteEnrichmentSource`. The shipped default is the null source.
- Hard caps (`GAME_BUNDLE_MAX_BYTES = 512 * 1024`, `GAME_BUNDLE_MAX_REGISTRY_ENTRIES = 256`, `purgedEntryIds`) purge stale, unused building blocks from saved bundles.
- The source-scan guardrail (`scripts/check-guardrails.mjs`, invoked by `pnpm lint:guardrails`) blocks `forward-only` / `forward-only` / `tracker-item` / `tracker-item` / `workaround-note` markers in source and enforces the bundle cap constant.

User-facing shells consume `@playcraft/service` transports; contracts, registries, the local LLM engine, the AgentLoop, the recipe namespace, provenance tracking, replay, and bundle cap semantics live in `packages`.

See [playcraft-agentic-framework/ARCHITECTURE.md](playcraft-agentic-framework/ARCHITECTURE.md) for the layer model, [playcraft-agentic-framework/DEV_GUIDE.md](playcraft-agentic-framework/DEV_GUIDE.md) for the implementation guide, and [playcraft-agentic-framework/CONTRIBUTING.md](playcraft-agentic-framework/CONTRIBUTING.md) for the guardrails and acceptance gates.
