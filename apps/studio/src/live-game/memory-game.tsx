import React from "react";
import type { ComponentBinding, GameAssemblyProfile } from "@playcraft/contracts";
import type { AssetReplacementLookup, MemoryCard, TokenStyleCatalog, LiveGameInteraction } from "./helpers.js";
import type { AudioCue } from "./audio-cue.js";
import { audioCueForEvent } from "./audio-cue.js";
import {
  createMemoryPairVisuals,
  memoryCardForDeckId,
  memoryCardFaceStyle,
  shuffleMemoryCards,
  stringArrayProp,
  stringRecordProp,
  colorForToken,
  resolveComponentAsset,
  textProp
} from "./helpers.js";
import { liveStyles, gameSurfaceStyle } from "./styles.js";
import { CardBackFace, CardFace, CompletionPanel, ProgressTrack, StatPill } from "./shared-ui.js";

export function MemoryGame({
  profile,
  component,
  replacements,
  tokenStyleCatalog,
  onInteraction,
  progressText,
  isLoading,
  onAudioCue
}: {
  profile: GameAssemblyProfile;
  component: ComponentBinding;
  replacements: AssetReplacementLookup;
  tokenStyleCatalog: TokenStyleCatalog;
  onInteraction?: (interaction: LiveGameInteraction) => void;
  progressText?: string;
  isLoading?: boolean;
  onAudioCue?: (cue: AudioCue) => void;
}): React.ReactElement {
  if (isLoading) {
    return React.createElement("div", { className: "loading-placeholder" }, "Loading...");
  }

  const sourceCards = stringArrayProp(component.props, "cards");
  const cardPairs = stringRecordProp(component.props, "pairs");
  const deck = React.useMemo(() => shuffleMemoryCards(sourceCards, cardPairs, profile.id), [sourceCards.join("|"), JSON.stringify(cardPairs), profile.id]);
  const pairVisuals = React.useMemo(() => createMemoryPairVisuals(cardPairs, tokenStyleCatalog), [JSON.stringify(cardPairs), JSON.stringify(tokenStyleCatalog)]);
  const [revealed, setRevealed] = React.useState<string[]>([]);
  const [matched, setMatched] = React.useState<Set<string>>(() => new Set());
  const [moves, setMoves] = React.useState(0);
  const [feedbackText, setFeedbackText] = React.useState("");
  const didMountRef = React.useRef(false);
  const roundKey = `${profile.id}:${sourceCards.join("|")}:${JSON.stringify(cardPairs)}`;
  const mismatchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerRef = React.useRef<{ startX: number; startY: number; startTime: number; pointerId: number | null } | null>(null);
  const suppressNextClick = React.useRef(false);

  React.useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    setRevealed([]);
    setMatched(new Set());
    setMoves(0);
    setFeedbackText("");
  }, [roundKey]);

  React.useEffect(() => {
    return () => {
      if (mismatchTimerRef.current) {
        clearTimeout(mismatchTimerRef.current);
      }
    };
  }, []);

  const pairs = new Set(deck.map((card) => card.pairKey));
  const complete = pairs.size > 0 && matched.size === pairs.size;
  const componentArt = resolveComponentAsset(profile, component, "illustration", replacements);
  const score = Math.max(0, matched.size * 150 - moves * 5);

  function emitCue(kind: "success" | "error" | "reveal" | "complete"): void {
    onAudioCue?.(audioCueForEvent(kind));
  }

  React.useEffect(() => {
    if (complete) {
      emitCue("complete");
    }
  }, [complete]);

  function handleCard(card: MemoryCard): void {
    if (matched.has(card.pairKey) || revealed.includes(card.id)) {
      return;
    }

    const active = revealed.length >= 2 ? [] : revealed;
    const next = [...active, card.id];
    let matchedNow = false;

    if (next.length === 2) {
      const first = memoryCardForDeckId(deck, next[0]!);
      matchedNow = first.pairKey === card.pairKey;
      if (matchedNow) {
        setMoves((current) => current + 1);
        setMatched((current) => new Set([...current, card.pairKey]));
        setRevealed([]);
        emitCue("success");
        setFeedbackText("Memory match found");
      } else {
        emitCue("error");
        setRevealed(next);
        setFeedbackText("Try again");
        mismatchTimerRef.current = setTimeout(() => {
          setRevealed([]);
          mismatchTimerRef.current = null;
        }, 1500);
      }
    } else {
      setRevealed(next);
      emitCue("reveal");
      setFeedbackText(`Revealed ${card.id}`);
    }

    onInteraction?.({
      eventName: "tool:reveal-card",
      profileId: profile.id,
      payload: {
        componentId: component.componentId,
        cardId: card.id,
        pairKey: card.pairKey,
        matched: matchedNow,
        moveCount: matchedNow ? moves + 1 : moves
      }
    });
  }

  function handleCardPointerDown(card: MemoryCard, event: React.PointerEvent<HTMLButtonElement>): void {
    if (matched.has(card.pairKey) || revealed.includes(card.id)) {
      return;
    }

    pointerRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startTime: Date.now(),
      pointerId: event.pointerId
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleCardPointerUp(card: MemoryCard, event: React.PointerEvent<HTMLButtonElement>): void {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    const distance = Math.hypot(dx, dy);
    const duration = Date.now() - pointer.startTime;

    pointerRef.current = null;

    if (distance <= 10 && duration <= 200) {
      suppressNextClick.current = true;
      handleCard(card);
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function handleCardKeyDown(card: MemoryCard, event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      handleCard(card);
    }
  }

  return React.createElement(
    "section",
    { style: gameSurfaceStyle("memory"), "aria-label": profile.profileName },
    progressText ? React.createElement("p", { className: "live-game-progress", "aria-live": "polite", "aria-atomic": "true" }, progressText) : null,
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
            className: "memory-card",
            "aria-label": card.id,
            onClick: () => {
              if (suppressNextClick.current) {
                suppressNextClick.current = false;
                return;
              }

              handleCard(card);
            },
            onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => handleCardPointerDown(card, event),
            onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => handleCardPointerUp(card, event),
            onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => handleCardKeyDown(card, event),
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
    React.createElement("div", { style: liveStyles.srOnly, "aria-live": "polite", "aria-atomic": "true" }, feedbackText),
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
