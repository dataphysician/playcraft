import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1"
  },
  build: {
    outDir: "web-dist",
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "@playcraft/contracts": fileURLToPath(new URL("../../packages/contracts/src/index.ts", import.meta.url)),
      "@playcraft/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@playcraft/assets": fileURLToPath(new URL("../../packages/assets/src/index.ts", import.meta.url)),
      "@playcraft/ag-ui": fileURLToPath(new URL("../../packages/ag-ui/src/index.ts", import.meta.url)),
      "@playcraft/renderer": fileURLToPath(new URL("../../packages/renderer/src/index.tsx", import.meta.url)),
      "@playcraft/packs": fileURLToPath(new URL("../../packages/packs/src/index.ts", import.meta.url)),
      "@playcraft/builder": fileURLToPath(new URL("../../packages/builder/src/index.ts", import.meta.url)),
      "@playcraft/mcp": fileURLToPath(new URL("../../packages/mcp/src/index.ts", import.meta.url)),
      "@playcraft/service": fileURLToPath(new URL("../../packages/service/src/index.ts", import.meta.url))
    },
    dedupe: ["react", "react-dom"]
  }
});
