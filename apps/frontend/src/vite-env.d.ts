/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
    readonly VITE_FEATURES: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
