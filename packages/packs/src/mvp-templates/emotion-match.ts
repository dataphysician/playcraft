import { memoryTemplate, type MvpProfileTemplate } from "../templates.js";

export const emotionMatchTemplate: MvpProfileTemplate = memoryTemplate({
  slug: "emotion-match",
  name: "Emotion Match MVP",
  displayLabel: "Emotion Match",
  label: "Emotion matching cards",
  aliases: ["emotion match", "feeling pairs", "matching feelings", "happy sad pairs"],
  requestAliasSummary: "emotion match, feeling pairs, matching feelings",
  exampleRequest: "Emotion matching game",
  prompt: "friendly feeling cards for a child-safe memory game",
  title: "Feeling pairs",
  pairItems: ["happy", "calm"],
  seed: "seed-emotion-match"
});
