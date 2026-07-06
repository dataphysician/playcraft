import { z } from "zod";
import { CapabilityTagSchema, PublicContractBaseSchema, StableIdSchema } from "./base.js";

// base.ts re-exports this module, creating a circular import where base.ts is
// mid-initialization while packs.ts is being loaded. PackManifestSchema extends
// PublicContractBaseSchema and references CapabilityTagSchema and StableIdSchema
// from base.ts, so it must be wrapped in z.lazy(() => …) to defer construction
// until first parse — by which point base.ts has finished loading. This matches
// the lazy pattern used in asset.ts, workflow.ts, mcp.ts, and sse.ts.

export const PackManifestSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
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
  }).strict()
);
export type PackManifest = z.infer<typeof PackManifestSchema>;
