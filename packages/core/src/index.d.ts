import type { z } from "zod";
import { type AssemblyValidationResult, type AssetGenerationRequest, type AssetSourceCapabilityManifest, type ComponentManifest, type ComponentRenderRequest, type DomainProfile, type GameAssemblyProfile, type GameProfileTemplateSnapshot, type GeneratedAssetRecord, type MechanicDefinition, type PlaycraftAssemblyRequest, type PlaycraftEventRecord, type RuleModuleDefinition, type SafetyPolicyPack, type ThemePack } from "@playcraft/contracts";
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
    versionConflicts: Array<{
        id: string;
        requested: string;
        available: string;
    }>;
    warnings: string[];
}
export declare class CapabilityRegistry<TEntry extends RegistryEntry> {
    readonly name: string;
    private readonly schema;
    private readonly entries;
    constructor(name: string, schema: z.ZodType<TEntry>);
    register(entryInput: TEntry): this;
    registerMany(entries: TEntry[]): this;
    get(id: string, version?: string): TEntry | undefined;
    all(): TEntry[];
    select(query: RegistryQuery): RegistryMatchResult<TEntry>;
    private rejectionReasons;
}
export declare function createMechanicRegistry(): CapabilityRegistry<MechanicDefinition>;
export declare function createRuleRegistry(): CapabilityRegistry<RuleModuleDefinition>;
export declare function createComponentRegistry(): CapabilityRegistry<ComponentManifest>;
export declare function createThemeRegistry(): CapabilityRegistry<ThemePack>;
export declare function createAssetSourceRegistry(): CapabilityRegistry<AssetSourceCapabilityManifest>;
export declare function createDomainRegistry(): CapabilityRegistry<DomainProfile>;
export declare function createSafetyPolicyRegistry(): CapabilityRegistry<SafetyPolicyPack>;
export interface PlaycraftRegistries {
    mechanics: CapabilityRegistry<MechanicDefinition>;
    rules: CapabilityRegistry<RuleModuleDefinition>;
    components: CapabilityRegistry<ComponentManifest>;
    themes: CapabilityRegistry<ThemePack>;
    assetSources: CapabilityRegistry<AssetSourceCapabilityManifest>;
    domains: CapabilityRegistry<DomainProfile>;
    safetyPolicies: CapabilityRegistry<SafetyPolicyPack>;
}
export declare function createEmptyRegistries(): PlaycraftRegistries;
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
/**
 * Recipe ID namespace convention (forward-only, no migration):
 *   - `recipe.bundled.<slug>` — recipes shipped with a `@playcraft/packs`
 *     package and discovered by the default planner.
 *   - `recipe.local-authored.<slug>` — recipes authored at runtime by the
 *     local LLM agent loop and registered through
 *     `DeterministicAssemblyPlanner.registerRecipe(...)`.
 *   - `recipe.remote-agent.<slug>` — recipes fetched from the remote
 *     enrichment layer and registered the same way.
 *
 * The convention is enforced by code review and by
 * `AssemblyRecipeRegisterSchema` (in `@playcraft/contracts`) — there is no
 * runtime switch, no migration, and no backwards-compat path. A recipe id
 * that does not start with one of these three prefixes is rejected at
 * registration time.
 */
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
export declare class DeterministicAssemblyPlanner {
    readonly id: string;
    readonly version: string;
    private readonly recipes;
    private readonly registries;
    private readonly assetSource;
    constructor(options: DeterministicAssemblyPlannerOptions);
    /**
     * Register a runtime-authored recipe (LLM-authored or remote-agent). The
     * recipe id must match the `recipe.local-authored.*` or
     * `recipe.remote-agent.*` namespace (or `recipe.bundled.*` if you are
     * intentionally re-registering a bundled recipe with a new version).
     * `capabilityTags` must be non-empty; the recipe is deduped by `id`.
     *
     * Throws on namespace violation, missing `capabilityTags`, or duplicate id.
     */
    registerRecipe(recipeInput: AssemblyRecipe): this;
    assemble(requestInput: PlaycraftAssemblyRequest): GameAssemblyProfile;
    selectRecipe(request: PlaycraftAssemblyRequest): AssemblyRecipe;
}
export interface ReplayResult {
    profile: GameAssemblyProfile;
    validation: AssemblyValidationResult;
    renderRequests: ComponentRenderRequest[];
    eventLog: PlaycraftEventRecord[];
}
export declare function replayProfile(profileInput: unknown, registries: PlaycraftRegistries): ReplayResult;
export declare function roundTripCustomTemplate(profileInput: unknown, registries: PlaycraftRegistries): GameProfileTemplateSnapshot;
export declare function validateGameAssemblyProfile(profileInput: unknown, registries: PlaycraftRegistries): AssemblyValidationResult;
export declare function createPlaycraftEvent(input: Omit<PlaycraftEventRecord, "schemaVersion" | "version" | "kind">): PlaycraftEventRecord;
export { AGENT_STUB_ENGINE_ID, MoonshineStreamingCpuEngine, StubLocalInferenceEngine, defaultMoonshineStreamingCpuEngineManifest, defaultStubEngineManifest, outlinesJsonSchemaForToolArguments } from "./local-llm.js";
export type { AgentInferenceResult, AgentPrompt, AgentToolArgumentsSchema, AgentToolDescriptor, AgentToolField, LocalInferenceEngine } from "./local-llm.js";
export { AgentLoop, agentLoopToolsFromBuilderDefinitions } from "./agent-loop.js";
export type { AgentLoopOptions, AgentLoopResult, AgentToolExecutionContext, AgentToolExecutor } from "./agent-loop.js";
export { NullRemoteEnrichmentSource } from "./enrichment.js";
export type { RemoteEnrichmentSource } from "./enrichment.js";
//# sourceMappingURL=index.d.ts.map