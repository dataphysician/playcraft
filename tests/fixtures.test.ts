import { describe, expect, it } from "vitest";
import {
  AssetCatalogManifestSchema,
  BuilderSessionOwnershipSchema,
  BuilderTemplateNamespaceSchema,
  GameProfileTemplateSnapshotSchema,
  McpManifestSchema,
  SseFrameSchema,
  WorkflowGraphSchema
} from "@playcraft/contracts";
import { loadFixture } from "./fixtures/load-fixture";

describe("new-contract fixtures", () => {
  it("accepts valid MCP manifest", () => {
    expect(McpManifestSchema.safeParse(loadFixture("new-contracts/mcp-manifest.valid.json")).success).toBe(true);
  });

  it("rejects MCP manifest missing tools", () => {
    expect(McpManifestSchema.safeParse(loadFixture("new-contracts/mcp-manifest.missing-tools.json")).success).toBe(false);
  });

  it("accepts valid SSE run-started frame", () => {
    expect(SseFrameSchema.safeParse(loadFixture("new-contracts/sse-frame.run-started.json")).success).toBe(true);
  });

  it("accepts valid SSE tool-call frame", () => {
    expect(SseFrameSchema.safeParse(loadFixture("new-contracts/sse-frame.tool-call.json")).success).toBe(true);
  });

  it("accepts valid SSE tool-result frame", () => {
    expect(SseFrameSchema.safeParse(loadFixture("new-contracts/sse-frame.tool-result.json")).success).toBe(true);
  });

  it("accepts valid SSE run-finished frame", () => {
    expect(SseFrameSchema.safeParse(loadFixture("new-contracts/sse-frame.run-finished.json")).success).toBe(true);
  });

  it("rejects malformed SSE frame with unknown kind", () => {
    expect(SseFrameSchema.safeParse(loadFixture("new-contracts/sse-frame.malformed.json")).success).toBe(false);
  });

  it("accepts valid workflow graph", () => {
    expect(WorkflowGraphSchema.safeParse(loadFixture("new-contracts/workflow-graph.valid.json")).success).toBe(true);
  });

  it("rejects workflow graph with cycle", () => {
    expect(WorkflowGraphSchema.safeParse(loadFixture("new-contracts/workflow-graph.cycle.json")).success).toBe(false);
  });

  it("rejects workflow graph with unknown dependency", () => {
    expect(WorkflowGraphSchema.safeParse(loadFixture("new-contracts/workflow-graph.unknown-dep.json")).success).toBe(false);
  });

  it("accepts valid session ownership", () => {
    expect(BuilderSessionOwnershipSchema.safeParse(loadFixture("new-contracts/session-ownership.valid.json")).success).toBe(true);
  });

  it("rejects expired session ownership", () => {
    expect(BuilderSessionOwnershipSchema.safeParse(loadFixture("new-contracts/session-ownership.expired.json")).success).toBe(false);
  });

  it("accepts valid asset catalog manifest with ordinal naming", () => {
    expect(AssetCatalogManifestSchema.safeParse(loadFixture("new-contracts/asset-catalog-manifest.valid.json")).success).toBe(true);
  });

  it("accepts valid asset catalog manifest with paired naming", () => {
    expect(AssetCatalogManifestSchema.safeParse(loadFixture("new-contracts/asset-catalog-manifest.paired.json")).success).toBe(true);
  });

  it("rejects asset catalog manifest missing source", () => {
    expect(AssetCatalogManifestSchema.safeParse(loadFixture("new-contracts/asset-catalog-manifest.missing-source.json")).success).toBe(false);
  });

  it("accepts valid custom template snapshot and namespace", () => {
    const snapshot = loadFixture("new-contracts/template-snapshot.custom.toy-memory.json");
    expect(GameProfileTemplateSnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(BuilderTemplateNamespaceSchema.safeParse((snapshot as { id: string }).id).success).toBe(true);
  });

  it("rejects custom template snapshot colliding with bundled ID", () => {
    const snapshot = loadFixture("new-contracts/template-snapshot.collision.memory-match.json");
    expect(GameProfileTemplateSnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(BuilderTemplateNamespaceSchema.safeParse((snapshot as { id: string }).id).success).toBe(false);
  });
});
