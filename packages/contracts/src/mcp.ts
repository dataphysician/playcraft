import { z } from "zod";
import {
  PublicContractBaseSchema,
  BuilderActionNameSchema
} from "./base.js";

export const McpToolArgumentSchema = z
  .object({
    name: z.string().min(1),
    type: z.string().min(1),
    description: z.string().min(1),
    required: z.boolean().default(false),
    enum: z.array(z.unknown()).optional()
  })
  .strict();
export type McpToolArgument = z.infer<typeof McpToolArgumentSchema>;

export const McpToolSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    parameters: z.record(McpToolArgumentSchema)
  })
  .strict();
export type McpTool = z.infer<typeof McpToolSchema>;

export const McpManifestSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("mcp-manifest"),
    name: z.string().min(1),
    tools: z.array(McpToolSchema).min(1)
  }).strict()
);
export type McpManifest = z.infer<typeof McpManifestSchema>;

export const McpServerPolicySchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("mcp-server-policy"),
    localOnly: z.literal(true),
    noAuth: z.literal(true),
    noNetworkExecution: z.literal(true),
    noDatabaseAccess: z.literal(true),
    allowlistedTools: z.array(z.string().min(1)).min(1)
  })
    .strict()
    .superRefine((value, context) => {
      const allowedActionNames = new Set<z.infer<typeof BuilderActionNameSchema>>(BuilderActionNameSchema.options);
      for (const tool of value.allowlistedTools) {
        if (!allowedActionNames.has(tool as z.infer<typeof BuilderActionNameSchema>)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `allowlisted tool ${tool} must be a registered builder action name`,
            path: ["allowlistedTools"]
          });
        }
      }
    })
);
export type McpServerPolicy = z.infer<typeof McpServerPolicySchema>;
