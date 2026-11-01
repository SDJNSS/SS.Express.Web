import { previewHost } from './helpers/testServers'
import { expect, test } from '@playwright/test'
import { useAuthenticatedSession } from './helpers/authenticatedSession'

// Browser plugin unavailable; ego-browser CLI unavailable on this Windows host.
// Flow: each retained route/preview -> primary action -> marked drawer/save control.
const cases = [
  { key: 'group', preview: 'iam-group-profile', action: '编辑集团信息', button: 'EDIT' },
  { key: 'tenants', preview: 'iam-tenant-management', action: '创建 Tenant', button: 'CREATE' },
  {
    key: 'organizations',
    preview: 'iam-organization-management',
    action: '创建顶级组织',
    button: 'CREATE',
  },
  { key: 'positions', preview: 'iam-position-management', action: '新建岗位', button: 'CREATE' },
  {
    key: 'members',
    preview: 'iam-membership-management',
    action: '新增 Tenant 成员',
    button: 'CREATE',
  },
  { key: 'roles', preview: 'iam-role-management', action: '新建自定义角色', button: 'CREATE' },
] as const

for (const entry of cases)
  for (const production of [false, true]) {
    test(`${production ? 'production' : 'preview'} ${entry.key} exposes stable page/action/drawer markers`, async ({
      page,
    }, testInfo) => {
      const messages: string[] = []
      page.on('pageerror', (e) => messages.push(e.message))
      page.on('console', (e) => {
        if (['error', 'warning'].includes(e.type())) messages.push(e.text())
      })
      if (production) {
        await useAuthenticatedSession(page)
        await page.route('**/api/iam-admin/RolePermission/QueryRoles', (route) =>
          route.fulfill({ json: { is_success: true, data: { total: 0, items: [] } } }),
        )
      }
      const path = production
        ? `/iam/${entry.key}`
        : `${previewHost}/?preview=${entry.preview}&capture=1`
      await page.goto(path)
      await expect(page).toHaveURL(
        production ? new RegExp(`/iam/${entry.key}$`) : new RegExp(`preview=${entry.preview}`),
      )
      const code = `IAM.${entry.key.toUpperCase()}`
      await expect(page.locator('main.app-page')).toHaveAttribute(
        'data-resource-element',
        `iam.${entry.key}.page`,
      )
      await expect(page.locator('main.app-page')).toHaveAttribute('data-resource-code', code)
      await expect(page.locator('main.app-page')).toHaveAttribute(
        'data-resource-description',
        /^用途：.+；场景：.+/,
      )
      const action = page.getByRole('button', { name: entry.action, exact: true })
      await expect(action).toHaveAttribute('data-resource-code', `${code}.BUTTON.${entry.button}`)
      const description = await action.getAttribute('data-resource-description')
      expect(description).toMatch(/^用途：.+；场景：.+/)
      await action.click()
      const drawer = page.locator('.el-drawer:visible')
      await expect(drawer).toHaveAttribute('data-resource-code', `${code}.BUTTON.${entry.button}`)
      await expect(drawer).toHaveAttribute('data-resource-description', description!)
      await expect(
        drawer.locator('.el-drawer__footer button[data-resource-element]').last(),
      ).toBeVisible()
      await expect(page.locator('vite-error-overlay')).toHaveCount(0)
      expect(messages).toEqual([])
      if (entry.key === 'group')
        await page.screenshot({
          path: testInfo.outputPath(`${production ? 'production' : 'preview'}-group-marker.png`),
          animations: 'disabled',
        })
    })
  }

test('resource markers do not reveal actions denied by existing permission rules', async ({
  page,
}) => {
  await useAuthenticatedSession(page, { excludedFunctionPermissions: ['iam:group:update'] })
  await page.goto('/iam/group')
  await expect(page.locator('main.app-page')).toHaveAttribute(
    'data-resource-element',
    'iam.group.page',
  )
  await expect(page.getByRole('button', { name: '编辑集团信息' })).toHaveCount(0)
})
