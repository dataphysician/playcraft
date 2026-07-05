import { describe, expect, it } from "vitest";
import {
  BuilderActionNameSchema,
  BuilderInputSourceSchema,
  BuilderServiceActionNameSchema,
  BuilderToolDefinitionSchema,
  McpManifestSchema,
  McpToolArgumentSchema,
  McpToolSchema,
  PLAYCRAFT_MCP_GUARDRAILS,
  PLAYCRAFT_SCHEMA_VERSION,
  StableIdSchema,
  VersionSchema,
  type BuilderServiceRequest,
  type BuilderToolDefinition,
  type JsonField,
  type JsonObjectSchemaDescriptor,
  type McpManifest,
  type McpTool,
  type McpToolArgument
} from "@playcraft/contracts";
import { builderToolDefinitions } from "@playcraft/builder";
import {
  createLocalPlaycraftService,
  type LocalPlaycraftService
} from "@playcraft/service";
import {
  adapterToolsToMcp,
  createMcpManifest,
  invokeMcpTool
} from "../src/index.js";

function acceptedInputSourcesFor(actionName: string): BuilderToolDefinition["acceptedInputSources"] {
  if (actionName === "assemble-game" || actionName === "update-game") {
    return [...BuilderInputSourceSchema.options];
  }
  return [];
}

function manualTool(overrides: Partial<BuilderToolDefinition>): BuilderToolDefinition {
  const actionName = overrides.actionName ?? "assemble-game";
  const schema: JsonObjectSchemaDescriptor = overrides.argumentsSchema ?? {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    type: "object",
    fields: {
      templateId: { type: "string", required: true }
    },
    allowUnknown: false
  };
  return BuilderToolDefinitionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: overrides.id ?? `builder-tool.${actionName}.manual`,
    version: overrides.version ?? "1.0.0",
    kind: "builder-tool",
    toolName: overrides.toolName ?? `tool:${actionName}`,
    displayName: overrides.displayName ?? "Manual Tool",
    description: overrides.description ?? "A manually constructed builder tool for tests.",
    actionName,
    argumentsSchema: schema,
    argumentSummary: overrides.argumentSummary ?? "args: templateId*:string",
    acceptedInputSources: overrides.acceptedInputSources ?? acceptedInputSourcesFor(actionName),
    inputSourceSummary: overrides.inputSourceSummary ?? (
      acceptedInputSourcesFor(actionName).length === 0 ? "input: none" : "input: Text, Transcript"
    ),
    localOnly: overrides.localOnly ?? true,
    emittedEvents: overrides.emittedEvents ?? ["builder:command"],
    requiredContracts: overrides.requiredContracts ?? ["BuilderCommandSchema"]
  });
}

function manualSchema(
  fields: Record<string, JsonField>,
  allowUnknown = false
): JsonObjectSchemaDescriptor {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    type: "object",
    fields,
    allowUnknown
  };
}

interface GuardrailsLike {
  allowlistedTools: readonly string[];
}

function manualGuardrails(overrides?: { allowlistedTools?: readonly string[] }): GuardrailsLike {
  return {
    allowlistedTools: overrides?.allowlistedTools ?? [...PLAYCRAFT_MCP_GUARDRAILS.allowlistedTools]
  };
}

const MCP_TOOL_NAMES = [
  "tool:assemble-game",
  "tool:update-game",
  "tool:preview-action",
  "tool:list-builder-tools",
  "tool:get-session",
  "tool:export-profile",
  "tool:import-profile"
] as const;

const BUILDER_TOOL_ACTION_NAMES = [...PLAYCRAFT_MCP_GUARDRAILS.allowlistedTools];

describe("MCP adapter", () => {
  it("exposes a manifest entry point that re-exports the adapter and tool call", () => {
    expect(typeof createMcpManifest).toBe("function");
    expect(typeof adapterToolsToMcp).toBe("function");
    expect(typeof invokeMcpTool).toBe("function");
  });

  it("translates every registered builder tool into a valid MCP tool", () => {
    const tools = adapterToolsToMcp(builderToolDefinitions);

    expect(tools).toHaveLength(builderToolDefinitions.length);
    expect(tools).toHaveLength(7);

    for (const tool of tools) {
      const parsed = McpToolSchema.parse(tool);
      expect(parsed.name).toMatch(/^tool:/u);
      expect(parsed.description.length).toBeGreaterThan(0);
      expect(Object.keys(parsed.parameters).length).toBeGreaterThan(0);
    }

    expect(tools.map((tool) => tool.name)).toEqual([...MCP_TOOL_NAMES]);
    expect(tools.map((tool) => tool.name)).toEqual([
      "tool:assemble-game",
      "tool:update-game",
      "tool:preview-action",
      "tool:list-builder-tools",
      "tool:get-session",
      "tool:export-profile",
      "tool:import-profile"
    ]);
  });

  it("emits one MCP tool argument per builder tool field with required/default enforcement", () => {
    const tools = adapterToolsToMcp(builderToolDefinitions);
    const assemble = tools.find((tool) => tool.name === "tool:assemble-game");

    expect(assemble).toBeDefined();
    expect(Object.keys(assemble!.parameters).sort()).toEqual([
      "assetEdit",
      "input",
      "sessionId",
      "templateId"
    ]);

    const templateId = assemble!.parameters.templateId;
    expect(McpToolArgumentSchema.parse(templateId)).toEqual({
      name: "templateId",
      type: "string",
      description: expect.any(String) as unknown as string,
      required: true
    });
    expect(templateId.required).toBe(true);

    const sessionId = assemble!.parameters.sessionId;
    expect(sessionId.required).toBe(false);
    expect(sessionId.type).toBe("string");

    const inputArg = assemble!.parameters.input;
    expect(inputArg.type).toBe("object");
    expect(inputArg.required).toBe(false);

    const exportProfile = tools.find((tool) => tool.name === "tool:export-profile");
    expect(exportProfile!.parameters.sessionId.required).toBe(true);
    expect(Object.keys(exportProfile!.parameters)).toEqual(["sessionId"]);

    const importProfile = tools.find((tool) => tool.name === "tool:import-profile");
    expect(importProfile!.parameters.profile.required).toBe(true);
    expect(importProfile!.parameters.profile.type).toBe("object");
    expect(importProfile!.parameters.sessionId.required).toBe(true);
  });

  it("preserves nested object schemas and allowedValues for preview-action", () => {
    const tools = adapterToolsToMcp(builderToolDefinitions);
    const preview = tools.find((tool) => tool.name === "tool:preview-action");

    expect(preview).toBeDefined();
    const interaction = preview!.parameters.interaction;
    expect(interaction.type).toBe("object");
    expect(interaction.required).toBe(true);
    expect(interaction.description).toContain("interaction");
  });

  it("filters out tools whose action names are not in a custom allowlist", () => {
    const customGuardrails = manualGuardrails({
      allowlistedTools: ["assemble-game", "preview-action"]
    });
    const tools = adapterToolsToMcp(builderToolDefinitions, customGuardrails);
    const toolNames = tools.map((tool) => tool.name);

    expect(toolNames).toContain("tool:assemble-game");
    expect(toolNames).toContain("tool:preview-action");
    expect(toolNames).not.toContain("tool:update-game");
    expect(toolNames).not.toContain("tool:get-session");
    expect(toolNames).not.toContain("tool:export-profile");
    expect(toolNames).not.toContain("tool:import-profile");
    expect(toolNames).not.toContain("tool:list-builder-tools");
    expect(tools).toHaveLength(2);
  });

  it("uses the manifest guardrails allowlist when none is supplied", () => {
    const tools = adapterToolsToMcp(builderToolDefinitions);
    expect(tools).toHaveLength(BUILDER_TOOL_ACTION_NAMES.length);
    for (const tool of tools) {
      expect(BUILDER_TOOL_ACTION_NAMES).toContain(tool.name.replace(/^tool:/u, ""));
    }
  });

  it("respects a custom allowlist that is a strict subset of the registered actions", () => {
    const customGuardrails = manualGuardrails({
      allowlistedTools: ["assemble-game", "preview-action", "get-session"]
    });
    const tools = adapterToolsToMcp(builderToolDefinitions, customGuardrails);
    expect(tools.map((tool) => tool.name)).toEqual([
      "tool:assemble-game",
      "tool:preview-action",
      "tool:get-session"
    ]);
  });

  it("creates a validated MCP manifest from builder tools and a service catalog reference", () => {
    const service = createLocalPlaycraftService();
    const manifestWithCatalog = createMcpManifest(builderToolDefinitions, service.catalog().service);
    const manifestWithoutCatalog = createMcpManifest(builderToolDefinitions);

    expect(manifestWithCatalog.id).not.toBe(manifestWithoutCatalog.id);
    expect(manifestWithCatalog.id).toContain("mcp-manifest.playcraft-local");
    expect(manifestWithCatalog.id).toContain("createlocalservicetransport");

    const parsed: McpManifest = McpManifestSchema.parse(manifestWithCatalog);
    expect(parsed.kind).toBe("mcp-manifest");
    expect(parsed.schemaVersion).toBe(PLAYCRAFT_SCHEMA_VERSION);
    expect(StableIdSchema.safeParse(parsed.id).success).toBe(true);
    expect(VersionSchema.safeParse(parsed.version).success).toBe(true);
    expect(parsed.name).toMatch(/playcraft/u);
    expect(parsed.tools).toHaveLength(7);
    expect(parsed.tools.map((tool) => tool.name)).toEqual([...MCP_TOOL_NAMES]);
  });

  it("invokes a builder action by name and returns a valid service response", async () => {
    const service = createLocalPlaycraftService();

    const response = await invokeMcpTool("assemble-game", { templateId: "template.memory-match" }, service);

    expect(response.kind).toBe("builder-service-response");
    expect(response.actionName).toBe("assemble");
    expect(response.requestId.startsWith("builder-service-request.mcp.")).toBe(true);
    expect(response.execution).toBeDefined();
    expect(response.session).toBeDefined();
    expect(response.execution?.result.profile?.id).toBe("profile.memory-match.mvp");
  });

  it("generates a session id when the caller does not provide one for non-assemble actions", async () => {
    const service = createLocalPlaycraftService();
    const first = await invokeMcpTool("get-session", {}, service);

    expect(first.kind).toBe("builder-service-response");
    expect(first.actionName).toBe("get-session");
    expect(first.session).toBeDefined();
    expect(first.session?.sessionId.startsWith("session.mcp.")).toBe(true);
  });

  it("uses the caller-provided session id when present in args", async () => {
    const service = createLocalPlaycraftService();

    const response = await invokeMcpTool(
      "get-session",
      { sessionId: "session.mcp.explicit" },
      service
    );

    expect(response.session?.sessionId).toBe("session.mcp.explicit");
  });

  it("routes each builder action name to the correct service action", async () => {
    const service = createLocalPlaycraftService();

    const assembleMain = await invokeMcpTool(
      "assemble-game",
      { templateId: "template.memory-match", sessionId: "session.mcp.route.main" },
      service
    );
    expect(assembleMain.actionName).toBe("assemble");
    expect(assembleMain.kind).toBe("builder-service-response");

    const exported = await invokeMcpTool(
      "export-profile",
      { sessionId: "session.mcp.route.main" },
      service
    );
    const profileExport = exported.profileExport;

    const cases: Array<{ action: string; serviceAction: string; args: Record<string, unknown> }> = [
      { action: "update-game", serviceAction: "update", args: { sessionId: "session.mcp.route.main", templateId: "template.memory-match", text: "Try with dinosaurs" } },
      { action: "preview-action", serviceAction: "preview", args: { sessionId: "session.mcp.route.main", interaction: { action: "primary" } } },
      { action: "list-builder-tools", serviceAction: "catalog", args: {} },
      { action: "get-session", serviceAction: "get-session", args: { sessionId: "session.mcp.route.main" } },
      { action: "import-profile", serviceAction: "import-profile", args: { sessionId: "session.mcp.route.import", profileExport } }
    ];

    for (const { action, serviceAction, args } of cases) {
      const response = await invokeMcpTool(action, args, service);
      expect(response.actionName, action).toBe(serviceAction);
      expect(response.kind).toBe("builder-service-response");
    }
  });

  it("rejects invocations against disallowed builder action names", async () => {
    const service = createLocalPlaycraftService();

    await expect(
      invokeMcpTool("rogue-action" as never, {}, service)
    ).rejects.toThrow(/unknown builder tool/u);
  });

  it("rejects invocations against unknown action names", async () => {
    const service = createLocalPlaycraftService();

    await expect(
      invokeMcpTool("not-a-builder-action" as never, {}, service)
    ).rejects.toThrow(/unknown builder tool/u);
  });

  it("always tags outgoing MCP service requests with the local guardrails schemaVersion and version", async () => {
    const service = createLocalPlaycraftService();
    let captured: BuilderServiceRequest | undefined;

    const observer: LocalPlaycraftService = new Proxy(service, {
      get(target, property, receiver) {
        if (property === "handle") {
          return (request: BuilderServiceRequest) => {
            captured = request;
            return target.handle(request);
          };
        }
        return Reflect.get(target, property, receiver);
      }
    });

    await invokeMcpTool("assemble-game", { templateId: "template.memory-match" }, observer);

    expect(captured).toBeDefined();
    expect(captured?.schemaVersion).toBe(PLAYCRAFT_SCHEMA_VERSION);
    expect(captured?.version).toBe("1.0.0");
    expect(captured?.kind).toBe("builder-service-request");
    expect(captured?.actionName).toBe("assemble");
    expect(captured?.id.startsWith("builder-service-request.mcp.")).toBe(true);
  });

  it("maps array fields to type=array with minItems preserved", () => {
    const tool = manualTool({
      id: "builder-tool.assemble-game.array-field",
      actionName: "assemble-game",
      argumentsSchema: manualSchema({
        items: { type: "array", required: true, minItems: 1 }
      })
    });

    const mapped = adapterToolsToMcp([tool])[0];
    expect(mapped.parameters.items.type).toBe("array");
    expect(mapped.parameters.items.required).toBe(true);
  });

  it("maps record fields to type=object and number/boolean fields correctly", () => {
    const tool = manualTool({
      id: "builder-tool.assemble-game.mixed-fields",
      actionName: "assemble-game",
      argumentsSchema: manualSchema({
        count: { type: "number", required: true },
        flag: { type: "boolean", required: false },
        meta: { type: "record", required: false }
      })
    });

    const mapped = adapterToolsToMcp([tool])[0];
    expect(mapped.parameters.count.type).toBe("number");
    expect(mapped.parameters.count.required).toBe(true);
    expect(mapped.parameters.flag.type).toBe("boolean");
    expect(mapped.parameters.flag.required).toBe(false);
    expect(mapped.parameters.meta.type).toBe("object");
  });

  it("does not mutate the input builder tool list", () => {
    const before = builderToolDefinitions.map((tool) => tool.id);
    adapterToolsToMcp(builderToolDefinitions);
    const after = builderToolDefinitions.map((tool) => tool.id);
    expect(after).toEqual(before);
  });

  it("creates a manifest whose tools match the filtered adapter output", () => {
    const tools = adapterToolsToMcp(builderToolDefinitions);
    const manifest = createMcpManifest(builderToolDefinitions);
    expect(manifest.tools.map((tool) => tool.name)).toEqual([...MCP_TOOL_NAMES]);
  });

  it("embeds the manifest name derived from the package identifier", () => {
    const tools = adapterToolsToMcp(builderToolDefinitions);
    const manifest = createMcpManifest(builderToolDefinitions);
    expect(manifest.name).toContain("playcraft");
    expect(manifest.name.toLowerCase()).toContain("local");
  });

  it("uses the manifest identifier prefix from the package identifier", () => {
    const tools = adapterToolsToMcp(builderToolDefinitions);
    const manifest = createMcpManifest(builderToolDefinitions);
    expect(manifest.id).toContain("mcp-manifest.playcraft-local");
    expect(manifest.version).toBe("1.0.0");
  });

  it("exposes PLAYCRAFT_MCP_GUARDRAILS references for downstream packages", () => {
    expect(PLAYCRAFT_MCP_GUARDRAILS.allowlistedTools).toEqual([
      "assemble-game",
      "update-game",
      "preview-action",
      "list-builder-tools",
      "get-session",
      "export-profile",
      "import-profile"
    ]);
    expect(PLAYCRAFT_MCP_GUARDRAILS.localOnly).toBe(true);
    expect(PLAYCRAFT_MCP_GUARDRAILS.noAuth).toBe(true);
    expect(PLAYCRAFT_MCP_GUARDRAILS.noNetworkExecution).toBe(true);
    expect(PLAYCRAFT_MCP_GUARDRAILS.noDatabaseAccess).toBe(true);
  });

  it("enforces strict subset validation on custom allowlists (drops tools not in the registered builder set)", () => {
    const customGuardrails = manualGuardrails({
      allowlistedTools: ["assemble-game", "unknown-tool"]
    });
    const tools = adapterToolsToMcp(builderToolDefinitions, customGuardrails);
    expect(tools.map((tool) => tool.name)).toEqual(["tool:assemble-game"]);
  });

  it("maps allowedValues through to MCP enum when present", () => {
    const tool = manualTool({
      id: "builder-tool.preview-action.enum-field",
      actionName: "preview-action",
      argumentsSchema: manualSchema({
        interaction: {
          type: "object",
          required: true,
          fields: {
            action: {
              type: "string",
              required: true,
              allowedValues: ["primary"]
            }
          }
        }
      })
    });

    const mapped = adapterToolsToMcp([tool])[0];
    expect(mapped.parameters.interaction.type).toBe("object");
    expect(mapped.parameters.interaction.required).toBe(true);
  });

  it("uses friendly descriptions for built-in builder tool fields", () => {
    const tools = adapterToolsToMcp(builderToolDefinitions);
    const assemble = tools.find((tool) => tool.name === "tool:assemble-game");

    expect(assemble!.parameters.templateId.description).toContain("template");
    expect(assemble!.parameters.sessionId.description.length).toBeGreaterThan(0);
    expect(assemble!.parameters.assetEdit.description).toContain("asset");
    expect(assemble!.parameters.input.description).toContain("input");
  });

  it("builds well-formed service requests for preview-action that include an interaction", async () => {
    const service = createLocalPlaycraftService();

    await invokeMcpTool(
      "assemble-game",
      { templateId: "template.memory-match", sessionId: "session.mcp.preview-build" },
      service
    );

    const previewResponse = await invokeMcpTool(
      "preview-action",
      {
        sessionId: "session.mcp.preview-build",
        interaction: { action: "primary" }
      },
      service
    );

    expect(previewResponse.actionName).toBe("preview");
    expect(previewResponse.execution).toBeDefined();
  });

  it("preserves BuilderActionNameSchema consistency between manifest tools and allowlisted actions", () => {
    const tools = adapterToolsToMcp(builderToolDefinitions);
    const manifest = createMcpManifest(builderToolDefinitions);

    for (const tool of manifest.tools) {
      const action = tool.name.replace(/^tool:/u, "");
      expect(BuilderActionNameSchema.options).toContain(action);
    }
  });

  it("enforces that the manifest's tools cover every allowlisted action exactly once", () => {
    const tools = adapterToolsToMcp(builderToolDefinitions);
    const manifest = createMcpManifest(builderToolDefinitions);

    const seenActionNames = new Set<string>();
    for (const tool of manifest.tools) {
      const actionName = tool.name.replace(/^tool:/u, "");
      expect(seenActionNames.has(actionName)).toBe(false);
      seenActionNames.add(actionName);
      expect(BUILDER_TOOL_ACTION_NAMES).toContain(actionName);
    }
    expect(seenActionNames.size).toBe(BUILDER_TOOL_ACTION_NAMES.length);
  });

  it("validates the manifest's tools can be parsed individually against McpToolSchema", () => {
    const tools = adapterToolsToMcp(builderToolDefinitions);
    const manifest = createMcpManifest(builderToolDefinitions);

    for (const tool of manifest.tools) {
      expect(() => McpToolSchema.parse(tool)).not.toThrow();
    }
  });

  it("preserves BuilderServiceActionNameSchema through the tool-call routing", async () => {
    const service = createLocalPlaycraftService();
    const response = await invokeMcpTool(
      "assemble-game",
      { templateId: "template.memory-match" },
      service
    );

    expect(BuilderServiceActionNameSchema.options).toContain(response.actionName);
  });

  it("returns a McpToolArgumentSchema-valid argument for every field of every tool", () => {
    const tools = adapterToolsToMcp(builderToolDefinitions);
    for (const tool of tools) {
      for (const [name, arg] of Object.entries(tool.parameters)) {
        const expected: McpToolArgument = McpToolArgumentSchema.parse({
          ...arg,
          name
        });
        expect(expected.name).toBe(name);
      }
    }
  });
});