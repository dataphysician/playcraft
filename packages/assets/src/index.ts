import {
  AssetGenerationRequestSchema,
  AssetProviderCapabilityManifestSchema,
  GeneratedAssetRecordSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type AssetContentTypeSchema,
  type AssetFormatSchema,
  type AssetGenerationRequest,
  type AssetProviderCapabilityManifest,
  type GeneratedAssetRecord
} from "@playcraft/contracts";
import type { z } from "zod";

export type AssetContentType = z.infer<typeof AssetContentTypeSchema>;
export type AssetFormat = z.infer<typeof AssetFormatSchema>;

export interface StubAssetProviderOptions {
  manifest?: AssetProviderCapabilityManifest;
}

export const STUB_ASSET_PROVIDER_ID = "asset-provider.stub-deterministic";
export const STUB_ASSET_PROVIDER_VERSION = "1.0.0";

export function createStubAssetProviderManifest(overrides: Partial<AssetProviderCapabilityManifest> = {}): AssetProviderCapabilityManifest {
  const manifest: AssetProviderCapabilityManifest = {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: STUB_ASSET_PROVIDER_ID,
    version: STUB_ASSET_PROVIDER_VERSION,
    kind: "asset-provider",
    displayName: "Deterministic Stub Asset Provider",
    capabilityTags: ["asset:stub", "asset:offline", "asset:deterministic"],
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

  return AssetProviderCapabilityManifestSchema.parse(manifest);
}

export function providerManifestSupportsRequest(
  manifest: AssetProviderCapabilityManifest,
  request: AssetGenerationRequest
): { supported: true } | { supported: false; reason: string } {
  if (!manifest.contentTypes.includes(request.contentType)) {
    return { supported: false, reason: `content type ${request.contentType} is not supported` };
  }

  if (!manifest.formats.includes(request.format)) {
    return { supported: false, reason: `format ${request.format} is not supported` };
  }

  if (!manifest.offline || manifest.requiresNetwork || manifest.requiresCredentials) {
    return { supported: false, reason: "v1 stub provider must be offline and credential-free" };
  }

  return { supported: true };
}

export class DeterministicStubAssetProvider {
  readonly manifest: AssetProviderCapabilityManifest;

  constructor(options: StubAssetProviderOptions = {}) {
    this.manifest = AssetProviderCapabilityManifestSchema.parse(options.manifest ?? createStubAssetProviderManifest());
  }

  generate(requestInput: AssetGenerationRequest): GeneratedAssetRecord {
    const request = AssetGenerationRequestSchema.parse(requestInput);
    const supported = providerManifestSupportsRequest(this.manifest, request);
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
      providerId: this.manifest.id,
      contentType: request.contentType,
      format: request.format,
      uri: `stub://${request.contentType}/${digest}.${request.format}`,
      altText: `Deterministic ${request.contentType} asset for ${request.prompt}`,
      metadata: {
        promptDigest: digest,
        source: "deterministic-stub"
      },
      provenance: {
        providerManifestId: this.manifest.id,
        providerManifestVersion: this.manifest.version,
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
      throw new Error(`batch size ${requests.length} exceeds provider max ${this.manifest.maxBatchSize}`);
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
