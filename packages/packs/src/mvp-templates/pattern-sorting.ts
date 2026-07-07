import { sortingTemplate, type MvpProfileTemplate } from "../templates.js";

export const patternSortingTemplate: MvpProfileTemplate = sortingTemplate({
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
});
