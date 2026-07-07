import type {
  BuilderCatalog,
  BuilderServiceRequest,
  BuilderServiceResponse
} from "@playcraft/contracts";

/**
 * Minimal duck-typed surface that the MCP tool-call needs from a builder
 * service. The `@playcraft/service` `LocalPlaycraftService` class satisfies
 * this interface structurally, so callers can pass either a `LocalPlaycraftService`
 * instance or any custom implementation that exposes `catalog()` and `handle()`.
 *
 * Defined in `@playcraft/mcp` so the MCP package can stay free of any runtime
 * dependency on `@playcraft/service`. Tests are free to import the real
 * `LocalPlaycraftService`; production code only needs to honor the shape.
 */
export interface McpServiceFacade {
  catalog(): BuilderCatalog;
  handle(
    request: BuilderServiceRequest
  ): BuilderServiceResponse | Promise<BuilderServiceResponse>;
}
