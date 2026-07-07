import { memoryMechanicEventBindings } from "../mechanics.js";
import { defaultMemoryTokenStyle, memoryPairTokenStyles } from "../themes.js";
import { memoryAssetEditOperations, type MvpProfileTemplate } from "../templates.js";

export const memoryMatchTemplate: MvpProfileTemplate = {
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
};
