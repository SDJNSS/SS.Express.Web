import { expect, test } from '@playwright/test'

import { useAuthenticatedSession } from '../visual/helpers/authenticatedSession'

test.describe('production route exposure', () => {
  test.beforeEach(async ({ page }) => {
    await useAuthenticatedSession(page, {
      excludedMenuPaths: ['/vms/overview'],
      firstMenuPathByApp: { TMS: '/tms/orders' },
      moduleRoutePathByApp: { TMS: '/tms', VMS: '/vms' },
    })
  })

  test('hides placeholder navigation while preserving the explicit development state', async ({
    page,
  }) => {
    await page.goto('/tms/overview')

    const sidebar = page.locator('.app-shell__sidebar')
    await expect(page.getByRole('heading', { name: 'TMS 运输管理', level: 1 })).toBeVisible()
    await expect(sidebar.getByText('运输订单', { exact: true })).toHaveCount(0)
    await expect(sidebar.getByText('调度工作台', { exact: true })).toHaveCount(0)
    await expect(sidebar.getByText('运输任务', { exact: true })).toHaveCount(0)

    const orderModule = page.locator('.workspace-module').filter({ hasText: '运输订单' })
    await expect(orderModule).toContainText('待接入')
    await expect(page.locator('a.workspace-module').filter({ hasText: '运输订单' })).toHaveCount(0)

    await page.goto('/tms/orders')
    await expect(page.getByRole('heading', { name: '功能开发中', level: 2 })).toBeVisible()
    await expect(page.getByText('该功能正在开发，暂不可用。')).toBeVisible()
    await expect(page.getByRole('link', { name: '查看标准页面' })).toHaveCount(0)
    await expect(page.getByText(/Feature|PRD|Page Specification/u)).toHaveCount(0)
  })

  test('does not register Reference routes in the production bundle', async ({ page }) => {
    await page.goto('/reference/list')
    await expect(page.getByRole('heading', { name: '页面未找到', level: 1 })).toBeVisible()
  })

  test('skips a placeholder first menu and never falls back to a module prefix', async ({
    page,
  }) => {
    await page.goto('/platform/dashboard')

    await page.getByRole('link', { name: 'TMS 运输管理', exact: true }).click()
    await expect(page).toHaveURL(/\/tms\/overview$/)

    await page.getByRole('link', { name: 'VMS 车辆管理', exact: true }).click()
    await expect(page).toHaveURL(/\/tms\/overview$/)
    await expect(page.getByText('VMS 车辆管理 暂无可用菜单')).toBeVisible()
  })
})
