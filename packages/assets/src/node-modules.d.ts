declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string;
  export function mkdtempSync(prefix: string): string;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  export function writeFileSync(path: string, data: string): void;
}

declare module "node:path" {
  export function isAbsolute(path: string): boolean;
  export function join(...segments: string[]): string;
  export function resolve(...segments: string[]): string;
}