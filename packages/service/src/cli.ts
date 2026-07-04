declare const process: { argv: string[]; exit(code?: number): never };

import {
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderAssetEdit,
  type BuilderCatalog,
  type BuilderInputSource,
  type BuilderServiceRequest,
  type BuilderServiceResponse,
  type BuilderTemplateId
} from "@playcraft/contracts";
import { createLocalPlaycraftService } from "./index.js";

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
    io.stderr("usage: playcraft-service <catalog|assemble|update|preview|reset> [--text <request>] [--source <text|speech-transcript>] [--session <id>] [--asset-theme <theme>] [--asset-item <item>] [--json]");
    return 1;
  }

  const args = parseArgs(rest);
  const service = createLocalPlaycraftService();

  try {
    if (isCliCommand(commandName)) {
      if (commandName === "preview" && args.text) {
        service.handle(serviceRequest("assemble", args, "service.cli.preview.seed"));
      }
      const response = service.handle(serviceRequest(commandName, args));
      writeResponse(response, Boolean(args.json), io);
      return 0;
    }

    io.stderr(`unknown command: ${commandName}`);
    return 1;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

type CliCommand = BuilderServiceRequest["actionName"];

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

function isCliCommand(commandName: string): commandName is CliCommand {
  return commandName === "catalog" || commandName === "assemble" || commandName === "update" || commandName === "preview" || commandName === "reset";
}

function serviceRequest(commandName: CliCommand, args: ParsedArgs, idSuffix: string = commandName): BuilderServiceRequest {
  const text = args.text?.trim();
  if ((commandName === "assemble" || commandName === "update") && !text) {
    throw new Error("assemble, update, and preview-with-assemble require --text");
  }

  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-service-request.cli.${idSuffix}`,
    version: "1.0.0",
    kind: "builder-service-request",
    actionName: commandName,
    assetEdit: args.assetEdit,
    sessionId: args.sessionId,
    source: args.source ?? "text",
    templateId: args.templateId,
    text: text || undefined
  };
}

function writeResponse(response: BuilderServiceResponse, json: boolean, io: LocalServiceCliIo): void {
  const payload = response.catalog ?? response.execution ?? { reset: response.reset === true };

  if (json) {
    io.stdout(JSON.stringify(payload, null, 2));
    return;
  }

  if (response.catalog) {
    writeCatalogSummary(response.catalog, io);
    return;
  }

  if (response.execution) {
    io.stdout(`${response.execution.result.sessionId}: ${response.execution.result.profile?.profileName ?? "preview"}`);
    return;
  }

  io.stdout("reset: ok");
}

function writeCatalogSummary(catalog: BuilderCatalog, io: LocalServiceCliIo): void {
  io.stdout(`templates: ${catalog.templates.map((template) => template.id).join(", ")}`);
  io.stdout(`tools: ${catalog.tools.map((tool) => tool.toolName).join(", ")}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runLocalServiceCli(process.argv.slice(2)));
}
