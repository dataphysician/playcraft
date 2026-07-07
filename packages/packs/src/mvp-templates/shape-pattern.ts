import { sequenceTemplate, type MvpProfileTemplate } from "../templates.js";

export const shapePatternTemplate: MvpProfileTemplate = sequenceTemplate({
  slug: "shape-pattern",
  name: "Shape Pattern MVP",
  displayLabel: "Shape Pattern",
  label: "Repeat a shape pattern",
  aliases: ["shape pattern", "repeat shapes", "copy shape pattern"],
  requestAliasSummary: "shape pattern, repeat shapes, copy shape pattern",
  exampleRequest: "Repeat a shape pattern",
  prompt: "friendly shape buttons for a child-safe pattern game",
  title: "Shape pattern",
  promptText: "Tap the shapes in the same order.",
  items: ["circle", "square", "star"],
  sequence: ["circle", "square", "circle"],
  rounds: [["circle", "square", "circle"], ["star", "circle", "square"], ["square", "star", "circle", "square"]],
  seed: "seed-shape-pattern"
});
