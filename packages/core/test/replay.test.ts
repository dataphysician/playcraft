import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GameAssemblyProfileSchema } from "@playcraft/contracts";
import { createEmptyRegistries, replayProfile } from "@playcraft/core";
import {
  assetSourceManifests,
  createDefaultRegistries,
  domainProfiles,
  mechanicDefinitions,
  ruleModuleDefinitions,
  safetyPolicyPacks,
  themePacks
} from "@playcraft/packs";

const fixturePaths = [
  "../../../examples/profiles/memory-match.json",
  "../../../examples/profiles/sorting.json",
  "../../../examples/profiles/sequence-repeat.json"
];

describe("saved profile replay", () => {
  it.each(fixturePaths)("reconstructs %s without planning or asset generation", (relativePath) => {
    const path = fileURLToPath(new URL(relativePath, import.meta.url));
    const saved = GameAssemblyProfileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    const result = replayProfile(saved, createDefaultRegistries());

    expect(result.profile.id).toBe(saved.id);
    expect(result.validation.valid).toBe(true);
    expect(result.renderRequests).toHaveLength(saved.components.length);
    expect(result.eventLog).toEqual(saved.replay.eventLog);
    expect(result.profile.assets.map((asset) => asset.assetId)).toEqual(saved.assets.map((asset) => asset.assetId));
    expect(result.profile.replay.plannerId).toBe("planner.deterministic.mvp");
  });

  it("carries component manifest emitted tool names into render requests", () => {
    const path = fileURLToPath(new URL(fixturePaths[0], import.meta.url));
    const saved = GameAssemblyProfileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    const result = replayProfile(saved, createDefaultRegistries());

    expect(result.renderRequests[0]?.expectedEmittedEvents).toContain("tool:reveal-card");
  });

  it("fails closed when replay cannot load a component manifest for emitted tool metadata", () => {
    const path = fileURLToPath(new URL(fixturePaths[0], import.meta.url));
    const saved = GameAssemblyProfileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    const registries = createEmptyRegistries();
    registries.mechanics.registerMany(mechanicDefinitions);
    registries.rules.registerMany(ruleModuleDefinitions);
    registries.themes.registerMany(themePacks);
    registries.assetSources.registerMany(assetSourceManifests);
    registries.domains.registerMany(domainProfiles);
    registries.safetyPolicies.registerMany(safetyPolicyPacks);

    expect(() => replayProfile(saved, registries)).toThrow(/component component\.reveal-card-grid@1\.0\.0 is not registered/u);
  });

  it("fails closed when saved component asset bindings include unknown manifest bindings", () => {
    const path = fileURLToPath(new URL(fixturePaths[0], import.meta.url));
    const saved = GameAssemblyProfileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    const staleBindingProfile = {
      ...saved,
      components: saved.components.map((component, index) =>
        index === 0
          ? {
              ...component,
              assetBindings: {
                ...component.assetBindings,
                stale: saved.assets[0]!.assetId
              }
            }
          : component
      )
    };

    expect(() => replayProfile(staleBindingProfile, createDefaultRegistries())).toThrow(
      /component profile\.memory-match\.mvp\.component\.1 has unknown asset bindings: stale/u
    );
  });

  it("fails closed when saved profile assets contain duplicate generated asset ids", () => {
    const path = fileURLToPath(new URL(fixturePaths[0], import.meta.url));
    const saved = GameAssemblyProfileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    const duplicateAssetProfile = {
      ...saved,
      assets: [
        ...saved.assets,
        {
          ...saved.assets[0]!
        }
      ]
    };

    expect(() => replayProfile(duplicateAssetProfile, createDefaultRegistries())).toThrow(
      new RegExp(`profile profile\\.memory-match\\.mvp has duplicate generated asset ids: ${saved.assets[0]!.assetId.replace(/\./gu, "\\.")}`, "u")
    );
  });

  it("fails closed when saved profile asset requests contain duplicate request ids", () => {
    const path = fileURLToPath(new URL(fixturePaths[0], import.meta.url));
    const saved = GameAssemblyProfileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    const duplicateAssetRequestProfile = {
      ...saved,
      assetRequests: [
        ...saved.assetRequests,
        {
          ...saved.assetRequests[0]!
        }
      ]
    };

    expect(() => replayProfile(duplicateAssetRequestProfile, createDefaultRegistries())).toThrow(
      new RegExp(`profile profile\\.memory-match\\.mvp has duplicate asset request ids: ${saved.assetRequests[0]!.requestId.replace(/\./gu, "\\.")}`, "u")
    );
  });

  it("fails closed when saved profile mechanics contain duplicate binding ids", () => {
    const path = fileURLToPath(new URL(fixturePaths[0], import.meta.url));
    const saved = GameAssemblyProfileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    const duplicateMechanicProfile = {
      ...saved,
      mechanics: [
        ...saved.mechanics,
        {
          ...saved.mechanics[0]!
        }
      ]
    };

    expect(() => replayProfile(duplicateMechanicProfile, createDefaultRegistries())).toThrow(
      new RegExp(`profile profile\\.memory-match\\.mvp has duplicate mechanic binding ids: ${saved.mechanics[0]!.bindingId.replace(/\./gu, "\\.")}`, "u")
    );
  });

  it("fails closed when saved profile rules contain duplicate binding ids", () => {
    const path = fileURLToPath(new URL(fixturePaths[0], import.meta.url));
    const saved = GameAssemblyProfileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    const duplicateRuleProfile = {
      ...saved,
      rules: [
        ...saved.rules,
        {
          ...saved.rules[0]!
        }
      ]
    };

    expect(() => replayProfile(duplicateRuleProfile, createDefaultRegistries())).toThrow(
      new RegExp(`profile profile\\.memory-match\\.mvp has duplicate rule binding ids: ${saved.rules[0]!.bindingId.replace(/\./gu, "\\.")}`, "u")
    );
  });

  it("fails closed when saved profile components contain duplicate binding ids", () => {
    const path = fileURLToPath(new URL(fixturePaths[0], import.meta.url));
    const saved = GameAssemblyProfileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    const duplicateComponentProfile = {
      ...saved,
      components: [
        ...saved.components,
        {
          ...saved.components[0]!
        }
      ]
    };

    expect(() => replayProfile(duplicateComponentProfile, createDefaultRegistries())).toThrow(
      new RegExp(`profile profile\\.memory-match\\.mvp has duplicate component binding ids: ${saved.components[0]!.bindingId.replace(/\./gu, "\\.")}`, "u")
    );
  });

  it("fails closed when saved profile replay events contain duplicate event ids", () => {
    const path = fileURLToPath(new URL(fixturePaths[0], import.meta.url));
    const saved = GameAssemblyProfileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    const duplicateReplayEventProfile = {
      ...saved,
      replay: {
        ...saved.replay,
        eventLog: [
          ...saved.replay.eventLog,
          {
            ...saved.replay.eventLog[0]!
          }
        ]
      }
    };

    expect(() => replayProfile(duplicateReplayEventProfile, createDefaultRegistries())).toThrow(
      new RegExp(`profile profile\\.memory-match\\.mvp has duplicate replay event ids: ${saved.replay.eventLog[0]!.id.replace(/\./gu, "\\.")}`, "u")
    );
  });
});
