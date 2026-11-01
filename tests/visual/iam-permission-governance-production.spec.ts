import { expect, test, type Page, type Route } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

function apiSuccess(data: unknown): string {
  return JSON.stringify({ status: 'success', code: 1, message: '', data })
}

async function fulfill(route: Route, data: unknown): Promise<void> {
  await route.fulfill({ contentType: 'application/json', body: apiSuccess(data) })
}

const versionToken = '63924670932147368001'
const timestamp = '2026-09-26T08:00:00Z'

const iamApp = {
  id: 1,
  app_code: 'IAM',
  app_name: 'IAM 身份权限管理',
  description: '身份与权限管理',
  icon: 'mdi:shield-account-outline',
  route_prefix: '/iam',
  status: 'active',
  remarks: '',
  can_maintain: true,
  version: versionToken,
  created_at: timestamp,
  created_by: 'bootstrap',
  updated_at: timestamp,
  updated_by: 'bootstrap',
}

const frontendResource = {
  id: 201,
  app_id: 1,
  parent_id: 200,
  resource_code: 'IAM.MEMBERS.EDIT_USER',
  resource_name: '编辑用户',
  source: 'frontend',
  resource_type: 'button',
  route_path: '',
  component: '',
  icon: 'mdi:account-edit-outline',
  http_method: '',
  api_path: '',
  function_access_mode: null,
  is_visible: false,
  sort_order: 10,
  status: 'active',
  remarks: '',
  version: versionToken,
  created_at: timestamp,
  created_by: 'bootstrap',
  updated_at: timestamp,
  updated_by: 'bootstrap',
  app: { id: 1, app_code: 'IAM', app_name: 'IAM 身份权限管理' },
  parent: {
    id: 200,
    resource_code: 'IAM.MEMBERS',
    resource_name: '用户与成员',
    resource_type: 'menu',
  },
}

const functionResource = {
  ...frontendResource,
  id: 301,
  parent_id: 0,
  resource_code: 'IAM.API.QUERY_USERS',
  resource_name: '查询用户',
  source: 'backend',
  resource_type: 'function',
  icon: '',
  http_method: 'POST',
  api_path: '/iam-admin/Membership/QueryUsers',
  function_access_mode: 'read',
  parent: null,
}

const saveFunctionResource = {
  ...functionResource,
  id: 302,
  resource_code: 'IAM.API.UPDATE_USER',
  resource_name: '保存用户',
  function_access_mode: 'write',
  api_path: '/iam-admin/Membership/UpdateUser',
}

function permissionResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    parent_permission_id: null,
    default_selected_with_parent: false,
    tenant_id: 1,
    app_id: 1,
    permission_code: 'IAM.PERMISSION.000101',
    permission_name: '用户编辑',
    description: '读取并保存用户资料',
    sort_order: 10,
    status: 'active',
    remarks: '',
    active_role_count: 1,
    frontend_resource_count: 1,
    function_resource_count: 1,
    frontend_resource: frontendResource,
    source_role_ids: [301],
    request_id: 'request-permission-101',
    idempotent: false,
    version: versionToken,
    created_at: timestamp,
    created_by: 'admin',
    updated_at: timestamp,
    updated_by: 'admin',
    resource_tree: [
      {
        ref_id: 1,
        parent_ref_id: null,
        sort_order: 10,
        status: 'active',
        remarks: '',
        resource: frontendResource,
        children: [
          {
            ref_id: 2,
            parent_ref_id: 1,
            sort_order: 10,
            status: 'active',
            remarks: '',
            resource: functionResource,
            children: [],
          },
        ],
      },
    ],
    ...overrides,
  }
}

async function mockPageResourceAuthorization(page: Page): Promise<void> {
  const actions = [
    'IAM.SYSTEM_RESOURCES.CREATE',
    'IAM.SYSTEM_RESOURCES.UPDATE',
    'IAM.PERMISSIONS.CREATE',
    'IAM.PERMISSIONS.UPDATE',
    'IAM.PERMISSIONS.COPY',
    'IAM.PERMISSIONS.CONFIGURATION',
    'IAM.PERMISSIONS.CONFIGURATION.SAVE',
    'IAM.ROLES.AUTHORIZATION',
    'IAM.ROLES.AUTHORIZATION.SAVE',
    'IAM.MEMBERS.EFFECTIVE_PERMISSIONS',
  ]

  await page.route(
    '**/api/iam-admin/CurrentPermissionResource/CurrentPageResources',
    async (route) => {
      const request = route.request().postDataJSON() as { page_resource_code?: string }
      await fulfill(route, {
        page_resource_code: request.page_resource_code ?? '',
        can_access: true,
        button_resource_codes: actions,
        button_page_resource_codes: actions,
        read_function_resource_codes: [],
        authorization_version: versionToken,
      })
    },
  )
}

async function mockGovernanceReads(page: Page): Promise<void> {
  await page.route('**/api/iam-admin/PermissionApp/Query', (route) =>
    fulfill(route, {
      apps: [iamApp],
      snapshot_version: versionToken,
      scope_complete: true,
      scope: 'authorized-session-scope',
    }),
  )
  await page.route('**/api/iam-admin/PermissionResource/Query', (route) =>
    fulfill(route, {
      total: 3,
      page_index: 1,
      page_size: 10,
      items: [frontendResource, functionResource, saveFunctionResource],
    }),
  )
  await page.route('**/api/iam-admin/PermissionResource/Get', (route) => {
    const request = route.request().postDataJSON() as { id?: number }
    return fulfill(
      route,
      String(request.id) === String(functionResource.id) ? functionResource : frontendResource,
    )
  })
  await page.route('**/api/iam-admin/PermissionScheme/Query', (route) => {
    const request = route.request().postDataJSON() as { include_details?: boolean }
    return fulfill(route, {
      total: 1,
      page_index: 1,
      page_size: request.include_details ? 200 : 10,
      items: [permissionResponse(request.include_details ? {} : { resource_tree: [] })],
    })
  })
  await page.route('**/api/iam-admin/PermissionScheme/Get', (route) => {
    const request = route.request().postDataJSON() as { id?: number }
    return fulfill(route, permissionResponse({ id: request.id ?? 101 }))
  })
  await page.route('**/api/iam-admin/RolePermission/QueryRoles', (route) =>
    fulfill(route, {
      total: 1,
      page_index: 1,
      page_size: 1,
      items: [
        {
          id: 301,
          tenant_id: 1,
          tenant_code: 'TENANT-001',
          role_code: 'TENANT_ADMIN',
          role_name: 'Tenant 管理员',
          role_type: 'CUSTOM',
          sort_order: 10,
          status: 'active',
          description: '',
          remarks: '',
          is_currently_effective: true,
          is_group_controlled: false,
          can_maintain: true,
          version: versionToken,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ],
    }),
  )
  await page.route('**/api/iam-admin/Tenant/Query', (route) =>
    fulfill(route, {
      total: 1,
      page_index: 1,
      page_size: 1000,
      items: [
        {
          id: 1,
          tenant_code: 'TENANT-001',
          tenant_name: '测试 Tenant',
          tenant_type: 'enterprise',
          status: 'active',
          version: versionToken,
          updated_at: timestamp,
        },
      ],
    }),
  )
  await page.route('**/api/iam-admin/RolePermissionScheme/QueryEligiblePermissions', (route) =>
    fulfill(route, {
      tenant_id: 1,
      role_id: 301,
      role_version: versionToken,
      snapshot_version: versionToken,
      scope_complete: true,
      permissions: [
        {
          permission: permissionResponse({ resource_tree: [] }),
          eligible: true,
          assigned: true,
          blocking_reasons: [],
        },
      ],
    }),
  )
  await page.route('**/api/iam-admin/RolePermissionScheme/Query', (route) =>
    fulfill(route, {
      tenant_id: 1,
      role_id: 301,
      role_code: 'TENANT_ADMIN',
      role_name: 'Tenant 管理员',
      role_version: versionToken,
      snapshot_version: versionToken,
      assigned_permission_ids: [101],
      permissions: [permissionResponse()],
      effective_resources: [],
      effective_resource_tree: [],
      request_id: '',
      idempotent: false,
    }),
  )
  await page.route('**/api/iam-admin/CurrentPermissionResource/QueryUserPermissions', (route) =>
    fulfill(route, {
      tenant_id: 1,
      user_id: 5,
      roles: [
        {
          role_id: 301,
          role_code: 'TENANT_ADMIN',
          role_name: 'Tenant 管理员',
          permission_ids: [101],
        },
      ],
      permissions: [permissionResponse()],
      effective_resources: [
        {
          resource: frontendResource,
          source_permission_ids: [101],
          source_role_ids: [301],
        },
        {
          resource: functionResource,
          source_permission_ids: [101],
          source_role_ids: [301],
        },
      ],
      effective_resource_tree: [],
      authorization_version: versionToken,
    }),
  )
  await page.route('**/api/iam-admin/Membership/QueryUsers', async (route) => {
    const request = route.request().postDataJSON() as Record<string, unknown>
    if (
      request.user_name === '林嘉' &&
      request.user_id === undefined &&
      request.page_index === 1 &&
      request.page_size === 1 &&
      Array.isArray(request.tenant_ids) &&
      request.tenant_ids.length === 1 &&
      request.tenant_ids[0] === 1
    ) {
      await route.fallback()
      return
    }
    await fulfill(route, {
      total: 1,
      page_index: 1,
      page_size: 1,
      items: [
        {
          user_id: 5,
          tenant_user_id: 8,
          user_status: 'active',
          member_status: 'active',
          user_version: versionToken,
          member_version: versionToken,
          tenant_id: 1,
          tenant_code: 'TENANT-001',
          tenant_user_code: 'TENANT-001-5',
          display_name: '测试用户',
          is_tenant_admin: false,
          joined_at: timestamp,
          left_at: null,
          is_member_currently_effective: true,
          user: {
            id: 5,
            user_name: '林嘉',
            real_name: '测试用户',
            nick_name: '',
            phone: '',
            email: '',
            avatar_url: '',
            user_type: 'tenant',
            status: 'active',
            version: versionToken,
            updated_at: timestamp,
          },
          organizations: [],
          positions: [],
          memberships: [
            {
              user_id: 5,
              tenant_user_id: 8,
              tenant_id: 1,
              tenant_code: 'TENANT-001',
              tenant_name: '测试 Tenant',
              tenant_user_code: 'TENANT-001-5',
              display_name: '测试用户',
              user_type: 'tenant',
              member_status: 'active',
              is_tenant_admin: false,
              joined_at: timestamp,
              left_at: null,
              is_currently_effective: true,
              membership_is_currently_effective: true,
              member_version: versionToken,
              tenant_is_deleted: false,
              updated_at: timestamp,
            },
          ],
        },
      ],
    })
  })
}

async function prepareGovernancePage(page: Page): Promise<void> {
  await useAuthenticatedSession(page)
  await mockPageResourceAuthorization(page)
  await mockGovernanceReads(page)
}

test.describe('IAM permission governance v2 production binding', () => {
  test.beforeEach(async ({ page }) => {
    await prepareGovernancePage(page)
  })

  const markedPages = [
    ['/iam/system-resources', 'IAM.SYSTEM_RESOURCES', 'iam.catalog.page'],
    ['/iam/permissions', 'IAM.PERMISSIONS', 'iam.permissions.page'],
    [
      '/iam/permissions/configuration?permissionId=101&tenantId=1',
      'IAM.PERMISSIONS.CONFIGURATION',
      'iam.configuration.page',
    ],
    [
      '/iam/roles/authorization?roleId=301&tenantId=1',
      'IAM.ROLES.AUTHORIZATION',
      'iam.role-authorization.page',
    ],
    [
      '/iam/members/effective-permissions?userId=5&tenantId=1',
      'IAM.MEMBERS.EFFECTIVE_PERMISSIONS',
      'iam.user-effective.page',
    ],
  ] as const

  for (const [route, code, marker] of markedPages) {
    test(`${code} retains production resource identity without runtime warnings`, async ({
      page,
    }) => {
      const messages: string[] = []
      page.on('pageerror', (error) => messages.push(error.message))
      page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type())) messages.push(message.text())
      })
      await page.goto(route)
      const content = page.locator('main[data-app-page]')
      await expect(content).toHaveAttribute('data-resource-element', marker)
      await expect(content).toHaveAttribute('data-resource-code', code)
      await expect(content).toHaveAttribute('data-resource-owner', code)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('vite-error-overlay')).toHaveCount(0)
      expect(messages).toEqual([])
    })
  }

  test('resource markers do not grant a denied V2 create operation', async ({ page }) => {
    await page.route('**/api/iam-admin/CurrentPermissionResource/CurrentPageResources', (route) => {
      const body = route.request().postDataJSON() as { page_resource_code: string }
      return fulfill(route, {
        page_resource_code: body.page_resource_code,
        can_access: true,
        button_resource_codes: [],
        button_page_resource_codes: [],
        read_function_resource_codes: [],
        authorization_version: versionToken,
      })
    })
    await page.goto('/iam/permissions')
    await expect(page.getByRole('heading', { level: 1, name: '权限管理' })).toBeVisible()
    await expect(page.getByText('用户编辑', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '新建权限', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '复制', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0)
    await page.locator('.el-table__body-wrapper .permission-management-page__name').first().click()
    await expect(
      page.getByRole('dialog').getByRole('button', { name: '编辑', exact: true }),
    ).toHaveCount(0)
  })

  for (const entry of ['list', 'detail'] as const) {
    test(`edits permission metadata from ${entry} with latest version and preserves the filtered list`, async ({
      page,
    }, testInfo) => {
      const latestVersion = '63927767911469468'
      let record = permissionResponse({
        id: '101',
        permission_name: '启用员工',
        remarks: '保留备注',
      })
      const queries: Record<string, unknown>[] = []
      const updates: Record<string, unknown>[] = []
      const gets: Record<string, unknown>[] = []
      await page.route('**/api/iam-admin/PermissionScheme/Query', (route) => {
        const body = route.request().postDataJSON() as Record<string, unknown>
        queries.push(body)
        const items = record.permission_name.includes(String(body.keyword ?? '')) ? [record] : []
        return fulfill(route, {
          total: items.length,
          page_index: body.page_index,
          page_size: body.page_size,
          items,
        })
      })
      await page.route('**/api/iam-admin/PermissionScheme/Get', (route) => {
        gets.push(route.request().postDataJSON() as Record<string, unknown>)
        return fulfill(route, { ...record, version: latestVersion })
      })
      await page.route('**/api/iam-admin/PermissionScheme/Update', async (route) => {
        const body = route.request().postDataJSON() as Record<string, unknown>
        updates.push(body)
        record = {
          ...record,
          permission_name: String(body.permission_name),
          description: String(body.description),
          sort_order: Number(body.sort_order),
          version: '63927767911469469',
        }
        await fulfill(route, record)
      })
      await page.goto('/iam/permissions?pageSize=100&permissionName=%E5%90%AF%E7%94%A8')
      if (entry === 'detail')
        await page
          .locator('.el-table__body-wrapper .permission-management-page__name')
          .first()
          .click()
      const trigger =
        entry === 'list'
          ? page.locator('.row-action-grid').getByRole('button', { name: '编辑', exact: true })
          : page.getByRole('dialog').getByRole('button', { name: '编辑', exact: true })
      await trigger.focus()
      await page.keyboard.press('Enter')
      const drawer = page.getByRole('dialog', { name: '编辑权限', exact: true })
      await expect(drawer).toHaveAttribute('data-resource-element', 'iam.permissions.editForm')
      await expect(drawer).toHaveAttribute('data-resource-code', 'IAM.PERMISSIONS.UPDATE')
      await expect(drawer.getByRole('combobox', { name: '*所属 App' })).toBeDisabled()
      await expect(drawer.getByRole('textbox', { name: '*权限名称' })).toHaveValue('启用员工')
      await drawer.getByRole('textbox', { name: '*权限名称' }).focus()
      await expect(drawer.getByRole('textbox', { name: '*权限名称' })).toBeFocused()
      await drawer.getByRole('textbox', { name: '*权限名称' }).fill('启用成员资料')
      await drawer.getByRole('textbox', { name: '权限说明' }).fill('维护成员启用状态')
      await drawer.getByRole('spinbutton', { name: '排序' }).fill('25')
      await page.screenshot({
        path: join(tmpdir(), `ss-express-permission-edit-${entry}-${testInfo.project.name}.png`),
      })
      await drawer.getByRole('button', { name: '保存修改', exact: true }).click()
      await expect(drawer).toBeHidden()
      await expect(page.getByText('启用成员资料', { exact: true }).first()).toBeVisible()
      await expect.poll(() => updates.length).toBe(1)
      expect(updates[0]).toEqual({
        id: '101',
        tenant_id: '1',
        parent_permission_id: null,
        default_selected_with_parent: false,
        permission_kind: 'business',
        version: latestVersion,
        permission_name: '启用成员资料',
        description: '维护成员启用状态',
        sort_order: 25,
        remarks: '保留备注',
        request_id: expect.any(String),
      })
      expect(gets.length).toBe(entry === 'list' ? 1 : 2)
      expect(queries.at(-1)).toMatchObject({
        keyword: '启用',
        page_size: 100,
        page_index: 1,
      })
      await expect(page).toHaveURL(/\/iam\/permissions\?pageSize=100&permissionName=/u)
      await page
        .locator('.row-action-grid')
        .getByRole('button', { name: '编辑', exact: true })
        .click()
      await drawer.getByRole('textbox', { name: '*权限名称' }).fill('成员维护')
      await drawer.getByRole('button', { name: '保存修改', exact: true }).click()
      await expect(drawer).toBeHidden()
      await expect(page.locator('.el-table__body-wrapper tbody tr')).toHaveCount(0)
      await expect(page.locator('.el-pagination__total')).toHaveText('共 0 条')
    })
  }

  for (const failure of ['conflict', 'forbidden', 'unknown'] as const) {
    test(`retains permission edit input after ${failure} and preserves mutation identity`, async ({
      page,
    }) => {
      const bodies: Record<string, unknown>[] = []
      await page.route('**/api/iam-admin/PermissionScheme/Update', async (route) => {
        const body = route.request().postDataJSON() as Record<string, unknown>
        bodies.push(body)
        if (failure === 'unknown' && bodies.length === 1) {
          await route.abort('failed')
          return
        }
        if (failure === 'unknown') {
          await fulfill(route, permissionResponse({ permission_name: body.permission_name }))
          return
        }
        await route.fulfill({
          status: failure === 'conflict' ? 409 : 403,
          contentType: 'application/json',
          body: JSON.stringify({
            is_success: false,
            status: 'error',
            code: -1,
            message: failure === 'conflict' ? '版本冲突' : 'Forbidden',
          }),
        })
      })
      await page.goto('/iam/permissions')
      await page
        .locator('.row-action-grid')
        .getByRole('button', { name: '编辑', exact: true })
        .click()
      const drawer = page.getByRole('dialog', { name: '编辑权限', exact: true })
      const name = drawer.getByRole('textbox', { name: '*权限名称' })
      await name.fill('新的权限名称')
      await drawer.getByRole('button', { name: '保存修改', exact: true }).click()
      await expect.poll(() => bodies.length).toBe(1)
      await expect(drawer).toBeVisible()
      await expect(name).toHaveValue('新的权限名称')
      expect(bodies[0]?.version).toBe(versionToken)
      if (failure === 'unknown') {
        await expect(drawer.getByRole('button', { name: '保存修改', exact: true })).toBeDisabled()
        await drawer.getByRole('button', { name: '使用原请求标识重试', exact: true }).click()
        await expect(drawer).toBeHidden()
        expect(bodies).toHaveLength(2)
        expect(bodies[1]).toEqual(bodies[0])
        await expect(page).toHaveURL(/\/iam\/permissions$/u)
      } else {
        await expect(drawer.locator('.el-alert--error')).toContainText(
          failure === 'conflict' ? '数据已被其他用户修改' : '当前账号无权执行此操作',
        )
      }
    })
  }

  test('does not open stale edit data when latest permission detail cannot be read', async ({
    page,
  }) => {
    await page.route('**/api/iam-admin/PermissionScheme/Get', (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: '{}' }),
    )
    await page.goto('/iam/permissions')
    const edit = page.locator('.row-action-grid').getByRole('button', { name: '编辑', exact: true })
    await edit.click()
    await expect(edit).toBeEnabled()
    await expect(page.getByRole('dialog', { name: '编辑权限', exact: true })).toHaveCount(0)
  })

  test('queries the system resource catalog and loads resource detail through v2 APIs', async ({
    page,
  }) => {
    const queryBodies: Record<string, unknown>[] = []
    const getBodies: Record<string, unknown>[] = []
    page.on('request', (request) => {
      if (request.url().includes('/PermissionResource/Query')) {
        queryBodies.push(request.postDataJSON() as Record<string, unknown>)
      }
      if (request.url().includes('/PermissionResource/Get')) {
        getBodies.push(request.postDataJSON() as Record<string, unknown>)
      }
    })

    await page.goto('/iam/system-resources')
    await expect(page.getByRole('heading', { level: 1, name: '系统资源目录' })).toBeVisible()
    await expect(page.getByText('查询用户', { exact: true }).first()).toBeVisible()

    await page.getByPlaceholder('名称、编码、路由或 API Path').fill('QueryUsers')
    await page.locator('.search-panel').getByRole('button', { name: '查询', exact: true }).click()
    await expect.poll(() => queryBodies.at(-1)?.keyword).toBe('QueryUsers')
    expect(queryBodies.at(-1)).toMatchObject({ page_index: 1, page_size: 10 })

    await page.locator('.resource-catalog-page__name').filter({ hasText: '查询用户' }).click()
    await expect(page.getByText('查询用户 · 资源详情', { exact: true })).toBeVisible()
    await expect.poll(() => getBodies.at(-1)).toEqual({ id: '301' })
  })

  test('creates a resource without editable codes and keeps draft on cancelled discard', async ({
    page,
  }, testInfo) => {
    const bodies: Record<string, unknown>[] = []
    await page.route('**/api/iam-admin/PermissionResource/Create', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      bodies.push(body)
      expect(route.request().headers()['x-request-id']).toBe(body.request_id)
      await fulfill(route, {
        ...frontendResource,
        ...body,
        id: '90071992547409931',
        resource_code: 'RESOURCE-90071992547409931',
      })
    })
    await page.goto('/iam/system-resources?pageSize=100')
    await page.getByRole('button', { name: '新增资源', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '新增资源', exact: true })
    await expect(drawer).toHaveAttribute('data-resource-code', 'IAM.SYSTEM_RESOURCES.CREATE')
    await expect(drawer.getByRole('textbox', { name: '资源编码' })).toHaveCount(0)
    const name = drawer.getByRole('textbox', { name: '*资源名称' })
    await expect(name).toHaveValue('')
    await drawer.getByRole('button', { name: '创建资源', exact: true }).click()
    await expect(drawer).toContainText('请检查标出的必填项')
    expect(bodies).toHaveLength(0)
    await drawer.getByRole('combobox', { name: '*所属 App' }).focus()
    await page.keyboard.press('ArrowDown')
    await page.getByRole('option', { name: 'IAM 身份权限管理', exact: true }).click()
    await name.fill('新建运营模块')
    await drawer.getByRole('button', { name: '取消', exact: true }).click()
    const discard = page.getByRole('dialog', { name: '放弃未保存的修改？', exact: true })
    await discard.getByRole('button', { name: '继续编辑', exact: true }).click()
    await expect(name).toHaveValue('新建运营模块')
    await page.screenshot({
      path: join(tmpdir(), `ss-express-resource-create-${testInfo.project.name}.png`),
      animations: 'disabled',
    })
    await drawer.getByRole('button', { name: '创建资源', exact: true }).click()
    await expect(drawer).toBeHidden()
    await expect.poll(() => bodies.length).toBe(1)
    expect(bodies[0]).toMatchObject({
      app_id: '1',
      parent_id: '0',
      resource_code: '',
      resource_name: '新建运营模块',
      source: 'frontend',
      resource_type: 'module',
      route_path: '',
      component: '',
      api_path: '',
      http_method: '',
      function_access_mode: null,
      is_visible: false,
      is_composable: false,
      authorization_category: 'business',
      lifecycle: 'active',
      status: 'active',
      request_id: expect.any(String),
    })
    await expect(page).toHaveURL(/\/iam\/system-resources\?pageSize=100$/u)
  })

  test('edits resource from latest Get preserving int64 IDs version and Function metadata', async ({
    page,
  }, testInfo) => {
    const id = '90071992547409933'
    const latestVersion = '63927767911469469'
    let record = {
      ...functionResource,
      id,
      authorization_category: 'internal',
      is_composable: false,
      lifecycle: 'deprecated',
      managed_by: 'iam-resource-maintenance',
      managed_key: 'function.internal.query',
      remarks: '保留备注',
      version: versionToken,
    }
    const queries: Record<string, unknown>[] = []
    const gets: Record<string, unknown>[] = []
    const updates: Record<string, unknown>[] = []
    await page.route('**/api/iam-admin/PermissionResource/Query', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      queries.push(body)
      await fulfill(route, { total: 1, page_index: 1, page_size: 100, items: [record] })
    })
    await page.route('**/api/iam-admin/PermissionResource/Get', async (route) => {
      gets.push(route.request().postDataJSON() as Record<string, unknown>)
      await fulfill(route, { ...record, version: latestVersion })
    })
    await page.route('**/api/iam-admin/PermissionResource/Update', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      updates.push(body)
      expect(route.request().headers()['x-request-id']).toBe(body.request_id)
      record = { ...record, resource_name: String(body.resource_name) }
      await fulfill(route, record)
    })
    await page.goto('/iam/system-resources?pageSize=100&keyword=QueryUsers')
    await page
      .locator('.row-action-grid')
      .getByRole('button', { name: '编辑', exact: true })
      .click()
    const drawer = page.getByRole('dialog', { name: '编辑资源', exact: true })
    await expect(drawer).toHaveAttribute('data-resource-code', 'IAM.SYSTEM_RESOURCES.UPDATE')
    await expect(drawer.getByRole('combobox', { name: '*所属 App' })).toBeDisabled()
    await expect(drawer.getByRole('combobox', { name: '资源类型', exact: true })).toBeDisabled()
    await expect(drawer.getByRole('textbox', { name: '资源编码' })).toHaveCount(0)
    await drawer.getByRole('textbox', { name: '*资源名称' }).fill('用户接口查询')
    await page.screenshot({
      path: join(tmpdir(), `ss-express-resource-edit-${testInfo.project.name}.png`),
      animations: 'disabled',
    })
    await drawer.getByRole('button', { name: '保存修改', exact: true }).click()
    await expect(drawer).toBeHidden()
    expect(gets).toEqual([{ id }])
    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({
      id,
      app_id: '1',
      parent_id: '0',
      version: latestVersion,
      resource_name: '用户接口查询',
      http_method: 'POST',
      api_path: '/iam-admin/Membership/QueryUsers',
      function_access_mode: 'read',
      authorization_category: 'internal',
      is_composable: false,
      lifecycle: 'deprecated',
      remarks: '保留备注',
      request_id: expect.any(String),
    })
    expect(updates[0]).not.toHaveProperty('resource_code')
    expect(updates[0]).not.toHaveProperty('managed_key')
    expect(queries.at(-1)).toMatchObject({ keyword: 'QueryUsers', page_size: 100, page_index: 1 })
    await expect(page.getByText('用户接口查询', { exact: true }).first()).toBeVisible()
  })

  test('resource parent selector preserves string selection and paginates legal same-App parents', async ({
    page,
  }) => {
    const parentId = '90071992547409935'
    let body: Record<string, unknown> | undefined
    const candidates: Record<string, unknown>[] = []
    await page.route('**/api/iam-admin/PermissionResource/Query', async (route) => {
      const request = route.request().postDataJSON() as Record<string, unknown>
      if (request.source !== 'frontend')
        return fulfill(route, { total: 1, page_index: 1, page_size: 10, items: [frontendResource] })
      candidates.push(request)
      return fulfill(route, {
        total: 1,
        page_index: 1,
        page_size: 20,
        items: [
          {
            ...frontendResource,
            id: parentId,
            resource_type: 'menu',
            resource_name: '员工管理父菜单',
          },
        ],
      })
    })
    await page.route('**/api/iam-admin/PermissionResource/Update', async (route) => {
      body = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, { ...frontendResource, ...body })
    })
    await page.goto('/iam/system-resources')
    await page
      .locator('.row-action-grid')
      .getByRole('button', { name: '编辑', exact: true })
      .click()
    const drawer = page.getByRole('dialog', { name: '编辑资源', exact: true })
    const select = drawer.getByRole('combobox', { name: '父级资源', exact: true })
    await select.click()
    await page.getByRole('option', { name: /员工管理父菜单/ }).click()
    await expect(
      drawer.locator('.paged-entity-select .el-select__selected-item').last(),
    ).toContainText('员工管理父菜单')
    await drawer.getByRole('button', { name: '保存修改', exact: true }).click()
    await expect.poll(() => body?.parent_id).toBe(parentId)
    expect(candidates[0]).toMatchObject({
      app_id: '1',
      source: 'frontend',
      resource_type: 'menu',
      status: 'active',
      page_index: 1,
      page_size: 20,
    })
  })

  for (const failure of ['conflict', 'unknown'] as const) {
    test(`resource edit keeps form after ${failure} and safely reuses unknown request`, async ({
      page,
    }) => {
      const bodies: Record<string, unknown>[] = []
      await page.route('**/api/iam-admin/PermissionResource/Update', async (route) => {
        bodies.push(route.request().postDataJSON() as Record<string, unknown>)
        if (failure === 'unknown' && bodies.length === 1) return route.abort('failed')
        if (failure === 'unknown') return fulfill(route, functionResource)
        return route.fulfill({ status: 409, contentType: 'application/json', body: '{}' })
      })
      await page.goto('/iam/system-resources?keyword=QueryUsers')
      await page
        .locator('.row-action-grid')
        .getByRole('button', { name: '编辑', exact: true })
        .click()
      const drawer = page.getByRole('dialog', { name: '编辑资源', exact: true })
      const name = drawer.getByRole('textbox', { name: '*资源名称' })
      await name.fill('修改后的资源名称')
      await drawer.getByRole('button', { name: '保存修改', exact: true }).click()
      await expect.poll(() => bodies.length).toBe(1)
      await expect(name).toHaveValue('修改后的资源名称')
      if (failure === 'unknown') {
        await expect(drawer.getByRole('button', { name: '保存修改', exact: true })).toBeDisabled()
        await drawer.getByRole('button', { name: '使用原请求重试', exact: true }).click()
        await expect(drawer).toBeHidden()
        expect(bodies[1]).toEqual(bodies[0])
      } else await expect(drawer).toContainText('数据已被其他用户修改')
    })
  }

  test('resource mutation actions are absent without exact Button grants', async ({ page }) => {
    await page.route('**/api/iam-admin/CurrentPermissionResource/CurrentPageResources', (route) =>
      fulfill(route, {
        page_resource_code: 'IAM.SYSTEM_RESOURCES',
        can_access: true,
        button_resource_codes: [],
        button_page_resource_codes: [],
        read_function_resource_codes: [],
        authorization_version: versionToken,
      }),
    )
    await page.goto('/iam/system-resources')
    await expect(page.getByText('查询用户', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '新增资源', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0)
    await page.locator('.el-table__body-wrapper .resource-catalog-page__name').first().click()
    await expect(page.getByRole('button', { name: '编辑资源', exact: true })).toHaveCount(0)
  })

  test('creates a permission without a client-generated code and enters configuration', async ({
    page,
  }) => {
    let createBody: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/PermissionScheme/Create', async (route) => {
      createBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(
        route,
        permissionResponse({
          id: 102,
          permission_code: 'IAM.PERMISSION.000102',
          permission_name: createBody.permission_name,
          description: createBody.description,
          sort_order: createBody.sort_order,
          resource_tree: [],
          frontend_resource: null,
          frontend_resource_count: 0,
          function_resource_count: 0,
        }),
      )
    })

    await page.goto('/iam/permissions')
    await expect(page.getByRole('heading', { level: 1, name: '权限管理' })).toBeVisible()
    await page.getByRole('button', { name: '新建权限', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '新建权限' })
    await expect(drawer).toHaveAttribute('data-resource-code', 'IAM.PERMISSIONS.CREATE')
    await expect(drawer).toHaveAttribute('data-resource-element', 'iam.permissions.createForm')
    await drawer.getByRole('combobox', { name: '*所属 App' }).click()
    await page.getByRole('option', { name: 'IAM 身份权限管理', exact: true }).click()
    await drawer.getByRole('textbox', { name: '*权限名称' }).fill('组织资料维护')
    await drawer.getByRole('textbox', { name: '权限说明' }).fill('查询并保存组织资料')
    await drawer.getByRole('button', { name: '创建权限', exact: true }).click()

    await expect
      .poll(() => createBody)
      .toMatchObject({
        tenant_id: '1',
        app_id: '1',
        permission_name: '组织资料维护',
        description: '查询并保存组织资料',
        sort_order: 0,
        status: 'inactive',
        remarks: '',
      })
    expect(createBody).not.toHaveProperty('permission_code')
    expect(createBody?.request_id).toBeTruthy()
    await expect(page).toHaveURL(/\/iam\/permissions\/configuration\?.*permissionId=102/u)
  })

  test('copies a permission with its string VersionToken and no client-generated code', async ({
    page,
  }) => {
    let copyBody: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/PermissionScheme/Copy', async (route) => {
      copyBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(
        route,
        permissionResponse({
          id: 103,
          permission_code: 'IAM.PERMISSION.000103',
          permission_name: copyBody.permission_name,
        }),
      )
    })

    await page.goto('/iam/permissions')
    await expect(page.getByText('用户编辑', { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: '复制', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '复制 用户编辑' })
    await drawer.getByRole('textbox', { name: '*权限名称' }).fill('用户编辑副本')
    await drawer.getByRole('button', { name: '创建副本', exact: true }).click()

    await expect
      .poll(() => copyBody)
      .toMatchObject({
        source_permission_id: '101',
        tenant_id: '1',
        source_version: versionToken,
        permission_name: '用户编辑副本',
      })
    expect(typeof copyBody?.source_version).toBe('string')
    expect(copyBody).not.toHaveProperty('permission_code')
    expect(copyBody?.request_id).toBeTruthy()
  })

  test('reports an unknown write result without closing or clearing the form', async ({ page }) => {
    const createBodies: Array<Record<string, unknown>> = []
    await page.route('**/api/iam-admin/PermissionScheme/Create', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      createBodies.push(body)
      if (createBodies.length === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'error', code: 500, message: 'write timeout' }),
        })
        return
      }
      await fulfill(
        route,
        permissionResponse({
          id: 102,
          permission_name: body.permission_name,
          request_id: body.request_id,
          idempotent: true,
          resource_tree: [],
        }),
      )
    })

    await page.goto('/iam/permissions')
    await page.getByRole('button', { name: '新建权限', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '新建权限' })
    await drawer.getByRole('combobox', { name: '*所属 App' }).click()
    await page.getByRole('option', { name: 'IAM 身份权限管理', exact: true }).click()
    const nameInput = drawer.getByRole('textbox', { name: '*权限名称' })
    await nameInput.fill('失败后仍保留的权限')
    await drawer.getByRole('button', { name: '创建权限', exact: true }).click()

    await expect(
      page.getByText('创建权限结果未知，请刷新确认，或使用原请求标识显式重试'),
    ).toBeVisible()
    await expect(drawer).toBeVisible()
    await expect(nameInput).toHaveValue('失败后仍保留的权限')
    await expect(drawer.getByRole('button', { name: '创建权限', exact: true })).toBeDisabled()
    await expect(drawer.getByRole('button', { name: '关闭并刷新列表' })).toBeVisible()
    await drawer.getByRole('button', { name: '使用原请求标识重试' }).click()

    await expect.poll(() => createBodies.length).toBe(2)
    expect(createBodies[0]?.request_id).toBeTruthy()
    expect(createBodies[1]?.request_id).toBe(createBodies[0]?.request_id)
    await expect(page).toHaveURL(/\/iam\/permissions\/configuration\?permissionId=102/u)
  })

  test('loads the formal permission composition workspace from one permission and its app resources', async ({
    page,
  }) => {
    const resourceQueries: Record<string, unknown>[] = []
    page.on('request', (request) => {
      if (request.url().includes('/PermissionResource/Query')) {
        resourceQueries.push(request.postDataJSON() as Record<string, unknown>)
      }
    })

    await page.goto('/iam/permissions/configuration?permissionId=101&tenantId=1')
    await expect(page.getByRole('heading', { level: 1, name: '权限功能配置' })).toBeVisible()
    await expect(page.getByText('编辑用户', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('/iam-admin/Membership/QueryUsers').first()).toBeVisible()
    await expect
      .poll(() => resourceQueries.at(-1))
      .toMatchObject({
        app_id: '1',
        page_index: 1,
        page_size: 200,
      })
    expect(resourceQueries.at(-1)).not.toHaveProperty('status')
  })

  test('confirms permission changes and reuses the same request_id after an unknown result', async ({
    page,
  }) => {
    const saveBodies: Array<Record<string, unknown>> = []
    let attempt = 0
    await page.route('**/api/iam-admin/PermissionScheme/SaveTree', async (route) => {
      saveBodies.push(route.request().postDataJSON() as Record<string, unknown>)
      attempt += 1
      if (attempt === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'error', code: 500, message: 'write timeout' }),
        })
        return
      }
      await fulfill(
        route,
        permissionResponse({
          request_id: saveBodies.at(-1)?.request_id,
          idempotent: true,
        }),
      )
    })

    await page.goto('/iam/permissions/configuration?permissionId=101&tenantId=1')
    await page
      .locator('.permission-function-options .el-checkbox')
      .filter({ hasText: '保存用户' })
      .click()
    await page.getByRole('button', { name: '保存权限配置' }).click()

    const confirmation = page.getByRole('dialog', { name: '确认保存权限功能配置' })
    await expect(confirmation.locator('.el-dialog')).toHaveAttribute(
      'data-resource-code',
      'IAM.PERMISSIONS.CONFIGURATION.SAVE',
    )
    await expect(confirmation).toContainText('新增 1 个，移除 0 个')
    await expect(confirmation).toContainText(versionToken)
    await expect(confirmation).toContainText('保存用户')
    await confirmation.getByRole('button', { name: '确认保存' }).click()

    await expect(
      page.getByText('保存结果尚未确认。本地选择已保留，请勿再次点击保存。'),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: '保存权限配置' })).toBeDisabled()
    await page.getByRole('button', { name: '使用原请求标识重试' }).click()

    await expect.poll(() => saveBodies.length).toBe(2)
    expect(saveBodies[0]?.request_id).toBeTruthy()
    expect(saveBodies[1]?.request_id).toBe(saveBodies[0]?.request_id)
    await expect(
      page.getByText('保存结果尚未确认。本地选择已保留，请勿再次点击保存。'),
    ).toHaveCount(0)
  })

  test('uses exact V2 ButtonPage access for role and member entry actions', async ({ page }) => {
    const accessCodes: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/CurrentPermissionResource/CurrentPageResources')) {
        const body = request.postDataJSON() as { page_resource_code?: string }
        if (body.page_resource_code) accessCodes.push(body.page_resource_code)
      }
    })

    await page.goto('/iam/roles')
    await expect(page.getByRole('button', { name: '角色授权', exact: true }).first()).toBeVisible()
    expect(accessCodes).toContain('IAM.ROLES.AUTHORIZATION')

    await page.goto('/iam/members')
    await expect(
      page.locator('.el-table').getByRole('button', { name: '有效权限', exact: true }),
    ).toHaveCount(0)
    await page.getByRole('button', { name: '详情', exact: true }).first().click()
    await expect(page.getByRole('button', { name: '有效权限', exact: true }).first()).toBeVisible()
    expect(accessCodes).toContain('IAM.MEMBERS.EFFECTIVE_PERMISSIONS')
  })

  test('distinguishes authorization service failure from explicit forbidden access', async ({
    page,
  }) => {
    await page.unroute('**/api/iam-admin/CurrentPermissionResource/CurrentPageResources')
    await page.route('**/api/iam-admin/CurrentPermissionResource/CurrentPageResources', (route) =>
      fulfill(route, {
        page_resource_code: 'IAM.SYSTEM_RESOURCES',
        can_access: false,
        button_resource_codes: [],
        button_page_resource_codes: [],
        read_function_resource_codes: [],
        authorization_version: versionToken,
      }),
    )

    await page.goto('/iam/system-resources')
    await expect(page).toHaveURL(/\/forbidden\?from=/u)
    await expect(page.getByRole('heading', { level: 1, name: '无权访问此页面' })).toBeVisible()

    await page.unroute('**/api/iam-admin/CurrentPermissionResource/CurrentPageResources')
    await page.route('**/api/iam-admin/CurrentPermissionResource/CurrentPageResources', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', code: 503, message: 'service unavailable' }),
      }),
    )

    await page.goto('/iam/system-resources')
    await expect(page).toHaveURL(/\/authorization-service-error\?from=/u)
    await expect(page.getByRole('alert')).toContainText('暂时无法校验页面权限')
    await expect(page.getByText('这不代表当前账号没有权限')).toBeVisible()
  })

  test('renders the user effective permission snapshot as read-only', async ({ page }) => {
    await page.goto('/iam/members/effective-permissions?userId=5&tenantId=1')
    await expect(page.getByRole('heading', { level: 1, name: '用户有效权限' })).toBeVisible()
    await expect(page.getByText('测试用户', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '用户编辑', exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '保存角色授权' })).toHaveCount(0)
    await expect(page.locator('.permission-package-tree input[type="checkbox"]')).toHaveCount(0)
  })
})
