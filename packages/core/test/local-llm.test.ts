import { describe, expect, it } from "vitest";
import {
  defaultStubEngineManifest,
  MoonshineStreamingCpuEngine,
  StubLocalInferenceEngine
} from "@playcraft/core";
import type { AgentMessage } from "@playcraft/contracts";
import type { AgentPrompt } from "@playcraft/core";

function buildPrompt(userMessage: string): AgentPrompt {
  const messages: AgentMessage[] = [{ role: "user", content: userMessage }];
  return {
    engine: "stub",
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

describe("StubLocalInferenceEngine", () => {
  it("returns a tool-call when the user message does not start with /final", async () => {
    const engine = new StubLocalInferenceEngine();
    const prompt = buildPrompt("Memory game with dinosaurs");

    const result = await engine.infer(prompt);

    expect(result.kind).toBe("tool-call");
    if (result.kind === "tool-call") {
      expect(result.call.toolName).toBe("tool:assemble-game");
      expect(result.call.arguments).toEqual({ text: "Memory game with dinosaurs" });
      expect(result.call.callId.startsWith("call.")).toBe(true);
    }
  });

  it("returns a final message when the user message starts with /final", async () => {
    const engine = new StubLocalInferenceEngine();
    const prompt = buildPrompt("/final Memory game with dinosaurs ready");

    const result = await engine.infer(prompt);

    expect(result.kind).toBe("final");
    if (result.kind === "final") {
      expect(result.message).toBe("Memory game with dinosaurs ready");
    }
  });

  it("returns a final 'no tools available' message when no tools are provided", async () => {
    const engine = new StubLocalInferenceEngine();
    const prompt = { ...buildPrompt("anything"), availableTools: [] };

    const result = await engine.infer(prompt);

    expect(result.kind).toBe("final");
    if (result.kind === "final") {
      expect(result.message).toBe("no tools available");
    }
  });

  it("uses the default stub manifest when none is provided", () => {
    const engine = new StubLocalInferenceEngine();
    expect(engine.manifest.engineId).toBe("stub");
    expect(engine.manifest.kind).toBe("local-inference-engine");
    expect(engine.manifest.id).toBe("local-inference-engine.stub");
  });

  it("honors a caller-supplied manifest", () => {
    const manifest = defaultStubEngineManifest();
    const engine = new StubLocalInferenceEngine({
      ...manifest,
      displayName: "Custom Stub Engine"
    });
    expect(engine.manifest.displayName).toBe("Custom Stub Engine");
  });

  it("selects the most recent user message when the conversation has multiple turns", async () => {
    const engine = new StubLocalInferenceEngine();
    const prompt: AgentPrompt = {
      ...buildPrompt(""),
      messages: [
        { role: "user", content: "ignored first message" },
        { role: "assistant", content: "" },
        { role: "user", content: "/final final result" }
      ]
    };

    const result = await engine.infer(prompt);

    expect(result.kind).toBe("final");
    if (result.kind === "final") {
      expect(result.message).toBe("final result");
    }
  });
});

describe("MoonshineStreamingCpuEngine", () => {
  it("returns a deterministic 'not yet wired' final message for any prompt", async () => {
    const engine = new MoonshineStreamingCpuEngine();
    const prompt = buildPrompt("Memory game with dinosaurs");

    const result = await engine.infer(prompt);

    expect(result.kind).toBe("final");
    if (result.kind === "final") {
      expect(result.message).toMatch(/runtime not yet wired/u);
    }
  });

  it("uses the wired LFM2.5-VL-450M-Extract engine id", () => {
    const engine = new MoonshineStreamingCpuEngine();
    expect(engine.manifest.engineId).toBe("lfm2.5-vl-450m-extract");
    expect(engine.manifest.kind).toBe("local-inference-engine");
  });
});

describe("defaultStubEngineManifest", () => {
  it("returns a parseable manifest that satisfies the public contract", () => {
    const manifest = defaultStubEngineManifest();
    expect(manifest.engineId).toBe("stub");
    expect(manifest.supportsToolCalls).toBe(true);
    expect(manifest.offline).toBe(true);
    expect(manifest.localOnly).toBe(true);
  });
});
