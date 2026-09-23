import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test } from '@playwright/test'

interface ApprovalRecord {
  pageId: string
  status: 'approved'
  readyText: string
}

interface StandardsRegistry {
  approvalStore: { directory: string } | null
}

const projectRoot = process.cwd()
const registry = JSON.parse(
  readFileSync(resolve(projectRoot, 'standards/registry.json'), 'utf8'),
) as StandardsRegistry
const approvalDirectory = registry.approvalStore?.directory
const approvals: ApprovalRecord[] =
  approvalDirectory && existsSync(resolve(projectRoot, approvalDirectory))
    ? readdirSync(resolve(projectRoot, approvalDirectory))
        .filter((file) => file.endsWith('.json'))
        .sort()
        .map(
          (file) =>
            JSON.parse(
              readFileSync(resolve(projectRoot, approvalDirectory, file), 'utf8'),
            ) as ApprovalRecord,
        )
    : []

test.describe('approved canonical previews', () => {
  for (const approval of approvals) {
    test(`${approval.pageId} matches its approved preview baseline`, async ({ page }, testInfo) => {
      const runtimeMessages: string[] = []
      page.on('pageerror', (error) => runtimeMessages.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          runtimeMessages.push(`${message.type()}: ${message.text()}`)
        }
      })

      expect(approval.status).toBe('approved')
      await page.goto(`http://127.0.0.1:4174/?preview=${approval.pageId}&capture=1&scenario=ready`)
      await expect(page.locator(`[data-preview-id="${approval.pageId}"]`)).toBeVisible()
      await expect(page.getByText(approval.readyText, { exact: false }).first()).toBeVisible()
      await page.evaluate(() => document.fonts.ready.then(() => undefined))

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(hasHorizontalOverflow).toBe(false)
      expect(runtimeMessages).toEqual([])

      await expect(page).toHaveScreenshot([approval.pageId, `${testInfo.project.name}.png`], {
        fullPage: true,
      })
    })
  }
})
