import { describe, expect, it } from "vitest";
import {
  GameBundleCapEnforcementSchema,
  GameBundleSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type GameBundle
} from "@playcraft/contracts";
import {
  assetSourceManifests,
  assembleMvpProfiles,
  componentManifests,
  domainProfiles,
  mechanicDefinitions,
  ruleModuleDefinitions,
  safetyPolicyPacks,
  themePacks
} from "@playcraft/packs";

import { bundleAssetReplacementsForLiveGame, loadGameBundle } from "../apps/mobile-shell/src/bundle-loader.js";

function baseBundleFixture(): GameBundle {
  const profile = assembleMvpProfiles()[0];
  return GameBundleSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "game-bundle.bundle-loader-fixture",
    version: "1.0.0",
    kind: "game-bundle",
    profileExport: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-profile-export.bundle-loader-fixture",
      version: "1.0.0",
      kind: "builder-profile-export",
      sessionId: "session.bundle-loader-fixture",
      templateId: profile.template.id,
      profile,
      preview: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        sessionId: "session.bundle-loader-fixture",
        activeProfileId: profile.id,
        activeTemplateId: profile.template.id,
        interactionCount: 0
      },
      validation: profile.validation,
      exportedAt: "2026-07-06T00:00:00.000Z",
      provenance: {
        source: "local-llm-agent",
        agentEngine: "lfm2.5-vl-450m-extract",
        assembledBy: "playcraft-bundle-loader.test",
        assembledAt: "2026-07-06T00:00:00.000Z",
        agentTranscriptId: "agent-transcript.session.bundle-loader-fixture"
      }
    },
    registries: {
      mechanics: [...mechanicDefinitions],
      rules: [...ruleModuleDefinitions],
      components: [...componentManifests],
      themes: [...themePacks],
      assetSources: [...assetSourceManifests],
      domains: [...domainProfiles],
      safetyPolicies: [...safetyPolicyPacks]
    },
    assetReplacements: {
      "card.toy-1-a": "https://example.test/toy-1-a.svg"
    },
    capEnforcement: GameBundleCapEnforcementSchema.parse({
      enforcedAt: "2026-07-06T00:00:00.000Z"
    })
  });
}

describe("mobile-shell bundle loader", () => {
  it("rejects input that is not a parseable GameBundle", () => {
    expect(() => loadGameBundle({ kind: "not-a-game-bundle" })).toThrow();
  });

  it("rejects input that omits the required profileExport", () => {
    const bundle = baseBundleFixture() as unknown as Record<string, unknown>;
    delete bundle.profileExport;
    expect(() => loadGameBundle(bundle)).toThrow();
  });

  it("returns a profile, renderRequests, and registries for a minimal valid bundle", () => {
    const bundle = baseBundleFixture();
    const loaded = loadGameBundle(bundle);

    expect(loaded.profile.id).toBe(bundle.profileExport.profile.id);
    expect(loaded.renderRequests).toHaveLength(bundle.profileExport.profile.components.length);
    expect(loaded.registries.mechanics.all().length).toBeGreaterThan(0);
    expect(loaded.registries.components.all().length).toBeGreaterThan(0);
  });

  it("registers bundled snapshot manifests into the returned registries", () => {
    const bundle = baseBundleFixture();
    const componentCount = bundle.profileExport.profile.components.length;
    const loaded = loadGameBundle(bundle);

    const allComponentIds = loaded.registries.components.all().map((entry) => entry.id);
    for (const component of bundle.profileExport.profile.components) {
      expect(allComponentIds).toContain(component.componentId);
    }
    expect(loaded.registries.components.all().length).toBeGreaterThanOrEqual(componentCount);
  });

  it("produces renderRequests that reference the bundled component manifests", () => {
    const bundle = baseBundleFixture();
    const loaded = loadGameBundle(bundle);

    for (const request of loaded.renderRequests) {
      const manifest = loaded.registries.components.get(request.componentId, request.componentVersion);
      expect(manifest).toBeDefined();
      expect(manifest?.renderCapability).toBe(request.componentCapability);
    }
  });

  it("exports bundleAssetReplacementsForLiveGame that returns the same record as the bundle", () => {
    const bundle = baseBundleFixture();
    const replacements = bundleAssetReplacementsForLiveGame(bundle);
    expect(replacements).toEqual(bundle.assetReplacements);
  });

  it("exports bundleAssetReplacementsForLiveGame that returns an empty object when no replacements are present", () => {
    const bundle: GameBundle = {
      ...baseBundleFixture(),
      assetReplacements: undefined
    };
    expect(bundleAssetReplacementsForLiveGame(bundle)).toEqual({});
  });
});
