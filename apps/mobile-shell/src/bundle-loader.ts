import {
  GameBundleSchema,
  type GameAssemblyProfile,
  type ComponentRenderRequest,
  type GameBundle
} from "@playcraft/contracts";
import {
  createEmptyRegistries,
  replayProfile,
  type PlaycraftRegistries
} from "@playcraft/core";

export interface LoadedGameBundle {
  profile: GameAssemblyProfile;
  renderRequests: ComponentRenderRequest[];
  registries: PlaycraftRegistries;
}

/**
 * Validate a `GameBundle` against `GameBundleSchema`, register the bundled
 * snapshot into a fresh `PlaycraftRegistries` instance, and replay the
 * profile against it. Returns the replay result plus the constructed
 * registries for callers that want to inspect them.
 */
export function loadGameBundle(bundleInput: unknown): LoadedGameBundle {
  const bundle = GameBundleSchema.parse(bundleInput);
  const registries = createEmptyRegistries();
  registries.mechanics.registerMany(bundle.registries.mechanics);
  registries.rules.registerMany(bundle.registries.rules);
  registries.components.registerMany(bundle.registries.components);
  registries.themes.registerMany(bundle.registries.themes);
  registries.assetSources.registerMany(bundle.registries.assetSources);
  registries.domains.registerMany(bundle.registries.domains);
  registries.safetyPolicies.registerMany(bundle.registries.safetyPolicies);

  const replay = replayProfile(bundle.profileExport.profile, registries);

  return {
    profile: replay.profile,
    renderRequests: replay.renderRequests,
    registries
  };
}

/**
 * Map a `GameBundle`'s optional `assetReplacements` into the `LiveGame` /
 * `LiveGame` style string-or-object record the studio renderer accepts. The
 * loader never resolves URIs itself; that is the renderer's job.
 */
export function bundleAssetReplacementsForLiveGame(
  bundle: GameBundle
): Record<string, string | { uri: string; altText?: string }> {
  if (!bundle.assetReplacements) {
    return {};
  }

  return { ...bundle.assetReplacements };
}
