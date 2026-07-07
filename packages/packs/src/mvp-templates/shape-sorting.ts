import { sortingTemplate, type MvpProfileTemplate } from "../templates.js";

export const shapeSortingTemplate: MvpProfileTemplate = sortingTemplate({
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
});
