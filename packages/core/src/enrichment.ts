import {
  PLAYCRAFT_SCHEMA_VERSION,
  RemoteEnrichmentRequestSchema,
  type RemoteEnrichmentRequest,
  type RemoteEnrichmentResponse
} from "@playcraft/contracts";
import { RemoteEnrichmentResponseSchema } from "@playcraft/contracts";

/**
 * Remote enrichment sources fill capability gaps the local registries
 * cannot satisfy. The local agent loop calls `enrich` when its tools
 * return a capability gap.
 *
 * Implementations:
 *   - `NullRemoteEnrichmentSource` (default, returns "unsupported" — local-only)
 *   - Future: HTTP-backed source for the extended repo
 *
 * Invariants:
 *   - Never blocks the agent loop for more than `timeoutMs`
 *   - Never returns partial responses — either fully `ok` with all
 *     requested building blocks, or a non-ok status
 *   - Total response bytes must fit within the bundle cap (the
 *     implementation is responsible for capping)
 */
export interface RemoteEnrichmentSource {
  readonly id: string;
  readonly version: string;
  enrich(request: RemoteEnrichmentRequest, options: { timeoutMs: number }): Promise<RemoteEnrichmentResponse>;
}

export class NullRemoteEnrichmentSource implements RemoteEnrichmentSource {
  readonly id = "enrichment.null";
  readonly version = "1.0.0";

  async enrich(request: RemoteEnrichmentRequest): Promise<RemoteEnrichmentResponse> {
    const parsedRequest = RemoteEnrichmentRequestSchema.parse(request);
    return RemoteEnrichmentResponseSchema.parse({
      schemaVersion: PLAYCRAFT_SCHEMA_VERSION,
      id: `remote-enrichment-response.${parsedRequest.requestId}`,
      version: "1.0.0",
      kind: "remote-enrichment-response",
      requestId: parsedRequest.requestId,
      status: "unsupported",
      components: [],
      rules: [],
      assetSources: [],
      bytes: 0,
      cacheHit: false,
      error: "Remote enrichment is not configured; local registries must satisfy all capabilities."
    });
  }
}