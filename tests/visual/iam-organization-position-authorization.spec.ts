import { expect, test, type Page, type Route } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

function success(data: unknown) {
  return JSON.stringify({ status: 'success', code: 1, message: '', data })
}

function pageResult(items: unknown[]) {
  return success({ total: items.length, page_index: 1, page_size: 1000, items })
}

async function useDelegatedFunctionSession(page: Page) {
  await useAuthenticatedSession(page, {
    tenantAdminIdentity: false,
    excludedMenuPaths: [
      '/iam/group',
      '/iam/application-resources',
      '/iam/tenants',
      '/iam/members',
      '/iam/roles',
    ],
  })
}

async function captureMutation(
  page: Page,
  endpoint: string,
  assign: (body: Record<string, unknown>) => void,
) {
  await page.route(`**/api/iam-admin/${endpoint}`, async (route: Route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    assign(body)
    await route.fulfill({ contentType: 'application/json', body: success({}) })
  })
}

test('non-admin member with organization Functions can complete the ordinary management chain', async ({
  page,
}) => {
  await useDelegatedFunctionSession(page)
  const queries: Record<string, unknown>[] = []
  let candidateQuery: Record<string, unknown> | undefined
  let created: Record<string, unknown> | undefined
  let updated: Record<string, unknown> | undefined
  let moved: Record<string, unknown> | undefined
  let statusChanged: Record<string, unknown> | undefined

  await page.route('**/api/iam-admin/Organization/Query', async (route) => {
    queries.push(route.request().postDataJSON() as Record<string, unknown>)
    await route.fulfill({
      contentType: 'application/json',
      body: pageResult([
        {
          id: 501,
          tenant_id: 1,
          parent_id: 0,
          org_code: 'DELEGATED-ORG',
          org_name: '委派组织',
          org_type: '职能部门',
          leader_tenant_user_id: 0,
          leader_display_name: '',
          status: 'ACTIVE',
          active_member_count: 0,
          sort_order: 1,
          remarks: '非管理员 Function 授权测试',
          version: '8',
          children: [],
        },
      ]),
    })
  })
  await page.route('**/api/iam-admin/Organization/QueryLeaderCandidates', async (route) => {
    candidateQuery = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({
      contentType: 'application/json',
      body: success({
        total: 1,
        page_index: 1,
        page_size: 20,
        items: [
          {
            tenant_user_id: 701,
            user_id: 1701,
            user_name: 'delegated.user',
            real_name: '授权用户',
            display_name: '授权用户',
          },
        ],
      }),
    })
  })
  await captureMutation(page, 'Organization/Create', (body) => (created = body))
  await captureMutation(page, 'Organization/Update', (body) => (updated = body))
  await captureMutation(page, 'Organization/Move', (body) => (moved = body))
  await captureMutation(page, 'Organization/ChangeStatus', (body) => (statusChanged = body))

  await page.goto('/iam/organizations')
  await expect(page.getByRole('heading', { name: '委派组织', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '创建顶级组织', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '编辑组织', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '调整层级', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '停用', exact: true })).toBeVisible()
  await expect(page.getByText('Tenant 管理', { exact: true })).toHaveCount(0)
  expect(queries.every((query) => query.tenant_id === 1)).toBe(true)

  await page.getByRole('button', { name: '创建顶级组织', exact: true }).click()
  const createDrawer = page.getByRole('dialog', { name: '新建组织', exact: true })
  await createDrawer.getByLabel('组织名称', { exact: true }).fill('Function 创建组织')
  const leader = createDrawer.getByRole('combobox', { name: '组织负责人', exact: true })
  await leader.click()
  await page.getByRole('option', { name: '授权用户 delegated.user', exact: true }).click()
  await createDrawer.getByRole('button', { name: '创建组织', exact: true }).click()
  await expect.poll(() => created?.org_name).toBe('Function 创建组织')
  expect(candidateQuery).toMatchObject({ tenant_id: 1, page_index: 1, page_size: 20 })
  expect(created).toMatchObject({ tenant_id: 1, leader_tenant_user_id: 701 })

  await page.getByRole('button', { name: '编辑组织', exact: true }).click()
  const editDrawer = page.getByRole('dialog', { name: '编辑 委派组织', exact: true })
  await editDrawer.getByLabel('组织名称', { exact: true }).fill('Function 编辑组织')
  await editDrawer.getByRole('button', { name: '保存组织', exact: true }).click()
  await expect.poll(() => updated?.org_name).toBe('Function 编辑组织')
  expect(updated).toMatchObject({ tenant_id: 1, id: 501, version: '8' })

  await page.getByRole('button', { name: '调整层级', exact: true }).click()
  const moveDrawer = page.getByRole('dialog', { name: '调整组织层级', exact: true })
  await moveDrawer.getByRole('button', { name: '确认移动', exact: true }).click()
  await expect.poll(() => moved?.id).toBe(501)
  expect(moved).toEqual({ id: 501, version: '8' })

  await page.getByRole('button', { name: '停用', exact: true }).click()
  const statusDialog = page.getByRole('dialog', { name: '停用组织', exact: true })
  await statusDialog.getByRole('button', { name: '确认停用', exact: true }).click()
  await expect.poll(() => statusChanged?.target_status).toBe('DISABLED')
  expect(statusChanged).toEqual({ id: 501, version: '8', target_status: 'DISABLED' })
})

test('non-admin member with position Functions can query details and maintain positions', async ({
  page,
}) => {
  await useDelegatedFunctionSession(page)
  const queries: Record<string, unknown>[] = []
  let created: Record<string, unknown> | undefined
  let updated: Record<string, unknown> | undefined
  let statusChanged: Record<string, unknown> | undefined

  await page.route('**/api/iam-admin/Position/Query', async (route) => {
    queries.push(route.request().postDataJSON() as Record<string, unknown>)
    await route.fulfill({
      contentType: 'application/json',
      body: pageResult([
        {
          id: 601,
          tenant_id: 1,
          position_code: 'DELEGATED-POSITION',
          position_name: '委派岗位',
          position_type: '业务岗位',
          status: 'ACTIVE',
          active_member_count: 0,
          sort_order: 1,
          remarks: '非管理员 Function 授权测试',
          version: '6',
          updated_at: '2026-09-20T10:00:00',
        },
      ]),
    })
  })
  await captureMutation(page, 'Position/Create', (body) => (created = body))
  await captureMutation(page, 'Position/Update', (body) => (updated = body))
  await captureMutation(page, 'Position/ChangeStatus', (body) => (statusChanged = body))

  await page.goto('/iam/positions')
  await expect(page.getByRole('heading', { name: '岗位管理', exact: true })).toBeVisible()
  await expect(page.getByText('委派岗位', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '新建岗位', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '编辑', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '停用', exact: true })).toBeVisible()
  await expect(page.getByText('集团信息', { exact: true })).toHaveCount(0)
  expect(queries.every((query) => query.tenant_id === 1)).toBe(true)

  await page.getByRole('button', { name: '详情', exact: true }).click()
  const detail = page.getByRole('dialog', { name: '委派岗位 · 岗位详情', exact: true })
  await expect(detail).toContainText('非管理员 Function 授权测试')
  await detail.getByRole('button', { name: '关闭此对话框', exact: true }).click()

  await page.getByRole('button', { name: '新建岗位', exact: true }).click()
  const createDrawer = page.getByRole('dialog', { name: '新建岗位', exact: true })
  await createDrawer.getByLabel('岗位名称', { exact: true }).fill('Function 创建岗位')
  await createDrawer.getByRole('button', { name: '创建岗位', exact: true }).click()
  await expect.poll(() => created?.position_name).toBe('Function 创建岗位')
  expect(created).toMatchObject({ tenant_id: 1 })

  await page.getByRole('button', { name: '编辑', exact: true }).click()
  const editDrawer = page.getByRole('dialog', { name: '编辑 委派岗位', exact: true })
  await editDrawer.getByLabel('岗位名称', { exact: true }).fill('Function 编辑岗位')
  await editDrawer.getByRole('button', { name: '保存岗位', exact: true }).click()
  await expect.poll(() => updated?.position_name).toBe('Function 编辑岗位')
  expect(updated).toMatchObject({ tenant_id: 1, id: 601, version: '6' })

  await page.getByRole('button', { name: '停用', exact: true }).click()
  const statusDialog = page.getByRole('dialog', { name: '停用岗位', exact: true })
  await statusDialog.getByRole('button', { name: '确认停用', exact: true }).click()
  await expect.poll(() => statusChanged?.target_status).toBe('DISABLED')
  expect(statusChanged).toEqual({ id: 601, version: '6', target_status: 'DISABLED' })
})
