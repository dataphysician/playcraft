declare module "node:http" {
  export interface IncomingMessage {
    method?: string;
    url?: string;
    destroy(error?: Error): void;
    on(event: "data", listener: (chunk: string) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    setEncoding(encoding: "utf8"): void;
  }

  export interface ServerResponse {
    end(body?: string): void;
    writeHead(statusCode: number, headers?: Record<string, string>): this;
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
