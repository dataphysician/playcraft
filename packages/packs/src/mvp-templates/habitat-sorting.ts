import { sortingTemplate, type MvpProfileTemplate } from "../templates.js";

export const habitatSortingTemplate: MvpProfileTemplate = sortingTemplate({
  slug: "habitat-sorting",
  name: "Habitat Sorting MVP",
  displayLabel: "Habitat Sorting",
  label: "Sort animals by home",
  aliases: ["habitat sorting", "animal homes", "sort animals by home"],
  requestAliasSummary: "habitat sorting, animal homes, sort animals by home",
  exampleRequest: "Sort animals by home",
  prompt: "friendly animals and homes for a child-safe sorting game",
  title: "Animal homes",
  promptText: "Move each animal to its home.",
  items: ["fish", "bird", "turtle"],
  bins: ["water", "sky"],
  targets: { fish: "water", bird: "sky", turtle: "water" },
  hint: "Think about where it likes to live.",
  seed: "seed-habitat-sorting"
});
