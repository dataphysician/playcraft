import { z } from "zod";
import { JsonValueSchema, StableIdSchema } from "./base.js";

// base.ts re-exports this module, creating a circular import where base.ts is
// mid-initialization while sse.ts is being loaded. Wrapping the construction
// in z.lazy defers every reference to StableIdSchema / JsonValueSchema until
// the first parse call, by which point base.ts has finished loading. This
// matches the lazy pattern used in workflow.ts and mcp.ts. Inside the callback
// the six private frame schemas resolve to eager ZodObjects, so
// z.discriminatedUnion can read their shape at construction time.

export const SseFrameSchema = z.lazy(() => {
  const SseRunStartedFrameSchema = z
    .object({
      kind: z.literal("sse-run-started"),
      runId: StableIdSchema,
      sequence: z.number().int().nonnegative(),
      payload: z.object({ runId: StableIdSchema }).strict()
    })
    .strict();

  const SseToolCallFrameSchema = z
    .object({
      kind: z.literal("sse-tool-call"),
      runId: StableIdSchema,
      sequence: z.number().int().nonnegative(),
      payload: z
        .object({
          toolName: z.string().min(1),
          args: JsonValueSchema
        })
        .strict()
    })
    .strict();

  const SseToolResultFrameSchema = z
    .object({
      kind: z.literal("sse-tool-result"),
      runId: StableIdSchema,
      sequence: z.number().int().nonnegative(),
      payload: z
        .object({
          toolName: z.string().min(1),
          result: JsonValueSchema
        })
        .strict()
    })
    .strict();

  const SseCustomFrameSchema = z
    .object({
      kind: z.literal("sse-custom"),
      runId: StableIdSchema,
      sequence: z.number().int().nonnegative(),
      payload: JsonValueSchema
    })
    .strict();

  const SseRunFinishedFrameSchema = z
    .object({
      kind: z.literal("sse-run-finished"),
      runId: StableIdSchema,
      sequence: z.number().int().nonnegative(),
      payload: z.object({ runId: StableIdSchema }).strict()
    })
    .strict();

  const SseRunErrorFrameSchema = z
    .object({
      kind: z.literal("sse-run-error"),
      runId: StableIdSchema,
      sequence: z.number().int().nonnegative(),
      payload: z
        .object({
          message: z.string().min(1)
        })
        .strict()
    })
    .strict();

  return z.discriminatedUnion("kind", [
    SseRunStartedFrameSchema,
    SseToolCallFrameSchema,
    SseToolResultFrameSchema,
    SseCustomFrameSchema,
    SseRunFinishedFrameSchema,
    SseRunErrorFrameSchema
  ]);
});
export type SseFrame = z.infer<typeof SseFrameSchema>;
