import { describe, expect, it } from "vitest";
import {
  BuilderCatalogSchema,
  BuilderProfileExportSchema,
  BuilderServiceExecutionSchema,
  BuilderServiceRequestSchema,
  BuilderServiceResponseSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderProfileExport,
  type BuilderServiceActionName,
  type BuilderServiceRequest,
  type BuilderServiceRequestFieldName
} from "@playcraft/contracts";
import {
  createBuilderCommandHandler,
  type BuilderCommandHandler
} from "@playcraft/builder";
import { DEFAULT_GAME_TEMPLATE_ID } from "@playcraft/packs";
import {
  PLAYCRAFT_SERVICE_PACKAGE,
  createHttpServiceTransport,
  createLocalServiceTransport,
  createLocalPlaycraftService,
  createMoonshineTranscriptRecord,
  handleServiceHttpRequestBody,
  handleLocalServiceRequest,
  handleLocalServiceRequestBatch,
  resolveBuilderInputCommand
} from "../src/index.js";
import { runLocalServiceCli } from "../src/cli.js";
import {
  PLAYCRAFT_HTTP_SERVICE_POLICY,
  createPlaycraftHttpServer,
  parsePlaycraftHttpServerCliArgs
} from "../src/http-server.js";

const ALL_SERVICE_REQUEST_FIELDS: BuilderServiceRequestFieldName[] = [
  "sessionId",
  "text",
  "source",
  "moonshineTranscript",
  "templateId",
  "assetEdit",
  "interaction",
  "profile",
  "profileExport"
];

type ServiceRequestFixture = BuilderServiceRequest & Partial<Record<BuilderServiceRequestFieldName, unknown>>;

function serviceRequestFixture(actionName: BuilderServiceActionName, input: Partial<BuilderServiceRequest>): ServiceRequestFixture {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `builder-service-request.test.catalog-schema.${actionName}`,
    version: "1.0.0",
    kind: "builder-service-request",
    actionName,
    ...input
  } as ServiceRequestFixture;
}

function serviceRequestFieldSamples(input: {
  profile: BuilderProfileExport["profile"];
  profileExport: BuilderProfileExport;
}): Record<BuilderServiceRequestFieldName, unknown> {
  return {
    assetEdit: { theme: "dinosaurs" },
    moonshineTranscript: createMoonshineTranscriptRecord({
      id: "moonshine-transcript.test.catalog-schema",
      text: "Memory game with dinosaurs"
    }),
    profile: input.profile,
    profileExport: input.profileExport,
    interaction: { action: "primary" },
    sessionId: "session.catalog-schema.sample",
    source: "text",
    templateId: "template.memory-match",
    text: "Memory game with dinosaurs"
  };
}

describe("local Playcraft service", () => {
  it("publishes local tools and bundled templates for shells", () => {
    const service = createLocalPlaycraftService();
    const catalog = service.catalog();

    expect(PLAYCRAFT_SERVICE_PACKAGE).toBe("@playcraft/service");
    expect(catalog.kind).toBe("builder-catalog");
    expect(catalog.defaultTemplateId).toBe(DEFAULT_GAME_TEMPLATE_ID);
    expect(catalog.retrieval).toEqual({
      current: "bundled-local",
      planned: "server-catalog"
    });
    expect(catalog.input).toEqual({
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
    });
    expect(catalog.sessions).toEqual({
      defaultAssembleSessionId: "service.session",
      sessionBoundActions: ["update", "preview", "get-session", "export-profile", "import-profile"]
    });
    expect(catalog.service).toEqual({
      actions: [
        {
          actionName: "catalog",
          displayName: "Catalog",
          requiresSession: false,
          acceptsInput: false,
          request: {
            acceptedFields: [],
            requiredFields: [],
            requiredAnyOf: [],
            exclusiveAnyOf: [],
            forbiddenTogether: [],
            summary: "No payload fields accepted."
          },
          responsePayload: "catalog"
        },
        {
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
            summary: "Requires text or a Moonshine transcript record; sessionId, templateId, source, and assetEdit are optional."
          },
          responsePayload: "execution"
        },
        {
          actionName: "update",
          displayName: "Update",
          requiresSession: true,
          acceptsInput: true,
          request: {
            acceptedFields: ["sessionId", "text", "source", "moonshineTranscript", "templateId", "assetEdit"],
            requiredFields: ["sessionId"],
            requiredAnyOf: [["text", "moonshineTranscript"]],
            exclusiveAnyOf: [["text", "moonshineTranscript"]],
            forbiddenTogether: [],
            summary: "Requires sessionId plus text or a Moonshine transcript record; templateId, source, and assetEdit are optional."
          },
          responsePayload: "execution"
        },
        {
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
            summary: "Requires sessionId and an explicit preview interaction payload; accepts no input, template, asset, or profile payloads."
          },
          responsePayload: "execution"
        },
        {
          actionName: "get-session",
          displayName: "Get Session",
          requiresSession: true,
          acceptsInput: false,
          request: {
            acceptedFields: ["sessionId"],
            requiredFields: ["sessionId"],
            requiredAnyOf: [],
            exclusiveAnyOf: [],
            forbiddenTogether: [],
            summary: "Requires sessionId and returns the current session snapshot."
          },
          responsePayload: "session"
        },
        {
          actionName: "export-profile",
          displayName: "Export Profile",
          requiresSession: true,
          acceptsInput: false,
          request: {
            acceptedFields: ["sessionId"],
            requiredFields: ["sessionId"],
            requiredAnyOf: [],
            exclusiveAnyOf: [],
            forbiddenTogether: [],
            summary: "Requires sessionId and returns a portable profile export."
          },
          responsePayload: "profileExport"
        },
        {
          actionName: "import-profile",
          displayName: "Import Profile",
          requiresSession: true,
          acceptsInput: false,
          request: {
            acceptedFields: ["sessionId", "profile", "profileExport", "assetEdit"],
            requiredFields: ["sessionId"],
            requiredAnyOf: [["profile", "profileExport"]],
            exclusiveAnyOf: [["profile", "profileExport"]],
            forbiddenTogether: [["profileExport", "assetEdit"]],
            summary: "Requires sessionId plus exactly one profile or profileExport; top-level assetEdit is only accepted with profile imports."
          },
          responsePayload: "execution"
        },
        {
          actionName: "reset",
          displayName: "Reset",
          requiresSession: false,
          acceptsInput: false,
          request: {
            acceptedFields: [],
            requiredFields: [],
            requiredAnyOf: [],
            exclusiveAnyOf: [],
            forbiddenTogether: [],
            summary: "No payload fields accepted."
          },
          responsePayload: "reset"
        }
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
    });
    expect(catalog.assetEdit).toMatchObject({
      supported: true,
      acceptedKeys: ["theme", "items"],
      maxItems: 12,
      localReplacementFolders: true,
      freeformItemSuffixes: ["1", "2", "3"],
      availableThemes: expect.arrayContaining([
        expect.objectContaining({
          theme: "dinosaurs",
          displayLabel: "dinosaurs",
          localReplacementFolder: "dinosaurs",
          suggestedItems: ["dinosaur-1", "dinosaur-2", "dinosaur-3"]
        }),
        expect.objectContaining({
          theme: "dolphins",
          displayLabel: "ocean animals",
          localReplacementFolder: "dolphins",
          aliases: expect.arrayContaining(["ocean animals"])
        })
      ])
    });
    expect(catalog.tools.map((tool) => tool.toolName)).toEqual([
      "tool:assemble-game",
      "tool:update-game",
      "tool:preview-action",
      "tool:list-builder-tools",
      "tool:get-session",
      "tool:export-profile",
      "tool:import-profile"
    ]);
    expect(catalog.tools.find((tool) => tool.actionName === "assemble-game")?.argumentsSchema.fields.templateId).toEqual({
      type: "string",
      required: true
    });
    expect(catalog.tools.find((tool) => tool.actionName === "assemble-game")?.acceptedInputSources).toEqual(["text", "moonshine-transcript"]);
    expect(catalog.tools.find((tool) => tool.actionName === "assemble-game")?.inputSourceSummary).toBe("input: Text, Transcript");
    expect(catalog.tools.find((tool) => tool.actionName === "assemble-game")?.argumentSummary).toBe("args: assetEdit:object, input:object, sessionId:string, templateId*:string");
    expect(catalog.tools.find((tool) => tool.actionName === "preview-action")?.acceptedInputSources).toEqual([]);
    expect(catalog.tools.find((tool) => tool.actionName === "preview-action")?.inputSourceSummary).toBe("input: none");
    expect(catalog.tools.find((tool) => tool.actionName === "preview-action")?.argumentSummary).toBe("args: interaction*:object, sessionId*:string");
    expect(catalog.tools.find((tool) => tool.actionName === "get-session")?.acceptedInputSources).toEqual([]);
    expect(catalog.tools.find((tool) => tool.actionName === "get-session")?.requiredContracts).toEqual(["BuilderCommandSchema", "BuilderSessionSnapshotSchema"]);
    expect(catalog.tools.find((tool) => tool.actionName === "export-profile")?.requiredContracts).toEqual(["BuilderCommandSchema", "BuilderProfileExportSchema"]);
    expect(catalog.tools.find((tool) => tool.actionName === "import-profile")?.requiredContracts).toEqual(["BuilderCommandSchema", "GameAssemblyProfileSchema"]);
    expect(catalog.tools.find((tool) => tool.actionName === "update-game")?.argumentsSchema.fields.sessionId).toEqual({
      type: "string",
      required: true
    });
    expect(catalog.tools.find((tool) => tool.actionName === "preview-action")?.argumentsSchema.fields.interaction).toEqual({
      allowUnknown: false,
      fields: {
        action: {
          allowedValues: ["primary"],
          required: true,
          type: "string"
        }
      },
      type: "object",
      required: true
    });
    expect(catalog.tools.find((tool) => tool.actionName === "import-profile")?.argumentsSchema.fields.profile).toEqual({
      type: "object",
      required: true
    });
    expect(catalog.templates).toHaveLength(24);
    expect(catalog.templates.slice(0, 3).map((template) => template.id)).toEqual([
      "template.memory-match",
      "template.sorting",
      "template.sequence-repeat"
    ]);
    expect(catalog.templates.map((template) => template.id)).toEqual(expect.arrayContaining([
      "template.color-sorting",
      "template.shape-memory",
      "template.daily-routine",
      "template.animal-sound-pattern"
    ]));
    expect(catalog.templates.find((template) => template.id === "template.memory-match")?.requestAliases).toContain("matching cards");
    expect(catalog.templates.slice(0, 3).map((template) => template.exampleRequest)).toEqual([
      "Memory game",
      "Sorting game",
      "Sequence repeat"
    ]);
    expect(catalog.templates.slice(0, 5).map((template) => template.displayLabel)).toEqual([
      "Memory Match",
      "Sorting",
      "Sequence Repeat",
      "Shape Memory",
      "Color Memory"
    ]);
  });

  it("keeps service catalog request metadata aligned with the request schema", () => {
    const service = createLocalPlaycraftService();
    const assembled = service.assemble({
      sessionId: "session.catalog-schema",
      source: "text",
      text: "Memory game with dinosaurs"
    });
    const profileExport = service.exportProfile(assembled.result.sessionId);
    const profile = profileExport.profile;
    const catalog = service.catalog();
    const minimalRequests: Record<BuilderServiceActionName, BuilderServiceRequest> = {
      assemble: serviceRequestFixture("assemble", {
        text: "Memory game with dinosaurs"
      }),
      catalog: serviceRequestFixture("catalog", {}),
      "export-profile": serviceRequestFixture("export-profile", {
        sessionId: "session.catalog-schema"
      }),
      "get-session": serviceRequestFixture("get-session", {
        sessionId: "session.catalog-schema"
      }),
      "import-profile": serviceRequestFixture("import-profile", {
        profileExport,
        sessionId: "session.catalog-schema.import"
      }),
      preview: serviceRequestFixture("preview", {
        interaction: { action: "primary" },
        sessionId: "session.catalog-schema"
      }),
      reset: serviceRequestFixture("reset", {}),
      update: serviceRequestFixture("update", {
        sessionId: "session.catalog-schema",
        text: "Change the cards to toys"
      })
    };
    const sampleFields = serviceRequestFieldSamples({ profile, profileExport });

    for (const action of catalog.service.actions) {
      const minimalRequest = minimalRequests[action.actionName];
      expect(BuilderServiceRequestSchema.safeParse(minimalRequest).success, action.actionName).toBe(true);

      for (const field of action.request.requiredFields) {
        const withoutRequiredField = { ...minimalRequest };
        delete withoutRequiredField[field];
        expect(BuilderServiceRequestSchema.safeParse(withoutRequiredField).success, `${action.actionName} missing ${field}`).toBe(false);
      }

      for (const group of action.request.requiredAnyOf) {
        const withoutRequiredGroup = { ...minimalRequest };
        for (const field of group) {
          delete withoutRequiredGroup[field];
        }
        expect(BuilderServiceRequestSchema.safeParse(withoutRequiredGroup).success, `${action.actionName} missing ${group.join("|")}`).toBe(false);
      }

      for (const group of action.request.exclusiveAnyOf) {
        const withExclusiveGroup = serviceRequestFixture(action.actionName, {});
        for (const field of action.request.requiredFields) {
          withExclusiveGroup[field] = sampleFields[field];
        }
        for (const field of group) {
          withExclusiveGroup[field] = sampleFields[field];
        }
        expect(BuilderServiceRequestSchema.safeParse(withExclusiveGroup).success, `${action.actionName} exclusive ${group.join("|")}`).toBe(false);
      }

      for (const group of action.request.forbiddenTogether) {
        const withForbiddenGroup = { ...minimalRequest };
        for (const field of group) {
          withForbiddenGroup[field] = sampleFields[field];
        }
        expect(BuilderServiceRequestSchema.safeParse(withForbiddenGroup).success, `${action.actionName} forbidden ${group.join("|")}`).toBe(false);
      }

      for (const field of ALL_SERVICE_REQUEST_FIELDS) {
        if (action.request.acceptedFields.includes(field)) {
          continue;
        }
        const withUnacceptedField = { ...minimalRequest, [field]: sampleFields[field] };
        expect(BuilderServiceRequestSchema.safeParse(withUnacceptedField).success, `${action.actionName} unaccepted ${field}`).toBe(false);
      }
    }
  });

  it("assembles and updates games through text or local Moonshine transcripts", () => {
    const service = createLocalPlaycraftService();
    const transcript = createMoonshineTranscriptRecord({
      id: "moonshine-transcript.test.assemble",
      text: "Memory game with dinosaurs"
    });
    const assembled = service.assemble({
      source: "moonshine-transcript",
      moonshineTranscript: transcript
    });
    const updated = service.update({
      sessionId: assembled.result.sessionId,
      source: "text",
      text: "Change to sorting with fruits"
    });

    expect(assembled.result.profile?.id).toBe("profile.memory-match.mvp");
    expect(assembled.result.sessionId).toBe(service.catalog().sessions.defaultAssembleSessionId);
    expect(assembled.events.some((event) => JSON.stringify(event.value).includes("moonshine-streaming"))).toBe(true);
    expect(updated.result.profile?.id).toBe("profile.sorting.mvp");
    expect(updated.result.profile?.assetRequests[0]?.prompt).toContain("fruits sorting game illustrations");
  });

  it("rejects updates for sessions without an active assembled game", () => {
    const service = createLocalPlaycraftService();

    expect(() =>
      service.update({
        sessionId: "session.no-active-game",
        source: "text",
        text: "make it more colorful"
      })
    ).toThrow(/update requires an active session session\.no-active-game/u);

    expect(() =>
      service.handle({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.update-empty-session",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "update",
        sessionId: "session.no-active-game.envelope",
        source: "text",
        text: "make it more colorful"
      })
    ).toThrow(/update requires an active session session\.no-active-game\.envelope/u);
  });

  it("normalizes explicit Moonshine Streaming CPU transcript records through service requests", () => {
    const service = createLocalPlaycraftService();
    const transcript = createMoonshineTranscriptRecord({
      id: "moonshine-transcript.test.service-request",
      segments: [
        {
          text: "Sort shapes by color",
          startMs: 0,
          endMs: 1200
        }
      ],
      text: "Sort shapes by color"
    });
    const response = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.transcript-record",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.transcript-record",
      source: "moonshine-transcript",
      moonshineTranscript: transcript
    });
    const serializedEvents = JSON.stringify(response.execution?.events);

    expect(response.execution?.result.profile?.id).toBe("profile.sorting.mvp");
    expect(serializedEvents).toContain("moonshine-streaming");
    expect(serializedEvents).toContain("moonshine-transcript.test.service-request");
    expect(serializedEvents).toContain("moonshineTranscriptId");
  });

  it("rejects non-JSON builder events instead of coercing them through serialization", () => {
    const baseHandler = createBuilderCommandHandler();
    const handler: BuilderCommandHandler = {
      assembleTemplates: (...args) => baseHandler.assembleTemplates(...args),
      getSessionSnapshot: (...args) => baseHandler.getSessionSnapshot(...args),
      importProfile: (...args) => baseHandler.importProfile(...args),
      listTemplates: () => baseHandler.listTemplates(),
      listTools: () => baseHandler.listTools(),
      execute(command) {
        const output = baseHandler.execute(command);
        return {
          ...output,
          events: [
            ...output.events,
            {
              type: "ToolResult",
              eventId: "agui.service.bad-json.0001",
              runId: "run.service.bad-json",
              timestamp: "2026-07-04T00:00:00.000Z",
              value: {
                generatedAt: new Date("2026-07-04T00:00:00.000Z")
              }
            }
          ]
        };
      }
    };
    const service = createLocalPlaycraftService(handler);

    expect(() =>
      service.handle({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.non-json-event",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "assemble",
        sessionId: "session.non-json-event",
        text: "Memory game with dinosaurs"
      })
    ).toThrow(/non-plain object/u);
  });

  it("rejects builder results that omit active template ids instead of preserving prior session state", () => {
    const baseHandler = createBuilderCommandHandler();
    const handler: BuilderCommandHandler = {
      assembleTemplates: (...args) => baseHandler.assembleTemplates(...args),
      getSessionSnapshot: (...args) => baseHandler.getSessionSnapshot(...args),
      importProfile: (...args) => baseHandler.importProfile(...args),
      listTemplates: () => baseHandler.listTemplates(),
      listTools: () => baseHandler.listTools(),
      execute(command) {
        const output = baseHandler.execute(command);
        const preview = { ...output.result.preview };
        delete preview.activeTemplateId;
        return {
          ...output,
          result: {
            ...output.result,
            preview
          }
        };
      }
    };
    const service = createLocalPlaycraftService(handler);

    expect(() =>
      service.handle({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.missing-template-result",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "assemble",
        sessionId: "session.missing-template-result",
        source: "text",
        text: "Memory game with dinosaurs"
      })
    ).toThrow(/requires activeTemplateId/u);
  });

  it("rejects imported profile results that omit active template ids before storing session state", () => {
    const baseHandler = createBuilderCommandHandler();
    const assembled = baseHandler.execute({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-command.test.import-source",
      version: "1.0.0",
      kind: "builder-command",
      sessionId: "session.import-source",
      actionName: "assemble-game",
      templateId: "template.memory-match"
    });
    const profile = assembled.result.profile;
    if (!profile) {
      throw new Error("expected assembled profile fixture");
    }
    const handler: BuilderCommandHandler = {
      assembleTemplates: (...args) => baseHandler.assembleTemplates(...args),
      execute: (...args) => baseHandler.execute(...args),
      getSessionSnapshot: (...args) => baseHandler.getSessionSnapshot(...args),
      listTemplates: () => baseHandler.listTemplates(),
      listTools: () => baseHandler.listTools(),
      importProfile(...args) {
        const output = baseHandler.importProfile(...args);
        const preview = { ...output.result.preview };
        delete preview.activeTemplateId;
        return {
          ...output,
          result: {
            ...output.result,
            preview
          }
        };
      }
    };
    const service = createLocalPlaycraftService(handler);

    expect(() =>
      service.handle({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.missing-template-import",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "import-profile",
        sessionId: "session.missing-template-import",
        profile
      })
    ).toThrow(/requires activeTemplateId/u);
  });

  it("rejects session snapshots missing active template ids instead of restoring local state", () => {
    const baseHandler = createBuilderCommandHandler();
    const handler: BuilderCommandHandler = {
      assembleTemplates: (...args) => baseHandler.assembleTemplates(...args),
      execute: (...args) => baseHandler.execute(...args),
      importProfile: (...args) => baseHandler.importProfile(...args),
      listTemplates: () => baseHandler.listTemplates(),
      listTools: () => baseHandler.listTools(),
      getSessionSnapshot(...args) {
        const snapshot = baseHandler.getSessionSnapshot(...args);
        return {
          ...snapshot,
          activeTemplateId: undefined,
          preview: {
            ...snapshot.preview,
            activeTemplateId: undefined
          }
        };
      }
    };
    const service = createLocalPlaycraftService(handler);

    expect(() =>
      service.handle({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.missing-template-snapshot",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "assemble",
        sessionId: "session.missing-template-snapshot",
        source: "text",
        text: "Memory game with dinosaurs"
      })
    ).toThrow(/session snapshots with profile payloads require activeTemplateId/u);
  });

  it("rejects transcript-sourced service requests without Moonshine transcript records", () => {
    const service = createLocalPlaycraftService();

    expect(() =>
      service.handle({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.missing-transcript",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "assemble",
        source: "moonshine-transcript",
        text: "Memory game with dinosaurs"
      })
    ).toThrow(/Moonshine transcript record/u);
  });

  it("keeps direct local input source ownership explicit", () => {
    const service = createLocalPlaycraftService();
    const transcript = createMoonshineTranscriptRecord({
      id: "moonshine-transcript.test.direct-source",
      text: "Memory game with dinosaurs"
    });

    expect(() =>
      service.assemble({
        source: "moonshine-transcript"
      })
    ).toThrow(/moonshine-transcript input requires a Moonshine transcript record/u);

    expect(() =>
      service.assemble({
        source: "text",
        moonshineTranscript: transcript
      })
    ).toThrow(/text input must not include Moonshine transcript records/u);
  });

  it("rejects input payloads on no-input service actions", () => {
    const service = createLocalPlaycraftService();

    expect(() =>
      service.handle({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.preview-input",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "preview",
        sessionId: "session.preview-input",
        interaction: { action: "primary" },
        text: "Memory game with dinosaurs"
      })
    ).toThrow(/only assemble and update/u);
  });

  it("handles validated service API requests for local and future server transports", () => {
    const service = createLocalPlaycraftService();
    const transcript = createMoonshineTranscriptRecord({
      id: "moonshine-transcript.test.service-api",
      text: "Memory game with toys"
    });
    const catalog = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.catalog",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "catalog"
    });
    const assembled = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.assemble",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.service-api",
      source: "moonshine-transcript",
      moonshineTranscript: transcript
    });
    const updated = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.update",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "update",
      sessionId: "session.service-api",
      text: "Please group by color with fruit"
    });

    expect(catalog.catalog?.templates.map((template) => template.id)).toContain("template.sequence-repeat");
    expect(assembled.execution?.result.profile?.id).toBe("profile.memory-match.mvp");
    expect(assembled.execution?.events.some((event) => JSON.stringify(event).includes("moonshine-streaming"))).toBe(true);
    expect(updated.execution?.result.profile?.id).toBe("profile.sorting.mvp");
    expect(updated.execution?.result.profile?.assetRequests[0]?.prompt).toContain("fruit sorting game illustrations");
  });

  it("keeps active template and asset edit state isolated per local session", () => {
    const service = createLocalPlaycraftService();

    const alpha = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.session-alpha",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.alpha",
      text: "Memory game with dinosaurs"
    });
    const beta = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.session-beta",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.beta",
      text: "Sort shapes by color with fruits"
    });
    const alphaUpdate = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.session-alpha-update",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "update",
      sessionId: "session.alpha",
      text: "make it toys"
    });
    const betaSession = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.session-beta-get",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "get-session",
      sessionId: "session.beta"
    });

    expect(alpha.session?.activeTemplateId).toBe("template.memory-match");
    expect(beta.session?.activeTemplateId).toBe("template.sorting");
    expect(alphaUpdate.execution?.result.profile?.id).toBe("profile.memory-match.mvp");
    expect(alphaUpdate.session?.activeAssetEdit?.theme).toBe("toys");
    expect(betaSession.session?.activeTemplateId).toBe("template.sorting");
    expect(betaSession.session?.activeAssetEdit?.theme).toBe("fruits");
  });

  it("routes in-process transport requests through the same service envelope", () => {
    const transport = createLocalServiceTransport();
    const response = transport.send({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.transport",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.transport",
      text: "Repeat a pattern with gems"
    });

    expect(response).toMatchObject({
      kind: "builder-service-response",
      actionName: "assemble",
      execution: {
        result: {
          sessionId: "session.transport",
          profile: {
            id: "profile.sequence-repeat.mvp"
          }
        }
      }
    });
  });

  it("handles service requests through a server-neutral HTTP JSON body adapter", () => {
    const response = handleServiceHttpRequestBody(JSON.stringify({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.http-body",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.http-body",
      text: "Memory game with dinosaurs"
    }));
    const parsed = BuilderServiceResponseSchema.parse(JSON.parse(response.body));

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/json");
    expect(parsed.execution?.result.sessionId).toBe("session.http-body");
    expect(parsed.execution?.result.profile?.assetRequests[0]?.prompt).toContain("dinosaurs memory card illustrations");

    const invalid = handleServiceHttpRequestBody("{");
    expect(invalid.status).toBe(400);
    expect(JSON.parse(invalid.body)).toMatchObject({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      kind: "builder-service-error"
    });
  });

  it("creates an HTTP client transport over the same service envelope", async () => {
    const service = createLocalPlaycraftService();
    const transport = createHttpServiceTransport({
      endpoint: "http://127.0.0.1:8787/playcraft",
      fetch: async (url, init) => {
        const response = handleServiceHttpRequestBody(init.body, service);
        expect(url).toBe("http://127.0.0.1:8787/playcraft");
        expect(init.method).toBe("POST");
        expect(init.headers["content-type"]).toBe("application/json");

        return {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          text: async () => response.body
        };
      }
    });
    const transcript = createMoonshineTranscriptRecord({
      id: "moonshine-transcript.test.http-client",
      text: "Repeat a pattern with gems"
    });
    const response = await transport.send({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.http-client",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.http-client",
      source: "moonshine-transcript",
      moonshineTranscript: transcript
    });

    expect(response.kind).toBe("builder-service-response");
    expect(response.execution?.result.profile?.id).toBe("profile.sequence-repeat.mvp");
    expect(JSON.stringify(response.execution?.events)).toContain("moonshine-streaming");
  });

  it("serves live local HTTP requests over the same service envelope", async () => {
    const server = createPlaycraftHttpServer();
    const baseUrl = await listenOnLoopback(server).catch((error: unknown) => {
      if (isSandboxListenDenied(error)) {
        return undefined;
      }

      throw error;
    });

    if (!baseUrl) {
      return;
    }

    try {
      const transcript = createMoonshineTranscriptRecord({
        id: "moonshine-transcript.test.live-http",
        text: "Memory game with dinosaurs"
      });
      const health = await fetch(`${baseUrl}/health`);
      const healthBody = await health.json() as { ok: boolean };
      expect(health.status).toBe(200);
      expect(healthBody.ok).toBe(true);

      const response = await fetch(`${baseUrl}/playcraft`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: "builder-service-request.test.live-http",
          version: "1.0.0",
          kind: "builder-service-request",
          actionName: "assemble",
          sessionId: "session.live-http",
          source: "moonshine-transcript",
          moonshineTranscript: transcript
        })
      });
      const parsed = BuilderServiceResponseSchema.parse(await response.json());

      expect(response.status).toBe(200);
      expect(parsed.execution?.result.sessionId).toBe("session.live-http");
      expect(parsed.execution?.result.profile?.id).toBe("profile.memory-match.mvp");
      expect(JSON.stringify(parsed.execution?.events)).toContain("moonshine-streaming");
    } finally {
      await closeServer(server);
    }
  });

  it("accepts explicit asset edit records for future local asset-library adapters", () => {
    const service = createLocalPlaycraftService();
    const assembled = service.assemble({
      text: "Memory game",
      assetEdit: {
        theme: "ocean animals",
        items: ["dolphin", "turtle"]
      }
    });

    expect(assembled.result.profile?.id).toBe("profile.memory-match.mvp");
    expect(assembled.result.profile?.assetRequests[0]?.prompt).toContain("ocean animals memory card illustrations");
    expect(assembled.result.profile?.components[0]?.props.cards).toEqual(["dolphin-a", "dolphin-b", "turtle-a", "turtle-b"]);
  });

  it("resolves input without implicit game switching when no template is named", () => {
    const resolved = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 1,
      source: "text",
      text: "make it more colorful"
    });

    expect(resolved.templateId).toBe("template.memory-match");
    expect(resolved.assetEdit).toBeUndefined();
    expect(resolved.resolution.kind).toBe("builder-intent-resolution");
    expect(resolved.resolution.templateDecision.source).toBe("active-template");
    expect(resolved.resolution.assetDecision.source).toBe("none");
    expect(resolved.input.metadata.intentResolution).toMatchObject({
      kind: "builder-intent-resolution",
      selectedTemplateId: "template.memory-match"
    });
  });

  it("classifies active-game asset updates from catalog aliases", () => {
    const resolved = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 1,
      source: "text",
      text: "Change the memory game to toys"
    });

    expect(resolved.templateId).toBe("template.memory-match");
    expect(resolved.assetEdit).toEqual({ theme: "toys" });
    expect(resolved.resolution.templateDecision.source).toBe("catalog-template-alias");
    expect(resolved.resolution.assetDecision).toMatchObject({
      source: "catalog-asset-alias",
      matchedText: "toys"
    });
  });

  it("does not treat template-only requests as asset edits", () => {
    const resolved = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 1,
      source: "text",
      text: "Switch game to sorting"
    });

    expect(resolved.templateId).toBe("template.sorting");
    expect(resolved.assetEdit).toBeUndefined();
    expect(resolved.resolution.assetDecision.source).toBe("none");
  });

  it("only treats game/profile/challenge retheme wording as asset edits for catalog themes", () => {
    const catalogTheme = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 1,
      source: "text",
      text: "Change game to toys"
    });
    const freeformTheme = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 2,
      source: "text",
      text: "Change game to space robots"
    });

    expect(catalogTheme.templateId).toBe("template.memory-match");
    expect(catalogTheme.assetEdit).toEqual({ theme: "toys" });
    expect(catalogTheme.resolution.assetDecision.source).toBe("catalog-asset-alias");
    expect(freeformTheme.templateId).toBe("template.memory-match");
    expect(freeformTheme.assetEdit).toBeUndefined();
    expect(freeformTheme.resolution.assetDecision.source).toBe("none");
  });

  it("uses catalog request aliases to suppress template-only asset edits", () => {
    const resolved = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 1,
      source: "text",
      text: "Change this game to repeat pattern"
    });

    expect(resolved.templateId).toBe("template.sequence-repeat");
    expect(resolved.assetEdit).toBeUndefined();
    expect(resolved.resolution.templateDecision).toMatchObject({
      source: "catalog-template-alias",
      matchedRequestAliases: expect.arrayContaining(["repeat pattern"]),
      matchedTemplateIds: ["template.sequence-repeat"]
    });
    expect(resolved.resolution.assetDecision.source).toBe("none");
  });

  it("classifies explicit asset-folder requests as freeform asset edits", () => {
    const resolved = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 1,
      source: "text",
      text: "Use assets with space robots"
    });

    expect(resolved.templateId).toBe("template.memory-match");
    expect(resolved.assetEdit).toEqual({ theme: "space robots" });
    expect(resolved.resolution.assetDecision).toMatchObject({
      source: "freeform-asset-request",
      matchedText: "space robots"
    });
  });

  it("rejects ambiguous asset edit text instead of selecting the first match", () => {
    expect(() =>
      resolveBuilderInputCommand({
        activeTemplateId: "template.memory-match",
        sequence: 1,
        source: "text",
        text: "Use assets with toys. Use assets with fruits."
      })
    ).toThrow(/ambiguous asset request matched toys, fruits; use explicit assetEdit/u);
  });

  it("keeps freeform asset folder names literal instead of stripping generic nouns", () => {
    const resolved = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 1,
      source: "text",
      text: "Use assets with card art pals"
    });

    expect(resolved.templateId).toBe("template.memory-match");
    expect(resolved.assetEdit).toEqual({ theme: "card art pals" });
    expect(resolved.resolution.assetDecision).toMatchObject({
      source: "freeform-asset-request",
      matchedText: "card art pals"
    });
  });

  it("rejects generic asset nouns as freeform asset themes", () => {
    const resolved = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 1,
      source: "text",
      text: "Use assets with card images"
    });

    expect(resolved.templateId).toBe("template.memory-match");
    expect(resolved.assetEdit).toBeUndefined();
    expect(resolved.resolution.assetDecision.source).toBe("none");
  });

  it("switches templates from catalog request aliases", () => {
    const resolved = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      sequence: 1,
      source: "text",
      text: "Please group by color with fruit"
    });

    expect(resolved.templateId).toBe("template.sorting");
    expect(resolved.resolution.templateDecision).toMatchObject({
      source: "catalog-template-alias",
      matchedRequestAliases: ["group by color"],
      matchedTemplateIds: ["template.sorting"]
    });
    expect(resolved.input.metadata.intentResolution).toMatchObject({
      templateDecision: {
        matchedRequestAliases: ["group by color"]
      }
    });
    expect(resolved.resolution.assetDecision).toMatchObject({
      source: "catalog-asset-alias",
      matchedText: "fruit"
    });
  });

  it("records ambiguous template text without silently reporting a normal active-template decision", () => {
    const resolved = resolveBuilderInputCommand({
      activeTemplateId: "template.sorting",
      sequence: 1,
      source: "text",
      text: "Memory game or repeat pattern with toys"
    });

    expect(resolved.templateId).toBe("template.sorting");
    expect(resolved.resolution.templateDecision).toMatchObject({
      source: "ambiguous-template-match",
      matchedTemplateIds: ["template.memory-match", "template.sequence-repeat"]
    });
    expect(resolved.resolution.assetDecision).toMatchObject({
      source: "catalog-asset-alias",
      matchedText: "toys"
    });
  });

  it("rejects ambiguous first-time template text instead of defaulting", () => {
    expect(() =>
      resolveBuilderInputCommand({
        sequence: 1,
        source: "text",
        text: "Sort or memory game"
      })
    ).toThrow(/ambiguous template request matched template.memory-match, template.sorting without an active template/u);
  });

  it("records explicit template and asset-edit decisions without text guessing", () => {
    const resolved = resolveBuilderInputCommand({
      activeTemplateId: "template.memory-match",
      assetEdit: {
        theme: "ocean animals",
        items: ["dolphin", "turtle"]
      },
      sequence: 1,
      source: "text",
      templateId: "template.sequence-repeat",
      text: "make it playful"
    });

    expect(resolved.templateId).toBe("template.sequence-repeat");
    expect(resolved.resolution.templateDecision.source).toBe("explicit-template-id");
    expect(resolved.resolution.assetDecision.source).toBe("explicit-asset-edit");
    expect(resolved.resolution.assetEdit?.items).toEqual(["dolphin", "turtle"]);
  });

  it("exposes a CLI surface for catalog, transcript, and asset-edit requests", () => {
    const out: string[] = [];
    const err: string[] = [];
    const io = {
      stdout: (message: string) => out.push(message),
      stderr: (message: string) => err.push(message)
    };

    expect(runLocalServiceCli(["catalog", "--json"], io)).toBe(0);
    const catalog = BuilderCatalogSchema.parse(JSON.parse(out.pop() ?? "{}"));
    expect(catalog.kind).toBe("builder-catalog");
    expect(catalog.assetEdit.genericThemeTokens).toEqual(expect.arrayContaining(["asset", "assets", "card images", "theme"]));
    expect(catalog.assetEdit.freeformItemSuffixes).toEqual(["1", "2", "3"]);
    expect(catalog.tools.find((tool) => tool.actionName === "assemble-game")?.argumentsSchema.fields.templateId.required).toBe(true);
    expect(catalog.tools.find((tool) => tool.actionName === "export-profile")?.argumentsSchema.fields.sessionId.required).toBe(true);
    expect(catalog.templates).toHaveLength(24);
    expect(catalog.templates.slice(0, 3).map((template) => template.id)).toEqual([
      "template.memory-match",
      "template.sorting",
      "template.sequence-repeat"
    ]);
    expect(catalog.templates.slice(0, 3).map((template) => template.displayLabel)).toEqual([
      "Memory Match",
      "Sorting",
      "Sequence Repeat"
    ]);
    expect(catalog.templates.slice(0, 3).map((template) => template.liveSurface.kind)).toEqual([
      "memory",
      "sorting",
      "sequence"
    ]);
    expect(catalog.templates.slice(0, 3).map((template) => template.liveSurface.componentCapabilities.primary)).toEqual([
      "component:reveal-card-grid",
      "component:sort-bins",
      "component:sequence-pad"
    ]);
    expect(catalog.templates.slice(0, 3).map((template) => template.liveSurface.assetReplacementSources.map((source) => source.namespace))).toEqual([
      ["card"],
      ["item"],
      ["choice", "choice"]
    ]);
    expect(catalog.templates.slice(0, 3).map((template) => template.assetEditOperations.map((entry) => entry.operation))).toEqual([
      ["memory-pairs", "completion-message"],
      ["choice-items", "sorting-items", "hint-message"],
      ["sequence-items", "choice-items", "completion-message"]
    ]);
    expect(catalog.assetEdit.availableThemes.map((entry) => entry.theme)).toEqual([
      "dinosaurs",
      "toys",
      "dolphins",
      "fruits"
    ]);
    expect(catalog.assetEdit.availableThemes.map((entry) => entry.displayLabel)).toEqual([
      "dinosaurs",
      "toys",
      "ocean animals",
      "fruit"
    ]);
    expect(catalog.assetEdit.availableThemes.map((entry) => entry.localReplacementFolder)).toEqual([
      "dinosaurs",
      "toys",
      "dolphins",
      "fruits"
    ]);
    expect(catalog.assetEdit.availableThemes.find((entry) => entry.theme === "dolphins")?.aliases).toContain("ocean animals");
    expect(catalog.requestTips).toEqual({
      availableGames: expect.arrayContaining(["Memory Match", "Sorting", "Sequence Repeat"]),
      assetEdits: ["with dinosaurs", "with toys", "with ocean animals", "with fruit"],
      examples: ["Memory game with dinosaurs", "Sorting game with toys", "Sequence repeat with ocean animals"],
      summaryLines: [
        "Available games: Memory Match, Sorting, Sequence Repeat, Shape Memory, Color Memory, plus 19 more.",
        "Asset edits: with dinosaurs, with toys, with ocean animals, with fruit.",
        "Try: Memory game with dinosaurs; Sorting game with toys; Sequence repeat with ocean animals."
      ]
    });
    expect(catalog.service.exactEnvelope.batchCommand).toBe("request-batch");
    expect(catalog.service.exactEnvelope.directBatchHandler).toBe("handleLocalServiceRequestBatch");
    expect(catalog.service.exactEnvelope.requiredContracts).toEqual([
      "BuilderServiceRequestSchema",
      "BuilderServiceRequestBatchSchema",
      "BuilderServiceResponseSchema"
    ]);
    expect(catalog.service.actions.find((action) => action.actionName === "assemble")?.request).toEqual({
      acceptedFields: ["sessionId", "text", "source", "moonshineTranscript", "templateId", "assetEdit"],
      requiredFields: [],
      requiredAnyOf: [["text", "moonshineTranscript"]],
      exclusiveAnyOf: [["text", "moonshineTranscript"]],
      forbiddenTogether: [],
      summary: "Requires text or a Moonshine transcript record; sessionId, templateId, source, and assetEdit are optional."
    });
    expect(catalog.service.actions.find((action) => action.actionName === "import-profile")?.request).toEqual({
      acceptedFields: ["sessionId", "profile", "profileExport", "assetEdit"],
      requiredFields: ["sessionId"],
      requiredAnyOf: [["profile", "profileExport"]],
      exclusiveAnyOf: [["profile", "profileExport"]],
      forbiddenTogether: [["profileExport", "assetEdit"]],
      summary: "Requires sessionId plus exactly one profile or profileExport; top-level assetEdit is only accepted with profile imports."
    });
    expect(catalog.service.actions.find((action) => action.actionName === "preview")?.request).toEqual({
      acceptedFields: ["sessionId", "interaction"],
      requiredFields: ["sessionId", "interaction"],
      requiredAnyOf: [],
      exclusiveAnyOf: [],
      forbiddenTogether: [],
      summary: "Requires sessionId and an explicit preview interaction payload; accepts no input, template, asset, or profile payloads."
    });

    expect(runLocalServiceCli(["catalog"], io)).toBe(0);
    expect(out).toEqual(expect.arrayContaining([
      "templates:",
      "- Memory Match [template.memory-match] try: Memory game; aliases: memory, memory game, memory match",
      "tools:",
      "- Assemble Game [tool:assemble-game -> assemble-game] input: Text, Transcript; args: assetEdit:object, input:object, sessionId:string, templateId*:string; contracts: BuilderCommandSchema, BuilderInputRequestSchema, GameTemplateDefinitionSchema",
      "- Preview Action [tool:preview-action -> preview-action] input: none; args: interaction*:object, sessionId*:string; contracts: BuilderCommandSchema, BuilderPreviewStateSchema",
      "service actions:",
      "- Assemble [assemble] input: yes; session: optional; response: execution; fields: sessionId, text, source, moonshineTranscript, templateId, assetEdit; required: none; one-of: text|moonshineTranscript; exclusive: text|moonshineTranscript; forbidden: none",
      "  request: Requires text or a Moonshine transcript record; sessionId, templateId, source, and assetEdit are optional.",
      "- Preview [preview] input: no; session: required; response: execution; fields: sessionId, interaction; required: sessionId, interaction; one-of: none; exclusive: none; forbidden: none",
      "  request: Requires sessionId and an explicit preview interaction payload; accepts no input, template, asset, or profile payloads.",
      "- Import Profile [import-profile] input: no; session: required; response: execution; fields: sessionId, profile, profileExport, assetEdit; required: sessionId; one-of: profile|profileExport; exclusive: profile|profileExport; forbidden: profileExport|assetEdit",
      "exact envelopes: request/request-batch via BuilderServiceRequestSchema/BuilderServiceRequestBatchSchema; contracts: BuilderServiceRequestSchema, BuilderServiceRequestBatchSchema, BuilderServiceResponseSchema",
      "service helpers: handleLocalServiceRequest/handleLocalServiceRequestBatch",
      "service transports: createLocalServiceTransport, createHttpServiceTransport, handleServiceHttpRequestBody",
      "asset edits: dinosaurs [folder: dinosaurs], toys [folder: toys], ocean animals [folder: dolphins], fruit [folder: fruits]",
      "request tips:",
      "- Available games: Memory Match, Sorting, Sequence Repeat, Shape Memory, Color Memory, plus 19 more.",
      "- Asset edits: with dinosaurs, with toys, with ocean animals, with fruit.",
      "- Try: Memory game with dinosaurs; Sorting game with toys; Sequence repeat with ocean animals."
    ]));
    out.length = 0;

    expect(
      runLocalServiceCli([
        "assemble",
        "--transcript",
        "Memory game",
        "--asset-theme",
        "ocean animals",
        "--asset-item",
        "dolphin",
        "--asset-item",
        "turtle",
        "--json"
      ], io)
    ).toBe(0);
    const assembled = BuilderServiceExecutionSchema.parse(JSON.parse(out.pop() ?? "{}"));

    expect(JSON.stringify(assembled.events)).toContain("moonshine-streaming");
    expect(JSON.stringify(assembled.events)).toContain("moonshine-transcript.cli.assemble");
    expect(assembled.result.profile?.assetRequests[0]?.prompt).toContain("ocean animals memory card illustrations");
    expect(assembled.result.profile?.components[0]?.props.cards).toEqual(["dolphin-a", "dolphin-b", "turtle-a", "turtle-b"]);
    expect(err).toEqual([]);

    expect(runLocalServiceCli(["assemble", "--source", "moonshine-transcript", "--text", "Memory game"], io)).toBe(1);
    expect(err.pop()).toMatch(/requires --transcript/u);

    expect(runLocalServiceCli(["assemble", "--text", "Memory game", "--transcript", "Sort shapes by color"], io)).toBe(1);
    expect(err.pop()).toMatch(/either --text or --transcript/u);

    expect(runLocalServiceCli(["assemble", "--source", "text", "--transcript", "Memory game"], io)).toBe(1);
    expect(err.pop()).toMatch(/text source requires --text/u);

    const outputCount = out.length;
    expect(runLocalServiceCli(["assemble", "--template", "memory-match", "--text", "Memory game"], io)).toBe(1);
    expect(out).toHaveLength(outputCount);
    expect(err.pop()).toMatch(/builder template IDs must start with template/u);

    expect(runLocalServiceCli(["assemble", "--source", "voice", "--text", "Memory game"], io)).toBe(1);
    expect(err.pop()).toMatch(/unsupported input source: voice/u);

    expect(runLocalServiceCli(["assemble", "--text"], io)).toBe(1);
    expect(err.pop()).toMatch(/--text requires a value/u);

    expect(runLocalServiceCli(["preview", "--text", "Memory game"], io)).toBe(1);
    expect(err.pop()).toMatch(/preview does not accept input flags/u);

    expect(runLocalServiceCli(["get-session", "--transcript", "Memory game"], io)).toBe(1);
    expect(err.pop()).toMatch(/get-session does not accept input flags/u);

    expect(runLocalServiceCli(["export-profile", "--asset-theme", "toys"], io)).toBe(1);
    expect(err.pop()).toMatch(/export-profile does not accept asset edit flags/u);

    expect(runLocalServiceCli(["preview", "--session", "session.cli-preview"], io)).toBe(1);
    expect(err.pop()).toMatch(/preview requires --interaction primary/u);

    expect(runLocalServiceCli(["preview", "--session", "session.cli-preview", "--interaction", "secondary"], io)).toBe(1);
    expect(err.pop()).toMatch(/Invalid enum value/u);

    expect(runLocalServiceCli(["preview", "--interaction", "primary", "--json"], io)).toBe(1);
    expect(err.pop()).toMatch(/requests require sessionId/u);

    expect(runLocalServiceCli(["get-session", "--json"], io)).toBe(1);
    expect(err.pop()).toMatch(/requests require sessionId/u);

    expect(runLocalServiceCli(["catalog", "--provider", "remote"], io)).toBe(1);
    expect(err.pop()).toMatch(/unknown option: --provider/u);
  });

  it("parses the HTTP service CLI surface without silent option fallbacks", () => {
    expect(PLAYCRAFT_HTTP_SERVICE_POLICY).toEqual({
      defaultHost: "127.0.0.1",
      defaultMaxBodyBytes: 1024 * 1024,
      defaultPort: 8787,
      defaultRoute: "/playcraft",
      urlParseBase: "http://127.0.0.1"
    });

    expect(parsePlaycraftHttpServerCliArgs([
      "--host",
      "127.0.0.1",
      "--port",
      "0",
      "--route",
      "playcraft"
    ])).toEqual({
      host: "127.0.0.1",
      port: 0,
      route: "/playcraft"
    });

    expect(() => parsePlaycraftHttpServerCliArgs(["--host"])).toThrow(/--host requires a value/u);
    expect(() => parsePlaycraftHttpServerCliArgs(["--route", "--port"])).toThrow(/--route requires a value/u);
    expect(() => parsePlaycraftHttpServerCliArgs(["--port", "abc"])).toThrow(/--port requires an integer/u);
    expect(() => parsePlaycraftHttpServerCliArgs(["--port", "70000"])).toThrow(/--port requires an integer/u);
    expect(() => parsePlaycraftHttpServerCliArgs(["--provider", "remote"])).toThrow(/unknown option: --provider/u);
  });

  it("exports and imports profiles through the service envelope and CLI", () => {
    const service = createLocalPlaycraftService();
    const assembled = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.export-source",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.export-source",
      text: "Repeat a pattern with ocean animals"
    });
    const exported = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.export-profile",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "export-profile",
      sessionId: "session.export-source"
    });
    const imported = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.import-profile",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "import-profile",
      sessionId: "session.import-target",
      profileExport: exported.profileExport
    });
    const preview = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.import-preview",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "preview",
      sessionId: "session.import-target",
      interaction: { action: "primary" }
    });

    expect(assembled.session?.activeAssetEdit?.theme).toBe("ocean animals");
    expect(exported.profileExport?.profile.id).toBe("profile.sequence-repeat.mvp");
    expect(exported.profileExport?.assetEdit?.theme).toBe("ocean animals");
    expect(imported.session?.activeTemplateId).toBe("template.sequence-repeat");
    expect(imported.session?.activeAssetEdit?.theme).toBe("ocean animals");
    expect(preview.execution?.result.preview.interactionCount).toBe(1);
    expect(preview.execution?.result.profile?.id).toBe("profile.sequence-repeat.mvp");

    const out: string[] = [];
    const err: string[] = [];
    expect(
      runLocalServiceCli([
        "import-profile",
        "--session",
        "session.cli-import",
        "--profile-export-json",
        JSON.stringify(exported.profileExport),
        "--json"
      ], {
        stdout: (message) => out.push(message),
        stderr: (message) => err.push(message)
      })
    ).toBe(0);
    const cliImport = BuilderServiceExecutionSchema.parse(JSON.parse(out.pop() ?? "{}"));
    expect(cliImport.result.profile?.id).toBe("profile.sequence-repeat.mvp");
    expect(cliImport.result.preview.activeTemplateId).toBe("template.sequence-repeat");
    expect(JSON.stringify(cliImport.events)).toContain("tool:import-profile");
    expect(err).toEqual([]);

    const ambiguousImportOut: string[] = [];
    const ambiguousImportErr: string[] = [];
    expect(
      runLocalServiceCli([
        "import-profile",
        "--session",
        "session.cli-import-ambiguous",
        "--profile-json",
        JSON.stringify(exported.profileExport?.profile),
        "--profile-export-json",
        JSON.stringify(exported.profileExport),
        "--json"
      ], {
        stdout: (message) => ambiguousImportOut.push(message),
        stderr: (message) => ambiguousImportErr.push(message)
      })
    ).toBe(1);
    expect(ambiguousImportOut).toEqual([]);
    expect(ambiguousImportErr.join("\n")).toMatch(/exactly one of profile or profileExport/u);

    const assetOverrideImportOut: string[] = [];
    const assetOverrideImportErr: string[] = [];
    expect(
      runLocalServiceCli([
        "import-profile",
        "--session",
        "session.cli-import-asset-override",
        "--profile-export-json",
        JSON.stringify(exported.profileExport),
        "--asset-theme",
        "toys",
        "--json"
      ], {
        stdout: (message) => assetOverrideImportOut.push(message),
        stderr: (message) => assetOverrideImportErr.push(message)
      })
    ).toBe(1);
    expect(assetOverrideImportOut).toEqual([]);
    expect(assetOverrideImportErr.join("\n")).toMatch(/top-level assetEdit is only accepted with profile imports/u);

    const invalidImportOut: string[] = [];
    const invalidImportErr: string[] = [];
    expect(
      runLocalServiceCli([
        "import-profile",
        "--session",
        "session.cli-import-invalid-template",
        "--profile-export-json",
        JSON.stringify(exported.profileExport),
        "--template",
        "template.memory-match",
        "--json"
      ], {
        stdout: (message) => invalidImportOut.push(message),
        stderr: (message) => invalidImportErr.push(message)
      })
    ).toBe(1);
    expect(invalidImportOut).toEqual([]);
    expect(invalidImportErr.join("\n")).toMatch(/import-profile derives template identity from the profile/u);

    const exportOut: string[] = [];
    const exportErr: string[] = [];
    expect(
      runLocalServiceCli([
        "export-profile",
        "--text",
        "Memory game with dinosaurs",
        "--json"
      ], {
        stdout: (message) => exportOut.push(message),
        stderr: (message) => exportErr.push(message)
      })
    ).toBe(1);
    expect(exportOut).toEqual([]);
    expect(exportErr.join("\n")).toMatch(/export-profile does not accept input flags/u);
  });

  it("rejects stale profile export template metadata before import", () => {
    const service = createLocalPlaycraftService();
    service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.stale-import-source",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.stale-import-source",
      text: "Repeat a pattern with ocean animals"
    });
    const exported = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.stale-import-export",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "export-profile",
      sessionId: "session.stale-import-source"
    });

    expect(exported.profileExport).toBeDefined();
    expect(() =>
      service.handle({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.stale-import",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "import-profile",
        sessionId: "session.stale-import-target",
        profileExport: {
          ...exported.profileExport!,
          templateId: "template.memory-match"
        }
      })
    ).toThrow(/profile export templateId must match/u);

    expect(() =>
      service.handle({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.stale-import-template-override",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "import-profile",
        sessionId: "session.stale-import-target",
        profileExport: exported.profileExport,
        templateId: "template.sorting"
      })
    ).toThrow(/template IDs are only accepted by assemble and update/u);
  });

  it("updates imported custom template snapshots through the service text path", () => {
    const service = createLocalPlaycraftService();
    const assembled = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.custom-import-source",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.custom-import-source",
      text: "Memory game with dinosaurs"
    });
    const profile = assembled.session?.profile;
    expect(profile).toBeDefined();
    const customProfile = {
      ...profile!,
      id: "profile.service-custom-memory",
      assemblyRequestId: "request.service-custom-memory",
      template: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "template.service-custom-memory",
        version: "1.0.0",
        kind: "game-template-snapshot",
        displayName: "Service Custom Memory",
        displayLabel: "Service Custom Memory",
        assetPromptKind: "memory-cards",
        assetEditOperations: [
          {
            componentCapability: "component:reveal-card-grid",
            operation: "memory-pairs"
          }
        ],
        liveSurface: {
          kind: "memory",
          componentCapabilities: {
            primary: "component:reveal-card-grid"
          },
          assetReplacementSources: [
            {
              componentRole: "primary",
              prop: "cards",
              namespace: "card",
              pairMapProp: "pairs"
            }
          ],
          tokenStyles: [
            {
              tokens: ["pair-1"],
              background: "#fee2e2",
              border: "#ef4444",
              foreground: "#7f1d1d",
              accent: "#fecaca"
            }
          ],
          defaultTokenStyle: {
            tokens: ["default"],
            background: "#fce7f3",
            border: "#db2777",
            foreground: "#831843",
            accent: "#fbcfe8"
          }
        },
        assemblyRequestId: "request.service-custom-memory"
      }
    };
    const imported = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.custom-import",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "import-profile",
      sessionId: "session.service-custom-import",
      profile: customProfile
    });
    const updated = service.handle({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.custom-import-update",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "update",
      sessionId: "session.service-custom-import",
      text: "Change the cards to toys"
    });

    expect(imported.session?.activeTemplateId).toBe("template.service-custom-memory");
    expect(updated.session?.activeTemplateId).toBe("template.service-custom-memory");
    expect(updated.session?.profile?.template?.id).toBe("template.service-custom-memory");
    expect(
      updated.session?.profile?.components.find((component) => component.renderCapability === "component:reveal-card-grid")?.props.cards
    ).toEqual(["toy-1-a", "toy-1-b", "toy-2-a", "toy-2-b"]);
    expect(JSON.stringify(updated.execution?.events)).toContain("request.service-custom-memory");
  });

  it("rejects invalid profile export JSON before import requests reach the service", () => {
    const out: string[] = [];
    const err: string[] = [];

    expect(
      runLocalServiceCli([
        "import-profile",
        "--profile-export-json",
        JSON.stringify({
          kind: "builder-profile-export"
        }),
        "--json"
      ], {
        stdout: (message) => out.push(message),
        stderr: (message) => err.push(message)
      })
    ).toBe(1);

    expect(out).toEqual([]);
    expect(err.join("\n")).toMatch(/schemaVersion|profile|Required/u);
  });

  it("lets agents submit the exact service request envelope through the CLI", () => {
    const out: string[] = [];
    const err: string[] = [];
    const transcript = createMoonshineTranscriptRecord({
      id: "moonshine-transcript.test.cli-envelope",
      text: "Memory game with dinosaurs"
    });
    const request = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.cli-envelope",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.cli-envelope",
      source: "moonshine-transcript",
      moonshineTranscript: transcript
    };

    expect(
      runLocalServiceCli(["request", "--request-json", JSON.stringify(request), "--json"], {
        stdout: (message) => out.push(message),
        stderr: (message) => err.push(message)
      })
    ).toBe(0);

    const response = BuilderServiceResponseSchema.parse(JSON.parse(out.pop() ?? "{}"));
    expect(response.kind).toBe("builder-service-response");
    expect(response.requestId).toBe("builder-service-request.test.cli-envelope");
    expect(response.execution?.result.sessionId).toBe("session.cli-envelope");
    expect(response.execution?.result.profile?.assetRequests[0]?.prompt).toContain("dinosaurs memory card illustrations");
    expect(JSON.stringify(response.execution?.events)).toContain("moonshine-streaming");
    expect(err).toEqual([]);
  });

  it("lets agents submit same-process service request batches through the CLI", () => {
    const out: string[] = [];
    const err: string[] = [];
    const requests = [
      {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.cli-batch-assemble",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "assemble",
        sessionId: "session.cli-batch",
        text: "Memory game with dinosaurs"
      },
      {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.cli-batch-export",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "export-profile",
        sessionId: "session.cli-batch"
      }
    ];

    expect(
      runLocalServiceCli(["request-batch", "--request-json", JSON.stringify(requests), "--json"], {
        stdout: (message) => out.push(message),
        stderr: (message) => err.push(message)
      })
    ).toBe(0);

    const responses = BuilderServiceResponseSchema.array().parse(JSON.parse(out.pop() ?? "[]"));
    expect(responses.map((response) => response.actionName)).toEqual(["assemble", "export-profile"]);
    expect(responses[0]?.execution?.result.profile?.assetRequests[0]?.prompt).toContain("dinosaurs memory card illustrations");
    expect(responses[1]?.profileExport?.sessionId).toBe("session.cli-batch");
    expect(responses[1]?.profileExport?.profile.id).toBe("profile.memory-match.mvp");
    expect(err).toEqual([]);
  });

  it("lets agents submit same-process service request batches through the local API helper", () => {
    const responses = handleLocalServiceRequestBatch([
      {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.api-batch-assemble",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "assemble",
        sessionId: "session.api-batch",
        text: "Sort shapes by color with fruits"
      },
      {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: "builder-service-request.test.api-batch-export",
        version: "1.0.0",
        kind: "builder-service-request",
        actionName: "export-profile",
        sessionId: "session.api-batch"
      }
    ]);

    expect(responses.map((response) => response.actionName)).toEqual(["assemble", "export-profile"]);
    expect(responses[0]?.execution?.result.profile?.id).toBe("profile.sorting.mvp");
    expect(responses[1]?.profileExport?.sessionId).toBe("session.api-batch");
    expect(responses[1]?.profileExport?.assetEdit?.theme).toBe("fruits");
    expect(responses[1]?.profileExport?.profile.id).toBe("profile.sorting.mvp");
  });

  it("rejects invalid exact service request envelopes through the CLI schema", () => {
    const out: string[] = [];
    const err: string[] = [];

    expect(
      runLocalServiceCli([
        "request",
        "--request-json",
        JSON.stringify({
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: "builder-service-request.test.invalid-envelope",
          version: "1.0.0",
          kind: "builder-service-request",
          actionName: "catalog",
          text: "Memory game with dinosaurs"
        }),
        "--json"
      ], {
        stdout: (message) => out.push(message),
        stderr: (message) => err.push(message)
      })
    ).toBe(1);

    expect(out).toEqual([]);
    expect(err.join("\n")).toMatch(/only assemble and update service requests/u);
  });

  it("rejects friendly flags on exact service envelope CLI commands", () => {
    const out: string[] = [];
    const err: string[] = [];
    const request = {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.cli-envelope-flags",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "catalog"
    };

    expect(
      runLocalServiceCli([
        "request",
        "--request-json",
        JSON.stringify(request),
        "--text",
        "Memory game",
        "--json"
      ], {
        stdout: (message) => out.push(message),
        stderr: (message) => err.push(message)
      })
    ).toBe(1);
    expect(err.pop()).toMatch(/request only accepts --request-json and --json/u);

    expect(
      runLocalServiceCli([
        "request-batch",
        "--request-json",
        JSON.stringify([request]),
        "--session",
        "session.ignored",
        "--json"
      ], {
        stdout: (message) => out.push(message),
        stderr: (message) => err.push(message)
      })
    ).toBe(1);
    expect(err.pop()).toMatch(/request-batch only accepts --request-json and --json/u);
    expect(out).toEqual([]);
  });

  it("rejects invalid service request batches through the CLI schema", () => {
    const out: string[] = [];
    const err: string[] = [];

    expect(
      runLocalServiceCli(["request-batch", "--request-json", JSON.stringify([]), "--json"], {
        stdout: (message) => out.push(message),
        stderr: (message) => err.push(message)
      })
    ).toBe(1);
    expect(err.pop()).toMatch(/Array must contain at least 1/u);

    expect(
      runLocalServiceCli(["request-batch", "--json"], {
        stdout: (message) => out.push(message),
        stderr: (message) => err.push(message)
      })
    ).toBe(1);
    expect(err.pop()).toMatch(/request-batch command requires --request-json/u);
    expect(out).toEqual([]);
  });

  it("exposes a direct service request handler for adapters without a CLI process", () => {
    const response = handleLocalServiceRequest({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: "builder-service-request.test.direct",
      version: "1.0.0",
      kind: "builder-service-request",
      actionName: "assemble",
      sessionId: "session.direct",
      text: "Memory game with ocean animals"
    });

    expect(response.execution?.result.sessionId).toBe("session.direct");
    expect(response.execution?.result.profile?.assetRequests[0]?.prompt).toContain("ocean animals memory card illustrations");
    expect(response.execution?.result.profile?.components[0]?.props.cards).toEqual(["dolphin-1-a", "dolphin-1-b", "dolphin-2-a", "dolphin-2-b"]);
  });
});

function listenOnLoopback(server: ReturnType<typeof createPlaycraftHttpServer>): Promise<string> {
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address !== "object" || !address) {
        reject(new Error("expected HTTP server address"));
        return;
      }

      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function closeServer(server: ReturnType<typeof createPlaycraftHttpServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function isSandboxListenDenied(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EPERM";
}
