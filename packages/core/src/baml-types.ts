/**
 * Hand-maintained mirror of the BAML-generated TypeScript types in
 * `packages/core/baml_client/baml_client/types.ts`. The generated client uses
 * `// @ts-nocheck` and bare relative imports that are not compatible with the
 * project's strict TypeScript at static-import time, so the bridge
 * (`baml-bridge.ts`) loads the generated code via dynamic import while
 * project code consumes only these typed shapes.
 */

export interface BamlAgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string | null;
  tool_name?: string | null;
}

export interface BamlAgentToolDescriptor {
  tool_name: string;
  display_name: string;
  description: string;
  arguments_schema: string;
  capability_tags: string[];
}

export interface BamlAgentToolCall {
  call_id: string;
  tool_name: string;
  arguments: string;
}

export interface BamlAssembleGameRequest {
  system_prompt: string;
  messages: BamlAgentMessage[];
  tools: BamlAgentToolDescriptor[];
  max_steps: number;
  temperature: number;
}

export interface BamlAssembleGameResponse {
  kind: "tool-call" | "final";
  message?: string | null;
  tool_call?: BamlAgentToolCall | null;
}

export interface BamlCapabilityGap {
  missing_capabilities: string[];
  requested_mechanic_ids: string[];
  requested_rule_ids: string[];
  requested_component_ids: string[];
  context: string;
}

export interface BamlPaidOnlineAssemblyRequest {
  capability_gap: BamlCapabilityGap;
  user_consent: true;
  payment_confirmation_id: string;
  context_assembly_request_id: string;
}

export interface BamlPaidOnlineAssemblyResponse {
  bundle_schema_version: string;
  bundle_id: string;
  bundle_version: string;
  bundle_kind: string;
  cost_cents: number;
  estimated_completion_seconds: number;
  remote_url: string;
}

/**
 * The shape of the dynamically imported generated client. Only the function
 * signatures are consumed by project code; everything else stays behind the
 * `// @ts-nocheck` boundary in `baml_client/`.
 */
export interface BamlGeneratedClient {
  AssembleGame(request: BamlAssembleGameRequest): Promise<BamlAssembleGameResponse>;
  PaidOnlineAssembly(request: BamlPaidOnlineAssemblyRequest): Promise<BamlPaidOnlineAssemblyResponse>;
}