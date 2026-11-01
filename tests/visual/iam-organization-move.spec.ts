import { expect, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

test('organization move selects parent and nested targets by numeric organization ID', async ({
  page,
}, testInfo) => {
  await useAuthenticatedSession(page)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  const moves: Record<string, unknown>[] = []
  let queryCount = 0
  const organization = (id: number, name: string, parentId = 0) => ({
    id,
    tenant_id: 1,
    parent_id: parentId,
    org_code: `ORG-${id}`,
    org_name: name,
    org_type: '职能部门',
    status: 'ACTIVE',
    active_member_count: 0,
    version: '63924168279218660',
    children: [],
  })
  await page.route('**/api/iam-admin/Organization/Query', async (route) => {
    queryCount += 1
    await route.fulfill({
      json: {
        is_success: true,
        status: 'success',
        code: 1,
        message: '',
        data: {
          total: 2,
          page_index: 1,
          page_size: 1000,
          items: [
            organization(501, '待调整组织'),
            {
              ...organization(601, '目标运营中心'),
              children: [organization(602, '目标业务小组', 601)],
            },
          ],
        },
      },
    })
  })
  await page.route('**/api/iam-admin/Organization/Move', async (route) => {
    moves.push(route.request().postDataJSON() as Record<string, unknown>)
    await route.fulfill({
      json: { is_success: true, status: 'success', code: 1, message: '', data: {} },
    })
  })

  await page.goto('/iam/organizations')
  await expect(page).toHaveURL(/\/iam\/organizations$/)
  await expect(page).toHaveTitle(/组织管理/)
  await expect(page.getByRole('heading', { name: '待调整组织', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '调整层级', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '调整组织层级', exact: true })
  const parentField = drawer.locator('.el-form-item').filter({ hasText: '新的上级组织' })
  const parentInput = parentField.locator('.el-select__wrapper')

  await parentInput.click()
  const popup = page.locator('.el-popper.el-tree-select__popper:visible')
  await popup.getByText('目标运营中心', { exact: true }).click()
  await expect(parentField.locator('.el-select__placeholder')).toHaveText('目标运营中心')
  await expect(popup).toBeHidden()

  // Nodes with children remain selectable; the arrow independently expands descendants.
  await parentInput.click()
  const targetNode = popup.locator('.el-tree-node__content').filter({ hasText: '目标运营中心' })
  if (
    !(await targetNode.locator('.el-tree-node__expand-icon').getAttribute('class'))?.includes(
      'expanded',
    )
  ) {
    await targetNode.locator('.el-tree-node__expand-icon').click()
  }
  await popup.getByText('目标业务小组', { exact: true }).click()
  await expect(parentField.locator('.el-select__placeholder')).toHaveText('目标业务小组')
  await expect(popup).toBeHidden()

  await parentInput.click()
  await parentField.getByRole('combobox').press('Escape')
  await expect(popup).toBeHidden()
  await expect(drawer).toBeVisible()
  await expect(parentField.locator('.el-select__placeholder')).toHaveText('目标业务小组')
  await page.screenshot({
    path: join(tmpdir(), `ss-express-organization-move-${testInfo.project.name}.png`),
  })

  await drawer.getByRole('button', { name: '确认移动', exact: true }).click()
  await expect.poll(() => moves.length).toBe(1)
  expect(moves[0]).toEqual({ id: 501, version: '63924168279218660', new_parent_id: 602 })
  await expect(drawer).toBeHidden()
  await expect.poll(() => queryCount).toBe(2)
  expect(pageErrors).toEqual([])
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
})
