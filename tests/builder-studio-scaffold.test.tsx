import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../apps/studio/src/App.js";
import { PLAYCRAFT_BUILDER_PACKAGE } from "@playcraft/builder";
import { PLAYCRAFT_SERVICE_PACKAGE } from "@playcraft/service";

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
    expect(rootPackage.scripts["dev:mobile"]).toBe("pnpm --filter @playcraft/mobile-shell dev");
    expect(rootPackage.scripts["build:mobile"]).toBe("pnpm --filter @playcraft/mobile-shell build");
    expect(rootPackage.scripts["serve:service"]).toBe("pnpm --filter @playcraft/service serve");
    expect(tsconfig.references).toEqual(
      expect.arrayContaining([
        { path: "./packages/builder" },
        { path: "./packages/service" },
        { path: "./apps/studio" },
        { path: "./apps/mobile-shell" }
      ])
    );
    expect(tsconfig.compilerOptions.paths["@playcraft/builder"]).toEqual(["packages/builder/src/index.ts"]);
    expect(tsconfig.compilerOptions.paths["@playcraft/service"]).toEqual(["packages/service/src/index.ts"]);
    expect(tsconfig.compilerOptions.paths["@playcraft/studio"]).toEqual(["apps/studio/src/index.ts"]);
    expect(tsconfig.compilerOptions.paths["@playcraft/mobile-shell"]).toEqual(["apps/mobile-shell/src/App.tsx"]);
  });

  it("defines builder, service, studio, and mobile package manifests with the expected boundaries", () => {
    const builderPackage = readJson<{ name: string; dependencies: Record<string, string> }>("packages/builder/package.json");
    const servicePackage = readJson<{ bin: Record<string, string>; name: string; dependencies: Record<string, string> }>("packages/service/package.json");
    const studioPackage = readJson<{
      name: string;
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    }>("apps/studio/package.json");
    const mobilePackage = readJson<{
      name: string;
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    }>("apps/mobile-shell/package.json");

    expect(PLAYCRAFT_BUILDER_PACKAGE).toBe("@playcraft/builder");
    expect(PLAYCRAFT_SERVICE_PACKAGE).toBe("@playcraft/service");
    expect(builderPackage.name).toBe("@playcraft/builder");
    expect(builderPackage.dependencies).toMatchObject({
      "@playcraft/ag-ui": "workspace:*",
      "@playcraft/assets": "workspace:*",
      "@playcraft/contracts": "workspace:*",
      "@playcraft/core": "workspace:*",
      "@playcraft/packs": "workspace:*"
    });
    expect(builderPackage.dependencies).not.toHaveProperty("@playcraft/renderer");
    expect(servicePackage.name).toBe("@playcraft/service");
    expect(servicePackage.bin["playcraft-service"]).toBe("./dist/cli.js");
    expect(servicePackage.bin["playcraft-service-http"]).toBe("./dist/http-server.js");
    expect(servicePackage.dependencies).toMatchObject({
      "@playcraft/builder": "workspace:*",
      "@playcraft/contracts": "workspace:*",
      "@playcraft/packs": "workspace:*"
    });
    expect(servicePackage.dependencies).not.toHaveProperty("@playcraft/renderer");
    expect(studioPackage.name).toBe("@playcraft/studio");
    expect(studioPackage.scripts.build).toBe("vite build");
    expect(studioPackage.scripts.dev).toBe("vite");
    expect(studioPackage.dependencies).toMatchObject({
      "@playcraft/builder": "workspace:*",
      "@playcraft/renderer": "workspace:*",
      "@playcraft/service": "workspace:*",
      react: "^19.0.0",
      "react-dom": "^19.0.0"
    });
    expect(studioPackage.devDependencies).toHaveProperty("vite");
    expect(studioPackage.devDependencies).toHaveProperty("@vitejs/plugin-react");
    expect(mobilePackage.name).toBe("@playcraft/mobile-shell");
    expect(mobilePackage.scripts.build).toBe("vite build");
    expect(mobilePackage.dependencies).toMatchObject({
      "@playcraft/service": "workspace:*",
      "@playcraft/studio": "workspace:*",
      react: "^19.0.0",
      "react-dom": "^19.0.0"
    });
    expect(mobilePackage.devDependencies).toHaveProperty("vite");
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
