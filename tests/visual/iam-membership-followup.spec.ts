import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { useAuthenticatedSession } from './helpers/authenticatedSession'

const version = '63927800000000001'
const success = (data: unknown) => JSON.stringify({ is_success: true, code: 1, message: '', data })
const pageErrors = new WeakMap<Page, string[]>()
test.beforeEach(({ page }) => {
  const errors: string[] = []
  pageErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
})
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([])
})

async function setup(page: Page, admin = false) {
  await useAuthenticatedSession(page)
  await page.addInitScript(() => sessionStorage.setItem('login_user_id', '9999'))
  const relation = (kind: 'org' | 'position', id: number) => ({
    id,
    tenant_user_id: 1,
    [`${kind}_id`]: kind === 'org' ? 10 : 20,
    [`${kind}_code`]: 'AUTO',
    [`${kind}_name`]: kind === 'org' ? '运营组织' : '运营岗位',
    is_primary: true,
    effective_start: '2026-01-01T00:00:00',
    effective_end: null,
    is_currently_effective: true,
    status: 'active',
    remarks: '原备注',
    version,
  })
  const member = {
    user_id: 2001,
    tenant_user_id: 1,
    tenant_id: 1,
    tenant_code: 'PLATFORM',
    tenant_user_code: 'PLATFORM-1',
    display_name: '林嘉',
    is_tenant_admin: admin,
    member_version: version,
    user_version: version,
    user_status: 'active',
    member_status: 'active',
    is_member_currently_effective: true,
    joined_at: '2026-01-01T00:00:00',
    left_at: null,
    user: {
      id: 2001,
      user_name: 'linjia',
      real_name: '林嘉',
      nick_name: '',
      phone: '',
      email: '',
      avatar_url: '',
      user_type: 'Platform',
      status: 'active',
      version,
    },
    organizations: [
      relation('org', 501),
      {
        ...relation('org', 502),
        org_name: '历史组织',
        effective_start: '2025-01-01T00:00:00',
        effective_end: '2025-01-02T00:00:00',
        is_primary: false,
        is_currently_effective: false,
      },
    ],
    positions: [relation('position', 601)],
    memberships: [],
  }
  let reads = 0
  const writes: Array<{ path: string; body: Record<string, unknown> }> = []
  const unexpected: string[] = []
  page.on('request', (request) => {
    if (/UpdateUserTenants|QueryUserTenants/u.test(request.url())) unexpected.push(request.url())
  })
  await page.route('**/api/iam-admin/Membership/QueryUsers', (route) => {
    reads += 1
    expect(route.request().postDataJSON().tenant_ids).toEqual([1])
    return route.fulfill({
      contentType: 'application/json',
      body: success({ total: 1, page_index: 1, page_size: 10, items: [member] }),
    })
  })
  for (const kind of ['Organization', 'Position']) {
    await page.route(`**/api/iam-admin/Membership/Save${kind}`, (route) => {
      const body = route.request().postDataJSON()
      writes.push({ path: `Save${kind}`, body })
      const row = kind === 'Organization' ? member.organizations[0]! : member.positions[0]!
      Object.assign(row, body, { version: '63927800000000002' })
      return route.fulfill({ contentType: 'application/json', body: success(row) })
    })
    await page.route(`**/api/iam-admin/Membership/End${kind}`, (route) => {
      const body = route.request().postDataJSON()
      writes.push({ path: `End${kind}`, body })
      Object.assign(kind === 'Organization' ? member.organizations[0]! : member.positions[0]!, {
        effective_end: '2026-01-03T00:00:00',
        is_primary: false,
        is_currently_effective: false,
      })
      return route.fulfill({ contentType: 'application/json', body: success({ succeeded: true }) })
    })
  }
  return { member, writes, unexpected, reads: () => reads }
}

async function detail(page: Page) {
  await page.goto('/iam/members')
  await page.getByRole('button', { name: '详情', exact: true }).first().click()
  const drawer = page.getByRole('dialog', { name: '林嘉 · 身份详情', exact: true })
  await expect(drawer.getByRole('tab', { name: '组织归属', exact: true })).toBeVisible()
  return drawer
}

for (const kind of ['组织', '岗位']) {
  test(`${kind} relation edits use the original ID/version and refresh the detail`, async ({
    page,
  }, testInfo) => {
    const api = await setup(page)
    const drawer = await detail(page)
    await drawer.getByRole('tab', { name: `${kind}归属`, exact: true }).click()
    const active = drawer.locator('.el-tab-pane:visible')
    await active.getByRole('button', { name: '编辑', exact: true }).first().click()
    const form = page.getByRole('dialog', { name: `编辑${kind}归属`, exact: true })
    await expect(form.getByLabel(`目标${kind}`, { exact: true })).toBeVisible()
    await expect(form.locator('.el-select')).toContainText(
      kind === '组织' ? '运营组织' : '运营岗位',
    )
    await form.getByLabel('备注', { exact: true }).fill('已更新的归属')
    await page.screenshot({
      path: join(tmpdir(), `ss-express-member-${kind}-${testInfo.project.name}.png`),
      animations: 'disabled',
    })
    await form.getByRole('button', { name: `保存${kind}归属`, exact: true }).click()
    await expect(form).toBeHidden()
    expect(api.writes[0]?.body).toMatchObject({
      id: kind === '组织' ? 501 : 601,
      version,
      tenant_user_id: 1,
      remarks: '已更新的归属',
      effective_end: null,
    })
    await expect(active).toContainText('已更新的归属')
    expect(api.reads()).toBeGreaterThanOrEqual(4)
    expect(api.unexpected).toEqual([])
  })
}

test('historical relationships remain read-only and ending has a distinct request', async ({
  page,
}) => {
  const api = await setup(page)
  const drawer = await detail(page)
  await drawer.getByRole('tab', { name: '组织归属', exact: true }).click()
  const rows = drawer.locator('.el-tab-pane:visible .el-table__body-wrapper tbody tr')
  await expect(rows.nth(1).getByRole('button', { name: '编辑', exact: true })).toBeDisabled()
  await expect(rows.nth(1).getByRole('button', { name: '结束', exact: true })).toBeDisabled()
  await rows.first().getByRole('button', { name: '结束', exact: true }).click()
  const form = page.getByRole('dialog', { name: '结束组织归属', exact: true })
  await expect(form.getByText('归属结束后保留历史', { exact: false })).toBeVisible()
  await form.getByRole('button', { name: '确认结束组织归属', exact: true }).click()
  await expect(form).toBeHidden()
  expect(api.writes).toEqual([
    { path: 'EndOrganization', body: { id: 501, version, effective_end: null } },
  ])
})

test('administrator transport retry keeps the request key and uses user + current Tenant', async ({
  page,
}, testInfo) => {
  const api = await setup(page)
  const bodies: Array<Record<string, unknown>> = []
  await page.route('**/api/iam-admin/MemberRole/AppointTenantAdmin', (route) => {
    bodies.push(route.request().postDataJSON())
    expect(route.request().headers()['x-request-id']).toBe(bodies.at(-1)?.request_id)
    if (bodies.length === 1) return route.abort('failed')
    api.member.is_tenant_admin = true
    return route.fulfill({
      contentType: 'application/json',
      body: success({
        tenant_id: 1,
        user_id: 2001,
        tenant_user_id: 1,
        is_tenant_admin: true,
        member_version: version,
        changed: true,
        idempotent: false,
      }),
    })
  })
  const drawer = await detail(page)
  await drawer.getByRole('button', { name: '任命管理员', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '任命管理员', exact: true })
  await page.screenshot({
    path: join(tmpdir(), `ss-express-member-admin-${testInfo.project.name}.png`),
    animations: 'disabled',
  })
  await dialog.getByRole('button', { name: '确认任命', exact: true }).click()
  await expect(dialog.getByText('网络连接异常，请稍后重试', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: '确认任命', exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(bodies).toHaveLength(2)
  expect(bodies[1]).toEqual(bodies[0])
  expect(bodies[0]).toMatchObject({ tenant_id: 1, user_id: 2001, member_version: version })
  expect(bodies[0]?.tenant_user_id).toBeUndefined()
  expect(bodies[0]?.request_id).toBeTruthy()
  await expect(drawer.getByRole('button', { name: '取消管理员', exact: true })).toBeVisible()
})

test('last administrator denial is handled by reason code, not localized text', async ({
  page,
}) => {
  await setup(page, true)
  let calls = 0
  await page.route('**/api/iam-admin/MemberRole/CancelTenantAdmin', (route) => {
    calls += 1
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        code: 1109,
        message: 'domain rejection',
        reason_code: 'IAM_LAST_EFFECTIVE_TENANT_ADMIN',
        data: null,
      }),
    })
  })
  const drawer = await detail(page)
  await drawer.getByRole('button', { name: '取消管理员', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '取消管理员', exact: true })
  await dialog.getByRole('button', { name: '确认取消管理员', exact: true }).click()
  await expect(dialog.getByText('不能取消最后一名有效管理员，请先任命其他有效成员。')).toBeVisible()
  await expect(dialog.getByRole('button', { name: '确认取消管理员', exact: true })).toBeDisabled()
  expect(calls).toBe(1)
})

test('missing exact Button grants hide administrator and relationship actions', async ({
  page,
}) => {
  await setup(page)
  await page.route('**/api/iam-admin/CurrentPermissionResource/CurrentPageResources', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: success({
        page_resource_code: 'IAM.MEMBERS',
        can_access: true,
        button_resource_codes: [],
        button_page_resource_codes: [],
        read_function_resource_codes: [],
      }),
    }),
  )
  const drawer = await detail(page)
  await expect(drawer.getByRole('button', { name: '任命管理员', exact: true })).toHaveCount(0)
  await drawer.getByRole('tab', { name: '组织归属', exact: true }).click()
  await expect(drawer.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0)
  await expect(drawer.getByRole('button', { name: '结束', exact: true })).toHaveCount(0)
})

test('relationship failure requires an explicit reload before using the newer version', async ({
  page,
}) => {
  const api = await setup(page)
  let calls = 0
  await page.route('**/api/iam-admin/Membership/SavePosition', (route) => {
    calls += 1
    const body = route.request().postDataJSON()
    if (calls === 1) {
      api.member.positions[0]!.version = '63927800000000009'
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ code: 1109, message: '版本已变化', data: null }),
      })
    }
    expect(body.version).toBe('63927800000000009')
    return route.fulfill({
      contentType: 'application/json',
      body: success(api.member.positions[0]),
    })
  })
  const drawer = await detail(page)
  await drawer.getByRole('tab', { name: '岗位归属', exact: true }).click()
  await drawer
    .locator('.el-tab-pane:visible')
    .getByRole('button', { name: '编辑', exact: true })
    .click()
  const form = page.getByRole('dialog', { name: '编辑岗位归属', exact: true })
  await form.getByLabel('备注', { exact: true }).fill('冲突时保留草稿')
  await form.getByRole('button', { name: '保存岗位归属', exact: true }).click()
  await expect(form.getByLabel('备注', { exact: true })).toHaveValue('冲突时保留草稿')
  await expect(form.getByRole('button', { name: '保存岗位归属', exact: true })).toBeDisabled()
  expect(calls).toBe(1)
  await form.getByRole('button', { name: '重新加载归属', exact: true }).click()
  await expect(form.getByLabel('备注', { exact: true })).toHaveValue('原备注')
  await form.getByRole('button', { name: '保存岗位归属', exact: true }).click()
  await expect(form).toBeHidden()
  expect(calls).toBe(2)
})

test('self administrator change rebuilds page permissions rather than keeping old grants', async ({
  page,
}) => {
  const api = await setup(page, true)
  api.member.user_id = 1001
  api.member.user.id = 1001
  let pages = 0
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.url().includes('/iam/members')) pages += 1
  })
  await page.route('**/api/iam-admin/MemberRole/CancelTenantAdmin', (route) => {
    api.member.is_tenant_admin = false
    return route.fulfill({
      contentType: 'application/json',
      body: success({
        tenant_id: 1,
        user_id: 1001,
        is_tenant_admin: false,
        member_version: version,
        changed: true,
        idempotent: false,
      }),
    })
  })
  const drawer = await detail(page)
  await drawer.getByRole('button', { name: '取消管理员', exact: true }).click()
  await page
    .getByRole('dialog', { name: '取消管理员', exact: true })
    .getByRole('button', { name: '确认取消管理员', exact: true })
    .click()
  await expect.poll(() => pages).toBe(2)
  await expect(page.getByRole('button', { name: '详情', exact: true }).first()).toBeVisible()
  await expect(drawer).toBeHidden()
})

test('new relationship searches only current Tenant candidates and never sends an existing ID', async ({
  page,
}) => {
  const api = await setup(page)
  const queries: Array<Record<string, unknown>> = []
  await page.route('**/api/iam-admin/Membership/QueryFilterOptions', (route) => {
    const body = route.request().postDataJSON()
    queries.push(body)
    expect(body.tenant_ids).toEqual([1])
    expect(body.kind).toBe('organization')
    return route.fulfill({
      contentType: 'application/json',
      body: success({
        total: 1,
        page_index: 1,
        page_size: 20,
        items: [{ id: 30, tenant_id: 1, code: 'NORTH', name: '二部' }],
      }),
    })
  })
  const drawer = await detail(page)
  await drawer.getByRole('tab', { name: '组织归属', exact: true }).click()
  await drawer.getByRole('button', { name: '新增组织归属', exact: true }).click()
  const form = page.getByRole('dialog', { name: '新增组织归属', exact: true })
  await expect(form.locator('.el-select')).not.toContainText('运营组织')
  await form.getByLabel('目标组织', { exact: true }).fill('二部')
  await page.getByRole('option', { name: /二部/ }).click()
  await form
    .getByLabel('有效开始时间（Asia/Shanghai）', { exact: true })
    .fill('2026-10-16 09:00:00')
  await form.getByLabel('有效开始时间（Asia/Shanghai）', { exact: true }).press('Tab')
  await form.getByRole('button', { name: '保存组织归属', exact: true }).click()
  await expect(form).toBeHidden()
  expect(api.writes[0]?.body).toMatchObject({ tenant_user_id: 1, org_id: 30, is_primary: false })
  expect(api.writes[0]?.body.id).toBeUndefined()
  expect(api.writes[0]?.body.version).toBeUndefined()
  expect(queries.some((body) => body.keyword === '二部')).toBe(true)
})

test('pending administrator confirmation cannot be dismissed or submitted twice', async ({
  page,
}) => {
  const api = await setup(page)
  let calls = 0
  let release: (() => void) | undefined
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/iam-admin/MemberRole/AppointTenantAdmin', async (route) => {
    calls += 1
    await pending
    api.member.is_tenant_admin = true
    await route.fulfill({
      contentType: 'application/json',
      body: success({
        tenant_id: 1,
        user_id: 2001,
        is_tenant_admin: true,
        changed: true,
        idempotent: false,
        member_version: version,
      }),
    })
  })
  const drawer = await detail(page)
  await drawer.getByRole('button', { name: '任命管理员', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '任命管理员', exact: true })
  try {
    await dialog.getByRole('button', { name: '确认任命', exact: true }).click()
    await expect.poll(() => calls).toBe(1)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: '取消', exact: true })).toBeDisabled()
    await expect(dialog.getByRole('button', { name: '确认任命', exact: true })).toBeDisabled()
    await expect(dialog.getByRole('button', { name: '关闭此对话框', exact: true })).toHaveCount(0)
  } finally {
    release?.()
  }
  await expect(dialog).toBeHidden()
  expect(calls).toBe(1)
})
