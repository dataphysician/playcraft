import React from "react";
import emptyGameHeroUrl from "../assets/empty-game-hero.png";
import { liveStyles } from "./styles.js";

export function EmptyGameHero(): React.ReactElement {
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
