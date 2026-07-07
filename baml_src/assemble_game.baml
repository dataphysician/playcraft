// BAML schema for the local LFM2.5-VL-450M-Extract engine driving the
// `AgentLoop`. The engine drives tool calls until it emits a `final` message
// or the loop budget is exhausted. Constraints are typed at the BAML layer:
// the `AssembleGameResponse` discriminated union guarantees the caller
// receives either a `tool-call` envelope or a `final` message.

class AgentMessage {
  role "system" | "user" | "assistant" | "tool"
  content string
  tool_call_id string?
  tool_name string?
}

class AgentToolDescriptor {
  tool_name string
  display_name string
  description string
  arguments_schema string
  capability_tags string[]
}

class AgentToolCall {
  call_id string
  tool_name string
  arguments string
}

class AssembleGameRequest {
  system_prompt string
  messages AgentMessage[]
  tools AgentToolDescriptor[]
  max_steps int
  temperature float
}

class AssembleGameResponse {
  kind "tool-call" | "final"
  message string?
  tool_call AgentToolCall?
}

function AssembleGame(request: AssembleGameRequest) -> AssembleGameResponse {
  client LocalOllamaLfmExtract
  prompt #"
    {{ request.system_prompt }}

    {% for message in request.messages %}
    {{ message.role }}: {{ message.content }}
    {% endfor %}

    {{ ctx.output_format }}
  "#
}
