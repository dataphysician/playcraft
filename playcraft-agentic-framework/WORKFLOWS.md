# Playcraft Workflow Graphs

| Attribute | Value |
|-----------|-------|
| Status | Local-only workflow reference |
| Date | 2026-07-05 |
| Scope | `WorkflowGraphSchema`, `playcraft-service run-workflow` CLI, `execute-workflow` MCP tool |
| Auth | None — local-only, no OAuth, no API keys, no tokens |

A workflow graph is a directed acyclic graph of builder tool calls. The local
executor walks the graph in topological order and turns each node into a
`BuilderServiceRequest` against the same `LocalPlaycraftService` the CLI and
HTTP server use. Workflows are local-only, deterministic, and replayable.

This document is reference material, not a tutorial. The four example files
under `examples/workflows/` are the canonical samples.

## Schema

The graph shape comes from `WorkflowGraphSchema` in `@playcraft/contracts`.

| Field | Type | Notes |
|-------|------|-------|
| `schemaVersion` | `"playcraft.v1"` | Required. |
| `id` | stable id | Stable, lowercase, dots/hyphens. Used as the CLI request id prefix. |
| `version` | semver string | Required. |
| `kind` | `"workflow-graph"` | Required. |
| `nodes` | `WorkflowNode[]` | 1 to 20 nodes. |
| `edges` | `WorkflowEdge[]` | `from` and `to` reference node ids. |
| `startNodeId` | stable id | Must reference an existing node. |

Each `WorkflowNode`:

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | stable id | required | |
| `actionName` | `BuilderServiceActionName` | required | `assemble`, `update`, `preview`, `get-session`, `export-profile`, `import-profile`, `catalog`, `reset`, `execute-workflow`. |
| `payload` | `Record<string, JsonValue>` | `{}` | Per-action fields. `sessionId` is injected from the graph session if absent. |
| `dependsOn` | `stableId[]` | `[]` | Declares node precedence. |
| `condition` | `WorkflowCondition` | unset | Optional skip condition, evaluated against the node's own `payload`. |
| `parallel` | boolean | `false` | Marker for parallel scheduling intent. |
| `cascade` | boolean | `true` | When `false`, downstream nodes still run after a skip. |
| `continueOnError` | boolean | `false` | When `true`, the executor keeps going after a node failure. |

### Condition language

Conditions read from the node's own `payload`, not from prior node results.

```text
payload.<key> == "literal"
payload.<key> != "literal"
payload.<key>.length == 0
len(payload.<key>) >= 1
```

Supported literals: double-quoted strings, signed numbers, `true`, `false`,
`null`. The full regex is in `WorkflowConditionSchema`.

### Capacity

Workflows cap at 20 nodes (`WORKFLOW_NODE_CAP`). Cycles are rejected at parse
time. Dangling edges or `dependsOn` references to unknown nodes are rejected at
parse time.

## Patterns

### Linear

`assemble` then `preview` then `export-profile`. The default shape for an
agent-driven one-shot build.

```json
{
  "schemaVersion": "playcraft.v1",
  "id": "workflow-graph.examples.assemble-preview-export",
  "version": "1.0.0",
  "kind": "workflow-graph",
  "nodes": [
    {
      "id": "node-assemble",
      "actionName": "assemble",
      "payload": {
        "sessionId": "session.examples.linear",
        "text": "Memory game with dinosaurs"
      },
      "dependsOn": []
    },
    {
      "id": "node-preview",
      "actionName": "preview",
      "payload": {
        "sessionId": "session.examples.linear",
        "interaction": { "action": "primary" }
      },
      "dependsOn": ["node-assemble"]
    },
    {
      "id": "node-export",
      "actionName": "export-profile",
      "payload": { "sessionId": "session.examples.linear" },
      "dependsOn": ["node-preview"]
    }
  ],
  "edges": [
    { "from": "node-assemble", "to": "node-preview" },
    { "from": "node-preview", "to": "node-export" }
  ],
  "startNodeId": "node-assemble"
}
```

See `examples/workflows/assemble-preview-export.json`.

### Custom template

The same linear shape with a `template.custom.*` template id. The executor
leaves template resolution to the underlying `assemble` action.

```json
{
  "schemaVersion": "playcraft.v1",
  "id": "workflow-graph.examples.custom-template",
  "version": "1.0.0",
  "kind": "workflow-graph",
  "nodes": [
    {
      "id": "node-assemble",
      "actionName": "assemble",
      "payload": {
        "sessionId": "session.examples.custom-template",
        "templateId": "template.custom.toy-memory",
        "text": "Memory game with toys"
      },
      "dependsOn": []
    },
    {
      "id": "node-preview",
      "actionName": "preview",
      "payload": {
        "sessionId": "session.examples.custom-template",
        "interaction": { "action": "primary" }
      },
      "dependsOn": ["node-assemble"]
    },
    {
      "id": "node-export",
      "actionName": "export-profile",
      "payload": { "sessionId": "session.examples.custom-template" },
      "dependsOn": ["node-preview"]
    }
  ],
  "edges": [
    { "from": "node-assemble", "to": "node-preview" },
    { "from": "node-preview", "to": "node-export" }
  ],
  "startNodeId": "node-assemble"
}
```

See `examples/workflows/assemble-with-custom-template.json`. The custom
template ids (`template.custom.toy-memory`, `template.custom.dolphin-sorting`,
`template.custom.fruit-sequence`) are registered as part of the custom
template pack and resolve through the same planner path as bundled templates.

### Parallel

A fan-out of independent `assemble` nodes (different sessionIds) that merge
into a single tail node. The executor schedules the fan-out branches once all
`dependsOn` entries are satisfied; setting `parallel: true` flags scheduling
intent for future parallel runners without changing today's sequential order.

```json
{
  "schemaVersion": "playcraft.v1",
  "id": "workflow-graph.examples.parallel-three",
  "version": "1.0.0",
  "kind": "workflow-graph",
  "nodes": [
    {
      "id": "node-catalog",
      "actionName": "catalog",
      "payload": {},
      "dependsOn": []
    },
    {
      "id": "node-assemble-memory",
      "actionName": "assemble",
      "payload": {
        "sessionId": "session.examples.parallel.memory",
        "templateId": "template.memory-match",
        "text": "Memory match game"
      },
      "dependsOn": ["node-catalog"],
      "parallel": true
    },
    {
      "id": "node-assemble-sorting",
      "actionName": "assemble",
      "payload": {
        "sessionId": "session.examples.parallel.sorting",
        "templateId": "template.sorting",
        "text": "Sorting game"
      },
      "dependsOn": ["node-catalog"],
      "parallel": true
    },
    {
      "id": "node-assemble-sequence",
      "actionName": "assemble",
      "payload": {
        "sessionId": "session.examples.parallel.sequence",
        "templateId": "template.sequence-repeat",
        "text": "Sequence repeat game"
      },
      "dependsOn": ["node-catalog"],
      "parallel": true
    },
    {
      "id": "node-catalog-tail",
      "actionName": "catalog",
      "payload": {},
      "dependsOn": [
        "node-assemble-memory",
        "node-assemble-sorting",
        "node-assemble-sequence"
      ]
    }
  ],
  "edges": [
    { "from": "node-catalog", "to": "node-assemble-memory" },
    { "from": "node-catalog", "to": "node-assemble-sorting" },
    { "from": "node-catalog", "to": "node-assemble-sequence" },
    { "from": "node-assemble-memory", "to": "node-catalog-tail" },
    { "from": "node-assemble-sorting", "to": "node-catalog-tail" },
    { "from": "node-assemble-sequence", "to": "node-catalog-tail" }
  ],
  "startNodeId": "node-catalog"
}
```

See `examples/workflows/parallel-assemble-three.json`. Each branch owns its
own sessionId because the local service enforces session ownership across
writes.

### Conditional skip

An optional gate on a downstream node, expressed as a condition that reads
the node's own `payload`. Setting `payload.success` to `"false"` skips the
export without affecting earlier nodes.

```json
{
  "schemaVersion": "playcraft.v1",
  "id": "workflow-graph.examples.conditional-export",
  "version": "1.0.0",
  "kind": "workflow-graph",
  "nodes": [
    {
      "id": "node-assemble",
      "actionName": "assemble",
      "payload": {
        "sessionId": "session.examples.conditional",
        "text": "Memory game with dinosaurs"
      },
      "dependsOn": []
    },
    {
      "id": "node-preview",
      "actionName": "preview",
      "payload": {
        "sessionId": "session.examples.conditional",
        "interaction": { "action": "primary" }
      },
      "dependsOn": ["node-assemble"],
      "continueOnError": true
    },
    {
      "id": "node-export",
      "actionName": "export-profile",
      "payload": {
        "sessionId": "session.examples.conditional",
        "success": "true"
      },
      "dependsOn": ["node-preview"],
      "condition": "payload.success == \"true\""
    }
  ],
  "edges": [
    { "from": "node-assemble", "to": "node-preview" },
    { "from": "node-preview", "to": "node-export" }
  ],
  "startNodeId": "node-assemble"
}
```

See `examples/workflows/conditional-export-only-on-success.json`. By default a
skip cascades: downstream nodes are skipped too. Set `cascade: false` on the
gate node to keep downstream nodes running.

### Error handling

Two flags control how the executor reacts to a node failure:

- `continueOnError: true` — keep walking the graph after a node error. The
  failed node id lands in the workflow-finished event's `failed` array and the
  final `success` flag is `false`.
- `continueOnError: false` — stop after the first failure. Downstream nodes
  never start.

`packages/service/test/workflow.test.ts` exercises both shapes against
`update` failures on missing sessions.

## Running a workflow

### CLI

`playcraft-service run-workflow <path> [--json]`

The CLI reads the JSON file, parses it against `WorkflowGraphSchema`, builds
an `execute-workflow` `BuilderServiceRequest`, and dispatches it through the
local service. The exit code is `0` on success and `1` on any parse or
runtime error. With `--json` the full `BuilderServiceResponse` is printed;
without it, a one-line summary like:

```text
session.examples.linear: workflow events toolCall=3 toolResult=3 runFinished=1
```

```bash
pnpm --filter @playcraft/service exec playcraft-service run-workflow \
  ../examples/workflows/assemble-preview-export.json --json
```

### MCP HTTP

The MCP-compatible HTTP server exposes `execute-workflow` through the
allowlisted tool list. Call `POST /playcraft/tools/call` with the workflow
graph embedded under `arguments.workflow`:

```bash
curl -s -X POST http://127.0.0.1:8787/playcraft/tools/call \
  -H 'content-type: application/json' \
  -d @- <<'JSON'
{
  "name": "execute-workflow",
  "arguments": {
    "workflow": {
      "schemaVersion": "playcraft.v1",
      "id": "workflow-graph.examples.assemble-preview-export",
      "version": "1.0.0",
      "kind": "workflow-graph",
      "nodes": [
        {
          "id": "node-assemble",
          "actionName": "assemble",
          "payload": { "sessionId": "session.examples.mcp", "text": "Memory game with dinosaurs" },
          "dependsOn": []
        },
        {
          "id": "node-export",
          "actionName": "export-profile",
          "payload": { "sessionId": "session.examples.mcp" },
          "dependsOn": ["node-assemble"]
        }
      ],
      "edges": [{ "from": "node-assemble", "to": "node-export" }],
      "startNodeId": "node-assemble"
    }
  }
}
JSON
```

The response is a `BuilderServiceResponse` with `actionName: "execute-workflow"`
and a full `execution` block (events, result, session snapshot). See
`MCP_API.md` for the route table, the seven-tool allowlist, and ownership
enforcement.

### Programmatic

`@playcraft/service` exports `executeWorkflow` (async generator) and
`executeWorkflowSync` (sync generator) for in-process use. The MCP server
reuses `LocalPlaycraftService.handle` which dispatches `execute-workflow`
through the same executor.

## Best practices

- Keep graphs small. The 20-node cap is intentional; long workflows usually
  hide a step that should run in another session.
- Prefer linear graphs. Branch only when branches own distinct sessions or
  read distinct capabilities. Most agent workflows fit in 3 to 5 nodes.
- Use `parallel: true` as a hint, not a guarantee. Today's executor still
  walks nodes sequentially; the flag is for future schedulers.
- Use `continueOnError` sparingly. The default failure path halts the graph
  and surfaces the failure id, which is what most agent callers want.
- Use `cascade: false` on a gate node when downstream work should run even if
  the gate is skipped (e.g., a logging tail node).
- Set `payload.success` or similar gates explicitly. Conditions read the
  node's own payload, not prior results.
- Pick stable, descriptive ids. The graph id becomes the request id prefix
  in CLI mode and shows up in tooling and logs.
- Validate at write time. `WorkflowGraphSchema.parse(json)` rejects cycles,
  dangling references, oversized graphs, and malformed conditions before the
  executor ever runs.