import type { MemoryPairVisual, SortDragState, TokenStyleCatalog } from "./helpers.js";
import { liveStyles } from "./styles-base.js";
import { tokenPanelStyle } from "./styles-theme.js";

export function memoryCardFaceStyle(visual: MemoryPairVisual): React.CSSProperties {
  return {
    background: visual.background,
    color: visual.foreground,
    borderColor: visual.border
  };
}

export function generatedGlyphStyle(visual: MemoryPairVisual): React.CSSProperties {
  return {
    ...liveStyles.generatedGlyph,
    background: visual.accent,
    color: visual.foreground,
    borderColor: visual.border
  };
}

export function cardPairBadgeStyle(visual: MemoryPairVisual): React.CSSProperties {
  return {
    ...liveStyles.cardPairBadge,
    background: visual.accent,
    color: visual.foreground,
    borderColor: visual.border
  };
}

export function sortItemStyle(state: { dragging: boolean; placed: boolean; selected: boolean; shaking: boolean }): React.CSSProperties {
  if (state.dragging) {
    return { ...liveStyles.itemChip, ...liveStyles.itemChipDraggingSource };
  }

  if (state.placed) {
    return liveStyles.itemChipPlaced;
  }

  if (state.shaking) {
    return { ...liveStyles.itemChip, ...liveStyles.itemChipShake };
  }

  if (state.selected) {
    return liveStyles.itemChipActive;
  }

  return liveStyles.itemChip;
}

export function sortBinStyle(state: {
  feedback: "success" | "failure" | undefined;
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

export function dragGhostStyle(state: SortDragState): React.CSSProperties {
  return {
    ...liveStyles.dragGhost,
    left: state.x - state.offsetX,
    top: state.y - state.offsetY,
    width: state.width,
    minHeight: state.height
  };
}

export function sequenceChoiceStyle(
  item: string,
  enabled: boolean,
  feedback: { kind: string; item?: string } | undefined,
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

export function sequenceRailStyle(feedback?: { kind: string }): React.CSSProperties {
  return feedback?.kind === "failure"
    ? { ...liveStyles.sequenceRail, ...liveStyles.sequenceRailFailure }
    : liveStyles.sequenceRail;
}

export function sequenceStepStyle(item: string, revealed: boolean, tokenStyleCatalog: TokenStyleCatalog): React.CSSProperties {
  return revealed ? { ...liveStyles.sequenceStepComplete, ...tokenPanelStyle(item, tokenStyleCatalog) } : liveStyles.sequenceStep;
}
