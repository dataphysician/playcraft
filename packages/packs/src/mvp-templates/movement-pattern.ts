import { sequenceTemplate, type MvpProfileTemplate } from "../templates.js";

export const movementPatternTemplate: MvpProfileTemplate = sequenceTemplate({
  slug: "movement-pattern",
  name: "Movement Pattern MVP",
  displayLabel: "Movement Pattern",
  label: "Repeat a movement pattern",
  aliases: ["movement pattern", "copy movement", "repeat actions"],
  requestAliasSummary: "movement pattern, copy movement, repeat actions",
  exampleRequest: "Repeat a movement pattern",
  prompt: "friendly movement icons for a child-safe pattern game",
  title: "Movement pattern",
  promptText: "Tap the action cards in order.",
  items: ["jump", "spin", "wave"],
  sequence: ["jump", "wave", "jump"],
  rounds: [["jump", "wave", "jump"], ["spin", "jump", "wave"], ["wave", "jump", "spin", "wave"]],
  seed: "seed-movement-pattern"
});
