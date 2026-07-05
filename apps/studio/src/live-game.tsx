import React from "react";
import type {
  ComponentBinding,
  GameAssemblyProfile,
  GameProfileTemplateSnapshot,
  GameTemplateLiveSurface,
  GameTemplateTokenStyle,
  GeneratedAssetRecord,
  JsonValue
} from "@playcraft/contracts";
import { createProfileLibraryAssetReplacements, playcraftUiAssets, sortingBinAssetFor } from "./asset-library.js";
import emptyGameHeroUrl from "./assets/empty-game-hero.png";

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

interface MemoryPairVisual {
  background: string;
  border: string;
  foreground: string;
  accent: string;
}

interface TokenStyleCatalog {
  defaultStyle: GameTemplateTokenStyle;
  tokenStyles: GameTemplateTokenStyle[];
}

type SequencePhase = "watch" | "play" | "complete";
type BinFeedback = "success" | "failure";
type SequenceFeedbackKind = "info" | "success" | "failure";

interface SequenceFeedback {
  expected?: string;
  item?: string;
  kind: SequenceFeedbackKind;
  message: string;
}

interface SortDragState {
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
  return React.createElement(
    React.Fragment,
    null,
    React.createElement("style", null, liveMotionCss),
    profile
      ? React.createElement(LiveGameForProfile, { profile, assetReplacements, onInteraction })
      : React.createElement(EmptyGameHero)
  );
}

function EmptyGameHero(): React.ReactElement {
  return React.createElement(
    "section",
    { "aria-label": "Live app empty state", style: liveStyles.emptyState },
    React.createElement("img", {
      alt: "Children playing a colorful game together",
      src: emptyGameHeroUrl,
      style: liveStyles.emptyHeroImage
    })
  );
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
  const template = liveTemplateForProfile(profile);
  const liveSurface = template.liveSurface;
  const tokenStyleCatalog = tokenStyleCatalogForSurface(liveSurface);
  const libraryAssetReplacementResult = React.useMemo(() => {
    try {
      return { ok: true as const, value: createProfileLibraryAssetReplacements(profile) };
    } catch (cause) {
      return { ok: false as const, message: errorMessage(cause, "live game asset replacement lookup failed") };
    }
  }, [profile]);
  const libraryAssetReplacements = libraryAssetReplacementResult.ok ? libraryAssetReplacementResult.value : {};
  const mergedAssetReplacements = React.useMemo(
    () => ({ ...libraryAssetReplacements, ...assetReplacements }),
    [assetReplacements, libraryAssetReplacements]
  );
  const replacements = useProfileAssetReplacements(profile, mergedAssetReplacements);

  if (!libraryAssetReplacementResult.ok) {
    return React.createElement(LiveGameFailure, { message: libraryAssetReplacementResult.message });
  }

  try {
    requireUniqueProfileAssetIds(profile);

    switch (liveSurface.kind) {
      case "memory": {
        const component = requiredComponentByCapability(profile, liveSurface.componentCapabilities.primary);
        validateMemorySurfaceProps(profile.id, component, tokenStyleCatalog);
        return React.createElement(MemoryGame, {
          profile,
          component,
          replacements,
          tokenStyleCatalog,
          onInteraction
        });
      }
      case "sorting": {
        const component = requiredComponentByCapability(profile, liveSurface.componentCapabilities.primary);
        validateSortingSurfaceProps(profile.id, component, tokenStyleCatalog);
        return React.createElement(SortingGame, {
          profile,
          component,
          replacements,
          tokenStyleCatalog,
          onInteraction
        });
      }
      case "sequence": {
        const sequenceComponent = requiredComponentByCapability(profile, liveSurface.componentCapabilities.primary);
        const choiceComponent = requiredSequenceChoiceComponent(profile, liveSurface);
        validateSequenceSurfaceProps(profile.id, sequenceComponent, choiceComponent, tokenStyleCatalog);
        return React.createElement(SequenceGame, {
          profile,
          sequenceComponent,
          choiceComponent,
          replacements,
          tokenStyleCatalog,
          onInteraction
        });
      }
    }
  } catch (cause) {
    return React.createElement(LiveGameFailure, { message: errorMessage(cause, "live game surface selection failed") });
  }

  return React.createElement(
    "section",
    { role: "status", style: liveStyles.emptyState },
    `${profile.profileName} does not have a live game surface yet.`
  );
}

function LiveGameFailure({ message }: { message: string }): React.ReactElement {
  return React.createElement(
    "section",
    { role: "alert", "data-testid": "live-game-error", style: liveStyles.failureState },
    React.createElement("strong", null, "Live game blocked"),
    React.createElement("pre", { style: liveStyles.failureDetail }, message)
  );
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

function MemoryGame({
  profile,
  component,
  replacements,
  tokenStyleCatalog,
  onInteraction
}: {
  profile: GameAssemblyProfile;
  component: ComponentBinding;
  replacements: AssetReplacementLookup;
  tokenStyleCatalog: TokenStyleCatalog;
  onInteraction?: (interaction: LiveGameInteraction) => void;
}): React.ReactElement {
  const sourceCards = stringArrayProp(component.props, "cards");
  const cardPairs = stringRecordProp(component.props, "pairs");
  const deck = React.useMemo(() => shuffleMemoryCards(sourceCards, cardPairs, profile.id), [sourceCards.join("|"), JSON.stringify(cardPairs), profile.id]);
  const pairVisuals = React.useMemo(() => createMemoryPairVisuals(cardPairs, tokenStyleCatalog), [JSON.stringify(cardPairs), JSON.stringify(tokenStyleCatalog)]);
  const [revealed, setRevealed] = React.useState<string[]>([]);
  const [matched, setMatched] = React.useState<Set<string>>(() => new Set());
  const [moves, setMoves] = React.useState(0);
  const didMountRef = React.useRef(false);
  const roundKey = `${profile.id}:${sourceCards.join("|")}:${JSON.stringify(cardPairs)}`;

  React.useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    setRevealed([]);
    setMatched(new Set());
    setMoves(0);
  }, [roundKey]);

  const pairs = new Set(deck.map((card) => card.pairKey));
  const complete = pairs.size > 0 && matched.size === pairs.size;
  const componentArt = resolveComponentAsset(profile, component, "illustration", replacements);
  const score = Math.max(0, matched.size * 150 - moves * 5);

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
    { style: gameSurfaceStyle("memory"), "aria-label": profile.profileName },
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
      { style: liveStyles.statRow },
      React.createElement(StatPill, { label: "Pairs", value: `${matched.size}/${pairs.size}` }),
      React.createElement(StatPill, { label: "Score", value: String(score), tone: "warm" }),
      React.createElement(ProgressTrack, { value: matched.size, max: pairs.size })
    ),
    React.createElement(
      "div",
      { style: liveStyles.memoryBoard },
      ...deck.map((card, index) => {
        const cardReplacement = replacements.get(`card:${card.id}`);
        const pairVisual = pairVisuals.get(card.pairKey) ?? colorForToken(card.pairKey, tokenStyleCatalog);
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
              ...(shown ? memoryCardFaceStyle(pairVisual) : liveStyles.memoryCardHidden),
              ...(matched.has(card.pairKey) ? liveStyles.memoryCardMatched : {})
            }
          },
          shown
            ? React.createElement(CardFace, {
                cardId: card.id,
                pairVisual,
                replacement: cardReplacement ?? componentArt
              })
            : React.createElement(CardBackFace)
        );
      })
    ),
    complete
      ? React.createElement(CompletionPanel, {
          title: "Perfect match",
          detail: `${pairs.size} pairs cleared in ${moves} moves.`,
          score,
          onRestart: () => {
            setRevealed([]);
            setMatched(new Set());
            setMoves(0);
          }
        })
      : null
  );
}

function SortingGame({
  profile,
  component,
  replacements,
  tokenStyleCatalog,
  onInteraction
}: {
  profile: GameAssemblyProfile;
  component: ComponentBinding;
  replacements: AssetReplacementLookup;
  tokenStyleCatalog: TokenStyleCatalog;
  onInteraction?: (interaction: LiveGameInteraction) => void;
}): React.ReactElement {
  const items = stringArrayProp(component.props, "items");
  const bins = stringArrayProp(component.props, "bins");
  const targets = stringRecordProp(component.props, "targets");
  const [selectedItem, setSelectedItem] = React.useState<string | undefined>();
  const [placements, setPlacements] = React.useState<Record<string, string>>({});
  const [feedback, setFeedback] = React.useState<string | undefined>();
  const [mistakes, setMistakes] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const [dragState, setDragState] = React.useState<SortDragState | undefined>();
  const [dragTarget, setDragTarget] = React.useState<string | undefined>();
  const [binFeedback, setBinFeedback] = React.useState<Record<string, BinFeedback | undefined>>({});
  const binRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const dragStateRef = React.useRef<SortDragState | undefined>(undefined);
  const feedbackTimers = React.useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const suppressNextClick = React.useRef(false);
  const componentArt = resolveComponentAsset(profile, component, "illustration", replacements);
  const placedCount = Object.keys(placements).length;
  const complete = items.length > 0 && placedCount === items.length;
  const score = Math.max(0, placedCount * 120 + streak * 15 - mistakes * 20);
  const didMountRef = React.useRef(false);

  React.useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    setSelectedItem(undefined);
    setPlacements({});
    setFeedback(undefined);
    setMistakes(0);
    setStreak(0);
    setDragState(undefined);
    dragStateRef.current = undefined;
    setDragTarget(undefined);
    setBinFeedback({});
  }, [profile.id, items.join("|"), bins.join("|"), JSON.stringify(targets)]);

  React.useEffect(
    () => () => {
      for (const timer of feedbackTimers.current) {
        clearTimeout(timer);
      }
    },
    []
  );

  function placeSelectedItem(targetId: string): void {
    if (!selectedItem || placements[selectedItem] !== undefined) {
      setFeedback("Choose an item first.");
      return;
    }

    placeItem(selectedItem, targetId, false);
  }

  function placeItem(item: string, targetId: string, clearOnFailure: boolean): void {
    const correct = targets[item] === targetId;
    flashBin(targetId, correct ? "success" : "failure");
    if (correct) {
      setPlacements((current) => ({ ...current, [item]: targetId }));
      setFeedback(`${item} belongs in ${targetId}.`);
      setStreak((current) => current + 1);
      setSelectedItem(undefined);
    } else {
      setFeedback(`${item} does not belong in ${targetId}.`);
      setMistakes((current) => current + 1);
      setStreak(0);
      if (clearOnFailure) {
        setSelectedItem(undefined);
      }
    }

    onInteraction?.({
      eventName: "tool:move-item",
      profileId: profile.id,
      payload: {
        componentId: component.componentId,
        itemId: item,
        targetId,
        correct
      }
    });
  }

  function flashBin(bin: string, state: BinFeedback): void {
    setBinFeedback((current) => ({ ...current, [bin]: state }));
    const timer = setTimeout(() => {
      setBinFeedback((current) => ({ ...current, [bin]: undefined }));
    }, 620);
    feedbackTimers.current.push(timer);
  }

  function binAtPoint(x: number, y: number): string | undefined {
    for (const bin of bins) {
      const node = binRefs.current.get(bin);
      if (node && pointInRect(x, y, node.getBoundingClientRect())) {
        return bin;
      }
    }

    return undefined;
  }

  function handleItemPointerDown(item: string, event: React.PointerEvent<HTMLButtonElement>): void {
    if (placements[item] !== undefined || event.button > 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    beginItemDrag(item, event.pointerId, event.clientX, event.clientY, rect);
  }

  function handleItemPointerMove(event: React.PointerEvent<HTMLButtonElement>): void {
    moveItemDrag(event.pointerId, event.clientX, event.clientY, () => event.preventDefault());
  }

  function finishItemPointer(event: React.PointerEvent<HTMLButtonElement>): void {
    finishItemDrag(event.pointerId, event.clientX, event.clientY, () => event.preventDefault());
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function handleItemMouseDown(item: string, event: React.MouseEvent<HTMLButtonElement>): void {
    if (dragStateRef.current || placements[item] !== undefined || event.button > 0) {
      return;
    }

    beginItemDrag(item, -1, event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
  }

  function handleItemMouseMove(event: React.MouseEvent<HTMLButtonElement>): void {
    moveItemDrag(-1, event.clientX, event.clientY, () => event.preventDefault());
  }

  function finishItemMouse(event: React.MouseEvent<HTMLButtonElement>): void {
    finishItemDrag(-1, event.clientX, event.clientY, () => event.preventDefault());
  }

  function beginItemDrag(item: string, pointerId: number, x: number, y: number, rect: DOMRect): void {
    setSelectedItem(item);
    const nextDragState = {
      item,
      pointerId,
      startX: x,
      startY: y,
      x,
      y,
      offsetX: rect.width > 0 ? x - rect.left : 24,
      offsetY: rect.height > 0 ? y - rect.top : 24,
      width: rect.width || 176,
      height: rect.height || 48,
      dragging: false
    };
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  }

  function moveItemDrag(pointerId: number, x: number, y: number, preventDefault: () => void): void {
    const current = dragStateRef.current;
    if (!current || current.pointerId !== pointerId) {
      return;
    }

    const distance = Math.hypot(x - current.startX, y - current.startY);
    const dragging = current.dragging || distance > 4;
    if (dragging) {
      preventDefault();
    }

    const nextDragState = { ...current, x, y, dragging };
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
    setDragTarget(dragging ? binAtPoint(x, y) : undefined);
  }

  function finishItemDrag(pointerId: number, x: number, y: number, preventDefault: () => void): void {
    const current = dragStateRef.current;
    if (!current || current.pointerId !== pointerId) {
      return;
    }

    if (current.dragging) {
      preventDefault();
      suppressNextClick.current = true;
      const target = binAtPoint(x, y) ?? dragTarget;
      if (target) {
        placeItem(current.item, target, true);
      } else {
        setFeedback(`${current.item} returned to the tray.`);
        setSelectedItem(undefined);
      }
    }

    dragStateRef.current = undefined;
    setDragState(undefined);
    setDragTarget(undefined);
  }

  return React.createElement(
    "section",
    { style: gameSurfaceStyle("sorting"), "aria-label": profile.profileName },
    React.createElement(
      "div",
      { style: liveStyles.gameHeader },
      React.createElement(
        "div",
        null,
        React.createElement("p", { style: liveStyles.profileName }, profile.profileName),
        React.createElement("h2", { style: liveStyles.gameTitle }, textProp(component.props, "title", profile.profileName)),
        React.createElement("p", { style: liveStyles.gameMeta }, complete ? "All items sorted" : feedback ?? "Pick an item, then choose a matching bin.")
      ),
      React.createElement("span", { style: liveStyles.counter }, `${placedCount} / ${items.length}`)
    ),
    React.createElement(
      "div",
      { style: liveStyles.statRow },
      React.createElement(StatPill, { label: "Score", value: String(score), tone: "warm" }),
      React.createElement(StatPill, { label: "Streak", value: String(streak) }),
      React.createElement(StatPill, { label: "Misses", value: String(mistakes), tone: mistakes > 0 ? "danger" : "calm" }),
      React.createElement(ProgressTrack, { value: placedCount, max: items.length })
    ),
    React.createElement(HeroArt, {
      asset: componentArt,
      label: textProp(component.props, "title", profile.profileName),
      replacements,
      tokenStyleCatalog,
      tokens: items
    }),
    React.createElement(
      "div",
      { style: liveStyles.sortLayout },
      React.createElement(
        "div",
        { style: liveStyles.itemTray },
        ...items.map((item) => {
          const itemReplacement = replacementForToken(item, replacements, "item");
          return React.createElement(
            "button",
            {
              key: item,
              type: "button",
              "aria-label": item,
              onClick: () => {
                if (suppressNextClick.current) {
                  suppressNextClick.current = false;
                  return;
                }

                setSelectedItem(item);
              },
              onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => handleItemPointerDown(item, event),
              onPointerMove: handleItemPointerMove,
              onPointerUp: finishItemPointer,
              onPointerCancel: finishItemPointer,
              onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => handleItemMouseDown(item, event),
              onMouseMove: handleItemMouseMove,
              onMouseUp: finishItemMouse,
              disabled: placements[item] !== undefined,
              style: sortItemStyle({
                placed: placements[item] !== undefined,
                selected: selectedItem === item,
                dragging: dragState?.item === item && dragState.dragging
              })
            },
            React.createElement(TokenSprite, { replacement: itemReplacement, token: item, tokenStyleCatalog }),
            React.createElement("span", null, item)
          );
        })
      ),
      React.createElement(
        "div",
        { style: liveStyles.binGrid },
        ...bins.map((bin) => {
          const binAsset = sortingBinAssetFor(bin);
          return React.createElement(
            "button",
            {
              key: bin,
              type: "button",
              "aria-label": `${bin} bin`,
              ref: (node: HTMLButtonElement | null) => {
                if (node) {
                  binRefs.current.set(bin, node);
                } else {
                  binRefs.current.delete(bin);
                }
              },
              onClick: () => placeSelectedItem(bin),
              style: sortBinStyle({
                selectable: Boolean(selectedItem),
                targeted: dragTarget === bin,
                feedback: binFeedback[bin]
              })
            },
            React.createElement(
              "span",
              { style: liveStyles.binHeader },
              binAsset
                ? React.createElement("img", {
                    alt: binAsset.altText,
                    src: binAsset.uri,
                    style: liveStyles.binAsset
                  })
                : null,
              React.createElement("strong", null, bin)
            ),
            React.createElement(
              "span",
              { style: liveStyles.binItems },
              ...items
                .filter((item) => placements[item] === bin)
                .map((item) =>
                  React.createElement("span", { key: item, style: liveStyles.placedBadge }, displayCardLabel(item))
                ),
              items.some((item) => placements[item] === bin) ? null : "Drop matching items here"
            )
          );
        })
      )
    ),
    dragState?.dragging
      ? React.createElement(
          "div",
          {
            "data-testid": "sort-drag-ghost",
            style: dragGhostStyle(dragState)
          },
          React.createElement(TokenSprite, {
            replacement: replacementForToken(dragState.item, replacements, "item"),
            token: dragState.item,
            tokenStyleCatalog
          }),
          React.createElement("span", null, dragState.item)
        )
      : null,
    complete
      ? React.createElement(CompletionPanel, {
          title: mistakes === 0 ? "Flawless sort" : "Sort complete",
          detail: `${placedCount} items sorted with ${mistakes} ${mistakes === 1 ? "miss" : "misses"}.`,
          score,
          onRestart: () => {
            setPlacements({});
            setSelectedItem(undefined);
            setFeedback(undefined);
            setMistakes(0);
            setStreak(0);
          }
        })
      : null
  );
}

function SequenceGame({
  profile,
  sequenceComponent,
  choiceComponent,
  replacements,
  tokenStyleCatalog,
  onInteraction
}: {
  profile: GameAssemblyProfile;
  sequenceComponent: ComponentBinding;
  choiceComponent: ComponentBinding;
  replacements: AssetReplacementLookup;
  tokenStyleCatalog: TokenStyleCatalog;
  onInteraction?: (interaction: LiveGameInteraction) => void;
}): React.ReactElement {
  const sequence = stringArrayProp(sequenceComponent.props, "sequence");
  const configuredRounds = stringMatrixProp(sequenceComponent.props, "rounds");
  const choices = stringArrayProp(choiceComponent.props, "items");
  const rounds = React.useMemo(() => configuredRounds, [JSON.stringify(configuredRounds)]);
  const [roundIndex, setRoundIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [attempts, setAttempts] = React.useState(0);
  const [feedback, setFeedback] = React.useState<SequenceFeedback | undefined>();
  const [phase, setPhase] = React.useState<SequencePhase>("watch");
  const [score, setScore] = React.useState(0);
  const didMountRef = React.useRef(false);
  const componentArt = resolveComponentAsset(profile, sequenceComponent, "illustration", replacements);
  const activeRound = rounds[roundIndex] ?? [];
  const complete = phase === "complete";

  React.useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    setRoundIndex(0);
    setProgress(0);
    setAttempts(0);
    setFeedback(undefined);
    setPhase("watch");
    setScore(0);
  }, [profile.id, sequence.join("|"), choices.join("|"), JSON.stringify(configuredRounds)]);

  function startRound(): void {
    if (complete || activeRound.length === 0) {
      return;
    }

    setProgress(0);
    setPhase("play");
    setFeedback({ kind: "info", message: `Round ${roundIndex + 1}: repeat the pattern.` });
  }

  function choose(item: string): void {
    if (complete || phase !== "play") {
      setFeedback({ kind: "info", message: "Watch the pattern, then start the round." });
      return;
    }

    const expected = activeRound[progress];
    const correct = item === expected;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    let nextProgress = 0;
    let nextComplete = false;
    if (correct) {
      nextProgress = progress + 1;
      const roundComplete = nextProgress === activeRound.length;
      if (roundComplete) {
        const roundScore = activeRound.length * 100 + Math.max(0, 60 - nextAttempts * 5);
        setScore((current) => current + roundScore);
        if (roundIndex + 1 >= rounds.length) {
          setPhase("complete");
          setFeedback({ kind: "success", message: "Sequence complete.", item });
          nextComplete = true;
        } else {
          setRoundIndex((current) => current + 1);
          setPhase("watch");
          setFeedback({ kind: "success", message: `Round ${roundIndex + 2} unlocked. Watch the next pattern.`, item });
        }
        setProgress(0);
      } else {
        setProgress(nextProgress);
        setFeedback({ kind: "success", message: "Correct.", item });
      }
    } else {
      setProgress(0);
      setPhase("watch");
      setFeedback({
        expected,
        item,
        kind: "failure",
        message: `Not ${item}. Try ${expected} next; watch the pattern again.`
      });
    }

    onInteraction?.({
      eventName: "tool:repeat-sequence",
      profileId: profile.id,
      payload: {
        componentId: sequenceComponent.componentId,
        itemId: item,
        expected,
        correct,
        progress: nextProgress,
        round: roundIndex + 1,
        complete: nextComplete,
        attempts: nextAttempts
      }
    });
  }

  return React.createElement(
    "section",
    { style: gameSurfaceStyle("sequence"), "aria-label": profile.profileName },
    React.createElement(
      "div",
      { style: liveStyles.gameHeader },
      React.createElement(
        "div",
        null,
        React.createElement("p", { style: liveStyles.profileName }, profile.profileName),
        React.createElement("h2", { style: liveStyles.gameTitle }, textProp(sequenceComponent.props, "title", profile.profileName)),
        React.createElement(
          "p",
          { style: liveStyles.gameMeta },
          complete ? "Sequence complete." : feedback?.message ?? textProp(sequenceComponent.props, "prompt", `${progress} of ${activeRound.length}`)
        )
      ),
      React.createElement("span", { style: liveStyles.counter }, `Round ${Math.min(roundIndex + 1, rounds.length)} / ${rounds.length}`)
    ),
    React.createElement(
      "div",
      { style: liveStyles.statRow },
      React.createElement(StatPill, { label: "Score", value: String(score), tone: "warm" }),
      React.createElement(StatPill, { label: "Input", value: `${progress}/${activeRound.length}` }),
      React.createElement(StatPill, { label: "Taps", value: String(attempts), tone: "calm" }),
      React.createElement(ProgressTrack, { value: complete ? rounds.length : roundIndex, max: rounds.length })
    ),
    React.createElement(HeroArt, {
      asset: componentArt,
      label: textProp(sequenceComponent.props, "title", profile.profileName),
      replacements,
      tokenStyleCatalog,
      tokens: activeRound
    }),
    React.createElement(
      "div",
      { "aria-label": "Sequence pattern", style: sequenceRailStyle(feedback) },
      ...activeRound.map((item, index) =>
        React.createElement(
          "span",
          {
            key: `${item}.${index}`,
            style:
              phase === "watch"
                ? sequenceStepStyle(item, true, tokenStyleCatalog)
                : index < progress
                  ? sequenceStepStyle(item, true, tokenStyleCatalog)
                  : liveStyles.sequenceStep
          },
          phase === "watch" || index < progress ? item : String(index + 1)
        )
      )
    ),
    phase === "watch"
      ? React.createElement(
          "button",
          {
            type: "button",
            onClick: startRound,
            style: liveStyles.inlineAction
          },
          roundIndex === 0 ? "Start Round" : "Continue"
        )
      : null,
    React.createElement(
      "div",
      { style: liveStyles.choiceGrid },
      ...choices.map((item) =>
        React.createElement(
          "button",
          {
            key: item,
            type: "button",
            "aria-label": item,
            "aria-invalid": feedback?.kind === "failure" && feedback.item === item ? true : undefined,
            onClick: () => choose(item),
            disabled: complete || phase !== "play",
            style: sequenceChoiceStyle(item, phase === "play", feedback, tokenStyleCatalog)
          },
          React.createElement(TokenSprite, { replacement: replacementForToken(item, replacements, "choice"), token: item, tokenStyleCatalog }),
          React.createElement("span", null, item)
        )
      )
    ),
    complete
      ? React.createElement(CompletionPanel, {
          title: "Sequence master",
          detail: `${rounds.length} rounds cleared in ${attempts} taps.`,
          score,
          onRestart: () => {
            setRoundIndex(0);
            setProgress(0);
            setAttempts(0);
            setFeedback(undefined);
            setPhase("watch");
            setScore(0);
          }
        })
      : null
  );
}

function CardBackFace(): React.ReactElement {
  return React.createElement(
    "span",
    { style: liveStyles.cardBackWrap },
    React.createElement("img", {
      alt: "",
      "aria-hidden": true,
      "data-testid": "playcraft-card-back",
      src: playcraftUiAssets.cards.playcraftBack,
      style: liveStyles.cardBackImage
    })
  );
}

function TokenSprite({
  replacement,
  token,
  tokenStyleCatalog
}: {
  replacement?: AssetReplacement;
  token: string;
  tokenStyleCatalog: TokenStyleCatalog;
}): React.ReactElement {
  if (replacement && isRenderableUri(replacement.uri)) {
    return React.createElement(
      "span",
      { style: liveStyles.tokenSpriteWrap },
      React.createElement("img", { alt: replacement.altText ?? token, src: replacement.uri, style: liveStyles.tokenSpriteImage })
    );
  }

  return React.createElement("span", { style: tokenDotStyle(token, tokenStyleCatalog) }, displayInitial(token));
}

function CardFace({
  cardId,
  pairVisual,
  replacement
}: {
  cardId: string;
  pairVisual: MemoryPairVisual;
  replacement?: AssetReplacement;
}): React.ReactElement {
  if (replacement && isRenderableUri(replacement.uri)) {
    return React.createElement(
      "span",
      { style: liveStyles.cardImageWrap },
      React.createElement("span", { style: cardPairBadgeStyle(pairVisual) }, displayCardGlyph(cardId)),
      React.createElement("img", { src: replacement.uri, alt: replacement.altText ?? cardId, style: liveStyles.cardImage }),
      React.createElement("strong", { style: liveStyles.cardLabel }, displayCardLabel(cardId))
    );
  }

  return React.createElement(
    "span",
    { style: liveStyles.generatedFace },
    React.createElement("span", { style: generatedGlyphStyle(pairVisual) }, displayCardGlyph(cardId)),
    React.createElement("strong", { style: liveStyles.cardLabel }, displayCardLabel(cardId))
  );
}

function HeroArt({
  asset,
  label,
  replacements,
  tokenStyleCatalog,
  tokens
}: {
  asset?: AssetReplacement;
  label: string;
  replacements?: AssetReplacementLookup;
  tokenStyleCatalog: TokenStyleCatalog;
  tokens: string[];
}): React.ReactElement {
  const tokenAssets = uniqueStrings(tokens)
    .map((token) => ({ token, replacement: replacementForToken(token, replacements, "choice") ?? replacementForToken(token, replacements, "item") }))
    .filter((entry): entry is { token: string; replacement: AssetReplacement } => Boolean(entry.replacement))
    .slice(0, 4);

  if (tokenAssets.length > 0) {
    return React.createElement(
      "div",
      { "aria-label": label, role: "img", style: liveStyles.heroArtwork },
      React.createElement(
        "div",
        { style: liveStyles.heroTokenCluster },
        ...tokenAssets.map(({ replacement, token }, index) =>
          React.createElement(
            "span",
            { key: `${token}.${index}`, style: heroTokenStyle(token, index, tokenStyleCatalog) },
            React.createElement("img", { alt: replacement.altText ?? token, src: replacement.uri, style: liveStyles.heroTokenImage })
          )
        )
      ),
      React.createElement("strong", { style: liveStyles.heroArtworkLabel }, label)
    );
  }

  if (asset && isRenderableUri(asset.uri)) {
    return React.createElement("img", { src: asset.uri, alt: asset.altText ?? label, style: liveStyles.heroAsset });
  }

  const visibleTokens = uniqueStrings(tokens).slice(0, 4);
  return React.createElement(
    "div",
    { "aria-label": asset?.altText ?? label, role: "img", style: liveStyles.heroArtwork },
    React.createElement(
      "div",
      { style: liveStyles.heroTokenCluster },
      ...visibleTokens.map((token, index) =>
        React.createElement(
          "span",
          { key: `${token}.${index}`, style: heroTokenStyle(token, index, tokenStyleCatalog) },
          displayInitial(token)
        )
      )
    ),
    React.createElement("strong", { style: liveStyles.heroArtworkLabel }, label)
  );
}

function StatPill({
  label,
  value,
  tone = "calm"
}: {
  label: string;
  value: string;
  tone?: "calm" | "warm" | "danger";
}): React.ReactElement {
  return React.createElement(
    "span",
    { style: tone === "warm" ? liveStyles.statPillWarm : tone === "danger" ? liveStyles.statPillDanger : liveStyles.statPill },
    React.createElement("span", { style: liveStyles.statLabel }, label),
    React.createElement("strong", null, value)
  );
}

function ProgressTrack({ value, max }: { value: number; max: number }): React.ReactElement {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return React.createElement(
    "span",
    { "aria-label": `Progress ${value} of ${max}`, style: liveStyles.progressTrack },
    React.createElement("span", { style: { ...liveStyles.progressFill, width: `${Math.round(ratio * 100)}%` } })
  );
}

function CompletionPanel({
  title,
  detail,
  score,
  onRestart
}: {
  title: string;
  detail: string;
  score: number;
  onRestart: () => void;
}): React.ReactElement {
  return React.createElement(
    "section",
    { role: "status", style: liveStyles.completionPanel },
    React.createElement("div", { style: liveStyles.completionMark }, "WIN"),
    React.createElement("div", null, React.createElement("h3", { style: liveStyles.completionTitle }, title), React.createElement("p", { style: liveStyles.completionDetail }, detail)),
    React.createElement(StatPill, { label: "Final score", value: String(score), tone: "warm" }),
    React.createElement(
      "button",
      {
        type: "button",
        onClick: onRestart,
        style: liveStyles.inlineAction
      },
      "Play Again"
    )
  );
}

function liveTemplateForProfile(profile: GameAssemblyProfile): GameProfileTemplateSnapshot {
  return profile.template;
}

function tokenStyleCatalogForSurface(liveSurface: GameTemplateLiveSurface): TokenStyleCatalog {
  return {
    defaultStyle: liveSurface.defaultTokenStyle,
    tokenStyles: liveSurface.tokenStyles
  };
}

function validateMemorySurfaceProps(
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

function validateTokenStylesForTokens(
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

function memoryStyleTokens(component: ComponentBinding): string[] {
  return Object.values(stringRecordProp(component.props, "pairs"));
}

function sortingStyleTokens(component: ComponentBinding): string[] {
  const targets = stringRecordProp(component.props, "targets");
  return [
    ...stringArrayProp(component.props, "items"),
    ...stringArrayProp(component.props, "bins"),
    ...Object.values(targets)
  ];
}

function validateSortingSurfaceProps(
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

function sequenceStyleTokens(sequenceComponent: ComponentBinding, choiceComponent: ComponentBinding): string[] {
  return [
    ...stringArrayProp(sequenceComponent.props, "sequence"),
    ...stringMatrixProp(sequenceComponent.props, "rounds").flat(),
    ...stringArrayProp(choiceComponent.props, "items")
  ];
}

function validateSequenceSurfaceProps(
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

function requiredSequenceChoiceComponent(
  profile: GameAssemblyProfile,
  liveSurface: GameTemplateLiveSurface
): ComponentBinding {
  const choiceCapability = liveSurface.componentCapabilities.choice;
  if (!choiceCapability) {
    throw new Error(`profile ${profile.id} sequence surface is missing required authored choice component capability`);
  }
  return requiredComponentByCapability(profile, choiceCapability);
}

function requiredComponentByCapability(profile: GameAssemblyProfile, capability: string): ComponentBinding {
  const component = optionalComponentByCapability(profile, capability);
  if (!component) {
    throw new Error(`profile ${profile.id} is missing required live surface component ${capability}`);
  }
  return component;
}

function optionalComponentByCapability(profile: GameAssemblyProfile, capability: string | undefined): ComponentBinding | undefined {
  if (!capability) {
    return undefined;
  }
  const matches = profile.components.filter((component) => component.renderCapability === capability);
  if (matches.length > 1) {
    throw new Error(`profile ${profile.id} has multiple live surface components for ${capability}`);
  }
  return matches[0];
}

function replacementForToken(
  token: string,
  replacements: AssetReplacementLookup | undefined,
  namespace: "choice" | "item"
): AssetReplacement | undefined {
  return replacements?.get(`${namespace}:${token}`);
}

function stringArrayProp(props: Record<string, JsonValue>, key: string): string[] {
  const value = props[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function stringMatrixProp(props: Record<string, JsonValue>, key: string): string[][] {
  const value = props[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is JsonValue[] => Array.isArray(entry))
    .map((entry) => entry.filter((item): item is string => typeof item === "string"))
    .filter((entry) => entry.length > 0);
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

function textProp(props: Record<string, JsonValue>, key: string, fallback: string): string {
  const value = props[key];
  return typeof value === "string" ? value : fallback;
}

function shuffleMemoryCards(cards: string[], cardPairs: Record<string, string>, seed: string): MemoryCard[] {
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

function createMemoryPairVisuals(cardPairs: Record<string, string>, tokenStyleCatalog: TokenStyleCatalog): Map<string, MemoryPairVisual> {
  return new Map(
    uniqueStrings(Object.values(cardPairs)).map((pairKey) => [
      pairKey,
      colorForToken(pairKey, tokenStyleCatalog)
    ])
  );
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

  const asset = assetId ? profileAssetById(profile, assetId) : undefined;
  return asset ? replacementFromAsset(asset) : undefined;
}

function profileAssetById(profile: GameAssemblyProfile, assetId: string): GeneratedAssetRecord | undefined {
  const matches = profile.assets.filter((entry) => entry.assetId === assetId);
  if (matches.length > 1) {
    throw new Error(`profile ${profile.id} has duplicate generated asset id ${assetId}`);
  }

  return matches[0];
}

function duplicateStrings(values: string[]): string[] {
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

function requireUniqueProfileAssetIds(profile: GameAssemblyProfile): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const asset of profile.assets) {
    if (seen.has(asset.assetId)) {
      duplicates.add(asset.assetId);
      continue;
    }

    seen.add(asset.assetId);
  }

  if (duplicates.size > 0) {
    throw new Error(`profile ${profile.id} has duplicate generated asset ids: ${[...duplicates].join(", ")}`);
  }
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

function memoryCardFaceStyle(visual: MemoryPairVisual): React.CSSProperties {
  return {
    background: visual.background,
    color: visual.foreground,
    borderColor: visual.border
  };
}

function generatedGlyphStyle(visual: MemoryPairVisual): React.CSSProperties {
  return {
    ...liveStyles.generatedGlyph,
    background: visual.accent,
    color: visual.foreground,
    borderColor: visual.border
  };
}

function cardPairBadgeStyle(visual: MemoryPairVisual): React.CSSProperties {
  return {
    ...liveStyles.cardPairBadge,
    background: visual.accent,
    color: visual.foreground,
    borderColor: visual.border
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
  return cardId.replace(/-/gu, " ");
}

function displayInitial(cardId: string): string {
  return displayCardLabel(cardId).charAt(0).toUpperCase();
}

function displayCardGlyph(cardId: string): string {
  const label = displayCardLabel(cardId);
  const firstLetter = label.match(/[a-z]/iu)?.[0]?.toUpperCase() ?? "?";
  const number = label.match(/\b\d+\b/u)?.[0] ?? "";
  return `${firstLetter}${number}`.slice(0, 3);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function sortItemStyle(state: { dragging: boolean; placed: boolean; selected: boolean }): React.CSSProperties {
  if (state.dragging) {
    return { ...liveStyles.itemChip, ...liveStyles.itemChipDraggingSource };
  }

  if (state.placed) {
    return liveStyles.itemChipPlaced;
  }

  if (state.selected) {
    return liveStyles.itemChipActive;
  }

  return liveStyles.itemChip;
}

function sortBinStyle(state: {
  feedback: BinFeedback | undefined;
  selectable: boolean;
  targeted: boolean;
}): React.CSSProperties {
  const base = state.selectable ? liveStyles.binActive : liveStyles.bin;
  if (state.feedback === "success") {
    return { ...base, ...liveStyles.binSuccess };
  }
  if (state.feedback === "failure") {
    return { ...base, ...liveStyles.binFailure };
  }
  if (state.targeted) {
    return { ...base, ...liveStyles.binDragTarget };
  }

  return base;
}

function dragGhostStyle(state: SortDragState): React.CSSProperties {
  return {
    ...liveStyles.dragGhost,
    left: state.x - state.offsetX,
    top: state.y - state.offsetY,
    width: state.width,
    minHeight: state.height
  };
}

function sequenceChoiceStyle(
  item: string,
  enabled: boolean,
  feedback: SequenceFeedback | undefined,
  tokenStyleCatalog: TokenStyleCatalog
): React.CSSProperties {
  const failed = feedback?.kind === "failure" && feedback.item === item;
  return {
    ...liveStyles.choiceButton,
    ...tokenPanelStyle(item, tokenStyleCatalog),
    ...(failed ? liveStyles.sequenceChoiceFailure : {}),
    opacity: enabled || failed ? 1 : 0.58,
    cursor: enabled ? "pointer" : "not-allowed"
  };
}

function sequenceRailStyle(feedback?: SequenceFeedback): React.CSSProperties {
  return feedback?.kind === "failure"
    ? { ...liveStyles.sequenceRail, ...liveStyles.sequenceRailFailure }
    : liveStyles.sequenceRail;
}

function sequenceStepStyle(item: string, revealed: boolean, tokenStyleCatalog: TokenStyleCatalog): React.CSSProperties {
  return revealed ? { ...liveStyles.sequenceStepComplete, ...tokenPanelStyle(item, tokenStyleCatalog) } : liveStyles.sequenceStep;
}

function gameSurfaceStyle(kind: GameTemplateLiveSurface["kind"]): React.CSSProperties {
  const background =
    kind === "memory"
      ? playcraftUiAssets.backgrounds.memoryMatch
      : kind === "sorting"
        ? playcraftUiAssets.backgrounds.sorting
        : playcraftUiAssets.backgrounds.sequenceRepeat;

  return {
    ...liveStyles.liveSurface,
    backgroundColor: "#f8fafc",
    backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.7)), url(${background})`,
    backgroundPosition: "center",
    backgroundSize: "cover"
  };
}

function tokenDotStyle(token: string, tokenStyleCatalog: TokenStyleCatalog): React.CSSProperties {
  const color = colorForToken(token, tokenStyleCatalog);
  return {
    ...liveStyles.tokenDot,
    background: color.background,
    color: color.foreground,
    borderColor: color.border
  };
}

function tokenPanelStyle(token: string, tokenStyleCatalog: TokenStyleCatalog): React.CSSProperties {
  const color = colorForToken(token, tokenStyleCatalog);
  return {
    background: color.background,
    color: color.foreground,
    borderColor: color.border
  };
}

function heroTokenStyle(token: string, index: number, tokenStyleCatalog: TokenStyleCatalog): React.CSSProperties {
  const color = colorForToken(token, tokenStyleCatalog);
  return {
    ...liveStyles.heroToken,
    background: color.background,
    color: color.foreground,
    borderColor: color.border,
    transform: `rotate(${[-7, 5, -3, 8][index % 4]}deg)`
  };
}

function colorForToken(
  token: string,
  tokenStyleCatalog: TokenStyleCatalog
): MemoryPairVisual {
  const matches = tokenStyleMatchesForToken(token, tokenStyleCatalog);
  if (matches.length > 1) {
    throw new Error(`live token ${token} maps to multiple token styles: ${matches.map(describeTokenStyle).join(", ")}`);
  }
  const tokenStyle = matches[0] ?? tokenStyleCatalog.defaultStyle;

  return {
    background: tokenStyle.background,
    border: tokenStyle.border,
    foreground: tokenStyle.foreground,
    accent: tokenStyle.accent
  };
}

function tokenStyleMatchesForToken(token: string, tokenStyleCatalog: TokenStyleCatalog): GameTemplateTokenStyle[] {
  const tokenParts = normalizedTokens(token);
  return tokenStyleCatalog.tokenStyles.filter((entry) =>
    entry.tokens.some((styleToken) => tokenSequenceIncludes(tokenParts, normalizedTokens(styleToken)))
  );
}

function describeTokenStyle(tokenStyle: GameTemplateTokenStyle): string {
  return tokenStyle.tokens.join("|");
}

function normalizedTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function tokenSequenceIncludes(tokens: string[], sequence: string[]): boolean {
  if (sequence.length === 0 || sequence.length > tokens.length) {
    return false;
  }

  return tokens.some((_, index) =>
    sequence.every((part, offset) => tokens[index + offset] === part)
  );
}

const liveMotionCss = `
@keyframes playcraft-drag-ghost {
  from { transform: scale(0.96) rotate(-1deg); opacity: 0.72; }
  to { transform: scale(1.03) rotate(1deg); opacity: 0.96; }
}
@keyframes playcraft-bin-target {
  from { box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.16), 0 16px 28px rgba(249, 115, 22, 0.16); }
  to { box-shadow: 0 0 0 7px rgba(249, 115, 22, 0.08), 0 18px 34px rgba(249, 115, 22, 0.22); }
}
@keyframes playcraft-bin-success {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.36); }
  48% { transform: scale(1.025); box-shadow: 0 0 0 8px rgba(22, 163, 74, 0.18); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
}
@keyframes playcraft-bin-failure {
  0%, 100% { transform: translateX(0); }
  18% { transform: translateX(-6px); }
  36% { transform: translateX(5px); }
  54% { transform: translateX(-4px); }
  72% { transform: translateX(3px); }
}
`;

const liveStyles = {
  emptyState: {
    minHeight: "24rem",
    display: "grid",
    placeItems: "center",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "#ffffff",
    padding: 0,
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(24, 24, 27, 0.12)"
  },
  emptyHeroImage: {
    display: "block",
    width: "100%",
    height: "100%",
    minHeight: "24rem",
    objectFit: "cover" as const
  },
  failureState: {
    minHeight: "24rem",
    display: "grid",
    alignContent: "center",
    gap: "0.75rem",
    border: "1px solid #b91c1c",
    borderRadius: "8px",
    background: "#fef2f2",
    color: "#7f1d1d",
    padding: "1rem",
    boxShadow: "0 20px 60px rgba(24, 24, 27, 0.12)"
  },
  failureDetail: {
    margin: 0,
    whiteSpace: "pre-wrap" as const,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "0.8rem",
    lineHeight: 1.5
  },
  liveSurface: {
    minHeight: "100%",
    boxSizing: "border-box" as const,
    display: "grid",
    alignContent: "start",
    gap: "1rem",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 48%, #ecfdf5 100%)",
    padding: "clamp(1rem, 3vw, 1.5rem)",
    boxShadow: "0 20px 60px rgba(24, 24, 27, 0.12)",
    overflow: "hidden"
  },
  gameHeader: {
    display: "flex",
    flexWrap: "wrap" as const,
    justifyContent: "space-between",
    gap: "1rem",
    alignItems: "start",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.78)",
    padding: "1rem",
    boxShadow: "0 12px 30px rgba(24, 24, 27, 0.08)"
  },
  gameTitle: {
    margin: 0,
    fontSize: "1.7rem"
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
  statRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
    gap: "0.65rem",
    alignItems: "stretch"
  },
  statPill: {
    display: "grid",
    gap: "0.15rem",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.86)",
    color: "#18181b",
    padding: "0.65rem 0.75rem",
    boxShadow: "0 10px 22px rgba(24, 24, 27, 0.07)"
  },
  statPillWarm: {
    display: "grid",
    gap: "0.15rem",
    border: "1px solid #f97316",
    borderRadius: "8px",
    background: "#fff7ed",
    color: "#7c2d12",
    padding: "0.65rem 0.75rem",
    boxShadow: "0 10px 22px rgba(249, 115, 22, 0.14)"
  },
  statPillDanger: {
    display: "grid",
    gap: "0.15rem",
    border: "1px solid #ef4444",
    borderRadius: "8px",
    background: "#fef2f2",
    color: "#7f1d1d",
    padding: "0.65rem 0.75rem",
    boxShadow: "0 10px 22px rgba(239, 68, 68, 0.12)"
  },
  statLabel: {
    color: "#52525b",
    fontSize: "0.75rem",
    fontWeight: 800,
    textTransform: "uppercase" as const
  },
  progressTrack: {
    alignSelf: "center",
    display: "block",
    minHeight: "0.8rem",
    borderRadius: "999px",
    background: "rgba(15, 23, 42, 0.12)",
    overflow: "hidden",
    gridColumn: "1 / -1"
  },
  progressFill: {
    display: "block",
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #0f766e, #f97316)"
  },
  memoryBoard: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
    gap: "0.75rem"
  },
  memoryCard: {
    width: "100%",
    aspectRatio: "1",
    border: "2px solid #cbd5e1",
    borderRadius: "8px",
    padding: "0.75rem",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    boxShadow: "0 14px 30px rgba(24, 24, 27, 0.12)",
    transition: "transform 160ms ease, border-color 160ms ease, background 160ms ease",
    cursor: "pointer"
  },
  memoryCardHidden: {
    background: "linear-gradient(145deg, #111827, #334155)",
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
  cardBackWrap: {
    display: "grid",
    placeItems: "center",
    width: "100%",
    height: "100%"
  },
  cardBackImage: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "contain" as const
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
    border: "2px solid #cbd5e1",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.76)",
    fontSize: "2rem",
    fontWeight: 900
  },
  cardPairBadge: {
    display: "inline-grid",
    placeItems: "center",
    minWidth: "2rem",
    height: "2rem",
    boxSizing: "border-box" as const,
    border: "2px solid #cbd5e1",
    borderRadius: "8px",
    padding: "0 0.35rem",
    fontSize: "0.9rem",
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
    objectFit: "contain" as const,
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
    fontWeight: 800,
    boxShadow: "0 12px 24px rgba(15, 118, 110, 0.22)",
    cursor: "pointer"
  },
  heroAsset: {
    width: "min(14rem, 100%)",
    aspectRatio: "1",
    objectFit: "cover" as const,
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    background: "#f4f4f5"
  },
  heroArtwork: {
    minHeight: "10rem",
    display: "grid",
    gridTemplateColumns: "minmax(8rem, 12rem) minmax(0, 1fr)",
    gap: "1rem",
    alignItems: "center",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.72)",
    padding: "1rem",
    boxShadow: "0 14px 34px rgba(24, 24, 27, 0.1)"
  },
  heroTokenCluster: {
    minHeight: "8rem",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.55rem"
  },
  heroToken: {
    minHeight: "3.5rem",
    display: "grid",
    placeItems: "center",
    border: "2px solid",
    borderRadius: "8px",
    fontSize: "1.6rem",
    fontWeight: 900,
    overflow: "hidden",
    boxShadow: "0 12px 22px rgba(24, 24, 27, 0.14)"
  },
  heroTokenImage: {
    display: "block",
    width: "100%",
    height: "5rem",
    objectFit: "contain" as const
  },
  heroArtworkLabel: {
    fontSize: "1.15rem",
    overflowWrap: "anywhere" as const
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
    background: "rgba(255, 255, 255, 0.86)",
    color: "#18181b",
    fontWeight: 700,
    padding: "0.6rem",
    display: "grid",
    gridTemplateColumns: "2rem minmax(0, 1fr)",
    alignItems: "center",
    gap: "0.55rem",
    textAlign: "left" as const,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(24, 24, 27, 0.07)",
    touchAction: "none"
  },
  itemChipActive: {
    minHeight: "3rem",
    borderRadius: "8px",
    border: "2px solid #d97706",
    background: "#fff7ed",
    color: "#92400e",
    fontWeight: 700,
    padding: "0.55rem",
    display: "grid",
    gridTemplateColumns: "2rem minmax(0, 1fr)",
    alignItems: "center",
    gap: "0.55rem",
    textAlign: "left" as const,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(217, 119, 6, 0.16)",
    touchAction: "none"
  },
  itemChipPlaced: {
    minHeight: "3rem",
    borderRadius: "8px",
    border: "1px solid #0f766e",
    background: "#ecfdf5",
    color: "#064e3b",
    fontWeight: 700,
    padding: "0.6rem",
    opacity: 0.72,
    display: "grid",
    gridTemplateColumns: "2rem minmax(0, 1fr)",
    alignItems: "center",
    gap: "0.55rem",
    textAlign: "left" as const
  },
  itemChipDraggingSource: {
    opacity: 0.28,
    transform: "scale(0.98)",
    boxShadow: "none"
  },
  dragGhost: {
    position: "fixed" as const,
    zIndex: 50,
    pointerEvents: "none" as const,
    border: "2px solid #d97706",
    borderRadius: "8px",
    background: "#fff7ed",
    color: "#92400e",
    fontWeight: 800,
    padding: "0.55rem",
    display: "grid",
    gridTemplateColumns: "2rem minmax(0, 1fr)",
    alignItems: "center",
    gap: "0.55rem",
    textAlign: "left" as const,
    boxShadow: "0 22px 40px rgba(24, 24, 27, 0.24)",
    animation: "playcraft-drag-ghost 180ms ease-out forwards"
  },
  tokenDot: {
    width: "1.65rem",
    height: "1.65rem",
    border: "1px solid",
    borderRadius: "8px",
    display: "grid",
    placeItems: "center",
    fontSize: "0.86rem",
    fontWeight: 900
  },
  tokenSpriteWrap: {
    display: "grid",
    placeItems: "center",
    width: "2rem",
    height: "2rem",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.74)",
    overflow: "hidden"
  },
  tokenSpriteImage: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "contain" as const
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
    textAlign: "left" as const,
    boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.48)"
  },
  binActive: {
    minHeight: "10rem",
    display: "grid",
    alignContent: "start",
    gap: "0.75rem",
    borderRadius: "8px",
    border: "2px solid #d97706",
    background: "#fff7ed",
    color: "#92400e",
    padding: "1rem",
    textAlign: "left" as const,
    boxShadow: "0 14px 26px rgba(217, 119, 6, 0.14)"
  },
  binDragTarget: {
    border: "3px solid #f97316",
    background: "#ffedd5",
    color: "#7c2d12",
    transform: "translateY(-2px)",
    animation: "playcraft-bin-target 560ms ease-in-out infinite alternate"
  },
  binSuccess: {
    border: "3px solid #16a34a",
    background: "#dcfce7",
    color: "#14532d",
    animation: "playcraft-bin-success 560ms ease-out"
  },
  binFailure: {
    border: "3px solid #ef4444",
    background: "#fef2f2",
    color: "#7f1d1d",
    animation: "playcraft-bin-failure 420ms ease-in-out"
  },
  binItems: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.35rem",
    color: "#18181b",
    overflowWrap: "anywhere" as const
  },
  binHeader: {
    display: "grid",
    gridTemplateColumns: "minmax(3rem, 5.25rem) minmax(0, 1fr)",
    gap: "0.75rem",
    alignItems: "center"
  },
  binAsset: {
    display: "block",
    width: "100%",
    aspectRatio: "1",
    objectFit: "contain" as const,
    filter: "drop-shadow(0 10px 12px rgba(24, 24, 27, 0.14))"
  },
  placedBadge: {
    border: "1px solid #0f766e",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#064e3b",
    padding: "0.25rem 0.5rem",
    fontWeight: 700
  },
  sequenceRail: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 6rem), 1fr))",
    gap: "0.5rem",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: "8px",
    padding: "0.35rem",
    transition: "border-color 160ms ease, background 160ms ease, box-shadow 160ms ease"
  },
  sequenceRailFailure: {
    borderColor: "#ef4444",
    background: "#fef2f2",
    boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.16), 0 16px 28px rgba(239, 68, 68, 0.14)",
    animation: "playcraft-bin-failure 420ms ease-in-out"
  },
  sequenceStep: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#d4d4d8",
    borderRadius: "8px",
    background: "#fafafa",
    color: "#52525b",
    padding: "0.6rem 0.8rem",
    fontWeight: 800,
    textAlign: "center" as const
  },
  sequenceStepComplete: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#0f766e",
    borderRadius: "8px",
    background: "#ecfdf5",
    color: "#064e3b",
    padding: "0.6rem 0.8rem",
    fontWeight: 800,
    textAlign: "center" as const,
    boxShadow: "0 10px 22px rgba(24, 24, 27, 0.08)"
  },
  choiceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
    gap: "0.75rem"
  },
  choiceButton: {
    minHeight: "4rem",
    borderRadius: "8px",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "#d97706",
    background: "#fff7ed",
    color: "#92400e",
    fontWeight: 800,
    padding: "0.75rem",
    display: "grid",
    gridTemplateColumns: "2rem minmax(0, 1fr)",
    alignItems: "center",
    gap: "0.55rem",
    textAlign: "left" as const,
    boxShadow: "0 14px 30px rgba(24, 24, 27, 0.1)"
  },
  sequenceChoiceFailure: {
    borderColor: "#ef4444",
    background: "#fef2f2",
    color: "#7f1d1d",
    boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.18), 0 16px 28px rgba(239, 68, 68, 0.18)",
    animation: "playcraft-bin-failure 420ms ease-in-out"
  },
  completionPanel: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 9rem), 1fr))",
    gap: "0.85rem",
    alignItems: "center",
    border: "1px solid #0f766e",
    borderRadius: "8px",
    background: "rgba(236, 253, 245, 0.92)",
    color: "#064e3b",
    padding: "1rem",
    boxShadow: "0 16px 34px rgba(15, 118, 110, 0.16)"
  },
  completionMark: {
    width: "3.25rem",
    height: "3.25rem",
    display: "grid",
    placeItems: "center",
    borderRadius: "8px",
    background: "#0f766e",
    color: "#ffffff",
    fontWeight: 900,
    fontSize: "0.9rem"
  },
  completionTitle: {
    margin: 0,
    fontSize: "1.1rem"
  },
  completionDetail: {
    margin: "0.2rem 0 0",
    color: "#134e4a"
  }
} satisfies Record<string, React.CSSProperties>;
