import { memoryTemplate, type MvpProfileTemplate } from "../templates.js";

export const shapeMemoryTemplate: MvpProfileTemplate = memoryTemplate({
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
});
