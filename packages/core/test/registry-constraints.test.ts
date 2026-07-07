import { describe, expect, it } from "vitest";
import {
  AGE_BAND_CONSTRAINT,
  CAPABILITY_TAGS_CONSTRAINT,
  CONTENT_TYPE_CONSTRAINT,
  CREDENTIALS_FORBIDDEN_CONSTRAINT,
  DEFAULT_REGISTRY_CONSTRAINTS,
  DOMAIN_PROFILE_CONSTRAINT,
  FORMAT_CONSTRAINT,
  ID_CONSTRAINT,
  MECHANIC_IDS_CONSTRAINT,
  MODALITY_CONSTRAINT,
  OFFLINE_ONLY_CONSTRAINT,
  RENDER_CAPABILITY_CONSTRAINT,
  RULE_CATEGORY_CONSTRAINT,
  SAFETY_POLICY_CONSTRAINT,
  SEED_SUPPORT_REQUIRED_CONSTRAINT,
  VERSION_CONSTRAINT
} from "../src/registry-constraints.js";
import type { RegistryEntry, RegistryQuery } from "../src/index.js";

function entry(overrides: Partial<RegistryEntry> & Record<string, unknown>): RegistryEntry {
  return {
    id: "entry.test",
    version: "1.0.0",
    kind: "loose-entry",
    ...overrides
  } as RegistryEntry;
}

const emptyQuery: RegistryQuery = {};

describe("individual registry constraints", () => {
  it("ID_CONSTRAINT rejects entries not in the requested ids", () => {
    expect(ID_CONSTRAINT.kind).toBe("ids");
    expect(ID_CONSTRAINT.evaluate(entry({ id: "entry.a" }), { ids: ["entry.a"] })).toEqual([]);
    expect(ID_CONSTRAINT.evaluate(entry({ id: "entry.b" }), { ids: ["entry.a"] })).toEqual([
      "id entry.b not requested"
    ]);
    expect(ID_CONSTRAINT.evaluate(entry({ id: "entry.b" }), emptyQuery)).toEqual([]);
  });

  it("VERSION_CONSTRAINT rejects mismatched versions", () => {
    expect(VERSION_CONSTRAINT.kind).toBe("version");
    expect(VERSION_CONSTRAINT.evaluate(entry({ version: "1.0.0" }), { version: "1.0.0" })).toEqual([]);
    expect(VERSION_CONSTRAINT.evaluate(entry({ version: "1.0.0" }), { version: "2.0.0" })).toEqual([
      "version 1.0.0 does not match 2.0.0"
    ]);
  });

  it("CAPABILITY_TAGS_CONSTRAINT emits one reason per missing capability", () => {
    expect(CAPABILITY_TAGS_CONSTRAINT.kind).toBe("capability-tags");
    const result = CAPABILITY_TAGS_CONSTRAINT.evaluate(
      entry({ capabilityTags: ["capability:present"] }),
      { capabilityTags: ["capability:present", "capability:missing"] }
    );
    expect(result).toEqual(["missing capability capability:missing"]);
  });

  it("RENDER_CAPABILITY_CONSTRAINT rejects mismatched render capabilities", () => {
    expect(RENDER_CAPABILITY_CONSTRAINT.kind).toBe("render-capability");
    expect(
      RENDER_CAPABILITY_CONSTRAINT.evaluate(entry({ renderCapability: "rc:a" }), { renderCapability: "rc:a" })
    ).toEqual([]);
    expect(
      RENDER_CAPABILITY_CONSTRAINT.evaluate(entry({ renderCapability: "rc:a" }), { renderCapability: "rc:b" })
    ).toEqual(["render capability rc:a does not match rc:b"]);
  });

  it("DOMAIN_PROFILE_CONSTRAINT reads domains from the canonical entry fields", () => {
    expect(DOMAIN_PROFILE_CONSTRAINT.kind).toBe("domain-profile");
    expect(
      DOMAIN_PROFILE_CONSTRAINT.evaluate(
        entry({ kind: "component", supportedDomains: ["domain.x"] }),
        { domainProfileId: "domain.x" }
      )
    ).toEqual([]);
    expect(
      DOMAIN_PROFILE_CONSTRAINT.evaluate(
        entry({ kind: "component", supportedDomains: ["domain.x"] }),
        { domainProfileId: "domain.y" }
      )
    ).toEqual(["domain domain.y is not supported"]);
    expect(
      DOMAIN_PROFILE_CONSTRAINT.evaluate(entry({ kind: "domain-profile", id: "domain.x" }), {
        domainProfileId: "domain.y"
      })
    ).toEqual(["domain domain.y is not supported"]);
  });

  it("SAFETY_POLICY_CONSTRAINT reads policies from the canonical entry fields", () => {
    expect(SAFETY_POLICY_CONSTRAINT.kind).toBe("safety-policy");
    expect(
      SAFETY_POLICY_CONSTRAINT.evaluate(
        entry({ kind: "component", safetyPolicyIds: ["safety.x"] }),
        { safetyPolicyId: "safety.x" }
      )
    ).toEqual([]);
    expect(
      SAFETY_POLICY_CONSTRAINT.evaluate(
        entry({ kind: "component", safetyPolicyIds: ["safety.x"] }),
        { safetyPolicyId: "safety.y" }
      )
    ).toEqual(["safety policy safety.y is not supported"]);
  });

  it("AGE_BAND_CONSTRAINT reads age bands from the canonical entry fields", () => {
    expect(AGE_BAND_CONSTRAINT.kind).toBe("age-band");
    expect(
      AGE_BAND_CONSTRAINT.evaluate(
        entry({ kind: "mechanic", supportedAgeBands: ["4-6"] }),
        { ageBand: "4-6" }
      )
    ).toEqual([]);
    expect(
      AGE_BAND_CONSTRAINT.evaluate(
        entry({ kind: "mechanic", supportedAgeBands: ["4-6"] }),
        { ageBand: "7-9" }
      )
    ).toEqual(["age band 7-9 is not supported"]);
  });

  it("MODALITY_CONSTRAINT reads modalities from the canonical entry fields", () => {
    expect(MODALITY_CONSTRAINT.kind).toBe("modality");
    expect(
      MODALITY_CONSTRAINT.evaluate(
        entry({ kind: "mechanic", supportedModalities: ["touch"] }),
        { modality: "touch" }
      )
    ).toEqual([]);
    expect(
      MODALITY_CONSTRAINT.evaluate(
        entry({ kind: "mechanic", supportedModalities: ["touch"] }),
        { modality: "keyboard" }
      )
    ).toEqual(["modality keyboard is not supported"]);
  });

  it("MECHANIC_IDS_CONSTRAINT requires at least one overlap with the requested mechanics", () => {
    expect(MECHANIC_IDS_CONSTRAINT.kind).toBe("mechanic-ids");
    expect(
      MECHANIC_IDS_CONSTRAINT.evaluate(
        entry({ supportedMechanicIds: ["mechanic.match-pairs"] }),
        { mechanicIds: ["mechanic.match-pairs"] }
      )
    ).toEqual([]);
    expect(
      MECHANIC_IDS_CONSTRAINT.evaluate(
        entry({ supportedMechanicIds: ["mechanic.match-pairs"] }),
        { mechanicIds: ["mechanic.other"] }
      )
    ).toEqual(["none of the requested mechanics are supported"]);
    expect(
      MECHANIC_IDS_CONSTRAINT.evaluate(
        entry({ supportedMechanicIds: [] }),
        { mechanicIds: ["mechanic.match-pairs"] }
      )
    ).toEqual([]);
  });

  it("RULE_CATEGORY_CONSTRAINT rejects mismatched categories", () => {
    expect(RULE_CATEGORY_CONSTRAINT.kind).toBe("rule-category");
    expect(
      RULE_CATEGORY_CONSTRAINT.evaluate(entry({ category: "completion" }), { ruleCategory: "completion" })
    ).toEqual([]);
    expect(
      RULE_CATEGORY_CONSTRAINT.evaluate(entry({ category: "completion" }), { ruleCategory: "scoring" })
    ).toEqual(["rule category completion does not match scoring"]);
  });

  it("CONTENT_TYPE_CONSTRAINT rejects unsupported content types", () => {
    expect(CONTENT_TYPE_CONSTRAINT.kind).toBe("content-type");
    expect(
      CONTENT_TYPE_CONSTRAINT.evaluate(entry({ contentTypes: ["image"] }), { contentType: "image" })
    ).toEqual([]);
    expect(
      CONTENT_TYPE_CONSTRAINT.evaluate(entry({ contentTypes: ["image"] }), { contentType: "audio" })
    ).toEqual(["content type audio is not supported"]);
  });

  it("FORMAT_CONSTRAINT rejects unsupported formats", () => {
    expect(FORMAT_CONSTRAINT.kind).toBe("format");
    expect(FORMAT_CONSTRAINT.evaluate(entry({ formats: ["svg"] }), { format: "svg" })).toEqual([]);
    expect(FORMAT_CONSTRAINT.evaluate(entry({ formats: ["svg"] }), { format: "png" })).toEqual([
      "format png is not supported"
    ]);
  });

  it("OFFLINE_ONLY_CONSTRAINT rejects non-offline candidates", () => {
    expect(OFFLINE_ONLY_CONSTRAINT.kind).toBe("offline-only");
    expect(OFFLINE_ONLY_CONSTRAINT.evaluate(entry({ offline: true }), { offlineOnly: true })).toEqual([]);
    expect(OFFLINE_ONLY_CONSTRAINT.evaluate(entry({ offline: false }), { offlineOnly: true })).toEqual([
      "candidate is not offline"
    ]);
  });

  it("CREDENTIALS_FORBIDDEN_CONSTRAINT rejects candidates that require credentials", () => {
    expect(CREDENTIALS_FORBIDDEN_CONSTRAINT.kind).toBe("credentials-forbidden");
    expect(
      CREDENTIALS_FORBIDDEN_CONSTRAINT.evaluate(entry({ requiresCredentials: false }), {
        credentialsForbidden: true
      })
    ).toEqual([]);
    expect(
      CREDENTIALS_FORBIDDEN_CONSTRAINT.evaluate(entry({ requiresCredentials: true }), {
        credentialsForbidden: true
      })
    ).toEqual(["candidate requires credentials"]);
  });

  it("SEED_SUPPORT_REQUIRED_CONSTRAINT rejects candidates without seed support", () => {
    expect(SEED_SUPPORT_REQUIRED_CONSTRAINT.kind).toBe("seed-support-required");
    expect(
      SEED_SUPPORT_REQUIRED_CONSTRAINT.evaluate(entry({ seedSupport: true }), { seedSupportRequired: true })
    ).toEqual([]);
    expect(
      SEED_SUPPORT_REQUIRED_CONSTRAINT.evaluate(entry({ seedSupport: false }), { seedSupportRequired: true })
    ).toEqual(["candidate does not support deterministic seeds"]);
  });
});

describe("default registry constraint chain", () => {
  it("preserves the canonical order of constraint kinds", () => {
    expect(DEFAULT_REGISTRY_CONSTRAINTS.map((constraint) => constraint.kind)).toEqual([
      "ids",
      "version",
      "capability-tags",
      "render-capability",
      "domain-profile",
      "safety-policy",
      "age-band",
      "modality",
      "mechanic-ids",
      "rule-category",
      "content-type",
      "format",
      "offline-only",
      "credentials-forbidden",
      "seed-support-required"
    ]);
  });

  it("produces a single concatenated reason list when iterated", () => {
    const candidate = entry({
      id: "entry.test",
      version: "1.0.0",
      kind: "mechanic",
      capabilityTags: ["capability:present"],
      supportedModalities: ["touch"],
      supportedAgeBands: ["4-6"],
      supportedMechanicIds: ["mechanic.match-pairs"],
      compatibility: {
        domainProfileIds: ["domain.allowed"],
        safetyPolicyIds: ["safety.allowed"],
        ageBands: ["4-6"],
        modalities: ["touch"]
      },
      renderCapability: "rc:expected",
      category: "completion",
      contentTypes: ["image"],
      formats: ["svg"],
      offline: false,
      requiresCredentials: true,
      seedSupport: false
    });

    const query: RegistryQuery = {
      ids: ["entry.other"],
      version: "9.9.9",
      capabilityTags: ["capability:present", "capability:missing"],
      renderCapability: "rc:other",
      domainProfileId: "domain.forbidden",
      safetyPolicyId: "safety.forbidden",
      ageBand: "7-9",
      modality: "keyboard",
      mechanicIds: ["mechanic.other"],
      ruleCategory: "scoring",
      contentType: "audio",
      format: "png",
      offlineOnly: true,
      credentialsForbidden: true,
      seedSupportRequired: true
    };

    const reasons: string[] = [];
    for (const constraint of DEFAULT_REGISTRY_CONSTRAINTS) {
      reasons.push(...constraint.evaluate(candidate, query));
    }

    expect(reasons).toEqual([
      "id entry.test not requested",
      "version 1.0.0 does not match 9.9.9",
      "missing capability capability:missing",
      "render capability rc:expected does not match rc:other",
      "domain domain.forbidden is not supported",
      "safety policy safety.forbidden is not supported",
      "age band 7-9 is not supported",
      "modality keyboard is not supported",
      "none of the requested mechanics are supported",
      "rule category completion does not match scoring",
      "content type audio is not supported",
      "format png is not supported",
      "candidate is not offline",
      "candidate requires credentials",
      "candidate does not support deterministic seeds"
    ]);
  });

  it("returns an empty reason list for a fully matching candidate", () => {
    const candidate = entry({
      id: "entry.test",
      version: "1.0.0",
      kind: "mechanic",
      capabilityTags: ["capability:present"],
      supportedModalities: ["touch"],
      supportedAgeBands: ["4-6"],
      supportedMechanicIds: ["mechanic.match-pairs"],
      compatibility: {
        domainProfileIds: ["domain.allowed"],
        safetyPolicyIds: ["safety.allowed"],
        ageBands: ["4-6"],
        modalities: ["touch"]
      },
      renderCapability: "rc:expected",
      category: "completion",
      contentTypes: ["image"],
      formats: ["svg"],
      offline: true,
      requiresCredentials: false,
      seedSupport: true
    });

    const query: RegistryQuery = {
      ids: ["entry.test"],
      version: "1.0.0",
      capabilityTags: ["capability:present"],
      renderCapability: "rc:expected",
      domainProfileId: "domain.allowed",
      safetyPolicyId: "safety.allowed",
      ageBand: "4-6",
      modality: "touch",
      mechanicIds: ["mechanic.match-pairs"],
      ruleCategory: "completion",
      contentType: "image",
      format: "svg",
      offlineOnly: true,
      credentialsForbidden: true,
      seedSupportRequired: true
    };

    const reasons: string[] = [];
    for (const constraint of DEFAULT_REGISTRY_CONSTRAINTS) {
      reasons.push(...constraint.evaluate(candidate, query));
    }
    expect(reasons).toEqual([]);
  });
});
