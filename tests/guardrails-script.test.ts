import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("guardrails script", () => {
  it("exits 0 with zero violations when run on the current tree", () => {
    const result = execSync("node scripts/check-guardrails.mjs", { encoding: "utf8" });
    expect(result).toContain("All guardrails pass.");
  });
});