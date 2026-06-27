import React from "react";
import type { GameAssemblyProfile } from "@playcraft/contracts";
import { LiveGame, type LiveGameInteraction } from "./live-game.js";
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

type StudioTab = "live" | "developer";
type PendingCommand = "generate" | "update";

interface ChatMessage {
  id: string;
  speaker: "You" | "Studio";
  text: string;
}

export function StudioApp({ client, initialSession }: StudioAppProps): React.ReactElement {
  const [commandText, setCommandText] = React.useState("");
  const [session, setSession] = React.useState<StudioSessionSnapshot | undefined>(initialSession);
  const [selectedTimelineId, setSelectedTimelineId] = React.useState<string | undefined>(initialSession?.timeline[0]?.id);
  const [selectedComponentKey, setSelectedComponentKey] = React.useState<string | undefined>();
  const [activeTab, setActiveTab] = React.useState<StudioTab>("live");
  const [pending, setPending] = React.useState<PendingCommand | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);

  const activeProfile = session ? findActiveProfile(session) : undefined;
  const selectedEntry = session?.timeline.find((entry) => entry.id === selectedTimelineId) ?? session?.timeline.at(-1);
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

  async function handleCommandSubmit(event?: React.FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    const text = commandText.trim();
    if (!text) {
      setError(session ? "Enter a game update." : "Enter a game request.");
      return;
    }

    const sessionId = session?.sessionId;
    const mode: PendingCommand = sessionId ? "update" : "generate";
    setPending(mode);
    setError(null);
    try {
      let nextSession: StudioSessionSnapshot;
      if (mode === "generate") {
        nextSession = await Promise.resolve(client.assembleFromIntent({ sessionId, idea: text }));
      } else {
        if (!sessionId) {
          throw new Error("Update requires an active session.");
        }
        nextSession = await Promise.resolve(client.requestChange({ sessionId, changeRequest: text }));
      }

      setSession(nextSession);
      setSelectedTimelineId(nextSession.timeline.at(-1)?.id);
      setCommandText("");
      setMessages((current) => [
        ...current,
        { id: `message.user.${current.length + 1}`, speaker: "You", text },
        {
          id: `message.studio.${current.length + 2}`,
          speaker: "Studio",
          text: `${mode === "generate" ? "Generated" : "Updated"} ${findActiveProfile(nextSession)?.profileName ?? "game"}.`
        }
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : mode === "generate" ? "Generate failed." : "Update failed.");
    } finally {
      setPending(null);
    }
  }

  function handleStartOver(): void {
    client.reset?.();
    setCommandText("");
    setSession(undefined);
    setSelectedTimelineId(undefined);
    setSelectedComponentKey(undefined);
    setPending(null);
    setError(null);
    setMessages([]);
    setActiveTab("live");
  }

  function handleInteraction(interaction: TrustedPreviewInteraction | LiveGameInteraction): void {
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
    { style: shellStyles.app },
    React.createElement(
      "header",
      { style: shellStyles.header },
      React.createElement("h1", { style: shellStyles.heading }, "Playcraft Studio"),
      React.createElement(
        "div",
        { role: "tablist", "aria-label": "Studio views", style: shellStyles.tabs },
        React.createElement(
          "button",
          {
            type: "button",
            role: "tab",
            "aria-selected": activeTab === "live",
            onClick: () => setActiveTab("live"),
            style: activeTab === "live" ? shellStyles.tabActive : shellStyles.tab
          },
          "Live App"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            role: "tab",
            "aria-selected": activeTab === "developer",
            onClick: () => setActiveTab("developer"),
            style: activeTab === "developer" ? shellStyles.tabActive : shellStyles.tab
          },
          "Developer"
        )
      )
    ),
    React.createElement(
      "section",
      { style: shellStyles.content },
      activeTab === "live"
        ? React.createElement(LiveGame, { profile: activeProfile, onInteraction: handleInteraction })
        : React.createElement(DeveloperPanel, {
            activeProfile,
            componentSummaries,
            selectedComponentKey,
            selectedEntry,
            session,
            onSelectComponent: setSelectedComponentKey,
            onSelectTimeline: setSelectedTimelineId,
            onInteraction: handleInteraction
          })
    ),
    React.createElement(CommandBar, {
      commandText,
      hasSession: Boolean(session?.sessionId),
      messages,
      pending,
      error,
      onChange: setCommandText,
      onSubmit: handleCommandSubmit,
      onStartOver: handleStartOver
    })
  );
}

function DeveloperPanel({
  activeProfile,
  componentSummaries,
  selectedComponentKey,
  selectedEntry,
  session,
  onSelectComponent,
  onSelectTimeline,
  onInteraction
}: {
  activeProfile: GameAssemblyProfile | undefined;
  componentSummaries: TrustedPreviewComponentSummary[];
  selectedComponentKey: string | undefined;
  selectedEntry: StudioTimelineEntry | undefined;
  session: StudioSessionSnapshot | undefined;
  onSelectComponent: (componentKey: string) => void;
  onSelectTimeline: (timelineId: string) => void;
  onInteraction: (interaction: TrustedPreviewInteraction) => void;
}): React.ReactElement {
  return React.createElement(
    "div",
    { style: shellStyles.developerGrid },
    React.createElement(
      "section",
      { style: shellStyles.centerPanel },
      React.createElement("h2", null, activeProfile ? activeProfile.profileName : "Developer"),
      activeProfile && componentSummaries.length > 0
        ? React.createElement(ComponentInventoryPanel, {
            components: componentSummaries,
            selectedComponentKey,
            onSelect: onSelectComponent
          })
        : null,
      activeProfile
        ? React.createElement(TrustedPreview, {
            profile: activeProfile,
            selectedComponentKey,
            onInteraction
          })
        : React.createElement("div", { role: "status", style: shellStyles.emptyState }, "Generate a game to inspect the trusted preview."),
      activeProfile ? React.createElement(ProfileSummaryPanel, { profile: activeProfile }) : null
    ),
    React.createElement(TimelinePanel, {
      session,
      selectedEntry,
      onSelectTimeline
    })
  );
}

function CommandBar({
  commandText,
  hasSession,
  messages,
  pending,
  error,
  onChange,
  onSubmit,
  onStartOver
}: {
  commandText: string;
  hasSession: boolean;
  messages: ChatMessage[];
  pending: PendingCommand | null;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: (event?: React.FormEvent<HTMLFormElement>) => void;
  onStartOver: () => void;
}): React.ReactElement {
  const buttonLabel = hasSession ? "Update Game" : "Generate Game";
  const visibleMessages =
    messages.length > 0
      ? messages.slice(-4)
      : [
          {
            id: "message.preview.games",
            speaker: "Studio",
            text: "Available games: Memory Match, Sorting, Sequence Repeat."
          },
          {
            id: "message.preview.assets",
            speaker: "Studio",
            text: "Asset edits: with dinosaurs, with toys, assets with ocean animals, cards with fruit."
          },
          {
            id: "message.preview.examples",
            speaker: "Studio",
            text: "Try: Memory game with dinosaurs; Sort shapes by color; Repeat a pattern with gems."
          }
        ] satisfies ChatMessage[];

  return React.createElement(
    "footer",
    { style: shellStyles.commandBar },
    React.createElement(
      "ol",
      { "aria-label": "Chat history", style: shellStyles.messageLog },
      ...visibleMessages.map((message) =>
        React.createElement(
          "li",
          { key: message.id, style: messages.length > 0 ? shellStyles.message : shellStyles.previewMessage },
          React.createElement("strong", null, message.speaker),
          React.createElement("span", null, message.text)
        )
      )
    ),
    React.createElement(
      "form",
      { onSubmit: (event: React.FormEvent<HTMLFormElement>) => onSubmit(event), style: shellStyles.commandForm },
      React.createElement("label", { htmlFor: "studio-command", style: shellStyles.commandLabel }, "Game request"),
      React.createElement("input", {
        id: "studio-command",
        value: commandText,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
        placeholder: hasSession ? "Change the game or replace assets..." : "Memory game with dinosaurs",
        style: shellStyles.commandInput
      }),
      React.createElement(
        "button",
        { type: "submit", disabled: pending !== null, style: shellStyles.primaryButton },
        pending === "generate" ? "Generating..." : pending === "update" ? "Updating..." : buttonLabel
      ),
      React.createElement(
        "button",
        { type: "button", onClick: onStartOver, disabled: pending !== null, style: shellStyles.secondaryButton },
        "Start Over"
      )
    ),
    error ? React.createElement("div", { role: "alert", style: shellStyles.error }, error) : null
  );
}

function TimelinePanel({
  session,
  selectedEntry,
  onSelectTimeline
}: {
  session: StudioSessionSnapshot | undefined;
  selectedEntry: StudioTimelineEntry | undefined;
  onSelectTimeline: (timelineId: string) => void;
}): React.ReactElement {
  return React.createElement(
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
              onClick: () => onSelectTimeline(entry.id),
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
  app: {
    height: "100vh",
    maxHeight: "100vh",
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr) auto",
    overflow: "hidden",
    background: "#f4f4f5",
    color: "#18181b",
    fontFamily: "Inter, system-ui, sans-serif"
  },
  header: {
    display: "flex",
    flexWrap: "wrap" as const,
    justifyContent: "space-between",
    gap: "1rem",
    alignItems: "center",
    padding: "0.8rem 1rem",
    background: "#18202a",
    color: "#f8fafc"
  },
  heading: {
    margin: 0,
    fontSize: "1.2rem"
  },
  tabs: {
    display: "flex",
    gap: "0.5rem"
  },
  tab: {
    borderRadius: "8px",
    border: "1px solid #52525b",
    background: "transparent",
    color: "#f8fafc",
    padding: "0.55rem 0.75rem",
    fontWeight: 700
  },
  tabActive: {
    borderRadius: "8px",
    border: "1px solid #99f6e4",
    background: "#ecfdf5",
    color: "#064e3b",
    padding: "0.55rem 0.75rem",
    fontWeight: 700
  },
  content: {
    minHeight: 0,
    overflow: "auto",
    padding: "1rem",
    boxSizing: "border-box" as const
  },
  developerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 26rem), 1fr))",
    gap: "1rem",
    alignItems: "start"
  },
  centerPanel: {
    display: "grid",
    gap: "1rem",
    alignContent: "start"
  },
  rightRail: {
    display: "grid",
    gap: "0.75rem",
    alignContent: "start",
    borderLeft: "1px solid #d4d4d8",
    paddingLeft: "1rem",
    color: "#18181b"
  },
  commandBar: {
    display: "grid",
    gap: "0.5rem",
    minHeight: 0,
    borderTop: "1px solid #d4d4d8",
    background: "#ffffff",
    padding: "0.75rem 1rem",
    boxShadow: "0 -12px 30px rgba(24, 24, 27, 0.06)"
  },
  messageLog: {
    display: "grid",
    gap: "0.35rem",
    maxHeight: "5.75rem",
    overflow: "auto",
    listStyle: "none",
    padding: 0,
    margin: 0
  },
  message: {
    display: "grid",
    gridTemplateColumns: "4rem minmax(0, 1fr)",
    gap: "0.5rem",
    alignItems: "baseline",
    fontSize: "0.9rem"
  },
  previewMessage: {
    display: "grid",
    gridTemplateColumns: "4rem minmax(0, 1fr)",
    gap: "0.5rem",
    alignItems: "baseline",
    fontSize: "0.9rem",
    color: "#52525b"
  },
  commandForm: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
    alignItems: "center"
  },
  commandLabel: {
    fontWeight: 700,
    whiteSpace: "nowrap" as const
  },
  commandInput: {
    flex: "1 1 16rem",
    minWidth: "min(100%, 16rem)",
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
    fontWeight: 700,
    whiteSpace: "nowrap" as const
  },
  secondaryButton: {
    borderRadius: "8px",
    border: "1px solid #d97706",
    padding: "0.75rem 1rem",
    background: "#fff7ed",
    color: "#92400e",
    fontWeight: 700,
    whiteSpace: "nowrap" as const
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
