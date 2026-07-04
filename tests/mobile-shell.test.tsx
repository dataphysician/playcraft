import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { App } from "../apps/mobile-shell/src/App.js";
import { createMobileShellStudioClient } from "../apps/mobile-shell/src/mobile-client.js";

const root = process.cwd();

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(root, path), "utf8")) as T;
}

describe("Tauri mobile shell", () => {
  it("declares a local-first Tauri Mobile-facing package and config", () => {
    const packageJson = readJson<{ dependencies: Record<string, string>; name: string }>("apps/mobile-shell/package.json");
    const tauriConfig = readJson<{
      build: { devUrl: string; frontendDist: string };
      bundle: { active: boolean };
      identifier: string;
      productName: string;
    }>("apps/mobile-shell/src-tauri/tauri.conf.json");

    expect(packageJson.name).toBe("@playcraft/mobile-shell");
    expect(packageJson.dependencies).toMatchObject({
      "@playcraft/service": "workspace:*",
      "@playcraft/studio": "workspace:*"
    });
    expect(tauriConfig.productName).toBe("Playcraft Mobile");
    expect(tauriConfig.identifier).toBe("dev.playcraft.mobile");
    expect(tauriConfig.build.devUrl).toBe("http://127.0.0.1:5174");
    expect(tauriConfig.build.frontendDist).toBe("../dist");
    expect(tauriConfig.bundle.active).toBe(false);
  });

  it("assembles games through the local Playcraft service client", () => {
    const client = createMobileShellStudioClient();
    const session = client.assembleFromIntent({
      idea: "Memory game with toys",
      source: "speech-transcript"
    });

    expect(session.activeProfileId).toBe("profile.memory-match.mvp");
    expect(session.profiles[0].assetRequests[0]?.prompt).toContain("toys memory card illustrations");
    expect(session.timeline.some((entry) => entry.detail.includes("moonshine-streaming"))).toBe(true);
  });

  it("renders the mobile shell and generates a live game", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Speech" }));
    fireEvent.change(screen.getByLabelText("Request"), { target: { value: "Memory game with toys" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Game" }));

    expect(await screen.findByText("Memory Match MVP")).toBeDefined();
    expect(await screen.findByRole("button", { name: "toy-1-a" })).toBeDefined();
  });
});
