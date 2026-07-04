declare const process: {
  argv: string[];
  exit(code?: number): never;
  on(event: "SIGINT" | "SIGTERM", listener: () => void): void;
};

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { PLAYCRAFT_SCHEMA_VERSION } from "@playcraft/contracts";
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

export const PLAYCRAFT_HTTP_SERVICE_POLICY = {
  defaultHost: "127.0.0.1",
  defaultMaxBodyBytes: 1024 * 1024,
  defaultPort: 8787,
  defaultRoute: "/playcraft",
  urlParseBase: "http://127.0.0.1"
} as const;

export function createPlaycraftHttpServer(options: PlaycraftHttpServerOptions = {}): Server {
  const service = options.service ?? createLocalPlaycraftService();
  const route = normalizeRoute(options.route ?? PLAYCRAFT_HTTP_SERVICE_POLICY.defaultRoute);
  const maxBodyBytes = options.maxBodyBytes ?? PLAYCRAFT_HTTP_SERVICE_POLICY.defaultMaxBodyBytes;

  return createServer((request, response) => {
    void handleHttpRequest({ maxBodyBytes, request, response, route, service }).catch((error: unknown) => {
      writeResponse(response, {
        status: 500,
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
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
  const host = input.host ?? PLAYCRAFT_HTTP_SERVICE_POLICY.defaultHost;
  const route = normalizeRoute(input.route ?? PLAYCRAFT_HTTP_SERVICE_POLICY.defaultRoute);
  const server = createPlaycraftHttpServer({
    route,
    service: input.service
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(input.port ?? PLAYCRAFT_HTTP_SERVICE_POLICY.defaultPort, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : input.port ?? PLAYCRAFT_HTTP_SERVICE_POLICY.defaultPort;
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
  const url = new URL(input.request.url ?? "/", PLAYCRAFT_HTTP_SERVICE_POLICY.urlParseBase);

  if (input.request.method === "GET" && url.pathname === "/health") {
    writeResponse(input.response, {
      status: 200,
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
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
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
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
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
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
