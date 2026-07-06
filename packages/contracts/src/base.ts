import { z } from "zod";

export const PLAYCRAFT_SCHEMA_VERSION = "playcraft.v1";
export const PLAYCRAFT_LOCAL_TIMESTAMP = "2026-07-04T00:00:00.000Z";

export const StableIdSchema = z
  .string()
  .min(3)
  .max(96)
  .regex(/^[a-z0-9][a-z0-9.-]*$/u, "stable IDs use lowercase letters, numbers, dots, and hyphens");
export type StableId = z.infer<typeof StableIdSchema>;

export const VersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/u, "versions must be semver-like");
export type Version = z.infer<typeof VersionSchema>;

export const CapabilityTagSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9:-]*$/u);
export type CapabilityTag = z.infer<typeof CapabilityTagSchema>;

export const AgeBandSchema = z.enum(["2-3", "4-6", "7-9", "10-12", "adult"]);
export type AgeBand = z.infer<typeof AgeBandSchema>;

export const InputModalitySchema = z.enum(["touch", "pointer", "keyboard"]);
export type InputModality = z.infer<typeof InputModalitySchema>;

export const AssetContentTypeSchema = z.enum(["image", "audio", "animation", "text"]);
export type AssetContentType = z.infer<typeof AssetContentTypeSchema>;

export const AssetFormatSchema = z.enum(["svg", "png", "webp", "mp3", "wav", "json", "plain-text"]);
export type AssetFormat = z.infer<typeof AssetFormatSchema>;

export const SafetyStatusSchema = z.enum(["safe", "blocked", "needs-review"]);
export type SafetyStatus = z.infer<typeof SafetyStatusSchema>;

export const ValidationSeveritySchema = z.enum(["error", "warning", "info"]);
export type ValidationSeverity = z.infer<typeof ValidationSeveritySchema>;

export const JsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export type JsonValue = z.infer<typeof JsonPrimitiveSchema> | JsonValue[] | { [key: string]: JsonValue };
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([JsonPrimitiveSchema, z.array(JsonValueSchema), z.record(JsonValueSchema)])
);

export type JsonField = {
  type: "string" | "number" | "boolean" | "object" | "array" | "record";
  required?: boolean;
  minItems?: number;
  allowedValues?: z.infer<typeof JsonPrimitiveSchema>[];
  fields?: Record<string, JsonField>;
  allowUnknown?: boolean;
};

export const JsonFieldSchema: z.ZodType<JsonField> = z.lazy(() =>
  z
    .object({
      type: z.enum(["string", "number", "boolean", "object", "array", "record"]),
      required: z.boolean().default(true),
      minItems: z.number().int().nonnegative().optional(),
      allowedValues: z.array(JsonPrimitiveSchema).optional(),
      fields: z.record(JsonFieldSchema).optional(),
      allowUnknown: z.boolean().optional()
    })
    .strict()
);

export const JsonObjectSchemaDescriptorSchema = z
  .object({
    schemaVersion: z.literal(PLAYCRAFT_SCHEMA_VERSION),
    type: z.literal("object"),
    fields: z.record(JsonFieldSchema),
    allowUnknown: z.boolean().default(false)
  })
  .strict();
export type JsonObjectSchemaDescriptor = z.infer<typeof JsonObjectSchemaDescriptorSchema>;

export const SchemaIssueSchema = z
  .object({
    path: z.array(z.union([z.string(), z.number()])),
    code: z.string().min(1),
    message: z.string().min(1),
    severity: ValidationSeveritySchema
  })
  .strict();
export type SchemaIssue = z.infer<typeof SchemaIssueSchema>;

export const CompatibilityConstraintsSchema = z
  .object({
    domainProfileIds: z.array(StableIdSchema).default([]),
    safetyPolicyIds: z.array(StableIdSchema).default([]),
    ageBands: z.array(AgeBandSchema).default([]),
    modalities: z.array(InputModalitySchema).default([]),
    requiredCapabilities: z.array(CapabilityTagSchema).default([]),
    assetContentTypes: z.array(AssetContentTypeSchema).default([])
  })
  .strict();
export type CompatibilityConstraints = z.infer<typeof CompatibilityConstraintsSchema>;

export const PublicContractBaseSchema = z
  .object({
    schemaVersion: z.literal(PLAYCRAFT_SCHEMA_VERSION),
    id: StableIdSchema,
    version: VersionSchema
  })
  .strict();
export type PublicContractBase = z.infer<typeof PublicContractBaseSchema>;

export const PublicContractNameSchema = z.enum([
  "PlaycraftAssemblyRequestSchema",
  "DomainProfileSchema",
  "SafetyPolicyPackSchema",
  "GameAssemblyProfileSchema",
  "MechanicDefinitionSchema",
  "RuleModuleDefinitionSchema",
  "ComponentManifestSchema",
  "ComponentRenderRequestSchema",
  "ThemePackSchema",
  "FrontendToolDefinitionSchema",
  "AssetGenerationRequestSchema",
  "AssetSourceCapabilityManifestSchema",
  "GeneratedAssetRecordSchema",
  "AssemblyValidationResultSchema",
  "PlaycraftAgUiEventEnvelopeSchema",
  "PlaycraftEventRecordSchema",
  "PackManifestSchema",
  "GameProfileTemplateSnapshotSchema",
  "GameTemplateDefinitionSchema",
  "MoonshineTranscriptRecordSchema",
  "BuilderInputRequestSchema",
  "BuilderToolDefinitionSchema",
  "BuilderCatalogSchema",
  "BuilderIntentResolutionSchema",
  "BuilderCommandSchema",
  "BuilderPreviewStateSchema",
  "BuilderCommandResultSchema",
  "BuilderSessionSnapshotSchema",
  "BuilderProfileExportSchema",
  "BuilderServiceExecutionSchema",
  "BuilderServiceRequestSchema",
  "BuilderServiceRequestBatchSchema",
  "BuilderServiceResponseSchema",
  "McpManifestSchema",
  "McpServerPolicySchema",
  "WorkflowGraphSchema",
  "AssetCatalogManifestSchema"
]);
export type PublicContractName = z.infer<typeof PublicContractNameSchema>;

export const BuilderTemplateIdSchema = StableIdSchema.refine((value) => value.startsWith("template."), {
  message: "builder template IDs must start with template."
});
export type BuilderTemplateId = z.infer<typeof BuilderTemplateIdSchema>;

export const GameTemplateAssetPromptKindSchema = z.enum([
  "memory-cards",
  "sorting-game",
  "sequence-buttons",
  "general-game"
]);
export type GameTemplateAssetPromptKind = z.infer<typeof GameTemplateAssetPromptKindSchema>;

export const GameTemplateAssetEditOperationKindSchema = z.enum([
  "memory-pairs",
  "choice-items",
  "sorting-items",
  "sequence-items",
  "completion-message",
  "hint-message"
]);
export type GameTemplateAssetEditOperationKind = z.infer<typeof GameTemplateAssetEditOperationKindSchema>;

export const GameTemplateAssetEditOperationSchema = z
  .object({
    componentCapability: CapabilityTagSchema,
    operation: GameTemplateAssetEditOperationKindSchema
  })
  .strict();
export type GameTemplateAssetEditOperation = z.infer<typeof GameTemplateAssetEditOperationSchema>;

export const GameTemplateLiveSurfaceKindSchema = z.enum(["memory", "sorting", "sequence"]);
export type GameTemplateLiveSurfaceKind = z.infer<typeof GameTemplateLiveSurfaceKindSchema>;

export const GameTemplateLiveSurfaceComponentCapabilitiesSchema = z
  .object({
    primary: CapabilityTagSchema,
    choice: CapabilityTagSchema.optional()
  })
  .strict();
export type GameTemplateLiveSurfaceComponentCapabilities = z.infer<typeof GameTemplateLiveSurfaceComponentCapabilitiesSchema>;

export const GameTemplateLiveSurfaceComponentRoleSchema = z.enum(["primary", "choice"]);
export type GameTemplateLiveSurfaceComponentRole = z.infer<typeof GameTemplateLiveSurfaceComponentRoleSchema>;

export const GameTemplateAssetReplacementNamespaceSchema = z.enum(["card", "choice", "item"]);
export type GameTemplateAssetReplacementNamespace = z.infer<typeof GameTemplateAssetReplacementNamespaceSchema>;

export const GameTemplateAssetReplacementSourceSchema = z
  .object({
    componentRole: GameTemplateLiveSurfaceComponentRoleSchema,
    prop: z.string().min(1).max(80),
    namespace: GameTemplateAssetReplacementNamespaceSchema,
    pairMapProp: z.string().min(1).max(80).optional()
  })
  .strict();
export type GameTemplateAssetReplacementSource = z.infer<typeof GameTemplateAssetReplacementSourceSchema>;

export const GameTemplateTokenStyleSchema = z
  .object({
    tokens: z.array(z.string().min(1).max(80)).min(1),
    background: z.string().min(1).max(32),
    border: z.string().min(1).max(32),
    foreground: z.string().min(1).max(32),
    accent: z.string().min(1).max(32)
  })
  .strict();
export type GameTemplateTokenStyle = z.infer<typeof GameTemplateTokenStyleSchema>;

export const BuilderInputSourceSchema = z.enum(["text", "moonshine-transcript"]);
export type BuilderInputSource = z.infer<typeof BuilderInputSourceSchema>;

export const BuilderInputSourceOptionSchema = z
  .object({
    source: BuilderInputSourceSchema,
    displayLabel: z.string().min(1).max(40),
    generatePlaceholder: z.string().min(1).max(120),
    updatePlaceholder: z.string().min(1).max(120)
  })
  .strict();
export type BuilderInputSourceOption = z.infer<typeof BuilderInputSourceOptionSchema>;

export const MoonshineStreamingCpuConfigSchema = z
  .object({
    engine: z.literal("moonshine-streaming"),
    runtime: z.literal("cpu"),
    localOnly: z.literal(true)
  })
  .strict();
export type MoonshineStreamingCpuConfig = z.infer<typeof MoonshineStreamingCpuConfigSchema>;

export const MoonshineTranscriptSegmentSchema = z
  .object({
    text: z.string().min(1).max(160),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative()
  })
  .strict()
  .refine((value) => value.endMs >= value.startMs, {
    message: "transcript segment endMs must be greater than or equal to startMs",
    path: ["endMs"]
  });
export type MoonshineTranscriptSegment = z.infer<typeof MoonshineTranscriptSegmentSchema>;

export const MoonshineTranscriptRecordSchema = PublicContractBaseSchema.extend({
  kind: z.literal("moonshine-transcript"),
  transcriptId: StableIdSchema,
  engine: z.literal("moonshine-streaming"),
  runtime: z.literal("cpu"),
  localOnly: z.literal(true),
  finalized: z.literal(true),
  text: z.string().min(1).max(500),
  receivedAt: z.string().datetime(),
  segments: z.array(MoonshineTranscriptSegmentSchema).default([]),
  metadata: z.record(JsonValueSchema).default({})
}).strict();
export type MoonshineTranscriptRecord = z.infer<typeof MoonshineTranscriptRecordSchema>;

export const BuilderInputRequestSchema = PublicContractBaseSchema.extend({
  kind: z.literal("builder-input"),
  inputId: StableIdSchema,
  source: BuilderInputSourceSchema,
  text: z.string().min(1).max(500),
  moonshineConfig: MoonshineStreamingCpuConfigSchema.optional(),
  moonshineTranscript: MoonshineTranscriptRecordSchema.optional(),
  receivedAt: z.string().datetime(),
  metadata: z.record(JsonValueSchema).default({})
}).strict()
  .refine((value) => value.source !== "moonshine-transcript" || Boolean(value.moonshineConfig), {
    message: "Moonshine transcripts must declare the local Moonshine config",
    path: ["moonshineConfig"]
  })
  .refine((value) => value.source !== "moonshine-transcript" || Boolean(value.moonshineTranscript), {
    message: "moonshine-transcript input requires a Moonshine transcript record",
    path: ["moonshineTranscript"]
  })
  .refine((value) => value.source !== "text" || (!value.moonshineConfig && !value.moonshineTranscript), {
    message: "text input must not include Moonshine config or transcript records",
    path: ["moonshineConfig"]
  })
  .refine((value) => !value.moonshineTranscript || value.source === "moonshine-transcript", {
    message: "Moonshine transcript records require moonshine-transcript source",
    path: ["source"]
  })
  .refine((value) => !value.moonshineTranscript || value.moonshineTranscript.text === value.text, {
    message: "Moonshine transcript record text must match builder input text",
    path: ["moonshineTranscript"]
  });
export type BuilderInputRequest = z.infer<typeof BuilderInputRequestSchema>;

export const BuilderActionNameSchema = z.enum([
  "assemble-game",
  "update-game",
  "preview-action",
  "list-builder-tools",
  "get-session",
  "export-profile",
  "import-profile"
]);
export type BuilderActionName = z.infer<typeof BuilderActionNameSchema>;

export const BuilderToolDefinitionSchema = PublicContractBaseSchema.extend({
  kind: z.literal("builder-tool"),
  toolName: CapabilityTagSchema,
  displayName: z.string().min(1),
  description: z.string().min(1),
  actionName: BuilderActionNameSchema,
  argumentsSchema: JsonObjectSchemaDescriptorSchema,
  argumentSummary: z.string().min(1).max(240),
  acceptedInputSources: z.array(BuilderInputSourceSchema).default([]),
  inputSourceSummary: z.string().min(1).max(120),
  localOnly: z.boolean(),
  emittedEvents: z.array(CapabilityTagSchema).default([]),
  requiredContracts: z.array(PublicContractNameSchema).min(1)
}).strict()
  .superRefine((value, context) => {
    addDuplicateBuilderInputSourceIssues(context, value.acceptedInputSources, ["acceptedInputSources"]);

    const acceptsInput = builderActionAcceptsInput(value.actionName);
    if (acceptsInput) {
      for (const source of BuilderInputSourceSchema.options) {
        if (!value.acceptedInputSources.includes(source)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `builder input action ${value.actionName} must accept ${source}`,
            path: ["acceptedInputSources"]
          });
        }
      }
    } else if (value.acceptedInputSources.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `builder action ${value.actionName} must not accept text or transcript input`,
        path: ["acceptedInputSources"]
      });
    }

    const expectedSummary = builderToolInputSourceSummaryFor(value.acceptedInputSources);
    if (value.inputSourceSummary !== expectedSummary) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `builder tool input source summary must be ${expectedSummary}`,
        path: ["inputSourceSummary"]
      });
    }
  });
export type BuilderToolDefinition = z.infer<typeof BuilderToolDefinitionSchema>;

function builderActionAcceptsInput(actionName: z.infer<typeof BuilderActionNameSchema>): boolean {
  return actionName === "assemble-game" || actionName === "update-game";
}

function builderToolInputSourceSummaryFor(sources: z.infer<typeof BuilderInputSourceSchema>[]): string {
  if (sources.length === 0) {
    return "input: none";
  }

  const labels: Record<z.infer<typeof BuilderInputSourceSchema>, string> = {
    text: "Text",
    "moonshine-transcript": "Transcript"
  };
  return `input: ${sources.map((source) => labels[source]).join(", ")}`;
}

export const BuilderAssetEditCatalogEntrySchema = z
  .object({
    theme: z.string().min(1).max(80),
    displayLabel: z.string().min(1).max(80),
    localReplacementFolder: z.string().min(1).max(80),
    aliases: z.array(z.string().min(1).max(80)).default([]),
    aliasSummary: z.string().min(1).max(240),
    suggestedItemSummary: z.string().min(1).max(240),
    suggestedItems: z.array(z.string().min(1).max(48)).min(1)
  })
  .strict();
export type BuilderAssetEditCatalogEntry = z.infer<typeof BuilderAssetEditCatalogEntrySchema>;

export const BuilderSessionBoundServiceActionNameSchema = z.enum([
  "update",
  "preview",
  "get-session",
  "export-profile",
  "import-profile"
]);
export type BuilderSessionBoundServiceActionName = z.infer<typeof BuilderSessionBoundServiceActionNameSchema>;

export const BuilderServiceActionNameSchema = z.enum([
  "catalog",
  "assemble",
  "update",
  "preview",
  "reset",
  "get-session",
  "export-profile",
  "import-profile",
  "execute-workflow"
]);
export type BuilderServiceActionName = z.infer<typeof BuilderServiceActionNameSchema>;

export const BuilderServiceRequestFieldNameSchema = z.enum([
  "sessionId",
  "text",
  "source",
  "moonshineTranscript",
  "templateId",
  "assetEdit",
  "interaction",
  "profile",
  "profileExport",
  "workflow"
]);
export type BuilderServiceRequestFieldName = z.infer<typeof BuilderServiceRequestFieldNameSchema>;

export const BuilderServiceCatalogActionRequestSchema = z
  .object({
    acceptedFields: z.array(BuilderServiceRequestFieldNameSchema).default([]),
    requiredFields: z.array(BuilderServiceRequestFieldNameSchema).default([]),
    requiredAnyOf: z.array(z.array(BuilderServiceRequestFieldNameSchema).min(2)).default([]),
    exclusiveAnyOf: z.array(z.array(BuilderServiceRequestFieldNameSchema).min(2)).default([]),
    forbiddenTogether: z.array(z.array(BuilderServiceRequestFieldNameSchema).min(2)).default([]),
    summary: z.string().min(1).max(240)
  })
  .strict();
export type BuilderServiceCatalogActionRequest = z.infer<typeof BuilderServiceCatalogActionRequestSchema>;

export const BuilderServiceCatalogActionSchema = z
  .object({
    actionName: BuilderServiceActionNameSchema,
    displayName: z.string().min(1).max(80),
    requiresSession: z.boolean(),
    acceptsInput: z.boolean(),
    request: BuilderServiceCatalogActionRequestSchema,
    responsePayload: z.enum(["catalog", "execution", "session", "profileExport", "reset"])
  })
  .strict()
  .superRefine((value, context) => {
    const expectedRequiresSession = serviceActionRequiresSession(value.actionName);
    if (value.requiresSession !== expectedRequiresSession) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `service action ${value.actionName} requiresSession must be ${String(expectedRequiresSession)}`,
        path: ["requiresSession"]
      });
    }

    const expectedAcceptsInput = serviceActionAcceptsInput(value.actionName);
    if (value.acceptsInput !== expectedAcceptsInput) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `service action ${value.actionName} acceptsInput must be ${String(expectedAcceptsInput)}`,
        path: ["acceptsInput"]
      });
    }

    const expectedResponsePayload = serviceActionResponsePayload(value.actionName);
    if (value.responsePayload !== expectedResponsePayload) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `service action ${value.actionName} responsePayload must be ${expectedResponsePayload}`,
        path: ["responsePayload"]
      });
    }

    addDuplicateServiceRequestFieldIssues(context, value.request.acceptedFields, ["request", "acceptedFields"]);
    addDuplicateServiceRequestFieldIssues(context, value.request.requiredFields, ["request", "requiredFields"]);

    for (const field of value.request.requiredFields) {
      if (!value.request.acceptedFields.includes(field)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `required field ${field} must be accepted by service action ${value.actionName}`,
          path: ["request", "requiredFields"]
        });
      }
    }

    for (const group of [
      ...value.request.requiredAnyOf,
      ...value.request.exclusiveAnyOf,
      ...value.request.forbiddenTogether
    ]) {
      addDuplicateServiceRequestFieldIssues(context, group, ["request"]);
      for (const field of group) {
        if (!value.request.acceptedFields.includes(field)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `request group field ${field} must be accepted by service action ${value.actionName}`,
            path: ["request", "acceptedFields"]
          });
        }
      }
    }

    if (expectedRequiresSession && !value.request.requiredFields.includes("sessionId")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `service action ${value.actionName} must require sessionId`,
        path: ["request", "requiredFields"]
      });
    }

    if (!expectedRequiresSession && value.actionName !== "assemble" && value.actionName !== "execute-workflow" && value.request.acceptedFields.includes("sessionId")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `service action ${value.actionName} must not accept sessionId`,
        path: ["request", "acceptedFields"]
      });
    }

    const inputFields: z.infer<typeof BuilderServiceRequestFieldNameSchema>[] = ["text", "source", "moonshineTranscript", "templateId"];
    if (expectedAcceptsInput) {
      for (const field of ["text", "source", "moonshineTranscript"] as const) {
        if (!value.request.acceptedFields.includes(field)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `input service action ${value.actionName} must accept ${field}`,
            path: ["request", "acceptedFields"]
          });
        }
      }
      if (!serviceRequestFieldGroupIncludes(value.request.requiredAnyOf, ["text", "moonshineTranscript"])) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `input service action ${value.actionName} must require text or moonshineTranscript`,
          path: ["request", "requiredAnyOf"]
        });
      }
      if (!serviceRequestFieldGroupIncludes(value.request.exclusiveAnyOf, ["text", "moonshineTranscript"])) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `input service action ${value.actionName} must make text and moonshineTranscript exclusive`,
          path: ["request", "exclusiveAnyOf"]
        });
      }
    } else {
      for (const field of inputFields) {
        if (value.request.acceptedFields.includes(field)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `non-input service action ${value.actionName} must not accept ${field}`,
            path: ["request", "acceptedFields"]
          });
        }
      }
    }
  });
export type BuilderServiceCatalogAction = z.infer<typeof BuilderServiceCatalogActionSchema>;

function serviceActionRequiresSession(actionName: z.infer<typeof BuilderServiceActionNameSchema>): boolean {
  return actionName === "update" ||
    actionName === "preview" ||
    actionName === "get-session" ||
    actionName === "export-profile" ||
    actionName === "import-profile";
}

function serviceActionAcceptsInput(actionName: z.infer<typeof BuilderServiceActionNameSchema>): boolean {
  return actionName === "assemble" || actionName === "update";
}

function serviceActionResponsePayload(
  actionName: z.infer<typeof BuilderServiceActionNameSchema>
): "catalog" | "execution" | "session" | "profileExport" | "reset" {
  const responsePayloadByAction: Record<
    z.infer<typeof BuilderServiceActionNameSchema>,
    "catalog" | "execution" | "session" | "profileExport" | "reset"
  > = {
    assemble: "execution",
    catalog: "catalog",
    "execute-workflow": "execution",
    "export-profile": "profileExport",
    "get-session": "session",
    "import-profile": "execution",
    preview: "execution",
    reset: "reset",
    update: "execution"
  };

  return responsePayloadByAction[actionName];
}

function serviceRequestFieldGroupIncludes(
  groups: Array<z.infer<typeof BuilderServiceRequestFieldNameSchema>[]>,
  expectedFields: z.infer<typeof BuilderServiceRequestFieldNameSchema>[]
): boolean {
  return groups.some((group) =>
    group.length === expectedFields.length && expectedFields.every((field) => group.includes(field))
  );
}

function addDuplicateServiceRequestFieldIssues(
  context: z.RefinementCtx,
  fields: z.infer<typeof BuilderServiceRequestFieldNameSchema>[],
  path: Array<string | number>
): void {
  const seen = new Set<z.infer<typeof BuilderServiceRequestFieldNameSchema>>();
  const duplicates = new Set<z.infer<typeof BuilderServiceRequestFieldNameSchema>>();

  for (const field of fields) {
    if (seen.has(field)) {
      duplicates.add(field);
    }
    seen.add(field);
  }

  for (const duplicate of duplicates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `service request field ${duplicate} must be unique`,
      path
    });
  }
}

export const BuilderServiceCatalogSchema = z
  .object({
    actions: z.array(BuilderServiceCatalogActionSchema).min(1),
    exactEnvelope: z
      .object({
        singleCommand: z.literal("request"),
        batchCommand: z.literal("request-batch"),
        requestSchema: z.literal("BuilderServiceRequestSchema"),
        batchSchema: z.literal("BuilderServiceRequestBatchSchema"),
        directHandler: z.literal("handleLocalServiceRequest"),
        directBatchHandler: z.literal("handleLocalServiceRequestBatch"),
        requiredContracts: z.array(PublicContractNameSchema).min(2)
      })
      .strict(),
    transports: z
      .object({
        local: z.literal("createLocalServiceTransport"),
        httpClient: z.literal("createHttpServiceTransport"),
        httpBody: z.literal("handleServiceHttpRequestBody")
      })
      .strict()
  })
  .strict()
  .superRefine((value, context) => {
    const actionNames = value.actions.map((action) => action.actionName);
    addDuplicateServiceActionIssues(context, actionNames, ["actions"]);

    for (const actionName of BuilderServiceActionNameSchema.options) {
      if (!actionNames.includes(actionName)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `service catalog must include action ${actionName}`,
          path: ["actions"]
        });
      }
    }
  });
export type BuilderServiceCatalog = z.infer<typeof BuilderServiceCatalogSchema>;

function addDuplicateServiceActionIssues(
  context: z.RefinementCtx,
  actionNames: z.infer<typeof BuilderServiceActionNameSchema>[],
  path: Array<string | number>
): void {
  const seen = new Set<z.infer<typeof BuilderServiceActionNameSchema>>();
  const duplicates = new Set<z.infer<typeof BuilderServiceActionNameSchema>>();

  for (const actionName of actionNames) {
    if (seen.has(actionName)) {
      duplicates.add(actionName);
    }
    seen.add(actionName);
  }

  for (const duplicate of duplicates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `service catalog action ${duplicate} must be unique`,
      path
    });
  }
}

export const BuilderCatalogRequestTipsSchema = z
  .object({
    availableGames: z.array(z.string().min(1).max(80)).min(1),
    featuredGames: z.array(z.string().min(1).max(80)).min(1),
    assetEdits: z.array(z.string().min(1).max(80)).min(1),
    examples: z.array(z.string().min(1).max(160)).min(1),
    summaryLines: z.array(z.string().min(1).max(240)).min(1)
  })
  .strict();
export type BuilderCatalogRequestTips = z.infer<typeof BuilderCatalogRequestTipsSchema>;

export const BuilderTemplateNamespaceSchema = StableIdSchema.refine((value) => value.startsWith("template.custom."), {
  message: "builder template namespace IDs must start with template.custom."
});
export type BuilderTemplateNamespace = z.infer<typeof BuilderTemplateNamespaceSchema>;

export const BuilderAssetEditSchema = z
  .object({
    theme: z.string().min(1).max(80).optional(),
    items: z.array(z.string().min(1).max(48)).min(1).max(12).optional()
  })
  .strict()
  .refine((value) => Boolean(value.theme || value.items), {
    message: "asset edit requires a theme or items"
  });
export type BuilderAssetEdit = z.infer<typeof BuilderAssetEditSchema>;

export const BuilderIntentResolutionSchema = PublicContractBaseSchema.extend({
  kind: z.literal("builder-intent-resolution"),
  inputId: StableIdSchema,
  activeTemplateId: BuilderTemplateIdSchema.optional(),
  selectedTemplateId: BuilderTemplateIdSchema,
  templateDecision: z
    .object({
      source: z.enum([
        "explicit-template-id",
        "catalog-template-alias",
        "active-template"
      ]),
      matchedTemplateIds: z.array(BuilderTemplateIdSchema).default([]),
      matchedCapabilityTags: z.array(CapabilityTagSchema).default([]),
      matchedRequestAliases: z.array(z.string().min(2).max(80)).default([])
    })
    .strict(),
  assetEdit: BuilderAssetEditSchema.optional(),
  assetDecision: z
    .object({
      source: z.enum(["explicit-asset-edit", "catalog-asset-alias", "freeform-asset-request", "active-asset-edit", "none"]),
      matchedText: z.string().min(1).max(80).optional()
    })
    .strict()
}).strict()
  .refine((value) => value.assetDecision.source !== "none" || !value.assetEdit, {
    message: "none asset decision must not include an asset edit",
    path: ["assetEdit"]
  })
  .refine((value) => value.assetDecision.source === "none" || Boolean(value.assetEdit), {
    message: "asset decision requires an asset edit unless source is none",
    path: ["assetEdit"]
  });
export type BuilderIntentResolution = z.infer<typeof BuilderIntentResolutionSchema>;

export const BuilderPreviewInteractionSchema = z
  .object({
    action: z.enum(["primary"])
  })
  .strict();
export type BuilderPreviewInteraction = z.infer<typeof BuilderPreviewInteractionSchema>;

export const BuilderPreviewStateSchema = z
  .object({
    schemaVersion: z.literal(PLAYCRAFT_SCHEMA_VERSION),
    sessionId: StableIdSchema,
    activeProfileId: StableIdSchema.optional(),
    activeTemplateId: BuilderTemplateIdSchema.optional(),
    activeComponentId: StableIdSchema.optional(),
    renderedComponentIds: z.array(StableIdSchema).default([]),
    interactionCount: z.number().int().nonnegative(),
    lastToolName: CapabilityTagSchema.optional(),
    lastToolPayload: JsonValueSchema.optional()
  })
  .strict();
export type BuilderPreviewState = z.infer<typeof BuilderPreviewStateSchema>;

export const BuilderSessionOwnershipSchema = z
  .object({
    ownerId: StableIdSchema,
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    capabilities: z.array(z.string().min(1)).min(1)
  })
  .strict()
  .refine((value) => new Date(value.expiresAt as string) > new Date(value.createdAt as string), {
    message: "session ownership expiresAt must be after createdAt",
    path: ["expiresAt"]
  });
export type BuilderSessionOwnership = z.infer<typeof BuilderSessionOwnershipSchema>;

export const BuilderServiceErrorKindSchema = z.enum(["session-expired", "ownership-mismatch"]);
export type BuilderServiceErrorKind = z.infer<typeof BuilderServiceErrorKindSchema>;

export const BuilderServiceErrorSchema = z
  .object({
    kind: BuilderServiceErrorKindSchema,
    sessionId: StableIdSchema.optional(),
    ownerId: StableIdSchema.optional(),
    message: z.string().min(1)
  })
  .strict();
export type BuilderServiceError = z.infer<typeof BuilderServiceErrorSchema>;

export function addDuplicateBuilderInputSourceIssues(
  context: z.RefinementCtx,
  sources: z.infer<typeof BuilderInputSourceSchema>[],
  path: Array<string | number>
): void {
  const seen = new Set<z.infer<typeof BuilderInputSourceSchema>>();
  const duplicates = new Set<z.infer<typeof BuilderInputSourceSchema>>();

  for (const source of sources) {
    if (seen.has(source)) {
      duplicates.add(source);
    }
    seen.add(source);
  }

  for (const duplicate of duplicates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `catalog input source ${duplicate} must be unique`,
      path
    });
  }
}

export * from "./mcp.js";
export * from "./packs.js";
export * from "./sse.js";
export * from "./workflow.js";
export * from "./asset.js";
export * from "./ag-ui.js";
export * from "./game-template.js";
export * from "./builder-catalog.js";
export * from "./manifests.js";
export * from "./builder.js";
