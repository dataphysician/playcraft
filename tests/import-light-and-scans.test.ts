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

  it("keeps contracts and core free of blocked imports and environment access", () => {
    const source = [
      readSource("packages/contracts/src/index.ts"),
      readSource("packages/core/src/index.ts")
    ].join("\n");

    expect(source).not.toMatch(/@ai-sdk|openai|next\/server|NextRequest|PrismaClient|NextAuth|Tauri|tauri|process\.env|OPENAI_API_KEY/u);
    expect(source).not.toMatch(/GameType|MEMORY_MATCH|PATTERN_MATCH|SORTING/u);
  });

  it("blocks provider-name dispatch shortcuts in core and assets", () => {
    const source = [
      readSource("packages/core/src/index.ts"),
      readSource("packages/assets/src/index.ts")
    ].join("\n");

    expect(source).not.toMatch(/providerName|if\s*\(\s*provider|switch\s*\(\s*provider/u);
  });

  it("blocks generated runtime code execution in the renderer", () => {
    const source = readSource("packages/renderer/src/index.tsx");

    expect(source).not.toMatch(/eval\s*\(|new\s+Function|dangerouslySetInnerHTML/u);
  });
});
