import { previewHost } from './helpers/testServers'
import { expect, test, type Page } from '@playwright/test'
import { mockQueryUsersPage, useAuthenticatedSession } from './helpers/authenticatedSession'

const version = '63924670932147368'
const apiSuccess = (data: unknown) =>
  JSON.stringify({ status: 'success', code: 1, message: '', data })

async function expectCompactMemberActions(page: Page) {
  const table = page.locator('.el-table').first()
  await expect(table.getByRole('button', { name: '详情', exact: true }).first()).toBeVisible()
  await expect
    .poll(() =>
      table.evaluate((root) => {
        const header = root.querySelector<HTMLElement>('th.data-table__actions')!
        const cell = root.querySelector<HTMLElement>('td.data-table__actions .cell')!
        const style = getComputedStyle(cell)
        const grids = Array.from(
          root.querySelectorAll<HTMLElement>('td.data-table__actions .row-action-grid'),
        ).filter((grid) => grid.getClientRects().length)
        const required =
          Math.max(...grids.map((grid) => grid.getBoundingClientRect().width)) +
          parseFloat(style.paddingLeft) +
          parseFloat(style.paddingRight)
        const extra = header.getBoundingClientRect().width - required
        return extra >= 0 && extra <= 3
      }),
    )
    .toBe(true)
}

async function mockRoles(page: Page) {
  let assigned = false
  let failSave = false
  let assignmentQueries = 0
  const mutations: Array<{ operation: string; body: Record<string, unknown> }> = []
  const userQueries: Array<Record<string, unknown>> = []
  const unexpected: string[] = []
  await page.route('**/api/iam-admin/Membership/QueryUsers', (route) => {
    const response = mockQueryUsersPage(1000)
    return route.fulfill({
      contentType: 'application/json',
      body: apiSuccess({
        ...response,
        items: response.items.map((item) => ({ ...item, roles: assigned ? ['培训运营'] : [] })),
      }),
    })
  })
  page.on('request', (request) => {
    if (request.url().endsWith('/Membership/QueryUsers')) userQueries.push(request.postDataJSON())
    if (/Query(?:User|Member)FunctionPermissions|QueryDataPermissions/u.test(request.url()))
      unexpected.push(request.url())
  })
  // The session fixture grants this Menu/Buttons and denies the separate V2 Page.
  await page.route('**/api/iam-admin/RolePermission/QueryRoles', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: apiSuccess({
        total: 1,
        page_index: 1,
        page_size: 100,
        items: [
          {
            id: 501,
            role_name: '培训运营',
            role_code: 'TRAINING',
            role_type: 'CUSTOM',
            status: 'ACTIVE',
            can_maintain: true,
            is_currently_effective: true,
            is_group_controlled: false,
          },
        ],
      }),
    }),
  )
  await page.route('**/api/iam-admin/MemberRole/Query', (route) => {
    assignmentQueries += 1
    expect(route.request().postDataJSON()).toMatchObject({ tenant_id: 1, tenant_user_id: 1 })
    return route.fulfill({
      contentType: 'application/json',
      body: apiSuccess({
        total: assigned ? 1 : 0,
        page_index: 1,
        page_size: 100,
        items: assigned
          ? [
              {
                role_id: 501,
                role_name: '培训运营',
                role_code: 'TRAINING',
                is_assigned: true,
                is_currently_effective: true,
                can_maintain: true,
                is_group_controlled: false,
                is_tenant_admin_identity: false,
                member_version: version,
              },
            ]
          : [],
      }),
    })
  })
  for (const operation of ['Assign', 'Revoke']) {
    await page.route(`**/api/iam-admin/MemberRole/${operation}`, (route) => {
      mutations.push({ operation, body: route.request().postDataJSON() })
      if (failSave)
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ is_success: false, code: 409, message: '版本已变更，请刷新' }),
        })
      assigned = operation === 'Assign'
      return route.fulfill({ contentType: 'application/json', body: apiSuccess([]) })
    })
  }
  return {
    mutations,
    userQueries,
    unexpected,
    queries: () => assignmentQueries,
    fail: (value: boolean) => {
      failSave = value
    },
  }
}

test('member role drawer assigns and removes roles without the retired page', async ({
  page,
}, testInfo) => {
  await useAuthenticatedSession(page)
  const api = await mockRoles(page)
  await page.goto('/iam/members')
  await expect(page.getByRole('link', { name: '应用与权限资源', exact: true })).toHaveCount(0)
  await expect(
    page.locator('.el-table').getByRole('button', { name: '分配角色', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.locator('.el-table').getByRole('button', { name: '有效权限', exact: true }),
  ).toHaveCount(0)
  await expectCompactMemberActions(page)
  await page.screenshot({
    path: testInfo.outputPath('members-list-compact.png'),
    animations: 'disabled',
  })
  await page.getByRole('button', { name: '详情', exact: true }).first().click()
  await page.getByRole('button', { name: '分配角色', exact: true }).first().click()
  const drawer = page.getByRole('dialog', { name: '林嘉 · 分配角色', exact: true })
  await expect(drawer).toBeVisible()
  await expect
    .poll(() =>
      api.userQueries.some((q) => q.user_id === 1001 && JSON.stringify(q.tenant_ids) === '[1]'),
    )
    .toBe(true)
  await expect.poll(api.queries).toBe(1)
  await drawer.getByRole('combobox', { name: '待分配角色' }).press('ArrowDown')
  await page.getByRole('option', { name: '培训运营' }).click()
  await drawer.getByRole('combobox', { name: '待分配角色' }).press('Escape')
  await drawer.getByRole('button', { name: '关闭', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: '放弃未保存的修改？' })
  await confirm.getByRole('button', { name: '继续编辑' }).click()
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('button', { name: '确认分配' })).toBeEnabled()
  api.fail(true)
  await drawer.getByRole('button', { name: '确认分配' }).click()
  await expect(drawer.getByRole('alert')).toContainText('版本已变更')
  await expect(drawer.getByRole('button', { name: '确认分配' })).toBeEnabled()
  api.fail(false)
  await drawer.getByRole('button', { name: '确认分配' }).click()
  await expect(drawer.getByRole('row', { name: /培训运营 TRAINING/ })).toBeVisible()
  expect(api.mutations.at(-1)).toEqual({
    operation: 'Assign',
    body: { tenant_user_id: 1, member_version: version, role_ids: [501] },
  })
  await expect.poll(api.queries).toBe(2)
  const list = page.locator('.membership-page .el-table').first()
  await expect(list.locator('tbody tr').first()).toContainText('培训运营')
  expect(api.userQueries.filter((query) => query.user_id === undefined).length).toBe(2)
  await page.screenshot({
    path: testInfo.outputPath('member-roles-drawer.png'),
    animations: 'disabled',
  })
  await drawer.getByRole('button', { name: '移除', exact: true }).click()
  await page.getByRole('button', { name: '移除', exact: true }).last().click()
  await expect.poll(() => api.mutations.at(-1)?.operation).toBe('Revoke')
  await expect(drawer.getByRole('row', { name: /培训运营 TRAINING/ })).toHaveCount(0)
  await expect(list.locator('tbody tr').first()).not.toContainText('培训运营')
  expect(api.userQueries.filter((query) => query.user_id === undefined).length).toBe(3)
  await drawer.getByRole('button', { name: '关闭', exact: true }).click()
  await page.getByRole('button', { name: '分配角色', exact: true }).first().click()
  await expect.poll(api.queries).toBe(4)
  await expect(page).toHaveURL(/\/iam\/members$/)
  expect(api.unexpected).toEqual([])
})

test('retired IAM routes cannot be revived by a stale backend menu', async ({ page }) => {
  await useAuthenticatedSession(page)
  await mockRoles(page)
  for (const path of [
    '/iam/application-resources',
    '/iam/roles/function-permissions',
    '/iam/roles/data-permissions',
    '/iam/members/permissions',
  ]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: '页面未找到', level: 2 })).toBeVisible()
  }
})

test('member drawer preserves read-only permission boundaries', async ({ page }, testInfo) => {
  await useAuthenticatedSession(page, {
    excludedFunctionPermissions: [
      'iam:members:permissions:assign-role',
      'iam:members:permissions:revoke-role',
      'iam:members:update-user',
      'iam:members:update',
      'iam:members:change-status',
      'iam:members:change-user-status',
    ],
  })
  const api = await mockRoles(page)
  await page.goto('/iam/members')
  await expectCompactMemberActions(page)
  await page.screenshot({
    path: testInfo.outputPath('members-list-readonly-compact.png'),
    animations: 'disabled',
  })
  await page.getByRole('button', { name: '详情', exact: true }).first().click()
  await page.getByRole('button', { name: '分配角色', exact: true }).first().click()
  const drawer = page.getByRole('dialog', { name: '林嘉 · 分配角色', exact: true })
  await expect.poll(api.queries).toBe(1)
  await expect(drawer.getByRole('button', { name: '确认分配' })).not.toBeVisible()
  await expect(drawer.getByRole('combobox', { name: '待分配角色' })).not.toBeVisible()
  await expect(drawer.getByRole('alert')).toHaveCount(0)
  expect(api.mutations).toEqual([])
})

test('role drawer preview remains isolated and interactive', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/')) requests.push(request.url())
  })
  await page.goto(`${previewHost}/?preview=iam-membership-management&capture=1`)
  await page.getByRole('button', { name: '详情', exact: true }).first().click()
  await page.getByRole('button', { name: '分配角色', exact: true }).first().click()
  const drawer = page.getByRole('dialog').filter({ hasText: '待分配角色' })
  await drawer.getByRole('combobox', { name: '待分配角色' }).press('ArrowDown')
  await page.getByRole('option', { name: '培训运营（预览）' }).click()
  await drawer.getByRole('combobox', { name: '待分配角色' }).press('Escape')
  await drawer.getByRole('button', { name: '确认分配' }).click()
  await expect(drawer.getByRole('row', { name: /培训运营（预览） PREVIEW/ })).toBeVisible()
  expect(requests).toEqual([])
})
