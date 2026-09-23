import { expect, test } from '@playwright/test'

const previewHost = 'http://127.0.0.1:4174'

test.describe('UIDesign preview host', () => {
  test('catalog exposes registered preview sources', async ({ page }) => {
    const runtimeMessages: string[] = []
    page.on('pageerror', (error) => runtimeMessages.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        runtimeMessages.push(`${message.type()}: ${message.text()}`)
      }
    })

    await page.goto(previewHost)

    await expect(page.getByRole('heading', { level: 1, name: 'UI Design' })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByText('Legacy 原型', { exact: true }).first()).toBeVisible()
    expect(runtimeMessages).toEqual([])
  })

  test('supports legacy and canonical query parameters in capture mode', async ({ page }) => {
    const runtimeMessages: string[] = []
    page.on('pageerror', (error) => runtimeMessages.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        runtimeMessages.push(`${message.type()}: ${message.text()}`)
      }
    })

    await page.goto(`${previewHost}/?prototype=platform-dashboard&capture=1`)
    await expect(page.locator('[data-preview-id="platform-dashboard"]')).toHaveAttribute(
      'data-preview-source',
      'legacy-prototype',
    )
    await expect(page.getByText('今日运输单', { exact: false }).first()).toBeVisible()
    await expect(page.locator('.prototype-stage__bar')).toHaveCount(0)

    await page.goto(`${previewHost}/?preview=vms-vehicle-list&capture=1`)
    await expect(page.locator('[data-preview-id="vms-vehicle-list"]')).toHaveAttribute(
      'data-preview-source',
      'legacy-prototype',
    )
    await expect(page.getByText('沪A12345', { exact: false }).first()).toBeVisible()
    await expect(page.locator('.prototype-stage__bar')).toHaveCount(0)
    expect(runtimeMessages).toEqual([])
  })
})
