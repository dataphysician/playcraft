import { memoryTemplate, type MvpProfileTemplate } from "../templates.js";

export const soundPictureMatchTemplate: MvpProfileTemplate = memoryTemplate({
  slug: "sound-picture-match",
  name: "Sound Picture Match MVP",
  displayLabel: "Sound Picture Match",
  label: "Sound picture matching cards",
  aliases: ["sound picture match", "sound picture pairs", "match sounds to pictures"],
  requestAliasSummary: "sound picture match, sound picture pairs, match sounds to pictures",
  exampleRequest: "Sound picture matching game",
  prompt: "friendly sound picture cards for a child-safe matching game",
  title: "Sound picture pairs",
  pairItems: ["bell", "drum"],
  seed: "seed-sound-picture-match"
});
