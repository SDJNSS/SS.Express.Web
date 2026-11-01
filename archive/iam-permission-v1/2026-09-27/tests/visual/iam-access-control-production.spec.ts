import { expect, test, type Page, type Route } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

function apiSuccess(data: unknown): string {
  return JSON.stringify({ status: 'success', code: 1, message: '', data })
}

const versionToken = '63924670932147368'
const nextVersionToken = '63924670932147369'

const system = {
  id: 2,
  app_code: 'TMS',
  app_name: '运输管理',
  description: '订单、调度与运输任务。',
  icon: 'mdi:truck-fast-outline',
  route_prefix: '/tms',
  status: 'ACTIVE',
  remarks: '生产接口测试系统',
  can_maintain: true,
  version: versionToken,
  created_at: '2025-02-08T10:00:00Z',
  created_by: 'platform-admin',
  updated_at: '2026-09-08T10:00:00Z',
  updated_by: 'platform-admin',
}

const resource = {
  id: 201,
  app_id: 2,
  parent_id: 0,
  resource_code: 'TMS',
  resource_name: '运输调度',
  resource_type: 'module',
  route_path: '',
  component: '',
  permission_code: '',
  icon: 'mdi:routes',
  http_method: '',
  api_path: '',
  is_visible: false,
  sort_order: 10,
  status: 'ACTIVE',
  remarks: '调度资源',
  is_currently_effective: true,
  invalid_reason: '',
  can_maintain: true,
  version: versionToken,
  created_at: '2025-02-08T10:00:00Z',
  created_by: 'platform-admin',
  updated_at: '2026-09-08T10:00:00Z',
  updated_by: 'platform-admin',
  children: [],
}

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

const rolePermissionSubject = {
  subject_type: 'role',
  subject_id: 501,
  tenant_id: 1,
  subject_code: 'dispatch_manager',
  subject_name: '调度经理',
  is_currently_effective: true,
  invalid_reason: '',
  version: versionToken,
}

const rolePermissionSource = {
  id: 501,
  tenant_id: 1,
  tenant_code: 'PLATFORM',
  role_code: 'dispatch_manager',
  role_name: '调度经理',
  role_type: 'CUSTOM',
}

type PermissionResourceFixture = typeof resource & {
  is_direct: boolean
  is_inherited: boolean
  is_navigation_only: boolean
  source_roles: (typeof rolePermissionSource)[]
}

interface PermissionTreeFixtureNode {
  resource: PermissionResourceFixture
  children: PermissionTreeFixtureNode[]
}

function permissionNode(
  overrides: Partial<PermissionResourceFixture>,
  children: PermissionTreeFixtureNode[] = [],
): PermissionTreeFixtureNode {
  return {
    resource: {
      ...resource,
      ...overrides,
      children: [],
      is_direct: false,
      is_inherited: false,
      is_navigation_only: false,
      source_roles: [],
    },
    children,
  }
}

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({ contentType: 'application/json', body: apiSuccess(data) })
}

async function mockRoleMenuFunctions(page: Page, permissionCodes: string[]) {
  await page.unroute('**/api/iam-admin/Permission/CurrentFunctions')
  await page.route('**/api/iam-admin/Permission/CurrentFunctions', async (route) => {
    const request = route.request().postDataJSON() as { menu_id: number }
    await fulfill(route, {
      menu: { id: request.menu_id },
      functions: permissionCodes.map((permissionCode, index) => ({
        id: request.menu_id * 100 + index + 1,
        parent_id: request.menu_id,
        resource_type: 'function',
        permission_code: permissionCode,
        is_currently_effective: true,
        status: 'ACTIVE',
      })),
      permission_codes: permissionCodes,
    })
  })
}

async function mockAccessControlReadApis(page: Page) {
  await page.route('**/api/iam-admin/AuthorizationCatalog/QuerySystems', (route) =>
    fulfill(route, [system]),
  )
  await page.route('**/api/iam-admin/AuthorizationCatalog/QueryResources', (route) =>
    fulfill(route, [resource]),
  )
  await page.route('**/api/iam-admin/RolePermission/QueryRoles', (route) =>
    fulfill(route, { total: roles.length, page_index: 1, page_size: 10, items: roles }),
  )
  await page.route('**/api/iam-admin/RolePermission/QueryFunctionPermissions', (route) =>
    fulfill(route, {
      subject: rolePermissionSubject,
      roles: [rolePermissionSource],
      direct_resource_ids: [],
      effective_resource_ids: [],
      resource_tree: [
        {
          resource: {
            ...resource,
            is_direct: false,
            is_inherited: false,
            is_navigation_only: false,
            source_roles: [rolePermissionSource],
          },
          children: [],
        },
      ],
    }),
  )
  await page.route('**/api/iam-admin/RolePermission/QueryDataDomains', (route) =>
    fulfill(route, {
      domains: [
        {
          id: 801,
          app_id: 2,
          app_code: 'TMS',
          domain_code: 'shipment',
          domain_name: '运输任务',
          supported_scopes: ['SELF', 'ORG', 'ORG_AND_CHILDREN', 'TENANT', 'CUSTOM'],
          self_definition: '本人负责的运输任务。',
          status: 'ACTIVE',
          linked_resource_ids: [201],
          is_configuration_valid: true,
          invalid_reason: '',
        },
      ],
      invalid_resources: [],
    }),
  )
  await page.route('**/api/iam-admin/RolePermission/QueryDataPermissions', (route) =>
    fulfill(route, {
      role_id: 501,
      role_version: versionToken,
      domains: [
        {
          domain_code: 'shipment',
          domain_name: '运输任务',
          is_configured: true,
          scope_mode: 'SELF',
          target_tenant_ids: [],
          is_currently_effective: true,
          invalid_reason: '',
          version: versionToken,
        },
      ],
    }),
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
      ['/iam/roles?view=function-permissions&roleId=501&tenantId=1', '角色功能权限'],
      ['/iam/roles?view=data-permissions&roleId=501&tenantId=1', '角色数据权限'],
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

  test('opens role Function permissions from the list, detail drawer, and edit drawer', async ({
    page,
  }) => {
    let assignmentQueryCount = 0
    page.on('request', (request) => {
      if (request.url().endsWith('/api/iam-admin/MemberRole/Query')) assignmentQueryCount += 1
    })

    const expectFunctionPermissionPage = async () => {
      await expect(page).toHaveURL(/\/iam\/roles\/function-permissions\?roleId=501&tenantId=1$/)
      await expect(page.getByRole('heading', { level: 1, name: '角色功能权限' })).toBeVisible()
    }

    await test.step('list action', async () => {
      await page.goto('/iam/roles')
      const rowActions = page.getByRole('group', { name: '调度经理 的操作' })
      await rowActions.getByRole('button', { name: '功能权限', exact: true }).click()
      await expectFunctionPermissionPage()
    })

    await test.step('detail drawer action', async () => {
      await page.goto('/iam/roles')
      await page.getByRole('button', { name: '详情', exact: true }).first().click()
      const drawer = page.getByRole('dialog', { name: '调度经理 · 角色详情' })
      await drawer.getByRole('button', { name: '查看/配置功能权限', exact: true }).click()
      await expectFunctionPermissionPage()
    })

    await test.step('edit drawer action', async () => {
      await page.goto('/iam/roles')
      await page.getByRole('button', { name: '编辑', exact: true }).first().click()
      const drawer = page.getByRole('dialog', { name: '编辑 调度经理' })
      await drawer.getByRole('button', { name: '查看/配置功能权限', exact: true }).click()
      await expectFunctionPermissionPage()
    })

    expect(assignmentQueryCount).toBe(0)
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

  test('saves function permissions with the server role version', async ({ page }) => {
    let saveBody: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/RolePermission/SaveFunctionPermissions', async (route) => {
      saveBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, {
        subject: { ...rolePermissionSubject, version: nextVersionToken },
        roles: [rolePermissionSource],
        direct_resource_ids: [201],
        effective_resource_ids: [201],
        resource_tree: [
          {
            resource: {
              ...resource,
              is_direct: true,
              is_inherited: false,
              is_navigation_only: false,
              source_roles: [rolePermissionSource],
            },
            children: [],
          },
        ],
      })
    })

    await page.goto('/iam/roles?view=function-permissions&roleId=501&tenantId=1')
    const permissionPanel = page.locator('[data-function-permission-panel]')
    await expect(permissionPanel).toHaveAttribute('data-subject-type', 'role')
    await expect(permissionPanel).toHaveAttribute('data-can-edit', 'true')
    const node = page.locator('.el-tree-node__content').filter({ hasText: '运输调度' })
    await node.locator('.el-checkbox__inner').click()
    await page.getByRole('button', { name: '保存功能权限' }).click()
    await page.getByRole('button', { name: '确认保存权限' }).click()

    await expect.poll(() => saveBody?.role_version).toBe(versionToken)
    expect(saveBody).toEqual({
      role_id: 501,
      role_version: versionToken,
      direct_resource_ids: [201],
    })
  })

  test('treats a parent checkbox as an explicit bulk selection while keeping children editable', async ({
    page,
  }) => {
    const permissionTree = [
      permissionNode({ id: 201, resource_name: '运输调度', resource_type: 'module' }, [
        permissionNode(
          {
            id: 202,
            parent_id: 201,
            resource_code: 'TMS.ORDERS',
            resource_name: '运输订单',
            resource_type: 'menu',
          },
          [
            permissionNode(
              {
                id: 203,
                parent_id: 202,
                resource_code: 'TMS.ORDERS.PAGE',
                resource_name: '订单列表页',
                resource_type: 'page',
              },
              [
                permissionNode({
                  id: 204,
                  parent_id: 203,
                  resource_code: 'TMS.ORDERS.VIEW',
                  resource_name: '查看订单、运输全程轨迹、签收凭证、费用明细与异常处置完整详情',
                  resource_type: 'function',
                  permission_code: 'tms:orders:view',
                  is_direct: true,
                }),
                permissionNode({
                  id: 205,
                  parent_id: 203,
                  resource_code: 'TMS.ORDERS.DELETE',
                  resource_name: '删除订单',
                  resource_type: 'function',
                  permission_code: 'tms:orders:delete',
                }),
              ],
            ),
          ],
        ),
      ]),
    ]
    let saveBody: Record<string, unknown> | undefined

    await page.unroute('**/api/iam-admin/RolePermission/QueryFunctionPermissions')
    await page.route('**/api/iam-admin/RolePermission/QueryFunctionPermissions', (route) =>
      fulfill(route, {
        subject: rolePermissionSubject,
        roles: [rolePermissionSource],
        direct_resource_ids: [204],
        effective_resource_ids: [201, 202, 203, 204, 205],
        resource_tree: permissionTree,
      }),
    )
    await page.route('**/api/iam-admin/RolePermission/SaveFunctionPermissions', async (route) => {
      saveBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, {
        subject: { ...rolePermissionSubject, version: nextVersionToken },
        roles: [rolePermissionSource],
        direct_resource_ids: saveBody.direct_resource_ids,
        effective_resource_ids: saveBody.direct_resource_ids,
        resource_tree: permissionTree,
      })
    })

    await page.goto('/iam/roles/function-permissions?roleId=501&tenantId=1')
    const treeContents = page.locator('.permission-tree .el-tree-node__content')
    const moduleNode = treeContents.filter({ hasText: '运输调度' }).first()
    const viewNode = treeContents.filter({ hasText: '查看订单' }).first()
    const deleteNode = treeContents.filter({ hasText: '删除订单' }).first()

    await expect(viewNode.getByText('TMS.ORDERS.VIEW', { exact: true })).toHaveCount(0)
    await expect(viewNode.locator('.permission-node > *')).toHaveCount(1)
    await expect(
      page.locator('[data-function-permission-panel]').getByText('精确授权', { exact: true }),
    ).toHaveCount(0)
    await expect(viewNode.locator('.el-checkbox')).toHaveClass(/is-checked/)
    await expect(moduleNode.locator('.el-checkbox')).not.toHaveClass(/is-checked/)
    await moduleNode.locator('.el-checkbox__inner').click()
    await expect(moduleNode.locator('.el-checkbox')).toHaveClass(/is-checked/)
    await expect(deleteNode.locator('.el-checkbox')).toHaveClass(/is-checked/)

    await deleteNode.locator('.el-checkbox__inner').click()
    await expect(deleteNode.locator('.el-checkbox')).not.toHaveClass(/is-checked/)
    await expect(moduleNode.locator('.el-checkbox')).toHaveClass(/is-checked/)

    await page.getByRole('button', { name: '保存功能权限' }).click()
    await page.getByRole('button', { name: '确认保存权限' }).click()
    await expect.poll(() => saveBody?.direct_resource_ids).toEqual([201, 202, 203, 204])
  })

  test('keeps expansion and scroll context stable when a checkbox changes', async ({ page }) => {
    const branchA = permissionNode(
      {
        id: 202,
        parent_id: 201,
        resource_code: 'TMS.BRANCH_A',
        resource_name: '订单权限 A',
        resource_type: 'menu',
      },
      Array.from({ length: 12 }, (_, index) =>
        permissionNode({
          id: 300 + index,
          parent_id: 202,
          resource_code: `TMS.BRANCH_A.F${index + 1}`,
          resource_name: `A 功能 ${index + 1}`,
          resource_type: 'function',
          permission_code: `tms:branch-a:f${index + 1}`,
        }),
      ),
    )
    const branchB = permissionNode(
      {
        id: 203,
        parent_id: 201,
        resource_code: 'TMS.BRANCH_B',
        resource_name: '订单权限 B',
        resource_type: 'menu',
      },
      Array.from({ length: 60 }, (_, index) =>
        permissionNode({
          id: 400 + index,
          parent_id: 203,
          resource_code: `TMS.BRANCH_B.F${index + 1}`,
          resource_name: `B 功能 ${index + 1}`,
          resource_type: 'function',
          permission_code: `tms:branch-b:f${index + 1}`,
        }),
      ),
    )
    await page.unroute('**/api/iam-admin/RolePermission/QueryFunctionPermissions')
    await page.route('**/api/iam-admin/RolePermission/QueryFunctionPermissions', (route) =>
      fulfill(route, {
        subject: rolePermissionSubject,
        roles: [rolePermissionSource],
        direct_resource_ids: [],
        effective_resource_ids: [],
        resource_tree: [
          permissionNode({ id: 201, resource_name: '运输调度', resource_type: 'module' }, [
            branchA,
            branchB,
          ]),
        ],
      }),
    )

    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('/iam/roles/function-permissions?roleId=501&tenantId=1')
    const tree = page.locator('.permission-tree-scroll')
    await page.getByRole('button', { name: '收起全部' }).click()
    await expect(page.locator('.permission-tree .el-tree-node.is-expanded')).toHaveCount(0)
    await page.getByRole('button', { name: '展开全部' }).click()
    await expect
      .poll(() => page.locator('.permission-tree .el-tree-node.is-expanded').count())
      .toBeGreaterThan(2)

    const branchAContent = page
      .locator('.permission-tree .el-tree-node__content')
      .filter({ hasText: '订单权限 A' })
      .first()
    const branchANode = branchAContent.locator('..')
    await branchAContent.locator('.el-tree-node__expand-icon').click()
    await expect(branchANode).toHaveAttribute('aria-expanded', 'false')

    const lastNode = page
      .locator('.permission-tree .el-tree-node__content')
      .filter({ hasText: 'B 功能 60' })
      .first()
    await lastNode.scrollIntoViewIfNeeded()
    const scrollTopBefore = await tree.evaluate((element) => element.scrollTop)
    expect(scrollTopBefore).toBeGreaterThan(0)
    await lastNode.locator('.el-checkbox__inner').click()

    await expect(branchANode).toHaveAttribute('aria-expanded', 'false')
    await expect.poll(() => tree.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  })

  test('keeps the role Function workspace read-only without the save permission code', async ({
    page,
  }) => {
    await mockRoleMenuFunctions(page, ['iam:roles:function-permissions:view'])

    await page.goto('/iam/roles/function-permissions?roleId=501&tenantId=1')
    await expect(page).toHaveURL(/\/iam\/roles\/function-permissions\?roleId=501&tenantId=1$/)
    const permissionPanel = page.locator('[data-function-permission-panel]')
    await expect(permissionPanel).toHaveAttribute('data-subject-type', 'role')
    await expect(permissionPanel).toHaveAttribute('data-can-edit', 'false')
    await expect(page.getByRole('button', { name: '保存功能权限' })).toHaveCount(0)
    await expect(permissionPanel.locator('.el-checkbox:not(.is-disabled)')).toHaveCount(0)
  })

  test('hides Function permission entries and rejects the direct route without view permission', async ({
    page,
  }) => {
    await mockRoleMenuFunctions(page, [
      'iam:roles:view',
      'iam:roles:update',
      'iam:roles:function-permissions:update',
    ])

    await page.goto('/iam/roles')
    const rowActions = page.getByRole('group', { name: '调度经理 的操作' })
    await expect(rowActions.getByRole('button', { name: '功能权限', exact: true })).toHaveCount(0)

    await rowActions.getByRole('button', { name: '详情', exact: true }).click()
    const detailDrawer = page.getByRole('dialog', { name: '调度经理 · 角色详情' })
    await expect(
      detailDrawer.getByRole('button', { name: '查看/配置功能权限', exact: true }),
    ).toHaveCount(0)

    await page.goto('/iam/roles')
    await page.getByRole('button', { name: '编辑', exact: true }).first().click()
    const editDrawer = page.getByRole('dialog', { name: '编辑 调度经理' })
    await expect(
      editDrawer.getByRole('button', { name: '查看/配置功能权限', exact: true }),
    ).toHaveCount(0)

    await page.goto('/iam/roles/function-permissions?roleId=501&tenantId=1')
    await expect(page).toHaveURL(/\/forbidden\?from=/)
    await expect(page.getByRole('heading', { level: 1, name: '无权访问此页面' })).toBeVisible()
  })

  test('saves a data domain using the exact backend input model', async ({ page }) => {
    let saveBody: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/RolePermission/SaveDataPermission', async (route) => {
      saveBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, { role_id: 501, role_version: nextVersionToken, domains: [] })
    })

    await page.goto('/iam/roles?view=data-permissions&roleId=501&tenantId=1')
    await page.getByRole('button', { name: '配置' }).click()
    await page.locator('.el-radio').filter({ hasText: '当前 Tenant' }).click()
    await page.getByRole('button', { name: '保存数据范围' }).last().click()

    await expect.poll(() => saveBody?.domain_code).toBe('shipment')
    expect(saveBody).toEqual({
      role_id: 501,
      role_version: versionToken,
      domain_code: 'shipment',
      scope_mode: 'TENANT',
      clear: false,
      target_tenant_ids: [],
    })
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
