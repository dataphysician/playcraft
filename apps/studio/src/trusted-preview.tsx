import React from "react";
import type { ComponentRenderRequest, GameAssemblyProfile, JsonValue } from "@playcraft/contracts";
import { replayProfile } from "@playcraft/core";
import { registerPlaycraftTrustedComponents } from "@playcraft/packs";
import { TrustedComponentRegistry, type TrustedRenderFailure } from "@playcraft/renderer";
import { createDefaultRegistries } from "@playcraft/packs";

export interface TrustedPreviewInteraction {
  eventName: string;
  payload: JsonValue;
  profileId: string;
}

export interface TrustedPreviewProps {
  profile: GameAssemblyProfile;
  selectedComponentKey?: string;
  onInteraction?: (interaction: TrustedPreviewInteraction) => void;
}

export interface TrustedPreviewComponentSummary {
  componentKey: string;
  componentId: string;
  componentCapability: string;
  mechanicBindingId: string;
  isPrimaryPreviewSurface: boolean;
  emittedToolNames: string[];
  interactionSummary: string;
  expectedEmittedEvents: string[];
}

const registry = registerPlaycraftTrustedComponents(new TrustedComponentRegistry());
const registries = createDefaultRegistries();
const manifests = registry.manifests();

export function getTrustedPreviewComponents(profile: GameAssemblyProfile): TrustedPreviewComponentSummary[] {
  const replay = replayProfile(profile, registries);
  const primaryCapability = profile.template.liveSurface.componentCapabilities.primary;

  return replay.renderRequests.map((request, index) => {
    const manifest = manifestForRenderRequest(request);
    const componentId = request.componentId;
    const componentCapability = request.componentCapability;

    return {
      componentKey: renderRequestKey(request, index),
      componentId,
      componentCapability,
      mechanicBindingId: request.mechanicBindingId,
      isPrimaryPreviewSurface: componentCapability === primaryCapability,
      emittedToolNames: manifest?.emittedTools.map((tool) => tool.toolName) ?? [],
      interactionSummary: interactionSummaryFor(manifest?.emittedTools.map((tool) => tool.toolName) ?? [], request.expectedEmittedEvents),
      expectedEmittedEvents: [...request.expectedEmittedEvents]
    };
  });
}

function interactionSummaryFor(toolNames: string[], expectedEmittedEvents: string[]): string {
  if (toolNames.length > 0) {
    return `tools: ${toolNames.join(", ")}`;
  }

  return expectedEmittedEvents.length > 0
    ? `events: ${expectedEmittedEvents.join(", ")}`
    : "events: none";
}

export function TrustedPreview({ profile, selectedComponentKey, onInteraction }: TrustedPreviewProps): React.ReactElement {
  let replay;
  try {
    replay = replayProfile(profile, registries);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "preview replay failed";
    return React.createElement(PreviewFailure, { failure: { code: "invalid-request", message } });
  }

  const request = selectedComponentKey === undefined
    ? renderRequestForTemplatePrimary(profile, replay.renderRequests)
    : replay.renderRequests.find((candidate, index) => renderRequestKey(candidate, index) === selectedComponentKey);

  if (!request) {
    if (selectedComponentKey !== undefined) {
      return React.createElement(PreviewFailure, {
        failure: {
          code: "invalid-request",
          message: `selected trusted preview component ${selectedComponentKey} is not available in profile ${profile.id}`
        }
      });
    }

    return React.createElement(PreviewFailure, {
      failure: {
        code: "invalid-request",
        message: `profile ${profile.id} does not include live-surface primary component ${profile.template.liveSurface.componentCapabilities.primary}`
      }
    });
  }

  const rendered = registry.render(request, profile.assets, (eventName, payload) => {
    onInteraction?.({ eventName, payload, profileId: profile.id });
  });

  if (!rendered.ok) {
    return React.createElement(PreviewFailure, { failure: rendered.error });
  }

  return React.createElement(
    "div",
    {
      "data-testid": "trusted-preview-surface",
      style: {
        minHeight: "20rem",
        border: "1px solid #d4d4d8",
        borderRadius: "8px",
        padding: "1rem",
        background: "#ffffff",
        color: "#18181b"
      }
    },
    rendered.element
  );
}

function renderRequestKey(request: ComponentRenderRequest, index: number): string {
  return `${request.componentId}.${index}`;
}

function renderRequestForTemplatePrimary(
  profile: GameAssemblyProfile,
  renderRequests: ComponentRenderRequest[]
): ComponentRenderRequest | undefined {
  const primaryCapability = profile.template.liveSurface.componentCapabilities.primary;
  return renderRequests.find((request) => request.componentCapability === primaryCapability);
}

function manifestForRenderRequest(request: ComponentRenderRequest) {
  return manifests.find((candidate) => candidate.id === request.componentId);
}

function PreviewFailure({ failure }: { failure: TrustedRenderFailure["error"] }): React.ReactElement {
  return React.createElement(
    "div",
    {
      role: "alert",
      "data-testid": "trusted-preview-error",
      style: {
        minHeight: "20rem",
        border: "1px solid #b91c1c",
        borderRadius: "8px",
        padding: "1rem",
        background: "#fef2f2",
        color: "#7f1d1d"
      }
    },
    React.createElement("strong", null, `Trusted preview blocked: ${failure.code}`),
    React.createElement("pre", { style: { whiteSpace: "pre-wrap" } }, failure.message)
  );
}
