import type { GameAssemblyProfile, JsonValue } from "@playcraft/contracts";

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
}) as Record<string, string>;

const replacementSprites = Object.entries(replacementImageModules)
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

export function createProfileLibraryAssetReplacements(
  profile: GameAssemblyProfile
): Record<string, LibraryAssetReplacement> {
  const replacements: Record<string, LibraryAssetReplacement> = {};
  const themeFolders = themeFoldersForProfile(profile);

  for (const component of profile.components) {
    if (component.renderCapability === "component:reveal-card-grid") {
      const cards = stringArrayProp(component.props, "cards");
      const pairs = stringRecordProp(component.props, "pairs");
      const pairKeys = uniqueStrings(cards.map((card) => pairs[card]).filter(Boolean));
      for (const [index, pairKey] of pairKeys.entries()) {
        const sprite = spriteForIdentifier(pairKey, themeFolders, index);
        if (!sprite) {
          continue;
        }

        setReplacement(replacements, pairKey, sprite);
        setReplacement(replacements, `card:${pairKey}`, sprite);
        for (const card of cards.filter((entry) => pairs[entry] === pairKey)) {
          setReplacement(replacements, card, sprite);
          setReplacement(replacements, `card:${card}`, sprite);
        }
      }
      continue;
    }

    if (component.renderCapability === "component:sort-bins") {
      addTokenReplacements(replacements, stringArrayProp(component.props, "items"), themeFolders, "item");
      continue;
    }

    if (component.renderCapability === "component:choice-grid") {
      addTokenReplacements(replacements, stringArrayProp(component.props, "items"), themeFolders, "choice");
      continue;
    }

    if (component.renderCapability === "component:sequence-pad") {
      addTokenReplacements(replacements, stringArrayProp(component.props, "sequence"), themeFolders, "choice");
    }
  }

  return replacements;
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
  namespace: "choice" | "item"
): void {
  for (const [index, token] of uniqueStrings(tokens).entries()) {
    const sprite = spriteForIdentifier(token, themeFolders, index);
    if (!sprite) {
      continue;
    }

    setReplacement(replacements, token, sprite);
    setReplacement(replacements, `${namespace}:${token}`, sprite);
  }
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
    addMetadataValue(values, request.metadata.assetEditItems);
    values.add(request.prompt);
  }

  for (const component of profile.components) {
    for (const value of Object.values(component.props)) {
      addMetadataValue(values, value);
    }
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
  return values.some((value) => {
    const normalized = normalizeText(value);
    return terms.some((term) => normalized.includes(term));
  });
}

function themeTerms(theme: string): string[] {
  const normalized = normalizeText(theme);
  const singular = singularize(normalized);
  const aliases: Record<string, string[]> = {
    dolphins: ["dolphin", "dolphins", "ocean animal", "ocean animals", "sea animal", "sea animals"],
    dinosaurs: ["dinosaur", "dinosaurs"],
    fruits: ["fruit", "fruits"],
    toys: ["toy", "toys"]
  };

  return uniqueStrings([normalized, singular, ...(aliases[theme] ?? [])]);
}

function spriteForIdentifier(identifier: string, themeFolders: string[], index: number): ReplacementSprite | undefined {
  const normalized = slugLabel(identifier);
  const themeSprites = replacementSprites.filter((sprite) => themeFolders.includes(sprite.theme));
  const candidates = themeSprites.length > 0 ? themeSprites : replacementSprites;
  const exact = candidates.find((sprite) => normalized === sprite.id || normalized.endsWith(`-${sprite.id}`));
  if (exact) {
    return exact;
  }

  const ordinal = ordinalForIdentifier(normalized);
  const ordinalMatch = candidates.find((sprite) => ordinal !== undefined && ordinalForIdentifier(sprite.id) === ordinal);
  if (ordinalMatch) {
    return ordinalMatch;
  }

  return candidates[index % candidates.length];
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

  return value.map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)));
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
