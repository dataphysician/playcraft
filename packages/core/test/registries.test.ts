import { describe, expect, it } from "vitest";
import { createDefaultRegistries } from "@playcraft/packs";

describe("capability registries", () => {
  it("selects mechanics by capability and returns structured rejections", () => {
    const registries = createDefaultRegistries();
    const result = registries.mechanics.select({
      capabilityTags: ["mechanic:match-pairs"],
      domainProfileId: "domain.child-edu",
      ageBand: "4-6",
      modality: "touch"
    });

    expect(result.selected?.id).toBe("mechanic.match-pairs");
    expect(result.rejected.length).toBeGreaterThan(0);
    expect(result.missingCapabilities).toEqual([]);
  });

  it("selects rules by category and compatible mechanics", () => {
    const registries = createDefaultRegistries();
    const result = registries.rules.select({
      ruleCategory: "completion",
      mechanicIds: ["mechanic.match-pairs"],
      safetyPolicyId: "safety.child-friendly"
    });

    expect(result.selected?.id).toBe("rule.completion");
    expect(result.selected?.consumesEvents).toContain("rule:pair-matched");
  });

  it("selects trusted components by render capability", () => {
    const registries = createDefaultRegistries();
    const result = registries.components.select({
      renderCapability: "component:sequence-pad",
      mechanicIds: ["mechanic.sequence-repeat"],
      domainProfileId: "domain.child-edu",
      ageBand: "4-6"
    });

    expect(result.selected?.id).toBe("component.sequence-pad");
    expect(result.selected?.propsSchema.fields.sequence.type).toBe("array");
  });

  it("selects themes, asset sources, domains, and safety policies by metadata", () => {
    const registries = createDefaultRegistries();

    expect(registries.themes.select({ capabilityTags: ["theme:high-readability"], domainProfileId: "domain.child-edu" }).selected?.id).toBe("theme.bright-calm");
    expect(registries.assetSources.select({ contentType: "image", format: "svg", offlineOnly: true, credentialsForbidden: true, seedSupportRequired: true }).selected?.id).toBe("asset-source.local-deterministic");
    expect(registries.domains.select({ ids: ["domain.child-edu"], ageBand: "4-6" }).selected?.id).toBe("domain.child-edu");
    expect(registries.safetyPolicies.select({ ids: ["safety.child-friendly"], domainProfileId: "domain.child-edu", ageBand: "4-6" }).selected?.id).toBe("safety.child-friendly");
  });

  it("reports missing capabilities and version conflicts", () => {
    const registries = createDefaultRegistries();
    const result = registries.mechanics.select({
      ids: ["mechanic.match-pairs"],
      version: "9.9.9",
      capabilityTags: ["mechanic:not-real"]
    });

    expect(result.selected).toBeNull();
    expect(result.missingCapabilities).toContain("mechanic:not-real");
    expect(result.versionConflicts).toContainEqual({
      id: "mechanic.match-pairs",
      requested: "9.9.9",
      available: "1.0.0"
    });
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
