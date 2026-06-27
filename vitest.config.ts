import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx", "tests/**/*.test.ts"],
    globals: false
  },
  resolve: {
    alias: {
      "@playcraft/contracts": fileURLToPath(new URL("packages/contracts/src/index.ts", import.meta.url)),
      "@playcraft/core": fileURLToPath(new URL("packages/core/src/index.ts", import.meta.url)),
      "@playcraft/assets": fileURLToPath(new URL("packages/assets/src/index.ts", import.meta.url)),
      "@playcraft/ag-ui": fileURLToPath(new URL("packages/ag-ui/src/index.ts", import.meta.url)),
      "@playcraft/renderer": fileURLToPath(new URL("packages/renderer/src/index.tsx", import.meta.url)),
      "@playcraft/packs": fileURLToPath(new URL("packages/packs/src/index.ts", import.meta.url))
    },
    dedupe: ["react", "react-dom"]
  },
  root
});
