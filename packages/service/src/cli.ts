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
  type BuilderInputSourceOption,
  type BuilderProfileExport,
  type BuilderServiceExecution,
  type BuilderServiceRequest,
  type BuilderServiceResponse,
  type BuilderTemplateId,
  type GameAssemblyProfile,
  type JsonObjectSchemaDescriptor
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
    io.stderr("usage: playcraft-service <catalog|assemble|update|preview|get-session|export-profile|import-profile|reset|request> [--text <request>] [--transcript <moonshine transcript>] [--source <text|moonshine-transcript>] [--session <id>] [--template <template-id>] [--asset-theme <theme>] [--asset-item <item>] [--profile-json <json>] [--profile-export-json <json>] [--request-json <json>] [--json]");
    return 1;
  }

  try {
    const args = parseArgs(rest);
    const service = createLocalPlaycraftService();
    const catalog = service.catalog();

    if (commandName === "request") {
      const response = service.handle(parseServiceRequestJson(args.requestJson));
      writeServiceEnvelopeResponse(response, Boolean(args.json), io);
      return 0;
    }

    if (isCliCommand(commandName)) {
      const response = service.handle(serviceRequest(commandName, args, catalog));
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

  if (value === "moonshine-transcript") {
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

function serviceRequest(
  commandName: CliCommand,
  args: ParsedArgs,
  catalog: BuilderCatalog,
  idSuffix: string = commandName
): BuilderServiceRequest {
  const transcriptText = args.transcriptText?.trim();
  const text = transcriptText || args.text?.trim();
  const inputCommand = commandName === "assemble" || commandName === "update";
  if (!inputCommand && (text || args.source)) {
    throw new Error(`${commandName} does not accept input flags; call assemble or update first, then pass --session`);
  }
  if (!inputCommand && commandName !== "import-profile" && args.assetEdit) {
    throw new Error(`${commandName} does not accept asset edit flags; call assemble, update, or import-profile`);
  }
  if (inputCommand && !text) {
    throw new Error("assemble and update require --text or --transcript");
  }
  if (inputCommand && args.source === "moonshine-transcript" && !transcriptText) {
    throw new Error("moonshine-transcript source requires --transcript so the CLI can send a Moonshine transcript record");
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
    request.source = transcriptText ? catalog.input.transcriptSource : args.source ?? catalog.input.defaultSource;
    request.moonshineTranscript = transcriptText
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
  if (json) {
    io.stdout(JSON.stringify(payloadForResponse(response), null, 2));
    return;
  }

  if (response.actionName === "catalog" && response.catalog) {
    writeCatalogSummary(response.catalog, io);
    return;
  }

  if (["assemble", "update", "preview", "import-profile"].includes(response.actionName) && response.execution) {
    io.stdout(serviceExecutionSummary(response.execution));
    return;
  }

  if (response.actionName === "export-profile" && response.profileExport) {
    io.stdout(`${response.profileExport.sessionId}: exported ${response.profileExport.profile.profileName}`);
    return;
  }

  if (response.actionName === "get-session" && response.session) {
    io.stdout(`${response.session.sessionId}: ${response.session.profile?.profileName ?? "empty session"}`);
    return;
  }

  io.stdout("reset: ok");
}

function serviceExecutionSummary(execution: BuilderServiceExecution): string {
  if (execution.result.profile) {
    return `${execution.result.sessionId}: ${execution.result.profile.profileName}`;
  }

  return `${execution.result.sessionId}: preview ${execution.result.preview.activeComponentId} interaction ${execution.result.preview.interactionCount}`;
}

function payloadForResponse(response: BuilderServiceResponse): unknown {
  switch (response.actionName) {
    case "catalog":
      return response.catalog;
    case "assemble":
    case "update":
    case "preview":
    case "import-profile":
      return response.execution;
    case "get-session":
      return response.session;
    case "export-profile":
      return response.profileExport;
    case "reset":
      return { reset: response.reset === true };
  }
}

function writeServiceEnvelopeResponse(response: BuilderServiceResponse, json: boolean, io: LocalServiceCliIo): void {
  if (json) {
    io.stdout(JSON.stringify(response, null, 2));
    return;
  }

  writeResponse(response, false, io);
}

function writeCatalogSummary(catalog: BuilderCatalog, io: LocalServiceCliIo): void {
  io.stdout("templates:");
  for (const template of catalog.templates) {
    io.stdout(`- ${template.displayLabel} [${template.id}] try: ${template.exampleRequest}; aliases: ${template.requestAliases.slice(0, 3).join(", ")}`);
  }

  io.stdout("tools:");
  for (const tool of catalog.tools) {
    io.stdout(
      `- ${tool.displayName} [${tool.toolName} -> ${tool.actionName}] ${toolInputSourceSummary(catalog, tool.acceptedInputSources)}; ${toolArgumentsSummary(catalog, tool.argumentsSchema)}`
    );
  }

  io.stdout(`asset edits: ${catalog.assetEdit.availableThemes.map((entry) => entry.displayLabel).join(", ")}`);
  io.stdout("request tips:");
  for (const line of catalog.requestTips.summaryLines) {
    io.stdout(`- ${line}`);
  }
}

function toolInputSourceSummary(
  catalog: BuilderCatalog,
  sources: BuilderCatalog["tools"][number]["acceptedInputSources"]
): string {
  if (sources.length === 0) {
    return `input: ${catalog.input.noInputLabel}`;
  }

  return `input: ${sources.map((source) => requiredInputSourceOption(catalog, source).displayLabel).join(", ")}`;
}

function toolArgumentsSummary(catalog: BuilderCatalog, schema: JsonObjectSchemaDescriptor): string {
  const summary = Object.entries(schema.fields).map(([name, field]) => `${name}${field.required ? "*" : ""}:${field.type}`);
  return `${catalog.toolPresentation.argumentsPrefix}: ${summary.length > 0 ? summary.join(", ") : catalog.toolPresentation.noArgumentsLabel}`;
}

function requiredInputSourceOption(catalog: BuilderCatalog, source: BuilderInputSource): BuilderInputSourceOption {
  const option = catalog.input.sourceOptions.find((candidate) => candidate.source === source);
  if (!option) {
    throw new Error(`catalog input source ${source} is missing display metadata`);
  }

  return option;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runLocalServiceCli(process.argv.slice(2)));
}
