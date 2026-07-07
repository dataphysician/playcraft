import { sequenceMechanicEventBindings } from "../mechanics.js";
import { defaultToddlerTokenStyle, toddlerTokenStyles } from "../themes.js";
import { sequenceAssetEditOperations, type MvpProfileTemplate } from "../templates.js";

export const sequenceRepeatTemplate: MvpProfileTemplate = {
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
};
