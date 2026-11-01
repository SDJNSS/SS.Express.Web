import { expect, test } from '@playwright/test'

import { DEFAULT_SHELL_BRANDING } from '../../src/shared/components/appShellBranding'
import { useAuthenticatedSession } from '../visual/helpers/authenticatedSession'

const platformName = '多式联运智慧调度平台'

test('uses the platform name before and after the login application mounts', async ({
  page,
  request,
}) => {
  expect(DEFAULT_SHELL_BRANDING.platformName).toBe(platformName)
  const response = await request.get('/')
  expect(response.ok()).toBeTruthy()
  expect(await response.text()).toContain(`<title>${platformName}</title>`)

  await page.goto('/login')
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  await expect(page).toHaveTitle(`登录 · ${platformName}`)
})

test('keeps the platform title across welcome, error routes and SPA navigation', async ({
  page,
}) => {
  await useAuthenticatedSession(page)
  for (const [path, title] of [
    ['/platform/welcome', '欢迎'],
    ['/forbidden', '无权访问此页面'],
    ['/authorization-service-error', '权限校验暂不可用'],
    ['/unknown-title-test-route', '页面未找到'],
  ] as const) {
    await page.goto(path)
    await expect(page.locator('.app-shell__content .app-page')).toBeVisible()
    await expect(page).toHaveTitle(`${title} · ${platformName}`)
  }

  await page.getByRole('link', { name: 'TMS 运输管理', exact: true }).click()
  await expect(page).toHaveURL(/\/tms\/overview$/)
  await expect(page.getByRole('heading', { name: 'TMS 运输管理', level: 1 })).toBeVisible()
  await expect(page).toHaveTitle(`TMS 运输管理 · ${platformName}`)
})
