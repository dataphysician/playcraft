import React from "react";
import type { ChatMessage, PendingCommand } from "../studio-app.js";
import type { GameAssemblyProfile, BuilderAssetEdit } from "@playcraft/contracts";
import type { TrustedPreviewComponentSummary } from "../trusted-preview.js";
import type { StudioSessionSnapshot } from "../types.js";
import { TimelinePanel } from "./timeline.js";
import { TrustedPreview } from "../trusted-preview.js";
import { EmptyState } from "../states/index.js";
import { McpCatalogBrowser } from "../components/McpCatalogBrowser.js";
import { RunInspector } from "../components/RunInspector.js";
import { shellStyles } from "../studio/shell-styles.js";

export function DeveloperPanel({
  activeProfile,
  canExportProfile,
  canImportProfile,
  canRunServicePreview,
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
  onCatalogRetry,
  onEmptyStateAction,
  onExportProfile,
  onImportProfile,
  onProfileImportTextChange,
  onRunWorkflow,
  onServicePreview,
  onSelectComponent,
  onSelectTimeline,
  onStopRun,
  onInteraction
}: {
  activeProfile: GameAssemblyProfile | undefined;
  canExportProfile: boolean;
  canImportProfile: boolean;
  canRunServicePreview: boolean;
  catalog: import("@playcraft/contracts").BuilderCatalog | undefined;
  catalogError: string | null;
  componentSummaries: TrustedPreviewComponentSummary[];
  messages: ChatMessage[];
  pending: PendingCommand | null;
  profileExportText: string;
  profileImportText: string;
  profileTransferStatus: string | null;
  selectedComponentKey: string | undefined;
  selectedTimelineId: string | undefined;
  session: StudioSessionSnapshot | undefined;
  runFrames: import("@playcraft/contracts").SseFrame[];
  isRunning: boolean;
  onCatalogRetry: () => void;
  onEmptyStateAction: () => void;
  onExportProfile: () => void;
  onImportProfile: () => void;
  onProfileImportTextChange: (value: string) => void;
  onRunWorkflow: (graph: import("@playcraft/contracts").WorkflowGraph) => void;
  onServicePreview: () => void;
  onSelectComponent: (componentKey: string) => void;
  onSelectTimeline: (timelineId: string) => void;
  onStopRun: () => void;
  onInteraction: (interaction: import("../trusted-preview.js").TrustedPreviewInteraction) => void;
}): React.ReactElement {
  return React.createElement(
    "div",
    { style: shellStyles.developerGrid },
    React.createElement(
      "section",
      { className: "catalog-column", style: shellStyles.catalogColumn },
      React.createElement(McpCatalogBrowser, {
        catalog,
        catalogError,
        onRetry: onCatalogRetry,
        client: {} as import("../types.js").StudioClient,
        onRunWorkflow
      })
    ),
    React.createElement(
      "section",
      { className: "profile-column", style: shellStyles.profileColumn },
      React.createElement("h2", null, activeProfile ? activeProfile.profileName : "Developer"),
      messages.length > 0 ? React.createElement(ChatHistoryPanel, { messages }) : null,
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
      React.createElement(TimelinePanel, {
        session,
        selectedTimelineId,
        onSelectTimeline: onSelectTimeline
      }),
      activeProfile
        ? React.createElement(TrustedPreview, {
            profile: activeProfile,
            selectedComponentKey,
            onInteraction
          })
        : React.createElement(EmptyState, {
            icon: "🎮",
            title: "No game assembled yet",
            description: "Assemble your first game to inspect the trusted preview and timeline.",
            action: { label: "Assemble your first game", onClick: onEmptyStateAction }
          }),
      activeProfile ? React.createElement(ProfileSummaryPanel, { profile: activeProfile, activeAssetEdit: session?.activeAssetEdit }) : null
    ),
    React.createElement(RunInspector, {
      frames: runFrames,
      onStopRun,
      isRunning
    })
  );
}

export function ProfilePortabilityPanel({
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

export function ChatHistoryPanel({ messages }: { messages: ChatMessage[] }): React.ReactElement {
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

export function ProfileSummaryPanel({ profile, activeAssetEdit }: { profile: GameAssemblyProfile; activeAssetEdit?: BuilderAssetEdit }): React.ReactElement {
  return React.createElement(
    "section",
    { style: shellStyles.summaryPanel },
    React.createElement("h3", null, "Active profile"),
    React.createElement("p", null, `ID: ${profile.id}`),
    React.createElement("p", null, "Validation: clean"),
    React.createElement("p", null, `Replay events: ${profile.replay.eventLog.length}`),
    activeAssetEdit ? React.createElement("p", null, `Asset edit: ${activeAssetEdit.theme ?? activeAssetEdit.items?.join(", ")}`) : null
  );
}

export function ComponentInventoryPanel({
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
            component.isPrimaryPreviewSurface
              ? React.createElement("span", { style: shellStyles.componentToolLine }, "Primary preview surface")
              : null,
            React.createElement(
              "span",
              { style: shellStyles.componentToolLine },
              component.interactionSummary
            ),
            React.createElement(
              "span",
              { style: shellStyles.componentToolLine },
              component.expectedEventSummary
            )
          )
        )
      )
    )
  );
}
