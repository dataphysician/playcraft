import { describe, expect, it } from "vitest";
import {
  AssetContentTypeSchema,
  BuilderCatalogSchema,
  BuilderSessionSnapshotSchema,
  BuilderInputRequestSchema,
  BuilderServiceCatalogActionSchema,
  BuilderServiceCatalogSchema,
  BuilderServiceRequestBatchSchema,
  BuilderServiceRequestSchema,
  BuilderServiceResponseSchema,
  GameAssemblyProfileSchema,
  GameProfileTemplateSnapshotSchema,
  ComponentRenderRequestSchema,
  GameTemplateDefinitionSchema,
  InputModalitySchema,
  PLAYCRAFT_SCHEMA_VERSION,
  PlaycraftAgUiEventEnvelopeSchema,
  PublicContractNameSchema,
  PublicContractSchemas,
  McpManifestSchema,
  McpServerPolicySchema,
  McpToolSchema,
  SseFrameSchema,
  WorkflowGraphSchema,
  WorkflowNodeSchema,
  WorkflowEdgeSchema,
  BuilderSessionOwnershipSchema,
  AssetCatalogManifestSchema,
  BuilderTemplateNamespaceSchema,
  PLAYCRAFT_MCP_GUARDRAILS
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

function builderToolFixtureFor(
  actionName: "assemble-game" | "update-game" | "preview-action" | "list-builder-tools" | "get-session" | "export-profile" | "import-profile" | "list-building-blocks" | "compose-profile" | "list-local-assets" | "package-bundle"
) {
  const toolNameByAction = {
    "assemble-game": "tool:assemble-game",
    "update-game": "tool:update-game",
    "preview-action": "tool:preview-action",
    "list-builder-tools": "tool:list-builder-tools",
    "get-session": "tool:get-session",
    "export-profile": "tool:export-profile",
    "import-profile": "tool:import-profile",
    "list-building-blocks": "tool:list-building-blocks",
    "compose-profile": "tool:compose-profile",
    "list-local-assets": "tool:list-local-assets",
    "package-bundle": "tool:package-bundle"
  } as const;
  const displayNameByAction = {
    "assemble-game": "Assemble Game",
    "update-game": "Update Game",
    "preview-action": "Preview Action",
    "list-builder-tools": "List Builder Tools",
    "get-session": "Get Session",
    "export-profile": "Export Profile",
    "import-profile": "Import Profile",
    "list-building-blocks": "List Building Blocks",
    "compose-profile": "Compose Profile",
    "list-local-assets": "List Local Assets",
    "package-bundle": "Package Bundle"
  } as const;
  const requiredContractsByAction = {
    "assemble-game": ["BuilderCommandSchema", "BuilderInputRequestSchema", "GameTemplateDefinitionSchema"],
    "update-game": ["BuilderCommandSchema", "BuilderInputRequestSchema", "GameTemplateDefinitionSchema"],
    "preview-action": ["BuilderCommandSchema", "BuilderPreviewStateSchema"],
    "list-builder-tools": ["BuilderToolDefinitionSchema", "GameTemplateDefinitionSchema"],
    "get-session": ["BuilderCommandSchema", "BuilderSessionSnapshotSchema"],
    "export-profile": ["BuilderCommandSchema", "BuilderProfileExportSchema"],
    "import-profile": ["BuilderCommandSchema", "GameAssemblyProfileSchema"],
    "list-building-blocks": ["BuilderToolDefinitionSchema", "GameTemplateDefinitionSchema"],
    "compose-profile": ["BuilderCommandSchema", "GameAssemblyProfileSchema"],
    "list-local-assets": ["BuilderToolDefinitionSchema", "AssetSourceCapabilityManifestSchema"],
    "package-bundle": ["BuilderCommandSchema", "BuilderSessionSnapshotSchema", "GameBundleSchema"]
  } as const;
  const acceptsInput = actionName === "assemble-game" || actionName === "update-game";

  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-tool.fixture.${actionName}`,
    version: "1.0.0",
    kind: "builder-tool",
    toolName: toolNameByAction[actionName],
    displayName: displayNameByAction[actionName],
    description: `${displayNameByAction[actionName]} fixture.`,
    actionName,
    argumentsSchema: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      type: "object",
      fields: acceptsInput
        ? {
            assetEdit: { type: "object", required: false },
            input: { type: "object", required: false },
            sessionId: { type: "string", required: actionName === "update-game" },
            templateId: { type: "string", required: true }
          }
        : {},
      allowUnknown: false
    },
    argumentSummary: acceptsInput
      ? `args: assetEdit:object, input:object, sessionId${actionName === "update-game" ? "*" : ""}:string, templateId*:string`
      : "args: none",
    acceptedInputSources: acceptsInput ? ["text", "moonshine-transcript"] : [],
    inputSourceSummary: acceptsInput ? "input: Text, Transcript" : "input: none",
    localOnly: true,
    emittedEvents: ["builder:profile-ready"],
    requiredContracts: requiredContractsByAction[actionName]
  };
}

function builderToolCatalogFixture() {
  return [
    builderToolFixtureFor("assemble-game"),
    builderToolFixtureFor("update-game"),
    builderToolFixtureFor("preview-action"),
    builderToolFixtureFor("list-builder-tools"),
    builderToolFixtureFor("get-session"),
    builderToolFixtureFor("export-profile"),
    builderToolFixtureFor("import-profile"),
    builderToolFixtureFor("list-building-blocks"),
    builderToolFixtureFor("compose-profile"),
    builderToolFixtureFor("list-local-assets"),
    builderToolFixtureFor("package-bundle")
  ];
}

function serviceCatalogFixture() {
  const action = (
    actionName: "catalog" | "assemble" | "update" | "preview" | "reset" | "get-session" | "export-profile" | "import-profile" | "execute-workflow" | "request-paid-online-assembly",
    request: {
      acceptedFields: string[];
      requiredFields: string[];
      requiredAnyOf?: string[][];
      exclusiveAnyOf?: string[][];
      forbiddenTogether?: string[][];
    },
    responsePayload: "catalog" | "execution" | "session" | "profileExport" | "reset"
  ) => ({
    actionName,
    displayName: actionName,
    requiresSession: ["update", "preview", "get-session", "export-profile", "import-profile", "request-paid-online-assembly"].includes(actionName),
    acceptsInput: ["assemble", "update"].includes(actionName),
    request: {
      requiredAnyOf: [],
      exclusiveAnyOf: [],
      forbiddenTogether: [],
      summary: "Contract fixture.",
      ...request
    },
    responsePayload
  });

  return {
    actions: [
      action("catalog", { acceptedFields: [], requiredFields: [] }, "catalog"),
      action("assemble", {
        acceptedFields: ["sessionId", "text", "source", "moonshineTranscript", "templateId", "assetEdit"],
        requiredFields: [],
        requiredAnyOf: [["text", "moonshineTranscript"]],
        exclusiveAnyOf: [["text", "moonshineTranscript"]]
      }, "execution"),
      action("update", {
        acceptedFields: ["sessionId", "text", "source", "moonshineTranscript", "templateId", "assetEdit"],
        requiredFields: ["sessionId"],
        requiredAnyOf: [["text", "moonshineTranscript"]],
        exclusiveAnyOf: [["text", "moonshineTranscript"]]
      }, "execution"),
      action("preview", { acceptedFields: ["sessionId", "interaction"], requiredFields: ["sessionId", "interaction"] }, "execution"),
      action("reset", { acceptedFields: [], requiredFields: [] }, "reset"),
      action("get-session", { acceptedFields: ["sessionId"], requiredFields: ["sessionId"] }, "session"),
      action("export-profile", { acceptedFields: ["sessionId"], requiredFields: ["sessionId"] }, "profileExport"),
      action("import-profile", {
        acceptedFields: ["sessionId", "profile", "profileExport", "assetEdit"],
        requiredFields: ["sessionId"],
        requiredAnyOf: [["profile", "profileExport"]],
        exclusiveAnyOf: [["profile", "profileExport"]],
        forbiddenTogether: [["profileExport", "assetEdit"]]
      }, "execution"),
      action("execute-workflow", {
        acceptedFields: ["sessionId", "workflow"],
        requiredFields: ["workflow"]
      }, "execution"),
      action("request-paid-online-assembly", {
        acceptedFields: ["sessionId", "capabilityGap", "paymentConfirmationId"],
        requiredFields: ["sessionId", "capabilityGap", "paymentConfirmationId"]
      }, "execution")
    ],
    exactEnvelope: {
      singleCommand: "request",
      batchCommand: "request-batch",
      requestSchema: "BuilderServiceRequestSchema",
      batchSchema: "BuilderServiceRequestBatchSchema",
      directHandler: "handleLocalServiceRequest",
      directBatchHandler: "handleLocalServiceRequestBatch",
      requiredContracts: ["BuilderServiceRequestSchema", "BuilderServiceRequestBatchSchema", "BuilderServiceResponseSchema"]
    },
    transports: {
      local: "createLocalServiceTransport",
      httpClient: "createHttpServiceTransport",
      httpBody: "handleServiceHttpRequestBody"
    }
  };
}

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
    expect(PlaycraftAgUiEventEnvelopeSchema.safeParse({
      ...envelope,
      runId: undefined
    }).success).toBe(false);
    const builderToolFixture = builderToolFixtureFor("assemble-game");
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
      GameProfileTemplateSnapshotSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: gameTemplateDefinitions[0].id,
        version: "1.0.0",
        kind: "game-template-snapshot",
        displayName: gameTemplateDefinitions[0].displayName,
        displayLabel: gameTemplateDefinitions[0].displayLabel,
        assetPromptKind: gameTemplateDefinitions[0].assetPromptKind,
        assetEditOperations: gameTemplateDefinitions[0].assetEditOperations,
        liveSurface: gameTemplateDefinitions[0].liveSurface,
        assemblyRequestId: gameTemplateDefinitions[0].assemblyRequestId
      },
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
        moonshineConfig: {
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
        tools: builderToolCatalogFixture(),
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
          availableGames: gameTemplateDefinitions.map((template) => template.displayLabel),
          featuredGames: ["Memory Match"],
          assetEdits: ["with dinosaurs"],
          examples: ["Memory game with dinosaurs"],
          summaryLines: [
            "Available games: Memory Match.",
            "Asset edits: with dinosaurs.",
            "Try: Memory game with dinosaurs."
          ]
        },
        service: serviceCatalogFixture(),
        sessions: {
          defaultAssembleSessionId: "service.session",
          sessionBoundActions: ["update", "preview", "get-session", "export-profile", "import-profile", "request-paid-online-assembly"]
        },
        assetEdit: {
          supported: true,
          acceptedKeys: ["theme", "items"],
          maxItems: 12,
          localReplacementFolders: true,
          freeformItemSuffixes: ["1", "2", "3"],
          genericThemeTokens: ["asset", "assets", "card images", "theme"],
          availableThemes: [
            {
              theme: "dinosaurs",
              displayLabel: "dinosaurs",
              localReplacementFolder: "dinosaurs",
              aliases: ["dinosaur", "dinosaurs"],
              aliasSummary: "dinosaur, dinosaurs",
              suggestedItemSummary: "dinosaur-1, dinosaur-2",
              suggestedItems: ["dinosaur-1", "dinosaur-2"]
            }
          ]
        },
        retrieval: {
          current: "bundled-local",
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
        exportedAt: "2026-07-06T00:00:00.000Z",
        provenance: {
          source: "local-llm-agent",
          agentEngine: "lfm2.5-vl-450m-extract",
          assembledBy: "playcraft-contracts-fixture",
          assembledAt: "2026-07-06T00:00:00.000Z",
          agentTranscriptId: "agent-transcript.session.fixture"
        }
      },
      GameBundleSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "game-bundle.fixture",
        version: "1.0.0",
        kind: "game-bundle",
        profileExport: {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: "builder-profile-export.fixture",
          version: "1.0.0",
          kind: "builder-profile-export",
          sessionId: "session.fixture",
          templateId: "template.memory-match",
          profile,
          preview: {
            schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
            sessionId: "session.fixture",
            activeProfileId: profile.id,
            activeTemplateId: "template.memory-match",
            interactionCount: 0
          },
          validation: profile.validation,
          exportedAt: "2026-07-06T00:00:00.000Z",
          provenance: {
            source: "local-llm-agent",
            agentEngine: "lfm2.5-vl-450m-extract",
            assembledBy: "playcraft-contracts-fixture",
            assembledAt: "2026-07-06T00:00:00.000Z",
            agentTranscriptId: "agent-transcript.session.fixture"
          }
        },
        registries: {
          mechanics: [mechanicDefinitions[0]],
          rules: [ruleModuleDefinitions[0]],
          components: [componentManifests[0]],
          themes: [themePacks[0]],
          assetSources: [assetSourceManifests[0]],
          domains: [domainProfiles[0]],
          safetyPolicies: [safetyPolicyPacks[0]]
        },
        capEnforcement: {
          enforcedAt: "2026-07-06T00:00:00.000Z"
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
      BuilderServiceRequestBatchSchema: [
        {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: "builder-service-request.fixture.batch",
          version: "1.0.0",
          kind: "builder-service-request",
          actionName: "assemble",
          text: "memory game with dinosaurs"
        }
      ],
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
      },
      McpManifestSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "mcp-manifest.fixture",
        version: "1.0.0",
        kind: "mcp-manifest",
        name: "test-manifest",
        tools: [
          {
            name: "tool:test",
            description: "A test tool",
            parameters: {
              arg1: {
                name: "arg1",
                type: "string",
                description: "A test argument",
                required: true
              }
            }
          }
        ]
      },
      WorkflowGraphSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "workflow-graph.fixture",
        version: "1.0.0",
        kind: "workflow-graph",
        nodes: [
          {
            id: "node-1",
            actionName: "catalog",
            payload: {},
            dependsOn: []
          },
          {
            id: "node-2",
            actionName: "assemble",
            payload: {},
            dependsOn: ["node-1"]
          }
        ],
        edges: [
          {
            from: "node-1",
            to: "node-2"
          }
        ],
        startNodeId: "node-1"
      },
      AssetCatalogManifestSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "asset-catalog-manifest.fixture",
        version: "1.0.0",
        kind: "asset-catalog-manifest",
        source: "catalog.json",
        theme: "dinosaurs",
        displayLabel: "Dinosaurs",
        aliases: ["dinosaur"],
        suggestedItems: ["dinosaur-1", "dinosaur-2"],
        spriteNaming: {
          kind: "ordinal",
          rules: {}
        }
      },
      McpServerPolicySchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "mcp-server-policy.fixture",
        version: "1.0.0",
        kind: "mcp-server-policy",
        localOnly: true,
        noAuth: true,
        noNetworkExecution: true,
        noDatabaseAccess: true,
        allowlistedTools: [
          "assemble-game",
          "update-game",
          "preview-action",
          "list-builder-tools",
          "get-session",
          "export-profile",
          "import-profile"
        ]
      },
      AgentToolCallSchema: {
        callId: "agent-call.fixture",
        toolName: "tool:assemble-game",
        arguments: {
          text: "memory game with dinosaurs"
        }
      },
      AgentToolResultSchema: {
        callId: "agent-call.fixture",
        toolName: "tool:assemble-game",
        status: "ok",
        value: {
          profileId: "profile.fixture"
        }
      },
      AgentStepSchema: {
        kind: "tool-call",
        stepId: "agent-step.fixture",
        engine: "lfm2.5-vl-450m-extract",
        call: {
          callId: "agent-call.fixture",
          toolName: "tool:assemble-game",
          arguments: {
            text: "memory game with dinosaurs"
          }
        },
        emittedAt: "2026-07-06T00:00:00.000Z"
      },
      PlaycraftAgentTranscriptSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "agent-transcript.fixture",
        version: "1.0.0",
        kind: "agent-transcript",
        engine: "lfm2.5-vl-450m-extract",
        engineManifestId: "local-inference-engine.fixture",
        engineManifestVersion: "1.0.0",
        requestId: "agent-request.fixture",
        steps: [
          {
            kind: "final",
            stepId: "agent-step.fixture.final",
            message: "Memory game with dinosaurs ready",
            emittedAt: "2026-07-06T00:00:00.000Z"
          }
        ],
        finished: true,
        finishedAt: "2026-07-06T00:00:00.000Z"
      },
      PaidOnlineAssemblyRequestSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "paid-online-assembly-request.fixture",
        version: "1.0.0",
        kind: "paid-online-assembly-request",
        requestId: "paid-online-assembly-request.fixture.request",
        sessionId: "session.fixture",
        userConsent: true,
        paymentConfirmationId: "payment-confirmation.fixture",
        capabilityGap: {
          missingCapabilities: ["render:novel-cards"],
          requestedMechanicIds: ["mechanic.memory-match"],
          requestedRuleIds: ["rule.memory-match"],
          requestedComponentIds: ["component.memory-grid"],
          context: { locale: "en-US" }
        }
      },
      PaidOnlineAssemblyResponseSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "paid-online-assembly-response.fixture",
        version: "1.0.0",
        kind: "paid-online-assembly-response",
        requestId: "paid-online-assembly-request.fixture.request",
        bundleId: "game-bundle.paid.fixture",
        costCents: 100,
        estimatedCompletionSeconds: 45,
        remoteUrl: "https://playcraft.test/paid-assembly"
      }
    };

    for (const [name, schema] of Object.entries(PublicContractSchemas)) {
      const result = schema.safeParse(fixtures[name as keyof typeof fixtures]);
      expect(result.success, `${name} should parse its fixture`).toBe(true);
      if (result.success) {
        if (Array.isArray(result.data)) {
          expect(result.data.map((item: { schemaVersion?: string }) => item.schemaVersion)).toEqual(
            result.data.map(() => PLAYCRAFT_SCHEMA_VERSION)
          );
        } else if (
          name === "AgentToolCallSchema" ||
          name === "AgentToolResultSchema" ||
          name === "AgentStepSchema"
        ) {
          expect((result.data as { schemaVersion?: string }).schemaVersion).toBeUndefined();
        } else {
          expect(result.data.schemaVersion).toBe(PLAYCRAFT_SCHEMA_VERSION);
        }
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
    expect(GameTemplateDefinitionSchema.parse(gameTemplateDefinitions[1]).liveSurface.defaultTokenStyle).toEqual(
      expect.objectContaining({
        tokens: ["default"],
        background: "#ede9fe",
        border: "#7c3aed",
        foreground: "#4c1d95",
        accent: "#ddd6fe"
      })
    );

    const missingTokenStyles = {
      ...gameTemplateDefinitions[1],
      liveSurface: {
        ...gameTemplateDefinitions[1].liveSurface
      }
    };
    delete (missingTokenStyles.liveSurface as Partial<typeof gameTemplateDefinitions[1]["liveSurface"]>).tokenStyles;

    expect(GameTemplateDefinitionSchema.safeParse(missingTokenStyles).success).toBe(false);

    const emptyTokenStyles = {
      ...gameTemplateDefinitions[1],
      liveSurface: {
        ...gameTemplateDefinitions[1].liveSurface,
        tokenStyles: []
      }
    };

    expect(GameTemplateDefinitionSchema.safeParse(emptyTokenStyles).success).toBe(false);

    const missingDefaultTokenStyle = {
      ...gameTemplateDefinitions[1],
      liveSurface: {
        ...gameTemplateDefinitions[1].liveSurface
      }
    };
    delete (missingDefaultTokenStyle.liveSurface as Partial<typeof gameTemplateDefinitions[1]["liveSurface"]>).defaultTokenStyle;

    expect(GameTemplateDefinitionSchema.safeParse(missingDefaultTokenStyle).success).toBe(false);

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

    const missingReplacementCapability = {
      ...gameTemplateDefinitions[1],
      liveSurface: {
        ...gameTemplateDefinitions[1].liveSurface,
        assetReplacementSources: [
          ...gameTemplateDefinitions[1].liveSurface.assetReplacementSources,
          {
            componentRole: "choice",
            prop: "items",
            namespace: "choice"
          }
        ]
      }
    };

    expect(GameTemplateDefinitionSchema.safeParse(missingReplacementCapability).success).toBe(false);
  });

  it("requires profiles to carry matching template snapshots", () => {
    const template = gameTemplateDefinitions[0];
    const profile = assembleMvpProfiles()[0];
    expect(profile).toBeDefined();
    const templateSnapshot = GameProfileTemplateSnapshotSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "template.custom-memory",
      version: "1.0.0",
      kind: "game-template-snapshot",
      displayName: "Custom Memory",
      displayLabel: "Custom Memory",
      assetPromptKind: template.assetPromptKind,
      assetEditOperations: template.assetEditOperations,
      liveSurface: template.liveSurface,
      assemblyRequestId: "request.custom-memory"
    });

    expect(
      GameAssemblyProfileSchema.parse({
        ...profile!,
        assemblyRequestId: "request.custom-memory",
        template: templateSnapshot
      }).template.id
    ).toBe("template.custom-memory");
    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        assemblyRequestId: "request.custom-memory",
        template: undefined
      }).success
    ).toBe(false);
    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        assemblyRequestId: "request.custom-memory",
        template: {
          ...templateSnapshot,
          assemblyRequestId: "request.other"
        }
      }).success
    ).toBe(false);
  });

  it("requires profiles to carry matching validation snapshots", () => {
    const profile = assembleMvpProfiles()[0];
    expect(profile).toBeDefined();
    const validationIssue = {
      code: "test.validation",
      message: "test validation issue",
      path: ["validation"],
      severity: "error" as const
    };

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        validation: {
          ...profile!.validation,
          profileId: "profile.other"
        }
      }).success
    ).toBe(false);
    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        validation: {
          ...profile!.validation,
          id: "validation.profile.other"
        }
      }).success
    ).toBe(false);
    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        validation: {
          ...profile!.validation,
          valid: false
        }
      }).success
    ).toBe(false);
    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        validation: {
          ...profile!.validation,
          errors: [validationIssue]
        }
      }).success
    ).toBe(false);
    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        validation: {
          ...profile!.validation,
          warnings: [{ ...validationIssue, severity: "warning" as const }]
        }
      }).success
    ).toBe(false);
  });

  it("requires profiles to carry unique mechanic rule and component binding ids", () => {
    const profile = assembleMvpProfiles()[0];
    expect(profile).toBeDefined();

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        mechanics: [
          ...profile!.mechanics,
          {
            ...profile!.mechanics[0]!
          }
        ]
      }).success
    ).toBe(false);

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        rules: [
          ...profile!.rules,
          {
            ...profile!.rules[0]!
          }
        ]
      }).success
    ).toBe(false);

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        components: [
          ...profile!.components,
          {
            ...profile!.components[0]!
          }
        ]
      }).success
    ).toBe(false);
  });

  it("requires profiles to keep component and asset references internal", () => {
    const profile = assembleMvpProfiles()[0];
    expect(profile).toBeDefined();
    const component = profile!.components[0];
    expect(component).toBeDefined();
    const unattachedMechanic = profile!.mechanics.find((mechanic) => !component!.mechanicBindingIds.includes(mechanic.bindingId));
    expect(unattachedMechanic).toBeDefined();

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        assets: [
          {
            ...profile!.assets[0]!,
            requestId: "asset-request.missing"
          }
        ]
      }).success
    ).toBe(false);

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        components: [
          {
            ...component!,
            mechanicBindingIds: [...component!.mechanicBindingIds, component!.mechanicBindingIds[0]!]
          },
          ...profile!.components.slice(1)
        ]
      }).success
    ).toBe(false);

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        components: [
          {
            ...component!,
            mechanicBindingIds: [...component!.mechanicBindingIds, "mechanic.missing"]
          },
          ...profile!.components.slice(1)
        ]
      }).success
    ).toBe(false);

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        components: [
          {
            ...component!,
            renderMechanicBindingId: unattachedMechanic!.bindingId
          },
          ...profile!.components.slice(1)
        ]
      }).success
    ).toBe(false);

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        components: [
          {
            ...component!,
            assetBindings: {
              ...component!.assetBindings,
              illustration: "asset.missing"
            }
          },
          ...profile!.components.slice(1)
        ]
      }).success
    ).toBe(false);
  });

  it("requires profiles to carry exactly one live surface component per authored capability", () => {
    const profile = assembleMvpProfiles()[0];
    expect(profile).toBeDefined();
    const primaryCapability = profile!.template.liveSurface.componentCapabilities.primary;
    const primaryComponent = profile!.components.find((component) => component.renderCapability === primaryCapability);
    expect(primaryComponent).toBeDefined();

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        components: profile!.components.filter((component) => component.renderCapability !== primaryCapability)
      }).success
    ).toBe(false);

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        components: [
          ...profile!.components,
          {
            ...primaryComponent!,
            bindingId: `${primaryComponent!.bindingId}.duplicate`
          }
        ]
      }).success
    ).toBe(false);
  });

  it("requires profiles to carry unique generated asset and request ids", () => {
    const profile = assembleMvpProfiles()[0];
    expect(profile).toBeDefined();

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        assetRequests: [
          ...profile!.assetRequests,
          {
            ...profile!.assetRequests[0]!
          }
        ]
      }).success
    ).toBe(false);

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        assets: [
          ...profile!.assets,
          {
            ...profile!.assets[0]!
          }
        ]
      }).success
    ).toBe(false);
  });

  it("requires profiles to carry unique ordered replay events", () => {
    const profile = assembleMvpProfiles()[0];
    expect(profile).toBeDefined();
    const replayEvent = profile!.replay.eventLog[0];
    expect(replayEvent).toBeDefined();

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        replay: {
          ...profile!.replay,
          eventLog: [
            ...profile!.replay.eventLog,
            {
              ...replayEvent!,
              sequence: replayEvent!.sequence + 1
            }
          ]
        }
      }).success
    ).toBe(false);

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        replay: {
          ...profile!.replay,
          eventLog: [
            ...profile!.replay.eventLog,
            {
              ...replayEvent!,
              id: `${replayEvent!.id}.duplicate`
            }
          ]
        }
      }).success
    ).toBe(false);

    expect(
      GameAssemblyProfileSchema.safeParse({
        ...profile!,
        replay: {
          ...profile!.replay,
          eventLog: [
            {
              ...replayEvent!,
              id: `${replayEvent!.id}.later`,
              sequence: replayEvent!.sequence + 1
            },
            replayEvent!
          ]
        }
      }).success
    ).toBe(false);
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
      componentVersion: "1.0.0",
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

  it("keeps builder tool required contracts limited to public contract names", () => {
    const names = PublicContractNameSchema.options;

    expect(Object.keys(PublicContractSchemas).sort()).toEqual([...names].sort());
    expect(PublicContractSchemas.BuilderToolDefinitionSchema.safeParse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-tool.required-contracts.valid",
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
      acceptedInputSources: ["text", "moonshine-transcript"],
      inputSourceSummary: "input: Text, Transcript",
      localOnly: true,
      emittedEvents: ["builder:profile-ready"],
      requiredContracts: ["BuilderCommandSchema", "GameTemplateDefinitionSchema"]
    }).success).toBe(true);
    expect(PublicContractSchemas.BuilderToolDefinitionSchema.safeParse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-tool.required-contracts.invalid",
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
      acceptedInputSources: ["text", "moonshine-transcript"],
      inputSourceSummary: "input: Text, Transcript",
      localOnly: true,
      emittedEvents: ["builder:profile-ready"],
      requiredContracts: ["MissingContractSchema"]
    }).success).toBe(false);
  });

  it("keeps builder tool input source metadata aligned with action input ownership", () => {
    const validAssembleTool = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-tool.input-source.valid",
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
      acceptedInputSources: ["text", "moonshine-transcript"],
      inputSourceSummary: "input: Text, Transcript",
      localOnly: true,
      emittedEvents: ["builder:profile-ready"],
      requiredContracts: ["BuilderCommandSchema"]
    };
    const validNonInputTool = {
      ...validAssembleTool,
      id: "builder-tool.input-source.list",
      toolName: "tool:list-builder-tools",
      displayName: "List builder tools",
      description: "List local builder tools.",
      actionName: "list-builder-tools",
      argumentsSchema: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        type: "object",
        fields: {},
        allowUnknown: false
      },
      argumentSummary: "args: none",
      acceptedInputSources: [],
      inputSourceSummary: "input: none",
      requiredContracts: ["BuilderToolDefinitionSchema"]
    };

    expect(PublicContractSchemas.BuilderToolDefinitionSchema.safeParse(validAssembleTool).success).toBe(true);
    expect(PublicContractSchemas.BuilderToolDefinitionSchema.safeParse(validNonInputTool).success).toBe(true);
    expect(PublicContractSchemas.BuilderToolDefinitionSchema.safeParse({
      ...validAssembleTool,
      acceptedInputSources: ["text", "text", "moonshine-transcript"]
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderToolDefinitionSchema.safeParse({
      ...validAssembleTool,
      acceptedInputSources: ["text"],
      inputSourceSummary: "input: Text"
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderToolDefinitionSchema.safeParse({
      ...validNonInputTool,
      acceptedInputSources: ["text"],
      inputSourceSummary: "input: Text"
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderToolDefinitionSchema.safeParse({
      ...validAssembleTool,
      inputSourceSummary: "input: Transcript, Text"
    }).success).toBe(false);
  });

  it("keeps builder catalog input source options aligned with accepted sources", () => {
    const validCatalog = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-catalog.input-sources",
      version: "1.0.0",
      kind: "builder-catalog",
      defaultTemplateId: "template.memory-match",
      templates: gameTemplateDefinitions,
      tools: builderToolCatalogFixture(),
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
        availableGames: gameTemplateDefinitions.map((template) => template.displayLabel),
        featuredGames: ["Memory Match"],
        assetEdits: ["with dinosaurs"],
        examples: ["Memory game with dinosaurs"],
        summaryLines: ["Available games: Memory Match."]
      },
      service: serviceCatalogFixture(),
      sessions: {
        defaultAssembleSessionId: "service.session",
        sessionBoundActions: ["update", "preview", "get-session", "export-profile", "import-profile", "request-paid-online-assembly"]
      },
      assetEdit: {
        supported: true,
        acceptedKeys: ["theme", "items"],
        maxItems: 12,
        localReplacementFolders: true,
        freeformItemSuffixes: ["1", "2", "3"],
        genericThemeTokens: [],
        availableThemes: [
          {
            theme: "dinosaurs",
            displayLabel: "dinosaurs",
            localReplacementFolder: "dinosaurs",
            aliases: ["dinosaur", "dinosaurs"],
            aliasSummary: "dinosaur, dinosaurs",
            suggestedItemSummary: "dinosaur-1, dinosaur-2",
            suggestedItems: ["dinosaur-1", "dinosaur-2"]
          }
        ]
      },
      retrieval: {
        current: "bundled-local",
      }
    };

    expect(BuilderCatalogSchema.safeParse(validCatalog).success).toBe(true);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      requestTips: {
        ...validCatalog.requestTips,
        availableGames: validCatalog.requestTips.availableGames.slice(0, 1)
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      requestTips: {
        ...validCatalog.requestTips,
        availableGames: [...validCatalog.requestTips.availableGames, validCatalog.requestTips.availableGames[0]!]
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      requestTips: {
        ...validCatalog.requestTips,
        featuredGames: ["Memory Match", "Memory Match"]
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      requestTips: {
        ...validCatalog.requestTips,
        featuredGames: ["Unknown Game"]
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      requestTips: {
        ...validCatalog.requestTips,
        assetEdits: ["with toys"]
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      requestTips: {
        ...validCatalog.requestTips,
        examples: ["Memory game with dinosaurs", "Memory game with dinosaurs"]
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      tools: validCatalog.tools.filter((tool) => tool.actionName !== "export-profile")
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      tools: [...validCatalog.tools, validCatalog.tools[0]]
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      defaultTemplateId: "template.missing"
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      templates: [...validCatalog.templates, validCatalog.templates[0]]
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      templates: validCatalog.templates.map((template, index) =>
        index === 0
          ? {
              ...template,
              localFirst: false
            }
          : template
      )
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      assetEdit: {
        ...validCatalog.assetEdit,
        acceptedKeys: ["theme"]
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      assetEdit: {
        ...validCatalog.assetEdit,
        availableThemes: []
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      assetEdit: {
        ...validCatalog.assetEdit,
        availableThemes: [...validCatalog.assetEdit.availableThemes, validCatalog.assetEdit.availableThemes[0]!]
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      assetEdit: {
        ...validCatalog.assetEdit,
        availableThemes: [
          ...validCatalog.assetEdit.availableThemes,
          {
            ...validCatalog.assetEdit.availableThemes[0]!,
            theme: "toys"
          }
        ]
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      assetEdit: {
        ...validCatalog.assetEdit,
        availableThemes: [
          ...validCatalog.assetEdit.availableThemes,
          {
            ...validCatalog.assetEdit.availableThemes[0]!,
            aliases: ["dinosaurs"],
            localReplacementFolder: "toys",
            theme: "toys"
          }
        ]
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      assetEdit: {
        ...validCatalog.assetEdit,
        availableThemes: validCatalog.assetEdit.availableThemes.map((entry) => ({
          ...entry,
          suggestedItems: []
        }))
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      acceptedInputSources: ["text", "text", "moonshine-transcript"]
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      acceptedInputSources: ["text"]
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      input: {
        ...validCatalog.input,
        sourceOptions: validCatalog.input.sourceOptions.slice(0, 1)
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      sessions: {
        ...validCatalog.sessions,
        sessionBoundActions: ["update", "update", "preview", "get-session", "export-profile", "import-profile"]
      }
    }).success).toBe(false);
    expect(BuilderCatalogSchema.safeParse({
      ...validCatalog,
      sessions: {
        ...validCatalog.sessions,
        sessionBoundActions: ["update", "preview", "get-session", "export-profile"]
      }
    }).success).toBe(false);
  });

  it("keeps service catalog action metadata aligned with action ownership", () => {
    const validAssembleAction = {
      actionName: "assemble",
      displayName: "Assemble",
      requiresSession: false,
      acceptsInput: true,
      request: {
        acceptedFields: ["sessionId", "text", "source", "moonshineTranscript", "templateId", "assetEdit"],
        requiredFields: [],
        requiredAnyOf: [["text", "moonshineTranscript"]],
        exclusiveAnyOf: [["text", "moonshineTranscript"]],
        forbiddenTogether: [],
        summary: "Requires text or a Moonshine transcript record."
      },
      responsePayload: "execution"
    };
    const validPreviewAction = {
      actionName: "preview",
      displayName: "Preview",
      requiresSession: true,
      acceptsInput: false,
      request: {
        acceptedFields: ["sessionId", "interaction"],
        requiredFields: ["sessionId", "interaction"],
        requiredAnyOf: [],
        exclusiveAnyOf: [],
        forbiddenTogether: [],
        summary: "Requires sessionId and an explicit interaction."
      },
      responsePayload: "execution"
    };

    expect(BuilderServiceCatalogActionSchema.safeParse(validAssembleAction).success).toBe(true);
    expect(BuilderServiceCatalogActionSchema.safeParse(validPreviewAction).success).toBe(true);
    expect(BuilderServiceCatalogActionSchema.safeParse({
      ...validAssembleAction,
      acceptsInput: false
    }).success).toBe(false);
    expect(BuilderServiceCatalogActionSchema.safeParse({
      ...validAssembleAction,
      responsePayload: "catalog"
    }).success).toBe(false);
    expect(BuilderServiceCatalogActionSchema.safeParse({
      ...validAssembleAction,
      request: {
        ...validAssembleAction.request,
        acceptedFields: ["sessionId", "text", "source", "templateId", "assetEdit"]
      }
    }).success).toBe(false);
    expect(BuilderServiceCatalogActionSchema.safeParse({
      ...validPreviewAction,
      requiresSession: false
    }).success).toBe(false);
    expect(BuilderServiceCatalogActionSchema.safeParse({
      ...validPreviewAction,
      request: {
        ...validPreviewAction.request,
        acceptedFields: ["sessionId", "interaction", "text"]
      }
    }).success).toBe(false);
    expect(BuilderServiceCatalogActionSchema.safeParse({
      ...validPreviewAction,
      request: {
        ...validPreviewAction.request,
        requiredFields: ["sessionId", "templateId"]
      }
    }).success).toBe(false);
  });

  it("keeps service catalogs complete and action-unique", () => {
    const validServiceCatalog = serviceCatalogFixture();

    expect(BuilderServiceCatalogSchema.safeParse(validServiceCatalog).success).toBe(true);
    expect(BuilderServiceCatalogSchema.safeParse({
      ...validServiceCatalog,
      actions: validServiceCatalog.actions.filter((entry) => entry.actionName !== "reset")
    }).success).toBe(false);
    expect(BuilderServiceCatalogSchema.safeParse({
      ...validServiceCatalog,
      actions: [...validServiceCatalog.actions, validServiceCatalog.actions[0]]
    }).success).toBe(false);
  });

  it("keeps session snapshots active-profile consistent", () => {
    const profile = assembleMvpProfiles()[0];
    const preview = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      sessionId: "session.snapshot-consistency",
      activeProfileId: profile.id,
      activeTemplateId: "template.memory-match",
      interactionCount: 0
    };
    const baseSession = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      kind: "builder-session-snapshot",
      sessionId: "session.snapshot-consistency",
      activeProfileId: profile.id,
      activeTemplateId: "template.memory-match",
      profile,
      preview,
      validation: profile.validation,
      updatedAt: "2026-07-04T00:00:00.000Z"
    };

    expect(PublicContractSchemas.BuilderSessionSnapshotSchema.safeParse(baseSession).success).toBe(true);
    expect(PublicContractSchemas.BuilderSessionSnapshotSchema.safeParse({
      ...baseSession,
      activeProfileId: undefined,
      activeTemplateId: undefined,
      profile: undefined,
      preview: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        sessionId: "session.snapshot-consistency",
        interactionCount: 0
      },
      validation: undefined
    }).success).toBe(true);
    expect(PublicContractSchemas.BuilderSessionSnapshotSchema.safeParse({
      ...baseSession,
      profile: undefined
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderSessionSnapshotSchema.safeParse({
      ...baseSession,
      activeProfileId: undefined
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderSessionSnapshotSchema.safeParse({
      ...baseSession,
      activeProfileId: "profile.other"
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderSessionSnapshotSchema.safeParse({
      ...baseSession,
      activeTemplateId: undefined
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderSessionSnapshotSchema.safeParse({
      ...baseSession,
      activeTemplateId: "template.sorting"
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderSessionSnapshotSchema.safeParse({
      ...baseSession,
      preview: {
        ...preview,
        activeTemplateId: undefined
      }
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderSessionSnapshotSchema.safeParse({
      ...baseSession,
      preview: {
        ...preview,
        activeTemplateId: "template.sorting"
      }
    }).success).toBe(false);
  });

  it("keeps command result profiles aligned with preview active profile ids", () => {
    const profile = assembleMvpProfiles()[0];
    const baseResult = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-result.profile-consistency",
      version: "1.0.0",
      kind: "builder-command-result",
      commandId: "builder-command.profile-consistency",
      sessionId: "session.profile-consistency",
      profile,
      preview: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        sessionId: "session.profile-consistency",
        activeProfileId: profile.id,
        activeTemplateId: "template.memory-match",
        interactionCount: 0
      },
      validation: profile.validation
    };

    expect(PublicContractSchemas.BuilderCommandResultSchema.safeParse(baseResult).success).toBe(true);
    expect(PublicContractSchemas.BuilderCommandResultSchema.safeParse({
      ...baseResult,
      profile: undefined,
      preview: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        sessionId: "session.profile-consistency",
        interactionCount: 0
      },
      validation: undefined
    }).success).toBe(true);
    expect(PublicContractSchemas.BuilderCommandResultSchema.safeParse({
      ...baseResult,
      preview: {
        ...baseResult.preview,
        activeProfileId: undefined
      }
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderCommandResultSchema.safeParse({
      ...baseResult,
      preview: {
        ...baseResult.preview,
        activeProfileId: "profile.other"
      }
    }).success).toBe(false);
  });

  it("keeps profile exports self-describing and active-profile consistent", () => {
    const profile = assembleMvpProfiles()[0];
    const profileWithoutTemplate = {
      ...profile,
      template: undefined
    };
    const baseExport = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-profile-export.profile-consistency",
      version: "1.0.0",
      kind: "builder-profile-export",
      sessionId: "session.profile-export-consistency",
      templateId: "template.memory-match",
      profile,
      preview: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        sessionId: "session.profile-export-consistency",
        activeProfileId: profile.id,
        activeTemplateId: "template.memory-match",
        interactionCount: 0
      },
      validation: profile.validation,
      exportedAt: "2026-07-06T00:00:00.000Z",
      provenance: {
        source: "local-llm-agent",
        agentEngine: "lfm2.5-vl-450m-extract",
        assembledBy: "playcraft-profile-consistency",
        assembledAt: "2026-07-06T00:00:00.000Z",
        agentTranscriptId: "agent-transcript.session.profile-export-consistency"
      }
    };

    expect(PublicContractSchemas.BuilderProfileExportSchema.safeParse(baseExport).success).toBe(true);
    expect(PublicContractSchemas.BuilderProfileExportSchema.safeParse({
      ...baseExport,
      provenance: undefined
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderProfileExportSchema.safeParse({
      ...baseExport,
      provenance: {
        source: "local-llm-agent",
        assembledAt: "2026-07-06T00:00:00.000Z"
      }
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderProfileExportSchema.safeParse({
      ...baseExport,
      preview: undefined
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderProfileExportSchema.safeParse({
      ...baseExport,
      validation: undefined
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderProfileExportSchema.safeParse({
      ...baseExport,
      templateId: undefined
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderProfileExportSchema.safeParse({
      ...baseExport,
      profile: profileWithoutTemplate
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderProfileExportSchema.safeParse({
      ...baseExport,
      templateId: "template.sorting"
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderProfileExportSchema.safeParse({
      ...baseExport,
      preview: {
        ...baseExport.preview,
        activeTemplateId: undefined
      }
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderProfileExportSchema.safeParse({
      ...baseExport,
      preview: {
        ...baseExport.preview,
        activeTemplateId: "template.sorting"
      }
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderProfileExportSchema.safeParse({
      ...baseExport,
      preview: {
        ...baseExport.preview,
        activeProfileId: undefined
      }
    }).success).toBe(false);
    expect(PublicContractSchemas.BuilderProfileExportSchema.safeParse({
      ...baseExport,
      preview: {
        ...baseExport.preview,
        activeProfileId: "profile.other"
      }
    }).success).toBe(false);
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
        moonshineConfig: {
          engine: "moonshine-streaming",
          runtime: "cpu",
          localOnly: true
        },
        receivedAt: "2026-07-04T00:00:00.000Z"
      }).success
    ).toBe(false);

    const moonshineTranscript = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "moonshine-transcript.test.dual-input",
      version: "1.0.0",
      kind: "moonshine-transcript",
      transcriptId: "moonshine-transcript.test.dual-input",
      engine: "moonshine-streaming",
      runtime: "cpu",
      localOnly: true,
      finalized: true,
      text: "memory game with dinosaurs",
      receivedAt: "2026-07-04T00:00:00.000Z",
      segments: [],
      metadata: {
        origin: "contract-test"
      }
    };
    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.dual-input",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "assemble",
        source: "moonshine-transcript",
        moonshineTranscript,
        text: moonshineTranscript.text
      }).success
    ).toBe(false);

    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.transcript-without-source",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "assemble",
        moonshineTranscript
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
        interaction: { action: "primary" },
        text: "memory game with dinosaurs"
      }).success
    ).toBe(false);

    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.preview-without-interaction",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "preview",
        sessionId: "session.preview"
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
        id: "builder-service-request.test.catalog-with-interaction",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "catalog",
        interaction: { action: "primary" }
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
        id: "builder-service-request.test.catalog-with-session",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "catalog",
        sessionId: "session.catalog"
      }).success
    ).toBe(false);

    expect(
      BuilderServiceRequestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.reset-with-session",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "reset",
        sessionId: "session.reset"
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
          }
        }
      }).success
    ).toBe(false);
  });

  it("validates non-empty batches of exact service request envelopes", () => {
    expect(
      BuilderServiceRequestBatchSchema.parse([
        {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: "builder-service-request-batch.test.assemble",
          version: "1.0.0",
          kind: "builder-service-request",
          actionName: "assemble",
          sessionId: "session.batch-contract",
          text: "Memory game with dinosaurs"
        },
        {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: "builder-service-request-batch.test.export",
          version: "1.0.0",
          kind: "builder-service-request",
          actionName: "export-profile",
          sessionId: "session.batch-contract"
        }
      ]).map((request) => request.actionName)
    ).toEqual(["assemble", "export-profile"]);

    expect(BuilderServiceRequestBatchSchema.safeParse([]).success).toBe(false);
    expect(
      BuilderServiceRequestBatchSchema.safeParse([
        {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: "builder-service-request-batch.test.invalid-catalog",
          version: "1.0.0",
          kind: "builder-service-request",
          actionName: "catalog",
          text: "Memory game with dinosaurs"
        }
      ]).success
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
      acceptedInputSources: ["text", "moonshine-transcript"],
      inputSourceSummary: "input: Text, Transcript",
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
          acceptedInputSources: ["text", "moonshine-transcript"],
          assetEdit: {
            supported: true,
            acceptedKeys: ["theme"],
            maxItems: 12,
            localReplacementFolders: true,
            availableThemes: []
          },
          retrieval: {
            current: "bundled-local",
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

  it("validates MCP manifests", () => {
    expect(
      McpManifestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "mcp-manifest.test",
        version: "1.0.0",
        kind: "mcp-manifest",
        name: "test-manifest",
        tools: [
          {
            name: "tool:test",
            description: "A test tool",
            parameters: {
              arg1: {
                name: "arg1",
                type: "string",
                description: "A test argument",
                required: true
              }
            }
          }
        ]
      }).success
    ).toBe(true);

    expect(
      McpManifestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "mcp-manifest.test",
        version: "1.0.0",
        kind: "mcp-manifest",
        name: "test-manifest"
      }).success
    ).toBe(false);
  });

  it("validates MCP tools", () => {
    expect(
      McpToolSchema.safeParse({
        name: "tool:test",
        description: "A test tool",
        parameters: {
          arg1: {
            name: "arg1",
            type: "string",
            description: "A test argument",
            required: true
          }
        }
      }).success
    ).toBe(true);
  });

  it("validates MCP server policy with all true literals", () => {
    expect(McpServerPolicySchema.safeParse(PLAYCRAFT_MCP_GUARDRAILS).success).toBe(true);
    expect(PLAYCRAFT_MCP_GUARDRAILS.allowlistedTools).toEqual([
      "assemble-game",
      "update-game",
      "preview-action",
      "list-builder-tools",
      "get-session",
      "export-profile",
      "import-profile",
      "list-building-blocks",
      "compose-profile",
      "list-local-assets",
      "package-bundle"
    ]);
  });

  it("rejects MCP server policy with localOnly: false", () => {
    expect(
      McpServerPolicySchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "mcp-server-policy.test",
        version: "1.0.0",
        kind: "mcp-server-policy",
        localOnly: false,
        noAuth: true,
        noNetworkExecution: true,
        noDatabaseAccess: true,
        allowlistedTools: ["assemble-game"]
      }).success
    ).toBe(false);
  });

  it("rejects MCP server policy with noAuth: false", () => {
    expect(
      McpServerPolicySchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "mcp-server-policy.test",
        version: "1.0.0",
        kind: "mcp-server-policy",
        localOnly: true,
        noAuth: false,
        noNetworkExecution: true,
        noDatabaseAccess: true,
        allowlistedTools: ["assemble-game"]
      }).success
    ).toBe(false);
  });

  it("rejects MCP server policy with empty allowlistedTools", () => {
    expect(
      McpServerPolicySchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "mcp-server-policy.test",
        version: "1.0.0",
        kind: "mcp-server-policy",
        localOnly: true,
        noAuth: true,
        noNetworkExecution: true,
        noDatabaseAccess: true,
        allowlistedTools: []
      }).success
    ).toBe(false);
  });

  it("rejects MCP server policy with unknown tool in allowlistedTools", () => {
    expect(
      McpServerPolicySchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "mcp-server-policy.test",
        version: "1.0.0",
        kind: "mcp-server-policy",
        localOnly: true,
        noAuth: true,
        noNetworkExecution: true,
        noDatabaseAccess: true,
        allowlistedTools: ["unknown-tool"]
      }).success
    ).toBe(false);
  });

  it("discriminates SSE frame kinds", () => {
    expect(SseFrameSchema.safeParse({
      kind: "sse-run-started",
      runId: "run.test",
      sequence: 0,
      payload: { runId: "run.test" }
    }).success).toBe(true);

    expect(SseFrameSchema.safeParse({
      kind: "sse-tool-call",
      runId: "run.test",
      sequence: 1,
      payload: { toolName: "tool:test", args: {} }
    }).success).toBe(true);

    expect(SseFrameSchema.safeParse({
      kind: "sse-tool-result",
      runId: "run.test",
      sequence: 2,
      payload: { toolName: "tool:test", result: "ok" }
    }).success).toBe(true);

    expect(SseFrameSchema.safeParse({
      kind: "sse-custom",
      runId: "run.test",
      sequence: 3,
      payload: { data: "custom" }
    }).success).toBe(true);

    expect(SseFrameSchema.safeParse({
      kind: "sse-run-finished",
      runId: "run.test",
      sequence: 4,
      payload: { runId: "run.test" }
    }).success).toBe(true);

    expect(SseFrameSchema.safeParse({
      kind: "sse-run-error",
      runId: "run.test",
      sequence: 5,
      payload: { message: "error" }
    }).success).toBe(true);

    expect(SseFrameSchema.safeParse({
      kind: "sse-unknown",
      runId: "run.test",
      sequence: 6,
      payload: {}
    }).success).toBe(false);
  });

  it("validates workflow graphs", () => {
    expect(
      WorkflowGraphSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "workflow-graph.test",
        version: "1.0.0",
        kind: "workflow-graph",
        nodes: [
          { id: "node-1", actionName: "catalog", payload: {}, dependsOn: [] },
          { id: "node-2", actionName: "assemble", payload: {}, dependsOn: ["node-1"] }
        ],
        edges: [{ from: "node-1", to: "node-2" }],
        startNodeId: "node-1"
      }).success
    ).toBe(true);

    expect(
      WorkflowGraphSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "workflow-graph.test",
        version: "1.0.0",
        kind: "workflow-graph",
        nodes: [
          { id: "node-1", actionName: "catalog", payload: {}, dependsOn: [] },
          { id: "node-2", actionName: "assemble", payload: {}, dependsOn: ["node-1"] }
        ],
        edges: [{ from: "node-1", to: "node-2" }, { from: "node-2", to: "node-1" }],
        startNodeId: "node-1"
      }).success
    ).toBe(false);

    const manyNodes = Array.from({ length: 21 }, (_, index) => ({
      id: `node-${index}`,
      actionName: "catalog" as const,
      payload: {},
      dependsOn: [] as string[]
    }));

    expect(
      WorkflowGraphSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "workflow-graph.test",
        version: "1.0.0",
        kind: "workflow-graph",
        nodes: manyNodes,
        edges: [],
        startNodeId: "node-0"
      }).success
    ).toBe(false);
  });

  it("validates session ownership", () => {
    expect(
      BuilderSessionOwnershipSchema.safeParse({
        ownerId: "owner.test",
        createdAt: "2026-07-04T00:00:00.000Z",
        expiresAt: "2026-07-05T00:00:00.000Z",
        capabilities: ["capability:test"]
      }).success
    ).toBe(true);

    expect(
      BuilderSessionOwnershipSchema.safeParse({
        ownerId: "owner.test",
        createdAt: "2026-07-05T00:00:00.000Z",
        expiresAt: "2026-07-04T00:00:00.000Z",
        capabilities: ["capability:test"]
      }).success
    ).toBe(false);
  });

  it("validates asset catalog manifests", () => {
    expect(
      AssetCatalogManifestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "asset-catalog-manifest.test",
        version: "1.0.0",
        kind: "asset-catalog-manifest",
        source: "catalog.json",
        theme: "dinosaurs",
        displayLabel: "Dinosaurs",
        aliases: ["dinosaur"],
        suggestedItems: ["dinosaur-1", "dinosaur-2"],
        spriteNaming: {
          kind: "ordinal",
          rules: {}
        }
      }).success
    ).toBe(true);

    expect(
      AssetCatalogManifestSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "asset-catalog-manifest.test",
        version: "1.0.0",
        kind: "asset-catalog-manifest",
        source: "manifest.json",
        theme: "dinosaurs",
        displayLabel: "Dinosaurs",
        aliases: ["dinosaur"],
        suggestedItems: ["dinosaur-1", "dinosaur-2"],
        spriteNaming: {
          kind: "ordinal",
          rules: {}
        }
      }).success
    ).toBe(false);
  });

  it("enforces custom template namespace", () => {
    expect(BuilderTemplateNamespaceSchema.safeParse("template.custom.foo").success).toBe(true);
    expect(BuilderTemplateNamespaceSchema.safeParse("template.memory-match").success).toBe(false);
  });

  it("keeps builder catalogs backward compatible without mcp", () => {
    const validCatalog = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-catalog.backward-compat",
      version: "1.0.0",
      kind: "builder-catalog",
      defaultTemplateId: "template.memory-match",
      templates: gameTemplateDefinitions,
      tools: builderToolCatalogFixture(),
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
        availableGames: gameTemplateDefinitions.map((template) => template.displayLabel),
        featuredGames: ["Memory Match"],
        assetEdits: ["with dinosaurs"],
        examples: ["Memory game with dinosaurs"],
        summaryLines: ["Available games: Memory Match."]
      },
      service: serviceCatalogFixture(),
      sessions: {
        defaultAssembleSessionId: "service.session",
        sessionBoundActions: ["update", "preview", "get-session", "export-profile", "import-profile", "request-paid-online-assembly"]
      },
      assetEdit: {
        supported: true,
        acceptedKeys: ["theme", "items"],
        maxItems: 12,
        localReplacementFolders: true,
        freeformItemSuffixes: ["1", "2", "3"],
        genericThemeTokens: [],
        availableThemes: [
          {
            theme: "dinosaurs",
            displayLabel: "dinosaurs",
            localReplacementFolder: "dinosaurs",
            aliases: ["dinosaur", "dinosaurs"],
            aliasSummary: "dinosaur, dinosaurs",
            suggestedItemSummary: "dinosaur-1, dinosaur-2",
            suggestedItems: ["dinosaur-1", "dinosaur-2"]
          }
        ]
      },
      retrieval: {
        current: "bundled-local",
      }
    };

    expect(BuilderCatalogSchema.safeParse(validCatalog).success).toBe(true);
  });

  it("keeps builder session snapshots backward compatible without ownership", () => {
    const profile = assembleMvpProfiles()[0];
    const preview = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      sessionId: "session.backward-compat",
      activeProfileId: profile.id,
      activeTemplateId: "template.memory-match",
      interactionCount: 0
    };

    expect(
      BuilderSessionSnapshotSchema.safeParse({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        kind: "builder-session-snapshot",
        sessionId: "session.backward-compat",
        activeProfileId: profile.id,
        activeTemplateId: "template.memory-match",
        profile,
        preview,
        validation: profile.validation,
        updatedAt: "2026-07-04T00:00:00.000Z"
      }).success
    ).toBe(true);
  });
});
