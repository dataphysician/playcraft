import {
  BuilderCatalogSchema,
  BuilderInputRequestSchema,
  BuilderIntentResolutionSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderAssetEdit,
  type BuilderCatalog,
  type BuilderCommand,
  type BuilderInputRequest,
  type BuilderInputSource,
  type BuilderIntentResolution,
  type BuilderTemplateId,
  type JsonValue
} from "@playcraft/contracts";
import {
  createBuilderCommandHandler,
  type BuilderCommandHandler,
  type BuilderExecutionResult
} from "@playcraft/builder";
import { gameTemplateDefinitions } from "@playcraft/packs";

export const PLAYCRAFT_SERVICE_PACKAGE = "@playcraft/service";
export const DEFAULT_TEMPLATE_ID = "template.memory-match" as BuilderTemplateId;

export interface LocalBuilderInput {
  assetEdit?: BuilderAssetEdit;
  sessionId?: string;
  source?: BuilderInputSource;
  templateId?: BuilderTemplateId;
  text: string;
}

export interface ResolvedBuilderInputCommand {
  assetEdit?: BuilderAssetEdit;
  input: BuilderInputRequest;
  resolution: BuilderIntentResolution;
  templateId: BuilderTemplateId;
}

export class LocalPlaycraftService {
  private readonly handler: BuilderCommandHandler;
  private inputCounter = 0;
  private commandCounter = 0;
  private activeAssetEdit: BuilderAssetEdit | undefined;
  private activeTemplateId: BuilderTemplateId = DEFAULT_TEMPLATE_ID;

  constructor(handler: BuilderCommandHandler = createBuilderCommandHandler()) {
    this.handler = handler;
  }

  catalog(): BuilderCatalog {
    return BuilderCatalogSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-catalog.local",
      version: "1.0.0",
      kind: "builder-catalog",
      defaultTemplateId: DEFAULT_TEMPLATE_ID,
      templates: this.handler.listTemplates(),
      tools: this.handler.listTools(),
      acceptedInputSources: ["text", "speech-transcript"],
      assetEdit: {
        supported: true,
        acceptedKeys: ["theme", "items"],
        maxItems: 12,
        localReplacementFolders: true
      },
      retrieval: {
        current: "bundled-local",
        planned: "server-catalog"
      }
    });
  }

  assemble(input: LocalBuilderInput): BuilderExecutionResult {
    const resolved = this.resolveInput(input);
    this.activeTemplateId = resolved.templateId;
    this.activeAssetEdit = resolved.assetEdit;
    return this.execute("assemble-game", input.sessionId ?? "service.session", resolved);
  }

  update(input: LocalBuilderInput & { sessionId: string }): BuilderExecutionResult {
    const resolved = this.resolveInput(input);
    this.activeTemplateId = resolved.templateId;
    this.activeAssetEdit = resolved.assetEdit;
    return this.execute("update-game", input.sessionId, resolved);
  }

  preview(sessionId = "service.session"): BuilderExecutionResult {
    this.commandCounter += 1;
    return this.handler.execute({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-command.${sessionId}.${this.commandCounter}`,
      version: "1.0.0",
      kind: "builder-command",
      sessionId,
      actionName: "preview-action",
      interaction: { action: "primary" }
    });
  }

  reset(): void {
    this.inputCounter = 0;
    this.commandCounter = 0;
    this.activeAssetEdit = undefined;
    this.activeTemplateId = DEFAULT_TEMPLATE_ID;
  }

  private resolveInput(input: LocalBuilderInput): ResolvedBuilderInputCommand {
    this.inputCounter += 1;
    return resolveBuilderInputCommand({
      activeAssetEdit: this.activeAssetEdit,
      activeTemplateId: this.activeTemplateId,
      assetEdit: input.assetEdit,
      sequence: this.inputCounter,
      source: input.source ?? "text",
      templateId: input.templateId,
      text: input.text
    });
  }

  private execute(
    actionName: Extract<BuilderCommand["actionName"], "assemble-game" | "update-game">,
    sessionId: string,
    resolved: ResolvedBuilderInputCommand
  ): BuilderExecutionResult {
    this.commandCounter += 1;
    return this.handler.execute({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-command.${sessionId}.${this.commandCounter}`,
      version: "1.0.0",
      kind: "builder-command",
      sessionId,
      actionName,
      templateId: resolved.templateId,
      input: resolved.input,
      assetEdit: resolved.assetEdit
    });
  }
}

export function createLocalPlaycraftService(handler?: BuilderCommandHandler): LocalPlaycraftService {
  return new LocalPlaycraftService(handler);
}

export function resolveBuilderInputCommand(input: {
  activeAssetEdit?: BuilderAssetEdit;
  activeTemplateId?: BuilderTemplateId;
  assetEdit?: BuilderAssetEdit;
  sequence: number;
  source: BuilderInputSource;
  templateId?: BuilderTemplateId;
  text: string;
}): ResolvedBuilderInputCommand {
  const commandText = input.text.trim();
  const request = createBuilderInputRequest({
    sequence: input.sequence,
    source: input.source,
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
      matchedCapabilityTags: templateMatch.matchedCapabilityTags
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
  text: string;
}): BuilderInputRequest {
  return BuilderInputRequestSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-input.local.${input.sequence}`,
    version: "1.0.0",
    kind: "builder-input",
    inputId: `builder-input.local.${input.sequence}`,
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
      origin: "playcraft.local-service"
    }
  });
}

interface TemplateTextMatch {
  matchedCapabilityTags: string[];
  matchedTemplateIds: BuilderTemplateId[];
}

interface TemplateDecision {
  source: BuilderIntentResolution["templateDecision"]["source"];
  templateId: BuilderTemplateId;
}

interface TextAssetEdit {
  assetEdit: BuilderAssetEdit;
  matchedText: string;
}

interface AssetDecision {
  assetEdit?: BuilderAssetEdit;
  matchedText?: string;
  source: BuilderIntentResolution["assetDecision"]["source"];
}

function templateMatchForText(text: string): TemplateTextMatch {
  const normalized = text.toLowerCase();
  const matches = gameTemplateDefinitions.flatMap((template) => {
    const matchedCapabilityTags = template.capabilityTags.filter((capability) =>
      templateAliasPattern(capability).test(normalized)
    );
    return matchedCapabilityTags.length > 0
      ? [{ capabilityTags: matchedCapabilityTags, templateId: template.id as BuilderTemplateId }]
      : [];
  });

  return {
    matchedCapabilityTags: [...new Set(matches.flatMap((match) => match.capabilityTags))],
    matchedTemplateIds: [...new Set(matches.map((match) => match.templateId))]
  };
}

function templateDecisionFor(input: {
  activeTemplateId?: BuilderTemplateId;
  matchedCapabilityTags: string[];
  matchedTemplateIds: BuilderTemplateId[];
  templateId?: BuilderTemplateId;
}): TemplateDecision {
  if (input.templateId) {
    return { source: "explicit-template-id", templateId: input.templateId };
  }

  if (input.matchedTemplateIds.length === 1) {
    return { source: "text-match", templateId: input.matchedTemplateIds[0] };
  }

  if (input.activeTemplateId) {
    return { source: "active-template", templateId: input.activeTemplateId };
  }

  return { source: "default-template", templateId: DEFAULT_TEMPLATE_ID };
}

function templateAliasPattern(capability: string): RegExp {
  if (capability === "game:memory-match") {
    return /\b(?:memory|matching cards?|card pairs?|pair match)\b/u;
  }
  if (capability === "game:sorting") {
    return /\b(?:sort|sorting|category|categories|color bins?|group by color)\b/u;
  }
  if (capability === "game:sequence-repeat") {
    return /\b(?:sequence|pattern|repeat|copy the pattern)\b/u;
  }
  return /\b\B/u;
}

function assetDecisionFor(input: {
  activeAssetEdit?: BuilderAssetEdit;
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
      source: "text-match"
    };
  }

  if (input.activeAssetEdit) {
    return {
      assetEdit: input.activeAssetEdit,
      matchedText: input.activeAssetEdit.theme ?? input.activeAssetEdit.items?.join(", "),
      source: "active-asset-edit"
    };
  }

  return { source: "none" };
}

function assetEditForText(text: string): TextAssetEdit | undefined {
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

  return {
    assetEdit: items.length > 1 ? { theme, items } : { theme },
    matchedText: theme
  };
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

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
