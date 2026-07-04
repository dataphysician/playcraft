declare const process: { argv: string[]; exit(code?: number): never };

import {
  BuilderTemplateIdSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderCommandResult,
  type BuilderTemplateId,
  type BuilderToolDefinition,
  type BuilderToolPresentation,
  type GameTemplateDefinition,
  type JsonObjectSchemaDescriptor
} from "@playcraft/contracts";
import { BUILDER_SESSION_POLICY, BUILDER_TOOL_PRESENTATION_POLICY, createBuilderCommandHandler, type BuilderExecutionResult } from "./index.js";

export interface BuilderCliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}

const defaultIo: BuilderCliIo = {
  stdout: (message) => console.log(message),
  stderr: (message) => console.error(message)
};

export function runBuilderCli(argv: string[], io: BuilderCliIo = defaultIo): number {
  const [commandName, ...rest] = argv;
  if (!commandName) {
    io.stderr("usage: playcraft-builder <assemble|update|preview|catalog|batch> [--template <template.id>] [--session <id>] [--json]");
    return 1;
  }

  try {
    const args = parseArgs(rest);
    const handler = createBuilderCommandHandler();

    if (commandName === "batch") {
      const templateIds = handler.listTemplates().map((template) => BuilderTemplateIdSchema.parse(template.id));
      const outputs = handler.assembleTemplates(templateIds, args.sessionId ?? BUILDER_SESSION_POLICY.defaultBatchSessionId);
      writeResult(outputs, Boolean(args.json), io);
      return 0;
    }

    if (commandName === "catalog") {
      const sessionId = args.sessionId ?? BUILDER_SESSION_POLICY.defaultCatalogSessionId;
      const result = handler.execute({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: `builder-command.${sessionId}.catalog`,
        version: "1.0.0",
        kind: "builder-command",
        sessionId,
        actionName: "list-builder-tools"
      });
      if (!args.json) {
        writeCatalogSummary(handler.listTools(), handler.listTemplates(), BUILDER_TOOL_PRESENTATION_POLICY, io);
        return 0;
      }
      writeResult(result, Boolean(args.json), io);
      return 0;
    }

    const mappedName = commandName === "assemble" ? "assemble-game" : commandName === "update" ? "update-game" : commandName === "preview" ? "preview-action" : undefined;
    if (!mappedName) {
      io.stderr(`unknown command: ${commandName}`);
      return 1;
    }

    const sessionId = mappedName === "assemble-game"
      ? args.sessionId ?? BUILDER_SESSION_POLICY.defaultAssembleSessionId
      : requiredSessionId(args, commandName);
    const result = handler.execute({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-command.${sessionId}.${mappedName}`,
      version: "1.0.0",
      kind: "builder-command",
      sessionId,
      actionName: mappedName,
      templateId: args.template,
      interaction: mappedName === "preview-action" ? { action: "primary" } : undefined
    });

    writeResult(result, Boolean(args.json), io);
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function parseArgs(argv: string[]): { template?: BuilderTemplateId; sessionId?: string; json?: boolean } {
  const output: { template?: BuilderTemplateId; sessionId?: string; json?: boolean } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (entry === "--template") {
      output.template = BuilderTemplateIdSchema.parse(requiredFlagValue(argv, index, entry));
      index += 1;
    } else if (entry === "--session") {
      output.sessionId = requiredFlagValue(argv, index, entry);
      index += 1;
    } else if (entry === "--json") {
      output.json = true;
    } else {
      throw new Error(`unknown option: ${entry}`);
    }
  }

  return output;
}

function requiredSessionId(args: { sessionId?: string }, commandName: string): string {
  if (!args.sessionId) {
    throw new Error(`${commandName} requires --session`);
  }

  return args.sessionId;
}

function requiredFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}

function writeResult(result: BuilderExecutionResult | BuilderExecutionResult[], json: boolean, io: BuilderCliIo): void {
  if (json) {
    io.stdout(JSON.stringify(result, null, 2));
    return;
  }

  const outputs = Array.isArray(result) ? result : [result];
  for (const entry of outputs) {
    io.stdout(builderExecutionSummary(entry.result));
  }
}

function builderExecutionSummary(result: BuilderCommandResult): string {
  if (result.profile) {
    return `${result.sessionId}: ${result.profile.profileName}`;
  }

  return `${result.sessionId}: preview ${result.preview.activeComponentId} interaction ${result.preview.interactionCount}`;
}

function writeCatalogSummary(
  tools: BuilderToolDefinition[],
  templates: GameTemplateDefinition[],
  presentation: BuilderToolPresentation,
  io: BuilderCliIo
): void {
  io.stdout("tools:");
  for (const tool of tools) {
    io.stdout(`- ${tool.displayName} [${tool.toolName} -> ${tool.actionName}] ${toolArgumentsSummary(tool.argumentsSchema, presentation)}`);
  }

  io.stdout("templates:");
  for (const template of templates) {
    io.stdout(`- ${template.displayLabel} [${template.id}] try: ${template.exampleRequest}; aliases: ${template.requestAliases.slice(0, 3).join(", ")}`);
  }
}

function toolArgumentsSummary(schema: JsonObjectSchemaDescriptor, presentation: BuilderToolPresentation): string {
  const summary = Object.entries(schema.fields).map(([name, field]) => `${name}${field.required ? "*" : ""}:${field.type}`);
  return `${presentation.argumentsPrefix}: ${summary.length > 0 ? summary.join(", ") : presentation.noArgumentsLabel}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runBuilderCli(process.argv.slice(2)));
}
