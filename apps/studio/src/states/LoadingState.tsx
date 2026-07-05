import React from "react";

export interface LoadingStateProps {
  label: string;
}

export function LoadingState({ label }: LoadingStateProps): React.ReactElement {
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  if (timedOut) {
    return React.createElement(
      "div",
      { className: "loading-state", role: "alert", "aria-live": "assertive" },
      React.createElement("p", { className: "loading-state-error" }, "Loading timed out. Please try again.")
    );
  }

  return React.createElement(
    "div",
    { className: "loading-state", role: "status", "aria-busy": "true", "aria-live": "polite" },
    React.createElement("div", { className: "spinner", "aria-hidden": "true" }),
    React.createElement("p", { className: "loading-state-label" }, label)
  );
}
