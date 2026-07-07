import {
  MechanicDefinitionSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  BUNDLED_LOCAL_PROVENANCE,
  type MechanicDefinition
} from "@playcraft/contracts";

export const DEFAULT_DOMAIN_ID = "domain.child-edu";
export const DEFAULT_SAFETY_POLICY_ID = "safety.child-friendly";

const MECHANIC_SCHEMA_VERSION = PLAYCRAFT_SCHEMA_VERSION;

export function mechanic(
  id: string,
  displayName: string,
  capabilityTags: string[],
  supportedModalities: Array<"touch" | "pointer" | "keyboard">,
  consumesEvents: string[],
  emitsEvents: string[]
): MechanicDefinition {
  return {
    schemaVersion: MECHANIC_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "mechanic",
    displayName,
    capabilityTags,
    supportedModalities,
    supportedAgeBands: ["2-3", "4-6", "7-9"],
    supportedDomains: [DEFAULT_DOMAIN_ID],
    consumesEvents,
    emitsEvents,
    requiredAssetContentTypes: [],
    compatibility: {
      domainProfileIds: [DEFAULT_DOMAIN_ID],
      safetyPolicyIds: [DEFAULT_SAFETY_POLICY_ID],
      ageBands: ["2-3", "4-6", "7-9"],
      modalities: supportedModalities,
      requiredCapabilities: capabilityTags,
      assetContentTypes: []
    },
    provenance: BUNDLED_LOCAL_PROVENANCE
  };
}

export const mechanicDefinitions: MechanicDefinition[] = [
  mechanic("mechanic.tap-to-select", "Tap to Select", ["mechanic:tap-to-select", "input:select"], ["touch", "pointer"], [], ["frontend:selected"]),
  mechanic("mechanic.tap-to-reveal", "Tap to Reveal", ["mechanic:tap-to-reveal", "state:reveal"], ["touch", "pointer"], [], ["frontend:revealed"]),
  mechanic("mechanic.match-pairs", "Match Pairs", ["mechanic:match-pairs", "logic:pairing"], ["touch", "pointer"], ["frontend:revealed"], ["rule:pair-matched"]),
  mechanic("mechanic.sort-into-bins", "Sort Into Bins", ["mechanic:sort-into-bins", "logic:category"], ["touch", "pointer"], ["frontend:selected"], ["rule:item-sorted"]),
  mechanic("mechanic.sequence-repeat", "Sequence Repeat", ["mechanic:sequence-repeat", "logic:sequence"], ["touch", "pointer"], ["frontend:selected"], ["rule:sequence-progressed"]),
  mechanic("mechanic.choose-one", "Choose One", ["mechanic:choose-one", "logic:choice"], ["touch", "pointer", "keyboard"], ["frontend:selected"], ["rule:choice-made"]),
  mechanic("mechanic.trace-path", "Trace Path", ["mechanic:trace-path", "input:trace"], ["touch", "pointer"], [], ["rule:path-traced"]),
  mechanic("mechanic.drag-or-tap-move", "Drag or Tap Move", ["mechanic:drag-or-tap-move", "input:move"], ["touch", "pointer"], ["frontend:selected"], ["rule:item-moved"]),
  mechanic("mechanic.hint-prompt", "Hint Prompt", ["mechanic:hint-prompt", "support:hint"], ["touch", "pointer"], ["rule:hint-needed"], ["frontend:hint-shown"]),
  mechanic("mechanic.retry-loop", "Retry Loop", ["mechanic:retry-loop", "support:retry"], ["touch", "pointer"], ["rule:retry-needed"], ["rule:retry-ready"]),
  mechanic("mechanic.timed-celebration", "Timed Celebration", ["mechanic:timed-celebration", "feedback:celebration"], ["touch", "pointer"], ["rule:completed"], ["frontend:celebrated"])
].map((entry) => MechanicDefinitionSchema.parse(entry));

export const memoryMechanicEventBindings: Record<string, Record<string, string>> = {
  "mechanic:tap-to-reveal": { primary: "frontend:revealed" },
  "mechanic:match-pairs": { primary: "rule:pair-matched" },
  "feedback:celebration": { primary: "frontend:celebrated" }
};

export const sortingMechanicEventBindings: Record<string, Record<string, string>> = {
  "mechanic:tap-to-select": { primary: "frontend:selected" },
  "mechanic:sort-into-bins": { primary: "rule:item-sorted" },
  "support:retry": { primary: "rule:retry-ready" },
  "support:hint": { primary: "frontend:hint-shown" }
};

export const sequenceMechanicEventBindings: Record<string, Record<string, string>> = {
  "mechanic:sequence-repeat": { primary: "rule:sequence-progressed" },
  "mechanic:tap-to-select": { primary: "frontend:selected" },
  "feedback:celebration": { primary: "frontend:celebrated" }
};

export const mechanicEventBindings = {
  memory: memoryMechanicEventBindings,
  sorting: sortingMechanicEventBindings,
  sequence: sequenceMechanicEventBindings
} as const;
