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
  emittedToolNames: string[];
  expectedEmittedEvents: string[];
}

const registry = registerPlaycraftTrustedComponents(new TrustedComponentRegistry());
const registries = createDefaultRegistries();
const manifests = registry.manifests();

export function getTrustedPreviewComponents(profile: GameAssemblyProfile): TrustedPreviewComponentSummary[] {
  const replay = replayProfile(profile, registries);

  return replay.renderRequests.map((request, index) => {
    const manifest = manifestForRenderRequest(request);
    const componentId = request.componentId ?? manifest?.id;
    const componentCapability = request.componentCapability ?? manifest?.renderCapability;
    if (!componentId || !componentCapability) {
      throw new Error(`trusted preview request ${request.id} does not include a concrete component identity`);
    }

    return {
      componentKey: renderRequestKey(request, index),
      componentId,
      componentCapability,
      mechanicBindingId: request.mechanicBindingId,
      emittedToolNames: manifest?.emittedTools.map((tool) => tool.toolName) ?? [],
      expectedEmittedEvents: [...request.expectedEmittedEvents]
    };
  });
}

export function TrustedPreview({ profile, selectedComponentKey, onInteraction }: TrustedPreviewProps): React.ReactElement {
  let replay;
  try {
    replay = replayProfile(profile, registries);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "preview replay failed";
    return React.createElement(PreviewFailure, { failure: { code: "invalid-request", message } });
  }

  const request =
    selectedComponentKey === undefined
      ? replay.renderRequests[0]
      : replay.renderRequests.find((candidate, index) => renderRequestKey(candidate, index) === selectedComponentKey) ??
        replay.renderRequests[0];

  if (!request) {
    return React.createElement("div", { role: "status" }, "No trusted preview request is available.");
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
  if (request.componentId) {
    return request.componentId;
  }

  if (request.componentCapability) {
    return `${request.componentCapability}.${index}`;
  }

  throw new Error(`trusted preview request ${request.id} does not include a component identity`);
}

function manifestForRenderRequest(request: ComponentRenderRequest) {
  return manifests.find(
    (candidate) =>
      candidate.id === request.componentId ||
      (request.componentCapability !== undefined && candidate.renderCapability === request.componentCapability)
  );
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
