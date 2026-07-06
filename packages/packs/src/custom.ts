import {
  BuilderTemplateNamespaceSchema,
  GameAssemblyProfileSchema,
  GameProfileTemplateSnapshotSchema,
  GameTemplateDefinitionSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  StableIdSchema,
  VersionSchema,
  type GameAssemblyProfile,
  type GameProfileTemplateSnapshot,
  type GameTemplateDefinition,
  type GameTemplateTokenStyle,
  type PlaycraftAssemblyRequest
} from "@playcraft/contracts";
import {
  type AssemblyRecipe,
  type AssemblyRecipeBuildContext
} from "@playcraft/core";
import {
  memoryMechanicEventBindings,
  sequenceMechanicEventBindings,
  sortingMechanicEventBindings
} from "./mechanics.js";
import {
  buildProfileFromTemplate,
  findComponentByCapability,
  findMechanicByCapability,
  findRuleByCategory,
  memoryAssetEditOperations,
  request,
  sequenceAssetEditOperations,
  sortingAssetEditOperations,
  type MvpProfileTemplate
} from "./templates.js";

const toyMemoryTokenStyles: GameTemplateTokenStyle[] = [
  { tokens: ["pair-1"], background: "#fde68a", border: "#d97706", foreground: "#78350f", accent: "#fef3c7" },
  { tokens: ["pair-2"], background: "#bae6fd", border: "#0284c7", foreground: "#0c4a6e", accent: "#e0f2fe" },
  { tokens: ["pair-3"], background: "#fbcfe8", border: "#db2777", foreground: "#831843", accent: "#fce7f3" }
];

const dolphinSortTokenStyles: GameTemplateTokenStyle[] = [
  { tokens: ["blue"], background: "#dbeafe", border: "#2563eb", foreground: "#1e3a8a", accent: "#bfdbfe" },
  { tokens: ["green"], background: "#dcfce7", border: "#16a34a", foreground: "#14532d", accent: "#bbf7d0" }
];

const fruitSequenceTokenStyles: GameTemplateTokenStyle[] = [
  { tokens: ["apple"], background: "#fee2e2", border: "#ef4444", foreground: "#7f1d1d", accent: "#fecaca" },
  { tokens: ["banana"], background: "#fef3c7", border: "#d97706", foreground: "#713f12", accent: "#fde68a" },
  { tokens: ["grape"], background: "#ede9fe", border: "#7c3aed", foreground: "#4c1d95", accent: "#ddd6fe" }
];

const customTemplateTokenStyles: Record<string, GameTemplateTokenStyle> = {
  toy: { tokens: ["default"], background: "#fef3c7", border: "#d97706", foreground: "#78350f", accent: "#fde68a" },
  dolphin: { tokens: ["default"], background: "#dbeafe", border: "#2563eb", foreground: "#1e3a8a", accent: "#bfdbfe" },
  fruit: { tokens: ["default"], background: "#fce7f3", border: "#db2777", foreground: "#831843", accent: "#fbcfe8" }
};

export const customTemplates: MvpProfileTemplate[] = [
  {
    id: "template.custom.toy-memory",
    requestLabel: "Toy memory match",
    requestedCapabilities: ["game:custom-toy-memory", "mechanic:match-pairs"],
    deterministicSeed: "seed-custom-toy-memory",
    displayLabel: "Toy Memory",
    description: "A toddler-safe matching game that pairs friendly toy sprites.",
    capabilityTags: ["game:custom-toy-memory", "mechanic:match-pairs"],
    requestAliases: ["toy memory", "toy memory match", "toy pairs", "match toys"],
    requestAliasSummary: "toy memory, toy memory match, toy pairs",
    exampleRequest: "Toy memory game",
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
      tokenStyles: toyMemoryTokenStyles,
      defaultTokenStyle: customTemplateTokenStyles.toy!
    },
    profileId: "profile.custom.toy-memory",
    profileName: "Toy Memory Custom",
    assetPrompt: "friendly toy card illustrations for a child-safe toy memory game",
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
        title: "Toy pairs",
        cards: ["teddy-a", "teddy-b", "ball-a", "ball-b", "block-a", "block-b"],
        pairs: {
          "teddy-a": "pair-1",
          "teddy-b": "pair-1",
          "ball-a": "pair-2",
          "ball-b": "pair-2",
          "block-a": "pair-3",
          "block-b": "pair-3"
        },
        columns: 3
      },
      "component:celebration-overlay": { message: "You found every toy pair." }
    }
  },
  {
    id: "template.custom.dolphin-sorting",
    requestLabel: "Sort dolphins by color",
    requestedCapabilities: ["game:custom-dolphin-sorting", "mechanic:sort-into-bins"],
    deterministicSeed: "seed-custom-dolphin-sorting",
    displayLabel: "Dolphin Sorting",
    description: "A toddler-safe sorting game that asks the player to place ocean animals into color bins.",
    capabilityTags: ["game:custom-dolphin-sorting", "mechanic:sort-into-bins"],
    requestAliases: ["dolphin sorting", "ocean sorting", "dolphin color sort", "sort dolphins"],
    requestAliasSummary: "dolphin sorting, ocean sorting, dolphin color sort",
    exampleRequest: "Dolphin sorting game",
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
      tokenStyles: dolphinSortTokenStyles,
      defaultTokenStyle: customTemplateTokenStyles.dolphin!
    },
    profileId: "profile.custom.dolphin-sorting",
    profileName: "Dolphin Sorting Custom",
    assetPrompt: "friendly dolphin and ocean animal illustrations for a child-safe sorting game",
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
      "component:choice-grid": {
        title: "Choose an ocean animal",
        prompt: "Pick one animal to sort.",
        items: ["blue dolphin", "green turtle", "blue whale"]
      },
      "component:sort-bins": {
        title: "Color bins",
        items: ["blue dolphin", "green turtle", "blue whale"],
        bins: ["blue", "green"],
        targets: {
          "blue dolphin": "blue",
          "green turtle": "green",
          "blue whale": "blue"
        }
      },
      "component:hint-bubble": { hint: "Match the color first." }
    }
  },
  {
    id: "template.custom.fruit-sequence",
    requestLabel: "Repeat a fruit sequence",
    requestedCapabilities: ["game:custom-fruit-sequence", "mechanic:sequence-repeat"],
    deterministicSeed: "seed-custom-fruit-sequence",
    displayLabel: "Fruit Sequence",
    description: "A toddler-safe sequence game that asks the player to repeat a short fruit order.",
    capabilityTags: ["game:custom-fruit-sequence", "mechanic:sequence-repeat"],
    requestAliases: ["fruit sequence", "fruit pattern", "fruit repeat", "repeat fruit order"],
    requestAliasSummary: "fruit sequence, fruit pattern, fruit repeat",
    exampleRequest: "Fruit sequence repeat",
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
      tokenStyles: fruitSequenceTokenStyles,
      defaultTokenStyle: customTemplateTokenStyles.fruit!
    },
    profileId: "profile.custom.fruit-sequence",
    profileName: "Fruit Sequence Custom",
    assetPrompt: "friendly fruit icons for a child-safe sequence repeat game",
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
        title: "Repeat the fruits",
        prompt: "Tap the fruits in the same order.",
        sequence: ["apple", "banana", "apple"],
        rounds: [
          ["apple", "banana", "apple"],
          ["grape", "apple", "banana"],
          ["banana", "apple", "grape", "banana"]
        ]
      },
      "component:choice-grid": {
        title: "Fruit buttons",
        prompt: "Choose the next fruit.",
        items: ["apple", "banana", "grape"]
      },
      "component:celebration-overlay": { message: "Fruit sequence complete." }
    }
  }
];

export const customAssemblyRequests: PlaycraftAssemblyRequest[] = customTemplates.map((template) =>
  request(
    `request.${template.id.slice("template.custom.".length)}.custom`,
    template.requestLabel,
    template.requestedCapabilities,
    template.deterministicSeed
  )
);

export const customGameTemplateDefinitions: GameTemplateDefinition[] = customTemplates.map((template, index) =>
  GameTemplateDefinitionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: template.id,
    version: "1.0.0",
    kind: "game-template",
    displayName: template.profileName,
    displayLabel: template.displayLabel,
    description: template.description,
    capabilityTags: template.capabilityTags,
    requestAliases: template.requestAliases,
    requestAliasSummary: template.requestAliasSummary,
    exampleRequest: template.exampleRequest,
    assetPromptKind: template.assetPromptKind,
    assetEditOperations: template.assetEditOperations,
    liveSurface: template.liveSurface,
    assemblyRequestId: customAssemblyRequests[index].id,
    profileId: template.profileId,
    supportedAgeBands: ["2-3", "4-6", "7-9"],
    supportedModalities: ["touch", "pointer"],
    requiredMechanicIds: template.mechanicCapabilities.map((capability) => findMechanicByCapability(capability).id),
    requiredRuleIds: template.ruleCategories.map((category) => findRuleByCategory(category).id),
    requiredComponentIds: template.componentCapabilities.map((capability) => findComponentByCapability(capability).id),
    defaultAssetContentTypes: ["image"],
    localFirst: true,
    retrieval: {
      current: "bundled-local",
      planned: "server-catalog"
    }
  })
);

export const customTemplateRecipes: AssemblyRecipe[] = customTemplates.map((template) => ({
  id: template.id,
  version: "1.0.0",
  capabilityTags: template.capabilityTags,
  build: (context: AssemblyRecipeBuildContext) => buildProfileFromTemplate(template, context)
}));

function customTemplateIdForProfile(profileId: string, currentTemplateId: string): string {
  if (currentTemplateId.startsWith("template.custom.")) {
    return currentTemplateId;
  }

  const profileStem = profileId.replace(/^profile\./u, "");
  const candidate = `template.custom.${profileStem}`;
  const safe = candidate.replace(/[^a-z0-9.]/gu, "-");
  StableIdSchema.parse(safe);
  BuilderTemplateNamespaceSchema.parse(safe);
  return safe;
}

export function buildCustomTemplateSnapshotFromProfile(profile: GameAssemblyProfile): GameProfileTemplateSnapshot {
  const parsedProfile = GameAssemblyProfileSchema.parse(profile);
  const existingSnapshot = parsedProfile.template;
  const customId = customTemplateIdForProfile(parsedProfile.id, existingSnapshot.id);
  BuilderTemplateNamespaceSchema.parse(customId);

  return GameProfileTemplateSnapshotSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: customId,
    version: VersionSchema.parse(existingSnapshot.version),
    kind: "game-template-snapshot",
    displayName: existingSnapshot.displayName,
    displayLabel: existingSnapshot.displayLabel,
    assetPromptKind: existingSnapshot.assetPromptKind,
    assetEditOperations: existingSnapshot.assetEditOperations,
    liveSurface: existingSnapshot.liveSurface,
    assemblyRequestId: existingSnapshot.assemblyRequestId
  });
}

export { toyMemoryTokenStyles, dolphinSortTokenStyles, fruitSequenceTokenStyles };
