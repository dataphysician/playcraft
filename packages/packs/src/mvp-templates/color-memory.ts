import { memoryTemplate, type MvpProfileTemplate } from "../templates.js";

export const colorMemoryTemplate: MvpProfileTemplate = memoryTemplate({
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
});
