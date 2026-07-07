import { sortingTemplate, type MvpProfileTemplate } from "../templates.js";

export const colorSortingTemplate: MvpProfileTemplate = sortingTemplate({
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
});
