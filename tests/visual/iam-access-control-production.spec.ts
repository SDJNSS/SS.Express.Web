import { expect, test, type Page, type Route } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

function apiSuccess(data: unknown): string {
  return JSON.stringify({ status: 'success', code: 1, message: '', data })
}

const versionToken = '63924670932147368'

const roles = [
  {
    id: 501,
    tenant_id: 1,
    tenant_code: 'PLATFORM',
    role_code: 'dispatch_manager',
    role_name: '调度经理',
    role_type: 'CUSTOM',
    sort_order: 10,
    status: 'ACTIVE',
    description: '负责运输调度。',
    remarks: '标准角色',
    is_currently_effective: true,
    is_group_controlled: false,
    can_maintain: true,
    version: versionToken,
    created_at: '2025-04-18T09:12:30Z',
    updated_at: '2026-09-08T10:00:00Z',
  },
  {
    id: 502,
    tenant_id: 1,
    tenant_code: 'PLATFORM',
    role_code: 'fleet_specialist',
    role_name: '车队专员',
    role_type: 'CUSTOM',
    sort_order: 20,
    status: 'ACTIVE',
    description: '负责车队。',
    remarks: '',
    is_currently_effective: true,
    is_group_controlled: false,
    can_maintain: true,
    version: '63924670932147365',
    created_at: '2025-04-18T09:12:30Z',
    updated_at: '2026-09-08T10:00:00Z',
  },
]

const assignment = {
  assignment_id: 9001,
  tenant_id: 1,
  tenant_user_id: 1,
  tenant_user_code: 'HD0001',
  display_name: '林嘉',
  role_id: 501,
  role_code: 'dispatch_manager',
  role_name: '调度经理',
  role_type: 'CUSTOM',
  is_tenant_admin_identity: false,
  is_group_controlled: false,
  is_assigned: true,
  is_currently_effective: true,
  can_maintain: true,
  invalid_reason: '',
  member_version: versionToken,
}

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({ contentType: 'application/json', body: apiSuccess(data) })
}

async function mockAccessControlReadApis(page: Page) {
  await page.route('**/api/iam-admin/RolePermission/QueryRoles', (route) =>
    fulfill(route, { total: roles.length, page_index: 1, page_size: 10, items: roles }),
  )
  await page.route('**/api/iam-admin/MemberRole/Query', (route) =>
    fulfill(route, { total: 1, page_index: 1, page_size: 10, items: [assignment] }),
  )
}

test.describe('IAM access-control production binding', () => {
  test.beforeEach(async ({ page }) => {
    await useAuthenticatedSession(page)
    await mockAccessControlReadApis(page)
  })

  test('loads all role-management workspaces through the shared authenticated API layer', async ({
    page,
  }) => {
    const authorizationHeaders: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/iam-admin/')) {
        authorizationHeaders.push(request.headers().authorization ?? '')
      }
    })

    for (const [path, heading] of [
      ['/iam/roles', '角色管理'],
      ['/iam/roles?view=assignments', '角色分配'],
    ] as const) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    }

    expect(authorizationHeaders.length).toBeGreaterThan(5)
    expect(authorizationHeaders.every((value) => value === 'Bearer visual-test-access-token')).toBe(
      true,
    )
  })

  test('keeps the generated role code read-only and omits it from UpdateRole', async ({ page }) => {
    let updateBody: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/RolePermission/UpdateRole', async (route) => {
      updateBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, { ...roles[0], ...updateBody })
    })

    await page.goto('/iam/roles')
    await expect(page.getByText('dispatch_manager', { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: '编辑', exact: true }).first().click()
    const drawer = page.locator('.el-drawer')
    await expect(drawer.getByLabel('角色编码')).toBeDisabled()
    await expect(drawer.getByLabel('角色编码')).toHaveValue('dispatch_manager')
    await drawer.getByLabel('角色名称').fill('调度负责人')
    await drawer.getByLabel('说明').fill('负责全部运输调度。')
    await drawer.getByLabel('备注').fill('接口字段完整性测试')
    await drawer.getByRole('button', { name: '保存角色' }).click()

    await expect.poll(() => updateBody?.role_name).toBe('调度负责人')
    expect(updateBody).not.toHaveProperty('role_code')
    expect(Object.keys(updateBody ?? {}).sort()).toEqual(
      [
        'description',
        'id',
        'remarks',
        'role_name',
        'role_type',
        'sort_order',
        'status',
        'tenant_id',
        'version',
      ].sort(),
    )
    expect(updateBody?.version).toBe(versionToken)
  })

  test('creates a custom role without accepting or submitting a role code', async ({ page }) => {
    let createBody: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/RolePermission/CreateRole', async (route) => {
      createBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, {
        ...roles[0],
        ...createBody,
        id: 503,
        role_code: 'PLATFORM.ROLE-503',
        role_name: createBody.role_name,
      })
    })

    await page.goto('/iam/roles')
    await page.getByRole('button', { name: '新建自定义角色', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '新建自定义角色', exact: true })
    await expect(drawer.getByLabel('角色编码')).toHaveCount(0)
    await drawer.getByLabel('角色名称').fill('新建测试角色')
    await drawer.getByLabel('说明').fill('验证服务端生成角色编码')
    await drawer.getByRole('button', { name: '创建角色', exact: true }).click()

    await expect.poll(() => createBody?.role_name).toBe('新建测试角色')
    expect(createBody).not.toHaveProperty('role_code')
  })

  test('queries a role-scoped assignment workspace without a member filter', async ({ page }) => {
    const assignmentQueries: Array<Record<string, unknown>> = []
    page.on('request', (request) => {
      if (!request.url().endsWith('/api/iam-admin/MemberRole/Query')) return
      assignmentQueries.push(request.postDataJSON() as Record<string, unknown>)
    })

    await page.goto('/iam/roles/assignments?roleId=501&tenantId=1')
    await expect(page.getByRole('heading', { level: 1, name: '角色分配' })).toBeVisible()
    await expect.poll(() => assignmentQueries.length).toBeGreaterThan(0)

    const request = assignmentQueries.at(-1)
    expect(request).toMatchObject({ role_id: 501 })
    expect(request).not.toHaveProperty('tenant_user_id')
  })

  test('adds a selected member to the current role with the current member version', async ({
    page,
  }) => {
    let assignBody: Record<string, unknown> | undefined
    const memberOptionRequests: Array<Record<string, unknown>> = []
    page.on('request', (request) => {
      if (!request.url().endsWith('/api/iam-admin/Membership/QueryUsers')) return
      const body = request.postDataJSON() as Record<string, unknown>
      if (body.page_size === 1000) memberOptionRequests.push(body)
    })
    await page.route('**/api/iam-admin/MemberRole/Assign', async (route) => {
      assignBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, [])
    })

    await page.goto('/iam/roles/assignments?roleId=502&tenantId=1')
    await expect.poll(() => memberOptionRequests.at(-1)?.tenant_ids).toEqual([1])
    await page.getByRole('button', { name: '添加成员' }).click()
    const drawer = page.locator('.el-drawer')
    await drawer
      .locator('.el-form-item')
      .filter({ hasText: 'Tenant 成员' })
      .locator('.el-select__wrapper')
      .click()
    await page.getByText('林嘉 · HD0001', { exact: true }).click()
    await drawer.getByRole('button', { name: '确认添加', exact: true }).click()

    await expect.poll(() => assignBody?.member_version).toBe(versionToken)
    expect(assignBody).toEqual({
      tenant_user_id: 1,
      member_version: versionToken,
      role_ids: [502],
    })
  })

  test('removes a member from the current role without changing the Tenant membership', async ({
    page,
  }) => {
    let revokeBody: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/MemberRole/Revoke', async (route) => {
      revokeBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, [])
    })

    await page.goto('/iam/roles/assignments?roleId=501&tenantId=1')
    await page.getByRole('button', { name: '移除', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '移除角色成员', exact: true })
    await expect(dialog.getByText('不会停用 Tenant 成员')).toBeVisible()
    await dialog.getByRole('button', { name: '确认移除', exact: true }).click()

    await expect.poll(() => revokeBody?.member_version).toBe(versionToken)
    expect(revokeBody).toEqual({
      tenant_user_id: 1,
      member_version: versionToken,
      role_ids: [501],
    })
  })
})
