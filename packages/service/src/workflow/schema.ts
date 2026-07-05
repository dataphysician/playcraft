export {
  WorkflowGraphSchema,
  WorkflowNodeSchema,
  WorkflowEdgeSchema,
  WorkflowConditionSchema,
  type WorkflowGraph,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowCondition
} from "@playcraft/contracts";

export const WORKFLOW_NODE_CAP = 20 as const;