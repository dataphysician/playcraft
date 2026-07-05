import type {
  ComponentBinding,
  GameAssemblyProfile,
  GameTemplateAssetReplacementNamespace,
  GameTemplateAssetReplacementSource,
  GameProfileTemplateSnapshot,
  JsonValue
} from "@playcraft/contracts";
import { localAssetEditCatalog } from "@playcraft/assets";

import memoryMatchBackgroundUrl from "./assets/library/ui/backgrounds/memory-match.png";
import sequenceRepeatBackgroundUrl from "./assets/library/ui/backgrounds/sequence-repeat.png";
import sortingBackgroundUrl from "./assets/library/ui/backgrounds/sorting.png";
import playcraftCardBackUrl from "./assets/library/ui/cards/playcraft-card-back.png";
import sortingBinBlueUrl from "./assets/library/ui/sorting/bin-blue.png";
import sortingBinGreenUrl from "./assets/library/ui/sorting/bin-green.png";
import sortingBinRedUrl from "./assets/library/ui/sorting/bin-red.png";

export interface LibraryAssetReplacement {
  altText: string;
  uri: string;
}

interface ReplacementSprite extends LibraryAssetReplacement {
  id: string;
  theme: string;
}

interface SortingBinAsset extends LibraryAssetReplacement {
  aliases: string[];
  id: string;
}

export const playcraftUiAssets = {
  backgrounds: {
    memoryMatch: memoryMatchBackgroundUrl,
    sequenceRepeat: sequenceRepeatBackgroundUrl,
    sorting: sortingBackgroundUrl
  },
  cards: {
    playcraftBack: playcraftCardBackUrl
  },
  sortingBins: {
    blue: sortingBinBlueUrl,
    green: sortingBinGreenUrl,
    red: sortingBinRedUrl
  }
} as const;

export const sortingBinAssetCatalog: SortingBinAsset[] = [
  {
    aliases: ["red", "red bin", "color red"],
    altText: "red sorting bin",
    id: "red",
    uri: playcraftUiAssets.sortingBins.red
  },
  {
    aliases: ["blue", "blue bin", "color blue"],
    altText: "blue sorting bin",
    id: "blue",
    uri: playcraftUiAssets.sortingBins.blue
  },
  {
    aliases: ["green", "green bin", "color green"],
    altText: "green sorting bin",
    id: "green",
    uri: playcraftUiAssets.sortingBins.green
  }
];

const replacementImageModules = import.meta.glob("./assets/library/replacements/**/*.png", {
  eager: true,
  import: "default"
});

const replacementSprites = replacementImageEntries(replacementImageModules)
  .flatMap(([path, uri]) => {
    const parts = path.split("/");
    const fileName = parts.at(-1) ?? "";
    if (fileName.endsWith("-source.png")) {
      return [];
    }

    const id = fileName.replace(/\.png$/u, "");
    const theme = parts.at(-2) ?? "default";
    return [
      {
        altText: `${id.replace(/-/gu, " ")} sprite`,
        id,
        theme,
        uri
      }
    ];
  })
  .sort((left, right) => `${left.theme}/${left.id}`.localeCompare(`${right.theme}/${right.id}`));

function replacementImageEntries(modules: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(modules).map(([path, uri]) => {
    if (typeof uri !== "string" || uri.length === 0) {
      throw new Error(`Replacement sprite ${path} did not resolve to a local asset URL.`);
    }

    return [path, uri];
  });
}

export function createProfileLibraryAssetReplacements(
  profile: GameAssemblyProfile
): Record<string, LibraryAssetReplacement> {
  const replacements: Record<string, LibraryAssetReplacement> = {};
  const themeFolders = themeFoldersForProfile(profile);
  const template = liveTemplateForProfile(profile);

  for (const source of template.liveSurface.assetReplacementSources) {
    const component = componentForReplacementSource(profile, template, source);
    if (!component) {
      continue;
    }

    if (source.pairMapProp) {
      addPairedTokenReplacements(replacements, component, source, themeFolders);
      continue;
    }

    addTokenReplacements(replacements, stringArrayProp(component.props, source.prop), themeFolders, source.namespace);
  }

  return replacements;
}

function liveTemplateForProfile(profile: GameAssemblyProfile): GameProfileTemplateSnapshot {
  return profile.template;
}

function componentForReplacementSource(
  profile: GameAssemblyProfile,
  template: GameProfileTemplateSnapshot,
  source: GameTemplateAssetReplacementSource
): ComponentBinding | undefined {
  const capability = template.liveSurface.componentCapabilities[source.componentRole];
  if (!capability) {
    return undefined;
  }

  const matches = profile.components.filter((component) => component.renderCapability === capability);
  if (matches.length > 1) {
    throw new Error(`profile ${profile.id} has multiple asset replacement components for ${capability}`);
  }
  return matches[0];
}

export function sortingBinAssetFor(bin: string): LibraryAssetReplacement | undefined {
  const binTokens = normalizedTokens(bin);
  const asset = sortingBinAssetCatalog.find((entry) =>
    entry.aliases.some((alias) => tokenSequenceIncludes(binTokens, normalizedTokens(alias)))
  );
  return asset ? { altText: asset.altText, uri: asset.uri } : undefined;
}

function addTokenReplacements(
  replacements: Record<string, LibraryAssetReplacement>,
  tokens: string[],
  themeFolders: string[],
  namespace: GameTemplateAssetReplacementNamespace
): void {
  for (const token of uniqueStrings(tokens)) {
    const sprite = spriteForIdentifier(token, themeFolders);
    if (!sprite) {
      continue;
    }

    setReplacement(replacements, `${namespace}:${token}`, sprite);
  }
}

function addPairedTokenReplacements(
  replacements: Record<string, LibraryAssetReplacement>,
  component: ComponentBinding,
  source: GameTemplateAssetReplacementSource,
  themeFolders: string[]
): void {
  const tokens = stringArrayProp(component.props, source.prop);
  const pairs = stringRecordProp(component.props, source.pairMapProp ?? "");
  const pairKeys = uniqueStrings(tokens.map((token) => pairs[token]).filter(Boolean));

  for (const pairKey of pairKeys) {
    const pairTokens = tokens.filter((entry) => pairs[entry] === pairKey);
    const sprite = singlePairedCardSpriteForPair(pairKey, pairTokens, themeFolders);
    if (!sprite) {
      continue;
    }

    setReplacement(replacements, `${source.namespace}:${pairKey}`, sprite);
    for (const token of pairTokens) {
      setReplacement(replacements, `${source.namespace}:${token}`, sprite);
    }
  }
}

function singlePairedCardSpriteForPair(
  pairKey: string,
  pairTokens: string[],
  themeFolders: string[]
): ReplacementSprite | undefined {
  const resolvedSprites = pairTokens.map((token) => ({
    sprite: spriteForPairedCardIdentifier(token, themeFolders),
    token
  }));
  const missingTokens = resolvedSprites
    .filter((entry) => !entry.sprite)
    .map((entry) => entry.token);
  if (missingTokens.length === pairTokens.length) {
    return undefined;
  }
  if (missingTokens.length > 0) {
    throw new Error(`asset replacement pair ${pairKey} is missing local sprites for ${missingTokens.join(", ")}`);
  }

  const uniqueSprites = uniqueReplacementSprites(resolvedSprites.map((entry) => entry.sprite!));
  if (uniqueSprites.length !== 1) {
    throw new Error(`asset replacement pair ${pairKey} maps to multiple local sprites: ${uniqueSprites.map((sprite) => sprite.id).join(", ")}`);
  }

  return uniqueSprites[0];
}

function uniqueReplacementSprites(sprites: ReplacementSprite[]): ReplacementSprite[] {
  const seen = new Set<string>();
  const unique: ReplacementSprite[] = [];

  for (const sprite of sprites) {
    const key = `${sprite.theme}/${sprite.id}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(sprite);
  }

  return unique;
}

function setReplacement(
  replacements: Record<string, LibraryAssetReplacement>,
  key: string,
  sprite: ReplacementSprite
): void {
  replacements[key] ??= {
    altText: sprite.altText,
    uri: sprite.uri
  };
}

function themeFoldersForProfile(profile: GameAssemblyProfile): string[] {
  const values = new Set<string>();

  for (const request of profile.assetRequests) {
    addMetadataValue(values, request.metadata.assetEditTheme);
  }

  const availableThemes = uniqueStrings(replacementSprites.map((sprite) => sprite.theme));
  return availableThemes.filter((theme) => valuesMatchTheme([...values], theme));
}

function addMetadataValue(values: Set<string>, value: JsonValue | undefined): void {
  if (typeof value === "string") {
    values.add(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      addMetadataValue(values, entry);
    }
  }
}

function valuesMatchTheme(values: string[], theme: string): boolean {
  const terms = themeTerms(theme);
  return values.some((value) =>
    terms.some((term) => tokenSequenceIncludes(normalizedTokens(value), normalizedTokens(term)))
  );
}

function themeTerms(theme: string): string[] {
  const normalized = normalizeText(theme);
  const singular = singularize(normalized);
  const catalogEntry = localAssetEditCatalog.find((entry) =>
    entry.theme === theme || entry.localReplacementFolder === theme
  );

  return uniqueStrings([normalized, singular, catalogEntry?.theme, catalogEntry?.displayLabel, ...(catalogEntry?.aliases ?? [])].filter((entry): entry is string => Boolean(entry)));
}

function spriteForIdentifier(identifier: string, themeFolders: string[]): ReplacementSprite | undefined {
  const normalized = slugLabel(identifier);
  const themeSprites = replacementSprites.filter((sprite) => themeFolders.includes(sprite.theme));
  if (themeSprites.length === 0) {
    return undefined;
  }

  const candidates = themeSprites;
  const exact = candidates.find((sprite) => normalized === sprite.id);
  if (exact) {
    return exact;
  }

  const ordinal = ordinalForIdentifier(normalized);
  const ordinalMatch = candidates.find((sprite) => ordinal !== undefined && ordinalForIdentifier(sprite.id) === ordinal);
  if (ordinalMatch) {
    return ordinalMatch;
  }

  return undefined;
}

function spriteForPairedCardIdentifier(identifier: string, themeFolders: string[]): ReplacementSprite | undefined {
  const pairedCardSpriteId = pairedCardSpriteIdentifier(identifier);
  if (!pairedCardSpriteId) {
    return undefined;
  }

  return replacementSprites.find((sprite) => themeFolders.includes(sprite.theme) && sprite.id === pairedCardSpriteId);
}

function pairedCardSpriteIdentifier(identifier: string): string | undefined {
  const normalized = slugLabel(identifier);
  const match = /^(?<spriteId>[a-z0-9][a-z0-9-]*)-[ab]$/u.exec(normalized);
  return match?.groups?.spriteId;
}

function ordinalForIdentifier(value: string): number | undefined {
  const match = /(?:^|-)(\d+)(?:-|$)/u.exec(value);
  return match ? Number(match[1]) : undefined;
}

function stringArrayProp(props: Record<string, JsonValue>, key: string): string[] {
  const value = props[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function stringRecordProp(props: Record<string, JsonValue>, key: string): Record<string, string> {
  const value = props[key];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 -]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizedTokens(value: string): string[] {
  return normalizeText(value).split(" ").filter(Boolean);
}

function tokenSequenceIncludes(tokens: string[], sequence: string[]): boolean {
  if (sequence.length === 0 || sequence.length > tokens.length) {
    return false;
  }

  return tokens.some((_, index) =>
    sequence.every((token, offset) => tokens[index + offset] === token)
  );
}

function slugLabel(value: string): string {
  return normalizeText(value).replace(/\s+/gu, "-");
}

function singularize(value: string): string {
  return value
    .split(" ")
    .map((word) => {
      if (word.endsWith("ies") && word.length > 3) {
        return `${word.slice(0, -3)}y`;
      }
      if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) {
        return word.slice(0, -1);
      }
      return word;
    })
    .join(" ");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
