import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assembleMvpProfiles,
  createDefaultPlanner,
  gameTemplateDefinitions,
  mvpAssemblyRequests
} from "@playcraft/packs";

const fixtureByProfileId: Record<string, string> = {
  "profile.memory-match.mvp": "../../../examples/profiles/memory-match.json",
  "profile.sorting.mvp": "../../../examples/profiles/sorting.json",
  "profile.sequence-repeat.mvp": "../../../examples/profiles/sequence-repeat.json"
};

describe("MVP profile pack", () => {
  it("assembles memory match, sorting, and sequence repeat profiles from registries and deterministic stubs", () => {
    const profiles = assembleMvpProfiles();

    expect(profiles.map((profile) => profile.id)).toEqual([
      "profile.memory-match.mvp",
      "profile.sorting.mvp",
      "profile.sequence-repeat.mvp"
    ]);
    expect(profiles.every((profile) => profile.validation.valid)).toBe(true);
    expect(profiles.every((profile) => profile.assets.every((asset) => asset.providerId === "asset-provider.stub-deterministic"))).toBe(true);
  });

  it("keeps saved profile fixtures in sync with deterministic assembly", () => {
    const planner = createDefaultPlanner();

    for (const request of mvpAssemblyRequests) {
      const assembled = planner.assemble(request);
      const path = fileURLToPath(new URL(fixtureByProfileId[assembled.id], import.meta.url));
      const saved = JSON.parse(readFileSync(path, "utf8"));

      expect(saved).toEqual(assembled);
    }
  });

  it("assembles multiple MVP profiles through the same deterministic builder entrypoint", () => {
    const planner = createDefaultPlanner();
    const [profileA, profileB] = mvpAssemblyRequests.slice(0, 2).map((request) => planner.assemble(request));

    expect(profileA.id).toBe("profile.memory-match.mvp");
    expect(profileB.id).toBe("profile.sorting.mvp");
    expect(profileA.replay.plannerId).toBe(planner.id);
    expect(profileB.replay.plannerId).toBe(planner.id);
    expect(profileA.assemblyRequestId).toBe("request.memory-match.mvp");
    expect(profileB.assemblyRequestId).toBe("request.sorting.mvp");
  });

  it("publishes bundled game templates for the builder catalog", () => {
    expect(gameTemplateDefinitions.map((template) => template.id)).toEqual([
      "template.memory-match",
      "template.sorting",
      "template.sequence-repeat"
    ]);
    expect(gameTemplateDefinitions.every((template) => template.localFirst)).toBe(true);
    expect(gameTemplateDefinitions.find((template) => template.id === "template.sorting")?.requestAliases).toContain("group by color");
    expect(gameTemplateDefinitions.map((template) => template.assemblyRequestId)).toEqual(
      mvpAssemblyRequests.map((request) => request.id)
    );
  });
});
