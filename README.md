# Playcraft

Playcraft is a local-first, GDevelop-inspired mini-game builder for coding agents. Agents assemble toddler-focused games from typed contracts, bundled templates, reusable rules, trusted React components, local asset levers, and a validated service envelope.

The current app surface is:

- `apps/studio`: Vite React Studio with a Live App tab, Developer tab, service-backed game assembly, profile tools, and an agent tool catalog.
- `apps/mobile-shell`: Tauri Mobile-facing webview shell that reuses the Studio UI and client contract.
- `packages/service`: local app/API facade and CLI over `BuilderServiceRequest`, `BuilderServiceRequestBatchSchema`, and `BuilderServiceResponse`.

Inputs are text and local Moonshine Streaming CPU transcript records. There is no real-time call stack, auth/database layer, generated runtime code, or third-party runtime dependency in the framework path.

## Run Locally

```bash
pnpm install
pnpm build
pnpm test
```

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

Ask the CLI what an agent can assemble:

```bash
pnpm --filter @playcraft/service exec playcraft-service catalog --json
pnpm --filter @playcraft/service exec playcraft-service assemble --text "Memory game with dinosaurs" --json
pnpm --filter @playcraft/service exec playcraft-service assemble --transcript "Sort shapes by color" --json
pnpm --filter @playcraft/service exec playcraft-service request-batch --request-json '[{"schemaVersion":"playcraft.v1","id":"builder-service-request.readme.assemble","version":"1.0.0","kind":"builder-service-request","actionName":"assemble","sessionId":"session.readme","text":"Memory game with dinosaurs"},{"schemaVersion":"playcraft.v1","id":"builder-service-request.readme.export","version":"1.0.0","kind":"builder-service-request","actionName":"export-profile","sessionId":"session.readme"}]' --json
```

The catalog exposes bundled templates, callable builder tools, surfaced per-action required contracts, service facade actions, request field summaries, exclusive and forbidden field groups, exact-envelope helpers, accepted input sources, profile get/export/import actions, and local replacement themes such as dinosaurs, toys, dolphins/ocean animals, and fruits. Use `request-batch` or `handleLocalServiceRequestBatch` when an agent workflow needs multiple validated service envelopes to share one local session.

## Architecture

The canonical framework docs live in [playcraft-agentic-framework](playcraft-agentic-framework/README.md). The important boundary is that user-facing shells consume `@playcraft/service` transports; contracts, registries, game rules, template resolution, and asset edit semantics stay in packages.
