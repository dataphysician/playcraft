import React from "react";
import { liveStyles } from "./styles.js";

export function LiveGameError({ message, onRetry }: { message: string; onRetry?: () => void }): React.ReactElement {
  return React.createElement(
    "section",
    { role: "alert", "data-testid": "live-game-error", style: liveStyles.failureState },
    React.createElement("strong", null, "Live game blocked"),
    React.createElement("p", { className: "error-message" }, message),
    onRetry ? React.createElement("button", { type: "button", onClick: onRetry, style: liveStyles.inlineAction }, "Try again") : null
  );
}

export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}
