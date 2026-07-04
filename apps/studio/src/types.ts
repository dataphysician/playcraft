import type { BuilderInputSource, GameAssemblyProfile } from "@playcraft/contracts";

export type StudioTimelineKind = "lifecycle" | "state" | "activity" | "tool" | "custom" | "frontend";

export interface StudioTimelineEntry {
  id: string;
  kind: StudioTimelineKind;
  title: string;
  detail: string;
  timestamp: string;
  profileId?: string;
  rawEvent?: unknown;
}

export interface StudioSessionSnapshot {
  sessionId: string;
  activeProfileId?: string;
  profiles: GameAssemblyProfile[];
  timeline: StudioTimelineEntry[];
}

export interface StudioAssembleInput {
  sessionId?: string;
  idea: string;
  source?: BuilderInputSource;
}

export interface StudioChangeInput {
  sessionId: string;
  changeRequest: string;
  source?: BuilderInputSource;
}

export interface StudioClient {
  assembleFromIntent(input: StudioAssembleInput): StudioSessionSnapshot | Promise<StudioSessionSnapshot>;
  requestChange(input: StudioChangeInput): StudioSessionSnapshot | Promise<StudioSessionSnapshot>;
  reset?(): void;
}
