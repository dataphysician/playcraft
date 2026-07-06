import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BuilderServiceRequestSchema,
  BuilderServiceResponseSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  SseFrameSchema,
  WorkflowGraphSchema,
  type SseFrame,
  type WorkflowGraph,
  type WorkflowNode
} from "@playcraft/contracts";
import { createLocalPlaycraftService } from "../src/index.js";
import { executeWorkflow, executeWorkflowSse } from "../src/workflow/executor.js";

const WORKFLOW_MAX_NODES = 20;

function loadFixture(relativePath: string): unknown {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), "tests", "fixtures", "new-contracts", relativePath),
      "utf8"
    )
  );
}

function buildLinearGraph(overrides: Partial<WorkflowGraph> = {}): WorkflowGraph {
  return WorkflowGraphSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "workflow-graph.test.linear",
    version: "1.0.0",
    kind: "workflow-graph",
    nodes: [
      {
        id: "node-catalog",
        actionName: "catalog",
        payload: {},
        dependsOn: []
      },
      {
        id: "node-assemble",
        actionName: "assemble",
        payload: { sessionId: "session.workflow.linear", text: "Memory game with dinosaurs" },
        dependsOn: ["node-catalog"]
      },
      {
        id: "node-export",
        actionName: "export-profile",
        payload: { sessionId: "session.workflow.linear" },
        dependsOn: ["node-assemble"]
      }
    ],
    edges: [
      { from: "node-catalog", to: "node-assemble" },
      { from: "node-assemble", to: "node-export" }
    ],
    startNodeId: "node-catalog",
    ...overrides
  });
}

async function collect<T>(generator: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of generator) {
    items.push(item);
  }
  return items;
}

describe("workflow schemas", () => {
  it("accepts the valid fixture graph", () => {
    const fixture = loadFixture("workflow-graph.valid.json");
    expect(() => WorkflowGraphSchema.parse(fixture)).not.toThrow();
  });

  it("rejects the cycle fixture graph at parse time", () => {
    const fixture = loadFixture("workflow-graph.cycle.json");
    expect(() => WorkflowGraphSchema.parse(fixture)).toThrow(/cycle/u);
  });

  it("rejects graphs that reference unknown nodes via dependsOn", () => {
    const fixture = loadFixture("workflow-graph.unknown-dep.json");
    expect(() => WorkflowGraphSchema.parse(fixture)).toThrow(/must reference an existing node/u);
  });

  it("rejects graphs that exceed the 20-node cap at parse time", () => {
    const nodes = Array.from({ length: WORKFLOW_MAX_NODES + 1 }, (_, index) => ({
      id: `node-${String(index)}`,
      actionName: "catalog" as const,
      payload: {},
      dependsOn: index === 0 ? [] : [`node-${String(index - 1)}`]
    }));
    const edges = nodes.slice(1).map((node, index) => ({
      from: `node-${String(index)}`,
      to: node.id
    }));

    expect(() =>
      WorkflowGraphSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "workflow-graph.test.too-large",
        version: "1.0.0",
        kind: "workflow-graph",
        nodes,
        edges,
        startNodeId: "node-0"
      })
    ).toThrow(/Array must contain at most 20/u);
  });

  it("rejects malformed conditions at parse time", () => {
    expect(() =>
      WorkflowGraphSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "workflow-graph.test.bad-condition",
        version: "1.0.0",
        kind: "workflow-graph",
        nodes: [
          {
            id: "node-a",
            actionName: "catalog",
            payload: {},
            dependsOn: [],
            condition: "not a real condition"
          }
        ],
        edges: [],
        startNodeId: "node-a"
      })
    ).toThrow(/workflow condition/i);
  });

  it("accepts workflow graphs of exactly 20 nodes", () => {
    const nodes = Array.from({ length: WORKFLOW_MAX_NODES }, (_, index) => ({
      id: `node-${String(index)}`,
      actionName: "catalog" as const,
      payload: {},
      dependsOn: index === 0 ? [] : [`node-${String(index - 1)}`]
    }));
    const edges = nodes.slice(1).map((node, index) => ({
      from: `node-${String(index)}`,
      to: node.id
    }));

    expect(() =>
      WorkflowGraphSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "workflow-graph.test.exact-cap",
        version: "1.0.0",
        kind: "workflow-graph",
        nodes,
        edges,
        startNodeId: "node-0"
      })
    ).not.toThrow();
  });
});

describe("workflow executor", () => {
  it("executes a linear workflow in topological order", async () => {
    const service = createLocalPlaycraftService();
    const graph = buildLinearGraph();

    const events = await collect(
      executeWorkflow(graph, {
        send: (request) => service.handle(request)
      }, "session.workflow.linear")
    );

    const nodeIds = events
      .filter((event) => event.kind === "node-started")
      .map((event) => event.kind === "node-started" ? event.nodeId : "");

    expect(nodeIds).toEqual(["node-catalog", "node-assemble", "node-export"]);

    const finished = events.find((event) => event.kind === "workflow-finished");
    expect(finished?.kind).toBe("workflow-finished");
    if (finished?.kind === "workflow-finished") {
      expect(finished.executed).toEqual(["node-catalog", "node-assemble", "node-export"]);
      expect(finished.skipped).toEqual([]);
      expect(finished.failed).toEqual([]);
      expect(finished.success).toBe(true);
    }
  });

  it("skips nodes whose condition evaluates to false and cascades by default", async () => {
    const service = createLocalPlaycraftService();
    const graph = WorkflowGraphSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "workflow-graph.test.conditional",
      version: "1.0.0",
      kind: "workflow-graph",
      nodes: [
        {
          id: "node-catalog",
          actionName: "catalog",
          payload: {},
          dependsOn: []
        },
        {
          id: "node-skip-me",
          actionName: "assemble",
          payload: { shouldRun: "false" },
          dependsOn: ["node-catalog"],
          condition: "payload.shouldRun == \"true\""
        },
        {
          id: "node-downstream",
          actionName: "export-profile",
          payload: { sessionId: "session.workflow.conditional" },
          dependsOn: ["node-skip-me"]
        }
      ],
      edges: [
        { from: "node-catalog", to: "node-skip-me" },
        { from: "node-skip-me", to: "node-downstream" }
      ],
      startNodeId: "node-catalog"
    });

    const events = await collect(
      executeWorkflow(graph, {
        send: (request) => service.handle(request)
      }, "session.workflow.conditional")
    );

    const startedNodeIds = events
      .filter((event) => event.kind === "node-started")
      .map((event) => event.kind === "node-started" ? event.nodeId : "");

    expect(startedNodeIds).toEqual(["node-catalog"]);
    expect(events.some((event) => event.kind === "node-skipped" && event.nodeId === "node-skip-me")).toBe(true);
    expect(events.some((event) => event.kind === "node-skipped" && event.nodeId === "node-downstream")).toBe(true);

    const finished = events.find((event) => event.kind === "workflow-finished");
    expect(finished?.kind).toBe("workflow-finished");
    if (finished?.kind === "workflow-finished") {
      expect(finished.executed).toEqual(["node-catalog"]);
      expect(finished.skipped).toEqual(["node-skip-me", "node-downstream"]);
      expect(finished.success).toBe(true);
      expect(finished.failed).toEqual([]);
    }
  });

  it("continues past skipped nodes when cascade is false", async () => {
    const service = createLocalPlaycraftService();
    const graph = WorkflowGraphSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "workflow-graph.test.no-cascade",
      version: "1.0.0",
      kind: "workflow-graph",
      nodes: [
        {
          id: "node-catalog",
          actionName: "catalog",
          payload: {},
          dependsOn: []
        },
        {
          id: "node-skip-me",
          actionName: "assemble",
          payload: { shouldRun: "false" },
          dependsOn: ["node-catalog"],
          condition: "payload.shouldRun == \"true\"",
          cascade: false
        },
        {
          id: "node-downstream",
          actionName: "export-profile",
          payload: { sessionId: "session.workflow.no-cascade" },
          dependsOn: ["node-skip-me"]
        }
      ],
      edges: [
        { from: "node-catalog", to: "node-skip-me" },
        { from: "node-skip-me", to: "node-downstream" }
      ],
      startNodeId: "node-catalog"
    });

    const events = await collect(
      executeWorkflow(graph, {
        send: (request) => service.handle(request)
      }, "session.workflow.no-cascade")
    );

    const startedNodeIds = events
      .filter((event) => event.kind === "node-started")
      .map((event) => event.kind === "node-started" ? event.nodeId : "");

    expect(startedNodeIds).toEqual(["node-catalog", "node-downstream"]);
  });

  it("halts on failure when continueOnError is false", async () => {
    const service = createLocalPlaycraftService();
    const graph = WorkflowGraphSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "workflow-graph.test.halt",
      version: "1.0.0",
      kind: "workflow-graph",
      nodes: [
        {
          id: "node-catalog",
          actionName: "catalog",
          payload: {},
          dependsOn: []
        },
        {
          id: "node-bad-update",
          actionName: "update",
          payload: { text: "doomed" },
          dependsOn: ["node-catalog"]
        },
        {
          id: "node-should-not-run",
          actionName: "export-profile",
          payload: { sessionId: "session.workflow.halt" },
          dependsOn: ["node-bad-update"]
        }
      ],
      edges: [
        { from: "node-catalog", to: "node-bad-update" },
        { from: "node-bad-update", to: "node-should-not-run" }
      ],
      startNodeId: "node-catalog"
    });

    const events = await collect(
      executeWorkflow(graph, {
        send: (request) => service.handle(request)
      }, "session.workflow.halt")
    );

    const startedNodeIds = events
      .filter((event) => event.kind === "node-started")
      .map((event) => event.kind === "node-started" ? event.nodeId : "");

    expect(startedNodeIds).toEqual(["node-catalog", "node-bad-update"]);
    const failedEvent = events.find((event) => event.kind === "node-failed");
    expect(failedEvent?.kind).toBe("node-failed");
    if (failedEvent?.kind === "node-failed") {
      expect(failedEvent.nodeId).toBe("node-bad-update");
    }
    const finished = events.find((event) => event.kind === "workflow-finished");
    expect(finished?.kind).toBe("workflow-finished");
    if (finished?.kind === "workflow-finished") {
      expect(finished.failed).toContain("node-bad-update");
      expect(finished.success).toBe(false);
    }
  });

  it("continues past failures when continueOnError is true", async () => {
    const service = createLocalPlaycraftService();
    const graph = WorkflowGraphSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "workflow-graph.test.continue",
      version: "1.0.0",
      kind: "workflow-graph",
      nodes: [
        {
          id: "node-catalog",
          actionName: "catalog",
          payload: {},
          dependsOn: []
        },
        {
          id: "node-bad-update",
          actionName: "update",
          payload: { text: "doomed" },
          dependsOn: ["node-catalog"],
          continueOnError: true
        },
        {
          id: "node-get-session",
          actionName: "get-session",
          payload: { sessionId: "session.workflow.continue" },
          dependsOn: ["node-bad-update"]
        }
      ],
      edges: [
        { from: "node-catalog", to: "node-bad-update" },
        { from: "node-bad-update", to: "node-get-session" }
      ],
      startNodeId: "node-catalog"
    });

    const events = await collect(
      executeWorkflow(graph, {
        send: (request) => service.handle(request)
      }, "session.workflow.continue")
    );

    const startedNodeIds = events
      .filter((event) => event.kind === "node-started")
      .map((event) => event.kind === "node-started" ? event.nodeId : "");

    expect(startedNodeIds).toEqual(["node-catalog", "node-bad-update", "node-get-session"]);
    const finished = events.find((event) => event.kind === "workflow-finished");
    expect(finished?.kind).toBe("workflow-finished");
    if (finished?.kind === "workflow-finished") {
      expect(finished.failed).toContain("node-bad-update");
      expect(finished.executed).toContain("node-get-session");
      expect(finished.success).toBe(false);
    }
  });

  it("emits AG-UI frames during workflow execution", async () => {
    const service = createLocalPlaycraftService();
    const graph = buildLinearGraph();

    const frames: SseFrame[] = await collect(
      executeWorkflowSse(graph, {
        send: (request) => service.handle(request)
      }, "session.workflow.linear")
    );

    for (const frame of frames) {
      expect(() => SseFrameSchema.parse(frame)).not.toThrow();
    }

    const kinds = frames.map((frame) => frame.kind);
    expect(kinds).toContain("sse-tool-call");
    expect(kinds).toContain("sse-tool-result");
    expect(kinds).toContain("sse-run-finished");

    const toolCallFrames = frames.filter((frame) => frame.kind === "sse-tool-call");
    expect(toolCallFrames.length).toBe(3);
  });

  it("rejects invalid workflow request envelopes at parse time", () => {
    expect(() =>
      BuilderServiceRequestSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.workflow-no-graph",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "execute-workflow"
      })
    ).toThrow(/execute-workflow requests require a workflow graph payload/u);

    expect(() =>
      BuilderServiceRequestSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.workflow-extra",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "assemble",
        text: "Memory game",
        workflow: {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: "workflow-graph.test.wrong-action",
          version: "1.0.0",
          kind: "workflow-graph",
          nodes: [
            {
              id: "node-catalog",
              actionName: "catalog",
              payload: {},
              dependsOn: []
            }
          ],
          edges: [],
          startNodeId: "node-catalog"
        }
      })
    ).toThrow(/workflow graphs are only accepted by execute-workflow requests/u);
  });
});

describe("LocalPlaycraftService.execute-workflow", () => {
  it("dispatches execute-workflow via handle() and returns a service response", () => {
    const service = createLocalPlaycraftService();
    const graph = buildLinearGraph();
    const response = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.workflow-handle",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "execute-workflow",
      workflow: graph
    });

    expect(() => BuilderServiceResponseSchema.parse(response)).not.toThrow();
    expect(response.actionName).toBe("execute-workflow");
    expect(response.execution).toBeDefined();
    expect(response.execution?.events.length).toBeGreaterThan(0);
  });

  it("dispatches execute-workflow via handleBatch", () => {
    const service = createLocalPlaycraftService();
    const graph = buildLinearGraph();
    const responses = service.handleBatch([
      {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.workflow-batch-1",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "execute-workflow",
        workflow: graph
      }
    ]);

    expect(responses).toHaveLength(1);
    expect(responses[0]?.actionName).toBe("execute-workflow");
    expect(responses[0]?.execution?.events.length).toBeGreaterThan(0);
  });

  it("publishes execute-workflow in the local service catalog", () => {
    const service = createLocalPlaycraftService();
    const catalog = service.catalog();
    const action = catalog.service.actions.find((entry) => entry.actionName === "execute-workflow");
    expect(action).toBeDefined();
    expect(action?.request.acceptedFields).toContain("workflow");
    expect(action?.request.requiredFields).toContain("workflow");
    expect(action?.responsePayload).toBe("execution");
  });
});

describe("workflow nodes use the same envelope as BuilderServiceRequest", () => {
  it("each node actionName matches a BuilderServiceActionName", () => {
    const graph = buildLinearGraph();
    const knownActions = new Set([
      "catalog",
      "assemble",
      "update",
      "preview",
      "reset",
      "get-session",
      "export-profile",
      "import-profile"
    ]);

    for (const node of graph.nodes as WorkflowNode[]) {
      expect(knownActions.has(node.actionName)).toBe(true);
    }
  });
});