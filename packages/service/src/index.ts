import {
  BuilderCatalogSchema,
  BuilderProfileExportSchema,
  BuilderServiceErrorSchema,
  BuilderServiceExecutionSchema,
  BuilderServiceRequestSchema,
  BuilderServiceRequestBatchSchema,
  BuilderServiceResponseSchema,
  JsonValueSchema,
  PLAYCRAFT_LOCAL_TIMESTAMP,
  PLAYCRAFT_SCHEMA_VERSION,
  WorkflowGraphSchema,
  type BuilderAssetEdit,
  type BuilderCatalog,
  type BuilderCommand,
  type BuilderInputSource,
  type BuilderPreviewInteraction,
  type BuilderProfileExport,
  type BuilderServiceActionName,
  type BuilderServiceError,
  type BuilderServiceRequest,
  type BuilderServiceRequestBatch,
  type BuilderServiceResponse,
  type BuilderSessionSnapshot,
  type BuilderTemplateId,
  type GameAssemblyProfile,
  type JsonValue,
  type MoonshineTranscriptRecord,
  type SseFrame,
  type AgUiEventEnvelopeContract
} from "@playcraft/contracts";
import {
  localAssetEditCatalog,
  localAssetEditFreeformItemSuffixes,
  localAssetEditGenericThemeTokens,
  localAssetEditMaxItems
} from "@playcraft/assets";
import {
  createBuilderCommandHandler,
  type BuilderCommandHandler,
  type BuilderExecutionResult
} from "@playcraft/builder";
import { DEFAULT_GAME_TEMPLATE_ID } from "@playcraft/packs";
import { agUiEventToSseFrame, type AgUiEventLike } from "./sse.js";
import { executeWorkflowSync as executeWorkflowGraphSync } from "./workflow/executor.js";
import {
  LOCAL_SERVICE_CATALOG,
  LOCAL_SERVICE_DEFAULT_OWNER_ID,
  LOCAL_SERVICE_INPUT_POLICY,
  LOCAL_SERVICE_SESSION_POLICY,
  createSessionOwnership,
  mergeSessionState,
  requestTipsForCatalog,
  type LocalSessionState
} from "./local-catalog.js";
import {
  resolveBuilderInputCommand,
  sourceForServiceRequest,
  textForServiceRequest,
  type ResolvedBuilderInputCommand
} from "./intent-resolution.js";
import {
  buildWorkflowCommandResult,
  defaultFetch,
  requireResultTemplateId,
  serializeExecution,
  serviceRequestSessionId,
  serviceResponse,
  streamRunId,
  type BuilderServiceHttpFetch,
  type BuilderServiceHttpFetchResponse
} from "./json-helpers.js";
export { executeWorkflow, executeWorkflowSse, executeWorkflowSync } from "./workflow/executor.js";
export { WorkflowGraphSchema, WorkflowNodeSchema, WorkflowEdgeSchema, WorkflowConditionSchema, WORKFLOW_NODE_CAP } from "./workflow/schema.js";

export const PLAYCRAFT_SERVICE_PACKAGE = "@playcraft/service";
export { localAssetEditCatalog } from "@playcraft/assets";

export {
  LOCAL_SERVICE_CATALOG,
  LOCAL_SERVICE_DEFAULT_OWNER_ID,
  LOCAL_SERVICE_INPUT_POLICY,
  LOCAL_SERVICE_SESSION_POLICY
} from "./local-catalog.js";

export {
  LOCAL_SERVICE_REQUEST_TIP_EXAMPLES,
  LOCAL_SERVICE_REQUEST_TIP_FEATURED_TEMPLATE_IDS,
  LOCAL_SERVICE_SESSION_TTL_MS
} from "./local-catalog.js";

export { MOONSHINE_STREAMING_CPU_CONFIG } from "./intent-resolution.js";

export { resolveBuilderInputCommand } from "./intent-resolution.js";

export interface LocalBuilderInput {
  assetEdit?: BuilderAssetEdit;
  sessionId?: string;
  source?: BuilderInputSource;
  moonshineTranscript?: MoonshineTranscriptRecord;
  templateId?: BuilderTemplateId;
  text?: string;
}

export type { ResolvedBuilderInputCommand } from "./intent-resolution.js";

export interface BuilderServiceTransport {
  send(request: BuilderServiceRequest): BuilderServiceResponse | Promise<BuilderServiceResponse>;
}

export interface BuilderServiceHttpResponse {
  body: string;
  headers: Record<string, string>;
  status: number;
}

export type { BuilderServiceHttpFetch, BuilderServiceHttpFetchResponse };

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
        maxItems: localAssetEditMaxItems,
        localReplacementFolders: true,
        freeformItemSuffixes: localAssetEditFreeformItemSuffixes,
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
    const state = this.sessionState.get(sessionId);
    const resolved = this.resolveInput(sessionId, input, {
      activeTemplateId: state?.activeTemplateId
    });
    this.updateSessionState(sessionId, resolved);
    return this.execute("assemble-game", sessionId, resolved);
  }

  update(input: LocalBuilderInput & { sessionId: string }): BuilderExecutionResult {
    const activeSession = this.requireActiveSessionForUpdate(input.sessionId);
    const resolved = this.resolveInput(input.sessionId, input, {
      activeTemplateId: activeSession.activeTemplateId
    });
    this.refreshSessionOwnership(input.sessionId);
    this.updateSessionState(input.sessionId, resolved);
    return this.execute("update-game", input.sessionId, resolved);
  }

  preview(sessionId: string, interaction: BuilderPreviewInteraction): BuilderExecutionResult {
    this.commandCounter += 1;
    const output = this.handler.execute({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-command.${sessionId}.${this.commandCounter}`,
      version: "1.0.0",
      kind: "builder-command",
      sessionId,
      actionName: "preview-action",
      interaction
    });
    this.refreshSessionStateFromResult(sessionId, output.result, false);
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
      activeTemplateId: requireResultTemplateId(output.result),
      ownership: createSessionOwnership(sessionId, this.now())
    });
    return output;
  }

  reset(input?: { ownerId?: string }): { kind: "ownership-mismatch"; ownerId: string } | undefined {
    if (input?.ownerId !== undefined) {
      const owners = new Set<string>();
      for (const state of this.sessionState.values()) {
        if (state.ownership) {
          owners.add(state.ownership.ownerId);
        }
      }
      const currentOwner = [...owners][0] ?? LOCAL_SERVICE_DEFAULT_OWNER_ID;
      if (input.ownerId !== currentOwner) {
        return { kind: "ownership-mismatch", ownerId: input.ownerId };
      }
    }

    this.inputCounter = 0;
    this.commandCounter = 0;
    this.sessionState.clear();
    return undefined;
  }

  executeWorkflow(requestInput: BuilderServiceRequest): BuilderServiceResponse {
    const request = BuilderServiceRequestSchema.parse(requestInput);
    if (request.actionName !== "execute-workflow") {
      throw new Error(`executeWorkflow() received unexpected action ${request.actionName}`);
    }
    if (!request.workflow) {
      throw new Error("execute-workflow requires a workflow graph");
    }

    const sessionId = request.sessionId ?? this.catalog().sessions.defaultAssembleSessionId;
    const graph = WorkflowGraphSchema.parse(request.workflow);
    const events: AgUiEventLike[] = [];
    let sequence = 0;
    let commandResult: BuilderExecutionResult["result"] | undefined;

    for (const workflowEvent of executeWorkflowGraphSync(graph, { send: (request) => this.handle(request) }, sessionId)) {
      if (workflowEvent.kind === "node-finished") {
        events.push(toolResultEnvelope(workflowEvent.runId, sequence, workflowEvent.toolName, workflowEvent.result));
        sequence += 1;
      } else if (workflowEvent.kind === "node-failed") {
        events.push(toolResultEnvelope(workflowEvent.runId, sequence, workflowEvent.toolName, { error: workflowEvent.error }));
        sequence += 1;
      } else if (workflowEvent.kind === "node-skipped") {
        events.push(toolResultEnvelope(workflowEvent.runId, sequence, workflowEvent.toolName, { skipped: true, reason: workflowEvent.reason }));
        sequence += 1;
      } else if (workflowEvent.kind === "node-started") {
        events.push(toolCallEnvelope(workflowEvent.runId, sequence, workflowEvent.toolName, workflowEvent.args));
        sequence += 1;
      } else if (workflowEvent.kind === "workflow-finished") {
        events.push(runFinishedEnvelope(workflowEvent.runId, sequence, {
          runId: workflowEvent.runId,
          graphId: workflowEvent.graphId,
          executed: workflowEvent.executed,
          skipped: workflowEvent.skipped,
          failed: workflowEvent.failed,
          success: workflowEvent.success
        }));
        sequence += 1;
        commandResult = buildWorkflowCommandResult(workflowEvent.runId, sessionId, workflowEvent.executed.length);
      }
    }

    if (!commandResult) {
      throw new Error("workflow executor finished without emitting a workflow-finished event");
    }

    return serviceResponse(request, {
      execution: BuilderServiceExecutionSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        result: commandResult,
        events
      })
    });
  }

  handle(requestInput: BuilderServiceRequest): BuilderServiceResponse {
    const request = BuilderServiceRequestSchema.parse(requestInput);

    if (request.actionName === "catalog") {
      return serviceResponse(request, { catalog: this.catalog() });
    }

    if (request.actionName === "reset") {
      const mismatch = this.reset();
      if (mismatch) {
        return serviceResponse(request, { error: mismatch });
      }
      return serviceResponse(request, { reset: true });
    }

    if (request.actionName === "execute-workflow") {
      return this.executeWorkflow(request);
    }

    const sessionBoundError = this.checkSessionBoundOwnership(request);
    if (sessionBoundError) {
      return serviceResponse(request, {
        error: sessionBoundError,
        session: this.getSession(sessionBoundError.sessionId ?? serviceRequestSessionId(request))
      });
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
      if (!request.interaction) {
        throw new Error("preview requires interaction");
      }
      return serviceResponse(request, {
        execution: serializeExecution(this.preview(sessionId, request.interaction)),
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

  private checkSessionBoundOwnership(request: BuilderServiceRequest): BuilderServiceError | undefined {
    const sessionBoundActions = LOCAL_SERVICE_SESSION_POLICY.sessionBoundActions as readonly BuilderServiceActionName[];
    if (!sessionBoundActions.includes(request.actionName)) {
      return undefined;
    }

    if (!request.sessionId) {
      return undefined;
    }

    return this.checkSessionExpiry(request.sessionId);
  }

  /**
   * Returns a `session-expired` error when the tracked ownership for `sessionId`
   * is past its `expiresAt` timestamp. Sessions without an ownership record are
   * intentionally treated as non-expired so newly-created sessions remain
   * writable until their first ownership write. The MCP HTTP endpoint uses
   * this for ownership enforcement on `POST /playcraft/tools/call`.
   */
  checkSessionExpiry(sessionId: string): BuilderServiceError | undefined {
    const snapshot = this.getSession(sessionId);
    if (!snapshot.ownership) {
      return undefined;
    }

    const expiresAtMs = new Date(snapshot.ownership.expiresAt).getTime();
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) {
      return BuilderServiceErrorSchema.parse({
        kind: "session-expired",
        sessionId,
        ownerId: snapshot.ownership.ownerId,
        message: `session ${sessionId} expired at ${snapshot.ownership.expiresAt}`
      });
    }

    return undefined;
  }

  handleBatch(requestInputs: BuilderServiceRequestBatch): BuilderServiceResponse[] {
    return BuilderServiceRequestBatchSchema.parse(requestInputs).map((request) => this.handle(request));
  }

  private resolveInput(
    sessionId: string,
    input: LocalBuilderInput,
    active: { activeTemplateId?: BuilderTemplateId }
  ): ResolvedBuilderInputCommand {
    this.inputCounter += 1;
    const state = this.sessionState.get(sessionId);
    return resolveBuilderInputCommand({
      activeAssetEdit: state?.activeAssetEdit,
      activeTemplateId: active.activeTemplateId,
      assetEdit: input.assetEdit,
      sequence: this.inputCounter,
      source: input.source ?? this.catalog().input.defaultSource,
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
    this.refreshSessionStateFromResult(sessionId, output.result, actionName === "assemble-game");
    return output;
  }

  private updateSessionState(sessionId: string, resolved: ResolvedBuilderInputCommand): void {
    this.sessionState.set(sessionId, {
      activeAssetEdit: resolved.assetEdit,
      activeTemplateId: resolved.templateId,
      ownership: createSessionOwnership(sessionId, this.now())
    });
  }

  private refreshSessionStateFromResult(sessionId: string, result: BuilderExecutionResult["result"], refreshOwnership: boolean): void {
    const existing = this.sessionState.get(sessionId);
    this.sessionState.set(sessionId, {
      activeAssetEdit: existing?.activeAssetEdit,
      activeTemplateId: requireResultTemplateId(result),
      ownership: refreshOwnership || !existing?.ownership
        ? createSessionOwnership(sessionId, this.now())
        : existing.ownership
    });
  }

  private refreshSessionOwnership(sessionId: string): void {
    const existing = this.sessionState.get(sessionId);
    this.sessionState.set(sessionId, {
      ...existing,
      activeTemplateId: existing?.activeTemplateId ?? DEFAULT_GAME_TEMPLATE_ID,
      ownership: createSessionOwnership(sessionId, this.now())
    });
  }

  private now(): number {
    return Date.now();
  }

  private requireActiveSessionForUpdate(sessionId: string): BuilderSessionSnapshot & {
    activeTemplateId: BuilderTemplateId;
    profile: GameAssemblyProfile;
  } {
    const snapshot = this.getSession(sessionId);
    if (!snapshot.profile || !snapshot.activeTemplateId) {
      throw new Error(`update requires an active session ${sessionId}; assemble a game before updating`);
    }

    return {
      ...snapshot,
      activeTemplateId: snapshot.activeTemplateId,
      profile: snapshot.profile
    };
  }

  async *stream(request: BuilderServiceRequest): AsyncIterable<SseFrame> {
    const validated = BuilderServiceRequestSchema.parse(request);

    try {
      const response = this.handle(validated);

      if (response.execution) {
        for (const [sequence, event] of response.execution.events.entries()) {
          yield agUiEventToSseFrame(agUiEventFromEnvelope(event), sequence);
        }
        return;
      }

      const runId = streamRunId();
      yield { kind: "sse-run-started", runId, sequence: 0, payload: { runId } };
      yield {
        kind: "sse-custom",
        runId,
        sequence: 1,
        payload: JsonValueSchema.parse(response)
      };
      yield { kind: "sse-run-finished", runId, sequence: 2, payload: { runId } };
    } catch (error) {
      const runId = streamRunId();
      const message = error instanceof Error ? error.message : String(error);
      yield { kind: "sse-run-started", runId, sequence: 0, payload: { runId } };
      yield { kind: "sse-run-error", runId, sequence: 1, payload: { message } };
      yield { kind: "sse-run-finished", runId, sequence: 2, payload: { runId } };
    }
  }
}

function envelopeEventId(runId: string, kind: string, sequence: number): string {
  return `${runId}.${kind}.${String(sequence).padStart(4, "0")}`;
}

function agUiEventFromEnvelope(envelope: AgUiEventEnvelopeContract): AgUiEventLike {
  return {
    type: envelope.type,
    eventId: envelope.eventId,
    runId: envelope.runId,
    timestamp: envelope.timestamp,
    value: envelope.value
  };
}

function toolCallEnvelope(runId: string, sequence: number, toolName: string, args: JsonValue): AgUiEventLike {
  return {
    type: "ToolCall",
    eventId: envelopeEventId(runId, "call", sequence),
    runId,
    timestamp: PLAYCRAFT_LOCAL_TIMESTAMP,
    value: { toolName, args }
  };
}

function toolResultEnvelope(runId: string, sequence: number, toolName: string, result: JsonValue): AgUiEventLike {
  return {
    type: "ToolResult",
    eventId: envelopeEventId(runId, "result", sequence),
    runId,
    timestamp: PLAYCRAFT_LOCAL_TIMESTAMP,
    value: { toolName, result }
  };
}

function runFinishedEnvelope(runId: string, sequence: number, value: Record<string, JsonValue>): AgUiEventLike {
  return {
    type: "RunFinished",
    eventId: envelopeEventId(runId, "finished", sequence),
    runId,
    timestamp: PLAYCRAFT_LOCAL_TIMESTAMP,
    value
  };
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

export { createMoonshineTranscriptRecord } from "./json-helpers.js";