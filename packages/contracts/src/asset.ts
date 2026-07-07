import { z } from "zod";
import {
  AssetContentTypeSchema,
  AssetFormatSchema,
  CapabilityTagSchema,
  JsonValueSchema,
  ProvenanceSchema,
  PublicContractBaseSchema,
  SafetyStatusSchema,
  SchemaIssueSchema,
  StableIdSchema,
  VersionSchema
} from "./base.js";

// base.ts re-exports this module, creating a circular import where base.ts is
// mid-initialization while asset.ts is being loaded. Every schema in this
// module that references a base.ts binding — directly or transitively — must
// be wrapped in z.lazy(() => …) to defer construction until first parse, by
// which point base.ts has finished loading. This matches the lazy pattern
// used in workflow.ts, mcp.ts, and sse.ts. AssetRequirementSchema references
// CapabilityTagSchema and AssetContentTypeSchema from base.ts and is therefore
// lazy-wrapped even though it is a plain ZodObject; without the lazy wrapper,
// vite-node / vitest may evaluate asset.ts before base.ts in the cycle and
// see CapabilityTagSchema as undefined, leaving AssetRequirementSchema.shape
// with an undefined key. SeedPolicySchema is kept as a plain ZodObject because
// it only references zod primitives (no base.ts imports).

export const AssetRequirementSchema = z.lazy(() =>
  z
    .object({
      binding: CapabilityTagSchema,
      contentTypes: z.array(AssetContentTypeSchema).min(1),
      required: z.boolean().default(true)
    })
    .strict()
);
export type AssetRequirement = z.infer<typeof AssetRequirementSchema>;

export const SeedPolicySchema = z
  .object({
    mode: z.enum(["required", "optional", "unsupported"]),
    seed: z.string().min(1).optional()
  })
  .strict();
export type SeedPolicy = z.infer<typeof SeedPolicySchema>;

export const AssetGenerationRequestSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
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
  }).strict()
);
export type AssetGenerationRequest = z.infer<typeof AssetGenerationRequestSchema>;

export const AssetSourceCapabilityManifestSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
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
    maxBatchSize: z.number().int().positive(),
    provenance: ProvenanceSchema
  }).strict()
);
export type AssetSourceCapabilityManifest = z.infer<typeof AssetSourceCapabilityManifestSchema>;

export const GeneratedAssetRecordSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
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
        deterministic: z.boolean().optional(),
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
  }).strict()
);
export type GeneratedAssetRecord = z.infer<typeof GeneratedAssetRecordSchema>;

export const AssetProvenanceSchema = z.lazy(() =>
  z
    .object({
      sourceManifestId: StableIdSchema,
      sourceManifestVersion: VersionSchema,
      deterministic: z.boolean().optional(),
      seed: z.string().optional(),
      seedSupported: z.boolean(),
      seedStatus: z.enum(["used", "unsupported", "not-provided"]),
      generatedAt: z.string().datetime().optional()
    })
    .strict()
);
export type AssetProvenance = z.infer<typeof AssetProvenanceSchema>;

export const AssemblyValidationResultSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("assembly-validation-result"),
    profileId: StableIdSchema,
    valid: z.boolean(),
    errors: z.array(SchemaIssueSchema).default([]),
    warnings: z.array(SchemaIssueSchema).default([])
  }).strict()
);
export type AssemblyValidationResult = z.infer<typeof AssemblyValidationResultSchema>;

export const AssetCatalogManifestSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("asset-catalog-manifest"),
    source: z.literal("catalog.json"),
    theme: z.string().min(1).max(80),
    displayLabel: z.string().min(1).max(80),
    aliases: z.array(z.string().min(1).max(80)).default([]),
    suggestedItems: z.array(z.string().min(1).max(48)).min(1),
    spriteNaming: z
      .object({
        kind: z.enum(["ordinal", "exact", "paired"]),
        rules: z.record(z.unknown())
      })
      .strict()
  }).strict()
);
export type AssetCatalogManifest = z.infer<typeof AssetCatalogManifestSchema>;
