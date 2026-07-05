declare module "node:http" {
  export interface IncomingMessage {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined>;
    destroy(error?: Error): void;
    on(event: "data", listener: (chunk: string) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    on(event: "close", listener: () => void): this;
    setEncoding(encoding: "utf8"): void;
  }

  export interface ServerResponse {
    end(): void;
    end(body?: string): void;
    write(chunk: Uint8Array | string): boolean;
    writeHead(statusCode: number, headers?: Record<string, string>): this;
    setHeader(name: string, value: string): void;
    getHeader(name: string): string | undefined;
    destroy(error?: Error): void;
    once(event: "drain", listener: () => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "error", listener: (error: Error) => void): this;
  }

  export interface Server {
    address(): string | { address: string; family: string; port: number } | null;
    close(callback?: (error?: Error) => void): this;
    listen(port: number, hostname: string, listeningListener?: () => void): this;
    on(event: "error", listener: (error: Error) => void): this;
  }

  export function createServer(
    requestListener: (request: IncomingMessage, response: ServerResponse) => void
  ): Server;
}
