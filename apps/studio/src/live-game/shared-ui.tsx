import React from "react";
import type { AssetReplacement, AssetReplacementLookup, MemoryPairVisual, TokenStyleCatalog } from "./helpers.js";
import { displayInitial, displayCardLabel, displayCardGlyph, uniqueStrings, isRenderableUri, replacementForToken } from "./helpers.js";
import { playcraftUiAssets } from "../asset-library.js";
import { liveStyles, generatedGlyphStyle, cardPairBadgeStyle, heroTokenStyle, tokenDotStyle } from "./styles.js";

export function CardBackFace(): React.ReactElement {
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

export function TokenSprite({
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

export function CardFace({
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

export function HeroArt({
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

export function StatPill({
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

export function ProgressTrack({ value, max }: { value: number; max: number }): React.ReactElement {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return React.createElement(
    "span",
    { "aria-label": `Progress ${value} of ${max}`, style: liveStyles.progressTrack },
    React.createElement("span", { style: { ...liveStyles.progressFill, width: `${Math.round(ratio * 100)}%` } })
  );
}

export function CompletionPanel({
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
