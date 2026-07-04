/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TEAM_ID: string;
  readonly VITE_TEAM_NAME: string;
  readonly VITE_TEAM_YEAR: string;
  readonly VITE_IGEM_STATIC_BASE?: string;
  readonly VITE_IGEM_VIDEO_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
