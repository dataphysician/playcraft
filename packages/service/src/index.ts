import {
  BuilderCatalogSchema,
  BuilderInputRequestSchema,
  BuilderIntentResolutionSchema,
  BuilderProfileExportSchema,
  BuilderServiceExecutionSchema,
  BuilderServiceRequestBatchSchema,
  BuilderServiceRequestSchema,
  BuilderServiceResponseSchema,
  BuilderSessionSnapshotSchema,
  JsonValueSchema,
  MoonshineTranscriptRecordSchema,
  PLAYCRAFT_LOCAL_TIMESTAMP,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderAssetEdit,
  type BuilderAssetEditCatalogEntry,
  type BuilderCatalog,
  type BuilderServiceCatalog,
  type BuilderCommand,
  type BuilderInputRequest,
  type BuilderInputSource,
  type BuilderIntentResolution,
  type BuilderProfileExport,
  type BuilderServiceExecution,
  type BuilderServiceRequest,
  type BuilderServiceRequestBatch,
  type BuilderServiceResponse,
  type BuilderSessionSnapshot,
  type BuilderTemplateId,
  type GameAssemblyProfile,
  type GameTemplateDefinition,
  type JsonValue,
  type MoonshineTranscriptRecord,
  type MoonshineTranscriptSegment
} from "@playcraft/contracts";
import {
  localAssetEditCatalog,
  localAssetEditGenericThemeTokens,
  localAssetEditIntentPatterns,
  type LocalAssetEditIntentPattern
} from "@playcraft/assets";
import {
  createBuilderCommandHandler,
  type BuilderCommandHandler,
  type BuilderExecutionResult
} from "@playcraft/builder";
import { DEFAULT_GAME_TEMPLATE_ID, gameTemplateDefinitions } from "@playcraft/packs";

export const PLAYCRAFT_SERVICE_PACKAGE = "@playcraft/service";
export { localAssetEditCatalog } from "@playcraft/assets";

export const LOCAL_SERVICE_SESSION_POLICY = {
  defaultAssembleSessionId: "service.session",
  sessionBoundActions: ["update", "preview", "get-session", "export-profile", "import-profile"]
} as const;

export const LOCAL_SERVICE_INPUT_POLICY = {
  defaultSource: "text",
  transcriptSource: "moonshine-transcript",
  noInputLabel: "none",
  sourceOptions: [
    {
      source: "text",
      displayLabel: "Text",
      generatePlaceholder: "Memory game with dinosaurs",
      updatePlaceholder: "Change the game or replace assets..."
    },
    {
      source: "moonshine-transcript",
      displayLabel: "Transcript",
      generatePlaceholder: "Moonshine transcript: memory game with dinosaurs",
      updatePlaceholder: "Moonshine transcript: change the game or replace assets"
    }
  ]
} as const;

export const LOCAL_SERVICE_CATALOG: BuilderServiceCatalog = {
  actions: [
    {
      actionName: "catalog",
      displayName: "Catalog",
      requiresSession: false,
      acceptsInput: false,
      request: {
        acceptedFields: [],
        requiredFields: [],
        requiredAnyOf: [],
        exclusiveAnyOf: [],
        forbiddenTogether: [],
        summary: "No payload fields accepted."
      },
      responsePayload: "catalog"
    },
    {
      actionName: "assemble",
      displayName: "Assemble",
      requiresSession: false,
      acceptsInput: true,
      request: {
        acceptedFields: ["sessionId", "text", "source", "moonshineTranscript", "templateId", "assetEdit"],
        requiredFields: [],
        requiredAnyOf: [["text", "moonshineTranscript"]],
        exclusiveAnyOf: [],
        forbiddenTogether: [],
        summary: "Requires text or a Moonshine transcript record; sessionId, templateId, source, and assetEdit are optional."
      },
      responsePayload: "execution"
    },
    {
      actionName: "update",
      displayName: "Update",
      requiresSession: true,
      acceptsInput: true,
      request: {
        acceptedFields: ["sessionId", "text", "source", "moonshineTranscript", "templateId", "assetEdit"],
        requiredFields: ["sessionId"],
        requiredAnyOf: [["text", "moonshineTranscript"]],
        exclusiveAnyOf: [],
        forbiddenTogether: [],
        summary: "Requires sessionId plus text or a Moonshine transcript record; templateId, source, and assetEdit are optional."
      },
      responsePayload: "execution"
    },
    {
      actionName: "preview",
      displayName: "Preview",
      requiresSession: true,
      acceptsInput: false,
      request: {
        acceptedFields: ["sessionId"],
        requiredFields: ["sessionId"],
        requiredAnyOf: [],
        exclusiveAnyOf: [],
        forbiddenTogether: [],
        summary: "Requires sessionId and accepts no input, template, asset, or profile payloads."
      },
      responsePayload: "execution"
    },
    {
      actionName: "get-session",
      displayName: "Get Session",
      requiresSession: true,
      acceptsInput: false,
      request: {
        acceptedFields: ["sessionId"],
        requiredFields: ["sessionId"],
        requiredAnyOf: [],
        exclusiveAnyOf: [],
        forbiddenTogether: [],
        summary: "Requires sessionId and returns the current session snapshot."
      },
      responsePayload: "session"
    },
    {
      actionName: "export-profile",
      displayName: "Export Profile",
      requiresSession: true,
      acceptsInput: false,
      request: {
        acceptedFields: ["sessionId"],
        requiredFields: ["sessionId"],
        requiredAnyOf: [],
        exclusiveAnyOf: [],
        forbiddenTogether: [],
        summary: "Requires sessionId and returns a portable profile export."
      },
      responsePayload: "profileExport"
    },
    {
      actionName: "import-profile",
      displayName: "Import Profile",
      requiresSession: true,
      acceptsInput: false,
      request: {
        acceptedFields: ["sessionId", "profile", "profileExport", "assetEdit"],
        requiredFields: ["sessionId"],
        requiredAnyOf: [["profile", "profileExport"]],
        exclusiveAnyOf: [["profile", "profileExport"]],
        forbiddenTogether: [["profileExport", "assetEdit"]],
        summary: "Requires sessionId plus exactly one profile or profileExport; top-level assetEdit is only accepted with profile imports."
      },
      responsePayload: "execution"
    },
    {
      actionName: "reset",
      displayName: "Reset",
      requiresSession: false,
      acceptsInput: false,
      request: {
        acceptedFields: [],
        requiredFields: [],
        requiredAnyOf: [],
        exclusiveAnyOf: [],
        forbiddenTogether: [],
        summary: "No payload fields accepted."
      },
      responsePayload: "reset"
    }
  ],
  exactEnvelope: {
    singleCommand: "request",
    batchCommand: "request-batch",
    requestSchema: "BuilderServiceRequestSchema",
    batchSchema: "BuilderServiceRequestBatchSchema",
    directHandler: "handleLocalServiceRequest",
    directBatchHandler: "handleLocalServiceRequestBatch",
    requiredContracts: ["BuilderServiceRequestSchema", "BuilderServiceRequestBatchSchema", "BuilderServiceResponseSchema"]
  },
  transports: {
    local: "createLocalServiceTransport",
    httpClient: "createHttpServiceTransport",
    httpBody: "handleServiceHttpRequestBody"
  }
};

export interface LocalBuilderInput {
  assetEdit?: BuilderAssetEdit;
  sessionId?: string;
  source?: BuilderInputSource;
  moonshineTranscript?: MoonshineTranscriptRecord;
  templateId?: BuilderTemplateId;
  text: string;
}

export interface ResolvedBuilderInputCommand {
  assetEdit?: BuilderAssetEdit;
  input: BuilderInputRequest;
  resolution: BuilderIntentResolution;
  templateId: BuilderTemplateId;
}

export interface BuilderServiceTransport {
  send(request: BuilderServiceRequest): BuilderServiceResponse | Promise<BuilderServiceResponse>;
}

export interface BuilderServiceHttpResponse {
  body: string;
  headers: Record<string, string>;
  status: number;
}

export interface BuilderServiceHttpFetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type BuilderServiceHttpFetch = (
  url: string,
  init: {
    body: string;
    headers: Record<string, string>;
    method: "POST";
  }
) => Promise<BuilderServiceHttpFetchResponse>;

export class LocalPlaycraftService {
  private readonly handler: BuilderCommandHandler;
  private inputCounter = 0;
  private commandCounter = 0;
  private readonly sessionState = new Map<string, LocalSessionState>();

  constructor(handler: BuilderCommandHandler = createBuilderCommandHandler()) {
    this.handler = handler;
  }

  catalog(): BuilderCatalog {
    return BuilderCatalogSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-catalog.local",
      version: "1.0.0",
      kind: "builder-catalog",
      defaultTemplateId: DEFAULT_GAME_TEMPLATE_ID,
      templates: this.handler.listTemplates(),
      tools: this.handler.listTools(),
      acceptedInputSources: ["text", "moonshine-transcript"],
      input: LOCAL_SERVICE_INPUT_POLICY,
      requestTips: requestTipsForCatalog(this.handler.listTemplates(), localAssetEditCatalog),
      service: LOCAL_SERVICE_CATALOG,
      sessions: LOCAL_SERVICE_SESSION_POLICY,
      assetEdit: {
        supported: true,
        acceptedKeys: ["theme", "items"],
        maxItems: 12,
        localReplacementFolders: true,
        genericThemeTokens: localAssetEditGenericThemeTokens,
        availableThemes: localAssetEditCatalog
      },
      retrieval: {
        current: "bundled-local",
        planned: "server-catalog"
      }
    });
  }

  assemble(input: LocalBuilderInput): BuilderExecutionResult {
    const sessionId = input.sessionId ?? this.catalog().sessions.defaultAssembleSessionId;
    const resolved = this.resolveInput(sessionId, input);
    this.updateSessionState(sessionId, resolved);
    return this.execute("assemble-game", sessionId, resolved);
  }

  update(input: LocalBuilderInput & { sessionId: string }): BuilderExecutionResult {
    const resolved = this.resolveInput(input.sessionId, input);
    this.updateSessionState(input.sessionId, resolved);
    return this.execute("update-game", input.sessionId, resolved);
  }

  preview(sessionId: string): BuilderExecutionResult {
    this.commandCounter += 1;
    const output = this.handler.execute({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-command.${sessionId}.${this.commandCounter}`,
      version: "1.0.0",
      kind: "builder-command",
      sessionId,
      actionName: "preview-action",
      interaction: { action: "primary" }
    });
    this.refreshSessionStateFromResult(sessionId, output.result);
    return output;
  }

  getSession(sessionId: string): BuilderSessionSnapshot {
    return mergeSessionState(this.handler.getSessionSnapshot(sessionId), this.sessionState.get(sessionId));
  }

  exportProfile(sessionId: string): BuilderProfileExport {
    const session = this.getSession(sessionId);
    if (!session.profile) {
      throw new Error(`session ${sessionId} does not have an active profile to export`);
    }

    return BuilderProfileExportSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-profile-export.${sessionId}`,
      version: "1.0.0",
      kind: "builder-profile-export",
      sessionId,
      templateId: session.activeTemplateId,
      assetEdit: session.activeAssetEdit,
      profile: session.profile,
      preview: session.preview,
      validation: session.validation,
      exportedAt: PLAYCRAFT_LOCAL_TIMESTAMP,
      retrieval: {
        current: "bundled-local",
        planned: "server-catalog"
      }
    });
  }

  importProfile(input: { assetEdit?: BuilderAssetEdit; profile: GameAssemblyProfile; sessionId: string }): BuilderExecutionResult {
    const sessionId = input.sessionId;
    this.commandCounter += 1;
    const output = this.handler.importProfile(
      sessionId,
      input.profile,
      `builder-command.${sessionId}.${this.commandCounter}`
    );
    this.sessionState.set(sessionId, {
      activeAssetEdit: input.assetEdit,
      activeTemplateId: output.result.preview.activeTemplateId
    });
    return output;
  }

  reset(): void {
    this.inputCounter = 0;
    this.commandCounter = 0;
    this.sessionState.clear();
  }

  handle(requestInput: BuilderServiceRequest): BuilderServiceResponse {
    const request = BuilderServiceRequestSchema.parse(requestInput);

    if (request.actionName === "catalog") {
      return serviceResponse(request, { catalog: this.catalog() });
    }

    if (request.actionName === "reset") {
      this.reset();
      return serviceResponse(request, { reset: true });
    }

    if (request.actionName === "get-session") {
      return serviceResponse(request, { session: this.getSession(serviceRequestSessionId(request)) });
    }

    if (request.actionName === "export-profile") {
      return serviceResponse(request, { profileExport: this.exportProfile(serviceRequestSessionId(request)) });
    }

    if (request.actionName === "import-profile") {
      const profileExport = request.profileExport;
      const importPayload = profileExport
        ? {
            assetEdit: profileExport.assetEdit,
            profile: profileExport.profile,
            sessionId: serviceRequestSessionId(request)
          }
        : {
            assetEdit: request.assetEdit,
            profile: request.profile,
            sessionId: serviceRequestSessionId(request)
          };
      if (!importPayload.profile) {
        throw new Error("import-profile requires exactly one profile payload");
      }
      const output = this.importProfile({
        assetEdit: importPayload.assetEdit,
        profile: importPayload.profile,
        sessionId: importPayload.sessionId
      });
      return serviceResponse(request, {
        execution: serializeExecution(output),
        session: this.getSession(output.result.sessionId)
      });
    }

    if (request.actionName === "preview") {
      const sessionId = serviceRequestSessionId(request);
      return serviceResponse(request, {
        execution: serializeExecution(this.preview(sessionId)),
        session: this.getSession(sessionId)
      });
    }

    if (request.actionName === "assemble") {
      const sessionId = request.sessionId ?? this.catalog().sessions.defaultAssembleSessionId;
      const output = this.assemble({
        assetEdit: request.assetEdit,
        sessionId,
        source: sourceForServiceRequest(request, this.catalog().input),
        moonshineTranscript: request.moonshineTranscript,
        templateId: request.templateId,
        text: textForServiceRequest(request)
      });
      return serviceResponse(request, {
        execution: serializeExecution(output),
        session: this.getSession(sessionId)
      });
    }

    const sessionId = serviceRequestSessionId(request);
    const output = this.update({
      assetEdit: request.assetEdit,
      sessionId,
      source: sourceForServiceRequest(request, this.catalog().input),
      moonshineTranscript: request.moonshineTranscript,
      templateId: request.templateId,
      text: textForServiceRequest(request)
    });
    return serviceResponse(request, {
      execution: serializeExecution(output),
      session: this.getSession(sessionId)
    });
  }

  handleBatch(requestInputs: BuilderServiceRequestBatch): BuilderServiceResponse[] {
    return BuilderServiceRequestBatchSchema.parse(requestInputs).map((request) => this.handle(request));
  }

  private resolveInput(sessionId: string, input: LocalBuilderInput): ResolvedBuilderInputCommand {
    this.inputCounter += 1;
    const state = this.sessionState.get(sessionId);
    const catalog = this.catalog();
    return resolveBuilderInputCommand({
      activeAssetEdit: state?.activeAssetEdit,
      activeTemplateId: state?.activeTemplateId ?? catalog.defaultTemplateId,
      assetEdit: input.assetEdit,
      sequence: this.inputCounter,
      source: input.source ?? catalog.input.defaultSource,
      moonshineTranscript: input.moonshineTranscript,
      templateId: input.templateId,
      text: input.text
    });
  }

  private execute(
    actionName: Extract<BuilderCommand["actionName"], "assemble-game" | "update-game">,
    sessionId: string,
    resolved: ResolvedBuilderInputCommand
  ): BuilderExecutionResult {
    this.commandCounter += 1;
    const output = this.handler.execute({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-command.${sessionId}.${this.commandCounter}`,
      version: "1.0.0",
      kind: "builder-command",
      sessionId,
      actionName,
      templateId: resolved.templateId,
      input: resolved.input,
      assetEdit: resolved.assetEdit
    });
    this.refreshSessionStateFromResult(sessionId, output.result);
    return output;
  }

  private updateSessionState(sessionId: string, resolved: ResolvedBuilderInputCommand): void {
    this.sessionState.set(sessionId, {
      activeAssetEdit: resolved.assetEdit,
      activeTemplateId: resolved.templateId
    });
  }

  private refreshSessionStateFromResult(sessionId: string, result: BuilderExecutionResult["result"]): void {
    const existing = this.sessionState.get(sessionId);
    this.sessionState.set(sessionId, {
      activeAssetEdit: existing?.activeAssetEdit,
      activeTemplateId: result.preview.activeTemplateId ?? existing?.activeTemplateId
    });
  }
}

interface LocalSessionState {
  activeAssetEdit?: BuilderAssetEdit;
  activeTemplateId?: BuilderTemplateId;
}

function requestTipsForCatalog(
  templates: GameTemplateDefinition[],
  assetThemes: BuilderAssetEditCatalogEntry[]
): BuilderCatalog["requestTips"] {
  const availableGames = templates.map((template) => template.displayLabel);
  const visibleGames = availableGames.slice(0, 5);
  const hiddenGameCount = Math.max(0, availableGames.length - visibleGames.length);
  const assetEdits = assetThemes.map((entry) => `with ${entry.displayLabel}`);
  const examples = templates.slice(0, 3).map((template, index) => {
    const assetEdit = assetEdits[index % Math.max(assetEdits.length, 1)];
    const request = sentenceCase(template.exampleRequest);
    return assetEdit ? `${request} ${assetEdit}` : request;
  });

  return {
    availableGames,
    assetEdits,
    examples,
    summaryLines: [
      `Available games: ${visibleGames.join(", ")}${hiddenGameCount > 0 ? `, plus ${hiddenGameCount} more` : ""}.`,
      `Asset edits: ${assetEdits.join(", ")}.`,
      `Try: ${examples.join("; ")}.`
    ]
  };
}

function sentenceCase(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

export function createLocalPlaycraftService(handler?: BuilderCommandHandler): LocalPlaycraftService {
  return new LocalPlaycraftService(handler);
}

export function createLocalServiceTransport(service = createLocalPlaycraftService()): BuilderServiceTransport {
  return {
    send(request) {
      return service.handle(request);
    }
  };
}

export function createHttpServiceTransport(input: {
  endpoint: string;
  fetch?: BuilderServiceHttpFetch;
  headers?: Record<string, string>;
}): BuilderServiceTransport {
  const fetcher = input.fetch ?? defaultFetch;

  return {
    async send(request) {
      const parsedRequest = BuilderServiceRequestSchema.parse(request);
      const response = await fetcher(input.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          ...input.headers
        },
        body: JSON.stringify(parsedRequest)
      });
      const body = await response.text();

      if (!response.ok) {
        throw new Error(`builder service HTTP ${response.status}: ${body}`);
      }

      return BuilderServiceResponseSchema.parse(JSON.parse(body));
    }
  };
}

export function handleServiceHttpRequestBody(
  body: string,
  service = createLocalPlaycraftService()
): BuilderServiceHttpResponse {
  try {
    const request = BuilderServiceRequestSchema.parse(JSON.parse(body));
    const response = service.handle(request);

    return {
      status: 200,
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    return {
      status: 400,
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        kind: "builder-service-error",
        message: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

export function handleLocalServiceRequest(
  request: BuilderServiceRequest,
  service = createLocalPlaycraftService()
): BuilderServiceResponse {
  return service.handle(request);
}

export function handleLocalServiceRequestBatch(
  requests: BuilderServiceRequestBatch,
  service = createLocalPlaycraftService()
): BuilderServiceResponse[] {
  return service.handleBatch(requests);
}

export function resolveBuilderInputCommand(input: {
  activeAssetEdit?: BuilderAssetEdit;
  activeTemplateId?: BuilderTemplateId;
  assetEdit?: BuilderAssetEdit;
  sequence: number;
  source: BuilderInputSource;
  moonshineTranscript?: MoonshineTranscriptRecord;
  templateId?: BuilderTemplateId;
  text: string;
}): ResolvedBuilderInputCommand {
  const commandText = input.text.trim();
  const request = createBuilderInputRequest({
    sequence: input.sequence,
    source: input.source,
    moonshineTranscript: input.moonshineTranscript,
    text: commandText
  });
  const templateMatch = templateMatchForText(commandText);
  const templateDecision = templateDecisionFor({
    activeTemplateId: input.activeTemplateId,
    matchedCapabilityTags: templateMatch.matchedCapabilityTags,
    matchedTemplateIds: templateMatch.matchedTemplateIds,
    templateId: input.templateId
  });
  const textAssetEdit = assetEditForText(commandText);
  const assetDecision = assetDecisionFor({
    activeAssetEdit: input.activeAssetEdit,
    explicitAssetEdit: input.assetEdit,
    textAssetEdit
  });
  const resolution = BuilderIntentResolutionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-intent.local.${input.sequence}`,
    version: "1.0.0",
    kind: "builder-intent-resolution",
    inputId: request.inputId,
    activeTemplateId: input.activeTemplateId,
    selectedTemplateId: templateDecision.templateId,
    templateDecision: {
      source: templateDecision.source,
      matchedTemplateIds: templateMatch.matchedTemplateIds,
      matchedCapabilityTags: templateMatch.matchedCapabilityTags,
      matchedRequestAliases: templateMatch.matchedRequestAliases
    },
    assetEdit: assetDecision.assetEdit,
    assetDecision: {
      source: assetDecision.source,
      matchedText: assetDecision.matchedText
    }
  });
  const requestWithResolution = BuilderInputRequestSchema.parse({
    ...request,
    metadata: {
      ...request.metadata,
      intentResolution: toJsonValue(resolution)
    }
  });

  return {
    assetEdit: resolution.assetEdit,
    input: requestWithResolution,
    resolution,
    templateId: resolution.selectedTemplateId
  };
}

export function createBuilderInputRequest(input: {
  sequence: number;
  source: BuilderInputSource;
  moonshineTranscript?: MoonshineTranscriptRecord;
  text: string;
}): BuilderInputRequest {
  const moonshineTranscript =
    input.source === "moonshine-transcript"
      ? input.moonshineTranscript
      : undefined;
  const text = moonshineTranscript?.text ?? input.text;

  return BuilderInputRequestSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-input.local.${input.sequence}`,
    version: "1.0.0",
    kind: "builder-input",
    inputId: `builder-input.local.${input.sequence}`,
    source: input.source,
    text,
    transcription: input.source === "moonshine-transcript" ? MOONSHINE_STREAMING_CPU_TRANSCRIPTION : undefined,
    moonshineTranscript,
    receivedAt: PLAYCRAFT_LOCAL_TIMESTAMP,
    metadata: {
      origin: "playcraft.local-service",
      ...(moonshineTranscript ? { moonshineTranscriptId: moonshineTranscript.transcriptId } : {})
    }
  });
}

export const MOONSHINE_STREAMING_CPU_TRANSCRIPTION = {
  engine: "moonshine-streaming",
  runtime: "cpu",
  localOnly: true
} as const;

export function createMoonshineTranscriptRecord(input: {
  id?: string;
  metadata?: Record<string, JsonValue>;
  receivedAt?: string;
  segments?: MoonshineTranscriptSegment[];
  sequence?: number;
  text: string;
  transcriptId?: string;
}): MoonshineTranscriptRecord {
  const id = input.id ?? `moonshine-transcript.local.${input.sequence ?? 1}`;
  return MoonshineTranscriptRecordSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "moonshine-transcript",
    transcriptId: input.transcriptId ?? id,
    engine: MOONSHINE_STREAMING_CPU_TRANSCRIPTION.engine,
    runtime: MOONSHINE_STREAMING_CPU_TRANSCRIPTION.runtime,
    localOnly: MOONSHINE_STREAMING_CPU_TRANSCRIPTION.localOnly,
    finalized: true,
    text: input.text.trim(),
    receivedAt: input.receivedAt ?? PLAYCRAFT_LOCAL_TIMESTAMP,
    segments: input.segments ?? [],
    metadata: {
      origin: "playcraft.local-moonshine-streaming-cpu",
      ...input.metadata
    }
  });
}

function sourceForServiceRequest(
  request: BuilderServiceRequest,
  inputPolicy: BuilderCatalog["input"]
): BuilderInputSource {
  if (request.moonshineTranscript) {
    return inputPolicy.transcriptSource;
  }

  return request.source ?? inputPolicy.defaultSource;
}

function textForServiceRequest(request: BuilderServiceRequest): string {
  if (request.moonshineTranscript) {
    return request.moonshineTranscript.text;
  }

  if (request.text) {
    return request.text;
  }

  throw new Error(`${request.actionName} requests require text or a Moonshine transcript record`);
}

interface TemplateTextMatch {
  matchedCapabilityTags: string[];
  matchedRequestAliases: string[];
  matchedTemplateIds: BuilderTemplateId[];
}

interface TemplateDecision {
  source: BuilderIntentResolution["templateDecision"]["source"];
  templateId: BuilderTemplateId;
}

interface TextAssetEdit {
  assetEdit: BuilderAssetEdit;
  matchedText: string;
  source: Extract<BuilderIntentResolution["assetDecision"]["source"], "catalog-asset-alias" | "freeform-asset-request">;
}

interface AssetDecision {
  assetEdit?: BuilderAssetEdit;
  matchedText?: string;
  source: BuilderIntentResolution["assetDecision"]["source"];
}

function templateMatchForText(text: string): TemplateTextMatch {
  const textTokens = normalizedTokens(text);
  const matches = gameTemplateDefinitions.flatMap((template) => {
    const matchedRequestAliases = template.requestAliases.filter((alias) =>
      tokenSequenceIncludes(textTokens, normalizedTokens(alias))
    );
    return matchedRequestAliases.length > 0
      ? [{ capabilityTags: template.capabilityTags, requestAliases: matchedRequestAliases, templateId: template.id }]
      : [];
  });

  return {
    matchedCapabilityTags: [...new Set(matches.flatMap((match) => match.capabilityTags))],
    matchedRequestAliases: [...new Set(matches.flatMap((match) => match.requestAliases))],
    matchedTemplateIds: [...new Set(matches.map((match) => match.templateId))]
  };
}

function templateDecisionFor(input: {
  activeTemplateId?: BuilderTemplateId;
  matchedCapabilityTags: string[];
  matchedTemplateIds: BuilderTemplateId[];
  templateId?: BuilderTemplateId;
}): TemplateDecision {
  if (input.templateId) {
    return { source: "explicit-template-id", templateId: input.templateId };
  }

  if (input.matchedTemplateIds.length === 1) {
    return { source: "catalog-template-alias", templateId: input.matchedTemplateIds[0] };
  }

  if (input.matchedTemplateIds.length > 1) {
    return {
      source: "ambiguous-template-match",
      templateId: input.activeTemplateId ?? DEFAULT_GAME_TEMPLATE_ID
    };
  }

  if (input.activeTemplateId) {
    return { source: "active-template", templateId: input.activeTemplateId };
  }

  return { source: "default-template", templateId: DEFAULT_GAME_TEMPLATE_ID };
}

function assetDecisionFor(input: {
  activeAssetEdit?: BuilderAssetEdit;
  explicitAssetEdit?: BuilderAssetEdit;
  textAssetEdit?: TextAssetEdit;
}): AssetDecision {
  if (input.explicitAssetEdit) {
    return {
      assetEdit: input.explicitAssetEdit,
      matchedText: input.explicitAssetEdit.theme ?? input.explicitAssetEdit.items?.join(", "),
      source: "explicit-asset-edit"
    };
  }

  if (input.textAssetEdit) {
    return {
      assetEdit: input.textAssetEdit.assetEdit,
      matchedText: input.textAssetEdit.matchedText,
      source: input.textAssetEdit.source
    };
  }

  if (input.activeAssetEdit) {
    return {
      assetEdit: input.activeAssetEdit,
      matchedText: input.activeAssetEdit.theme ?? input.activeAssetEdit.items?.join(", "),
      source: "active-asset-edit"
    };
  }

  return { source: "none" };
}

function assetEditForText(text: string): TextAssetEdit | undefined {
  const normalized = text.toLowerCase();
  const match = localAssetEditIntentPatterns
    .map((pattern) => matchAssetTheme(normalized, pattern))
    .find((entry): entry is { source: TextAssetEdit["source"]; theme: string } => Boolean(entry));

  if (!match) {
    return undefined;
  }

  const items = match.theme
    .split(/\s*(?:,| and )\s*/u)
    .map((entry) => cleanAssetTheme(entry))
    .filter((entry) => entry.length > 0)
    .slice(0, 12);

  return {
    assetEdit: items.length > 1 ? { theme: match.theme, items } : { theme: match.theme },
    matchedText: match.theme,
    source: match.source
  };
}

function matchAssetTheme(
  text: string,
  pattern: LocalAssetEditIntentPattern
): { source: TextAssetEdit["source"]; theme: string } | undefined {
  const match = pattern.pattern.exec(text);
  if (!match) {
    return undefined;
  }

  const candidate = cleanAssetTheme(match[1]);
  if (
    candidate.length === 0 ||
    isGenericAssetTheme(candidate) ||
    isTemplateOnlyTheme(candidate) ||
    (pattern.source === "catalog-asset-alias" && !isKnownAssetTheme(candidate))
  ) {
    return undefined;
  }

  const matchedSource = isKnownAssetTheme(candidate) ? "catalog-asset-alias" : pattern.source;
  return { source: matchedSource, theme: candidate };
}

function isKnownAssetTheme(value: string): boolean {
  const tokens = normalizedTokens(value).join(" ");
  return localAssetEditCatalog.some((entry) =>
    [entry.theme, ...entry.aliases].some((alias) => normalizedTokens(alias).join(" ") === tokens)
  );
}

function isTemplateOnlyTheme(value: string): boolean {
  const candidate = normalizedTokens(value).join(" ");
  return gameTemplateDefinitions.some((template) =>
    template.requestAliases.some((alias) => normalizedTokens(alias).join(" ") === candidate)
  );
}

function isGenericAssetTheme(value: string): boolean {
  const candidate = normalizedTokens(value).join(" ");
  return localAssetEditGenericThemeTokens.some((token) => normalizedTokens(token).join(" ") === candidate);
}

function cleanAssetTheme(value: string): string {
  return value
    .split(/[.!?;]/u)[0]
    .replace(/\b(?:a|an|the)\b/gu, " ")
    .replace(/[^a-z0-9 ,.-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 80);
}

function toJsonValue(value: unknown): JsonValue {
  return JsonValueSchema.parse(normalizeJsonValue(value));
}

function normalizeJsonValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("service event value contains a non-finite number");
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (entry === undefined) {
        throw new Error("service event value contains undefined inside an array");
      }

      return normalizeJsonValue(entry);
    });
  }

  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("service event value contains a non-plain object");
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, normalizeJsonValue(entry)])
    );
  }

  throw new Error(`service event value contains unsupported JSON type ${typeof value}`);
}

function serializeExecution(output: BuilderExecutionResult): BuilderServiceExecution {
  return BuilderServiceExecutionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    result: output.result,
    events: output.events.map((event) => toJsonValue(event))
  });
}

function serviceResponse(
  request: BuilderServiceRequest,
  payload: {
    catalog?: BuilderCatalog;
    execution?: BuilderServiceExecution;
    profileExport?: BuilderProfileExport;
    reset?: true;
    session?: BuilderSessionSnapshot;
  }
): BuilderServiceResponse {
  return BuilderServiceResponseSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-service-response.${request.id}`,
    version: "1.0.0",
    kind: "builder-service-response",
    requestId: request.id,
    actionName: request.actionName,
    ...payload
  });
}

function serviceRequestSessionId(request: BuilderServiceRequest): string {
  if (!request.sessionId) {
    throw new Error(`${request.actionName} requires sessionId`);
  }

  return request.sessionId;
}

function mergeSessionState(snapshot: BuilderSessionSnapshot, state: LocalSessionState | undefined): BuilderSessionSnapshot {
  return BuilderSessionSnapshotSchema.parse({
    ...snapshot,
    activeAssetEdit: state?.activeAssetEdit,
    activeTemplateId: state?.activeTemplateId ?? snapshot.activeTemplateId
  });
}

function normalizedTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function tokenSequenceIncludes(tokens: string[], sequence: string[]): boolean {
  if (sequence.length === 0 || sequence.length > tokens.length) {
    return false;
  }

  return tokens.some((_, index) =>
    sequence.every((token, offset) => tokens[index + offset] === token)
  );
}

function defaultFetch(...args: Parameters<BuilderServiceHttpFetch>): ReturnType<BuilderServiceHttpFetch> {
  const fetcher = (globalThis as { fetch?: BuilderServiceHttpFetch }).fetch;
  if (!fetcher) {
    throw new Error("HTTP service transport requires a fetch implementation");
  }

  return fetcher(...args);
}
