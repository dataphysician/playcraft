import React from "react";
import type { SseFrame } from "@playcraft/contracts";

export interface RunInspectorProps {
  frames: SseFrame[];
  onStopRun: () => void;
  isRunning: boolean;
}

export function RunInspector({ frames, onStopRun, isRunning }: RunInspectorProps): React.ReactElement {
  const [filter, setFilter] = React.useState<string>("all");
  const [expandedFrame, setExpandedFrame] = React.useState<string | undefined>(undefined);

  const filteredFrames = React.useMemo(() => {
    if (filter === "all") return frames;
    return frames.filter((frame) => frame.kind === filter);
  }, [frames, filter]);

  const kinds = ["all", "RunStarted", "ToolCall", "ToolResult", "Custom", "RunFinished", "RunError"];

  return React.createElement(
    "section",
    { "aria-label": "Run inspector", className: "run-inspector-column", style: shellStyles.runInspectorPanel },
    React.createElement("h3", null, "Run Inspector"),
    React.createElement("style", null, runInspectorA11yCss),
    isRunning
      ? React.createElement(
          "button",
          {
            type: "button",
            className: "run-inspector-button",
            onClick: onStopRun,
            style: shellStyles.stopRunButton
          },
          "Stop run"
        )
      : null,
    React.createElement(
      "div",
      { style: shellStyles.runInspectorFilters },
      ...kinds.map((kind) =>
        React.createElement(
          "button",
          {
            key: kind,
            className: "run-inspector-button",
            onClick: () => setFilter(kind),
            style: filter === kind ? shellStyles.runInspectorFilterActive : shellStyles.runInspectorFilter
          },
          kind
        )
      )
    ),
    React.createElement(
      "div",
      { style: shellStyles.runInspectorFrames },
      filteredFrames.length === 0
        ? React.createElement("p", { style: shellStyles.runInspectorEmpty }, "Run events will appear here.")
        : filteredFrames.map((frame) =>
            React.createElement(
              "div",
              {
                key: `${frame.kind}-${frame.sequence}`,
                className: "run-inspector-frame",
                style: shellStyles.runInspectorFrame
              },
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "run-inspector-button",
                  onClick: () =>
                    setExpandedFrame(
                      expandedFrame === `${frame.kind}-${frame.sequence}`
                        ? undefined
                        : `${frame.kind}-${frame.sequence}`
                    ),
                  style: shellStyles.runInspectorFrameHeader
                },
                React.createElement("strong", null, `${frame.kind} #${frame.sequence}`),
                expandedFrame === `${frame.kind}-${frame.sequence}`
                  ? React.createElement("span", { style: shellStyles.runInspectorFrameToggle }, "Hide")
                  : React.createElement("span", { style: shellStyles.runInspectorFrameToggle }, "Show")
              ),
              expandedFrame === `${frame.kind}-${frame.sequence}`
                ? React.createElement("pre", { style: shellStyles.runInspectorFramePre }, JSON.stringify(frame, null, 2))
                : null
            )
          )
    )
  );
}

const runInspectorA11yCss = `
.run-inspector-button:focus-visible {
  outline: 2px solid #4A90E2 !important;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .run-inspector-button {
    transition: none !important;
  }
}
`;

const shellStyles = {
  runInspectorPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff",
    display: "grid",
    gap: "0.75rem",
    minHeight: "0",
    overflow: "auto"
  },
  stopRunButton: {
    borderRadius: "8px",
    border: "1px solid #b91c1c",
    padding: "0.5rem 0.75rem",
    background: "#fef2f2",
    color: "#7f1d1d",
    fontWeight: 700,
    cursor: "pointer"
  },
  runInspectorFilters: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.35rem"
  },
  runInspectorFilter: {
    borderRadius: "6px",
    border: "1px solid #d4d4d8",
    padding: "0.35rem 0.6rem",
    background: "#ffffff",
    color: "#3f3f46",
    fontSize: "0.78rem",
    fontWeight: 700,
    cursor: "pointer"
  },
  runInspectorFilterActive: {
    borderRadius: "6px",
    border: "1px solid #0f766e",
    padding: "0.35rem 0.6rem",
    background: "#ecfdf5",
    color: "#064e3b",
    fontSize: "0.78rem",
    fontWeight: 700,
    cursor: "pointer"
  },
  runInspectorFrames: {
    display: "grid",
    gap: "0.5rem",
    minHeight: "8rem",
    overflow: "auto"
  },
  runInspectorEmpty: {
    margin: 0,
    color: "#52525b",
    fontSize: "0.9rem"
  },
  runInspectorFrame: {
    border: "1px solid #e4e4e7",
    borderRadius: "8px",
    padding: "0.55rem",
    background: "#fafafa",
    display: "grid",
    gap: "0.35rem"
  },
  runInspectorFrameHeader: {
    background: "transparent",
    border: 0,
    padding: 0,
    textAlign: "left" as const,
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  runInspectorFrameToggle: {
    fontSize: "0.78rem",
    color: "#52525b"
  },
  runInspectorFramePre: {
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    fontSize: "0.78rem",
    background: "#ffffff",
    padding: "0.5rem",
    borderRadius: "4px",
    border: "1px solid #d4d4d8"
  }
} satisfies Record<string, React.CSSProperties>;
