import { expect, test } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

test.describe('platform framework production binding', () => {
  test('loads authorized apps, current app menus and the signed-in user', async ({ page }) => {
    const requests: Array<{
      url: string
      body: Record<string, unknown>
      authorization: string
      contentType: string
    }> = []
    page.on('request', (request) => {
      if (!request.url().includes('/api/iam-admin/')) return
      requests.push({
        url: request.url(),
        body: (request.postDataJSON() as Record<string, unknown> | null) ?? {},
        authorization: request.headers().authorization ?? '',
        contentType: request.headers()['content-type'] ?? '',
      })
    })

    await useAuthenticatedSession(page)
    await page.goto('/platform/dashboard')

    const appNavigation = page.getByRole('navigation', { name: '子系统切换' })
    await expect(appNavigation).toContainText('DMS 物流平台门户')
    await expect(appNavigation.getByRole('link', { name: 'DMS', exact: true })).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'DMS 物流平台门户导航' })).toContainText(
      '工作台',
    )
    const userMenu = page.getByRole('button', { name: '打开用户菜单' })
    await expect(userMenu.locator('.app-shell__user-name')).toHaveText('林嘉')
    await expect(userMenu.locator('.app-shell__tenant-name')).toHaveText('华东运营中心')

    await expect
      .poll(
        () =>
          requests.filter((request) => request.url.includes('/CurrentPermissionResource/')).length,
      )
      .toBeGreaterThanOrEqual(3)
    const appsRequest = requests.find((request) =>
      request.url.includes('/CurrentPermissionResource/CurrentApps'),
    )
    const menusRequest = requests.find((request) =>
      request.url.includes('/CurrentPermissionResource/CurrentAppMenus'),
    )
    const functionsRequest = requests.find((request) =>
      request.url.includes('/CurrentPermissionResource/CurrentPageResources'),
    )
    const userRequest = requests.find((request) => request.url.includes('/Auth/CurrentProfile'))

    expect(appsRequest?.body).toEqual({})
    expect(menusRequest?.body).toEqual({ app_id: 1 })
    expect(functionsRequest?.body).toEqual({ page_resource_code: 'DMS.DASHBOARD' })
    expect(menusRequest?.contentType).toContain('application/json')
    expect(requests.every((request) => !request.url.includes('/Permission/'))).toBe(true)
    expect(userRequest).toBeDefined()
    expect(userRequest?.body).toEqual({})
    expect(requests.some((request) => request.url.includes('/Membership/QueryUsers'))).toBe(false)
    expect(
      requests.every((request) => request.authorization === 'Bearer visual-test-access-token'),
    ).toBe(true)
  })

  test('shows the login identity when self profile fails without querying managed users', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    let managedUserQueries = 0
    page.on('request', (request) => {
      if (request.url().includes('/Membership/QueryUsers')) managedUserQueries += 1
    })
    await page.route('**/api/iam-admin/Auth/CurrentProfile', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: '资料暂不可用' }),
      }),
    )

    await page.goto('/platform/dashboard')
    await expect(page.getByText('用户资料加载失败，当前显示登录账号')).toBeVisible()
    await expect(page.getByRole('button', { name: '打开用户菜单' })).toContainText('林嘉')
    await expect(page.getByRole('navigation', { name: 'DMS 物流平台门户导航' })).toContainText(
      '工作台',
    )
    expect(managedUserQueries).toBe(0)
  })

  test('ignores a profile response after the login session has changed', async ({ page }) => {
    await useAuthenticatedSession(page)
    let releaseProfile!: () => void
    const profileReleased = new Promise<void>((resolve) => {
      releaseProfile = resolve
    })
    await page.route('**/api/iam-admin/Auth/CurrentProfile', async (route) => {
      await profileReleased
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          is_success: true,
          code: 1,
          status: 'success',
          data: {
            user_id: 9,
            user_name: '过期账号',
            display_name: '过期账号',
            real_name: '',
            nick_name: '',
            avatar_url: '',
            avatar_file_id: '',
            tenant_id: 1,
            tenant_code: 'PLATFORM',
            tenant_name: '华东运营中心',
            tenant_user_id: 9,
            tenant_user_code: 'OPS009',
            is_tenant_admin: false,
            organization_id: 0,
            organization_name: '',
            position_id: 0,
            position_name: '',
          },
        }),
      })
    })
    const requested = page.waitForRequest('**/api/iam-admin/Auth/CurrentProfile')
    await page.goto('/platform/dashboard')
    await requested
    await page.evaluate(() => window.sessionStorage.setItem('access_token', 'replacement-session'))
    const responded = page.waitForResponse('**/api/iam-admin/Auth/CurrentProfile')
    releaseProfile()
    await responded
    await expect(page.getByRole('button', { name: '打开用户菜单' })).not.toContainText('过期账号')
    expect(await page.evaluate(() => window.sessionStorage.getItem('login_user_name'))).not.toBe(
      '过期账号',
    )
  })

  test('switches app and loads that app hierarchy once', async ({ page }) => {
    await useAuthenticatedSession(page, { firstMenuPathByApp: { IAM: '/iam/group' } })
    const menuRequests: number[] = []
    const functionRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/CurrentPermissionResource/CurrentAppMenus')) {
        const body = request.postDataJSON() as { app_id: number }
        menuRequests.push(body.app_id)
      }
      if (request.url().includes('/CurrentPermissionResource/CurrentPageResources')) {
        const body = request.postDataJSON() as { page_resource_code: string }
        functionRequests.push(body.page_resource_code)
      }
    })

    await page.goto('/tms/overview')
    await expect(page.getByRole('navigation', { name: 'TMS 运输管理导航' })).toContainText(
      '运输总览',
    )
    await expect(
      page
        .getByRole('navigation', { name: 'TMS 运输管理导航' })
        .getByRole('link', { name: '运输订单' }),
    ).toHaveCount(0)
    await page.getByRole('link', { name: 'IAM 身份中心', exact: true }).click()
    await expect(page).toHaveURL(/\/iam\/group$/)
    await expect(page.getByRole('navigation', { name: 'IAM 身份中心导航' })).toContainText(
      '用户与成员',
    )
    expect(menuRequests).toEqual([3, 2])
    expect(functionRequests).toEqual(['TMS.OVERVIEW', 'IAM.GROUP'])
  })

  test('keeps Overview direct routes under their Menu permissions', async ({ page }) => {
    await useAuthenticatedSession(page)

    for (const path of ['/iam/overview', '/tms/overview', '/vms/overview']) {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`))
    }
  })

  test('rejects a direct Overview route when its Menu permission is absent', async ({ page }) => {
    await useAuthenticatedSession(page, { excludedMenuPaths: ['/iam/overview'] })

    await page.goto('/iam/overview')

    await expect(page).toHaveURL(/\/forbidden\?from=/)
  })

  test('retires the VMS vehicle sample without removing the VMS Overview', async ({ page }) => {
    await useAuthenticatedSession(page)

    await page.goto('/vms/overview')
    await expect(page.getByRole('heading', { level: 1, name: 'VMS 车辆管理' })).toBeVisible()
    await expect(page.getByText('车辆档案', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /车辆档案/ })).toHaveCount(0)

    await page.goto('/vms/vehicles')
    await expect(page.getByRole('heading', { level: 1, name: '页面未找到' })).toBeVisible()
  })

  test('queries exact page resources independently for Menu and ButtonPage', async ({ page }) => {
    await useAuthenticatedSession(page)
    await page.route('**/api/iam-admin/RolePermission/QueryRoles', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          is_success: true,
          status: 'success',
          code: 1,
          message: '',
          data: {
            total: 1,
            page_index: 1,
            page_size: 10,
            items: [
              {
                id: 1,
                tenant_id: 1,
                tenant_code: 'PLATFORM',
                role_code: 'CACHE_TEST_ROLE',
                role_name: '缓存测试角色',
                role_type: 'CUSTOM',
                sort_order: 0,
                status: 'ACTIVE',
                description: '',
                remarks: '',
                is_currently_effective: true,
                is_group_controlled: false,
                can_maintain: true,
                version: '1',
                created_at: '2026-09-27T00:00:00Z',
                updated_at: '2026-09-27T00:00:00Z',
              },
            ],
          },
        }),
      }),
    )
    await page.route('**/api/iam-admin/MemberRole/Query', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          is_success: true,
          status: 'success',
          code: 1,
          message: '',
          data: { total: 0, page_index: 1, page_size: 10, items: [] },
        }),
      }),
    )
    const functionRequests: string[] = []
    page.on('request', (request) => {
      if (!request.url().includes('/CurrentPermissionResource/CurrentPageResources')) return
      const body = request.postDataJSON() as { page_resource_code: string }
      functionRequests.push(body.page_resource_code)
    })

    await page.goto('/iam/members')
    await expect
      .poll(() => functionRequests)
      .toEqual(['IAM.MEMBERS', 'IAM.MEMBERS.EFFECTIVE_PERMISSIONS'])

    await page
      .getByRole('navigation', { name: 'IAM 身份中心导航' })
      .getByRole('link', { name: '角色权限', exact: true })
      .click()
    await expect
      .poll(() => functionRequests)
      .toEqual([
        'IAM.MEMBERS',
        'IAM.MEMBERS.EFFECTIVE_PERMISSIONS',
        'IAM.ROLES',
        'IAM.ROLES.AUTHORIZATION',
      ])

    await page.getByRole('button', { name: '角色成员', exact: true }).click()
    await expect(page).toHaveURL(/\/iam\/roles\/assignments/)
    expect(functionRequests).toEqual([
      'IAM.MEMBERS',
      'IAM.MEMBERS.EFFECTIVE_PERMISSIONS',
      'IAM.ROLES',
      'IAM.ROLES.AUTHORIZATION',
      'IAM.ROLES.ASSIGNMENTS',
    ])
  })

  test('hides an invisible Menu only from the sidebar while preserving its route permissions', async ({
    page,
  }) => {
    await useAuthenticatedSession(page, { hiddenMenuPaths: ['/iam/roles'] })
    const functionRequests: string[] = []
    page.on('request', (request) => {
      if (!request.url().includes('/CurrentPermissionResource/CurrentPageResources')) return
      const body = request.postDataJSON() as { page_resource_code: string }
      functionRequests.push(body.page_resource_code)
    })

    await page.goto('/iam/roles')

    await expect(page).toHaveURL(/\/iam\/roles$/)
    await expect(page.getByText('角色管理', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'IAM 身份中心导航' })).not.toContainText(
      '角色权限',
    )
    await expect.poll(() => functionRequests).toEqual(['IAM.ROLES', 'IAM.ROLES.AUTHORIZATION'])
  })

  test('shows Welcome when the current user has no Dashboard permission', async ({ page }) => {
    await useAuthenticatedSession(page, { excludedMenuPaths: ['/platform/dashboard'] })

    await page.goto('/platform/dashboard')
    await expect(page).toHaveURL(/\/platform\/welcome$/)
    await expect(page.getByRole('heading', { level: 1, name: '欢迎' })).toBeVisible()
    await expect(page.getByText('今日运输单')).toHaveCount(0)
  })

  test('shows an authorization error and hides actions when page authorization fails', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    await page.route(
      '**/api/iam-admin/CurrentPermissionResource/CurrentPageResources',
      async (route) => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'error', code: 503, message: '功能权限服务不可用' }),
        })
      },
    )

    await page.goto('/iam/roles')

    await expect(page).toHaveURL(/\/authorization-service-error\?from=/)
    await expect(page.getByRole('button', { name: '重新校验' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: '新建自定义角色' })).toBeHidden()
  })

  test('keeps permission failures visible and retries without static fallback data', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    let appAttempts = 0
    await page.route('**/api/iam-admin/CurrentPermissionResource/CurrentApps', async (route) => {
      appAttempts += 1
      if (appAttempts > 1) {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ code: 503, message: '权限服务不可用' }),
      })
    })

    await page.goto('/platform/dashboard')
    await expect(page.getByRole('alert')).toContainText('权限服务不可用')
    await expect(page.getByRole('navigation', { name: '子系统切换' })).not.toContainText('TMS')
    await page.getByRole('button', { name: '重新加载' }).click()
    await expect(page.getByRole('navigation', { name: 'DMS 物流平台门户导航' })).toContainText(
      '工作台',
    )
    expect(appAttempts).toBe(2)
  })
})
