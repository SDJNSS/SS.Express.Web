import { expect, test, type Page } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

function success(data: unknown) {
  return JSON.stringify({ status: 'success', code: 1, message: '', data })
}

function candidate(id: number, name = `候选用户${id}`) {
  return {
    tenant_user_id: id,
    user_id: id + 1000,
    user_name: `account${id}`,
    real_name: name,
    display_name: name,
  }
}

async function organizationPage(page: Page, status = 'ACTIVE') {
  await useAuthenticatedSession(page)
  await page.route('**/api/iam-admin/Organization/Query', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: success({
        total: 1,
        page_index: 1,
        page_size: 1000,
        items: [
          {
            id: 501,
            tenant_id: 1,
            parent_id: 0,
            org_code: 'ACTUAL',
            org_name: '实际组织',
            org_type: '职能部门',
            leader_tenant_user_id: 777,
            leader_display_name: '现有负责人',
            status,
            active_member_count: 0,
            sort_order: 0,
            remarks: '',
            version: '8',
            children: [],
          },
        ],
      }),
    }),
  )
  await page.goto('/iam/organizations')
  await expect(page.getByRole('heading', { name: '实际组织', exact: true })).toBeVisible()
}

test('leader candidates are tenant-scoped, paginated and submit the selected member ID', async ({
  page,
}, testInfo) => {
  const queries: Record<string, unknown>[] = []
  let saved: Record<string, unknown> | undefined
  await page.route('**/api/iam-admin/Organization/QueryLeaderCandidates', (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    queries.push(body)
    return route.fulfill({
      contentType: 'application/json',
      body: success({
        total: 21,
        page_index: body.page_index,
        page_size: 20,
        items:
          body.page_index === 2
            ? [candidate(21)]
            : Array.from({ length: 20 }, (_, index) => candidate(index + 1)),
      }),
    })
  })
  await page.route('**/api/iam-admin/Organization/Create', (route) => {
    saved = route.request().postDataJSON() as Record<string, unknown>
    return route.fulfill({ contentType: 'application/json', body: success(saved) })
  })
  await organizationPage(page)
  await page.getByRole('button', { name: '创建顶级组织', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '新建组织', exact: true })
  const parentSelect = drawer.getByRole('combobox', { name: '上级组织', exact: true })
  await expect(parentSelect).toHaveValue('')
  await drawer
    .locator('.el-form-item')
    .filter({ hasText: '上级组织' })
    .locator('.el-select__wrapper')
    .click()
  await page.locator('.el-select-dropdown:visible').getByText('实际组织', { exact: true }).click()
  await expect(
    drawer.locator('.el-form-item').filter({ hasText: '上级组织' }).locator('.el-select__wrapper'),
  ).toContainText('实际组织')
  await drawer.getByLabel('组织名称', { exact: true }).fill('新组织')
  const select = drawer.getByRole('combobox', { name: '组织负责人', exact: true })
  await expect(select).toHaveValue('')
  await select.click()
  await expect(page.getByRole('option', { name: '候选用户1 account1', exact: true })).toBeVisible()
  const dropdown = page.locator('.el-select-dropdown:visible')
  await expect(dropdown.getByText('共 21 条')).toBeVisible()
  await dropdown.getByRole('button', { name: '下一页', exact: true }).click()
  await expect(
    page.getByRole('option', { name: '候选用户21 account21', exact: true }),
  ).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('organization-leader-open.png') })
  await select.press('ArrowDown')
  await select.press('Enter')
  await expect(drawer.locator('.organization-leader-selector')).toContainText('候选用户21')
  await drawer.getByRole('button', { name: '创建组织', exact: true }).click()
  await expect.poll(() => saved?.leader_tenant_user_id).toBe(21)
  expect(saved?.tenant_id).toBe(1)
  expect(saved?.parent_id).toBe(501)
  expect(saved).not.toHaveProperty('org_code')
  expect(queries.every((query) => query.tenant_id === 1 && query.page_size === 20)).toBe(true)
  expect(queries.some((query) => query.page_index === 2)).toBe(true)
  expect(saved).not.toHaveProperty('org_ids')
})

test('search is debounced, ignores obsolete replies and offers retry without losing the form', async ({
  page,
}) => {
  let retry = false
  const keywords: string[] = []
  await page.route('**/api/iam-admin/Organization/QueryLeaderCandidates', async (route) => {
    const body = route.request().postDataJSON() as { keyword: string; page_index: number }
    keywords.push(body.keyword)
    if (body.keyword === '旧') await new Promise((resolve) => setTimeout(resolve, 800))
    if (body.keyword === '失败' && !retry) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: success(null) })
      return
    }
    const items =
      body.keyword === '无结果'
        ? []
        : [candidate(body.keyword === '旧' ? 11 : 22, body.keyword || '默认用户')]
    await route.fulfill({
      contentType: 'application/json',
      body: success({ total: items.length, page_index: 1, page_size: 20, items }),
    })
  })
  await organizationPage(page)
  await page.getByRole('button', { name: '创建顶级组织', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '新建组织', exact: true })
  await drawer.getByLabel('组织名称', { exact: true }).fill('保留的组织名')
  const select = drawer.getByRole('combobox', { name: '组织负责人', exact: true })
  await select.click()
  await expect(page.getByRole('option', { name: '默认用户 account22', exact: true })).toBeVisible()
  await select.fill('旧')
  await expect.poll(() => keywords.includes('旧')).toBe(true)
  await select.fill('最新')
  await expect(page.getByRole('option', { name: '最新 account22', exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: '旧 account11', exact: true })).toHaveCount(0)
  await select.fill('失败')
  await expect(page.getByRole('button', { name: '重试加载负责人', exact: true })).toBeVisible()
  await expect(drawer.getByLabel('组织名称', { exact: true })).toHaveValue('保留的组织名')
  retry = true
  await page.getByRole('button', { name: '重试加载负责人', exact: true }).click()
  await expect(page.getByRole('option', { name: '失败 account22', exact: true })).toBeVisible()
  await select.fill('无结果')
  await expect(page.getByText('没有匹配的当前有效用户', { exact: true })).toBeVisible()
  await select.fill('')
  await expect(page.getByRole('option', { name: '默认用户 account22', exact: true })).toBeVisible()
})

test('editing echoes the existing leader and disabled organizations can only clear it', async ({
  page,
}) => {
  let queried = 0
  let saved: Record<string, unknown> | undefined
  await page.route('**/api/iam-admin/Organization/QueryLeaderCandidates', (route) => {
    queried += 1
    return route.fulfill({
      contentType: 'application/json',
      body: success({ total: 1, items: [candidate(22)] }),
    })
  })
  await page.route('**/api/iam-admin/Organization/Update', (route) => {
    saved = route.request().postDataJSON() as Record<string, unknown>
    return route.fulfill({ contentType: 'application/json', body: success(saved) })
  })
  await organizationPage(page, 'DISABLED')
  await page.getByRole('button', { name: '编辑组织', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '编辑 实际组织', exact: true })
  const field = drawer.locator('.organization-leader-selector')
  await expect(field).toContainText('现有负责人')
  await expect(field).toContainText('组织已停用，仅允许保留或清空现有负责人。')
  await field.locator('.el-select__wrapper').click()
  await expect(page.getByRole('option', { name: '现有负责人', exact: true })).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await page.keyboard.press('Escape')
  await field.hover()
  await field.locator('.el-select__clear').click()
  await expect(field).toContainText('未设置负责人')
  await drawer.getByRole('button', { name: '保存组织', exact: true }).click()
  await expect.poll(() => saved?.leader_tenant_user_id).toBe(0)
  expect(queried).toBe(0)
  expect(saved?.id).toBe(501)
  expect(saved?.version).toBe('8')
  expect(saved).not.toHaveProperty('org_code')
})
