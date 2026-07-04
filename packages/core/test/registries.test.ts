import { describe, expect, it } from "vitest";
import { CapabilityRegistry, type RegistryEntry } from "../src/index.js";
import { createDefaultRegistries } from "@playcraft/packs";
import { MechanicDefinitionSchema } from "@playcraft/contracts";

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

  it("checks rule compatibility from the canonical compatibility contract", () => {
    const registries = createDefaultRegistries();
    const result = registries.rules.select({
      ruleCategory: "completion",
      mechanicIds: ["mechanic.match-pairs"],
      safetyPolicyId: "safety.not-compatible"
    });

    expect(result.selected).toBeNull();
    expect(result.rejected.some((candidate) =>
      candidate.id === "rule.completion" &&
      candidate.reasons.includes("safety policy safety.not-compatible is not supported")
    )).toBe(true);
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

  it("rejects stale compatibility alias fields at the contract boundary", () => {
    const registries = createDefaultRegistries();
    const mechanic = registries.mechanics.select({ ids: ["mechanic.match-pairs"] }).selected;

    expect(MechanicDefinitionSchema.safeParse({
      ...mechanic,
      compatibleDomainProfiles: ["domain.alias"],
      compatibleSafetyPolicies: ["safety.alias"],
      safetyPolicyIds: ["safety.alias"],
      ageBands: ["adult"],
      modalities: ["audio"]
    }).success).toBe(false);
  });

  it("does not use compatibility objects from unknown loose entry kinds", () => {
    type LooseEntry = RegistryEntry & { kind: string };
    const looseEntrySchema = {
      parse(value: unknown): LooseEntry {
        if (
          typeof value !== "object" ||
          value === null ||
          Array.isArray(value) ||
          typeof Reflect.get(value, "id") !== "string" ||
          typeof Reflect.get(value, "version") !== "string" ||
          typeof Reflect.get(value, "kind") !== "string"
        ) {
          throw new Error("invalid loose registry entry");
        }

        return value as LooseEntry;
      }
    };
    const registry = new CapabilityRegistry("loose", looseEntrySchema);

    registry.register({
      id: "loose.entry",
      version: "1.0.0",
      kind: "loose-entry",
      compatibility: {
        domainProfileIds: ["domain.current"],
        safetyPolicyIds: ["safety.current"],
        ageBands: ["4-6"],
        modalities: ["touch"]
      }
    });

    const result = registry.select({
      domainProfileId: "domain.other",
      safetyPolicyId: "safety.other",
      ageBand: "adult",
      modality: "audio"
    });

    expect(result.selected?.id).toBe("loose.entry");
  });
});
