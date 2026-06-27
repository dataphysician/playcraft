import React from "react";
import type { GameAssemblyProfile } from "@playcraft/contracts";
import {
  TrustedPreview,
  getTrustedPreviewComponents,
  type TrustedPreviewComponentSummary,
  type TrustedPreviewInteraction
} from "./trusted-preview.js";
import type { StudioClient, StudioSessionSnapshot, StudioTimelineEntry } from "./types.js";

export interface StudioAppProps {
  client: StudioClient;
  initialSession?: StudioSessionSnapshot;
}

export function StudioApp({ client, initialSession }: StudioAppProps): React.ReactElement {
  const [idea, setIdea] = React.useState("");
  const [changeRequest, setChangeRequest] = React.useState("");
  const [session, setSession] = React.useState<StudioSessionSnapshot | undefined>(initialSession);
  const [selectedTimelineId, setSelectedTimelineId] = React.useState<string | undefined>(initialSession?.timeline[0]?.id);
  const [selectedComponentKey, setSelectedComponentKey] = React.useState<string | undefined>();
  const [pending, setPending] = React.useState<"assemble" | "update" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const activeProfile = session ? findActiveProfile(session) : undefined;
  const selectedEntry = session?.timeline.find((entry) => entry.id === selectedTimelineId) ?? session?.timeline[0];
  const componentSummaries = React.useMemo(() => {
    if (!activeProfile) {
      return [];
    }

    try {
      return getTrustedPreviewComponents(activeProfile);
    } catch {
      return [];
    }
  }, [activeProfile]);

  React.useEffect(() => {
    setSelectedComponentKey((current) => {
      if (componentSummaries.some((component) => component.componentKey === current)) {
        return current;
      }

      return componentSummaries[0]?.componentKey;
    });
  }, [componentSummaries]);

  async function handleAssemble(): Promise<void> {
    if (!idea.trim()) {
      setError("Enter a game idea before assembling a profile.");
      return;
    }

    setPending("assemble");
    setError(null);
    try {
      const nextSession = await Promise.resolve(client.assembleFromIntent({ sessionId: session?.sessionId, idea: idea.trim() }));
      setSession(nextSession);
      setSelectedTimelineId(nextSession.timeline[0]?.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Assemble failed.");
    } finally {
      setPending(null);
    }
  }

  async function handleUpdate(): Promise<void> {
    if (!session?.sessionId) {
      setError("Assemble a profile before requesting a change.");
      return;
    }
    if (!changeRequest.trim()) {
      setError("Enter one bounded change request.");
      return;
    }

    setPending("update");
    setError(null);
    try {
      const nextSession = await Promise.resolve(client.requestChange({ sessionId: session.sessionId, changeRequest: changeRequest.trim() }));
      setSession(nextSession);
      setSelectedTimelineId(nextSession.timeline[0]?.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Update failed.");
    } finally {
      setPending(null);
    }
  }

  function handlePreviewInteraction(interaction: TrustedPreviewInteraction): void {
    if (!session) {
      return;
    }

    const entry: StudioTimelineEntry = {
      id: `timeline.frontend.${session.timeline.length + 1}`,
      kind: "frontend",
      title: `Preview interaction: ${interaction.eventName}`,
      detail: JSON.stringify(interaction.payload, null, 2),
      timestamp: new Date().toISOString(),
      profileId: interaction.profileId,
      rawEvent: interaction
    };

    const nextSession: StudioSessionSnapshot = {
      ...session,
      timeline: [...session.timeline, entry]
    };

    setSession(nextSession);
    setSelectedTimelineId(entry.id);
  }

  return React.createElement(
    "main",
    { style: shellStyles.main },
    React.createElement(
      "section",
      { style: shellStyles.leftRail },
      React.createElement("h1", null, "Playcraft Studio"),
      React.createElement("label", { htmlFor: "studio-idea" }, "Game idea"),
      React.createElement("textarea", {
        id: "studio-idea",
        value: idea,
        onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setIdea(event.target.value),
        rows: 6,
        placeholder: "Describe the game you want to build...",
        style: shellStyles.textarea
      }),
      React.createElement(
        "button",
        { type: "button", onClick: () => void handleAssemble(), disabled: pending !== null, style: shellStyles.primaryButton },
        pending === "assemble" ? "Assembling…" : "Assemble profile"
      ),
      React.createElement("label", { htmlFor: "studio-change" }, "Change request"),
      React.createElement("textarea", {
        id: "studio-change",
        value: changeRequest,
        onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setChangeRequest(event.target.value),
        rows: 4,
        placeholder: "Ask for one bounded change...",
        style: shellStyles.textarea
      }),
      React.createElement(
        "button",
        { type: "button", onClick: () => void handleUpdate(), disabled: pending !== null, style: shellStyles.secondaryButton },
        pending === "update" ? "Updating…" : "Request update"
      ),
      error ? React.createElement("div", { role: "alert", style: shellStyles.error }, error) : null
    ),
    React.createElement(
      "section",
      { style: shellStyles.centerPanel },
      React.createElement("h2", null, activeProfile ? activeProfile.profileName : "Trusted preview"),
      activeProfile && componentSummaries.length > 0
        ? React.createElement(ComponentInventoryPanel, {
            components: componentSummaries,
            selectedComponentKey,
            onSelect: setSelectedComponentKey
          })
        : null,
      activeProfile
        ? React.createElement(TrustedPreview, {
            profile: activeProfile,
            selectedComponentKey,
            onInteraction: handlePreviewInteraction
          })
        : React.createElement("div", { role: "status", style: shellStyles.emptyState }, "Assemble a profile to open the trusted preview."),
      activeProfile ? React.createElement(ProfileSummaryPanel, { profile: activeProfile }) : null
    ),
    React.createElement(
      "aside",
      { style: shellStyles.rightRail },
      React.createElement("h2", null, "Interaction timeline"),
      React.createElement(
        "ol",
        { style: shellStyles.timelineList },
        ...(session?.timeline.map((entry) =>
          React.createElement(
            "li",
            { key: entry.id },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: () => setSelectedTimelineId(entry.id),
                style: entry.id === selectedEntry?.id ? shellStyles.timelineButtonActive : shellStyles.timelineButton
              },
              React.createElement("strong", null, entry.title),
              React.createElement("span", { style: shellStyles.timelineMeta }, `${entry.kind} · ${entry.profileId ?? "session"}`)
            )
          )
        ) ?? [])
      ),
      selectedEntry
        ? React.createElement(
            "section",
            { style: shellStyles.detailPanel },
            React.createElement("h3", null, selectedEntry.title),
            React.createElement("p", null, selectedEntry.timestamp),
            React.createElement("pre", { style: shellStyles.detailPre }, selectedEntry.detail)
          )
        : React.createElement("div", { role: "status", style: shellStyles.emptyState }, "Timeline events will appear here.")
    )
  );
}

function findActiveProfile(session: StudioSessionSnapshot): GameAssemblyProfile | undefined {
  return session.profiles.find((profile) => profile.id === session.activeProfileId) ?? session.profiles.at(-1);
}

function ProfileSummaryPanel({ profile }: { profile: GameAssemblyProfile }): React.ReactElement {
  return React.createElement(
    "section",
    { style: shellStyles.summaryPanel },
    React.createElement("h3", null, "Active profile"),
    React.createElement("p", null, `ID: ${profile.id}`),
    React.createElement("p", null, `Validation: ${profile.validation.valid ? "valid" : "invalid"}`),
    React.createElement("p", null, `Errors: ${profile.validation.errors.length}`),
    React.createElement("p", null, `Warnings: ${profile.validation.warnings.length}`),
    React.createElement("p", null, `Replay events: ${profile.replay.eventLog.length}`)
  );
}

function ComponentInventoryPanel({
  components,
  selectedComponentKey,
  onSelect
}: {
  components: TrustedPreviewComponentSummary[];
  selectedComponentKey: string | undefined;
  onSelect: (componentKey: string) => void;
}): React.ReactElement {
  return React.createElement(
    "section",
    { "aria-label": "Trusted React components", style: shellStyles.componentPanel },
    React.createElement("h3", null, "Components"),
    React.createElement(
      "ol",
      { style: shellStyles.componentList },
      ...components.map((component) =>
        React.createElement(
          "li",
          { key: component.componentKey },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: () => onSelect(component.componentKey),
              style:
                component.componentKey === selectedComponentKey
                  ? shellStyles.componentButtonActive
                  : shellStyles.componentButton
            },
            React.createElement("strong", { style: shellStyles.componentName }, component.componentId),
            React.createElement("span", { style: shellStyles.componentMeta }, component.componentCapability),
            React.createElement(
              "span",
              { style: shellStyles.componentToolLine },
              component.emittedToolNames.length > 0 ? component.emittedToolNames.join(", ") : "display-only"
            )
          )
        )
      )
    )
  );
}

const shellStyles = {
  main: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))",
    gap: 0,
    minHeight: "100vh",
    padding: 0,
    background: "#f4f4f5",
    color: "#18181b",
    fontFamily: "Inter, system-ui, sans-serif"
  },
  leftRail: {
    display: "grid",
    gap: "0.75rem",
    alignContent: "start",
    padding: "1rem",
    background: "#18202a",
    color: "#f8fafc"
  },
  centerPanel: {
    display: "grid",
    gap: "1rem",
    alignContent: "start",
    padding: "1rem"
  },
  rightRail: {
    display: "grid",
    gap: "0.75rem",
    alignContent: "start",
    padding: "1rem",
    borderLeft: "1px solid #d4d4d8",
    background: "#fafafa",
    color: "#18181b"
  },
  textarea: {
    width: "100%",
    borderRadius: "8px",
    border: "1px solid #a1a1aa",
    background: "#ffffff",
    color: "#18181b",
    padding: "0.75rem"
  },
  primaryButton: {
    borderRadius: "8px",
    border: 0,
    padding: "0.75rem 1rem",
    background: "#0f766e",
    color: "#ffffff",
    fontWeight: 700
  },
  secondaryButton: {
    borderRadius: "8px",
    border: "1px solid #d97706",
    padding: "0.75rem 1rem",
    background: "#fff7ed",
    color: "#92400e",
    fontWeight: 700
  },
  emptyState: {
    minHeight: "10rem",
    border: "1px dashed #a1a1aa",
    borderRadius: "8px",
    padding: "1rem",
    display: "grid",
    placeItems: "center",
    background: "#ffffff"
  },
  summaryPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff"
  },
  componentPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff"
  },
  componentList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))",
    gap: "0.5rem",
    listStyle: "none",
    padding: 0,
    margin: 0
  },
  componentButton: {
    width: "100%",
    minHeight: "6rem",
    textAlign: "left" as const,
    borderRadius: "8px",
    border: "1px solid #d4d4d8",
    background: "#fafafa",
    color: "#18181b",
    padding: "0.75rem",
    display: "grid",
    alignContent: "start",
    gap: "0.35rem"
  },
  componentButtonActive: {
    width: "100%",
    minHeight: "6rem",
    textAlign: "left" as const,
    borderRadius: "8px",
    border: "2px solid #0f766e",
    background: "#ecfdf5",
    color: "#064e3b",
    padding: "0.6875rem",
    display: "grid",
    alignContent: "start",
    gap: "0.35rem"
  },
  componentName: {
    overflowWrap: "anywhere" as const
  },
  componentMeta: {
    fontSize: "0.875rem",
    color: "#52525b",
    overflowWrap: "anywhere" as const
  },
  componentToolLine: {
    fontSize: "0.8125rem",
    color: "#0f766e",
    overflowWrap: "anywhere" as const
  },
  timelineList: {
    display: "grid",
    gap: "0.5rem",
    listStyle: "none",
    padding: 0,
    margin: 0
  },
  timelineButton: {
    width: "100%",
    textAlign: "left" as const,
    borderRadius: "8px",
    border: "1px solid #d4d4d8",
    background: "#ffffff",
    color: "#18181b",
    padding: "0.75rem",
    display: "grid",
    gap: "0.35rem"
  },
  timelineButtonActive: {
    width: "100%",
    textAlign: "left" as const,
    borderRadius: "8px",
    border: "2px solid #0f766e",
    background: "#ecfdf5",
    color: "#064e3b",
    padding: "0.75rem",
    display: "grid",
    gap: "0.35rem"
  },
  timelineMeta: {
    opacity: 0.75,
    fontSize: "0.875rem"
  },
  detailPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff"
  },
  detailPre: {
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const
  },
  error: {
    borderRadius: "8px",
    border: "1px solid #b91c1c",
    background: "#fef2f2",
    color: "#7f1d1d",
    padding: "0.75rem"
  }
} satisfies Record<string, React.CSSProperties>;
