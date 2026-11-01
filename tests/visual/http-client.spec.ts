import { expect, test } from '@playwright/test'

import { sourceHost } from './helpers/testServers'

test.use({ baseURL: sourceHost })

test.describe('shared HTTP client', () => {
  test('preserves tenant-switch guidance and classifies IAM denial envelopes and expired sessions', async ({
    page,
  }) => {
    const cases = [
      {
        name: 'tenant-envelope',
        status: 200,
        code: 403,
        message: '请求 Tenant 与当前会话 Tenant 不一致，请先切换租户',
        reason_code: 'IAM_CURRENT_TENANT_MISMATCH',
      },
      {
        name: 'tenant-http',
        status: 403,
        code: 403,
        message: '请求 Tenant 与当前会话 Tenant 不一致，请先切换租户',
        reason_code: 'IAM_CURRENT_TENANT_MISMATCH',
      },
      { name: 'forbidden', status: 200, code: 403, message: 'Forbidden' },
      { name: 'expired', status: 200, code: 1002, message: '当前成员已失效' },
      { name: 'conflict', status: 409, code: 1109, message: '版本已变化，请刷新后重试' },
    ]
    for (const entry of cases) {
      await page.route(`**/api/test/${entry.name}`, (route) =>
        route.fulfill({
          status: entry.status,
          contentType: 'application/json',
          body: JSON.stringify({
            code: entry.code,
            message: entry.message,
            reason_code: entry.reason_code,
            data: null,
          }),
        }),
      )
    }
    await page.route('**/api/test/export-csv', (route) =>
      route.fulfill({ contentType: 'text/csv', body: 'name\n张三' }),
    )
    await page.goto('/login')
    const result = await page.evaluate(
      async (names) => {
        const modulePath = '/src/shared/api/httpClient.ts'
        const { requestApi, requestRaw, configureHttpAuth } = await import(
          /* @vite-ignore */ modulePath
        )
        let expired = 0
        const restore = configureHttpAuth({
          getAccessToken: () => 'current-tenant-token',
          clearAccessToken: () => undefined,
          onSessionExpired: () => {
            expired += 1
          },
        })
        const errors: Array<{ category?: string; message?: string; reasonCode?: string }> = []
        try {
          for (const name of names) {
            try {
              await requestApi({ url: `/test/${name}`, method: 'POST' })
            } catch (error) {
              const failure = error as { category?: string; message?: string; reasonCode?: string }
              errors.push({
                category: failure.category,
                message: failure.message,
                reasonCode: failure.reasonCode,
              })
            }
          }
          let exportFailure = ''
          try {
            await requestRaw({ url: '/test/tenant-envelope', method: 'POST', responseType: 'blob' })
          } catch (error) {
            exportFailure = (error as { category?: string }).category ?? ''
          }
          const exportedFile = (await requestRaw({
            url: '/test/export-csv',
            method: 'POST',
            responseType: 'blob',
          })) as Blob
          return { errors, expired, exportFailure, exportedText: await exportedFile.text() }
        } finally {
          restore()
        }
      },
      cases.map((entry) => entry.name),
    )
    expect(result.errors.map((error) => error.category)).toEqual([
      'permission',
      'permission',
      'permission',
      'authentication',
      'business',
    ])
    expect(result.errors[0]?.message).toContain('请先切换租户')
    expect(result.errors[1]?.message).toContain('请先切换租户')
    expect(result.errors[0]?.reasonCode).toBe('IAM_CURRENT_TENANT_MISMATCH')
    expect(result.errors[1]?.reasonCode).toBe('IAM_CURRENT_TENANT_MISMATCH')
    expect(result.errors[4]?.message).toContain('刷新后重试')
    expect(result.expired).toBe(1)
    expect(result.exportFailure).toBe('permission')
    expect(result.exportedText).toBe('name\n张三')
  })

  test('uses the unified base URL, injects headers, and unwraps the API envelope', async ({
    page,
  }) => {
    let authorization = ''
    let requestId = ''
    await page.route('**/api/test/success', async (route) => {
      const headers = route.request().headers()
      authorization = headers.authorization ?? ''
      requestId = headers['x-request-id'] ?? ''
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          code: '0',
          message: 'ok',
          data: { value: '统一响应已解包' },
          requestId: 'server-request-id',
        }),
      })
    })

    await page.goto('/')
    const result = await page.evaluate(async () => {
      window.sessionStorage.setItem('access_token', 'test-access-token')
      const modulePath = '/src/shared/api/httpClient.ts'
      const { requestApi } = await import(/* @vite-ignore */ modulePath)
      return requestApi({ url: '/test/success', method: 'GET' })
    })

    expect(result).toEqual({ value: '统一响应已解包' })
    expect(authorization).toBe('Bearer test-access-token')
    expect(requestId).not.toBe('')
  })

  test('shares one refresh request across concurrent 401 responses and retries once', async ({
    page,
  }) => {
    let expiredRequests = 0
    let renewedRequests = 0
    await page.route('**/api/test/refresh', async (route) => {
      const authorization = (await route.request().allHeaders()).authorization
      if (authorization === 'Bearer renewed-access-token') {
        renewedRequests += 1
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ code: '0', message: 'ok', data: { renewed: true } }),
        })
        return
      }

      expiredRequests += 1
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'TOKEN_EXPIRED', message: 'expired', data: null }),
      })
    })

    await page.goto('/')
    const result = await page.evaluate(async () => {
      const modulePath = '/src/shared/api/httpClient.ts'
      const { configureHttpAuth, requestApi } = await import(/* @vite-ignore */ modulePath)
      let accessToken = 'expired-access-token'
      let refreshCalls = 0
      const restore = configureHttpAuth({
        getAccessToken: () => accessToken,
        setAccessToken: (token: string) => {
          accessToken = token
        },
        clearAccessToken: () => {
          accessToken = ''
        },
        refreshAccessToken: async () => {
          refreshCalls += 1
          await new Promise((resolve) => window.setTimeout(resolve, 30))
          return 'renewed-access-token'
        },
      })

      try {
        const values = await Promise.all([
          requestApi({ url: '/test/refresh', method: 'GET' }),
          requestApi({ url: '/test/refresh', method: 'GET' }),
        ])
        return { values, refreshCalls, accessToken }
      } finally {
        restore()
      }
    })

    expect(result).toEqual({
      values: [{ renewed: true }, { renewed: true }],
      refreshCalls: 1,
      accessToken: 'renewed-access-token',
    })
    expect(expiredRequests).toBe(2)
    expect(renewedRequests).toBe(2)
  })

  test('normalizes unauthorized errors and rejects absolute endpoint URLs', async ({ page }) => {
    await page.route('**/api/test/unauthorized', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'unauthorized', data: null }),
      })
    })

    await page.goto('/')
    const result = await page.evaluate(async () => {
      const modulePath = '/src/shared/api/httpClient.ts'
      const { configureHttpAuth, requestApi } = await import(/* @vite-ignore */ modulePath)
      let sessionExpiredCalls = 0
      const restore = configureHttpAuth({
        getAccessToken: () => 'expired-access-token',
        clearAccessToken: () => undefined,
        onSessionExpired: () => {
          sessionExpiredCalls += 1
        },
      })

      try {
        let unauthorizedCategory = ''
        let absoluteUrlCategory = ''
        try {
          await requestApi({ url: '/test/unauthorized', method: 'GET' })
        } catch (error) {
          unauthorizedCategory = (error as { category?: string }).category ?? ''
        }
        try {
          await requestApi({ url: 'https://example.invalid/bypass', method: 'GET' })
        } catch (error) {
          absoluteUrlCategory = (error as { category?: string }).category ?? ''
        }
        return { unauthorizedCategory, absoluteUrlCategory, sessionExpiredCalls }
      } finally {
        restore()
      }
    })

    expect(result).toEqual({
      unauthorizedCategory: 'authentication',
      absoluteUrlCategory: 'system',
      sessionExpiredCalls: 1,
    })
  })

  test('defines relative feature paths and safely encodes path parameters', async ({ page }) => {
    await page.goto('/')
    const result = await page.evaluate(async () => {
      const modulePath = '/src/shared/api/apiPath.ts'
      const { defineApiPath, resolveApiPath } = await import(/* @vite-ignore */ modulePath)
      const template = defineApiPath('/vms/vehicles/:vehicleId')
      const resolved = resolveApiPath(template, { vehicleId: '沪 A/100' })
      let absoluteRejected = false
      try {
        defineApiPath('https://example.invalid/vms/vehicles')
      } catch {
        absoluteRejected = true
      }
      return { resolved, absoluteRejected }
    })

    expect(result).toEqual({
      resolved: '/vms/vehicles/%E6%B2%AA%20A%2F100',
      absoluteRejected: true,
    })
  })

  test('blocks protected requests before network dispatch when no token exists', async ({
    page,
  }) => {
    let dispatchedRequests = 0
    await page.route('**/api/test/protected', async (route) => {
      dispatchedRequests += 1
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ code: 1, message: '', data: true }),
      })
    })

    await page.goto('/login')
    const category = await page.evaluate(async () => {
      const modulePath = '/src/shared/api/httpClient.ts'
      const { configureHttpAuth, requestApi } = await import(/* @vite-ignore */ modulePath)
      const restore = configureHttpAuth({ getAccessToken: () => null })
      try {
        await requestApi({ url: '/test/protected', method: 'GET' })
        return ''
      } catch (error) {
        return (error as { category?: string }).category ?? ''
      } finally {
        restore()
      }
    })

    expect(category).toBe('authentication')
    expect(dispatchedRequests).toBe(0)
  })

  test('业务请求拒绝其他租户或空租户集合，且不触网', async ({ page }) => {
    let dispatchedRequests = 0
    await page.route('**/api/test/tenant-boundary', async (route) => {
      dispatchedRequests += 1
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ code: 1, message: '', data: true }),
      })
    })
    await page.goto('/')
    const categories = await page.evaluate(async () => {
      const authModulePath = '/src/shared/api/authSession.ts'
      const httpModulePath = '/src/shared/api/httpClient.ts'
      const { setStoredAuthSession } = await import(/* @vite-ignore */ authModulePath)
      const { requestApi } = await import(/* @vite-ignore */ httpModulePath)
      setStoredAuthSession({
        accessToken: 'tenant-a-token',
        account: 'tester',
        loginState: 'AUTHENTICATED',
        currentTenantId: 1,
      })
      const results: string[] = []
      for (const data of [{ tenant_id: 3 }, { tenant_ids: [] }, { tenant_ids: [1, 3] }]) {
        try {
          await requestApi({
            url: '/test/tenant-boundary',
            method: 'POST',
            tenantScoped: true,
            data,
          })
        } catch (error) {
          results.push((error as { category?: string }).category ?? '')
        }
      }
      return results
    })
    expect(categories).toEqual(['cancelled', 'cancelled', 'cancelled'])
    expect(dispatchedRequests).toBe(0)
  })

  test('租户切换后的旧响应不能交付给新上下文', async ({ page }) => {
    await page.route('**/api/test/tenant-slow', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 250))
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ code: 1, message: '', data: { tenant: 1 } }),
      })
    })
    await page.goto('/')
    const result = await page.evaluate(async () => {
      const authModulePath = '/src/shared/api/authSession.ts'
      const httpModulePath = '/src/shared/api/httpClient.ts'
      const { setStoredAuthSession } = await import(/* @vite-ignore */ authModulePath)
      const { requestApi } = await import(/* @vite-ignore */ httpModulePath)
      setStoredAuthSession({
        accessToken: 'tenant-a-token',
        account: 'tester',
        loginState: 'AUTHENTICATED',
        currentTenantId: 1,
      })
      const pending = requestApi({
        url: '/test/tenant-slow',
        method: 'POST',
        tenantScoped: true,
        data: { tenant_id: 1 },
      })
      await new Promise((resolve) => setTimeout(resolve, 80))
      setStoredAuthSession({
        accessToken: 'tenant-b-token',
        account: 'tester',
        loginState: 'AUTHENTICATED',
        currentTenantId: 3,
      })
      try {
        await pending
        return 'accepted'
      } catch (error) {
        return (error as { category?: string }).category ?? ''
      }
    })
    expect(result).toBe('cancelled')
  })
})
