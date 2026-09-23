import { expect, test } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

function pageResult(items: unknown[]) {
  return JSON.stringify({
    status: 'success',
    code: 1,
    message: '',
    data: { total: items.length, page_index: 1, page_size: 1000, items },
  })
}

test('organization forms use session and API values without inheriting identity defaults', async ({
  page,
}) => {
  await useAuthenticatedSession(page)
  await page.route('**/api/iam-admin/Organization/Query', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: pageResult([
        {
          id: 501,
          tenant_id: 1,
          parent_id: 0,
          org_code: 'REAL-ROOT',
          org_name: '实际根组织',
          org_type: '运营中心',
          leader_display_name: '实际负责人',
          leader_tenant_user_id: 777,
          status: 'ACTIVE',
          active_member_count: 0,
          sort_order: 93,
          remarks: '接口返回的实际组织备注',
          version: '8',
          children: [
            {
              id: 502,
              tenant_id: 1,
              parent_id: 501,
              org_code: 'REAL-CHILD',
              org_name: '实际子组织',
              org_type: '职能部门',
              leader_display_name: '',
              status: 'ACTIVE',
              active_member_count: 0,
              sort_order: 94,
              remarks: '',
              version: '9',
              children: [],
            },
          ],
        },
      ]),
    }),
  )
  await page.goto('/iam/organizations')
  const account = page.getByRole('button', { name: '打开用户菜单', exact: true })
  await expect(account).toContainText('华东运营中心')
  await expect(account).not.toContainText('陆链华东运营中心')
  await expect(page.locator('.organization-context')).toHaveCount(0)
  await expect(page.getByText('共 2 个组织节点', { exact: true })).toBeVisible()
  await expect(page.getByText('接口返回的实际组织备注', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '新增下级', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '新建组织', exact: true })
  await expect(drawer.getByLabel('所属 Tenant', { exact: true })).toHaveValue('华东运营中心')
  await expect(drawer.getByRole('combobox', { name: '上级组织', exact: true })).toHaveValue('')
  await expect(drawer.getByLabel('组织名称', { exact: true })).toHaveValue('')
  await expect(drawer.getByLabel('组织编码', { exact: true })).toHaveCount(0)
  await expect(drawer.getByText('组织编码将在创建成功后由系统自动生成。')).toBeVisible()
  await expect(drawer.getByRole('combobox', { name: '组织负责人', exact: true })).toHaveValue('')
  await expect(drawer.getByLabel('备注', { exact: true })).toHaveValue('')
  await drawer.getByRole('button', { name: '取消', exact: true }).click()
  await page.getByRole('button', { name: '编辑组织', exact: true }).click()
  const editDrawer = page.getByRole('dialog', { name: '编辑 实际根组织', exact: true })
  await expect(editDrawer.getByLabel('组织编码', { exact: true })).toBeDisabled()
  await expect(editDrawer.getByLabel('组织编码', { exact: true })).toHaveValue('REAL-ROOT')
  await expect(editDrawer.locator('.organization-leader-selector')).toContainText('实际负责人')
  await expect(editDrawer.getByLabel('备注', { exact: true })).toHaveValue('接口返回的实际组织备注')
})

test('position details and create forms do not display sample business values', async ({
  page,
}) => {
  await useAuthenticatedSession(page)
  let created: Record<string, unknown> | undefined
  let updated: Record<string, unknown> | undefined
  await page.route('**/api/iam-admin/Position/Create', async (route) => {
    created = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', code: 1, message: '', data: { id: 602 } }),
    })
  })
  await page.route('**/api/iam-admin/Position/Update', async (route) => {
    updated = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', code: 1, message: '', data: { id: 601 } }),
    })
  })
  await page.route('**/api/iam-admin/Position/Query', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: pageResult([
        {
          id: 601,
          tenant_id: 1,
          position_code: 'REAL-POSITION',
          position_name: '实际岗位',
          position_type: '临时岗位',
          status: 'ACTIVE',
          active_member_count: 0,
          sort_order: 4,
          remarks: '接口返回的实际岗位备注',
          version: '6',
          updated_at: '2026-09-17T10:00:00',
        },
      ]),
    }),
  )
  await page.goto('/iam/positions')
  await page.getByRole('button', { name: '详情', exact: true }).click()
  const detail = page.getByRole('dialog', { name: '实际岗位 · 岗位详情', exact: true })
  await expect(detail).toContainText('接口返回的实际岗位备注')
  await expect(detail).toContainText('华东运营中心')
  await expect(detail).not.toContainText('陆链华东运营中心')
  await detail.getByRole('button', { name: '关闭此对话框', exact: true }).click()
  await page.getByRole('button', { name: '新建岗位', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '新建岗位', exact: true })
  await expect(drawer.getByLabel('所属 Tenant', { exact: true })).toHaveValue('华东运营中心')
  await expect(drawer.getByLabel('岗位编码', { exact: true })).toHaveCount(0)
  await expect(drawer.getByText('岗位编码将在创建成功后由系统自动生成')).toBeVisible()
  await expect(drawer.getByLabel('岗位名称', { exact: true })).toHaveValue('')
  await expect(drawer.getByLabel('备注', { exact: true })).toHaveValue('')
  await expect(drawer.locator('.el-form-item').filter({ hasText: '岗位类型' })).toContainText(
    '业务岗位',
  )
  await drawer.getByLabel('岗位名称', { exact: true }).fill('系统编码岗位')
  await drawer.getByRole('button', { name: '创建岗位', exact: true }).click()
  await expect.poll(() => created?.position_name).toBe('系统编码岗位')
  expect(created).not.toHaveProperty('position_code')

  await page.getByRole('button', { name: '编辑', exact: true }).click()
  const editDrawer = page.getByRole('dialog', { name: '编辑 实际岗位', exact: true })
  await expect(editDrawer.getByLabel('岗位编码', { exact: true })).toBeDisabled()
  await expect(editDrawer.getByLabel('岗位编码', { exact: true })).toHaveValue('REAL-POSITION')
  await editDrawer.getByLabel('岗位名称', { exact: true }).fill('实际岗位（已更新）')
  await editDrawer.getByRole('button', { name: '保存岗位', exact: true }).click()
  await expect.poll(() => updated?.position_name).toBe('实际岗位（已更新）')
  expect(updated).not.toHaveProperty('position_code')
})
