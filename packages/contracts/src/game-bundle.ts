import { z } from "zod";
import { PublicContractBaseSchema } from "./base.js";
import { AssetSourceCapabilityManifestSchema } from "./asset.js";
import {
  ComponentManifestSchema,
  DomainProfileSchema,
  MechanicDefinitionSchema,
  RuleModuleDefinitionSchema,
  SafetyPolicyPackSchema,
  ThemePackSchema
} from "./manifests.js";
import { BuilderProfileExportSchema } from "./builder.js";

// base.ts re-exports this module, creating a circular import where base.ts is
// mid-initialization while game-bundle.ts is being loaded. Every schema in this
// module that references a base.ts binding — directly or transitively — must
// be wrapped in z.lazy(() => …) to defer construction until first parse, by
// which point base.ts has finished loading. This matches the lazy pattern
// used in workflow.ts, mcp.ts, sse.ts, asset.ts, ag-ui.ts, builder-catalog.ts,
// game-template.ts, packs.ts, manifests.ts, and builder.ts.

export const PlaycraftRegistriesSnapshotSchema = z.lazy(() =>
  z
    .object({
      mechanics: z.array(MechanicDefinitionSchema).default([]),
      rules: z.array(RuleModuleDefinitionSchema).default([]),
      components: z.array(ComponentManifestSchema).default([]),
      themes: z.array(ThemePackSchema).default([]),
      assetSources: z.array(AssetSourceCapabilityManifestSchema).default([]),
      domains: z.array(DomainProfileSchema).default([]),
      safetyPolicies: z.array(SafetyPolicyPackSchema).default([])
    })
    .strict()
);
export type PlaycraftRegistriesSnapshot = z.infer<typeof PlaycraftRegistriesSnapshotSchema>;

export const GameBundleAssetReplacementSchema = z.union([
  z.string().min(1),
  z
    .object({
      uri: z.string().min(1),
      altText: z.string().min(1).optional()
    })
    .strict()
]);
export type GameBundleAssetReplacement = z.infer<typeof GameBundleAssetReplacementSchema>;

export const GAME_BUNDLE_MAX_BYTES = 512 * 1024;
export const GAME_BUNDLE_MAX_REGISTRY_ENTRIES = 256;

export const GameBundleCapEnforcementSchema = z.lazy(() =>
  z
    .object({
      maxBytes: z.number().int().positive().default(GAME_BUNDLE_MAX_BYTES),
      maxRegistryEntries: z.number().int().positive().default(GAME_BUNDLE_MAX_REGISTRY_ENTRIES),
      purgedEntryIds: z.array(z.string().min(1)).default([]),
      enforcedAt: z.string().datetime()
    })
    .strict()
);
export type GameBundleCapEnforcement = z.infer<typeof GameBundleCapEnforcementSchema>;

export const GameBundleSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("game-bundle"),
    profileExport: BuilderProfileExportSchema,
    registries: PlaycraftRegistriesSnapshotSchema,
    assetReplacements: z.record(z.string(), GameBundleAssetReplacementSchema).optional(),
    capEnforcement: GameBundleCapEnforcementSchema
  })
    .strict()
    .superRefine((value, context) => {
      const registryEntryCount =
        value.registries.mechanics.length +
        value.registries.rules.length +
        value.registries.components.length +
        value.registries.themes.length +
        value.registries.assetSources.length +
        value.registries.domains.length +
        value.registries.safetyPolicies.length;
      if (registryEntryCount > value.capEnforcement.maxRegistryEntries) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `game bundle registries ${registryEntryCount} entries exceeds max ${value.capEnforcement.maxRegistryEntries}; ${value.capEnforcement.purgedEntryIds.length} entries should have been purged by the cap`,
          path: ["registries"]
        });
      }
    })
);
export type GameBundle = z.infer<typeof GameBundleSchema>;
