import { AssemblyValidationResultSchema, AssetSourceCapabilityManifestSchema, BuilderTemplateNamespaceSchema, ComponentManifestSchema, ComponentRenderRequestSchema, DomainProfileSchema, GameAssemblyProfileSchema, GameProfileTemplateSnapshotSchema, MechanicDefinitionSchema, PLAYCRAFT_SCHEMA_VERSION, PlaycraftAssemblyRequestSchema, PlaycraftEventRecordSchema, RuleModuleDefinitionSchema, SafetyPolicyPackSchema, ThemePackSchema, schemaIssue } from "@playcraft/contracts";
import { DEFAULT_REGISTRY_CONSTRAINTS } from "./registry-constraints.js";
import { DEFAULT_RECIPE_SCORE, evaluateRecipeScore } from "./planner-score.js";
export class CapabilityRegistry {
    name;
    schema;
    entries = new Map();
    constructor(name, schema) {
        this.name = name;
        this.schema = schema;
    }
    register(entryInput) {
        const entry = this.schema.parse(entryInput);
        this.entries.set(keyFor(entry.id, entry.version), entry);
        return this;
    }
    registerMany(entries) {
        for (const entry of entries) {
            this.register(entry);
        }
        return this;
    }
    get(id, version) {
        if (version) {
            return this.entries.get(keyFor(id, version));
        }
        const matches = this.all().filter((entry) => entry.id === id);
        if (matches.length > 1) {
            throw new Error(`${this.name} has multiple versions for ${id}; pass version`);
        }
        return singleValue(matches);
    }
    all() {
        return [...this.entries.values()];
    }
    select(query) {
        const matches = [];
        const rejected = [];
        const versionConflicts = [];
        for (const entry of this.all()) {
            const reasons = this.rejectionReasons(entry, query);
            if (reasons.length === 0) {
                matches.push(entry);
            }
            else {
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
            selected: singleValue(matches) ?? null,
            matches,
            rejected,
            missingCapabilities,
            versionConflicts,
            warnings: registrySelectionWarnings(this.name, matches)
        };
    }
    rejectionReasons(entry, query) {
        const reasons = [];
        for (const constraint of DEFAULT_REGISTRY_CONSTRAINTS) {
            reasons.push(...constraint.evaluate(entry, query));
        }
        return reasons;
    }
}
function registrySelectionWarnings(registryName, matches) {
    if (matches.length === 0) {
        return [`${registryName} found no matching candidates`];
    }
    if (matches.length > 1) {
        return [`${registryName} found multiple matching candidates: ${matches.map((entry) => entry.id).join(", ")}`];
    }
    return [];
}
function singleValue(values) {
    return values.length === 1 ? values[0] : undefined;
}
function requireSingleValue(values, label) {
    const value = singleValue(values);
    if (value === undefined) {
        throw new Error(`${label} requires exactly one value`);
    }
    return value;
}
export function createMechanicRegistry() {
    return new CapabilityRegistry("mechanics", MechanicDefinitionSchema);
}
export function createRuleRegistry() {
    return new CapabilityRegistry("rules", RuleModuleDefinitionSchema);
}
export function createComponentRegistry() {
    return new CapabilityRegistry("components", ComponentManifestSchema);
}
export function createThemeRegistry() {
    return new CapabilityRegistry("themes", ThemePackSchema);
}
export function createAssetSourceRegistry() {
    return new CapabilityRegistry("asset-sources", AssetSourceCapabilityManifestSchema);
}
export function createDomainRegistry() {
    return new CapabilityRegistry("domains", DomainProfileSchema);
}
export function createSafetyPolicyRegistry() {
    return new CapabilityRegistry("safety-policies", SafetyPolicyPackSchema);
}
export function createEmptyRegistries() {
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
export class DeterministicAssemblyPlanner {
    id;
    version;
    recipes;
    registries;
    assetSource;
    constructor(options) {
        this.id = options.id;
        this.version = options.version;
        this.recipes = [...options.recipes];
        this.registries = options.registries;
        this.assetSource = options.assetSource;
    }
    /**
     * Register a runtime-authored recipe (LLM-authored or remote-agent). The
     * recipe id must match the `recipe.local-authored.*` or
     * `recipe.remote-agent.*` namespace (or `recipe.bundled.*` if you are
     * intentionally re-registering a bundled recipe with a new version).
     * `capabilityTags` must be non-empty; the recipe is deduped by `id`.
     *
     * Throws on namespace violation, missing `capabilityTags`, or duplicate id.
     */
    registerRecipe(recipeInput) {
        const recipe = validateRecipeForRegistration(recipeInput);
        const existingIndex = this.recipes.findIndex((candidate) => candidate.id === recipe.id);
        if (existingIndex >= 0) {
            throw new Error(`recipe ${recipe.id} is already registered with the planner`);
        }
        this.recipes.push(recipe);
        return this;
    }
    assemble(requestInput) {
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
    selectRecipe(request) {
        const requested = new Set(request.intent.requestedCapabilities);
        const candidates = this.recipes
            .map((recipe) => ({
            recipe,
            score: evaluateRecipeScore(DEFAULT_RECIPE_SCORE, recipe.capabilityTags, requested)
        }))
            .filter((candidate) => candidate.score > 0);
        if (candidates.length === 0) {
            throw new Error(`no deterministic recipe matched requested capabilities: ${[...requested].join(",")}`);
        }
        const bestScore = Math.max(...candidates.map((candidate) => candidate.score));
        const bestCandidates = candidates.filter((candidate) => candidate.score === bestScore);
        if (bestCandidates.length > 1) {
            throw new Error(`ambiguous deterministic recipes matched requested capabilities: ${bestCandidates.map((candidate) => candidate.recipe.id).join(", ")}`);
        }
        return requireSingleValue(bestCandidates, "deterministic planner best candidate").recipe;
    }
}
const RECIPE_NAMESPACE_PREFIXES = ["recipe.bundled.", "recipe.local-authored.", "recipe.remote-agent."];
function isValidRecipeId(id) {
    return typeof id === "string" && id.length > 0 && RECIPE_NAMESPACE_PREFIXES.some((prefix) => id.startsWith(prefix));
}
function validateRecipeForRegistration(recipeInput) {
    if (!recipeInput || typeof recipeInput !== "object") {
        throw new Error("recipe must be an object");
    }
    if (!isValidRecipeId(recipeInput.id)) {
        throw new Error(`recipe id ${recipeInput.id} must start with one of: ${RECIPE_NAMESPACE_PREFIXES.join(", ")}`);
    }
    if (typeof recipeInput.version !== "string" || recipeInput.version.length === 0) {
        throw new Error(`recipe ${recipeInput.id} must declare a non-empty version`);
    }
    if (!Array.isArray(recipeInput.capabilityTags) || recipeInput.capabilityTags.length === 0) {
        throw new Error(`recipe ${recipeInput.id} must declare a non-empty capabilityTags array`);
    }
    if (typeof recipeInput.build !== "function") {
        throw new Error(`recipe ${recipeInput.id} must declare a build function`);
    }
    return recipeInput;
}
export function replayProfile(profileInput, registries) {
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
            const manifest = requiredReplayComponentManifest(profile, component.componentId, component.version, registries);
            return ComponentRenderRequestSchema.parse({
                schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
                id: `render.${profile.id}.${component.bindingId}`,
                version: "1.0.0",
                kind: "component-render-request",
                profileId: profile.id,
                componentId: component.componentId,
                componentVersion: component.version,
                componentCapability: component.renderCapability,
                mechanicBindingId: component.renderMechanicBindingId,
                props: component.props,
                assetBindings: component.assetBindings,
                emittedToolNames: manifest.emittedTools.map((toolDefinition) => toolDefinition.toolName),
                expectedEmittedEvents: manifest.emittedTools.flatMap((toolDefinition) => toolDefinition.emittedEvents),
                fallbackPolicy: "fail-closed"
            });
        }),
        eventLog: profile.replay.eventLog
    };
}
export function roundTripCustomTemplate(profileInput, registries) {
    const parsed = GameAssemblyProfileSchema.safeParse(profileInput);
    if (!parsed.success) {
        throw new Error(`saved profile failed schema validation: ${parsed.error.message}`);
    }
    const profile = parsed.data;
    const snapshot = profile.template;
    BuilderTemplateNamespaceSchema.parse(snapshot.id);
    const validation = validateGameAssemblyProfile(profile, registries);
    if (!validation.valid) {
        throw new Error(`saved custom template profile cannot replay: ${validation.errors.map((issue) => issue.message).join("; ")}`);
    }
    const serialized = JSON.parse(JSON.stringify(snapshot));
    const reparsed = GameProfileTemplateSnapshotSchema.parse(serialized);
    if (reparsed.id !== snapshot.id) {
        throw new Error(`custom template round-trip changed snapshot id from ${snapshot.id} to ${reparsed.id}`);
    }
    if (reparsed.liveSurface.kind !== snapshot.liveSurface.kind) {
        throw new Error(`custom template round-trip changed liveSurface kind from ${snapshot.liveSurface.kind} to ${reparsed.liveSurface.kind}`);
    }
    if (reparsed.assemblyRequestId !== snapshot.assemblyRequestId) {
        throw new Error(`custom template round-trip changed assemblyRequestId from ${snapshot.assemblyRequestId} to ${reparsed.assemblyRequestId}`);
    }
    return reparsed;
}
function requiredReplayComponentManifest(profile, componentId, version, registries) {
    const manifest = registries.components.get(componentId, version);
    if (!manifest) {
        throw new Error(`saved profile ${profile.id} cannot replay missing component manifest ${componentId}@${version}`);
    }
    return manifest;
}
export function validateGameAssemblyProfile(profileInput, registries) {
    const profileParsed = GameAssemblyProfileSchema.safeParse(profileInput);
    if (!profileParsed.success) {
        return validationResult("unknown-profile", false, profileParsed.error.issues.map((issue) => schemaIssue(issue.path, issue.code, issue.message, "error")));
    }
    const profile = profileParsed.data;
    const errors = [];
    const warnings = [];
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
    for (const [index, component] of profile.components.entries()) {
        const manifest = registries.components.get(component.componentId, component.version);
        if (!manifest) {
            errors.push(schemaIssue(["components", index], "missing_registry_reference", `component ${component.componentId}@${component.version} is not registered`, "error"));
            continue;
        }
        if (manifest.renderCapability !== component.renderCapability) {
            errors.push(schemaIssue(["components", index, "renderCapability"], "unsupported_capability", `component ${component.componentId} does not provide ${component.renderCapability}`, "error"));
        }
        const knownAssetBindings = new Set(manifest.requiredAssets.map((requirement) => requirement.binding));
        const unknownAssetBindings = Object.keys(component.assetBindings).filter((binding) => !knownAssetBindings.has(binding));
        if (unknownAssetBindings.length > 0) {
            errors.push(schemaIssue(["components", index, "assetBindings"], "unknown_asset_binding", `component ${component.bindingId} has unknown asset bindings: ${unknownAssetBindings.join(", ")}`, "error"));
        }
        for (const requirement of manifest.requiredAssets) {
            if (!requirement.required) {
                continue;
            }
            const assetId = component.assetBindings[requirement.binding];
            if (!assetId) {
                errors.push(schemaIssue(["components", index, "assetBindings", requirement.binding], "missing_asset", `required asset binding ${requirement.binding} is missing`, "error"));
            }
        }
    }
    return validationResult(profile.id, errors.length === 0, errors, warnings);
}
export function createPlaycraftEvent(input) {
    return PlaycraftEventRecordSchema.parse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        version: "1.0.0",
        kind: "playcraft-event",
        ...input
    });
}
function validationResult(profileId, valid, errors, warnings = []) {
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
function keyFor(id, version) {
    return `${id}@${version}`;
}
function getStringArray(entry, key) {
    return getStringArrayFromRecord(entry, key);
}
function getStringArrayFromRecord(record, key) {
    if (typeof record !== "object" || record === null || Array.isArray(record)) {
        return [];
    }
    const value = record[key];
    return isStringArray(value) ? value : [];
}
function isStringArray(value) {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
}
export { AGENT_STUB_ENGINE_ID, MoonshineStreamingCpuEngine, StubLocalInferenceEngine, defaultMoonshineStreamingCpuEngineManifest, defaultStubEngineManifest, outlinesJsonSchemaForToolArguments } from "./local-llm.js";
export { AgentLoop, agentLoopToolsFromBuilderDefinitions } from "./agent-loop.js";
export { NullRemoteEnrichmentSource } from "./enrichment.js";
//# sourceMappingURL=index.js.map