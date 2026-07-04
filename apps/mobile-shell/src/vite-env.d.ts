/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLAYCRAFT_SERVICE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
