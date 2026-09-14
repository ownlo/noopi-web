/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_ADSENSE_TEST_MODE?: string
  readonly VITE_ADSENSE_CLIENT_ID?: string
  readonly VITE_ADSENSE_DISPLAY_SLOT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
