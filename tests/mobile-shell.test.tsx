import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMoonshineTranscriptRecord, handleServiceHttpRequestBody } from "@playcraft/service";

import { App } from "../apps/mobile-shell/src/App.js";
import { createMobileShellStudioClient } from "../apps/mobile-shell/src/mobile-client.js";

const root = process.cwd();
const packageJsonSchema = z
  .object({
    dependencies: z.record(z.string()),
    name: z.string()
  })
  .passthrough();
const tauriConfigSchema = z
  .object({
    app: z
      .object({
        security: z.object({ csp: z.string() }).passthrough()
      })
      .passthrough(),
    build: z
      .object({
        devUrl: z.string(),
        frontendDist: z.string()
      })
      .passthrough(),
    bundle: z.object({ active: z.boolean() }).passthrough(),
    identifier: z.string(),
    productName: z.string()
  })
  .passthrough();

function readJson<TSchema extends z.ZodTypeAny>(path: string, schema: TSchema): z.infer<TSchema> {
  return schema.parse(JSON.parse(readFileSync(join(root, path), "utf8")));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Tauri mobile shell", () => {
  it("declares a local-first Tauri Mobile-facing package and config", () => {
    const packageJson = readJson("apps/mobile-shell/package.json", packageJsonSchema);
    const tauriConfig = readJson("apps/mobile-shell/src-tauri/tauri.conf.json", tauriConfigSchema);

    expect(packageJson.name).toBe("@playcraft/mobile-shell");
    expect(packageJson.dependencies).toMatchObject({
      "@playcraft/service": "workspace:*",
      "@playcraft/studio": "workspace:*"
    });
    expect(tauriConfig.productName).toBe("Playcraft Mobile");
    expect(tauriConfig.identifier).toBe("dev.playcraft.mobile");
    expect(tauriConfig.build.devUrl).toBe("http://127.0.0.1:5174");
    expect(tauriConfig.build.frontendDist).toBe("../web-dist");
    expect(tauriConfig.bundle.active).toBe(false);
    expect(tauriConfig.app.security.csp).toContain("http://127.0.0.1:8787");
  });

  it("assembles games through the local Playcraft service client", () => {
    const client = createMobileShellStudioClient();
    const session = client.assembleFromIntent({
      idea: "Memory game with toys",
      source: "moonshine-transcript"
    });

    expect(session.activeProfileId).toBe("profile.memory-match.mvp");
    expect(session.profiles[0].assetRequests[0]?.prompt).toContain("toys memory card illustrations");
    expect(session.timeline.some((entry) => entry.detail.includes("moonshine-streaming"))).toBe(true);
  });

  it("passes explicit Moonshine transcript records through the mobile Studio client", async () => {
    const transcript = createMoonshineTranscriptRecord({
      id: "moonshine-transcript.test.mobile-client",
      text: "Memory game with dinosaurs"
    });
    const client = createMobileShellStudioClient();
    const session = await Promise.resolve(client.assembleFromIntent({
      idea: "ignored once transcript exists",
      moonshineTranscript: transcript
    }));

    expect(session.activeProfileId).toBe("profile.memory-match.mvp");
    expect(session.profiles[0].assetRequests[0]?.prompt).toContain("dinosaurs memory card illustrations");
    expect(session.timeline.some((entry) => entry.detail.includes("moonshine-transcript.test.mobile-client"))).toBe(true);
  });

  it("can target the local HTTP service endpoint instead of the in-process transport", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal("fetch", async (url: unknown, init: { body?: unknown } = {}) => {
      requestedUrls.push(String(url));
      const response = handleServiceHttpRequestBody(typeof init.body === "string" ? init.body : "");
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        text: async () => response.body
      };
    });

    const client = createMobileShellStudioClient("http://127.0.0.1:8787/playcraft");
    const session = await client.assembleFromIntent({
      idea: "Repeat a pattern with gems",
      source: "moonshine-transcript"
    });

    expect(requestedUrls).toEqual(["http://127.0.0.1:8787/playcraft"]);
    expect(session.activeProfileId).toBe("profile.sequence-repeat.mvp");
    expect(session.profiles[0].assetRequests[0]?.prompt).toContain("gems sequence game button illustrations");
    expect(session.timeline.some((entry) => entry.detail.includes("moonshine-streaming"))).toBe(true);
  });

  it("renders the mobile shell and generates a live game", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Transcript" }));
    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with toys" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByText("Memory Match MVP")).toBeDefined();
    expect(await screen.findByRole("button", { name: "toy-1-a" })).toBeDefined();
  });
});
