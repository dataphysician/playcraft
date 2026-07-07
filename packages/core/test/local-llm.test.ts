import { describe, expect, it, vi } from "vitest";
import {
  MoonshineStreamingCpuEngine,
  buildBamlAssembleGameRequest,
  defaultLocalInferenceEngineManifest,
  interpretBamlResponse,
  type AgentPrompt
} from "@playcraft/core";
import { bamlBridge } from "@playcraft/core";
import type { AgentMessage } from "@playcraft/contracts";
import type { BamlAssembleGameResponse } from "@playcraft/core";

function buildPrompt(userMessage: string): AgentPrompt {
  const messages: AgentMessage[] = [{ role: "user", content: userMessage }];
  return {
    engine: "lfm2.5-vl-450m-extract",
    systemPrompt: "stub system prompt",
    messages,
    availableTools: [
      {
        toolName: "tool:assemble-game",
        displayName: "Assemble Game",
        description: "Assemble a game from text input",
        argumentsSchema: {
          text: { type: "string", required: true }
        },
        capabilityTags: ["game:assemble"]
      }
    ],
    temperature: 0,
    maxSteps: 4
  };
}

describe("MoonshineStreamingCpuEngine", () => {
  it("calls the BAML bridge with a tool-call and surfaces the result", async () => {
    const bridgeSpy = vi.spyOn(bamlBridge, "assembleGame").mockResolvedValue({
      kind: "tool-call",
      tool_call: {
        call_id: "agent-call.baml.1",
        tool_name: "tool:assemble-game",
        arguments: JSON.stringify({ text: "Memory game with dinosaurs" })
      }
    });

    const engine = new MoonshineStreamingCpuEngine();
    const result = await engine.infer(buildPrompt("Memory game with dinosaurs"));

    expect(bridgeSpy).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe("tool-call");
    if (result.kind === "tool-call") {
      expect(result.call.callId).toBe("agent-call.baml.1");
      expect(result.call.toolName).toBe("tool:assemble-game");
      expect(result.call.arguments).toEqual({ text: "Memory game with dinosaurs" });
    }

    bridgeSpy.mockRestore();
  });

  it("returns a final message when the BAML bridge responds with a final result", async () => {
    const bridgeSpy = vi.spyOn(bamlBridge, "assembleGame").mockResolvedValue({
      kind: "final",
      message: "Memory game with dinosaurs ready"
    });

    const engine = new MoonshineStreamingCpuEngine();
    const result = await engine.infer(buildPrompt("/final ready"));

    expect(bridgeSpy).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe("final");
    if (result.kind === "final") {
      expect(result.message).toBe("Memory game with dinosaurs ready");
    }

    bridgeSpy.mockRestore();
  });

  it("returns a bridge-error final message when the bridge throws", async () => {
    const bridgeSpy = vi.spyOn(bamlBridge, "assembleGame").mockRejectedValue(new Error("bridge offline"));

    const engine = new MoonshineStreamingCpuEngine();
    const result = await engine.infer(buildPrompt("anything"));

    expect(bridgeSpy).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe("final");
    if (result.kind === "final") {
      expect(result.message).toMatch(/bridge offline/u);
    }

    bridgeSpy.mockRestore();
  });

  it("uses the wired LFM2.5-VL-450M-Extract engine id", () => {
    const engine = new MoonshineStreamingCpuEngine();
    expect(engine.manifest.engineId).toBe("lfm2.5-vl-450m-extract");
  });
});

describe("defaultLocalInferenceEngineManifest", () => {
  it("returns a manifest stamped with the BAML engine id", () => {
    const manifest = defaultLocalInferenceEngineManifest();
    expect(manifest.engineId).toBe("lfm2.5-vl-450m-extract");
    expect(manifest.offline).toBe(true);
    expect(manifest.localOnly).toBe(true);
    expect(manifest.supportsToolCalls).toBe(true);
    expect(manifest.supportsStructuredJson).toBe(true);
  });
});

describe("buildBamlAssembleGameRequest", () => {
  it("maps AgentMessage and AgentToolDescriptor into the BAML shape", () => {
    const prompt = buildPrompt("memory game");
    const request = buildBamlAssembleGameRequest(prompt);
    expect(request.system_prompt).toBe("stub system prompt");
    expect(request.messages).toHaveLength(1);
    expect(request.messages[0]?.role).toBe("user");
    expect(request.tools).toHaveLength(1);
    expect(request.tools[0]?.tool_name).toBe("tool:assemble-game");
    expect(request.max_steps).toBe(4);
    expect(request.temperature).toBe(0);
  });
});

describe("interpretBamlResponse", () => {
  it("interprets a tool-call response with parsed arguments", () => {
    const response: BamlAssembleGameResponse = {
      kind: "tool-call",
      tool_call: {
        call_id: "agent-call.baml.2",
        tool_name: "tool:assemble-game",
        arguments: JSON.stringify({ text: "Memory game with dinosaurs" })
      }
    };
    const result = interpretBamlResponse(response);
    expect(result.kind).toBe("tool-call");
    if (result.kind === "tool-call") {
      expect(result.call.arguments).toEqual({ text: "Memory game with dinosaurs" });
    }
  });

  it("falls back to an empty argument record when BAML returns malformed JSON", () => {
    const response: BamlAssembleGameResponse = {
      kind: "tool-call",
      tool_call: {
        call_id: "agent-call.baml.bad",
        tool_name: "tool:assemble-game",
        arguments: "not-json"
      }
    };
    const result = interpretBamlResponse(response);
    expect(result.kind).toBe("tool-call");
    if (result.kind === "tool-call") {
      expect(result.call.arguments).toEqual({});
    }
  });

  it("interprets a final response with an empty message", () => {
    const response: BamlAssembleGameResponse = { kind: "final", message: null };
    const result = interpretBamlResponse(response);
    expect(result.kind).toBe("final");
    if (result.kind === "final") {
      expect(result.message).toBe("");
    }
  });
});