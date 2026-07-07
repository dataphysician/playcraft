import React from "react";

import { CANONICAL_LOCAL_ASSET_FOLDER, LocalAssetFolderSource } from "@playcraft/assets";
import {
  BuilderAssetEditCatalogEntrySchema,
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

function resolveStudioFolder(): string {
  const override = typeof process !== "undefined" ? process.env["PLAYCRAFT_REPLACEMENTS_FOLDER"] : undefined;
  if (typeof override === "string" && override.length > 0) {
    return override;
  }
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return `${process.cwd()}/${CANONICAL_LOCAL_ASSET_FOLDER}`;
  }
  return CANONICAL_LOCAL_ASSET_FOLDER;
}

const studioFolderSource = new LocalAssetFolderSource({
  folder: resolveStudioFolder()
});

function mergedAvailableThemes(
  bundled: BuilderAssetEditCatalogEntry[]
): BuilderAssetEditCatalogEntry[] {
  const folderThemes = new Set(studioFolderSource.listThemes());
  const filtered = bundled.filter((entry) => folderThemes.has(entry.theme));
  const synthesized = studioFolderSource.listThemes().map((theme) => {
    const sprites = studioFolderSource.listSpritesForTheme(theme);
    const suggestedItems = sprites.map((sprite) => sprite.basename);
    return BuilderAssetEditCatalogEntrySchema.parse({
      theme,
      displayLabel: theme,
      aliases: [theme],
      aliasSummary: theme,
      suggestedItems,
      suggestedItemSummary: suggestedItems.join(", "),
      localReplacementFolder: theme
    });
  });
  const byTheme = new Map<string, BuilderAssetEditCatalogEntry>();
  for (const entry of filtered) {
    byTheme.set(entry.theme, entry);
  }
  for (const entry of synthesized) {
    byTheme.set(entry.theme, entry);
  }
  return [...byTheme.values()].sort((left, right) => left.theme.localeCompare(right.theme));
}

function buildAssetEditCatalogOverride(baseCatalog: BuilderCatalog): BuilderCatalog {
  return {
    ...baseCatalog,
    assetEdit: {
      ...baseCatalog.assetEdit,
      availableThemes: mergedAvailableThemes(baseCatalog.assetEdit.availableThemes)
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
    const themes = studioFolderSource.listThemes();
    if (themes.length === 0) {
      console.warn(
        "Studio discovered no bundled replacement themes via runtime fs scan. " +
          "Asset themes will still resolve at render time via the bundler's import.meta.glob."
      );
    }
  }, []);

  return <StudioApp client={client} />;
}