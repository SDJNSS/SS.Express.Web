import { readFileSync } from 'node:fs'

import { defineConfig } from '@playwright/test'

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
    baseURL: 'http://127.0.0.1:4173',
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
      command: 'pnpm dev -- --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'pnpm ui:dev -- --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
})
