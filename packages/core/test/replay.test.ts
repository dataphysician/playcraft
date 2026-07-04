import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GameAssemblyProfileSchema } from "@playcraft/contracts";
import { replayProfile } from "@playcraft/core";
import { createDefaultRegistries } from "@playcraft/packs";

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
});
