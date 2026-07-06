import { z } from "zod";
import {
  PublicContractBaseSchema,
  BuilderTemplateIdSchema,
  BuilderToolDefinitionSchema,
  BuilderInputSourceSchema,
  BuilderInputSourceOptionSchema,
  BuilderCatalogRequestTipsSchema,
  BuilderServiceCatalogSchema,
  BuilderSessionBoundServiceActionNameSchema,
  BuilderActionNameSchema,
  StableIdSchema,
  BuilderAssetEditCatalogEntrySchema,
  addDuplicateBuilderInputSourceIssues,
  type BuilderAssetEditCatalogEntry
} from "./base.js";
import { McpManifestSchema, McpToolSchema } from "./mcp.js";
import { GameTemplateDefinitionSchema } from "./game-template.js";

// base.ts re-exports this module, creating a circular import where base.ts is
// mid-initialization while builder-catalog.ts is being loaded. BuilderCatalogSchema
// references multiple base.ts bindings (PublicContractBaseSchema, BuilderTemplateIdSchema,
// BuilderToolDefinitionSchema, BuilderInputSourceSchema, BuilderInputSourceOptionSchema,
// BuilderCatalogRequestTipsSchema, BuilderServiceCatalogSchema,
// BuilderSessionBoundServiceActionNameSchema, BuilderActionNameSchema,
// BuilderAssetEditCatalogEntrySchema, StableIdSchema) and reads
// BuilderActionNameSchema.options / BuilderSessionBoundServiceActionNameSchema.options
// inside its .superRefine(...) block, so the entire schema is wrapped in
// z.lazy(() => …) to defer construction until first parse, by which point base.ts
// has finished loading. This matches the lazy pattern used in workflow.ts,
// mcp.ts, sse.ts, asset.ts, ag-ui.ts, and game-template.ts.

export const BuilderCatalogSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("builder-catalog"),
    defaultTemplateId: BuilderTemplateIdSchema,
    templates: z.array(GameTemplateDefinitionSchema).min(1),
    tools: z.array(BuilderToolDefinitionSchema).min(1),
    acceptedInputSources: z.array(BuilderInputSourceSchema).min(1),
    input: z
      .object({
        defaultSource: BuilderInputSourceSchema,
        transcriptSource: z.literal("moonshine-transcript"),
        noInputLabel: z.string().min(1).max(80),
        sourceOptions: z.array(BuilderInputSourceOptionSchema).min(1)
      })
      .strict(),
    requestTips: BuilderCatalogRequestTipsSchema,
    service: BuilderServiceCatalogSchema,
    sessions: z
      .object({
        defaultAssembleSessionId: StableIdSchema,
        sessionBoundActions: z.array(BuilderSessionBoundServiceActionNameSchema).min(1)
      })
      .strict(),
    assetEdit: z
      .object({
        supported: z.literal(true),
        acceptedKeys: z.array(z.enum(["theme", "items"])).min(1),
        maxItems: z.number().int().positive(),
        localReplacementFolders: z.literal(true),
        freeformItemSuffixes: z.array(z.string().min(1).max(12)).min(1),
        genericThemeTokens: z.array(z.string().min(1).max(40)).default([]),
        availableThemes: z.array(BuilderAssetEditCatalogEntrySchema).min(1)
      })
      .strict(),
    retrieval: z
      .object({
        current: z.literal("bundled-local"),
        planned: z.literal("server-catalog")
      })
      .strict(),
    mcp: z
      .object({
        manifest: McpManifestSchema,
        tools: z.array(McpToolSchema)
      })
      .strict()
      .optional()
  }).strict()
    .superRefine((value, context) => {
      const acceptedSources = value.acceptedInputSources;
      const optionSources = value.input.sourceOptions.map((option) => option.source);
      const sessionBoundActions = value.sessions.sessionBoundActions;
      const toolActionNames = value.tools.map((tool) => tool.actionName);
      const templateIds = value.templates.map((template) => template.id);
      const templateLabels = value.templates.map((template) => template.displayLabel);
      const assetEditThemes = value.assetEdit.availableThemes.map((entry) => entry.theme);
      const assetEditFolders = value.assetEdit.availableThemes.map((entry) => entry.localReplacementFolder);
      const assetEditLabels = value.assetEdit.availableThemes.map((entry) => `with ${entry.displayLabel}`);

      addDuplicateBuilderInputSourceIssues(context, acceptedSources, ["acceptedInputSources"]);
      addDuplicateBuilderInputSourceIssues(context, optionSources, ["input", "sourceOptions"]);
      addDuplicateSessionBoundActionIssues(context, sessionBoundActions, ["sessions", "sessionBoundActions"]);
      addDuplicateBuilderActionIssues(context, toolActionNames, ["tools"]);
      addDuplicateBuilderTemplateIssues(context, templateIds, ["templates"]);
      addDuplicateBuilderAssetThemeIssues(context, assetEditThemes, ["assetEdit", "availableThemes"]);
      addDuplicateBuilderAssetFolderIssues(context, assetEditFolders, ["assetEdit", "availableThemes"]);
      addDuplicateBuilderAssetAliasIssues(context, value.assetEdit.availableThemes, ["assetEdit", "availableThemes"]);
      addDuplicateCatalogTextIssues(context, value.requestTips.availableGames, ["requestTips", "availableGames"], "request tip available game");
      addDuplicateCatalogTextIssues(context, value.requestTips.featuredGames, ["requestTips", "featuredGames"], "request tip featured game");
      addDuplicateCatalogTextIssues(context, value.requestTips.assetEdits, ["requestTips", "assetEdits"], "request tip asset edit");
      addDuplicateCatalogTextIssues(context, value.requestTips.examples, ["requestTips", "examples"], "request tip example");

      if (!sameStringArray(value.requestTips.availableGames, templateLabels)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "request tip availableGames must match catalog template display labels",
          path: ["requestTips", "availableGames"]
        });
      }

      if (!sameStringArray(value.requestTips.assetEdits, assetEditLabels)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "request tip assetEdits must match asset edit display labels",
          path: ["requestTips", "assetEdits"]
        });
      }

      for (const game of value.requestTips.featuredGames) {
        if (!value.requestTips.availableGames.includes(game)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `request tip featured game ${game} must be listed in availableGames`,
            path: ["requestTips", "featuredGames"]
          });
        }
      }

      for (const key of ["theme", "items"] as const) {
        if (!value.assetEdit.acceptedKeys.includes(key)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `asset edit acceptedKeys must include ${key}`,
            path: ["assetEdit", "acceptedKeys"]
          });
        }
      }

      if (!templateIds.includes(value.defaultTemplateId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `catalog default template ${value.defaultTemplateId} must be included in templates`,
          path: ["defaultTemplateId"]
        });
      }

      for (const template of value.templates) {
        if (!template.localFirst) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `catalog template ${template.id} must be localFirst`,
            path: ["templates"]
          });
        }
      }

      for (const actionName of BuilderActionNameSchema.options) {
        if (!toolActionNames.includes(actionName)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `builder catalog must include tool action ${actionName}`,
            path: ["tools"]
          });
        }
      }

      if (!acceptedSources.includes(value.input.defaultSource)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "catalog default input source must be listed in acceptedInputSources",
          path: ["input", "defaultSource"]
        });
      }

      if (!acceptedSources.includes(value.input.transcriptSource)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "catalog transcript input source must be listed in acceptedInputSources",
          path: ["input", "transcriptSource"]
        });
      }

      for (const source of optionSources) {
        if (!acceptedSources.includes(source)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `catalog source option ${source} is not listed in acceptedInputSources`,
            path: ["input", "sourceOptions"]
          });
        }
      }

      for (const source of acceptedSources) {
        if (!optionSources.includes(source)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `accepted input source ${source} is missing a source option`,
            path: ["input", "sourceOptions"]
          });
        }
      }

      for (const actionName of BuilderSessionBoundServiceActionNameSchema.options) {
        if (!sessionBoundActions.includes(actionName)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `catalog session-bound actions must include ${actionName}`,
            path: ["sessions", "sessionBoundActions"]
          });
        }
      }

      const serviceSessionActions = value.service.actions
        .filter((action) => action.requiresSession)
        .map((action) => action.actionName);
      for (const actionName of serviceSessionActions) {
        if (!sessionBoundActions.includes(actionName as z.infer<typeof BuilderSessionBoundServiceActionNameSchema>)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `service session action ${actionName} must be listed in sessionBoundActions`,
            path: ["sessions", "sessionBoundActions"]
          });
        }
      }
    })
);
export type BuilderCatalog = z.infer<typeof BuilderCatalogSchema>;

function addDuplicateBuilderActionIssues(
  context: z.RefinementCtx,
  actionNames: z.infer<typeof BuilderActionNameSchema>[],
  path: Array<string | number>
): void {
  const seen = new Set<z.infer<typeof BuilderActionNameSchema>>();
  const duplicates = new Set<z.infer<typeof BuilderActionNameSchema>>();

  for (const actionName of actionNames) {
    if (seen.has(actionName)) {
      duplicates.add(actionName);
    }
    seen.add(actionName);
  }

  for (const duplicate of duplicates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `builder catalog tool action ${duplicate} must be unique`,
      path
    });
  }
}

function addDuplicateBuilderTemplateIssues(
  context: z.RefinementCtx,
  templateIds: z.infer<typeof BuilderTemplateIdSchema>[],
  path: Array<string | number>
): void {
  const seen = new Set<z.infer<typeof BuilderTemplateIdSchema>>();
  const duplicates = new Set<z.infer<typeof BuilderTemplateIdSchema>>();

  for (const templateId of templateIds) {
    if (seen.has(templateId)) {
      duplicates.add(templateId);
    }
    seen.add(templateId);
  }

  for (const duplicate of duplicates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `builder catalog template ${duplicate} must be unique`,
      path
    });
  }
}

function addDuplicateBuilderAssetThemeIssues(
  context: z.RefinementCtx,
  themes: string[],
  path: Array<string | number>
): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const theme of themes.map((entry) => normalizedCatalogToken(entry))) {
    if (seen.has(theme)) {
      duplicates.add(theme);
    }
    seen.add(theme);
  }

  for (const duplicate of duplicates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `asset edit theme ${duplicate} must be unique`,
      path
    });
  }
}

function addDuplicateBuilderAssetFolderIssues(
  context: z.RefinementCtx,
  folders: string[],
  path: Array<string | number>
): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const folder of folders.map((entry) => normalizedCatalogToken(entry))) {
    if (seen.has(folder)) {
      duplicates.add(folder);
    }
    seen.add(folder);
  }

  for (const duplicate of duplicates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `asset edit replacement folder ${duplicate} must be unique`,
      path
    });
  }
}

function addDuplicateBuilderAssetAliasIssues(
  context: z.RefinementCtx,
  themes: BuilderAssetEditCatalogEntry[],
  path: Array<string | number>
): void {
  const ownerByAlias = new Map<string, string>();
  const duplicates = new Set<string>();

  for (const theme of themes) {
    for (const alias of [theme.theme, ...theme.aliases]) {
      const normalized = normalizedCatalogToken(alias);
      const owner = ownerByAlias.get(normalized);
      if (owner && owner !== theme.theme) {
        duplicates.add(normalized);
      }
      ownerByAlias.set(normalized, theme.theme);
    }
  }

  for (const duplicate of duplicates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `asset edit alias ${duplicate} must map to exactly one theme`,
      path
    });
  }
}

function normalizedCatalogToken(value: string): string {
  return value.trim().toLowerCase();
}

function sameStringArray(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function addDuplicateCatalogTextIssues(
  context: z.RefinementCtx,
  entries: string[],
  path: Array<string | number>,
  label: string
): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const entry of entries.map((value) => normalizedCatalogToken(value))) {
    if (seen.has(entry)) {
      duplicates.add(entry);
    }
    seen.add(entry);
  }

  for (const duplicate of duplicates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} ${duplicate} must be unique`,
      path
    });
  }
}

function addDuplicateSessionBoundActionIssues(
  context: z.RefinementCtx,
  actionNames: z.infer<typeof BuilderSessionBoundServiceActionNameSchema>[],
  path: Array<string | number>
): void {
  const seen = new Set<z.infer<typeof BuilderSessionBoundServiceActionNameSchema>>();
  const duplicates = new Set<z.infer<typeof BuilderSessionBoundServiceActionNameSchema>>();

  for (const actionName of actionNames) {
    if (seen.has(actionName)) {
      duplicates.add(actionName);
    }
    seen.add(actionName);
  }

  for (const duplicate of duplicates) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `session-bound service action ${duplicate} must be unique`,
      path
    });
  }
}