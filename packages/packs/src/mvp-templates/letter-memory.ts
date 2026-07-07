import { memoryTemplate, type MvpProfileTemplate } from "../templates.js";

export const letterMemoryTemplate: MvpProfileTemplate = memoryTemplate({
  slug: "letter-memory",
  name: "Letter Memory MVP",
  displayLabel: "Letter Memory",
  label: "Letter memory cards",
  aliases: ["letter memory", "letter match cards", "matching letters", "find letter pairs"],
  requestAliasSummary: "letter memory, letter match cards, matching letters",
  exampleRequest: "Letter memory game",
  prompt: "friendly letter cards for a child-safe memory game",
  title: "Letter pairs",
  pairItems: ["letter-a", "letter-b"],
  seed: "seed-letter-memory"
});
