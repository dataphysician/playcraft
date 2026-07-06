import { z } from "zod";
import {
  PLAYCRAFT_SCHEMA_VERSION,
  PublicContractBaseSchema,
  PublicContractName,
  StableIdSchema,
  JsonValueSchema,
  ValidationSeveritySchema,
  SchemaIssueSchema,
  BuilderActionNameSchema,
  BuilderInputSourceSchema,
  BuilderInputRequestSchema,
  BuilderTemplateIdSchema,
  BuilderAssetEditSchema,
  BuilderToolDefinitionSchema,
  BuilderIntentResolutionSchema,
  BuilderPreviewInteractionSchema,
  BuilderPreviewStateSchema,
  BuilderSessionOwnershipSchema,
  BuilderServiceActionNameSchema,
  BuilderServiceErrorSchema,
  MoonshineTranscriptRecordSchema,
  type BuilderServiceActionName,
  type BuilderServiceError
} from "./base.js";
import {
  AssemblyValidationResultSchema,
  GeneratedAssetRecordSchema,
  AssetGenerationRequestSchema,
  AssetSourceCapabilityManifestSchema,
  AssetCatalogManifestSchema
} from "./asset.js";
import {
  PlaycraftAgUiEventEnvelopeSchema,
  PlaycraftEventRecordSchema
} from "./ag-ui.js";
import {
  GameAssemblyProfileSchema,
  GameProfileTemplateSnapshotSchema,
  GameTemplateDefinitionSchema
} from "./game-template.js";
import { BuilderCatalogSchema, type BuilderCatalog } from "./builder-catalog.js";
import { WorkflowGraphSchema } from "./workflow.js";
import {
  McpManifestSchema,
  McpServerPolicySchema
} from "./mcp.js";
import {
  ComponentManifestSchema,
  ComponentRenderRequestSchema,
  DomainProfileSchema,
  FrontendToolDefinitionSchema,
  MechanicDefinitionSchema,
  PlaycraftAssemblyRequestSchema,
  RuleModuleDefinitionSchema,
  SafetyPolicyPackSchema,
  ThemePackSchema
} from "./manifests.js";
import { PackManifestSchema } from "./packs.js";

// base.ts re-exports this module, creating a circular import where base.ts is
// mid-initialization while builder.ts is being loaded. Every schema in this
// module that references a base.ts binding — directly or transitively — must
// be wrapped in z.lazy(() => …) to defer construction until first parse, by
// which point base.ts has finished loading. This matches the lazy pattern
// used in workflow.ts, mcp.ts, sse.ts, asset.ts, ag-ui.ts, builder-catalog.ts,
// game-template.ts, packs.ts, and manifests.ts.

export const BuilderCommandSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("builder-command"),
    sessionId: StableIdSchema,
    actionName: BuilderActionNameSchema,
    templateId: BuilderTemplateIdSchema.optional(),
    input: BuilderInputRequestSchema.optional(),
    assetEdit: BuilderAssetEditSchema.optional(),
    profile: GameAssemblyProfileSchema.optional(),
    interaction: BuilderPreviewInteractionSchema.optional()
  }).strict()
    .refine((value) => !["assemble-game", "update-game"].includes(value.actionName) || Boolean(value.templateId), {
      message: "assemble and update actions require a templateId",
      path: ["templateId"]
    })
    .refine((value) => ["assemble-game", "update-game"].includes(value.actionName) || (!value.templateId && !value.input && !value.assetEdit), {
      message: "template, input, and asset edit payloads are only accepted by assemble and update actions",
      path: ["templateId"]
    })
    .refine((value) => value.actionName !== "import-profile" || Boolean(value.profile), {
      message: "import profile actions require a profile",
      path: ["profile"]
    })
    .refine((value) => value.actionName === "import-profile" || !value.profile, {
      message: "profile payloads are only accepted by import-profile actions",
      path: ["profile"]
    })
    .refine((value) => value.actionName !== "preview-action" || Boolean(value.interaction), {
      message: "preview actions require an interaction payload",
      path: ["interaction"]
    })
    .refine((value) => value.actionName === "preview-action" || !value.interaction, {
      message: "interaction payloads are only accepted by preview actions",
      path: ["interaction"]
    })
);
export type BuilderCommand = z.infer<typeof BuilderCommandSchema>;

export const BuilderCommandResultSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("builder-command-result"),
    commandId: StableIdSchema,
    sessionId: StableIdSchema,
    profile: GameAssemblyProfileSchema.optional(),
    preview: BuilderPreviewStateSchema,
    validation: AssemblyValidationResultSchema.optional()
  })
    .strict()
    .refine((value) => !value.profile || Boolean(value.preview.activeProfileId), {
      message: "command results with profile payloads require preview activeProfileId",
      path: ["preview", "activeProfileId"]
    })
    .refine((value) => !value.profile || !value.preview.activeProfileId || value.profile.id === value.preview.activeProfileId, {
      message: "command result profile id must match preview activeProfileId",
      path: ["profile"]
    })
);
export type BuilderCommandResult = z.infer<typeof BuilderCommandResultSchema>;

export const BuilderSessionSnapshotSchema = z.lazy(() =>
  z
    .object({
      schemaVersion: z.literal(PLAYCRAFT_SCHEMA_VERSION),
      kind: z.literal("builder-session-snapshot"),
      sessionId: StableIdSchema,
      activeTemplateId: BuilderTemplateIdSchema.optional(),
      activeProfileId: StableIdSchema.optional(),
      activeAssetEdit: BuilderAssetEditSchema.optional(),
      profile: GameAssemblyProfileSchema.optional(),
      preview: BuilderPreviewStateSchema,
      validation: AssemblyValidationResultSchema.optional(),
      updatedAt: z.string().datetime(),
      ownership: BuilderSessionOwnershipSchema.optional()
    })
    .strict()
    .refine((value) => !value.activeProfileId || Boolean(value.profile), {
      message: "session snapshots with activeProfileId require an active profile payload",
      path: ["profile"]
    })
    .refine((value) => !value.profile || Boolean(value.activeProfileId), {
      message: "session snapshots with profile payloads require activeProfileId",
      path: ["activeProfileId"]
    })
    .refine((value) => !value.profile || Boolean(value.activeTemplateId), {
      message: "session snapshots with profile payloads require activeTemplateId",
      path: ["activeTemplateId"]
    })
    .refine((value) => !value.profile || !value.activeProfileId || value.profile.id === value.activeProfileId, {
      message: "session snapshot profile id must match activeProfileId",
      path: ["profile"]
    })
    .refine((value) => !value.profile || !value.activeTemplateId || value.profile.template.id === value.activeTemplateId, {
      message: "session snapshot template id must match profile template",
      path: ["activeTemplateId"]
    })
    .refine((value) => !value.activeTemplateId || value.preview.activeTemplateId === value.activeTemplateId, {
      message: "session snapshot activeTemplateId must match preview activeTemplateId",
      path: ["preview", "activeTemplateId"]
    })
);
export type BuilderSessionSnapshot = z.infer<typeof BuilderSessionSnapshotSchema>;

export const BuilderProfileExportSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("builder-profile-export"),
    sessionId: StableIdSchema,
    templateId: BuilderTemplateIdSchema,
    assetEdit: BuilderAssetEditSchema.optional(),
    profile: GameAssemblyProfileSchema,
    preview: BuilderPreviewStateSchema,
    validation: AssemblyValidationResultSchema,
    exportedAt: z.string().datetime(),
    retrieval: z
      .object({
        current: z.literal("bundled-local"),
        planned: z.literal("server-catalog")
      })
      .strict()
  })
    .strict()
    .refine((value) => Boolean(value.preview.activeProfileId), {
      message: "profile exports require preview activeProfileId",
      path: ["preview", "activeProfileId"]
    })
    .refine((value) => !value.preview.activeProfileId || value.profile.id === value.preview.activeProfileId, {
      message: "profile export profile id must match preview activeProfileId",
      path: ["profile"]
    })
    .refine((value) => Boolean(value.profile.template), {
      message: "profile exports require profile template snapshot",
      path: ["profile", "template"]
    })
    .refine((value) => !value.profile.template || value.profile.template.id === value.templateId, {
      message: "profile export templateId must match profile template id",
      path: ["templateId"]
    })
    .refine((value) => Boolean(value.preview.activeTemplateId), {
      message: "profile exports require preview activeTemplateId",
      path: ["preview", "activeTemplateId"]
    })
    .refine((value) => !value.preview.activeTemplateId || value.preview.activeTemplateId === value.templateId, {
      message: "profile export templateId must match preview activeTemplateId",
      path: ["templateId"]
    })
);
export type BuilderProfileExport = z.infer<typeof BuilderProfileExportSchema>;

export const AgUiEventEnvelopeContractSchema = z.lazy(() =>
  z
    .object({
      type: z.string().min(1),
      eventId: z.string().min(1),
      runId: z.string().min(1),
      timestamp: z.string().datetime(),
      value: JsonValueSchema
    })
    .strict()
);
export type AgUiEventEnvelopeContract = z.infer<typeof AgUiEventEnvelopeContractSchema>;

export const BuilderServiceExecutionSchema = z.lazy(() =>
  z
    .object({
      schemaVersion: z.literal(PLAYCRAFT_SCHEMA_VERSION),
      result: BuilderCommandResultSchema,
      events: z.array(AgUiEventEnvelopeContractSchema)
    })
    .strict()
);
export type BuilderServiceExecution = z.infer<typeof BuilderServiceExecutionSchema>;

const BuilderServiceResponsePayloadKeys = ["catalog", "execution", "session", "profileExport", "reset", "error"] as const;

export const BuilderServiceRequestSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("builder-service-request"),
    actionName: BuilderServiceActionNameSchema,
    sessionId: StableIdSchema.optional(),
    text: z.string().min(1).max(500).optional(),
    source: BuilderInputSourceSchema.optional(),
    moonshineTranscript: MoonshineTranscriptRecordSchema.optional(),
    templateId: BuilderTemplateIdSchema.optional(),
    assetEdit: BuilderAssetEditSchema.optional(),
    interaction: BuilderPreviewInteractionSchema.optional(),
    profile: GameAssemblyProfileSchema.optional(),
    profileExport: BuilderProfileExportSchema.optional(),
    workflow: WorkflowGraphSchema.optional()
  }).strict()
    .refine((value) => !["update", "preview", "get-session", "export-profile", "import-profile"].includes(value.actionName) || Boolean(value.sessionId), {
      message: "update, preview, get-session, export-profile, and import-profile requests require sessionId",
      path: ["sessionId"]
    })
    .refine((value) => ["assemble", "update", "preview", "get-session", "export-profile", "import-profile"].includes(value.actionName) || !value.sessionId, {
      message: "sessionId is only accepted by assemble, update, preview, get-session, export-profile, and import-profile requests",
      path: ["sessionId"]
    })
    .refine((value) => value.actionName !== "assemble" || Boolean(value.text || value.moonshineTranscript), {
      message: "assemble requests require text or a Moonshine transcript record",
      path: ["text"]
    })
    .refine((value) => value.actionName !== "update" || Boolean(value.text || value.moonshineTranscript), {
      message: "update requests require text or a Moonshine transcript record",
      path: ["text"]
    })
    .refine((value) => ["assemble", "update"].includes(value.actionName) || (!value.text && !value.source && !value.moonshineTranscript), {
      message: "only assemble and update service requests may include input text or transcript records",
      path: ["text"]
    })
    .refine((value) => ["assemble", "update"].includes(value.actionName) || !value.templateId, {
      message: "template IDs are only accepted by assemble and update requests",
      path: ["templateId"]
    })
    .refine((value) => value.actionName !== "preview" || Boolean(value.interaction), {
      message: "preview requests require an interaction payload",
      path: ["interaction"]
    })
    .refine((value) => value.actionName === "preview" || !value.interaction, {
      message: "interaction payloads are only accepted by preview requests",
      path: ["interaction"]
    })
    .refine((value) => ["assemble", "update", "import-profile"].includes(value.actionName) || !value.assetEdit, {
      message: "asset edits are only accepted by assemble, update, or import-profile requests",
      path: ["assetEdit"]
    })
    .refine((value) => value.actionName === "import-profile" || (!value.profile && !value.profileExport), {
      message: "profile import payloads are only accepted by import-profile requests",
      path: ["profile"]
    })
    .refine((value) => !["assemble", "update"].includes(value.actionName) || (!value.profile && !value.profileExport), {
      message: "assemble and update requests must not include profile import payloads",
      path: ["profile"]
    })
    .refine((value) => !value.moonshineTranscript || value.source === "moonshine-transcript", {
      message: "Moonshine transcript records require moonshine-transcript source",
      path: ["source"]
    })
    .refine((value) => value.source !== "moonshine-transcript" || Boolean(value.moonshineTranscript), {
      message: "moonshine-transcript service requests require a Moonshine transcript record",
      path: ["moonshineTranscript"]
    })
    .refine((value) => !value.moonshineTranscript || !value.text, {
      message: "service requests accept either text or a Moonshine transcript record, not both",
      path: ["text"]
    })
    .refine((value) => value.actionName !== "import-profile" || Boolean(value.profile || value.profileExport), {
      message: "import-profile requests require profile or profileExport",
      path: ["profile"]
    })
    .refine((value) => value.actionName !== "import-profile" || !(value.profile && value.profileExport), {
      message: "import-profile requests accept exactly one of profile or profileExport",
      path: ["profile"]
    })
    .refine((value) => value.actionName !== "import-profile" || !value.profileExport || !value.assetEdit, {
      message: "profileExport imports carry asset edits in the export; top-level assetEdit is only accepted with profile imports",
      path: ["assetEdit"]
    })
    .refine((value) => value.actionName !== "execute-workflow" || Boolean(value.workflow), {
      message: "execute-workflow requests require a workflow graph payload",
      path: ["workflow"]
    })
    .refine((value) => value.actionName === "execute-workflow" || !value.workflow, {
      message: "workflow graphs are only accepted by execute-workflow requests",
      path: ["workflow"]
    })
);
export type BuilderServiceRequest = z.infer<typeof BuilderServiceRequestSchema>;

export const BuilderServiceRequestBatchSchema = z.lazy(() =>
  z.array(BuilderServiceRequestSchema).min(1)
);
export type BuilderServiceRequestBatch = z.infer<typeof BuilderServiceRequestBatchSchema>;

export type BuilderServiceResponse = z.infer<typeof PublicContractBaseSchema> & {
  kind: "builder-service-response";
  requestId: string;
  actionName: BuilderServiceActionName;
  catalog?: BuilderCatalog;
  execution?: BuilderServiceExecution;
  session?: BuilderSessionSnapshot;
  profileExport?: BuilderProfileExport;
  reset?: true;
  error?: BuilderServiceError;
};

type BuilderServiceResponseInput = z.input<typeof PublicContractBaseSchema> & {
  kind: "builder-service-response";
  requestId: string;
  actionName: z.input<typeof BuilderServiceActionNameSchema>;
  catalog?: z.input<typeof BuilderCatalogSchema>;
  execution?: z.input<typeof BuilderServiceExecutionSchema>;
  session?: z.input<typeof BuilderSessionSnapshotSchema>;
  profileExport?: z.input<typeof BuilderProfileExportSchema>;
  reset?: true;
  error?: z.input<typeof BuilderServiceErrorSchema>;
};

export const BuilderServiceResponseSchema: z.ZodType<BuilderServiceResponse, z.ZodTypeDef, BuilderServiceResponseInput> = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("builder-service-response"),
    requestId: StableIdSchema,
    actionName: BuilderServiceActionNameSchema,
    catalog: BuilderCatalogSchema.optional(),
    execution: BuilderServiceExecutionSchema.optional(),
    session: BuilderSessionSnapshotSchema.optional(),
    profileExport: BuilderProfileExportSchema.optional(),
    reset: z.literal(true).optional(),
    error: BuilderServiceErrorSchema.optional()
  }).strict()
    .refine((value) => value.actionName !== "catalog" || Boolean(value.catalog), {
      message: "catalog responses require a catalog",
      path: ["catalog"]
    })
    .refine((value) => value.actionName !== "catalog" || hasOnlyServiceResponsePayloads(value, ["catalog"]), {
      message: "catalog responses only include catalog output",
      path: ["catalog"]
    })
    .refine((value) => !["assemble", "update", "preview"].includes(value.actionName) || Boolean(value.execution && value.session) || Boolean(value.error), {
      message: "assemble, update, and preview responses require execution output and a session snapshot",
      path: ["execution"]
    })
    .refine((value) => !["assemble", "update", "preview"].includes(value.actionName) || hasOnlyServiceResponsePayloads(value, ["execution", "session", "error"]), {
      message: "assemble, update, and preview responses only include execution output and a session snapshot",
      path: ["execution"]
    })
    .refine((value) => value.actionName !== "get-session" || Boolean(value.session) || Boolean(value.error), {
      message: "get-session responses require a session snapshot",
      path: ["session"]
    })
    .refine((value) => value.actionName !== "get-session" || hasOnlyServiceResponsePayloads(value, ["session", "error"]), {
      message: "get-session responses only include a session snapshot",
      path: ["session"]
    })
    .refine((value) => value.actionName !== "export-profile" || Boolean(value.profileExport) || Boolean(value.error), {
      message: "export-profile responses require a profile export",
      path: ["profileExport"]
    })
    .refine((value) => value.actionName !== "export-profile" || hasOnlyServiceResponsePayloads(value, ["profileExport", "error"]), {
      message: "export-profile responses only include a profile export",
      path: ["profileExport"]
    })
    .refine((value) => value.actionName !== "import-profile" || Boolean(value.execution && value.session) || Boolean(value.error), {
      message: "import-profile responses require execution output and a session snapshot",
      path: ["execution"]
    })
    .refine((value) => value.actionName !== "import-profile" || hasOnlyServiceResponsePayloads(value, ["execution", "session", "error"]), {
      message: "import-profile responses only include execution output and a session snapshot",
      path: ["execution"]
    })
    .refine((value) => value.actionName !== "reset" || value.reset === true, {
      message: "reset responses require reset acknowledgement",
      path: ["reset"]
    })
    .refine((value) => value.actionName !== "reset" || hasOnlyServiceResponsePayloads(value, ["reset"]), {
      message: "reset responses only include reset acknowledgement",
      path: ["reset"]
    })
) as unknown as z.ZodType<BuilderServiceResponse, z.ZodTypeDef, BuilderServiceResponseInput>;

function hasOnlyServiceResponsePayloads(
  value: Record<string, unknown>,
  allowedPayloads: Array<(typeof BuilderServiceResponsePayloadKeys)[number]>
): boolean {
  return BuilderServiceResponsePayloadKeys.every((key) =>
    allowedPayloads.includes(key) ? true : value[key] === undefined
  );
}

export const PublicContractSchemas: Record<PublicContractName, z.ZodTypeAny> = {
  get PlaycraftAssemblyRequestSchema(): z.ZodTypeAny { return PlaycraftAssemblyRequestSchema; },
  get DomainProfileSchema(): z.ZodTypeAny { return DomainProfileSchema; },
  get SafetyPolicyPackSchema(): z.ZodTypeAny { return SafetyPolicyPackSchema; },
  get GameAssemblyProfileSchema(): z.ZodTypeAny { return GameAssemblyProfileSchema; },
  get MechanicDefinitionSchema(): z.ZodTypeAny { return MechanicDefinitionSchema; },
  get RuleModuleDefinitionSchema(): z.ZodTypeAny { return RuleModuleDefinitionSchema; },
  get ComponentManifestSchema(): z.ZodTypeAny { return ComponentManifestSchema; },
  get ComponentRenderRequestSchema(): z.ZodTypeAny { return ComponentRenderRequestSchema; },
  get ThemePackSchema(): z.ZodTypeAny { return ThemePackSchema; },
  get FrontendToolDefinitionSchema(): z.ZodTypeAny { return FrontendToolDefinitionSchema; },
  get AssetGenerationRequestSchema(): z.ZodTypeAny { return AssetGenerationRequestSchema; },
  get AssetSourceCapabilityManifestSchema(): z.ZodTypeAny { return AssetSourceCapabilityManifestSchema; },
  get GeneratedAssetRecordSchema(): z.ZodTypeAny { return GeneratedAssetRecordSchema; },
  get AssemblyValidationResultSchema(): z.ZodTypeAny { return AssemblyValidationResultSchema; },
  get PlaycraftAgUiEventEnvelopeSchema(): z.ZodTypeAny { return PlaycraftAgUiEventEnvelopeSchema; },
  get PlaycraftEventRecordSchema(): z.ZodTypeAny { return PlaycraftEventRecordSchema; },
  get PackManifestSchema(): z.ZodTypeAny { return PackManifestSchema; },
  get GameProfileTemplateSnapshotSchema(): z.ZodTypeAny { return GameProfileTemplateSnapshotSchema; },
  get GameTemplateDefinitionSchema(): z.ZodTypeAny { return GameTemplateDefinitionSchema; },
  get MoonshineTranscriptRecordSchema(): z.ZodTypeAny { return MoonshineTranscriptRecordSchema; },
  get BuilderInputRequestSchema(): z.ZodTypeAny { return BuilderInputRequestSchema; },
  get BuilderToolDefinitionSchema(): z.ZodTypeAny { return BuilderToolDefinitionSchema; },
  get BuilderCatalogSchema(): z.ZodTypeAny { return BuilderCatalogSchema; },
  get BuilderIntentResolutionSchema(): z.ZodTypeAny { return BuilderIntentResolutionSchema; },
  get BuilderCommandSchema(): z.ZodTypeAny { return BuilderCommandSchema; },
  get BuilderPreviewStateSchema(): z.ZodTypeAny { return BuilderPreviewStateSchema; },
  get BuilderCommandResultSchema(): z.ZodTypeAny { return BuilderCommandResultSchema; },
  get BuilderSessionSnapshotSchema(): z.ZodTypeAny { return BuilderSessionSnapshotSchema; },
  get BuilderProfileExportSchema(): z.ZodTypeAny { return BuilderProfileExportSchema; },
  get BuilderServiceExecutionSchema(): z.ZodTypeAny { return BuilderServiceExecutionSchema; },
  get BuilderServiceRequestSchema(): z.ZodTypeAny { return BuilderServiceRequestSchema; },
  get BuilderServiceRequestBatchSchema(): z.ZodTypeAny { return BuilderServiceRequestBatchSchema; },
  get BuilderServiceResponseSchema(): z.ZodTypeAny { return BuilderServiceResponseSchema; },
  get McpManifestSchema(): z.ZodTypeAny { return McpManifestSchema; },
  get McpServerPolicySchema(): z.ZodTypeAny { return McpServerPolicySchema; },
  get WorkflowGraphSchema(): z.ZodTypeAny { return WorkflowGraphSchema; },
  get AssetCatalogManifestSchema(): z.ZodTypeAny { return AssetCatalogManifestSchema; }
};

export function schemaIssue(path: Array<string | number>, code: string, message: string, severity: z.infer<typeof ValidationSeveritySchema>): z.infer<typeof SchemaIssueSchema> {
  return { path, code, message, severity };
}

export function validateContract<T>(schema: z.ZodType<T>, value: unknown): { valid: true; value: T } | { valid: false; issues: z.infer<typeof SchemaIssueSchema>[] } {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return { valid: true, value: parsed.data };
  }

  return {
    valid: false,
    issues: parsed.error.issues.map((issue) =>
      schemaIssue(issue.path, issue.code, issue.message, "error")
    )
  };
}