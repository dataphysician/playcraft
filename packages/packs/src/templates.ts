import {
  AssemblyValidationResultSchema,
  AssetGenerationRequestSchema,
  GameAssemblyProfileSchema,
  GameProfileTemplateSnapshotSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type ComponentManifest,
  type GameAssemblyProfile,
  type GameTemplateAssetEditOperation,
  type GameTemplateAssetPromptKind,
  type GameTemplateLiveSurface,
  type GeneratedAssetRecord,
  type JsonValue,
  type MechanicDefinition,
  type PlaycraftAssemblyRequest,
  type RuleModuleDefinition
} from "@playcraft/contracts";
import {
  createPlaycraftEvent,
  validateGameAssemblyProfile,
  type AssemblyRecipeBuildContext
} from "@playcraft/core";
import { componentManifests } from "./components.js";
import { DEFAULT_DOMAIN_ID, DEFAULT_SAFETY_POLICY_ID } from "./domains.js";
import { mechanicDefinitions, memoryMechanicEventBindings, sequenceMechanicEventBindings, sortingMechanicEventBindings } from "./mechanics.js";
import { ruleModuleDefinitions } from "./rules.js";
import {
  defaultMemoryTokenStyle,
  defaultToddlerTokenStyle,
  memoryPairTokenStyles,
  toddlerTokenStyles
} from "./themes.js";

export type TemplateInputModality = "touch" | "pointer" | "keyboard";

const memoryAssetEditOperations: GameTemplateAssetEditOperation[] = [
  { componentCapability: "component:reveal-card-grid", operation: "memory-pairs" },
  { componentCapability: "component:celebration-overlay", operation: "completion-message" }
];

const sortingAssetEditOperations: GameTemplateAssetEditOperation[] = [
  { componentCapability: "component:choice-grid", operation: "choice-items" },
  { componentCapability: "component:sort-bins", operation: "sorting-items" },
  { componentCapability: "component:hint-bubble", operation: "hint-message" }
];

const sequenceAssetEditOperations: GameTemplateAssetEditOperation[] = [
  { componentCapability: "component:sequence-pad", operation: "sequence-items" },
  { componentCapability: "component:choice-grid", operation: "choice-items" },
  { componentCapability: "component:celebration-overlay", operation: "completion-message" }
];

interface MvpProfileTemplate {
  id: string;
  requestLabel: string;
  requestedCapabilities: string[];
  deterministicSeed: string;
  displayLabel: string;
  description: string;
  capabilityTags: string[];
  requestAliases: string[];
  requestAliasSummary: string;
  exampleRequest: string;
  assetPromptKind: GameTemplateAssetPromptKind;
  assetEditOperations: GameTemplateAssetEditOperation[];
  liveSurface: GameTemplateLiveSurface;
  profileId: string;
  profileName: string;
  assetPrompt: string;
  primaryInputModality: TemplateInputModality;
  mechanicCapabilities: string[];
  mechanicEventBindings: Record<string, Record<string, string>>;
  componentMechanicCapabilities: Record<string, string[]>;
  componentRenderMechanicCapabilities: Record<string, string>;
  ruleCategories: string[];
  componentCapabilities: string[];
  propsByCapability: Record<string, Record<string, JsonValue>>;
}

export type { MvpProfileTemplate };

export function pairedCards(items: string[]): { cards: string[]; pairs: Record<string, string> } {
  const cards = items.flatMap((item) => [`${item}-a`, `${item}-b`]);
  const pairs = Object.fromEntries(
    cards.map((card, index) => [card, `pair-${Math.floor(index / 2) + 1}`])
  );
  return { cards, pairs };
}

export function memoryTemplate(input: {
  aliases: string[];
  displayLabel: string;
  exampleRequest: string;
  label: string;
  name: string;
  pairItems: string[];
  prompt: string;
  requestAliasSummary: string;
  seed: string;
  slug: string;
  title: string;
}): MvpProfileTemplate {
  const pairs = pairedCards(input.pairItems);
  return {
    id: `template.${input.slug}`,
    requestLabel: input.label,
    requestedCapabilities: [`game:${input.slug}`],
    deterministicSeed: input.seed,
    displayLabel: input.displayLabel,
    description: `A toddler-safe matching game for ${input.title.toLowerCase()}.`,
    capabilityTags: [`game:${input.slug}`, "mechanic:match-pairs"],
    requestAliases: input.aliases,
    requestAliasSummary: input.requestAliasSummary,
    exampleRequest: input.exampleRequest,
    assetPromptKind: "memory-cards",
    assetEditOperations: memoryAssetEditOperations,
    liveSurface: {
      kind: "memory",
      componentCapabilities: { primary: "component:reveal-card-grid" },
      assetReplacementSources: [{
        componentRole: "primary",
        prop: "cards",
        namespace: "card",
        pairMapProp: "pairs"
      }],
      tokenStyles: memoryPairTokenStyles,
      defaultTokenStyle: defaultMemoryTokenStyle
    },
    profileId: `profile.${input.slug}.mvp`,
    profileName: input.name,
    assetPrompt: input.prompt,
    primaryInputModality: "touch",
    mechanicCapabilities: ["mechanic:tap-to-reveal", "mechanic:match-pairs", "feedback:celebration"],
    mechanicEventBindings: memoryMechanicEventBindings,
    componentMechanicCapabilities: {
      "component:reveal-card-grid": ["mechanic:tap-to-reveal", "mechanic:match-pairs"],
      "component:celebration-overlay": ["feedback:celebration"]
    },
    componentRenderMechanicCapabilities: {
      "component:reveal-card-grid": "mechanic:tap-to-reveal",
      "component:celebration-overlay": "feedback:celebration"
    },
    ruleCategories: ["pair-matching", "retry", "hint", "completion"],
    componentCapabilities: ["component:reveal-card-grid", "component:celebration-overlay"],
    propsByCapability: {
      "component:reveal-card-grid": {
        title: input.title,
        cards: pairs.cards,
        pairs: pairs.pairs,
        columns: 2
      },
      "component:celebration-overlay": { message: `${input.title} complete.` }
    }
  };
}

export function sortingTemplate(input: {
  aliases: string[];
  bins: string[];
  displayLabel: string;
  exampleRequest: string;
  hint: string;
  items: string[];
  label: string;
  name: string;
  prompt: string;
  promptText: string;
  requestAliasSummary: string;
  seed: string;
  slug: string;
  targets: Record<string, string>;
  title: string;
}): MvpProfileTemplate {
  return {
    id: `template.${input.slug}`,
    requestLabel: input.label,
    requestedCapabilities: [`game:${input.slug}`],
    deterministicSeed: input.seed,
    displayLabel: input.displayLabel,
    description: `A toddler-safe sorting game for ${input.title.toLowerCase()}.`,
    capabilityTags: [`game:${input.slug}`, "mechanic:sort-into-bins"],
    requestAliases: input.aliases,
    requestAliasSummary: input.requestAliasSummary,
    exampleRequest: input.exampleRequest,
    assetPromptKind: "sorting-game",
    assetEditOperations: sortingAssetEditOperations,
    liveSurface: {
      kind: "sorting",
      componentCapabilities: { primary: "component:sort-bins" },
      assetReplacementSources: [{
        componentRole: "primary",
        prop: "items",
        namespace: "item"
      }],
      tokenStyles: toddlerTokenStyles,
      defaultTokenStyle: defaultToddlerTokenStyle
    },
    profileId: `profile.${input.slug}.mvp`,
    profileName: input.name,
    assetPrompt: input.prompt,
    primaryInputModality: "touch",
    mechanicCapabilities: ["mechanic:tap-to-select", "mechanic:sort-into-bins", "support:retry", "support:hint"],
    mechanicEventBindings: sortingMechanicEventBindings,
    componentMechanicCapabilities: {
      "component:choice-grid": ["mechanic:tap-to-select"],
      "component:sort-bins": ["mechanic:sort-into-bins"],
      "component:hint-bubble": ["support:hint"]
    },
    componentRenderMechanicCapabilities: {
      "component:choice-grid": "mechanic:tap-to-select",
      "component:sort-bins": "mechanic:sort-into-bins",
      "component:hint-bubble": "support:hint"
    },
    ruleCategories: ["category-validation", "retry", "completion"],
    componentCapabilities: ["component:choice-grid", "component:sort-bins", "component:hint-bubble"],
    propsByCapability: {
      "component:choice-grid": { title: input.title, prompt: input.promptText, items: input.items },
      "component:sort-bins": {
        title: input.title,
        items: input.items,
        bins: input.bins,
        targets: input.targets
      },
      "component:hint-bubble": { hint: input.hint }
    }
  };
}

export function sequenceTemplate(input: {
  aliases: string[];
  displayLabel: string;
  exampleRequest: string;
  items: string[];
  label: string;
  name: string;
  prompt: string;
  promptText: string;
  requestAliasSummary: string;
  rounds: string[][];
  seed: string;
  sequence: string[];
  slug: string;
  title: string;
}): MvpProfileTemplate {
  return {
    id: `template.${input.slug}`,
    requestLabel: input.label,
    requestedCapabilities: [`game:${input.slug}`],
    deterministicSeed: input.seed,
    displayLabel: input.displayLabel,
    description: `A toddler-safe sequence game for ${input.title.toLowerCase()}.`,
    capabilityTags: [`game:${input.slug}`, "mechanic:sequence-repeat"],
    requestAliases: input.aliases,
    requestAliasSummary: input.requestAliasSummary,
    exampleRequest: input.exampleRequest,
    assetPromptKind: "sequence-buttons",
    assetEditOperations: sequenceAssetEditOperations,
    liveSurface: {
      kind: "sequence",
      componentCapabilities: {
        primary: "component:sequence-pad",
        choice: "component:choice-grid"
      },
      assetReplacementSources: [
        {
          componentRole: "primary",
          prop: "sequence",
          namespace: "choice"
        },
        {
          componentRole: "choice",
          prop: "items",
          namespace: "choice"
        }
      ],
      tokenStyles: toddlerTokenStyles,
      defaultTokenStyle: defaultToddlerTokenStyle
    },
    profileId: `profile.${input.slug}.mvp`,
    profileName: input.name,
    assetPrompt: input.prompt,
    primaryInputModality: "touch",
    mechanicCapabilities: ["mechanic:sequence-repeat", "mechanic:tap-to-select", "feedback:celebration"],
    mechanicEventBindings: sequenceMechanicEventBindings,
    componentMechanicCapabilities: {
      "component:sequence-pad": ["mechanic:sequence-repeat", "mechanic:tap-to-select"],
      "component:choice-grid": ["mechanic:tap-to-select"],
      "component:celebration-overlay": ["feedback:celebration"]
    },
    componentRenderMechanicCapabilities: {
      "component:sequence-pad": "mechanic:sequence-repeat",
      "component:choice-grid": "mechanic:tap-to-select",
      "component:celebration-overlay": "feedback:celebration"
    },
    ruleCategories: ["progression", "attempt-feedback", "hint"],
    componentCapabilities: ["component:sequence-pad", "component:choice-grid", "component:celebration-overlay"],
    propsByCapability: {
      "component:sequence-pad": {
        title: input.title,
        prompt: input.promptText,
        sequence: input.sequence,
        rounds: input.rounds
      },
      "component:choice-grid": { title: input.title, prompt: input.promptText, items: input.items },
      "component:celebration-overlay": { message: `${input.title} complete.` }
    }
  };
}

export function request(id: string, label: string, capabilities: string[], seed: string): PlaycraftAssemblyRequest {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "assembly-request",
    intent: {
      label,
      goals: ["goal:educational", "goal:replayable"],
      requestedCapabilities: capabilities
    },
    domainProfileId: DEFAULT_DOMAIN_ID,
    safetyPolicyId: DEFAULT_SAFETY_POLICY_ID,
    targetModalities: ["touch", "pointer"],
    ageBand: "4-6",
    deterministicSeed: seed
  };
}

export function findMechanicByCapability(capability: string): MechanicDefinition {
  const matches = mechanicDefinitions.filter((entry) => entry.capabilityTags.includes(capability));
  if (matches.length === 0) {
    throw new Error(`missing mechanic capability ${capability}`);
  }
  if (matches.length > 1) {
    throw new Error(`duplicate mechanic capability ${capability}`);
  }
  const [mechanic] = matches;
  return mechanic;
}

export function findRuleByCategory(category: string): RuleModuleDefinition {
  const matches = ruleModuleDefinitions.filter((entry) => entry.category === category);
  if (matches.length === 0) {
    throw new Error(`missing rule category ${category}`);
  }
  if (matches.length > 1) {
    throw new Error(`duplicate rule category ${category}`);
  }
  const [ruleEntry] = matches;
  return ruleEntry;
}

export function findComponentByCapability(capability: string): ComponentManifest {
  const matches = componentManifests.filter((entry) => entry.renderCapability === capability);
  if (matches.length === 0) {
    throw new Error(`missing component capability ${capability}`);
  }
  if (matches.length > 1) {
    throw new Error(`duplicate component capability ${capability}`);
  }
  const [componentEntry] = matches;
  return componentEntry;
}

export function requireSelected<T extends { id: string }>(result: { selected: T | null; warnings: string[] }): T {
  if (!result.selected) {
    throw new Error(result.warnings.join("; ") || "registry selection failed");
  }

  return result.selected;
}

export function singleValue<TValue>(values: TValue[]): TValue | undefined {
  return values.length === 1 ? values[0] : undefined;
}

export function requireSingleValue<TValue>(values: TValue[], label: string): TValue {
  const value = singleValue(values);
  if (value === undefined) {
    throw new Error(`${label} requires exactly one value`);
  }
  return value;
}

function requiredMechanicEventBindings(template: MvpProfileTemplate, capability: string, emittedEvents: string[]): Record<string, string> {
  const eventBindings = template.mechanicEventBindings[capability];
  if (!eventBindings) {
    throw new Error(`${template.id} is missing authored mechanic event bindings for ${capability}`);
  }

  for (const [bindingName, eventName] of Object.entries(eventBindings)) {
    if (!emittedEvents.includes(eventName)) {
      throw new Error(`${template.id} mechanic ${capability} binding ${bindingName} references ${eventName}, which the selected mechanic does not emit`);
    }
  }

  return eventBindings;
}

function requiredTemplateTargetModality(template: MvpProfileTemplate, requestedModalities: TemplateInputModality[]): TemplateInputModality {
  if (!requestedModalities.includes(template.primaryInputModality)) {
    throw new Error(`${template.id} requires target modality ${template.primaryInputModality}`);
  }

  return template.primaryInputModality;
}

function requiredComponentRenderMechanicBindingId(
  template: MvpProfileTemplate,
  componentCapability: string,
  mechanicBindingIds: string[],
  mechanicBindingByCapability: Map<string, { bindingId: string; mechanicId: string }>
): string {
  const mechanicCapability = template.componentRenderMechanicCapabilities[componentCapability];
  if (!mechanicCapability) {
    throw new Error(`${template.id} is missing a render mechanic capability for ${componentCapability}`);
  }

  const binding = mechanicBindingByCapability.get(mechanicCapability);
  if (!binding) {
    throw new Error(`${template.id} component ${componentCapability} references missing mechanic capability ${mechanicCapability}`);
  }

  if (!mechanicBindingIds.includes(binding.bindingId)) {
    throw new Error(`${template.id} component ${componentCapability} render mechanic ${mechanicCapability} is not attached to the selected component`);
  }

  return binding.bindingId;
}

function requiredComponentMechanicBindingIds(
  template: MvpProfileTemplate,
  componentCapability: string,
  selectedSupportedMechanicIds: string[],
  mechanicBindingByCapability: Map<string, { bindingId: string; mechanicId: string }>
): string[] {
  const mechanicCapabilities = template.componentMechanicCapabilities[componentCapability];
  if (!mechanicCapabilities || mechanicCapabilities.length === 0) {
    throw new Error(`${template.id} is missing authored component mechanic capabilities for ${componentCapability}`);
  }

  return mechanicCapabilities.map((mechanicCapability) => {
    const binding = mechanicBindingByCapability.get(mechanicCapability);
    if (!binding) {
      throw new Error(`${template.id} component ${componentCapability} references missing mechanic capability ${mechanicCapability}`);
    }
    if (!selectedSupportedMechanicIds.includes(binding.mechanicId)) {
      throw new Error(`${template.id} component ${componentCapability} mechanic ${mechanicCapability} is not supported by the selected component`);
    }

    return binding.bindingId;
  });
}

function requiredGeneratedAssetForRequestId(
  template: MvpProfileTemplate,
  assets: GeneratedAssetRecord[],
  requestId: string
): GeneratedAssetRecord {
  const matches = assets.filter((candidate) => candidate.requestId === requestId);
  if (matches.length === 0) {
    throw new Error(`${template.id} did not receive a generated asset for request ${requestId}`);
  }
  if (matches.length > 1) {
    throw new Error(`${template.id} received multiple generated assets for request ${requestId}: ${matches.map((asset) => asset.assetId).join(", ")}`);
  }

  return requireSingleValue(matches, `generated asset for request ${requestId}`);
}

function validAssemblyResult(profileId: string) {
  return AssemblyValidationResultSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `validation.${profileId}`,
    version: "1.0.0",
    kind: "assembly-validation-result",
    profileId,
    valid: true,
    errors: [],
    warnings: []
  });
}

const TEMPLATE_REPLAY_PLANNER_ID = "planner.deterministic.mvp";

function buildProfileFromTemplate(template: MvpProfileTemplate, context: AssemblyRecipeBuildContext): GameAssemblyProfile {
  const domain = requireSelected(context.registries.domains.select({ ids: [context.request.domainProfileId], ageBand: context.request.ageBand }));
  const safety = requireSelected(context.registries.safetyPolicies.select({
    ids: [context.request.safetyPolicyId ?? domain.defaultSafetyPolicyId],
    domainProfileId: domain.id,
    ageBand: context.request.ageBand
  }));
  const theme = requireSelected(context.registries.themes.select({
    capabilityTags: ["theme:high-readability"],
    domainProfileId: domain.id,
    ageBand: context.request.ageBand
  }));

  const mechanics = template.mechanicCapabilities.map((capability, index) => {
    const modality = requiredTemplateTargetModality(template, context.request.targetModalities);
    const selected = requireSelected(context.registries.mechanics.select({
      capabilityTags: [capability],
      domainProfileId: domain.id,
      safetyPolicyId: safety.id,
      ageBand: context.request.ageBand,
      modality
    }));
    const eventBindings = requiredMechanicEventBindings(template, capability, selected.emitsEvents);
    return {
      bindingId: `${template.profileId}.mechanic.${index + 1}`,
      mechanicId: selected.id,
      version: selected.version,
      parameters: {
        capability
      },
      eventBindings
    };
  });

  const mechanicIds = mechanics.map((binding) => binding.mechanicId);
  const mechanicBindingByCapability = new Map(
    mechanics.map((binding) => [String(binding.parameters.capability), {
      bindingId: binding.bindingId,
      mechanicId: binding.mechanicId
    }])
  );
  const rules = template.ruleCategories.map((category, index) => {
    const selected = requireSelected(context.registries.rules.select({
      ruleCategory: category,
      mechanicIds,
      domainProfileId: domain.id,
      safetyPolicyId: safety.id
    }));
    return {
      bindingId: `${template.profileId}.rule.${index + 1}`,
      ruleId: selected.id,
      version: selected.version,
      parameters: {
        category
      },
      defaultSource: selected.defaultSource
    };
  });

  const illustrationRequestId = `asset-request.${template.profileId}`;
  const assetRequests = [
    AssetGenerationRequestSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: illustrationRequestId,
      version: "1.0.0",
      kind: "asset-generation-request",
      requestId: illustrationRequestId,
      profileId: template.profileId,
      domainProfileId: domain.id,
      safetyPolicyId: safety.id,
      contentType: "image",
      format: "png",
      prompt: template.assetPrompt,
      seedPolicy: {
        mode: "required",
        seed: context.request.deterministicSeed
      },
      metadata: {
        profileTemplate: template.id
      }
    })
  ];
  const assets = context.assetSource.generateBatch(assetRequests);
  const illustration = requiredGeneratedAssetForRequestId(template, assets, illustrationRequestId).assetId;

  const components = template.componentCapabilities.map((capability, index) => {
    const selected = requireSelected(context.registries.components.select({
      renderCapability: capability,
      mechanicIds,
      domainProfileId: domain.id,
      safetyPolicyId: safety.id,
      ageBand: context.request.ageBand
    }));
    const props = template.propsByCapability[capability];
    const hasRequiredAsset = selected.requiredAssets.some((requirement) => requirement.required);
    const mechanicBindingIds = requiredComponentMechanicBindingIds(
      template,
      capability,
      selected.supportedMechanicIds,
      mechanicBindingByCapability
    );
    const renderMechanicBindingId = requiredComponentRenderMechanicBindingId(
      template,
      capability,
      mechanicBindingIds,
      mechanicBindingByCapability
    );
    return {
      bindingId: `${template.profileId}.component.${index + 1}`,
      componentId: selected.id,
      version: selected.version,
      renderCapability: selected.renderCapability,
      mechanicBindingIds,
      renderMechanicBindingId,
      props,
      assetBindings: hasRequiredAsset ? { illustration } : {}
    };
  });

  const replayEvent = createPlaycraftEvent({
    id: `event.${template.profileId}.ready`,
    profileId: template.profileId,
    eventType: "replay:ready",
    eventName: "profile:assembled",
    source: {
      role: "planner",
      sourceId: TEMPLATE_REPLAY_PLANNER_ID
    },
    sequence: 0,
    occurredAt: "2026-06-27T00:00:00.000Z",
    payload: {
      profileId: template.profileId,
      deterministic: true
    }
  });

  const profileWithPlaceholder = GameAssemblyProfileSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: template.profileId,
    version: "1.0.0",
    kind: "game-assembly-profile",
    profileName: template.profileName,
    assemblyRequestId: context.request.id,
    template: templateSnapshotForProfileTemplate(template, context.request.id),
    domainProfile: {
      id: domain.id,
      version: domain.version
    },
    safetyPolicy: {
      id: safety.id,
      version: safety.version
    },
    theme: {
      id: theme.id,
      version: theme.version
    },
    mechanics,
    rules,
    components,
    assetRequests,
    assets,
    replay: {
      deterministicSeed: context.request.deterministicSeed,
      plannerId: TEMPLATE_REPLAY_PLANNER_ID,
      plannerVersion: "1.0.0",
      unsupportedSeedRequests: assets
        .filter((asset) => asset.provenance.seedStatus === "unsupported")
        .map((asset) => asset.requestId),
      eventLog: [replayEvent]
    },
    validation: validAssemblyResult(template.profileId)
  });

  return GameAssemblyProfileSchema.parse({
    ...profileWithPlaceholder,
    validation: validateGameAssemblyProfile(profileWithPlaceholder, context.registries)
  });
}

function templateSnapshotForProfileTemplate(template: MvpProfileTemplate, assemblyRequestId: string) {
  return GameProfileTemplateSnapshotSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: template.id,
    version: "1.0.0",
    kind: "game-template-snapshot",
    displayName: template.profileName,
    displayLabel: template.displayLabel,
    assetPromptKind: template.assetPromptKind,
    assetEditOperations: template.assetEditOperations,
    liveSurface: template.liveSurface,
    assemblyRequestId
  });
}

export { buildProfileFromTemplate };
export { memoryAssetEditOperations, sortingAssetEditOperations, sequenceAssetEditOperations };
