import {
  BuilderCatalogSchema,
  BuilderInputRequestSchema,
  BuilderIntentResolutionSchema,
  BuilderProfileExportSchema,
  BuilderServiceExecutionSchema,
  BuilderServiceRequestSchema,
  BuilderServiceResponseSchema,
  BuilderSessionSnapshotSchema,
  BuilderTemplateIdSchema,
  MoonshineTranscriptRecordSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderAssetEdit,
  type BuilderAssetEditCatalogEntry,
  type BuilderCatalog,
  type BuilderCommand,
  type BuilderInputRequest,
  type BuilderInputSource,
  type BuilderIntentResolution,
  type BuilderProfileExport,
  type BuilderServiceExecution,
  type BuilderServiceRequest,
  type BuilderServiceResponse,
  type BuilderSessionSnapshot,
  type BuilderTemplateId,
  type GameAssemblyProfile,
  type JsonValue,
  type MoonshineTranscriptRecord,
  type MoonshineTranscriptSegment
} from "@playcraft/contracts";
import {
  createBuilderCommandHandler,
  type BuilderCommandHandler,
  type BuilderExecutionResult
} from "@playcraft/builder";
import { gameTemplateDefinitions } from "@playcraft/packs";

export const PLAYCRAFT_SERVICE_PACKAGE = "@playcraft/service";
export const DEFAULT_TEMPLATE_ID = BuilderTemplateIdSchema.parse("template.memory-match");
export const localAssetEditCatalog: BuilderAssetEditCatalogEntry[] = [
  {
    theme: "dinosaurs",
    aliases: ["dinosaur", "dinosaurs"],
    suggestedItems: ["dinosaur-1", "dinosaur-2", "dinosaur-3"]
  },
  {
    theme: "toys",
    aliases: ["toy", "toys"],
    suggestedItems: ["toy-1", "toy-2", "toy-3"]
  },
  {
    theme: "dolphins",
    aliases: ["dolphin", "dolphins", "ocean animals", "sea animals"],
    suggestedItems: ["dolphin-1", "dolphin-2", "dolphin-3"]
  },
  {
    theme: "fruits",
    aliases: ["fruit", "fruits"],
    suggestedItems: ["fruit-1", "fruit-2", "fruit-3"]
  }
];

export interface LocalBuilderInput {
  assetEdit?: BuilderAssetEdit;
  sessionId?: string;
  source?: BuilderInputSource;
  speechTranscript?: MoonshineTranscriptRecord;
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
      defaultTemplateId: DEFAULT_TEMPLATE_ID,
      templates: this.handler.listTemplates(),
      tools: this.handler.listTools(),
      acceptedInputSources: ["text", "speech-transcript"],
      assetEdit: {
        supported: true,
        acceptedKeys: ["theme", "items"],
        maxItems: 12,
        localReplacementFolders: true,
        availableThemes: localAssetEditCatalog
      },
      retrieval: {
        current: "bundled-local",
        planned: "server-catalog"
      }
    });
  }

  assemble(input: LocalBuilderInput): BuilderExecutionResult {
    const sessionId = input.sessionId ?? "service.session";
    const resolved = this.resolveInput(sessionId, input);
    this.updateSessionState(sessionId, resolved);
    return this.execute("assemble-game", sessionId, resolved);
  }

  update(input: LocalBuilderInput & { sessionId: string }): BuilderExecutionResult {
    const resolved = this.resolveInput(input.sessionId, input);
    this.updateSessionState(input.sessionId, resolved);
    return this.execute("update-game", input.sessionId, resolved);
  }

  preview(sessionId = "service.session"): BuilderExecutionResult {
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

  getSession(sessionId = "service.session"): BuilderSessionSnapshot {
    return mergeSessionState(this.handler.getSessionSnapshot(sessionId), this.sessionState.get(sessionId));
  }

  exportProfile(sessionId = "service.session"): BuilderProfileExport {
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
      exportedAt: "2026-07-04T00:00:00.000Z",
      retrieval: {
        current: "bundled-local",
        planned: "server-catalog"
      }
    });
  }

  importProfile(input: { assetEdit?: BuilderAssetEdit; profile: GameAssemblyProfile; sessionId?: string; templateId?: BuilderTemplateId }): BuilderExecutionResult {
    const sessionId = input.sessionId ?? "service.session";
    this.commandCounter += 1;
    const output = this.handler.importProfile(
      sessionId,
      input.profile,
      `builder-command.${sessionId}.${this.commandCounter}`
    );
    this.sessionState.set(sessionId, {
      activeAssetEdit: input.assetEdit,
      activeTemplateId: input.templateId ?? output.result.preview.activeTemplateId
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
      return serviceResponse(request, { session: this.getSession(request.sessionId ?? "service.session") });
    }

    if (request.actionName === "export-profile") {
      return serviceResponse(request, { profileExport: this.exportProfile(request.sessionId ?? "service.session") });
    }

    if (request.actionName === "import-profile") {
      const profileExport = request.profileExport;
      const profile = request.profile ?? profileExport?.profile;
      if (!profile) {
        throw new Error("import-profile requires profile or profileExport");
      }
      const output = this.importProfile({
        assetEdit: request.assetEdit ?? profileExport?.assetEdit,
        profile,
        sessionId: request.sessionId ?? profileExport?.sessionId,
        templateId: request.templateId ?? profileExport?.templateId
      });
      return serviceResponse(request, {
        execution: serializeExecution(output),
        session: this.getSession(output.result.sessionId)
      });
    }

    if (request.actionName === "preview") {
      const sessionId = request.sessionId ?? "service.session";
      return serviceResponse(request, {
        execution: serializeExecution(this.preview(sessionId)),
        session: this.getSession(sessionId)
      });
    }

    if (request.actionName === "assemble") {
      const sessionId = request.sessionId ?? "service.session";
      const output = this.assemble({
        assetEdit: request.assetEdit,
        sessionId,
        source: sourceForServiceRequest(request),
        speechTranscript: request.speechTranscript,
        templateId: request.templateId,
        text: textForServiceRequest(request)
      });
      return serviceResponse(request, {
        execution: serializeExecution(output),
        session: this.getSession(sessionId)
      });
    }

    const sessionId = request.sessionId ?? "service.session";
    const output = this.update({
      assetEdit: request.assetEdit,
      sessionId,
      source: sourceForServiceRequest(request),
      speechTranscript: request.speechTranscript,
      templateId: request.templateId,
      text: textForServiceRequest(request)
    });
    return serviceResponse(request, {
      execution: serializeExecution(output),
      session: this.getSession(sessionId)
    });
  }

  private resolveInput(sessionId: string, input: LocalBuilderInput): ResolvedBuilderInputCommand {
    this.inputCounter += 1;
    const state = this.sessionState.get(sessionId);
    return resolveBuilderInputCommand({
      activeAssetEdit: state?.activeAssetEdit,
      activeTemplateId: state?.activeTemplateId ?? DEFAULT_TEMPLATE_ID,
      assetEdit: input.assetEdit,
      sequence: this.inputCounter,
      source: input.source ?? "text",
      speechTranscript: input.speechTranscript,
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

export function resolveBuilderInputCommand(input: {
  activeAssetEdit?: BuilderAssetEdit;
  activeTemplateId?: BuilderTemplateId;
  assetEdit?: BuilderAssetEdit;
  sequence: number;
  source: BuilderInputSource;
  speechTranscript?: MoonshineTranscriptRecord;
  templateId?: BuilderTemplateId;
  text: string;
}): ResolvedBuilderInputCommand {
  const commandText = input.text.trim();
  const request = createBuilderInputRequest({
    sequence: input.sequence,
    source: input.source,
    speechTranscript: input.speechTranscript,
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
  speechTranscript?: MoonshineTranscriptRecord;
  text: string;
}): BuilderInputRequest {
  const speechTranscript =
    input.source === "speech-transcript"
      ? input.speechTranscript
      : undefined;
  const text = speechTranscript?.text ?? input.text;

  return BuilderInputRequestSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-input.local.${input.sequence}`,
    version: "1.0.0",
    kind: "builder-input",
    inputId: `builder-input.local.${input.sequence}`,
    source: input.source,
    text,
    transcription: input.source === "speech-transcript" ? MOONSHINE_STREAMING_CPU_TRANSCRIPTION : undefined,
    speechTranscript,
    receivedAt: "2026-07-04T00:00:00.000Z",
    metadata: {
      origin: "playcraft.local-service",
      ...(speechTranscript ? { speechTranscriptId: speechTranscript.transcriptId } : {})
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
    receivedAt: input.receivedAt ?? "2026-07-04T00:00:00.000Z",
    segments: input.segments ?? [],
    metadata: {
      origin: "playcraft.local-moonshine-streaming-cpu",
      ...input.metadata
    }
  });
}

function sourceForServiceRequest(request: BuilderServiceRequest): BuilderInputSource {
  if (request.speechTranscript) {
    return "speech-transcript";
  }

  return request.source ?? "text";
}

function textForServiceRequest(request: BuilderServiceRequest): string {
  return request.speechTranscript?.text ?? request.text ?? "";
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
    return { source: "text-match", templateId: input.matchedTemplateIds[0] };
  }

  if (input.matchedTemplateIds.length > 1) {
    return {
      source: "ambiguous-template-match",
      templateId: input.activeTemplateId ?? DEFAULT_TEMPLATE_ID
    };
  }

  if (input.activeTemplateId) {
    return { source: "active-template", templateId: input.activeTemplateId };
  }

  return { source: "default-template", templateId: DEFAULT_TEMPLATE_ID };
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
  const match =
    matchAssetTheme(normalized, /\breplace\s+(?:the\s+)?(?:assets?|cards?|card images?|images?|art)\s+with\s+([a-z0-9][a-z0-9 ,.-]{1,80})/u, "freeform-asset-request") ??
    matchAssetTheme(normalized, /\b(?:assets?|cards?|card images?|images?|art|theme)\s+(?:to|with|as|for)\s+([a-z0-9][a-z0-9 ,.-]{1,80})/u, "freeform-asset-request") ??
    matchCatalogAssetTheme(normalized, /\b(?:make|change|switch|update)\s+(?:it|this|them)\s+(?:(?:to|with|as|for)\s+)?([a-z0-9][a-z0-9 ,.-]{1,80})/u) ??
    matchAssetTheme(normalized, /\b(?:memory|match|matching|sort|sorting|sequence|repeat)?\s*(?:game|profile|challenge)\s+(?:to|with|as|for)\s+([a-z0-9][a-z0-9 ,.-]{1,80})/u, "freeform-asset-request") ??
    matchAssetTheme(normalized, /\b(?:with|using|about|featuring)\s+([a-z0-9][a-z0-9 ,.-]{1,80})/u, "freeform-asset-request");

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

function matchCatalogAssetTheme(
  text: string,
  pattern: RegExp
): { source: "catalog-asset-alias"; theme: string } | undefined {
  const match = pattern.exec(text);
  if (!match) {
    return undefined;
  }

  const candidate = cleanAssetTheme(match[1]);
  return candidate.length > 0 && isKnownAssetTheme(candidate)
    ? { source: "catalog-asset-alias", theme: candidate }
    : undefined;
}

function matchAssetTheme(
  text: string,
  pattern: RegExp,
  source: TextAssetEdit["source"]
): { source: TextAssetEdit["source"]; theme: string } | undefined {
  const match = pattern.exec(text);
  if (!match) {
    return undefined;
  }

  const candidate = cleanAssetTheme(match[1]);
  if (candidate.length === 0 || isTemplateOnlyTheme(candidate)) {
    return undefined;
  }

  const matchedSource = isKnownAssetTheme(candidate) ? "catalog-asset-alias" : source;
  return { source: matchedSource, theme: candidate };
}

function isKnownAssetTheme(value: string): boolean {
  const tokens = normalizedTokens(value).join(" ");
  return localAssetEditCatalog.some((entry) =>
    [entry.theme, ...entry.aliases].some((alias) => normalizedTokens(alias).join(" ") === tokens)
  );
}

function isTemplateOnlyTheme(value: string): boolean {
  return /^(?:memory|match|matching|sort|sorting|sequence|repeat|pattern)$/u.test(value);
}

function cleanAssetTheme(value: string): string {
  return value
    .split(/[.!?;]/u)[0]
    .replace(/\b(?:game|profile|challenge|assets?|cards?|card images?|images?|art|theme)\b/gu, " ")
    .replace(/\b(?:a|an|the)\b/gu, " ")
    .replace(/[^a-z0-9 ,.-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 80);
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
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
