import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { useAuthenticatedSession } from './helpers/authenticatedSession'

const success = (data: unknown) =>
  JSON.stringify({ data, is_success: true, code: 1, message: '', status: 'success' })
const version = '63927800000000001'

async function setup(page: Page, roles?: string[], excludeEdit = false, realName = '测试成员') {
  await useAuthenticatedSession(page, {
    excludedFunctionPermissions: excludeEdit
      ? ['iam:members:update-user', 'iam:members:update']
      : [],
  })
  const member = {
    user_id: 2001,
    tenant_user_id: 11,
    tenant_id: 1,
    tenant_code: 'PLATFORM',
    tenant_user_code: 'PLATFORM-11',
    display_name: 'PLATFORM-member',
    member_version: version,
    user_version: version,
    user_status: 'ACTIVE',
    member_status: 'ACTIVE',
    is_member_currently_effective: true,
    is_tenant_admin: false,
    roles,
    user: {
      id: 2001,
      user_name: 'member',
      real_name: realName,
      nick_name: '昵称',
      user_type: 'Platform',
      status: 'ACTIVE',
      version,
    },
    organizations: [],
    positions: [],
    memberships: [],
  }
  const queries: Record<string, unknown>[] = []
  const writes: Array<{ endpoint: string; body: Record<string, unknown> }> = []
  const roleQueries: string[] = []
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) errors.push(message.text())
  })
  page.on('request', (request) => {
    if (request.url().includes('/MemberRole/')) roleQueries.push(request.url())
  })
  await page.route('**/api/iam-admin/Membership/QueryUsers', (route) => {
    queries.push(route.request().postDataJSON())
    return route.fulfill({
      contentType: 'application/json',
      body: success({ total: 1, page_index: 1, page_size: 10, items: [member] }),
    })
  })
  for (const endpoint of ['UpdateUser', 'UpdateMember', 'ChangeMemberStatus', 'ChangeUserStatus']) {
    await page.route(`**/api/iam-admin/Membership/${endpoint}`, (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      writes.push({ endpoint, body })
      if (endpoint === 'UpdateUser') member.user.real_name = String(body.real_name)
      if (endpoint === 'ChangeMemberStatus') member.member_status = String(body.target_status)
      return route.fulfill({ contentType: 'application/json', body: success(body) })
    })
  }
  await page.goto('/iam/members')
  await expect(page.getByRole('button', { name: '详情', exact: true })).toBeVisible()
  return { queries, writes, roleQueries, errors }
}

test('角色列使用 QueryUsers 的角色数组；编辑入口在详情标题旁，操作列紧凑', async ({
  page,
}, testInfo) => {
  const roles = ['培训运营管理员', '运输调度负责人', '包含已停用分配的角色名称']
  const api = await setup(page, roles)
  await expect(page).toHaveURL(/\/iam\/members$/)
  await expect(page).toHaveTitle(/用户与成员/)
  const table = page.locator('.el-table').first()
  const headers = table.getByRole('columnheader')
  await expect(headers.first()).toHaveText('用户名称')
  await expect(headers.filter({ hasText: /^Tenant$|^昵称$/ })).toHaveCount(0)
  await expect(table.locator('th.el-table-fixed-column--left')).toHaveCount(1)
  await expect(table.locator('th.el-table-fixed-column--right')).toHaveCount(0)
  await expect(table.locator('tbody tr').first().locator('td').first()).toHaveText('测试成员')
  await expect(table).not.toContainText('PLATFORM-member')
  await page.screenshot({
    path: join(tmpdir(), `iam-members-realname-filters-${testInfo.project.name}.png`),
    animations: 'disabled',
  })
  await expect(table.getByRole('columnheader', { name: '角色', exact: true })).toBeVisible()
  const roleCell = table.locator(`[data-full-text="${roles.join('、')}"]`)
  await expect(roleCell).toBeAttached()
  await expect(roleCell).toHaveAttribute('aria-label', roles.join('、'))
  await roleCell.hover()
  await expect(page.getByRole('tooltip').filter({ hasText: roles.join('、') })).toBeVisible()
  const actions = table.locator('td.data-table__actions').first()
  await expect(actions.getByRole('button')).toHaveText(['详情', '停用'])
  await expect
    .poll(() => actions.evaluate((cell) => cell.getBoundingClientRect().width))
    .toBeLessThan(120)
  await expect(table.getByRole('button', { name: /编辑|全局用户/ })).toHaveCount(0)
  await page.screenshot({
    path: join(tmpdir(), `iam-member-list-actions-${testInfo.project.name}.png`),
    animations: 'disabled',
  })
  await table.getByRole('button', { name: '详情', exact: true }).click()
  const detail = page.getByRole('dialog', { name: /身份详情/ })
  await expect(detail).toHaveAccessibleName('测试成员 · 身份详情')
  await expect(detail.getByText('昵称', { exact: true })).toHaveCount(0)
  await expect(detail).not.toContainText('PLATFORM-member')
  const headings = detail.locator('.membership-detail__section-heading')
  await expect(headings.nth(0)).toContainText('全局用户')
  await expect(
    headings.nth(0).getByRole('button', { name: '编辑基本信息', exact: true }),
  ).toBeVisible()
  await expect(headings.nth(1)).toContainText('当前 Tenant 成员')
  await expect(
    headings.nth(1).getByRole('button', { name: '编辑成员资料', exact: true }),
  ).toBeVisible()
  expect(api.queries.at(-1)).toMatchObject({ user_id: 2001, tenant_ids: [1], page_size: 1 })
  expect(api.roleQueries).toEqual([])
  await page.screenshot({
    path: join(tmpdir(), `iam-member-detail-actions-${testInfo.project.name}.png`),
    animations: 'disabled',
  })
  await headings.nth(0).getByRole('button', { name: '编辑基本信息', exact: true }).click()
  const edit = page.getByRole('dialog', { name: '编辑基本信息', exact: true })
  await expect(edit.getByLabel('昵称', { exact: true })).toHaveCount(0)
  await expect(edit.getByLabel('用户 ID', { exact: true })).toBeDisabled()
  await expect(edit.getByLabel('版本令牌', { exact: true })).toHaveValue(version)
  const account = edit.getByLabel('登录账号', { exact: true })
  await expect(account).toHaveJSProperty('readOnly', true)
  await expect(account).toBeEnabled()
  await expect(account).toHaveValue('member')
  await account.focus()
  await account.press('ControlOrMeta+A')
  await account.press('Backspace')
  await account.press('x')
  await expect(account).toHaveValue('member')
  await page.screenshot({
    path: join(tmpdir(), `iam-basic-info-readonly-${testInfo.project.name}.png`),
    animations: 'disabled',
  })
  await edit.getByLabel('姓名', { exact: true }).fill('已更新成员')
  await edit.getByRole('button', { name: '保存基本信息', exact: true }).click()
  await expect(edit).toHaveCount(0)
  await expect(detail).toContainText('已更新成员')
  expect(api.writes).toEqual([
    {
      endpoint: 'UpdateUser',
      body: expect.objectContaining({
        id: 2001,
        version,
        user_name: 'member',
        real_name: '已更新成员',
        nick_name: '昵称',
      }),
    },
  ])
  await detail.getByRole('button', { name: '编辑成员资料', exact: true }).click()
  const memberEdit = page.getByRole('dialog', { name: '编辑 Tenant 成员', exact: true })
  await expect(memberEdit.getByLabel('成员 ID', { exact: true })).toHaveValue('11')
  await expect(memberEdit.getByLabel('Tenant 显示名称', { exact: true })).toHaveCount(0)
  await memberEdit.getByRole('button', { name: '取消', exact: true }).click()
  await expect(detail).toBeVisible()
  expect(api.errors).toEqual([])
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
})

test('姓名缺失时不使用昵称、租户显示名或登录账号冒充姓名', async ({ page }) => {
  await setup(page, [], false, '')
  await page.getByRole('button', { name: '详情', exact: true }).click()
  const detail = page.getByRole('dialog', { name: '未设置姓名 · 身份详情', exact: true })
  await expect(detail.locator('.membership-detail__hero strong')).toHaveText('未设置姓名')
  await expect(detail.getByText('昵称', { exact: true })).toHaveCount(0)
  await expect(detail).not.toContainText('PLATFORM-member')
})

for (const roles of [[], undefined]) {
  test(`无角色${roles ? '空数组' : '旧响应缺省'}显示中性占位，不逐成员请求角色`, async ({
    page,
  }) => {
    const api = await setup(page, roles)
    const table = page.locator('.el-table').first()
    const index = await table
      .getByRole('columnheader')
      .allTextContents()
      .then((labels) => labels.indexOf('角色'))
    await expect(table.locator('tbody tr').first().locator('td').nth(index)).toHaveText('—')
    expect(api.roleQueries).toEqual([])
    expect(api.errors).toEqual([])
  })
}

test('缺少编辑权限时详情隐藏编辑入口；停用仅提交当前租户成员状态', async ({ page }) => {
  const api = await setup(page, ['普通成员'], true)
  await page.getByRole('button', { name: '详情', exact: true }).click()
  const detail = page.getByRole('dialog', { name: /身份详情/ })
  await expect(detail.getByRole('heading', { name: '全局用户', exact: true })).toBeVisible()
  await expect(detail.getByRole('button', { name: /^编辑/ })).toHaveCount(0)
  await detail.locator('.el-drawer__close-btn').click()
  await page.locator('.el-table').first().getByRole('button', { name: '停用', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: '停用 Tenant 成员', exact: true })
  await expect(confirm).toContainText('不改变全局用户与其他 Tenant 成员')
  await confirm.getByRole('button', { name: '确认停用成员', exact: true }).click()
  await expect(
    page.locator('.el-table').first().getByRole('button', { name: '启用', exact: true }),
  ).toBeVisible()
  expect(api.writes).toEqual([
    { endpoint: 'ChangeMemberStatus', body: { id: 11, version, target_status: 'DISABLED' } },
  ])
  expect(api.errors).toEqual([])
})
