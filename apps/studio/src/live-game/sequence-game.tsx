import React from "react";
import type { ComponentBinding, GameAssemblyProfile } from "@playcraft/contracts";
import type { AssetReplacementLookup, SequenceFeedback, SequencePhase, TokenStyleCatalog, LiveGameInteraction } from "./helpers.js";
import type { AudioCue } from "./audio-cue.js";
import { audioCueForEvent } from "./audio-cue.js";
import {
  stringArrayProp,
  stringMatrixProp,
  replacementForToken,
  resolveComponentAsset,
  textProp
} from "./helpers.js";
import { liveStyles, gameSurfaceStyle, sequenceChoiceStyle, sequenceRailStyle, sequenceStepStyle } from "./styles.js";
import { CompletionPanel, HeroArt, ProgressTrack, StatPill, TokenSprite } from "./shared-ui.js";

export function SequenceGame({
  profile,
  sequenceComponent,
  choiceComponent,
  replacements,
  tokenStyleCatalog,
  onInteraction,
  progressText,
  isLoading,
  onAudioCue
}: {
  profile: GameAssemblyProfile;
  sequenceComponent: ComponentBinding;
  choiceComponent: ComponentBinding;
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
  const choicePointerRef = React.useRef<{ startX: number; startY: number; startTime: number; pointerId: number | null } | null>(null);
  const suppressNextClick = React.useRef(false);

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

  function emitCue(kind: "success" | "error" | "reveal" | "complete"): void {
    onAudioCue?.(audioCueForEvent(kind));
  }

  React.useEffect(() => {
    if (phase === "watch" && activeRound.length > 0) {
      emitCue("reveal");
    }
  }, [phase, activeRound.length]);

  React.useEffect(() => {
    if (complete) {
      emitCue("complete");
    }
  }, [complete]);

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

    let nextProgress = progress;
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
        emitCue("success");
      } else {
        setProgress(nextProgress);
        setFeedback({ kind: "success", message: "Correct.", item });
        emitCue("success");
      }
    } else {
      setFeedback({
        expected,
        item,
        kind: "failure",
        message: `Not ${item}. Try ${expected} next.`
      });
      emitCue("error");
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

  function handleChoicePointerDown(_item: string, event: React.PointerEvent<HTMLButtonElement>): void {
    if (complete || phase !== "play") {
      return;
    }

    choicePointerRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startTime: Date.now(),
      pointerId: event.pointerId
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleChoicePointerUp(item: string, event: React.PointerEvent<HTMLButtonElement>): void {
    const pointer = choicePointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    const distance = Math.hypot(dx, dy);
    const duration = Date.now() - pointer.startTime;

    choicePointerRef.current = null;

    if (distance <= 10 && duration <= 200) {
      suppressNextClick.current = true;
      choose(item);
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function handleChoiceKeyDown(item: string, event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      choose(item);
    }
  }

  function handleStartRoundKeyDown(event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      startRound();
    }
  }

  return React.createElement(
    "section",
    { style: gameSurfaceStyle("sequence"), "aria-label": profile.profileName },
    progressText ? React.createElement("p", { className: "live-game-progress", "aria-live": "polite", "aria-atomic": "true" }, progressText) : null,
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
          { style: liveStyles.gameMeta, "aria-live": "polite", "aria-atomic": "true" },
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
            className: "inline-action",
            onClick: () => {
              if (suppressNextClick.current) {
                suppressNextClick.current = false;
                return;
              }

              startRound();
            },
            onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
              const pointer = { startX: event.clientX, startY: event.clientY, startTime: Date.now(), pointerId: event.pointerId };
              choicePointerRef.current = pointer as { startX: number; startY: number; startTime: number; pointerId: number | null };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            },
            onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
              const pointer = choicePointerRef.current;
              if (pointer && pointer.pointerId === event.pointerId) {
                const dx = event.clientX - pointer.startX;
                const dy = event.clientY - pointer.startY;
                const distance = Math.hypot(dx, dy);
                const duration = Date.now() - pointer.startTime;
                if (distance <= 10 && duration <= 200) {
                  suppressNextClick.current = true;
                  startRound();
                }
              }
              choicePointerRef.current = null;
              event.currentTarget.releasePointerCapture?.(event.pointerId);
            },
            onKeyDown: handleStartRoundKeyDown,
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
            className: "sequence-choice",
            "aria-label": item,
            "aria-invalid": feedback?.kind === "failure" && feedback.item === item ? true : undefined,
            onClick: () => {
              if (suppressNextClick.current) {
                suppressNextClick.current = false;
                return;
              }

              choose(item);
            },
            onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => handleChoicePointerDown(item, event),
            onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => handleChoicePointerUp(item, event),
            onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => handleChoiceKeyDown(item, event),
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
