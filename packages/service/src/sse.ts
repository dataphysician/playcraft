import { SseFrameSchema, type JsonValue, type SseFrame } from "@playcraft/contracts";

// `BuilderAgUiEvent` from `@playcraft/builder` is structurally compatible with
// this interface, so we accept the full AG-UI event stream without pulling
// `@playcraft/ag-ui` in as a direct runtime/type dependency.
export interface AgUiEventLike {
  type: string;
  eventId: string;
  runId: string;
  timestamp: string;
  value: unknown;
}

export function encodeSseFrame(frame: SseFrame): string {
  const validated = SseFrameSchema.parse(frame);
  return `data: ${JSON.stringify(validated)}\n\n`;
}

export function parseSseFrame(raw: string): SseFrame {
  const trimmed = raw.replace(/^\uFEFF/, "");
  const dataSegments: string[] = [];
  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith("data:")) {
      const tail = line.slice("data:".length);
      const payload = tail.startsWith(" ") ? tail.slice(1) : tail;
      dataSegments.push(payload);
    } else if (line.startsWith(":")) {
      continue;
    } else if (line.trim() === "") {
      continue;
    } else {
      throw new Error(`unsupported SSE field: ${line.split(":")[0] ?? line}`);
    }
  }
  if (dataSegments.length === 0) {
    throw new Error("SSE frame missing data: prefix");
  }
  const payload = dataSegments.join("\n");
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid SSE frame JSON: ${message}`);
  }
  return SseFrameSchema.parse(parsed);
}

export function createSseResponse(fetcher: () => AsyncIterable<SseFrame>): Response {
  const encoder = new TextEncoder();
  const iterator = fetcher()[Symbol.asyncIterator]();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await iterator.next();
      if (next.done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(encodeSseFrame(next.value)));
    },
    async cancel(reason) {
      if (typeof iterator.return === "function") {
        await iterator.return(reason);
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "connection": "keep-alive"
    }
  });
}

export function agUiEventToSseFrame(event: AgUiEventLike, sequence: number): SseFrame {
  switch (event.type) {
    case "RunStarted": {
      const value = event.value as { runId: string };
      return {
        kind: "sse-run-started",
        runId: event.runId,
        sequence,
        payload: { runId: value.runId }
      };
    }
    case "RunFinished": {
      const value = event.value as { runId: string };
      return {
        kind: "sse-run-finished",
        runId: event.runId,
        sequence,
        payload: { runId: value.runId }
      };
    }
    case "RunError": {
      const value = event.value as { message: string };
      return {
        kind: "sse-run-error",
        runId: event.runId,
        sequence,
        payload: { message: value.message }
      };
    }
    case "ToolCall": {
      const value = event.value as { toolName: string; args: JsonValue };
      return {
        kind: "sse-tool-call",
        runId: event.runId,
        sequence,
        payload: {
          toolName: value.toolName,
          args: value.args
        }
      };
    }
    case "ToolResult": {
      const value = event.value as { toolName: string; result: JsonValue };
      return {
        kind: "sse-tool-result",
        runId: event.runId,
        sequence,
        payload: {
          toolName: value.toolName,
          result: value.result
        }
      };
    }
    case "Custom": {
      const value = event.value as JsonValue;
      return {
        kind: "sse-custom",
        runId: event.runId,
        sequence,
        payload: value
      };
    }
    default: {
      const envelope: JsonValue = {
        type: event.type,
        eventId: event.eventId,
        runId: event.runId,
        timestamp: event.timestamp,
        value: event.value as JsonValue
      };
      return {
        kind: "sse-custom",
        runId: event.runId,
        sequence,
        payload: envelope
      };
    }
  }
}