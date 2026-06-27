import React from "react";
import type { GameAssemblyProfile, JsonValue } from "@playcraft/contracts";
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
  onInteraction?: (interaction: TrustedPreviewInteraction) => void;
}

const registry = registerPlaycraftTrustedComponents(new TrustedComponentRegistry());
const registries = createDefaultRegistries();

export function TrustedPreview({ profile, onInteraction }: TrustedPreviewProps): React.ReactElement {
  let replay;
  try {
    replay = replayProfile(profile, registries);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "preview replay failed";
    return React.createElement(PreviewFailure, { failure: { code: "invalid-request", message } });
  }

  const request = replay.renderRequests[0];

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
        border: "1px solid #334155",
        borderRadius: "0.75rem",
        padding: "1rem",
        background: "#0f172a",
        color: "#e2e8f0"
      }
    },
    rendered.element
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
        border: "1px solid #7f1d1d",
        borderRadius: "0.75rem",
        padding: "1rem",
        background: "#450a0a",
        color: "#fecaca"
      }
    },
    React.createElement("strong", null, `Trusted preview blocked: ${failure.code}`),
    React.createElement("pre", { style: { whiteSpace: "pre-wrap" } }, failure.message)
  );
}
