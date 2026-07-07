import { LocalAssetFolderSource } from "@playcraft/assets";
import {
  BuilderTemplateIdSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  PackManifestSchema,
  type BuilderTemplateId
} from "@playcraft/contracts";
import {
  DeterministicAssemblyPlanner,
  createEmptyRegistries,
  type AssetRecordGenerator,
  type PlaycraftRegistries
} from "@playcraft/core";
import { TrustedComponentRegistry } from "@playcraft/renderer";
import { assetSourceManifests } from "./asset-sources.js";
import {
  componentForManifest,
  componentManifests,
  component,
  tool
} from "./components.js";
import {
  buildCustomTemplateSnapshotFromProfile,
  customAssemblyRequests,
  customGameTemplateDefinitions,
  customTemplateRecipes,
  dolphinSortTokenStyles,
  fruitSequenceTokenStyles,
  toyMemoryTokenStyles
} from "./custom.js";
import {
  DEFAULT_DOMAIN_ID,
  DEFAULT_SAFETY_POLICY_ID,
  domainProfiles,
  safetyPolicyPacks
} from "./domains.js";
import {
  mechanicDefinitions,
  mechanicEventBindings,
  mechanic as mechanicHelper,
  memoryMechanicEventBindings,
  sequenceMechanicEventBindings,
  sortingMechanicEventBindings
} from "./mechanics.js";
import { ruleModuleDefinitions, rule as ruleHelper } from "./rules.js";
import {
  findComponentByCapability,
  findMechanicByCapability,
  findRuleByCategory,
  requireSelected,
  requireSingleValue,
  singleValue,
  type TemplateInputModality
} from "./templates.js";
import {
  gameTemplateDefinitions,
  mvpAssemblyRecipes,
  mvpAssemblyRequests
} from "./mvp-template-data.js";
import {
  defaultMemoryTokenStyle,
  defaultToddlerTokenStyle,
  memoryPairTokenStyles,
  DEFAULT_THEME_ID,
  themePacks,
  toddlerTokenStyles
} from "./themes.js";

export const DEFAULT_PLANNER_ID = "planner.deterministic.mvp";
export const DEFAULT_GAME_TEMPLATE_ID: BuilderTemplateId = BuilderTemplateIdSchema.parse("template.memory-match");
export const DEFAULT_PACK_VERSION = "1.0.0";

function uniqueCapabilityTags(providedCapabilities: string[]): string[] {
  return [...new Set(providedCapabilities)];
}

function packManifest(
  id: string,
  kind: "mechanic-pack" | "rule-pack" | "component-pack" | "theme-pack" | "asset-source-pack" | "domain-profile-pack" | "safety-policy-pack",
  providedCapabilities: string[],
  publicContractSchemas: string[]
) {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind,
    providedCapabilities: uniqueCapabilityTags(providedCapabilities),
    requiredPeerCapabilities: [],
    compatibleDomainProfiles: [DEFAULT_DOMAIN_ID],
    compatibleSafetyPolicies: [DEFAULT_SAFETY_POLICY_ID],
    publicContractSchemas,
    fixtures: [
      "examples/profiles/memory-match.json",
      "examples/profiles/sorting.json",
      "examples/profiles/sequence-repeat.json",
      "examples/profiles/custom-toy-memory.json",
      "examples/profiles/custom-dolphin-sorting.json",
      "examples/profiles/custom-fruit-sequence.json"
    ],
    importLight: true,
    requirements: {
      network: false,
      credentials: false,
      native: false
    }
  };
}

export const packManifests = [
  packManifest(
    "pack.mechanics.mvp",
    "mechanic-pack",
    mechanicDefinitions.flatMap((entry) => entry.capabilityTags),
    ["MechanicDefinitionSchema"]
  ),
  packManifest(
    "pack.rules.mvp",
    "rule-pack",
    ruleModuleDefinitions.flatMap((entry) => entry.capabilityTags),
    ["RuleModuleDefinitionSchema"]
  ),
  packManifest(
    "pack.components.mvp",
    "component-pack",
    componentManifests.map((entry) => entry.renderCapability),
    ["ComponentManifestSchema"]
  ),
  packManifest(
    "pack.themes.mvp",
    "theme-pack",
    themePacks.flatMap((entry) => entry.capabilityTags),
    ["ThemePackSchema"]
  ),
  packManifest(
    "pack.asset-sources.mvp",
    "asset-source-pack",
    assetSourceManifests.flatMap((entry) => entry.capabilityTags),
    ["AssetSourceCapabilityManifestSchema"]
  ),
  packManifest(
    "pack.domains.mvp",
    "domain-profile-pack",
    domainProfiles.flatMap((entry) => entry.capabilityTags),
    ["DomainProfileSchema"]
  ),
  packManifest(
    "pack.safety.mvp",
    "safety-policy-pack",
    safetyPolicyPacks.flatMap((entry) => entry.rules.flatMap((ruleEntry) => ruleEntry.capabilityTags)),
    ["SafetyPolicyPackSchema"]
  )
].map((entry) => PackManifestSchema.parse(entry));

export function createDefaultRegistries(): PlaycraftRegistries {
  const registries = createEmptyRegistries();
  registries.mechanics.registerMany(mechanicDefinitions);
  registries.rules.registerMany(ruleModuleDefinitions);
  registries.components.registerMany(componentManifests);
  registries.themes.registerMany(themePacks);
  registries.assetSources.registerMany(assetSourceManifests);
  registries.domains.registerMany(domainProfiles);
  registries.safetyPolicies.registerMany(safetyPolicyPacks);
  return registries;
}

export function createDefaultPlanner(options: { registries?: PlaycraftRegistries; assetSource?: AssetRecordGenerator } = {}): DeterministicAssemblyPlanner {
  const registries = options.registries ?? createDefaultRegistries();
  const assetSource = options.assetSource ?? new LocalAssetFolderSource({ folder: "apps/studio/src/assets/library/replacements" });
  return new DeterministicAssemblyPlanner({
    id: DEFAULT_PLANNER_ID,
    version: "1.0.0",
    recipes: [...mvpAssemblyRecipes, ...customTemplateRecipes],
    registries,
    assetSource
  });
}

export function assembleMvpProfiles() {
  const planner = createDefaultPlanner();
  return mvpAssemblyRequests.map((assemblyRequest) => planner.assemble(assemblyRequest));
}

export function registerPlaycraftTrustedComponents(registry = new TrustedComponentRegistry()) {
  for (const manifest of componentManifests) {
    registry.register(manifest, componentForManifest(manifest));
  }
  return registry;
}

export {
  DEFAULT_DOMAIN_ID,
  DEFAULT_SAFETY_POLICY_ID,
  DEFAULT_THEME_ID,
  mechanicDefinitions,
  mechanicEventBindings,
  memoryMechanicEventBindings,
  sortingMechanicEventBindings,
  sequenceMechanicEventBindings,
  mechanicHelper,
  ruleModuleDefinitions,
  ruleHelper,
  componentManifests,
  componentForManifest,
  component,
  tool,
  themePacks,
  memoryPairTokenStyles,
  defaultMemoryTokenStyle,
  toddlerTokenStyles,
  defaultToddlerTokenStyle,
  assetSourceManifests,
  domainProfiles,
  safetyPolicyPacks,
  mvpAssemblyRecipes,
  mvpAssemblyRequests,
  gameTemplateDefinitions,
  findMechanicByCapability,
  findRuleByCategory,
  findComponentByCapability,
  requireSelected,
  singleValue,
  requireSingleValue,
  type TemplateInputModality,
  customAssemblyRequests,
  customGameTemplateDefinitions,
  customTemplateRecipes,
  buildCustomTemplateSnapshotFromProfile,
  toyMemoryTokenStyles,
  dolphinSortTokenStyles,
  fruitSequenceTokenStyles
};
