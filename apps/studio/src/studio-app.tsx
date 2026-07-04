import React from "react";
import {
  BuilderProfileExportSchema,
  type BuilderCatalog,
  type BuilderInputSource,
  type BuilderInputSourceOption,
  type BuilderProfileExport,
  type GameAssemblyProfile
} from "@playcraft/contracts";
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
type PendingCommand = "export" | "generate" | "import" | "preview" | "update";

interface ChatMessage {
  id: string;
  speaker: "Studio" | "Transcript" | "You";
  text: string;
}

export function StudioApp({ client, initialSession }: StudioAppProps): React.ReactElement {
  const [commandText, setCommandText] = React.useState("");
  const [inputSource, setInputSource] = React.useState<BuilderInputSource>("text");
  const [session, setSession] = React.useState<StudioSessionSnapshot | undefined>(initialSession);
  const [selectedTimelineId, setSelectedTimelineId] = React.useState<string | undefined>(initialSession?.timeline[0]?.id);
  const [selectedComponentKey, setSelectedComponentKey] = React.useState<string | undefined>();
  const [activeTab, setActiveTab] = React.useState<StudioTab>("live");
  const [pending, setPending] = React.useState<PendingCommand | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [catalog, setCatalog] = React.useState<BuilderCatalog | undefined>(() => synchronousCatalog(client));
  const [profileExportText, setProfileExportText] = React.useState("");
  const [profileImportText, setProfileImportText] = React.useState("");
  const [profileTransferStatus, setProfileTransferStatus] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    let active = true;
    setCatalog(undefined);

    if (client.catalog) {
      const nextCatalog = client.catalog();
      if (isPromiseLike(nextCatalog)) {
        void nextCatalog.then((loadedCatalog) => {
          if (active) {
            setCatalog(loadedCatalog);
          }
        }).catch(() => {
          if (active) {
            setCatalog(undefined);
          }
        });
      } else {
        setCatalog(nextCatalog);
      }
    }

    return () => {
      active = false;
    };
  }, [client]);

  async function runStudioCommand(text: string, source: BuilderInputSource = inputSource): Promise<void> {
    if (!text) {
      setError(session ? "Enter an update." : "Enter a request.");
      return;
    }

    const sessionId = session?.sessionId;
    const mode: PendingCommand = sessionId ? "update" : "generate";
    setPending(mode);
    setError(null);
    try {
      let nextSession: StudioSessionSnapshot;
      if (mode === "generate") {
        nextSession = await Promise.resolve(client.assembleFromIntent({ sessionId, idea: text, source }));
      } else {
        if (!sessionId) {
          throw new Error("Update requires an active session.");
        }
        nextSession = await Promise.resolve(client.requestChange({ sessionId, changeRequest: text, source }));
      }

      const speaker: ChatMessage["speaker"] = source === "moonshine-transcript" ? "Transcript" : "You";
      setSession(nextSession);
      setSelectedTimelineId(nextSession.timeline.at(-1)?.id);
      setCommandText("");
      setMessages((current) => [
        ...current,
        { id: `message.user.${current.length + 1}`, speaker, text },
        {
          id: `message.studio.${current.length + 2}`,
          speaker: "Studio",
          text: chatSummaryForSession(mode, nextSession)
        }
      ]);
      setProfileTransferStatus(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : mode === "generate" ? "Generate failed." : "Update failed.");
    } finally {
      setPending(null);
    }
  }

  async function handleExportProfile(): Promise<void> {
    if (!session?.sessionId || !client.exportProfile) {
      setProfileTransferStatus("No active profile export tool is available.");
      return;
    }

    setPending("export");
    setError(null);
    try {
      const exported = await Promise.resolve(client.exportProfile(session.sessionId));
      setProfileExportText(JSON.stringify(exported, null, 2));
      setProfileImportText("");
      setProfileTransferStatus(`Exported ${exported.profile.profileName}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile export failed.");
    } finally {
      setPending(null);
    }
  }

  async function handleImportProfile(): Promise<void> {
    if (!client.importProfile) {
      setProfileTransferStatus("No active profile import tool is available.");
      return;
    }

    const text = (profileImportText.trim() || profileExportText.trim());
    if (!text) {
      setProfileTransferStatus("Paste a profile export first.");
      return;
    }
    if (!session?.sessionId) {
      setProfileTransferStatus("Import requires an active target session.");
      return;
    }

    setPending("import");
    setError(null);
    try {
      const profileExport = BuilderProfileExportSchema.parse(JSON.parse(text));
      const nextSession = await Promise.resolve(client.importProfile({ profileExport, sessionId: session.sessionId }));
      setSession(nextSession);
      setSelectedTimelineId(nextSession.timeline.at(-1)?.id);
      setActiveTab("developer");
      setProfileTransferStatus(`Imported ${findActiveProfile(nextSession)?.profileName ?? "profile"}.`);
      setMessages((current) => [
        ...current,
        {
          id: `message.studio.${current.length + 1}`,
          speaker: "Studio",
          text: `Imported ${findActiveProfile(nextSession)?.profileName ?? "profile"} from profile export.`
        }
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile import failed.");
    } finally {
      setPending(null);
    }
  }

  async function handleServicePreview(): Promise<void> {
    if (!session?.sessionId || !client.previewAction) {
      setProfileTransferStatus("No active service preview tool is available.");
      return;
    }

    setPending("preview");
    setError(null);
    try {
      const nextSession = await Promise.resolve(client.previewAction(session.sessionId));
      setSession(nextSession);
      setSelectedTimelineId(nextSession.timeline.at(-1)?.id);
      setActiveTab("developer");
      setProfileTransferStatus("Ran service preview action.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Service preview failed.");
    } finally {
      setPending(null);
    }
  }

  async function handleCommandSubmit(event?: React.FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    await runStudioCommand(commandText.trim());
  }

  function handleStartOver(): void {
    client.reset?.();
    setCommandText("");
    setInputSource("text");
    setSession(undefined);
    setSelectedTimelineId(undefined);
    setSelectedComponentKey(undefined);
    setPending(null);
    setError(null);
    setMessages([]);
    setProfileExportText("");
    setProfileImportText("");
    setProfileTransferStatus(null);
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
            canExportProfile: Boolean(client.exportProfile),
            canImportProfile: Boolean(client.importProfile),
            canRunServicePreview: Boolean(client.previewAction),
            catalog,
            componentSummaries,
            messages,
            pending,
            profileExportText,
            profileImportText,
            profileTransferStatus,
            selectedComponentKey,
            selectedEntry,
            session,
            onExportProfile: handleExportProfile,
            onImportProfile: handleImportProfile,
            onProfileImportTextChange: setProfileImportText,
            onServicePreview: handleServicePreview,
            onSelectComponent: setSelectedComponentKey,
            onSelectTimeline: setSelectedTimelineId,
            onInteraction: handleInteraction
          })
    ),
    React.createElement(CommandBar, {
      commandText,
      catalog,
      inputSource,
      hasSession: Boolean(session?.sessionId),
      pending,
      error,
      onChange: setCommandText,
      onInputSourceChange: setInputSource,
      onSubmit: handleCommandSubmit,
      onStartOver: handleStartOver
    })
  );
}

function DeveloperPanel({
  activeProfile,
  canExportProfile,
  canImportProfile,
  canRunServicePreview,
  catalog,
  componentSummaries,
  messages,
  pending,
  profileExportText,
  profileImportText,
  profileTransferStatus,
  selectedComponentKey,
  selectedEntry,
  session,
  onExportProfile,
  onImportProfile,
  onProfileImportTextChange,
  onServicePreview,
  onSelectComponent,
  onSelectTimeline,
  onInteraction
}: {
  activeProfile: GameAssemblyProfile | undefined;
  canExportProfile: boolean;
  canImportProfile: boolean;
  canRunServicePreview: boolean;
  catalog: BuilderCatalog | undefined;
  componentSummaries: TrustedPreviewComponentSummary[];
  messages: ChatMessage[];
  pending: PendingCommand | null;
  profileExportText: string;
  profileImportText: string;
  profileTransferStatus: string | null;
  selectedComponentKey: string | undefined;
  selectedEntry: StudioTimelineEntry | undefined;
  session: StudioSessionSnapshot | undefined;
  onExportProfile: () => void;
  onImportProfile: () => void;
  onProfileImportTextChange: (value: string) => void;
  onServicePreview: () => void;
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
      messages.length > 0 ? React.createElement(ChatHistoryPanel, { messages }) : null,
      React.createElement(AgentToolCatalogPanel, { catalog }),
      React.createElement(ProfilePortabilityPanel, {
        canExportProfile,
        canImportProfile,
        canRunServicePreview,
        hasActiveProfile: Boolean(activeProfile && session?.sessionId),
        pending,
        profileExportText,
        profileImportText,
        profileTransferStatus,
        onExportProfile,
        onImportProfile,
        onProfileImportTextChange,
        onServicePreview
      }),
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

function AgentToolCatalogPanel({ catalog }: { catalog: BuilderCatalog | undefined }): React.ReactElement {
  if (!catalog) {
    return React.createElement(
      "section",
      { "aria-label": "Agent tool catalog", style: shellStyles.catalogPanel },
      React.createElement("h3", null, "Agent tools"),
      React.createElement("p", { role: "status", style: shellStyles.catalogEmpty }, "Loading catalog.")
    );
  }

  return React.createElement(
    "section",
    { "aria-label": "Agent tool catalog", style: shellStyles.catalogPanel },
    React.createElement("h3", null, "Agent tools"),
    React.createElement(
      "div",
      { style: shellStyles.catalogGrid },
      React.createElement(
        "section",
        { style: shellStyles.catalogColumn },
        React.createElement("h4", { style: shellStyles.catalogHeading }, "Callable actions"),
        React.createElement(
          "ol",
          { style: shellStyles.catalogList },
          ...catalog.tools.map((tool) =>
            React.createElement(
              "li",
              { key: tool.id, style: shellStyles.catalogItem },
              React.createElement("strong", null, tool.toolName),
              React.createElement("span", { style: shellStyles.catalogMeta }, tool.actionName),
              React.createElement("span", { style: shellStyles.catalogMeta }, toolInputSourceSummary(tool.acceptedInputSources)),
              React.createElement("span", { style: shellStyles.catalogMeta }, toolArgumentsSummary(tool.argumentsSchema.fields))
            )
          )
        )
      ),
      React.createElement(
        "section",
        { style: shellStyles.catalogColumn },
        React.createElement("h4", { style: shellStyles.catalogHeading }, "Templates"),
        React.createElement(
          "ol",
          { style: shellStyles.catalogList },
          ...catalog.templates.map((template) =>
            React.createElement(
              "li",
              { key: template.id, style: shellStyles.catalogItem },
              React.createElement("strong", null, template.displayName),
              React.createElement("span", { style: shellStyles.catalogMeta }, template.id),
              React.createElement("span", { style: shellStyles.catalogMeta }, template.requestAliases.slice(0, 3).join(", "))
            )
          )
        )
      ),
      React.createElement(
        "section",
        { style: shellStyles.catalogColumn },
        React.createElement("h4", { style: shellStyles.catalogHeading }, "Asset levers"),
        React.createElement(
          "ol",
          { style: shellStyles.catalogList },
          ...catalog.assetEdit.availableThemes.map((entry) =>
            React.createElement(
              "li",
              { key: entry.theme, style: shellStyles.catalogItem },
              React.createElement("strong", null, entry.displayLabel),
              React.createElement("span", { style: shellStyles.catalogMeta }, entry.theme),
              React.createElement("span", { style: shellStyles.catalogMeta }, entry.aliases.join(", ")),
              React.createElement("span", { style: shellStyles.catalogMeta }, entry.suggestedItems.join(", "))
            )
          )
        )
      )
    )
  );
}

function toolArgumentsSummary(fields: BuilderCatalog["tools"][number]["argumentsSchema"]["fields"]): string {
  const summary = Object.entries(fields).map(([name, field]) => `${name}${field.required ? "*" : ""}:${field.type}`);
  return summary.length > 0 ? summary.join(", ") : "no arguments";
}

function toolInputSourceSummary(sources: BuilderCatalog["tools"][number]["acceptedInputSources"]): string {
  return sources.length > 0 ? `input: ${sources.join(", ")}` : "input: none";
}

function ProfilePortabilityPanel({
  canExportProfile,
  canImportProfile,
  canRunServicePreview,
  hasActiveProfile,
  pending,
  profileExportText,
  profileImportText,
  profileTransferStatus,
  onExportProfile,
  onImportProfile,
  onProfileImportTextChange,
  onServicePreview
}: {
  canExportProfile: boolean;
  canImportProfile: boolean;
  canRunServicePreview: boolean;
  hasActiveProfile: boolean;
  pending: PendingCommand | null;
  profileExportText: string;
  profileImportText: string;
  profileTransferStatus: string | null;
  onExportProfile: () => void;
  onImportProfile: () => void;
  onProfileImportTextChange: (value: string) => void;
  onServicePreview: () => void;
}): React.ReactElement {
  return React.createElement(
    "section",
    { "aria-label": "Profile portability", style: shellStyles.portabilityPanel },
    React.createElement("h3", null, "Profile tools"),
    React.createElement(
      "div",
      { style: shellStyles.portabilityActions },
      React.createElement(
        "button",
        {
          type: "button",
          disabled: !canRunServicePreview || !hasActiveProfile || pending !== null,
          onClick: onServicePreview,
          style: shellStyles.secondaryButton
        },
        pending === "preview" ? "Previewing..." : "Run Preview Tool"
      ),
      React.createElement(
        "button",
        {
          type: "button",
          disabled: !canExportProfile || !hasActiveProfile || pending !== null,
          onClick: onExportProfile,
          style: shellStyles.secondaryButton
        },
        pending === "export" ? "Exporting..." : "Export Profile"
      ),
      React.createElement(
        "button",
        {
          type: "button",
          disabled: !canImportProfile || pending !== null,
          onClick: onImportProfile,
          style: shellStyles.primaryButton
        },
        pending === "import" ? "Importing..." : "Import Profile"
      )
    ),
    profileTransferStatus ? React.createElement("p", { role: "status", style: shellStyles.portabilityStatus }, profileTransferStatus) : null,
    profileExportText
      ? React.createElement(
          "label",
          { style: shellStyles.portabilityField },
          React.createElement("span", { style: shellStyles.fieldLabel }, "Profile export JSON"),
          React.createElement("textarea", {
            readOnly: true,
            value: profileExportText,
            rows: 5,
            style: shellStyles.portabilityTextarea
          })
        )
      : null,
    React.createElement(
      "label",
      { style: shellStyles.portabilityField },
      React.createElement("span", { style: shellStyles.fieldLabel }, "Import profile export JSON"),
      React.createElement("textarea", {
        value: profileImportText,
        onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => onProfileImportTextChange(event.target.value),
        rows: 5,
        style: shellStyles.portabilityTextarea
      })
    )
  );
}

function CommandBar({
  commandText,
  catalog,
  inputSource,
  hasSession,
  pending,
  error,
  onChange,
  onInputSourceChange,
  onSubmit,
  onStartOver
}: {
  commandText: string;
  catalog: BuilderCatalog | undefined;
  inputSource: BuilderInputSource;
  hasSession: boolean;
  pending: PendingCommand | null;
  error: string | null;
  onChange: (value: string) => void;
  onInputSourceChange: (value: BuilderInputSource) => void;
  onSubmit: (event?: React.FormEvent<HTMLFormElement>) => void;
  onStartOver: () => void;
}): React.ReactElement {
  const buttonLabel = hasSession ? "Update Game" : "Generate Game";
  const [tipsOpen, setTipsOpen] = React.useState(false);
  const tips = React.useMemo(() => requestTipLines(catalog), [catalog]);
  const inputOptions = catalog?.input.sourceOptions ?? [];
  const selectedInputOption = inputOptions.find((option) => option.source === inputSource);
  const placeholder = hasSession ? selectedInputOption?.updatePlaceholder : selectedInputOption?.generatePlaceholder;

  return React.createElement(
    "footer",
    { style: shellStyles.commandBar },
    React.createElement(
      "form",
      { onSubmit: (event: React.FormEvent<HTMLFormElement>) => onSubmit(event), style: shellStyles.commandForm },
      React.createElement(
        "span",
        { style: shellStyles.commandLabelGroup },
        React.createElement("label", { htmlFor: "studio-command", style: shellStyles.commandLabel }, "Request"),
        React.createElement(
          "span",
          {
            style: shellStyles.tipAnchor,
            onMouseEnter: () => setTipsOpen(true),
            onMouseLeave: () => setTipsOpen(false),
            onFocus: () => setTipsOpen(true),
            onBlur: () => setTipsOpen(false)
          },
          React.createElement(
            "button",
            {
              type: "button",
              "aria-label": "Request tips",
              "aria-describedby": tipsOpen ? "game-request-tips" : undefined,
              "aria-expanded": tipsOpen,
              onClick: () => setTipsOpen(true),
              style: shellStyles.tipButton
            },
            "i"
          ),
          tipsOpen
            ? React.createElement(
                "div",
                { id: "game-request-tips", role: "tooltip", style: shellStyles.tipPanel },
                ...tips.map((line) => React.createElement("p", { key: line, style: shellStyles.tipLine }, line))
              )
            : null
        )
      ),
      React.createElement("input", {
        id: "studio-command",
        value: commandText,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
        placeholder,
        style: shellStyles.commandInput
      }),
      React.createElement(
        "span",
        { role: "group", "aria-label": "Input source", style: shellStyles.inputSourceGroup },
        ...inputOptions.map((option) => React.createElement(InputSourceButton, {
          key: option.source,
          option,
          selected: inputSource === option.source,
          onSelect: onInputSourceChange
        }))
      ),
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

function InputSourceButton({
  option,
  selected,
  onSelect
}: {
  option: BuilderInputSourceOption;
  selected: boolean;
  onSelect: (value: BuilderInputSource) => void;
}): React.ReactElement {
  return React.createElement(
    "button",
    {
      type: "button",
      "aria-pressed": selected,
      onClick: () => onSelect(option.source),
      style: selected ? shellStyles.inputSourceButtonActive : shellStyles.inputSourceButton
    },
    option.displayLabel
  );
}

function ChatHistoryPanel({ messages }: { messages: ChatMessage[] }): React.ReactElement {
  return React.createElement(
    "section",
    { "aria-label": "Developer chat log", style: shellStyles.chatPanel },
    React.createElement("h3", null, "Chat log"),
    React.createElement(
      "ol",
      { "aria-label": "Chat history", style: shellStyles.messageLog },
      ...messages.slice(-8).map((message) =>
        React.createElement(
          "li",
          { key: message.id, style: shellStyles.message },
          React.createElement("strong", null, message.speaker),
          React.createElement("span", null, message.text)
        )
      )
    )
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

function synchronousCatalog(client: StudioClient): BuilderCatalog | undefined {
  if (!client.catalog) {
    return undefined;
  }

  try {
    const catalog = client.catalog();
    return isPromiseLike(catalog) ? undefined : catalog;
  } catch {
    return undefined;
  }
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value && typeof value.then === "function";
}

function chatSummaryForSession(mode: PendingCommand, session: StudioSessionSnapshot): string {
  const profile = findActiveProfile(session);
  const profileName = profile?.profileName ?? "game";
  const assetTheme = session.activeAssetEdit?.theme ?? session.activeAssetEdit?.items?.join(", ");
  const action = mode === "generate" ? "Generated" : "Updated";
  return `${action} ${profileName}${assetTheme ? ` with ${assetTheme} assets` : ""}.`;
}

function requestTipLines(catalog: BuilderCatalog | undefined): string[] {
  if (!catalog) {
    return ["Available games: loading catalog.", "Asset edits: loading catalog.", "Try: loading catalog."];
  }

  const games = catalog.templates.map((template) => template.displayLabel);
  const displayedGames = games.slice(0, 5);
  const moreGames = Math.max(0, games.length - displayedGames.length);
  const assetThemes = catalog.assetEdit.availableThemes.map((entry) => entry.displayLabel);
  const examples = catalog.templates.slice(0, 3).map((template, index) => {
    const request = sentenceCase(template.exampleRequest);
    const theme = assetThemes[index % Math.max(assetThemes.length, 1)];
    return theme ? `${request} with ${theme}` : request;
  });

  return [
    `Available games: ${joinList(displayedGames)}${moreGames > 0 ? `, plus ${moreGames} more` : ""}.`,
    `Asset edits: ${joinList(assetThemes.map((theme) => `with ${theme}`))}.`,
    `Try: ${examples.join("; ")}.`
  ];
}

function sentenceCase(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function joinList(values: string[]): string {
  return values.join(", ");
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
  chatPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff"
  },
  portabilityPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff",
    display: "grid",
    gap: "0.75rem"
  },
  portabilityActions: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
    alignItems: "center"
  },
  portabilityField: {
    display: "grid",
    gap: "0.35rem"
  },
  fieldLabel: {
    fontWeight: 700,
    fontSize: "0.875rem"
  },
  portabilityTextarea: {
    width: "100%",
    boxSizing: "border-box" as const,
    minHeight: "7rem",
    resize: "vertical" as const,
    border: "1px solid #a1a1aa",
    borderRadius: "8px",
    padding: "0.65rem",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.78rem",
    lineHeight: 1.35,
    color: "#18181b",
    background: "#fafafa"
  },
  portabilityStatus: {
    margin: 0,
    color: "#0f766e",
    fontWeight: 700
  },
  catalogPanel: {
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    padding: "1rem",
    background: "#ffffff",
    display: "grid",
    gap: "0.75rem"
  },
  catalogGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))",
    gap: "0.75rem"
  },
  catalogColumn: {
    display: "grid",
    gap: "0.45rem",
    alignContent: "start"
  },
  catalogHeading: {
    margin: 0,
    fontSize: "0.92rem",
    color: "#3f3f46"
  },
  catalogList: {
    display: "grid",
    gap: "0.4rem",
    listStyle: "none",
    margin: 0,
    padding: 0
  },
  catalogItem: {
    display: "grid",
    gap: "0.2rem",
    minHeight: "4.3rem",
    border: "1px solid #e4e4e7",
    borderRadius: "8px",
    padding: "0.55rem",
    background: "#fafafa",
    color: "#18181b"
  },
  catalogMeta: {
    fontSize: "0.78rem",
    color: "#52525b",
    overflowWrap: "anywhere" as const
  },
  catalogEmpty: {
    margin: 0,
    color: "#52525b"
  },
  commandForm: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
    alignItems: "center"
  },
  commandLabelGroup: {
    position: "relative" as const,
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    whiteSpace: "nowrap" as const
  },
  commandLabel: {
    fontWeight: 700,
    whiteSpace: "nowrap" as const
  },
  tipAnchor: {
    position: "relative" as const,
    display: "inline-flex",
    alignItems: "center"
  },
  tipButton: {
    width: "1.35rem",
    height: "1.35rem",
    borderRadius: "999px",
    border: "1px solid #0f766e",
    background: "#ecfdf5",
    color: "#064e3b",
    fontWeight: 800,
    lineHeight: 1,
    cursor: "help"
  },
  tipPanel: {
    position: "absolute" as const,
    left: 0,
    bottom: "calc(100% + 0.5rem)",
    zIndex: 5,
    width: "min(28rem, calc(100vw - 2rem))",
    display: "grid",
    gap: "0.35rem",
    border: "1px solid #0f766e",
    borderRadius: "8px",
    background: "#f8fafc",
    color: "#18181b",
    boxShadow: "0 18px 40px rgba(24, 24, 27, 0.18)",
    padding: "0.65rem 0.75rem",
    whiteSpace: "normal" as const
  },
  tipLine: {
    margin: 0,
    fontSize: "0.86rem",
    lineHeight: 1.35
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
  inputSourceGroup: {
    display: "inline-grid",
    gridTemplateColumns: "1fr 1fr",
    minWidth: "9rem",
    border: "1px solid #a1a1aa",
    borderRadius: "8px",
    overflow: "hidden"
  },
  inputSourceButton: {
    minHeight: "2.6rem",
    border: 0,
    background: "#ffffff",
    color: "#3f3f46",
    padding: "0.55rem 0.75rem",
    fontWeight: 700
  },
  inputSourceButtonActive: {
    minHeight: "2.6rem",
    border: 0,
    background: "#dbeafe",
    color: "#1e3a8a",
    padding: "0.55rem 0.75rem",
    fontWeight: 800
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
