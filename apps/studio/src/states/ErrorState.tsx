import React from "react";

export interface ErrorStateProps {
  message: string;
  retry?: () => void;
  details?: string;
}

export function ErrorState({ message, retry, details }: ErrorStateProps): React.ReactElement {
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  return React.createElement(
    "div",
    { className: "error-state", role: "alert", "aria-live": "assertive" },
    React.createElement("div", { className: "error-state-icon", "aria-hidden": "true" }, "⚠"),
    React.createElement("div", { className: "error-state-content" },
      React.createElement("p", { className: "error-state-message" }, message),
      retry
        ? React.createElement("button", { type: "button", onClick: retry, className: "error-state-retry" }, "Retry")
        : null,
      details
        ? React.createElement(
            "div",
            { className: "error-state-details" },
            React.createElement("button", {
              type: "button",
              onClick: () => setDetailsOpen((current) => !current),
              className: "error-state-details-toggle",
              "aria-expanded": String(detailsOpen)
            }, detailsOpen ? "Hide details" : "Show details"),
            detailsOpen
              ? React.createElement("pre", { className: "error-state-details-text" }, details)
              : null
          )
        : null
    )
  );
}
