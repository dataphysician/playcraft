import React from "react";
import type { StudioSessionSnapshot, StudioTimelineEntry } from "../types.js";
import { shellStyles } from "../studio/shell-styles.js";
import { singleValue } from "../studio/helpers.js";

export function TimelinePanel({
  session,
  selectedTimelineId,
  onSelectTimeline
}: {
  session: StudioSessionSnapshot | undefined;
  selectedTimelineId: string | undefined;
  onSelectTimeline: (timelineId: string) => void;
}): React.ReactElement {
  const selectedEntry = selectedTimelineEntry(session, selectedTimelineId);
  const hasTimelineEvents = Boolean(session?.timeline.length);

  return React.createElement(
    "section",
    { "aria-label": "Session timeline", style: shellStyles.timelinePanel },
    React.createElement("h3", null, "Timeline"),
    session && session.timeline.length > 0
      ? React.createElement(
          "ol",
          { style: shellStyles.timelineList },
          ...session.timeline.map((entry, index) =>
            React.createElement(
              "li",
              { key: timelineEntryRenderKey(entry, index) },
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => onSelectTimeline(entry.id),
                  style: entry.id === selectedTimelineId ? shellStyles.timelineButtonActive : shellStyles.timelineButton
                },
                React.createElement("strong", null, entry.title),
                React.createElement("span", { style: shellStyles.timelineMeta }, entry.kind)
              )
            )
          )
        )
      : React.createElement("p", { style: shellStyles.timelineEmpty }, "Timeline events will appear here."),
    selectedEntry
      ? React.createElement(
          "section",
          { style: shellStyles.detailPanel },
          React.createElement("h3", null, selectedEntry.title),
          React.createElement("p", null, selectedEntry.timestamp),
          React.createElement("pre", { style: shellStyles.detailPre }, selectedEntry.detail)
        )
      : React.createElement(
          "div",
          { role: "status", style: shellStyles.emptyState },
          selectedTimelineId && hasTimelineEvents ? "Selected timeline event is not available." : "Timeline events will appear here."
        )
  );
}

export function selectedTimelineEntry(
  session: StudioSessionSnapshot | undefined,
  selectedTimelineId: string | undefined
): StudioTimelineEntry | undefined {
  if (!session || !selectedTimelineId) {
    return undefined;
  }

  const matches = session.timeline.filter((entry) => entry.id === selectedTimelineId);
  return singleValue(matches);
}

export function timelineEntryRenderKey(entry: StudioTimelineEntry, index: number): string {
  return `${entry.id}:${index}`;
}
