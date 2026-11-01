import { fileURLToPath } from 'node:url'

import { defineConfig, mergeConfig } from 'vite'

import appConfig from '../../../vite.config'

// Only browser-level module tests need /src imports; UI tests use static builds.
export default defineConfig((env) =>
  mergeConfig(appConfig(env), {
    cacheDir: fileURLToPath(new URL('../../../node_modules/.vite/source-test', import.meta.url)),
    server: { hmr: false, watch: null },
  }),
)
