import { expect, test } from '@playwright/test'

import { mockShellContextApis } from './helpers/authenticatedSession'

async function useAnonymousSession(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    window.sessionStorage.clear()
    window.localStorage.removeItem('access_token')
    window.localStorage.removeItem('login_state')
    window.localStorage.removeItem('login_account')
    window.localStorage.removeItem('login_tenant_name')
    window.localStorage.removeItem('login_display_title')
    window.localStorage.removeItem('login_permissions')
  })
}

test.describe('IAM login production binding', () => {
  test('matches the approved page and submits through the IAM service path', async ({
    page,
  }, testInfo) => {
    await useAnonymousSession(page)
    await mockShellContextApis(page)
    let requestBody: Record<string, unknown> = {}
    let requestIdHeader = ''
    let acceptHeader = ''
    let contentTypeHeader = ''

    await page.route('**/api/iam-admin/Auth/Login', async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>
      const headers = await route.request().allHeaders()
      requestIdHeader = headers['x-request-id'] ?? ''
      acceptHeader = headers.accept ?? ''
      contentTypeHeader = headers['content-type'] ?? ''
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 1,
          message: '',
          data: {
            token: 'iam-access-token',
            login_state: 'AUTHENTICATED',
            session_id: 1001,
            session_version: '63924670932147368',
            expires_at: '2026-09-04T10:00:00Z',
            user_version: '63924670932147368',
            current_tenant: {
              tenant_id: 1,
              tenant_user_id: 2,
              tenant_code: 'PLATFORM',
              tenant_name: '神树物流平台',
              tenant_type: 'platform',
              logo_url: '',
              timezone: 'Asia/Shanghai',
              is_default: true,
            },
            available_tenants: [],
          },
        }),
      })
    })

    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1, name: '登录陆链控制台' })).toBeVisible()
    await expect(page).toHaveScreenshot(['iam-login', `${testInfo.project.name}.png`], {
      fullPage: true,
    })

    await page.locator('#login-account').fill('dispatcher.demo')
    await page.locator('#login-password').fill('secret-password')
    await page.getByRole('button', { name: '登录', exact: true }).click()

    await expect(page).toHaveURL(/\/platform\/welcome$/)
    expect(requestBody.user_name).toBe('dispatcher.demo')
    expect(requestBody.password).toBe('secret-password')
    expect(requestBody.device_type).toBe('web')
    expect(requestBody.device_id).toEqual(expect.any(String))
    expect(requestBody.request_id).toBe(requestIdHeader)
    expect(acceptHeader).toBe('text/plain')
    expect(contentTypeHeader).toContain('application/json-patch+json')
    expect(await page.evaluate(() => window.sessionStorage.getItem('access_token'))).toBe(
      'iam-access-token',
    )
  })

  test('shows a generic error and clears the password when authentication fails', async ({
    page,
  }) => {
    await useAnonymousSession(page)
    await page.route('**/api/iam-admin/Auth/Login', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', code: 1003, message: '账号或密码错误' }),
      })
    })

    await page.goto('/login')
    await page.locator('#login-account').fill('unknown.user')
    await page.locator('#login-password').fill('wrong-password')
    await page.getByRole('button', { name: '登录', exact: true }).click()

    await expect(page.getByRole('alert')).toContainText('账号或密码不正确，请检查后重试')
    await expect(page.locator('#login-account')).toHaveValue('unknown.user')
    await expect(page.locator('#login-password')).toHaveValue('')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('opens the framework welcome page for an initial-password session', async ({ page }) => {
    const protectedShellRequests: string[] = []

    page.on('request', (request) => {
      if (
        /Permission\/CurrentApps|Permission\/CurrentAppMenus|Membership\/QueryUsers/.test(
          request.url(),
        )
      ) {
        protectedShellRequests.push(request.url())
      }
    })

    await page.route('**/api/iam-admin/Auth/Login', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          code: 1,
          message: '',
          data: {
            token: 'initial-password-access-token',
            login_state: 'INITIAL_PASSWORD_CHANGE_REQUIRED',
            session_id: 2,
            session_version: '63924670932147368',
            expires_at: '2026-09-05T01:26:40Z',
            user_version: '63924670932147368',
            current_tenant: null,
            available_tenants: [],
          },
        }),
      })
    })

    await page.goto('/login')
    await page.locator('#login-account').fill('hmxt')
    await page.locator('#login-password').fill('initial-password')
    await page.getByRole('button', { name: '登录', exact: true }).click()

    await expect(page).toHaveURL(/\/platform\/welcome$/)
    await expect(page.locator('[data-app-shell-content]')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: '欢迎' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: '欢迎，hmxt' })).toBeVisible()
    await expect(page.getByText('当前仅开放欢迎页')).toBeVisible()
    expect(await page.evaluate(() => window.sessionStorage.getItem('login_state'))).toBe(
      'INITIAL_PASSWORD_CHANGE_REQUIRED',
    )
    expect(protectedShellRequests).toEqual([])

    await page.goto('/tms/overview')
    await expect(page).toHaveURL(/\/platform\/welcome$/)
  })
})
