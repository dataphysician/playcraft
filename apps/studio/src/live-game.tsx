import React from "react";
import { GameAssemblyProfileSchema } from "@playcraft/contracts";
import type { GameAssemblyProfile } from "@playcraft/contracts";
import { createProfileLibraryAssetReplacements } from "./asset-library.js";
import type { StudioTimelineEntry } from "./types.js";
import type { LiveGameInteraction } from "./live-game/helpers.js";
import type { AudioCue } from "./live-game/audio-cue.js";
import {
  liveGameComponentKey,
  liveTemplateForProfile,
  requiredComponentByCapability,
  requiredSequenceChoiceComponent,
  tokenStyleCatalogForSurface,
  useProfileAssetReplacements,
  validateMemorySurfaceProps,
  validateSortingSurfaceProps,
  validateSequenceSurfaceProps
} from "./live-game/helpers.js";
import { EmptyGameHero } from "./live-game/empty-state.js";
import { LiveGameError } from "./live-game/live-game-error.js";
import { MemoryGame } from "./live-game/memory-game.js";
import { SortingGame } from "./live-game/sorting-game.js";
import { SequenceGame } from "./live-game/sequence-game.js";
import { liveStyles } from "./live-game/styles.js";
import { liveGameCss, liveMotionCss, liveA11yCss } from "./live-game/styles-css.js";

export type AssetReplacementInput = Record<string, string | { uri: string; altText?: string }>;

export interface LiveGameProps {
  profile?: GameAssemblyProfile;
  assetReplacements?: AssetReplacementInput;
  onInteraction?: (interaction: LiveGameInteraction) => void;
  timeline?: StudioTimelineEntry[];
  activeProfileId?: string;
  streamError?: string | null;
  onRetry?: () => void;
  onAudioCue?: (cue: AudioCue) => void;
}

export type { LiveGameInteraction } from "./live-game/helpers.js";
export type { AudioCue } from "./live-game/audio-cue.js";
export { audioCueForEvent } from "./live-game/audio-cue.js";
export { createProfileAssetReplacementLookup, useProfileAssetReplacements } from "./live-game/helpers.js";

export interface LiveGameProps {
  profile?: GameAssemblyProfile;
  assetReplacements?: Record<string, string | { uri: string; altText?: string }>;
  onInteraction?: (interaction: LiveGameInteraction) => void;
  timeline?: StudioTimelineEntry[];
  activeProfileId?: string;
  streamError?: string | null;
  onRetry?: () => void;
  onAudioCue?: (cue: AudioCue) => void;
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}

export function LiveGame({ profile, assetReplacements, onInteraction, timeline, activeProfileId, streamError, onRetry, onAudioCue }: LiveGameProps): React.ReactElement {
  const [progressText, setProgressText] = React.useState("");
  const [isResetting, setIsResetting] = React.useState(false);
  const previousProfileIdRef = React.useRef<string | undefined>(undefined);
  const resetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    if (!timeline || timeline.length === 0) {
      setProgressText("");
      return;
    }
    const lastEntry = timeline[timeline.length - 1]!;
    if (lastEntry.kind === "lifecycle") {
      if (lastEntry.title === "RunStarted") {
        setProgressText("Assembling...");
      } else if (lastEntry.title === "RunFinished") {
        setProgressText("Ready");
      } else {
        setProgressText("");
      }
    } else if (lastEntry.kind === "tool") {
      setProgressText("Generating assets...");
    } else {
      setProgressText("");
    }
  }, [timeline]);

  React.useEffect(() => {
    if (previousProfileIdRef.current !== undefined && activeProfileId !== undefined && previousProfileIdRef.current !== activeProfileId) {
      if (prefersReducedMotion) {
        setIsResetting(false);
      } else {
        setIsResetting(true);
        resetTimerRef.current = setTimeout(() => {
          setIsResetting(false);
          resetTimerRef.current = null;
        }, 300);
      }
    }
    previousProfileIdRef.current = activeProfileId;
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [activeProfileId, prefersReducedMotion]);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement("style", null, liveMotionCss + liveGameCss + liveA11yCss),
    streamError ? React.createElement(LiveGameError, { message: streamError, onRetry })
      : isResetting ? React.createElement("div", { className: "loading-placeholder" }, "Loading new game...")
      : profile ? React.createElement(LiveGameForProfile, { profile, assetReplacements, onInteraction, progressText, isLoading: isResetting, onAudioCue })
      : React.createElement(EmptyGameHero)
  );
}

function LiveGameForProfile({
  profile,
  assetReplacements,
  onInteraction,
  progressText,
  isLoading,
  onAudioCue
}: {
  profile: GameAssemblyProfile;
  assetReplacements?: Record<string, string | { uri: string; altText?: string }>;
  onInteraction?: (interaction: LiveGameInteraction) => void;
  progressText?: string;
  isLoading?: boolean;
  onAudioCue?: (cue: AudioCue) => void;
}): React.ReactElement {
  const parsedProfile = GameAssemblyProfileSchema.safeParse(profile);
  if (!parsedProfile.success) {
    return React.createElement(LiveGameError, { message: `saved profile failed schema validation: ${parsedProfile.error.message}` });
  }

  const profileParsed = parsedProfile.data;
  const template = liveTemplateForProfile(profileParsed);
  const liveSurface = template.liveSurface;
  const tokenStyleCatalog = tokenStyleCatalogForSurface(liveSurface);
  const libraryAssetReplacementResult = React.useMemo(() => {
    try {
      return { ok: true as const, value: createProfileLibraryAssetReplacements(profileParsed) };
    } catch (cause) {
      return { ok: false as const, message: errorMessage(cause, "live game asset replacement lookup failed") };
    }
  }, [profileParsed]);
  const libraryAssetReplacements = libraryAssetReplacementResult.ok ? libraryAssetReplacementResult.value : {};
  const mergedAssetReplacements = React.useMemo(
    () => ({ ...libraryAssetReplacements, ...assetReplacements }),
    [assetReplacements, libraryAssetReplacements]
  );
  const replacements = useProfileAssetReplacements(profileParsed, mergedAssetReplacements);

  if (!libraryAssetReplacementResult.ok) {
    return React.createElement(LiveGameError, { message: libraryAssetReplacementResult.message });
  }

  try {
    switch (liveSurface.kind) {
      case "memory": {
        const component = requiredComponentByCapability(profileParsed, liveSurface.componentCapabilities.primary);
        validateMemorySurfaceProps(profileParsed.id, component, tokenStyleCatalog);
        return React.createElement(MemoryGame, {
          key: liveGameComponentKey(profileParsed, component),
          profile: profileParsed,
          component,
          replacements,
          tokenStyleCatalog,
          onInteraction,
          progressText,
          isLoading,
          onAudioCue
        });
      }
      case "sorting": {
        const component = requiredComponentByCapability(profileParsed, liveSurface.componentCapabilities.primary);
        validateSortingSurfaceProps(profileParsed.id, component, tokenStyleCatalog);
        return React.createElement(SortingGame, {
          key: liveGameComponentKey(profileParsed, component),
          profile: profileParsed,
          component,
          replacements,
          tokenStyleCatalog,
          onInteraction,
          progressText,
          isLoading,
          onAudioCue
        });
      }
      case "sequence": {
        const sequenceComponent = requiredComponentByCapability(profileParsed, liveSurface.componentCapabilities.primary);
        const choiceComponent = requiredSequenceChoiceComponent(profileParsed, liveSurface);
        validateSequenceSurfaceProps(profileParsed.id, sequenceComponent, choiceComponent, tokenStyleCatalog);
        return React.createElement(SequenceGame, {
          key: liveGameComponentKey(profileParsed, sequenceComponent, choiceComponent),
          profile: profileParsed,
          sequenceComponent,
          choiceComponent,
          replacements,
          tokenStyleCatalog,
          onInteraction,
          progressText,
          isLoading,
          onAudioCue
        });
      }
    }
  } catch (cause) {
    return React.createElement(LiveGameError, { message: errorMessage(cause, "live game surface selection failed") });
  }

  return React.createElement(
    "section",
    { role: "status", style: liveStyles.emptyState },
    `${profileParsed.profileName} does not have a live game surface yet.`
  );
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}
