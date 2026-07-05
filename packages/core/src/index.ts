import type { z } from "zod";
import {
  AssemblyValidationResultSchema,
  AssetSourceCapabilityManifestSchema,
  ComponentManifestSchema,
  ComponentRenderRequestSchema,
  DomainProfileSchema,
  GameAssemblyProfileSchema,
  MechanicDefinitionSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  PlaycraftAssemblyRequestSchema,
  PlaycraftEventRecordSchema,
  RuleModuleDefinitionSchema,
  SafetyPolicyPackSchema,
  ThemePackSchema,
  schemaIssue,
  type AssemblyValidationResult,
  type AssetGenerationRequest,
  type AssetSourceCapabilityManifest,
  type ComponentManifest,
  type ComponentRenderRequest,
  type DomainProfile,
  type GameAssemblyProfile,
  type GeneratedAssetRecord,
  type MechanicDefinition,
  type PlaycraftAssemblyRequest,
  type PlaycraftEventRecord,
  type RuleModuleDefinition,
  type SafetyPolicyPack,
  type ThemePack
} from "@playcraft/contracts";

export interface RegistryEntry {
  id: string;
  version: string;
  [key: string]: unknown;
}

export interface RegistryQuery {
  ids?: string[];
  version?: string;
  capabilityTags?: string[];
  renderCapability?: string;
  domainProfileId?: string;
  safetyPolicyId?: string;
  ageBand?: string;
  modality?: string;
  mechanicIds?: string[];
  ruleCategory?: string;
  contentType?: string;
  format?: string;
  offlineOnly?: boolean;
  credentialsForbidden?: boolean;
  seedSupportRequired?: boolean;
}

export interface RejectedCandidate {
  id: string;
  version: string;
  reasons: string[];
}

export interface RegistryMatchResult<TEntry extends RegistryEntry> {
  registry: string;
  query: RegistryQuery;
  selected: TEntry | null;
  matches: TEntry[];
  rejected: RejectedCandidate[];
  missingCapabilities: string[];
  versionConflicts: Array<{ id: string; requested: string; available: string }>;
  warnings: string[];
}

export class CapabilityRegistry<TEntry extends RegistryEntry> {
  readonly name: string;
  private readonly schema: z.ZodType<TEntry>;
  private readonly entries = new Map<string, TEntry>();

  constructor(name: string, schema: z.ZodType<TEntry>) {
    this.name = name;
    this.schema = schema;
  }

  register(entryInput: TEntry): this {
    const entry = this.schema.parse(entryInput);
    this.entries.set(keyFor(entry.id, entry.version), entry);
    return this;
  }

  registerMany(entries: TEntry[]): this {
    for (const entry of entries) {
      this.register(entry);
    }
    return this;
  }

  get(id: string, version?: string): TEntry | undefined {
    if (version) {
      return this.entries.get(keyFor(id, version));
    }

    return this.all().find((entry) => entry.id === id);
  }

  all(): TEntry[] {
    return [...this.entries.values()];
  }

  select(query: RegistryQuery): RegistryMatchResult<TEntry> {
    const matches: TEntry[] = [];
    const rejected: RejectedCandidate[] = [];
    const versionConflicts: Array<{ id: string; requested: string; available: string }> = [];

    for (const entry of this.all()) {
      const reasons = this.rejectionReasons(entry, query);
      if (reasons.length === 0) {
        matches.push(entry);
      } else {
        rejected.push({ id: entry.id, version: entry.version, reasons });
        if (query.version && entry.version !== query.version && (!query.ids || query.ids.includes(entry.id))) {
          versionConflicts.push({ id: entry.id, requested: query.version, available: entry.version });
        }
      }
    }

    const availableTags = new Set(this.all().flatMap((entry) => getStringArray(entry, "capabilityTags")));
    const missingCapabilities = (query.capabilityTags ?? []).filter((capability) => !availableTags.has(capability));

    return {
      registry: this.name,
      query,
      selected: matches[0] ?? null,
      matches,
      rejected,
      missingCapabilities,
      versionConflicts,
      warnings: matches.length === 0 ? [`${this.name} found no matching candidates`] : []
    };
  }

  private rejectionReasons(entry: TEntry, query: RegistryQuery): string[] {
    const reasons: string[] = [];

    if (query.ids && !query.ids.includes(entry.id)) {
      reasons.push(`id ${entry.id} not requested`);
    }

    if (query.version && entry.version !== query.version) {
      reasons.push(`version ${entry.version} does not match ${query.version}`);
    }

    for (const capability of query.capabilityTags ?? []) {
      if (!getStringArray(entry, "capabilityTags").includes(capability)) {
        reasons.push(`missing capability ${capability}`);
      }
    }

    if (query.renderCapability && entry.renderCapability !== query.renderCapability) {
      reasons.push(`render capability ${String(entry.renderCapability)} does not match ${query.renderCapability}`);
    }

    if (query.domainProfileId) {
      const domains = domainProfileIdsForEntry(entry);
      if (domains.length > 0 && !domains.includes(query.domainProfileId)) {
        reasons.push(`domain ${query.domainProfileId} is not supported`);
      }
    }

    if (query.safetyPolicyId) {
      const policies = safetyPolicyIdsForEntry(entry);
      if (policies.length > 0 && !policies.includes(query.safetyPolicyId)) {
        reasons.push(`safety policy ${query.safetyPolicyId} is not supported`);
      }
    }

    if (query.ageBand) {
      const ageBands = ageBandsForEntry(entry);
      if (ageBands.length > 0 && !ageBands.includes(query.ageBand)) {
        reasons.push(`age band ${query.ageBand} is not supported`);
      }
    }

    if (query.modality) {
      const modalities = modalitiesForEntry(entry);
      if (modalities.length > 0 && !modalities.includes(query.modality)) {
        reasons.push(`modality ${query.modality} is not supported`);
      }
    }

    if (query.mechanicIds) {
      const supportedMechanics = getStringArray(entry, "supportedMechanicIds");
      if (supportedMechanics.length > 0) {
        const hasCompatibleMechanic = query.mechanicIds.some((mechanicId) => supportedMechanics.includes(mechanicId));
        if (!hasCompatibleMechanic) {
          reasons.push(`none of the requested mechanics are supported`);
        }
      }
    }

    if (query.ruleCategory && entry.category !== query.ruleCategory) {
      reasons.push(`rule category ${String(entry.category)} does not match ${query.ruleCategory}`);
    }

    if (query.contentType && !getStringArray(entry, "contentTypes").includes(query.contentType)) {
      reasons.push(`content type ${query.contentType} is not supported`);
    }

    if (query.format && !getStringArray(entry, "formats").includes(query.format)) {
      reasons.push(`format ${query.format} is not supported`);
    }

    if (query.offlineOnly && entry.offline !== true) {
      reasons.push("candidate is not offline");
    }

    if (query.credentialsForbidden && entry.requiresCredentials === true) {
      reasons.push("candidate requires credentials");
    }

    if (query.seedSupportRequired && entry.seedSupport !== true) {
      reasons.push("candidate does not support deterministic seeds");
    }

    return reasons;
  }
}

export function createMechanicRegistry(): CapabilityRegistry<MechanicDefinition> {
  return new CapabilityRegistry("mechanics", MechanicDefinitionSchema as z.ZodType<MechanicDefinition>);
}

export function createRuleRegistry(): CapabilityRegistry<RuleModuleDefinition> {
  return new CapabilityRegistry("rules", RuleModuleDefinitionSchema as z.ZodType<RuleModuleDefinition>);
}

export function createComponentRegistry(): CapabilityRegistry<ComponentManifest> {
  return new CapabilityRegistry("components", ComponentManifestSchema as z.ZodType<ComponentManifest>);
}

export function createThemeRegistry(): CapabilityRegistry<ThemePack> {
  return new CapabilityRegistry("themes", ThemePackSchema as z.ZodType<ThemePack>);
}

export function createAssetSourceRegistry(): CapabilityRegistry<AssetSourceCapabilityManifest> {
  return new CapabilityRegistry("asset-sources", AssetSourceCapabilityManifestSchema as z.ZodType<AssetSourceCapabilityManifest>);
}

export function createDomainRegistry(): CapabilityRegistry<DomainProfile> {
  return new CapabilityRegistry("domains", DomainProfileSchema as z.ZodType<DomainProfile>);
}

export function createSafetyPolicyRegistry(): CapabilityRegistry<SafetyPolicyPack> {
  return new CapabilityRegistry("safety-policies", SafetyPolicyPackSchema as z.ZodType<SafetyPolicyPack>);
}

export interface PlaycraftRegistries {
  mechanics: CapabilityRegistry<MechanicDefinition>;
  rules: CapabilityRegistry<RuleModuleDefinition>;
  components: CapabilityRegistry<ComponentManifest>;
  themes: CapabilityRegistry<ThemePack>;
  assetSources: CapabilityRegistry<AssetSourceCapabilityManifest>;
  domains: CapabilityRegistry<DomainProfile>;
  safetyPolicies: CapabilityRegistry<SafetyPolicyPack>;
}

export function createEmptyRegistries(): PlaycraftRegistries {
  return {
    mechanics: createMechanicRegistry(),
    rules: createRuleRegistry(),
    components: createComponentRegistry(),
    themes: createThemeRegistry(),
    assetSources: createAssetSourceRegistry(),
    domains: createDomainRegistry(),
    safetyPolicies: createSafetyPolicyRegistry()
  };
}

export interface AssetRecordGenerator {
  manifest: AssetSourceCapabilityManifest;
  generate(request: AssetGenerationRequest): GeneratedAssetRecord;
  generateBatch(requests: AssetGenerationRequest[]): GeneratedAssetRecord[];
}

export interface AssemblyRecipeBuildContext {
  request: PlaycraftAssemblyRequest;
  registries: PlaycraftRegistries;
  assetSource: AssetRecordGenerator;
}

export interface AssemblyRecipe {
  id: string;
  version: string;
  capabilityTags: string[];
  build(context: AssemblyRecipeBuildContext): GameAssemblyProfile;
}

export interface DeterministicAssemblyPlannerOptions {
  id: string;
  version: string;
  recipes: AssemblyRecipe[];
  registries: PlaycraftRegistries;
  assetSource: AssetRecordGenerator;
}

export class DeterministicAssemblyPlanner {
  readonly id: string;
  readonly version: string;
  private readonly recipes: AssemblyRecipe[];
  private readonly registries: PlaycraftRegistries;
  private readonly assetSource: AssetRecordGenerator;

  constructor(options: DeterministicAssemblyPlannerOptions) {
    this.id = options.id;
    this.version = options.version;
    this.recipes = [...options.recipes];
    this.registries = options.registries;
    this.assetSource = options.assetSource;
  }

  assemble(requestInput: PlaycraftAssemblyRequest): GameAssemblyProfile {
    const request = PlaycraftAssemblyRequestSchema.parse(requestInput);
    const recipe = this.selectRecipe(request);
    const profile = recipe.build({
      request,
      registries: this.registries,
      assetSource: this.assetSource
    });

    return GameAssemblyProfileSchema.parse({
      ...profile,
      replay: {
        ...profile.replay,
        plannerId: this.id,
        plannerVersion: this.version
      }
    });
  }

  selectRecipe(request: PlaycraftAssemblyRequest): AssemblyRecipe {
    const requested = new Set(request.intent.requestedCapabilities);
    const selected = this.recipes
      .map((recipe, index) => ({
        recipe,
        index,
        score: recipe.capabilityTags.filter((capability) => requested.has(capability)).length
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.recipe;
    if (!selected) {
      throw new Error(`no deterministic recipe matched requested capabilities: ${[...requested].join(",")}`);
    }

    return selected;
  }
}

export interface ReplayResult {
  profile: GameAssemblyProfile;
  validation: AssemblyValidationResult;
  renderRequests: ComponentRenderRequest[];
  eventLog: PlaycraftEventRecord[];
}

export function replayProfile(profileInput: unknown, registries: PlaycraftRegistries): ReplayResult {
  const parsed = GameAssemblyProfileSchema.safeParse(profileInput);
  if (!parsed.success) {
    throw new Error(`saved profile failed schema validation: ${parsed.error.message}`);
  }

  const profile = parsed.data;
  const validation = validateGameAssemblyProfile(profile, registries);
  if (!validation.valid) {
    throw new Error(`saved profile cannot replay: ${validation.errors.map((issue) => issue.message).join("; ")}`);
  }

  return {
    profile,
    validation,
    renderRequests: profile.components.map((component) => {
      const manifest = registries.components.get(component.componentId, component.version);

      return ComponentRenderRequestSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: `render.${profile.id}.${component.bindingId}`,
        version: "1.0.0",
        kind: "component-render-request",
        profileId: profile.id,
        componentId: component.componentId,
        componentCapability: component.renderCapability,
        mechanicBindingId: component.renderMechanicBindingId,
        props: component.props,
        assetBindings: component.assetBindings,
        expectedEmittedEvents: manifest?.emittedTools.map((toolDefinition) => toolDefinition.toolName) ?? [],
        fallbackPolicy: "fail-closed"
      });
    }),
    eventLog: profile.replay.eventLog
  };
}

export function validateGameAssemblyProfile(profileInput: unknown, registries: PlaycraftRegistries): AssemblyValidationResult {
  const profileParsed = GameAssemblyProfileSchema.safeParse(profileInput);
  if (!profileParsed.success) {
    return validationResult("unknown-profile", false, profileParsed.error.issues.map((issue) => schemaIssue(issue.path, issue.code, issue.message, "error")));
  }

  const profile = profileParsed.data;
  const errors: ReturnType<typeof schemaIssue>[] = [];
  const warnings: ReturnType<typeof schemaIssue>[] = [];

  if (!registries.domains.get(profile.domainProfile.id, profile.domainProfile.version)) {
    errors.push(schemaIssue(["domainProfile"], "missing_registry_reference", `domain profile ${profile.domainProfile.id}@${profile.domainProfile.version} is not registered`, "error"));
  }

  if (!registries.safetyPolicies.get(profile.safetyPolicy.id, profile.safetyPolicy.version)) {
    errors.push(schemaIssue(["safetyPolicy"], "missing_registry_reference", `safety policy ${profile.safetyPolicy.id}@${profile.safetyPolicy.version} is not registered`, "error"));
  }

  if (!registries.themes.get(profile.theme.id, profile.theme.version)) {
    errors.push(schemaIssue(["theme"], "missing_registry_reference", `theme ${profile.theme.id}@${profile.theme.version} is not registered`, "error"));
  }

  for (const [index, mechanic] of profile.mechanics.entries()) {
    if (!registries.mechanics.get(mechanic.mechanicId, mechanic.version)) {
      errors.push(schemaIssue(["mechanics", index], "missing_registry_reference", `mechanic ${mechanic.mechanicId}@${mechanic.version} is not registered`, "error"));
    }
  }

  for (const [index, rule] of profile.rules.entries()) {
    if (!registries.rules.get(rule.ruleId, rule.version)) {
      errors.push(schemaIssue(["rules", index], "missing_registry_reference", `rule ${rule.ruleId}@${rule.version} is not registered`, "error"));
    }
  }

  const mechanicBindingIds = new Set(profile.mechanics.map((mechanic) => mechanic.bindingId));
  const assetIds = new Set(profile.assets.map((asset) => asset.assetId));

  for (const [index, component] of profile.components.entries()) {
    const manifest = registries.components.get(component.componentId, component.version);
    if (!manifest) {
      errors.push(schemaIssue(["components", index], "missing_registry_reference", `component ${component.componentId}@${component.version} is not registered`, "error"));
      continue;
    }

    for (const bindingId of component.mechanicBindingIds) {
      if (!mechanicBindingIds.has(bindingId)) {
        errors.push(schemaIssue(["components", index, "mechanicBindingIds"], "missing_mechanic_binding", `mechanic binding ${bindingId} does not exist`, "error"));
      }
    }
    if (!mechanicBindingIds.has(component.renderMechanicBindingId)) {
      errors.push(schemaIssue(["components", index, "renderMechanicBindingId"], "missing_mechanic_binding", `render mechanic binding ${component.renderMechanicBindingId} does not exist`, "error"));
    }
    if (!component.mechanicBindingIds.includes(component.renderMechanicBindingId)) {
      errors.push(schemaIssue(["components", index, "renderMechanicBindingId"], "unsupported_mechanic_binding", `render mechanic binding ${component.renderMechanicBindingId} is not attached to component ${component.bindingId}`, "error"));
    }

    if (manifest.renderCapability !== component.renderCapability) {
      errors.push(schemaIssue(["components", index, "renderCapability"], "unsupported_capability", `component ${component.componentId} does not provide ${component.renderCapability}`, "error"));
    }

    for (const requirement of manifest.requiredAssets) {
      if (!requirement.required) {
        continue;
      }

      const assetId = component.assetBindings[requirement.binding];
      if (!assetId || !assetIds.has(assetId)) {
        errors.push(schemaIssue(["components", index, "assetBindings", requirement.binding], "missing_asset", `required asset binding ${requirement.binding} is missing`, "error"));
      }
    }
  }

  for (const [index, asset] of profile.assets.entries()) {
    if (!profile.assetRequests.some((request) => request.requestId === asset.requestId)) {
      warnings.push(schemaIssue(["assets", index], "orphan_asset", `asset ${asset.assetId} has no matching request`, "warning"));
    }
  }

  return validationResult(profile.id, errors.length === 0, errors, warnings);
}

export function createPlaycraftEvent(input: Omit<PlaycraftEventRecord, "schemaVersion" | "version" | "kind">): PlaycraftEventRecord {
  return PlaycraftEventRecordSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    version: "1.0.0",
    kind: "playcraft-event",
    ...input
  });
}

function validationResult(profileId: string, valid: boolean, errors: ReturnType<typeof schemaIssue>[], warnings: ReturnType<typeof schemaIssue>[] = []): AssemblyValidationResult {
  return AssemblyValidationResultSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `validation.${profileId}`,
    version: "1.0.0",
    kind: "assembly-validation-result",
    profileId,
    valid,
    errors,
    warnings
  });
}

function keyFor(id: string, version: string): string {
  return `${id}@${version}`;
}

function getStringArray(entry: RegistryEntry, key: string): string[] {
  return getStringArrayFromRecord(entry, key);
}

function getStringArrayFromRecord(record: unknown, key: string): string[] {
  if (typeof record !== "object" || record === null || Array.isArray(record)) {
    return [];
  }

  const value = Reflect.get(record, key);
  return isStringArray(value) ? value : [];
}

interface ContractCompatibilityFields {
  ageBands: string[];
  domainProfileIds: string[];
  modalities: string[];
  safetyPolicyIds: string[];
}

function contractCompatibilityForEntry(entry: RegistryEntry): ContractCompatibilityFields | undefined {
  if (entry.kind !== "mechanic" && entry.kind !== "rule-module") {
    return undefined;
  }

  const compatibility = Reflect.get(entry, "compatibility");
  if (!isContractCompatibilityFields(compatibility)) {
    return undefined;
  }

  return compatibility;
}

function isContractCompatibilityFields(value: unknown): value is ContractCompatibilityFields {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<Record<keyof ContractCompatibilityFields, unknown>>;
  return (
    isStringArray(candidate.ageBands) &&
    isStringArray(candidate.domainProfileIds) &&
    isStringArray(candidate.modalities) &&
    isStringArray(candidate.safetyPolicyIds)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function domainProfileIdsForEntry(entry: RegistryEntry): string[] {
  if (entry.kind === "domain-profile") {
    return [entry.id];
  }

  if (entry.kind === "component" || entry.kind === "theme" || entry.kind === "safety-policy") {
    return getStringArray(entry, "supportedDomains");
  }

  return contractCompatibilityForEntry(entry)?.domainProfileIds ?? [];
}

function safetyPolicyIdsForEntry(entry: RegistryEntry): string[] {
  if (entry.kind === "component") {
    return getStringArray(entry, "safetyPolicyIds");
  }

  if (entry.kind === "domain-profile" && typeof entry.defaultSafetyPolicyId === "string") {
    return [entry.defaultSafetyPolicyId];
  }

  return contractCompatibilityForEntry(entry)?.safetyPolicyIds ?? [];
}

function ageBandsForEntry(entry: RegistryEntry): string[] {
  if (entry.kind === "mechanic" || entry.kind === "component" || entry.kind === "theme") {
    return getStringArray(entry, "supportedAgeBands");
  }

  if (entry.kind === "domain-profile" || entry.kind === "safety-policy") {
    return getStringArray(entry, "ageBands");
  }

  return contractCompatibilityForEntry(entry)?.ageBands ?? [];
}

function modalitiesForEntry(entry: RegistryEntry): string[] {
  if (entry.kind === "mechanic") {
    return getStringArray(entry, "supportedModalities");
  }

  if (entry.kind === "domain-profile") {
    return getStringArray(entry, "modalities");
  }

  return contractCompatibilityForEntry(entry)?.modalities ?? [];
}
