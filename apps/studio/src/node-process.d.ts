interface NodeProcess {
  env: { readonly [key: string]: string | undefined };
  cwd(): string;
}

declare const process: NodeProcess;