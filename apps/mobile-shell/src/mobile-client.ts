import {
  type AudioCue,
  createConfiguredStudioClient,
  type StudioClient
} from "@playcraft/studio";

export const MOBILE_SHELL_CLIENT_POLICY = {
  defaultSessionId: "mobile.session",
  defaultTimelineIdPrefix: "mobile.timeline"
} as const;

export interface MobileAudioCueListener {
  /** Callback that conforms to LiveGame's onAudioCue prop signature. */
  onAudioCue: (cue: AudioCue) => void;
  /** Read-only view of every AudioCue the listener has received. */
  readonly cues: readonly AudioCue[];
  /** Drop every received cue (used between test scenarios). */
  clear(): void;
}

export const MOBILE_AUDIO_CUE_LISTENER_POLICY = {
  /** Loudest AudioCue volume any cue may carry. */
  maxVolume: 1,
  /** Longest AudioCue duration any cue may carry (ms). */
  maxDurationMs: 1000
} as const;

/**
 * Build a mobile-platform audio cue listener that fans AudioCue metadata
 * received from `LiveGame` into an inspectable buffer. The handler is
 * intentionally metadata-only: callers are free to forward cues to a
 * platform-specific audio backend (e.g. `window.AudioContext` on web,
 * a Tauri mobile bridge) without coupling the listener to playback.
 */
export function createMobileAudioCueListener(): MobileAudioCueListener {
  const cues: AudioCue[] = [];

  return {
    onAudioCue(cue: AudioCue) {
      if (cue.volume < 0 || cue.volume > MOBILE_AUDIO_CUE_LISTENER_POLICY.maxVolume) {
        return;
      }
      if (cue.duration < 0 || cue.duration > MOBILE_AUDIO_CUE_LISTENER_POLICY.maxDurationMs) {
        return;
      }
      cues.push(cue);
    },
    get cues() {
      return cues;
    },
    clear() {
      cues.length = 0;
    }
  };
}

export function createMobileShellStudioClient(serviceEndpoint?: string): StudioClient {
  return createConfiguredStudioClient({
    defaultSessionId: MOBILE_SHELL_CLIENT_POLICY.defaultSessionId,
    serviceEndpoint,
    timelineIdPrefix: MOBILE_SHELL_CLIENT_POLICY.defaultTimelineIdPrefix
  });
}
