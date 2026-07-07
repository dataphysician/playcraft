# Playcraft MCP-Compatible HTTP API

| Attribute | Value |
|-----------|-------|
| Status | Local-only HTTP surface for the local Playcraft service |
| Date | 2026-07-06 |
| Scope | `POST /playcraft` envelope + the MCP-compatible `/playcraft/catalog`, `/playcraft/tools/list`, and `/playcraft/tools/call` routes |
| Auth | None — local-only, no OAuth, no API keys, no tokens |

This document describes the MCP-compatible HTTP surface exposed by the `playcraft-service-http` CLI (`packages/service/src/http-server.ts`). It sits alongside the canonical `BuilderServiceRequest` / `BuilderServiceResponse` envelope that the Studio, mobile shell, and CLI all consume.

The MCP routes are intentionally narrow: a catalog dump, a filtered tool listing, and a single guarded tool invocation. They reuse the existing `LocalPlaycraftService` so the allowlist, ownership, and assembly semantics are identical to the in-process service.

## Why a local-only surface

The Playcraft service is local-first. There is no authentication, no network exposure, and no third-party runtime in the MCP path. A consumer of this API is expected to be a coding agent or developer tool running on the same host as the service. Do not put the MCP routes behind a public reverse proxy without adding authentication and rate limiting; this document does not specify how to do that.

The agent loop that calls these routes runs on the local LLM (`MoonshineStreamingCpuEngine`, LFM2.5-VL-450M-Extract over Moonshine Streaming CPU). The remote enrichment layer is opt-in and is not wired into the shipped MCP surface.

## Route table

| Method | Path | Purpose | Request | Response |
|--------|------|---------|--------|----------|
| GET | `/health` | Liveness probe | — | `{ schemaVersion, kind: "builder-service-health", ok: true }` |
| POST | `/playcraft` | Canonical `BuilderServiceRequest` envelope | `BuilderServiceRequestSchema` JSON | `BuilderServiceResponseSchema` JSON |
| GET | `/playcraft/stream` | AG-UI SSE stream | query params | `text/event-stream` |
| GET | `/playcraft/catalog` | MCP catalog with embedded manifest and tool list | — | `BuilderCatalog` JSON with `mcp.tools[].length === 7` |
| POST | `/playcraft/tools/list` | Filtered MCP tool list (optional `?include=`) | empty body | `McpTool[]` JSON |
| POST | `/playcraft/tools/call` | Allowlisted MCP tool invocation | `{ name, arguments }` | `BuilderServiceResponse` JSON (or error) |

The default route prefix is `/playcraft` and can be overridden via `--route` / `PLAYCRAFT_HTTP_ROUTE_PREFIX`.

## Shared response shape

All MCP-route errors use the same envelope:

```json
{
  "schemaVersion": "playcraft.v1",
  "kind": "<kind>",
  "message": "<human-readable detail>"
}
```

The `kind` is one of `builder-service-error`, `tool-not-allowed`, or `session-expired` depending on the failure path.

## `GET /playcraft/catalog`

Returns the full `BuilderCatalog` (per `BuilderCatalogSchema`) with the `mcp` field populated. The `mcp` block contains:

- `manifest`: an `McpManifestSchema` instance built from the current builder tool list and the `BuilderServiceCatalog` reference.
- `tools`: the same array as `manifest.tools`, mirroring the allowlisted builder actions (`assemble-game`, `update-game`, `preview-action`, `list-builder-tools`, `get-session`, `export-profile`, `import-profile`).
- `retrieval`: `{ current: "bundled-local" | "authored-local" | "remote-agent", planned: "bundled-local" | "authored-local" | "remote-agent" }`. The catalog exposes the same enum the `GameTemplateDefinition.retrieval` schema carries.

```bash
curl -s http://127.0.0.1:8787/playcraft/catalog | jq '.mcp.tools | length'
# 7
```

## `POST /playcraft/tools/list`

Returns an array of `McpTool` JSON objects (per `McpToolSchema`). Without a query filter, every allowlisted tool is returned. With `?include=`, the result is filtered by action name or full tool name.

The `include` query is a comma-separated list. Each entry matches against either the MCP tool name (`tool:assemble-game`) or the underlying action name (`assemble-game`).

```bash
curl -s -X POST http://127.0.0.1:8787/playcraft/tools/list | jq '.[].name'
# "tool:assemble-game"
# "tool:update-game"
# "tool:preview-action"
# "tool:list-builder-tools"
# "tool:get-session"
# "tool:export-profile"
# "tool:import-profile"

curl -s -X POST 'http://127.0.0.1:8787/playcraft/tools/list?include=assemble-game' | jq '.[].name'
# "tool:assemble-game"
```

## `POST /playcraft/tools/call`

Invokes an allowlisted builder tool and returns a `BuilderServiceResponse`. The request body is:

```json
{
  "name": "assemble-game",
  "arguments": { "templateId": "template.memory-match" }
}
```

The `name` is the builder action name from `PLAYCRAFT_MCP_GUARDRAILS.allowlistedTools`, not the MCP tool name. If the caller provides an `X-Session-Id` header, that session id is forwarded to the underlying service and used for ownership checks.

### Successful call

```bash
curl -s -X POST http://127.0.0.1:8787/playcraft/tools/call \
  -H 'content-type: application/json' \
  -d '{"name":"assemble-game","arguments":{"templateId":"template.memory-match"}}'
```

Returns 200 with a full `BuilderServiceResponse` payload (including `execution.result.profile.id`, the AG-UI `events` array, and a session snapshot).

### Tool not allowlisted (403)

```bash
curl -s -X POST http://127.0.0.1:8787/playcraft/tools/call \
  -H 'content-type: application/json' \
  -d '{"name":"evil-tool","arguments":{}}'
```

Response:

```http
HTTP/1.1 403 Forbidden
content-type: application/json

{
  "schemaVersion": "playcraft.v1",
  "kind": "tool-not-allowed",
  "message": "tool evil-tool is not in the PLAYCRAFT_MCP_GUARDRAILS allowlist"
}
```

### Session expired (401)

When the caller provides `X-Session-Id` pointing at a session whose ownership `expiresAt` is in the past, the endpoint rejects the call with 401.

```bash
curl -s -X POST http://127.0.0.1:8787/playcraft/tools/call \
  -H 'content-type: application/json' \
  -H 'x-session-id: session.expired' \
  -d '{"name":"assemble-game","arguments":{"templateId":"template.memory-match"}}'
```

Response:

```http
HTTP/1.1 401 Unauthorized
content-type: application/json

{
  "schemaVersion": "playcraft.v1",
  "kind": "session-expired",
  "message": "session session.expired expired at <iso-datetime>"
}
```

### Invalid arguments (400)

If the request body is malformed (missing `name`, `arguments` not an object), or `invokeMcpTool` throws (invalid arguments against the builder schema), the endpoint returns 400.

```bash
curl -s -X POST http://127.0.0.1:8787/playcraft/tools/call \
  -H 'content-type: application/json' \
  -d '{"name":"assemble-game","arguments":{"templateId":"BAD-CASE"}}'
```

Response:

```http
HTTP/1.1 400 Bad Request
content-type: application/json

{
  "schemaVersion": "playcraft.v1",
  "kind": "builder-service-error",
  "message": "<zod-error or service-error detail>"
}
```

## Allowlist

`PLAYCRAFT_MCP_GUARDRAILS.allowlistedTools` is the single source of truth and contains exactly seven builder action names:

```text
assemble-game
update-game
preview-action
list-builder-tools
get-session
export-profile
import-profile
```

Any other `name` returns 403 `tool-not-allowed` without invoking the underlying service.

## Ownership enforcement

When `X-Session-Id` is present, the endpoint checks `LocalPlaycraftService.checkSessionExpiry(sessionId)` before invoking the tool. The check returns a `session-expired` error when the session's `ownership.expiresAt` is in the past. Sessions without any tracked ownership are treated as non-expired (this rule keeps test fixtures comparable across the local service and the MCP route). The MCP route does not consult the `LOCAL_SERVICE_SESSION_POLICY.sessionBoundActions` filter that the canonical `/playcraft` envelope uses, so the MCP endpoint enforces expiry uniformly across all allowlisted tools.

## Out of scope

- No OAuth, no API keys, no bearer tokens, no JWT.
- No remote discovery, no third-party MCP transport.
- No streaming variant of `/playcraft/tools/call` (use `/playcraft/stream` for AG-UI event delivery).
- No batch tool calls (use `/playcraft` with a `BuilderServiceRequestBatchSchema` envelope).
- No persistence, no database writes.
- No metrics or rate limiting.

Any of the above would require explicit framework expansion beyond the local-only contract documented here.
