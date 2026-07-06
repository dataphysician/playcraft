import type { MemoryPairVisual, SortDragState, TokenStyleCatalog } from "./helpers.js";
import type { GameTemplateLiveSurface } from "@playcraft/contracts";
import { playcraftUiAssets } from "../asset-library.js";
import { singleValue, describeTokenStyle, tokenStyleMatchesForToken } from "./helpers.js";

const liveGameCss = `
  .live-game-progress {
    margin: 0 0 0.35rem;
    color: #0f766e;
    font-size: 0.82rem;
    font-weight: 800;
    text-transform: uppercase;
  }
  .error-message {
    margin: 0;
    color: #7f1d1d;
    font-weight: 700;
  }
  .loading-placeholder {
    min-height: 10rem;
    border: 1px dashed #a1a1aa;
    border-radius: 8px;
    padding: 1rem;
    display: grid;
    place-items: center;
    background: #ffffff;
    color: #52525b;
    font-size: 0.9rem;
  }
`;

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
@keyframes playcraft-gentle-shake {
  0%, 100% { transform: translateX(0); }
  12% { transform: translateX(-3px); }
  24% { transform: translateX(3px); }
  36% { transform: translateX(-2px); }
  48% { transform: translateX(2px); }
  60% { transform: translateX(0); }
}
`;

const liveA11yCss = `
.memory-card:focus-visible,
.sort-item:focus-visible,
.sequence-choice:focus-visible,
.inline-action:focus-visible {
  outline: 2px solid #4A90E2 !important;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .memory-card,
  .sort-item,
  .sequence-choice,
  .inline-action {
    transition: none !important;
    animation: none !important;
  }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;

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

export function gameSurfaceStyle(kind: GameTemplateLiveSurface["kind"]): React.CSSProperties {
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

export function tokenDotStyle(token: string, tokenStyleCatalog: TokenStyleCatalog): React.CSSProperties {
  const color = colorForToken(token, tokenStyleCatalog);
  return {
    ...liveStyles.tokenDot,
    background: color.background,
    color: color.foreground,
    borderColor: color.border
  };
}

export function tokenPanelStyle(token: string, tokenStyleCatalog: TokenStyleCatalog): React.CSSProperties {
  const color = colorForToken(token, tokenStyleCatalog);
  return {
    background: color.background,
    color: color.foreground,
    borderColor: color.border
  };
}

export function heroTokenStyle(token: string, index: number, tokenStyleCatalog: TokenStyleCatalog): React.CSSProperties {
  const color = colorForToken(token, tokenStyleCatalog);
  return {
    ...liveStyles.heroToken,
    background: color.background,
    color: color.foreground,
    borderColor: color.border,
    transform: `rotate(${[-7, 5, -3, 8][index % 4]}deg)`
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

const liveStyles = {
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap" as const,
    border: 0
  },
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
    minWidth: "64px",
    minHeight: "64px",
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
    minWidth: "64px",
    minHeight: "64px",
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
    minWidth: "64px",
    minHeight: "64px",
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
    minWidth: "64px",
    minHeight: "64px",
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
  itemChipShake: {
    animation: "playcraft-gentle-shake 420ms ease-in-out"
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
    minWidth: "64px",
    minHeight: "64px",
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

export { liveGameCss, liveMotionCss, liveA11yCss, liveStyles };
