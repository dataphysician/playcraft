import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as contracts from "@playcraft/contracts";
import * as core from "@playcraft/core";

const root = process.cwd();

function readSource(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("import-light boundaries and source scans", () => {
  it("imports contracts and core without app/provider/native dependencies", () => {
    expect(contracts.PLAYCRAFT_SCHEMA_VERSION).toBe("playcraft.v1");
    expect(core.createEmptyRegistries().mechanics.all()).toEqual([]);
  });

  it("keeps contracts and core free of blocked imports, app-layer dependencies, and environment access", () => {
    const source = [
      readSource("packages/contracts/src/index.ts"),
      readSource("packages/core/src/index.ts")
    ].join("\n");

    expect(source).not.toMatch(/@playcraft\/builder|@playcraft\/studio|@ai-sdk|openai|next\/server|NextRequest|PrismaClient|NextAuth|Tauri|tauri|process\.env|OPENAI_API_KEY/u);
    expect(source).not.toMatch(/GameType|MEMORY_MATCH|PATTERN_MATCH|SORTING/u);
  });

  it("blocks provider-name dispatch shortcuts and legacy game-type branching in core, assets, builder, and studio", () => {
    const source = [
      readSource("packages/core/src/index.ts"),
      readSource("packages/assets/src/index.ts"),
      readSource("packages/builder/src/index.ts"),
      readSource("apps/studio/src/local-client.ts"),
      readSource("apps/studio/src/studio-app.tsx"),
      readSource("apps/studio/src/trusted-preview.tsx"),
      readSource("apps/studio/src/App.tsx"),
      readSource("apps/studio/src/main.tsx")
    ].join("\n");

    expect(source).not.toMatch(/providerName|if\s*\(\s*provider|switch\s*\(\s*provider/u);
    expect(source).not.toMatch(/\bGameType\b|\bMEMORY_MATCH\b|\bPATTERN_MATCH\b|\bSORTING\b/u);
  });

  it("blocks generated runtime code execution in renderer, builder, and studio", () => {
    const source = [
      readSource("packages/renderer/src/index.tsx"),
      readSource("packages/builder/src/index.ts"),
      readSource("apps/studio/src/local-client.ts"),
      readSource("apps/studio/src/studio-app.tsx"),
      readSource("apps/studio/src/trusted-preview.tsx"),
      readSource("apps/studio/src/App.tsx"),
      readSource("apps/studio/src/main.tsx")
    ].join("\n");

    expect(source).not.toMatch(/eval\s*\(|new\s+Function|dangerouslySetInnerHTML/u);
  });

  it("keeps builder and studio free of provider sdk, auth, db, and native-shell dependencies", () => {
    const source = [
      readSource("packages/builder/package.json"),
      readSource("packages/builder/src/index.ts"),
      readSource("apps/studio/package.json"),
      readSource("apps/studio/src/local-client.ts"),
      readSource("apps/studio/src/studio-app.tsx"),
      readSource("apps/studio/src/trusted-preview.tsx"),
      readSource("apps/studio/src/App.tsx"),
      readSource("apps/studio/src/main.tsx")
    ].join("\n");

    expect(source).not.toMatch(/openai|@ai-sdk|Prisma|NextAuth|next\/server|Tauri|tauri|sqlite|postgres|mysql|mongodb|supabase|firebase/u);
  });
});
