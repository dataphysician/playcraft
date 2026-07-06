# Playcraft Next-Wave Roadmap

| Attribute | Value |
|-----------|-------|
| Status | Forward-only deferred features list |
| Date | 2026-07-06 |
| Scope | Features intentionally deferred from the current implementation |
| Owns | Rationale, dependencies, and graduation criteria for each deferred item |
| Excludes | Server retrieval contract (see `SERVER_RETRIEVAL_PLAN.md`) |

This document lists features that are not part of the current implementation
and the rationale for their deferral. Each item carries a one-paragraph
"why deferred" note and a short graduation criterion. None of the items below
are required by the current local-only service, the Studio, or the mobile
shell, and none of them relax the import-light boundary today.

The current implementation is local-first, deterministic, and replayable from
saved `GameAssemblyProfile` records. Items in this wave are deliberate
additions on top of that base, not changes to it.

## 1. Reading Guide

Each entry follows the same shape:

- **Item.** Short name.
- **Why deferred.** One paragraph. The constraint or risk that keeps it out
  of the current wave.
- **Depends on.** Other items in this list (if any) that must graduate first.
- **Graduation criterion.** What must be true before the item is promoted
  out of this document.

Graduation means a new plan is opened. Promotion does not mean implementation
begins immediately; it means the item is ready to be specified in detail.

## 2. Deferred Features

### 2.1 Multi-Tenant Session Isolation

| Attribute | Value |
|-----------|-------|
| Why deferred | The current service is single-host. Adding tenant boundaries requires an identity model the framework explicitly rejects in its import-light boundary (no auth, no DB, no remote discovery). A premature tenant model would force one of those relaxations. |
| Depends on | A future server retrieval wave (see `SERVER_RETRIEVAL_PLAN.md`). Multi-tenant isolation without a server boundary has no defensible semantics. |
| Graduation criterion | A tenant identity model that does not require authentication, a database, or network execution against a third-party host, and that preserves the seven-tool allowlist, has been written down and reviewed against the threat model in `SERVER_RETRIEVAL_PLAN.md`. |

The current `LocalPlaycraftService` continues to use local session ids and
local in-memory state. There is no shared namespace across processes.

### 2.2 npm Package Publishing

| Attribute | Value |
|-----------|-------|
| Why deferred | The framework's packages are interdependent through a pnpm workspace and rely on local-only tooling (the HTTP service, the CLI bins, the Studio, and the mobile shell) that assumes workspace resolution. Publishing requires pinned semver, a public README per package, and a release process that the current implementation does not yet need. |
| Depends on | None. Independent of server retrieval. |
| Graduation criterion | A release process is documented that covers semver policy, changelog generation, lockfile pinning for published artifacts, and the boundary between the import-light packages (publishable) and the app shells (not publishable). The pnpm workspace's `package.json` files are reviewed for `name`, `version`, `exports`, and `files` fields consistent with the policy. |

Until graduation, consumers clone the repo and use the workspace scripts.

### 2.3 End-to-End Test Harness

| Attribute | Value |
|-----------|-------|
| Why deferred | The current test suite is package-scoped (vitest per workspace package) and runs without network, browser automation, or shell orchestration. An E2E harness introduces infrastructure (Playwright drivers, headless browser setup, fixture seeding, parallel runner config) whose cost is justified only when there are end-to-end flows worth covering. Today the local HTTP server, CLI, and Studio are exercised through package tests and the existing `tests/import-light-and-scans.test.ts` source-scan gate. |
| Depends on | The Studio and the local HTTP service both stabilize at their current shape so a harness captures real flows instead of mock interactions. |
| Graduation criterion | A concrete list of user journeys has been enumerated (assemble via Studio, assemble via CLI, run workflow, export/import round-trip, MCP tool call sequence). A harness tool is chosen (Playwright, vitest browser mode, or equivalent) and the journeys are encoded as fixtures with deterministic local state. The harness runs in CI against the in-process service and the local HTTP service without network access. |

### 2.4 Server Retrieval Implementation

| Attribute | Value |
|-----------|-------|
| Why deferred | See `SERVER_RETRIEVAL_PLAN.md` for the full rationale. In short: the contract must be written and reviewed before code is written, and the current wave's safety properties (local-only, import-light, no auth, no DB, no network execution) must be preserved. |
| Depends on | The plan in `SERVER_RETRIEVAL_PLAN.md` is finalized, the threat model is reviewed, and the acceptance criteria are met. |
| Graduation criterion | The plan's acceptance criteria (schema parity, allowlist parity, ownership parity, threat-model tests, schema-drift gate, docs updated) are all satisfied in a follow-up implementation wave. |

### 2.5 Schema Versioning Beyond `playcraft.v1`

| Attribute | Value |
|-----------|-------|
| Why deferred | Today every public schema declares `"playcraft.v1"`. Introducing a v2 requires a versioning policy, a migration path for saved `GameAssemblyProfile` records, and a deprecation window for v1. None of that is justified yet; the current schemas have not reached a breaking-change threshold. |
| Depends on | Evidence that v1 cannot accommodate a needed capability. The evidence must come from a real consumer, not from speculative design. |
| Graduation criterion | A written policy that defines the conditions under which v2 opens, the migration tooling that converts saved records, the deprecation window for v1, and the registration in `PublicContractSchemas` that introduces `playcraft.v2` as an explicit discriminator. The policy must not allow in-flight schema drift as a substitute. |

### 2.6 Marketplace and Pack Publishing

| Attribute | Value |
|-----------|-------|
| Why deferred | The current pack model is local. A marketplace introduces third-party pack discovery, signature verification, and content moderation that depend on a server, identity, and a remote catalog. None of those exist in the current wave. |
| Depends on | Server retrieval, multi-tenant isolation, npm publishing. |
| Graduation criterion | The pack model gains a manifest schema for third-party authorship (capability tags, content rating, signature, source URL), a local verification flow that does not require a remote call, and a moderation policy that the safety policy pack can reference. The marketplace transport is its own plan. |

### 2.7 Federated Discovery

| Attribute | Value |
|-----------|-------|
| Why deferred | The current `BuilderCatalog` is generated locally. Federated discovery requires a registry server, a discovery protocol, and a trust model that the framework explicitly rejects today. |
| Depends on | Server retrieval. |
| Graduation criterion | A discovery protocol that preserves the seven-tool allowlist and the import-light boundary has been specified, reviewed against `SERVER_RETRIEVAL_PLAN.md`'s threat model, and implemented in a package that is not on the import-light critical path. |

### 2.8 Cross-Host Profile Replay

| Attribute | Value |
|-----------|-------|
| Why deferred | Replay today reconstructs from a `GameAssemblyProfile` saved on the same host. Cross-host replay would require a profile portability story (which packs, asset records, and replay events are bundled) and a content-hash verification flow that does not exist. |
| Depends on | npm publishing (so packs can be installed on a second host), pack signature verification. |
| Graduation criterion | A profile portability schema is added that bundles the pack set, asset references, replay event log, and a content hash for integrity. The replay harness loads the bundle on a fresh host without network calls. |

### 2.9 Remote Asset Library Sync

| Attribute | Value |
|-----------|-------|
| Why deferred | The current asset sources are local and deterministic. A remote library introduces network execution, credential storage, and an asset provenance story that the local path does not need. |
| Depends on | Server retrieval, schema versioning beyond v1 if asset record shape changes. |
| Graduation criterion | An `AssetSourcePack` exists with `mode: "remote"` and a documented credential/transport boundary that does not pollute the import-light core. The local deterministic asset source is still the default. |

### 2.10 Telemetry and Observability

| Attribute | Value |
|-----------|-------|
| Why deferred | Telemetry implies a destination, a destination implies network execution, and network execution is excluded from the current wave. Even opt-in telemetry would require a transport that does not exist. |
| Depends on | Server retrieval, or a documented local-only observability sink that does not require network. |
| Graduation criterion | A local-only observability sink (file-based, or in-memory) is specified that captures AG-UI events, validation findings, and replay traces without network access. Remote telemetry remains out of scope until the threat model in `SERVER_RETRIEVAL_PLAN.md` is updated to cover it. |

## 3. Items Explicitly Not in This Wave

The following are not deferred because they are not planned. They are
rejected at the framework level and belong in the heavyweight non-goals list
of `ROADMAP.md`.

- A general-purpose 2D/3D engine.
- Physics-heavy gameplay.
- A model-hosting stack.
- A database/auth/dashboard application framework as a core dependency.
- Production asset generation as a core requirement for local development.
- Runtime-generated play-surface code.
- Marketplace or community extension publishing as a v1 capability.

## 4. Lifecycle of This Document

This document is updated when:

- A deferred item graduates (removed, with a pointer to the new plan).
- A new item is added with rationale.
- An item's graduation criterion changes.

It is not updated to record implementation milestones, release notes, or
post-implementation review findings. Those belong in a separate document.