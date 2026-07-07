import { sortingMechanicEventBindings } from "../mechanics.js";
import { defaultToddlerTokenStyle, toddlerTokenStyles } from "../themes.js";
import { sortingAssetEditOperations, type MvpProfileTemplate } from "../templates.js";

export const sortingTemplateProfile: MvpProfileTemplate = {
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
};
