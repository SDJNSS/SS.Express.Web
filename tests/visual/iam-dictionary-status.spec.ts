import { expect, test, type Page } from '@playwright/test'
import { previewHost } from './helpers/testServers'

const url = (scenario = 'ready') =>
  `${previewHost}/?preview=iam-dictionary-management&scenario=${scenario}`
async function confirm(page: Page, name: string, action: string) {
  await page
    .getByRole('dialog', { name, exact: true })
    .getByRole('button', { name: `确认${action}`, exact: true })
    .click()
}

test('parent status is independent; all records remain manageable and item enable does not enable parent', async ({
  page,
}) => {
  await page.goto(url())
  const parent = page.locator('.el-table__row').filter({ hasText: 'TRANSPORT_MODE' })
  await parent.getByRole('button', { name: '停用', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '停用字典？', exact: true })
  await expect(dialog.getByRole('button', { name: '确认停用', exact: true })).toHaveAttribute(
    'data-resource-code',
    'IAM.DICTIONARIES.DISABLE',
  )
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  await expect(parent.getByRole('button', { name: '停用', exact: true })).toBeVisible()
  await parent.getByRole('button', { name: '停用', exact: true }).click()
  await confirm(page, '停用字典？', '停用')
  await expect(parent.getByRole('button', { name: '启用', exact: true })).toHaveAttribute(
    'data-resource-code',
    'IAM.DICTIONARIES.ENABLE',
  )
  await parent.getByRole('button', { name: 'TRANSPORT_MODE', exact: true }).click()
  const values = page.getByRole('dialog', { name: '字典值', exact: true })
  await expect(values.getByText('字典已停用', { exact: true })).toBeVisible()
  await expect(values.locator('.el-table__row')).toHaveCount(20)
  const first = values
    .locator('.el-table__row')
    .filter({ hasText: 'VALUE_1' })
    .filter({ has: page.getByText('VALUE_1', { exact: true }) })
  const second = values
    .locator('.el-table__row')
    .filter({ has: page.getByText('VALUE_2', { exact: true }) })
  await expect(first.getByRole('button', { name: '停用', exact: true })).toBeVisible()
  await expect(first.getByText('不可用', { exact: true })).toBeVisible()
  await second.getByRole('button', { name: '启用', exact: true }).click()
  const enableItem = page.getByRole('dialog', { name: '启用字典值？', exact: true })
  await expect(enableItem).toContainText('父字典仍停用')
  await expect(enableItem.getByRole('button', { name: '确认启用', exact: true })).toHaveAttribute(
    'data-resource-code',
    'IAM.DICTIONARIES.ENABLE_ITEM',
  )
  await confirm(page, '启用字典值？', '启用')
  await expect(second.getByRole('button', { name: '停用', exact: true })).toBeVisible()
  await expect(second.getByText('不可用', { exact: true })).toBeVisible()
  // Keep a separately disabled value while re-enabling the parent.
  await second.getByRole('button', { name: '停用', exact: true }).click()
  await confirm(page, '停用字典值？', '停用')
  await values
    .locator('.el-form-item')
    .filter({ hasText: '字典值状态' })
    .locator('.el-select__wrapper')
    .click()
  await page.getByRole('option', { name: '启用', exact: true }).click()
  await values.getByRole('button', { name: '查询', exact: true }).click()
  await expect(values.locator('.el-table__row')).toHaveCount(0)
  await values.getByRole('button', { name: '重置', exact: true }).click()
  await expect(values.locator('.el-table__row')).toHaveCount(20)
  await expect(values.locator('.el-loading-mask:visible')).toHaveCount(0)
  await values.locator('.el-scrollbar__wrap').evaluateAll((elements) =>
    elements.forEach((element) => {
      element.scrollLeft = 0
    }),
  )
  await page.screenshot({
    path: `UIDesign/candidates/iam-dictionary-management/disabled-${test.info().project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await values.getByRole('button', { name: '关闭此对话框' }).click()
  await parent.getByRole('button', { name: '启用', exact: true }).click()
  await confirm(page, '启用字典？', '启用')
  await parent.getByRole('button', { name: 'TRANSPORT_MODE', exact: true }).click()
  await expect(first.getByText('可用', { exact: true })).toBeVisible()
  await expect(second.getByRole('button', { name: '启用', exact: true })).toBeVisible()
  await expect(second.getByText('不可用', { exact: true })).toBeVisible()
})

test('enable/disable permissions are independent, and conflict does not report success', async ({
  page,
}) => {
  await page.goto(url('no-disable'))
  await expect(page.getByRole('button', { name: '停用', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'TRANSPORT_MODE', exact: true }).click()
  const values = page.getByRole('dialog', { name: '字典值', exact: true })
  await expect(values.getByRole('button', { name: '启用', exact: true }).first()).toBeVisible()
  await expect(values.getByRole('button', { name: '停用', exact: true })).toHaveCount(0)
  await page.goto(url('no-enable'))
  const row = page.locator('.el-table__row').filter({ hasText: 'TRANSPORT_MODE' })
  await row.getByRole('button', { name: '停用', exact: true }).click()
  await confirm(page, '停用字典？', '停用')
  await expect(row.getByRole('button', { name: '启用', exact: true })).toHaveCount(0)
  await page.goto(url('version-conflict'))
  await row.getByRole('button', { name: '停用', exact: true }).click()
  await confirm(page, '停用字典？', '停用')
  const dialog = page.getByRole('dialog', { name: '停用字典？', exact: true })
  await expect(dialog.getByText(/数据已被其他人修改/)).toBeVisible()
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  await expect(row.getByRole('button', { name: '停用', exact: true })).toBeVisible()
})

test('unknown status results cannot replay; explicit refresh and state filters preserve the record', async ({
  page,
}) => {
  await page.goto(url('status-unknown'))
  const row = page.locator('.el-table__row').filter({ hasText: 'TRANSPORT_MODE' })
  await row.getByRole('button', { name: '停用', exact: true }).click()
  await confirm(page, '停用字典？', '停用')
  const dialog = page.getByRole('dialog', { name: '停用字典？', exact: true })
  await expect(dialog.getByRole('button', { name: '确认停用', exact: true })).toBeDisabled()
  await expect(dialog.getByText(/已阻止重复提交/)).toBeVisible()
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  await page.getByRole('button', { name: '刷新数据', exact: true }).click()
  await expect(row.getByRole('button', { name: '启用', exact: true })).toBeVisible()
  await page
    .locator('.el-form-item')
    .filter({ hasText: '字典状态' })
    .locator('.el-select__wrapper')
    .click()
  await page.getByRole('option', { name: '停用', exact: true }).click()
  await page.getByRole('button', { name: '查询', exact: true }).click()
  await expect(page.locator('.el-table__row')).toHaveCount(1)
  await page.getByRole('button', { name: '重置', exact: true }).click()
  await expect(page.locator('.el-table__row')).toHaveCount(4)
})
