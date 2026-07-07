import {
  AssetCatalogManifestSchema,
  AssetGenerationRequestSchema,
  AssetSourceCapabilityManifestSchema,
  BUNDLED_LOCAL_PROVENANCE,
  GeneratedAssetRecordSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type AssetCatalogManifest,
  type AssetGenerationRequest,
  type AssetSourceCapabilityManifest,
  type GeneratedAssetRecord
} from "@playcraft/contracts";

export const CANONICAL_LOCAL_ASSET_FOLDER = "apps/studio/src/assets/library/replacements";
export const LOCAL_ASSET_SOURCE_ID = "asset-source.local-folder";
export const LOCAL_ASSET_SOURCE_VERSION = "1.0.0";
export const LOCAL_ASSET_SOURCE_MANIFEST_KIND = "asset-source" as const;

interface DiscoveredReplacementSprite {
  basename: string;
  fileName: string;
  theme: string;
  uri: string;
}

interface DiscoveredThemeManifest {
  aliases: string[];
  displayLabel: string;
  theme: string;
}

export interface LocalAssetFolderSourceOptions {
  canonical?: boolean;
  deploymentOverride?: string;
  folder: string;
}

interface NodePathModule {
  isAbsolute: (path: string) => boolean;
  join: (...paths: string[]) => string;
  resolve: (...paths: string[]) => string;
}

interface NodeFsModule {
  existsSync: (path: string) => boolean;
  readdirSync: (path: string, options?: { withFileTypes?: boolean }) => string[] | DirentLike[];
  readFileSync: (path: string, encoding: "utf8") => string;
}

interface DirentLike {
  isDirectory: () => boolean;
  isFile: () => boolean;
  name: string;
}

export class LocalAssetFolderSource {
  readonly manifest: AssetSourceCapabilityManifest;
  readonly folder: string;
  readonly canonical: boolean;
  readonly deploymentOverride: string | undefined;
  private readonly cachedSprites: DiscoveredReplacementSprite[];
  private readonly cachedManifests: Map<string, DiscoveredThemeManifest>;

  constructor(options: LocalAssetFolderSourceOptions) {
    if (!options || typeof options.folder !== "string" || options.folder.length === 0) {
      throw new Error("LocalAssetFolderSource requires a non-empty folder path");
    }
    this.folder = options.folder;
    this.canonical = options.canonical ?? true;
    this.deploymentOverride = options.deploymentOverride;
    const scanned = scanReplacementFolder(this.folder);
    this.cachedSprites = scanned.sprites;
    this.cachedManifests = scanned.manifests;
    this.manifest = AssetSourceCapabilityManifestSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: LOCAL_ASSET_SOURCE_ID,
      version: LOCAL_ASSET_SOURCE_VERSION,
      kind: LOCAL_ASSET_SOURCE_MANIFEST_KIND,
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
    });
  }

  listThemes(): string[] {
    const themes = new Set<string>();
    for (const sprite of this.cachedSprites) {
      themes.add(sprite.theme);
    }
    return [...themes].sort();
  }

  listSpritesForTheme(theme: string): DiscoveredReplacementSprite[] {
    return this.cachedSprites.filter((sprite) => sprite.theme === theme);
  }

  listAllSprites(): DiscoveredReplacementSprite[] {
    return [...this.cachedSprites];
  }

  listThemeManifests(): DiscoveredThemeManifest[] {
    return [...this.cachedManifests.values()].sort((left, right) => left.theme.localeCompare(right.theme));
  }

  resolveThemeByAliasOrName(candidate: string): string | undefined {
    const normalized = candidate.toLowerCase().trim();
    for (const theme of this.cachedManifests.values()) {
      if (theme.theme.toLowerCase() === normalized) {
        return theme.theme;
      }
      if (theme.displayLabel.toLowerCase() === normalized) {
        return theme.theme;
      }
      if (theme.aliases.some((alias) => alias.toLowerCase() === normalized)) {
        return theme.theme;
      }
    }
    return undefined;
  }

  generate(requestInput: AssetGenerationRequest): GeneratedAssetRecord {
    const request = AssetGenerationRequestSchema.parse(requestInput);
    if (request.contentType !== "image") {
      throw new Error(`LocalAssetFolderSource does not support content type ${request.contentType}`);
    }
    if (request.format !== "png") {
      throw new Error(`LocalAssetFolderSource does not support format ${request.format}`);
    }

    const matched = matchSpriteForRequest(this.cachedSprites, request);
    if (!matched) {
      throw new Error(
        `LocalAssetFolderSource has no replacement sprite for request ${request.requestId} (prompt: ${request.prompt})`
      );
    }

    const generatedAt = new Date().toISOString();
    const assetId = `asset.${matched.theme}.${matched.basename}`;
    const generatedId = `generated.${matched.theme}.${matched.basename}`;

    return GeneratedAssetRecordSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: generatedId,
      version: "1.0.0",
      kind: "generated-asset",
      requestId: request.requestId,
      assetId,
      sourceId: this.manifest.id,
      contentType: request.contentType,
      format: request.format,
      uri: matched.uri,
      altText: `${matched.basename} sprite`,
      metadata: {
        theme: matched.theme,
        basename: matched.basename,
        folder: this.folder,
        canonical: this.canonical
      },
      provenance: {
        sourceManifestId: this.manifest.id,
        sourceManifestVersion: this.manifest.version,
        seed: request.seedPolicy.seed,
        seedSupported: this.manifest.seedSupport,
        seedStatus: "not-provided",
        generatedAt
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
}

function matchSpriteForRequest(
  sprites: DiscoveredReplacementSprite[],
  request: AssetGenerationRequest
): DiscoveredReplacementSprite | undefined {
  if (sprites.length === 0) {
    return undefined;
  }

  const themeHint = stringMetadataFor(request.metadata, "assetEditTheme");
  const itemHints = stringArrayMetadataFor(request.metadata, "assetEditItems");
  const promptTokens = tokenize(request.prompt);

  const themeMatches = themeHint ? sprites.filter((sprite) => sprite.theme === themeHint) : sprites;
  const candidates = themeMatches.length > 0 ? themeMatches : sprites;

  const exactItem = candidates.find((sprite) => itemHints.includes(sprite.basename));
  if (exactItem) {
    return exactItem;
  }

  const promptMatch = candidates.find((sprite) => promptTokens.includes(sprite.basename));
  if (promptMatch) {
    return promptMatch;
  }

  const ordinalMatch = candidates.find((sprite) => promptTokens.some((token) => token.endsWith(`-${sprite.basename}`)));
  if (ordinalMatch) {
    return ordinalMatch;
  }

  const fallback = candidates[0];
  return fallback;
}

function stringMetadataFor(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = metadata[key];
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  return value;
}

function stringArrayMetadataFor(metadata: Record<string, unknown>, key: string): string[] {
  const value = metadata[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 0);
}

function scanReplacementFolder(folder: string): { sprites: DiscoveredReplacementSprite[]; manifests: Map<string, DiscoveredThemeManifest> } {
  const fsResult = loadNodeFs();
  const pathResult = loadNodePath();
  if (!fsResult.available || !pathResult.available) {
    return { sprites: [], manifests: new Map() };
  }

  const { existsSync, readdirSync } = fsResult.module;
  const { isAbsolute, resolve, join } = pathResult.module;

  if (!existsSync(folder)) {
    return { sprites: [], manifests: new Map() };
  }

  const absoluteFolder = isAbsolute(folder) ? folder : resolve(folder);
  const entries = readdirSync(absoluteFolder, { withFileTypes: true }) as DirentLike[];
  const sprites: DiscoveredReplacementSprite[] = [];
  const manifests = new Map<string, DiscoveredThemeManifest>();

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const theme = entry.name;
    const themeFolder = join(absoluteFolder, theme);
    const themeEntries = readdirSync(themeFolder, { withFileTypes: true }) as DirentLike[];

    for (const themeEntry of themeEntries) {
      if (!themeEntry.isFile() || !themeEntry.name.toLowerCase().endsWith(".png")) {
        continue;
      }

      const fileName = themeEntry.name;
      const basename = fileName.replace(/\.png$/iu, "");
      const absoluteFilePath = join(themeFolder, fileName);

      sprites.push({
        basename,
        fileName,
        theme,
        uri: `file://${absoluteFilePath}`
      });
    }

    manifests.set(theme, loadThemeManifest(fsResult.module, themeFolder, theme, sprites.filter((sprite) => sprite.theme === theme).map((sprite) => sprite.basename)));
  }

  sprites.sort((left, right) => `${left.theme}/${left.basename}`.localeCompare(`${right.theme}/${right.basename}`));
  return { sprites, manifests };
}

function loadThemeManifest(
  fsModule: NodeFsModule,
  themeFolder: string,
  theme: string,
  spriteBasenames: string[]
): DiscoveredThemeManifest {
  const manifestPath = `${themeFolder}/catalog.json`;
  if (!fsModule.existsSync(manifestPath)) {
    return {
      aliases: [theme],
      displayLabel: theme,
      theme
    };
  }

  try {
    const raw = fsModule.readFileSync(manifestPath, "utf8");
    const parsed = AssetCatalogManifestSchema.parse(JSON.parse(raw)) as AssetCatalogManifest;
    return {
      aliases: parsed.aliases.length > 0 ? parsed.aliases : [theme],
      displayLabel: parsed.displayLabel,
      theme: parsed.theme
    };
  } catch {
    return {
      aliases: spriteBasenames.length > 0 ? spriteBasenames : [theme],
      displayLabel: theme,
      theme
    };
  }
}

interface NodeLoadResult<T> {
  available: boolean;
  module: T;
}

function loadNodePath(): NodeLoadResult<NodePathModule> {
  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const required = require("node:path") as NodePathModule;
    return { available: true, module: required };
  } catch {
    return {
      available: false,
      module: {
        isAbsolute: (candidate: string) => candidate.startsWith("/"),
        join: (...segments: string[]) => segments.join("/"),
        resolve: (...segments: string[]) => {
          const resolved: string[] = [];
          for (const segment of segments) {
            if (segment.startsWith("/")) {
              resolved.length = 0;
            }
            resolved.push(segment);
          }
          return resolved.join("/") || "/";
        }
      }
    };
  }
}

function loadNodeFs(): NodeLoadResult<NodeFsModule> {
  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const required = require("node:fs") as NodeFsModule;
    return { available: true, module: required };
  } catch {
    return {
      available: false,
      module: {
        existsSync: () => false,
        readdirSync: () => [],
        readFileSync: () => {
          throw new Error("node:fs is not available in this environment");
        }
      }
    };
  }
}

export function localAssetUriFromFolder(folder: string, theme: string, basename: string): string {
  const pathResult = loadNodePath();
  const { isAbsolute, resolve, join } = pathResult.module;
  const absoluteFolder = isAbsolute(folder) ? folder : resolve(folder);
  if (!pathResult.available) {
    return `local-asset://${theme}/${basename}`;
  }
  return `file://${join(absoluteFolder, theme, `${basename}.png`)}`;
}