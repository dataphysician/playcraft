import type { GameTemplateLiveSurface } from "@playcraft/contracts";
import type { MemoryPairVisual, TokenStyleCatalog } from "./helpers.js";
import { playcraftUiAssets } from "../asset-library.js";
import { singleValue, describeTokenStyle, tokenStyleMatchesForToken } from "./helpers.js";
import { liveStyles } from "./styles-base.js";

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
