import { z } from "zod";
import {
  PublicContractBaseSchema,
  CapabilityTagSchema,
  StableIdSchema,
  AgeBandSchema,
  InputModalitySchema,
  AssetContentTypeSchema,
  JsonValueSchema,
  JsonObjectSchemaDescriptorSchema,
  ValidationSeveritySchema,
  CompatibilityConstraintsSchema,
  VersionSchema,
  ProvenanceSchema
} from "./base.js";
import { AssetRequirementSchema } from "./asset.js";
import { McpServerPolicy } from "./mcp.js";

// base.ts re-exports this module, creating a circular import where base.ts is
// mid-initialization while manifests.ts is being loaded. Every schema in this
// module that references a base.ts binding — directly or transitively — must
// be wrapped in z.lazy(() => …) to defer construction until first parse, by
// which point base.ts has finished loading. This matches the lazy pattern
// used in workflow.ts, mcp.ts, sse.ts, asset.ts, ag-ui.ts, builder-catalog.ts,
// game-template.ts, builder.ts, and packs.ts.

export const FrontendToolDefinitionSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("frontend-tool"),
    toolName: CapabilityTagSchema,
    description: z.string().min(1),
    argumentsSchema: JsonObjectSchemaDescriptorSchema,
    emittedEvents: z.array(CapabilityTagSchema).default([])
  }).strict()
);
export type FrontendToolDefinition = z.infer<typeof FrontendToolDefinitionSchema>;

export const MechanicDefinitionSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("mechanic"),
    displayName: z.string().min(1),
    capabilityTags: z.array(CapabilityTagSchema).min(1),
    supportedModalities: z.array(InputModalitySchema).min(1),
    supportedAgeBands: z.array(AgeBandSchema).min(1),
    supportedDomains: z.array(StableIdSchema).min(1),
    consumesEvents: z.array(CapabilityTagSchema).default([]),
    emitsEvents: z.array(CapabilityTagSchema).min(1),
    requiredAssetContentTypes: z.array(AssetContentTypeSchema).default([]),
    compatibility: CompatibilityConstraintsSchema,
    provenance: ProvenanceSchema
  }).strict()
);
export type MechanicDefinition = z.infer<typeof MechanicDefinitionSchema>;

export const RuleModuleDefinitionSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("rule-module"),
    category: CapabilityTagSchema,
    displayName: z.string().min(1),
    capabilityTags: z.array(CapabilityTagSchema).min(1),
    supportedMechanicIds: z.array(StableIdSchema).min(1),
    consumesEvents: z.array(CapabilityTagSchema).min(1),
    emitsEvents: z.array(CapabilityTagSchema).min(1),
    defaultSource: z.enum(["profile", "manifest", "domain-profile", "safety-policy", "explicit-config"]),
    compatibility: CompatibilityConstraintsSchema,
    provenance: ProvenanceSchema
  }).strict()
);
export type RuleModuleDefinition = z.infer<typeof RuleModuleDefinitionSchema>;

export const ComponentManifestSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
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
    replayBehavior: z.enum(["deterministic", "state-derived", "event-derived"]),
    provenance: ProvenanceSchema
  }).strict()
);
export type ComponentManifest = z.infer<typeof ComponentManifestSchema>;

export const ThemePackSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
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
    assetPromptConstraints: z.array(z.string().min(1)).default([]),
    provenance: ProvenanceSchema
  }).strict()
);
export type ThemePack = z.infer<typeof ThemePackSchema>;

export const SafetyRuleSchema = z.lazy(() =>
  z
    .object({
      ruleId: StableIdSchema,
      description: z.string().min(1),
      severity: ValidationSeveritySchema,
      capabilityTags: z.array(CapabilityTagSchema).default([])
    })
    .strict()
);

export const SafetyPolicyPackSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
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
      .strict(),
    provenance: ProvenanceSchema
  }).strict()
);
export type SafetyPolicyPack = z.infer<typeof SafetyPolicyPackSchema>;

export const DomainProfileSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
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
    defaults: z.record(JsonValueSchema).default({}),
    provenance: ProvenanceSchema
  }).strict()
);
export type DomainProfile = z.infer<typeof DomainProfileSchema>;

export const ComponentRenderRequestSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("component-render-request"),
    profileId: StableIdSchema,
    componentId: StableIdSchema,
    componentVersion: VersionSchema,
    componentCapability: CapabilityTagSchema,
    mechanicBindingId: StableIdSchema,
    props: z.record(JsonValueSchema),
    assetBindings: z.record(StableIdSchema).default({}),
    emittedToolNames: z.array(CapabilityTagSchema).default([]),
    expectedEmittedEvents: z.array(CapabilityTagSchema).default([]),
    fallbackPolicy: z.literal("fail-closed")
  }).strict()
);
export type ComponentRenderRequest = z.infer<typeof ComponentRenderRequestSchema>;

export const PlaycraftAssemblyRequestSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
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
  }).strict()
);
export type PlaycraftAssemblyRequest = z.infer<typeof PlaycraftAssemblyRequestSchema>;

export const PLAYCRAFT_MCP_GUARDRAILS: McpServerPolicy = {
  schemaVersion: "playcraft.v1",
  id: "mcp-server-policy.playcraft-local",
  version: "1.0.0",
  kind: "mcp-server-policy",
  localOnly: true,
  noAuth: true,
  noNetworkExecution: true,
  noDatabaseAccess: true,
  allowlistedTools: [
    "assemble-game",
    "update-game",
    "preview-action",
    "list-builder-tools",
    "get-session",
    "export-profile",
    "import-profile"
  ]
};