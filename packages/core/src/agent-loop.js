import { AgentStepSchema, PLAYCRAFT_SCHEMA_VERSION, StableIdSchema } from "@playcraft/contracts";
/**
 * The deterministic agent loop. Drives the local LLM through tool calls until
 * the engine emits a `final` result or the step budget is exhausted.
 *
 * Invariants:
 *   - The engine never sees raw tool output; only `ok`/`error`/`unsupported`
 *     status plus a JSON-serializable value or string error.
 *   - Tool execution is synchronous from the engine's perspective: the engine
 *     receives one assistant message per tool call, with a matching
 *     tool message carrying the result.
 *   - The transcript is append-only; the loop never rewinds.
 *   - Tools never call the engine directly; tools return values, the loop
 *     emits the next inference step.
 */
export class AgentLoop {
    engine;
    systemPrompt;
    toolsByName;
    maxSteps;
    temperature;
    constructor(options) {
        this.engine = options.engine;
        this.systemPrompt = options.systemPrompt;
        this.toolsByName = new Map(options.tools.map((tool) => [tool.toolName, tool]));
        this.maxSteps = options.maxSteps ?? 16;
        this.temperature = options.temperature ?? 0;
    }
    async run(requestId, userMessage) {
        const steps = [];
        const messages = [{ role: "user", content: userMessage }];
        let finished = false;
        let finalMessage = null;
        for (let stepCount = 0; stepCount < this.maxSteps; stepCount += 1) {
            const result = await this.engine.infer(this.buildPrompt(messages));
            if (result.kind === "final") {
                const step = {
                    kind: "final",
                    stepId: `step.${requestId}.${stepCount}.final`,
                    message: result.message,
                    bundleId: result.bundleId,
                    emittedAt: new Date().toISOString()
                };
                steps.push(AgentStepSchema.parse(step));
                finished = true;
                finalMessage = result.message;
                break;
            }
            const call = result.call;
            const stepId = `step.${requestId}.${stepCount}.call`;
            steps.push(AgentStepSchema.parse({
                kind: "tool-call",
                stepId,
                engine: this.engine.manifest.engineId,
                call,
                emittedAt: new Date().toISOString()
            }));
            messages.push({ role: "assistant", content: JSON.stringify(call), toolCallId: call.callId, toolName: call.toolName });
            const toolResult = await this.executeTool(call.toolName, call.arguments, {
                requestId,
                stepCount
            });
            steps.push(AgentStepSchema.parse({
                kind: "tool-result",
                stepId: `step.${requestId}.${stepCount}.result`,
                result: toolResult,
                emittedAt: new Date().toISOString()
            }));
            messages.push({
                role: "tool",
                content: JSON.stringify(toolResult),
                toolCallId: toolResult.callId,
                toolName: toolResult.toolName
            });
        }
        const transcript = {
            schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
            id: `agent-transcript.${requestId}`,
            version: "1.0.0",
            kind: "agent-transcript",
            engine: this.engine.manifest.engineId,
            engineManifestId: this.engine.manifest.id,
            engineManifestVersion: this.engine.manifest.version,
            requestId,
            steps,
            finished,
            ...(finished ? { finishedAt: new Date().toISOString() } : {})
        };
        return { transcript, finished, finalMessage };
    }
    buildPrompt(messages) {
        return {
            engine: this.engine.manifest.engineId,
            systemPrompt: this.systemPrompt,
            messages,
            availableTools: [...this.toolsByName.values()].map((tool) => describeTool(tool.toolName, this.toolsByName.get(tool.toolName))),
            temperature: this.temperature,
            maxSteps: this.maxSteps
        };
    }
    async executeTool(toolName, arguments_, context) {
        const executor = this.toolsByName.get(toolName);
        if (!executor) {
            return {
                callId: StableIdSchema.parse(`unsupported.${Date.now().toString(36)}`),
                toolName,
                status: "unsupported",
                error: `tool ${toolName} is not registered with this agent loop`
            };
        }
        try {
            const value = await executor.execute(arguments_, context);
            return {
                callId: StableIdSchema.parse(`result.${Date.now().toString(36)}`),
                toolName,
                status: "ok",
                value: value
            };
        }
        catch (error) {
            return {
                callId: StableIdSchema.parse(`error.${Date.now().toString(36)}`),
                toolName,
                status: "error",
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
function describeTool(toolName, executor) {
    const registered = executor.descriptor;
    if (registered)
        return registered;
    return {
        toolName,
        displayName: toolName,
        description: `${toolName} tool`,
        argumentsSchema: {},
        capabilityTags: []
    };
}
export function agentLoopToolsFromBuilderDefinitions(definitions) {
    return definitions.map((definition) => ({
        toolName: definition.toolName,
        displayName: definition.displayName,
        description: definition.description,
        argumentsSchema: argumentsSchemaFromJsonObjectDescriptor(definition.argumentsSchema),
        capabilityTags: definition.emittedEvents
    }));
}
function argumentsSchemaFromJsonObjectDescriptor(descriptor) {
    const out = {};
    for (const [name, field] of Object.entries(descriptor.fields)) {
        out[name] = {
            type: field.type,
            required: field.required ?? true,
            ...(field.allowedValues ? { allowedValues: field.allowedValues } : {}),
            ...(field.fields ? { fields: fieldsToRecord(field.fields) } : {})
        };
    }
    return out;
}
function fieldsToRecord(fields) {
    const out = {};
    for (const [name, field] of Object.entries(fields)) {
        out[name] = {
            type: field.type,
            required: field.required ?? true,
            ...(field.allowedValues ? { allowedValues: field.allowedValues } : {}),
            ...(field.fields ? { fields: fieldsToRecord(field.fields) } : {})
        };
    }
    return out;
}
//# sourceMappingURL=agent-loop.js.map