import { z } from "zod";
import {
  StableIdSchema,
  BuilderServiceActionNameSchema,
  JsonValueSchema,
  PublicContractBaseSchema
} from "./base.js";
import { WorkflowConditionSchema } from "./condition.js";

export const WorkflowEdgeSchema: z.ZodType<{
  from: string;
  to: string;
}> = z.lazy(() =>
  z
    .object({
      from: StableIdSchema,
      to: StableIdSchema
    })
    .strict()
);
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;

type WorkflowNodeShape = {
  id: string;
  actionName: z.infer<typeof BuilderServiceActionNameSchema>;
  payload: Record<string, z.infer<typeof JsonValueSchema>>;
  dependsOn: string[];
  condition?: z.infer<typeof WorkflowConditionSchema>;
  parallel: boolean;
  cascade: boolean;
  continueOnError: boolean;
};

type WorkflowNodeInputShape = {
  id: string;
  actionName: z.infer<typeof BuilderServiceActionNameSchema>;
  payload?: Record<string, z.infer<typeof JsonValueSchema>>;
  dependsOn?: string[];
  condition?: string | z.infer<typeof WorkflowConditionSchema>;
  parallel?: boolean;
  cascade?: boolean;
  continueOnError?: boolean;
};

export const WorkflowNodeSchema: z.ZodType<
  WorkflowNodeShape,
  z.ZodTypeDef,
  WorkflowNodeInputShape
> = z.lazy(() =>
  z
    .object({
      id: StableIdSchema,
      actionName: BuilderServiceActionNameSchema,
      payload: z.record(JsonValueSchema).default({}),
      dependsOn: z.array(StableIdSchema).default([]),
      condition: WorkflowConditionSchema.optional(),
      parallel: z.boolean().default(false),
      cascade: z.boolean().default(true),
      continueOnError: z.boolean().default(false)
    })
    .strict()
);
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

export const WorkflowGraphSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("workflow-graph"),
    nodes: z.array(WorkflowNodeSchema).min(1).max(20),
    edges: z.array(WorkflowEdgeSchema).min(1),
    startNodeId: StableIdSchema
  })
    .strict()
    .superRefine((value, context) => {
      const nodeIds = new Set(value.nodes.map((node) => node.id));
      if (!nodeIds.has(value.startNodeId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "workflow graph startNodeId must reference an existing node",
          path: ["startNodeId"]
        });
      }

      for (const edge of value.edges) {
        if (!nodeIds.has(edge.from)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `workflow edge from ${edge.from} must reference an existing node`,
            path: ["edges"]
          });
        }
        if (!nodeIds.has(edge.to)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `workflow edge to ${edge.to} must reference an existing node`,
            path: ["edges"]
          });
        }
      }

      const adjacencyList = new Map<string, string[]>();
      for (const node of value.nodes) {
        adjacencyList.set(node.id, []);
      }
      for (const edge of value.edges) {
        const neighbors = adjacencyList.get(edge.from) || [];
        neighbors.push(edge.to);
        adjacencyList.set(edge.from, neighbors);
      }

      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      function hasCycle(nodeId: string): boolean {
        visited.add(nodeId);
        recursionStack.add(nodeId);

        const neighbors = adjacencyList.get(nodeId) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (hasCycle(neighbor)) {
              return true;
            }
          } else if (recursionStack.has(neighbor)) {
            return true;
          }
        }

        recursionStack.delete(nodeId);
        return false;
      }

      for (const node of value.nodes) {
        if (!visited.has(node.id)) {
          if (hasCycle(node.id)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "workflow graph contains a cycle",
              path: ["nodes"]
            });
            return;
          }
        }
      }
    })
);
export type WorkflowGraph = z.infer<typeof WorkflowGraphSchema>;
