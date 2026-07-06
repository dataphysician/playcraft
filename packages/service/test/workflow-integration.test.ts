import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  BuilderServiceResponseSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  WorkflowGraphSchema,
  type BuilderServiceExecution,
  type BuilderServiceResponse,
  type WorkflowGraph
} from "@playcraft/contracts";
import {
  createLocalPlaycraftService,
  handleLocalServiceRequestBatch
} from "../src/index.js";
import { runLocalServiceCli, type LocalServiceCliIo } from "../src/cli.js";

interface CapturedIo {
  io: LocalServiceCliIo;
  stdout: string[];
  stderr: string[];
}

function captureIo(): CapturedIo {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message)
    },
    stdout,
    stderr
  };
}

function linearWorkflowGraph(sessionId: string): WorkflowGraph {
  return WorkflowGraphSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "workflow-graph.test.integration.linear",
    version: "1.0.0",
    kind: "workflow-graph",
    nodes: [
      {
        id: "node-assemble",
        actionName: "assemble",
        payload: { sessionId, text: "Memory game with dinosaurs" },
        dependsOn: []
      },
      {
        id: "node-preview",
        actionName: "preview",
        payload: { sessionId, interaction: { action: "primary" } },
        dependsOn: ["node-assemble"]
      },
      {
        id: "node-export",
        actionName: "export-profile",
        payload: { sessionId },
        dependsOn: ["node-preview"]
      }
    ],
    edges: [
      { from: "node-assemble", to: "node-preview" },
      { from: "node-preview", to: "node-export" }
    ],
    startNodeId: "node-assemble"
  });
}

function failingWorkflowGraph(sessionId: string): WorkflowGraph {
  return WorkflowGraphSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "workflow-graph.test.integration.failing",
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
        payload: {
          sessionId: "session.workflow.integration.missing-active",
          text: "doomed"
        },
        dependsOn: ["node-catalog"]
      }
    ],
    edges: [
      { from: "node-catalog", to: "node-bad-update" }
    ],
    startNodeId: "node-catalog"
  });
}

describe("playcraft-service run-workflow CLI", () => {
  let tempDir: string;
  let graphPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "playcraft-t18-"));
    graphPath = join(tempDir, "graph.json");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("loads graph JSON and executes the workflow through runLocalServiceCli", () => {
    const sessionId = "session.workflow.integration.cli";
    const graph = linearWorkflowGraph(sessionId);
    writeFileSync(graphPath, JSON.stringify(graph, null, 2));

    const capture = captureIo();
    const exitCode = runLocalServiceCli(["run-workflow", graphPath, "--json"], capture.io);

    expect(exitCode).toBe(0);
    expect(capture.stderr).toEqual([]);

    const jsonOutput = capture.stdout.join("\n");
    expect(jsonOutput.length).toBeGreaterThan(0);

    const parsed = BuilderServiceResponseSchema.parse(JSON.parse(jsonOutput));
    expect(parsed.actionName).toBe("execute-workflow");
    expect(parsed.execution).toBeDefined();

    const events = parsed.execution?.events ?? [];
    const toolCallCount = events.filter((event) => eventTypeOf(event) === "ToolCall").length;
    expect(toolCallCount).toBe(3);
    expect(events.some((event) => eventTypeOf(event) === "RunFinished")).toBe(true);
  });

  it("prints a human-readable workflow summary when --json is omitted", () => {
    const sessionId = "session.workflow.integration.cli-summary";
    const graph = linearWorkflowGraph(sessionId);
    writeFileSync(graphPath, JSON.stringify(graph, null, 2));

    const capture = captureIo();
    const exitCode = runLocalServiceCli(["run-workflow", graphPath], capture.io);

    expect(exitCode).toBe(0);
    expect(capture.stderr).toEqual([]);
    const summary = capture.stdout.join("\n");
    expect(summary).toContain("workflow events");
    expect(summary).toContain("toolCall=3");
  });

  it("returns exit 1 when the graph file is missing", () => {
    const missingPath = join(tempDir, "does-not-exist.json");

    const capture = captureIo();
    const exitCode = runLocalServiceCli(["run-workflow", missingPath], capture.io);

    expect(exitCode).toBe(1);
    expect(capture.stderr.join("\n")).toContain("unable to read workflow graph file");
    expect(capture.stderr.join("\n")).toContain(missingPath);
  });

  it("returns exit 1 when no graph path is provided", () => {
    const capture = captureIo();
    const exitCode = runLocalServiceCli(["run-workflow"], capture.io);

    expect(exitCode).toBe(1);
    expect(capture.stderr.join("\n")).toContain("run-workflow requires a graph JSON file path");
  });
});

describe("execute-workflow in handleLocalServiceRequestBatch", () => {
  it("dispatches workflow and other requests through the same batch", () => {
    const service = createLocalPlaycraftService();
    const sessionId = "session.workflow.integration.batch";
    const graph = linearWorkflowGraph(sessionId);

    const responses = handleLocalServiceRequestBatch([
      {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.integration.workflow",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "execute-workflow",
        workflow: graph
      },
      {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.integration.get-session",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "get-session",
        sessionId
      }
    ], service);

    expect(responses).toHaveLength(2);
    expect(responses[0]?.actionName).toBe("execute-workflow");
    expect(responses[0]?.execution).toBeDefined();

    expect(responses[1]?.actionName).toBe("get-session");
    expect(responses[1]?.session?.sessionId).toBe(sessionId);
  });
});

describe("AG-UI frame emission during workflow execution", () => {
  it("emits ToolCall, ToolResult, and RunFinished events through service.handle()", () => {
    const service = createLocalPlaycraftService();
    const sessionId = "session.workflow.integration.frames";
    const graph = linearWorkflowGraph(sessionId);

    const response = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.integration.frames",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "execute-workflow",
      workflow: graph
    });

    expect(response.actionName).toBe("execute-workflow");
    const execution = response.execution;
    expect(execution).toBeDefined();

    const types = (execution?.events ?? []).map(eventTypeOf);
    expect(types).toContain("ToolCall");
    expect(types).toContain("ToolResult");
    expect(types).toContain("RunFinished");

    const toolCallCount = types.filter((type) => type === "ToolCall").length;
    expect(toolCallCount).toBe(3);
  });

  it("includes a result payload with the executed node count in the response", () => {
    const service = createLocalPlaycraftService();
    const sessionId = "session.workflow.integration.count";
    const graph = linearWorkflowGraph(sessionId);

    const response = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.integration.count",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "execute-workflow",
      workflow: graph
    });

    expect(response.execution?.result.sessionId).toBe(service.catalog().sessions.defaultAssembleSessionId);
    expect(response.execution?.result.preview.interactionCount).toBe(3);
  });
});

describe("workflow failure surfaces in the response", () => {
  it("emits a ToolResult with an error field and a non-success workflow-finished when a node fails", () => {
    const service = createLocalPlaycraftService();
    const sessionId = "session.workflow.integration.fail";
    const graph = failingWorkflowGraph(sessionId);

    const response: BuilderServiceResponse = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.integration.fail",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "execute-workflow",
      workflow: graph
    });

    expect(() => BuilderServiceResponseSchema.parse(response)).not.toThrow();
    expect(response.actionName).toBe("execute-workflow");
    expect(response.execution).toBeDefined();

    const execution: BuilderServiceExecution = response.execution!;
    const events = execution.events;

    const errorToolResult = events.find((event) => {
      if (eventTypeOf(event) !== "ToolResult") {
        return false;
      }
      const result = readNestedField(event, ["value", "result"]);
      return readNestedField(result, ["error"]) !== undefined;
    });
    expect(errorToolResult).toBeDefined();

    const runFinished = events.find((event) => eventTypeOf(event) === "RunFinished");
    expect(runFinished).toBeDefined();
    if (runFinished) {
      const success = readNestedField(runFinished, ["value", "success"]);
      expect(success).toBe(false);
      const failed = readNestedField(runFinished, ["value", "failed"]);
      expect(Array.isArray(failed)).toBe(true);
      expect((failed as unknown[]).length).toBeGreaterThan(0);
    }
  });
});

function readNestedField(value: unknown, path: readonly string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function eventTypeOf(event: unknown): string | undefined {
  if (typeof event !== "object" || event === null) {
    return undefined;
  }
  const candidate = event as { type?: unknown };
  return typeof candidate.type === "string" ? candidate.type : undefined;
}

function readObjectField(event: unknown, field: string): unknown {
  if (typeof event !== "object" || event === null) {
    return undefined;
  }
  const record = event as Record<string, unknown>;
  return record[field];
}