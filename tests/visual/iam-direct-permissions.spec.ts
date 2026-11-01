import { expect, test, type Page, type Route } from '@playwright/test'
import { useAuthenticatedSession } from './helpers/authenticatedSession'

const roleId = '9007199254740993'
const version = '63927767911469468'
const snapshot = '63927767911469999'
const resource = (id: string, name: string, type = 'menu', path = '') => ({
  id,
  app_id: '1',
  parent_id: '0',
  resource_code: 'TEST.' + id,
  resource_name: name,
  source: type === 'function' ? 'backend' : 'frontend',
  resource_type: type,
  status: 'active',
  route_path: '',
  component: '',
  icon: '',
  http_method: path ? 'POST' : '',
  api_path: path,
  function_access_mode: path ? 'read' : null,
  is_visible: true,
  sort_order: 0,
  remarks: '',
  version,
  created_at: '',
  created_by: '',
  updated_at: '',
  updated_by: '',
  app: { id: '1', app_code: 'IAM', app_name: '员工及权限管理' },
  parent: null,
})
const permission = (id: string, name: string, parent: string | null = null, auto = false) => ({
  id,
  tenant_id: '3',
  app_id: '1',
  permission_code: 'PERMISSION-' + id,
  permission_name: name,
  parent_permission_id: parent,
  default_selected_with_parent: auto,
  permission_kind: 'business',
  description: '',
  remarks: '',
  sort_order: Number(id),
  status: 'active',
  active_role_count: 1,
  frontend_resource_count: 1,
  function_resource_count: 1,
  frontend_resource: resource(id + '0', name),
  source_role_ids: [roleId],
  version,
  request_id: '',
  idempotent: false,
  created_at: '',
  created_by: '',
  updated_at: '',
  updated_by: '',
  resource_tree: [
    {
      ref_id: id + '0',
      parent_ref_id: null,
      sort_order: 0,
      status: 'active',
      remarks: '',
      resource: resource(id + '0', name + '页面'),
      children: [
        {
          ref_id: id + '1',
          parent_ref_id: id + '0',
          sort_order: 0,
          status: 'active',
          remarks: '',
          resource: resource(
            id + '1',
            '查询权限接口',
            'function',
            '/iam-admin/RolePermission/QueryDataPermissions',
          ),
          children: [],
        },
      ],
    },
  ],
})

async function success(route: Route, data: unknown) {
  await route.fulfill({ json: { is_success: true, code: 1, status: 'success', message: '', data } })
}
async function setup(page: Page, options: { readonly?: boolean; complete?: boolean } = {}) {
  await useAuthenticatedSession(page, { currentTenantId: 3 })
  const permissions = [
    permission('100', '查看角色列表'),
    permission('110', '查询角色', '100', true),
    permission('111', '查询角色统计', '110', true),
    permission('120', '编辑角色', '100'),
    permission('121', '编辑前查询', '120', true),
    { ...permission('130', '已停用权限', '100', true), status: 'inactive' },
    permission('140', '超出可授权范围', '100', true),
  ]
  let assigned = ['100', '120']
  const writes: Record<string, unknown>[] = []
  await page.route('**/api/iam-admin/CurrentPermissionResource/CurrentPageResources', (route) =>
    success(route, {
      page_resource_code: route.request().postDataJSON().page_resource_code,
      can_access: true,
      button_resource_codes: options.readonly
        ? []
        : ['IAM.ROLES.AUTHORIZATION.SAVE', 'IAM.PERMISSIONS.UPDATE'],
      button_page_resource_codes: [],
      read_function_resource_codes: [],
      authorization_version: version,
    }),
  )
  await page.route('**/api/iam-admin/PermissionApp/Query', (route) =>
    success(route, {
      apps: [{ id: '1', app_code: 'IAM', app_name: '员工及权限管理' }],
      snapshot_version: snapshot,
      scope_complete: true,
    }),
  )
  await page.route('**/api/iam-admin/RolePermission/QueryRoles', (route) =>
    success(route, {
      total: 1,
      items: [{ id: roleId, role_type: 'system', status: 'active', can_maintain: false }],
    }),
  )
  await page.route('**/api/iam-admin/PermissionScheme/Query', (route) =>
    success(route, {
      total: permissions.length,
      page_index: 1,
      page_size: 200,
      items: permissions,
    }),
  )
  await page.route('**/api/iam-admin/RolePermissionScheme/Query', (route) =>
    success(route, {
      tenant_id: '3',
      role_id: roleId,
      role_code: 'SA',
      role_name: '系统管理员',
      role_version: version,
      snapshot_version: snapshot,
      assigned_permission_ids: assigned,
      permissions: permissions.filter((item) => assigned.includes(item.id)),
      effective_resources: [],
      effective_resource_tree: [],
      request_id: '',
      idempotent: false,
    }),
  )
  await page.route('**/api/iam-admin/RolePermissionScheme/QueryEligiblePermissions', (route) =>
    success(route, {
      tenant_id: '3',
      role_id: roleId,
      role_version: version,
      snapshot_version: snapshot,
      scope_complete: options.complete !== false,
      permissions: permissions.map((item) => ({
        permission: { ...item, resource_tree: [] },
        eligible: item.id !== '140' && item.status === 'active',
        assigned: assigned.includes(item.id),
        blocking_reasons: item.id === '140' ? ['超出范围'] : [],
      })),
    }),
  )
  await page.route('**/api/iam-admin/RolePermissionScheme/Save', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    writes.push(body)
    assigned = body.permission_ids as string[]
    await success(route, {
      tenant_id: '3',
      role_id: roleId,
      role_version: version,
      snapshot_version: snapshot,
      assigned_permission_ids: assigned,
      permissions: [],
      effective_resources: [],
      effective_resource_tree: [],
      request_id: body.request_id,
    })
  })
  return { permissions, writes }
}
const checkbox = (page: Page, id: string) =>
  page
    .locator('[data-node-type="PERMISSION"]')
    .filter({
      has: page.getByRole('button', {
        name: (
          {
            '100': '查看角色列表',
            '110': '查询角色',
            '111': '查询角色统计',
            '120': '编辑角色',
            '121': '编辑前查询',
            '130': '已停用权限',
            '140': '超出可授权范围',
          } as Record<string, string>
        )[id],
        exact: true,
      }),
    })
    .getByRole('checkbox')
async function setChecked(page: Page, id: string, checked: boolean) {
  const input = checkbox(page, id)
  if ((await input.isChecked()) !== checked) await input.locator('xpath=ancestor::label[1]').click()
}
const url = '/iam/roles/authorization?roleId=' + roleId + '&tenantId=3'

test('explicit saved parent does not restore descendants; deliberate check defaults only opted-in descendants', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await setup(page)
  await page.goto(url)
  await page.getByRole('button', { name: '展开全部', exact: true }).click()
  await expect(checkbox(page, '100')).toBeChecked()
  await expect(checkbox(page, '110')).not.toBeChecked()
  await setChecked(page, '100', false)
  await expect(checkbox(page, '120')).toBeChecked()
  await setChecked(page, '100', true)
  await expect(checkbox(page, '110')).toBeChecked()
  await expect(checkbox(page, '111')).toBeChecked()
  await expect(checkbox(page, '121')).not.toBeChecked()
  await expect(checkbox(page, '130')).not.toBeChecked()
  await expect(checkbox(page, '140')).not.toBeChecked()
  await setChecked(page, '110', false)
  await expect(checkbox(page, '100')).toBeChecked()
  await expect(checkbox(page, '111')).toBeChecked()
  await expect(page.locator('[data-node-type="RESOURCE"] .el-checkbox')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('save previews final explicit Permission set and sends string Int64 IDs and both snapshots', async ({
  page,
}, testInfo) => {
  const { writes } = await setup(page)
  await page.goto(url)
  await page.getByRole('button', { name: '展开全部', exact: true }).click()
  await setChecked(page, '110', true)
  await setChecked(page, '111', false)
  await setChecked(page, '120', false)
  await page.getByRole('button', { name: '保存角色授权', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '确认保存角色授权' })
  await expect(dialog).toContainText('查询角色')
  await expect(dialog).toContainText('编辑角色')
  await dialog.getByRole('button', { name: '确认保存', exact: true }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0]).toMatchObject({
    tenant_id: '3',
    role_id: roleId,
    role_version: version,
    snapshot_version: snapshot,
    permission_ids: ['100', '110'],
  })
  expect(writes[0]).not.toHaveProperty('permission_package_ids')
  expect(writes[0]?.request_id).toBeTruthy()
  await expect(dialog).toBeHidden()
  await expect(checkbox(page, '110')).toBeChecked()
  await page.screenshot({
    path: testInfo.outputPath('direct-role-grants.png'),
    animations: 'disabled',
  })
})

test('search matches API path substring and does not mutate grants or default-select', async ({
  page,
}) => {
  await setup(page)
  await page.goto(url)
  await page.getByRole('textbox', { name: '搜索权限层级' }).fill('QueryDataPermissions')
  await expect(page.getByRole('button', { name: '查看角色列表', exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: '查询权限接口', exact: true }).first(),
  ).toBeVisible()
  await expect(checkbox(page, '110')).not.toBeChecked()
  await expect(page.getByRole('button', { name: '保存角色授权', exact: true })).toBeDisabled()
})

test('batch clear and select are independent draft actions with exact counts', async ({ page }) => {
  await setup(page)
  await page.goto(url)
  await page.getByRole('button', { name: '清空本组', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('本组清除 2 项权限')
  await page.getByRole('button', { name: '全选本组', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('本组新增 5 项权限')
})

test('incomplete candidates fail closed; SA is not a grant bypass', async ({ page }) => {
  await setup(page, { complete: false })
  await page.goto(url)
  await expect(page.getByText('权限数据加载失败', { exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox')).toHaveCount(0)
})

test('read-only exact page permission never exposes mutable Permission checkboxes', async ({
  page,
}) => {
  await setup(page, { readonly: true })
  await page.goto(url)
  await expect(page.getByText('当前账号无角色授权保存权限', { exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '保存角色授权', exact: true })).toHaveCount(0)
})

test('unknown save result preserves draft and blocks blind retries', async ({ page }) => {
  await setup(page)
  let count = 0
  await page.route('**/api/iam-admin/RolePermissionScheme/Save', async (route) => {
    count++
    await route.fulfill({
      status: 500,
      json: { is_success: false, code: 500, message: 'unknown result' },
    })
  })
  await page.goto(url)
  await page.getByRole('button', { name: '展开全部', exact: true }).click()
  await setChecked(page, '110', true)
  await page.getByRole('button', { name: '保存角色授权', exact: true }).click()
  await page
    .getByRole('dialog', { name: '确认保存角色授权' })
    .getByRole('button', { name: '确认保存' })
    .click()
  await expect(
    page.getByText('保存结果尚未确认。本地权限选择已保留，请勿再次点击保存。'),
  ).toBeVisible()
  await expect(checkbox(page, '110')).toBeChecked()
  await expect(page.getByRole('button', { name: '保存角色授权', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '使用原请求标识重试' })).toHaveCount(0)
  expect(count).toBe(1)
})

test('keyboard Space selects only the focused Permission and arrows only expand its branch', async ({
  page,
}) => {
  await setup(page)
  await page.goto(url)
  const root = page.getByRole('treeitem').first()
  await root.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('[data-node-key="permission:100"]')).toHaveAttribute(
    'data-expanded',
    'false',
  )
  await page.keyboard.press('Space')
  await expect(checkbox(page, '100')).not.toBeChecked()
  await page.keyboard.press('ArrowRight')
  await expect(checkbox(page, '120')).toBeChecked()
})

test('checking a bottom node preserves scroll and previously collapsed branches', async ({
  page,
}) => {
  const { permissions } = await setup(page)
  for (let index = 200; index < 240; index++)
    permissions.push(permission(String(index), '扩展权限 ' + index))
  await page.goto(url)
  await page.getByRole('button', { name: '展开全部', exact: true }).click()
  const collapsed = page.locator('[data-node-key="permission:120"]')
  const collapsedBranch = collapsed.locator('xpath=ancestor::*[@role="treeitem"][1]')
  await collapsedBranch.focus()
  await page.keyboard.press('ArrowLeft')
  // Measure after the collapse transition; its shrinking rows legitimately change scroll height.
  await expect(collapsedBranch.locator(':scope > [role="group"]')).toBeHidden()
  const scroller = page.locator('.permission-package-tree__scroll')
  const before = await scroller.evaluate((el) => {
    el.scrollTop = el.scrollHeight
    return el.scrollTop
  })
  expect(before).toBeGreaterThan(100)
  const last = page.locator('[data-node-key="permission:239"]')
  await last.locator('.el-checkbox').click()
  expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(before - 48)
  await expect(collapsed).toHaveAttribute('data-expanded', 'false')
  await expect(last.getByRole('checkbox')).toBeChecked()
})
