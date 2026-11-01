import { expect, test, type Page, type Route } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

function apiSuccess(data: unknown): string {
  return JSON.stringify({ status: 'success', code: 1, message: '', data })
}

const versionToken = '63924670932147368'
const nextVersionToken = '63924670932147369'

const childFunctionResource = {
  id: 212,
  app_id: 2,
  parent_id: 210,
  resource_code: 'TMS.ORDERS.READ.DETAIL',
  resource_name: '查看订单详情',
  resource_type: 'FUNCTION',
  route_path: '',
  component: '',
  permission_code: 'tms.order.read-detail',
  icon: 'mdi:file-eye-outline',
  http_method: 'POST',
  api_path: '/tms-admin/Order/Detail',
  is_visible: false,
  sort_order: 10,
  status: 'ACTIVE',
  remarks: '订单详情权限',
  is_currently_effective: true,
  invalid_reason: '',
  can_maintain: true,
  version: '63924670932147364',
  created_at: '2026-09-01T08:00:00Z',
  created_by: 'platform-admin',
  updated_at: '2026-09-08T08:00:00Z',
  updated_by: 'platform-admin',
  functions: [],
}

const functionResource = {
  id: 211,
  app_id: 2,
  parent_id: 210,
  resource_code: 'TMS.ORDERS.READ',
  resource_name: '查询订单',
  resource_type: 'FUNCTION',
  route_path: '',
  component: '',
  permission_code: 'tms.order.read',
  icon: 'mdi:magnify',
  http_method: 'POST',
  api_path: '/tms-admin/Order/Query',
  is_visible: false,
  sort_order: 10,
  status: 'ACTIVE',
  remarks: '订单查询权限',
  is_currently_effective: true,
  invalid_reason: '',
  can_maintain: true,
  version: versionToken,
  created_at: '2026-09-01T08:00:00Z',
  created_by: 'platform-admin',
  updated_at: '2026-09-08T08:00:00Z',
  updated_by: 'platform-admin',
  functions: [],
}

const menuResource = {
  id: 210,
  app_id: 2,
  parent_id: 200,
  resource_code: 'TMS.ORDERS',
  resource_name: '运输订单',
  resource_type: 'MENU',
  route_path: '/tms/orders',
  component: 'tms/orders/pages/OrderListPage',
  permission_code: 'tms.order.read',
  icon: 'mdi:clipboard-text-outline',
  http_method: '',
  api_path: '',
  is_visible: true,
  sort_order: 10,
  status: 'ACTIVE',
  remarks: '订单菜单',
  is_currently_effective: true,
  invalid_reason: '',
  can_maintain: true,
  version: versionToken,
  created_at: '2026-09-01T08:00:00Z',
  created_by: 'platform-admin',
  updated_at: '2026-09-08T08:00:00Z',
  updated_by: 'platform-admin',
  functions: [functionResource, childFunctionResource],
}

const moduleResource = {
  id: 200,
  app_id: 2,
  parent_id: 0,
  resource_code: 'TMS',
  resource_name: '运输管理',
  resource_type: 'MODULE',
  route_path: '',
  component: '',
  permission_code: '',
  icon: 'mdi:truck-fast-outline',
  http_method: '',
  api_path: '',
  is_visible: false,
  sort_order: 10,
  status: 'ACTIVE',
  remarks: '默认 Module',
  is_currently_effective: true,
  invalid_reason: '',
  can_maintain: true,
  version: '63924670932147366',
  created_at: '2026-09-01T08:00:00Z',
  created_by: 'platform-admin',
  updated_at: '2026-09-08T08:00:00Z',
  updated_by: 'platform-admin',
  menus: [menuResource],
}

const application = {
  id: 2,
  app_code: 'TMS',
  app_name: '运输管理',
  description: '订单、调度与运输任务。',
  icon: 'mdi:truck-fast-outline',
  route_prefix: '/tms',
  status: 'ACTIVE',
  remarks: '运输管理应用',
  can_maintain: true,
  version: versionToken,
  created_at: '2026-09-01T08:00:00Z',
  created_by: 'platform-admin',
  updated_at: '2026-09-08T08:00:00Z',
  updated_by: 'platform-admin',
  modules: [moduleResource],
}

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({ contentType: 'application/json', body: apiSuccess(data) })
}

async function mockCatalog(page: Page, applications = [application]) {
  await page.route('**/api/iam-admin/Permission/SystemResources', (route) =>
    fulfill(route, { apps: applications }),
  )
}

function catalogWithFunctionVersion(token: string) {
  return [
    {
      ...application,
      modules: application.modules.map((module) => ({
        ...module,
        menus: module.menus.map((menu) => ({
          ...menu,
          functions: menu.functions.map((resource) =>
            resource.id === functionResource.id ? { ...resource, version: token } : resource,
          ),
        })),
      })),
    },
  ]
}

async function openPage(page: Page) {
  await page.goto('/iam/application-resources')
  await expect(page.getByRole('heading', { level: 1, name: '应用与权限资源' })).toBeVisible()
  await expect(page.getByRole('treeitem', { name: /查询订单 Function/ })).toBeVisible()
  await expect(page.getByRole('treeitem', { name: /查看订单详情 Function/ })).toBeVisible()
}

test.describe('IAM application resources production binding', () => {
  test.beforeEach(async ({ page }) => {
    await useAuthenticatedSession(page)
    await mockCatalog(page)
  })

  test('loads the complete catalog once through the shared authenticated client', async ({
    page,
  }) => {
    const requests: Array<{ body: unknown; authorization: string }> = []
    page.on('request', (request) => {
      if (!request.url().includes('/Permission/SystemResources')) return
      requests.push({
        body: request.postDataJSON(),
        authorization: request.headers().authorization ?? '',
      })
    })

    await openPage(page)

    expect(requests).toEqual([{ body: {}, authorization: 'Bearer visual-test-access-token' }])
    await expect(page.getByText('Module → Menu → Page / Function')).toBeVisible()
  })

  test('selects a parent node by its name and reserves expansion for the arrow', async ({
    page,
  }) => {
    await openPage(page)

    const nodeLabel = page.getByText('运输订单', { exact: true })
    const treeItem = nodeLabel.locator('xpath=ancestor::div[@role="treeitem"][1]')
    const expandArrow = treeItem.locator(
      ':scope > .el-tree-node__content > .el-tree-node__expand-icon',
    )
    const childNode = page.getByRole('treeitem', { name: /查询订单 Function/ })

    await expect(treeItem).toHaveAttribute('aria-expanded', 'true')
    await nodeLabel.click()
    await expect(page.getByRole('heading', { level: 2, name: '运输订单' })).toBeVisible()
    await expect(treeItem).toHaveAttribute('aria-expanded', 'true')
    await expect(childNode).toBeVisible()

    await expandArrow.click()
    await expect(treeItem).toHaveAttribute('aria-expanded', 'false')
    await expect(childNode).toBeHidden()
  })

  test('caps a large workspace and keeps its sibling panels visible while the tree scrolls', async ({
    page,
  }) => {
    const extraFunctions = Array.from({ length: 120 }, (_, index) => ({
      ...childFunctionResource,
      id: 300 + index,
      parent_id: menuResource.id,
      resource_code: `TMS.ORDERS.EXTRA_${index + 1}`,
      resource_name: `扩展订单权限 ${index + 1}`,
      permission_code: `tms.order.extra-${index + 1}`,
      sort_order: 20 + index,
    }))
    const largeApplication = {
      ...application,
      modules: [
        {
          ...moduleResource,
          menus: [
            {
              ...menuResource,
              functions: [functionResource, childFunctionResource, ...extraFunctions],
            },
          ],
        },
      ],
    }

    await page.unroute('**/api/iam-admin/Permission/SystemResources')
    await mockCatalog(page, [largeApplication])
    await openPage(page)

    const appPage = page.locator('[data-app-page]')
    const resourceTree = page.locator('.resource-tree')
    const workspace = page.locator('.application-resources-workspace')
    const applicationPanelTitle = page.getByRole('heading', { level: 2, name: 'App' })
    const inspectorTitle = page.getByRole('heading', { level: 2, name: '运输管理' })
    const lastResource = page.getByRole('treeitem', { name: /扩展订单权限 120 Function/ })
    const measurements = await page.evaluate(() => {
      const pageElement = document.querySelector<HTMLElement>('[data-app-page]')
      const workspaceElement = document.querySelector<HTMLElement>(
        '.application-resources-workspace',
      )
      const treeElement = document.querySelector<HTMLElement>('.resource-tree')
      if (!pageElement || !workspaceElement || !treeElement) return null
      return {
        pageClientHeight: pageElement.clientHeight,
        pageScrollHeight: pageElement.scrollHeight,
        workspaceClientHeight: workspaceElement.clientHeight,
        treeClientHeight: treeElement.clientHeight,
        treeScrollHeight: treeElement.scrollHeight,
      }
    })

    expect(measurements).not.toBeNull()
    expect(measurements!.pageScrollHeight).toBeGreaterThan(measurements!.pageClientHeight)
    expect(measurements!.workspaceClientHeight).toBeLessThanOrEqual(
      measurements!.pageClientHeight * 2 + 1,
    )
    expect(measurements!.treeScrollHeight).toBeGreaterThan(measurements!.treeClientHeight)

    await lastResource.scrollIntoViewIfNeeded()
    await expect(lastResource).toBeInViewport()
    await expect(applicationPanelTitle).toBeInViewport()
    await expect(inspectorTitle).toBeInViewport()
    await expect(appPage).toBeVisible()
    await expect(workspace).toBeVisible()
    await expect(resourceTree).toBeVisible()
  })

  test('keeps Function as a leaf and allows Page or Function below Menu', async ({ page }) => {
    await openPage(page)
    await page
      .locator('.resource-tree .el-tree-node__content')
      .filter({ hasText: '查询订单' })
      .click()

    await expect(
      page.locator('.resource-inspector__actions').getByRole('button', { name: /^新增/u }),
    ).toHaveCount(0)

    await page
      .locator('.resource-tree .el-tree-node__content')
      .filter({ hasText: '运输订单' })
      .click()
    const addChild = page.getByRole('button', { name: '新增 Page / Function' })
    await expect(addChild).toBeVisible()
    await addChild.click()
    const drawer = page.locator('.el-drawer')
    await expect(drawer.getByRole('heading', { name: '新增 Page' })).toBeVisible()
    await expect(drawer.getByRole('combobox', { name: '资源类型' })).toBeEnabled()
  })

  test('submits every backend App create and update field', async ({ page }) => {
    let createBody: Record<string, unknown> | undefined
    let updateBody: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/AuthorizationCatalog/CreateSystem', async (route) => {
      createBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, {
        ...application,
        ...createBody,
        id: 3,
        app_code: 'APP-000003',
        version: nextVersionToken,
      })
    })
    await page.route('**/api/iam-admin/AuthorizationCatalog/UpdateSystem', async (route) => {
      updateBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, { ...application, ...updateBody })
    })

    await openPage(page)
    await page.getByRole('button', { name: '新增 App' }).click()
    const createDrawer = page.locator('.el-drawer')
    await expect(createDrawer.getByLabel('App 编码')).toHaveCount(0)
    await createDrawer.getByLabel('App 名称').fill('仓储管理')
    await createDrawer.getByLabel('路由前缀').fill('/wms')
    await createDrawer.getByLabel('图标').fill('mdi:warehouse')
    await createDrawer.getByLabel('说明').fill('仓库与库存管理')
    await createDrawer.getByLabel('备注').fill('生产创建测试')
    await createDrawer.getByRole('button', { name: '创建 App' }).click()

    expect(createBody).toEqual({
      app_name: '仓储管理',
      description: '仓库与库存管理',
      icon: 'mdi:warehouse',
      route_prefix: '/wms',
      status: 'ACTIVE',
      remarks: '生产创建测试',
    })

    await page.getByRole('button', { name: /运输管理.*TMS/ }).click()
    await page.getByRole('button', { name: '编辑 App' }).click()
    const editDrawer = page.locator('.el-drawer')
    await editDrawer.getByLabel('App 名称').fill('运输管理中心')
    await editDrawer.getByLabel('说明').fill('运输全流程管理')
    await editDrawer.getByLabel('备注').fill('生产编辑测试')
    await editDrawer.getByRole('button', { name: '保存修改' }).click()

    await expect.poll(() => updateBody?.app_name).toBe('运输管理中心')
    expect(Object.keys(updateBody ?? {}).sort()).toEqual(
      [
        'id',
        'version',
        'app_name',
        'description',
        'icon',
        'route_prefix',
        'remarks',
      ].sort(),
    )
    expect(updateBody).toMatchObject({ id: 2, version: versionToken })
    expect(updateBody).not.toHaveProperty('app_code')
  })

  test('submits every backend resource create and update field', async ({ page }) => {
    let createBody: Record<string, unknown> | undefined
    let updateBody: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/AuthorizationCatalog/CreateResource', async (route) => {
      createBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, {
        ...menuResource,
        ...createBody,
        id: 220,
        resource_code: 'TMS.MENU.000220',
        version: nextVersionToken,
        children: [],
      })
    })
    await page.route('**/api/iam-admin/AuthorizationCatalog/UpdateResource', async (route) => {
      updateBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, { ...menuResource, ...updateBody, children: [] })
    })

    await openPage(page)
    await page
      .locator('.resource-tree .el-tree-node__content')
      .filter({ hasText: '运输管理' })
      .click()
    await page.getByRole('button', { name: '新增 Menu' }).click()
    const createDrawer = page.locator('.el-drawer')
    await expect(createDrawer.getByLabel('资源编码')).toHaveCount(0)
    await createDrawer.getByLabel('资源名称').fill('运输调度')
    await createDrawer.getByLabel('图标').fill('mdi:routes')
    await createDrawer.getByLabel('路由地址').fill('/tms/dispatch')
    await createDrawer.getByLabel('页面组件').fill('tms/dispatch/pages/DispatchPage')
    await createDrawer.getByLabel('导航权限编码').fill('tms.dispatch.read')
    await createDrawer.getByLabel('备注').fill('调度菜单')
    await createDrawer.getByRole('button', { name: '创建资源' }).click()

    expect(Object.keys(createBody ?? {}).sort()).toEqual(
      [
        'app_id',
        'parent_id',
        'resource_name',
        'resource_type',
        'route_path',
        'component',
        'permission_code',
        'icon',
        'http_method',
        'api_path',
        'is_visible',
        'sort_order',
        'status',
        'remarks',
      ].sort(),
    )
    expect(createBody).toMatchObject({
      app_id: 2,
      parent_id: 200,
      resource_type: 'MENU',
      is_visible: true,
      status: 'ACTIVE',
    })

    await page
      .locator('.resource-tree .el-tree-node__content')
      .filter({ hasText: '运输订单' })
      .click()
    await page.getByRole('button', { name: '编辑', exact: true }).click()
    const editDrawer = page.locator('.el-drawer')
    await editDrawer.getByLabel('页面组件').fill('tms/orders/pages/OrdersPage')
    await editDrawer.getByLabel('备注').fill('订单菜单已更新')
    await editDrawer.getByRole('button', { name: '保存修改' }).click()

    await expect.poll(() => updateBody?.component).toBe('tms/orders/pages/OrdersPage')
    expect(Object.keys(updateBody ?? {}).sort()).toEqual(
      [
        'id',
        'version',
        'app_id',
        'parent_id',
        'resource_name',
        'resource_type',
        'route_path',
        'component',
        'permission_code',
        'icon',
        'http_method',
        'api_path',
        'is_visible',
        'sort_order',
        'remarks',
      ].sort(),
    )
    expect(updateBody).toMatchObject({ id: 210, version: versionToken, resource_type: 'MENU' })
    expect(updateBody).not.toHaveProperty('resource_code')
  })

  test('uses distinct status and delete contracts and refreshes shell permissions', async ({
    page,
  }) => {
    let statusBody: Record<string, unknown> | undefined
    let applicationStatusBody: Record<string, unknown> | undefined
    let resourceDeleteBody: Record<string, unknown> | undefined
    let applicationDeleteBody: Record<string, unknown> | undefined
    let shellRefreshes = 0
    let currentFunctionVersion = versionToken
    await page.unroute('**/api/iam-admin/Permission/SystemResources')
    await page.route('**/api/iam-admin/Permission/SystemResources', (route) =>
      fulfill(route, { apps: catalogWithFunctionVersion(currentFunctionVersion) }),
    )
    page.on('request', (request) => {
      if (request.url().includes('/Permission/CurrentAppMenus')) shellRefreshes += 1
    })
    await page.route(
      '**/api/iam-admin/AuthorizationCatalog/ChangeResourceStatus',
      async (route) => {
        statusBody = route.request().postDataJSON() as Record<string, unknown>
        currentFunctionVersion = nextVersionToken
        await fulfill(route, {
          succeeded: true,
          idempotent: false,
          version: nextVersionToken,
          message: '',
        })
      },
    )
    await page.route('**/api/iam-admin/AuthorizationCatalog/ChangeSystemStatus', async (route) => {
      applicationStatusBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, {
        succeeded: true,
        idempotent: false,
        version: nextVersionToken,
        message: '',
      })
    })
    await page.route('**/api/iam-admin/AuthorizationCatalog/DeleteResource', async (route) => {
      resourceDeleteBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, {
        id: 211,
        succeeded: true,
        idempotent: false,
        deleted_resource_count: 1,
        revoked_role_grant_count: 2,
        version: nextVersionToken,
        deleted_at: '2026-09-08T10:00:00Z',
      })
    })
    await page.route('**/api/iam-admin/AuthorizationCatalog/DeleteSystem', async (route) => {
      applicationDeleteBody = route.request().postDataJSON() as Record<string, unknown>
      await fulfill(route, {
        id: 2,
        succeeded: true,
        idempotent: false,
        deleted_resource_count: 3,
        revoked_role_grant_count: 4,
        version: nextVersionToken,
        deleted_at: '2026-09-08T10:00:00Z',
      })
    })

    await openPage(page)
    await page
      .locator('.resource-tree .el-tree-node__content')
      .filter({ hasText: '查询订单' })
      .click()
    await page.getByRole('button', { name: '停用', exact: true }).click()
    await page.getByRole('button', { name: '确认停用' }).click()
    await expect.poll(() => statusBody?.target_status).toBe('DISABLED')
    expect(statusBody).toEqual({ id: 211, version: versionToken, target_status: 'DISABLED' })

    await page.getByRole('button', { name: '删除', exact: true }).click()
    await expect(page.getByText('角色授权撤销数量由服务端完成删除后返回')).toBeVisible()
    await page.getByLabel('请输入 TMS.ORDERS.READ 确认删除').fill('TMS.ORDERS.READ')
    await page.getByRole('button', { name: '确认删除 Function' }).click()
    await expect
      .poll(() => resourceDeleteBody)
      .toEqual({
        id: 211,
        version: nextVersionToken,
        confirm_delete_descendants: true,
      })

    await page.getByRole('button', { name: /运输管理.*TMS/ }).click()
    await page.getByRole('button', { name: '停用', exact: true }).click()
    await page.getByRole('button', { name: '确认停用' }).click()
    await expect
      .poll(() => applicationStatusBody)
      .toEqual({
        id: 2,
        version: versionToken,
        target_status: 'DISABLED',
      })

    await page.getByRole('button', { name: /运输管理.*TMS/ }).click()
    await page.getByRole('button', { name: '删除 App' }).click()
    await page.getByLabel('请输入 TMS 确认删除').fill('TMS')
    await page.getByRole('button', { name: '确认删除 App' }).click()
    await expect
      .poll(() => applicationDeleteBody)
      .toEqual({
        id: 2,
        version: versionToken,
        confirm_delete_resources: true,
      })
    expect(shellRefreshes).toBeGreaterThanOrEqual(3)
  })

  test('keeps a failed form open and renders the server failure in context', async ({ page }) => {
    await page.route('**/api/iam-admin/AuthorizationCatalog/CreateSystem', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', code: 500, message: '后端写入失败', data: null }),
      }),
    )

    await openPage(page)
    await page.getByRole('button', { name: '新增 App' }).click()
    const drawer = page.getByRole('dialog', { name: '新增 App' })
    await expect(drawer.getByLabel('App 编码')).toHaveCount(0)
    await drawer.getByLabel('App 名称').fill('仓储管理')
    await drawer.getByLabel('路由前缀').fill('/wms')
    await drawer.getByRole('button', { name: '创建 App' }).click()

    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('alert').filter({ hasText: '后端写入失败' })).toBeVisible()
    await expect(drawer.getByLabel('App 名称')).toHaveValue('仓储管理')
  })

  test('shows an authorization boundary without exposing catalog data', async ({ page }) => {
    await page.route('**/api/iam-admin/Permission/SystemResources', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', code: 403, message: 'forbidden', data: null }),
      }),
    )

    await page.goto('/iam/application-resources')
    await expect(page.getByText('无权访问应用与权限资源', { exact: true })).toBeVisible()
    await expect(page.getByText('TMS.ORDERS.READ', { exact: true })).toHaveCount(0)
  })
})
