import { z } from "zod";
import {
  CapabilityTagSchema,
  JsonValueSchema,
  PublicContractBaseSchema,
  StableIdSchema,
  type PublicContractName
} from "./base.js";

// base.ts re-exports this module, creating a circular import where base.ts is
// mid-initialization while enrichment.ts is being loaded. Every schema in this
// module that references a base.ts binding — directly or transitively — must
// be wrapped in z.lazy(() => …) to defer construction until first parse, by
// which point base.ts has finished loading. This matches the lazy pattern
// used in workflow.ts, mcp.ts, sse.ts, asset.ts, ag-ui.ts, builder-catalog.ts,
// game-template.ts, packs.ts, manifests.ts, and builder.ts.

/**
 * User-triggered paid online assembly request. The user explicitly consents
 * (literal `true`) and supplies a payment confirmation id. The
 * `capabilityGap` is inlined — the local registries did not satisfy these
 * capabilities, and the user has chosen to escalate to the paid client.
 */
export const PaidOnlineAssemblyCapabilityGapSchema = z.lazy(() =>
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
export type PaidOnlineAssemblyCapabilityGap = z.infer<typeof PaidOnlineAssemblyCapabilityGapSchema>;

export const PaidOnlineAssemblyRequestSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("paid-online-assembly-request"),
    requestId: StableIdSchema,
    sessionId: StableIdSchema,
    userConsent: z.literal(true),
    paymentConfirmationId: z.string().min(1),
    capabilityGap: PaidOnlineAssemblyCapabilityGapSchema
  }).strict()
);
export type PaidOnlineAssemblyRequest = z.infer<typeof PaidOnlineAssemblyRequestSchema>;

/**
 * Paid online assembly response. Carries the cost (in cents) and the
 * estimated completion seconds so the studio UI can surface them in the
 * confirmation dialog and after the request is acknowledged. The remoteUrl
 * is the auditable source for the paid bundle.
 */
export const PaidOnlineAssemblyResponseSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("paid-online-assembly-response"),
    requestId: StableIdSchema,
    bundleId: StableIdSchema,
    costCents: z.number().int().nonnegative(),
    estimatedCompletionSeconds: z.number().int().positive(),
    remoteUrl: z.string().url()
  }).strict()
);
export type PaidOnlineAssemblyResponse = z.infer<typeof PaidOnlineAssemblyResponseSchema>;

export const ENRICHMENT_PUBLIC_CONTRACT_NAMES = [
  "PaidOnlineAssemblyRequestSchema",
  "PaidOnlineAssemblyResponseSchema"
] as const satisfies readonly PublicContractName[];

export type EnrichmentPublicContractName = (typeof ENRICHMENT_PUBLIC_CONTRACT_NAMES)[number];