import { PLAYCRAFT_SCHEMA_VERSION, ThemePackSchema, type GameTemplateTokenStyle, type ThemePack } from "@playcraft/contracts";
import { DEFAULT_DOMAIN_ID } from "./mechanics.js";

export const DEFAULT_THEME_ID = "theme.bright-calm";

export const memoryPairTokenStyles: GameTemplateTokenStyle[] = [
  { tokens: ["pair-1"], background: "#fee2e2", border: "#ef4444", foreground: "#7f1d1d", accent: "#fecaca" },
  { tokens: ["pair-2"], background: "#dbeafe", border: "#2563eb", foreground: "#1e3a8a", accent: "#bfdbfe" },
  { tokens: ["pair-3"], background: "#dcfce7", border: "#16a34a", foreground: "#14532d", accent: "#bbf7d0" },
  { tokens: ["pair-4"], background: "#fef3c7", border: "#d97706", foreground: "#713f12", accent: "#fde68a" }
];

export const defaultMemoryTokenStyle: GameTemplateTokenStyle = {
  tokens: ["default"],
  background: "#fce7f3",
  border: "#db2777",
  foreground: "#831843",
  accent: "#fbcfe8"
};

export const toddlerTokenStyles: GameTemplateTokenStyle[] = [
  { tokens: ["red"], background: "#fee2e2", border: "#ef4444", foreground: "#7f1d1d", accent: "#fecaca" },
  { tokens: ["blue"], background: "#dbeafe", border: "#2563eb", foreground: "#1e3a8a", accent: "#bfdbfe" },
  { tokens: ["green"], background: "#dcfce7", border: "#16a34a", foreground: "#14532d", accent: "#bbf7d0" },
  { tokens: ["yellow"], background: "#fef3c7", border: "#eab308", foreground: "#713f12", accent: "#fde68a" }
];

export const defaultToddlerTokenStyle: GameTemplateTokenStyle = {
  tokens: ["default"],
  background: "#ede9fe",
  border: "#7c3aed",
  foreground: "#4c1d95",
  accent: "#ddd6fe"
};

export const themePacks: ThemePack[] = [
  ThemePackSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: DEFAULT_THEME_ID,
    version: "1.0.0",
    kind: "theme",
    displayName: "Bright Calm",
    capabilityTags: ["theme:calm", "theme:high-readability"],
    supportedDomains: [DEFAULT_DOMAIN_ID],
    supportedAgeBands: ["2-3", "4-6", "7-9"],
    visualStyle: "visual:bright-calm",
    audioStyle: "audio:quiet",
    accessibility: {
      highContrast: true,
      reducedMotion: true,
      readableText: true
    },
    allowedContentTags: ["content:child-friendly", "content:educational"],
    assetPromptConstraints: ["Use simple friendly shapes.", "Avoid scary, punitive, or competitive imagery."]
  })
];
