import { describe, expect, it } from "vitest";
import {
  AssetContentTypeSchema,
  BuilderInputRequestSchema,
  BuilderServiceRequestSchema,
  BuilderServiceResponseSchema,
  ComponentRenderRequestSchema,
  GameTemplateDefinitionSchema,
  InputModalitySchema,
  PLAYCRAFT_SCHEMA_VERSION,
  PlaycraftAgUiEventEnvelopeSchema,
  PublicContractSchemas
} from "@playcraft/contracts";
import { replayProfile } from "@playcraft/core";
import {
  assembleMvpProfiles,
  assetSourceManifests,
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
      argumentsSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        type: "object",
        fields: {
          assetEdit: { type: "object", required: false },
          input: { type: "object", required: false },
          sessionId: { type: "string", required: false },
          templateId: { type: "string", required: true }
        },
        allowUnknown: false
      },
      argumentSummary: "args: assetEdit:object, input:object, sessionId:string, templateId*:string",
      acceptedInputSources: ["text", "moonshine-transcript"],
      inputSourceSummary: "input: Text, Transcript",
      localOnly: true,
      emittedEvents: ["builder:profile-ready"],
      requiredContracts: ["BuilderCommandSchema", "GameTemplateDefinitionSchema"]
    };
    const moonshineTranscriptRecord = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "moonshine-transcript.fixture",
      version: "1.0.0",
      kind: "moonshine-transcript",
      transcriptId: "moonshine-transcript.fixture",
      engine: "moonshine-streaming",
      runtime: "cpu",
      localOnly: true,
      finalized: true,
      text: "memory game with dinosaurs",
      receivedAt: "2026-07-04T00:00:00.000Z",
      segments: [
        {
          text: "memory game with dinosaurs",
          startMs: 0,
          endMs: 1800
        }
      ],
      metadata: {
        origin: "contract-test"
      }
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
      AssetSourceCapabilityManifestSchema: assetSourceManifests[0],
      GeneratedAssetRecordSchema: profile.assets[0],
      AssemblyValidationResultSchema: profile.validation,
      PlaycraftAgUiEventEnvelopeSchema: envelope,
      PlaycraftEventRecordSchema: profile.replay.eventLog[0],
      PackManifestSchema: packManifests[0],
      GameTemplateDefinitionSchema: gameTemplateDefinitions[0],
      MoonshineTranscriptRecordSchema: moonshineTranscriptRecord,
      BuilderInputRequestSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-input.fixture",
        version: "1.0.0",
        kind: "builder-input",
        inputId: "builder-input.fixture",
        source: "moonshine-transcript",
        text: "memory game with dinosaurs",
        transcription: {
          engine: "moonshine-streaming",
          runtime: "cpu",
          localOnly: true
        },
        moonshineTranscript: moonshineTranscriptRecord,
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
        acceptedInputSources: ["text", "moonshine-transcript"],
        input: {
          defaultSource: "text",
          transcriptSource: "moonshine-transcript",
          noInputLabel: "none",
          sourceOptions: [
            {
              source: "text",
              displayLabel: "Text",
              generatePlaceholder: "Memory game with dinosaurs",
              updatePlaceholder: "Change the game or replace assets..."
            },
            {
              source: "moonshine-transcript",
              displayLabel: "Transcript",
              generatePlaceholder: "Moonshine transcript: memory game with dinosaurs",
              updatePlaceholder: "Moonshine transcript: change the game or replace assets"
            }
          ]
        },
        requestTips: {
          availableGames: ["Memory Match"],
          assetEdits: ["with dinosaurs"],
          examples: ["Memory game with dinosaurs"],
          summaryLines: [
            "Available games: Memory Match.",
            "Asset edits: with dinosaurs.",
            "Try: Memory game with dinosaurs."
          ]
        },
        sessions: {
          defaultAssembleSessionId: "service.session",
          sessionBoundActions: ["update", "preview", "get-session", "export-profile", "import-profile"]
        },
        assetEdit: {
          supported: true,
          acceptedKeys: ["theme", "items"],
          maxItems: 12,
          localReplacementFolders: true,
          genericThemeTokens: ["asset", "assets", "card images", "theme"],
          availableThemes: [
            {
              theme: "dinosaurs",
              displayLabel: "dinosaurs",
              aliases: ["dinosaur", "dinosaurs"],
              aliasSummary: "dinosaur, dinosaurs",
              suggestedItemSummary: "dinosaur-1, dinosaur-2",
              suggestedItems: ["dinosaur-1", "dinosaur-2"]
            }
          ]
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
          source: "catalog-template-alias",
          matchedTemplateIds: ["template.memory-match"],
          matchedCapabilityTags: ["game:memory-match"]
        },
        assetEdit: {
          theme: "dinosaurs"
        },
        assetDecision: {
          source: "catalog-asset-alias",
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
      },
      BuilderSessionSnapshotSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        kind: "builder-session-snapshot",
        sessionId: "session.fixture",
        activeProfileId: profile.id,
        activeTemplateId: "template.memory-match",
        activeAssetEdit: {
          theme: "dinosaurs"
        },
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
        validation: profile.validation,
        updatedAt: "2026-07-04T00:00:00.000Z"
      },
      BuilderProfileExportSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-profile-export.fixture",
        version: "1.0.0",
        kind: "builder-profile-export",
        sessionId: "session.fixture",
        templateId: "template.memory-match",
        assetEdit: {
          theme: "dinosaurs"
        },
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
        validation: profile.validation,
        exportedAt: "2026-07-04T00:00:00.000Z",
        retrieval: {
          current: "bundled-local",
          planned: "server-catalog"
        }
      },
      BuilderServiceExecutionSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        result: {
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
        },
        events: [
          {
            type: "RunStarted",
            eventId: "agui.fixture.0000.runstarted",
            runId: "run.fixture",
            timestamp: "2026-06-27T00:00:00.000Z",
            value: {
              runId: "run.fixture"
            }
          }
        ]
      },
      BuilderServiceRequestSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.fixture",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "assemble",
        sessionId: "session.fixture",
        source: "text",
        text: "memory game with dinosaurs",
        templateId: "template.memory-match",
        assetEdit: {
          theme: "dinosaurs"
        }
      },
      BuilderServiceResponseSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-response.fixture",
        version: "1.0.0",
        kind: "builder-service-response",
        requestId: "builder-service-request.fixture",
        actionName: "assemble",
        execution: {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          result: {
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
          },
          events: [
            {
              type: "RunStarted",
              eventId: "agui.fixture.0000.runstarted",
              runId: "run.fixture",
              timestamp: "2026-06-27T00:00:00.000Z",
              value: {
                runId: "run.fixture"
              }
            }
          ]
        },
        session: {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          kind: "builder-session-snapshot",
          sessionId: "session.fixture",
          activeTemplateId: "template.memory-match",
          activeProfileId: profile.id,
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
          validation: profile.validation,
          updatedAt: "2026-07-04T00:00:00.000Z"
        }
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

  it("requires game template definitions to use the builder template namespace", () => {
    expect(() =>
      GameTemplateDefinitionSchema.parse({
        ...gameTemplateDefinitions[0],
        id: "memory-match"
      })
    ).toThrow(/builder template IDs must start with template/u);
  });

  it("requires live game token styles to be template-owned", () => {
    expect(GameTemplateDefinitionSchema.parse(gameTemplateDefinitions[1]).liveSurface.tokenStyles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tokens: ["red"],
          background: "#fee2e2",
          border: "#ef4444",
          foreground: "#7f1d1d",
          accent: "#fecaca"
        })
      ])
    );

    const missingTokenStyles = {
      ...gameTemplateDefinitions[1],
      liveSurface: {
        ...gameTemplateDefinitions[1].liveSurface
      }
    };
    delete (missingTokenStyles.liveSurface as Partial<typeof gameTemplateDefinitions[1]["liveSurface"]>).tokenStyles;

    expect(GameTemplateDefinitionSchema.safeParse(missingTokenStyles).success).toBe(false);

    const missingAccent = {
      ...gameTemplateDefinitions[1],
      liveSurface: {
        ...gameTemplateDefinitions[1].liveSurface,
        tokenStyles: gameTemplateDefinitions[1].liveSurface.tokenStyles.map((entry, index) => {
          if (index !== 0) {
            return entry;
          }

          const next: Partial<typeof entry> = { ...entry };
          delete next.accent;
          return next;
        })
      }
    };

    expect(GameTemplateDefinitionSchema.safeParse(missingAccent).success).toBe(false);
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

  it("keeps render request fallback policy fail-closed only", () => {
    const request = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "render.fail-closed.fixture",
      version: "1.0.0",
      kind: "component-render-request",
      profileId: "profile.fail-closed.fixture",
      componentId: "component.fail-closed.fixture",
      componentCapability: "component:fixture",
      mechanicBindingId: "mechanic.binding.fixture",
      props: {},
      fallbackPolicy: "fail-closed"
    };

    expect(ComponentRenderRequestSchema.safeParse(request).success).toBe(true);
    const missingCapabilityRequest: Partial<typeof request> = { ...request };
    delete missingCapabilityRequest.componentCapability;
    expect(ComponentRenderRequestSchema.safeParse(missingCapabilityRequest).success).toBe(false);
    expect(ComponentRenderRequestSchema.safeParse({ ...request, fallbackPolicy: "skip-component" }).success).toBe(false);
  });

  it("keeps builder command payload fields scoped to their actions", () => {
    const baseCommand = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-command.action-scope.fixture",
      version: "1.0.0",
      kind: "builder-command",
      sessionId: "session.action-scope"
    };
    const profile = assembleMvpProfiles()[0];

    expect(
      PublicContractSchemas.BuilderCommandSchema.safeParse({
        ...baseCommand,
        actionName: "assemble-game",
        templateId: "template.memory-match",
        assetEdit: { theme: "dinosaurs" }
      }).success
    ).toBe(true);
    expect(
      PublicContractSchemas.BuilderCommandSchema.safeParse({
        ...baseCommand,
        actionName: "preview-action",
        interaction: { action: "primary" }
      }).success
    ).toBe(true);
    expect(
      PublicContractSchemas.BuilderCommandSchema.safeParse({
        ...baseCommand,
        actionName: "preview-action",
        templateId: "template.memory-match",
        interaction: { action: "primary" }
      }).success
    ).toBe(false);
    expect(
      PublicContractSchemas.BuilderCommandSchema.safeParse({
        ...baseCommand,
        actionName: "preview-action"
      }).success
    ).toBe(false);
    expect(
      PublicContractSchemas.BuilderCommandSchema.safeParse({
        ...baseCommand,
        actionName: "preview-action",
        interaction: {}
      }).success
    ).toBe(false);
    expect(
      PublicContractSchemas.BuilderCommandSchema.safeParse({
        ...baseCommand,
        actionName: "list-builder-tools",
        assetEdit: { theme: "toys" }
      }).success
    ).toBe(false);
    expect(
      PublicContractSchemas.BuilderCommandSchema.safeParse({
        ...baseCommand,
        actionName: "assemble-game",
        templateId: "template.memory-match",
        profile
      }).success
    ).toBe(false);
  });

  it("keeps v1 asset content types local to sprite, sound, animation, and text assets", () => {
    expect(AssetContentTypeSchema.options).toEqual(["image", "audio", "animation", "text"]);
    expect(AssetContentTypeSchema.safeParse("video").success).toBe(false);
  });

  it("keeps v1 input modalities free of runtime audio capture", () => {
    expect(InputModalitySchema.options).toEqual(["touch", "pointer", "keyboard"]);
    expect(InputModalitySchema.safeParse("audio").success).toBe(false);
    expect(InputModalitySchema.safeParse(`vo${"ice"}`).success).toBe(false);
  });

  it("requires Moonshine transcript records for transcript-sourced builder input", () => {
    expect(
      BuilderInputRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-input.test.missing-transcript",
        version: "1.0.0",
        kind: "builder-input",
        inputId: "builder-input.test.missing-transcript",
        source: "moonshine-transcript",
        text: "memory game with dinosaurs",
        transcription: {
          engine: "moonshine-streaming",
          runtime: "cpu",
          localOnly: true
        },
        receivedAt: "2026-07-04T00:00:00.000Z"
      }).success
    ).toBe(false);

    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.missing-transcript",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "assemble",
        source: "moonshine-transcript",
        text: "memory game with dinosaurs"
      }).success
    ).toBe(false);
  });

  it("keeps service request payload fields scoped to the selected action", () => {
    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.preview-with-text",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "preview",
        sessionId: "session.preview",
        text: "memory game with dinosaurs"
      }).success
    ).toBe(false);

    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.preview-without-session",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "preview"
      }).success
    ).toBe(false);

    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.update-without-session",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "update",
        text: "make it toys"
      }).success
    ).toBe(false);

    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.export-without-session",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "export-profile"
      }).success
    ).toBe(false);

    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.raw-import-without-session",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "import-profile",
        profile: assembleMvpProfiles()[0]
      }).success
    ).toBe(false);

    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.catalog-with-profile",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "catalog",
        profile: assembleMvpProfiles()[0]
      }).success
    ).toBe(false);

    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.import-with-text",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "import-profile",
        profile: assembleMvpProfiles()[0],
        text: "memory game"
      }).success
    ).toBe(false);

    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.import-with-template",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "import-profile",
        profile: assembleMvpProfiles()[0],
        templateId: "template.memory-match"
      }).success
    ).toBe(false);

    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.import-with-two-payloads",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "import-profile",
        profile: assembleMvpProfiles()[0],
        profileExport: {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: "builder-profile-export.test.two-payloads",
          version: "1.0.0",
          kind: "builder-profile-export",
          sessionId: "session.two-payloads",
          profile: assembleMvpProfiles()[0],
          exportedAt: "2026-07-04T00:00:00.000Z",
          retrieval: {
            current: "bundled-local",
            planned: "server-catalog"
          }
        }
      }).success
    ).toBe(false);

    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.import-export-with-asset-edit",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "import-profile",
        assetEdit: { theme: "toys" },
        profileExport: {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: "builder-profile-export.test.asset-edit-override",
          version: "1.0.0",
          kind: "builder-profile-export",
          sessionId: "session.asset-edit-override",
          profile: assembleMvpProfiles()[0],
          exportedAt: "2026-07-04T00:00:00.000Z",
          retrieval: {
            current: "bundled-local",
            planned: "server-catalog"
          }
        }
      }).success
    ).toBe(false);
  });

  it("keeps service response payload fields scoped to the selected action", () => {
    const profile = assembleMvpProfiles()[0];
    const renderRequest = replayProfile(profile, createDefaultRegistries()).renderRequests[0];
    const builderTool = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-tool.response-scope",
      version: "1.0.0",
      kind: "builder-tool",
      toolName: "tool:assemble-game",
      displayName: "Assemble game",
      description: "Assemble a game from a registered template.",
      actionName: "assemble-game",
      argumentsSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        type: "object",
        fields: {
          templateId: { type: "string", required: true }
        },
        allowUnknown: false
      },
      argumentSummary: "args: templateId*:string",
      acceptedInputSources: ["text"],
      inputSourceSummary: "input: Text",
      localOnly: true,
      emittedEvents: ["builder:profile-ready"],
      requiredContracts: ["BuilderCommandSchema"]
    };
    const preview = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      sessionId: "session.response-scope",
      activeProfileId: profile.id,
      activeTemplateId: "template.memory-match",
      activeComponentId: renderRequest.componentId,
      renderedComponentIds: [renderRequest.componentId],
      interactionCount: 0
    };
    const session = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      kind: "builder-session-snapshot",
      sessionId: "session.response-scope",
      activeTemplateId: "template.memory-match",
      activeProfileId: profile.id,
      profile,
      preview,
      validation: profile.validation,
      updatedAt: "2026-07-04T00:00:00.000Z"
    };
    const execution = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      result: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-result.response-scope",
        version: "1.0.0",
        kind: "builder-command-result",
        commandId: "builder-command.response-scope",
        sessionId: "session.response-scope",
        profile,
        preview,
        validation: profile.validation
      },
      events: []
    };

    expect(
      BuilderServiceResponseSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-response.test.assemble-without-session",
        version: "1.0.0",
        kind: "builder-service-response",
        requestId: "builder-service-request.test.assemble-without-session",
        actionName: "assemble",
        execution
      }).success
    ).toBe(false);

    expect(
      BuilderServiceResponseSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-response.test.catalog-with-session",
        version: "1.0.0",
        kind: "builder-service-response",
        requestId: "builder-service-request.test.catalog-with-session",
        actionName: "catalog",
        catalog: {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: "builder-catalog.response-scope",
          version: "1.0.0",
          kind: "builder-catalog",
          defaultTemplateId: "template.memory-match",
          templates: gameTemplateDefinitions,
          tools: [builderTool],
          acceptedInputSources: ["text"],
          assetEdit: {
            supported: true,
            acceptedKeys: ["theme"],
            maxItems: 12,
            localReplacementFolders: true,
            availableThemes: []
          },
          retrieval: {
            current: "bundled-local",
            planned: "server-catalog"
          }
        },
        session
      }).success
    ).toBe(false);

    expect(
      BuilderServiceResponseSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-response.test.export-with-session",
        version: "1.0.0",
        kind: "builder-service-response",
        requestId: "builder-service-request.test.export-with-session",
        actionName: "export-profile",
        profileExport: {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: "builder-profile-export.response-scope",
          version: "1.0.0",
          kind: "builder-profile-export",
          sessionId: "session.response-scope",
          profile,
          exportedAt: "2026-07-04T00:00:00.000Z",
          retrieval: {
            current: "bundled-local",
            planned: "server-catalog"
          }
        },
        session
      }).success
    ).toBe(false);

    expect(
      BuilderServiceResponseSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-response.test.reset-with-session",
        version: "1.0.0",
        kind: "builder-service-response",
        requestId: "builder-service-request.test.reset-with-session",
        actionName: "reset",
        reset: true,
        session
      }).success
    ).toBe(false);
  });
});
