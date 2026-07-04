# Playcraft Agentic Game Framework PRD

**GDevelop-inspired game assembly for coding agents**

| Attribute | Value |
|-----------|-------|
| Version | 1.0.0-cleanroom |
| Date | 2026-06-27 |
| Status | Canonical cleanroom PRD |
| Audience | Product, engineering, design, coding-agent/tooling developers |

## 1. Vision

Playcraft is a lightweight, AG-UI-native SDK/framework for assembling mini games from typed contracts, event/rule semantics, trusted components, registries, assets, safety policies, and replayable profiles.

The product analogy is "GDevelop-inspired for coding agents." GDevelop shows that games can be authored through objects, events, behaviors, extensions, preview, and export. Playcraft adapts that lesson for agentic software development: agents assemble a constrained event/behavior graph instead of inventing a bespoke game runtime.

Playcraft is not an AI game generator. Agents may plan, suggest, and assemble. The framework must validate what they produce.

## 2. Product Thesis

Coding agents are good at following explicit contracts and bad at safely inventing ad hoc runtimes under vague requirements. Playcraft gives agents a small target:

- A game DSL expressed as TypeScript types and Zod schemas.
- Registries for mechanics, rules, components, themes, and asset sources.
- AG-UI event mapping for frontend/agent interaction.
- A trusted React rendering surface.
- Replayable `GameAssemblyProfile` records.
- Safety and privacy policies that are explicit, versioned, and testable.

The first useful domain is child-friendly educational mini games, but the framework must not bake child-specific assumptions into the generic core. Child behavior belongs in domain profiles, safety policy packs, rule packs, component packs, and theme packs.

## 3. Target Users

| User | Need |
|------|------|
| Coding agents | A strict DSL and registries they can target without inventing one-off game systems. |
| Product developers | A reusable way to assemble safe, replayable mini games. |
| Designers | Theme/component packs that keep assembled games coherent. |
| QA and safety reviewers | Inspectable profiles, event logs, validation results, provenance, and deterministic replay. |
| Future pack authors | A stable extension model for mechanics, rules, components, themes, and local asset sources. |
| Parents and educators | Predictable child-friendly games assembled from reviewed primitives. |

## 4. Core Product Model

| Object | Meaning |
|--------|---------|
| `PlaycraftAssemblyRequest` | Structured request to assemble a game from intent, domain constraints, target modality, and policy. |
| `DomainProfile` | Domain defaults and constraints, such as child-friendly educational games. |
| `SafetyPolicyPack` | Safety, privacy, rating, content, and modality rules. |
| `GameAssemblyProfile` | Saved recipe for one playable mini game. |
| `GameTemplateDefinition` | Reusable local template that bounds game rules, required mechanics, trusted components, and the default assembly request. |
| `MechanicDefinition` | Reusable interaction primitive such as reveal, match, sort, sequence, choose, trace, or guided response. |
| `RuleModuleDefinition` | Event/rule logic for progression, hints, retry, scoring, completion, safety, and celebration. |
| `ComponentManifest` | Trusted frontend render capability for one or more mechanics. |
| `ThemePack` | Visual/audio style bundle with accessibility and policy constraints. |
| `AssetGenerationRequest` | Local asset-source request for image, audio, animation, or text assets. |
| `AssetSourceCapabilityManifest` | Machine-readable local asset-source capability and constraint record. |
| `GeneratedAssetRecord` | Provenance-rich output of an asset request. |
| `PlaycraftAgUiEventEnvelope` | Validated Playcraft payload carried inside AG-UI `Custom` events. |
| `PlaycraftEventRecord` | Normalized runtime/replay event emitted by mechanics, rules, components, and tools. |
| `BuilderInputRequest` | Local text or Moonshine Streaming CPU transcript input accepted by the builder. |
| `BuilderToolDefinition` | Contract for reusable builder actions such as assemble, update, preview, and catalog listing. |

## 5. AG-UI Strategy

AG-UI is the standard outer protocol between agentic backends and Playcraft frontends. Playcraft should not define a parallel streaming protocol.

AG-UI handles:

- Run lifecycle.
- Step progress.
- State snapshots and deltas.
- Activity/progress events.
- Tool calls and tool results.
- Custom events.

Playcraft handles:

- The game DSL and schemas.
- Registry selection and compatibility checks.
- Playcraft-specific `Custom` event payload validation.
- Trusted component render semantics.
- Domain profiles and safety policies.
- Replayable profile persistence semantics.

AG-UI is domain-neutral. Playcraft custom payloads carry game semantics.

## 6. Lightweight V1 Scope

V1 must be small enough for a coding agent to implement and verify locally.

Required v1 capabilities:

- TypeScript contracts and Zod schemas for public interfaces.
- Mechanic, rule, component, theme, and asset source registries.
- Deterministic local planner.
- Deterministic local asset source.
- AG-UI adapter with validated Playcraft `Custom` envelopes.
- Trusted React renderer that can render registered components only.
- Replay harness that reconstructs a game from saved `GameAssemblyProfile` records.
- Three MVP profiles: memory match, sorting, and sequence repeat.

V1 must run and test without:

- Network access.
- Credentials or secrets.
- AI SDKs.
- GPU or model weights.
- Database services.
- Tauri or native shell dependencies.

## 7. Initial Mechanics

| Mechanic | Purpose |
|----------|---------|
| `tap-to-select` | Select one visible object. |
| `tap-to-reveal` | Reveal hidden object content. |
| `match-pairs` | Match related objects. |
| `sort-into-bins` | Assign objects to categories. |
| `sequence-repeat` | Repeat a visual sequence. |
| `choose-one` | Pick one answer from a small safe set. |
| `trace-path` | Follow a simple path with touch or pointer input. |
| `drag-or-tap-move` | Move an object, with tap fallback. |
| `hint-prompt` | Offer contextual help. |
| `retry-loop` | Retry without punitive feedback. |
| `timed-celebration` | Play short success feedback. |

These mechanics are registry entries, not a hardcoded `GameType` enum.

## 8. Initial Rules

Initial rule categories:

- Completion.
- Attempt and retry.
- Hint timing.
- Noncompetitive progress.
- Age-band difficulty.
- Safety/content blocking.
- Session bounds and quiet mode.
- Celebration and feedback.

Rules consume `PlaycraftEventRecord` events and emit state patches, normalized events, validation warnings, and replay records. Rule defaults must come from profiles, manifests, themes, domain profiles, or explicit config records.

## 9. Trusted Components

Agents may request registered component capabilities. They may not generate arbitrary React or runtime code for play surfaces.

Initial component capabilities:

- `ChoiceGrid`
- `RevealCardGrid`
- `PairMatchBoard`
- `SortBins`
- `SequencePad`
- `AudioPromptPanel`
- `TraceCanvas`
- `CelebrationOverlay`
- `HintBubble`

Every component must have a `ComponentManifest` with props schema, supported mechanics, emitted frontend tools, asset requirements, accessibility requirements, policy constraints, and replay behavior.

## 10. MVP Profiles

| Profile | Mechanics | Rules | Components |
|---------|-----------|-------|------------|
| Memory Match | `tap-to-reveal`, `match-pairs`, `timed-celebration` | Pair match, retry, hint, completion | `RevealCardGrid`, `CelebrationOverlay` |
| Sorting | `tap-to-select`, `sort-into-bins`, `retry-loop` | Category validation, guided retry, completion | `ChoiceGrid`, `SortBins`, `HintBubble` |
| Sequence Repeat | `sequence-repeat`, `tap-to-select`, `timed-celebration` | Progression, attempt feedback, hint | `SequencePad`, `ChoiceGrid`, `CelebrationOverlay` |

Each profile must be assembled through registries and deterministic local tools, then replayed from the saved `GameAssemblyProfile`.

## 11. Authoring Flow

1. User or agent provides intent.
2. Intent parser emits `PlaycraftAssemblyRequest`.
3. Planner selects domain profile, safety policy pack, mechanics, rules, theme, components, and asset needs from registries.
4. Asset requester emits local asset-source `AssetGenerationRequest` records.
5. Deterministic local asset source returns `GeneratedAssetRecord` values.
6. Safety evaluator checks text, asset metadata, mechanics, age/domain fit, privacy, and policy.
7. Assembly validator checks schemas, registry references, event graph, component bindings, assets, safety, and replay readiness.
8. AG-UI stream reports progress, state, custom events, policy findings, and validation results.
9. Frontend renders trusted components only.
10. Saved profile can be replayed without re-running planning or asset generation.

## 12. Explicit Rejections

The framework must reject these old abstractions:

- No hardcoded `GameType` enum as the core model.
- No source-name branching.
- No arbitrary generated React/runtime code.
- No app-route handlers as framework core.
- No app-specific database, auth, dashboard, or deployment assumptions in core docs.
- No behavior-changing defaults hidden as bare constants in core logic.
- No third-party runtime integration in the framework path.

## 13. Success Criteria

The first useful version succeeds when:

- An agent can assemble memory match, sorting, and sequence repeat from registered primitives.
- AG-UI carries lifecycle, state, activity, tool, and Playcraft custom messages.
- Every Playcraft `Custom` event envelope is schema-validated.
- The frontend renders only registered trusted React components.
- Deterministic local tools build and replay profiles offline.
- A saved `GameAssemblyProfile` reconstructs the same playable game.
- Safety policy and domain profile selection can change validation behavior without changing AG-UI handling.
- Registry tests prove selection is capability-driven, not game-type or source-name branching.

## 14. Non-Goals

- General-purpose 2D/3D engine.
- Physics-heavy gameplay.
- Marketplace or community extension publishing in v1.
- Full visual game editor in v1.
- Real asset generation as a dependency for local development or tests.
- Runtime-generated play-surface code.
- Database/auth/dashboard product assumptions in core framework contracts.
