import React from "react";
import type {
  ComponentBinding,
  GameAssemblyProfile,
  GameTemplateTokenStyle,
  GeneratedAssetRecord,
  JsonValue,
  GameTemplateLiveSurface,
  GameProfileTemplateSnapshot
} from "@playcraft/contracts";

export interface LiveGameInteraction {
  eventName: string;
  payload: JsonValue;
  profileId: string;
}

export interface AssetReplacement {
  uri: string;
  altText?: string;
}

export interface MemoryCard {
  id: string;
  pairKey: string;
}

export interface MemoryPairVisual {
  background: string;
  border: string;
  foreground: string;
  accent: string;
}

export interface TokenStyleCatalog {
  defaultStyle: GameTemplateTokenStyle;
  tokenStyles: GameTemplateTokenStyle[];
}

export type SequencePhase = "watch" | "play" | "complete";
export type BinFeedback = "success" | "failure";
export type SequenceFeedbackKind = "info" | "success" | "failure";

export interface SequenceFeedback {
  expected?: string;
  item?: string;
  kind: SequenceFeedbackKind;
  message: string;
}

export interface SortDragState {
  item: string;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  dragging: boolean;
}

export type AssetReplacementLookup = Map<string, AssetReplacement>;

export function singleValue<TValue>(values: TValue[]): TValue | undefined {
  return values.length === 1 ? values[0] : undefined;
}

export function requireSingleValue<TValue>(values: TValue[], label: string): TValue {
  const value = singleValue(values);
  if (value === undefined) {
    throw new Error(`${label} requires exactly one value`);
  }
  return value;
}

export function duplicateStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
      continue;
    }

    seen.add(value);
  }

  return [...duplicates];
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function displayCardLabel(cardId: string): string {
  return cardId.replace(/-/gu, " ");
}

export function displayInitial(cardId: string): string {
  return displayCardLabel(cardId).charAt(0).toUpperCase();
}

export function displayCardGlyph(cardId: string): string {
  const label = displayCardLabel(cardId);
  const firstLetter = label.match(/[a-z]/iu)?.[0]?.toUpperCase() ?? "?";
  const number = label.match(/\b\d+\b/u)?.[0] ?? "";
  return `${firstLetter}${number}`.slice(0, 3);
}

export function isRenderableUri(uri: string): boolean {
  return /^(?:https?:|data:|blob:|\/|\.\/|\.\.\/)/u.test(uri);
}

export function normalizedTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

export function tokenSequenceIncludes(tokens: string[], sequence: string[]): boolean {
  if (sequence.length === 0 || sequence.length > tokens.length) {
    return false;
  }

  return tokens.some((_, index) =>
    sequence.every((part, offset) => tokens[index + offset] === part)
  );
}

export function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function textProp(props: Record<string, JsonValue>, key: string, fallback: string): string {
  const value = props[key];
  return typeof value === "string" ? value : fallback;
}

export function stringArrayProp(props: Record<string, JsonValue>, key: string): string[] {
  const value = props[key];
  if (!Array.isArray(value)) {
    throw new Error(`live game prop ${key} must be an authored string array`);
  }

  const invalidIndexes: number[] = [];
  const values: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry === "string") {
      values.push(entry);
      return;
    }

    invalidIndexes.push(index);
  });
  if (invalidIndexes.length > 0) {
    throw new Error(`live game prop ${key} contains non-string entries at ${invalidIndexes.join(", ")}`);
  }

  return values;
}

export function stringMatrixProp(props: Record<string, JsonValue>, key: string): string[][] {
  const value = props[key];
  if (!Array.isArray(value)) {
    throw new Error(`live game prop ${key} must be an authored string matrix`);
  }

  const rows: string[][] = [];
  const invalidRows: number[] = [];
  const invalidEntries: string[] = [];
  value.forEach((entry, rowIndex) => {
    if (!Array.isArray(entry)) {
      invalidRows.push(rowIndex);
      return;
    }

    const row: string[] = [];
    entry.forEach((item, itemIndex) => {
      if (typeof item === "string") {
        row.push(item);
        return;
      }

      invalidEntries.push(`${rowIndex}.${itemIndex}`);
    });
    rows.push(row);
  });
  if (invalidRows.length > 0) {
    throw new Error(`live game prop ${key} contains non-array rows at ${invalidRows.join(", ")}`);
  }
  if (invalidEntries.length > 0) {
    throw new Error(`live game prop ${key} contains non-string entries at ${invalidEntries.join(", ")}`);
  }

  return rows;
}

export function stringRecordProp(props: Record<string, JsonValue>, key: string): Record<string, string> {
  const value = props[key];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`live game prop ${key} must be an authored string record`);
  }

  const invalidKeys = Object.entries(value)
    .filter((entry) => typeof entry[1] !== "string")
    .map(([entryKey]) => entryKey);
  if (invalidKeys.length > 0) {
    throw new Error(`live game prop ${key} contains non-string values for ${invalidKeys.join(", ")}`);
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [entryKey, entryValue as string])
  );
}

export function replacementForToken(
  token: string,
  replacements: AssetReplacementLookup | undefined,
  namespace: "choice" | "item"
): AssetReplacement | undefined {
  return replacements?.get(`${namespace}:${token}`);
}

export function normalizeReplacement(value: string | AssetReplacement, fallbackAlt: string): AssetReplacement {
  return typeof value === "string" ? { uri: value, altText: fallbackAlt } : value;
}

export function replacementFromAsset(asset: GeneratedAssetRecord): AssetReplacement {
  return {
    uri: asset.uri,
    altText: asset.altText
  };
}

export function profileAssetById(profile: GameAssemblyProfile, assetId: string): GeneratedAssetRecord | undefined {
  const matches = profile.assets.filter((entry) => entry.assetId === assetId);
  if (matches.length > 1) {
    throw new Error(`profile ${profile.id} has duplicate generated asset id ${assetId}`);
  }

  return singleValue(matches);
}

export function resolveComponentAsset(
  profile: GameAssemblyProfile,
  component: ComponentBinding,
  binding: string,
  replacements: AssetReplacementLookup
): AssetReplacement | undefined {
  const assetId = component.assetBindings[binding];
  const replacement =
    replacements.get(`${component.bindingId}:${binding}`) ??
    replacements.get(`${component.componentId}:${binding}`) ??
    (assetId ? replacements.get(assetId) : undefined);
  if (replacement) {
    return replacement;
  }

  const asset = assetId ? profileAssetById(profile, assetId) : undefined;
  return asset ? replacementFromAsset(asset) : undefined;
}

export function tokenStyleMatchesForToken(token: string, tokenStyleCatalog: TokenStyleCatalog): GameTemplateTokenStyle[] {
  const tokenParts = normalizedTokens(token);
  return tokenStyleCatalog.tokenStyles.filter((entry) =>
    entry.tokens.some((styleToken) => tokenSequenceIncludes(tokenParts, normalizedTokens(styleToken)))
  );
}

export function describeTokenStyle(tokenStyle: GameTemplateTokenStyle): string {
  return tokenStyle.tokens.join("|");
}

export function validateTokenStylesForTokens(
  profileId: string,
  tokens: string[],
  tokenStyleCatalog: TokenStyleCatalog
): void {
  for (const token of uniqueStrings(tokens)) {
    const matches = tokenStyleMatchesForToken(token, tokenStyleCatalog);
    if (matches.length > 1) {
      throw new Error(`profile ${profileId} live token ${token} maps to multiple token styles: ${matches.map(describeTokenStyle).join(", ")}`);
    }
  }
}

export function createProfileAssetReplacementLookup(
  profile: GameAssemblyProfile,
  replacements: Record<string, string | AssetReplacement> = {}
): AssetReplacementLookup {
  const lookup: AssetReplacementLookup = new Map();

  for (const [key, value] of Object.entries(replacements)) {
    lookup.set(key, normalizeReplacement(value, key));
  }

  for (const component of profile.components) {
    for (const [binding, assetId] of Object.entries(component.assetBindings)) {
      const value =
        replacements[`${component.bindingId}:${binding}`] ??
        replacements[`${component.componentId}:${binding}`] ??
        replacements[assetId];

      if (value) {
        const replacement = normalizeReplacement(value, `${component.componentId}:${binding}`);
        lookup.set(`${component.bindingId}:${binding}`, replacement);
        lookup.set(`${component.componentId}:${binding}`, replacement);
        lookup.set(assetId, replacement);
      }
    }
  }

  return lookup;
}

export function useProfileAssetReplacements(
  profile: GameAssemblyProfile,
  replacements: Record<string, string | AssetReplacement> = {}
): AssetReplacementLookup {
  return React.useMemo(() => createProfileAssetReplacementLookup(profile, replacements), [profile, replacements]);
}

export function liveTemplateForProfile(profile: GameAssemblyProfile): GameProfileTemplateSnapshot {
  return profile.template;
}

export function liveGameComponentKey(profile: GameAssemblyProfile, ...components: ComponentBinding[]): string {
  return [
    profile.id,
    ...components.map((component) =>
      [
        component.bindingId,
        component.renderCapability,
        JSON.stringify(component.props),
        JSON.stringify(component.assetBindings)
      ].join(":")
    )
  ].join("|");
}

export function tokenStyleCatalogForSurface(liveSurface: GameTemplateLiveSurface): TokenStyleCatalog {
  return {
    defaultStyle: liveSurface.defaultTokenStyle,
    tokenStyles: liveSurface.tokenStyles
  };
}

export function requiredComponentByCapability(profile: GameAssemblyProfile, capability: string): ComponentBinding {
  const component = optionalComponentByCapability(profile, capability);
  if (!component) {
    throw new Error(`profile ${profile.id} is missing required live surface component ${capability}`);
  }
  return component;
}

export function optionalComponentByCapability(profile: GameAssemblyProfile, capability: string | undefined): ComponentBinding | undefined {
  if (!capability) {
    return undefined;
  }
  const matches = profile.components.filter((component) => component.renderCapability === capability);
  if (matches.length > 1) {
    throw new Error(`profile ${profile.id} has multiple live surface components for ${capability}`);
  }
  return singleValue(matches);
}

export function requiredSequenceChoiceComponent(
  profile: GameAssemblyProfile,
  liveSurface: GameTemplateLiveSurface
): ComponentBinding {
  const choiceCapability = liveSurface.componentCapabilities.choice;
  if (!choiceCapability) {
    throw new Error(`profile ${profile.id} sequence surface is missing required authored choice component capability`);
  }
  return requiredComponentByCapability(profile, choiceCapability);
}

export function validateMemorySurfaceProps(
  profileId: string,
  component: ComponentBinding,
  tokenStyleCatalog: TokenStyleCatalog
): void {
  const cards = stringArrayProp(component.props, "cards");
  const cardPairs = stringRecordProp(component.props, "pairs");
  if (cards.length === 0) {
    throw new Error(`profile ${profileId} memory surface is missing authored cards`);
  }

  const duplicateCards = duplicateStrings(cards);
  if (duplicateCards.length > 0) {
    throw new Error(`profile ${profileId} memory cards contain duplicate card ids: ${duplicateCards.join(", ")}`);
  }

  const cardIds = new Set(cards);
  const missingPairCards = cards.filter((card) => !cardPairs[card]);
  if (missingPairCards.length > 0) {
    throw new Error(`profile ${profileId} memory cards are missing authored pairs: ${missingPairCards.join(", ")}`);
  }

  const unknownPairCards = Object.keys(cardPairs).filter((card) => !cardIds.has(card));
  if (unknownPairCards.length > 0) {
    throw new Error(`profile ${profileId} memory pairs reference missing cards: ${unknownPairCards.join(", ")}`);
  }

  const pairCards = new Map<string, string[]>();
  for (const card of cards) {
    const pairKey = cardPairs[card]!;
    pairCards.set(pairKey, [...(pairCards.get(pairKey) ?? []), card]);
  }

  for (const [pairKey, pairedCards] of pairCards) {
    if (pairedCards.length !== 2) {
      throw new Error(`profile ${profileId} memory pair ${pairKey} must contain exactly 2 cards: ${pairedCards.join(", ")}`);
    }
  }

  validateTokenStylesForTokens(profileId, memoryStyleTokens(component), tokenStyleCatalog);
}

export function validateSortingSurfaceProps(
  profileId: string,
  component: ComponentBinding,
  tokenStyleCatalog: TokenStyleCatalog
): void {
  const items = stringArrayProp(component.props, "items");
  const bins = stringArrayProp(component.props, "bins");
  const targets = stringRecordProp(component.props, "targets");
  const duplicateItems = duplicateStrings(items);
  if (duplicateItems.length > 0) {
    throw new Error(`profile ${profileId} sorting items contain duplicate item ids: ${duplicateItems.join(", ")}`);
  }

  const duplicateBins = duplicateStrings(bins);
  if (duplicateBins.length > 0) {
    throw new Error(`profile ${profileId} sorting bins contain duplicate bin ids: ${duplicateBins.join(", ")}`);
  }

  const itemIds = new Set(items);
  const unknownTargetItems = Object.keys(targets).filter((item) => !itemIds.has(item));
  if (unknownTargetItems.length > 0) {
    throw new Error(`profile ${profileId} sorting targets reference missing items: ${unknownTargetItems.join(", ")}`);
  }

  for (const item of items) {
    const target = targets[item];
    if (!target) {
      throw new Error(`profile ${profileId} sorting item ${item} is missing an authored target`);
    }
    if (!bins.includes(target)) {
      throw new Error(`profile ${profileId} sorting item ${item} references missing bin ${target}`);
    }
  }

  validateTokenStylesForTokens(profileId, sortingStyleTokens(component), tokenStyleCatalog);
}

export function validateSequenceSurfaceProps(
  profileId: string,
  sequenceComponent: ComponentBinding,
  choiceComponent: ComponentBinding,
  tokenStyleCatalog: TokenStyleCatalog
): void {
  const sequence = stringArrayProp(sequenceComponent.props, "sequence");
  const rounds = stringMatrixProp(sequenceComponent.props, "rounds");
  if (sequence.length === 0) {
    throw new Error(`profile ${profileId} sequence surface is missing authored sequence tokens`);
  }
  if (rounds.length === 0) {
    throw new Error(`profile ${profileId} sequence surface is missing authored rounds`);
  }

  const emptyRound = rounds.findIndex((round) => round.length === 0);
  if (emptyRound >= 0) {
    throw new Error(`profile ${profileId} sequence round ${emptyRound + 1} is empty`);
  }

  const choices = stringArrayProp(choiceComponent.props, "items");
  if (choices.length === 0) {
    throw new Error(`profile ${profileId} sequence choices are missing authored items`);
  }

  const duplicateChoices = duplicateStrings(choices);
  if (duplicateChoices.length > 0) {
    throw new Error(`profile ${profileId} sequence choices contain duplicate item ids: ${duplicateChoices.join(", ")}`);
  }

  const choiceIds = new Set(choices);
  const missingChoices = uniqueStrings([...sequence, ...rounds.flat()].filter((token) => !choiceIds.has(token)));
  if (missingChoices.length > 0) {
    throw new Error(`profile ${profileId} sequence tokens are missing authored choices: ${missingChoices.join(", ")}`);
  }

  validateTokenStylesForTokens(profileId, sequenceStyleTokens(sequenceComponent, choiceComponent), tokenStyleCatalog);
}

export function memoryStyleTokens(component: ComponentBinding): string[] {
  return Object.values(stringRecordProp(component.props, "pairs"));
}

export function sortingStyleTokens(component: ComponentBinding): string[] {
  const targets = stringRecordProp(component.props, "targets");
  return [
    ...stringArrayProp(component.props, "items"),
    ...stringArrayProp(component.props, "bins"),
    ...Object.values(targets)
  ];
}

export function sequenceStyleTokens(sequenceComponent: ComponentBinding, choiceComponent: ComponentBinding): string[] {
  return [
    ...stringArrayProp(sequenceComponent.props, "sequence"),
    ...stringMatrixProp(sequenceComponent.props, "rounds").flat(),
    ...stringArrayProp(choiceComponent.props, "items")
  ];
}

export function shuffleMemoryCards(cards: string[], cardPairs: Record<string, string>, seed: string): MemoryCard[] {
  return cards
    .map((id) => ({ id, pairKey: cardPairs[id], order: hashString(`${seed}.${id}`) }))
    .map((card): MemoryCard & { order: number } => {
      if (!card.pairKey) {
        throw new Error(`memory deck card ${card.id} is missing an authored pair`);
      }
      return { id: card.id, pairKey: card.pairKey, order: card.order };
    })
    .sort((left, right) => left.order - right.order)
    .map(({ id, pairKey }) => ({ id, pairKey }));
}

export function createMemoryPairVisuals(cardPairs: Record<string, string>, tokenStyleCatalog: TokenStyleCatalog): Map<string, MemoryPairVisual> {
  return new Map(
    uniqueStrings(Object.values(cardPairs)).map((pairKey) => [
      pairKey,
      colorForToken(pairKey, tokenStyleCatalog)
    ])
  );
}

export function memoryCardForDeckId(deck: MemoryCard[], cardId: string): MemoryCard {
  const matches = deck.filter((entry) => entry.id === cardId);
  return requireSingleValue(matches, `memory deck card ${cardId}`);
}

export function memoryCardFaceStyle(visual: MemoryPairVisual): React.CSSProperties {
  return {
    background: visual.background,
    color: visual.foreground,
    borderColor: visual.border
  };
}

export function colorForToken(
  token: string,
  tokenStyleCatalog: TokenStyleCatalog
): MemoryPairVisual {
  const matches = tokenStyleMatchesForToken(token, tokenStyleCatalog);
  if (matches.length > 1) {
    throw new Error(`live token ${token} maps to multiple token styles: ${matches.map(describeTokenStyle).join(", ")}`);
  }
  const tokenStyle = singleValue(matches) ?? tokenStyleCatalog.defaultStyle;

  return {
    background: tokenStyle.background,
    border: tokenStyle.border,
    foreground: tokenStyle.foreground,
    accent: tokenStyle.accent
  };
}

