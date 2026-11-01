import { expect, test } from '@playwright/test'
import { previewHost } from './helpers/testServers'

test('deleted parent closes value management and offers a working list refresh', async ({
  page,
}) => {
  await page.goto(`${previewHost}/?preview=iam-dictionary-management&scenario=parent-deleted`)
  await page.getByRole('button', { name: 'TRANSPORT_MODE', exact: true }).click()
  const missing = page.getByRole('dialog', { name: '字典值', exact: true })
  await expect(missing.getByText('字典不存在或已删除', { exact: true })).toBeVisible()
  await expect(missing.getByRole('button', { name: '新增字典值', exact: true })).toHaveCount(0)
  await missing.getByRole('button', { name: '关闭并刷新字典列表', exact: true }).click()
  await expect(missing).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'TRANSPORT_MODE', exact: true })).toHaveCount(0)
})
