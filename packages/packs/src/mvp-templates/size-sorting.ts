import { sortingTemplate, type MvpProfileTemplate } from "../templates.js";

export const sizeSortingTemplate: MvpProfileTemplate = sortingTemplate({
  slug: "size-sorting",
  name: "Size Sorting MVP",
  displayLabel: "Size Sorting",
  label: "Sort objects by size",
  aliases: ["size sorting", "sort big and small", "big small bins"],
  requestAliasSummary: "size sorting, sort big and small, big small bins",
  exampleRequest: "Sort big and small objects",
  prompt: "friendly big and small objects for a child-safe sorting game",
  title: "Size sort",
  promptText: "Put each object in the big or small bin.",
  items: ["big teddy", "small cup", "big drum"],
  bins: ["big", "small"],
  targets: { "big teddy": "big", "small cup": "small", "big drum": "big" },
  hint: "Compare how much space it takes.",
  seed: "seed-size-sorting"
});
