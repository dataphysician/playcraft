import {
  BuilderServiceRequestSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  evaluateCondition,
  type BuilderServiceActionName,
  type BuilderServiceRequest,
  type BuilderServiceResponse,
  type ConditionEvaluationResult,
  type JsonValue,
  type SseFrame,
  type WorkflowGraph,
  type WorkflowNode
} from "@playcraft/contracts";
import { agUiEventToSseFrame, type AgUiEventLike } from "../sse.js";

export type WorkflowEvent =
  | { kind: "workflow-started"; runId: string; graphId: string; nodeCount: number; sessionId: string }
  | { kind: "node-started"; runId: string; nodeId: string; nodeIndex: number; actionName: BuilderServiceActionName; toolName: string; args: JsonValue }
  | { kind: "node-skipped"; runId: string; nodeId: string; nodeIndex: number; actionName: BuilderServiceActionName; toolName: string; reason: string }
  | { kind: "node-failed"; runId: string; nodeId: string; nodeIndex: number; actionName: BuilderServiceActionName; toolName: string; error: string }
  | { kind: "node-finished"; runId: string; nodeId: string; nodeIndex: number; actionName: BuilderServiceActionName; toolName: string; result: JsonValue }
  | { kind: "workflow-finished"; runId: string; graphId: string; executed: string[]; skipped: string[]; failed: string[]; success: boolean };

export interface WorkflowServiceTransport {
  send(request: BuilderServiceRequest): BuilderServiceResponse | Promise<BuilderServiceResponse>;
}

export function* executeWorkflowSync(
  graph: WorkflowGraph,
  service: WorkflowServiceTransport,
  sessionId: string
): Generator<WorkflowEvent> {
  if (graph.nodes.length > 20) {
    throw new Error(`workflow graph exceeds 20-node cap (${String(graph.nodes.length)} nodes)`);
  }

  const runId = workflowRunId();
  const order = topologicalOrder(graph);
  const nodeIndex = new Map<string, number>();
  graph.nodes.forEach((node, index) => nodeIndex.set(node.id, index));

  yield {
    kind: "workflow-started",
    runId,
    graphId: graph.id,
    nodeCount: graph.nodes.length,
    sessionId
  };

  const executed: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const nodeId of order) {
    const node = nodeById(graph, nodeId);
    if (!node) {
      continue;
    }

    if (skipped.includes(nodeId) || failed.includes(nodeId)) {
      continue;
    }

    const toolName = toolNameForAction(node.actionName);
    const args = buildNodeRequestArgs(node, sessionId);
    const sequenceIndex = nodeIndex.get(nodeId) ?? 0;

    let conditionResult: ConditionEvaluationResult | undefined;
    if (node.condition !== undefined) {
      conditionResult = evaluateCondition(node.condition, { payload: node.payload });
    }

    if (conditionResult && !conditionResult.satisfied) {
      skipped.push(nodeId);
      yield {
        kind: "node-skipped",
        runId,
        nodeId,
        nodeIndex: sequenceIndex,
        actionName: node.actionName,
        toolName,
        reason: conditionResult.detail
      };

      if (node.cascade !== false) {
        const descendants = descendantsOf(graph, nodeId);
        for (const descendant of descendants) {
          if (!skipped.includes(descendant) && !executed.includes(descendant) && !failed.includes(descendant)) {
            const descendantNode = nodeById(graph, descendant);
            if (!descendantNode) {
              continue;
            }
            skipped.push(descendant);
            yield {
              kind: "node-skipped",
              runId,
              nodeId: descendant,
              nodeIndex: nodeIndex.get(descendant) ?? 0,
              actionName: descendantNode.actionName,
              toolName: toolNameForAction(descendantNode.actionName),
              reason: `upstream ${nodeId} was skipped (cascade)`
            };
          }
        }
      }
      continue;
    }

    yield {
      kind: "node-started",
      runId,
      nodeId,
      nodeIndex: sequenceIndex,
      actionName: node.actionName,
      toolName,
      args
    };

    try {
      const request = BuilderServiceRequestSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: `bsr.wf.${runId.slice(-12)}.${nodeId}`,
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: node.actionName,
        ...args
      });
      const response = service.send(request);
      const resultPayload = responsePayloadForResponse(response);
      executed.push(nodeId);
      yield {
        kind: "node-finished",
        runId,
        nodeId,
        nodeIndex: sequenceIndex,
        actionName: node.actionName,
        toolName,
        result: resultPayload
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failed.push(nodeId);
      yield {
        kind: "node-failed",
        runId,
        nodeId,
        nodeIndex: sequenceIndex,
        actionName: node.actionName,
        toolName,
        error: message
      };

      if (!node.continueOnError) {
        break;
      }
    }
  }

  yield {
    kind: "workflow-finished",
    runId,
    graphId: graph.id,
    executed,
    skipped,
    failed,
    success: failed.length === 0
  };
}

export async function* executeWorkflow(
  graph: WorkflowGraph,
  service: WorkflowServiceTransport,
  sessionId: string
): AsyncGenerator<WorkflowEvent> {
  for (const event of executeWorkflowSync(graph, service, sessionId)) {
    yield event;
  }
}

export async function* executeWorkflowSse(
  graph: WorkflowGraph,
  service: WorkflowServiceTransport,
  sessionId: string
): AsyncGenerator<SseFrame> {
  let sequence = 0;
  const nodeRunByNodeId = new Map<string, string>();

  for await (const event of executeWorkflow(graph, service, sessionId)) {
    for (const frame of workflowEventToSseFrames(event, sequence, nodeRunByNodeId)) {
      yield frame;
      sequence += 1;
    }
  }
}

function workflowEventToSseFrames(
  event: WorkflowEvent,
  sequence: number,
  nodeRunByNodeId: Map<string, string>
): SseFrame[] {
  if (event.kind === "workflow-started") {
    return [];
  }

  if (event.kind === "workflow-finished") {
    const runId = event.runId;
    return [
      agUiEventToSseFrame(
        {
          type: "RunFinished",
          eventId: `${runId}.finished.${String(sequence).padStart(4, "0")}`,
          runId,
          timestamp: "2026-07-04T00:00:00.000Z",
          value: { runId }
        } satisfies AgUiEventLike,
        sequence
      )
    ];
  }

  const nodeRunId = nodeRunByNodeId.get(event.nodeId) ?? event.runId;

  if (event.kind === "node-started") {
    nodeRunByNodeId.set(event.nodeId, nodeRunId);
    return [
      agUiEventToSseFrame(
        {
          type: "RunStarted",
          eventId: `${nodeRunId}.started.${String(sequence).padStart(4, "0")}`,
          runId: nodeRunId,
          timestamp: "2026-07-04T00:00:00.000Z",
          value: { runId: nodeRunId }
        } satisfies AgUiEventLike,
        sequence
      ),
      agUiEventToSseFrame(
        {
          type: "ToolCall",
          eventId: `${nodeRunId}.call.${String(sequence + 1).padStart(4, "0")}`,
          runId: nodeRunId,
          timestamp: "2026-07-04T00:00:00.000Z",
          value: { toolName: event.toolName, args: event.args }
        } satisfies AgUiEventLike,
        sequence + 1
      )
    ];
  }

  if (event.kind === "node-skipped") {
    return [
      agUiEventToSseFrame(
        {
          type: "ToolResult",
          eventId: `${nodeRunId}.skip.${String(sequence).padStart(4, "0")}`,
          runId: nodeRunId,
          timestamp: "2026-07-04T00:00:00.000Z",
          value: { toolName: event.toolName, result: { skipped: true, reason: event.reason } }
        } satisfies AgUiEventLike,
        sequence
      ),
      agUiEventToSseFrame(
        {
          type: "RunFinished",
          eventId: `${nodeRunId}.finished.${String(sequence + 1).padStart(4, "0")}`,
          runId: nodeRunId,
          timestamp: "2026-07-04T00:00:00.000Z",
          value: { runId: nodeRunId }
        } satisfies AgUiEventLike,
        sequence + 1
      )
    ];
  }

  if (event.kind === "node-failed") {
    return [
      agUiEventToSseFrame(
        {
          type: "ToolResult",
          eventId: `${nodeRunId}.fail.${String(sequence).padStart(4, "0")}`,
          runId: nodeRunId,
          timestamp: "2026-07-04T00:00:00.000Z",
          value: { toolName: event.toolName, result: { error: event.error } }
        } satisfies AgUiEventLike,
        sequence
      ),
      agUiEventToSseFrame(
        {
          type: "RunFinished",
          eventId: `${nodeRunId}.finished.${String(sequence + 1).padStart(4, "0")}`,
          runId: nodeRunId,
          timestamp: "2026-07-04T00:00:00.000Z",
          value: { runId: nodeRunId }
        } satisfies AgUiEventLike,
        sequence + 1
      )
    ];
  }

  return [
    agUiEventToSseFrame(
      {
        type: "ToolResult",
        eventId: `${nodeRunId}.result.${String(sequence).padStart(4, "0")}`,
        runId: nodeRunId,
        timestamp: "2026-07-04T00:00:00.000Z",
        value: { toolName: event.toolName, result: event.result }
      } satisfies AgUiEventLike,
      sequence
    ),
    agUiEventToSseFrame(
      {
        type: "RunFinished",
        eventId: `${nodeRunId}.finished.${String(sequence + 1).padStart(4, "0")}`,
        runId: nodeRunId,
        timestamp: "2026-07-04T00:00:00.000Z",
        value: { runId: nodeRunId }
      } satisfies AgUiEventLike,
      sequence + 1
    )
  ];
}

function workflowRunId(): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `workflow.${stamp}.${rand}`;
}

function nodeById(graph: WorkflowGraph, nodeId: string): WorkflowNode | undefined {
  return graph.nodes.find((node) => node.id === nodeId);
}

function topologicalOrder(graph: WorkflowGraph): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const nodeIds = new Set(graph.nodes.map((node) => node.id));

  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const node of graph.nodes) {
    for (const dep of node.dependsOn) {
      if (!nodeIds.has(dep)) {
        throw new Error(`workflow node ${node.id} depends on unknown node ${dep}`);
      }
      const neighbors = adjacency.get(dep) ?? [];
      neighbors.push(node.id);
      adjacency.set(dep, neighbors);
      inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1);
    }
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      throw new Error(`workflow edge ${edge.from} -> ${edge.to} references unknown node`);
    }
  }

  const queue: string[] = [];
  for (const node of graph.nodes) {
    if ((inDegree.get(node.id) ?? 0) === 0) {
      queue.push(node.id);
    }
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) {
      break;
    }
    order.push(next);
    const neighbors = adjacency.get(next) ?? [];
    for (const neighbor of neighbors) {
      const remaining = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, remaining);
      if (remaining === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (order.length !== graph.nodes.length) {
    throw new Error("workflow graph contains a cycle");
  }

  return order;
}

function descendantsOf(graph: WorkflowGraph, nodeId: string): string[] {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }
  for (const node of graph.nodes) {
    for (const dep of node.dependsOn) {
      const parents = adjacency.get(dep) ?? [];
      parents.push(node.id);
      adjacency.set(dep, parents);
    }
  }

  const visited = new Set<string>();
  const stack: string[] = [nodeId];
  const descendants: string[] = [];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);
    if (current !== nodeId) {
      descendants.push(current);
    }
    for (const child of adjacency.get(current) ?? []) {
      if (!visited.has(child)) {
        stack.push(child);
      }
    }
  }

  descendants.reverse();
  return descendants;
}

function buildNodeRequestArgs(node: WorkflowNode, sessionId: string): Record<string, JsonValue> {
  const args: Record<string, JsonValue> = { ...node.payload };
  if (node.actionName !== "catalog" && node.actionName !== "reset" && !("sessionId" in args)) {
    args.sessionId = sessionId;
  }
  return args;
}

function toolNameForAction(actionName: BuilderServiceActionName): string {
  switch (actionName) {
    case "catalog":
      return "tool:list-builder-tools";
    case "assemble":
      return "tool:assemble-game";
    case "update":
      return "tool:update-game";
    case "preview":
      return "tool:preview-action";
    case "get-session":
      return "tool:get-session";
    case "export-profile":
      return "tool:export-profile";
    case "import-profile":
      return "tool:import-profile";
    case "reset":
      return "tool:reset";
    case "execute-workflow":
      return "tool:execute-workflow";
    case "request-paid-online-assembly":
      return "tool:request-paid-online-assembly";
  }
}

function responsePayloadForResponse(response: BuilderServiceResponse | Promise<BuilderServiceResponse>): JsonValue {
  if (isPromise(response)) {
    return { kind: "deferred", note: "async response payload not resolved" };
  }
  if (response.execution) {
    return {
      commandId: response.execution.result.commandId,
      sessionId: response.execution.result.sessionId,
      profileId: response.execution.result.preview.activeProfileId ?? null,
      events: response.execution.events.length
    };
  }
  if (response.catalog) {
    return { kind: "catalog", templates: response.catalog.templates.length };
  }
  if (response.session) {
    return { kind: "session", sessionId: response.session.sessionId };
  }
  if (response.profileExport) {
    return { kind: "profileExport", profileId: response.profileExport.profile.id };
  }
  if (response.reset) {
    return { kind: "reset", reset: true };
  }
  return { kind: "empty" };
}

function isPromise(value: unknown): value is Promise<BuilderServiceResponse> {
  return typeof value === "object" && value !== null && "then" in value && typeof (value as { then?: unknown }).then === "function";
}