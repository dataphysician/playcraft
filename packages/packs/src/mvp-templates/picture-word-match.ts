import { memoryTemplate, type MvpProfileTemplate } from "../templates.js";

export const pictureWordMatchTemplate: MvpProfileTemplate = memoryTemplate({
  slug: "picture-word-match",
  name: "Picture Word Match MVP",
  displayLabel: "Picture Word Match",
  label: "Match pictures and words",
  aliases: ["picture word match", "match picture words", "word picture pairs"],
  requestAliasSummary: "picture word match, match picture words, word picture pairs",
  exampleRequest: "Match pictures and words",
  prompt: "friendly picture and word cards for a child-safe matching game",
  title: "Picture word pairs",
  pairItems: ["picture", "word"],
  seed: "seed-picture-word-match"
});
