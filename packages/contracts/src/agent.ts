import { z } from "zod";
import {
  CapabilityTagSchema,
  JsonValueSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  PublicContractBaseSchema,
  StableIdSchema,
  VersionSchema,
  type PublicContractName
} from "./base.js";

/**
 * Wireable local inference engines.
 *
 * The local tool is in charge of assembling games. It drives deterministic tool
 * calls through one of these engines. `lfm2.5-vl-450m-extract` is the wired
 * default (LiquidAI's extraction-tuned VLM, run via Moonshine Streaming CPU).
 * Other engines may be added when they pass the offline/localOnly contract.
 */
export const LFM_AGENT_ENGINE_ID = "lfm2.5-vl-450m-extract";

export const LocalInferenceEngineIdSchema = z.enum([
  "lfm2.5-vl-450m-extract",
  "stub"
]);
export type LocalInferenceEngineId = z.infer<typeof LocalInferenceEngineIdSchema>;

export const LocalInferenceEngineManifestSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("local-inference-engine"),
    engineId: LocalInferenceEngineIdSchema,
    displayName: z.string().min(1),
    capabilityTags: z.array(CapabilityTagSchema).min(1),
    offline: z.literal(true),
    localOnly: z.literal(true),
    maxContextTokens: z.number().int().positive(),
    supportsStructuredJson: z.boolean(),
    supportsImageInput: z.boolean(),
    supportsToolCalls: z.literal(true),
    outboxModule: z.string().min(1)
  }).strict()
);
export type LocalInferenceEngineManifest = z.infer<typeof LocalInferenceEngineManifestSchema>;

export const MOONSHINE_STREAMING_CPU_ENGINE_ID = "local-inference-engine.lfm2.5-vl-450m-extract";

export function moonshineStreamingCpuEngine(): LocalInferenceEngineManifest {
  return LocalInferenceEngineManifestSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: MOONSHINE_STREAMING_CPU_ENGINE_ID,
    version: "1.0.0",
    kind: "local-inference-engine",
    engineId: "lfm2.5-vl-450m-extract",
    displayName: "LiquidAI LFM2.5-VL-450M Extract via Moonshine Streaming CPU",
    capabilityTags: ["llm:local", "llm:extract", "llm:tool-call", "llm:image-input"],
    offline: true,
    localOnly: true,
    maxContextTokens: 8192,
    supportsStructuredJson: true,
    supportsImageInput: true,
    supportsToolCalls: true,
    outboxModule: "@playcraft/core/local-llm.js"
  });
}

export const AgentMessageRoleSchema = z.enum(["system", "user", "assistant", "tool"]);
export type AgentMessageRole = z.infer<typeof AgentMessageRoleSchema>;

export const AgentMessageSchema = z.lazy(() =>
  z
    .object({
      role: AgentMessageRoleSchema,
      content: z.string(),
      toolCallId: StableIdSchema.optional(),
      toolName: CapabilityTagSchema.optional()
    })
    .strict()
);
export type AgentMessage = z.infer<typeof AgentMessageSchema>;

/**
 * A tool call emitted by the local LLM. Constrained by Outlines to a JSON schema
 * at generation time so the agent loop can parse deterministically without
 * permissive validation. Arguments are typed against the tool's `argumentsSchema`
 * at parse time, not at emission time.
 */
export const AgentToolCallSchema = z.lazy(() =>
  z
    .object({
      callId: StableIdSchema,
      toolName: CapabilityTagSchema,
      arguments: z.record(JsonValueSchema)
    })
    .strict()
);
export type AgentToolCall = z.infer<typeof AgentToolCallSchema>;

export const AgentToolResultStatusSchema = z.enum(["ok", "error", "unsupported"]);
export type AgentToolResultStatus = z.infer<typeof AgentToolResultStatusSchema>;

export const AgentToolResultSchema = z.lazy(() =>
  z
    .object({
      callId: StableIdSchema,
      toolName: CapabilityTagSchema,
      status: AgentToolResultStatusSchema,
      value: JsonValueSchema.optional(),
      error: z.string().min(1).optional()
    })
    .strict()
    .refine((value) => value.status !== "ok" || value.value !== undefined, {
      message: "ok tool results must include a value",
      path: ["value"]
    })
    .refine((value) => value.status === "ok" || value.error !== undefined, {
      message: "non-ok tool results must include an error",
      path: ["error"]
    })
);
export type AgentToolResult = z.infer<typeof AgentToolResultSchema>;

/**
 * One step in the agent loop. Either a tool call emitted by the LLM or a tool
 * result fed back to it. The full transcript is an alternating sequence.
 */
export const AgentStepSchema = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z
      .object({
        kind: z.literal("tool-call"),
        stepId: StableIdSchema,
        engine: LocalInferenceEngineIdSchema,
        call: AgentToolCallSchema,
        emittedAt: z.string().datetime()
      })
      .strict(),
    z
      .object({
        kind: z.literal("tool-result"),
        stepId: StableIdSchema,
        result: AgentToolResultSchema,
        emittedAt: z.string().datetime()
      })
      .strict(),
    z
      .object({
        kind: z.literal("final"),
        stepId: StableIdSchema,
        message: z.string().min(1),
        bundleId: StableIdSchema.optional(),
        emittedAt: z.string().datetime()
      })
      .strict()
  ])
);
export type AgentStep = z.infer<typeof AgentStepSchema>;

/**
 * Full agent transcript for one local-LLM assemble session. Auditable.
 * Deterministic ordering by `stepId` is enforced via the `superRefine` chain.
 */
export const PlaycraftAgentTranscriptSchema = z.lazy(() =>
  PublicContractBaseSchema.extend({
    kind: z.literal("agent-transcript"),
    engine: LocalInferenceEngineIdSchema,
    engineManifestId: StableIdSchema,
    engineManifestVersion: VersionSchema,
    requestId: StableIdSchema,
    steps: z.array(AgentStepSchema).min(1),
    finished: z.boolean(),
    finishedAt: z.string().datetime().optional()
  })
    .strict()
    .superRefine((value, context) => {
      const ids = new Set<string>();
      for (const step of value.steps) {
        if (ids.has(step.stepId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `agent step ${step.stepId} must be unique`,
            path: ["steps"]
          });
        }
        ids.add(step.stepId);
      }
    })
);
export type PlaycraftAgentTranscript = z.infer<typeof PlaycraftAgentTranscriptSchema>;

export const AGENT_PUBLIC_CONTRACT_NAMES = [
  "LocalInferenceEngineManifestSchema",
  "AgentToolCallSchema",
  "AgentToolResultSchema",
  "AgentStepSchema",
  "PlaycraftAgentTranscriptSchema"
] as const satisfies readonly PublicContractName[];

export type AgentPublicContractName = (typeof AGENT_PUBLIC_CONTRACT_NAMES)[number];