import { expect, test } from '@playwright/test'

test.describe('shared HTTP client', () => {
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
})
