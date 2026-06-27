import { PLAYCRAFT_SCHEMA_VERSION } from "@playcraft/contracts";
import { createBuilderCommandHandler, type BuilderExecutionResult } from "./index.js";

export interface BuilderCliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}

export function runBuilderCli(argv: string[], io: BuilderCliIo = console): number {
  const [commandName, ...rest] = argv;
  if (!commandName) {
    io.stderr("usage: playcraft-builder <build|update|preview|batch> [--profile <preset>] [--session <id>] [--json]");
    return 1;
  }

  const args = parseArgs(rest);
  const handler = createBuilderCommandHandler();

  try {
    if (commandName === "batch") {
      const outputs = handler.buildProfiles(["profile-a", "profile-b"], args.sessionId ?? "builder.batch");
      writeResult(outputs, Boolean(args.json), io);
      return 0;
    }

    const mappedName = commandName === "build" ? "build-profile" : commandName === "update" ? "update-profile" : commandName === "preview" ? "preview-action" : undefined;
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
      commandName: mappedName,
      preset: args.profile,
      interaction: mappedName === "preview-action" ? { action: "primary" } : undefined
    });

    writeResult(result, Boolean(args.json), io);
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function parseArgs(argv: string[]): { profile?: "profile-a" | "profile-b" | "memory-match" | "sorting" | "sequence-repeat"; sessionId?: string; json?: boolean } {
  const output: { profile?: "profile-a" | "profile-b" | "memory-match" | "sorting" | "sequence-repeat"; sessionId?: string; json?: boolean } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (entry === "--profile") {
      output.profile = argv[index + 1] as typeof output.profile;
      index += 1;
    } else if (entry === "--session") {
      output.sessionId = argv[index + 1];
      index += 1;
    } else if (entry === "--json") {
      output.json = true;
    }
  }

  return output;
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
