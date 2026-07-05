import { z } from "zod";

export const PLAYCRAFT_SCHEMA_VERSION = "playcraft.v1";
export const PLAYCRAFT_LOCAL_TIMESTAMP = "2026-07-04T00:00:00.000Z";

export const StableIdSchema = z
  .string()
  .min(3)
  .max(96)
  .regex(/^[a-z0-9][a-z0-9.-]*$/u, "stable IDs use lowercase letters, numbers, dots, and hyphens");

export const VersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/u, "versions must be semver-like");

export const CapabilityTagSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9:-]*$/u);

export const AgeBandSchema = z.enum(["2-3", "4-6", "7-9", "10-12", "adult"]);
export const InputModalitySchema = z.enum(["touch", "pointer", "keyboard"]);
export const AssetContentTypeSchema = z.enum(["image", "audio", "animation", "text"]);
export const AssetFormatSchema = z.enum(["svg", "png", "webp", "mp3", "wav", "json", "plain-text"]);
export const SafetyStatusSchema = z.enum(["safe", "blocked", "needs-review"]);
export const ValidationSeveritySchema = z.enum(["error", "warning", "info"]);

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

export const PublicContractBaseSchema = z
  .object({
    schemaVersion: z.literal(PLAYCRAFT_SCHEMA_VERSION),
    id: StableIdSchema,
    version: VersionSchema
  })
  .strict();

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
  "BuilderServiceResponseSchema"
]);
export type PublicContractName = z.infer<typeof PublicContractNameSchema>;

export const FrontendToolDefinitionSchema = PublicContractBaseSchema.extend({
  kind: z.literal("frontend-tool"),
  toolName: CapabilityTagSchema,
  description: z.string().min(1),
  argumentsSchema: JsonObjectSchemaDescriptorSchema,
  emittedEvents: z.array(CapabilityTagSchema).default([])
}).strict();
export type FrontendToolDefinition = z.infer<typeof FrontendToolDefinitionSchema>;

export const MechanicDefinitionSchema = PublicContractBaseSchema.extend({
  kind: z.literal("mechanic"),
  displayName: z.string().min(1),
  capabilityTags: z.array(CapabilityTagSchema).min(1),
  supportedModalities: z.array(InputModalitySchema).min(1),
  supportedAgeBands: z.array(AgeBandSchema).min(1),
  supportedDomains: z.array(StableIdSchema).min(1),
  consumesEvents: z.array(CapabilityTagSchema).default([]),
  emitsEvents: z.array(CapabilityTagSchema).min(1),
  requiredAssetContentTypes: z.array(AssetContentTypeSchema).default([]),
  compatibility: CompatibilityConstraintsSchema
}).strict();
export type MechanicDefinition = z.infer<typeof MechanicDefinitionSchema>;

export const RuleModuleDefinitionSchema = PublicContractBaseSchema.extend({
  kind: z.literal("rule-module"),
  category: CapabilityTagSchema,
  displayName: z.string().min(1),
  capabilityTags: z.array(CapabilityTagSchema).min(1),
  supportedMechanicIds: z.array(StableIdSchema).min(1),
  consumesEvents: z.array(CapabilityTagSchema).min(1),
  emitsEvents: z.array(CapabilityTagSchema).min(1),
  defaultSource: z.enum(["profile", "manifest", "domain-profile", "safety-policy", "explicit-config"]),
  compatibility: CompatibilityConstraintsSchema
}).strict();
export type RuleModuleDefinition = z.infer<typeof RuleModuleDefinitionSchema>;

export const AssetRequirementSchema = z
  .object({
    binding: CapabilityTagSchema,
    contentTypes: z.array(AssetContentTypeSchema).min(1),
    required: z.boolean().default(true)
  })
  .strict();

export const ComponentManifestSchema = PublicContractBaseSchema.extend({
  kind: z.literal("component"),
  displayName: z.string().min(1),
  renderCapability: CapabilityTagSchema,
  supportedMechanicIds: z.array(StableIdSchema).min(1),
  supportedDomains: z.array(StableIdSchema).min(1),
  supportedAgeBands: z.array(AgeBandSchema).min(1),
  propsSchema: JsonObjectSchemaDescriptorSchema,
  requiredAssets: z.array(AssetRequirementSchema).default([]),
  emittedTools: z.array(FrontendToolDefinitionSchema).default([]),
  accessibility: z
    .object({
      labelRequired: z.boolean(),
      reducedMotionSafe: z.boolean(),
      keyboardReachable: z.boolean()
    })
    .strict(),
  safetyPolicyIds: z.array(StableIdSchema).min(1),
  replayBehavior: z.enum(["deterministic", "state-derived", "event-derived"])
}).strict();
export type ComponentManifest = z.infer<typeof ComponentManifestSchema>;

export const ThemePackSchema = PublicContractBaseSchema.extend({
  kind: z.literal("theme"),
  displayName: z.string().min(1),
  capabilityTags: z.array(CapabilityTagSchema).min(1),
  supportedDomains: z.array(StableIdSchema).min(1),
  supportedAgeBands: z.array(AgeBandSchema).min(1),
  visualStyle: CapabilityTagSchema,
  audioStyle: CapabilityTagSchema,
  accessibility: z
    .object({
      highContrast: z.boolean(),
      reducedMotion: z.boolean(),
      readableText: z.boolean()
    })
    .strict(),
  allowedContentTags: z.array(CapabilityTagSchema).min(1),
  assetPromptConstraints: z.array(z.string().min(1)).default([])
}).strict();
export type ThemePack = z.infer<typeof ThemePackSchema>;

export const SafetyRuleSchema = z
  .object({
    ruleId: StableIdSchema,
    description: z.string().min(1),
    severity: ValidationSeveritySchema,
    capabilityTags: z.array(CapabilityTagSchema).default([])
  })
  .strict();

export const SafetyPolicyPackSchema = PublicContractBaseSchema.extend({
  kind: z.literal("safety-policy"),
  displayName: z.string().min(1),
  supportedDomains: z.array(StableIdSchema).min(1),
  ageBands: z.array(AgeBandSchema).min(1),
  rules: z.array(SafetyRuleSchema).min(1),
  privacy: z
    .object({
      allowPrivateChildData: z.boolean(),
      allowExternalNetwork: z.boolean()
    })
    .strict(),
  contentRules: z
    .object({
      noPunitiveFailures: z.boolean(),
      quietModeAvailable: z.boolean(),
      maxSessionMinutes: z.number().int().positive()
    })
    .strict()
}).strict();
export type SafetyPolicyPack = z.infer<typeof SafetyPolicyPackSchema>;

export const DomainProfileSchema = PublicContractBaseSchema.extend({
  kind: z.literal("domain-profile"),
  displayName: z.string().min(1),
  capabilityTags: z.array(CapabilityTagSchema).min(1),
  defaultSafetyPolicyId: StableIdSchema,
  allowedMechanicIds: z.array(StableIdSchema).min(1),
  allowedRuleIds: z.array(StableIdSchema).min(1),
  allowedComponentIds: z.array(StableIdSchema).min(1),
  allowedThemeIds: z.array(StableIdSchema).min(1),
  allowedAssetSourceIds: z.array(StableIdSchema).min(1),
  ageBands: z.array(AgeBandSchema).min(1),
  modalities: z.array(InputModalitySchema).min(1),
  defaults: z.record(JsonValueSchema).default({})
}).strict();
export type DomainProfile = z.infer<typeof DomainProfileSchema>;

export const SeedPolicySchema = z
  .object({
    mode: z.enum(["required", "optional", "unsupported"]),
    seed: z.string().min(1).optional()
  })
  .strict();

export const AssetGenerationRequestSchema = PublicContractBaseSchema.extend({
  kind: z.literal("asset-generation-request"),
  requestId: StableIdSchema,
  profileId: StableIdSchema.optional(),
  domainProfileId: StableIdSchema,
  safetyPolicyId: StableIdSchema,
  contentType: AssetContentTypeSchema,
  format: AssetFormatSchema,
  prompt: z.string().min(1),
  seedPolicy: SeedPolicySchema,
  metadata: z.record(JsonValueSchema).default({})
}).strict();
export type AssetGenerationRequest = z.infer<typeof AssetGenerationRequestSchema>;

export const AssetSourceCapabilityManifestSchema = PublicContractBaseSchema.extend({
  kind: z.literal("asset-source"),
  displayName: z.string().min(1),
  capabilityTags: z.array(CapabilityTagSchema).min(1),
  contentTypes: z.array(AssetContentTypeSchema).min(1),
  formats: z.array(AssetFormatSchema).min(1),
  seedSupport: z.boolean(),
  safetySupport: z.boolean(),
  offline: z.boolean(),
  requiresNetwork: z.boolean(),
  requiresCredentials: z.boolean(),
  maxBatchSize: z.number().int().positive()
}).strict();
export type AssetSourceCapabilityManifest = z.infer<typeof AssetSourceCapabilityManifestSchema>;

export const GeneratedAssetRecordSchema = PublicContractBaseSchema.extend({
  kind: z.literal("generated-asset"),
  requestId: StableIdSchema,
  assetId: StableIdSchema,
  sourceId: StableIdSchema,
  contentType: AssetContentTypeSchema,
  format: AssetFormatSchema,
  uri: z.string().min(1),
  altText: z.string().min(1),
  metadata: z.record(JsonValueSchema).default({}),
  provenance: z
    .object({
      sourceManifestId: StableIdSchema,
      sourceManifestVersion: VersionSchema,
      deterministic: z.boolean(),
      seed: z.string().optional(),
      seedSupported: z.boolean(),
      seedStatus: z.enum(["used", "unsupported", "not-provided"]),
      generatedAt: z.string().datetime()
    })
    .strict(),
  safety: z
    .object({
      status: SafetyStatusSchema,
      policyId: StableIdSchema,
      findings: z.array(SchemaIssueSchema).default([])
    })
    .strict()
}).strict();
export type GeneratedAssetRecord = z.infer<typeof GeneratedAssetRecordSchema>;

export const AssemblyValidationResultSchema = PublicContractBaseSchema.extend({
  kind: z.literal("assembly-validation-result"),
  profileId: StableIdSchema,
  valid: z.boolean(),
  errors: z.array(SchemaIssueSchema).default([]),
  warnings: z.array(SchemaIssueSchema).default([])
}).strict();
export type AssemblyValidationResult = z.infer<typeof AssemblyValidationResultSchema>;

export const PlaycraftEventRecordSchema = PublicContractBaseSchema.extend({
  kind: z.literal("playcraft-event"),
  profileId: StableIdSchema,
  runId: StableIdSchema.optional(),
  eventType: CapabilityTagSchema,
  eventName: CapabilityTagSchema,
  source: z
    .object({
      role: z.enum(["planner", "asset_requester", "asset_source", "safety_evaluator", "validator", "renderer", "frontend"]),
      sourceId: StableIdSchema
    })
    .strict(),
  sequence: z.number().int().nonnegative(),
  occurredAt: z.string().datetime(),
  payload: JsonValueSchema
}).strict();
export type PlaycraftEventRecord = z.infer<typeof PlaycraftEventRecordSchema>;

export const ComponentRenderRequestSchema = PublicContractBaseSchema.extend({
  kind: z.literal("component-render-request"),
  profileId: StableIdSchema,
  componentId: StableIdSchema,
  componentCapability: CapabilityTagSchema,
  mechanicBindingId: StableIdSchema,
  props: z.record(JsonValueSchema),
  assetBindings: z.record(StableIdSchema).default({}),
  expectedEmittedEvents: z.array(CapabilityTagSchema).default([]),
  fallbackPolicy: z.literal("fail-closed")
}).strict();
export type ComponentRenderRequest = z.infer<typeof ComponentRenderRequestSchema>;

export const PlaycraftAssemblyRequestSchema = PublicContractBaseSchema.extend({
  kind: z.literal("assembly-request"),
  intent: z
    .object({
      label: z.string().min(1),
      goals: z.array(CapabilityTagSchema).min(1),
      requestedCapabilities: z.array(CapabilityTagSchema).min(1)
    })
    .strict(),
  domainProfileId: StableIdSchema,
  safetyPolicyId: StableIdSchema.optional(),
  targetModalities: z.array(InputModalitySchema).min(1),
  ageBand: AgeBandSchema,
  deterministicSeed: z.string().min(1)
}).strict();
export type PlaycraftAssemblyRequest = z.infer<typeof PlaycraftAssemblyRequestSchema>;

export const MechanicBindingSchema = z
  .object({
    bindingId: StableIdSchema,
    mechanicId: StableIdSchema,
    version: VersionSchema,
    parameters: z.record(JsonValueSchema).default({}),
    eventBindings: z.record(CapabilityTagSchema).default({})
  })
  .strict();

export const RuleBindingSchema = z
  .object({
    bindingId: StableIdSchema,
    ruleId: StableIdSchema,
    version: VersionSchema,
    parameters: z.record(JsonValueSchema).default({}),
    defaultSource: z.enum(["profile", "manifest", "domain-profile", "safety-policy", "explicit-config"])
  })
  .strict();

export const ComponentBindingSchema = z
  .object({
    bindingId: StableIdSchema,
    componentId: StableIdSchema,
    version: VersionSchema,
    renderCapability: CapabilityTagSchema,
    mechanicBindingIds: z.array(StableIdSchema).min(1),
    props: z.record(JsonValueSchema),
    assetBindings: z.record(StableIdSchema).default({})
  })
  .strict();
export type ComponentBinding = z.infer<typeof ComponentBindingSchema>;

export const PlaycraftPayloadTypeSchema = z
  .string()
  .min(3)
  .max(96)
  .regex(/^[a-z][a-z0-9.-]*$/u, "payload types use lowercase dotted names");

export const PlaycraftAgUiEventEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(PLAYCRAFT_SCHEMA_VERSION),
    eventId: StableIdSchema,
    eventVersion: VersionSchema,
    profileId: StableIdSchema.optional(),
    runId: StableIdSchema.optional(),
    payloadType: PlaycraftPayloadTypeSchema,
    payload: JsonValueSchema,
    provenance: z
      .object({
        role: z.enum(["planner", "asset_requester", "asset_source", "safety_evaluator", "validator", "renderer", "frontend"]),
        sourceId: StableIdSchema
      })
      .strict()
  })
  .strict();
export type PlaycraftAgUiEventEnvelope = z.infer<typeof PlaycraftAgUiEventEnvelopeSchema>;

export const PackManifestSchema = PublicContractBaseSchema.extend({
  kind: z.enum([
    "mechanic-pack",
    "rule-pack",
    "component-pack",
    "theme-pack",
    "asset-source-pack",
    "domain-profile-pack",
    "safety-policy-pack"
  ]),
  providedCapabilities: z.array(CapabilityTagSchema).min(1),
  requiredPeerCapabilities: z.array(CapabilityTagSchema).default([]),
  compatibleDomainProfiles: z.array(StableIdSchema).min(1),
  compatibleSafetyPolicies: z.array(StableIdSchema).min(1),
  publicContractSchemas: z.array(z.string().min(1)).min(1),
  fixtures: z.array(z.string()).default([]),
  importLight: z.boolean(),
  requirements: z
    .object({
      network: z.boolean(),
      credentials: z.boolean(),
      native: z.boolean()
    })
    .strict()
}).strict();
export type PackManifest = z.infer<typeof PackManifestSchema>;

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

export const GameTemplateLiveSurfaceSchema = z
  .object({
    kind: GameTemplateLiveSurfaceKindSchema,
    componentCapabilities: GameTemplateLiveSurfaceComponentCapabilitiesSchema,
    assetReplacementSources: z.array(GameTemplateAssetReplacementSourceSchema).min(1),
    tokenStyles: z.array(GameTemplateTokenStyleSchema).min(1),
    defaultTokenStyle: GameTemplateTokenStyleSchema
  })
  .strict();
export type GameTemplateLiveSurface = z.infer<typeof GameTemplateLiveSurfaceSchema>;

export const GameTemplateDefinitionSchema = PublicContractBaseSchema.extend({
  id: BuilderTemplateIdSchema,
  kind: z.literal("game-template"),
  displayName: z.string().min(1),
  displayLabel: z.string().min(1).max(80),
  description: z.string().min(1),
  capabilityTags: z.array(CapabilityTagSchema).min(1),
  requestAliases: z.array(z.string().min(2).max(80)).min(1),
  requestAliasSummary: z.string().min(1).max(240),
  exampleRequest: z.string().min(2).max(120),
  assetPromptKind: GameTemplateAssetPromptKindSchema,
  assetEditOperations: z.array(GameTemplateAssetEditOperationSchema).min(1),
  liveSurface: GameTemplateLiveSurfaceSchema,
  assemblyRequestId: StableIdSchema,
  profileId: StableIdSchema,
  supportedAgeBands: z.array(AgeBandSchema).min(1),
  supportedModalities: z.array(InputModalitySchema).min(1),
  requiredMechanicIds: z.array(StableIdSchema).min(1),
  requiredRuleIds: z.array(StableIdSchema).min(1),
  requiredComponentIds: z.array(StableIdSchema).min(1),
  defaultAssetContentTypes: z.array(AssetContentTypeSchema).default(["image"]),
  localFirst: z.boolean(),
  retrieval: z
    .object({
      current: z.literal("bundled-local"),
      planned: z.literal("server-catalog")
    })
    .strict()
}).strict();
export type GameTemplateDefinition = z.infer<typeof GameTemplateDefinitionSchema>;

export const GameProfileTemplateSnapshotSchema = PublicContractBaseSchema.extend({
  id: BuilderTemplateIdSchema,
  kind: z.literal("game-template-snapshot"),
  displayName: z.string().min(1),
  displayLabel: z.string().min(1).max(80),
  assetPromptKind: GameTemplateAssetPromptKindSchema,
  assetEditOperations: z.array(GameTemplateAssetEditOperationSchema).min(1),
  liveSurface: GameTemplateLiveSurfaceSchema,
  assemblyRequestId: StableIdSchema
}).strict();
export type GameProfileTemplateSnapshot = z.infer<typeof GameProfileTemplateSnapshotSchema>;

export const GameAssemblyProfileSchema = PublicContractBaseSchema.extend({
  kind: z.literal("game-assembly-profile"),
  profileName: z.string().min(1),
  assemblyRequestId: StableIdSchema,
  template: GameProfileTemplateSnapshotSchema.optional(),
  domainProfile: z.object({ id: StableIdSchema, version: VersionSchema }).strict(),
  safetyPolicy: z.object({ id: StableIdSchema, version: VersionSchema }).strict(),
  theme: z.object({ id: StableIdSchema, version: VersionSchema }).strict(),
  mechanics: z.array(MechanicBindingSchema).min(1),
  rules: z.array(RuleBindingSchema).min(1),
  components: z.array(ComponentBindingSchema).min(1),
  assetRequests: z.array(AssetGenerationRequestSchema).default([]),
  assets: z.array(GeneratedAssetRecordSchema).default([]),
  replay: z
    .object({
      deterministicSeed: z.string().min(1),
      plannerId: StableIdSchema,
      plannerVersion: VersionSchema,
      unsupportedSeedRequests: z.array(StableIdSchema).default([]),
      eventLog: z.array(PlaycraftEventRecordSchema).default([])
    })
    .strict(),
  validation: AssemblyValidationResultSchema
}).strict()
  .refine((value) => !value.template || value.template.assemblyRequestId === value.assemblyRequestId, {
    message: "profile template snapshot must match assemblyRequestId",
    path: ["template", "assemblyRequestId"]
  });
export type GameAssemblyProfile = z.infer<typeof GameAssemblyProfileSchema>;

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

export const MoonshineTranscriptionConfigSchema = z
  .object({
    engine: z.literal("moonshine-streaming"),
    runtime: z.literal("cpu"),
    localOnly: z.literal(true)
  })
  .strict();
export type MoonshineTranscriptionConfig = z.infer<typeof MoonshineTranscriptionConfigSchema>;

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
  transcription: MoonshineTranscriptionConfigSchema.optional(),
  moonshineTranscript: MoonshineTranscriptRecordSchema.optional(),
  receivedAt: z.string().datetime(),
  metadata: z.record(JsonValueSchema).default({})
}).strict()
  .refine((value) => value.source !== "moonshine-transcript" || Boolean(value.transcription), {
    message: "Moonshine transcripts must declare the local transcription config",
    path: ["transcription"]
  })
  .refine((value) => value.source !== "moonshine-transcript" || Boolean(value.moonshineTranscript), {
    message: "moonshine-transcript input requires a Moonshine transcript record",
    path: ["moonshineTranscript"]
  })
  .refine((value) => value.source !== "text" || (!value.transcription && !value.moonshineTranscript), {
    message: "text input must not include Moonshine transcription config or transcript records",
    path: ["transcription"]
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
}).strict();
export type BuilderToolDefinition = z.infer<typeof BuilderToolDefinitionSchema>;

export const BuilderAssetEditCatalogEntrySchema = z
  .object({
    theme: z.string().min(1).max(80),
    displayLabel: z.string().min(1).max(80),
    localReplacementFolder: z.string().min(1).max(80),
    aliases: z.array(z.string().min(1).max(80)).default([]),
    aliasSummary: z.string().min(1).max(240),
    suggestedItemSummary: z.string().min(1).max(240),
    suggestedItems: z.array(z.string().min(1).max(48)).default([])
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
  "import-profile"
]);
export type BuilderServiceActionName = z.infer<typeof BuilderServiceActionNameSchema>;

export const BuilderServiceRequestFieldNameSchema = z.enum([
  "sessionId",
  "text",
  "source",
  "moonshineTranscript",
  "templateId",
  "assetEdit",
  "profile",
  "profileExport"
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
  .strict();
export type BuilderServiceCatalogAction = z.infer<typeof BuilderServiceCatalogActionSchema>;

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
  .strict();
export type BuilderServiceCatalog = z.infer<typeof BuilderServiceCatalogSchema>;

export const BuilderCatalogRequestTipsSchema = z
  .object({
    availableGames: z.array(z.string().min(1).max(80)).min(1),
    assetEdits: z.array(z.string().min(1).max(80)).min(1),
    examples: z.array(z.string().min(1).max(160)).min(1),
    summaryLines: z.array(z.string().min(1).max(240)).min(1)
  })
  .strict();
export type BuilderCatalogRequestTips = z.infer<typeof BuilderCatalogRequestTipsSchema>;

export const BuilderCatalogSchema = PublicContractBaseSchema.extend({
  kind: z.literal("builder-catalog"),
  defaultTemplateId: BuilderTemplateIdSchema,
  templates: z.array(GameTemplateDefinitionSchema).min(1),
  tools: z.array(BuilderToolDefinitionSchema).min(1),
  acceptedInputSources: z.array(BuilderInputSourceSchema).min(1),
  input: z
    .object({
      defaultSource: BuilderInputSourceSchema,
      transcriptSource: z.literal("moonshine-transcript"),
      noInputLabel: z.string().min(1).max(80),
      sourceOptions: z.array(BuilderInputSourceOptionSchema).min(1)
    })
    .strict(),
  requestTips: BuilderCatalogRequestTipsSchema,
  service: BuilderServiceCatalogSchema,
  sessions: z
    .object({
      defaultAssembleSessionId: StableIdSchema,
      sessionBoundActions: z.array(BuilderSessionBoundServiceActionNameSchema).min(1)
    })
    .strict(),
  assetEdit: z
    .object({
      supported: z.literal(true),
      acceptedKeys: z.array(z.enum(["theme", "items"])).min(1),
      maxItems: z.number().int().positive(),
      localReplacementFolders: z.boolean(),
      genericThemeTokens: z.array(z.string().min(1).max(40)).default([]),
      availableThemes: z.array(BuilderAssetEditCatalogEntrySchema).default([])
    })
    .strict(),
  retrieval: z
    .object({
      current: z.literal("bundled-local"),
      planned: z.literal("server-catalog")
    })
    .strict()
}).strict();
export type BuilderCatalog = z.infer<typeof BuilderCatalogSchema>;

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
        "ambiguous-template-match",
        "active-template",
        "default-template"
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

export const BuilderCommandSchema = PublicContractBaseSchema.extend({
  kind: z.literal("builder-command"),
  sessionId: StableIdSchema,
  actionName: BuilderActionNameSchema,
  templateId: BuilderTemplateIdSchema.optional(),
  input: BuilderInputRequestSchema.optional(),
  assetEdit: BuilderAssetEditSchema.optional(),
  profile: GameAssemblyProfileSchema.optional(),
  interaction: z
    .object({
      action: z.enum(["primary"])
    })
    .strict()
    .optional()
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
  });
export type BuilderCommand = z.infer<typeof BuilderCommandSchema>;

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

export const BuilderCommandResultSchema = PublicContractBaseSchema.extend({
  kind: z.literal("builder-command-result"),
  commandId: StableIdSchema,
  sessionId: StableIdSchema,
  profile: GameAssemblyProfileSchema.optional(),
  preview: BuilderPreviewStateSchema,
  validation: AssemblyValidationResultSchema.optional()
}).strict();
export type BuilderCommandResult = z.infer<typeof BuilderCommandResultSchema>;

export const BuilderSessionSnapshotSchema = z
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
    updatedAt: z.string().datetime()
  })
  .strict();
export type BuilderSessionSnapshot = z.infer<typeof BuilderSessionSnapshotSchema>;

export const BuilderProfileExportSchema = PublicContractBaseSchema.extend({
  kind: z.literal("builder-profile-export"),
  sessionId: StableIdSchema,
  templateId: BuilderTemplateIdSchema.optional(),
  assetEdit: BuilderAssetEditSchema.optional(),
  profile: GameAssemblyProfileSchema,
  preview: BuilderPreviewStateSchema.optional(),
  validation: AssemblyValidationResultSchema.optional(),
  exportedAt: z.string().datetime(),
  retrieval: z
    .object({
      current: z.literal("bundled-local"),
      planned: z.literal("server-catalog")
    })
    .strict()
}).strict();
export type BuilderProfileExport = z.infer<typeof BuilderProfileExportSchema>;

export const BuilderServiceExecutionSchema = z
  .object({
    schemaVersion: z.literal(PLAYCRAFT_SCHEMA_VERSION),
    result: BuilderCommandResultSchema,
    events: z.array(JsonValueSchema)
  })
  .strict();
export type BuilderServiceExecution = z.infer<typeof BuilderServiceExecutionSchema>;

const BuilderServiceResponsePayloadKeys = ["catalog", "execution", "session", "profileExport", "reset"] as const;

export const BuilderServiceRequestSchema = PublicContractBaseSchema.extend({
  kind: z.literal("builder-service-request"),
  actionName: BuilderServiceActionNameSchema,
  sessionId: StableIdSchema.optional(),
  text: z.string().min(1).max(500).optional(),
  source: BuilderInputSourceSchema.optional(),
  moonshineTranscript: MoonshineTranscriptRecordSchema.optional(),
  templateId: BuilderTemplateIdSchema.optional(),
  assetEdit: BuilderAssetEditSchema.optional(),
  profile: GameAssemblyProfileSchema.optional(),
  profileExport: BuilderProfileExportSchema.optional()
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
  .refine((value) => !value.moonshineTranscript || value.source !== "text", {
    message: "Moonshine transcript records must not use text source",
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
  });
export type BuilderServiceRequest = z.infer<typeof BuilderServiceRequestSchema>;

export const BuilderServiceRequestBatchSchema = z.array(BuilderServiceRequestSchema).min(1);
export type BuilderServiceRequestBatch = z.infer<typeof BuilderServiceRequestBatchSchema>;

export const BuilderServiceResponseSchema = PublicContractBaseSchema.extend({
  kind: z.literal("builder-service-response"),
  requestId: StableIdSchema,
  actionName: BuilderServiceActionNameSchema,
  catalog: BuilderCatalogSchema.optional(),
  execution: BuilderServiceExecutionSchema.optional(),
  session: BuilderSessionSnapshotSchema.optional(),
  profileExport: BuilderProfileExportSchema.optional(),
  reset: z.literal(true).optional()
}).strict()
  .refine((value) => value.actionName !== "catalog" || Boolean(value.catalog), {
    message: "catalog responses require a catalog",
    path: ["catalog"]
  })
  .refine((value) => value.actionName !== "catalog" || hasOnlyServiceResponsePayloads(value, ["catalog"]), {
    message: "catalog responses only include catalog output",
    path: ["catalog"]
  })
  .refine((value) => !["assemble", "update", "preview"].includes(value.actionName) || Boolean(value.execution && value.session), {
    message: "assemble, update, and preview responses require execution output and a session snapshot",
    path: ["execution"]
  })
  .refine((value) => !["assemble", "update", "preview"].includes(value.actionName) || hasOnlyServiceResponsePayloads(value, ["execution", "session"]), {
    message: "assemble, update, and preview responses only include execution output and a session snapshot",
    path: ["execution"]
  })
  .refine((value) => value.actionName !== "get-session" || Boolean(value.session), {
    message: "get-session responses require a session snapshot",
    path: ["session"]
  })
  .refine((value) => value.actionName !== "get-session" || hasOnlyServiceResponsePayloads(value, ["session"]), {
    message: "get-session responses only include a session snapshot",
    path: ["session"]
  })
  .refine((value) => value.actionName !== "export-profile" || Boolean(value.profileExport), {
    message: "export-profile responses require a profile export",
    path: ["profileExport"]
  })
  .refine((value) => value.actionName !== "export-profile" || hasOnlyServiceResponsePayloads(value, ["profileExport"]), {
    message: "export-profile responses only include a profile export",
    path: ["profileExport"]
  })
  .refine((value) => value.actionName !== "import-profile" || Boolean(value.execution && value.session), {
    message: "import-profile responses require execution output and a session snapshot",
    path: ["execution"]
  })
  .refine((value) => value.actionName !== "import-profile" || hasOnlyServiceResponsePayloads(value, ["execution", "session"]), {
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
  });
export type BuilderServiceResponse = z.infer<typeof BuilderServiceResponseSchema>;

function hasOnlyServiceResponsePayloads(
  value: Record<string, unknown>,
  allowedPayloads: Array<(typeof BuilderServiceResponsePayloadKeys)[number]>
): boolean {
  return BuilderServiceResponsePayloadKeys.every((key) =>
    allowedPayloads.includes(key) ? value[key] !== undefined : value[key] === undefined
  );
}

export const PublicContractSchemas: Record<PublicContractName, z.ZodTypeAny> = {
  PlaycraftAssemblyRequestSchema,
  DomainProfileSchema,
  SafetyPolicyPackSchema,
  GameAssemblyProfileSchema,
  MechanicDefinitionSchema,
  RuleModuleDefinitionSchema,
  ComponentManifestSchema,
  ComponentRenderRequestSchema,
  ThemePackSchema,
  FrontendToolDefinitionSchema,
  AssetGenerationRequestSchema,
  AssetSourceCapabilityManifestSchema,
  GeneratedAssetRecordSchema,
  AssemblyValidationResultSchema,
  PlaycraftAgUiEventEnvelopeSchema,
  PlaycraftEventRecordSchema,
  PackManifestSchema,
  GameProfileTemplateSnapshotSchema,
  GameTemplateDefinitionSchema,
  MoonshineTranscriptRecordSchema,
  BuilderInputRequestSchema,
  BuilderToolDefinitionSchema,
  BuilderCatalogSchema,
  BuilderIntentResolutionSchema,
  BuilderCommandSchema,
  BuilderPreviewStateSchema,
  BuilderCommandResultSchema,
  BuilderSessionSnapshotSchema,
  BuilderProfileExportSchema,
  BuilderServiceExecutionSchema,
  BuilderServiceRequestSchema,
  BuilderServiceRequestBatchSchema,
  BuilderServiceResponseSchema
} as const;

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
