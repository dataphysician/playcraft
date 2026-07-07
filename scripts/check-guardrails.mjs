#!/usr/bin/env node
// scripts/check-guardrails.mjs
// Wave G automated guardrail enforcer.
// Pure Node ESM — uses only `fs` and `path`. No third-party dependencies.
//
// Guardrails enforced:
//   (a) no source file > 1000 LOC (test files excluded)
//   (b) no `as any` / `@ts-ignore` / `@ts-expect-error`
//   (c) no `legacy` / `deprecated` / `// TODO` / `// FIXME` / `// HACK` in source
//       (test files excluded; opt-out via `// eslint-disable` or `// cspell:disable`)
//   (d) `playcraft.v1`-only schema literals (no `"v2"` or `"playcraft.v1.1"`)
//   (e) bundle chunk-size cap: GAME_BUNDLE_MAX_BYTES === 512 * 1024 from
//       packages/contracts/dist/game-bundle.js
//
// Exits 0 with "All guardrails pass." on success, or 1 with a grouped violation
// report on failure.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_ROOTS = ["packages", "apps", "tests"];
const EXCLUDED_DIR_NAMES = new Set([
  "node_modules",
  "dist",
  "web-dist",
  ".vitest",
  "coverage",
  ".git"
]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const LOC_LIMIT = 1000;
const EXPECTED_BUNDLE_MAX_BYTES = 512 * 1024;
const CONTRACTS_DIST_ENTRY = "packages/contracts/dist/game-bundle.js";

// Forbidden patterns.
// (b) TypeScript escape hatches — banned everywhere we scan.
const FORBIDDEN_ESCAPE_PATTERNS = [
  { id: "as-any", regex: /\bas\s+any\b/ },
  { id: "ts-ignore", regex: /@ts-ignore\b/ },
  { id: "ts-expect-error", regex: /@ts-expect-error\b/ }
];

// (c) Legacy/deprecated markers — banned in source files (tests excluded).
const FORBIDDEN_SOURCE_PATTERNS = [
  { id: "todo-comment", regex: /\/\/\s*TODO\b/ },
  { id: "fixme-comment", regex: /\/\/\s*FIXME\b/ },
  { id: "hack-comment", regex: /\/\/\s*HACK\b/ },
  { id: "legacy-identifier", regex: /\b(legacy|deprecated)\b/i }
];

// (d) Schema literal version drift — banned everywhere we scan.
const FORBIDDEN_SCHEMA_LITERAL_PATTERNS = [
  { id: "schema-v2", regex: /["']v2["']/ },
  { id: "schema-playcraft-v1-1", regex: /["']playcraft\.v1\.1["']/ }
];

// Lines carrying these opt-out markers are skipped for (c) pattern checks.
const OPT_OUT_PATTERNS = [
  /\/\/\s*eslint-disable/,
  /\/\/\s*cspell:disable/
];

const isTestFile = (relPath) =>
  relPath.endsWith(".test.ts") || relPath.endsWith(".test.tsx");

const isExcludedDir = (name) => EXCLUDED_DIR_NAMES.has(name);

const shouldScanFile = (relPath) => {
  if (isExcludedDir(relPath)) return false;
  const ext = extname(relPath);
  return SOURCE_EXTENSIONS.has(ext);
};

function walkSourceFiles(startDir) {
  const out = [];
  const stack = [startDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const absolute = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!isExcludedDir(entry.name)) {
          stack.push(absolute);
        }
        continue;
      }
      if (!entry.isFile()) continue;
      const relPath = relative(REPO_ROOT, absolute).split(sep).join("/");
      if (!shouldScanFile(relPath)) continue;
      out.push({ absolute, relPath });
    }
  }
  return out.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

// eslint-disable / eslint-disable-line opt-out the current line.
// eslint-disable-next-line / eslint-disable-line-once opt-out the line below.
// cspell:disable starts a block that ends at the matching cspell:enable, or
// runs to end-of-file when no enable marker is present.
function lineMatchesOptOut(currentLine, previousLine) {
  if (OPT_OUT_PATTERNS.some((pattern) => pattern.test(currentLine))) {
    return true;
  }
  if (previousLine && /eslint-disable-next-line|eslint-disable-line-once/.test(previousLine)) {
    return true;
  }
  return false;
}

function buildIgnorePredicate(lines) {
  // Combine per-line opt-outs with block-style cspell:disable scopes so the
  // directive patterns behave like the linters that produce them.
  const inCspellBlock = new Array(lines.length).fill(false);
  let blockDepth = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/\bcspell:disable\b/.test(line)) {
      blockDepth += 1;
    }
    if (/\bcspell:enable\b/.test(line) && blockDepth > 0) {
      blockDepth -= 1;
    }
    inCspellBlock[index] = blockDepth > 0;
  }
  return (line, index) => {
    if (lineMatchesOptOut(line, index > 0 ? lines[index - 1] : "")) return true;
    if (inCspellBlock[index]) return true;
    return false;
  };
}

/**
 * Run pattern matchers against a file's lines.
 * @returns {Array<{line:number, ruleId:string, snippet:string}>}
 */
function scanPatterns(relPath, lines, patterns, ignoreLine) {
  const violations = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (ignoreLine && ignoreLine(line, index)) continue;
    for (const { id, regex } of patterns) {
      if (regex.test(line)) {
        violations.push({
          line: index + 1,
          ruleId: id,
          snippet: line.trim().slice(0, 160)
        });
      }
    }
  }
  return violations;
}

/** @returns {Array<{ruleId:string, detail:string}>} */
async function checkBundleConstant() {
  const entryAbs = join(REPO_ROOT, CONTRACTS_DIST_ENTRY);
  if (!existsSync(entryAbs)) {
    return [
      {
        ruleId: "bundle-constant-missing-dist",
        detail: `${CONTRACTS_DIST_ENTRY} does not exist. Run \`pnpm build\` before lint:guardrails.`
      }
    ];
  }
  let mod;
  try {
    mod = await import(pathToFileURL(entryAbs).href);
  } catch (error) {
    return [
      {
        ruleId: "bundle-constant-import-failed",
        detail: `Failed to import ${CONTRACTS_DIST_ENTRY}: ${error.message}`
      }
    ];
  }
  const actual = mod.GAME_BUNDLE_MAX_BYTES;
  if (actual === undefined) {
    return [
      {
        ruleId: "bundle-constant-missing-export",
        detail: `${CONTRACTS_DIST_ENTRY} did not export GAME_BUNDLE_MAX_BYTES`
      }
    ];
  }
  if (actual !== EXPECTED_BUNDLE_MAX_BYTES) {
    return [
      {
        ruleId: "bundle-constant-mismatch",
        detail: `GAME_BUNDLE_MAX_BYTES is ${actual}; expected ${EXPECTED_BUNDLE_MAX_BYTES} (512 * 1024)`
      }
    ];
  }
  return [];
}

function groupByFile(violations) {
  const groups = new Map();
  for (const violation of violations) {
    const list = groups.get(violation.file) ?? [];
    list.push(violation);
    groups.set(violation.file, list);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  return ordered.map(([file, items]) => {
    const sorted = items.sort((left, right) => {
      if (left.line !== right.line) return left.line - right.line;
      return left.ruleId.localeCompare(right.ruleId);
    });
    return { file, items: sorted };
  });
}

function renderViolations(violations, bundleViolations) {
  const grouped = groupByFile(violations);
  const totalRuleViolations = violations.length + bundleViolations.length;
  const lines = [];
  lines.push(`Guardrail violations: ${totalRuleViolations}`);
  for (const { file, items } of grouped) {
    lines.push("");
    lines.push(`  ${file}`);
    for (const item of items) {
      lines.push(`    ${item.line}: [${item.ruleId}] ${item.snippet}`);
    }
  }
  if (bundleViolations.length > 0) {
    lines.push("");
    lines.push("  packages/contracts/dist/game-bundle.js");
    for (const item of bundleViolations) {
      lines.push(`    [${item.ruleId}] ${item.detail}`);
    }
  }
  return lines.join("\n");
}

async function main() {
  const violations = [];
  const files = SCAN_ROOTS.flatMap((root) =>
    walkSourceFiles(join(REPO_ROOT, root))
  );

  for (const { absolute, relPath } of files) {
    const source = readFileSync(absolute, "utf8");
    const lines = source.split(/\r?\n/);

    // (a) LOC limit — test files excluded entirely.
    if (!isTestFile(relPath) && lines.length > LOC_LIMIT) {
      violations.push({
        file: relPath,
        line: 1,
        ruleId: "source-file-too-long",
        snippet: `${lines.length} lines > ${LOC_LIMIT} LOC limit`
      });
    }

    // (b) Forbidden escape patterns — apply to every scanned file.
    violations.push(
      ...scanPatterns(relPath, lines, FORBIDDEN_ESCAPE_PATTERNS).map((hit) => ({
        file: relPath,
        ...hit
      }))
    );

    // (c) Source-only forbidden comments/identifiers (tests excluded),
    // with opt-out for eslint-disable / cspell:disable comment lines.
    if (!isTestFile(relPath)) {
      const shouldIgnore = buildIgnorePredicate(lines);
      violations.push(
        ...scanPatterns(relPath, lines, FORBIDDEN_SOURCE_PATTERNS, (line, index) =>
          shouldIgnore(line, index)
        ).map((hit) => ({ file: relPath, ...hit }))
      );
    }

    // (d) Schema literal drift — apply to every scanned file.
    violations.push(
      ...scanPatterns(relPath, lines, FORBIDDEN_SCHEMA_LITERAL_PATTERNS).map(
        (hit) => ({ file: relPath, ...hit })
      )
    );
  }

  // (e) Bundle chunk-size cap.
  const bundleViolations = await checkBundleConstant();

  if (violations.length === 0 && bundleViolations.length === 0) {
    process.stdout.write(
      `All guardrails pass. (${files.length} files scanned; bundle cap ${EXPECTED_BUNDLE_MAX_BYTES} bytes)\n`
    );
    process.exit(0);
  }

  process.stderr.write(renderViolations(violations, bundleViolations) + "\n");
  process.exit(1);
}

main().catch((error) => {
  process.stderr.write(`guardrails script crashed: ${error.stack ?? error.message}\n`);
  process.exit(2);
});