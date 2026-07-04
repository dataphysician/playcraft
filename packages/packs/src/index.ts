import React from "react";
import {
  createLocalAssetSourceManifest,
  DeterministicLocalAssetSource,
  LOCAL_ASSET_SOURCE_ID
} from "@playcraft/assets";
import {
  AssemblyValidationResultSchema,
  AssetGenerationRequestSchema,
  ComponentManifestSchema,
  DomainProfileSchema,
  FrontendToolDefinitionSchema,
  GameAssemblyProfileSchema,
  GameTemplateDefinitionSchema,
  MechanicDefinitionSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  PackManifestSchema,
  RuleModuleDefinitionSchema,
  SafetyPolicyPackSchema,
  ThemePackSchema,
  type AssetGenerationRequest,
  type ComponentManifest,
  type DomainProfile,
  type FrontendToolDefinition,
  type GameAssemblyProfile,
  type GameTemplateDefinition,
  type GeneratedAssetRecord,
  type JsonValue,
  type MechanicDefinition,
  type PlaycraftAssemblyRequest,
  type RuleModuleDefinition,
  type SafetyPolicyPack,
  type ThemePack
} from "@playcraft/contracts";
import {
  DeterministicAssemblyPlanner,
  createEmptyRegistries,
  createPlaycraftEvent,
  validateGameAssemblyProfile,
  type AssemblyRecipe,
  type AssemblyRecipeBuildContext,
  type PlaycraftRegistries
} from "@playcraft/core";
import {
  TrustedComponentRegistry,
  type TrustedComponentRuntimeProps,
  type TrustedReactComponent
} from "@playcraft/renderer";

export const DEFAULT_DOMAIN_ID = "domain.child-edu";
export const DEFAULT_SAFETY_POLICY_ID = "safety.child-friendly";
export const DEFAULT_THEME_ID = "theme.bright-calm";
export const DEFAULT_PLANNER_ID = "planner.deterministic.mvp";
export const DEFAULT_PACK_VERSION = "1.0.0";

const textField = { type: "string", required: true } as const;
const optionalTextField = { type: "string", required: false } as const;
const numberField = { type: "number", required: true } as const;
const arrayField = { type: "array", required: true, minItems: 1 } as const;
const recordField = { type: "record", required: true } as const;

const selectItemTool = tool("tool.select-item", "tool:select-item", {
  itemId: textField
});
const revealCardTool = tool("tool.reveal-card", "tool:reveal-card", {
  cardId: textField
});
const moveItemTool = tool("tool.move-item", "tool:move-item", {
  itemId: textField,
  targetId: textField
});
const repeatSequenceTool = tool("tool.repeat-sequence", "tool:repeat-sequence", {
  sequence: arrayField
});

export const mechanicDefinitions: MechanicDefinition[] = [
  mechanic("mechanic.tap-to-select", "Tap to Select", ["mechanic:tap-to-select", "input:select"], ["touch", "pointer"], [], ["frontend:selected"]),
  mechanic("mechanic.tap-to-reveal", "Tap to Reveal", ["mechanic:tap-to-reveal", "state:reveal"], ["touch", "pointer"], [], ["frontend:revealed"]),
  mechanic("mechanic.match-pairs", "Match Pairs", ["mechanic:match-pairs", "logic:pairing"], ["touch", "pointer"], ["frontend:revealed"], ["rule:pair-matched"]),
  mechanic("mechanic.sort-into-bins", "Sort Into Bins", ["mechanic:sort-into-bins", "logic:category"], ["touch", "pointer"], ["frontend:selected"], ["rule:item-sorted"]),
  mechanic("mechanic.sequence-repeat", "Sequence Repeat", ["mechanic:sequence-repeat", "logic:sequence"], ["touch", "pointer", "audio"], ["frontend:selected"], ["rule:sequence-progressed"]),
  mechanic("mechanic.choose-one", "Choose One", ["mechanic:choose-one", "logic:choice"], ["touch", "pointer", "keyboard"], ["frontend:selected"], ["rule:choice-made"]),
  mechanic("mechanic.trace-path", "Trace Path", ["mechanic:trace-path", "input:trace"], ["touch", "pointer"], [], ["rule:path-traced"]),
  mechanic("mechanic.drag-or-tap-move", "Drag or Tap Move", ["mechanic:drag-or-tap-move", "input:move"], ["touch", "pointer"], ["frontend:selected"], ["rule:item-moved"]),
  mechanic("mechanic.sound-matching", "Sound Matching", ["mechanic:sound-matching", "audio:matching"], ["audio", "touch"], ["audio:prompted"], ["rule:sound-matched"]),
  mechanic("mechanic.hint-prompt", "Hint Prompt", ["mechanic:hint-prompt", "support:hint"], ["touch", "pointer", "audio"], ["rule:hint-needed"], ["frontend:hint-shown"]),
  mechanic("mechanic.retry-loop", "Retry Loop", ["mechanic:retry-loop", "support:retry"], ["touch", "pointer"], ["rule:retry-needed"], ["rule:retry-ready"]),
  mechanic("mechanic.timed-celebration", "Timed Celebration", ["mechanic:timed-celebration", "feedback:celebration"], ["touch", "pointer", "audio"], ["rule:completed"], ["frontend:celebrated"])
].map((entry) => MechanicDefinitionSchema.parse(entry));

export const ruleModuleDefinitions: RuleModuleDefinition[] = [
  rule("rule.pair-match", "pair-matching", "Pair Matching", ["rule:pair-match"], ["mechanic.match-pairs"], ["frontend:revealed"], ["rule:pair-matched"]),
  rule("rule.category-validation", "category-validation", "Category Validation", ["rule:category-validation"], ["mechanic.sort-into-bins"], ["rule:item-sorted"], ["rule:category-validated"]),
  rule("rule.sequence-progression", "progression", "Sequence Progression", ["rule:progression"], ["mechanic.sequence-repeat"], ["frontend:selected"], ["rule:sequence-progressed"]),
  rule("rule.guided-retry", "retry", "Guided Retry", ["rule:guided-retry"], ["mechanic.retry-loop", "mechanic.sort-into-bins", "mechanic.match-pairs"], ["rule:retry-needed"], ["rule:retry-ready"]),
  rule("rule.hint-timing", "hint", "Hint Timing", ["rule:hint-timing"], ["mechanic.hint-prompt", "mechanic.match-pairs", "mechanic.sequence-repeat"], ["rule:hint-needed"], ["frontend:hint-shown"]),
  rule("rule.completion", "completion", "Completion", ["rule:completion"], ["mechanic.match-pairs", "mechanic.sort-into-bins", "mechanic.sequence-repeat"], ["rule:pair-matched", "rule:category-validated", "rule:sequence-progressed"], ["rule:completed"]),
  rule("rule.attempt-feedback", "attempt-feedback", "Attempt Feedback", ["rule:attempt-feedback"], ["mechanic.sequence-repeat", "mechanic.choose-one"], ["frontend:selected"], ["rule:attempt-reviewed"]),
  rule("rule.session-bounds", "session-bounds", "Session Bounds", ["rule:session-bounds"], ["mechanic.retry-loop", "mechanic.hint-prompt"], ["rule:attempt-reviewed"], ["rule:session-checked"]),
  rule("rule.safety-content-block", "safety", "Safety Content Blocking", ["rule:safety-content-block"], ["mechanic.choose-one"], ["frontend:selected"], ["rule:safety-checked"])
].map((entry) => RuleModuleDefinitionSchema.parse(entry));

export const componentManifests: ComponentManifest[] = [
  component("component.choice-grid", "ChoiceGrid", "component:choice-grid", ["mechanic.tap-to-select", "mechanic.choose-one"], [selectItemTool], { title: textField, items: arrayField, prompt: optionalTextField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.reveal-card-grid", "RevealCardGrid", "component:reveal-card-grid", ["mechanic.tap-to-reveal", "mechanic.match-pairs"], [revealCardTool], { title: textField, cards: arrayField, pairs: recordField, columns: numberField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.pair-match-board", "PairMatchBoard", "component:pair-match-board", ["mechanic.match-pairs"], [selectItemTool], { title: textField, pairs: arrayField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.sort-bins", "SortBins", "component:sort-bins", ["mechanic.sort-into-bins"], [moveItemTool], { title: textField, items: arrayField, bins: arrayField, targets: recordField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.sequence-pad", "SequencePad", "component:sequence-pad", ["mechanic.sequence-repeat", "mechanic.tap-to-select"], [repeatSequenceTool], { title: textField, sequence: arrayField, rounds: arrayField, prompt: optionalTextField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.trace-canvas", "TraceCanvas", "component:trace-canvas", ["mechanic.trace-path"], [moveItemTool], { title: textField, path: arrayField }, []),
  component("component.celebration-overlay", "CelebrationOverlay", "component:celebration-overlay", ["mechanic.timed-celebration"], [], { message: textField }, []),
  component("component.hint-bubble", "HintBubble", "component:hint-bubble", ["mechanic.hint-prompt"], [], { hint: textField }, [])
].map((entry) => ComponentManifestSchema.parse(entry));

export const themePacks: ThemePack[] = [
  ThemePackSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: DEFAULT_THEME_ID,
    version: "1.0.0",
    kind: "theme",
    displayName: "Bright Calm",
    capabilityTags: ["theme:calm", "theme:high-readability"],
    supportedDomains: [DEFAULT_DOMAIN_ID],
    supportedAgeBands: ["2-3", "4-6", "7-9"],
    visualStyle: "visual:bright-calm",
    audioStyle: "audio:quiet",
    accessibility: {
      highContrast: true,
      reducedMotion: true,
      readableText: true
    },
    allowedContentTags: ["content:child-friendly", "content:educational"],
    assetPromptConstraints: ["Use simple friendly shapes.", "Avoid scary, punitive, or competitive imagery."]
  })
];

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
    }
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
    modalities: ["touch", "pointer", "audio"],
    defaults: {
      feedbackTone: "gentle",
      progressMode: "noncompetitive"
    }
  })
];

export const assetSourceManifests = [createLocalAssetSourceManifest()];

export const packManifests = [
  packManifest("pack.mechanics.mvp", "mechanic-pack", mechanicDefinitions.flatMap((entry) => entry.capabilityTags), ["MechanicDefinitionSchema"]),
  packManifest("pack.rules.mvp", "rule-pack", ruleModuleDefinitions.flatMap((entry) => entry.capabilityTags), ["RuleModuleDefinitionSchema"]),
  packManifest("pack.components.mvp", "component-pack", componentManifests.map((entry) => entry.renderCapability), ["ComponentManifestSchema"]),
  packManifest("pack.themes.mvp", "theme-pack", themePacks.flatMap((entry) => entry.capabilityTags), ["ThemePackSchema"]),
  packManifest("pack.asset-sources.mvp", "asset-source-pack", assetSourceManifests.flatMap((entry) => entry.capabilityTags), ["AssetSourceCapabilityManifestSchema"]),
  packManifest("pack.domains.mvp", "domain-profile-pack", domainProfiles.flatMap((entry) => entry.capabilityTags), ["DomainProfileSchema"]),
  packManifest("pack.safety.mvp", "safety-policy-pack", safetyPolicyPacks.flatMap((entry) => entry.rules.flatMap((ruleEntry) => ruleEntry.capabilityTags)), ["SafetyPolicyPackSchema"])
].map((entry) => PackManifestSchema.parse(entry));

const mvpTemplates: MvpProfileTemplate[] = [
  {
    id: "template.memory-match",
    requestLabel: "Animal memory match",
    requestedCapabilities: ["game:memory-match", "mechanic:match-pairs"],
    deterministicSeed: "seed-memory-match",
    description: "A toddler-safe card reveal game that asks the player to find visual pairs.",
    capabilityTags: ["game:memory-match", "mechanic:match-pairs"],
    requestAliases: ["memory", "memory game", "memory match", "matching cards", "card pairs", "pair match"],
    exampleRequest: "Memory game",
    profileId: "profile.memory-match.mvp",
    profileName: "Memory Match MVP",
    assetPrompt: "friendly starter card illustrations for a child-safe memory match game",
    mechanicCapabilities: ["mechanic:tap-to-reveal", "mechanic:match-pairs", "feedback:celebration"],
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
    description: "A toddler-safe categorization game that asks the player to move items into matching bins.",
    capabilityTags: ["game:sorting", "mechanic:sort-into-bins"],
    requestAliases: ["sort", "sorting", "sorting game", "category", "categories", "color bins", "group by color"],
    exampleRequest: "Sorting game",
    profileId: "profile.sorting.mvp",
    profileName: "Sorting MVP",
    assetPrompt: "simple colorful shapes for a child-safe sorting game",
    mechanicCapabilities: ["mechanic:tap-to-select", "mechanic:sort-into-bins", "support:retry", "support:hint"],
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
    description: "A toddler-safe pattern game that asks the player to repeat a short sequence.",
    capabilityTags: ["game:sequence-repeat", "mechanic:sequence-repeat"],
    requestAliases: ["sequence", "sequence repeat", "pattern", "repeat", "repeat pattern", "copy the pattern"],
    exampleRequest: "Sequence repeat",
    profileId: "profile.sequence-repeat.mvp",
    profileName: "Sequence Repeat MVP",
    assetPrompt: "soft glowing buttons for a child-safe sequence repeat game",
    mechanicCapabilities: ["mechanic:sequence-repeat", "mechanic:tap-to-select", "feedback:celebration"],
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
    label: "Shape memory cards",
    aliases: ["shape memory", "shape match cards", "matching shapes", "find shape pairs"],
    prompt: "friendly shape cards for a child-safe memory game",
    title: "Shape pairs",
    pairItems: ["circle", "star"],
    seed: "seed-shape-memory"
  }),
  memoryTemplate({
    slug: "color-memory",
    name: "Color Memory MVP",
    label: "Color memory cards",
    aliases: ["color memory", "color match cards", "matching colors", "find color pairs"],
    prompt: "friendly color cards for a child-safe memory game",
    title: "Color pairs",
    pairItems: ["red", "blue"],
    seed: "seed-color-memory"
  }),
  memoryTemplate({
    slug: "number-memory",
    name: "Number Memory MVP",
    label: "Number memory cards",
    aliases: ["number memory", "number match cards", "matching numbers", "find number pairs"],
    prompt: "friendly number cards for a child-safe memory game",
    title: "Number pairs",
    pairItems: ["number-1", "number-2"],
    seed: "seed-number-memory"
  }),
  memoryTemplate({
    slug: "letter-memory",
    name: "Letter Memory MVP",
    label: "Letter memory cards",
    aliases: ["letter memory", "letter match cards", "matching letters", "find letter pairs"],
    prompt: "friendly letter cards for a child-safe memory game",
    title: "Letter pairs",
    pairItems: ["letter-a", "letter-b"],
    seed: "seed-letter-memory"
  }),
  memoryTemplate({
    slug: "emotion-match",
    name: "Emotion Match MVP",
    label: "Emotion matching cards",
    aliases: ["emotion match", "feeling pairs", "matching feelings", "happy sad pairs"],
    prompt: "friendly feeling cards for a child-safe memory game",
    title: "Feeling pairs",
    pairItems: ["happy", "calm"],
    seed: "seed-emotion-match"
  }),
  memoryTemplate({
    slug: "sound-picture-match",
    name: "Sound Picture Match MVP",
    label: "Sound picture matching cards",
    aliases: ["sound picture match", "sound picture pairs", "match sounds to pictures"],
    prompt: "friendly sound picture cards for a child-safe matching game",
    title: "Sound picture pairs",
    pairItems: ["bell", "drum"],
    seed: "seed-sound-picture-match"
  }),
  sortingTemplate({
    slug: "color-sorting",
    name: "Color Sorting MVP",
    label: "Sort toys by color",
    aliases: ["color sorting", "sort by color", "put colors in bins"],
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
    label: "Sort shapes by shape",
    aliases: ["shape sorting", "sort by shape", "put shapes in bins"],
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
    label: "Sort objects by size",
    aliases: ["size sorting", "sort big and small", "big small bins"],
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
    label: "Sort animals by home",
    aliases: ["habitat sorting", "animal homes", "sort animals by home"],
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
    label: "Sort foods by group",
    aliases: ["food sorting", "sort foods", "fruit vegetable bins"],
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
    label: "Sort toys for clean up",
    aliases: ["clean up sorting", "toy clean up", "sort toys into baskets"],
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
    label: "Repeat a color pattern",
    aliases: ["color pattern", "repeat colors", "copy color pattern"],
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
    label: "Repeat a rhythm",
    aliases: ["rhythm repeat", "copy rhythm", "repeat beat pattern"],
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
    label: "Repeat a counting pattern",
    aliases: ["count along", "counting pattern", "repeat numbers"],
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
    label: "Repeat a daily routine",
    aliases: ["daily routine", "routine sequence", "morning routine pattern"],
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
    label: "Repeat a movement pattern",
    aliases: ["movement pattern", "copy movement", "repeat actions"],
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
    label: "Repeat animal sound pattern",
    aliases: ["animal sound pattern", "repeat animal sounds", "copy animal sounds"],
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
    label: "Match pictures and words",
    aliases: ["picture word match", "match picture words", "word picture pairs"],
    prompt: "friendly picture and word cards for a child-safe matching game",
    title: "Picture word pairs",
    pairItems: ["picture", "word"],
    seed: "seed-picture-word-match"
  }),
  sortingTemplate({
    slug: "pattern-sorting",
    name: "Pattern Sorting MVP",
    label: "Sort objects by pattern",
    aliases: ["pattern sorting", "sort stripes and dots", "pattern bins"],
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
    label: "Repeat a shape pattern",
    aliases: ["shape pattern", "repeat shapes", "copy shape pattern"],
    prompt: "friendly shape buttons for a child-safe pattern game",
    title: "Shape pattern",
    promptText: "Tap the shapes in the same order.",
    items: ["circle", "square", "star"],
    sequence: ["circle", "square", "circle"],
    rounds: [["circle", "square", "circle"], ["star", "circle", "square"], ["square", "star", "circle", "square"]],
    seed: "seed-shape-pattern"
  })
];

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
    description: template.description,
    capabilityTags: template.capabilityTags,
    requestAliases: template.requestAliases,
    exampleRequest: template.exampleRequest,
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

export const mvpAssemblyRecipes: AssemblyRecipe[] = mvpTemplates.map((template) => ({
  id: template.id,
  version: "1.0.0",
  capabilityTags: template.capabilityTags,
  build: (context) => buildProfileFromTemplate(template, context)
}));

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

export function createDefaultPlanner(options: { registries?: PlaycraftRegistries; assetSource?: DeterministicLocalAssetSource } = {}): DeterministicAssemblyPlanner {
  const registries = options.registries ?? createDefaultRegistries();
  const assetSource = options.assetSource ?? new DeterministicLocalAssetSource();
  return new DeterministicAssemblyPlanner({
    id: DEFAULT_PLANNER_ID,
    version: "1.0.0",
    recipes: mvpAssemblyRecipes,
    registries,
    assetSource
  });
}

export function assembleMvpProfiles(): GameAssemblyProfile[] {
  const planner = createDefaultPlanner();
  return mvpAssemblyRequests.map((assemblyRequest) => planner.assemble(assemblyRequest));
}

export function registerPlaycraftTrustedComponents(registry = new TrustedComponentRegistry()): TrustedComponentRegistry {
  for (const manifest of componentManifests) {
    registry.register(manifest, componentForManifest(manifest));
  }

  return registry;
}

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
    const selected = requireSelected(context.registries.mechanics.select({
      capabilityTags: [capability],
      domainProfileId: domain.id,
      safetyPolicyId: safety.id,
      ageBand: context.request.ageBand,
      modality: context.request.targetModalities[0]
    }));
    return {
      bindingId: `${template.profileId}.mechanic.${index + 1}`,
      mechanicId: selected.id,
      version: selected.version,
      parameters: {
        capability
      },
      eventBindings: {
        primary: selected.emitsEvents[0]
      }
    };
  });

  const mechanicIds = mechanics.map((binding) => binding.mechanicId);
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

  const assetRequests = [
    AssetGenerationRequestSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `asset-request.${template.profileId}`,
      version: "1.0.0",
      kind: "asset-generation-request",
      requestId: `asset-request.${template.profileId}`,
      profileId: template.profileId,
      domainProfileId: domain.id,
      safetyPolicyId: safety.id,
      contentType: "image",
      format: "svg",
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
  const illustration = assets[0].assetId;

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
    return {
      bindingId: `${template.profileId}.component.${index + 1}`,
      componentId: selected.id,
      version: selected.version,
      renderCapability: selected.renderCapability,
      mechanicBindingIds: mechanics
        .filter((binding) => selected.supportedMechanicIds.includes(binding.mechanicId))
        .map((binding) => binding.bindingId)
        .slice(0, 2),
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
      sourceId: DEFAULT_PLANNER_ID
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
      plannerId: DEFAULT_PLANNER_ID,
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

function componentForManifest(manifest: ComponentManifest): TrustedReactComponent {
  const displayName = manifest.displayName;
  return ({ props, assets, emit }: TrustedComponentRuntimeProps) => {
    const label = typeof props.title === "string" ? props.title : typeof props.message === "string" ? props.message : displayName;
    const prompt = typeof props.prompt === "string" ? props.prompt : typeof props.hint === "string" ? props.hint : undefined;
    const cards = stringArrayProp(props, "cards");
    const pairs = stringArrayProp(props, "pairs");
    const items = stringArrayProp(props, "items");
    const bins = stringArrayProp(props, "bins");
    const sequence = stringArrayProp(props, "sequence");
    const path = stringArrayProp(props, "path");
    const assetNodes = Object.entries(assets).map(([binding, asset]) =>
      React.createElement("img", {
        key: binding,
        src: asset.uri,
        alt: asset.altText,
        "data-playcraft-asset": binding,
        style: trustedComponentStyles.image
      })
    );

    return React.createElement(
      "section",
      {
        "data-playcraft-component": manifest.id,
        "aria-label": label,
        style: trustedComponentStyles.surface
      },
      React.createElement(
        "div",
        { style: assetNodes.length > 0 ? trustedComponentStyles.header : trustedComponentStyles.headerWithoutAsset },
        ...assetNodes,
        React.createElement(
          "div",
          null,
          React.createElement("h2", { style: trustedComponentStyles.title }, label),
          prompt ? React.createElement("p", { style: trustedComponentStyles.prompt }, prompt) : null
        )
      ),
      renderTrustedControls(manifest, { cards, pairs, items, bins, sequence, path }, emit)
    );
  };
}

function renderTrustedControls(
  manifest: ComponentManifest,
  props: {
    cards: string[];
    pairs: string[];
    items: string[];
    bins: string[];
    sequence: string[];
    path: string[];
  },
  emit: TrustedComponentRuntimeProps["emit"]
): React.ReactElement | null {
  if (props.cards.length > 0) {
    return renderButtonGrid(
      props.cards,
      (cardId) => emitFirstTool(manifest, emit, { cardId }),
      `${manifest.id}.cards`
    );
  }

  if (props.pairs.length > 0) {
    return renderButtonGrid(
      props.pairs,
      (itemId) => emitFirstTool(manifest, emit, { itemId }),
      `${manifest.id}.pairs`
    );
  }

  if (props.items.length > 0 && props.bins.length > 0) {
    return React.createElement(
      "div",
      { style: trustedComponentStyles.grid },
      ...props.items.flatMap((itemId) =>
        props.bins.map((targetId) =>
          React.createElement(
            "button",
            {
              key: `${itemId}.${targetId}`,
              type: "button",
              onClick: () => emitFirstTool(manifest, emit, { itemId, targetId }),
              style: trustedComponentStyles.button
            },
            `${itemId} -> ${targetId}`
          )
        )
      )
    );
  }

  if (props.items.length > 0) {
    return renderButtonGrid(
      props.items,
      (itemId) => emitFirstTool(manifest, emit, { itemId }),
      `${manifest.id}.items`
    );
  }

  if (props.sequence.length > 0) {
    return React.createElement(
      "div",
      { style: trustedComponentStyles.sequence },
      React.createElement(
        "div",
        { style: trustedComponentStyles.steps },
        ...props.sequence.map((step, index) =>
          React.createElement("span", { key: `${step}.${index}`, style: trustedComponentStyles.step }, step)
        )
      ),
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => emitFirstTool(manifest, emit, { sequence: props.sequence }),
          style: trustedComponentStyles.button
        },
        "Submit sequence"
      )
    );
  }

  if (props.path.length > 0) {
    return React.createElement(
      "button",
      {
        type: "button",
        onClick: () => emitFirstTool(manifest, emit, { itemId: "path", targetId: props.path.join(" ") }),
        style: trustedComponentStyles.button
      },
      "Trace path"
    );
  }

  return null;
}

function renderButtonGrid(items: string[], onSelect: (item: string) => void, keyPrefix: string): React.ReactElement {
  return React.createElement(
    "div",
    { style: trustedComponentStyles.grid },
    ...items.map((item) =>
      React.createElement(
        "button",
        {
          key: `${keyPrefix}.${item}`,
          type: "button",
          onClick: () => onSelect(item),
          style: trustedComponentStyles.button
        },
        item
      )
    )
  );
}

function stringArrayProp(props: Record<string, JsonValue>, key: string): string[] {
  const value = props[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)));
}

function emitFirstTool(
  manifest: ComponentManifest,
  emit: TrustedComponentRuntimeProps["emit"],
  payload: Record<string, JsonValue>
): void {
  const tool = manifest.emittedTools[0];
  if (!tool) {
    return;
  }

  emit(tool.toolName, {
    componentId: manifest.id,
    ...payload
  });
}

const trustedComponentStyles = {
  surface: {
    display: "grid",
    gap: "1rem"
  },
  header: {
    display: "grid",
    gridTemplateColumns: "minmax(4rem, 8rem) minmax(0, 1fr)",
    gap: "1rem",
    alignItems: "center"
  },
  headerWithoutAsset: {
    display: "grid",
    gap: "0.5rem"
  },
  image: {
    width: "100%",
    aspectRatio: "1",
    objectFit: "cover" as const,
    borderRadius: "8px",
    border: "1px solid #d4d4d8",
    background: "#f4f4f5"
  },
  title: {
    margin: 0,
    fontSize: "1.25rem"
  },
  prompt: {
    margin: "0.5rem 0 0",
    color: "#52525b"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
    gap: "0.5rem"
  },
  button: {
    minHeight: "3rem",
    borderRadius: "8px",
    border: "1px solid #0f766e",
    background: "#ecfdf5",
    color: "#064e3b",
    fontWeight: 700,
    padding: "0.625rem",
    overflowWrap: "anywhere" as const
  },
  sequence: {
    display: "grid",
    gap: "0.75rem"
  },
  steps: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem"
  },
  step: {
    borderRadius: "8px",
    border: "1px solid #d4d4d8",
    background: "#fafafa",
    padding: "0.5rem 0.75rem"
  }
} satisfies Record<string, React.CSSProperties>;

function request(id: string, label: string, capabilities: string[], seed: string): PlaycraftAssemblyRequest {
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

function mechanic(
  id: string,
  displayName: string,
  capabilityTags: string[],
  supportedModalities: Array<"touch" | "pointer" | "keyboard" | "audio">,
  consumesEvents: string[],
  emitsEvents: string[]
): MechanicDefinition {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "mechanic",
    displayName,
    capabilityTags,
    supportedModalities,
    supportedAgeBands: ["2-3", "4-6", "7-9"],
    supportedDomains: [DEFAULT_DOMAIN_ID],
    consumesEvents,
    emitsEvents,
    requiredAssetContentTypes: [],
    compatibility: {
      domainProfileIds: [DEFAULT_DOMAIN_ID],
      safetyPolicyIds: [DEFAULT_SAFETY_POLICY_ID],
      ageBands: ["2-3", "4-6", "7-9"],
      modalities: supportedModalities,
      requiredCapabilities: capabilityTags,
      assetContentTypes: []
    }
  };
}

function rule(
  id: string,
  category: string,
  displayName: string,
  capabilityTags: string[],
  supportedMechanicIds: string[],
  consumesEvents: string[],
  emitsEvents: string[]
): RuleModuleDefinition {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "rule-module",
    category,
    displayName,
    capabilityTags,
    supportedMechanicIds,
    consumesEvents,
    emitsEvents,
    defaultSource: "manifest",
    compatibility: {
      domainProfileIds: [DEFAULT_DOMAIN_ID],
      safetyPolicyIds: [DEFAULT_SAFETY_POLICY_ID],
      ageBands: ["2-3", "4-6", "7-9"],
      modalities: ["touch", "pointer"],
      requiredCapabilities: capabilityTags,
      assetContentTypes: []
    }
  };
}

function component(
  id: string,
  displayName: string,
  renderCapability: string,
  supportedMechanicIds: string[],
  emittedTools: FrontendToolDefinition[],
  fields: Record<string, { type: "string" | "number" | "boolean" | "object" | "array" | "record"; required: boolean; minItems?: number }>,
  requiredAssets: Array<{ binding: string; contentTypes: Array<"image" | "audio" | "animation" | "text">; required: boolean }>
): ComponentManifest {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "component",
    displayName,
    renderCapability,
    supportedMechanicIds,
    supportedDomains: [DEFAULT_DOMAIN_ID],
    supportedAgeBands: ["2-3", "4-6", "7-9"],
    propsSchema: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      type: "object",
      fields,
      allowUnknown: false
    },
    requiredAssets,
    emittedTools,
    accessibility: {
      labelRequired: true,
      reducedMotionSafe: true,
      keyboardReachable: true
    },
    safetyPolicyIds: [DEFAULT_SAFETY_POLICY_ID],
    replayBehavior: "state-derived"
  };
}

function tool(id: string, toolName: string, fields: Record<string, { type: "string" | "number" | "boolean" | "object" | "array" | "record"; required: boolean; minItems?: number }>): FrontendToolDefinition {
  return FrontendToolDefinitionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "frontend-tool",
    toolName,
    description: `Frontend tool ${toolName}`,
    argumentsSchema: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      type: "object",
      fields,
      allowUnknown: false
    },
    emittedEvents: [`frontend:${toolName.split(":")[1]}`]
  });
}

function requireSelected<T extends { id: string }>(result: { selected: T | null; warnings: string[] }): T {
  if (!result.selected) {
    throw new Error(result.warnings.join("; ") || "registry selection failed");
  }

  return result.selected;
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

function packManifest(id: string, kind: "mechanic-pack" | "rule-pack" | "component-pack" | "theme-pack" | "asset-source-pack" | "domain-profile-pack" | "safety-policy-pack", providedCapabilities: string[], publicContractSchemas: string[]) {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind,
    providedCapabilities: [...new Set(providedCapabilities)].slice(0, 12),
    requiredPeerCapabilities: [],
    compatibleDomainProfiles: [DEFAULT_DOMAIN_ID],
    compatibleSafetyPolicies: [DEFAULT_SAFETY_POLICY_ID],
    publicContractSchemas,
    fixtures: ["examples/profiles/memory-match.json", "examples/profiles/sorting.json", "examples/profiles/sequence-repeat.json"],
    importLight: true,
    requirements: {
      network: false,
      credentials: false,
      native: false
    }
  };
}

interface MvpProfileTemplate {
  id: string;
  requestLabel: string;
  requestedCapabilities: string[];
  deterministicSeed: string;
  description: string;
  capabilityTags: string[];
  requestAliases: string[];
  exampleRequest: string;
  profileId: string;
  profileName: string;
  assetPrompt: string;
  mechanicCapabilities: string[];
  ruleCategories: string[];
  componentCapabilities: string[];
  propsByCapability: Record<string, Record<string, JsonValue>>;
}

function memoryTemplate(input: {
  aliases: string[];
  exampleRequest?: string;
  label: string;
  name: string;
  pairItems: string[];
  prompt: string;
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
    description: `A toddler-safe matching game for ${input.title.toLowerCase()}.`,
    capabilityTags: [`game:${input.slug}`, "mechanic:match-pairs"],
    requestAliases: input.aliases,
    exampleRequest: input.exampleRequest ?? sentenceCase(input.aliases[0] ?? input.label),
    profileId: `profile.${input.slug}.mvp`,
    profileName: input.name,
    assetPrompt: input.prompt,
    mechanicCapabilities: ["mechanic:tap-to-reveal", "mechanic:match-pairs", "feedback:celebration"],
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
  exampleRequest?: string;
  hint: string;
  items: string[];
  label: string;
  name: string;
  prompt: string;
  promptText: string;
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
    description: `A toddler-safe sorting game for ${input.title.toLowerCase()}.`,
    capabilityTags: [`game:${input.slug}`, "mechanic:sort-into-bins"],
    requestAliases: input.aliases,
    exampleRequest: input.exampleRequest ?? sentenceCase(input.aliases[0] ?? input.label),
    profileId: `profile.${input.slug}.mvp`,
    profileName: input.name,
    assetPrompt: input.prompt,
    mechanicCapabilities: ["mechanic:tap-to-select", "mechanic:sort-into-bins", "support:retry", "support:hint"],
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
  exampleRequest?: string;
  items: string[];
  label: string;
  name: string;
  prompt: string;
  promptText: string;
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
    description: `A toddler-safe sequence game for ${input.title.toLowerCase()}.`,
    capabilityTags: [`game:${input.slug}`, "mechanic:sequence-repeat"],
    requestAliases: input.aliases,
    exampleRequest: input.exampleRequest ?? sentenceCase(input.aliases[0] ?? input.label),
    profileId: `profile.${input.slug}.mvp`,
    profileName: input.name,
    assetPrompt: input.prompt,
    mechanicCapabilities: ["mechanic:sequence-repeat", "mechanic:tap-to-select", "feedback:celebration"],
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

function pairedCards(items: string[]): { cards: string[]; pairs: Record<string, string> } {
  const cards = items.slice(0, 2).flatMap((item) => [`${item}-a`, `${item}-b`]);
  const pairs = Object.fromEntries(
    cards.map((card, index) => [card, `pair-${Math.floor(index / 2) + 1}`])
  );
  return { cards, pairs };
}

function sentenceCase(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function findMechanicByCapability(capability: string): MechanicDefinition {
  const mechanic = mechanicDefinitions.find((entry) => entry.capabilityTags.includes(capability));
  if (!mechanic) {
    throw new Error(`missing mechanic capability ${capability}`);
  }
  return mechanic;
}

function findRuleByCategory(category: string): RuleModuleDefinition {
  const ruleEntry = ruleModuleDefinitions.find((entry) => entry.category === category);
  if (!ruleEntry) {
    throw new Error(`missing rule category ${category}`);
  }
  return ruleEntry;
}

function findComponentByCapability(capability: string): ComponentManifest {
  const componentEntry = componentManifests.find((entry) => entry.renderCapability === capability);
  if (!componentEntry) {
    throw new Error(`missing component capability ${capability}`);
  }
  return componentEntry;
}
