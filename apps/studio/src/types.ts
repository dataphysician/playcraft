import type {
  BuilderAssetEdit,
  BuilderCatalog,
  BuilderInputSource,
  BuilderPreviewInteraction,
  BuilderProfileExport,
  GameAssemblyProfile,
  MoonshineTranscriptRecord,
  PaidOnlineAssemblyCapabilityGap,
  PaidOnlineAssemblyResponse
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
  activeProfile?: GameAssemblyProfile;
  timeline: StudioTimelineEntry[];
}

export interface StudioAssembleInput {
  sessionId?: string;
  idea: string;
  source?: BuilderInputSource;
  moonshineTranscript?: MoonshineTranscriptRecord;
}

export interface StudioChangeInput {
  sessionId: string;
  changeRequest: string;
  source?: BuilderInputSource;
  moonshineTranscript?: MoonshineTranscriptRecord;
}

export interface StudioPaidOnlineAssemblyInput {
  sessionId: string;
  capabilityGap: PaidOnlineAssemblyCapabilityGap;
  paymentConfirmationId: string;
}

export interface StudioClient {
  catalog?(): BuilderCatalog | Promise<BuilderCatalog>;
  assembleFromIntent(input: StudioAssembleInput): StudioSessionSnapshot | Promise<StudioSessionSnapshot>;
  exportProfile?(sessionId: string): BuilderProfileExport | Promise<BuilderProfileExport>;
  importProfile?(input: { profileExport: BuilderProfileExport; sessionId: string }): StudioSessionSnapshot | Promise<StudioSessionSnapshot>;
  previewAction?(input: { interaction: BuilderPreviewInteraction; sessionId: string }): StudioSessionSnapshot | Promise<StudioSessionSnapshot>;
  requestChange(input: StudioChangeInput): StudioSessionSnapshot | Promise<StudioSessionSnapshot>;
  requestPaidOnlineAssembly?(input: StudioPaidOnlineAssemblyInput): PaidOnlineAssemblyResponse | Promise<PaidOnlineAssemblyResponse>;
  reset?(): void;
}
