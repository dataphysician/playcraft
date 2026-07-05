import React from "react";

import { mergeAssetCatalogs } from "@playcraft/assets";
import {
  AssetCatalogManifestSchema,
  type AssetCatalogManifest,
  type BuilderAssetEditCatalogEntry,
  type BuilderCatalog
} from "@playcraft/contracts";

import {
  createConfiguredStudioClient,
  serviceEndpointFromStudioRuntimeEnv,
  studioRuntimeEnvFromServiceEndpoint
} from "./local-client.js";
import type { StudioClient } from "./types.js";
import { StudioApp } from "./studio-app.js";

const replacementManifestModules = import.meta.glob<unknown>(
  "./assets/library/replacements/*/catalog.json",
  { eager: true, import: "default" }
);

interface DiscoveredCatalogSource {
  folder: string;
  manifest: AssetCatalogManifest | null;
}

function discoverBundledReplacementCatalog(): DiscoveredCatalogSource[] {
  const sources: DiscoveredCatalogSource[] = [];
  for (const [path, rawModule] of Object.entries(replacementManifestModules)) {
    const parts = path.split("/");
    const folder = parts.at(-2) ?? "";
    let manifest: AssetCatalogManifest | null = null;
    try {
      manifest = AssetCatalogManifestSchema.parse(rawModule);
    } catch {
      manifest = null;
    }
    sources.push({ folder, manifest });
  }
  sources.sort((left, right) => left.folder.localeCompare(right.folder));
  return sources;
}

function mergedAvailableThemes(
  bundled: BuilderAssetEditCatalogEntry[],
  manifests: AssetCatalogManifest[]
): BuilderAssetEditCatalogEntry[] {
  return mergeAssetCatalogs(bundled, manifests);
}

function buildAssetEditCatalogOverride(baseCatalog: BuilderCatalog): BuilderCatalog {
  const manifests = discoverBundledReplacementCatalog()
    .map((source) => source.manifest)
    .filter((manifest): manifest is AssetCatalogManifest => manifest !== null);
  return {
    ...baseCatalog,
    assetEdit: {
      ...baseCatalog.assetEdit,
      availableThemes: mergedAvailableThemes(baseCatalog.assetEdit.availableThemes, manifests)
    }
  };
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function withCatalogOverride(client: StudioClient): StudioClient {
  const originalCatalog = client.catalog?.bind(client);
  if (!originalCatalog) {
    return client;
  }

  let overridden: BuilderCatalog | Promise<BuilderCatalog> | undefined;
  const resolveOverride = (): BuilderCatalog | Promise<BuilderCatalog> => {
    if (overridden !== undefined) {
      return overridden;
    }
    const baseResult = originalCatalog();
    if (isPromiseLike(baseResult)) {
      overridden = baseResult.then((loaded) => buildAssetEditCatalogOverride(loaded as BuilderCatalog));
    } else {
      overridden = buildAssetEditCatalogOverride(baseResult);
    }
    return overridden;
  };

  return {
    ...client,
    catalog() {
      return resolveOverride();
    }
  };
}

export function App(): React.JSX.Element {
  const serviceEndpoint = serviceEndpointFromStudioRuntimeEnv(
    studioRuntimeEnvFromServiceEndpoint(import.meta.env.VITE_PLAYCRAFT_SERVICE_URL)
  );
  const baseClient = React.useMemo(
    () => createConfiguredStudioClient({ serviceEndpoint }),
    [serviceEndpoint]
  );
  const client = React.useMemo(() => withCatalogOverride(baseClient), [baseClient]);

  React.useEffect(() => {
    const sources = discoverBundledReplacementCatalog();
    const failed = sources.filter((source) => source.manifest === null);
    if (failed.length > 0) {
      const failedFolders = failed.map((source) => source.folder).join(", ");
      throw new Error(
        `Studio replacement folder(s) missing valid catalog.json: ${failedFolders}. ` +
          `Every replacement folder must declare a catalog.json manifest with source: "catalog.json".`
      );
    }

    if (sources.length === 0) {
      throw new Error(
        "Studio discovered no bundled replacement folders with catalog.json. " +
          "Drop at least one <theme>/catalog.json under apps/studio/src/assets/library/replacements."
      );
    }
  }, []);

  return <StudioApp client={client} />;
}