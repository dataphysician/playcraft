import { sequenceTemplate, type MvpProfileTemplate } from "../templates.js";

export const rhythmRepeatTemplate: MvpProfileTemplate = sequenceTemplate({
  slug: "rhythm-repeat",
  name: "Rhythm Repeat MVP",
  displayLabel: "Rhythm Repeat",
  label: "Repeat a rhythm",
  aliases: ["rhythm repeat", "copy rhythm", "repeat beat pattern"],
  requestAliasSummary: "rhythm repeat, copy rhythm, repeat beat pattern",
  exampleRequest: "Repeat a rhythm pattern",
  prompt: "friendly drum buttons for a child-safe rhythm repeat game",
  title: "Rhythm repeat",
  promptText: "Tap the rhythm pattern.",
  items: ["tap", "clap", "shake"],
  sequence: ["tap", "clap", "tap"],
  rounds: [["tap", "clap", "tap"], ["shake", "tap", "clap"], ["tap", "shake", "clap", "tap"]],
  seed: "seed-rhythm-repeat"
});
