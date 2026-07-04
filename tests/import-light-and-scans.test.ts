import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as contracts from "@playcraft/contracts";
import * as core from "@playcraft/core";

const root = process.cwd();

function readSource(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function repoSourceFiles(directory = root): string[] {
  const ignoredDirectories = new Set([".git", ".omx", "dist", "node_modules"]);
  const sourceExtensions = new Set([".json", ".md", ".ts", ".tsx", ".yaml", ".yml"]);
  const output: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...repoSourceFiles(absolutePath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const dotIndex = entry.name.lastIndexOf(".");
    const extension = dotIndex >= 0 ? entry.name.slice(dotIndex) : "";
    if (sourceExtensions.has(extension) && statSync(absolutePath).size < 1_000_000) {
      output.push(absolutePath.slice(root.length + 1));
    }
  }

  return output.sort();
}

describe("import-light boundaries and source scans", () => {
  it("imports contracts and core without app, hosted SDK, or native dependencies", () => {
    expect(contracts.PLAYCRAFT_SCHEMA_VERSION).toBe("playcraft.v1");
    expect(core.createEmptyRegistries().mechanics.all()).toEqual([]);
  });

  it("keeps contracts and core free of blocked imports, app-layer dependencies, and environment access", () => {
    const source = [
      readSource("packages/contracts/src/index.ts"),
      readSource("packages/core/src/index.ts")
    ].join("\n");

    expect(source).not.toMatch(/@playcraft\/builder|@playcraft\/studio|@ai-sdk|openai|next\/server|NextRequest|PrismaClient|NextAuth|Tauri|tauri|process\.env|OPENAI_API_KEY|TA[V]US|ta[v]us/u);
    expect(source).not.toMatch(/GameType|MEMORY_MATCH|PATTERN_MATCH|SORTING/u);
  });

  it("blocks source-name dispatch shortcuts and legacy game-type branching in core, assets, builder, and studio", () => {
    const source = [
      readSource("packages/core/src/index.ts"),
      readSource("packages/assets/src/index.ts"),
      readSource("packages/builder/src/index.ts"),
      readSource("packages/service/src/index.ts"),
      readSource("apps/studio/src/local-client.ts"),
      readSource("apps/studio/src/live-game.tsx"),
      readSource("apps/studio/src/studio-app.tsx"),
      readSource("apps/studio/src/trusted-preview.tsx"),
      readSource("apps/studio/src/App.tsx"),
      readSource("apps/studio/src/main.tsx")
    ].join("\n");

    const legacyDispatchPattern = new RegExp(
      [`provi${"derName"}`, `if\\s*\\(\\s*provi${"der"}`, `switch\\s*\\(\\s*provi${"der"}`].join("|"),
      "u"
    );

    expect(source).not.toMatch(legacyDispatchPattern);
    expect(source).not.toContain("as " + "BuilderTemplateId");
    expect(source).not.toMatch(/profile\.id\.includes/u);
    expect(source).not.toMatch(/\bGameType\b|\bMEMORY_MATCH\b|\bPATTERN_MATCH\b|\bSORTING\b/u);
    expect(source).not.toMatch(/Ta[v]us|ta[v]us|re[p]lica|C[V]I/u);
  });

  it("keeps repository source free of the removed video-avatar hosted stack", () => {
    const blockedTerms = ["Ta" + "vus", "ta" + "vus", "re" + "plica", "C" + "VI", "Geo" + "rgina"];
    const violations = repoSourceFiles().flatMap((path) => {
      const source = readSource(path);
      return blockedTerms.some((term) => source.includes(term)) ? [path] : [];
    });

    expect(violations).toEqual([]);
  });

  it("keeps public local asset source names free of stub terminology", () => {
    const blockedTerms = [
      "asset-source." + "stub-deterministic",
      "deterministic-" + "stub",
      "stub" + "://",
      "asset:" + "stub",
      "Deterministic " + "Stub",
      "stub " + "asset source",
      "stub " + "planner"
    ];
    const violations = repoSourceFiles().flatMap((path) => {
      const source = readSource(path);
      return blockedTerms.some((term) => source.includes(term)) ? [path] : [];
    });

    expect(violations).toEqual([]);
  });

  it("blocks generated runtime code execution in renderer, builder, and studio", () => {
    const source = [
      readSource("packages/renderer/src/index.tsx"),
      readSource("packages/builder/src/index.ts"),
      readSource("packages/service/src/index.ts"),
      readSource("apps/studio/src/local-client.ts"),
      readSource("apps/studio/src/live-game.tsx"),
      readSource("apps/studio/src/studio-app.tsx"),
      readSource("apps/studio/src/trusted-preview.tsx"),
      readSource("apps/studio/src/App.tsx"),
      readSource("apps/studio/src/main.tsx")
    ].join("\n");

    expect(source).not.toMatch(/eval\s*\(|new\s+Function|dangerouslySetInnerHTML/u);
  });

  it("keeps builder and studio free of hosted SDK, auth, db, and native-shell dependencies", () => {
    const source = [
      readSource("packages/builder/package.json"),
      readSource("packages/builder/src/index.ts"),
      readSource("packages/service/package.json"),
      readSource("packages/service/src/cli.ts"),
      readSource("packages/service/src/http-server.ts"),
      readSource("packages/service/src/index.ts"),
      readSource("apps/studio/package.json"),
      readSource("apps/studio/src/local-client.ts"),
      readSource("apps/studio/src/live-game.tsx"),
      readSource("apps/studio/src/studio-app.tsx"),
      readSource("apps/studio/src/trusted-preview.tsx"),
      readSource("apps/studio/src/App.tsx"),
      readSource("apps/studio/src/main.tsx"),
      readSource("apps/mobile-shell/package.json"),
      readSource("apps/mobile-shell/src/mobile-client.ts"),
      readSource("apps/mobile-shell/src/App.tsx"),
      readSource("apps/mobile-shell/src/main.tsx")
    ].join("\n");

    expect(source).not.toMatch(/openai|@ai-sdk|Prisma|NextAuth|next\/server|sqlite|postgres|mysql|mongodb|supabase|firebase|Ta[v]us|ta[v]us/u);
  });
});
