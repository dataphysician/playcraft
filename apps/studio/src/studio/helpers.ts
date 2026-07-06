import type { StudioSessionSnapshot } from "../types.js";
import type { TrustedPreviewComponentSummary } from "../trusted-preview.js";
import type { GameAssemblyProfile, BuilderCatalog } from "@playcraft/contracts";
import type { PendingCommand } from "../studio-app.js";

export function initialTimelineEntryId(session: StudioSessionSnapshot | undefined): string | undefined {
  const [entry] = session?.timeline ?? [];
  return entry?.id;
}

export function latestTimelineEntryId(session: StudioSessionSnapshot): string | undefined {
  const [entry] = session.timeline.slice(-1);
  return entry?.id;
}

export function primaryPreviewComponentKey(componentSummaries: TrustedPreviewComponentSummary[]): string | undefined {
  const primarySummaries = componentSummaries.filter((component) => component.isPrimaryPreviewSurface);
  return singleValue(primarySummaries)?.componentKey;
}

export function singleValue<TValue>(values: TValue[]): TValue | undefined {
  return values.length === 1 ? values[0] : undefined;
}

export function synchronousCatalog(client: { catalog?: () => unknown }): BuilderCatalog | undefined {
  if (!client.catalog) {
    return undefined;
  }

  try {
    const catalog = client.catalog();
    return isPromiseLike(catalog) ? undefined : (catalog as BuilderCatalog);
  } catch {
    return undefined;
  }
}

export function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value && typeof value.then === "function";
}

export function chatSummaryForSession(mode: PendingCommand, session: StudioSessionSnapshot): string {
  const profile = requireSessionActiveProfile(session, mode);
  const profileName = profile.profileName;
  const assetTheme = session.activeAssetEdit?.theme ?? session.activeAssetEdit?.items?.join(", ");
  const action = mode === "generate" ? "Generated" : "Updated";
  return `${action} ${profileName}${assetTheme ? ` with ${assetTheme} assets` : ""}.`;
}

export function requireSessionActiveProfile(session: StudioSessionSnapshot, actionName: string): GameAssemblyProfile {
  if (!session.activeProfile) {
    throw new Error(`${actionName} response did not include active profile`);
  }

  return session.activeProfile;
}
