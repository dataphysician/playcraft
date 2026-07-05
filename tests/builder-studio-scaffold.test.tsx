import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { render, screen } from "@testing-library/react";
import { App } from "../apps/studio/src/App.js";
import { PLAYCRAFT_BUILDER_PACKAGE } from "@playcraft/builder";
import { PLAYCRAFT_SERVICE_PACKAGE } from "@playcraft/service";

const root = process.cwd();
const stringRecordSchema = z.record(z.string());
const rootPackageJsonSchema = z
  .object({
    scripts: stringRecordSchema
  })
  .passthrough();
const workspacePackageJsonSchema = z
  .object({
    bin: stringRecordSchema.default({}),
    dependencies: stringRecordSchema,
    devDependencies: stringRecordSchema.default({}),
    name: z.string(),
    scripts: stringRecordSchema.default({})
  })
  .passthrough();
const tsconfigJsonSchema = z
  .object({
    compilerOptions: z
      .object({
        paths: z.record(z.array(z.string()))
      })
      .passthrough(),
    references: z.array(z.object({ path: z.string() }).passthrough())
  })
  .passthrough();
const appTsconfigJsonSchema = z
  .object({
    compilerOptions: z
      .object({
        outDir: z.string(),
        tsBuildInfoFile: z.string()
      })
      .passthrough()
  })
  .passthrough();

function readText(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function readJson<TSchema extends z.ZodTypeAny>(path: string, schema: TSchema): z.infer<TSchema> {
  return schema.parse(JSON.parse(readText(path)));
}

describe("builder/studio workspace scaffold", () => {
  it("wires the workspace, root scripts, tsconfig references, and package aliases", () => {
    const workspace = readText("pnpm-workspace.yaml");
    const gitignore = readText(".gitignore");
    const readme = readText("README.md");
    const mobileViteConfig = readText("apps/mobile-shell/vite.config.ts");
    const rootPackage = readJson("package.json", rootPackageJsonSchema);
    const studioViteConfig = readText("apps/studio/vite.config.ts");
    const staleEmptyOutDirSetting = `emptyOutDir: ${String(false)}`;
    const tsconfig = readJson("tsconfig.json", tsconfigJsonSchema);
    const studioTsconfig = readJson("apps/studio/tsconfig.json", appTsconfigJsonSchema);
    const mobileTsconfig = readJson("apps/mobile-shell/tsconfig.json", appTsconfigJsonSchema);

    expect(readme).toContain("pnpm serve:service");
    expect(readme).toContain("VITE_PLAYCRAFT_SERVICE_URL=http://127.0.0.1:8787/playcraft");
    expect(readme).toContain("playcraft-service catalog --json");
    expect(gitignore).toContain("apps/*/web-dist/");
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
    expect(studioViteConfig).toContain('outDir: "web-dist"');
    expect(studioViteConfig).toContain("emptyOutDir: true");
    expect(studioViteConfig).not.toContain(staleEmptyOutDirSetting);
    expect(studioTsconfig.compilerOptions.outDir).toBe("dist");
    expect(studioTsconfig.compilerOptions.tsBuildInfoFile).toBe("dist/.tsbuildinfo");
    expect(mobileViteConfig).toContain('outDir: "web-dist"');
    expect(mobileViteConfig).toContain("emptyOutDir: true");
    expect(mobileViteConfig).not.toContain(staleEmptyOutDirSetting);
    expect(mobileTsconfig.compilerOptions.outDir).toBe("dist");
    expect(mobileTsconfig.compilerOptions.tsBuildInfoFile).toBe("dist/.tsbuildinfo");
  });

  it("defines builder, service, studio, and mobile package manifests with the expected boundaries", () => {
    const builderPackage = readJson("packages/builder/package.json", workspacePackageJsonSchema);
    const servicePackage = readJson("packages/service/package.json", workspacePackageJsonSchema);
    const studioPackage = readJson("apps/studio/package.json", workspacePackageJsonSchema);
    const mobilePackage = readJson("apps/mobile-shell/package.json", workspacePackageJsonSchema);

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
