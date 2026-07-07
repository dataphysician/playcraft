import { sortingTemplate, type MvpProfileTemplate } from "../templates.js";

export const cleanUpSortingTemplate: MvpProfileTemplate = sortingTemplate({
  slug: "clean-up-sorting",
  name: "Clean Up Sorting MVP",
  displayLabel: "Clean Up Sorting",
  label: "Sort toys for clean up",
  aliases: ["clean up sorting", "toy clean up", "sort toys into baskets"],
  requestAliasSummary: "clean up sorting, toy clean up, sort toys into baskets",
  exampleRequest: "Sort toys for clean up",
  prompt: "friendly toy baskets for a child-safe clean up sorting game",
  title: "Clean up sort",
  promptText: "Put each toy in the right basket.",
  items: ["block", "crayon", "doll"],
  bins: ["blocks", "art"],
  targets: { block: "blocks", crayon: "art", doll: "blocks" },
  hint: "Match it to the basket label.",
  seed: "seed-clean-up-sorting"
});
