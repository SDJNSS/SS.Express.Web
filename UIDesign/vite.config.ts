import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  cacheDir: fileURLToPath(new URL('../node_modules/.vite/uidesign', import.meta.url)),
  plugins: [vue()],
  resolve: {
    alias: {
      '@ui': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../src/shared', import.meta.url)),
      '@feature-preview': fileURLToPath(new URL('../src/features', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
  },
  build: {
    outDir: fileURLToPath(new URL('../dist-ui', import.meta.url)),
    emptyOutDir: true,
  },
})
