import { z } from "zod";
import {
  CapabilityTagSchema,
  JsonValueSchema,
  PublicContractBaseSchema,
  StableIdSchema,
  VersionSchema,
  type PublicContractName
} from "./base.js";

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
 * A tool call emitted by the local LLM. The agent loop parses the call
 * deterministically; arguments are validated against the tool's
 * `argumentsSchema` at parse time, not at emission time.
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
        engine: z.string().min(1),
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
    engine: z.string().min(1),
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
  "AgentToolCallSchema",
  "AgentToolResultSchema",
  "AgentStepSchema",
  "PlaycraftAgentTranscriptSchema"
] as const satisfies readonly PublicContractName[];

export type AgentPublicContractName = (typeof AGENT_PUBLIC_CONTRACT_NAMES)[number];