import { describe, expect, it } from "vitest";
import {
  DeterministicLocalAssetSource,
  createLocalAssetSourceManifest,
  localAssetEditGenericThemeTokens,
  localAssetEditIntentPatterns,
  localAssetEditCatalog
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

describe("deterministic local asset source", () => {
  it("publishes the shared local asset edit catalog used by service and Studio", () => {
    expect(localAssetEditCatalog.map((entry) => entry.theme)).toEqual(["dinosaurs", "toys", "dolphins", "fruits"]);
    expect(localAssetEditCatalog.map((entry) => entry.displayLabel)).toEqual(["dinosaurs", "toys", "ocean animals", "fruit"]);
    expect(localAssetEditCatalog.find((entry) => entry.theme === "dolphins")?.aliases).toContain("ocean animals");
    expect(localAssetEditCatalog.every((entry) => entry.suggestedItems.length > 0)).toBe(true);
    expect(localAssetEditGenericThemeTokens).toEqual(expect.arrayContaining(["asset", "assets", "card images", "theme"]));
    expect(localAssetEditIntentPatterns.map((entry) => entry.source)).toEqual([
      "freeform-asset-request",
      "freeform-asset-request",
      "catalog-asset-alias",
      "catalog-asset-alias",
      "freeform-asset-request"
    ]);
  });

  it("returns stable generated asset records for the same request and seed", () => {
    const source = new DeterministicLocalAssetSource();

    expect(source.generate(request)).toEqual(source.generate(request));
    expect(source.generate(request).provenance.seedStatus).toBe("used");
  });

  it("changes deterministic records when the seed changes", () => {
    const source = new DeterministicLocalAssetSource();
    const changed = source.generate({
      ...request,
      seedPolicy: {
        mode: "required",
        seed: "seed-b"
      }
    });

    expect(changed.assetId).not.toBe(source.generate(request).assetId);
  });

  it("records unsupported seed behavior without network or credentials", () => {
    const source = new DeterministicLocalAssetSource({
      manifest: createLocalAssetSourceManifest({ seedSupport: false })
    });
    const asset = source.generate(request);

    expect(asset.provenance.seedStatus).toBe("unsupported");
    expect(asset.provenance.seedSupported).toBe(false);
    expect(source.manifest.offline).toBe(true);
    expect(source.manifest.requiresCredentials).toBe(false);
    expect(source.manifest.requiresNetwork).toBe(false);
  });

  it("rejects unsupported formats", () => {
    const source = new DeterministicLocalAssetSource();

    expect(() => source.generate({ ...request, format: "mp3" })).toThrow(/format mp3 is not supported/u);
  });
});
