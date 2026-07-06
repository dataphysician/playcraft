import React from "react";
import {
  BuilderProfileExportSchema,
  type BuilderCatalog,
  type BuilderInputSource,
  type BuilderPreviewInteraction,
  type SseFrame,
  type WorkflowGraph
} from "@playcraft/contracts";
import { executeWorkflowSse } from "@playcraft/service";
import { createLocalPlaycraftService } from "@playcraft/service";
import { LiveGame, type AudioCue, type LiveGameInteraction } from "./live-game.js";
import {
  getTrustedPreviewComponents,
  type TrustedPreviewInteraction
} from "./trusted-preview.js";
import type { StudioClient, StudioSessionSnapshot, StudioTimelineEntry } from "./types.js";
import { DeveloperPanel } from "./studio/panels.js";
import { CommandBar } from "./studio/command-bar.js";
import { shellStyles } from "./studio/shell-styles.js";
import {
  initialTimelineEntryId,
  latestTimelineEntryId,
  primaryPreviewComponentKey,
  synchronousCatalog,
  isPromiseLike,
  chatSummaryForSession,
  requireSessionActiveProfile
} from "./studio/helpers.js";

export interface StudioAppProps {
  client: StudioClient;
  initialSession?: StudioSessionSnapshot;
  onAudioCue?: (cue: AudioCue) => void;
}

export type StudioTab = "live" | "developer";
export type PendingCommand = "export" | "generate" | "import" | "preview" | "update";

export interface ChatMessage {
  id: string;
  speaker: "Studio" | "Transcript" | "You";
  text: string;
}

const SERVICE_PREVIEW_INTERACTION: BuilderPreviewInteraction = { action: "primary" };

export function StudioApp({ client, initialSession, onAudioCue }: StudioAppProps): React.ReactElement {
  const [commandText, setCommandText] = React.useState("");
  const [inputSource, setInputSource] = React.useState<BuilderInputSource>("text");
  const [session, setSession] = React.useState<StudioSessionSnapshot | undefined>(initialSession);
  const [selectedTimelineId, setSelectedTimelineId] = React.useState<string | undefined>(initialTimelineEntryId(initialSession));
  const [selectedComponentKey, setSelectedComponentKey] = React.useState<string | undefined>();
  const [activeTab, setActiveTab] = React.useState<StudioTab>("live");
  const [pending, setPending] = React.useState<PendingCommand | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [catalog, setCatalog] = React.useState<BuilderCatalog | undefined>(() => synchronousCatalog(client));
  const [catalogError, setCatalogError] = React.useState<string | null>(null);
  const [catalogRetryKey, setCatalogRetryKey] = React.useState(0);
  const [profileExportText, setProfileExportText] = React.useState("");
  const [profileImportText, setProfileImportText] = React.useState("");
  const [profileTransferStatus, setProfileTransferStatus] = React.useState<string | null>(null);
  const [runFrames, setRunFrames] = React.useState<SseFrame[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const activeProfile = session?.activeProfile;
  const activeProfileId = activeProfile?.id;
  const selectedComponentProfileIdRef = React.useRef<string | undefined>(activeProfileId);
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
    const profileChanged = selectedComponentProfileIdRef.current !== activeProfileId;
    selectedComponentProfileIdRef.current = activeProfileId;

    setSelectedComponentKey((current) => {
      if (!profileChanged && componentSummaries.some((component) => component.componentKey === current)) {
        return current;
      }

      return primaryPreviewComponentKey(componentSummaries);
    });
  }, [activeProfileId, componentSummaries]);

  React.useEffect(() => {
    let active = true;
    setCatalog(undefined);
    setCatalogError(null);

    if (client.catalog) {
      const nextCatalog = client.catalog();
      if (isPromiseLike(nextCatalog)) {
        void nextCatalog.then((loadedCatalog) => {
          if (active) {
            setCatalog(loadedCatalog);
          }
        }).catch((cause) => {
          if (active) {
            setCatalog(undefined);
            setCatalogError(cause instanceof Error ? cause.message : "Catalog failed to load.");
          }
        });
      } else {
        setCatalog(nextCatalog);
      }
    }

    return () => {
      active = false;
    };
  }, [client, catalogRetryKey]);

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
      setSelectedTimelineId(latestTimelineEntryId(nextSession));
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
      const importedProfile = requireSessionActiveProfile(nextSession, "import-profile");
      setSession(nextSession);
      setSelectedTimelineId(latestTimelineEntryId(nextSession));
      setActiveTab("developer");
      setProfileTransferStatus(`Imported ${importedProfile.profileName}.`);
      setMessages((current) => [
        ...current,
        {
          id: `message.studio.${current.length + 1}`,
          speaker: "Studio",
          text: `Imported ${importedProfile.profileName} from profile export.`
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
      const nextSession = await Promise.resolve(client.previewAction({
        interaction: SERVICE_PREVIEW_INTERACTION,
        sessionId: session.sessionId
      }));
      setSession(nextSession);
      setSelectedTimelineId(latestTimelineEntryId(nextSession));
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
    setCatalogError(null);
    setCatalogRetryKey((key) => key + 1);
  }

  function handleCatalogRetry(): void {
    setCatalogRetryKey((key) => key + 1);
  }

  async function handleRunWorkflow(graph: WorkflowGraph): Promise<void> {
    setIsRunning(true);
    setRunFrames([]);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const service = createLocalPlaycraftService();
      const transport = { send: (request: Parameters<typeof service.handle>[0]) => service.handle(request) };
      const frames: SseFrame[] = [];

      for await (const frame of executeWorkflowSse(graph, transport, "session.run-inspector")) {
        frames.push(frame);
        setRunFrames([...frames]);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }

  function handleStopRun(): void {
    abortControllerRef.current?.abort();
    setIsRunning(false);
  }

  function handleEmptyStateAction(): void {
    setActiveTab("live");
    setTimeout(() => {
      const input = document.getElementById("studio-command");
      if (input) {
        input.focus();
      }
    }, 0);
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
    React.createElement("style", null, `[role="tab"]:focus-visible,.command-bar-button:focus-visible,.input-source-button:focus-visible{outline:2px solid #4A90E2 !important;outline-offset:2px}@media (prefers-reduced-motion: reduce){[role="tab"],.command-bar-button,.input-source-button{transition:none !important}}`),
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
            className: "studio-tab",
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
            className: "studio-tab",
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
        ? React.createElement(LiveGame, { profile: activeProfile, onInteraction: handleInteraction, onAudioCue })
        : React.createElement(DeveloperPanel, {
            activeProfile,
            canExportProfile: Boolean(client.exportProfile),
            canImportProfile: Boolean(client.importProfile),
            canRunServicePreview: Boolean(client.previewAction),
            catalog,
            catalogError,
            componentSummaries,
            messages,
            pending,
            profileExportText,
            profileImportText,
            profileTransferStatus,
            selectedComponentKey,
            selectedTimelineId,
            session,
            runFrames,
            isRunning,
            onCatalogRetry: handleCatalogRetry,
            onEmptyStateAction: handleEmptyStateAction,
            onExportProfile: handleExportProfile,
            onImportProfile: handleImportProfile,
            onProfileImportTextChange: setProfileImportText,
            onRunWorkflow: handleRunWorkflow,
            onServicePreview: handleServicePreview,
            onSelectComponent: setSelectedComponentKey,
            onSelectTimeline: setSelectedTimelineId,
            onStopRun: handleStopRun,
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
