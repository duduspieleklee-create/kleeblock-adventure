/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GAME_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}