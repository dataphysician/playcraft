# Playcraft Server-Ready Retrieval Plan

| Attribute | Value |
|-----------|-------|
| Status | Out of current implementation |
| Date | 2026-07-06 |
| Scope | Capability contract + threat model for a future server retrieval adapter |
| Owns | `@playcraft/contracts` `BuilderServiceRequest` / `BuilderServiceResponse` / catalog / session envelope |
| Excludes | All implementation code in this repo today |

Server-Ready Retrieval is **out of scope for the current implementation**. The
local Playcraft service is the only supported path. This document is a contract
specification only: it defines the boundary a future server adapter must honor
when, and only when, server retrieval is undertaken. No code in this repository
implements, anticipates, or weakens against server retrieval today.

The current implementation must remain local-only, import-light, and free of
authentication, database, and network-execution assumptions. The presence of
this plan does not relax any of those constraints.

## 1. Scope Boundary

| In scope for this document | Out of scope for this document |
|----------------------------|-------------------------------|
| Capability contract for a future server adapter | Concrete server, transport, or hosting decisions |
| Threat model for the local path under server pressure | Authentication, billing, or multi-tenant identity design |
| Required existing schemas an adapter must reuse | Implementation code, scaffolding, or feature flags |
| Acceptance criteria for opening server retrieval | Migration timeline or deprecation of the local service |

The local path keeps its current properties:

- No authentication, no OAuth, no API keys, no bearer tokens.
- No database client, no SQL, no NoSQL, no remote cache.
- No network execution against third-party hosts.
- No remote discovery, no cloud broker, no hosted MCP registry.
- Local filesystem and local in-memory state only.
- Exactly seven allowlisted builder tools on the MCP surface.

## 2. Why a Plan and Not a Feature

The framework is intentionally local-first. Adding server retrieval without a
written boundary risks leaking the local path's safety properties. This plan
fixes the boundary in writing so future server work has to defend departures
from it, instead of accumulating drift.

A future server retrieval adapter must:

1. Preserve the existing `BuilderServiceRequest` / `BuilderServiceResponse`
   envelope shape. No new envelope, no new `schemaVersion`.
2. Reuse the existing `BuilderServiceRequestSchema`,
   `BuilderServiceResponseSchema`, `BuilderCatalogSchema`, and
   `McpServerPolicySchema` validators verbatim. No new schemas required for
   the local path.
3. Enforce the same seven-tool allowlist the local service enforces.
4. Forward session ownership checks exactly as `LocalPlaycraftService` does
   today, with the same `expiresAt` semantics.
5. Fail closed on unknown tools, invalid arguments, expired sessions, and
   schema drift.

## 3. Capability Contract

A future server adapter must implement the following surface. None of these
are new product capabilities; they are existing capabilities re-served by a
network boundary.

### 3.1 Transport Surface

| Operation | Local reference | Server obligation |
|-----------|-----------------|-------------------|
| Receive `BuilderServiceRequest` | `LocalPlaycraftService.handle` | Same schema validation, same error envelope. |
| Emit `BuilderServiceResponse` | `LocalPlaycraftService.handle` | Same schema validation, same field semantics. |
| Stream AG-UI events | `/playcraft/stream` SSE | Same frame types, same `kind` discriminator. |
| Serve MCP catalog | `/playcraft/catalog` | Identical `BuilderCatalog.mcp` block, seven tools. |
| List MCP tools | `/playcraft/tools/list` | Identical `McpTool[]` shape, identical allowlist filter. |
| Invoke MCP tool | `/playcraft/tools/call` | Identical error kinds, identical ownership check. |

### 3.2 Validation Contract

The server adapter must validate every incoming envelope against the same
schemas the local service validates against today. Concretely:

- `BuilderServiceRequestSchema.parse(request)` before any handling.
- `BuilderServiceResponseSchema.parse(response)` before any emission.
- `McpServerPolicySchema.parse(policy)` for any policy object referenced.
- `WorkflowGraphSchema.parse(graph)` for any `execute-workflow` argument.

Validation must reject unknown payload types, malformed envelopes, and any
request whose `schemaVersion` is not `"playcraft.v1"`. The server must not
introduce a new schema version. A future bump is a separate plan.

### 3.3 Tool Allowlist Contract

The server adapter must expose exactly the same seven tools as the local MCP
surface:

- `assemble-game`
- `update-game`
- `preview-action`
- `list-builder-tools`
- `get-session`
- `export-profile`
- `import-profile`

Any other tool name must be rejected with `tool-not-allowed` (HTTP 403). The
adapter must not invent new builder actions, even if the underlying service
could satisfy them. New capabilities belong in a new plan that revisits the
allowlist and `BuilderActionNameSchema.options` together.

### 3.4 Session Ownership Contract

The server adapter must perform the same session expiry check the local
service performs today:

- Read `X-Session-Id` when present.
- Reject with `session-expired` (HTTP 401) when the session's
  `ownership.expiresAt` is in the past.
- Treat sessions without tracked ownership as non-expired (legacy/test
  fixture compatibility).
- Forward the session id to the underlying handler so per-session state
  writes remain ownership-checked.

### 3.5 Catalog Drift Contract

The catalog the server returns must match `BuilderCatalogSchema` byte-for-byte
in shape and in the seven-tool invariant. The server must not return
platform-specific extensions, telemetry, or metadata fields beyond what
`BuilderCatalogSchema` already permits.

## 4. Threat Model

The threat model below covers what must never happen. It applies to both the
local path (today) and any future server adapter (when implemented). It is
expressed as properties the system must preserve.

### 4.1 Threat: Child Data Exfiltration

| Property | Local today | Server obligation |
|----------|-------------|-------------------|
| Child PII never leaves the host | Enforced by import-light boundary | Forbidden: server must not transmit child PII off-host. |
| Profiles do not carry identifying metadata | `GameAssemblyProfileSchema` enforces | Forbidden: server must reject profile augmentation with PII fields. |
| Local transcript text stays local | `MoonshineTranscriptRecord` is local-only | Forbidden: server must not upload transcripts. |

The server adapter must not provide a feature, endpoint, or background job
that exports, aggregates, indexes, or transmits child-generated content,
session recordings, or transcript text to any destination outside the host
that originated the request.

### 4.2 Threat: Authentication, Database, Network Execution in Local Path

| Property | Local today | Server obligation |
|----------|-------------|-------------------|
| No auth challenge on any local route | Enforced by import-light boundary | Forbidden: local service must remain auth-free even if a sibling server exists. |
| No database client in core | Import-light test asserts | Forbidden: server adapter must not introduce a DB client into the local package. |
| No network execution against third-party hosts | Import-light test asserts | Forbidden: local service must not call remote hosts during a local request. |

If a server adapter is built, it must live in a new package or workspace that
is clearly separated from the import-light boundary. The local path must
remain testable without that package present.

### 4.3 Threat: Schema Drift

| Property | Local today | Server obligation |
|----------|-------------|-------------------|
| `schemaVersion` is `"playcraft.v1"` everywhere | Constant in `@playcraft/contracts` | Forbidden: server must not negotiate a different version. |
| Public schemas are the single source of truth | `PublicContractSchemas` registry | Forbidden: server must not redefine a schema locally. |
| Unknown `payloadType` is rejected | `PlaycraftPayloadTypeSchema` | Forbidden: server must not accept new payload types. |

A new schema version is its own plan. It must not be introduced as a
side-effect of server retrieval.

### 4.4 Threat: Tool Surface Expansion

| Property | Local today | Server obligation |
|----------|-------------|-------------------|
| Exactly seven allowlisted tools | `PLAYCRAFT_MCP_GUARDRAILS` constant | Forbidden: server must not add or rename tools. |
| Allowlist is schema-validated | `McpServerPolicySchema.superRefine` | Forbidden: server must not bypass the allowlist. |

### 4.5 Threat: Session Forgery and Replay

| Property | Local today | Server obligation |
|----------|-------------|-------------------|
| Session ownership is checked | `LocalPlaycraftService.checkSessionExpiry` | Server must run the same check. |
| Expired sessions are rejected with 401 | `/playcraft/tools/call` | Server must emit the same status and kind. |
| Sessions without ownership are non-expired | Local service treats as legacy | Server must apply the same rule. |

The server must not introduce stronger identity guarantees on the existing
session id; if stronger identity is needed, that is a new plan.

### 4.6 Threat: Catalog Drift

| Property | Local today | Server obligation |
|----------|-------------|-------------------|
| Catalog exposes the seven tools | `BuilderCatalogSchema.mcp.tools[].length === 7` | Server must preserve the invariant. |
| Catalog does not leak internal sources | Asset theme and template aliases only | Server must not expose local filesystem paths, env vars, or secrets. |

### 4.7 Threat: Import-Light Boundary Erosion

| Property | Local today | Server obligation |
|----------|-------------|-------------------|
| Core packages import without SDKs, network, GPU, DB, app-route frameworks, or native shell APIs | `import-light boundaries and source scans` test | Forbidden: server work must not add such imports to the local core. |
| No `eval`, `new Function`, `dangerouslySetInnerHTML` in renderer/builder/service/studio | Source scans assert this | Forbidden: server work must not relax this scan. |

## 5. Required Existing Schemas

A future server adapter must reuse, not redefine, the following schemas from
`@playcraft/contracts`. They are the contract. Any divergence is a defect.

| Schema | File | Purpose |
|--------|------|---------|
| `BuilderServiceRequestSchema` | `packages/contracts/src/builder.ts` | Inbound envelope validation. |
| `BuilderServiceRequestBatchSchema` | `packages/contracts/src/builder.ts` | Inbound batch envelope validation. |
| `BuilderServiceResponseSchema` | `packages/contracts/src/builder.ts` | Outbound envelope validation. |
| `BuilderCatalogSchema` | `packages/contracts/src/builder-catalog.ts` | Catalog shape and seven-tool invariant. |
| `McpServerPolicySchema` | `packages/contracts/src/mcp.ts` | MCP allowlist and policy gating. |
| `McpToolSchema` | `packages/contracts/src/mcp.ts` | MCP tool entry shape. |
| `McpManifestSchema` | `packages/contracts/src/mcp.ts` | MCP manifest shape. |
| `WorkflowGraphSchema` | `packages/contracts/src/workflow.ts` | `execute-workflow` argument validation. |
| `SseFrameSchema` | `packages/contracts/src/sse.ts` | AG-UI stream frame shape. |
| `PlaycraftAgUiEventEnvelopeSchema` | `packages/contracts/src/ag-ui.ts` | Custom envelope payload shape. |

A future server adapter that needs a field not present in any of these
schemas must either (a) extend the schema in a backward-compatible way and
ship the change through the same registry, or (b) open a new plan. Renaming
a field, narrowing a type, or changing a discriminator is not allowed.

## 6. Acceptance Criteria for Opening Server Retrieval

Server retrieval may be undertaken only when **all** of the following hold.
Each item is a property the future implementation must demonstrate before
server retrieval ships.

1. **Local path unchanged.** `pnpm test` for the local packages still passes
   without the server adapter present. The local service, MCP server,
   Studio, mobile shell, and CLI all work offline.
2. **Schema parity.** A round-trip test exists for every transport surface
   (request, response, batch, catalog, tool list, tool call, workflow
   argument, SSE frame) that proves server output equals local output for
   the same input.
3. **Allowlist parity.** A test asserts the server emits exactly the seven
   allowlisted tool names and rejects every other name with
   `tool-not-allowed`.
4. **Ownership parity.** A test asserts the server rejects expired sessions
   with `session-expired` and forwards non-expired sessions identically to
   the local service.
5. **Threat-model tests.** Tests assert that child transcript text, child
   PII, and profile PII fields are never transmitted off-host by the
   adapter. The import-light scans continue to pass for the local core.
6. **Schema drift gate.** A test asserts the server rejects any request or
   response whose `schemaVersion` is not `"playcraft.v1"`. A second test
   asserts no new payload types are accepted.
7. **Docs updated.** This document is updated to record the actual
   deployment, transport, and hosting choices. Until then, the "out of
   current implementation" status remains.

Until those criteria are met, the local service is the supported path and
this plan remains a contract specification only.

## 7. Explicit Non-Goals for Server Retrieval

The following are explicitly out of scope for any future server retrieval
work. They belong to separate plans.

- Multi-tenant session isolation and shared profile namespaces.
- npm package publishing of the framework or any sub-package.
- End-to-end test harness against a deployed server.
- Marketplace, billing, or paid tier integration.
- Federated discovery across multiple Playcraft servers.
- Cross-host replay of profiles assembled on a different host.
- Synchronization of local asset libraries with a remote catalog.
- Telemetry, metrics, or observability backends.

These items are tracked in `NEXT_WAVE.md`. Server retrieval must not be
treated as a vehicle to sneak any of them in.

## 8. Lifecycle of This Document

This document is a forward-only specification. It is updated when:

- The capability contract changes (new surface, deprecation, replacement).
- The threat model gains a new threat that the local path must defend.
- An acceptance criterion is met or revised.
- A deferred item in `NEXT_WAVE.md` graduates into the contract.

It is not updated to record implementation milestones, release notes, or
deployment decisions. Those belong in a separate post-implementation review.