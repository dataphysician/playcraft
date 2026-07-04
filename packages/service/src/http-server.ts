declare const process: {
  argv: string[];
  exit(code?: number): never;
  on(event: "SIGINT" | "SIGTERM", listener: () => void): void;
};

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import {
  createLocalPlaycraftService,
  handleServiceHttpRequestBody,
  type BuilderServiceHttpResponse,
  type LocalPlaycraftService
} from "./index.js";

export interface PlaycraftHttpServerOptions {
  maxBodyBytes?: number;
  route?: string;
  service?: LocalPlaycraftService;
}

export interface PlaycraftHttpServerStart {
  server: Server;
  url: string;
}

const DEFAULT_ROUTE = "/playcraft";
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

export function createPlaycraftHttpServer(options: PlaycraftHttpServerOptions = {}): Server {
  const service = options.service ?? createLocalPlaycraftService();
  const route = normalizeRoute(options.route ?? DEFAULT_ROUTE);
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

  return createServer((request, response) => {
    void handleHttpRequest({ maxBodyBytes, request, response, route, service }).catch((error: unknown) => {
      writeResponse(response, {
        status: 500,
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          schemaVersion: "playcraft.v1",
          kind: "builder-service-error",
          message: error instanceof Error ? error.message : String(error)
        })
      });
    });
  });
}

export function startPlaycraftHttpServer(input: {
  host?: string;
  port?: number;
  route?: string;
  service?: LocalPlaycraftService;
} = {}): Promise<PlaycraftHttpServerStart> {
  const host = input.host ?? "127.0.0.1";
  const route = normalizeRoute(input.route ?? DEFAULT_ROUTE);
  const server = createPlaycraftHttpServer({
    route,
    service: input.service
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(input.port ?? 8787, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : input.port ?? 8787;
      resolve({
        server,
        url: `http://${host}:${port}${route}`
      });
    });
  });
}

export async function runPlaycraftHttpServerCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parsePlaycraftHttpServerCliArgs(argv);
  const started = await startPlaycraftHttpServer(options);
  console.log(`playcraft-service-http listening ${started.url}`);

  const close = (): void => {
    started.server.close(() => process.exit(0));
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

async function handleHttpRequest(input: {
  maxBodyBytes: number;
  request: IncomingMessage;
  response: ServerResponse;
  route: string;
  service: LocalPlaycraftService;
}): Promise<void> {
  const url = new URL(input.request.url ?? "/", "http://127.0.0.1");

  if (input.request.method === "GET" && url.pathname === "/health") {
    writeResponse(input.response, {
      status: 200,
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        schemaVersion: "playcraft.v1",
        kind: "builder-service-health",
        ok: true
      })
    });
    return;
  }

  if (url.pathname !== input.route) {
    writeResponse(input.response, {
      status: 404,
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        schemaVersion: "playcraft.v1",
        kind: "builder-service-error",
        message: `unknown route ${url.pathname}`
      })
    });
    return;
  }

  if (input.request.method !== "POST") {
    writeResponse(input.response, {
      status: 405,
      headers: {
        "allow": "POST",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        schemaVersion: "playcraft.v1",
        kind: "builder-service-error",
        message: "builder service endpoint requires POST"
      })
    });
    return;
  }

  const body = await readRequestBody(input.request, input.maxBodyBytes);
  writeResponse(input.response, handleServiceHttpRequestBody(body, input.service));
}

function readRequestBody(request: IncomingMessage, maxBodyBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBodyBytes) {
        request.destroy(new Error(`request body exceeds ${maxBodyBytes} bytes`));
        reject(new Error(`request body exceeds ${maxBodyBytes} bytes`));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function writeResponse(response: ServerResponse, output: BuilderServiceHttpResponse): void {
  response.writeHead(output.status, output.headers);
  response.end(output.body);
}

export function parsePlaycraftHttpServerCliArgs(argv: string[]): { host?: string; port?: number; route?: string } {
  const output: { host?: string; port?: number; route?: string } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (entry === "--host") {
      output.host = requiredServeFlagValue(argv, index, entry);
      index += 1;
    } else if (entry === "--port") {
      output.port = parsePort(requiredServeFlagValue(argv, index, entry));
      index += 1;
    } else if (entry === "--route") {
      output.route = normalizeRoute(requiredServeFlagValue(argv, index, entry));
      index += 1;
    } else {
      throw new Error(`unknown option: ${entry}`);
    }
  }

  return output;
}

function requiredServeFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`--port requires an integer from 0 to 65535`);
  }

  return port;
}

function normalizeRoute(route: string): string {
  return route.startsWith("/") ? route : `/${route}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPlaycraftHttpServerCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
