import {
  McpManifestSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderServiceCatalog,
  type BuilderToolDefinition,
  type McpManifest,
  type McpTool
} from "@playcraft/contracts";
import { adapterToolsToMcp } from "./adapter.js";

export function createMcpManifest(
  builderTools: readonly BuilderToolDefinition[],
  serviceCatalog?: BuilderServiceCatalog
): McpManifest {
  const mcpTools: McpTool[] = adapterToolsToMcp(builderTools);

  const serviceActionCount = serviceCatalog ? serviceCatalog.actions.length : 0;
  const localTransport = (serviceCatalog?.transports.local ?? "createLocalServiceTransport").toLowerCase();

  return McpManifestSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `mcp-manifest.playcraft-local.${serviceActionCount}-actions.${localTransport}`,
    version: "1.0.0",
    kind: "mcp-manifest",
    name: "playcraft-local-mcp",
    tools: mcpTools
  });
}

export { adapterToolsToMcp } from "./adapter.js";
export type { AdapterMcpGuardrails } from "./adapter.js";
export { invokeMcpTool } from "./tool-call.js";
export type { InvokeMcpToolArgs } from "./tool-call.js";
export type { McpServiceFacade } from "./facade.js";

export {
  PLAYCRAFT_MCP_GUARDRAILS,
  McpManifestSchema,
  McpToolSchema,
  McpToolArgumentSchema
} from "@playcraft/contracts";

export type {
  BuilderToolDefinition,
  McpManifest,
  McpTool,
  McpToolArgument,
  McpServerPolicy
} from "@playcraft/contracts";