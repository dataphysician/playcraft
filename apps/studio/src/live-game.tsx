import React from "react";
import type { ComponentBinding, GameAssemblyProfile, GeneratedAssetRecord, JsonValue } from "@playcraft/contracts";

export interface LiveGameInteraction {
  eventName: string;
  payload: JsonValue;
  profileId: string;
}

export interface AssetReplacement {
  uri: string;
  altText?: string;
}

export type AssetReplacementInput = Record<string, string | AssetReplacement>;

export interface LiveGameProps {
  profile?: GameAssemblyProfile;
  assetReplacements?: AssetReplacementInput;
  onInteraction?: (interaction: LiveGameInteraction) => void;
}

type AssetReplacementLookup = Map<string, AssetReplacement>;

interface MemoryCard {
  id: string;
  pairKey: string;
}

export function createProfileAssetReplacementLookup(
  profile: GameAssemblyProfile,
  replacements: AssetReplacementInput = {}
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
  replacements: AssetReplacementInput = {}
): AssetReplacementLookup {
  return React.useMemo(() => createProfileAssetReplacementLookup(profile, replacements), [profile, replacements]);
}

export function LiveGame({ profile, assetReplacements, onInteraction }: LiveGameProps): React.ReactElement {
  if (!profile) {
    return React.createElement(
      "section",
      { role: "status", style: liveStyles.emptyState },
      "Generate a game to play it here."
    );
  }

  return React.createElement(LiveGameForProfile, { profile, assetReplacements, onInteraction });
}

function LiveGameForProfile({
  profile,
  assetReplacements,
  onInteraction
}: {
  profile: GameAssemblyProfile;
  assetReplacements?: AssetReplacementInput;
  onInteraction?: (interaction: LiveGameInteraction) => void;
}): React.ReactElement {
  const replacements = useProfileAssetReplacements(profile, assetReplacements);
  const memory = componentByCapability(profile, "component:reveal-card-grid");
  const sortBins = componentByCapability(profile, "component:sort-bins");
  const sequence = componentByCapability(profile, "component:sequence-pad");

  if (memory) {
    return React.createElement(MemoryGame, { profile, component: memory, replacements, onInteraction });
  }

  if (sortBins) {
    return React.createElement(SortingGame, { profile, component: sortBins, replacements, onInteraction });
  }

  if (sequence) {
    return React.createElement(SequenceGame, {
      profile,
      sequenceComponent: sequence,
      choiceComponent: componentByCapability(profile, "component:choice-grid"),
      replacements,
      onInteraction
    });
  }

  return React.createElement(
    "section",
    { role: "status", style: liveStyles.emptyState },
    `${profile.profileName} does not have a live game surface yet.`
  );
}

function MemoryGame({
  profile,
  component,
  replacements,
  onInteraction
}: {
  profile: GameAssemblyProfile;
  component: ComponentBinding;
  replacements: AssetReplacementLookup;
  onInteraction?: (interaction: LiveGameInteraction) => void;
}): React.ReactElement {
  const sourceCards = stringArrayProp(component.props, "cards");
  const deck = React.useMemo(() => shuffleMemoryCards(sourceCards, profile.id), [sourceCards.join("|"), profile.id]);
  const [revealed, setRevealed] = React.useState<string[]>([]);
  const [matched, setMatched] = React.useState<Set<string>>(() => new Set());
  const [moves, setMoves] = React.useState(0);
  const roundKey = `${profile.id}:${sourceCards.join("|")}`;

  React.useEffect(() => {
    setRevealed([]);
    setMatched(new Set());
    setMoves(0);
  }, [roundKey]);

  const pairs = new Set(deck.map((card) => card.pairKey));
  const complete = pairs.size > 0 && matched.size === pairs.size;
  const componentArt = resolveComponentAsset(profile, component, "illustration", replacements);

  function handleCard(card: MemoryCard): void {
    if (matched.has(card.pairKey) || revealed.includes(card.id)) {
      return;
    }

    const active = revealed.length >= 2 ? [] : revealed;
    const next = [...active, card.id];
    const nextMoves = next.length === 2 ? moves + 1 : moves;
    let matchedNow = false;

    if (next.length === 2) {
      const first = deck.find((entry) => entry.id === next[0]);
      matchedNow = first?.pairKey === card.pairKey;
      setMoves(nextMoves);
      if (matchedNow) {
        setMatched((current) => new Set([...current, card.pairKey]));
        setRevealed([]);
      } else {
        setRevealed(next);
      }
    } else {
      setRevealed(next);
    }

    onInteraction?.({
      eventName: "tool:reveal-card",
      profileId: profile.id,
      payload: {
        componentId: component.componentId,
        cardId: card.id,
        pairKey: card.pairKey,
        matched: matchedNow,
        moveCount: nextMoves
      }
    });
  }

  return React.createElement(
    "section",
    { style: liveStyles.liveSurface, "aria-label": profile.profileName },
    React.createElement(
      "div",
      { style: liveStyles.gameHeader },
      React.createElement(
        "div",
        null,
        React.createElement("p", { style: liveStyles.profileName }, profile.profileName),
        React.createElement("h2", { style: liveStyles.gameTitle }, textProp(component.props, "title", profile.profileName)),
        React.createElement("p", { style: liveStyles.gameMeta }, complete ? "All pairs found" : `${matched.size} of ${pairs.size} pairs`)
      ),
      React.createElement("span", { style: liveStyles.counter }, `${moves} moves`)
    ),
    React.createElement(
      "div",
      { style: liveStyles.memoryBoard },
      ...deck.map((card, index) => {
        const cardReplacement = replacements.get(`card:${card.id}`) ?? replacements.get(card.id);
        const shown = revealed.includes(card.id) || matched.has(card.pairKey);
        return React.createElement(
          "button",
          {
            key: `${card.id}.${index}`,
            type: "button",
            onClick: () => handleCard(card),
            "aria-label": card.id,
            style: {
              ...liveStyles.memoryCard,
              ...(shown ? memoryCardFaceStyle(card.id) : liveStyles.memoryCardHidden),
              ...(matched.has(card.pairKey) ? liveStyles.memoryCardMatched : {})
            }
          },
          shown
            ? React.createElement(CardFace, {
                cardId: card.id,
                replacement: cardReplacement ?? componentArt
              })
            : React.createElement("span", { style: liveStyles.cardBackMark }, String(index + 1))
        );
      })
    ),
    complete
      ? React.createElement(
          "button",
          {
            type: "button",
            onClick: () => {
              setRevealed([]);
              setMatched(new Set());
              setMoves(0);
            },
            style: liveStyles.inlineAction
          },
          "Play Again"
        )
      : null
  );
}

function SortingGame({
  profile,
  component,
  replacements,
  onInteraction
}: {
  profile: GameAssemblyProfile;
  component: ComponentBinding;
  replacements: AssetReplacementLookup;
  onInteraction?: (interaction: LiveGameInteraction) => void;
}): React.ReactElement {
  const items = stringArrayProp(component.props, "items");
  const bins = stringArrayProp(component.props, "bins");
  const [selectedItem, setSelectedItem] = React.useState<string | undefined>();
  const [placements, setPlacements] = React.useState<Record<string, string>>({});
  const componentArt = resolveComponentAsset(profile, component, "illustration", replacements);

  React.useEffect(() => {
    setSelectedItem(undefined);
    setPlacements({});
  }, [profile.id, items.join("|"), bins.join("|")]);

  function placeItem(targetId: string): void {
    if (!selectedItem) {
      return;
    }

    const correct = selectedItem.includes(targetId);
    setPlacements((current) => ({ ...current, [selectedItem]: targetId }));
    onInteraction?.({
      eventName: "tool:move-item",
      profileId: profile.id,
      payload: {
        componentId: component.componentId,
        itemId: selectedItem,
        targetId,
        correct
      }
    });
    setSelectedItem(undefined);
  }

  return React.createElement(
    "section",
    { style: liveStyles.liveSurface, "aria-label": profile.profileName },
    React.createElement(
      "div",
      { style: liveStyles.gameHeader },
      React.createElement(
        "div",
        null,
        React.createElement("p", { style: liveStyles.profileName }, profile.profileName),
        React.createElement("h2", { style: liveStyles.gameTitle }, textProp(component.props, "title", profile.profileName))
      ),
      React.createElement("span", { style: liveStyles.counter }, `${Object.keys(placements).length} / ${items.length}`)
    ),
    componentArt ? React.createElement("img", { src: componentArt.uri, alt: componentArt.altText, style: liveStyles.heroAsset }) : null,
    React.createElement(
      "div",
      { style: liveStyles.sortLayout },
      React.createElement(
        "div",
        { style: liveStyles.itemTray },
        ...items.map((item) =>
          React.createElement(
            "button",
            {
              key: item,
              type: "button",
              onClick: () => setSelectedItem(item),
              disabled: placements[item] !== undefined,
              style: selectedItem === item ? liveStyles.itemChipActive : liveStyles.itemChip
            },
            item
          )
        )
      ),
      React.createElement(
        "div",
        { style: liveStyles.binGrid },
        ...bins.map((bin) =>
          React.createElement(
            "button",
            {
              key: bin,
              type: "button",
              onClick: () => placeItem(bin),
              style: liveStyles.bin
            },
            React.createElement("strong", null, bin),
            React.createElement(
              "span",
              { style: liveStyles.binItems },
              items.filter((item) => placements[item] === bin).join(", ") || " "
            )
          )
        )
      )
    )
  );
}

function SequenceGame({
  profile,
  sequenceComponent,
  choiceComponent,
  replacements,
  onInteraction
}: {
  profile: GameAssemblyProfile;
  sequenceComponent: ComponentBinding;
  choiceComponent?: ComponentBinding;
  replacements: AssetReplacementLookup;
  onInteraction?: (interaction: LiveGameInteraction) => void;
}): React.ReactElement {
  const sequence = stringArrayProp(sequenceComponent.props, "sequence");
  const choices = uniqueStrings([...stringArrayProp(choiceComponent?.props ?? {}, "items"), ...sequence]);
  const [progress, setProgress] = React.useState(0);
  const componentArt = resolveComponentAsset(profile, sequenceComponent, "illustration", replacements);

  React.useEffect(() => {
    setProgress(0);
  }, [profile.id, sequence.join("|")]);

  function choose(item: string): void {
    const expected = sequence[progress];
    const correct = item === expected;
    const nextProgress = correct ? progress + 1 : 0;
    setProgress(nextProgress);
    onInteraction?.({
      eventName: "tool:repeat-sequence",
      profileId: profile.id,
      payload: {
        componentId: sequenceComponent.componentId,
        itemId: item,
        expected,
        correct,
        progress: nextProgress
      }
    });
  }

  return React.createElement(
    "section",
    { style: liveStyles.liveSurface, "aria-label": profile.profileName },
    React.createElement(
      "div",
      { style: liveStyles.gameHeader },
      React.createElement(
        "div",
        null,
        React.createElement("p", { style: liveStyles.profileName }, profile.profileName),
        React.createElement("h2", { style: liveStyles.gameTitle }, textProp(sequenceComponent.props, "title", profile.profileName)),
        React.createElement("p", { style: liveStyles.gameMeta }, textProp(sequenceComponent.props, "prompt", `${progress} of ${sequence.length}`))
      ),
      React.createElement("span", { style: liveStyles.counter }, `${progress} / ${sequence.length}`)
    ),
    componentArt ? React.createElement("img", { src: componentArt.uri, alt: componentArt.altText, style: liveStyles.heroAsset }) : null,
    React.createElement(
      "div",
      { style: liveStyles.sequenceRail },
      ...sequence.map((item, index) =>
        React.createElement(
          "span",
          {
            key: `${item}.${index}`,
            style: index < progress ? liveStyles.sequenceStepComplete : liveStyles.sequenceStep
          },
          item
        )
      )
    ),
    React.createElement(
      "div",
      { style: liveStyles.choiceGrid },
      ...choices.map((item) =>
        React.createElement(
          "button",
          {
            key: item,
            type: "button",
            onClick: () => choose(item),
            style: liveStyles.choiceButton
          },
          item
        )
      )
    )
  );
}

function CardFace({ cardId, replacement }: { cardId: string; replacement?: AssetReplacement }): React.ReactElement {
  if (replacement && isRenderableUri(replacement.uri)) {
    return React.createElement(
      "span",
      { style: liveStyles.cardImageWrap },
      React.createElement("img", { src: replacement.uri, alt: replacement.altText ?? cardId, style: liveStyles.cardImage }),
      React.createElement("strong", { style: liveStyles.cardLabel }, displayCardLabel(cardId))
    );
  }

  return React.createElement(
    "span",
    { style: liveStyles.generatedFace },
    React.createElement("span", { style: liveStyles.generatedGlyph }, displayInitial(cardId)),
    React.createElement("strong", { style: liveStyles.cardLabel }, displayCardLabel(cardId))
  );
}

function componentByCapability(profile: GameAssemblyProfile, capability: string): ComponentBinding | undefined {
  return profile.components.find((component) => component.renderCapability === capability);
}

function stringArrayProp(props: Record<string, JsonValue>, key: string): string[] {
  const value = props[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)));
}

function textProp(props: Record<string, JsonValue>, key: string, fallback: string): string {
  const value = props[key];
  return typeof value === "string" ? value : fallback;
}

function shuffleMemoryCards(cards: string[], seed: string): MemoryCard[] {
  return cards
    .map((id) => ({ id, pairKey: pairKeyFor(id), order: hashString(`${seed}.${id}`) }))
    .sort((left, right) => left.order - right.order)
    .map(({ id, pairKey }) => ({ id, pairKey }));
}

function pairKeyFor(cardId: string): string {
  return cardId.replace(/-[ab]$/u, "");
}

function resolveComponentAsset(
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

  const asset = assetId ? profile.assets.find((entry) => entry.assetId === assetId) : undefined;
  return asset ? replacementFromAsset(asset) : undefined;
}

function replacementFromAsset(asset: GeneratedAssetRecord): AssetReplacement {
  return {
    uri: asset.uri,
    altText: asset.altText
  };
}

function normalizeReplacement(value: string | AssetReplacement, fallbackAlt: string): AssetReplacement {
  return typeof value === "string" ? { uri: value, altText: fallbackAlt } : value;
}

function isRenderableUri(uri: string): boolean {
  return /^(?:https?:|data:|blob:|\/|\.\/|\.\.\/)/u.test(uri);
}

function memoryCardFaceStyle(cardId: string): React.CSSProperties {
  const palette = [
    ["#dcfce7", "#166534"],
    ["#fef3c7", "#92400e"],
    ["#fee2e2", "#991b1b"],
    ["#e0f2fe", "#075985"],
    ["#ede9fe", "#5b21b6"],
    ["#fce7f3", "#9d174d"]
  ];
  const selected = palette[hashString(cardId) % palette.length];

  return {
    background: selected[0],
    color: selected[1],
    borderColor: selected[1]
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function displayCardLabel(cardId: string): string {
  return pairKeyFor(cardId).replace(/-/gu, " ");
}

function displayInitial(cardId: string): string {
  return displayCardLabel(cardId).charAt(0).toUpperCase();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

const liveStyles = {
  emptyState: {
    minHeight: "24rem",
    display: "grid",
    placeItems: "center",
    border: "1px dashed #a1a1aa",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#52525b",
    padding: "1rem"
  },
  liveSurface: {
    minHeight: "100%",
    boxSizing: "border-box" as const,
    display: "grid",
    alignContent: "start",
    gap: "1rem",
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    background: "#ffffff",
    padding: "1rem",
    boxShadow: "0 18px 40px rgba(24, 24, 27, 0.08)"
  },
  gameHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    alignItems: "start"
  },
  gameTitle: {
    margin: 0,
    fontSize: "1.5rem"
  },
  profileName: {
    margin: "0 0 0.35rem",
    color: "#0f766e",
    fontSize: "0.82rem",
    fontWeight: 800,
    textTransform: "uppercase" as const
  },
  gameMeta: {
    margin: "0.35rem 0 0",
    color: "#52525b"
  },
  counter: {
    border: "1px solid #0f766e",
    borderRadius: "8px",
    background: "#ecfdf5",
    color: "#064e3b",
    padding: "0.5rem 0.75rem",
    fontWeight: 700,
    whiteSpace: "nowrap" as const
  },
  memoryBoard: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
    gap: "0.75rem"
  },
  memoryCard: {
    width: "100%",
    aspectRatio: "1",
    border: "2px solid #d4d4d8",
    borderRadius: "8px",
    padding: "0.75rem",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    transition: "transform 160ms ease, border-color 160ms ease, background 160ms ease"
  },
  memoryCardHidden: {
    background: "#18181b",
    color: "#fafafa",
    borderColor: "#3f3f46"
  },
  memoryCardMatched: {
    boxShadow: "0 0 0 3px rgba(15, 118, 110, 0.22)"
  },
  cardBackMark: {
    display: "grid",
    placeItems: "center",
    width: "3rem",
    height: "3rem",
    borderRadius: "8px",
    background: "#fafafa",
    color: "#18181b",
    fontWeight: 800
  },
  generatedFace: {
    display: "grid",
    gap: "0.5rem",
    justifyItems: "center",
    textAlign: "center" as const
  },
  generatedGlyph: {
    display: "grid",
    placeItems: "center",
    width: "3.5rem",
    height: "3.5rem",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.76)",
    fontSize: "2rem",
    fontWeight: 900
  },
  cardImageWrap: {
    display: "grid",
    gap: "0.4rem",
    justifyItems: "center",
    width: "100%"
  },
  cardImage: {
    width: "100%",
    aspectRatio: "1",
    objectFit: "cover" as const,
    borderRadius: "8px"
  },
  cardLabel: {
    overflowWrap: "anywhere" as const,
    fontSize: "0.95rem"
  },
  inlineAction: {
    justifySelf: "start",
    border: "1px solid #0f766e",
    borderRadius: "8px",
    background: "#0f766e",
    color: "#ffffff",
    padding: "0.7rem 1rem",
    fontWeight: 700
  },
  heroAsset: {
    width: "min(14rem, 100%)",
    aspectRatio: "1",
    objectFit: "cover" as const,
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    background: "#f4f4f5"
  },
  sortLayout: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))",
    gap: "1rem"
  },
  itemTray: {
    display: "grid",
    gap: "0.5rem",
    alignContent: "start"
  },
  itemChip: {
    minHeight: "3rem",
    borderRadius: "8px",
    border: "1px solid #d4d4d8",
    background: "#fafafa",
    color: "#18181b",
    fontWeight: 700,
    padding: "0.6rem"
  },
  itemChipActive: {
    minHeight: "3rem",
    borderRadius: "8px",
    border: "2px solid #d97706",
    background: "#fff7ed",
    color: "#92400e",
    fontWeight: 700,
    padding: "0.55rem"
  },
  binGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))",
    gap: "0.75rem"
  },
  bin: {
    minHeight: "10rem",
    display: "grid",
    alignContent: "start",
    gap: "0.75rem",
    borderRadius: "8px",
    border: "2px dashed #0f766e",
    background: "#ecfdf5",
    color: "#064e3b",
    padding: "1rem",
    textAlign: "left" as const
  },
  binItems: {
    color: "#18181b",
    overflowWrap: "anywhere" as const
  },
  sequenceRail: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem"
  },
  sequenceStep: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    background: "#fafafa",
    color: "#52525b",
    padding: "0.6rem 0.8rem",
    fontWeight: 700
  },
  sequenceStepComplete: {
    border: "1px solid #0f766e",
    borderRadius: "8px",
    background: "#ecfdf5",
    color: "#064e3b",
    padding: "0.6rem 0.8rem",
    fontWeight: 700
  },
  choiceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
    gap: "0.75rem"
  },
  choiceButton: {
    minHeight: "4rem",
    borderRadius: "8px",
    border: "1px solid #d97706",
    background: "#fff7ed",
    color: "#92400e",
    fontWeight: 800,
    padding: "0.75rem"
  }
} satisfies Record<string, React.CSSProperties>;
