# Playcraft Agent Safety Policy

This document defines the hard safety guardrails for Playcraft's agent-facing surfaces. All MCP discovery, tool invocation, and agent integration must respect these constraints. Real remote providers, authentication flows, databases, and network execution are out of scope until the Server-Ready Retrieval wave.

## Local-Only Constraint

Playcraft MCP stays local-only. All tool discovery and execution happens on the local machine. There is no remote provider discovery, no cloud broker, and no external service registry. Agents connect to a local HTTP endpoint or in-process transport only. This is a local-only surface.

## No Authentication

No authentication flows are permitted. There are no credentials, OAuth tokens, API keys, or identity providers in the local-only path. The MCP surface does not challenge, verify, or carry user identities beyond a local session identifier. There is no auth requirement.

## No Database

No database access is permitted. Playcraft does not connect to SQL or NoSQL stores, caches, or persistence layers outside the local filesystem. Session state and assembled profiles live in local memory or local files only. There is no database layer.

## No Network Execution

No network execution is permitted. Tool calls do not fetch remote resources, call external APIs, or stream data from internet hosts. Asset generation, template resolution, and service requests are deterministic and local. There is no remote execution path.

## Tool Allowlist

The MCP surface exposes exactly the following allowlisted builder tools. No other tools may be added without a corresponding policy update.

- `assemble-game`
- `update-game`
- `preview-action`
- `list-builder-tools`
- `get-session`
- `export-profile`
- `import-profile`

## Enforcement

These constraints are enforced by `McpServerPolicySchema` in `@playcraft/contracts` and by the `PLAYCRAFT_MCP_GUARDRAILS` constant. Any policy object that relaxes a `true` literal, empties the allowlist, or includes an unregistered tool name is rejected at validation time.
