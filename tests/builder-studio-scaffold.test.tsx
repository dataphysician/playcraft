import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../apps/studio/src/App.js";
import { PLAYCRAFT_BUILDER_PACKAGE } from "@playcraft/builder";

const root = process.cwd();

function readText(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function readJson<T>(path: string): T {
  return JSON.parse(readText(path)) as T;
}

describe("builder/studio workspace scaffold", () => {
  it("wires the workspace, root scripts, tsconfig references, and package aliases", () => {
    const workspace = readText("pnpm-workspace.yaml");
    const rootPackage = readJson<{ scripts: Record<string, string> }>("package.json");
    const tsconfig = readJson<{ references: Array<{ path: string }>; compilerOptions: { paths: Record<string, string[]> } }>("tsconfig.json");

    expect(workspace).toContain('  - "apps/*"');
    expect(rootPackage.scripts["dev:studio"]).toBe("pnpm --filter @playcraft/studio dev");
    expect(rootPackage.scripts["build:studio"]).toBe("pnpm --filter @playcraft/studio build");
    expect(tsconfig.references).toEqual(
      expect.arrayContaining([{ path: "./packages/builder" }, { path: "./apps/studio" }])
    );
    expect(tsconfig.compilerOptions.paths["@playcraft/builder"]).toEqual(["packages/builder/src/index.ts"]);
    expect(tsconfig.compilerOptions.paths["@playcraft/studio"]).toEqual(["apps/studio/src/index.ts"]);
  });

  it("defines builder and studio package manifests with the expected boundaries", () => {
    const builderPackage = readJson<{ name: string; dependencies: Record<string, string> }>("packages/builder/package.json");
    const studioPackage = readJson<{
      name: string;
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    }>("apps/studio/package.json");

    expect(PLAYCRAFT_BUILDER_PACKAGE).toBe("@playcraft/builder");
    expect(builderPackage.name).toBe("@playcraft/builder");
    expect(builderPackage.dependencies).toMatchObject({
      "@playcraft/ag-ui": "workspace:*",
      "@playcraft/assets": "workspace:*",
      "@playcraft/contracts": "workspace:*",
      "@playcraft/core": "workspace:*",
      "@playcraft/packs": "workspace:*"
    });
    expect(builderPackage.dependencies).not.toHaveProperty("@playcraft/renderer");
    expect(studioPackage.name).toBe("@playcraft/studio");
    expect(studioPackage.scripts.build).toBe("vite build");
    expect(studioPackage.scripts.dev).toBe("vite");
    expect(studioPackage.dependencies).toMatchObject({
      "@playcraft/builder": "workspace:*",
      "@playcraft/renderer": "workspace:*",
      react: "^19.0.0",
      "react-dom": "^19.0.0"
    });
    expect(studioPackage.devDependencies).toHaveProperty("vite");
    expect(studioPackage.devDependencies).toHaveProperty("@vitejs/plugin-react");
  });

  it("renders the studio builder entry point", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Playcraft Studio" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Live App" })).toBeTruthy();
    expect(screen.getByLabelText("Request")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Children playing a colorful game together" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Generate Game" })).toBeTruthy();
  });
});
