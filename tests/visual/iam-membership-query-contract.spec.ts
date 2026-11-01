import { expect, test } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

test('员工查询只使用当前租户，且查询按钮只发送一次业务请求', async ({ page }) => {
  await useAuthenticatedSession(page)
  const requests: Record<string, unknown>[] = []
  await page.route('**/api/iam-admin/Membership/QueryUsers', async (route) => {
    requests.push(route.request().postDataJSON() as Record<string, unknown>)
    await route.fallback()
  })
  await page.goto('/iam/members')
  await expect(page.getByRole('button', { name: '详情', exact: true })).toBeVisible()
  const search = page.getByRole('region', { name: '查询条件' })
  await expect(search.getByRole('combobox', { name: 'Tenant', exact: true })).toHaveCount(0)
  await expect(search.getByLabel('用户 ID', { exact: true })).toHaveCount(0)
  await expect(search.getByLabel('用户状态', { exact: true })).toHaveCount(0)
  await expect(search.getByRole('button', { name: /更多筛选|收起筛选/ })).toHaveCount(0)
  await expect(search.getByLabel('完整登录账号', { exact: true })).toBeVisible()
  await expect(search.getByLabel('成员状态', { exact: true })).toBeVisible()
  expect(requests.every((request) => JSON.stringify(request.tenant_ids) === '[1]')).toBe(true)

  requests.length = 0
  await search.getByPlaceholder('输入用户姓名').fill('林')
  await search.getByRole('button', { name: '查询', exact: true }).click()
  await expect.poll(() => requests.length).toBe(1)
  expect(requests[0]).toMatchObject({ tenant_ids: [1], real_name: '林' })
  expect(requests[0]).not.toHaveProperty('user_name')
  expect(requests[0]).not.toHaveProperty('user_id')
  expect(requests[0]).not.toHaveProperty('user_status')

  requests.length = 0
  await search.getByLabel('完整登录账号', { exact: true }).fill('linjia')
  await search.getByLabel('成员状态', { exact: true }).press('Enter')
  await page.getByRole('option', { name: '启用', exact: true }).click()
  await search.getByLabel('完整登录账号', { exact: true }).press('Enter')
  await expect.poll(() => requests.length).toBe(1)
  expect(requests[0]).toMatchObject({
    tenant_ids: [1],
    real_name: '林',
    user_name: 'linjia',
    member_status: 'ACTIVE',
  })

  requests.length = 0
  await search.getByRole('button', { name: '重置', exact: true }).click()
  await expect.poll(() => requests.length).toBe(1)
  expect(requests[0]).toEqual({ tenant_ids: [1], page_index: 1, page_size: 1000 })
})

test('未选定租户时不加载员工数据，转到统一选择入口', async ({ page }) => {
  await useAuthenticatedSession(page)
  await page.addInitScript(() => window.sessionStorage.removeItem('login_tenant_id'))
  let businessRequests = 0
  page.on('request', (request) => {
    if (request.url().endsWith('/api/iam-admin/Membership/QueryUsers')) businessRequests += 1
  })
  await page.goto('/iam/members')
  await expect(page).toHaveURL(/\/iam\/select-tenant$/)
  expect(businessRequests).toBe(0)
})

test('成员编号支持默认精确及至少3字符的模糊查询，空值不筛选，重置恢复默认', async ({
  page,
}, testInfo) => {
  await useAuthenticatedSession(page)
  const requests: Record<string, unknown>[] = []
  await page.route('**/api/iam-admin/Membership/QueryUsers', async (route) => {
    requests.push(route.request().postDataJSON())
    await route.fallback()
  })
  await page.goto('/iam/members')
  await expect(page.getByRole('button', { name: '详情', exact: true })).toBeVisible()
  const search = page.getByRole('region', { name: '查询条件' })
  const code = search.getByLabel('成员编号', { exact: true })
  const mode = search.getByLabel('编号匹配', { exact: true })
  const submit = search.getByRole('button', { name: '查询', exact: true })
  requests.length = 0
  await code.fill('  TEN-123  ')
  await submit.click()
  await expect.poll(() => requests.length).toBe(1)
  expect(requests[0]).toMatchObject({
    tenant_ids: [1],
    tenant_user_code: 'TEN-123',
    tenant_user_code_fuzzy: false,
  })

  requests.length = 0
  await mode.press('Enter')
  await page.getByRole('option', { name: '模糊匹配', exact: true }).click()
  await code.fill(' TE ')
  await submit.click()
  await expect(
    page.getByRole('alert').filter({ hasText: '成员编号模糊查询至少需要3个字符' }),
  ).toBeVisible()
  await expect(code).toBeFocused()
  await expect(code).toHaveAttribute('aria-invalid', 'true')
  await expect(code).toHaveAttribute('aria-describedby', 'member-code-query-error')
  await page.screenshot({
    path: `C:/Users/75946/AppData/Local/Temp/iam-member-code-validation-${testInfo.project.name}.png`,
    animations: 'disabled',
  })
  expect(requests).toHaveLength(0)
  await expect(page.getByRole('button', { name: '详情', exact: true })).toBeVisible()
  await code.press('Enter')
  expect(requests).toHaveLength(0)
  await code.fill(' TEN ')
  await code.press('Enter')
  await expect.poll(() => requests.length).toBe(1)
  expect(requests[0]).toMatchObject({
    tenant_ids: [1],
    tenant_user_code: 'TEN',
    tenant_user_code_fuzzy: true,
  })
  await expect(code).toHaveAttribute('aria-invalid', 'false')

  requests.length = 0
  await code.fill('   ')
  await submit.click()
  await expect.poll(() => requests.length).toBe(1)
  expect(requests[0]).not.toHaveProperty('tenant_user_code')
  expect(requests[0]).not.toHaveProperty('tenant_user_code_fuzzy')
  requests.length = 0
  await search.getByRole('button', { name: '重置', exact: true }).click()
  await expect.poll(() => requests.length).toBe(1)
  expect(requests[0]).toEqual({ tenant_ids: [1], page_index: 1, page_size: 1000 })
  await expect(code).toHaveValue('')
  await expect(search.locator('.el-form-item').filter({ hasText: '编号匹配' })).toContainText(
    '精确匹配',
  )
})

test('跨租户直接链接在加载业务数据前被拒绝', async ({ page }, testInfo) => {
  await useAuthenticatedSession(page)
  let businessRequests = 0
  page.on('request', (request) => {
    if (request.url().endsWith('/api/iam-admin/Membership/QueryUsers')) businessRequests += 1
  })
  await page.goto('/iam/members/effective-permissions?tenantId=3&userId=1001')
  await expect(page).toHaveURL(/\/forbidden\?from=/)
  await expect(
    page.getByText('目标租户与当前会话不一致，请先切换租户，再进入目标页面。'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: '切换租户', exact: true })).toBeVisible()
  await page.screenshot({
    path: `C:/Users/75946/AppData/Local/Temp/iam-tenant-mismatch-${testInfo.project.name}.png`,
  })
  expect(businessRequests).toBe(0)
})

test('切换候选来自认证会话，不通过员工查询推导', async ({ page }) => {
  await useAuthenticatedSession(page)
  let businessRequests = 0
  page.on('request', (request) => {
    if (request.url().endsWith('/api/iam-admin/Membership/QueryUsers')) businessRequests += 1
  })
  await page.goto('/iam/select-tenant')
  await expect(page.getByText('汉明巡天山东', { exact: true })).toBeVisible()
  expect(businessRequests).toBe(0)
})

test('未保存的员工编辑在离开页面前必须由用户确认', async ({ page }) => {
  await useAuthenticatedSession(page)
  await page.goto('/iam/overview')
  await page
    .getByRole('navigation', { name: 'IAM 身份中心导航' })
    .getByRole('link', { name: '用户与成员', exact: true })
    .click()
  await page.getByRole('button', { name: '详情', exact: true }).click()
  await page.getByRole('button', { name: '编辑基本信息', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '编辑基本信息' })
  await drawer.getByLabel('姓名').fill('待保存的姓名')

  await page.evaluate(() => window.history.back())
  await expect(page.getByText('放弃未保存的修改？', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '继续编辑' }).click()
  await expect(drawer.getByLabel('姓名')).toHaveValue('待保存的姓名')
  await expect(page).toHaveURL(/\/iam\/members$/)

  await page.evaluate(() => window.history.back())
  await page.getByRole('button', { name: '放弃修改' }).last().click()
  await expect(page).toHaveURL(/\/iam\/overview$/)
})
