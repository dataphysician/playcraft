import { z } from "zod";
import {
  PLAYCRAFT_SCHEMA_VERSION,
  PublicContractBaseSchema,
  StableIdSchema,
  VersionSchema,
  CapabilityTagSchema,
  JsonValueSchema
} from "./base.js";

// base.ts re-exports this module, creating a circular import where base.ts is
// mid-initialization while ag-ui.ts is being loaded. Every schema in this
// module that references a base.ts binding — directly or transitively — must
// be wrapped in z.lazy(() => …) to defer construction until first parse, by
// which point base.ts has finished loading. This matches the lazy pattern
// used in workflow.ts, mcp.ts, sse.ts, and asset.ts. PlaycraftPayloadTypeSchema
// stays as a plain ZodString because it only references zod primitives and
// does not touch any base.ts export.

export const PlaycraftPayloadTypeSchema = z
  .string()
  .min(3)
  .max(96)
  .regex(/^[a-z][a-z0-9.-]*$/u, "payload types use lowercase dotted names");
export type PlaycraftPayloadType = z.infer<typeof PlaycraftPayloadTypeSchema>;

export const PlaycraftAgUiEventEnvelopeSchema = z.lazy(() =>
  z
    .object({
      schemaVersion: z.literal(PLAYCRAFT_SCHEMA_VERSION),
      eventId: StableIdSchema,
      eventVersion: VersionSchema,
      profileId: StableIdSchema.optional(),
      runId: StableIdSchema,
      payloadType: PlaycraftPayloadTypeSchema,
      payload: JsonValueSchema,
      provenance: z
        .object({
          role: z.enum(["planner", "asset_requester", "asset_source", "safety_evaluator", "validator", "renderer", "frontend"]),
          sourceId: StableIdSchema
        })
        .strict()
    })
    .strict()
);
export type PlaycraftAgUiEventEnvelope = z.infer<typeof PlaycraftAgUiEventEnvelopeSchema>;

export const PlaycraftEventRecordSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("playcraft-event"),
    profileId: StableIdSchema,
    runId: StableIdSchema.optional(),
    eventType: CapabilityTagSchema,
    eventName: CapabilityTagSchema,
    source: z
      .object({
        role: z.enum(["planner", "asset_requester", "asset_source", "safety_evaluator", "validator", "renderer", "frontend"]),
        sourceId: StableIdSchema
      })
      .strict(),
    sequence: z.number().int().nonnegative(),
    occurredAt: z.string().datetime(),
    payload: JsonValueSchema
  }).strict()
);
export type PlaycraftEventRecord = z.infer<typeof PlaycraftEventRecordSchema>;