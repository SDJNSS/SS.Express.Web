import { expect, test } from '@playwright/test'

import { mockShellContextApis, useAuthenticatedSession } from './helpers/authenticatedSession'

function apiSuccess(data: unknown): string {
  return JSON.stringify({ status: 'success', code: 1, message: '', data })
}

test.describe('IAM foundation production binding', () => {
  test('员工管理只查询当前租户，关联选项也保持同一范围', async ({ page }) => {
    await useAuthenticatedSession(page)
    const userRequests: Array<Record<string, unknown>> = []
    const organizationRequests: Array<Record<string, unknown>> = []
    const positionRequests: Array<Record<string, unknown>> = []
    page.on('request', (request) => {
      const body = request.postDataJSON() as Record<string, unknown>
      if (request.url().endsWith('/api/iam-admin/Membership/QueryUsers')) userRequests.push(body)
      if (request.url().endsWith('/api/iam-admin/Organization/Query'))
        organizationRequests.push(body)
      if (request.url().endsWith('/api/iam-admin/Position/Query')) positionRequests.push(body)
    })
    await page.goto('/iam/members')
    await expect(page.getByRole('button', { name: '详情', exact: true })).toBeVisible()
    expect(userRequests.length).toBeGreaterThan(0)
    expect(userRequests.every((request) => JSON.stringify(request.tenant_ids) === '[1]')).toBe(true)
    await expect(page.getByLabel('Tenant', { exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: '新增 Tenant 成员' }).click()
    const createDrawer = page.locator('.el-drawer').filter({ hasText: '新增 Tenant 成员' })
    await createDrawer.getByLabel('登录账号', { exact: true }).fill('relation.options.test')
    await createDrawer.getByLabel('姓名', { exact: true }).fill('归属选项测试')
    await createDrawer.getByRole('button', { name: '下一步' }).click()
    await expect.poll(() => organizationRequests.length).toBeGreaterThan(0)
    await expect.poll(() => positionRequests.length).toBeGreaterThan(0)
    expect(organizationRequests.every((request) => request.tenant_id === 1)).toBe(true)
    expect(positionRequests.every((request) => request.tenant_id === 1)).toBe(true)
  })
  test('keeps user and member version tokens read-only and submits them unchanged', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    let userUpdateBody: Record<string, unknown> | undefined
    let memberUpdateBody: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/Membership/UpdateUser', async (route) => {
      userUpdateBody = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({ ...userUpdateBody, status: 'ACTIVE', updated_at: '2026-09-11' }),
      })
    })
    await page.route('**/api/iam-admin/Membership/UpdateMember', async (route) => {
      memberUpdateBody = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({ ...memberUpdateBody, status: 'ACTIVE', updated_at: '2026-09-11' }),
      })
    })

    await page.goto('/iam/members')
    await page.getByRole('button', { name: '详情', exact: true }).click()
    await page.getByRole('button', { name: '编辑基本信息', exact: true }).click()
    const userDrawer = page.getByRole('dialog', { name: '编辑基本信息' })
    const userVersionInput = userDrawer.getByLabel('版本令牌')
    await expect(userVersionInput).toBeDisabled()
    await expect(userVersionInput).toHaveValue('63924670932147368')
    await expect(userDrawer.getByLabel('登录账号', { exact: true })).toHaveJSProperty(
      'readOnly',
      true,
    )
    await userDrawer.getByLabel('姓名').fill('林嘉更新')
    await userDrawer.getByRole('button', { name: '保存基本信息' }).click()
    await expect.poll(() => userUpdateBody?.version).toBe('63924670932147368')

    await expect(page.getByRole('button', { name: '更多', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '编辑成员资料', exact: true }).click()
    const memberDrawer = page.getByRole('dialog', { name: '编辑 Tenant 成员' })
    const memberVersionInput = memberDrawer.getByLabel('版本令牌')
    await expect(memberVersionInput).toBeDisabled()
    await expect(memberVersionInput).toHaveValue('63924670932147368')
    await expect(memberDrawer.getByLabel('Tenant 显示名称')).toHaveCount(0)
    await expect(memberDrawer.getByLabel('成员编号')).toBeDisabled()
    await memberDrawer.getByLabel('成员备注').fill('运营资料更新')
    await memberDrawer.getByRole('button', { name: '保存成员信息' }).click()
    await expect.poll(() => memberUpdateBody?.version).toBe('63924670932147368')
    expect(memberUpdateBody).not.toHaveProperty('tenant_user_code')
    expect(memberUpdateBody).not.toHaveProperty('display_name')
  })

  test('员工详情不暴露跨租户归属编辑或全量替换请求', async ({ page }) => {
    await useAuthenticatedSession(page)
    let crossTenantCalls = 0
    page.on('request', (request) => {
      if (/\/Membership\/(QueryUserTenants|UpdateUserTenants)$/.test(request.url()))
        crossTenantCalls += 1
    })
    await page.goto('/iam/members')
    await page.getByRole('button', { name: '详情', exact: true }).click()
    await expect(page.getByRole('button', { name: '编辑租户归属' })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: '租户' })).toBeVisible()
    expect(crossTenantCalls).toBe(0)
  })
  test('loads the approved group view and submits Group/Update with bearer auth', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    let updateBody: Record<string, unknown> | undefined
    let authorization = ''
    await page.route('**/api/iam-admin/Group/Update', async (route) => {
      updateBody = route.request().postDataJSON() as Record<string, unknown>
      authorization = route.request().headers().authorization ?? ''
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({
          ...updateBody,
          platform_name: 'SS Express',
          updated_at: '2026-09-06T00:00:00Z',
        }),
      })
    })

    await page.goto('/iam/group')
    await expect(page.getByRole('heading', { name: '集团信息' })).toBeVisible()
    await page.getByRole('button', { name: '编辑集团信息' }).click()
    const drawer = page.locator('.el-drawer')
    await drawer
      .locator('.el-form-item')
      .filter({ hasText: '集团名称' })
      .locator('input')
      .fill('陆链集团')
    await drawer.getByRole('button', { name: '保存集团信息' }).click()

    await expect.poll(() => updateBody?.group_name).toBe('陆链集团')
    expect(updateBody).not.toHaveProperty('group_code')
    expect(authorization).toBe('Bearer visual-test-access-token')
  })

  test('keeps long group information reachable inside the shared page scroller', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    await page.unroute('**/api/iam-admin/Group/Info')
    await page.route('**/api/iam-admin/Group/Info', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({
          id: 1,
          group_code: 'SS-EXPRESS',
          group_name: '陆链物流集团',
          full_name: '山东陆链智慧物流集团有限公司',
          short_name: '陆链物流',
          logo_url: '',
          platform_name: 'SS Express',
          description: '覆盖运输、车辆、组织与权限的一体化物流平台说明。'.repeat(80),
          contact_name: '林嘉',
          contact_phone: '13800000000',
          contact_email: 'linjia@example.com',
          website: 'www.ss-express.cn',
          address: '山东省济南市高新区陆链智慧物流园区'.repeat(30),
          timezone: 'Asia/Shanghai',
          language: 'zh-CN',
          remarks: '用于验证长内容仍然可以完整阅读。'.repeat(50),
          version: '1',
          updated_at: '2026-09-04T00:00:00Z',
        }),
      }),
    )

    await page.goto('/iam/group')
    const appPage = page.locator('[data-app-page]')
    const detailTemplate = page.locator('.detail-page-template')
    const lastField = page.getByText('更新时间', { exact: true })

    await expect(detailTemplate).toHaveAttribute('data-scroll-mode', 'page')
    const beforeScroll = await appPage.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: getComputedStyle(element).overflowY,
    }))
    expect(beforeScroll.overflowY).toBe('auto')
    expect(beforeScroll.scrollHeight).toBeGreaterThan(beforeScroll.clientHeight)

    await appPage.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    await expect.poll(() => appPage.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    await expect(lastField).toBeInViewport()
  })

  test('selects a tenant, replaces the token and enters the framework page', async ({ page }) => {
    await mockShellContextApis(page)
    await page.addInitScript(() => {
      window.sessionStorage.setItem('access_token', 'tenant-selection-token')
      window.sessionStorage.setItem('login_state', 'TENANT_SELECTION_REQUIRED')
      window.sessionStorage.setItem('login_account', 'hmxt')
      window.sessionStorage.setItem('login_session_id', '2')
      window.sessionStorage.setItem('login_session_version', '63924670932147368')
      window.sessionStorage.setItem(
        'login_available_tenants',
        JSON.stringify([
          {
            tenantId: 3,
            tenantUserId: 3,
            tenantCode: 'HMXTSD',
            tenantName: '汉明巡天山东',
            tenantType: 'enterprise',
            logoUrl: '',
            timezone: 'Asia/Shanghai',
            isDefault: false,
          },
        ]),
      )
    })
    let switchBody: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/Auth/SwitchTenant', async (route) => {
      switchBody = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({
          token: 'authenticated-token',
          login_state: 'AUTHENTICATED',
          session_id: 2,
          session_version: '63924670932147369',
          expires_at: '2026-09-07T00:00:00Z',
          user_version: '63924670932147368',
          current_tenant: {
            tenant_id: 3,
            tenant_user_id: 3,
            tenant_code: 'HMXTSD',
            tenant_name: '汉明巡天山东',
            tenant_type: 'enterprise',
            logo_url: '',
            timezone: 'Asia/Shanghai',
            is_default: false,
          },
          available_tenants: [],
        }),
      })
    })

    await page.goto('/iam/select-tenant')
    await page.getByRole('radio', { name: /汉明巡天山东/ }).click()
    await page.getByRole('button', { name: '进入 Tenant' }).click()

    await expect(page).toHaveURL(/\/platform\/welcome$/u)
    expect(switchBody).toMatchObject({
      tenant_id: 3,
      session_version: '63924670932147368',
    })
    const storedToken = await page.evaluate(() => window.sessionStorage.getItem('access_token'))
    expect(storedToken).toBe('authenticated-token')
    const storedVersion = await page.evaluate(() =>
      window.sessionStorage.getItem('login_session_version'),
    )
    expect(storedVersion).toBe('63924670932147369')
  })

  test('切换失败仍保持原租户与令牌，不误报成功', async ({ page }) => {
    await useAuthenticatedSession(page)
    await page.addInitScript(() => {
      window.sessionStorage.setItem('login_session_id', '2')
      window.sessionStorage.setItem('login_session_version', '63924670932147368')
    })
    await page.route('**/api/iam-admin/Auth/SwitchTenant', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: apiSuccess(null),
      })
    })
    await page.goto('/iam/select-tenant')
    await page.getByRole('radio', { name: /汉明巡天山东/ }).click()
    await page.getByRole('button', { name: '确认切换' }).click()
    await expect(page.getByText('当前 Tenant 保持不变，请重试或返回。')).toBeVisible()
    await expect(page).toHaveURL(/\/iam\/select-tenant$/u)
    const stored = await page.evaluate(() => ({
      token: window.sessionStorage.getItem('access_token'),
      tenantId: window.sessionStorage.getItem('login_tenant_id'),
    }))
    expect(stored).toEqual({ token: 'visual-test-access-token', tenantId: '1' })
  })
})
