import { LOCAL_ASSET_SOURCE_ID } from "@playcraft/assets";
import {
  BUNDLED_LOCAL_PROVENANCE,
  DomainProfileSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  SafetyPolicyPackSchema,
  type DomainProfile,
  type SafetyPolicyPack
} from "@playcraft/contracts";
import { componentManifests } from "./components.js";
import { DEFAULT_DOMAIN_ID, DEFAULT_SAFETY_POLICY_ID, mechanicDefinitions } from "./mechanics.js";
import { ruleModuleDefinitions } from "./rules.js";
import { themePacks } from "./themes.js";

export { DEFAULT_DOMAIN_ID, DEFAULT_SAFETY_POLICY_ID } from "./mechanics.js";

export const safetyPolicyPacks: SafetyPolicyPack[] = [
  SafetyPolicyPackSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: DEFAULT_SAFETY_POLICY_ID,
    version: "1.0.0",
    kind: "safety-policy",
    displayName: "Child-Friendly Local Safety",
    supportedDomains: [DEFAULT_DOMAIN_ID],
    ageBands: ["2-3", "4-6", "7-9"],
    rules: [
      { ruleId: "safety.no-generated-code", description: "Play surfaces must use trusted registered components.", severity: "error", capabilityTags: ["safety:trusted-components"] },
      { ruleId: "safety.no-private-child-data", description: "Saved profiles must not contain private child data.", severity: "error", capabilityTags: ["safety:privacy"] },
      { ruleId: "safety.no-punitive-failure", description: "Failure states use retry and hints, not punishment.", severity: "error", capabilityTags: ["safety:nonpunitive"] }
    ],
    privacy: {
      allowPrivateChildData: false,
      allowExternalNetwork: false
    },
    contentRules: {
      noPunitiveFailures: true,
      quietModeAvailable: true,
      maxSessionMinutes: 10
    },
    provenance: BUNDLED_LOCAL_PROVENANCE
  })
];

export const domainProfiles: DomainProfile[] = [
  DomainProfileSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: DEFAULT_DOMAIN_ID,
    version: "1.0.0",
    kind: "domain-profile",
    displayName: "Child-Friendly Educational Mini Games",
    capabilityTags: ["domain:education", "domain:child-friendly"],
    defaultSafetyPolicyId: DEFAULT_SAFETY_POLICY_ID,
    allowedMechanicIds: mechanicDefinitions.map((entry) => entry.id),
    allowedRuleIds: ruleModuleDefinitions.map((entry) => entry.id),
    allowedComponentIds: componentManifests.map((entry) => entry.id),
    allowedThemeIds: themePacks.map((entry) => entry.id),
    allowedAssetSourceIds: [LOCAL_ASSET_SOURCE_ID],
    ageBands: ["2-3", "4-6", "7-9"],
    modalities: ["touch", "pointer"],
    defaults: {
      feedbackTone: "gentle",
      progressMode: "noncompetitive"
    },
    provenance: BUNDLED_LOCAL_PROVENANCE
  })
];
