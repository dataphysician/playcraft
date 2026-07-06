import {
  BuilderInputRequestSchema,
  BuilderIntentResolutionSchema,
  PLAYCRAFT_LOCAL_TIMESTAMP,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderAssetEdit,
  type BuilderCatalog,
  type BuilderInputRequest,
  type BuilderInputSource,
  type BuilderIntentResolution,
  type BuilderServiceRequest,
  type BuilderTemplateId,
  type MoonshineTranscriptRecord
} from "@playcraft/contracts";
import {
  localAssetEditCatalog,
  localAssetEditGenericThemeTokens,
  localAssetEditIntentPatterns,
  localAssetEditMaxItems,
  localAssetEditMaxThemeLength,
  type LocalAssetEditIntentPattern
} from "@playcraft/assets";
import { gameTemplateDefinitions } from "@playcraft/packs";
import { toJsonValue } from "./json-helpers.js";

export const MOONSHINE_STREAMING_CPU_CONFIG = {
  engine: "moonshine-streaming",
  runtime: "cpu",
  localOnly: true
} as const;

export interface ResolvedBuilderInputCommand {
  assetEdit?: BuilderAssetEdit;
  input: BuilderInputRequest;
  resolution: BuilderIntentResolution;
  templateId: BuilderTemplateId;
}

export function resolveBuilderInputCommand(input: {
  activeAssetEdit?: BuilderAssetEdit;
  activeTemplateId?: BuilderTemplateId;
  assetEdit?: BuilderAssetEdit;
  sequence: number;
  source: BuilderInputSource;
  moonshineTranscript?: MoonshineTranscriptRecord;
  templateId?: BuilderTemplateId;
  text?: string;
}): ResolvedBuilderInputCommand {
  const commandText = textForBuilderInputSource(input);
  const request = createBuilderInputRequest({
    sequence: input.sequence,
    source: input.source,
    moonshineTranscript: input.moonshineTranscript,
    text: commandText
  });
  const templateMatch = templateMatchForText(commandText);
  const templateDecision = templateDecisionFor({
    activeTemplateId: input.activeTemplateId,
    matchedCapabilityTags: templateMatch.matchedCapabilityTags,
    matchedTemplateIds: templateMatch.matchedTemplateIds,
    templateId: input.templateId
  });
  const textAssetEdit = assetEditForText(commandText);
  const assetDecision = assetDecisionFor({
    activeAssetEdit: input.activeAssetEdit,
    allowActiveAssetEdit: templateDecision.templateId === input.activeTemplateId,
    explicitAssetEdit: input.assetEdit,
    textAssetEdit
  });
  const resolution = BuilderIntentResolutionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-intent.local.${input.sequence}`,
    version: "1.0.0",
    kind: "builder-intent-resolution",
    inputId: request.inputId,
    activeTemplateId: input.activeTemplateId,
    selectedTemplateId: templateDecision.templateId,
    templateDecision: {
      source: templateDecision.source,
      matchedTemplateIds: templateMatch.matchedTemplateIds,
      matchedCapabilityTags: templateMatch.matchedCapabilityTags,
      matchedRequestAliases: templateMatch.matchedRequestAliases
    },
    assetEdit: assetDecision.assetEdit,
    assetDecision: {
      source: assetDecision.source,
      matchedText: assetDecision.matchedText
    }
  });
  const requestWithResolution = BuilderInputRequestSchema.parse({
    ...request,
    metadata: {
      ...request.metadata,
      intentResolution: toJsonValue(resolution)
    }
  });

  return {
    assetEdit: resolution.assetEdit,
    input: requestWithResolution,
    resolution,
    templateId: resolution.selectedTemplateId
  };
}

export function createBuilderInputRequest(input: {
  sequence: number;
  source: BuilderInputSource;
  moonshineTranscript?: MoonshineTranscriptRecord;
  text?: string;
}): BuilderInputRequest {
  const text = textForBuilderInputSource(input);
  const moonshineTranscript = input.source === "moonshine-transcript" ? input.moonshineTranscript : undefined;

  return BuilderInputRequestSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-input.local.${input.sequence}`,
    version: "1.0.0",
    kind: "builder-input",
    inputId: `builder-input.local.${input.sequence}`,
    source: input.source,
    text,
    moonshineConfig: input.source === "moonshine-transcript" ? MOONSHINE_STREAMING_CPU_CONFIG : undefined,
    moonshineTranscript,
    receivedAt: PLAYCRAFT_LOCAL_TIMESTAMP,
    metadata: {
      origin: "playcraft.local-service",
      ...(moonshineTranscript ? { moonshineTranscriptId: moonshineTranscript.transcriptId } : {})
    }
  });
}

export function textForBuilderInputSource(input: {
  source: BuilderInputSource;
  moonshineTranscript?: MoonshineTranscriptRecord;
  text?: string;
}): string {
  if (input.source === "moonshine-transcript") {
    if (!input.moonshineTranscript) {
      throw new Error("moonshine-transcript input requires a Moonshine transcript record");
    }

    return input.moonshineTranscript.text;
  }

  if (input.moonshineTranscript) {
    throw new Error("text input must not include Moonshine transcript records");
  }

  if (!input.text) {
    throw new Error("text input requires text");
  }

  return input.text.trim();
}

export function sourceForServiceRequest(
  request: BuilderServiceRequest,
  inputPolicy: BuilderCatalog["input"]
): BuilderInputSource {
  return request.source ?? inputPolicy.defaultSource;
}

export function textForServiceRequest(request: BuilderServiceRequest): string {
  if (request.moonshineTranscript) {
    return request.moonshineTranscript.text;
  }

  if (request.text) {
    return request.text;
  }

  throw new Error(`${request.actionName} requests require text or a Moonshine transcript record`);
}

interface TemplateTextMatch {
  matchedCapabilityTags: string[];
  matchedRequestAliases: string[];
  matchedTemplateIds: BuilderTemplateId[];
}

interface TemplateDecision {
  source: BuilderIntentResolution["templateDecision"]["source"];
  templateId: BuilderTemplateId;
}

interface TextAssetEdit {
  assetEdit: BuilderAssetEdit;
  matchedText: string;
  source: Extract<BuilderIntentResolution["assetDecision"]["source"], "catalog-asset-alias" | "freeform-asset-request">;
}

interface AssetDecision {
  assetEdit?: BuilderAssetEdit;
  matchedText?: string;
  source: BuilderIntentResolution["assetDecision"]["source"];
}

export function templateMatchForText(text: string): TemplateTextMatch {
  const textTokens = normalizedTokens(text);
  const matches = gameTemplateDefinitions.flatMap((template) => {
    const matchedRequestAliases = template.requestAliases.filter((alias) =>
      tokenSequenceIncludes(textTokens, normalizedTokens(alias))
    );
    return matchedRequestAliases.length > 0
      ? [{ capabilityTags: template.capabilityTags, requestAliases: matchedRequestAliases, templateId: template.id }]
      : [];
  });

  return {
    matchedCapabilityTags: [...new Set(matches.flatMap((match) => match.capabilityTags))],
    matchedRequestAliases: [...new Set(matches.flatMap((match) => match.requestAliases))],
    matchedTemplateIds: [...new Set(matches.map((match) => match.templateId))]
  };
}

export function templateDecisionFor(input: {
  activeTemplateId?: BuilderTemplateId;
  matchedCapabilityTags: string[];
  matchedTemplateIds: BuilderTemplateId[];
  templateId?: BuilderTemplateId;
}): TemplateDecision {
  if (input.templateId) {
    return { source: "explicit-template-id", templateId: input.templateId };
  }

  if (input.matchedTemplateIds.length > 1) {
    throw new Error(`ambiguous template request matched ${input.matchedTemplateIds.join(", ")}; use explicit templateId`);
  }

  const matchedTemplateId = singleValue(input.matchedTemplateIds);
  if (matchedTemplateId) {
    return { source: "catalog-template-alias", templateId: matchedTemplateId };
  }

  if (input.activeTemplateId) {
    return { source: "active-template", templateId: input.activeTemplateId };
  }

  throw new Error("assemble requests require a game template id or a recognizable game request");
}

export function assetDecisionFor(input: {
  activeAssetEdit?: BuilderAssetEdit;
  allowActiveAssetEdit: boolean;
  explicitAssetEdit?: BuilderAssetEdit;
  textAssetEdit?: TextAssetEdit;
}): AssetDecision {
  if (input.explicitAssetEdit) {
    return {
      assetEdit: input.explicitAssetEdit,
      matchedText: input.explicitAssetEdit.theme ?? input.explicitAssetEdit.items?.join(", "),
      source: "explicit-asset-edit"
    };
  }

  if (input.textAssetEdit) {
    return {
      assetEdit: input.textAssetEdit.assetEdit,
      matchedText: input.textAssetEdit.matchedText,
      source: input.textAssetEdit.source
    };
  }

  if (input.allowActiveAssetEdit && input.activeAssetEdit) {
    return {
      assetEdit: input.activeAssetEdit,
      matchedText: input.activeAssetEdit.theme ?? input.activeAssetEdit.items?.join(", "),
      source: "active-asset-edit"
    };
  }

  return { source: "none" };
}

export function assetEditForText(text: string): TextAssetEdit | undefined {
  const normalized = text.toLowerCase();
  const clauses = assetIntentClauses(normalized);
  const matches = uniqueAssetThemeMatches(
    clauses.flatMap((clause) =>
      localAssetEditIntentPatterns.flatMap((pattern) => matchAssetThemes(clause, pattern))
    )
  );

  if (matches.length === 0) {
    return undefined;
  }

  if (matches.length > 1) {
    throw new Error(`ambiguous asset request matched ${matches.map((entry) => entry.theme).join(", ")}; use explicit assetEdit`);
  }

  const match = requireSingleValue(matches, "asset request match");
  requireTextAssetThemeWithinContract(match.theme);
  const items = match.theme
    .split(/\s*(?:,| and )\s*/u)
    .map((entry) => cleanAssetTheme(entry))
    .filter((entry) => entry.length > 0);
  if (items.length > localAssetEditMaxItems) {
    throw new Error(`text asset requests accept at most ${localAssetEditMaxItems} explicit items; use explicit assetEdit`);
  }

  return {
    assetEdit: items.length > 1 ? { theme: match.theme, items } : { theme: match.theme },
    matchedText: match.theme,
    source: match.source
  };
}

function singleValue<TValue>(values: TValue[]): TValue | undefined {
  return values.length === 1 ? values[0] : undefined;
}

function requireSingleValue<TValue>(values: TValue[], label: string): TValue {
  const value = singleValue(values);
  if (value === undefined) {
    throw new Error(`${label} requires exactly one value`);
  }

  return value;
}

function assetIntentClauses(text: string): string[] {
  return text
    .split(/(?:[;!?]+|\.(?:\s+|$))/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function matchAssetThemes(
  text: string,
  pattern: LocalAssetEditIntentPattern
): Array<{ source: TextAssetEdit["source"]; theme: string }> {
  const matcher = new RegExp(pattern.pattern.source, pattern.pattern.flags.includes("g") ? pattern.pattern.flags : `${pattern.pattern.flags}g`);
  return Array.from(text.matchAll(matcher)).flatMap((match) => {
    const candidate = cleanAssetTheme(match[1]);
    requireTextAssetThemeWithinContract(candidate);
    if (
      candidate.length === 0 ||
      isGenericAssetTheme(candidate) ||
      isTemplateOnlyTheme(candidate) ||
      (pattern.source === "catalog-asset-alias" && !isKnownAssetTheme(candidate))
    ) {
      return [];
    }

    const matchedSource = isKnownAssetTheme(candidate) ? "catalog-asset-alias" : pattern.source;
    return [{ source: matchedSource, theme: candidate }];
  });
}

function uniqueAssetThemeMatches(
  matches: Array<{ source: TextAssetEdit["source"]; theme: string }>
): Array<{ source: TextAssetEdit["source"]; theme: string }> {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = `${match.source}:${normalizedTokens(match.theme).join(" ")}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isKnownAssetTheme(value: string): boolean {
  const tokens = normalizedTokens(value).join(" ");
  return localAssetEditCatalog.some((entry) =>
    [entry.theme, ...entry.aliases].some((alias) => normalizedTokens(alias).join(" ") === tokens)
  );
}

function isTemplateOnlyTheme(value: string): boolean {
  const candidate = normalizedTokens(value).join(" ");
  return gameTemplateDefinitions.some((template) =>
    template.requestAliases.some((alias) => normalizedTokens(alias).join(" ") === candidate)
  );
}

function isGenericAssetTheme(value: string): boolean {
  const candidate = normalizedTokens(value).join(" ");
  return localAssetEditGenericThemeTokens.some((token) => normalizedTokens(token).join(" ") === candidate);
}

function cleanAssetTheme(value: string): string {
  return value
    .replace(/\b(?:a|an|the)\b/gu, " ")
    .replace(/[^a-z0-9 ,.-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function requireTextAssetThemeWithinContract(theme: string): void {
  if (theme.length > localAssetEditMaxThemeLength) {
    throw new Error(`text asset requests accept asset themes up to ${localAssetEditMaxThemeLength} characters; use explicit assetEdit`);
  }
}

export function normalizedTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

export function tokenSequenceIncludes(tokens: string[], sequence: string[]): boolean {
  if (sequence.length === 0 || sequence.length > tokens.length) {
    return false;
  }

  return tokens.some((_, index) =>
    sequence.every((token, offset) => tokens[index + offset] === token)
  );
}