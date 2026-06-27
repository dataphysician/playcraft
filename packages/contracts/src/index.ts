import { z } from "zod";

export const PLAYCRAFT_SCHEMA_VERSION = "playcraft.v1";

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
export const InputModalitySchema = z.enum(["touch", "pointer", "keyboard", "audio", "voice"]);
export const AssetContentTypeSchema = z.enum(["image", "audio", "video", "animation", "text"]);
export const AssetFormatSchema = z.enum(["svg", "png", "webp", "mp3", "wav", "json", "plain-text"]);
export const SafetyStatusSchema = z.enum(["safe", "blocked", "needs-review"]);
export const ValidationSeveritySchema = z.enum(["error", "warning", "info"]);

export const JsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export type JsonValue = z.infer<typeof JsonPrimitiveSchema> | JsonValue[] | { [key: string]: JsonValue };
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([JsonPrimitiveSchema, z.array(JsonValueSchema), z.record(JsonValueSchema)])
);

export const JsonFieldSchema = z
  .object({
    type: z.enum(["string", "number", "boolean", "object", "array", "record"]),
    required: z.boolean().default(true),
    minItems: z.number().int().nonnegative().optional(),
    allowedValues: z.array(JsonPrimitiveSchema).optional()
  })
  .strict();

export const JsonObjectSchemaDescriptorSchema = z
  .object({
    schemaVersion: z.literal(PLAYCRAFT_SCHEMA_VERSION),
    type: z.literal("object"),
    fields: z.record(JsonFieldSchema),
    allowUnknown: z.boolean().default(false)
  })
  .strict();

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
      allowVoiceCapture: z.boolean(),
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
  allowedAssetProviderIds: z.array(StableIdSchema).min(1),
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

export const AssetProviderCapabilityManifestSchema = PublicContractBaseSchema.extend({
  kind: z.literal("asset-provider"),
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
export type AssetProviderCapabilityManifest = z.infer<typeof AssetProviderCapabilityManifestSchema>;

export const GeneratedAssetRecordSchema = PublicContractBaseSchema.extend({
  kind: z.literal("generated-asset"),
  requestId: StableIdSchema,
  assetId: StableIdSchema,
  providerId: StableIdSchema,
  contentType: AssetContentTypeSchema,
  format: AssetFormatSchema,
  uri: z.string().min(1),
  altText: z.string().min(1),
  metadata: z.record(JsonValueSchema).default({}),
  provenance: z
    .object({
      providerManifestId: StableIdSchema,
      providerManifestVersion: VersionSchema,
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
      role: z.enum(["planner", "asset_requester", "asset_provider", "safety_evaluator", "validator", "renderer", "frontend"]),
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
  componentId: StableIdSchema.optional(),
  componentCapability: CapabilityTagSchema.optional(),
  mechanicBindingId: StableIdSchema,
  props: z.record(JsonValueSchema),
  assetBindings: z.record(StableIdSchema).default({}),
  expectedEmittedEvents: z.array(CapabilityTagSchema).default([]),
  fallbackPolicy: z.enum(["fail-closed", "skip-component"])
}).strict()
  .refine((value) => Boolean(value.componentId || value.componentCapability), {
    message: "componentId or componentCapability is required",
    path: ["componentId"]
  });
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

export const GameAssemblyProfileSchema = PublicContractBaseSchema.extend({
  kind: z.literal("game-assembly-profile"),
  profileName: z.string().min(1),
  assemblyRequestId: StableIdSchema,
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
}).strict();
export type GameAssemblyProfile = z.infer<typeof GameAssemblyProfileSchema>;

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
        role: z.enum(["planner", "asset_requester", "asset_provider", "safety_evaluator", "validator", "renderer", "frontend"]),
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
    "asset-provider-pack",
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

export const PublicContractSchemas = {
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
  AssetProviderCapabilityManifestSchema,
  GeneratedAssetRecordSchema,
  AssemblyValidationResultSchema,
  PlaycraftAgUiEventEnvelopeSchema,
  PlaycraftEventRecordSchema,
  PackManifestSchema
} as const;

export type PublicContractName = keyof typeof PublicContractSchemas;

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
