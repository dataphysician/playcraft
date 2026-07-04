import {
  BuilderCatalogSchema,
  BuilderInputRequestSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderAssetEdit,
  type BuilderCatalog,
  type BuilderCommand,
  type BuilderInputRequest,
  type BuilderInputSource,
  type BuilderTemplateId
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
    const assetEdit = input.assetEdit ?? resolved.assetEdit;
    this.activeTemplateId = resolved.templateId;
    this.activeAssetEdit = assetEdit ?? this.activeAssetEdit;
    return this.execute("assemble-game", input.sessionId ?? "service.session", { ...resolved, assetEdit });
  }

  update(input: LocalBuilderInput & { sessionId: string }): BuilderExecutionResult {
    const resolved = this.resolveInput(input);
    const assetEdit = input.assetEdit ?? resolved.assetEdit;
    this.activeTemplateId = resolved.templateId;
    this.activeAssetEdit = assetEdit ?? this.activeAssetEdit;
    return this.execute("update-game", input.sessionId, { ...resolved, assetEdit });
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
      activeTemplateId: input.templateId ?? this.activeTemplateId,
      sequence: this.inputCounter,
      source: input.source ?? "text",
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
      assetEdit: resolved.assetEdit ?? this.activeAssetEdit
    });
  }
}

export function createLocalPlaycraftService(handler?: BuilderCommandHandler): LocalPlaycraftService {
  return new LocalPlaycraftService(handler);
}

export function resolveBuilderInputCommand(input: {
  activeTemplateId?: BuilderTemplateId;
  sequence: number;
  source: BuilderInputSource;
  text: string;
}): ResolvedBuilderInputCommand {
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

function templateIdForText(text: string): BuilderTemplateId | undefined {
  const normalized = text.toLowerCase();
  const matches = gameTemplateDefinitions.filter((template) =>
    template.capabilityTags.some((capability) => templateAliasPattern(capability).test(normalized))
  );
  return matches.length === 1 ? matches[0].id as BuilderTemplateId : undefined;
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
