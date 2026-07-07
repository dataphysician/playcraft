import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it } from "vitest";
import {
  CANONICAL_LOCAL_ASSET_FOLDER,
  LOCAL_ASSET_SOURCE_ID,
  LOCAL_ASSET_SOURCE_VERSION,
  LocalAssetFolderSource
} from "@playcraft/assets";
import {
  PLAYCRAFT_SCHEMA_VERSION,
  type AssetGenerationRequest,
  type GeneratedAssetRecord
} from "@playcraft/contracts";

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

function makeRequest(overrides: Partial<AssetGenerationRequest> = {}): AssetGenerationRequest {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "asset-request.test",
    version: "1.0.0",
    kind: "asset-generation-request",
    requestId: "asset-request.test",
    domainProfileId: "domain.child-edu",
    safetyPolicyId: "safety.child-friendly",
    contentType: "image",
    format: "png",
    prompt: "child-safe dinosaur memory card illustrations for dinosaur-1",
    seedPolicy: { mode: "required", seed: "seed-a" },
    metadata: { assetEditTheme: "dinosaurs", assetEditItems: ["dinosaur-1", "dinosaur-2"] },
    ...overrides
  };
}

describe("LocalAssetFolderSource constants", () => {
  it("publishes the canonical replacements folder under apps/studio/src/assets/library/replacements", () => {
    expect(CANONICAL_LOCAL_ASSET_FOLDER).toBe("apps/studio/src/assets/library/replacements");
  });

  it("publishes the local-folder source manifest id and version", () => {
    expect(LOCAL_ASSET_SOURCE_ID).toBe("asset-source.local-folder");
    expect(LOCAL_ASSET_SOURCE_VERSION).toBe("1.0.0");
  });
});

describe("LocalAssetFolderSource constructor", () => {
  it("defaults to canonical=true when canonical flag is omitted", () => {
    const source = new LocalAssetFolderSource({ folder: replacementsRoot });
    expect(source.canonical).toBe(true);
  });

  it("throws when folder is empty", () => {
    expect(() => new LocalAssetFolderSource({ folder: "" })).toThrow(/non-empty folder path/u);
  });

  it("throws when folder is missing", () => {
    expect(() => new LocalAssetFolderSource({ folder: "" as unknown as string })).toThrow();
  });
});

describe("LocalAssetFolderSource manifest", () => {
  let source: LocalAssetFolderSource;

  beforeEach(() => {
    source = new LocalAssetFolderSource({ folder: replacementsRoot });
  });

  it("reports schemaVersion, id, version, and kind on the manifest", () => {
    expect(source.manifest.schemaVersion).toBe(PLAYCRAFT_SCHEMA_VERSION);
    expect(source.manifest.id).toBe(LOCAL_ASSET_SOURCE_ID);
    expect(source.manifest.version).toBe(LOCAL_ASSET_SOURCE_VERSION);
    expect(source.manifest.kind).toBe("asset-source");
  });

  it("advertises only the image/png formats the folder source can serve", () => {
    expect(source.manifest.contentTypes).toEqual(["image"]);
    expect(source.manifest.formats).toEqual(["png"]);
  });

  it("declares user-provided offline capabilities with no seed or credential support", () => {
    expect(source.manifest.seedSupport).toBe(false);
    expect(source.manifest.safetySupport).toBe(true);
    expect(source.manifest.offline).toBe(true);
    expect(source.manifest.requiresNetwork).toBe(false);
    expect(source.manifest.requiresCredentials).toBe(false);
  });
});

describe("LocalAssetFolderSource folder scan", () => {
  let source: LocalAssetFolderSource;

  beforeEach(() => {
    source = new LocalAssetFolderSource({ folder: replacementsRoot });
  });

  it("lists every bundled replacement theme", () => {
    expect(source.listThemes()).toEqual(["dinosaurs", "dolphins", "fruits", "toys"]);
  });

  it("returns folder-scoped sprites for a given theme", () => {
    const dinosaurs = source.listSpritesForTheme("dinosaurs");
    expect(dinosaurs.map((sprite) => sprite.basename)).toEqual(["dinosaur-1", "dinosaur-2", "dinosaur-3"]);
    expect(dinosaurs.every((sprite) => sprite.theme === "dinosaurs")).toBe(true);
  });

  it("returns every sprite across all themes sorted by theme/basename", () => {
    const all = source.listAllSprites();
    expect(all.map((sprite) => `${sprite.theme}/${sprite.basename}`)).toEqual([
      "dinosaurs/dinosaur-1",
      "dinosaurs/dinosaur-2",
      "dinosaurs/dinosaur-3",
      "dolphins/dolphin-1",
      "dolphins/dolphin-2",
      "dolphins/dolphin-3",
      "fruits/fruit-1",
      "fruits/fruit-2",
      "fruits/fruit-3",
      "toys/toy-1",
      "toys/toy-2",
      "toys/toy-3"
    ]);
  });

  it("returns an empty list when the folder does not exist", () => {
    const empty = new LocalAssetFolderSource({ folder: join(tmpdir(), "playcraft-assets-no-such-folder-xyz") });
    expect(empty.listAllSprites()).toEqual([]);
    expect(empty.listThemes()).toEqual([]);
  });
});

describe("LocalAssetFolderSource generate", () => {
  let source: LocalAssetFolderSource;

  beforeEach(() => {
    source = new LocalAssetFolderSource({ folder: replacementsRoot });
  });

  it("produces a GeneratedAssetRecord with the correct assetId and uri scheme", () => {
    const record: GeneratedAssetRecord = source.generate(makeRequest());

    expect(record.sourceId).toBe(LOCAL_ASSET_SOURCE_ID);
    expect(record.contentType).toBe("image");
    expect(record.format).toBe("png");
    expect(record.assetId).toBe("asset.dinosaurs.dinosaur-1");
    expect(record.uri.startsWith("file://")).toBe(true);
    expect(record.uri.endsWith("/dinosaurs/dinosaur-1.png")).toBe(true);
  });

  it("marks provenance as not-provided, non-deterministic, and offline-friendly", () => {
    const record = source.generate(makeRequest());

    expect(record.provenance.sourceManifestId).toBe(LOCAL_ASSET_SOURCE_ID);
    expect(record.provenance.seedStatus).toBe("not-provided");
    expect(record.provenance.seedSupported).toBe(false);
    expect(record.provenance.deterministic).toBeUndefined();
    expect(typeof record.provenance.generatedAt).toBe("string");
    expect(() => new Date(record.provenance.generatedAt).toISOString()).not.toThrow();
  });

  it("emits an altText that names the sprite basename", () => {
    const record = source.generate(makeRequest({ metadata: { assetEditTheme: "fruits", assetEditItems: ["fruit-2"] } }));
    expect(record.altText).toBe("fruit-2 sprite");
  });

  it("uses the metadata assetEditItems hint to resolve to a specific sprite", () => {
    const record = source.generate(
      makeRequest({ metadata: { assetEditTheme: "toys", assetEditItems: ["toy-3"] } })
    );
    expect(record.assetId).toBe("asset.toys.toy-3");
    expect(record.uri.endsWith("/toys/toy-3.png")).toBe(true);
  });

  it("rejects content types other than image", () => {
    expect(() => source.generate(makeRequest({ contentType: "audio" }))).toThrow(/does not support content type/u);
  });

  it("rejects formats other than png", () => {
    expect(() => source.generate(makeRequest({ format: "svg" }))).toThrow(/does not support format/u);
  });

  it("falls back to the first available sprite when no explicit hint or token matches", () => {
    const fallback = source.generate(makeRequest({ prompt: "absolutely nothing matches", metadata: {} }));
    expect(fallback.assetId).toMatch(/^asset\.[a-z0-9-]+\.[a-z0-9-]+$/u);
  });
});

describe("LocalAssetFolderSource generateBatch", () => {
  let source: LocalAssetFolderSource;

  beforeEach(() => {
    source = new LocalAssetFolderSource({ folder: replacementsRoot });
  });

  it("returns one record per request in the same order", () => {
    const records = source.generateBatch([
      makeRequest({ requestId: "asset-request.batch.1", metadata: { assetEditTheme: "dinosaurs", assetEditItems: ["dinosaur-1"] } }),
      makeRequest({ requestId: "asset-request.batch.2", metadata: { assetEditTheme: "dinosaurs", assetEditItems: ["dinosaur-2"] } }),
      makeRequest({ requestId: "asset-request.batch.3", metadata: { assetEditTheme: "dinosaurs", assetEditItems: ["dinosaur-3"] } })
    ]);
    expect(records.map((record) => record.assetId)).toEqual([
      "asset.dinosaurs.dinosaur-1",
      "asset.dinosaurs.dinosaur-2",
      "asset.dinosaurs.dinosaur-3"
    ]);
  });

  it("rejects batches larger than the manifest maxBatchSize", () => {
    const oversized = Array.from({ length: source.manifest.maxBatchSize + 1 }, (_, index) =>
      makeRequest({ requestId: `asset-request.batch.${index}` })
    );
    expect(() => source.generateBatch(oversized)).toThrow(/batch size 33 exceeds asset source max 32/u);
  });
});

describe("LocalAssetFolderSource synthetic fixtures", () => {
  function makeTempFolder(label: string): string {
    const safeLabel = label.replace(/[^a-z0-9_-]/giu, "_");
    return mkdtempSync(join(tmpdir(), `playcraft-assets-folder-${safeLabel}-`));
  }

  function writePng(folder: string, theme: string, basename: string): void {
    const themeFolder = join(folder, theme);
    mkdirSync(themeFolder, { recursive: true });
    writeFileSync(join(themeFolder, `${basename}.png`), "fake-png-bytes");
  }

  it("scans a temp folder that contains nested theme subfolders with PNGs", () => {
    const folder = makeTempFolder("nested");
    writePng(folder, "dinosaurs", "dinosaur-1");
    writePng(folder, "dinosaurs", "dinosaur-2");
    writePng(folder, "fruits", "fruit-1");
    try {
      const source = new LocalAssetFolderSource({ folder });
      expect(source.listThemes().sort()).toEqual(["dinosaurs", "fruits"]);
      expect(source.listSpritesForTheme("dinosaurs").map((sprite) => sprite.basename)).toEqual(["dinosaur-1", "dinosaur-2"]);
      const record = source.generate(makeRequest({ metadata: { assetEditTheme: "fruits", assetEditItems: ["fruit-1"] } }));
      expect(record.assetId).toBe("asset.fruits.fruit-1");
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("ignores non-PNG files inside a replacement theme folder", () => {
    const folder = makeTempFolder("mixed");
    const themeFolder = join(folder, "toys");
    mkdirSync(themeFolder, { recursive: true });
    writeFileSync(join(themeFolder, "toy-1.png"), "fake-png-bytes");
    writeFileSync(join(themeFolder, "notes.txt"), "metadata");
    try {
      const source = new LocalAssetFolderSource({ folder });
      expect(source.listSpritesForTheme("toys").map((sprite) => sprite.basename)).toEqual(["toy-1"]);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("ignores the catalog.json manifest when scanning for PNG sprites", () => {
    const folder = makeTempFolder("with-manifest");
    writePng(folder, "dolphins", "dolphin-1");
    writeFileSync(join(folder, "dolphins", "catalog.json"), '{"theme":"dolphins"}');
    try {
      const source = new LocalAssetFolderSource({ folder });
      expect(source.listSpritesForTheme("dolphins").map((sprite) => sprite.basename)).toEqual(["dolphin-1"]);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("returns an empty sprite list when the temp folder is missing", () => {
    const folder = makeTempFolder("absent");
    rmSync(folder, { recursive: true, force: true });
    const source = new LocalAssetFolderSource({ folder });
    expect(source.listAllSprites()).toEqual([]);
    expect(() => source.generate(makeRequest())).toThrow();
  });
});

describe("LocalAssetFolderSource canonical folder discovery", () => {
  it("locates PNGs in the canonical apps/studio/src/assets/library/replacements folder", () => {
    expect(existsSync(replacementsRoot)).toBe(true);
    const source = new LocalAssetFolderSource({ folder: replacementsRoot });
    expect(source.listAllSprites().length).toBeGreaterThan(0);
  });
});