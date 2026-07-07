import { sequenceTemplate, type MvpProfileTemplate } from "../templates.js";

export const colorPatternTemplate: MvpProfileTemplate = sequenceTemplate({
  slug: "color-pattern",
  name: "Color Pattern MVP",
  displayLabel: "Color Pattern",
  label: "Repeat a color pattern",
  aliases: ["color pattern", "repeat colors", "copy color pattern"],
  requestAliasSummary: "color pattern, repeat colors, copy color pattern",
  exampleRequest: "Repeat a color pattern",
  prompt: "soft color buttons for a child-safe pattern game",
  title: "Color pattern",
  promptText: "Tap the colors in the same order.",
  items: ["red", "yellow", "blue"],
  sequence: ["red", "yellow", "red"],
  rounds: [["red", "yellow", "red"], ["blue", "red", "yellow"], ["red", "blue", "yellow", "red"]],
  seed: "seed-color-pattern"
});
