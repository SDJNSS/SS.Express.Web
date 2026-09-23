import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBasePath = env.VITE_API_BASE_URL?.trim() || '/api'
  const devApiTarget = env.DEV_API_TARGET?.trim()
  const devDmsFileApiTarget = env.DEV_DMS_FILE_API_TARGET?.trim()
  const devApiSecure = env.DEV_API_SECURE?.trim().toLowerCase() !== 'false'
  const proxyPath = apiBasePath.startsWith('/') ? apiBasePath : '/api'

  return {
    cacheDir: fileURLToPath(new URL('./node_modules/.vite/production', import.meta.url)),
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
        '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
        '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 4173,
      proxy:
        devApiTarget || devDmsFileApiTarget
          ? {
              ...(devDmsFileApiTarget
                ? {
                    [`${proxyPath === '/' ? '' : proxyPath.replace(/\/+$/u, '')}/dms`]: {
                      target: devDmsFileApiTarget,
                      changeOrigin: true,
                      secure: devApiSecure,
                      rewrite:
                        proxyPath === '/'
                          ? undefined
                          : (path: string) => path.slice(proxyPath.length) || '/',
                    },
                  }
                : {}),
              ...(devApiTarget
                ? {
                    [proxyPath]: {
                      target: devApiTarget,
                      changeOrigin: true,
                      secure: devApiSecure,
                      rewrite:
                        proxyPath === '/'
                          ? undefined
                          : (path) => path.slice(proxyPath.length) || '/',
                    },
                  }
                : {}),
            }
          : undefined,
    },
  }
})
