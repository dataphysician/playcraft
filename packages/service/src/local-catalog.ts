import {
  BuilderSessionOwnershipSchema,
  BuilderSessionSnapshotSchema,
  type BuilderAssetEdit,
  type BuilderAssetEditCatalogEntry,
  type BuilderCatalog,
  type BuilderServiceCatalog,
  type BuilderSessionOwnership,
  type BuilderSessionSnapshot,
  type BuilderTemplateId,
  type GameTemplateDefinition
} from "@playcraft/contracts";

export const LOCAL_SERVICE_SESSION_POLICY = {
  defaultAssembleSessionId: "service.session",
  sessionBoundActions: ["update", "preview", "get-session", "export-profile", "import-profile", "request-paid-online-assembly"]
} as const;

export const LOCAL_SERVICE_SESSION_TTL_MS = 60 * 60 * 1000;

export const LOCAL_SERVICE_DEFAULT_OWNER_ID = "service.local.owner";

const LOCAL_SERVICE_SESSION_CAPABILITIES = [
  "assemble",
  "update",
  "preview",
  "get-session",
  "export-profile",
  "import-profile",
  "request-paid-online-assembly"
] as const;

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

export const LOCAL_SERVICE_REQUEST_TIP_EXAMPLES = [
  {
    templateId: "template.memory-match",
    request: "Memory game with dinosaurs"
  },
  {
    templateId: "template.sorting",
    request: "Sorting game with toys"
  },
  {
    templateId: "template.sequence-repeat",
    request: "Sequence repeat with ocean animals"
  }
] as const;

export const LOCAL_SERVICE_REQUEST_TIP_FEATURED_TEMPLATE_IDS = [
  "template.memory-match",
  "template.sorting",
  "template.sequence-repeat"
] as const satisfies readonly BuilderTemplateId[];

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
        exclusiveAnyOf: [["text", "moonshineTranscript"]],
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
        exclusiveAnyOf: [["text", "moonshineTranscript"]],
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
        acceptedFields: ["sessionId", "interaction"],
        requiredFields: ["sessionId", "interaction"],
        requiredAnyOf: [],
        exclusiveAnyOf: [],
        forbiddenTogether: [],
        summary: "Requires sessionId and an explicit preview interaction payload; accepts no input, template, asset, or profile payloads."
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
    },
    {
      actionName: "execute-workflow",
      displayName: "Execute Workflow",
      requiresSession: false,
      acceptsInput: false,
      request: {
        acceptedFields: ["sessionId", "workflow"],
        requiredFields: ["workflow"],
        requiredAnyOf: [],
        exclusiveAnyOf: [],
        forbiddenTogether: [],
        summary: "Requires a deterministic workflow graph; runs up to 20 nodes in topological order, executes each via the same service envelope, and emits AG-UI events per node."
      },
      responsePayload: "execution"
    },
    {
      actionName: "request-paid-online-assembly",
      displayName: "Request Paid Online Assembly",
      requiresSession: true,
      acceptsInput: false,
      request: {
        acceptedFields: ["sessionId", "capabilityGap", "paymentConfirmationId"],
        requiredFields: ["sessionId", "capabilityGap", "paymentConfirmationId"],
        requiredAnyOf: [],
        exclusiveAnyOf: [],
        forbiddenTogether: [],
        summary: "Requires sessionId, capabilityGap, and paymentConfirmationId. The user explicitly consents to the paid assembly cost and ETA before submission."
      },
      responsePayload: "execution"
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

export interface LocalSessionState {
  activeAssetEdit?: BuilderAssetEdit;
  activeTemplateId: BuilderTemplateId;
  ownership?: BuilderSessionOwnership;
}

export function createSessionOwnership(_sessionId: string, nowMs: number): BuilderSessionOwnership {
  const createdAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + LOCAL_SERVICE_SESSION_TTL_MS).toISOString();
  return BuilderSessionOwnershipSchema.parse({
    ownerId: LOCAL_SERVICE_DEFAULT_OWNER_ID,
    createdAt,
    expiresAt,
    capabilities: [...LOCAL_SERVICE_SESSION_CAPABILITIES]
  });
}

export function requestTipsForCatalog(
  templates: GameTemplateDefinition[],
  assetThemes: BuilderAssetEditCatalogEntry[]
): BuilderCatalog["requestTips"] {
  const availableGames = templates.map((template) => template.displayLabel);
  const templateById = new Map(templates.map((template) => [template.id, template]));
  const featuredGames = LOCAL_SERVICE_REQUEST_TIP_FEATURED_TEMPLATE_IDS.map((templateId) =>
    requiredTemplateForRequestTip(templateById, templateId).displayLabel
  );
  const hiddenGameCount = Math.max(0, availableGames.length - featuredGames.length);
  const assetEdits = assetThemes.map((entry) => `with ${entry.displayLabel}`);
  const examples = LOCAL_SERVICE_REQUEST_TIP_EXAMPLES.map((entry) => {
    requiredTemplateForRequestTip(templateById, entry.templateId);
    return entry.request;
  });

  return {
    availableGames,
    featuredGames,
    assetEdits,
    examples,
    summaryLines: [
      `Available games: ${featuredGames.join(", ")}${hiddenGameCount > 0 ? `, plus ${hiddenGameCount} more` : ""}.`,
      `Asset edits: ${assetEdits.join(", ")}.`,
      `Try: ${examples.join("; ")}.`
    ]
  };
}

function requiredTemplateForRequestTip(
  templateById: Map<string, GameTemplateDefinition>,
  templateId: BuilderTemplateId
): GameTemplateDefinition {
  const template = templateById.get(templateId);
  if (!template) {
    throw new Error(`request tip references unknown template ${templateId}`);
  }

  return template;
}

export function mergeSessionState(snapshot: BuilderSessionSnapshot, state: LocalSessionState | undefined): BuilderSessionSnapshot {
  return BuilderSessionSnapshotSchema.parse({
    ...snapshot,
    activeAssetEdit: state?.activeAssetEdit,
    ownership: state?.ownership ?? snapshot.ownership
  });
}