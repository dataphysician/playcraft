import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadFixture(relativePath: string): unknown {
  const absolutePath = join(process.cwd(), "tests", "fixtures", relativePath);
  const raw = readFileSync(absolutePath, "utf8");
  return JSON.parse(raw) as unknown;
}
