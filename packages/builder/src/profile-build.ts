import { LocalAssetFolderSource } from "@playcraft/assets";
import {
  AssetGenerationRequestSchema,
  BuilderAssetEditCatalogEntrySchema,
  BuilderAssetEditSchema,
  GameAssemblyProfileSchema,
  type BuilderAssetEditCatalogEntry,
  type BuilderAssetEdit,
  type GameAssemblyProfile,
  type GameProfileTemplateSnapshot,
  type GameTemplateAssetEditOperation,
  type GameTemplateDefinition,
  type GeneratedAssetRecord,
  type JsonValue
} from "@playcraft/contracts";
import { validateGameAssemblyProfile, type AssetRecordGenerator, type PlaycraftRegistries } from "@playcraft/core";
import { articleFor, cleanLabel, singularize, slugLabel, titleCase } from "@playcraft/text-utils";

const FALLBACK_FREEFORM_SUFFIXES = ["1", "2", "3"] as const;
const PROFILE_BUILD_FOLDER_SOURCE = new LocalAssetFolderSource({
  folder: "apps/studio/src/assets/library/replacements"
});

export interface NormalizedAssetEdit {
  theme: string;
  singularTheme: string;
  items: string[];
  itemsSource: "explicit" | "catalog" | "freeform";
}

export function applyAssetEdit(
  profile: GameAssemblyProfile,
  assetEdit: BuilderAssetEdit | undefined,
  assetSource: AssetRecordGenerator,
  registries: PlaycraftRegistries
): GameAssemblyProfile {
  const edit = normalizeAssetEdit(assetEdit);
  if (!edit) {
    return profile;
  }
  const template = templateForProfile(profile);
  const assetRequestItems = assetEditItemsForAssetRequests(template, profile, edit);

  const assetRequests = profile.assetRequests.map((request) =>
    AssetGenerationRequestSchema.parse({
      ...request,
      prompt: promptForAssetEdit(template, edit, assetRequestItems),
      metadata: {
        ...request.metadata,
        assetEditTheme: edit.theme,
        assetEditItems: assetRequestItems
      }
    })
  );
  const assets = assetSource.generateBatch(assetRequests);
  const components = profile.components.map((component) => ({
    ...component,
    props: editComponentProps(
      assetEditOperationForComponent(template, component.renderCapability),
      component.props,
      edit
    ),
    assetBindings: rewriteAssetBindings(component.assetBindings, profile.assets, assets)
  }));
  const editedProfile = GameAssemblyProfileSchema.parse({
    ...profile,
    components,
    assetRequests,
    assets
  });

  return GameAssemblyProfileSchema.parse({
    ...editedProfile,
    validation: validateGameAssemblyProfile(editedProfile, registries)
  });
}

export function assetEditOperationForComponent(
  template: GameProfileTemplateSnapshot,
  componentCapability: string
): GameTemplateAssetEditOperation | undefined {
  const operations = template.assetEditOperations.filter((operation) => operation.componentCapability === componentCapability);
  if (operations.length > 1) {
    throw new Error(`${template.id} has multiple asset edit operations for ${componentCapability}`);
  }
  return singleValue(operations);
}

export function normalizeAssetEdit(assetEdit: BuilderAssetEdit | undefined): NormalizedAssetEdit | undefined {
  if (!assetEdit) {
    return undefined;
  }

  const parsedAssetEdit = BuilderAssetEditSchema.parse(assetEdit);
  const theme = cleanLabel(parsedAssetEdit.theme ?? parsedAssetEdit.items?.join(" ") ?? "");
  const items = (parsedAssetEdit.items ?? []).map(cleanLabel).filter(Boolean);
  const normalizedTheme = theme || items.join(" ");
  const singularTheme = singularize(normalizedTheme);
  const catalogEntry = assetEditCatalogEntryFor(normalizedTheme);
  const itemsSource = parsedAssetEdit.items ? "explicit" : catalogEntry ? "catalog" : "freeform";

  return {
    theme: normalizedTheme,
    singularTheme,
    items: items.length > 0 ? items : catalogEntry?.suggestedItems ?? freeformItemsForTheme(singularTheme),
    itemsSource
  };
}

export function editComponentProps(
  operation: GameTemplateAssetEditOperation | undefined,
  props: Record<string, JsonValue>,
  edit: NormalizedAssetEdit
): Record<string, JsonValue> {
  switch (operation?.operation) {
    case "memory-pairs":
      const pairCount = requireMemoryPairCount(props);
      const cards = pairedCardIds(edit, pairCount);
      return {
        ...props,
        title: `${titleCase(edit.theme)} pairs`,
        cards,
        pairs: pairMapForCards(cards),
        columns: requireNumberProp(props, "columns", "memory-pairs")
      };
    case "choice-items":
      return {
        ...props,
        title: `Choose ${articleFor(edit.singularTheme)} ${edit.singularTheme}`,
        prompt: `Pick one ${edit.singularTheme}.`,
        items: edit.items
      };
    case "sorting-items": {
      const activeBins = requireStringArrayProp(props, "bins", "sorting-items");
      const items = requireAssetEditItemsForBins(edit, activeBins);
      return {
        ...props,
        title: `${titleCase(edit.theme)} bins`,
        items,
        bins: activeBins,
        targets: Object.fromEntries(items.map((item, index) => [item, activeBins[index]]))
      };
    }
    case "sequence-items":
      const sourceSequence = requireStringArrayProp(props, "sequence", "sequence-items");
      const sourceRounds = requireStringMatrixProp(props, "rounds", "sequence-items");
      const sequenceTokenMap = tokenMapForSequence([...sourceSequence, ...sourceRounds.flat()], edit);
      const sequence = remapSequenceTokens(sourceSequence, sequenceTokenMap);
      const rounds = remapSequenceRounds(sourceRounds, sequenceTokenMap);
      return {
        ...props,
        title: `Repeat the ${edit.singularTheme} pattern`,
        prompt: `Tap the ${edit.singularTheme} buttons in the same order.`,
        sequence,
        rounds
      };
    case "completion-message":
      return {
        ...props,
        message: `${titleCase(edit.theme)} round complete.`
      };
    case "hint-message":
      return {
        ...props,
        hint: `Look for the ${edit.singularTheme} clue first.`
      };
    default:
      return props;
  }
}

export function promptForAssetEdit(
  template: GameTemplateDefinition | GameProfileTemplateSnapshot,
  edit: NormalizedAssetEdit,
  assetRequestItems: string[]
): string {
  switch (template.assetPromptKind) {
    case "memory-cards":
      return `child-safe ${edit.theme} memory card illustrations for ${assetRequestItems.join(", ")}`;
    case "sorting-game":
      return `child-safe ${edit.theme} sorting game illustrations for ${assetRequestItems.join(", ")}`;
    case "sequence-buttons":
      return `child-safe ${edit.theme} sequence game button illustrations for ${assetRequestItems.join(", ")}`;
    case "general-game":
      return `child-safe ${edit.theme} game illustrations for ${template.displayName}`;
  }
}

export function assetEditItemsForAssetRequests(
  template: GameTemplateDefinition | GameProfileTemplateSnapshot,
  profile: GameAssemblyProfile,
  edit: NormalizedAssetEdit
): string[] {
  switch (template.assetPromptKind) {
    case "memory-cards":
      return requireAssetEditItemsForMemoryPairs(
        edit,
        requireMemoryPairCount(propsForAssetEditOperation(template, profile, "memory-pairs"))
      );
    case "sorting-game":
      return requireAssetEditItemsForBins(
        edit,
        requireStringArrayProp(propsForAssetEditOperation(template, profile, "sorting-items"), "bins", "sorting-items")
      );
    case "sequence-buttons": {
      const props = propsForAssetEditOperation(template, profile, "sequence-items");
      const sourceSequence = requireStringArrayProp(props, "sequence", "sequence-items");
      const sourceRounds = requireStringMatrixProp(props, "rounds", "sequence-items");
      return requireAssetEditItemsForSequence(edit, [...sourceSequence, ...sourceRounds.flat()]);
    }
    case "general-game":
      return edit.items;
  }
}

export function propsForAssetEditOperation(
  template: GameTemplateDefinition | GameProfileTemplateSnapshot,
  profile: GameAssemblyProfile,
  operationKind: GameTemplateAssetEditOperation["operation"]
): Record<string, JsonValue> {
  const operations = template.assetEditOperations.filter((operation) => operation.operation === operationKind);
  if (operations.length !== 1) {
    throw new Error(`${template.id} requires exactly one ${operationKind} asset edit operation for asset requests`);
  }

  const [operation] = operations;
  const components = profile.components.filter((entry) => entry.renderCapability === operation.componentCapability);
  if (components.length === 0) {
    throw new Error(`${profile.id} is missing component ${operation.componentCapability} for ${operationKind} asset requests`);
  }
  if (components.length > 1) {
    throw new Error(`${profile.id} has multiple components for ${operation.componentCapability} ${operationKind} asset requests`);
  }
  const [component] = components;

  return component.props;
}

export function pairedCardIds(edit: NormalizedAssetEdit, pairCount: number): string[] {
  const bases = requireAssetEditItemsForMemoryPairs(edit, pairCount);
  return bases.flatMap((item) => {
    const cardBase = slugLabel(item);
    return [`${cardBase}-a`, `${cardBase}-b`];
  });
}

export function requireAssetEditItemsForMemoryPairs(edit: NormalizedAssetEdit, pairCount: number): string[] {
  if (edit.itemsSource === "explicit" && edit.items.length !== pairCount) {
    throw new Error(`memory-pairs explicit asset edit items require exactly ${pairCount} items for authored pairs`);
  }

  if (edit.items.length < pairCount) {
    throw new Error(`memory-pairs requires at least ${pairCount} asset edit items for authored pairs`);
  }

  return edit.items.slice(0, pairCount);
}

export function requireMemoryPairCount(props: Record<string, JsonValue>): number {
  const cards = requireStringArrayProp(props, "cards", "memory-pairs");
  const pairs = requireStringRecordProp(props, "pairs", "memory-pairs");
  const pairIds = cards.map((card) => {
    const pairId = pairs[card];
    if (!pairId) {
      throw new Error(`memory-pairs card ${card} is missing an authored pair id`);
    }

    return pairId;
  });
  const uniquePairIds = uniqueStrings(pairIds);
  const cardsPerPair = new Map(uniquePairIds.map((pairId) => [pairId, 0]));
  for (const pairId of pairIds) {
    cardsPerPair.set(pairId, (cardsPerPair.get(pairId) ?? 0) + 1);
  }
  const invalidPairs = [...cardsPerPair.entries()].filter(([, count]) => count !== 2);
  if (invalidPairs.length > 0) {
    throw new Error(`memory-pairs authored pairs must contain exactly two cards: ${invalidPairs.map(([pairId]) => pairId).join(", ")}`);
  }

  return uniquePairIds.length;
}

export function pairMapForCards(cards: string[]): Record<string, string> {
  const pairs: Record<string, string> = {};
  for (let index = 0; index < cards.length; index += 2) {
    const first = cards[index];
    const second = cards[index + 1];
    const pairKey = `pair-${Math.floor(index / 2) + 1}`;
    if (first) {
      pairs[first] = pairKey;
    }
    if (second) {
      pairs[second] = pairKey;
    }
  }

  return pairs;
}

export function assetEditCatalogEntryFor(theme: string): BuilderAssetEditCatalogEntry | undefined {
  const candidate = cleanLabel(theme);
  const manifests = PROFILE_BUILD_FOLDER_SOURCE.listThemeManifests();
  const matches = manifests.filter((entry) => {
    if (cleanLabel(entry.theme) === candidate) {
      return true;
    }
    if (cleanLabel(entry.displayLabel) === candidate) {
      return true;
    }
    return entry.aliases.some((alias) => cleanLabel(alias) === candidate);
  });
  if (matches.length > 1) {
    throw new Error(`asset edit theme ${theme} maps to multiple builder asset edit catalog entries: ${matches.map((entry) => entry.theme).join(", ")}`);
  }
  const matched = singleValue(matches);
  if (!matched) {
    return undefined;
  }

  const sprites = PROFILE_BUILD_FOLDER_SOURCE.listSpritesForTheme(matched.theme);
  const suggestedItems = sprites.map((sprite) => sprite.basename);
  return BuilderAssetEditCatalogEntrySchema.parse({
    theme: matched.theme,
    displayLabel: matched.displayLabel,
    aliases: matched.aliases,
    aliasSummary: matched.aliases.join(", "),
    suggestedItems,
    suggestedItemSummary: suggestedItems.join(", "),
    localReplacementFolder: matched.theme
  });
}

export function freeformItemsForTheme(singularTheme: string): string[] {
  const resolvedTheme = PROFILE_BUILD_FOLDER_SOURCE.resolveThemeByAliasOrName(singularTheme);
  if (resolvedTheme) {
    return PROFILE_BUILD_FOLDER_SOURCE
      .listSpritesForTheme(resolvedTheme)
      .map((sprite) => sprite.basename);
  }
  const base = slugLabel(singularTheme);
  return FALLBACK_FREEFORM_SUFFIXES.map((suffix) => `${base}-${suffix}`);
}

export function requireAssetEditItemsForBins(edit: NormalizedAssetEdit, bins: string[]): string[] {
  if (edit.itemsSource === "explicit" && edit.items.length !== bins.length) {
    throw new Error(`sorting-items explicit asset edit items require exactly ${bins.length} items for bins ${bins.join(", ")}`);
  }

  if (edit.items.length < bins.length) {
    throw new Error(`sorting-items requires at least ${bins.length} asset edit items for bins ${bins.join(", ")}`);
  }

  return edit.items.slice(0, bins.length);
}

export function requireAssetEditItemsForSequence(edit: NormalizedAssetEdit, tokens: string[]): string[] {
  const uniqueTokens = uniqueStrings(tokens);
  if (edit.itemsSource === "explicit" && edit.items.length !== uniqueTokens.length) {
    throw new Error(`sequence-items explicit asset edit items require exactly ${uniqueTokens.length} items for sequence tokens ${uniqueTokens.join(", ")}`);
  }

  if (edit.items.length < uniqueTokens.length) {
    throw new Error(`sequence-items requires at least ${uniqueTokens.length} asset edit items for sequence tokens ${uniqueTokens.join(", ")}`);
  }

  return edit.items.slice(0, uniqueTokens.length);
}

export function remapSequenceTokens(tokens: string[], tokenMap: Map<string, string>): string[] {
  return tokens.map((token) => tokenMap.get(token) ?? token);
}

export function remapSequenceRounds(rounds: string[][], tokenMap: Map<string, string>): string[][] {
  return rounds.map((round) => round.map((token) => tokenMap.get(token) ?? token));
}

export function tokenMapForSequence(tokens: string[], edit: NormalizedAssetEdit): Map<string, string> {
  const uniqueTokens = uniqueStrings(tokens);
  const sequenceItems = requireAssetEditItemsForSequence(edit, tokens);

  return new Map(uniqueTokens.map((token, index) => [token, sequenceItems[index]!]));
}

export function rewriteAssetBindings(
  assetBindings: Record<string, string>,
  previousAssets: GeneratedAssetRecord[],
  nextAssets: GeneratedAssetRecord[]
): Record<string, string> {
  const requestIdByPreviousAssetId = new Map(previousAssets.map((asset) => [asset.assetId, asset.requestId]));
  const nextAssetIdByRequestId = new Map(nextAssets.map((asset) => [asset.requestId, asset.assetId]));

  return Object.fromEntries(
    Object.entries(assetBindings).map(([binding, assetId]) => {
      const requestId = requestIdByPreviousAssetId.get(assetId);
      return [binding, requestId ? nextAssetIdByRequestId.get(requestId) ?? assetId : assetId];
    })
  );
}

export function stringArrayProp(props: Record<string, JsonValue>, key: string): string[] {
  const value = props[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export function requireStringArrayProp(
  props: Record<string, JsonValue>,
  key: string,
  operation: GameTemplateAssetEditOperation["operation"]
): string[] {
  const values = stringArrayProp(props, key);
  if (values.length === 0) {
    throw new Error(`asset edit operation ${operation} requires non-empty string array prop ${key}`);
  }

  return values;
}

export function requireStringRecordProp(
  props: Record<string, JsonValue>,
  key: string,
  operation: GameTemplateAssetEditOperation["operation"]
): Record<string, string> {
  const value = props[key];
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`asset edit operation ${operation} requires non-empty string record prop ${key}`);
  }

  const record = Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
  if (Object.keys(record).length === 0) {
    throw new Error(`asset edit operation ${operation} requires non-empty string record prop ${key}`);
  }

  return record;
}

export function requireNumberProp(
  props: Record<string, JsonValue>,
  key: string,
  operation: GameTemplateAssetEditOperation["operation"]
): number {
  const value = props[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`asset edit operation ${operation} requires numeric prop ${key}`);
  }

  return value;
}

export function stringMatrixProp(props: Record<string, JsonValue>, key: string): string[][] {
  const value = props[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is JsonValue[] => Array.isArray(entry))
    .map((entry) => entry.filter((item): item is string => typeof item === "string"))
    .filter((entry) => entry.length > 0);
}

export function requireStringMatrixProp(
  props: Record<string, JsonValue>,
  key: string,
  operation: GameTemplateAssetEditOperation["operation"]
): string[][] {
  const values = stringMatrixProp(props, key);
  if (values.length === 0) {
    throw new Error(`asset edit operation ${operation} requires non-empty string matrix prop ${key}`);
  }

  return values;
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

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

function templateForProfile(profile: GameAssemblyProfile): GameProfileTemplateSnapshot {
  return profile.template;
}
