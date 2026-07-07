import { sequenceTemplate, type MvpProfileTemplate } from "../templates.js";

export const countAlongTemplate: MvpProfileTemplate = sequenceTemplate({
  slug: "count-along",
  name: "Count Along MVP",
  displayLabel: "Count Along",
  label: "Repeat a counting pattern",
  aliases: ["count along", "counting pattern", "repeat numbers"],
  requestAliasSummary: "count along, counting pattern, repeat numbers",
  exampleRequest: "Repeat a counting pattern",
  prompt: "friendly number buttons for a child-safe counting pattern game",
  title: "Count along",
  promptText: "Tap the numbers in order.",
  items: ["one", "two", "three"],
  sequence: ["one", "two", "one"],
  rounds: [["one", "two", "one"], ["one", "two", "three"], ["two", "three", "one", "two"]],
  seed: "seed-count-along"
});
