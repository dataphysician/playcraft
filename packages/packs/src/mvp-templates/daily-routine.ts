import { sequenceTemplate, type MvpProfileTemplate } from "../templates.js";

export const dailyRoutineTemplate: MvpProfileTemplate = sequenceTemplate({
  slug: "daily-routine",
  name: "Daily Routine MVP",
  displayLabel: "Daily Routine",
  label: "Repeat a daily routine",
  aliases: ["daily routine", "routine sequence", "morning routine pattern"],
  requestAliasSummary: "daily routine, routine sequence, morning routine pattern",
  exampleRequest: "Repeat a daily routine",
  prompt: "friendly routine icons for a child-safe sequence game",
  title: "Daily routine",
  promptText: "Tap the routine steps in order.",
  items: ["wash", "brush", "play"],
  sequence: ["wash", "brush", "play"],
  rounds: [["wash", "brush", "play"], ["brush", "play", "wash"], ["wash", "play", "brush", "wash"]],
  seed: "seed-daily-routine"
});
