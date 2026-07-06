import React from "react";
import type { ComponentBinding, GameAssemblyProfile } from "@playcraft/contracts";
import { sortingBinAssetFor } from "../asset-library.js";
import type { AssetReplacementLookup, SortDragState, TokenStyleCatalog, LiveGameInteraction } from "./helpers.js";
import type { AudioCue } from "./audio-cue.js";
import { audioCueForEvent } from "./audio-cue.js";
import {
  pointInRect,
  replacementForToken,
  stringArrayProp,
  stringRecordProp,
  resolveComponentAsset,
  textProp,
  displayCardLabel
} from "./helpers.js";
import { liveStyles, dragGhostStyle, gameSurfaceStyle, sortBinStyle, sortItemStyle } from "./styles.js";
import { CompletionPanel, HeroArt, ProgressTrack, StatPill, TokenSprite } from "./shared-ui.js";

export function SortingGame({
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
  const [binFeedback, setBinFeedback] = React.useState<Record<string, "success" | "failure" | undefined>>({});
  const [shakingItem, setShakingItem] = React.useState<string | undefined>();
  const binRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const dragStateRef = React.useRef<SortDragState | undefined>(undefined);
  const feedbackTimers = React.useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const suppressNextClick = React.useRef(false);
  const itemPointerRef = React.useRef<{ startX: number; startY: number; startTime: number; pointerId: number | null; item: string } | null>(null);
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
    setShakingItem(undefined);
  }, [profile.id, items.join("|"), bins.join("|"), JSON.stringify(targets)]);

  React.useEffect(() => {
    if (complete) {
      emitCue("complete");
    }
  }, [complete]);

  React.useEffect(
    () => () => {
      for (const timer of feedbackTimers.current) {
        clearTimeout(timer);
      }
    },
    []
  );

  function emitCue(kind: "success" | "error" | "reveal" | "complete"): void {
    onAudioCue?.(audioCueForEvent(kind));
  }

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
      emitCue("success");
    } else {
      setFeedback(`${item} does not belong in ${targetId}.`);
      setMistakes((current) => current + 1);
      setStreak(0);
      emitCue("error");
      if (clearOnFailure) {
        setShakingItem(item);
        const timer = setTimeout(() => {
          setShakingItem(undefined);
          setSelectedItem(undefined);
        }, 1000);
        feedbackTimers.current.push(timer);
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

  function flashBin(bin: string, state: "success" | "failure"): void {
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
    itemPointerRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startTime: Date.now(),
      pointerId: event.pointerId,
      item
    };
    beginItemDrag(item, event.pointerId, event.clientX, event.clientY, rect);
  }

  function handleItemPointerMove(event: React.PointerEvent<HTMLButtonElement>): void {
    moveItemDrag(event.pointerId, event.clientX, event.clientY, () => event.preventDefault());
  }

  function finishItemPointer(event: React.PointerEvent<HTMLButtonElement>): void {
    const pointer = itemPointerRef.current;
    if (pointer && pointer.pointerId === event.pointerId) {
      const dx = event.clientX - pointer.startX;
      const dy = event.clientY - pointer.startY;
      const distance = Math.hypot(dx, dy);
      const duration = Date.now() - pointer.startTime;

      if (distance <= 10 && duration <= 200 && !dragStateRef.current?.dragging) {
        suppressNextClick.current = true;
        const item = pointer.item;
        setSelectedItem((current) => current === item ? undefined : item);
      }
    }

    itemPointerRef.current = null;
    finishItemDrag(event.pointerId, event.clientX, event.clientY, () => event.preventDefault());
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function handleItemKeyDown(item: string, event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setSelectedItem((current) => current === item ? undefined : item);
    }
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
    progressText ? React.createElement("p", { className: "live-game-progress", "aria-live": "polite", "aria-atomic": "true" }, progressText) : null,
    React.createElement(
      "div",
      { style: liveStyles.gameHeader },
      React.createElement(
        "div",
        null,
        React.createElement("p", { style: liveStyles.profileName }, profile.profileName),
        React.createElement("h2", { style: liveStyles.gameTitle }, textProp(component.props, "title", profile.profileName)),
        React.createElement("p", { style: liveStyles.gameMeta, "aria-live": "polite", "aria-atomic": "true" }, complete ? "All items sorted" : feedback ?? "Pick an item, then choose a matching bin.")
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
              className: "sort-item",
              "aria-label": item,
              "aria-pressed": selectedItem === item ? "true" : "false",
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
              onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => handleItemKeyDown(item, event),
              disabled: placements[item] !== undefined,
              style: sortItemStyle({
                placed: placements[item] !== undefined,
                selected: selectedItem === item,
                dragging: dragState?.item === item && dragState.dragging,
                shaking: shakingItem === item
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
              className: "sort-bin",
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
