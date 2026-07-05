import { describe, expect, it } from "vitest";
import {
  BuilderCatalogSchema,
  McpToolSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  type BuilderCatalog,
  type BuilderSessionOwnership
} from "@playcraft/contracts";
import {
  createBuilderCommandHandler,
  type BuilderCommandHandler
} from "@playcraft/builder";
import {
  createLocalPlaycraftService,
  type LocalPlaycraftService
} from "../src/index.js";
import { startPlaycraftHttpServer, type PlaycraftHttpServerStart } from "../src/http-server.js";

async function closeStart(started: PlaycraftHttpServerStart): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    started.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function expiredOwnership(): BuilderSessionOwnership {
  return {
    ownerId: "service.local.owner",
    createdAt: new Date(Date.now() - 120_000).toISOString(),
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
    capabilities: ["assemble", "update", "preview", "get-session", "export-profile", "import-profile"]
  };
}

function createExpiredService(): LocalPlaycraftService {
  const baseHandler = createBuilderCommandHandler();
  const expiredHandler: BuilderCommandHandler = {
    assembleTemplates: (...args) => baseHandler.assembleTemplates(...args),
    execute: (...args) => baseHandler.execute(...args),
    importProfile: (...args) => baseHandler.importProfile(...args),
    listTemplates: () => baseHandler.listTemplates(),
    listTools: () => baseHandler.listTools(),
    getSessionSnapshot(sessionId: string) {
      const snapshot = baseHandler.getSessionSnapshot(sessionId);
      return {
        ...snapshot,
        ownership: expiredOwnership()
      };
    }
  };
  return createLocalPlaycraftService(expiredHandler);
}

describe("playcraft MCP HTTP endpoints", () => {
  it("GET /playcraft/catalog returns a BuilderCatalog with mcp.tools populated to 7 entries", async () => {
    const service = createLocalPlaycraftService();
    const started = await startPlaycraftHttpServer({ port: 0, service });

    try {
      const response = await fetch(`${started.url}/catalog`, { method: "GET" });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/json");

      const body = (await response.json()) as unknown;
      const parsed: BuilderCatalog = BuilderCatalogSchema.parse(body);

      expect(parsed.kind).toBe("builder-catalog");
      expect(parsed.mcp).toBeDefined();
      expect(parsed.mcp?.manifest).toBeDefined();
      expect(parsed.mcp?.tools).toHaveLength(7);
      expect(parsed.mcp?.tools.map((tool) => tool.name)).toEqual([
        "tool:assemble-game",
        "tool:update-game",
        "tool:preview-action",
        "tool:list-builder-tools",
        "tool:get-session",
        "tool:export-profile",
        "tool:import-profile"
      ]);
      expect(parsed.mcp?.manifest.tools).toHaveLength(7);
      expect(parsed.mcp?.manifest.id).toContain("mcp-manifest.playcraft-local");
    } finally {
      await closeStart(started);
    }
  });

  it("POST /playcraft/tools/list returns 7 McpTool objects without a filter", async () => {
    const service = createLocalPlaycraftService();
    const started = await startPlaycraftHttpServer({ port: 0, service });

    try {
      const response = await fetch(`${started.url}/tools/list`, {
        method: "POST",
        headers: { "content-type": "application/json" }
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/json");

      const body = (await response.json()) as unknown[];
      expect(body).toHaveLength(7);
      for (const entry of body) {
        expect(() => McpToolSchema.parse(entry)).not.toThrow();
      }
      expect((body as Array<{ name: string }>).map((tool) => tool.name)).toEqual([
        "tool:assemble-game",
        "tool:update-game",
        "tool:preview-action",
        "tool:list-builder-tools",
        "tool:get-session",
        "tool:export-profile",
        "tool:import-profile"
      ]);
    } finally {
      await closeStart(started);
    }
  });

  it("POST /playcraft/tools/list?include=assemble-game returns only matching tools", async () => {
    const service = createLocalPlaycraftService();
    const started = await startPlaycraftHttpServer({ port: 0, service });

    try {
      const response = await fetch(`${started.url}/tools/list?include=assemble-game`, {
        method: "POST",
        headers: { "content-type": "application/json" }
      });
      expect(response.status).toBe(200);

      const body = (await response.json()) as Array<{ name: string }>;
      expect(body).toHaveLength(1);
      expect(body[0]?.name).toBe("tool:assemble-game");
    } finally {
      await closeStart(started);
    }
  });

  it("POST /playcraft/tools/list accepts comma-separated include filters", async () => {
    const service = createLocalPlaycraftService();
    const started = await startPlaycraftHttpServer({ port: 0, service });

    try {
      const response = await fetch(`${started.url}/tools/list?include=assemble-game,get-session,unknown-tool`, {
        method: "POST",
        headers: { "content-type": "application/json" }
      });
      expect(response.status).toBe(200);

      const body = (await response.json()) as Array<{ name: string }>;
      const names = body.map((tool) => tool.name);
      expect(names).toContain("tool:assemble-game");
      expect(names).toContain("tool:get-session");
      expect(names).toHaveLength(2);
    } finally {
      await closeStart(started);
    }
  });

  it("POST /playcraft/tools/call invokes an allowlisted builder tool and returns a BuilderServiceResponse", async () => {
    const service = createLocalPlaycraftService();
    const started = await startPlaycraftHttpServer({ port: 0, service });

    try {
      const response = await fetch(`${started.url}/tools/call`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "assemble-game",
          arguments: { templateId: "template.memory-match" }
        })
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/json");

      const body = (await response.json()) as {
        kind: string;
        actionName: string;
        execution?: { result?: { profile?: { id?: string } } };
        session?: { sessionId?: string };
      };
      expect(body.kind).toBe("builder-service-response");
      expect(body.actionName).toBe("assemble");
      expect(body.execution?.result?.profile?.id).toBe("profile.memory-match.mvp");
      expect(body.session?.sessionId).toBeDefined();
    } finally {
      await closeStart(started);
    }
  });

  it("POST /playcraft/tools/call returns 403 with kind=tool-not-allowed for non-allowlisted tools", async () => {
    const service = createLocalPlaycraftService();
    const started = await startPlaycraftHttpServer({ port: 0, service });

    try {
      const response = await fetch(`${started.url}/tools/call`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "evil-tool", arguments: {} })
      });

      expect(response.status).toBe(403);
      expect(response.headers.get("content-type")).toBe("application/json");

      const body = (await response.json()) as { schemaVersion: string; kind: string; message: string };
      expect(body.schemaVersion).toBe(PLAYCRAFT_SCHEMA_VERSION);
      expect(body.kind).toBe("tool-not-allowed");
      expect(body.message).toContain("evil-tool");
    } finally {
      await closeStart(started);
    }
  });

  it("POST /playcraft/tools/call returns 401 with kind=session-expired for an expired session", async () => {
    const service = createExpiredService();
    const started = await startPlaycraftHttpServer({ port: 0, service });

    try {
      const response = await fetch(`${started.url}/tools/call`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-session-id": "session.expired"
        },
        body: JSON.stringify({
          name: "assemble-game",
          arguments: { templateId: "template.memory-match" }
        })
      });

      expect(response.status).toBe(401);
      expect(response.headers.get("content-type")).toBe("application/json");

      const body = (await response.json()) as { schemaVersion: string; kind: string; message: string };
      expect(body.schemaVersion).toBe(PLAYCRAFT_SCHEMA_VERSION);
      expect(body.kind).toBe("session-expired");
      expect(body.message).toContain("session.expired");
    } finally {
      await closeStart(started);
    }
  });

  it("POST /playcraft/tools/call returns 400 with kind=builder-service-error for invalid arguments", async () => {
    const service = createLocalPlaycraftService();
    const started = await startPlaycraftHttpServer({ port: 0, service });

    try {
      const response = await fetch(`${started.url}/tools/call`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "assemble-game",
          arguments: { templateId: "BAD-CASE-INVALID" }
        })
      });

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toBe("application/json");

      const body = (await response.json()) as { schemaVersion: string; kind: string; message: string };
      expect(body.schemaVersion).toBe(PLAYCRAFT_SCHEMA_VERSION);
      expect(body.kind).toBe("builder-service-error");
      expect(body.message.length).toBeGreaterThan(0);
    } finally {
      await closeStart(started);
    }
  });

  it("POST /playcraft/tools/call returns 400 when the request body is missing the name field", async () => {
    const service = createLocalPlaycraftService();
    const started = await startPlaycraftHttpServer({ port: 0, service });

    try {
      const response = await fetch(`${started.url}/tools/call`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ arguments: { templateId: "template.memory-match" } })
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as { kind: string };
      expect(body.kind).toBe("builder-service-error");
    } finally {
      await closeStart(started);
    }
  });
});