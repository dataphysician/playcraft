import { describe, expect, it } from "vitest";
import {
  ComponentRenderRequestSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  PlaycraftAgUiEventEnvelopeSchema,
  PublicContractSchemas
} from "@playcraft/contracts";
import { replayProfile } from "@playcraft/core";
import {
  assembleMvpProfiles,
  assetProviderManifests,
  gameTemplateDefinitions,
  componentManifests,
  createDefaultRegistries,
  domainProfiles,
  mechanicDefinitions,
  packManifests,
  ruleModuleDefinitions,
  safetyPolicyPacks,
  themePacks
} from "@playcraft/packs";

describe("public contract schemas", () => {
  it("validates every public contract fixture", () => {
    const registries = createDefaultRegistries();
    const profile = assembleMvpProfiles()[0];
    const renderRequest = replayProfile(profile, registries).renderRequests[0];
    const envelope = PlaycraftAgUiEventEnvelopeSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      eventId: "event.contract.envelope",
      eventVersion: "1.0.0",
      profileId: profile.id,
      runId: "run.contract",
      payloadType: "replay.ready",
      payload: {
        profileId: profile.id,
        replayable: true
      },
      provenance: {
        role: "validator",
        sourceId: "validator.contract"
      }
    });
    const builderToolFixture = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-tool.fixture",
      version: "1.0.0",
      kind: "builder-tool",
      toolName: "tool:assemble-game",
      displayName: "Assemble game",
      description: "Assemble a game from a registered template.",
      actionName: "assemble-game",
      acceptedInputSources: ["text", "speech-transcript"],
      localOnly: true,
      emittedEvents: ["builder:profile-ready"],
      requiredContracts: ["BuilderCommandSchema", "GameTemplateDefinitionSchema"]
    };

    const fixtures = {
      PlaycraftAssemblyRequestSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: profile.assemblyRequestId,
        version: "1.0.0",
        kind: "assembly-request",
        intent: {
          label: "Contract fixture",
          goals: ["goal:educational"],
          requestedCapabilities: ["game:memory-match"]
        },
        domainProfileId: profile.domainProfile.id,
        safetyPolicyId: profile.safetyPolicy.id,
        targetModalities: ["touch"],
        ageBand: "4-6",
        deterministicSeed: "schema-seed"
      },
      DomainProfileSchema: domainProfiles[0],
      SafetyPolicyPackSchema: safetyPolicyPacks[0],
      GameAssemblyProfileSchema: profile,
      MechanicDefinitionSchema: mechanicDefinitions[0],
      RuleModuleDefinitionSchema: ruleModuleDefinitions[0],
      ComponentManifestSchema: componentManifests[0],
      ComponentRenderRequestSchema: renderRequest,
      ThemePackSchema: themePacks[0],
      FrontendToolDefinitionSchema: componentManifests[0].emittedTools[0],
      AssetGenerationRequestSchema: profile.assetRequests[0],
      AssetProviderCapabilityManifestSchema: assetProviderManifests[0],
      GeneratedAssetRecordSchema: profile.assets[0],
      AssemblyValidationResultSchema: profile.validation,
      PlaycraftAgUiEventEnvelopeSchema: envelope,
      PlaycraftEventRecordSchema: profile.replay.eventLog[0],
      PackManifestSchema: packManifests[0],
      GameTemplateDefinitionSchema: gameTemplateDefinitions[0],
      BuilderInputRequestSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-input.fixture",
        version: "1.0.0",
        kind: "builder-input",
        inputId: "builder-input.fixture",
        source: "speech-transcript",
        text: "memory game with dinosaurs",
        transcription: {
          engine: "moonshine-streaming",
          runtime: "cpu",
          localOnly: true
        },
        receivedAt: "2026-07-04T00:00:00.000Z",
        metadata: {
          origin: "contract-test"
        }
      },
      BuilderToolDefinitionSchema: {
        ...builderToolFixture
      },
      BuilderCatalogSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-catalog.fixture",
        version: "1.0.0",
        kind: "builder-catalog",
        defaultTemplateId: "template.memory-match",
        templates: gameTemplateDefinitions,
        tools: [builderToolFixture],
        acceptedInputSources: ["text", "speech-transcript"],
        assetEdit: {
          supported: true,
          acceptedKeys: ["theme", "items"],
          maxItems: 12,
          localReplacementFolders: true
        },
        retrieval: {
          current: "bundled-local",
          planned: "server-catalog"
        }
      },
      BuilderIntentResolutionSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-intent.fixture",
        version: "1.0.0",
        kind: "builder-intent-resolution",
        inputId: "builder-input.fixture",
        activeTemplateId: "template.memory-match",
        selectedTemplateId: "template.memory-match",
        templateDecision: {
          source: "text-match",
          matchedTemplateIds: ["template.memory-match"],
          matchedCapabilityTags: ["game:memory-match"]
        },
        assetEdit: {
          theme: "dinosaurs"
        },
        assetDecision: {
          source: "text-match",
          matchedText: "dinosaurs"
        }
      },
      BuilderCommandSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-command.fixture",
        version: "1.0.0",
        kind: "builder-command",
        sessionId: "session.fixture",
        actionName: "assemble-game",
        templateId: "template.memory-match",
        assetEdit: {
          theme: "dinosaurs"
        }
      },
      BuilderPreviewStateSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        sessionId: "session.fixture",
        activeProfileId: profile.id,
        activeTemplateId: "template.memory-match",
        activeComponentId: renderRequest.componentId,
        renderedComponentIds: [renderRequest.componentId],
        interactionCount: 0
      },
      BuilderCommandResultSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-result.fixture",
        version: "1.0.0",
        kind: "builder-command-result",
        commandId: "builder-command.fixture",
        sessionId: "session.fixture",
        profile,
        preview: {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          sessionId: "session.fixture",
          activeProfileId: profile.id,
          activeTemplateId: "template.memory-match",
          activeComponentId: renderRequest.componentId,
          renderedComponentIds: [renderRequest.componentId],
          interactionCount: 0
        },
        validation: profile.validation
      }
    };

    for (const [name, schema] of Object.entries(PublicContractSchemas)) {
      const result = schema.safeParse(fixtures[name as keyof typeof fixtures]);
      expect(result.success, `${name} should parse its fixture`).toBe(true);
      if (result.success) {
        expect(result.data.schemaVersion).toBe(PLAYCRAFT_SCHEMA_VERSION);
      }
    }
  });

  it("keeps render requests strict and identified", () => {
    const result = ComponentRenderRequestSchema.safeParse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "render.strict.fixture",
      version: "1.0.0",
      kind: "component-render-request",
      profileId: "profile.strict.fixture",
      mechanicBindingId: "mechanic.binding.fixture",
      props: {},
      fallbackPolicy: "fail-closed",
      generatedRuntimeCode: "not accepted"
    });

    expect(result.success).toBe(false);
  });
});
