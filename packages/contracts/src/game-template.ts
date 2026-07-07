import { z } from "zod";
import {
  AgeBandSchema,
  AssetContentTypeSchema,
  BuilderTemplateIdSchema,
  CapabilityTagSchema,
  GameTemplateAssetEditOperationSchema,
  GameTemplateAssetPromptKindSchema,
  GameTemplateAssetReplacementSourceSchema,
  GameTemplateLiveSurfaceComponentCapabilitiesSchema,
  GameTemplateLiveSurfaceKindSchema,
  GameTemplateTokenStyleSchema,
  InputModalitySchema,
  JsonValueSchema,
  PublicContractBaseSchema,
  StableIdSchema,
  VersionSchema,
  type GameTemplateLiveSurfaceComponentCapabilities
} from "./base.js";
import {
  AssemblyValidationResultSchema,
  AssetGenerationRequestSchema,
  GeneratedAssetRecordSchema
} from "./asset.js";
import {
  PlaycraftEventRecordSchema,
  type PlaycraftEventRecord
} from "./ag-ui.js";

// base.ts re-exports this module, creating a circular import where base.ts is
// mid-initialization while game-template.ts is being loaded. Every schema in
// this module that references a base.ts / asset.ts / ag-ui.ts binding — even
// transitively — must be wrapped in z.lazy(() => …) to defer construction
// until first parse, by which point those modules have finished loading. This
// matches the lazy pattern used in workflow.ts, mcp.ts, sse.ts, asset.ts, and
// ag-ui.ts. MechanicBindingSchema / RuleBindingSchema / ComponentBindingSchema
// are plain-looking z.object(...) schemas but they read StableIdSchema,
// VersionSchema, CapabilityTagSchema, and JsonValueSchema at construction time,
// so they are lazy-wrapped even though their shape only references base.ts
// primitives (see the asset.ts header for the "plain ZodObject that references
// ANY base.ts binding must be lazy-wrapped" rule).

export const MechanicBindingSchema = z.lazy(() =>
  z
    .object({
      bindingId: StableIdSchema,
      mechanicId: StableIdSchema,
      version: VersionSchema,
      parameters: z.record(JsonValueSchema).default({}),
      eventBindings: z.record(CapabilityTagSchema).default({})
    })
    .strict()
);

export const RuleBindingSchema = z.lazy(() =>
  z
    .object({
      bindingId: StableIdSchema,
      ruleId: StableIdSchema,
      version: VersionSchema,
      parameters: z.record(JsonValueSchema).default({}),
      defaultSource: z.enum(["profile", "manifest", "domain-profile", "safety-policy", "explicit-config"])
    })
    .strict()
);

export const ComponentBindingSchema = z.lazy(() =>
  z
    .object({
      bindingId: StableIdSchema,
      componentId: StableIdSchema,
      version: VersionSchema,
      renderCapability: CapabilityTagSchema,
      mechanicBindingIds: z.array(StableIdSchema).min(1),
      renderMechanicBindingId: StableIdSchema,
      props: z.record(JsonValueSchema),
      assetBindings: z.record(StableIdSchema).default({})
    })
    .strict()
);
export type ComponentBinding = z.infer<typeof ComponentBindingSchema>;

export const GameTemplateLiveSurfaceSchema = z.lazy(() =>
  z
    .object({
      kind: GameTemplateLiveSurfaceKindSchema,
      componentCapabilities: GameTemplateLiveSurfaceComponentCapabilitiesSchema,
      assetReplacementSources: z.array(GameTemplateAssetReplacementSourceSchema).min(1),
      tokenStyles: z.array(GameTemplateTokenStyleSchema).min(1),
      defaultTokenStyle: GameTemplateTokenStyleSchema
    })
    .strict()
    .superRefine((value, context) => {
      for (const source of value.assetReplacementSources) {
        if (!value.componentCapabilities[source.componentRole]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `asset replacement source ${source.componentRole}:${source.prop} must reference an authored live surface component capability`,
            path: ["assetReplacementSources"]
          });
        }
      }
    })
);
export type GameTemplateLiveSurface = z.infer<typeof GameTemplateLiveSurfaceSchema>;

export const GameTemplateDefinitionSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    id: BuilderTemplateIdSchema,
    kind: z.literal("game-template"),
    displayName: z.string().min(1),
    displayLabel: z.string().min(1).max(80),
    description: z.string().min(1),
    capabilityTags: z.array(CapabilityTagSchema).min(1),
    requestAliases: z.array(z.string().min(2).max(80)).min(1),
    requestAliasSummary: z.string().min(1).max(240),
    exampleRequest: z.string().min(2).max(120),
    assetPromptKind: GameTemplateAssetPromptKindSchema,
    assetEditOperations: z.array(GameTemplateAssetEditOperationSchema).min(1),
    liveSurface: GameTemplateLiveSurfaceSchema,
    assemblyRequestId: StableIdSchema,
    profileId: StableIdSchema,
    supportedAgeBands: z.array(AgeBandSchema).min(1),
    supportedModalities: z.array(InputModalitySchema).min(1),
    requiredMechanicIds: z.array(StableIdSchema).min(1),
    requiredRuleIds: z.array(StableIdSchema).min(1),
    requiredComponentIds: z.array(StableIdSchema).min(1),
    defaultAssetContentTypes: z.array(AssetContentTypeSchema).default(["image"]),
    localFirst: z.boolean(),
    retrieval: z
      .object({
        current: z.enum(["bundled-local", "authored-local", "remote-agent"])
      })
      .strict()
  }).strict()
);
export type GameTemplateDefinition = z.infer<typeof GameTemplateDefinitionSchema>;

export const GameProfileTemplateSnapshotSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    id: BuilderTemplateIdSchema,
    kind: z.literal("game-template-snapshot"),
    displayName: z.string().min(1),
    displayLabel: z.string().min(1).max(80),
    assetPromptKind: GameTemplateAssetPromptKindSchema,
    assetEditOperations: z.array(GameTemplateAssetEditOperationSchema).min(1),
    liveSurface: GameTemplateLiveSurfaceSchema,
    assemblyRequestId: StableIdSchema
  }).strict()
);
export type GameProfileTemplateSnapshot = z.infer<typeof GameProfileTemplateSnapshotSchema>;

export const GameAssemblyProfileSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("game-assembly-profile"),
    profileName: z.string().min(1),
    assemblyRequestId: StableIdSchema,
    template: GameProfileTemplateSnapshotSchema,
    domainProfile: z.object({ id: StableIdSchema, version: VersionSchema }).strict(),
    safetyPolicy: z.object({ id: StableIdSchema, version: VersionSchema }).strict(),
    theme: z.object({ id: StableIdSchema, version: VersionSchema }).strict(),
    mechanics: z.array(MechanicBindingSchema).min(1),
    rules: z.array(RuleBindingSchema).min(1),
    components: z.array(ComponentBindingSchema).min(1),
    assetRequests: z.array(AssetGenerationRequestSchema).default([]),
    assets: z.array(GeneratedAssetRecordSchema).default([]),
    replay: z
      .object({
        deterministicSeed: z.string().min(1),
        plannerId: StableIdSchema,
        plannerVersion: VersionSchema,
        unsupportedSeedRequests: z.array(StableIdSchema).default([]),
        eventLog: z.array(PlaycraftEventRecordSchema).default([])
      })
      .strict(),
    validation: AssemblyValidationResultSchema
  }).strict()
    .refine((value) => value.template.assemblyRequestId === value.assemblyRequestId, {
      message: "profile template snapshot must match assemblyRequestId",
      path: ["template", "assemblyRequestId"]
    })
    .refine((value) => value.validation.profileId === value.id, {
      message: "profile validation snapshot must match profile id",
      path: ["validation", "profileId"]
    })
    .refine((value) => value.validation.id === `validation.${value.id}`, {
      message: "profile validation snapshot id must match profile id",
      path: ["validation", "id"]
    })
    .refine((value) => value.validation.valid, {
      message: "profile validation snapshot must be valid",
      path: ["validation", "valid"]
    })
    .refine((value) => value.validation.errors.length === 0, {
      message: "profile validation snapshot must not contain errors",
      path: ["validation", "errors"]
    })
    .refine((value) => value.validation.warnings.length === 0, {
      message: "profile validation snapshot must not contain warnings",
      path: ["validation", "warnings"]
    })
    .superRefine((value, context) => {
      const mechanicBindingIds = new Set(value.mechanics.map((mechanic) => mechanic.bindingId));
      const assetRequestIds = new Set(value.assetRequests.map((request) => request.requestId));
      const assetIds = new Set(value.assets.map((asset) => asset.assetId));

      for (const duplicate of profileDuplicateStrings(value.mechanics.map((mechanic) => mechanic.bindingId))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `profile mechanic binding ${duplicate} must be unique`,
          path: ["mechanics"]
        });
      }

      for (const duplicate of profileDuplicateStrings(value.rules.map((rule) => rule.bindingId))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `profile rule binding ${duplicate} must be unique`,
          path: ["rules"]
        });
      }

      for (const duplicate of profileDuplicateStrings(value.components.map((component) => component.bindingId))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `profile component binding ${duplicate} must be unique`,
          path: ["components"]
        });
      }

      for (const duplicate of profileDuplicateStrings(value.assetRequests.map((request) => request.requestId))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `profile asset request ${duplicate} must be unique`,
          path: ["assetRequests"]
        });
      }

      for (const duplicate of profileDuplicateStrings(value.assets.map((asset) => asset.assetId))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `profile generated asset ${duplicate} must be unique`,
          path: ["assets"]
        });
      }

      for (const [index, asset] of value.assets.entries()) {
        if (!assetRequestIds.has(asset.requestId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `profile generated asset ${asset.assetId} must reference a profile asset request`,
            path: ["assets", index, "requestId"]
          });
        }
      }

      for (const [index, component] of value.components.entries()) {
        for (const duplicate of profileDuplicateStrings(component.mechanicBindingIds)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `profile component ${component.bindingId} mechanic binding ${duplicate} must be unique`,
            path: ["components", index, "mechanicBindingIds"]
          });
        }

        for (const bindingId of component.mechanicBindingIds) {
          if (!mechanicBindingIds.has(bindingId)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `profile component ${component.bindingId} mechanic binding ${bindingId} must reference a profile mechanic`,
              path: ["components", index, "mechanicBindingIds"]
            });
          }
        }

        if (!mechanicBindingIds.has(component.renderMechanicBindingId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `profile component ${component.bindingId} render mechanic binding ${component.renderMechanicBindingId} must reference a profile mechanic`,
            path: ["components", index, "renderMechanicBindingId"]
          });
        }

        if (!component.mechanicBindingIds.includes(component.renderMechanicBindingId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `profile component ${component.bindingId} render mechanic binding ${component.renderMechanicBindingId} must be attached to the component`,
            path: ["components", index, "renderMechanicBindingId"]
          });
        }

        for (const [binding, assetId] of Object.entries(component.assetBindings)) {
          if (!assetIds.has(assetId)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `profile component ${component.bindingId} asset binding ${binding} must reference a profile generated asset`,
              path: ["components", index, "assetBindings", binding]
            });
          }
        }
      }

      for (const duplicate of profileDuplicateStrings(value.replay.eventLog.map((event) => event.id))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `profile replay event ${duplicate} must be unique`,
          path: ["replay", "eventLog"]
        });
      }

      for (const duplicate of profileDuplicateStrings(value.replay.eventLog.map((event) => String(event.sequence)))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `profile replay event sequence ${duplicate} must be unique`,
          path: ["replay", "eventLog"]
        });
      }

      if (!profileReplayEventSequencesAreAscending(value.replay.eventLog)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "profile replay event sequences must be in ascending order",
          path: ["replay", "eventLog"]
        });
      }

      for (const capability of liveSurfaceComponentCapabilities(value.template.liveSurface.componentCapabilities)) {
        const matches = value.components.filter((component) => component.renderCapability === capability);
        if (matches.length === 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `profile live surface component ${capability} must be present in components`,
            path: ["components"]
          });
        }
        if (matches.length > 1) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `profile live surface component ${capability} must be unique in components`,
            path: ["components"]
          });
        }
      }
    })
);
export type GameAssemblyProfile = z.infer<typeof GameAssemblyProfileSchema>;

function liveSurfaceComponentCapabilities(
  capabilities: GameTemplateLiveSurfaceComponentCapabilities
): string[] {
  return [capabilities.primary, capabilities.choice].filter((capability): capability is string => Boolean(capability));
}

function profileDuplicateStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates];
}

function profileReplayEventSequencesAreAscending(eventLog: PlaycraftEventRecord[]): boolean {
  for (let index = 1; index < eventLog.length; index += 1) {
    if (eventLog[index]!.sequence < eventLog[index - 1]!.sequence) {
      return false;
    }
  }

  return true;
}