import { describe, expect, it } from "vitest";
import {
  BUNDLED_LOCAL_PROVENANCE,
  PLAYCRAFT_SCHEMA_VERSION,
  RemoteEnrichmentRequestSchema,
  RemoteEnrichmentResponseSchema,
  EnrichmentCapabilityGapSchema,
  EnrichmentResponseStatusSchema
} from "@playcraft/contracts";

function baseRequest() {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "remote-enrichment-request.fixture",
    version: "1.0.0",
    kind: "remote-enrichment-request" as const,
    requestId: "remote-enrichment-request.fixture.request",
    engine: "lfm2.5-vl-450m-extract",
    agentTranscriptId: "agent-transcript.fixture",
    gap: {
      missingCapabilities: ["render:novel-cards"],
      requestedMechanicIds: ["mechanic.memory-match"],
      requestedRuleIds: ["rule.memory-match"],
      requestedComponentIds: ["component.memory-grid"],
      context: { locale: "en-US" }
    }
  };
}

function baseResponse() {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "remote-enrichment-response.fixture",
    version: "1.0.0",
    kind: "remote-enrichment-response" as const,
    requestId: "remote-enrichment-request.fixture.request",
    status: "ok" as const,
    components: [],
    rules: [],
    assetSources: [],
    bytes: 0,
    cacheHit: false
  };
}

function baseComponentManifest() {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "component.remote-fixture",
    version: "1.0.0",
    kind: "component" as const,
    displayName: "Remote Memory Grid",
    renderCapability: "render:memory-grid",
    supportedMechanicIds: ["mechanic.memory-match"],
    supportedDomains: ["domain.memory"],
    supportedAgeBands: ["4-6"],
    propsSchema: {
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      type: "object" as const,
      fields: {
        pairCount: { type: "number", required: false }
      },
      allowUnknown: false
    },
    requiredAssets: [],
    emittedTools: [],
    accessibility: {
      labelRequired: true,
      reducedMotionSafe: true,
      keyboardReachable: true
    },
    safetyPolicyIds: ["safety.toddler-default"],
    replayBehavior: "deterministic" as const,
    provenance: { ...BUNDLED_LOCAL_PROVENANCE, source: "remote-agent" as const, remoteUrl: "https://example.test/agents/builder" }
  };
}

function baseRuleModuleDefinition() {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "rule.remote-fixture",
    version: "1.0.0",
    kind: "rule-module" as const,
    category: "game:memory",
    displayName: "Remote Match Logic",
    capabilityTags: ["rule:memory-match"],
    supportedMechanicIds: ["mechanic.memory-match"],
    consumesEvents: ["frontend:revealed"],
    emitsEvents: ["frontend:matched"],
    defaultSource: "manifest" as const,
    compatibility: {
      domainProfileIds: ["domain.memory"],
      safetyPolicyIds: ["safety.toddler-default"],
      ageBands: ["4-6"],
      modalities: ["touch"],
      requiredCapabilities: ["rule:memory-match"],
      assetContentTypes: []
    },
    provenance: { ...BUNDLED_LOCAL_PROVENANCE, source: "remote-agent" as const, remoteUrl: "https://example.test/agents/builder" }
  };
}

function baseAssetSourceManifest() {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "asset-source.remote-fixture",
    version: "1.0.0",
    kind: "asset-source" as const,
    displayName: "Remote Memory Card Pack",
    capabilityTags: ["asset:memory-cards"],
    contentTypes: ["image"],
    formats: ["svg"],
    seedSupport: true,
    safetySupport: true,
    offline: false,
    requiresNetwork: true,
    requiresCredentials: false,
    maxBatchSize: 16,
    provenance: { ...BUNDLED_LOCAL_PROVENANCE, source: "remote-agent" as const, remoteUrl: "https://example.test/agents/builder" }
  };
}

describe("EnrichmentCapabilityGapSchema", () => {
  it("accepts a happy-path gap with one missing capability", () => {
    const parsed = EnrichmentCapabilityGapSchema.parse({
      missingCapabilities: ["render:novel-cards"]
    });
    expect(parsed.missingCapabilities).toEqual(["render:novel-cards"]);
    expect(parsed.requestedMechanicIds).toEqual([]);
    expect(parsed.requestedRuleIds).toEqual([]);
    expect(parsed.requestedComponentIds).toEqual([]);
    expect(parsed.context).toEqual({});
  });

  it("rejects a gap that omits missingCapabilities", () => {
    const result = EnrichmentCapabilityGapSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a gap with an empty missingCapabilities array", () => {
    const result = EnrichmentCapabilityGapSchema.safeParse({
      missingCapabilities: []
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown additional properties on a strict EnrichmentCapabilityGap", () => {
    const result = EnrichmentCapabilityGapSchema.safeParse({
      missingCapabilities: ["render:novel-cards"],
      surprise: "nope"
    });
    expect(result.success).toBe(false);
  });
});

describe("EnrichmentResponseStatusSchema", () => {
  it("accepts the four declared statuses", () => {
    for (const status of ["ok", "unsupported", "rate-limited", "error"] as const) {
      expect(EnrichmentResponseStatusSchema.parse(status)).toBe(status);
    }
  });

  it("rejects unknown statuses", () => {
    const result = EnrichmentResponseStatusSchema.safeParse("pending");
    expect(result.success).toBe(false);
  });
});

describe("RemoteEnrichmentRequestSchema", () => {
  it("round-trips a valid request", () => {
    const parsed = RemoteEnrichmentRequestSchema.parse(baseRequest());
    expect(parsed.kind).toBe("remote-enrichment-request");
    expect(parsed.requestId).toBe("remote-enrichment-request.fixture.request");
    expect(parsed.engine).toBe("lfm2.5-vl-450m-extract");
    expect(parsed.agentTranscriptId).toBe("agent-transcript.fixture");
    expect(parsed.gap.missingCapabilities).toEqual(["render:novel-cards"]);
  });

  it("accepts a request without an agentTranscriptId", () => {
    const { agentTranscriptId: _omit, ...rest } = baseRequest();
    const parsed = RemoteEnrichmentRequestSchema.parse(rest);
    expect(parsed.agentTranscriptId).toBeUndefined();
  });

  it("rejects an unknown kind discriminator", () => {
    const result = RemoteEnrichmentRequestSchema.safeParse({
      ...baseRequest(),
      kind: "remote-enrichment-bogus"
    });
    expect(result.success).toBe(false);
  });

  it("rejects a request that omits gap.missingCapabilities", () => {
    const result = RemoteEnrichmentRequestSchema.safeParse({
      ...baseRequest(),
      gap: { requestedMechanicIds: [] }
    });
    expect(result.success).toBe(false);
  });

  it("rejects a request whose engine is empty", () => {
    const result = RemoteEnrichmentRequestSchema.safeParse({
      ...baseRequest(),
      engine: ""
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown additional properties on a strict RemoteEnrichmentRequest", () => {
    const result = RemoteEnrichmentRequestSchema.safeParse({
      ...baseRequest(),
      surprise: "nope"
    });
    expect(result.success).toBe(false);
  });
});

describe("RemoteEnrichmentResponseSchema", () => {
  it("round-trips a valid ok response with components, rules, and assetSources", () => {
    const payload = {
      ...baseResponse(),
      components: [baseComponentManifest()],
      rules: [baseRuleModuleDefinition()],
      assetSources: [baseAssetSourceManifest()],
      bytes: 4096,
      cacheHit: true
    };
    const parsed = RemoteEnrichmentResponseSchema.parse(payload);
    expect(parsed.status).toBe("ok");
    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0]?.id).toBe("component.remote-fixture");
    expect(parsed.rules).toHaveLength(1);
    expect(parsed.rules[0]?.id).toBe("rule.remote-fixture");
    expect(parsed.assetSources).toHaveLength(1);
    expect(parsed.assetSources[0]?.id).toBe("asset-source.remote-fixture");
    expect(parsed.bytes).toBe(4096);
    expect(parsed.cacheHit).toBe(true);
    expect(parsed.error).toBeUndefined();
  });

  it("accepts a status ok response without an error field", () => {
    const parsed = RemoteEnrichmentResponseSchema.parse(baseResponse());
    expect(parsed.status).toBe("ok");
    expect(parsed.error).toBeUndefined();
    expect(parsed.components).toEqual([]);
    expect(parsed.rules).toEqual([]);
    expect(parsed.assetSources).toEqual([]);
    expect(parsed.cacheHit).toBe(false);
  });

  it("rejects a status error response without an error field", () => {
    const result = RemoteEnrichmentResponseSchema.safeParse({
      ...baseResponse(),
      status: "error"
    });
    expect(result.success).toBe(false);
  });

  it("accepts a status unsupported response with an error field", () => {
    const parsed = RemoteEnrichmentResponseSchema.parse({
      ...baseResponse(),
      status: "unsupported",
      error: "Remote enrichment is not configured; local registries must satisfy all capabilities."
    });
    expect(parsed.status).toBe("unsupported");
    expect(parsed.error).toContain("Remote enrichment");
  });

  it("accepts a status rate-limited response with an error field", () => {
    const parsed = RemoteEnrichmentResponseSchema.parse({
      ...baseResponse(),
      status: "rate-limited",
      error: "remote enrichment rate limit exceeded; retry in 30s"
    });
    expect(parsed.status).toBe("rate-limited");
    expect(parsed.error).toContain("rate limit");
  });

  it("rejects unknown additional properties on a strict RemoteEnrichmentResponse", () => {
    const result = RemoteEnrichmentResponseSchema.safeParse({
      ...baseResponse(),
      surprise: "nope"
    });
    expect(result.success).toBe(false);
  });

  it("rejects a response with negative bytes", () => {
    const result = RemoteEnrichmentResponseSchema.safeParse({
      ...baseResponse(),
      bytes: -1
    });
    expect(result.success).toBe(false);
  });
});