import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BuilderServiceResponseSchema,
  WorkflowGraphSchema,
  type WorkflowGraph
} from "@playcraft/contracts";
import { runLocalServiceCli, type LocalServiceCliIo } from "../packages/service/src/cli.js";

import assemblePreviewExportGraph from "../examples/workflows/assemble-preview-export.json";
import assembleWithCustomTemplateGraph from "../examples/workflows/assemble-with-custom-template.json";
import parallelAssembleThreeGraph from "../examples/workflows/parallel-assemble-three.json";
import conditionalExportGraph from "../examples/workflows/conditional-export-only-on-success.json";

interface CapturedIo {
  io: LocalServiceCliIo;
  stdout: string[];
  stderr: string[];
}

function captureIo(): CapturedIo {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message)
    },
    stdout,
    stderr
  };
}

interface ExampleCase {
  name: string;
  fileName: string;
  graph: unknown;
}

const EXAMPLES: ExampleCase[] = [
  {
    name: "assemble-preview-export",
    fileName: "assemble-preview-export.json",
    graph: assemblePreviewExportGraph
  },
  {
    name: "assemble-with-custom-template",
    fileName: "assemble-with-custom-template.json",
    graph: assembleWithCustomTemplateGraph
  },
  {
    name: "parallel-assemble-three",
    fileName: "parallel-assemble-three.json",
    graph: parallelAssembleThreeGraph
  },
  {
    name: "conditional-export-only-on-success",
    fileName: "conditional-export-only-on-success.json",
    graph: conditionalExportGraph
  }
];

describe("examples/workflows JSON parsing", () => {
  for (const example of EXAMPLES) {
    it(`${example.name} parses against WorkflowGraphSchema`, () => {
      const parsed: WorkflowGraph = WorkflowGraphSchema.parse(example.graph);
      expect(parsed.kind).toBe("workflow-graph");
      expect(parsed.schemaVersion).toBe("playcraft.v1");
      expect(parsed.nodes.length).toBeGreaterThan(0);
      expect(parsed.edges.length).toBeGreaterThan(0);
      expect(parsed.startNodeId).toMatch(/^[a-z0-9][a-z0-9.-]*$/u);
      const nodeIds = new Set(parsed.nodes.map((node) => node.id));
      expect(nodeIds.has(parsed.startNodeId)).toBe(true);
      for (const node of parsed.nodes) {
        expect(nodeIds.has(node.id)).toBe(true);
        expect(["catalog", "assemble", "update", "preview", "reset", "get-session", "export-profile", "import-profile", "execute-workflow"]).toContain(node.actionName);
      }
    });
  }
});

describe("examples/workflows CLI execution via run-workflow", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "playcraft-t20-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  for (const example of EXAMPLES) {
    it(`${example.name} runs through runLocalServiceCli without error`, () => {
      const graphPath = join(tempDir, example.fileName);
      writeFileSync(graphPath, JSON.stringify(example.graph, null, 2));

      const capture = captureIo();
      const exitCode = runLocalServiceCli(["run-workflow", graphPath, "--json"], capture.io);

      expect(exitCode).toBe(0);
      expect(capture.stderr).toEqual([]);

      const jsonOutput = capture.stdout.join("\n");
      expect(jsonOutput.length).toBeGreaterThan(0);

      const response = BuilderServiceResponseSchema.parse(JSON.parse(jsonOutput));
      expect(response.kind).toBe("builder-service-response");
      expect(response.actionName).toBe("execute-workflow");
      expect(response.execution).toBeDefined();
      const events = response.execution?.events ?? [];
      expect(events.length).toBeGreaterThan(0);
      const types = events.map((event) => (typeof event === "object" && event !== null && "type" in event ? String((event as { type: unknown }).type) : ""));
      expect(types).toContain("ToolCall");
      expect(types).toContain("RunFinished");
    });
  }
});