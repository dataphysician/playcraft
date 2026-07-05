import React from "react";

export interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps): React.ReactElement {
  return React.createElement(
    "div",
    { className: "empty-state", role: "status", "aria-live": "polite" },
    React.createElement("div", { className: "empty-state-icon", "aria-hidden": "true" }, icon),
    React.createElement("h2", { className: "empty-state-title" }, title),
    React.createElement("p", { className: "empty-state-description" }, description),
    action
      ? React.createElement(
          "button",
          { type: "button", onClick: action.onClick, className: "empty-state-action" },
          action.label
        )
      : null
  );
}
