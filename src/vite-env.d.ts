/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INVENTORYX_ORIGIN: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_TELEMETRY_ENABLED?: string;
  /** Set to "true" to serve the US1 walkthrough from the in-browser mock provider. */
  readonly VITE_API_MOCKING?: string;
  readonly VITE_E2E_OFFLINE_BRIDGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
