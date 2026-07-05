# New Contract Fixtures

This directory contains JSON fixtures for schemas added in T1 (`packages/contracts/src/index.ts`).

## MCP Manifest

- `mcp-manifest.valid.json` — valid MCP manifest with one tool; asserts `McpManifestSchema` accepts minimal tool discovery payloads.
- `mcp-manifest.missing-tools.json` — manifest missing the required `tools` array; asserts `McpManifestSchema` rejects incomplete manifests.

## SSE Frame

- `sse-frame.run-started.json` — valid `sse-run-started` frame; asserts `SseFrameSchema` accepts run lifecycle start events.
- `sse-frame.tool-call.json` — valid `sse-tool-call` frame with tool name and args; asserts `SseFrameSchema` accepts tool invocation events.
- `sse-frame.tool-result.json` — valid `sse-tool-result` frame with tool name and result payload; asserts `SseFrameSchema` accepts tool result events.
- `sse-frame.run-finished.json` — valid `sse-run-finished` frame; asserts `SseFrameSchema` accepts run lifecycle completion events.
- `sse-frame.malformed.json` — frame with unknown `kind: "sse-unknown"`; asserts `SseFrameSchema` rejects unrecognized frame kinds.

## Workflow Graph

- `workflow-graph.valid.json` — linear 2-node graph (`catalog` → `assemble`); asserts `WorkflowGraphSchema` accepts valid dependency orderings.
- `workflow-graph.cycle.json` — graph with a cycle (`node-a` ↔ `node-b`); asserts `WorkflowGraphSchema` rejects cyclic graphs.
- `workflow-graph.unknown-dep.json` — edge referencing non-existent node `node-missing`; asserts `WorkflowGraphSchema` rejects dangling edge references.

## Session Ownership

- `session-ownership.valid.json` — ownership with `expiresAt` after `createdAt`; asserts `BuilderSessionOwnershipSchema` accepts valid temporal ordering.
- `session-ownership.expired.json` — ownership with `expiresAt` before `createdAt`; asserts `BuilderSessionOwnershipSchema` rejects expired sessions.

## Asset Catalog Manifest

- `asset-catalog-manifest.valid.json` — ordinal sprite naming manifest; asserts `AssetCatalogManifestSchema` accepts `spriteNaming.kind: "ordinal"`.
- `asset-catalog-manifest.paired.json` — paired sprite naming manifest for memory cards; asserts `AssetCatalogManifestSchema` accepts `spriteNaming.kind: "paired"`.
- `asset-catalog-manifest.missing-source.json` — manifest missing required `source: "catalog.json"`; asserts `AssetCatalogManifestSchema` rejects manifests without explicit source.

## Template Snapshot

- `template-snapshot.custom.toy-memory.json` — valid custom template snapshot with `template.custom.toy-memory` ID; asserts `GameProfileTemplateSnapshotSchema` accepts custom namespace IDs and `BuilderTemplateNamespaceSchema` accepts the `template.custom.*` prefix.
- `template-snapshot.collision.memory-match.json` — snapshot using bundled ID `template.memory-match` as a custom template; asserts `GameProfileTemplateSnapshotSchema` accepts the shape but `BuilderTemplateNamespaceSchema` rejects the non-custom namespace collision.
