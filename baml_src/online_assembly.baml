// BAML schema for the user-triggered paid online assembly. This is NOT
// invoked by the local agent loop. It is only called when the user
// explicitly clicks "Request Paid Online Assembly" in the studio UI, after
// consenting to the cost and ETA. The `user_consent: true` literal in the
// request and the `cost_cents` / `estimated_completion_seconds` in the
// response make the paid action explicit and auditable.

class CapabilityGap {
  missing_capabilities string[]
  requested_mechanic_ids string[]
  requested_rule_ids string[]
  requested_component_ids string[]
  context string
}

class PaidOnlineAssemblyRequest {
  capability_gap CapabilityGap
  user_consent true
  payment_confirmation_id string
  context_assembly_request_id string
}

class PaidOnlineAssemblyResponse {
  bundle_schema_version string
  bundle_id string
  bundle_version string
  bundle_kind string
  cost_cents int
  estimated_completion_seconds int
  remote_url string
}

function PaidOnlineAssembly(request: PaidOnlineAssemblyRequest) -> PaidOnlineAssemblyResponse {
  client PaidOpenRouterLfm
  prompt #"
    {{ request.capability_gap }}

    {{ request.context_assembly_request_id }}

    {{ ctx.output_format }}
  "#
}
