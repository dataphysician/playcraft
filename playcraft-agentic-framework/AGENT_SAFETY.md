# Playcraft Agent Safety Policy

This document defines the hard safety guardrails for Playcraft's agent-facing surfaces. All MCP discovery, tool invocation, and agent integration must respect these constraints. Cloud-side framework SDKs, third-party runtime runtimes, authentication flows, databases, and remote retrieval are out of scope; the framework ships no HTTP source for remote enrichment.

## Local-Only Constraint

Playcraft stays local-only. Tool discovery and execution happen on the local machine. There is no remotely operated service, no cloud broker, and no external service registry. Agents connect to a local HTTP endpoint or in-process transport only. The wired local inference engine (`MoonshineStreamingCpuEngine` running LFM2.5-VL-450M-Extract over Moonshine Streaming CPU) executes on the host CPU without any network call. This is a local-only surface.

## No Authentication

No authentication flows are permitted. There are no credentials, OAuth tokens, API keys, or identity providers. The MCP surface does not challenge, verify, or carry user identities beyond a local session identifier. There is no auth requirement.

## No Database

No database access is permitted. Playcraft does not connect to SQL or NoSQL stores, caches, or persistence layers outside the local filesystem. Session state and assembled profiles live in local memory or local files only. There is no database layer.

## No Network Execution from the Core

The core has no network execution path. The wired local inference engine never calls out to a remote model; tool calls are constrained by `Outlines` to JSON Schemas and resolve against local registries; asset generation scans the local asset folder (`apps/studio/src/assets/library/replacements/` or the `PLAYCRAFT_REPLACEMENTS_FOLDER` override). The `RemoteEnrichmentSource` interface ships with `NullRemoteEnrichmentSource` as the default; any real HTTP source is supplied by the host, not by the framework.

## Tool Allowlist

The MCP surface exposes exactly the following allowlisted builder actions. No other tools may be added without an explicit contract update:

- `assemble-game`
- `update-game`
- `preview-action`
- `list-builder-tools`
- `get-session`
- `export-profile`
- `import-profile`

## Provenance and Trace

Every building block the agent loop registers (whether bundled-local, authored-local, or remote-agent) carries a `provenance` discriminator. The agent transcript (`PlaycraftAgentTranscript`) plus the recipe namespace (`recipe.bundled.* | recipe.local-authored.* | recipe.remote-agent.*`) makes every assembly decision auditable. Saved profiles and bundles retain per-block provenance so a downstream consumer can answer "where did this manifest come from?" without examining log output.

## Enforcement

These constraints are enforced by `McpServerPolicySchema` in `@playcraft/contracts`, by the `PLAYCRAFT_MCP_GUARDRAILS` constant, by `RemoteEnrichmentSource` contracts that require a host-supplied implementation to call out to a network, by `LocalInferenceEngine` contracts that require `offline: true` and `localOnly: true`, and by `scripts/check-guardrails.mjs` running under `pnpm lint:guardrails`. Any policy object that relaxes a `true` literal, empties the allowlist, or includes an unregistered tool name is rejected at validation time. Any building block missing the required `provenance` field is rejected at parse time.
