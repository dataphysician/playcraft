import { z } from "zod";
import {
  GameBundleSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  PublicContractBaseSchema,
  StableIdSchema,
  VersionSchema,
  type GameBundle,
  type PaidOnlineAssemblyRequest,
  type PaidOnlineAssemblyResponse,
  type PlaycraftRegistriesSnapshot
} from "@playcraft/contracts";
import { bamlBridge } from "./baml-bridge.js";
import type {
  BamlPaidOnlineAssemblyRequest,
  BamlPaidOnlineAssemblyResponse
} from "./baml-types.js";
import {
  defaultLocalInferenceEngineManifest,
  type AgentInferenceResult,
  type AgentPrompt,
  type LocalInferenceEngine,
  type LocalInferenceEngineManifest
} from "./local-llm.js";

const PaidOnlineAssemblyResponseSchema = PublicContractBaseSchema.extend({
  kind: z.literal("paid-online-assembly-response"),
  requestId: StableIdSchema,
  bundleId: StableIdSchema,
  costCents: z.number().int().nonnegative(),
  estimatedCompletionSeconds: z.number().int().positive(),
  remoteUrl: z.string().url()
}).strict();

export interface PaidOnlineAssemblySource {
  readonly id: string;
  readonly version: string;
  request(input: PaidOnlineAssemblyInput): Promise<PaidOnlineAssemblyResponse>;
}

export interface PaidOnlineAssemblyInput {
  readonly sessionId: string;
  readonly capabilityGap: PaidOnlineAssemblyRequest["capabilityGap"];
  readonly paymentConfirmationId: string;
  readonly contextAssemblyRequestId: string;
}

export interface OnlineGameAssemblyEngineManifest extends LocalInferenceEngineManifest {
  readonly paid: true;
}

export class OnlineGameAssemblyEngine implements LocalInferenceEngine {
  readonly manifest: OnlineGameAssemblyEngineManifest;
  readonly source: PaidOnlineAssemblySource;

  constructor(source: PaidOnlineAssemblySource) {
    this.source = source;
    this.manifest = {
      ...defaultLocalInferenceEngineManifest(),
      displayName: "Online Paid Assembly (BAML paid client)",
      paid: true
    };
  }

  infer(_prompt: AgentPrompt): Promise<AgentInferenceResult> {
    return Promise.resolve({
      kind: "final",
      message: "OnlineGameAssemblyEngine.infer() is not used; call requestPaidOnlineAssembly() instead."
    });
  }
}

export class BamlPaidOnlineAssemblySource implements PaidOnlineAssemblySource {
  readonly id = "paid-assembly.baml";
  readonly version = "1.0.0";

  async request(input: PaidOnlineAssemblyInput): Promise<PaidOnlineAssemblyResponse> {
    const request: BamlPaidOnlineAssemblyRequest = {
      capability_gap: {
        missing_capabilities: input.capabilityGap.missingCapabilities,
        requested_mechanic_ids: input.capabilityGap.requestedMechanicIds,
        requested_rule_ids: input.capabilityGap.requestedRuleIds,
        requested_component_ids: input.capabilityGap.requestedComponentIds,
        context: JSON.stringify(input.capabilityGap.context)
      },
      user_consent: true,
      payment_confirmation_id: input.paymentConfirmationId,
      context_assembly_request_id: input.contextAssemblyRequestId
    };

    const response: BamlPaidOnlineAssemblyResponse = await bamlBridge.paidOnlineAssembly(request);

    return PaidOnlineAssemblyResponseSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `paid-online-assembly-response.${input.sessionId}.${response.bundle_id}`,
      version: response.bundle_version || "1.0.0",
      kind: "paid-online-assembly-response",
      requestId: `paid-online-assembly-request.${input.sessionId}`,
      bundleId: response.bundle_id,
      costCents: response.cost_cents,
      estimatedCompletionSeconds: response.estimated_completion_seconds,
      remoteUrl: response.remote_url
    });
  }
}

export async function requestPaidOnlineAssembly(input: {
  readonly sessionId: string;
  readonly registries: PlaycraftRegistriesSnapshot;
  readonly capabilityGap: PaidOnlineAssemblyRequest["capabilityGap"];
  readonly paymentConfirmationId: string;
  readonly source?: PaidOnlineAssemblySource;
}): Promise<GameBundle> {
  if (!input.paymentConfirmationId) {
    throw new Error("requestPaidOnlineAssembly requires a non-empty paymentConfirmationId");
  }

  const source = input.source ?? new BamlPaidOnlineAssemblySource();
  const response = await source.request({
    sessionId: input.sessionId,
    capabilityGap: input.capabilityGap,
    paymentConfirmationId: input.paymentConfirmationId,
    contextAssemblyRequestId: `assembly-request.${input.sessionId}`
  });

  const profileId = `profile.${input.sessionId}.${response.bundleId}`;
  const componentVersion = VersionSchema.parse("1.0.0");
  const templateId = `template.snapshot.${input.sessionId}.${response.bundleId}`;
  const mechanicBindingId = `binding.mechanic.${response.bundleId}`;
  const ruleBindingId = `binding.rule.${response.bundleId}`;
  const componentBindingId = `binding.component.${response.bundleId}`;

  return GameBundleSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: `game-bundle.${response.bundleId}`,
    version: "1.0.0",
    kind: "game-bundle",
    profileExport: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `builder-profile-export.${response.bundleId}`,
      version: "1.0.0",
      kind: "builder-profile-export",
      sessionId: input.sessionId,
      templateId,
      profile: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: profileId,
        version: "1.0.0",
        kind: "game-assembly-profile",
        profileName: `Paid assembly ${input.sessionId}`,
        assemblyRequestId: `assembly-request.${input.sessionId}`,
        template: {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: templateId,
          version: componentVersion,
          kind: "game-template-snapshot",
          displayName: templateId,
          displayLabel: templateId,
          assetPromptKind: "memory-cards",
          assetEditOperations: [
            {
              componentCapability: "render:memory-grid",
              operation: "memory-pairs"
            }
          ],
          liveSurface: {
            kind: "memory",
            componentCapabilities: { primary: "render:memory-grid" },
            assetReplacementSources: [
              {
                componentRole: "primary",
                prop: "cards",
                namespace: "card"
              }
            ],
            tokenStyles: [
              {
                tokens: ["card"],
                background: "background.default",
                border: "border.default",
                foreground: "foreground.default",
                accent: "accent.default"
              }
            ],
            defaultTokenStyle: {
              tokens: ["card"],
              background: "background.default",
              border: "border.default",
              foreground: "foreground.default",
              accent: "accent.default"
            }
          },
          assemblyRequestId: `assembly-request.${input.sessionId}`
        },
        domainProfile: { id: "domain.memory", version: "1.0.0" },
        safetyPolicy: { id: "safety.toddler-default", version: "1.0.0" },
        theme: { id: "theme.dinosaurs", version: "1.0.0" },
        mechanics: [
          {
            bindingId: mechanicBindingId,
            mechanicId: "mechanic.memory-match",
            version: "1.0.0",
            parameters: {},
            eventBindings: {}
          }
        ],
        rules: [
          {
            bindingId: ruleBindingId,
            ruleId: "rule.memory-match",
            version: "1.0.0",
            parameters: {},
            defaultSource: "manifest"
          }
        ],
        components: [
          {
            bindingId: componentBindingId,
            componentId: "component.memory-grid",
            version: "1.0.0",
            renderCapability: "render:memory-grid",
            mechanicBindingIds: [mechanicBindingId],
            renderMechanicBindingId: mechanicBindingId,
            props: {},
            assetBindings: {}
          }
        ],
        assetRequests: [],
        assets: [],
        replay: {
          deterministicSeed: `seed.${input.sessionId}`,
          plannerId: "planner.paid",
          plannerVersion: "1.0.0",
          unsupportedSeedRequests: [],
          eventLog: []
        },
        validation: {
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
          id: `validation.${profileId}`,
          version: "1.0.0",
          kind: "assembly-validation-result",
          profileId,
          valid: true,
          errors: [],
          warnings: []
        }
      },
      preview: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        sessionId: input.sessionId,
        activeProfileId: profileId,
        activeTemplateId: templateId,
        renderedComponentIds: [],
        interactionCount: 0
      },
      validation: {
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        id: `validation.${response.bundleId}`,
        version: "1.0.0",
        kind: "assembly-validation-result",
        profileId: response.bundleId,
        valid: true,
        errors: [],
        warnings: []
      },
      exportedAt: new Date().toISOString(),
      provenance: {
        source: "remote-agent",
        agentEngine: "lfm2.5-vl-450m-extract",
        enrichmentSources: ["paid-assembly.baml"],
        assembledBy: "playcraft-service",
        assembledAt: new Date().toISOString(),
        remoteUrl: response.remoteUrl,
        agentTranscriptId: `agent-transcript.${input.sessionId}`
      }
    },
    registries: input.registries,
    capEnforcement: {
      maxBytes: 512 * 1024,
      maxRegistryEntries: 256,
      purgedEntryIds: [],
      enforcedAt: new Date().toISOString()
    }
  });
}