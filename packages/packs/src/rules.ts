import {
  BUNDLED_LOCAL_PROVENANCE,
  PLAYCRAFT_SCHEMA_VERSION,
  RuleModuleDefinitionSchema,
  type RuleModuleDefinition
} from "@playcraft/contracts";
import { DEFAULT_DOMAIN_ID, DEFAULT_SAFETY_POLICY_ID } from "./mechanics.js";

export function rule(
  id: string,
  category: string,
  displayName: string,
  capabilityTags: string[],
  supportedMechanicIds: string[],
  consumesEvents: string[],
  emitsEvents: string[]
): RuleModuleDefinition {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "rule-module",
    category,
    displayName,
    capabilityTags,
    supportedMechanicIds,
    consumesEvents,
    emitsEvents,
    defaultSource: "manifest",
    compatibility: {
      domainProfileIds: [DEFAULT_DOMAIN_ID],
      safetyPolicyIds: [DEFAULT_SAFETY_POLICY_ID],
      ageBands: ["2-3", "4-6", "7-9"],
      modalities: ["touch", "pointer"],
      requiredCapabilities: capabilityTags,
      assetContentTypes: []
    },
    provenance: BUNDLED_LOCAL_PROVENANCE
  };
}

export const ruleModuleDefinitions: RuleModuleDefinition[] = [
  rule("rule.pair-match", "pair-matching", "Pair Matching", ["rule:pair-match"], ["mechanic.match-pairs"], ["frontend:revealed"], ["rule:pair-matched"]),
  rule("rule.category-validation", "category-validation", "Category Validation", ["rule:category-validation"], ["mechanic.sort-into-bins"], ["rule:item-sorted"], ["rule:category-validated"]),
  rule("rule.sequence-progression", "progression", "Sequence Progression", ["rule:progression"], ["mechanic.sequence-repeat"], ["frontend:selected"], ["rule:sequence-progressed"]),
  rule("rule.guided-retry", "retry", "Guided Retry", ["rule:guided-retry"], ["mechanic.retry-loop", "mechanic.sort-into-bins", "mechanic.match-pairs"], ["rule:retry-needed"], ["rule:retry-ready"]),
  rule("rule.hint-timing", "hint", "Hint Timing", ["rule:hint-timing"], ["mechanic.hint-prompt", "mechanic.match-pairs", "mechanic.sequence-repeat"], ["rule:hint-needed"], ["frontend:hint-shown"]),
  rule("rule.completion", "completion", "Completion", ["rule:completion"], ["mechanic.match-pairs", "mechanic.sort-into-bins", "mechanic.sequence-repeat"], ["rule:pair-matched", "rule:category-validated", "rule:sequence-progressed"], ["rule:completed"]),
  rule("rule.attempt-feedback", "attempt-feedback", "Attempt Feedback", ["rule:attempt-feedback"], ["mechanic.sequence-repeat", "mechanic.choose-one"], ["frontend:selected"], ["rule:attempt-reviewed"]),
  rule("rule.session-bounds", "session-bounds", "Session Bounds", ["rule:session-bounds"], ["mechanic.retry-loop", "mechanic.hint-prompt"], ["rule:attempt-reviewed"], ["rule:session-checked"]),
  rule("rule.safety-content-block", "safety", "Safety Content Blocking", ["rule:safety-content-block"], ["mechanic.choose-one"], ["frontend:selected"], ["rule:safety-checked"])
].map((entry) => RuleModuleDefinitionSchema.parse(entry));
