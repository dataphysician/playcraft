import { z } from "zod";
import {
  CapabilityTagSchema,
  JsonValueSchema,
  PublicContractBaseSchema,
  StableIdSchema,
  type PublicContractName
} from "./base.js";
import { ComponentManifestSchema, RuleModuleDefinitionSchema } from "./manifests.js";
import { AssetSourceCapabilityManifestSchema } from "./asset.js";

// base.ts re-exports this module, creating a circular import where base.ts is
// mid-initialization while enrichment.ts is being loaded. Every schema in this
// module that references a base.ts binding — directly or transitively — must
// be wrapped in z.lazy(() => …) to defer construction until first parse, by
// which point base.ts has finished loading. This matches the lazy pattern
// used in workflow.ts, mcp.ts, sse.ts, asset.ts, ag-ui.ts, builder-catalog.ts,
// game-template.ts, packs.ts, manifests.ts, and builder.ts.

/**
 * What the local agent asks the remote enrichment source for.
 * Capabilities are the gap the local registries couldn't satisfy.
 */
export const EnrichmentCapabilityGapSchema = z.lazy(() =>
  z
    .object({
      missingCapabilities: z.array(CapabilityTagSchema).min(1),
      requestedMechanicIds: z.array(StableIdSchema).default([]),
      requestedRuleIds: z.array(StableIdSchema).default([]),
      requestedComponentIds: z.array(StableIdSchema).default([]),
      context: z.record(JsonValueSchema).default({})
    })
    .strict()
);
export type EnrichmentCapabilityGap = z.infer<typeof EnrichmentCapabilityGapSchema>;

export const EnrichmentResponseStatusSchema = z.enum(["ok", "unsupported", "rate-limited", "error"]);
export type EnrichmentResponseStatus = z.infer<typeof EnrichmentResponseStatusSchema>;

/**
 * A remote enrichment request the local agent loop sends when local registries
 * cannot satisfy a capability gap. The remote source answers with a
 * RemoteEnrichmentResponse.
 */
export const RemoteEnrichmentRequestSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("remote-enrichment-request"),
    requestId: StableIdSchema,
    engine: z.string().min(1),
    agentTranscriptId: StableIdSchema.optional(),
    gap: EnrichmentCapabilityGapSchema
  }).strict()
);
export type RemoteEnrichmentRequest = z.infer<typeof RemoteEnrichmentRequestSchema>;

/**
 * A remote enrichment response. Either fully `ok` with the requested building
 * blocks (components, rules, assetSources), or a non-ok status that must
 * include an `error` field describing why the remote source declined.
 */
export const RemoteEnrichmentResponseSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("remote-enrichment-response"),
    requestId: StableIdSchema,
    status: EnrichmentResponseStatusSchema,
    components: z.array(ComponentManifestSchema).default([]),
    rules: z.array(RuleModuleDefinitionSchema).default([]),
    assetSources: z.array(AssetSourceCapabilityManifestSchema).default([]),
    bytes: z.number().int().nonnegative(),
    error: z.string().min(1).optional(),
    cacheHit: z.boolean().default(false)
  })
    .strict()
    .refine((value) => value.status === "ok" || value.error !== undefined, {
      message: "non-ok enrichment responses must include an error",
      path: ["error"]
    })
);
export type RemoteEnrichmentResponse = z.infer<typeof RemoteEnrichmentResponseSchema>;

export const ENRICHMENT_PUBLIC_CONTRACT_NAMES = [
  "RemoteEnrichmentRequestSchema",
  "RemoteEnrichmentResponseSchema"
] as const satisfies readonly PublicContractName[];

export type EnrichmentPublicContractName = (typeof ENRICHMENT_PUBLIC_CONTRACT_NAMES)[number];