import { describe, expect, it } from "vitest";
import { NullRemoteEnrichmentSource } from "@playcraft/core";
import { PLAYCRAFT_SCHEMA_VERSION, type RemoteEnrichmentRequest } from "@playcraft/contracts";

function baseRequest(): RemoteEnrichmentRequest {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "remote-enrichment-request.fixture",
    version: "1.0.0",
    kind: "remote-enrichment-request",
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

describe("NullRemoteEnrichmentSource", () => {
  it("exposes a stable id and version", () => {
    const source = new NullRemoteEnrichmentSource();
    expect(source.id).toBe("enrichment.null");
    expect(source.version).toBe("1.0.0");
  });

  it("returns status 'unsupported' on enrich", async () => {
    const source = new NullRemoteEnrichmentSource();
    const response = await source.enrich(baseRequest(), { timeoutMs: 1000 });
    expect(response.status).toBe("unsupported");
  });

  it("echoes the requestId from the input request", async () => {
    const source = new NullRemoteEnrichmentSource();
    const request = baseRequest();
    const response = await source.enrich(request, { timeoutMs: 1000 });
    expect(response.requestId).toBe(request.requestId);
  });

  it("returns empty arrays for components, rules, and assetSources", async () => {
    const source = new NullRemoteEnrichmentSource();
    const response = await source.enrich(baseRequest(), { timeoutMs: 1000 });
    expect(response.components).toEqual([]);
    expect(response.rules).toEqual([]);
    expect(response.assetSources).toEqual([]);
  });

  it("includes an error message explaining why the source declined", async () => {
    const source = new NullRemoteEnrichmentSource();
    const response = await source.enrich(baseRequest(), { timeoutMs: 1000 });
    expect(response.error).toBeDefined();
    expect(response.error).toContain("Remote enrichment is not configured");
  });

  it("reports zero bytes and no cache hit", async () => {
    const source = new NullRemoteEnrichmentSource();
    const response = await source.enrich(baseRequest(), { timeoutMs: 1000 });
    expect(response.bytes).toBe(0);
    expect(response.cacheHit).toBe(false);
  });

  it("ignores timeoutMs because the null source is synchronous", async () => {
    const source = new NullRemoteEnrichmentSource();
    const start = Date.now();
    const response = await source.enrich(baseRequest(), { timeoutMs: 0 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
    expect(response.status).toBe("unsupported");
  });
});