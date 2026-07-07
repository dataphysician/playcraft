declare const process: {
  argv: string[];
  exit(code?: number): never;
  on(event: "SIGINT" | "SIGTERM", listener: () => void): void;
};

import { realpathSync } from "node:fs";

const __filename = new URL(import.meta.url).pathname;

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import {
  BuilderCatalogSchema,
  BuilderServiceRequestSchema,
  PLAYCRAFT_SCHEMA_VERSION,
  PLAYCRAFT_MCP_GUARDRAILS,
  type BuilderCatalog,
  type BuilderServiceRequest,
  type McpTool
} from "@playcraft/contracts";
import {
  adapterToolsToMcp,
  createMcpManifest,
  invokeMcpTool,
  type InvokeMcpToolArgs
} from "@playcraft/mcp";
import {
  createLocalPlaycraftService,
  handleServiceHttpRequestBody,
  type BuilderServiceHttpResponse,
  type LocalPlaycraftService
} from "./index.js";
import { createSseResponse } from "./sse.js";

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
  defaultStreamSuffix: "/stream",
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
  const streamPath = `${input.route}${PLAYCRAFT_HTTP_SERVICE_POLICY.defaultStreamSuffix}`;
  const catalogPath = `${input.route}/catalog`;
  const toolsListPath = `${input.route}/tools/list`;
  const toolsCallPath = `${input.route}/tools/call`;

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

  if (url.pathname === streamPath) {
    await handleStreamRoute(input, url);
    return;
  }

  if (input.request.method === "GET" && url.pathname === catalogPath) {
    await handleMcpCatalogRoute(input);
    return;
  }

  if (input.request.method === "POST" && url.pathname === toolsListPath) {
    await handleMcpToolsListRoute(input, url);
    return;
  }

  if (input.request.method === "POST" && url.pathname === toolsCallPath) {
    await handleMcpToolsCallRoute(input);
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

async function handleMcpCatalogRoute(input: {
  response: ServerResponse;
  service: LocalPlaycraftService;
}): Promise<void> {
  const baseCatalog = input.service.catalog();
  const manifest = createMcpManifest(baseCatalog.tools, baseCatalog.service);
  const catalog: BuilderCatalog = BuilderCatalogSchema.parse({
    ...baseCatalog,
    mcp: {
      manifest,
      tools: manifest.tools
    }
  });
  writeResponse(input.response, {
    status: 200,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(catalog)
  });
}

async function handleMcpToolsListRoute(input: {
  response: ServerResponse;
  service: LocalPlaycraftService;
}, url: URL): Promise<void> {
  const baseCatalog = input.service.catalog();
  const allTools: McpTool[] = adapterToolsToMcp(baseCatalog.tools);
  const includeParam = url.searchParams.get("include");
  const includeList = includeParam === null
    ? []
    : includeParam.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);

  const filteredTools = includeList.length === 0
    ? allTools
    : allTools.filter((tool) => {
        const actionName = tool.name.startsWith("tool:") ? tool.name.slice("tool:".length) : tool.name;
        return includeList.includes(actionName) || includeList.includes(tool.name);
      });

  writeResponse(input.response, {
    status: 200,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(filteredTools)
  });
}

async function handleMcpToolsCallRoute(input: {
  maxBodyBytes: number;
  request: IncomingMessage;
  response: ServerResponse;
  service: LocalPlaycraftService;
}): Promise<void> {
  let rawBody: string;
  try {
    rawBody = await readRequestBody(input.request, input.maxBodyBytes);
  } catch (error) {
    writeJsonError(input.response, 400, "builder-service-error", errorMessage(error));
    return;
  }

  let parsed: { name: string; arguments: InvokeMcpToolArgs };
  try {
    const json = JSON.parse(rawBody) as unknown;
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      writeJsonError(
        input.response,
        400,
        "builder-service-error",
        "tools/call request body must be a JSON object with name and arguments fields"
      );
      return;
    }
    const candidate = json as { name?: unknown; arguments?: unknown };
    if (typeof candidate.name !== "string" || candidate.name.length === 0) {
      writeJsonError(
        input.response,
        400,
        "builder-service-error",
        "tools/call request body must include a non-empty name string"
      );
      return;
    }
    const args = candidate.arguments;
    if (args === undefined) {
      parsed = { name: candidate.name, arguments: {} };
    } else if (args === null || typeof args !== "object" || Array.isArray(args)) {
      writeJsonError(
        input.response,
        400,
        "builder-service-error",
        "tools/call arguments must be a JSON object when provided"
      );
      return;
    } else {
      parsed = { name: candidate.name, arguments: args as InvokeMcpToolArgs };
    }
  } catch (error) {
    writeJsonError(input.response, 400, "builder-service-error", errorMessage(error));
    return;
  }

  if (!PLAYCRAFT_MCP_GUARDRAILS.allowlistedTools.includes(parsed.name)) {
    writeJsonError(
      input.response,
      403,
      "tool-not-allowed",
      `tool ${parsed.name} is not in the PLAYCRAFT_MCP_GUARDRAILS allowlist`
    );
    return;
  }

  const headerSessionId = headerValue(input.request, "x-session-id");
  if (headerSessionId) {
    const expiryError = input.service.checkSessionExpiry(headerSessionId);
    if (expiryError) {
      writeJsonError(input.response, 401, "session-expired", expiryError.message);
      return;
    }
  }

  try {
    const argsWithSession = headerSessionId
      ? { ...parsed.arguments, sessionId: headerSessionId }
      : parsed.arguments;
    const response = await invokeMcpTool(parsed.name, argsWithSession, input.service);
    writeResponse(input.response, {
      status: 200,
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(response)
    });
  } catch (error) {
    writeJsonError(input.response, 400, "builder-service-error", errorMessage(error));
  }
}

function writeJsonError(
  response: ServerResponse,
  status: number,
  kind: string,
  message: string
): void {
  writeResponse(response, {
    status,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      kind,
      message
    })
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function handleStreamRoute(
  input: { request: IncomingMessage; response: ServerResponse; service: LocalPlaycraftService },
  url: URL
): Promise<void> {
  if (input.request.method !== "GET") {
    writeResponse(input.response, {
      status: 405,
      headers: {
        "allow": "GET",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        kind: "builder-service-error",
        message: "SSE stream endpoint requires GET"
      })
    });
    return;
  }

  const acceptHeader = headerValue(input.request, "accept") ?? "";
  if (!acceptHeader.toLowerCase().includes("text/event-stream")) {
    writeResponse(input.response, {
      status: 406,
      headers: {
        "accept": "text/event-stream",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        kind: "builder-service-error",
        message: "SSE stream endpoint requires Accept: text/event-stream"
      })
    });
    return;
  }

  let requestInput: BuilderServiceRequest;
  try {
    requestInput = buildStreamRequest(url.searchParams);
  } catch (error) {
    writeResponse(input.response, {
      status: 400,
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
        kind: "builder-service-error",
        message: error instanceof Error ? error.message : String(error)
      })
    });
    return;
  }

  const sseResponse = createSseResponse(() => input.service.stream(requestInput));
  await streamWebResponseToNode(sseResponse, input.response);
}

function buildStreamRequest(params: URLSearchParams): BuilderServiceRequest {
  const actionName = params.get("action");
  if (!actionName) {
    throw new Error("SSE stream endpoint requires action query parameter");
  }

  const request: Record<string, unknown> = {
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
    id: params.get("id") ?? `builder-service-request.stream.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`,
    version: "1.0.0",
    kind: "builder-service-request",
    actionName
  };

  for (const field of ["sessionId", "text", "source", "templateId"] as const) {
    const value = params.get(field);
    if (value !== null) {
      request[field] = value;
    }
  }

  for (const field of ["moonshineTranscript", "assetEdit", "interaction"] as const) {
    const raw = params.get(field);
    if (raw !== null) {
      try {
        request[field] = JSON.parse(raw) as unknown;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`SSE stream ${field} must be valid JSON: ${message}`);
      }
    }
  }

  return BuilderServiceRequestSchema.parse(request);
}

async function streamWebResponseToNode(webResponse: Response, nodeResponse: ServerResponse): Promise<void> {
  const headers: Record<string, string> = {};
  webResponse.headers.forEach((value, key) => {
    headers[key] = value;
  });
  nodeResponse.writeHead(webResponse.status, headers);

  if (!webResponse.body) {
    nodeResponse.end();
    return;
  }

  const reader = webResponse.body.getReader();
  let finished = false;
  const finalize = (): void => {
    if (!finished) {
      finished = true;
      nodeResponse.end();
    }
  };
  nodeResponse.on("close", finalize);
  nodeResponse.on("error", finalize);

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      const flushed = nodeResponse.write(value);
      if (!flushed) {
        await new Promise<void>((resolve) => {
          nodeResponse.once("drain", resolve);
        });
      }
    }
    if (!finished) {
      finished = true;
      nodeResponse.end();
    }
  } catch (error) {
    nodeResponse.destroy(error instanceof Error ? error : new Error(String(error)));
  }
}

function headerValue(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return value;
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

if (realpathSync(process.argv[1]) === __filename) {
  runPlaycraftHttpServerCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
