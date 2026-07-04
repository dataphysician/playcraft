declare const process: { argv: string[]; exit(code?: number): never };

import type { BuilderAssetEdit, BuilderCatalog, BuilderInputSource, BuilderTemplateId } from "@playcraft/contracts";
import { createLocalPlaycraftService, type LocalBuilderInput } from "./index.js";
import type { BuilderExecutionResult } from "@playcraft/builder";

export interface LocalServiceCliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}

interface ParsedArgs {
  assetEdit?: BuilderAssetEdit;
  json?: boolean;
  sessionId?: string;
  source?: BuilderInputSource;
  templateId?: BuilderTemplateId;
  text?: string;
}

const defaultIo: LocalServiceCliIo = {
  stdout: (message) => console.log(message),
  stderr: (message) => console.error(message)
};

export function runLocalServiceCli(argv: string[], io: LocalServiceCliIo = defaultIo): number {
  const [commandName, ...rest] = argv;
  if (!commandName) {
    io.stderr("usage: playcraft-service <catalog|assemble|update|preview> [--text <request>] [--source <text|speech-transcript>] [--session <id>] [--asset-theme <theme>] [--asset-item <item>] [--json]");
    return 1;
  }

  const args = parseArgs(rest);
  const service = createLocalPlaycraftService();

  try {
    if (commandName === "catalog") {
      writeResult(service.catalog(), Boolean(args.json), io);
      return 0;
    }

    if (commandName === "assemble") {
      const result = service.assemble(toLocalInput(args));
      writeResult(result, Boolean(args.json), io);
      return 0;
    }

    if (commandName === "update") {
      const result = service.update({
        ...toLocalInput(args),
        sessionId: args.sessionId ?? "service.cli"
      });
      writeResult(result, Boolean(args.json), io);
      return 0;
    }

    if (commandName === "preview") {
      if (args.text) {
        service.assemble(toLocalInput(args));
      }
      const result = service.preview(args.sessionId ?? "service.cli");
      writeResult(result, Boolean(args.json), io);
      return 0;
    }

    io.stderr(`unknown command: ${commandName}`);
    return 1;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const items: string[] = [];
  const output: ParsedArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (entry === "--text") {
      output.text = argv[index + 1];
      index += 1;
    } else if (entry === "--source") {
      output.source = parseSource(argv[index + 1]);
      index += 1;
    } else if (entry === "--session") {
      output.sessionId = argv[index + 1];
      index += 1;
    } else if (entry === "--template") {
      output.templateId = argv[index + 1] as BuilderTemplateId;
      index += 1;
    } else if (entry === "--asset-theme") {
      output.assetEdit = {
        ...output.assetEdit,
        theme: argv[index + 1]
      };
      index += 1;
    } else if (entry === "--asset-item") {
      items.push(argv[index + 1]);
      index += 1;
    } else if (entry === "--json") {
      output.json = true;
    }
  }

  if (items.length > 0) {
    output.assetEdit = {
      ...output.assetEdit,
      items
    };
  }

  return output;
}

function parseSource(value: string | undefined): BuilderInputSource {
  if (value === "speech-transcript") {
    return value;
  }

  return "text";
}

function toLocalInput(args: ParsedArgs): LocalBuilderInput {
  const text = args.text?.trim();
  if (!text) {
    throw new Error("assemble, update, and preview-with-assemble require --text");
  }

  return {
    assetEdit: args.assetEdit,
    sessionId: args.sessionId,
    source: args.source ?? "text",
    templateId: args.templateId,
    text
  };
}

function writeResult(result: BuilderCatalog | BuilderExecutionResult, json: boolean, io: LocalServiceCliIo): void {
  if (json) {
    io.stdout(JSON.stringify(result, null, 2));
    return;
  }

  if ("templates" in result) {
    io.stdout(`templates: ${result.templates.map((template) => template.id).join(", ")}`);
    io.stdout(`tools: ${result.tools.map((tool) => tool.toolName).join(", ")}`);
    return;
  }

  io.stdout(`${result.result.sessionId}: ${result.result.profile?.profileName ?? "preview"}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runLocalServiceCli(process.argv.slice(2)));
}
