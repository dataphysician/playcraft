import { describe, expect, it } from "vitest";
import {
  WorkflowConditionSchema,
  evaluateCondition,
  parseWorkflowCondition,
  type WorkflowConditionExpr
} from "@playcraft/contracts";
import type { JsonValue } from "@playcraft/contracts";

function parse(source: string): WorkflowConditionExpr {
  return parseWorkflowCondition(source);
}

function evaluate(expr: WorkflowConditionExpr, payload: Record<string, JsonValue>) {
  return evaluateCondition(expr, { payload });
}

describe("parseWorkflowCondition — equality form", () => {
  it("parses payload.<key> == \"string\"", () => {
    expect(parse('payload.name == "dinosaurs"')).toEqual({
      kind: "compare",
      path: { key: "name", measure: null },
      op: "eq",
      value: "dinosaurs"
    });
  });

  it("parses payload.<key> != \"string\"", () => {
    expect(parse('payload.name != "cars"')).toEqual({
      kind: "compare",
      path: { key: "name", measure: null },
      op: "neq",
      value: "cars"
    });
  });

  it("parses integer literal", () => {
    expect(parse("payload.count == 42")).toEqual({
      kind: "compare",
      path: { key: "count", measure: null },
      op: "eq",
      value: 42
    });
  });

  it("parses negative integer literal", () => {
    expect(parse("payload.delta == -7")).toEqual({
      kind: "compare",
      path: { key: "delta", measure: null },
      op: "eq",
      value: -7
    });
  });

  it("parses float literal", () => {
    expect(parse("payload.ratio == 3.14")).toEqual({
      kind: "compare",
      path: { key: "ratio", measure: null },
      op: "eq",
      value: 3.14
    });
  });

  it("parses true literal", () => {
    expect(parse("payload.enabled == true")).toEqual({
      kind: "compare",
      path: { key: "enabled", measure: null },
      op: "eq",
      value: true
    });
  });

  it("parses false literal", () => {
    expect(parse("payload.enabled == false")).toEqual({
      kind: "compare",
      path: { key: "enabled", measure: null },
      op: "eq",
      value: false
    });
  });

  it("parses null literal", () => {
    expect(parse("payload.target == null")).toEqual({
      kind: "compare",
      path: { key: "target", measure: null },
      op: "eq",
      value: null
    });
  });

  it("parses payload.<key>.length equality", () => {
    expect(parse("payload.items.length == 5")).toEqual({
      kind: "compare",
      path: { key: "items", measure: "length" },
      op: "eq",
      value: 5
    });
  });

  it("parses payload.<key>.count equality", () => {
    expect(parse("payload.tags.count == 3")).toEqual({
      kind: "compare",
      path: { key: "tags", measure: "count" },
      op: "eq",
      value: 3
    });
  });

  it("parses payload.<key>.size equality", () => {
    expect(parse("payload.map.size == 7")).toEqual({
      kind: "compare",
      path: { key: "map", measure: "size" },
      op: "eq",
      value: 7
    });
  });

  it("decodes escaped quotes inside a string literal", () => {
    expect(parse('payload.text == "hello \\"world\\""')).toEqual({
      kind: "compare",
      path: { key: "text", measure: null },
      op: "eq",
      value: 'hello "world"'
    });
  });

  it("decodes backslash escapes inside a string literal", () => {
    expect(parse('payload.path == "a\\\\b"')).toEqual({
      kind: "compare",
      path: { key: "path", measure: null },
      op: "eq",
      value: "a\\b"
    });
  });

  it("tolerates surrounding whitespace", () => {
    expect(parse('  payload.name == "x"  ')).toEqual({
      kind: "compare",
      path: { key: "name", measure: null },
      op: "eq",
      value: "x"
    });
  });

  it("accepts keys with underscores, hyphens, and digits", () => {
    expect(parse("payload.user_id-1 == true")).toEqual({
      kind: "compare",
      path: { key: "user_id-1", measure: null },
      op: "eq",
      value: true
    });
  });
});

describe("parseWorkflowCondition — len form", () => {
  it("parses len(payload.<key>) == <number>", () => {
    expect(parse("len(payload.items) == 3")).toEqual({
      kind: "len",
      path: { key: "items", measure: null },
      op: "eq",
      value: 3
    });
  });

  it("parses len(payload.<key>) != <number>", () => {
    expect(parse("len(payload.items) != 3")).toEqual({
      kind: "len",
      path: { key: "items", measure: null },
      op: "neq",
      value: 3
    });
  });

  it("parses len(payload.<key>) > <number>", () => {
    expect(parse("len(payload.items) > 2")).toEqual({
      kind: "len",
      path: { key: "items", measure: null },
      op: "gt",
      value: 2
    });
  });

  it("parses len(payload.<key>) >= <number>", () => {
    expect(parse("len(payload.items) >= 2")).toEqual({
      kind: "len",
      path: { key: "items", measure: null },
      op: "gte",
      value: 2
    });
  });

  it("parses len(payload.<key>) < <number>", () => {
    expect(parse("len(payload.items) < 10")).toEqual({
      kind: "len",
      path: { key: "items", measure: null },
      op: "lt",
      value: 10
    });
  });

  it("parses len(payload.<key>) <= <number>", () => {
    expect(parse("len(payload.items) <= 10")).toEqual({
      kind: "len",
      path: { key: "items", measure: null },
      op: "lte",
      value: 10
    });
  });

  it("parses len(payload.<key>.length)", () => {
    expect(parse("len(payload.items.length) == 3")).toEqual({
      kind: "len",
      path: { key: "items", measure: "length" },
      op: "eq",
      value: 3
    });
  });

  it("parses len(payload.<key>.count)", () => {
    expect(parse("len(payload.tags.count) >= 1")).toEqual({
      kind: "len",
      path: { key: "tags", measure: "count" },
      op: "gte",
      value: 1
    });
  });

  it("parses len(payload.<key>.size)", () => {
    expect(parse("len(payload.map.size) > 0")).toEqual({
      kind: "len",
      path: { key: "map", measure: "size" },
      op: "gt",
      value: 0
    });
  });

  it("parses len(payload.<key>) with negative number", () => {
    expect(parse("len(payload.items) > -1")).toEqual({
      kind: "len",
      path: { key: "items", measure: null },
      op: "gt",
      value: -1
    });
  });

  it("parses len(payload.<key>) with float", () => {
    expect(parse("len(payload.items) > 1.5")).toEqual({
      kind: "len",
      path: { key: "items", measure: null },
      op: "gt",
      value: 1.5
    });
  });

  it("tolerates whitespace inside len(...)", () => {
    expect(parse("len( payload.items ) == 3")).toEqual({
      kind: "len",
      path: { key: "items", measure: null },
      op: "eq",
      value: 3
    });
  });
});

describe("parseWorkflowCondition — failure modes", () => {
  const invalid: string[] = [
    "",
    " ",
    "not a real condition",
    "payload.",
    "payload. == 5",
    "payload.name",
    "payload.name ==",
    "payload.name == ",
    "payload.name !! 5",
    "payload.name < \"x\"",
    "len() == 5",
    "len(payload.items",
    "len(payload.items == 5",
    "len(payload.items) == ",
    "len(payload.items) >>> 5",
    "len(payload.) == 5",
    "len(payload.items) == \"5\"",
    "len(payload.items) == true",
    "payload.name == 'unquoted'",
    "payload.name == hello",
    "payload.name == \"unterminated",
    "payload.name == \"with\nnewline\"",
    "1 + 1",
    "payload.name == 5 payload.name == 6",
    "&& payload.name == 5",
    "payload.name == 5 || payload.other == 6"
  ];

  for (const source of invalid) {
    it(`rejects ${JSON.stringify(source)}`, () => {
      expect(() => parse(source)).toThrow(/workflow condition/i);
    });
  }

  it("rejects an over-length string", () => {
    const longInput = "payload." + "a".repeat(250);
    expect(() => WorkflowConditionSchema.parse(longInput)).toThrow();
  });

  it("rejects an empty string via the schema", () => {
    expect(() => WorkflowConditionSchema.parse("")).toThrow();
  });
});

describe("evaluateCondition — compare form", () => {
  it("matches when payload value equals string literal", () => {
    const expr = parse('payload.theme == "dinosaurs"');
    const result = evaluate(expr, { theme: "dinosaurs" });
    expect(result.satisfied).toBe(true);
    expect(result.detail).toBe('payload.theme == "dinosaurs" evaluated true');
  });

  it("does not match when payload value differs from string literal", () => {
    const expr = parse('payload.theme == "dinosaurs"');
    const result = evaluate(expr, { theme: "toys" });
    expect(result.satisfied).toBe(false);
    expect(result.detail).toBe('payload.theme == "dinosaurs" evaluated false (actual="toys")');
  });

  it("reports the actual null when a key is missing", () => {
    const expr = parse('payload.theme == "dinosaurs"');
    const result = evaluate(expr, {});
    expect(result.satisfied).toBe(false);
    expect(result.detail).toBe('payload.theme == "dinosaurs" evaluated false (actual=null)');
  });

  it("reports detail with null literal value", () => {
    const expr = parse("payload.theme == null");
    const result = evaluate(expr, {});
    expect(result.satisfied).toBe(true);
    expect(result.detail).toBe("payload.theme == null evaluated true");
  });

  it("matches numbers strictly without coercion", () => {
    const expr = parse("payload.count == 5");
    expect(evaluate(expr, { count: 5 }).satisfied).toBe(true);
    expect(evaluate(expr, { count: "5" }).satisfied).toBe(false);
  });

  it("matches booleans strictly", () => {
    const expr = parse("payload.flag == true");
    expect(evaluate(expr, { flag: true }).satisfied).toBe(true);
    expect(evaluate(expr, { flag: false }).satisfied).toBe(false);
  });

  it("supports neq operator with strings", () => {
    const expr = parse('payload.theme != "cars"');
    expect(evaluate(expr, { theme: "dinosaurs" }).satisfied).toBe(true);
    expect(evaluate(expr, { theme: "cars" }).satisfied).toBe(false);
  });

  it("supports neq with the same value producing not satisfied", () => {
    const expr = parse('payload.theme != "dinosaurs"');
    const result = evaluate(expr, { theme: "dinosaurs" });
    expect(result.satisfied).toBe(false);
    expect(result.detail).toBe('payload.theme != "dinosaurs" evaluated false (actual="dinosaurs")');
  });

  it("treats missing key as null for comparison", () => {
    const expr = parse("payload.theme == null");
    expect(evaluate(expr, {}).satisfied).toBe(true);
  });
});

describe("evaluateCondition — len form", () => {
  it("computes length of an array", () => {
    const expr = parse("len(payload.items) == 3");
    expect(evaluate(expr, { items: [1, 2, 3] }).satisfied).toBe(true);
    expect(evaluate(expr, { items: [1, 2] }).satisfied).toBe(false);
  });

  it("computes length of a string", () => {
    const expr = parse("len(payload.text) == 5");
    expect(evaluate(expr, { text: "hello" }).satisfied).toBe(true);
    expect(evaluate(expr, { text: "hi" }).satisfied).toBe(false);
  });

  it("computes length of an object (key count)", () => {
    const expr = parse("len(payload.obj) == 2");
    expect(evaluate(expr, { obj: { a: 1, b: 2 } }).satisfied).toBe(true);
  });

  it("treats null as length 0", () => {
    const expr = parse("len(payload.maybe) == 0");
    expect(evaluate(expr, {}).satisfied).toBe(true);
    expect(evaluate(expr, { maybe: null }).satisfied).toBe(true);
  });

  it("treats numbers and booleans as length 1", () => {
    const exprNum = parse("len(payload.num) == 1");
    expect(evaluate(exprNum, { num: 42 }).satisfied).toBe(true);
    const exprBool = parse("len(payload.flag) == 1");
    expect(evaluate(exprBool, { flag: false }).satisfied).toBe(true);
  });

  it("supports > operator", () => {
    const expr = parse("len(payload.items) > 2");
    expect(evaluate(expr, { items: [1, 2, 3] }).satisfied).toBe(true);
    expect(evaluate(expr, { items: [1, 2] }).satisfied).toBe(false);
  });

  it("supports >= operator", () => {
    const expr = parse("len(payload.items) >= 2");
    expect(evaluate(expr, { items: [1, 2] }).satisfied).toBe(true);
    expect(evaluate(expr, { items: [1] }).satisfied).toBe(false);
  });

  it("supports < operator", () => {
    const expr = parse("len(payload.items) < 3");
    expect(evaluate(expr, { items: [1, 2] }).satisfied).toBe(true);
    expect(evaluate(expr, { items: [1, 2, 3] }).satisfied).toBe(false);
  });

  it("supports <= operator", () => {
    const expr = parse("len(payload.items) <= 2");
    expect(evaluate(expr, { items: [1, 2] }).satisfied).toBe(true);
    expect(evaluate(expr, { items: [1, 2, 3] }).satisfied).toBe(false);
  });

  it("supports != operator", () => {
    const expr = parse("len(payload.items) != 3");
    expect(evaluate(expr, { items: [1, 2] }).satisfied).toBe(true);
    expect(evaluate(expr, { items: [1, 2, 3] }).satisfied).toBe(false);
  });

  it("formats detail string for true comparison", () => {
    const expr = parse("len(payload.items) == 3");
    const result = evaluate(expr, { items: [1, 2, 3] });
    expect(result.detail).toBe("len(payload.items) == 3 evaluated true (length=3)");
  });

  it("formats detail string for false comparison", () => {
    const expr = parse("len(payload.items) == 3");
    const result = evaluate(expr, { items: [1, 2] });
    expect(result.detail).toBe("len(payload.items) == 3 evaluated false (length=2)");
  });

  it("formats detail string for > operator", () => {
    const expr = parse("len(payload.items) > 2");
    const result = evaluate(expr, { items: [1, 2, 3] });
    expect(result.detail).toBe("len(payload.items) > 2 evaluated true (length=3)");
  });

  it("formats detail string for != operator", () => {
    const expr = parse("len(payload.items) != 3");
    const result = evaluate(expr, { items: [1, 2, 3] });
    expect(result.detail).toBe("len(payload.items) != 3 evaluated false (length=3)");
  });
});

describe("WorkflowConditionSchema", () => {
  it("parses a valid condition into the AST", () => {
    const ast = WorkflowConditionSchema.parse('payload.theme == "dinosaurs"');
    expect(ast).toEqual({
      kind: "compare",
      path: { key: "theme", measure: null },
      op: "eq",
      value: "dinosaurs"
    });
  });

  it("parses a len condition into the AST", () => {
    const ast = WorkflowConditionSchema.parse("len(payload.items) > 2");
    expect(ast).toEqual({
      kind: "len",
      path: { key: "items", measure: null },
      op: "gt",
      value: 2
    });
  });

  it("rejects malformed input with a workflow condition message", () => {
    expect(() => WorkflowConditionSchema.parse("not a real condition")).toThrow(
      /workflow condition/i
    );
  });

  it("rejects empty input", () => {
    expect(() => WorkflowConditionSchema.parse("")).toThrow();
  });

  it("rejects an over-length string", () => {
    const overLong = "payload." + "a".repeat(250);
    expect(() => WorkflowConditionSchema.parse(overLong)).toThrow();
  });

  it("exposes a WorkflowCondition type alias that matches the AST", () => {
    const ast: ReturnType<typeof WorkflowConditionSchema.parse> = parse(
      'payload.theme == "dinosaurs"'
    );
    expect(ast.kind).toBe("compare");
  });
});
