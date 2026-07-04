import {
  AssetGenerationRequestSchema,
  AssetSourceCapabilityManifestSchema,
  GeneratedAssetRecordSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  BuilderAssetEditCatalogEntrySchema,
  type AssetContentTypeSchema,
  type AssetFormatSchema,
  type AssetGenerationRequest,
  type AssetSourceCapabilityManifest,
  type BuilderAssetEditCatalogEntry,
  type GeneratedAssetRecord
} from "@playcraft/contracts";
import type { z } from "zod";

export type AssetContentType = z.infer<typeof AssetContentTypeSchema>;
export type AssetFormat = z.infer<typeof AssetFormatSchema>;

export interface LocalAssetSourceOptions {
  manifest?: AssetSourceCapabilityManifest;
}

export const LOCAL_ASSET_SOURCE_ID = "asset-source.local-deterministic";
export const LOCAL_ASSET_SOURCE_VERSION = "1.0.0";
export const localAssetEditGenericThemeTokens = [
  "asset",
  "assets",
  "card",
  "cards",
  "card image",
  "card images",
  "image",
  "images",
  "art",
  "theme"
];
export const localAssetEditCatalog: BuilderAssetEditCatalogEntry[] = [
  BuilderAssetEditCatalogEntrySchema.parse({
    theme: "dinosaurs",
    displayLabel: "dinosaurs",
    aliases: ["dinosaur", "dinosaurs"],
    suggestedItems: ["dinosaur-1", "dinosaur-2", "dinosaur-3"]
  }),
  BuilderAssetEditCatalogEntrySchema.parse({
    theme: "toys",
    displayLabel: "toys",
    aliases: ["toy", "toys"],
    suggestedItems: ["toy-1", "toy-2", "toy-3"]
  }),
  BuilderAssetEditCatalogEntrySchema.parse({
    theme: "dolphins",
    displayLabel: "ocean animals",
    aliases: ["dolphin", "dolphins", "ocean animals", "ocean animal", "sea animals", "sea animal"],
    suggestedItems: ["dolphin-1", "dolphin-2", "dolphin-3"]
  }),
  BuilderAssetEditCatalogEntrySchema.parse({
    theme: "fruits",
    displayLabel: "fruit",
    aliases: ["fruit", "fruits"],
    suggestedItems: ["fruit-1", "fruit-2", "fruit-3"]
  })
];

export function createLocalAssetSourceManifest(overrides: Partial<AssetSourceCapabilityManifest> = {}): AssetSourceCapabilityManifest {
  const manifest: AssetSourceCapabilityManifest = {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: LOCAL_ASSET_SOURCE_ID,
    version: LOCAL_ASSET_SOURCE_VERSION,
    kind: "asset-source",
    displayName: "Deterministic Local Asset Source",
    capabilityTags: ["asset:local", "asset:offline", "asset:deterministic"],
    contentTypes: ["image", "audio", "text"],
    formats: ["svg", "png", "wav", "plain-text", "json"],
    seedSupport: true,
    safetySupport: true,
    offline: true,
    requiresNetwork: false,
    requiresCredentials: false,
    maxBatchSize: 32,
    ...overrides
  };

  return AssetSourceCapabilityManifestSchema.parse(manifest);
}

export function assetSourceManifestSupportsRequest(
  manifest: AssetSourceCapabilityManifest,
  request: AssetGenerationRequest
): { supported: true } | { supported: false; reason: string } {
  if (!manifest.contentTypes.includes(request.contentType)) {
    return { supported: false, reason: `content type ${request.contentType} is not supported` };
  }

  if (!manifest.formats.includes(request.format)) {
    return { supported: false, reason: `format ${request.format} is not supported` };
  }

  if (!manifest.offline || manifest.requiresNetwork || manifest.requiresCredentials) {
    return { supported: false, reason: "v1 local asset source must be offline and credential-free" };
  }

  return { supported: true };
}

export class DeterministicLocalAssetSource {
  readonly manifest: AssetSourceCapabilityManifest;

  constructor(options: LocalAssetSourceOptions = {}) {
    this.manifest = AssetSourceCapabilityManifestSchema.parse(options.manifest ?? createLocalAssetSourceManifest());
  }

  generate(requestInput: AssetGenerationRequest): GeneratedAssetRecord {
    const request = AssetGenerationRequestSchema.parse(requestInput);
    const supported = assetSourceManifestSupportsRequest(this.manifest, request);
    if (!supported.supported) {
      throw new Error(supported.reason);
    }

    const seedStatus = this.seedStatusFor(request);
    const seedPart = seedStatus === "used" ? request.seedPolicy.seed : "unseeded";
    const digest = stableHash([
      request.id,
      request.requestId,
      request.contentType,
      request.format,
      request.prompt,
      request.safetyPolicyId,
      request.domainProfileId,
      seedPart
    ].join("|"));
    const assetId = `asset.${digest}`;

    return GeneratedAssetRecordSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `generated.${digest}`,
      version: "1.0.0",
      kind: "generated-asset",
      requestId: request.requestId,
      assetId,
      sourceId: this.manifest.id,
      contentType: request.contentType,
      format: request.format,
      uri: `local-asset://${request.contentType}/${digest}.${request.format}`,
      altText: `Deterministic ${request.contentType} asset for ${request.prompt}`,
      metadata: {
        promptDigest: digest,
        source: "deterministic-local"
      },
      provenance: {
        sourceManifestId: this.manifest.id,
        sourceManifestVersion: this.manifest.version,
        deterministic: true,
        seed: request.seedPolicy.seed,
        seedSupported: this.manifest.seedSupport,
        seedStatus,
        generatedAt: "2026-06-27T00:00:00.000Z"
      },
      safety: {
        status: "safe",
        policyId: request.safetyPolicyId,
        findings: []
      }
    });
  }

  generateBatch(requests: AssetGenerationRequest[]): GeneratedAssetRecord[] {
    if (requests.length > this.manifest.maxBatchSize) {
      throw new Error(`batch size ${requests.length} exceeds asset source max ${this.manifest.maxBatchSize}`);
    }

    return requests.map((request) => this.generate(request));
  }

  private seedStatusFor(request: AssetGenerationRequest): GeneratedAssetRecord["provenance"]["seedStatus"] {
    if (!this.manifest.seedSupport || request.seedPolicy.mode === "unsupported") {
      return "unsupported";
    }

    if (request.seedPolicy.seed) {
      return "used";
    }

    return "not-provided";
  }
}

export function stableHash(input: string): string {
  let hash = 2166136261;
  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
