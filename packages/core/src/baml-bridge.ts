import type {
  BamlAssembleGameRequest,
  BamlAssembleGameResponse,
  BamlGeneratedClient,
  BamlPaidOnlineAssemblyRequest,
  BamlPaidOnlineAssemblyResponse
} from "./baml-types.js";

const GENERATED_CLIENT_MODULE = "../baml_client/baml_client/index.js";

let cachedClient: BamlGeneratedClient | undefined;

/**
 * Loads the generated BAML client via dynamic import. The generated module
 * uses `// @ts-nocheck` and bare relative imports, which are not compatible
 * with the project's strict TypeScript at static-import time. The dynamic
 * import keeps the unsafe surface contained inside this module; project code
 * only ever sees the typed shape declared in `baml-types.ts`.
 */
export async function loadGeneratedClient(): Promise<BamlGeneratedClient> {
  if (cachedClient) {
    return cachedClient;
  }
  const imported = await import(GENERATED_CLIENT_MODULE);
  cachedClient = imported as unknown as BamlGeneratedClient;
  return cachedClient;
}

/**
 * Bridge between the strict project code and the BAML-generated client. All
 * exported methods validate their inputs against the hand-maintained
 * `baml-types.ts` mirror so callers do not need to import from the generated
 * `baml_client/` directory.
 */
export class BamlBridge {
  async assembleGame(request: BamlAssembleGameRequest): Promise<BamlAssembleGameResponse> {
    const client = await loadGeneratedClient();
    return client.AssembleGame(request);
  }

  async paidOnlineAssembly(request: BamlPaidOnlineAssemblyRequest): Promise<BamlPaidOnlineAssemblyResponse> {
    const client = await loadGeneratedClient();
    return client.PaidOnlineAssembly(request);
  }
}

export const bamlBridge = new BamlBridge();