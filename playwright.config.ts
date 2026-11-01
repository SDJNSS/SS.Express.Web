import { readFileSync } from 'node:fs'

import { defineConfig } from '@playwright/test'

import {
  appHost,
  appPort,
  previewHost,
  previewPort,
  sourceHost,
  sourcePort,
} from './tests/visual/helpers/testServers'

interface FrontendStandardsRegistry {
  viewports: Array<{
    id: string
    width: number
    height: number
  }>
}

const registry = JSON.parse(
  readFileSync(new URL('./standards/registry.json', import.meta.url), 'utf8'),
) as FrontendStandardsRegistry

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 3,
  reporter: process.env.CI
    ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : 'list',
  snapshotPathTemplate: './UIDesign/baselines/{arg}{ext}',
  updateSnapshots: 'none',
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.001,
      stylePath: './tests/visual/screenshot.css',
    },
  },
  use: {
    baseURL: appHost,
    browserName: 'chromium',
    colorScheme: 'light',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: registry.viewports.map((viewport) => ({
    name: viewport.id,
    use: { viewport: { width: viewport.width, height: viewport.height } },
  })),
  webServer: [
    {
      command: `pnpm exec vite preview --host 127.0.0.1 --port ${appPort} --strictPort`,
      url: appHost,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `pnpm exec vite preview --config UIDesign/vite.config.ts --host 127.0.0.1 --port ${previewPort} --strictPort`,
      url: previewHost,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `pnpm exec vite --config tests/visual/helpers/sourceRuntime.config.ts --host 127.0.0.1 --port ${sourcePort} --strictPort`,
      url: sourceHost,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
