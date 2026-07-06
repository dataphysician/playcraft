declare module "node:fs" {
  export function readFileSync(
    path: string,
    encoding: "utf8"
  ): string;
  export function readFileSync(path: string): Uint8Array;
  export function realpathSync(path: string): string;
}
