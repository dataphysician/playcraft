import { memoryTemplate, type MvpProfileTemplate } from "../templates.js";

export const numberMemoryTemplate: MvpProfileTemplate = memoryTemplate({
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
});
