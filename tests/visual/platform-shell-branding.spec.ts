import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { resolveAppShellBranding } from '../../src/shared/components/appShellBranding'
import { useAuthenticatedSession } from './helpers/authenticatedSession'

const profile = {
  user_id: 1001,
  user_name: '林嘉',
  real_name: '林嘉',
  nick_name: '林嘉',
  display_name: '林嘉',
  avatar_url: '',
  avatar_file_id: '',
  tenant_id: 1,
  tenant_code: 'PLATFORM',
  tenant_name: '华东运营中心',
  tenant_user_id: 1,
  tenant_user_code: 'OPS001',
  is_tenant_admin: true,
  organization_id: 10,
  organization_name: '华东运营中心',
  position_id: 20,
  position_name: '运营经理',
}

async function mockBranding(page: Page, branding: unknown) {
  await page.route('**/api/iam-admin/Auth/CurrentProfile', (route) =>
    route.fulfill({
      json: {
        is_success: true,
        status: 'success',
        code: 1,
        message: '',
        data: { ...profile, branding },
      },
    }),
  )
}

test('normalizes each branding field independently and rejects unsafe image URLs', () => {
  expect(resolveAppShellBranding({ brandName: ' 汉明巡天 ', platformName: null })).toEqual({
    brandName: '汉明巡天',
    platformName: '多式联运智慧调度平台',
    logoUrl: '',
  })
  for (const logoUrl of [
    'javascript:alert(1)',
    '//example.com/a.png',
    'data:image/svg+xml,foo',
    'file:///a.png',
    'https://user:secret@example.com/a.png',
    '/\\example.com/a.png',
    '/bad\nimage',
    123,
  ]) {
    expect(resolveAppShellBranding({ brandName: 123, platformName: ' ', logoUrl })).toEqual({
      brandName: '陆链控制台',
      platformName: '多式联运智慧调度平台',
      logoUrl: '',
    })
  }
  for (const logoUrl of ['/assets/brand.png', 'https://assets.example.com/brand.png']) {
    expect(resolveAppShellBranding({ logoUrl }).logoUrl).toBe(logoUrl)
  }
})

test.describe('production shell branding', () => {
  test.beforeEach(async ({ page }) => {
    await useAuthenticatedSession(page)
  })

  test('old response retains defaults and compact two-line layout', async ({ page }, testInfo) => {
    await page.goto('/platform/welcome')
    await expect(page.locator('.app-shell__user-name')).toHaveText('林嘉')
    await expect(page.locator('.app-shell__brand-name')).toHaveText('陆链控制台')
    await expect(page.locator('.app-shell__platform-name')).toHaveText('多式联运智慧调度平台')
    await expect(page.locator('.app-shell__brand-mark svg')).toBeVisible()
    await expect(page.locator('.app-shell__brand-logo')).toHaveCount(0)
    const brand = await page.locator('.app-shell__brand').boundingBox()
    const header = await page.locator('.app-shell__header').boundingBox()
    expect(brand?.height).toBe(header?.height)
    expect(brand?.height).toBe(48)
    const lines = await page.locator('.app-shell__brand-copy').evaluate((element) =>
      [...element.children].map((line) => ({
        clipped: line.scrollWidth > line.clientWidth,
        fontSize: getComputedStyle(line).fontSize,
      })),
    )
    expect(lines).toEqual([
      { clipped: false, fontSize: '16px' },
      { clipped: false, fontSize: '12px' },
    ])
    await page.screenshot({
      path: join(tmpdir(), `platform-shell-branding-default-${testInfo.project.name}.png`),
    })
  })

  test('renders backend logo and names, including collapsed keyboard access', async ({
    page,
  }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await mockBranding(page, {
      brand_name: '汉明巡天',
      platform_name: '多式联运智慧调度平台',
      logo_url: '/test-brand.svg',
    })
    let logoAuthorization: string | undefined
    await page.route('**/test-brand.svg', (route) => {
      logoAuthorization = route.request().headers().authorization
      return route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path fill="#6ca5ff" d="M20 2 36 11v18L20 38 4 29V11z"/><path fill="#fff" d="m20 8 10 6-10 6-10-6zM10 18l8 5v10l-8-5zM22 23l8-5v10l-8 5z"/></svg>',
      })
    })
    await page.goto('/platform/welcome')
    await expect(page.locator('.app-shell__brand-name')).toHaveText('汉明巡天')
    const logo = page.locator('.app-shell__brand-logo')
    await expect(logo).toBeVisible()
    await expect
      .poll(() => logo.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
    await expect(logo).toHaveCSS('object-fit', 'contain')
    await expect(page.getByText('用户资料加载失败，当前显示登录账号')).toHaveCount(0)
    expect(logoAuthorization).toBeUndefined()
    await page.screenshot({
      path: join(tmpdir(), `platform-shell-branding-configured-${testInfo.project.name}.png`),
    })
    await page.getByRole('button', { name: '收起侧栏' }).click()
    await expect(page.locator('.app-shell__brand-copy')).toBeHidden()
    await expect(logo).toBeVisible()
    await page.locator('.app-shell__brand').focus()
    await expect(
      page.getByRole('tooltip').filter({ hasText: '汉明巡天 · 多式联运智慧调度平台' }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '展开侧栏' }).click()
    await expect(page.locator('.app-shell__brand-copy')).toBeVisible()
    await page.locator('.app-shell__brand').click()
    await expect(page).toHaveURL(/\/platform\/dashboard$/)
    await expect(page.locator('.app-shell__brand-name')).toHaveText('汉明巡天')
    expect(errors).toEqual([])
  })

  test('partial fields and broken image fall back independently', async ({ page }) => {
    await mockBranding(page, {
      brand_name: ' ',
      platform_name: '专属运营平台',
      logo_url: '/missing-brand.png',
    })
    let imageRequests = 0
    await page.route('**/missing-brand.png', (route) => {
      imageRequests += 1
      return route.fulfill({ status: 404, body: '' })
    })
    await page.goto('/platform/welcome')
    await expect(page.locator('.app-shell__platform-name')).toHaveText('专属运营平台')
    await expect(page.locator('.app-shell__brand-name')).toHaveText('陆链控制台')
    await expect(page.locator('.app-shell__brand-mark svg')).toBeVisible()
    await expect(page.locator('.app-shell__brand-logo')).toHaveCount(0)
    expect(imageRequests).toBe(1)
  })

  test('profile failure leaves defaults without blocking navigation', async ({ page }) => {
    await page.route('**/api/iam-admin/Auth/CurrentProfile', (route) =>
      route.fulfill({ status: 503, json: { message: '暂不可用' } }),
    )
    await page.goto('/platform/dashboard')
    await expect(page.getByText('用户资料加载失败，当前显示登录账号')).toBeVisible()
    await expect(page.locator('.app-shell__brand-name')).toHaveText('陆链控制台')
    await expect(page.locator('.app-shell__platform-name')).toHaveText('多式联运智慧调度平台')
    await expect(page.getByRole('navigation', { name: 'DMS 物流平台门户导航' })).toContainText(
      '工作台',
    )
  })

  test('long names stay within sidebar and expose full keyboard tooltip', async ({ page }) => {
    const brandName = '汉明巡天多式联运全国智慧物流运营控制中心'
    const platformName = '跨区域多式联运智慧调度与全链路运营协同管理平台'
    await mockBranding(page, {
      brand_name: brandName,
      platform_name: platformName,
      logo_url: 'javascript:alert(1)',
    })
    await page.goto('/platform/welcome')
    await expect(page.locator('.app-shell__brand-name')).toHaveText(brandName)
    await expect
      .poll(() =>
        page.locator('.app-shell__brand-name').evaluate((el) => el.scrollWidth > el.clientWidth),
      )
      .toBe(true)
    await page.locator('.app-shell__brand').focus()
    await expect(
      page.getByRole('tooltip').filter({ hasText: `${brandName} · ${platformName}` }),
    ).toBeVisible()
    await expect(page.locator('.app-shell__brand-logo')).toHaveCount(0)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })

  test('late profile from replaced session cannot change branding', async ({ page }) => {
    let release!: () => void
    const ready = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('**/api/iam-admin/Auth/CurrentProfile', async (route) => {
      await ready
      await route.fulfill({
        json: {
          is_success: true,
          status: 'success',
          code: 1,
          message: '',
          data: { ...profile, branding: { brand_name: '旧会话品牌', platform_name: '旧平台' } },
        },
      })
    })
    const requested = page.waitForRequest('**/api/iam-admin/Auth/CurrentProfile')
    await page.goto('/platform/welcome')
    await requested
    await page.evaluate(() => window.sessionStorage.setItem('access_token', 'new-session'))
    const response = page.waitForResponse('**/api/iam-admin/Auth/CurrentProfile')
    release()
    await response
    // A subsequent animation frame gives the fulfilled Axios/Vue update its turn.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    await expect(page.locator('.app-shell__brand-name')).toHaveText('陆链控制台')
    await expect(page.locator('.app-shell__platform-name')).toHaveText('多式联运智慧调度平台')
  })
})
