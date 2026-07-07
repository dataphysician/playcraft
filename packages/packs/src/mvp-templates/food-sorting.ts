import { sortingTemplate, type MvpProfileTemplate } from "../templates.js";

export const foodSortingTemplate: MvpProfileTemplate = sortingTemplate({
  slug: "food-sorting",
  name: "Food Sorting MVP",
  displayLabel: "Food Sorting",
  label: "Sort foods by group",
  aliases: ["food sorting", "sort foods", "fruit vegetable bins"],
  requestAliasSummary: "food sorting, sort foods, fruit vegetable bins",
  exampleRequest: "Sort foods by group",
  prompt: "friendly food pictures for a child-safe sorting game",
  title: "Food sort",
  promptText: "Put each food in the matching group.",
  items: ["apple", "carrot", "banana"],
  bins: ["fruit", "vegetable"],
  targets: { apple: "fruit", carrot: "vegetable", banana: "fruit" },
  hint: "Fruit is sweet; vegetables grow in gardens too.",
  seed: "seed-food-sorting"
});
