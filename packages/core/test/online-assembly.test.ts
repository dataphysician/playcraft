import { describe, expect, it } from "vitest";
import {
  BamlPaidOnlineAssemblySource,
  OnlineGameAssemblyEngine,
  requestPaidOnlineAssembly,
  type PaidOnlineAssemblyInput,
  type PaidOnlineAssemblySource
} from "@playcraft/core";
import type {
  PaidOnlineAssemblyRequest,
  PaidOnlineAssemblyResponse
} from "@playcraft/contracts";

function emptyRegistries() {
  return {
    mechanics: [],
    rules: [],
    components: [],
    themes: [],
    assetSources: [],
    domains: [],
    safetyPolicies: []
  };
}

class FakePaidSource implements PaidOnlineAssemblySource {
  readonly id = "paid-assembly.fake";
  readonly version = "1.0.0";
  readonly responses: PaidOnlineAssemblyResponse[] = [];
  readonly calls: PaidOnlineAssemblyInput[] = [];

  async request(input: PaidOnlineAssemblyInput): Promise<PaidOnlineAssemblyResponse> {
    this.calls.push(input);
    const response: PaidOnlineAssemblyResponse = {
      schemaVersion: "playcraft.v1",
      id: `paid-online-assembly-response.${input.sessionId}.${this.responses.length + 1}`,
      version: "1.0.0",
      kind: "paid-online-assembly-response",
      requestId: `paid-online-assembly-request.${input.sessionId}`,
      bundleId: `game-bundle.paid.${this.responses.length + 1}`,
      costCents: 100,
      estimatedCompletionSeconds: 45,
      remoteUrl: "https://playcraft.test/paid-assembly"
    };
    this.responses.push(response);
    return response;
  }
}

describe("BamlPaidOnlineAssemblySource", () => {
  it("exposes a stable id and version", () => {
    const source = new BamlPaidOnlineAssemblySource();
    expect(source.id).toBe("paid-assembly.baml");
    expect(source.version).toBe("1.0.0");
  });
});

describe("OnlineGameAssemblyEngine", () => {
  it("returns a final message indicating infer() is unused for paid escalation", async () => {
    const source = new BamlPaidOnlineAssemblySource();
    const engine = new OnlineGameAssemblyEngine(source);
    const result = await engine.infer({} as never);
    expect(result.kind).toBe("final");
    if (result.kind === "final") {
      expect(result.message).toMatch(/requestPaidOnlineAssembly/u);
    }
  });

  it("marks the engine manifest with paid: true", () => {
    const engine = new OnlineGameAssemblyEngine(new BamlPaidOnlineAssemblySource());
    expect(engine.manifest.paid).toBe(true);
  });
});

describe("requestPaidOnlineAssembly", () => {
  it("validates the paymentConfirmationId is non-empty", async () => {
    await expect(
      requestPaidOnlineAssembly({
        sessionId: "session.fixture",
        registries: emptyRegistries(),
        capabilityGap: { missingCapabilities: ["render:novel-cards"], requestedMechanicIds: [], requestedRuleIds: [], requestedComponentIds: [], context: {} },
        paymentConfirmationId: ""
      })
    ).rejects.toThrow(/paymentConfirmationId/u);
  });

  it("returns a GameBundle sourced from the provided paid source", async () => {
    const source = new FakePaidSource();
    const capabilityGap: PaidOnlineAssemblyRequest["capabilityGap"] = {
      missingCapabilities: ["render:novel-cards"],
      requestedMechanicIds: ["mechanic.memory-match"],
      requestedRuleIds: ["rule.memory-match"],
      requestedComponentIds: ["component.memory-grid"],
      context: { locale: "en-US" }
    };

    const bundle = await requestPaidOnlineAssembly({
      sessionId: "session.fixture",
      registries: emptyRegistries(),
      capabilityGap,
      paymentConfirmationId: "payment-confirmation.fixture",
      source
    });

    expect(source.calls).toHaveLength(1);
    expect(source.calls[0]?.paymentConfirmationId).toBe("payment-confirmation.fixture");
    expect(bundle.profileExport.provenance.source).toBe("remote-agent");
    expect(bundle.profileExport.provenance.remoteUrl).toBe("https://playcraft.test/paid-assembly");
    expect(bundle.capEnforcement.maxBytes).toBe(512 * 1024);
  });
});