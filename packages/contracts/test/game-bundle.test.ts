import { describe, expect, it } from "vitest";
import {
  BuilderProfileExportSchema,
  GameBundleCapEnforcementSchema,
  GameBundleSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  PlaycraftRegistriesSnapshotSchema,
  PublicContractSchemas,
  type GameBundle
} from "@playcraft/contracts";
import {
  assembleMvpProfiles,
  assetSourceManifests,
  componentManifests,
  domainProfiles,
  mechanicDefinitions,
  ruleModuleDefinitions,
  safetyPolicyPacks,
  themePacks
} from "@playcraft/packs";

function profileExportFixture() {
  const profile = assembleMvpProfiles()[0];
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "builder-profile-export.bundle-fixture",
    version: "1.0.0",
    kind: "builder-profile-export",
    sessionId: "session.bundle-fixture",
    templateId: profile.template.id,
    profile,
    preview: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      sessionId: "session.bundle-fixture",
      activeProfileId: profile.id,
      activeTemplateId: profile.template.id,
      interactionCount: 0
    },
    validation: profile.validation,
    exportedAt: "2026-07-06T00:00:00.000Z",
    provenance: {
      source: "local-llm-agent",
      agentEngine: "lfm2.5-vl-450m-extract",
      assembledBy: "playcraft-bundle-fixture",
      assembledAt: "2026-07-06T00:00:00.000Z",
      agentTranscriptId: "agent-transcript.session.bundle-fixture"
    }
  } as const;
}

function baseBundleFixture(): GameBundle {
  return GameBundleSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "game-bundle.fixture",
    version: "1.0.0",
    kind: "game-bundle",
    profileExport: profileExportFixture(),
    registries: {
      mechanics: [mechanicDefinitions[0]],
      rules: [ruleModuleDefinitions[0]],
      components: [componentManifests[0]],
      themes: [themePacks[0]],
      assetSources: [assetSourceManifests[0]],
      domains: [domainProfiles[0]],
      safetyPolicies: [safetyPolicyPacks[0]]
    },
    assetReplacements: {
      "card.toy-1-a": "https://example.test/assets/toy-1-a.svg",
      "card.toy-1-b": { uri: "https://example.test/assets/toy-1-b.svg", altText: "Toy 1 B" }
    },
    capEnforcement: GameBundleCapEnforcementSchema.parse({
      enforcedAt: "2026-07-06T00:00:00.000Z"
    })
  });
}

describe("GameBundle contract", () => {
  it("registers GameBundleSchema in the public contract schemas and exports PlaycraftRegistriesSnapshotSchema from the barrel", () => {
    expect(PublicContractSchemas.GameBundleSchema).toBe(GameBundleSchema);
    expect(GameBundleSchema).toBeDefined();
    expect(PlaycraftRegistriesSnapshotSchema).toBeDefined();
  });

  it("validates a minimal valid game bundle with required profileExport and registries", () => {
    const bundle = baseBundleFixture();

    expect(bundle.kind).toBe("game-bundle");
    expect(bundle.profileExport.sessionId).toBe("session.bundle-fixture");
    expect(bundle.registries.mechanics).toHaveLength(1);
    expect(bundle.registries.components).toHaveLength(1);
    expect(bundle.assetReplacements?.["card.toy-1-a"]).toBe("https://example.test/assets/toy-1-a.svg");
    expect(bundle.assetReplacements?.["card.toy-1-b"]).toEqual({
      uri: "https://example.test/assets/toy-1-b.svg",
      altText: "Toy 1 B"
    });
    expect(bundle.capEnforcement.enforcedAt).toBe("2026-07-06T00:00:00.000Z");
  });

  it("rejects bundles that declare an unknown kind discriminator", () => {
    const result = GameBundleSchema.safeParse({
      ...baseBundleFixture(),
      kind: "not-a-game-bundle"
    });
    expect(result.success).toBe(false);
  });

  it("rejects bundles that omit the profileExport payload", () => {
    const fixture = baseBundleFixture() as unknown as Record<string, unknown>;
    delete fixture.profileExport;
    const result = GameBundleSchema.safeParse(fixture);
    expect(result.success).toBe(false);
  });

  it("rejects bundles that omit the registries snapshot", () => {
    const fixture = baseBundleFixture() as unknown as Record<string, unknown>;
    delete fixture.registries;
    const result = GameBundleSchema.safeParse(fixture);
    expect(result.success).toBe(false);
  });

  it("treats every registries array as optional and defaults missing arrays to empty", () => {
    const result = PlaycraftRegistriesSnapshotSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mechanics).toEqual([]);
      expect(result.data.rules).toEqual([]);
      expect(result.data.components).toEqual([]);
      expect(result.data.themes).toEqual([]);
      expect(result.data.assetSources).toEqual([]);
      expect(result.data.domains).toEqual([]);
      expect(result.data.safetyPolicies).toEqual([]);
    }
  });

  it("round-trips the registries snapshot through JSON parse and stringify", () => {
    const bundle = baseBundleFixture();
    const json = JSON.parse(JSON.stringify(bundle)) as unknown;

    expect(PlaycraftRegistriesSnapshotSchema.safeParse((json as GameBundle).registries).success).toBe(true);
    expect(GameBundleSchema.safeParse(json).success).toBe(true);
  });

  it("rejects unknown additional properties on a strict GameBundle", () => {
    const fixture = baseBundleFixture() as unknown as Record<string, unknown>;
    fixture.surpriseField = "surprise";
    expect(GameBundleSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects unknown additional properties on a strict PlaycraftRegistriesSnapshot", () => {
    expect(PlaycraftRegistriesSnapshotSchema.safeParse({ mechanics: [], surpriseField: 1 }).success).toBe(false);
  });

  it("rejects BuilderProfileExportSchema when provenance is missing (now required)", () => {
    const fixture = profileExportFixture() as unknown as Record<string, unknown>;
    delete fixture.provenance;
    expect(BuilderProfileExportSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects BuilderProfileExportSchema when provenance has a stray retrieval field", () => {
    const fixture = profileExportFixture() as unknown as Record<string, unknown>;
    delete fixture.provenance;
    fixture.provenance = { retrieval: { current: "bundled-local" } };
    expect(BuilderProfileExportSchema.safeParse(fixture).success).toBe(false);
  });

  it("accepts BuilderProfileExportSchema with a provenance payload of source 'local-llm-agent'", () => {
    const parsed = BuilderProfileExportSchema.parse({
      ...profileExportFixture(),
      provenance: {
        source: "local-llm-agent",
        agentEngine: "lfm2.5-vl-450m-extract",
        assembledBy: "playcraft-studio",
        assembledAt: "2026-07-06T00:00:00.000Z",
        agentTranscriptId: "agent-transcript.session.bundle-fixture"
      }
    });
    expect(parsed.provenance.source).toBe("local-llm-agent");
    expect(parsed.provenance.agentEngine).toBe("lfm2.5-vl-450m-extract");
    expect(parsed.provenance.assembledBy).toBe("playcraft-studio");
    expect(parsed.provenance.assembledAt).toBe("2026-07-06T00:00:00.000Z");
  });

  it("accepts BuilderProfileExportSchema with a provenance payload of source 'deterministic-local'", () => {
    const parsed = BuilderProfileExportSchema.parse({
      ...profileExportFixture(),
      provenance: {
        source: "deterministic-local",
        assembledBy: "playcraft-deterministic",
        assembledAt: "2026-07-06T00:00:00.000Z"
      }
    });
    expect(parsed.provenance.source).toBe("deterministic-local");
    expect(parsed.provenance.assembledBy).toBe("playcraft-deterministic");
  });

  it("accepts BuilderProfileExportSchema with a provenance payload of source 'remote-agent'", () => {
    const parsed = BuilderProfileExportSchema.parse({
      ...profileExportFixture(),
      provenance: {
        source: "remote-agent",
        enrichmentSources: ["enrichment-source.test"],
        assembledBy: "playcraft-remote-agent",
        assembledAt: "2026-07-06T00:00:00.000Z",
        remoteUrl: "https://example.test/agents/builder"
      }
    });
    expect(parsed.provenance.source).toBe("remote-agent");
    expect(parsed.provenance.remoteUrl).toBe("https://example.test/agents/builder");
    expect(parsed.provenance.enrichmentSources).toEqual(["enrichment-source.test"]);
  });

  it("rejects BuilderProfileExportSchema provenance with an unknown source value", () => {
    const fixture = {
      ...profileExportFixture(),
      provenance: {
        source: "ci-bot",
        assembledAt: "2026-07-06T00:00:00.000Z"
      }
    };
    expect(BuilderProfileExportSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects BuilderProfileExportSchema provenance with additional unknown fields", () => {
    const fixture = {
      ...profileExportFixture(),
      provenance: {
        source: "local-llm-agent",
        agentEngine: "lfm2.5-vl-450m-extract",
        assembledAt: "2026-07-06T00:00:00.000Z",
        unknownField: "nope"
      }
    };
    expect(BuilderProfileExportSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects local-llm-agent provenance without a declared agentEngine", () => {
    const fixture = {
      ...profileExportFixture(),
      provenance: {
        source: "local-llm-agent",
        assembledAt: "2026-07-06T00:00:00.000Z"
      }
    };
    expect(BuilderProfileExportSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects remote-agent provenance without enrichmentSources", () => {
    const fixture = {
      ...profileExportFixture(),
      provenance: {
        source: "remote-agent",
        assembledAt: "2026-07-06T00:00:00.000Z"
      }
    };
    expect(BuilderProfileExportSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects remote-agent provenance with an empty enrichmentSources list", () => {
    const fixture = {
      ...profileExportFixture(),
      provenance: {
        source: "remote-agent",
        enrichmentSources: [],
        assembledAt: "2026-07-06T00:00:00.000Z"
      }
    };
    expect(BuilderProfileExportSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects GameBundle when capEnforcement is omitted", () => {
    const fixture = baseBundleFixture() as unknown as Record<string, unknown>;
    delete fixture.capEnforcement;
    expect(GameBundleSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects GameBundle when registries exceed maxRegistryEntries and purgedEntryIds does not list the excess", () => {
    const oversizedRegistries = {
      mechanics: new Array(260).fill(0).map((_, index) => ({ ...mechanicDefinitions[0]!, id: `${mechanicDefinitions[0]!.id}.${index}` })),
      rules: [ruleModuleDefinitions[0]],
      components: [componentManifests[0]],
      themes: [themePacks[0]],
      assetSources: [assetSourceManifests[0]],
      domains: [domainProfiles[0]],
      safetyPolicies: [safetyPolicyPacks[0]]
    };
    const fixture = {
      ...baseBundleFixture(),
      registries: oversizedRegistries,
      capEnforcement: GameBundleCapEnforcementSchema.parse({
        maxRegistryEntries: 256,
        enforcedAt: "2026-07-06T00:00:00.000Z"
      })
    } as unknown as Record<string, unknown>;
    expect(GameBundleSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects GameBundle when registries exceed a custom maxRegistryEntries", () => {
    const fixture = {
      ...baseBundleFixture(),
      capEnforcement: GameBundleCapEnforcementSchema.parse({
        maxRegistryEntries: 1,
        enforcedAt: "2026-07-06T00:00:00.000Z"
      })
    } as unknown as Record<string, unknown>;
    expect(GameBundleSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects GameBundle when registries exceed maxRegistryEntries even when purgedEntryIds is non-empty", () => {
    const purgedIds = new Array(260).fill(0).map((_, index) => `mechanic.excess.${index}`);
    const oversizedRegistries = {
      mechanics: new Array(260).fill(0).map((_, index) => ({ ...mechanicDefinitions[0]!, id: `${mechanicDefinitions[0]!.id}.${index}` })),
      rules: [ruleModuleDefinitions[0]],
      components: [componentManifests[0]],
      themes: [themePacks[0]],
      assetSources: [assetSourceManifests[0]],
      domains: [domainProfiles[0]],
      safetyPolicies: [safetyPolicyPacks[0]]
    };
    const fixture = {
      ...baseBundleFixture(),
      registries: oversizedRegistries,
      capEnforcement: GameBundleCapEnforcementSchema.parse({
        maxRegistryEntries: 256,
        purgedEntryIds: purgedIds,
        enforcedAt: "2026-07-06T00:00:00.000Z"
      })
    } as unknown as Record<string, unknown>;
    expect(GameBundleSchema.safeParse(fixture).success).toBe(false);
  });

  it("accepts GameBundle when registries are within the default maxRegistryEntries cap", () => {
    const fixture = baseBundleFixture();
    expect(fixture.capEnforcement.maxRegistryEntries).toBe(256);
    expect(fixture.capEnforcement.purgedEntryIds).toEqual([]);
  });
});
