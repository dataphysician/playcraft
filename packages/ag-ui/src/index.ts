import { z } from "zod";
import {
  AssetGenerationRequestSchema,
  ComponentRenderRequestSchema,
  GameAssemblyProfileSchema,
  GeneratedAssetRecordSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  PlaycraftAgUiEventEnvelopeSchema,
  PlaycraftEventRecordSchema,
  SchemaIssueSchema,
  StableIdSchema,
  JsonValueSchema,
  schemaIssue,
  type JsonValue,
  type PlaycraftAgUiEventEnvelope
} from "@playcraft/contracts";

export const AgUiEventTypeSchema = z.enum([
  "RunStarted",
  "RunFinished",
  "RunError",
  "StepStarted",
  "StepFinished",
  "StateSnapshot",
  "StateDelta",
  "Activity",
  "ToolCall",
  "ToolResult",
  "Custom"
]);
export type AgUiEventType = z.infer<typeof AgUiEventTypeSchema>;

export interface AgUiEvent<TValue = unknown> {
  type: AgUiEventType;
  eventId: string;
  runId: string;
  timestamp: string;
  value: TValue;
}

export const AgUiEventSchema = z
  .object({
    type: AgUiEventTypeSchema,
    eventId: StableIdSchema,
    runId: StableIdSchema,
    timestamp: z.string().datetime(),
    value: JsonValueSchema
  })
  .strict();

export const ReplayReadyPayloadSchema = z
  .object({
    profileId: StableIdSchema,
    replayable: z.boolean()
  })
  .strict();

export const AssetProgressPayloadSchema = z
  .object({
    requestId: StableIdSchema,
    stage: z.enum(["queued", "generating", "completed"]),
    completed: z.number().int().nonnegative(),
    total: z.number().int().positive()
  })
  .strict();

export const BuiltInPayloadSchemas = {
  "profile.proposed": GameAssemblyProfileSchema,
  "profile.validated": GameAssemblyProfileSchema,
  "component.render-requested": ComponentRenderRequestSchema,
  "asset.requested": AssetGenerationRequestSchema,
  "asset.progress": AssetProgressPayloadSchema,
  "asset.generated": GeneratedAssetRecordSchema,
  "safety.finding": SchemaIssueSchema,
  "replay.ready": ReplayReadyPayloadSchema,
  "replay.event": PlaycraftEventRecordSchema
} as const;

export type PayloadSchemaRegistry = Record<string, z.ZodType<unknown>>;

export function parseAgUiEvent(eventInput: unknown): AgUiEvent<JsonValue> {
  const parsed = AgUiEventSchema.safeParse(eventInput);
  if (parsed.success) {
    return parsed.data;
  }

  const typeProbe = z.object({ type: z.unknown() }).passthrough().safeParse(eventInput);
  if (typeProbe.success && typeof typeProbe.data.type === "string" && !AgUiEventTypeSchema.safeParse(typeProbe.data.type).success) {
    throw new Error(`unknown AG-UI event type: ${typeProbe.data.type}`);
  }

  throw new Error(`invalid AG-UI event: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
}

export function runStarted(runId: string, sequence = 0): AgUiEvent<{ runId: string }> {
  return baseEvent("RunStarted", runId, sequence, { runId });
}

export function runFinished(runId: string, sequence = 0): AgUiEvent<{ runId: string }> {
  return baseEvent("RunFinished", runId, sequence, { runId });
}

export function runError(runId: string, message: string, sequence = 0): AgUiEvent<{ runId: string; message: string }> {
  return baseEvent("RunError", runId, sequence, { runId, message });
}

export function stepStarted(runId: string, stepId: string, label: string, sequence = 0): AgUiEvent<{ stepId: string; label: string }> {
  return baseEvent("StepStarted", runId, sequence, { stepId, label });
}

export function stepFinished(runId: string, stepId: string, sequence = 0): AgUiEvent<{ stepId: string }> {
  return baseEvent("StepFinished", runId, sequence, { stepId });
}

export function stateSnapshot<TState>(runId: string, state: TState, sequence = 0): AgUiEvent<{ state: TState }> {
  return baseEvent("StateSnapshot", runId, sequence, { state });
}

export function stateDelta<TPatch>(runId: string, patch: TPatch, sequence = 0): AgUiEvent<{ patch: TPatch }> {
  return baseEvent("StateDelta", runId, sequence, { patch });
}

export function activity(runId: string, activityId: string, status: "started" | "progress" | "finished", message: string, sequence = 0): AgUiEvent<{ activityId: string; status: string; message: string }> {
  return baseEvent("Activity", runId, sequence, { activityId, status, message });
}

export function toolCall<TArgs>(runId: string, toolName: string, args: TArgs, sequence = 0): AgUiEvent<{ toolName: string; args: TArgs }> {
  return baseEvent("ToolCall", runId, sequence, { toolName, args });
}

export function toolResult<TResult>(runId: string, toolName: string, result: TResult, sequence = 0): AgUiEvent<{ toolName: string; result: TResult }> {
  return baseEvent("ToolResult", runId, sequence, { toolName, result });
}

export function playcraftCustomEvent(
  envelopeInput: PlaycraftAgUiEventEnvelope,
  options: { extraPayloadSchemas?: PayloadSchemaRegistry; sequence?: number } = {}
): AgUiEvent<PlaycraftAgUiEventEnvelope> {
  const envelope = validatePlaycraftEnvelope(envelopeInput, options.extraPayloadSchemas);
  return baseEvent("Custom", envelope.runId ?? "run.unspecified", options.sequence ?? 0, envelope);
}

export function createPlaycraftEnvelope<TPayload>(input: {
  eventId: string;
  eventVersion?: string;
  profileId?: string;
  runId?: string;
  payloadType: string;
  payload: TPayload;
  provenance: PlaycraftAgUiEventEnvelope["provenance"];
}): PlaycraftAgUiEventEnvelope {
  return PlaycraftAgUiEventEnvelopeSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    eventVersion: input.eventVersion ?? "1.0.0",
    ...input
  });
}

export function validatePlaycraftEnvelope(
  envelopeInput: unknown,
  extraPayloadSchemas: PayloadSchemaRegistry = {}
): PlaycraftAgUiEventEnvelope {
  const envelope = PlaycraftAgUiEventEnvelopeSchema.parse(envelopeInput);
  const payloadSchema = { ...BuiltInPayloadSchemas, ...extraPayloadSchemas }[envelope.payloadType];
  if (!payloadSchema) {
    throw new Error(`unregistered Playcraft custom payload type: ${envelope.payloadType}`);
  }

  const payload = payloadSchema.safeParse(envelope.payload);
  if (!payload.success) {
    const issues = payload.error.issues.map((issue) => schemaIssue(issue.path, issue.code, issue.message, "error"));
    throw new Error(`invalid Playcraft custom payload: ${issues.map((issue) => issue.message).join("; ")}`);
  }

  return envelope;
}

function baseEvent<TValue>(type: AgUiEventType, runId: string, sequence: number, value: TValue): AgUiEvent<TValue> {
  return {
    type,
    eventId: `agui.${runId}.${String(sequence).padStart(4, "0")}.${type.toLowerCase()}`,
    runId,
    timestamp: "2026-06-27T00:00:00.000Z",
    value
  };
}
