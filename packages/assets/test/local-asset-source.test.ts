import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import {
  DeterministicLocalAssetSource,
  createLocalAssetSourceManifest,
  localAssetEditCatalog,
  localAssetEditGenericThemeTokens,
  localAssetEditIntentPatterns,
  localAssetEditMaxItems,
  localAssetEditMaxThemeLength,
  loadManifestFromFolder,
  mergeAssetCatalogs
} from "@playcraft/assets";
import {
  AssetCatalogManifestSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type AssetGenerationRequest,
  type AssetCatalogManifest,
  type BuilderAssetEditCatalogEntry
} from "@playcraft/contracts";
import { ZodError } from "zod";

// Capture at module evaluation time because vitest/jsdom rewrites import.meta.url
// inside test bodies.
const testFileUrl = import.meta.url;
const testRoot = fileURLToPath(new URL(".", testFileUrl));
const replacementsRoot = join(
  testRoot,
  "..",
  "..",
  "..",
  "apps",
  "studio",
  "src",
  "assets",
  "library",
  "replacements"
);

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
    expect(localAssetEditCatalog.map((entry) => entry.localReplacementFolder)).toEqual(["dinosaurs", "toys", "dolphins", "fruits"]);
    expect(localAssetEditCatalog.find((entry) => entry.theme === "dolphins")?.aliases).toContain("ocean animals");
    expect(localAssetEditCatalog.find((entry) => entry.theme === "dolphins")?.aliasSummary).toBe("dolphin, dolphins, ocean animals, ocean animal, sea animals, sea animal");
    expect(localAssetEditCatalog.find((entry) => entry.theme === "dolphins")?.suggestedItemSummary).toBe("dolphin-1, dolphin-2, dolphin-3");
    expect(localAssetEditCatalog.every((entry) => entry.suggestedItems.length > 0)).toBe(true);
    expect(localAssetEditMaxItems).toBe(12);
    expect(localAssetEditMaxThemeLength).toBe(80);
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

describe("loadManifestFromFolder", () => {
  function makeTempFolder(label: string): string {
    const safeLabel = label.replace(/[^a-z0-9_-]/giu, "_");
    return mkdtempSync(join(tmpdir(), `playcraft-assets-${safeLabel}-`));
  }

  it("loads a valid catalog.json manifest from a folder", async () => {
    const folder = makeTempFolder("valid");
    writeFileSync(
      join(folder, "catalog.json"),
      JSON.stringify({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "asset-catalog-manifest.test.dinosaurs",
        version: "1.0.0",
        kind: "asset-catalog-manifest",
        source: "catalog.json",
        theme: "dinosaurs",
        displayLabel: "Dinosaurs",
        aliases: ["dinosaur"],
        suggestedItems: ["dinosaur-1", "dinosaur-2", "dinosaur-3"],
        spriteNaming: { kind: "ordinal", rules: {} }
      })
    );

    try {
      const manifest = await loadManifestFromFolder(folder);
      expect(manifest).not.toBeNull();
      expect(manifest?.theme).toBe("dinosaurs");
      expect(manifest?.displayLabel).toBe("Dinosaurs");
      expect(manifest?.aliases).toEqual(["dinosaur"]);
      expect(manifest?.suggestedItems).toEqual(["dinosaur-1", "dinosaur-2", "dinosaur-3"]);
      expect(manifest?.spriteNaming.kind).toBe("ordinal");
      expect(manifest?.source).toBe("catalog.json");
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("returns null when catalog.json is absent (no filename auto-discovery)", async () => {
    const folder = makeTempFolder("missing");
    try {
      const manifest = await loadManifestFromFolder(folder);
      expect(manifest).toBeNull();
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("returns null for a folder that only contains sprite PNGs without catalog.json", async () => {
    const folder = makeTempFolder("sprites-only");
    writeFileSync(join(folder, "dinosaur-1.png"), "fake-png-bytes");
    writeFileSync(join(folder, "dinosaur-2.png"), "fake-png-bytes");
    try {
      const manifest = await loadManifestFromFolder(folder);
      expect(manifest).toBeNull();
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("throws a ZodError when catalog.json is malformed (missing source field)", async () => {
    const folder = makeTempFolder("malformed");
    writeFileSync(
      join(folder, "catalog.json"),
      JSON.stringify({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "asset-catalog-manifest.test.malformed",
        version: "1.0.0",
        kind: "asset-catalog-manifest",
        theme: "dinosaurs",
        displayLabel: "Dinosaurs",
        suggestedItems: ["dinosaur-1"],
        spriteNaming: { kind: "ordinal", rules: {} }
      })
    );

    try {
      await expect(loadManifestFromFolder(folder)).rejects.toBeInstanceOf(ZodError);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("throws a ZodError when catalog.json has wrong source literal value", async () => {
    const folder = makeTempFolder("wrong-source");
    writeFileSync(
      join(folder, "catalog.json"),
      JSON.stringify({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "asset-catalog-manifest.test.wrong-source",
        version: "1.0.0",
        kind: "asset-catalog-manifest",
        source: "manifest.json",
        theme: "dinosaurs",
        displayLabel: "Dinosaurs",
        suggestedItems: ["dinosaur-1"],
        spriteNaming: { kind: "ordinal", rules: {} }
      })
    );

    try {
      await expect(loadManifestFromFolder(folder)).rejects.toBeInstanceOf(ZodError);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("throws when catalog.json is not valid JSON", async () => {
    const folder = makeTempFolder("bad-json");
    writeFileSync(join(folder, "catalog.json"), "{not valid json");
    try {
      await expect(loadManifestFromFolder(folder)).rejects.toThrow();
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("validates the bundled replacement folders under apps/studio load successfully", async () => {
    const themes = ["dinosaurs", "toys", "dolphins", "fruits"];
    for (const theme of themes) {
      const folder = join(replacementsRoot, theme);
      expect(existsSync(folder)).toBe(true);
      const manifest = await loadManifestFromFolder(folder);
      expect(manifest).not.toBeNull();
      expect(manifest?.theme).toBe(theme);
      expect(manifest?.source).toBe("catalog.json");
    }
  });
});

describe("mergeAssetCatalogs", () => {
  function entry(input: Partial<BuilderAssetEditCatalogEntry> & { theme: string }): BuilderAssetEditCatalogEntry {
    return {
      theme: input.theme,
      displayLabel: input.displayLabel ?? input.theme,
      localReplacementFolder: input.localReplacementFolder ?? input.theme,
      aliases: input.aliases ?? [input.theme],
      aliasSummary: input.aliasSummary ?? input.theme,
      suggestedItemSummary: input.suggestedItemSummary ?? `${input.theme}-1`,
      suggestedItems: input.suggestedItems ?? [`${input.theme}-1`]
    };
  }

  it("replaces a bundled entry when discovered theme matches (last-wins, deterministic)", () => {
    const bundled: BuilderAssetEditCatalogEntry[] = [
      entry({ theme: "dinosaurs", displayLabel: "dinosaurs", localReplacementFolder: "dinosaurs" })
    ];
    const discovered: AssetCatalogManifest[] = [
      AssetCatalogManifestSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "asset-catalog-manifest.discovered.dinosaurs",
        version: "1.0.0",
        kind: "asset-catalog-manifest",
        source: "catalog.json",
        theme: "dinosaurs",
        displayLabel: "Dinosaurs (from disk)",
        aliases: ["dinosaur", "dinos"],
        suggestedItems: ["dino-1", "dino-2", "dino-3"],
        spriteNaming: { kind: "ordinal", rules: {} }
      })
    ];

    const merged = mergeAssetCatalogs(bundled, discovered);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.displayLabel).toBe("Dinosaurs (from disk)");
    expect(merged[0]?.aliases).toEqual(["dinosaur", "dinos"]);
    expect(merged[0]?.suggestedItems).toEqual(["dino-1", "dino-2", "dino-3"]);
    expect(bundled).toHaveLength(1);
    expect(bundled[0]?.displayLabel).toBe("dinosaurs");
  });

  it("appends new discovered themes that are not in the bundled catalog", () => {
    const bundled: BuilderAssetEditCatalogEntry[] = [
      entry({ theme: "dinosaurs" })
    ];
    const discovered: AssetCatalogManifest[] = [
      AssetCatalogManifestSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "asset-catalog-manifest.discovered.vehicles",
        version: "1.0.0",
        kind: "asset-catalog-manifest",
        source: "catalog.json",
        theme: "vehicles",
        displayLabel: "Vehicles",
        aliases: ["vehicle", "vehicles", "cars"],
        suggestedItems: ["vehicle-1", "vehicle-2"],
        spriteNaming: { kind: "ordinal", rules: {} }
      })
    ];

    const merged = mergeAssetCatalogs(bundled, discovered);
    expect(merged).toHaveLength(2);
    expect(merged.map((row) => row.theme)).toEqual(["dinosaurs", "vehicles"]);
    expect(bundled).toHaveLength(1);
  });

  it("sorts the merged result by theme (deterministic order)", () => {
    const bundled: BuilderAssetEditCatalogEntry[] = [
      entry({ theme: "dinosaurs" }),
      entry({ theme: "fruits" })
    ];
    const discovered: AssetCatalogManifest[] = [
      AssetCatalogManifestSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "asset-catalog-manifest.discovered.apples",
        version: "1.0.0",
        kind: "asset-catalog-manifest",
        source: "catalog.json",
        theme: "apples",
        displayLabel: "Apples",
        aliases: ["apple"],
        suggestedItems: ["apple-1"],
        spriteNaming: { kind: "ordinal", rules: {} }
      }),
      AssetCatalogManifestSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "asset-catalog-manifest.discovered.cars",
        version: "1.0.0",
        kind: "asset-catalog-manifest",
        source: "catalog.json",
        theme: "cars",
        displayLabel: "Cars",
        aliases: ["car", "cars"],
        suggestedItems: ["car-1"],
        spriteNaming: { kind: "ordinal", rules: {} }
      })
    ];

    const merged = mergeAssetCatalogs(bundled, discovered);
    expect(merged.map((row) => row.theme)).toEqual(["apples", "cars", "dinosaurs", "fruits"]);
  });

  it("does not mutate the bundled catalog when merging", () => {
    const bundled: BuilderAssetEditCatalogEntry[] = [
      entry({ theme: "dinosaurs", displayLabel: "bundled-dinos" }),
      entry({ theme: "toys", displayLabel: "bundled-toys" })
    ];
    const bundledSnapshot = JSON.parse(JSON.stringify(bundled));
    const discovered: AssetCatalogManifest[] = [
      AssetCatalogManifestSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "asset-catalog-manifest.discovered.dinosaurs",
        version: "1.0.0",
        kind: "asset-catalog-manifest",
        source: "catalog.json",
        theme: "dinosaurs",
        displayLabel: "Replaced Dinosaurs",
        aliases: ["dinosaur"],
        suggestedItems: ["dinosaur-1"],
        spriteNaming: { kind: "ordinal", rules: {} }
      }),
      AssetCatalogManifestSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "asset-catalog-manifest.discovered.cats",
        version: "1.0.0",
        kind: "asset-catalog-manifest",
        source: "catalog.json",
        theme: "cats",
        displayLabel: "Cats",
        aliases: ["cat"],
        suggestedItems: ["cat-1"],
        spriteNaming: { kind: "ordinal", rules: {} }
      })
    ];

    mergeAssetCatalogs(bundled, discovered);
    expect(bundled).toEqual(bundledSnapshot);
  });

  it("integration: dropping a new folder with valid catalog.json adds the theme to the merged catalog", async () => {
    const folder = mkdtempSync(join(tmpdir(), "playcraft-assets-integration-"));
    try {
      writeFileSync(
        join(folder, "catalog.json"),
        JSON.stringify({
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: "asset-catalog-manifest.integration.space",
          version: "1.0.0",
          kind: "asset-catalog-manifest",
          source: "catalog.json",
          theme: "space",
          displayLabel: "Space",
          aliases: ["space", "planets", "stars"],
          suggestedItems: ["space-1", "space-2", "space-3"],
          spriteNaming: { kind: "ordinal", rules: {} }
        })
      );

      const manifest = await loadManifestFromFolder(folder);
      expect(manifest).not.toBeNull();
      const merged = mergeAssetCatalogs(localAssetEditCatalog, manifest ? [manifest] : []);
      expect(merged.map((row) => row.theme)).toContain("space");
      expect(merged.find((row) => row.theme === "space")?.displayLabel).toBe("Space");
      expect(merged.find((row) => row.theme === "space")?.suggestedItems).toEqual(["space-1", "space-2", "space-3"]);
      expect(merged.every((row) => row.localReplacementFolder.length > 0)).toBe(true);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});

describe("bundled replacement theme catalog.json manifests", () => {
  function catalogJsonPath(theme: string): string {
    return join(replacementsRoot, theme, "catalog.json");
  }

  it.each(["dinosaurs", "toys", "dolphins", "fruits"] as const)(
    "%s/catalog.json exists and parses as a valid manifest",
    (theme) => {
      const path = catalogJsonPath(theme);
      expect(existsSync(path)).toBe(true);
      const parsed = AssetCatalogManifestSchema.parse(JSON.parse(readFileSync(path, "utf8")));
      expect(parsed.theme).toBe(theme);
      expect(parsed.source).toBe("catalog.json");
      expect(parsed.suggestedItems.length).toBeGreaterThan(0);
    }
  );
});