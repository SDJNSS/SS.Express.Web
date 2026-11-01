import { expect, test } from '@playwright/test'

import { previewHost } from './helpers/testServers'

const candidatePages = [
  { id: 'iam-role-management', heading: '角色管理' },
  { id: 'iam-role-assignments', heading: '角色成员' },
] as const

test.describe('IAM role, resource and data permission candidates', () => {
  test('renders every PRD page from canonical isolated previews', async ({ page }, testInfo) => {
    const runtimeMessages: string[] = []
    const businessRequests: string[] = []

    page.on('pageerror', (error) => runtimeMessages.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        runtimeMessages.push(`${message.type()}: ${message.text()}`)
      }
    })
    page.on('request', (request) => {
      if (['fetch', 'xhr', 'websocket', 'eventsource'].includes(request.resourceType())) {
        businessRequests.push(request.url())
      }
    })

    for (const candidate of candidatePages) {
      await page.goto(`${previewHost}/?preview=${candidate.id}&capture=1`)
      await expect(page.locator(`[data-preview-id="${candidate.id}"]`)).toHaveAttribute(
        'data-preview-source',
        'canonical-feature',
      )
      await expect(page.getByRole('heading', { level: 1, name: candidate.heading })).toBeVisible()

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(hasHorizontalOverflow).toBe(false)

      await page.screenshot({
        path: testInfo.outputPath(`${candidate.id}-${testInfo.project.name}.png`),
        fullPage: true,
        animations: 'disabled',
      })
    }

    expect(businessRequests).toEqual([])
    expect(runtimeMessages).toEqual([])
  })

  test('exposes the role creation workflow', async ({ page }, testInfo) => {
    await page.goto(`${previewHost}/?preview=iam-role-management&capture=1`)
    await page.getByRole('button', { name: '新建自定义角色' }).click()
    await expect(page.getByRole('heading', { name: '新建自定义角色' })).toBeVisible()
    await expect(page.getByLabel('角色编码')).toHaveCount(0)
    await expect(page.getByText('角色编码由系统自动生成')).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath(`iam-role-create-${testInfo.project.name}.png`),
      animations: 'disabled',
    })
  })
})
