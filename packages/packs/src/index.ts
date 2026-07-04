import React from "react";
import {
  createStubAssetProviderManifest,
  DeterministicStubAssetProvider,
  STUB_ASSET_PROVIDER_ID
} from "@playcraft/assets";
import {
  AssemblyValidationResultSchema,
  AssetGenerationRequestSchema,
  ComponentManifestSchema,
  DomainProfileSchema,
  FrontendToolDefinitionSchema,
  GameAssemblyProfileSchema,
  GameTemplateDefinitionSchema,
  MechanicDefinitionSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  PackManifestSchema,
  RuleModuleDefinitionSchema,
  SafetyPolicyPackSchema,
  ThemePackSchema,
  type AssetGenerationRequest,
  type ComponentManifest,
  type DomainProfile,
  type FrontendToolDefinition,
  type GameAssemblyProfile,
  type GameTemplateDefinition,
  type GeneratedAssetRecord,
  type JsonValue,
  type MechanicDefinition,
  type PlaycraftAssemblyRequest,
  type RuleModuleDefinition,
  type SafetyPolicyPack,
  type ThemePack
} from "@playcraft/contracts";
import {
  DeterministicAssemblyPlanner,
  createEmptyRegistries,
  createPlaycraftEvent,
  validateGameAssemblyProfile,
  type AssemblyRecipe,
  type AssemblyRecipeBuildContext,
  type PlaycraftRegistries
} from "@playcraft/core";
import {
  TrustedComponentRegistry,
  type TrustedComponentRuntimeProps,
  type TrustedReactComponent
} from "@playcraft/renderer";

export const DEFAULT_DOMAIN_ID = "domain.child-edu";
export const DEFAULT_SAFETY_POLICY_ID = "safety.child-friendly";
export const DEFAULT_THEME_ID = "theme.bright-calm";
export const DEFAULT_PLANNER_ID = "planner.deterministic.mvp";
export const DEFAULT_PACK_VERSION = "1.0.0";

const textField = { type: "string", required: true } as const;
const optionalTextField = { type: "string", required: false } as const;
const numberField = { type: "number", required: true } as const;
const arrayField = { type: "array", required: true, minItems: 1 } as const;

const selectItemTool = tool("tool.select-item", "tool:select-item", {
  itemId: textField
});
const revealCardTool = tool("tool.reveal-card", "tool:reveal-card", {
  cardId: textField
});
const moveItemTool = tool("tool.move-item", "tool:move-item", {
  itemId: textField,
  targetId: textField
});
const repeatSequenceTool = tool("tool.repeat-sequence", "tool:repeat-sequence", {
  sequence: arrayField
});

export const mechanicDefinitions: MechanicDefinition[] = [
  mechanic("mechanic.tap-to-select", "Tap to Select", ["mechanic:tap-to-select", "input:select"], ["touch", "pointer"], [], ["frontend:selected"]),
  mechanic("mechanic.tap-to-reveal", "Tap to Reveal", ["mechanic:tap-to-reveal", "state:reveal"], ["touch", "pointer"], [], ["frontend:revealed"]),
  mechanic("mechanic.match-pairs", "Match Pairs", ["mechanic:match-pairs", "logic:pairing"], ["touch", "pointer"], ["frontend:revealed"], ["rule:pair-matched"]),
  mechanic("mechanic.sort-into-bins", "Sort Into Bins", ["mechanic:sort-into-bins", "logic:category"], ["touch", "pointer"], ["frontend:selected"], ["rule:item-sorted"]),
  mechanic("mechanic.sequence-repeat", "Sequence Repeat", ["mechanic:sequence-repeat", "logic:sequence"], ["touch", "pointer", "audio"], ["frontend:selected"], ["rule:sequence-progressed"]),
  mechanic("mechanic.choose-one", "Choose One", ["mechanic:choose-one", "logic:choice"], ["touch", "pointer", "keyboard"], ["frontend:selected"], ["rule:choice-made"]),
  mechanic("mechanic.trace-path", "Trace Path", ["mechanic:trace-path", "input:trace"], ["touch", "pointer"], [], ["rule:path-traced"]),
  mechanic("mechanic.drag-or-tap-move", "Drag or Tap Move", ["mechanic:drag-or-tap-move", "input:move"], ["touch", "pointer"], ["frontend:selected"], ["rule:item-moved"]),
  mechanic("mechanic.audio-prompt-response", "Audio Prompt Response", ["mechanic:audio-prompt-response", "audio:prompt"], ["audio", "voice", "touch"], ["audio:prompted"], ["rule:audio-response"]),
  mechanic("mechanic.call-and-response", "Call and Response", ["mechanic:call-and-response", "audio:response"], ["audio", "voice"], ["audio:prompted"], ["rule:call-response"]),
  mechanic("mechanic.sound-matching", "Sound Matching", ["mechanic:sound-matching", "audio:matching"], ["audio", "touch"], ["audio:prompted"], ["rule:sound-matched"]),
  mechanic("mechanic.pronunciation-attempt", "Pronunciation Attempt", ["mechanic:pronunciation-attempt", "voice:attempt"], ["voice"], ["audio:prompted"], ["rule:pronunciation-attempted"]),
  mechanic("mechanic.hint-prompt", "Hint Prompt", ["mechanic:hint-prompt", "support:hint"], ["touch", "pointer", "audio"], ["rule:hint-needed"], ["frontend:hint-shown"]),
  mechanic("mechanic.retry-loop", "Retry Loop", ["mechanic:retry-loop", "support:retry"], ["touch", "pointer"], ["rule:retry-needed"], ["rule:retry-ready"]),
  mechanic("mechanic.timed-celebration", "Timed Celebration", ["mechanic:timed-celebration", "feedback:celebration"], ["touch", "pointer", "audio"], ["rule:completed"], ["frontend:celebrated"])
].map((entry) => MechanicDefinitionSchema.parse(entry));

export const ruleModuleDefinitions: RuleModuleDefinition[] = [
  rule("rule.pair-match", "pair-matching", "Pair Matching", ["rule:pair-match"], ["mechanic.match-pairs"], ["frontend:revealed"], ["rule:pair-matched"]),
  rule("rule.category-validation", "category-validation", "Category Validation", ["rule:category-validation"], ["mechanic.sort-into-bins"], ["rule:item-sorted"], ["rule:category-validated"]),
  rule("rule.sequence-progression", "progression", "Sequence Progression", ["rule:progression"], ["mechanic.sequence-repeat"], ["frontend:selected"], ["rule:sequence-progressed"]),
  rule("rule.guided-retry", "retry", "Guided Retry", ["rule:guided-retry"], ["mechanic.retry-loop", "mechanic.sort-into-bins", "mechanic.match-pairs"], ["rule:retry-needed"], ["rule:retry-ready"]),
  rule("rule.hint-timing", "hint", "Hint Timing", ["rule:hint-timing"], ["mechanic.hint-prompt", "mechanic.match-pairs", "mechanic.sequence-repeat"], ["rule:hint-needed"], ["frontend:hint-shown"]),
  rule("rule.completion", "completion", "Completion", ["rule:completion"], ["mechanic.match-pairs", "mechanic.sort-into-bins", "mechanic.sequence-repeat"], ["rule:pair-matched", "rule:category-validated", "rule:sequence-progressed"], ["rule:completed"]),
  rule("rule.attempt-feedback", "attempt-feedback", "Attempt Feedback", ["rule:attempt-feedback"], ["mechanic.sequence-repeat", "mechanic.choose-one"], ["frontend:selected"], ["rule:attempt-reviewed"]),
  rule("rule.session-bounds", "session-bounds", "Session Bounds", ["rule:session-bounds"], ["mechanic.retry-loop", "mechanic.hint-prompt"], ["rule:attempt-reviewed"], ["rule:session-checked"]),
  rule("rule.safety-content-block", "safety", "Safety Content Blocking", ["rule:safety-content-block"], ["mechanic.choose-one", "mechanic.audio-prompt-response"], ["frontend:selected"], ["rule:safety-checked"])
].map((entry) => RuleModuleDefinitionSchema.parse(entry));

export const componentManifests: ComponentManifest[] = [
  component("component.choice-grid", "ChoiceGrid", "component:choice-grid", ["mechanic.tap-to-select", "mechanic.choose-one"], [selectItemTool], { title: textField, items: arrayField, prompt: optionalTextField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.reveal-card-grid", "RevealCardGrid", "component:reveal-card-grid", ["mechanic.tap-to-reveal", "mechanic.match-pairs"], [revealCardTool], { title: textField, cards: arrayField, columns: numberField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.pair-match-board", "PairMatchBoard", "component:pair-match-board", ["mechanic.match-pairs"], [selectItemTool], { title: textField, pairs: arrayField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.sort-bins", "SortBins", "component:sort-bins", ["mechanic.sort-into-bins"], [moveItemTool], { title: textField, items: arrayField, bins: arrayField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.sequence-pad", "SequencePad", "component:sequence-pad", ["mechanic.sequence-repeat", "mechanic.tap-to-select"], [repeatSequenceTool], { title: textField, sequence: arrayField, prompt: optionalTextField }, [{ binding: "illustration", contentTypes: ["image"], required: true }]),
  component("component.audio-prompt-panel", "AudioPromptPanel", "component:audio-prompt-panel", ["mechanic.audio-prompt-response", "mechanic.call-and-response"], [selectItemTool], { title: textField, prompt: textField }, []),
  component("component.trace-canvas", "TraceCanvas", "component:trace-canvas", ["mechanic.trace-path"], [moveItemTool], { title: textField, path: arrayField }, []),
  component("component.celebration-overlay", "CelebrationOverlay", "component:celebration-overlay", ["mechanic.timed-celebration"], [], { message: textField }, []),
  component("component.hint-bubble", "HintBubble", "component:hint-bubble", ["mechanic.hint-prompt"], [], { hint: textField }, [])
].map((entry) => ComponentManifestSchema.parse(entry));

export const themePacks: ThemePack[] = [
  ThemePackSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: DEFAULT_THEME_ID,
    version: "1.0.0",
    kind: "theme",
    displayName: "Bright Calm",
    capabilityTags: ["theme:calm", "theme:high-readability"],
    supportedDomains: [DEFAULT_DOMAIN_ID],
    supportedAgeBands: ["2-3", "4-6", "7-9"],
    visualStyle: "visual:bright-calm",
    audioStyle: "audio:quiet",
    accessibility: {
      highContrast: true,
      reducedMotion: true,
      readableText: true
    },
    allowedContentTags: ["content:child-friendly", "content:educational"],
    assetPromptConstraints: ["Use simple friendly shapes.", "Avoid scary, punitive, or competitive imagery."]
  })
];

export const safetyPolicyPacks: SafetyPolicyPack[] = [
  SafetyPolicyPackSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: DEFAULT_SAFETY_POLICY_ID,
    version: "1.0.0",
    kind: "safety-policy",
    displayName: "Child-Friendly Local Safety",
    supportedDomains: [DEFAULT_DOMAIN_ID],
    ageBands: ["2-3", "4-6", "7-9"],
    rules: [
      { ruleId: "safety.no-generated-code", description: "Play surfaces must use trusted registered components.", severity: "error", capabilityTags: ["safety:trusted-components"] },
      { ruleId: "safety.no-private-child-data", description: "Saved profiles must not contain private child data.", severity: "error", capabilityTags: ["safety:privacy"] },
      { ruleId: "safety.no-punitive-failure", description: "Failure states use retry and hints, not punishment.", severity: "error", capabilityTags: ["safety:nonpunitive"] },
      { ruleId: "safety.voice-gated", description: "Voice capture requires explicit domain policy.", severity: "warning", capabilityTags: ["safety:voice"] }
    ],
    privacy: {
      allowPrivateChildData: false,
      allowVoiceCapture: false,
      allowExternalNetwork: false
    },
    contentRules: {
      noPunitiveFailures: true,
      quietModeAvailable: true,
      maxSessionMinutes: 10
    }
  })
];

export const domainProfiles: DomainProfile[] = [
  DomainProfileSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: DEFAULT_DOMAIN_ID,
    version: "1.0.0",
    kind: "domain-profile",
    displayName: "Child-Friendly Educational Mini Games",
    capabilityTags: ["domain:education", "domain:child-friendly"],
    defaultSafetyPolicyId: DEFAULT_SAFETY_POLICY_ID,
    allowedMechanicIds: mechanicDefinitions.map((entry) => entry.id),
    allowedRuleIds: ruleModuleDefinitions.map((entry) => entry.id),
    allowedComponentIds: componentManifests.map((entry) => entry.id),
    allowedThemeIds: themePacks.map((entry) => entry.id),
    allowedAssetProviderIds: [STUB_ASSET_PROVIDER_ID],
    ageBands: ["2-3", "4-6", "7-9"],
    modalities: ["touch", "pointer", "audio"],
    defaults: {
      feedbackTone: "gentle",
      progressMode: "noncompetitive"
    }
  })
];

export const assetProviderManifests = [createStubAssetProviderManifest()];

export const packManifests = [
  packManifest("pack.mechanics.mvp", "mechanic-pack", mechanicDefinitions.flatMap((entry) => entry.capabilityTags), ["MechanicDefinitionSchema"]),
  packManifest("pack.rules.mvp", "rule-pack", ruleModuleDefinitions.flatMap((entry) => entry.capabilityTags), ["RuleModuleDefinitionSchema"]),
  packManifest("pack.components.mvp", "component-pack", componentManifests.map((entry) => entry.renderCapability), ["ComponentManifestSchema"]),
  packManifest("pack.themes.mvp", "theme-pack", themePacks.flatMap((entry) => entry.capabilityTags), ["ThemePackSchema"]),
  packManifest("pack.asset-providers.mvp", "asset-provider-pack", assetProviderManifests.flatMap((entry) => entry.capabilityTags), ["AssetProviderCapabilityManifestSchema"]),
  packManifest("pack.domains.mvp", "domain-profile-pack", domainProfiles.flatMap((entry) => entry.capabilityTags), ["DomainProfileSchema"]),
  packManifest("pack.safety.mvp", "safety-policy-pack", safetyPolicyPacks.flatMap((entry) => entry.rules.flatMap((ruleEntry) => ruleEntry.capabilityTags)), ["SafetyPolicyPackSchema"])
].map((entry) => PackManifestSchema.parse(entry));

export const mvpAssemblyRequests: PlaycraftAssemblyRequest[] = [
  request("request.memory-match.mvp", "Animal memory match", ["game:memory-match", "mechanic:match-pairs"], "seed-memory-match"),
  request("request.sorting.mvp", "Sort shapes by color", ["game:sorting", "mechanic:sort-into-bins"], "seed-sorting"),
  request("request.sequence-repeat.mvp", "Repeat a friendly light pattern", ["game:sequence-repeat", "mechanic:sequence-repeat"], "seed-sequence-repeat")
];

const mvpTemplates: MvpProfileTemplate[] = [
  {
    id: "template.memory-match",
    description: "A toddler-safe card reveal game that asks the player to find visual pairs.",
    capabilityTags: ["game:memory-match", "mechanic:match-pairs"],
    requestAliases: ["memory", "memory game", "memory match", "matching cards", "card pairs", "pair match"],
    profileId: "profile.memory-match.mvp",
    profileName: "Memory Match MVP",
    assetPrompt: "friendly animal cards for a child-safe memory match game",
    mechanicCapabilities: ["mechanic:tap-to-reveal", "mechanic:match-pairs", "feedback:celebration"],
    ruleCategories: ["pair-matching", "retry", "hint", "completion"],
    componentCapabilities: ["component:reveal-card-grid", "component:celebration-overlay"],
    propsByCapability: {
      "component:reveal-card-grid": { title: "Animal pairs", cards: ["cat-a", "cat-b", "sun-a", "sun-b"], columns: 2 },
      "component:celebration-overlay": { message: "You found every pair." }
    }
  },
  {
    id: "template.sorting",
    description: "A toddler-safe categorization game that asks the player to move items into matching bins.",
    capabilityTags: ["game:sorting", "mechanic:sort-into-bins"],
    requestAliases: ["sort", "sorting", "sorting game", "category", "categories", "color bins", "group by color"],
    profileId: "profile.sorting.mvp",
    profileName: "Sorting MVP",
    assetPrompt: "simple colorful shapes for a child-safe sorting game",
    mechanicCapabilities: ["mechanic:tap-to-select", "mechanic:sort-into-bins", "support:retry", "support:hint"],
    ruleCategories: ["category-validation", "retry", "completion"],
    componentCapabilities: ["component:choice-grid", "component:sort-bins", "component:hint-bubble"],
    propsByCapability: {
      "component:choice-grid": { title: "Choose a shape", prompt: "Pick one shape to sort.", items: ["red circle", "blue square", "red triangle"] },
      "component:sort-bins": { title: "Color bins", items: ["red circle", "blue square", "red triangle"], bins: ["red", "blue"] },
      "component:hint-bubble": { hint: "Look at the color first." }
    }
  },
  {
    id: "template.sequence-repeat",
    description: "A toddler-safe pattern game that asks the player to repeat a short sequence.",
    capabilityTags: ["game:sequence-repeat", "mechanic:sequence-repeat"],
    requestAliases: ["sequence", "sequence repeat", "pattern", "repeat", "repeat pattern", "copy the pattern"],
    profileId: "profile.sequence-repeat.mvp",
    profileName: "Sequence Repeat MVP",
    assetPrompt: "soft glowing buttons for a child-safe sequence repeat game",
    mechanicCapabilities: ["mechanic:sequence-repeat", "mechanic:tap-to-select", "feedback:celebration"],
    ruleCategories: ["progression", "attempt-feedback", "hint"],
    componentCapabilities: ["component:sequence-pad", "component:choice-grid", "component:celebration-overlay"],
    propsByCapability: {
      "component:sequence-pad": { title: "Repeat the lights", prompt: "Tap the buttons in the same order.", sequence: ["green", "yellow", "green"] },
      "component:choice-grid": { title: "Light buttons", prompt: "Choose the next light.", items: ["green", "yellow", "blue"] },
      "component:celebration-overlay": { message: "Sequence complete." }
    }
  }
];

export const gameTemplateDefinitions: GameTemplateDefinition[] = mvpTemplates.map((template, index) =>
  GameTemplateDefinitionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: template.id,
    version: "1.0.0",
    kind: "game-template",
    displayName: template.profileName,
    description: template.description,
    capabilityTags: template.capabilityTags,
    requestAliases: template.requestAliases,
    assemblyRequestId: mvpAssemblyRequests[index].id,
    profileId: template.profileId,
    supportedAgeBands: ["2-3", "4-6", "7-9"],
    supportedModalities: ["touch", "pointer", "voice"],
    requiredMechanicIds: template.mechanicCapabilities.map((capability) => findMechanicByCapability(capability).id),
    requiredRuleIds: template.ruleCategories.map((category) => findRuleByCategory(category).id),
    requiredComponentIds: template.componentCapabilities.map((capability) => findComponentByCapability(capability).id),
    defaultAssetContentTypes: ["image"],
    localFirst: true,
    retrieval: {
      current: "bundled-local",
      planned: "server-catalog"
    }
  })
);

export const mvpAssemblyRecipes: AssemblyRecipe[] = mvpTemplates.map((template) => ({
  id: template.id,
  version: "1.0.0",
  capabilityTags: template.capabilityTags,
  build: (context) => buildProfileFromTemplate(template, context)
}));

export function createDefaultRegistries(): PlaycraftRegistries {
  const registries = createEmptyRegistries();
  registries.mechanics.registerMany(mechanicDefinitions);
  registries.rules.registerMany(ruleModuleDefinitions);
  registries.components.registerMany(componentManifests);
  registries.themes.registerMany(themePacks);
  registries.assetProviders.registerMany(assetProviderManifests);
  registries.domains.registerMany(domainProfiles);
  registries.safetyPolicies.registerMany(safetyPolicyPacks);
  return registries;
}

export function createDefaultPlanner(options: { registries?: PlaycraftRegistries; assetProvider?: DeterministicStubAssetProvider } = {}): DeterministicAssemblyPlanner {
  const registries = options.registries ?? createDefaultRegistries();
  const assetProvider = options.assetProvider ?? new DeterministicStubAssetProvider();
  return new DeterministicAssemblyPlanner({
    id: DEFAULT_PLANNER_ID,
    version: "1.0.0",
    recipes: mvpAssemblyRecipes,
    registries,
    assetProvider
  });
}

export function assembleMvpProfiles(): GameAssemblyProfile[] {
  const planner = createDefaultPlanner();
  return mvpAssemblyRequests.map((assemblyRequest) => planner.assemble(assemblyRequest));
}

export function registerPlaycraftTrustedComponents(registry = new TrustedComponentRegistry()): TrustedComponentRegistry {
  for (const manifest of componentManifests) {
    registry.register(manifest, componentForManifest(manifest));
  }

  return registry;
}

function buildProfileFromTemplate(template: MvpProfileTemplate, context: AssemblyRecipeBuildContext): GameAssemblyProfile {
  const domain = requireSelected(context.registries.domains.select({ ids: [context.request.domainProfileId], ageBand: context.request.ageBand }));
  const safety = requireSelected(context.registries.safetyPolicies.select({
    ids: [context.request.safetyPolicyId ?? domain.defaultSafetyPolicyId],
    domainProfileId: domain.id,
    ageBand: context.request.ageBand
  }));
  const theme = requireSelected(context.registries.themes.select({
    capabilityTags: ["theme:high-readability"],
    domainProfileId: domain.id,
    ageBand: context.request.ageBand
  }));

  const mechanics = template.mechanicCapabilities.map((capability, index) => {
    const selected = requireSelected(context.registries.mechanics.select({
      capabilityTags: [capability],
      domainProfileId: domain.id,
      safetyPolicyId: safety.id,
      ageBand: context.request.ageBand,
      modality: context.request.targetModalities[0]
    }));
    return {
      bindingId: `${template.profileId}.mechanic.${index + 1}`,
      mechanicId: selected.id,
      version: selected.version,
      parameters: {
        capability
      },
      eventBindings: {
        primary: selected.emitsEvents[0]
      }
    };
  });

  const mechanicIds = mechanics.map((binding) => binding.mechanicId);
  const rules = template.ruleCategories.map((category, index) => {
    const selected = requireSelected(context.registries.rules.select({
      ruleCategory: category,
      mechanicIds,
      domainProfileId: domain.id,
      safetyPolicyId: safety.id
    }));
    return {
      bindingId: `${template.profileId}.rule.${index + 1}`,
      ruleId: selected.id,
      version: selected.version,
      parameters: {
        category
      },
      defaultSource: selected.defaultSource
    };
  });

  const assetRequests = [
    AssetGenerationRequestSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `asset-request.${template.profileId}`,
      version: "1.0.0",
      kind: "asset-generation-request",
      requestId: `asset-request.${template.profileId}`,
      profileId: template.profileId,
      domainProfileId: domain.id,
      safetyPolicyId: safety.id,
      contentType: "image",
      format: "svg",
      prompt: template.assetPrompt,
      seedPolicy: {
        mode: "required",
        seed: context.request.deterministicSeed
      },
      metadata: {
        profileTemplate: template.id
      }
    })
  ];
  const assets = context.assetProvider.generateBatch(assetRequests);
  const illustration = assets[0].assetId;

  const components = template.componentCapabilities.map((capability, index) => {
    const selected = requireSelected(context.registries.components.select({
      renderCapability: capability,
      mechanicIds,
      domainProfileId: domain.id,
      safetyPolicyId: safety.id,
      ageBand: context.request.ageBand
    }));
    const props = template.propsByCapability[capability];
    const hasRequiredAsset = selected.requiredAssets.some((requirement) => requirement.required);
    return {
      bindingId: `${template.profileId}.component.${index + 1}`,
      componentId: selected.id,
      version: selected.version,
      renderCapability: selected.renderCapability,
      mechanicBindingIds: mechanics
        .filter((binding) => selected.supportedMechanicIds.includes(binding.mechanicId))
        .map((binding) => binding.bindingId)
        .slice(0, 2),
      props,
      assetBindings: hasRequiredAsset ? { illustration } : {}
    };
  });

  const replayEvent = createPlaycraftEvent({
    id: `event.${template.profileId}.ready`,
    profileId: template.profileId,
    eventType: "replay:ready",
    eventName: "profile:assembled",
    source: {
      role: "planner",
      sourceId: DEFAULT_PLANNER_ID
    },
    sequence: 0,
    occurredAt: "2026-06-27T00:00:00.000Z",
    payload: {
      profileId: template.profileId,
      deterministic: true
    }
  });

  const profileWithPlaceholder = GameAssemblyProfileSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: template.profileId,
    version: "1.0.0",
    kind: "game-assembly-profile",
    profileName: template.profileName,
    assemblyRequestId: context.request.id,
    domainProfile: {
      id: domain.id,
      version: domain.version
    },
    safetyPolicy: {
      id: safety.id,
      version: safety.version
    },
    theme: {
      id: theme.id,
      version: theme.version
    },
    mechanics,
    rules,
    components,
    assetRequests,
    assets,
    replay: {
      deterministicSeed: context.request.deterministicSeed,
      plannerId: DEFAULT_PLANNER_ID,
      plannerVersion: "1.0.0",
      unsupportedSeedRequests: assets
        .filter((asset) => asset.provenance.seedStatus === "unsupported")
        .map((asset) => asset.requestId),
      eventLog: [replayEvent]
    },
    validation: placeholderValidation(template.profileId)
  });

  return GameAssemblyProfileSchema.parse({
    ...profileWithPlaceholder,
    validation: validateGameAssemblyProfile(profileWithPlaceholder, context.registries)
  });
}

function componentForManifest(manifest: ComponentManifest): TrustedReactComponent {
  const displayName = manifest.displayName;
  return ({ props, assets, emit }: TrustedComponentRuntimeProps) => {
    const label = typeof props.title === "string" ? props.title : typeof props.message === "string" ? props.message : displayName;
    const prompt = typeof props.prompt === "string" ? props.prompt : typeof props.hint === "string" ? props.hint : undefined;
    const cards = stringArrayProp(props, "cards");
    const pairs = stringArrayProp(props, "pairs");
    const items = stringArrayProp(props, "items");
    const bins = stringArrayProp(props, "bins");
    const sequence = stringArrayProp(props, "sequence");
    const path = stringArrayProp(props, "path");
    const assetNodes = Object.entries(assets).map(([binding, asset]) =>
      React.createElement("img", {
        key: binding,
        src: asset.uri,
        alt: asset.altText,
        "data-playcraft-asset": binding,
        style: trustedComponentStyles.image
      })
    );

    return React.createElement(
      "section",
      {
        "data-playcraft-component": manifest.id,
        "aria-label": label,
        style: trustedComponentStyles.surface
      },
      React.createElement(
        "div",
        { style: assetNodes.length > 0 ? trustedComponentStyles.header : trustedComponentStyles.headerWithoutAsset },
        ...assetNodes,
        React.createElement(
          "div",
          null,
          React.createElement("h2", { style: trustedComponentStyles.title }, label),
          prompt ? React.createElement("p", { style: trustedComponentStyles.prompt }, prompt) : null
        )
      ),
      renderTrustedControls(manifest, { cards, pairs, items, bins, sequence, path }, emit)
    );
  };
}

function renderTrustedControls(
  manifest: ComponentManifest,
  props: {
    cards: string[];
    pairs: string[];
    items: string[];
    bins: string[];
    sequence: string[];
    path: string[];
  },
  emit: TrustedComponentRuntimeProps["emit"]
): React.ReactElement | null {
  if (props.cards.length > 0) {
    return renderButtonGrid(
      props.cards,
      (cardId) => emitFirstTool(manifest, emit, { cardId }),
      `${manifest.id}.cards`
    );
  }

  if (props.pairs.length > 0) {
    return renderButtonGrid(
      props.pairs,
      (itemId) => emitFirstTool(manifest, emit, { itemId }),
      `${manifest.id}.pairs`
    );
  }

  if (props.items.length > 0 && props.bins.length > 0) {
    return React.createElement(
      "div",
      { style: trustedComponentStyles.grid },
      ...props.items.flatMap((itemId) =>
        props.bins.map((targetId) =>
          React.createElement(
            "button",
            {
              key: `${itemId}.${targetId}`,
              type: "button",
              onClick: () => emitFirstTool(manifest, emit, { itemId, targetId }),
              style: trustedComponentStyles.button
            },
            `${itemId} -> ${targetId}`
          )
        )
      )
    );
  }

  if (props.items.length > 0) {
    return renderButtonGrid(
      props.items,
      (itemId) => emitFirstTool(manifest, emit, { itemId }),
      `${manifest.id}.items`
    );
  }

  if (props.sequence.length > 0) {
    return React.createElement(
      "div",
      { style: trustedComponentStyles.sequence },
      React.createElement(
        "div",
        { style: trustedComponentStyles.steps },
        ...props.sequence.map((step, index) =>
          React.createElement("span", { key: `${step}.${index}`, style: trustedComponentStyles.step }, step)
        )
      ),
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => emitFirstTool(manifest, emit, { sequence: props.sequence }),
          style: trustedComponentStyles.button
        },
        "Submit sequence"
      )
    );
  }

  if (props.path.length > 0) {
    return React.createElement(
      "button",
      {
        type: "button",
        onClick: () => emitFirstTool(manifest, emit, { itemId: "path", targetId: props.path.join(" ") }),
        style: trustedComponentStyles.button
      },
      "Trace path"
    );
  }

  return null;
}

function renderButtonGrid(items: string[], onSelect: (item: string) => void, keyPrefix: string): React.ReactElement {
  return React.createElement(
    "div",
    { style: trustedComponentStyles.grid },
    ...items.map((item) =>
      React.createElement(
        "button",
        {
          key: `${keyPrefix}.${item}`,
          type: "button",
          onClick: () => onSelect(item),
          style: trustedComponentStyles.button
        },
        item
      )
    )
  );
}

function stringArrayProp(props: Record<string, JsonValue>, key: string): string[] {
  const value = props[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)));
}

function emitFirstTool(
  manifest: ComponentManifest,
  emit: TrustedComponentRuntimeProps["emit"],
  payload: Record<string, JsonValue>
): void {
  const tool = manifest.emittedTools[0];
  if (!tool) {
    return;
  }

  emit(tool.toolName, {
    componentId: manifest.id,
    ...payload
  });
}

const trustedComponentStyles = {
  surface: {
    display: "grid",
    gap: "1rem"
  },
  header: {
    display: "grid",
    gridTemplateColumns: "minmax(4rem, 8rem) minmax(0, 1fr)",
    gap: "1rem",
    alignItems: "center"
  },
  headerWithoutAsset: {
    display: "grid",
    gap: "0.5rem"
  },
  image: {
    width: "100%",
    aspectRatio: "1",
    objectFit: "cover" as const,
    borderRadius: "8px",
    border: "1px solid #d4d4d8",
    background: "#f4f4f5"
  },
  title: {
    margin: 0,
    fontSize: "1.25rem"
  },
  prompt: {
    margin: "0.5rem 0 0",
    color: "#52525b"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
    gap: "0.5rem"
  },
  button: {
    minHeight: "3rem",
    borderRadius: "8px",
    border: "1px solid #0f766e",
    background: "#ecfdf5",
    color: "#064e3b",
    fontWeight: 700,
    padding: "0.625rem",
    overflowWrap: "anywhere" as const
  },
  sequence: {
    display: "grid",
    gap: "0.75rem"
  },
  steps: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem"
  },
  step: {
    borderRadius: "8px",
    border: "1px solid #d4d4d8",
    background: "#fafafa",
    padding: "0.5rem 0.75rem"
  }
} satisfies Record<string, React.CSSProperties>;

function request(id: string, label: string, capabilities: string[], seed: string): PlaycraftAssemblyRequest {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "assembly-request",
    intent: {
      label,
      goals: ["goal:educational", "goal:replayable"],
      requestedCapabilities: capabilities
    },
    domainProfileId: DEFAULT_DOMAIN_ID,
    safetyPolicyId: DEFAULT_SAFETY_POLICY_ID,
    targetModalities: ["touch", "pointer"],
    ageBand: "4-6",
    deterministicSeed: seed
  };
}

function mechanic(
  id: string,
  displayName: string,
  capabilityTags: string[],
  supportedModalities: Array<"touch" | "pointer" | "keyboard" | "audio" | "voice">,
  consumesEvents: string[],
  emitsEvents: string[]
): MechanicDefinition {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
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
    }
  };
}

function rule(
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
    }
  };
}

function component(
  id: string,
  displayName: string,
  renderCapability: string,
  supportedMechanicIds: string[],
  emittedTools: FrontendToolDefinition[],
  fields: Record<string, { type: "string" | "number" | "boolean" | "object" | "array" | "record"; required: boolean; minItems?: number }>,
  requiredAssets: Array<{ binding: string; contentTypes: Array<"image" | "audio" | "animation" | "text">; required: boolean }>
): ComponentManifest {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "component",
    displayName,
    renderCapability,
    supportedMechanicIds,
    supportedDomains: [DEFAULT_DOMAIN_ID],
    supportedAgeBands: ["2-3", "4-6", "7-9"],
    propsSchema: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      type: "object",
      fields,
      allowUnknown: false
    },
    requiredAssets,
    emittedTools,
    accessibility: {
      labelRequired: true,
      reducedMotionSafe: true,
      keyboardReachable: true
    },
    safetyPolicyIds: [DEFAULT_SAFETY_POLICY_ID],
    replayBehavior: "state-derived"
  };
}

function tool(id: string, toolName: string, fields: Record<string, { type: "string" | "number" | "boolean" | "object" | "array" | "record"; required: boolean; minItems?: number }>): FrontendToolDefinition {
  return FrontendToolDefinitionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind: "frontend-tool",
    toolName,
    description: `Frontend tool ${toolName}`,
    argumentsSchema: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      type: "object",
      fields,
      allowUnknown: false
    },
    emittedEvents: [`frontend:${toolName.split(":")[1]}`]
  });
}

function requireSelected<T extends { id: string }>(result: { selected: T | null; warnings: string[] }): T {
  if (!result.selected) {
    throw new Error(result.warnings.join("; ") || "registry selection failed");
  }

  return result.selected;
}

function placeholderValidation(profileId: string) {
  return AssemblyValidationResultSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `validation.${profileId}`,
    version: "1.0.0",
    kind: "assembly-validation-result",
    profileId,
    valid: true,
    errors: [],
    warnings: []
  });
}

function packManifest(id: string, kind: "mechanic-pack" | "rule-pack" | "component-pack" | "theme-pack" | "asset-provider-pack" | "domain-profile-pack" | "safety-policy-pack", providedCapabilities: string[], publicContractSchemas: string[]) {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id,
    version: "1.0.0",
    kind,
    providedCapabilities: [...new Set(providedCapabilities)].slice(0, 12),
    requiredPeerCapabilities: [],
    compatibleDomainProfiles: [DEFAULT_DOMAIN_ID],
    compatibleSafetyPolicies: [DEFAULT_SAFETY_POLICY_ID],
    publicContractSchemas,
    fixtures: ["examples/profiles/memory-match.json", "examples/profiles/sorting.json", "examples/profiles/sequence-repeat.json"],
    importLight: true,
    requirements: {
      network: false,
      credentials: false,
      native: false
    }
  };
}

interface MvpProfileTemplate {
  id: string;
  description: string;
  capabilityTags: string[];
  requestAliases: string[];
  profileId: string;
  profileName: string;
  assetPrompt: string;
  mechanicCapabilities: string[];
  ruleCategories: string[];
  componentCapabilities: string[];
  propsByCapability: Record<string, Record<string, JsonValue>>;
}

function findMechanicByCapability(capability: string): MechanicDefinition {
  const mechanic = mechanicDefinitions.find((entry) => entry.capabilityTags.includes(capability));
  if (!mechanic) {
    throw new Error(`missing mechanic capability ${capability}`);
  }
  return mechanic;
}

function findRuleByCategory(category: string): RuleModuleDefinition {
  const ruleEntry = ruleModuleDefinitions.find((entry) => entry.category === category);
  if (!ruleEntry) {
    throw new Error(`missing rule category ${category}`);
  }
  return ruleEntry;
}

function findComponentByCapability(capability: string): ComponentManifest {
  const componentEntry = componentManifests.find((entry) => entry.renderCapability === capability);
  if (!componentEntry) {
    throw new Error(`missing component capability ${capability}`);
  }
  return componentEntry;
}
