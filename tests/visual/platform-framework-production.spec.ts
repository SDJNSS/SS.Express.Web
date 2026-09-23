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
      .poll(() => requests.filter((request) => request.url.includes('/Permission/')).length)
      .toBeGreaterThanOrEqual(3)
    const appsRequest = requests.find((request) => request.url.includes('/Permission/CurrentApps'))
    const menusRequest = requests.find((request) =>
      request.url.includes('/Permission/CurrentAppMenus'),
    )
    const functionsRequest = requests.find((request) =>
      request.url.includes('/Permission/CurrentFunctions'),
    )
    const userRequest = requests.find((request) => request.url.includes('/Membership/QueryUsers'))

    expect(appsRequest?.body).toEqual({})
    expect(menusRequest?.body).toEqual({ app_id: 1 })
    expect(functionsRequest?.body).toEqual({ menu_id: 10101 })
    expect(menusRequest?.contentType).toContain('application/json')
    expect(requests.indexOf(menusRequest!)).toBeLessThan(requests.indexOf(functionsRequest!))
    expect(userRequest?.body).toEqual({
      tenant_ids: [1],
      page_index: 1,
      page_size: 1,
      user_name: '林嘉',
    })
    expect(
      requests.every((request) => request.authorization === 'Bearer visual-test-access-token'),
    ).toBe(true)
  })

  test('switches app and loads that app hierarchy once', async ({ page }) => {
    await useAuthenticatedSession(page, { firstMenuPathByApp: { IAM: '/iam/group' } })
    const menuRequests: number[] = []
    const functionRequests: number[] = []
    page.on('request', (request) => {
      if (request.url().includes('/Permission/CurrentAppMenus')) {
        const body = request.postDataJSON() as { app_id: number }
        menuRequests.push(body.app_id)
      }
      if (request.url().includes('/Permission/CurrentFunctions')) {
        const body = request.postDataJSON() as { menu_id: number }
        functionRequests.push(body.menu_id)
      }
    })

    await page.goto('/tms/overview')
    await expect(page.getByRole('navigation', { name: 'TMS 运输管理导航' })).toContainText(
      '运输订单',
    )
    await page.getByRole('link', { name: 'IAM 身份中心', exact: true }).click()
    await expect(page).toHaveURL(/\/iam\/group$/)
    await expect(page.getByRole('navigation', { name: 'IAM 身份中心导航' })).toContainText(
      '用户与成员',
    )
    expect(menuRequests).toEqual([3, 2])
    expect(functionRequests).toEqual([10301, 10201])
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

  test('selects function permissions by owning menu and reuses them for hidden pages', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    const functionRequests: number[] = []
    page.on('request', (request) => {
      if (!request.url().includes('/Permission/CurrentFunctions')) return
      const body = request.postDataJSON() as { menu_id: number }
      functionRequests.push(body.menu_id)
    })

    await page.goto('/iam/members')
    await expect.poll(() => functionRequests).toEqual([10207])

    await page.goto('/iam/roles')
    await expect.poll(() => functionRequests).toEqual([10207, 10208])

    await page.goto('/iam/roles/function-permissions?roleId=1&tenantId=1')
    await expect(page).toHaveURL(/\/iam\/roles\/function-permissions/)
    expect(functionRequests).toEqual([10207, 10208])
  })

  test('hides an invisible Menu only from the sidebar while preserving its route permissions', async ({
    page,
  }) => {
    await useAuthenticatedSession(page, { hiddenMenuPaths: ['/iam/roles'] })
    const functionRequests: number[] = []
    page.on('request', (request) => {
      if (!request.url().includes('/Permission/CurrentFunctions')) return
      const body = request.postDataJSON() as { menu_id: number }
      functionRequests.push(body.menu_id)
    })

    await page.goto('/iam/roles')

    await expect(page).toHaveURL(/\/iam\/roles$/)
    await expect(page.getByText('角色管理', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'IAM 身份中心导航' })).not.toContainText(
      '角色权限',
    )
    await expect.poll(() => functionRequests).toEqual([10208])
  })

  test('shows Welcome when the current user has no Dashboard permission', async ({ page }) => {
    await useAuthenticatedSession(page)
    await page.route('**/api/iam-admin/Permission/CurrentAppMenus', async (route) => {
      const request = route.request().postDataJSON() as { app_id?: number }
      if (request.app_id !== 1) {
        await route.fallback()
        return
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 1,
          message: '',
          data: {
            app: {
              id: 1,
              app_code: 'DMS',
              app_name: 'DMS 物流平台门户',
              route_prefix: '/platform',
            },
            modules: [
              {
                id: 101,
                app_id: 1,
                parent_id: 0,
                resource_code: 'DMS.MAIN',
                resource_name: 'DMS 物流平台门户导航',
                resource_type: 'module',
                route_path: '',
                component: '',
                permission_code: '',
                icon: 'mdi:view-dashboard-outline',
                is_visible: false,
                sort_order: 1,
                status: 'active',
                is_currently_effective: true,
                menus: [
                  {
                    id: 10102,
                    app_id: 1,
                    parent_id: 101,
                    resource_code: 'DMS.WELCOME',
                    resource_name: 'Welcome',
                    resource_type: 'menu',
                    route_path: '/platform/welcome',
                    component: 'platform/dashboard/pages/PlatformWelcomePage',
                    permission_code: 'dms:welcome:view',
                    icon: 'mdi:home-outline',
                    is_visible: true,
                    sort_order: 1,
                    status: 'active',
                    is_currently_effective: true,
                  },
                ],
              },
            ],
          },
        }),
      })
    })

    await page.goto('/platform/dashboard')
    await expect(page).toHaveURL(/\/platform\/welcome$/)
    await expect(page.getByRole('heading', { level: 1, name: '欢迎' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'DMS 物流平台门户导航' })).toContainText(
      'Welcome',
    )
    await expect(page.getByText('今日运输单')).toHaveCount(0)
  })

  test('keeps authorized navigation but hides actions when function loading fails', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    await page.route('**/api/iam-admin/Permission/CurrentFunctions', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', code: 503, message: '功能权限服务不可用' }),
      })
    })

    await page.goto('/iam/roles')

    await expect(page).toHaveURL(/\/iam\/roles$/)
    await expect(page.getByRole('navigation', { name: 'IAM 身份中心导航' })).toContainText(
      '角色权限',
    )
    await expect(page.locator('button').filter({ hasText: '新建自定义角色' })).toBeHidden()
  })

  test('keeps permission failures visible and retries without static fallback data', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    let appAttempts = 0
    await page.route('**/api/iam-admin/Permission/CurrentApps', async (route) => {
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
