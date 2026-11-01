import { previewHost } from './helpers/testServers'
import { expect, test } from '@playwright/test'

const previews = [
  ['iam-system-resource-catalog', '系统资源目录'],
  ['iam-permission-scheme-management', '权限管理'],
  ['iam-permission-scheme-resources', '权限功能配置'],
  ['iam-role-authorization', '角色授权'],
  ['iam-user-effective-permissions', '用户有效权限'],
] as const

test.describe('IAM permission governance v2 candidate previews', () => {
  for (const [previewId, heading] of previews) {
    test(`${previewId} renders as an isolated canonical candidate`, async ({ page }, testInfo) => {
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

      await page.goto(`${previewHost}/?preview=${previewId}&capture=1`)
      await expect(page.locator(`[data-preview-id="${previewId}"]`)).toHaveAttribute(
        'data-preview-source',
        'canonical-feature',
      )
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
      await expect(page.locator('main[data-app-page]')).toHaveAttribute(
        'data-resource-element',
        /^iam\.[\w-]+\.page$/u,
      )
      await expect(page.locator('main[data-app-page]')).toHaveAttribute(
        'data-resource-code',
        /^IAM\./u,
      )

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(hasHorizontalOverflow).toBe(false)
      expect(businessRequests).toEqual([])
      expect(runtimeMessages).toEqual([])

      await page.screenshot({
        path: testInfo.outputPath(`${previewId}-${testInfo.project.name}.png`),
        fullPage: true,
        animations: 'disabled',
      })
    })
  }

  test('keeps permission tree expansion independent from selecting a node name', async ({
    page,
  }) => {
    await page.goto(`${previewHost}/?preview=iam-role-authorization&capture=1`)

    const firstPackage = page.locator('[data-node-type="PERMISSION"]').first()
    await expect(firstPackage).toBeVisible()
    const initialExpanded = await firstPackage.getAttribute('data-expanded')
    await firstPackage.locator('.permission-package-node__name').click()
    await expect(firstPackage).toHaveAttribute('data-expanded', initialExpanded ?? 'false')
  })

  test('creates permission metadata before configuring its frontend resource and functions', async ({
    page,
  }) => {
    await page.goto(`${previewHost}/?preview=iam-permission-scheme-management&capture=1`)

    await page.getByRole('button', { name: '新建权限', exact: true }).click()
    const drawer = page.locator('.el-drawer')
    await expect(drawer.getByText('权限编码由系统生成。')).toBeVisible()
    await expect(drawer.getByText('前端资源', { exact: true })).toHaveCount(0)
    await expect(drawer.getByText('后端 Function', { exact: true })).toHaveCount(0)

    await drawer.getByRole('combobox', { name: '*所属 App' }).click()
    await page.getByRole('option', { name: 'IAM 身份权限管理', exact: true }).click()
    await drawer.getByRole('textbox', { name: '*权限名称' }).fill('用户资料维护')
    await drawer.getByRole('button', { name: '创建权限', exact: true }).click()

    await expect(page.getByRole('heading', { level: 1, name: '权限功能配置' })).toBeVisible()
    await expect(page.getByText('用户资料维护', { exact: true })).toBeVisible()
    await expect(page.getByText('创建后由系统生成', { exact: true })).toBeVisible()
  })

  test('only Permission nodes are checkable in direct role authorization', async ({ page }) => {
    await page.goto(`${previewHost}/?preview=iam-role-authorization&capture=1`)

    const packageCheckboxes = page.locator('[data-node-type="PERMISSION"] > .el-checkbox')
    await expect(packageCheckboxes.first()).toBeVisible()
    expect(await packageCheckboxes.count()).toBeGreaterThan(0)
    await expect(page.locator('[data-node-type="RESOURCE"] > .el-checkbox')).toHaveCount(0)
  })

  test('shows effective permissions as a fully read-only Permission tree', async ({ page }) => {
    await page.goto(`${previewHost}/?preview=iam-user-effective-permissions&capture=1`)

    await expect(page.getByText('只读', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('来源角色', { exact: true })).toBeVisible()
    await expect(page.locator('[data-node-type="PERMISSION"]').first()).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
  })

  test('keeps a new role at zero authorization until an explicit choice', async ({ page }) => {
    await page.goto(`${previewHost}/?preview=iam-role-authorization&capture=1&scenario=new-role`)

    const packageCheckboxes = page.locator('[data-node-type="PERMISSION"] > .el-checkbox')
    await expect(packageCheckboxes.first()).toBeVisible()
    expect(await packageCheckboxes.count()).toBeGreaterThan(0)
    for (let index = 0; index < (await packageCheckboxes.count()); index += 1) {
      await expect(packageCheckboxes.nth(index).getByRole('checkbox')).not.toBeChecked()
    }
    await expect(page.getByText('0', { exact: true }).first()).toBeVisible()
  })
})
