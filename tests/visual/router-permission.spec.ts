import { expect, test } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

test.describe('authenticated route outcomes', () => {
  test('sends an authenticated user without the hidden training Page permission to 403', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    await page.route('**/api/iam-admin/TrainingTask/Detail', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', code: 1, message: '', data: null }),
      }),
    )

    await page.goto('/iam/training/plans/10/tasks/20')

    await expect(page).toHaveURL(/\/forbidden\?from=/)
    await expect(page.getByRole('heading', { level: 1, name: '无权访问此页面' })).toBeVisible()
    await expect(page.getByText('原地址：/iam/training/plans/10/tasks/20')).toBeVisible()
    await expect(page).not.toHaveURL(/\/platform\/welcome/)
  })

  test('keeps an unknown authenticated route on the distinct 404 page', async ({ page }) => {
    await useAuthenticatedSession(page)

    await page.goto('/iam/route-that-does-not-exist')

    await expect(page).toHaveURL(/\/iam\/route-that-does-not-exist$/)
    await expect(page.getByRole('heading', { level: 1, name: '页面未找到' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: '无权访问此页面' })).toHaveCount(0)
    await expect(page).not.toHaveURL(/\/platform\/welcome/)
  })
})
