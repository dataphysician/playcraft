import { GameTemplateDefinitionSchema, PLAYCRAFT_SCHEMA_VERSION, type GameTemplateDefinition, type PlaycraftAssemblyRequest } from "@playcraft/contracts";
import { type AssemblyRecipe, type AssemblyRecipeBuildContext } from "@playcraft/core";
import {
  memoryMechanicEventBindings,
  sequenceMechanicEventBindings,
  sortingMechanicEventBindings
} from "./mechanics.js";
import {
  defaultMemoryTokenStyle,
  defaultToddlerTokenStyle,
  memoryPairTokenStyles,
  toddlerTokenStyles
} from "./themes.js";
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

function pairedCards(items: string[]): { cards: string[]; pairs: Record<string, string> } {
  const cards = items.flatMap((item) => [`${item}-a`, `${item}-b`]);
  const pairs = Object.fromEntries(
    cards.map((card, index) => [card, `pair-${Math.floor(index / 2) + 1}`])
  );
  return { cards, pairs };
}

function memoryTemplate(input: {
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

function sortingTemplate(input: {
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

function sequenceTemplate(input: {
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

const mvpTemplates: MvpProfileTemplate[] = [
  {
    id: "template.memory-match",
    requestLabel: "Animal memory match",
    requestedCapabilities: ["game:memory-match", "mechanic:match-pairs"],
    deterministicSeed: "seed-memory-match",
    displayLabel: "Memory Match",
    description: "A toddler-safe card reveal game that asks the player to find visual pairs.",
    capabilityTags: ["game:memory-match", "mechanic:match-pairs"],
    requestAliases: ["memory", "memory game", "memory match", "matching cards", "card pairs", "pair match"],
    requestAliasSummary: "memory, memory game, memory match",
    exampleRequest: "Memory game",
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
    profileId: "profile.memory-match.mvp",
    profileName: "Memory Match MVP",
    assetPrompt: "friendly starter card illustrations for a child-safe memory match game",
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
        title: "Memory pairs",
        cards: ["memory-card-1-a", "memory-card-1-b", "memory-card-2-a", "memory-card-2-b"],
        pairs: {
          "memory-card-1-a": "pair-1",
          "memory-card-1-b": "pair-1",
          "memory-card-2-a": "pair-2",
          "memory-card-2-b": "pair-2"
        },
        columns: 2
      },
      "component:celebration-overlay": { message: "You found every pair." }
    }
  },
  {
    id: "template.sorting",
    requestLabel: "Sort shapes by color",
    requestedCapabilities: ["game:sorting", "mechanic:sort-into-bins"],
    deterministicSeed: "seed-sorting",
    displayLabel: "Sorting",
    description: "A toddler-safe categorization game that asks the player to move items into matching bins.",
    capabilityTags: ["game:sorting", "mechanic:sort-into-bins"],
    requestAliases: ["sort", "sorting", "sorting game", "category", "categories", "color bins", "group by color"],
    requestAliasSummary: "sort, sorting, sorting game",
    exampleRequest: "Sorting game",
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
    profileId: "profile.sorting.mvp",
    profileName: "Sorting MVP",
    assetPrompt: "simple colorful shapes for a child-safe sorting game",
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
      "component:choice-grid": { title: "Choose a shape", prompt: "Pick one shape to sort.", items: ["red circle", "blue square", "red triangle"] },
      "component:sort-bins": {
        title: "Color bins",
        items: ["red circle", "blue square", "red triangle"],
        bins: ["red", "blue"],
        targets: {
          "red circle": "red",
          "blue square": "blue",
          "red triangle": "red"
        }
      },
      "component:hint-bubble": { hint: "Look at the color first." }
    }
  },
  {
    id: "template.sequence-repeat",
    requestLabel: "Repeat a friendly light pattern",
    requestedCapabilities: ["game:sequence-repeat", "mechanic:sequence-repeat"],
    deterministicSeed: "seed-sequence-repeat",
    displayLabel: "Sequence Repeat",
    description: "A toddler-safe pattern game that asks the player to repeat a short sequence.",
    capabilityTags: ["game:sequence-repeat", "mechanic:sequence-repeat"],
    requestAliases: ["sequence", "sequence repeat", "pattern", "repeat", "repeat pattern", "copy the pattern"],
    requestAliasSummary: "sequence, sequence repeat, pattern",
    exampleRequest: "Sequence repeat",
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
    profileId: "profile.sequence-repeat.mvp",
    profileName: "Sequence Repeat MVP",
    assetPrompt: "soft glowing buttons for a child-safe sequence repeat game",
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
        title: "Repeat the lights",
        prompt: "Tap the buttons in the same order.",
        sequence: ["green", "yellow", "green"],
        rounds: [
          ["green", "yellow", "green"],
          ["green", "yellow", "green", "blue"],
          ["yellow", "green", "blue", "green", "yellow"]
        ]
      },
      "component:choice-grid": { title: "Light buttons", prompt: "Choose the next light.", items: ["green", "yellow", "blue"] },
      "component:celebration-overlay": { message: "Sequence complete." }
    }
  },
  memoryTemplate({
    slug: "shape-memory",
    name: "Shape Memory MVP",
    displayLabel: "Shape Memory",
    label: "Shape memory cards",
    aliases: ["shape memory", "shape match cards", "matching shapes", "find shape pairs"],
    requestAliasSummary: "shape memory, shape match cards, matching shapes",
    exampleRequest: "Shape memory game",
    prompt: "friendly shape cards for a child-safe memory game",
    title: "Shape pairs",
    pairItems: ["circle", "star"],
    seed: "seed-shape-memory"
  }),
  memoryTemplate({
    slug: "color-memory",
    name: "Color Memory MVP",
    displayLabel: "Color Memory",
    label: "Color memory cards",
    aliases: ["color memory", "color match cards", "matching colors", "find color pairs"],
    requestAliasSummary: "color memory, color match cards, matching colors",
    exampleRequest: "Color memory game",
    prompt: "friendly color cards for a child-safe memory game",
    title: "Color pairs",
    pairItems: ["red", "blue"],
    seed: "seed-color-memory"
  }),
  memoryTemplate({
    slug: "number-memory",
    name: "Number Memory MVP",
    displayLabel: "Number Memory",
    label: "Number memory cards",
    aliases: ["number memory", "number match cards", "matching numbers", "find number pairs"],
    requestAliasSummary: "number memory, number match cards, matching numbers",
    exampleRequest: "Number memory game",
    prompt: "friendly number cards for a child-safe memory game",
    title: "Number pairs",
    pairItems: ["number-1", "number-2", "number-3"],
    seed: "seed-number-memory"
  }),
  memoryTemplate({
    slug: "letter-memory",
    name: "Letter Memory MVP",
    displayLabel: "Letter Memory",
    label: "Letter memory cards",
    aliases: ["letter memory", "letter match cards", "matching letters", "find letter pairs"],
    requestAliasSummary: "letter memory, letter match cards, matching letters",
    exampleRequest: "Letter memory game",
    prompt: "friendly letter cards for a child-safe memory game",
    title: "Letter pairs",
    pairItems: ["letter-a", "letter-b"],
    seed: "seed-letter-memory"
  }),
  memoryTemplate({
    slug: "emotion-match",
    name: "Emotion Match MVP",
    displayLabel: "Emotion Match",
    label: "Emotion matching cards",
    aliases: ["emotion match", "feeling pairs", "matching feelings", "happy sad pairs"],
    requestAliasSummary: "emotion match, feeling pairs, matching feelings",
    exampleRequest: "Emotion matching game",
    prompt: "friendly feeling cards for a child-safe memory game",
    title: "Feeling pairs",
    pairItems: ["happy", "calm"],
    seed: "seed-emotion-match"
  }),
  memoryTemplate({
    slug: "sound-picture-match",
    name: "Sound Picture Match MVP",
    displayLabel: "Sound Picture Match",
    label: "Sound picture matching cards",
    aliases: ["sound picture match", "sound picture pairs", "match sounds to pictures"],
    requestAliasSummary: "sound picture match, sound picture pairs, match sounds to pictures",
    exampleRequest: "Sound picture matching game",
    prompt: "friendly sound picture cards for a child-safe matching game",
    title: "Sound picture pairs",
    pairItems: ["bell", "drum"],
    seed: "seed-sound-picture-match"
  }),
  sortingTemplate({
    slug: "color-sorting",
    name: "Color Sorting MVP",
    displayLabel: "Color Sorting",
    label: "Sort toys by color",
    aliases: ["color sorting", "sort by color", "put colors in bins"],
    requestAliasSummary: "color sorting, sort by color, put colors in bins",
    exampleRequest: "Sort toys by color",
    prompt: "simple colorful toys for a child-safe color sorting game",
    title: "Color sort",
    promptText: "Put each toy in the matching color bin.",
    items: ["red car", "blue boat", "red ball"],
    bins: ["red", "blue"],
    targets: { "red car": "red", "blue boat": "blue", "red ball": "red" },
    hint: "Match the color first.",
    seed: "seed-color-sorting"
  }),
  sortingTemplate({
    slug: "shape-sorting",
    name: "Shape Sorting MVP",
    displayLabel: "Shape Sorting",
    label: "Sort shapes by shape",
    aliases: ["shape sorting", "sort by shape", "put shapes in bins"],
    requestAliasSummary: "shape sorting, sort by shape, put shapes in bins",
    exampleRequest: "Sort shapes by shape",
    prompt: "simple friendly shapes for a child-safe shape sorting game",
    title: "Shape sort",
    promptText: "Put each shape in the matching bin.",
    items: ["circle cookie", "square block", "circle button"],
    bins: ["circle", "square"],
    targets: { "circle cookie": "circle", "square block": "square", "circle button": "circle" },
    hint: "Look at the outline.",
    seed: "seed-shape-sorting"
  }),
  sortingTemplate({
    slug: "size-sorting",
    name: "Size Sorting MVP",
    displayLabel: "Size Sorting",
    label: "Sort objects by size",
    aliases: ["size sorting", "sort big and small", "big small bins"],
    requestAliasSummary: "size sorting, sort big and small, big small bins",
    exampleRequest: "Sort big and small objects",
    prompt: "friendly big and small objects for a child-safe sorting game",
    title: "Size sort",
    promptText: "Put each object in the big or small bin.",
    items: ["big teddy", "small cup", "big drum"],
    bins: ["big", "small"],
    targets: { "big teddy": "big", "small cup": "small", "big drum": "big" },
    hint: "Compare how much space it takes.",
    seed: "seed-size-sorting"
  }),
  sortingTemplate({
    slug: "habitat-sorting",
    name: "Habitat Sorting MVP",
    displayLabel: "Habitat Sorting",
    label: "Sort animals by home",
    aliases: ["habitat sorting", "animal homes", "sort animals by home"],
    requestAliasSummary: "habitat sorting, animal homes, sort animals by home",
    exampleRequest: "Sort animals by home",
    prompt: "friendly animals and homes for a child-safe sorting game",
    title: "Animal homes",
    promptText: "Move each animal to its home.",
    items: ["fish", "bird", "turtle"],
    bins: ["water", "sky"],
    targets: { fish: "water", bird: "sky", turtle: "water" },
    hint: "Think about where it likes to live.",
    seed: "seed-habitat-sorting"
  }),
  sortingTemplate({
    slug: "food-sorting",
    name: "Food Sorting MVP",
    displayLabel: "Food Sorting",
    label: "Sort foods by group",
    aliases: ["food sorting", "sort foods", "fruit vegetable bins"],
    requestAliasSummary: "food sorting, sort foods, fruit vegetable bins",
    exampleRequest: "Sort foods by group",
    prompt: "friendly food pictures for a child-safe sorting game",
    title: "Food sort",
    promptText: "Put each food in the matching group.",
    items: ["apple", "carrot", "banana"],
    bins: ["fruit", "vegetable"],
    targets: { apple: "fruit", carrot: "vegetable", banana: "fruit" },
    hint: "Fruit is sweet; vegetables grow in gardens too.",
    seed: "seed-food-sorting"
  }),
  sortingTemplate({
    slug: "clean-up-sorting",
    name: "Clean Up Sorting MVP",
    displayLabel: "Clean Up Sorting",
    label: "Sort toys for clean up",
    aliases: ["clean up sorting", "toy clean up", "sort toys into baskets"],
    requestAliasSummary: "clean up sorting, toy clean up, sort toys into baskets",
    exampleRequest: "Sort toys for clean up",
    prompt: "friendly toy baskets for a child-safe clean up sorting game",
    title: "Clean up sort",
    promptText: "Put each toy in the right basket.",
    items: ["block", "crayon", "doll"],
    bins: ["blocks", "art"],
    targets: { block: "blocks", crayon: "art", doll: "blocks" },
    hint: "Match it to the basket label.",
    seed: "seed-clean-up-sorting"
  }),
  sequenceTemplate({
    slug: "color-pattern",
    name: "Color Pattern MVP",
    displayLabel: "Color Pattern",
    label: "Repeat a color pattern",
    aliases: ["color pattern", "repeat colors", "copy color pattern"],
    requestAliasSummary: "color pattern, repeat colors, copy color pattern",
    exampleRequest: "Repeat a color pattern",
    prompt: "soft color buttons for a child-safe pattern game",
    title: "Color pattern",
    promptText: "Tap the colors in the same order.",
    items: ["red", "yellow", "blue"],
    sequence: ["red", "yellow", "red"],
    rounds: [["red", "yellow", "red"], ["blue", "red", "yellow"], ["red", "blue", "yellow", "red"]],
    seed: "seed-color-pattern"
  }),
  sequenceTemplate({
    slug: "rhythm-repeat",
    name: "Rhythm Repeat MVP",
    displayLabel: "Rhythm Repeat",
    label: "Repeat a rhythm",
    aliases: ["rhythm repeat", "copy rhythm", "repeat beat pattern"],
    requestAliasSummary: "rhythm repeat, copy rhythm, repeat beat pattern",
    exampleRequest: "Repeat a rhythm pattern",
    prompt: "friendly drum buttons for a child-safe rhythm repeat game",
    title: "Rhythm repeat",
    promptText: "Tap the rhythm pattern.",
    items: ["tap", "clap", "shake"],
    sequence: ["tap", "clap", "tap"],
    rounds: [["tap", "clap", "tap"], ["shake", "tap", "clap"], ["tap", "shake", "clap", "tap"]],
    seed: "seed-rhythm-repeat"
  }),
  sequenceTemplate({
    slug: "count-along",
    name: "Count Along MVP",
    displayLabel: "Count Along",
    label: "Repeat a counting pattern",
    aliases: ["count along", "counting pattern", "repeat numbers"],
    requestAliasSummary: "count along, counting pattern, repeat numbers",
    exampleRequest: "Repeat a counting pattern",
    prompt: "friendly number buttons for a child-safe counting pattern game",
    title: "Count along",
    promptText: "Tap the numbers in order.",
    items: ["one", "two", "three"],
    sequence: ["one", "two", "one"],
    rounds: [["one", "two", "one"], ["one", "two", "three"], ["two", "three", "one", "two"]],
    seed: "seed-count-along"
  }),
  sequenceTemplate({
    slug: "daily-routine",
    name: "Daily Routine MVP",
    displayLabel: "Daily Routine",
    label: "Repeat a daily routine",
    aliases: ["daily routine", "routine sequence", "morning routine pattern"],
    requestAliasSummary: "daily routine, routine sequence, morning routine pattern",
    exampleRequest: "Repeat a daily routine",
    prompt: "friendly routine icons for a child-safe sequence game",
    title: "Daily routine",
    promptText: "Tap the routine steps in order.",
    items: ["wash", "brush", "play"],
    sequence: ["wash", "brush", "play"],
    rounds: [["wash", "brush", "play"], ["brush", "play", "wash"], ["wash", "play", "brush", "wash"]],
    seed: "seed-daily-routine"
  }),
  sequenceTemplate({
    slug: "movement-pattern",
    name: "Movement Pattern MVP",
    displayLabel: "Movement Pattern",
    label: "Repeat a movement pattern",
    aliases: ["movement pattern", "copy movement", "repeat actions"],
    requestAliasSummary: "movement pattern, copy movement, repeat actions",
    exampleRequest: "Repeat a movement pattern",
    prompt: "friendly movement icons for a child-safe pattern game",
    title: "Movement pattern",
    promptText: "Tap the action cards in order.",
    items: ["jump", "spin", "wave"],
    sequence: ["jump", "wave", "jump"],
    rounds: [["jump", "wave", "jump"], ["spin", "jump", "wave"], ["wave", "jump", "spin", "wave"]],
    seed: "seed-movement-pattern"
  }),
  sequenceTemplate({
    slug: "animal-sound-pattern",
    name: "Animal Sound Pattern MVP",
    displayLabel: "Animal Sound Pattern",
    label: "Repeat animal sound pattern",
    aliases: ["animal sound pattern", "repeat animal sounds", "copy animal sounds"],
    requestAliasSummary: "animal sound pattern, repeat animal sounds, copy animal sounds",
    exampleRequest: "Repeat an animal sound pattern",
    prompt: "friendly animal sound buttons for a child-safe sequence game",
    title: "Animal sounds",
    promptText: "Tap the animal sounds in order.",
    items: ["moo", "quack", "baa"],
    sequence: ["moo", "quack", "moo"],
    rounds: [["moo", "quack", "moo"], ["baa", "moo", "quack"], ["quack", "baa", "moo", "quack"]],
    seed: "seed-animal-sound-pattern"
  }),
  memoryTemplate({
    slug: "picture-word-match",
    name: "Picture Word Match MVP",
    displayLabel: "Picture Word Match",
    label: "Match pictures and words",
    aliases: ["picture word match", "match picture words", "word picture pairs"],
    requestAliasSummary: "picture word match, match picture words, word picture pairs",
    exampleRequest: "Match pictures and words",
    prompt: "friendly picture and word cards for a child-safe matching game",
    title: "Picture word pairs",
    pairItems: ["picture", "word"],
    seed: "seed-picture-word-match"
  }),
  sortingTemplate({
    slug: "pattern-sorting",
    name: "Pattern Sorting MVP",
    displayLabel: "Pattern Sorting",
    label: "Sort objects by pattern",
    aliases: ["pattern sorting", "sort stripes and dots", "pattern bins"],
    requestAliasSummary: "pattern sorting, sort stripes and dots, pattern bins",
    exampleRequest: "Sort stripes and dots",
    prompt: "friendly patterned objects for a child-safe sorting game",
    title: "Pattern sort",
    promptText: "Put each object with the matching pattern.",
    items: ["striped sock", "dotted cup", "striped scarf"],
    bins: ["stripes", "dots"],
    targets: { "striped sock": "stripes", "dotted cup": "dots", "striped scarf": "stripes" },
    hint: "Look for stripes or dots.",
    seed: "seed-pattern-sorting"
  }),
  sequenceTemplate({
    slug: "shape-pattern",
    name: "Shape Pattern MVP",
    displayLabel: "Shape Pattern",
    label: "Repeat a shape pattern",
    aliases: ["shape pattern", "repeat shapes", "copy shape pattern"],
    requestAliasSummary: "shape pattern, repeat shapes, copy shape pattern",
    exampleRequest: "Repeat a shape pattern",
    prompt: "friendly shape buttons for a child-safe pattern game",
    title: "Shape pattern",
    promptText: "Tap the shapes in the same order.",
    items: ["circle", "square", "star"],
    sequence: ["circle", "square", "circle"],
    rounds: [["circle", "square", "circle"], ["star", "circle", "square"], ["square", "star", "circle", "square"]],
    seed: "seed-shape-pattern"
  })
];

export { mvpTemplates };

export const mvpAssemblyRequests: PlaycraftAssemblyRequest[] = mvpTemplates.map((template) =>
  request(
    `request.${template.id.slice("template.".length)}.mvp`,
    template.requestLabel,
    template.requestedCapabilities,
    template.deterministicSeed
  )
);

export const gameTemplateDefinitions: GameTemplateDefinition[] = mvpTemplates.map((template, index) =>
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
    assemblyRequestId: mvpAssemblyRequests[index].id,
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

export const mvpAssemblyRecipes = mvpTemplates.map((template) => ({
  id: template.id,
  version: "1.0.0",
  capabilityTags: template.capabilityTags,
  build: (context: AssemblyRecipeBuildContext) => buildProfileFromTemplate(template, context)
})) satisfies AssemblyRecipe[];
