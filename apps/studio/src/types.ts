import type {
  BuilderAssetEdit,
  BuilderCatalog,
  BuilderInputSource,
  BuilderProfileExport,
  GameAssemblyProfile,
  MoonshineTranscriptRecord
} from "@playcraft/contracts";

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
  activeAssetEdit?: BuilderAssetEdit;
  sessionId: string;
  activeProfileId?: string;
  profiles: GameAssemblyProfile[];
  timeline: StudioTimelineEntry[];
}

export interface StudioAssembleInput {
  sessionId?: string;
  idea: string;
  source?: BuilderInputSource;
  speechTranscript?: MoonshineTranscriptRecord;
}

export interface StudioChangeInput {
  sessionId: string;
  changeRequest: string;
  source?: BuilderInputSource;
  speechTranscript?: MoonshineTranscriptRecord;
}

export interface StudioClient {
  catalog?(): BuilderCatalog | Promise<BuilderCatalog>;
  assembleFromIntent(input: StudioAssembleInput): StudioSessionSnapshot | Promise<StudioSessionSnapshot>;
  exportProfile?(sessionId: string): BuilderProfileExport | Promise<BuilderProfileExport>;
  importProfile?(input: { profileExport: BuilderProfileExport; sessionId?: string }): StudioSessionSnapshot | Promise<StudioSessionSnapshot>;
  previewAction?(sessionId: string): StudioSessionSnapshot | Promise<StudioSessionSnapshot>;
  requestChange(input: StudioChangeInput): StudioSessionSnapshot | Promise<StudioSessionSnapshot>;
  reset?(): void;
}
