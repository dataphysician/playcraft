import {
  AssetSourceCapabilityManifestSchema,
  BUNDLED_LOCAL_PROVENANCE,
  PLAYCRAFT_SCHEMA_VERSION
} from "@playcraft/contracts";
import { LOCAL_ASSET_SOURCE_ID, LOCAL_ASSET_SOURCE_VERSION } from "@playcraft/assets";

export const assetSourceManifests = [
  AssetSourceCapabilityManifestSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: LOCAL_ASSET_SOURCE_ID,
    version: LOCAL_ASSET_SOURCE_VERSION,
    kind: "asset-source",
    displayName: "Local Asset Folder Source",
    capabilityTags: ["asset:local", "asset:offline", "asset:user-provided"],
    contentTypes: ["image"],
    formats: ["png"],
    seedSupport: false,
    safetySupport: true,
    offline: true,
    requiresNetwork: false,
    requiresCredentials: false,
    maxBatchSize: 32,
    provenance: BUNDLED_LOCAL_PROVENANCE
  })
];