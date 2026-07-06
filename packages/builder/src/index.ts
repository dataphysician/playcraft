import { z } from "zod";
import type { AgUiEvent } from "@playcraft/ag-ui";
import {
  BuilderToolDefinitionSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderCommand,
  type BuilderTemplateId,
  type BuilderToolDefinition,
  type GameAssemblyProfile,
  type GameTemplateDefinition,
  type JsonObjectSchemaDescriptor
} from "@playcraft/contracts";
import { BUILDER_ARGUMENT_SUMMARY_LABELS, type BuilderExecutionResult } from "./ownership.js";
import { createBuilderCommandHandler } from "./session-service.js";

export { BUILDER_SESSION_POLICY, BUILDER_SESSION_TTL_MS, BUILDER_DEFAULT_OWNER_ID, BUILDER_SESSION_CAPABILITIES } from "./ownership.js";
export { PlaycraftBuilderSessionService } from "./session-service.js";
export type { BuildOrUpdateCommand, BuilderExecutionEvent, BuilderExecutionResult, BuilderSessionRecord } from "./ownership.js";
export { requestForTemplate, customTemplateSnapshotFor } from "./templates.js";

export const PLAYCRAFT_BUILDER_PACKAGE = "@playcraft/builder";

export const BuilderPreviewPayloadSchema = z
  .object({
    componentId: z.string().min(1),
    renderedComponentIds: z.array(z.string().min(1)).min(1),
    interactionCount: z.number().int().nonnegative()
  })
  .strict();

export type BuilderAgUiEvent = AgUiEvent;

export interface BuilderCommandHandler {
  execute(command: BuilderCommand): BuilderExecutionResult;
  assembleTemplates(templateIds: BuilderTemplateId[], sessionId?: string): BuilderExecutionResult[];
  getSessionSnapshot(sessionId: string): import("@playcraft/contracts").BuilderSessionSnapshot;
  importProfile(sessionId: string, profile: GameAssemblyProfile, commandId?: string): BuilderExecutionResult;
  listTools(): BuilderToolDefinition[];
  listTemplates(): GameTemplateDefinition[];
  setSessionOwnership?(sessionId: string, ownership: import("@playcraft/contracts").BuilderSessionOwnership): void;
}

export const builderToolDefinitions: BuilderToolDefinition[] = [
  builderTool("builder-tool.assemble-game", "tool:assemble-game", "Assemble Game", "Assemble a mini-game from a registered local template.", "assemble-game", ["text", "moonshine-transcript"]),
  builderTool("builder-tool.update-game", "tool:update-game", "Update Game", "Update the active mini-game template or its asset edit levers.", "update-game", ["text", "moonshine-transcript"]),
  builderTool("builder-tool.preview-action", "tool:preview-action", "Preview Action", "Replay one trusted UI interaction against the active profile.", "preview-action", []),
  builderTool("builder-tool.list-builder-tools", "tool:list-builder-tools", "List Builder Tools", "List the local Playcraft builder tools and bundled game templates.", "list-builder-tools", []),
  builderTool("builder-tool.get-session", "tool:get-session", "Get Session", "Inspect the active local builder session snapshot.", "get-session", []),
  builderTool("builder-tool.export-profile", "tool:export-profile", "Export Profile", "Export the active validated game profile for reuse.", "export-profile", []),
  builderTool("builder-tool.import-profile", "tool:import-profile", "Import Profile", "Import a validated game profile into a local session.", "import-profile", [])
];

function builderTool(
  id: string,
  toolName: string,
  displayName: string,
  description: string,
  actionName: BuilderToolDefinition["actionName"],
  acceptedInputSources: BuilderToolDefinition["acceptedInputSources"]
): BuilderToolDefinition {
  const argumentsSchema = builderToolArgumentsSchema(actionName);

  return BuilderToolDefinitionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "builder-tool",
    toolName,
    displayName,
    description,
    actionName,
    argumentsSchema,
    argumentSummary: builderToolArgumentSummary(argumentsSchema),
    acceptedInputSources,
    inputSourceSummary: builderToolInputSourceSummary(acceptedInputSources),
    localOnly: true,
    emittedEvents: ["builder:command", "builder:profile-ready"],
    requiredContracts: builderToolRequiredContracts(actionName)
  });
}

function builderToolRequiredContracts(actionName: BuilderToolDefinition["actionName"]): BuilderToolDefinition["requiredContracts"] {
  const contractsByAction: Record<BuilderToolDefinition["actionName"], BuilderToolDefinition["requiredContracts"]> = {
    "assemble-game": ["BuilderCommandSchema", "BuilderInputRequestSchema", "GameTemplateDefinitionSchema"],
    "update-game": ["BuilderCommandSchema", "BuilderInputRequestSchema", "GameTemplateDefinitionSchema"],
    "preview-action": ["BuilderCommandSchema", "BuilderPreviewStateSchema"],
    "list-builder-tools": ["BuilderToolDefinitionSchema", "GameTemplateDefinitionSchema"],
    "get-session": ["BuilderCommandSchema", "BuilderSessionSnapshotSchema"],
    "export-profile": ["BuilderCommandSchema", "BuilderProfileExportSchema"],
    "import-profile": ["BuilderCommandSchema", "GameAssemblyProfileSchema"]
  };

  return contractsByAction[actionName];
}

function builderToolArgumentSummary(schema: JsonObjectSchemaDescriptor): string {
  const summary = Object.entries(schema.fields).map(([name, field]) => `${name}${field.required ? "*" : ""}:${field.type}`);
  return `${BUILDER_ARGUMENT_SUMMARY_LABELS.prefix}: ${summary.length > 0 ? summary.join(", ") : BUILDER_ARGUMENT_SUMMARY_LABELS.empty}`;
}

function builderToolInputSourceSummary(sources: BuilderToolDefinition["acceptedInputSources"]): string {
  if (sources.length === 0) {
    return "input: none";
  }

  const labels: Record<BuilderToolDefinition["acceptedInputSources"][number], string> = {
    text: "Text",
    "moonshine-transcript": "Transcript"
  };
  return `input: ${sources.map((source) => labels[source]).join(", ")}`;
}

function builderToolArgumentsSchema(actionName: BuilderToolDefinition["actionName"]): JsonObjectSchemaDescriptor {
  const optionalString = { type: "string", required: false } as const;
  const requiredString = { type: "string", required: true } as const;
  const optionalObject = { type: "object", required: false } as const;
  const previewInteraction: JsonObjectSchemaDescriptor["fields"][string] = {
    type: "object",
    required: true,
    fields: {
      action: {
        type: "string",
        required: true,
        allowedValues: ["primary"]
      }
    },
    allowUnknown: false
  };

  const fieldsByAction: Record<BuilderToolDefinition["actionName"], JsonObjectSchemaDescriptor["fields"]> = {
    "assemble-game": {
      assetEdit: optionalObject,
      input: optionalObject,
      sessionId: optionalString,
      templateId: requiredString
    },
    "update-game": {
      assetEdit: optionalObject,
      input: optionalObject,
      sessionId: requiredString,
      templateId: requiredString
    },
    "preview-action": {
      interaction: previewInteraction,
      sessionId: requiredString
    },
    "list-builder-tools": {
      sessionId: optionalString
    },
    "get-session": {
      sessionId: requiredString
    },
    "export-profile": {
      sessionId: requiredString
    },
    "import-profile": {
      profile: { type: "object", required: true },
      sessionId: requiredString
    }
  };

  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    type: "object",
    fields: fieldsByAction[actionName],
    allowUnknown: false
  };
}

export { createBuilderCommandHandler };
export type { BuilderExecutionError } from "./ownership.js";
