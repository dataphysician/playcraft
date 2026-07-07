import { z } from "zod";
import { AgentMessageRoleSchema, AgentStepSchema, LocalInferenceEngineManifestSchema, MOONSHINE_STREAMING_CPU_ENGINE_ID } from "@playcraft/contracts";
/**
 * Stub implementation for tests and offline development. Returns a
 * deterministic tool call or final message based on the first user message.
 */
export class StubLocalInferenceEngine {
    manifest;
    constructor(manifest) {
        this.manifest = manifest ?? defaultStubEngineManifest();
    }
    async infer(prompt) {
        const lastUser = [...prompt.messages].reverse().find((message) => message.role === "user");
        const text = lastUser?.content ?? "";
        if (text.startsWith("/final ")) {
            return { kind: "final", message: text.slice("/final ".length) };
        }
        const toolName = prompt.availableTools[0]?.toolName;
        if (!toolName) {
            return { kind: "final", message: "no tools available" };
        }
        return {
            kind: "tool-call",
            call: {
                callId: `call.${Date.now().toString(36)}`,
                toolName,
                arguments: { text }
            }
        };
    }
}
export function defaultStubEngineManifest() {
    return LocalInferenceEngineManifestSchema.parse({
        schemaVersion: "playcraft.v1",
        id: "local-inference-engine.stub",
        version: "1.0.0",
        kind: "local-inference-engine",
        engineId: "stub",
        displayName: "Stub Local Inference Engine (tests)",
        capabilityTags: ["llm:local", "llm:stub"],
        offline: true,
        localOnly: true,
        maxContextTokens: 4096,
        supportsStructuredJson: true,
        supportsImageInput: false,
        supportsToolCalls: true,
        outboxModule: "@playcraft/core/local-llm.js"
    });
}
export const AGENT_STUB_ENGINE_ID = "stub";
/**
 * The wired production engine. Currently a stub that returns a deterministic
 * tool call. Real Moonshine Streaming CPU wiring with LFM2.5-VL-450M-Extract
 * will replace the `infer` implementation when the runtime is available.
 */
export class MoonshineStreamingCpuEngine {
    manifest;
    constructor(manifest) {
        this.manifest = manifest ?? defaultMoonshineStreamingCpuEngineManifest();
    }
    async infer(_prompt) {
        return {
            kind: "final",
            message: `${MOONSHINE_STREAMING_CPU_ENGINE_ID} runtime not yet wired; use StubLocalInferenceEngine for development`
        };
    }
}
export function defaultMoonshineStreamingCpuEngineManifest() {
    return LocalInferenceEngineManifestSchema.parse({
        schemaVersion: "playcraft.v1",
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
/**
 * Build the Outlines-compatible JSON schema descriptor for a tool's arguments.
 * Outlines uses this to constrain generation so the engine can only emit
 * argument values that validate against the tool's `argumentsSchema`.
 */
export function outlinesJsonSchemaForToolArguments(schema) {
    const properties = {};
    const required = [];
    for (const [name, field] of Object.entries(schema)) {
        properties[name] = outlinesJsonSchemaForField(field);
        if (field.required)
            required.push(name);
    }
    return {
        type: "object",
        additionalProperties: false,
        properties,
        required
    };
}
function outlinesJsonSchemaForField(field) {
    const base = {};
    switch (field.type) {
        case "string":
            base.type = "string";
            break;
        case "number":
            base.type = "number";
            break;
        case "boolean":
            base.type = "boolean";
            break;
        case "array":
            base.type = "array";
            base.items = { type: "string" };
            break;
        case "record":
            base.type = "object";
            base.additionalProperties = true;
            break;
        case "object":
            base.type = "object";
            base.additionalProperties = false;
            if (field.fields) {
                const subProperties = {};
                const subRequired = [];
                for (const [subName, subField] of Object.entries(field.fields)) {
                    subProperties[subName] = outlinesJsonSchemaForField(subField);
                    if (subField.required)
                        subRequired.push(subName);
                }
                base.properties = subProperties;
                if (subRequired.length > 0)
                    base.required = subRequired;
            }
            break;
    }
    if (field.allowedValues && field.allowedValues.length > 0) {
        base.enum = field.allowedValues;
    }
    return base;
}
/**
 * Re-export the schemas for convenience.
 */
export { AgentMessageRoleSchema, AgentStepSchema };
export { z };
//# sourceMappingURL=local-llm.js.map