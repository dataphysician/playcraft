import { z } from "zod";
import type { JsonValue } from "./base.js";

export type JsonPrimitive = string | number | boolean | null;
export type PayloadMeasure = "length" | "count" | "size";
export type CompareOp = "eq" | "neq";
export type LenOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";

export interface PayloadPath {
  key: string;
  measure: PayloadMeasure | null;
}

export type WorkflowConditionExpr =
  | { kind: "compare"; path: PayloadPath; op: CompareOp; value: JsonPrimitive }
  | { kind: "len"; path: PayloadPath; op: LenOp; value: number };

export interface ConditionEvaluationContext {
  payload: Record<string, JsonValue>;
}

export interface ConditionEvaluationResult {
  satisfied: boolean;
  detail: string;
}

const conditionError = (input: string): string =>
  `workflow condition "${input}" is not a supported payload equality or length check`;

const KEY_CHAR = /[A-Za-z0-9_-]/;

class ConditionParseError extends Error {
  constructor(input: string) {
    super(conditionError(input));
    this.name = "ConditionParseError";
  }
}

export function parseWorkflowCondition(input: string): WorkflowConditionExpr {
  if (typeof input !== "string") {
    throw new ConditionParseError(String(input));
  }
  const trimmed = input.trim();
  const parser = new ConditionParser(trimmed);
  const expr = parser.parseExpression();
  parser.skipWhitespace();
  if (!parser.atEnd()) {
    throw new ConditionParseError(trimmed);
  }
  return expr;
}

class ConditionParser {
  private pos = 0;
  constructor(private readonly source: string) {}

  atEnd(): boolean {
    return this.pos >= this.source.length;
  }

  skipWhitespace(): void {
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (char === " " || char === "\t") {
        this.pos += 1;
      } else {
        break;
      }
    }
  }

  parseExpression(): WorkflowConditionExpr {
    this.skipWhitespace();
    if (this.source.startsWith("len(", this.pos)) return this.parseLenExpression();
    if (this.source.startsWith("payload.", this.pos)) return this.parseCompareExpression();
    throw new ConditionParseError(this.source);
  }

  private parseLenExpression(): Extract<WorkflowConditionExpr, { kind: "len" }> {
    this.expectLiteral("len(");
    this.skipWhitespace();
    const path = this.parsePayloadKey();
    this.skipWhitespace();
    this.expectLiteral(")");
    this.skipWhitespace();
    const opToken = this.readOperator();
    this.skipWhitespace();
    const value = this.readNumber();
    this.skipWhitespace();
    if (!this.atEnd()) throw new ConditionParseError(this.source);
    return { kind: "len", path, op: mapLenOp(opToken), value };
  }

  private parseCompareExpression(): Extract<WorkflowConditionExpr, { kind: "compare" }> {
    const path = this.parsePayloadKey();
    this.skipWhitespace();
    const opToken = this.readOperator();
    this.skipWhitespace();
    const value = this.readLiteral();
    this.skipWhitespace();
    if (!this.atEnd()) throw new ConditionParseError(this.source);
    return { kind: "compare", path, op: mapCompareOp(opToken), value };
  }

  private parsePayloadKey(): PayloadPath {
    this.expectLiteral("payload.");
    const start = this.pos;
    while (this.pos < this.source.length && KEY_CHAR.test(this.source[this.pos] ?? "")) {
      this.pos += 1;
    }
    const key = this.source.slice(start, this.pos);
    if (key.length === 0) throw new ConditionParseError(this.source);
    return { key, measure: this.readMeasureSuffix() };
  }

  private readMeasureSuffix(): PayloadMeasure | null {
    for (const suffix of [".length", ".count", ".size"] as const) {
      if (this.source.startsWith(suffix, this.pos)) {
        this.pos += suffix.length;
        return suffix.slice(1) as PayloadMeasure;
      }
    }
    return null;
  }

  private readOperator(): string {
    const two = this.source.slice(this.pos, this.pos + 2);
    if (two === "==" || two === "!=" || two === ">=" || two === "<=") {
      this.pos += 2;
      return two;
    }
    const one = this.source[this.pos] ?? "";
    if (one === ">" || one === "<") {
      this.pos += 1;
      return one;
    }
    throw new ConditionParseError(this.source);
  }

  private readDigits(): boolean {
    let sawDigit = false;
    while (this.pos < this.source.length) {
      const char = this.source[this.pos] ?? "";
      if (char >= "0" && char <= "9") {
        this.pos += 1;
        sawDigit = true;
      } else {
        break;
      }
    }
    return sawDigit;
  }

  private readNumber(): number {
    const start = this.pos;
    if (this.source[this.pos] === "-") this.pos += 1;
    let sawDigit = this.readDigits();
    if (this.source[this.pos] === ".") {
      this.pos += 1;
      sawDigit = this.readDigits() || sawDigit;
    }
    if (!sawDigit) throw new ConditionParseError(this.source);
    return Number(this.source.slice(start, this.pos));
  }

  private readLiteral(): JsonPrimitive {
    const char = this.source[this.pos] ?? "";
    if (char === '"') return this.readStringLiteral();
    for (const [keyword, value] of [
      ["true", true],
      ["false", false],
      ["null", null]
    ] as const) {
      if (this.source.startsWith(keyword, this.pos)) {
        this.pos += keyword.length;
        return value;
      }
    }
    return this.readNumber();
  }

  private readStringLiteral(): string {
    this.expectLiteral('"');
    let result = "";
    while (this.pos < this.source.length) {
      const char = this.source[this.pos] ?? "";
      if (char === '"') {
        this.pos += 1;
        return result;
      }
      if (char === "\\") {
        if (this.pos + 1 >= this.source.length) throw new ConditionParseError(this.source);
        const next = this.source[this.pos + 1] ?? "";
        if (next === "\n") throw new ConditionParseError(this.source);
        result += next;
        this.pos += 2;
        continue;
      }
      if (char === "\n") throw new ConditionParseError(this.source);
      result += char;
      this.pos += 1;
    }
    throw new ConditionParseError(this.source);
  }

  private expectLiteral(literal: string): void {
    if (!this.source.startsWith(literal, this.pos)) throw new ConditionParseError(this.source);
    this.pos += literal.length;
  }
}

function mapCompareOp(op: string): CompareOp {
  if (op === "==") return "eq";
  if (op === "!=") return "neq";
  throw new ConditionParseError(op);
}

function mapLenOp(op: string): LenOp {
  switch (op) {
    case "==": return "eq";
    case "!=": return "neq";
    case ">": return "gt";
    case ">=": return "gte";
    case "<": return "lt";
    case "<=": return "lte";
    default: throw new ConditionParseError(op);
  }
}

function unmapLenOp(op: LenOp): string {
  switch (op) {
    case "eq": return "==";
    case "neq": return "!=";
    case "gt": return ">";
    case "gte": return ">=";
    case "lt": return "<";
    case "lte": return "<=";
  }
}

function readPayloadValue(payload: Record<string, JsonValue>, key: string): JsonValue {
  if (Object.prototype.hasOwnProperty.call(payload, key)) return payload[key] as JsonValue;
  return null;
}

function computeLength(value: JsonValue): number {
  if (value === null) return 0;
  if (typeof value === "string") return value.length;
  if (typeof value === "number" || typeof value === "boolean") return 1;
  if (Array.isArray(value)) return value.length;
  if (typeof value === "object") return Object.keys(value).length;
  return 0;
}

function compareNumbers(actual: number, op: LenOp, target: number): boolean {
  switch (op) {
    case "eq": return actual === target;
    case "neq": return actual !== target;
    case "gt": return actual > target;
    case "gte": return actual >= target;
    case "lt": return actual < target;
    case "lte": return actual <= target;
  }
}

function looseEqual(actual: JsonValue, expected: JsonPrimitive): boolean {
  if (expected === null) return actual === null;
  if (typeof expected === "string") return actual === expected;
  if (typeof expected === "number") return actual === expected;
  if (typeof expected === "boolean") return actual === expected;
  return false;
}

export function evaluateCondition(
  expr: WorkflowConditionExpr,
  context: ConditionEvaluationContext
): ConditionEvaluationResult {
  return expr.kind === "compare" ? evaluateCompare(expr, context) : evaluateLen(expr, context);
}

function evaluateCompare(
  expr: Extract<WorkflowConditionExpr, { kind: "compare" }>,
  context: ConditionEvaluationContext
): ConditionEvaluationResult {
  const value = readPayloadValue(context.payload, expr.path.key);
  const satisfied = expr.op === "eq" ? looseEqual(value, expr.value) : !looseEqual(value, expr.value);
  const op = expr.op === "eq" ? "==" : "!=";
  return {
    satisfied,
    detail: satisfied
      ? `payload.${expr.path.key} ${op} ${JSON.stringify(expr.value)} evaluated true`
      : `payload.${expr.path.key} ${op} ${JSON.stringify(expr.value)} evaluated false (actual=${JSON.stringify(value)})`
  };
}

function evaluateLen(
  expr: Extract<WorkflowConditionExpr, { kind: "len" }>,
  context: ConditionEvaluationContext
): ConditionEvaluationResult {
  const value = readPayloadValue(context.payload, expr.path.key);
  const length = computeLength(value);
  const satisfied = compareNumbers(length, expr.op, expr.value);
  const op = unmapLenOp(expr.op);
  return {
    satisfied,
    detail: satisfied
      ? `len(payload.${expr.path.key}) ${op} ${String(expr.value)} evaluated true (length=${String(length)})`
      : `len(payload.${expr.path.key}) ${op} ${String(expr.value)} evaluated false (length=${String(length)})`
  };
}

const PayloadPathSchema = z.object({
  key: z.string().min(1),
  measure: z.union([z.enum(["length", "count", "size"]), z.null()])
});

const JsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const compareExprSchema = z.object({
  kind: z.literal("compare"),
  path: PayloadPathSchema,
  op: z.enum(["eq", "neq"]),
  value: JsonPrimitiveSchema
});

const lenExprSchema = z.object({
  kind: z.literal("len"),
  path: PayloadPathSchema,
  op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]),
  value: z.number()
});

export const WorkflowConditionSchema = z
  .union([
    z
      .string()
      .min(1)
      .max(240)
      .transform((value, ctx) => {
        try {
          return parseWorkflowCondition(value);
        } catch (error) {
          const message = error instanceof Error ? error.message : conditionError(value);
          ctx.addIssue({ code: z.ZodIssueCode.custom, message });
          return z.NEVER;
        }
      }),
    compareExprSchema,
    lenExprSchema
  ])
  .transform((value) => value as WorkflowConditionExpr);

export type WorkflowCondition = z.infer<typeof WorkflowConditionSchema>;
