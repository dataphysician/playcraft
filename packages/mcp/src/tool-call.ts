import {
  BuilderServiceActionNameSchema,
  BuilderServiceRequestSchema,
  PLAYCRAFT_MCP_GUARDRAILS,
  type BuilderServiceRequest,
  type BuilderServiceResponse,
  type BuilderToolDefinition
} from "@playcraft/contracts";
import { builderToolDefinitions } from "@playcraft/builder";
import type { LocalPlaycraftService } from "@playcraft/service";

const BUILDER_TOOL_BY_ACTION = new Map<string, BuilderToolDefinition>(
  builderToolDefinitions.map((tool) => [tool.actionName, tool])
);

const BUILDER_TO_SERVICE_ACTION = {
  "assemble-game": "assemble",
  "update-game": "update",
  "preview-action": "preview",
  "list-builder-tools": "catalog",
  "get-session": "get-session",
  "export-profile": "export-profile",
  "import-profile": "import-profile"
} as const satisfies Record<string, string>;

export interface InvokeMcpToolArgs {
  assetEdit?: unknown;
  input?: unknown;
  interaction?: unknown;
  profile?: unknown;
  profileExport?: unknown;
  sessionId?: string;
  templateId?: string;
  text?: string;
}

let counter = 0;

function nextRequestId(): string {
  counter += 1;
  return `builder-service-request.mcp.${Date.now().toString(36)}.${counter}`;
}

function generateSessionId(): string {
  counter += 1;
  return `session.mcp.${Date.now().toString(36)}.${counter}`;
}

function resolveSessionId(args: InvokeMcpToolArgs): string {
  if (typeof args.sessionId === "string" && args.sessionId.length > 0) {
    return args.sessionId;
  }

  return generateSessionId();
}

function exampleRequestFor(service: LocalPlaycraftService, templateId: string): string | undefined {
  try {
    const catalog = service.catalog();
    return catalog.templates.find((template) => template.id === templateId)?.exampleRequest;
  } catch {
    return undefined;
  }
}

function textForAssemble(
  service: LocalPlaycraftService,
  args: InvokeMcpToolArgs,
  templateId: string | undefined
): string {
  if (typeof args.text === "string" && args.text.length > 0) {
    return args.text;
  }

  if (typeof args.input === "string" && args.input.length > 0) {
    return args.input;
  }

  if (templateId) {
    const example = exampleRequestFor(service, templateId);
    if (example && example.length > 0) {
      return example;
    }
  }

  return "local assemble request";
}

export async function invokeMcpTool(
  name: string,
  args: InvokeMcpToolArgs,
  service: LocalPlaycraftService
): Promise<BuilderServiceResponse> {
  const tool = BUILDER_TOOL_BY_ACTION.get(name);
  if (!tool) {
    throw new Error(`MCP invocation rejected: unknown builder tool ${name}`);
  }

  if (!PLAYCRAFT_MCP_GUARDRAILS.allowlistedTools.includes(name)) {
    throw new Error(
      `MCP invocation rejected: tool ${name} is not in the PLAYCRAFT_MCP_GUARDRAILS allowlist`
    );
  }

  const serviceAction = BUILDER_TO_SERVICE_ACTION[name as keyof typeof BUILDER_TO_SERVICE_ACTION];
  if (!serviceAction) {
    throw new Error(`MCP invocation rejected: no service routing for ${name}`);
  }

  const candidateRequest = buildServiceRequest(tool, serviceAction, args, service);
  const request: BuilderServiceRequest = BuilderServiceRequestSchema.parse(candidateRequest);
  return Promise.resolve(service.handle(request));
}

function buildServiceRequest(
  tool: BuilderToolDefinition,
  serviceAction: string,
  args: InvokeMcpToolArgs,
  service: LocalPlaycraftService
): Record<string, unknown> {
  const baseRequest = {
    schemaVersion: "playcraft.v1" as const,
    id: nextRequestId(),
    version: "1.0.0",
    kind: "builder-service-request" as const,
    actionName: serviceAction
  };

  switch (tool.actionName) {
    case "assemble-game": {
      const templateId = typeof args.templateId === "string" ? args.templateId : undefined;
      return {
        ...baseRequest,
        actionName: "assemble",
        sessionId:
          typeof args.sessionId === "string" && args.sessionId.length > 0
            ? args.sessionId
            : undefined,
        templateId,
        text: textForAssemble(service, args, templateId),
        source: "text",
        assetEdit: args.assetEdit
      };
    }
    case "update-game": {
      const templateId = typeof args.templateId === "string" ? args.templateId : undefined;
      return {
        ...baseRequest,
        actionName: "update",
        sessionId: resolveSessionId(args),
        templateId,
        text: textForAssemble(service, args, templateId),
        source: "text",
        assetEdit: args.assetEdit
      };
    }
    case "preview-action":
      return {
        ...baseRequest,
        actionName: "preview",
        sessionId: resolveSessionId(args),
        interaction: args.interaction
      };
    case "list-builder-tools":
      return {
        ...baseRequest,
        actionName: "catalog"
      };
    case "get-session":
      return {
        ...baseRequest,
        actionName: "get-session",
        sessionId: resolveSessionId(args)
      };
    case "export-profile":
      return {
        ...baseRequest,
        actionName: "export-profile",
        sessionId: resolveSessionId(args)
      };
    case "import-profile":
      return {
        ...baseRequest,
        actionName: "import-profile",
        sessionId: resolveSessionId(args),
        profile: args.profile,
        profileExport: args.profileExport
      };
    default:
      throw new Error(`MCP invocation rejected: unsupported builder tool ${tool.actionName}`);
  }
}

void BuilderServiceActionNameSchema;