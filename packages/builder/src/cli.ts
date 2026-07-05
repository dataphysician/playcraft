declare const process: { argv: string[]; exit(code?: number): never };

import {
  BuilderTemplateIdSchema,
  GameAssemblyProfileSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderCommand,
  type BuilderCommandResult,
  type BuilderTemplateId,
  type BuilderToolDefinition,
  type GameAssemblyProfile,
  type GameTemplateDefinition
} from "@playcraft/contracts";
import { BUILDER_SESSION_POLICY, createBuilderCommandHandler, type BuilderExecutionResult } from "./index.js";

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
    io.stderr("usage: playcraft-builder <assemble|update|preview|get-session|export-profile|import-profile|catalog|batch> [--template <template.id>] [--session <id>] [--profile-json <json>] [--json]");
    return 1;
  }

  try {
    const args = parseArgs(rest);
    const handler = createBuilderCommandHandler();

    if (commandName === "batch") {
      rejectProfileJson(args, commandName);
      const templateIds = handler.listTemplates().map((template) => BuilderTemplateIdSchema.parse(template.id));
      const outputs = handler.assembleTemplates(templateIds, args.sessionId ?? BUILDER_SESSION_POLICY.defaultBatchSessionId);
      writeResult(outputs, Boolean(args.json), io);
      return 0;
    }

    if (commandName === "catalog") {
      rejectProfileJson(args, commandName);
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
        writeCatalogSummary(handler.listTools(), handler.listTemplates(), io);
        return 0;
      }
      writeResult(result, Boolean(args.json), io);
      return 0;
    }

    const mappedName = builderActionForCliCommand(commandName);
    if (!mappedName) {
      io.stderr(`unknown command: ${commandName}`);
      return 1;
    }

    if (args.profileJson && mappedName !== "import-profile") {
      throw new Error(`${commandName} does not accept --profile-json`);
    }

    const sessionId = mappedName === "assemble-game"
      ? args.sessionId ?? BUILDER_SESSION_POLICY.defaultAssembleSessionId
      : requiredSessionId(args, commandName);
    const profile = mappedName === "import-profile" ? requiredProfileJson(args.profileJson) : undefined;
    const result = handler.execute({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-command.${sessionId}.${mappedName}`,
      version: "1.0.0",
      kind: "builder-command",
      sessionId,
      actionName: mappedName,
      templateId: args.template,
      profile,
      interaction: mappedName === "preview-action" ? { action: "primary" } : undefined
    });

    writeResult(result, Boolean(args.json), io);
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

interface BuilderCliArgs {
  template?: BuilderTemplateId;
  sessionId?: string;
  profileJson?: string;
  json?: boolean;
}

function parseArgs(argv: string[]): BuilderCliArgs {
  const output: BuilderCliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (entry === "--template") {
      output.template = BuilderTemplateIdSchema.parse(requiredFlagValue(argv, index, entry));
      index += 1;
    } else if (entry === "--session") {
      output.sessionId = requiredFlagValue(argv, index, entry);
      index += 1;
    } else if (entry === "--profile-json") {
      output.profileJson = requiredFlagValue(argv, index, entry);
      index += 1;
    } else if (entry === "--json") {
      output.json = true;
    } else {
      throw new Error(`unknown option: ${entry}`);
    }
  }

  return output;
}

function builderActionForCliCommand(commandName: string): BuilderCommand["actionName"] | undefined {
  switch (commandName) {
    case "assemble":
      return "assemble-game";
    case "update":
      return "update-game";
    case "preview":
      return "preview-action";
    case "get-session":
    case "export-profile":
    case "import-profile":
      return commandName;
    default:
      return undefined;
  }
}

function requiredSessionId(args: { sessionId?: string }, commandName: string): string {
  if (!args.sessionId) {
    throw new Error(`${commandName} requires --session`);
  }

  return args.sessionId;
}

function requiredProfileJson(value?: string): GameAssemblyProfile {
  if (!value) {
    throw new Error("import-profile requires --profile-json");
  }

  return GameAssemblyProfileSchema.parse(JSON.parse(value));
}

function rejectProfileJson(args: BuilderCliArgs, commandName: string): void {
  if (args.profileJson) {
    throw new Error(`${commandName} does not accept --profile-json`);
  }
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
  io: BuilderCliIo
): void {
  io.stdout("tools:");
  for (const tool of tools) {
    io.stdout(`- ${tool.displayName} [${tool.toolName} -> ${tool.actionName}] ${tool.argumentSummary}`);
  }

  io.stdout("templates:");
  for (const template of templates) {
    io.stdout(`- ${template.displayLabel} [${template.id}] try: ${template.exampleRequest}; aliases: ${template.requestAliasSummary}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runBuilderCli(process.argv.slice(2)));
}
