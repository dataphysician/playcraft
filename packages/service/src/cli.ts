declare const process: { argv: string[]; exit(code?: number): never };

import {
  BuilderPreviewInteractionSchema,
  BuilderProfileExportSchema,
  BuilderServiceRequestBatchSchema,
  BuilderServiceRequestSchema,
  BuilderTemplateIdSchema,
  GameAssemblyProfileSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  WorkflowGraphSchema,
  type BuilderAssetEdit,
  type BuilderCatalog,
  type BuilderInputSource,
  type BuilderPreviewInteraction,
  type BuilderProfileExport,
  type BuilderServiceExecution,
  type BuilderServiceRequest,
  type BuilderServiceResponse,
  type BuilderTemplateId,
  type GameAssemblyProfile,
} from "@playcraft/contracts";
import { readFileSync } from "node:fs";
import { createLocalPlaycraftService, createMoonshineTranscriptRecord } from "./index.js";

export interface LocalServiceCliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}

interface ParsedArgs {
  assetEdit?: BuilderAssetEdit;
  interaction?: BuilderPreviewInteraction;
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
    io.stderr("usage: playcraft-service <catalog|assemble|update|preview|get-session|export-profile|import-profile|reset|request|request-batch|run-workflow> [--text <request>] [--transcript <moonshine transcript>] [--source <text|moonshine-transcript>] [--session <id>] [--interaction <primary>] [--template <template-id>] [--asset-theme <theme>] [--asset-item <item>] [--profile-json <json>] [--profile-export-json <json>] [--request-json <json>] [--json]");
    return 1;
  }

  try {
    if (commandName === "run-workflow") {
      return runWorkflowCommand(rest, io);
    }

    const args = parseArgs(rest);
    const service = createLocalPlaycraftService();
    const catalog = service.catalog();

    if (commandName === "request") {
      rejectNonEnvelopeFlags(args, commandName);
      const response = service.handle(parseServiceRequestJson(args.requestJson));
      writeServiceEnvelopeResponse(response, Boolean(args.json), io);
      return 0;
    }

    if (commandName === "request-batch") {
      rejectNonEnvelopeFlags(args, commandName);
      const responses = parseServiceRequestBatchJson(args.requestJson).map((request) => service.handle(request));
      writeServiceEnvelopeBatchResponse(responses, Boolean(args.json), io);
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

function runWorkflowCommand(rest: string[], io: LocalServiceCliIo): number {
  const graphPath = rest[0];
  if (!graphPath) {
    io.stderr("run-workflow requires a graph JSON file path");
    return 1;
  }

  const json = rest.includes("--json");
  const request = buildExecuteWorkflowRequestFromFile(graphPath);
  const service = createLocalPlaycraftService();
  const response = service.handle(request);
  writeServiceEnvelopeResponse(response, json, io);
  return 0;
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
    } else if (entry === "--interaction") {
      output.interaction = BuilderPreviewInteractionSchema.parse({
        action: requiredFlagValue(argv, index, entry)
      });
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
  const text = args.text?.trim();
  const inputCommand = commandName === "assemble" || commandName === "update";
  if (!inputCommand && (text || transcriptText || args.source)) {
    throw new Error(`${commandName} does not accept input flags; call assemble or update first, then pass --session`);
  }
  if (commandName !== "preview" && args.interaction) {
    throw new Error(`${commandName} does not accept interaction flags; call preview with --interaction primary`);
  }
  if (commandName === "preview" && !args.interaction) {
    throw new Error("preview requires --interaction primary");
  }
  if (!inputCommand && commandName !== "import-profile" && args.assetEdit) {
    throw new Error(`${commandName} does not accept asset edit flags; call assemble, update, or import-profile`);
  }
  if (inputCommand && !text && !transcriptText) {
    throw new Error("assemble and update require --text or --transcript");
  }
  if (inputCommand && text && transcriptText) {
    throw new Error("assemble and update accept either --text or --transcript, not both");
  }
  if (inputCommand && args.source === "text" && transcriptText) {
    throw new Error("text source requires --text; use --source moonshine-transcript with --transcript");
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
    request.text = text;
  }

  if (commandName === "import-profile") {
    if (args.templateId) {
      throw new Error("import-profile derives template identity from the profile; --template is only accepted by assemble and update");
    }
    request.assetEdit = args.assetEdit;
    request.profile = profile;
    request.profileExport = profileExport;
  }

  if (commandName === "preview") {
    request.interaction = args.interaction;
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

function parseServiceRequestBatchJson(value: string | undefined): BuilderServiceRequest[] {
  if (!value) {
    throw new Error("request-batch command requires --request-json");
  }

  return BuilderServiceRequestBatchSchema.parse(JSON.parse(value));
}

function buildExecuteWorkflowRequestFromFile(graphPath: string): BuilderServiceRequest {
  let raw: string;
  try {
    raw = readFileSync(graphPath, "utf8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`unable to read workflow graph file ${graphPath}: ${reason}`);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`workflow graph file ${graphPath} is not valid JSON: ${reason}`);
  }

  const workflow = WorkflowGraphSchema.parse(parsedJson);
  const requestId = buildRequestIdForGraph(workflow.id);

  return BuilderServiceRequestSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: requestId,
    version: "1.0.0",
    kind: "builder-service-request",
    actionName: "execute-workflow",
    workflow
  });
}

function buildRequestIdForGraph(graphId: string): string {
  const sanitized = graphId.replace(/[^a-z0-9.-]+/gu, "-").slice(0, 60);
  const suffix = sanitized.length > 0 ? `.${sanitized}` : "";
  const candidate = `bsr.cli.run-workflow${suffix}`;
  return candidate.length <= 96 ? candidate : candidate.slice(0, 96);
}

function rejectNonEnvelopeFlags(args: ParsedArgs, commandName: "request" | "request-batch"): void {
  if (
    args.assetEdit ||
    args.interaction ||
    args.profileExportJson ||
    args.profileJson ||
    args.sessionId ||
    args.source ||
    args.templateId ||
    args.text ||
    args.transcriptText
  ) {
    throw new Error(`${commandName} only accepts --request-json and --json`);
  }
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

  if (response.actionName === "execute-workflow" && response.execution) {
    io.stdout(workflowExecutionSummary(response.execution));
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

function workflowExecutionSummary(execution: BuilderServiceExecution): string {
  const toolCallCount = execution.events.filter((event) => isEventType(event, "ToolCall")).length;
  const toolResultCount = execution.events.filter((event) => isEventType(event, "ToolResult")).length;
  const runFinishedCount = execution.events.filter((event) => isEventType(event, "RunFinished")).length;
  return `${execution.result.sessionId}: workflow events toolCall=${String(toolCallCount)} toolResult=${String(toolResultCount)} runFinished=${String(runFinishedCount)}`;
}

function isEventType(value: unknown, eventType: string): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { type?: unknown };
  return candidate.type === eventType;
}

function payloadForResponse(response: BuilderServiceResponse): unknown {
  switch (response.actionName) {
    case "catalog":
      return response.catalog;
    case "assemble":
    case "update":
    case "preview":
    case "import-profile":
    case "execute-workflow":
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

function writeServiceEnvelopeBatchResponse(responses: BuilderServiceResponse[], json: boolean, io: LocalServiceCliIo): void {
  if (json) {
    io.stdout(JSON.stringify(responses, null, 2));
    return;
  }

  for (const response of responses) {
    writeResponse(response, false, io);
  }
}

function writeCatalogSummary(catalog: BuilderCatalog, io: LocalServiceCliIo): void {
  io.stdout("templates:");
  for (const template of catalog.templates) {
    io.stdout(`- ${template.displayLabel} [${template.id}] try: ${template.exampleRequest}; aliases: ${template.requestAliasSummary}`);
  }

  io.stdout("tools:");
  for (const tool of catalog.tools) {
    io.stdout(
      `- ${tool.displayName} [${tool.toolName} -> ${tool.actionName}] ${tool.inputSourceSummary}; ${tool.argumentSummary}; contracts: ${tool.requiredContracts.join(", ")}`
    );
  }

  io.stdout("service actions:");
  for (const action of catalog.service.actions) {
    io.stdout(
      `- ${action.displayName} [${action.actionName}] input: ${action.acceptsInput ? "yes" : "no"}; session: ${action.requiresSession ? "required" : "optional"}; response: ${action.responsePayload}; fields: ${formatServiceRequestFields(action.request.acceptedFields)}; required: ${formatServiceRequestFields(action.request.requiredFields)}; one-of: ${formatServiceRequestAnyOf(action.request.requiredAnyOf)}; exclusive: ${formatServiceRequestAnyOf(action.request.exclusiveAnyOf)}; forbidden: ${formatServiceRequestAnyOf(action.request.forbiddenTogether)}`
    );
    io.stdout(`  request: ${action.request.summary}`);
  }
  io.stdout(`exact envelopes: ${catalog.service.exactEnvelope.singleCommand}/${catalog.service.exactEnvelope.batchCommand} via ${catalog.service.exactEnvelope.requestSchema}/${catalog.service.exactEnvelope.batchSchema}; contracts: ${catalog.service.exactEnvelope.requiredContracts.join(", ")}`);
  io.stdout(`service helpers: ${catalog.service.exactEnvelope.directHandler}/${catalog.service.exactEnvelope.directBatchHandler}`);
  io.stdout(`service transports: ${catalog.service.transports.local}, ${catalog.service.transports.httpClient}, ${catalog.service.transports.httpBody}`);
  io.stdout(`asset edits: ${catalog.assetEdit.availableThemes.map((entry) => `${entry.displayLabel} [folder: ${entry.localReplacementFolder}]`).join(", ")}`);
  io.stdout("request tips:");
  for (const line of catalog.requestTips.summaryLines) {
    io.stdout(`- ${line}`);
  }
}

function formatServiceRequestFields(fields: string[]): string {
  return fields.length > 0 ? fields.join(", ") : "none";
}

function formatServiceRequestAnyOf(groups: string[][]): string {
  return groups.length > 0 ? groups.map((group) => group.join("|")).join(", ") : "none";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runLocalServiceCli(process.argv.slice(2)));
}
