import React from "react";
import type { ComponentBinding, GameAssemblyProfile, GeneratedAssetRecord, JsonValue } from "@playcraft/contracts";
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

type SequencePhase = "watch" | "play" | "complete";
type BinFeedback = "success" | "failure";

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
    { "aria-label": "Live app preview placeholder", style: liveStyles.emptyState },
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
      { style: liveStyles.statRow },
      React.createElement(StatPill, { label: "Pairs", value: `${matched.size}/${pairs.size}` }),
      React.createElement(StatPill, { label: "Score", value: String(score), tone: "warm" }),
      React.createElement(ProgressTrack, { value: matched.size, max: pairs.size })
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

  React.useEffect(() => {
    setSelectedItem(undefined);
    setPlacements({});
    setFeedback(undefined);
    setMistakes(0);
    setStreak(0);
    setDragState(undefined);
    dragStateRef.current = undefined;
    setDragTarget(undefined);
    setBinFeedback({});
  }, [profile.id, items.join("|"), bins.join("|")]);

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
    const correct = matchesBin(item, targetId);
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
    { style: liveStyles.liveSurface, "aria-label": profile.profileName },
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
      tokens: items
    }),
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
            React.createElement("span", { style: tokenDotStyle(item) }, displayInitial(item)),
            React.createElement("span", null, item)
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
            React.createElement("strong", null, bin),
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
          )
        )
      )
    ),
    dragState?.dragging
      ? React.createElement(
          "div",
          {
            "data-testid": "sort-drag-ghost",
            style: dragGhostStyle(dragState)
          },
          React.createElement("span", { style: tokenDotStyle(dragState.item) }, displayInitial(dragState.item)),
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
  const rounds = React.useMemo(() => sequenceRounds(sequence, choices), [sequence.join("|"), choices.join("|")]);
  const [roundIndex, setRoundIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [attempts, setAttempts] = React.useState(0);
  const [feedback, setFeedback] = React.useState<string | undefined>();
  const [phase, setPhase] = React.useState<SequencePhase>("watch");
  const [score, setScore] = React.useState(0);
  const componentArt = resolveComponentAsset(profile, sequenceComponent, "illustration", replacements);
  const activeRound = rounds[roundIndex] ?? [];
  const complete = phase === "complete";

  React.useEffect(() => {
    setRoundIndex(0);
    setProgress(0);
    setAttempts(0);
    setFeedback(undefined);
    setPhase("watch");
    setScore(0);
  }, [profile.id, sequence.join("|"), choices.join("|")]);

  function startRound(): void {
    if (complete || activeRound.length === 0) {
      return;
    }

    setProgress(0);
    setPhase("play");
    setFeedback(`Round ${roundIndex + 1}: repeat the pattern.`);
  }

  function choose(item: string): void {
    if (complete || phase !== "play") {
      setFeedback("Watch the pattern, then start the round.");
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
          setFeedback("Sequence complete.");
          nextComplete = true;
        } else {
          setRoundIndex((current) => current + 1);
          setPhase("watch");
          setFeedback(`Round ${roundIndex + 2} unlocked. Watch the next pattern.`);
        }
        setProgress(0);
      } else {
        setProgress(nextProgress);
        setFeedback("Correct.");
      }
    } else {
      setProgress(0);
      setPhase("watch");
      setFeedback(`Start again after ${item}. Watch the pattern.`);
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
    { style: liveStyles.liveSurface, "aria-label": profile.profileName },
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
          complete ? "Sequence complete." : feedback ?? textProp(sequenceComponent.props, "prompt", `${progress} of ${activeRound.length}`)
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
      tokens: activeRound
    }),
    React.createElement(
      "div",
      { style: liveStyles.sequenceRail },
      ...activeRound.map((item, index) =>
        React.createElement(
          "span",
          {
            key: `${item}.${index}`,
            style:
              phase === "watch"
                ? sequenceStepStyle(item, true)
                : index < progress
                  ? sequenceStepStyle(item, true)
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
            onClick: () => choose(item),
            disabled: complete || phase !== "play",
            style: sequenceChoiceStyle(item, phase === "play")
          },
          React.createElement("span", { style: tokenDotStyle(item) }, displayInitial(item)),
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

function HeroArt({
  asset,
  label,
  tokens
}: {
  asset?: AssetReplacement;
  label: string;
  tokens: string[];
}): React.ReactElement {
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
          { key: `${token}.${index}`, style: heroTokenStyle(token, index) },
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

function matchesBin(item: string, bin: string): boolean {
  return item.toLowerCase().includes(bin.toLowerCase());
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

function sequenceRounds(sequence: string[], choices: string[]): string[][] {
  const base = sequence.length > 0 ? sequence : choices.slice(0, 3);
  const fallback = base[0] ?? "green";
  const third = choices.find((choice) => !base.includes(choice)) ?? base.at(-1) ?? fallback;
  const second = base[1] ?? third;

  return [
    base,
    [...base, third],
    [second, base[0] ?? fallback, third, base[2] ?? second, second]
  ].filter((round) => round.length > 0);
}

function sequenceChoiceStyle(item: string, enabled: boolean): React.CSSProperties {
  return {
    ...liveStyles.choiceButton,
    ...tokenPanelStyle(item),
    opacity: enabled ? 1 : 0.58,
    cursor: enabled ? "pointer" : "not-allowed"
  };
}

function sequenceStepStyle(item: string, revealed: boolean): React.CSSProperties {
  return revealed ? { ...liveStyles.sequenceStepComplete, ...tokenPanelStyle(item) } : liveStyles.sequenceStep;
}

function tokenDotStyle(token: string): React.CSSProperties {
  const color = colorForToken(token);
  return {
    ...liveStyles.tokenDot,
    background: color.background,
    color: color.foreground,
    borderColor: color.border
  };
}

function tokenPanelStyle(token: string): React.CSSProperties {
  const color = colorForToken(token);
  return {
    background: color.background,
    color: color.foreground,
    borderColor: color.border
  };
}

function heroTokenStyle(token: string, index: number): React.CSSProperties {
  const color = colorForToken(token);
  return {
    ...liveStyles.heroToken,
    background: color.background,
    color: color.foreground,
    borderColor: color.border,
    transform: `rotate(${[-7, 5, -3, 8][index % 4]}deg)`
  };
}

function colorForToken(token: string): { background: string; border: string; foreground: string } {
  const normalized = token.toLowerCase();
  if (normalized.includes("red")) {
    return { background: "#fee2e2", border: "#ef4444", foreground: "#7f1d1d" };
  }
  if (normalized.includes("blue")) {
    return { background: "#dbeafe", border: "#2563eb", foreground: "#1e3a8a" };
  }
  if (normalized.includes("green")) {
    return { background: "#dcfce7", border: "#16a34a", foreground: "#14532d" };
  }
  if (normalized.includes("yellow")) {
    return { background: "#fef3c7", border: "#eab308", foreground: "#713f12" };
  }

  const palette = [
    { background: "#fce7f3", border: "#db2777", foreground: "#831843" },
    { background: "#ede9fe", border: "#7c3aed", foreground: "#4c1d95" },
    { background: "#ffedd5", border: "#f97316", foreground: "#7c2d12" },
    { background: "#ccfbf1", border: "#0d9488", foreground: "#134e4a" }
  ];
  return palette[hashString(token) % palette.length];
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
    boxShadow: "0 12px 22px rgba(24, 24, 27, 0.14)"
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
    gap: "0.5rem"
  },
  sequenceStep: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    background: "#fafafa",
    color: "#52525b",
    padding: "0.6rem 0.8rem",
    fontWeight: 800,
    textAlign: "center" as const
  },
  sequenceStepComplete: {
    border: "1px solid",
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
    border: "2px solid #d97706",
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
