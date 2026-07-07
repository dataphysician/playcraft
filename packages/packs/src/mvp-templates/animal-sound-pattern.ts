import { sequenceTemplate, type MvpProfileTemplate } from "../templates.js";

export const animalSoundPatternTemplate: MvpProfileTemplate = sequenceTemplate({
  slug: "animal-sound-pattern",
  name: "Animal Sound Pattern MVP",
  displayLabel: "Animal Sound Pattern",
  label: "Repeat animal sound pattern",
  aliases: ["animal sound pattern", "repeat animal sounds", "copy animal sounds"],
  requestAliasSummary: "animal sound pattern, repeat animal sounds, copy animal sounds",
  exampleRequest: "Repeat an animal sound pattern",
  prompt: "friendly animal sound buttons for a child-safe sequence game",
  title: "Animal sounds",
  promptText: "Tap the animal sounds in order.",
  items: ["moo", "quack", "baa"],
  sequence: ["moo", "quack", "moo"],
  rounds: [["moo", "quack", "moo"], ["baa", "moo", "quack"], ["quack", "baa", "moo", "quack"]],
  seed: "seed-animal-sound-pattern"
});
