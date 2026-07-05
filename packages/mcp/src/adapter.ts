import {
  McpToolArgumentSchema,
  McpToolSchema,
  PLAYCRAFT_MCP_GUARDRAILS,
  type BuilderToolDefinition,
  type JsonField,
  type JsonObjectSchemaDescriptor,
  type McpServerPolicy,
  type McpTool,
  type McpToolArgument
} from "@playcraft/contracts";

export interface AdapterMcpGuardrails {
  allowlistedTools: readonly string[];
}

const FIELD_DESCRIPTIONS: Record<string, string> = {
  assetEdit: "Optional asset edit payload that swaps the active theme or items.",
  input: "Optional input request payload (text or Moonshine transcript).",
  interaction: "Required preview interaction payload.",
  profile: "Required validated profile payload for import.",
  sessionId: "Optional stable session id; auto-generated when omitted.",
  templateId: "Required game template id (for example template.memory-match)."
};

export function adapterToolsToMcp(
  tools: readonly BuilderToolDefinition[],
  guardrails: AdapterMcpGuardrails | McpServerPolicy = PLAYCRAFT_MCP_GUARDRAILS
): McpTool[] {
  const allowlistedTools = new Set<string>(guardrails.allowlistedTools);

  return tools
    .filter((tool) => allowlistedTools.has(tool.actionName))
    .map((tool) => builderToolToMcpTool(tool));
}

function builderToolToMcpTool(tool: BuilderToolDefinition): McpTool {
  const parameters: Record<string, McpToolArgument> = {};

  for (const [fieldName, field] of Object.entries(tool.argumentsSchema.fields)) {
    parameters[fieldName] = McpToolArgumentSchema.parse({
      name: fieldName,
      type: mapJsonFieldType(field),
      description: describeField(tool.actionName, fieldName, field),
      required: field.required !== false,
      ...(field.allowedValues ? { enum: field.allowedValues } : {})
    });
  }

  return McpToolSchema.parse({
    name: tool.toolName,
    description: tool.description,
    parameters
  });
}

function mapJsonFieldType(field: JsonField): string {
  if (field.type === "array") {
    return "array";
  }

  if (field.type === "record") {
    return "object";
  }

  return field.type;
}

function describeField(
  actionName: string,
  fieldName: string,
  field: JsonField
): string {
  const friendly = FIELD_DESCRIPTIONS[fieldName];
  if (friendly) {
    return `${actionName} argument: ${friendly}`;
  }

  if (field.allowedValues && field.allowedValues.length > 0) {
    return `${actionName} argument ${fieldName} (allowed: ${field.allowedValues.join(", ")})`;
  }

  if (field.fields) {
    return `${actionName} argument ${fieldName} of type object`;
  }

  return `${actionName} argument ${fieldName} of type ${field.type}`;
}

export type { JsonObjectSchemaDescriptor };