declare const process: { argv: string[]; exit(code?: number): never };

import {
  BuilderProfileExportSchema,
  BuilderServiceRequestSchema,
  BuilderTemplateIdSchema,
  GameAssemblyProfileSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderAssetEdit,
  type BuilderCatalog,
  type BuilderInputSource,
  type BuilderProfileExport,
  type BuilderServiceRequest,
  type BuilderServiceResponse,
  type BuilderTemplateId,
  type GameAssemblyProfile
} from "@playcraft/contracts";
import { createLocalPlaycraftService, createMoonshineTranscriptRecord } from "./index.js";

export interface LocalServiceCliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}

interface ParsedArgs {
  assetEdit?: BuilderAssetEdit;
  json?: boolean;
  profileExportJson?: string;
  profileJson?: string;
  requestJson?: string;
  sessionId?: string;
  source?: BuilderInputSource;
  templateId?: BuilderTemplateId;
  text?: string;
  transcriptText?: string;
}

const defaultIo: LocalServiceCliIo = {
  stdout: (message) => console.log(message),
  stderr: (message) => console.error(message)
};

export function runLocalServiceCli(argv: string[], io: LocalServiceCliIo = defaultIo): number {
  const [commandName, ...rest] = argv;
  if (!commandName) {
    io.stderr("usage: playcraft-service <catalog|assemble|update|preview|get-session|export-profile|import-profile|reset|request> [--text <request>] [--transcript <moonshine transcript>] [--source <text|speech-transcript>] [--session <id>] [--template <template-id>] [--asset-theme <theme>] [--asset-item <item>] [--profile-json <json>] [--profile-export-json <json>] [--request-json <json>] [--json]");
    return 1;
  }

  try {
    const args = parseArgs(rest);
    const service = createLocalPlaycraftService();

    if (commandName === "request") {
      const response = service.handle(parseServiceRequestJson(args.requestJson));
      writeServiceEnvelopeResponse(response, Boolean(args.json), io);
      return 0;
    }

    if (isCliCommand(commandName)) {
      if ((commandName === "preview" || commandName === "get-session" || commandName === "export-profile") && (args.text || args.transcriptText)) {
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
      output.text = requiredFlagValue(argv, index, entry);
      index += 1;
    } else if (entry === "--transcript") {
      output.transcriptText = requiredFlagValue(argv, index, entry);
      index += 1;
    } else if (entry === "--source") {
      output.source = parseSource(requiredFlagValue(argv, index, entry));
      index += 1;
    } else if (entry === "--session") {
      output.sessionId = requiredFlagValue(argv, index, entry);
      index += 1;
    } else if (entry === "--template") {
      output.templateId = BuilderTemplateIdSchema.parse(requiredFlagValue(argv, index, entry));
      index += 1;
    } else if (entry === "--asset-theme") {
      output.assetEdit = {
        ...output.assetEdit,
        theme: requiredFlagValue(argv, index, entry)
      };
      index += 1;
    } else if (entry === "--asset-item") {
      items.push(requiredFlagValue(argv, index, entry));
      index += 1;
    } else if (entry === "--request-json") {
      output.requestJson = requiredFlagValue(argv, index, entry);
      index += 1;
    } else if (entry === "--profile-json") {
      output.profileJson = requiredFlagValue(argv, index, entry);
      index += 1;
    } else if (entry === "--profile-export-json") {
      output.profileExportJson = requiredFlagValue(argv, index, entry);
      index += 1;
    } else if (entry === "--json") {
      output.json = true;
    } else {
      throw new Error(`unknown option: ${entry}`);
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

function requiredFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}

function parseSource(value: string): BuilderInputSource {
  if (value === "text") {
    return value;
  }

  if (value === "speech-transcript") {
    return value;
  }

  throw new Error(`unsupported input source: ${value}`);
}

function isCliCommand(commandName: string): commandName is CliCommand {
  return commandName === "catalog" ||
    commandName === "assemble" ||
    commandName === "update" ||
    commandName === "preview" ||
    commandName === "get-session" ||
    commandName === "export-profile" ||
    commandName === "import-profile" ||
    commandName === "reset";
}

function serviceRequest(commandName: CliCommand, args: ParsedArgs, idSuffix: string = commandName): BuilderServiceRequest {
  const transcriptText = args.transcriptText?.trim();
  const text = transcriptText || args.text?.trim();
  const inputCommand = commandName === "assemble" || commandName === "update";
  if (inputCommand && !text) {
    throw new Error("assemble, update, and preview-with-assemble require --text or --transcript");
  }
  if (inputCommand && args.source === "speech-transcript" && !transcriptText) {
    throw new Error("speech-transcript source requires --transcript so the CLI can send a Moonshine transcript record");
  }
  const profileExport = parseProfileExportJson(args.profileExportJson);
  const profile = parseProfileJson(args.profileJson);
  const request: BuilderServiceRequest = {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-service-request.cli.${idSuffix}`,
    version: "1.0.0",
    kind: "builder-service-request",
    actionName: commandName,
    sessionId: args.sessionId
  };

  if (inputCommand) {
    request.assetEdit = args.assetEdit;
    request.source = transcriptText ? "speech-transcript" : args.source ?? "text";
    request.speechTranscript = transcriptText
      ? createMoonshineTranscriptRecord({
          id: `moonshine-transcript.cli.${idSuffix}`,
          metadata: {
            origin: "playcraft-service-cli"
          },
          text: transcriptText
        })
      : undefined;
    request.templateId = args.templateId;
    request.text = text || undefined;
  }

  if (commandName === "import-profile") {
    if (args.templateId) {
      throw new Error("import-profile derives template identity from the profile; --template is only accepted by assemble and update");
    }
    request.assetEdit = args.assetEdit;
    request.profile = profile;
    request.profileExport = profileExport;
  }

  return request;
}

function parseProfileExportJson(value: string | undefined): BuilderProfileExport | undefined {
  return value ? BuilderProfileExportSchema.parse(JSON.parse(value)) : undefined;
}

function parseProfileJson(value: string | undefined): GameAssemblyProfile | undefined {
  return value ? GameAssemblyProfileSchema.parse(JSON.parse(value)) : undefined;
}

function parseServiceRequestJson(value: string | undefined): BuilderServiceRequest {
  if (!value) {
    throw new Error("request command requires --request-json");
  }

  return BuilderServiceRequestSchema.parse(JSON.parse(value));
}

function writeResponse(response: BuilderServiceResponse, json: boolean, io: LocalServiceCliIo): void {
  const payload = response.catalog ?? response.profileExport ?? response.execution ?? response.session ?? { reset: response.reset === true };

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

  if (response.profileExport) {
    io.stdout(`${response.profileExport.sessionId}: exported ${response.profileExport.profile.profileName}`);
    return;
  }

  if (response.session) {
    io.stdout(`${response.session.sessionId}: ${response.session.profile?.profileName ?? "empty session"}`);
    return;
  }

  io.stdout("reset: ok");
}

function writeServiceEnvelopeResponse(response: BuilderServiceResponse, json: boolean, io: LocalServiceCliIo): void {
  if (json) {
    io.stdout(JSON.stringify(response, null, 2));
    return;
  }

  writeResponse(response, false, io);
}

function writeCatalogSummary(catalog: BuilderCatalog, io: LocalServiceCliIo): void {
  io.stdout(`templates: ${catalog.templates.map((template) => template.id).join(", ")}`);
  io.stdout(`tools: ${catalog.tools.map((tool) => tool.toolName).join(", ")}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runLocalServiceCli(process.argv.slice(2)));
}
