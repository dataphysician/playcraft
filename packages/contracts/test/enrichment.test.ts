import { describe, expect, it } from "vitest";
import {
  PaidOnlineAssemblyCapabilityGapSchema,
  PaidOnlineAssemblyRequestSchema,
  PaidOnlineAssemblyResponseSchema,
  PLAYCRAFT_SCHEMA_VERSION
} from "@playcraft/contracts";

function baseRequest() {
  return {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: "paid-online-assembly-request.fixture",
    version: "1.0.0",
    kind: "paid-online-assembly-request" as const,
    requestId: "paid-online-assembly-request.fixture.request",
    sessionId: "session.fixture",
    userConsent: true as const,
    paymentConfirmationId: "payment-confirmation.fixture",
    capabilityGap: {
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
    id: "paid-online-assembly-response.fixture",
    version: "1.0.0",
    kind: "paid-online-assembly-response" as const,
    requestId: "paid-online-assembly-request.fixture.request",
    bundleId: "game-bundle.fixture",
    costCents: 50,
    estimatedCompletionSeconds: 30,
    remoteUrl: "https://playcraft.test/paid-assembly"
  };
}

describe("PaidOnlineAssemblyCapabilityGapSchema", () => {
  it("accepts a happy-path gap with one missing capability", () => {
    const parsed = PaidOnlineAssemblyCapabilityGapSchema.parse({
      missingCapabilities: ["render:novel-cards"]
    });
    expect(parsed.missingCapabilities).toEqual(["render:novel-cards"]);
    expect(parsed.requestedMechanicIds).toEqual([]);
    expect(parsed.requestedRuleIds).toEqual([]);
    expect(parsed.requestedComponentIds).toEqual([]);
    expect(parsed.context).toEqual({});
  });

  it("rejects a gap that omits missingCapabilities", () => {
    const result = PaidOnlineAssemblyCapabilityGapSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a gap with an empty missingCapabilities array", () => {
    const result = PaidOnlineAssemblyCapabilityGapSchema.safeParse({
      missingCapabilities: []
    });
    expect(result.success).toBe(false);
  });
});

describe("PaidOnlineAssemblyRequestSchema", () => {
  it("round-trips a valid paid request with userConsent true", () => {
    const parsed = PaidOnlineAssemblyRequestSchema.parse(baseRequest());
    expect(parsed.kind).toBe("paid-online-assembly-request");
    expect(parsed.userConsent).toBe(true);
    expect(parsed.paymentConfirmationId).toBe("payment-confirmation.fixture");
    expect(parsed.sessionId).toBe("session.fixture");
    expect(parsed.capabilityGap.missingCapabilities).toEqual(["render:novel-cards"]);
  });

  it("rejects a request whose userConsent is false", () => {
    const result = PaidOnlineAssemblyRequestSchema.safeParse({
      ...baseRequest(),
      userConsent: false
    });
    expect(result.success).toBe(false);
  });

  it("rejects a request whose paymentConfirmationId is empty", () => {
    const result = PaidOnlineAssemblyRequestSchema.safeParse({
      ...baseRequest(),
      paymentConfirmationId: ""
    });
    expect(result.success).toBe(false);
  });

  it("rejects a request that omits capabilityGap", () => {
    const { capabilityGap: _omit, ...rest } = baseRequest();
    const result = PaidOnlineAssemblyRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects unknown additional properties on a strict PaidOnlineAssemblyRequest", () => {
    const result = PaidOnlineAssemblyRequestSchema.safeParse({
      ...baseRequest(),
      surprise: "nope"
    });
    expect(result.success).toBe(false);
  });
});

describe("PaidOnlineAssemblyResponseSchema", () => {
  it("round-trips a valid response with cost and ETA", () => {
    const parsed = PaidOnlineAssemblyResponseSchema.parse(baseResponse());
    expect(parsed.bundleId).toBe("game-bundle.fixture");
    expect(parsed.costCents).toBe(50);
    expect(parsed.estimatedCompletionSeconds).toBe(30);
    expect(parsed.remoteUrl).toBe("https://playcraft.test/paid-assembly");
  });

  it("rejects a response with negative costCents", () => {
    const result = PaidOnlineAssemblyResponseSchema.safeParse({
      ...baseResponse(),
      costCents: -1
    });
    expect(result.success).toBe(false);
  });

  it("rejects a response with non-positive estimatedCompletionSeconds", () => {
    const result = PaidOnlineAssemblyResponseSchema.safeParse({
      ...baseResponse(),
      estimatedCompletionSeconds: 0
    });
    expect(result.success).toBe(false);
  });

  it("rejects a response whose remoteUrl is not a URL", () => {
    const result = PaidOnlineAssemblyResponseSchema.safeParse({
      ...baseResponse(),
      remoteUrl: "not-a-url"
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown additional properties on a strict PaidOnlineAssemblyResponse", () => {
    const result = PaidOnlineAssemblyResponseSchema.safeParse({
      ...baseResponse(),
      surprise: "nope"
    });
    expect(result.success).toBe(false);
  });
});