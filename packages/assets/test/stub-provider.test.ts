import { describe, expect, it } from "vitest";
import {
  DeterministicStubAssetProvider,
  createStubAssetProviderManifest
} from "@playcraft/assets";
import {
  PLAYCRAFT_SCHEMA_VERSION,
  type AssetGenerationRequest
} from "@playcraft/contracts";

const request: AssetGenerationRequest = {
  schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
  id: "asset-request.test",
  version: "1.0.0",
  kind: "asset-generation-request",
  requestId: "asset-request.test",
  domainProfileId: "domain.child-edu",
  safetyPolicyId: "safety.child-friendly",
  contentType: "image",
  format: "svg",
  prompt: "friendly test icon",
  seedPolicy: {
    mode: "required",
    seed: "seed-a"
  },
  metadata: {}
};

describe("deterministic stub asset provider", () => {
  it("returns stable generated asset records for the same request and seed", () => {
    const provider = new DeterministicStubAssetProvider();

    expect(provider.generate(request)).toEqual(provider.generate(request));
    expect(provider.generate(request).provenance.seedStatus).toBe("used");
  });

  it("changes deterministic records when the seed changes", () => {
    const provider = new DeterministicStubAssetProvider();
    const changed = provider.generate({
      ...request,
      seedPolicy: {
        mode: "required",
        seed: "seed-b"
      }
    });

    expect(changed.assetId).not.toBe(provider.generate(request).assetId);
  });

  it("records unsupported seed behavior without network or credentials", () => {
    const provider = new DeterministicStubAssetProvider({
      manifest: createStubAssetProviderManifest({ seedSupport: false })
    });
    const asset = provider.generate(request);

    expect(asset.provenance.seedStatus).toBe("unsupported");
    expect(asset.provenance.seedSupported).toBe(false);
    expect(provider.manifest.offline).toBe(true);
    expect(provider.manifest.requiresCredentials).toBe(false);
    expect(provider.manifest.requiresNetwork).toBe(false);
  });

  it("rejects unsupported formats", () => {
    const provider = new DeterministicStubAssetProvider();

    expect(() => provider.generate({ ...request, format: "mp3" })).toThrow(/format mp3 is not supported/u);
  });
});
