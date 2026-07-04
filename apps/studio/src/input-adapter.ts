import {
  BuilderInputRequestSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderAssetEdit,
  type BuilderInputRequest,
  type BuilderInputSource,
  type BuilderTemplateId
} from "@playcraft/contracts";

export const DEFAULT_TEMPLATE_ID: BuilderTemplateId = "template.memory-match" as BuilderTemplateId;

export interface ResolvedStudioInputCommand {
  assetEdit?: BuilderAssetEdit;
  input: BuilderInputRequest;
  templateId: BuilderTemplateId;
}

export function resolveStudioInputCommand(input: {
  activeTemplateId?: BuilderTemplateId;
  sequence: number;
  source: BuilderInputSource;
  text: string;
}): ResolvedStudioInputCommand {
  const commandText = input.text.trim();
  const explicitTemplateId = templateIdForText(commandText);
  const templateId = explicitTemplateId ?? input.activeTemplateId ?? DEFAULT_TEMPLATE_ID;
  const assetEdit = assetEditForText(commandText);

  return {
    assetEdit,
    input: createBuilderInputRequest({
      sequence: input.sequence,
      source: input.source,
      text: commandText
    }),
    templateId
  };
}

export function createBuilderInputRequest(input: {
  sequence: number;
  source: BuilderInputSource;
  text: string;
}): BuilderInputRequest {
  return BuilderInputRequestSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-input.studio.${input.sequence}`,
    version: "1.0.0",
    kind: "builder-input",
    inputId: `builder-input.studio.${input.sequence}`,
    source: input.source,
    text: input.text,
    transcription:
      input.source === "speech-transcript"
        ? {
            engine: "moonshine-streaming",
            runtime: "cpu",
            localOnly: true
          }
        : undefined,
    receivedAt: "2026-07-04T00:00:00.000Z",
    metadata: {
      origin: "studio.local"
    }
  });
}

function templateIdForText(text: string): BuilderTemplateId | undefined {
  const normalized = text.toLowerCase();
  if (/\b(?:memory|matching cards?|card pairs?|pair match)\b/u.test(normalized)) {
    return "template.memory-match" as BuilderTemplateId;
  }
  if (/\b(?:sort|sorting|category|categories|color bins?|group by color)\b/u.test(normalized)) {
    return "template.sorting" as BuilderTemplateId;
  }
  if (/\b(?:sequence|pattern|repeat|copy the pattern)\b/u.test(normalized)) {
    return "template.sequence-repeat" as BuilderTemplateId;
  }
  return undefined;
}

function assetEditForText(text: string): BuilderAssetEdit | undefined {
  const normalized = text.toLowerCase();
  const theme =
    matchTheme(normalized, /\breplace\s+(?:the\s+)?(?:assets?|cards?|card images?|images?|art)\s+with\s+([a-z0-9][a-z0-9 ,.-]{1,80})/u) ??
    matchTheme(normalized, /\b(?:assets?|cards?|card images?|images?|art|theme)\s+(?:to|with|as|for)\s+([a-z0-9][a-z0-9 ,.-]{1,80})/u) ??
    matchTheme(normalized, /\b(?:memory|match|matching|sort|sorting|sequence|repeat)?\s*(?:game|profile|challenge)\s+(?:to|with|as|for)\s+([a-z0-9][a-z0-9 ,.-]{1,80})/u) ??
    matchTheme(normalized, /\b(?:with|using|about|featuring)\s+([a-z0-9][a-z0-9 ,.-]{1,80})/u);

  if (!theme) {
    return undefined;
  }

  const items = theme
    .split(/\s*(?:,| and )\s*/u)
    .map((entry) => cleanAssetTheme(entry))
    .filter((entry) => entry.length > 0)
    .slice(0, 12);

  return items.length > 1 ? { theme, items } : { theme };
}

function matchTheme(text: string, pattern: RegExp): string | undefined {
  const match = pattern.exec(text);
  if (!match) {
    return undefined;
  }

  const candidate = cleanAssetTheme(match[1]);
  return candidate.length > 0 && !isTemplateOnlyTheme(candidate) ? candidate : undefined;
}

function isTemplateOnlyTheme(value: string): boolean {
  return /^(?:memory|match|matching|sort|sorting|sequence|repeat|pattern)$/u.test(value);
}

function cleanAssetTheme(value: string): string {
  return value
    .split(/[.!?;]/u)[0]
    .replace(/\b(?:game|profile|challenge|assets?|cards?|card images?|images?|art|theme)\b/gu, " ")
    .replace(/\b(?:a|an|the)\b/gu, " ")
    .replace(/[^a-z0-9 ,.-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 80);
}
