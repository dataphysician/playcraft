declare const process: { argv: string[]; exit(code?: number): never };

import { BuilderTemplateIdSchema, PLAYCRAFT_SCHEMA_VERSION, type BuilderTemplateId } from "@playcraft/contracts";
import { createBuilderCommandHandler, type BuilderExecutionResult } from "./index.js";

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
      const outputs = handler.assembleTemplates(templateIds, args.sessionId ?? "builder.batch");
      writeResult(outputs, Boolean(args.json), io);
      return 0;
    }

    if (commandName === "catalog") {
      const result = handler.execute({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: `builder-command.${args.sessionId ?? "cli"}.catalog`,
        version: "1.0.0",
        kind: "builder-command",
        sessionId: args.sessionId ?? "builder.cli",
        actionName: "list-builder-tools"
      });
      writeResult(result, Boolean(args.json), io);
      return 0;
    }

    const mappedName = commandName === "assemble" ? "assemble-game" : commandName === "update" ? "update-game" : commandName === "preview" ? "preview-action" : undefined;
    if (!mappedName) {
      io.stderr(`unknown command: ${commandName}`);
      return 1;
    }

    const result = handler.execute({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-command.${args.sessionId ?? "cli"}.${mappedName}`,
      version: "1.0.0",
      kind: "builder-command",
      sessionId: args.sessionId ?? "builder.cli",
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
    io.stdout(`${entry.result.sessionId}: ${entry.result.profile?.profileName ?? "preview"}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runBuilderCli(process.argv.slice(2)));
}
