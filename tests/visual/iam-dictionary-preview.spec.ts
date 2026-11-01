import { expect, test } from '@playwright/test'
import { previewHost } from './helpers/testServers'

const url = (scenario = 'ready') =>
  `${previewHost}/?preview=iam-dictionary-management&scenario=${scenario}`

test('dictionary code/name open values with independent paging; no real API calls and compact viewport', async ({
  page,
}) => {
  const apiCalls: string[] = [],
    errors: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiCalls.push(request.url())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(url())
  await expect(page.getByRole('heading', { name: '字典管理', exact: true })).toBeVisible()
  await expect(page.locator('.el-table__row')).toHaveCount(4)
  await expect(page.locator('.el-loading-mask:visible')).toHaveCount(0)
  await page.screenshot({
    path: `UIDesign/candidates/iam-dictionary-management/list-${test.info().project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'TRANSPORT_MODE', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '字典值', exact: true })
  await expect(drawer.getByRole('heading', { name: '运输方式', exact: true })).toBeVisible()
  await expect(drawer.locator('.el-table__row')).toHaveCount(20)
  await expect(
    drawer.getByText('未设置', { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible()
  await expect(
    drawer.getByText('false', { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible()
  await expect(drawer.locator('.el-loading-mask:visible')).toHaveCount(0)
  await page.screenshot({
    path: `UIDesign/candidates/iam-dictionary-management/values-${test.info().project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await drawer.getByRole('button', { name: '下一页', exact: true }).click()
  await expect(drawer.locator('.el-table__row')).toHaveCount(5)
  await drawer.getByLabel('字典值关键词', { exact: true }).fill('VALUE_25')
  await drawer.getByRole('button', { name: '查询', exact: true }).click()
  await expect(drawer.locator('.el-table__row')).toHaveCount(1)
  await drawer.getByRole('button', { name: '关闭此对话框' }).click()
  await page.getByRole('button', { name: '课程类型', exact: true }).click()
  await expect(drawer.getByRole('heading', { name: '课程类型', exact: true })).toBeVisible()
  await expect(drawer.locator('.el-table__row')).toHaveCount(3)
  await drawer.getByRole('button', { name: '关闭此对话框' }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect(apiCalls).toEqual([])
  expect(errors).toEqual([])
})

test('dictionary/value maintenance, stable read-only codes, JSON and dirty cancellation', async ({
  page,
}) => {
  await page.goto(url())
  await page.getByRole('button', { name: '新建字典', exact: true }).click()
  const form = page.getByRole('dialog', { name: '新建字典', exact: true })
  await expect(form.getByLabel('字典编码', { exact: true })).toBeEmpty()
  await form.getByLabel('字典编码', { exact: true }).fill('TEST_DICTIONARY')
  await form.getByLabel('字典名称', { exact: true }).fill('验证字典')
  await form.getByRole('button', { name: '取消', exact: true }).click()
  const discard = page.getByRole('dialog', { name: '放弃未保存的修改？' })
  await discard.getByRole('button', { name: '继续编辑', exact: true }).click()
  await expect(form.getByLabel('字典名称', { exact: true })).toHaveValue('验证字典')
  await form.getByRole('button', { name: '保存', exact: true }).click()
  await expect(form).not.toBeVisible()
  await page.getByRole('button', { name: '验证字典', exact: true }).click()
  const values = page.getByRole('dialog', { name: '字典值', exact: true })
  await values.getByRole('button', { name: '新增字典值', exact: true }).click()
  const item = page.getByRole('dialog', { name: '新增字典值', exact: true })
  await item.getByLabel('字典值编码', { exact: true }).fill('FIRST')
  await item.getByLabel('字典值名称', { exact: true }).fill('第一项')
  await item.getByLabel('扩展数据（JSON，可选）', { exact: true }).fill('false')
  await item.getByRole('button', { name: '保存', exact: true }).click()
  await expect(item).not.toBeVisible()
  await expect(values.getByText('false', { exact: true })).toBeVisible()
  await values.getByRole('button', { name: '编辑', exact: true }).click()
  const editItem = page.getByRole('dialog', { name: '编辑字典值', exact: true })
  await expect(editItem.getByLabel('字典值编码', { exact: true })).toHaveAttribute('readonly')
  await expect(editItem.getByLabel('扩展数据（JSON，可选）', { exact: true })).toHaveValue('false')
  await editItem.getByLabel('字典值名称', { exact: true }).fill('更新项')
  await editItem.getByRole('button', { name: '保存', exact: true }).click()
  await expect(values.getByText('更新项', { exact: true })).toBeVisible()
  await expect(values.getByRole('button', { name: '删除', exact: true })).toHaveCount(0)
  await values.getByRole('button', { name: '停用', exact: true }).click()
  const disableItem = page.getByRole('dialog', { name: '停用字典值？', exact: true })
  await disableItem.getByRole('button', { name: '确认停用', exact: true }).click()
  await expect(values.locator('.el-table__row')).toHaveCount(1)
  await values.getByRole('button', { name: '启用', exact: true }).click()
  await page
    .getByRole('dialog', { name: '启用字典值？', exact: true })
    .getByRole('button', { name: '确认启用', exact: true })
    .click()
  await values.getByRole('button', { name: '关闭此对话框' }).click()
  const row = page.locator('.el-table__row').filter({ hasText: 'TEST_DICTIONARY' })
  await row.getByRole('button', { name: '编辑', exact: true }).click()
  const edit = page.getByRole('dialog', { name: '编辑字典', exact: true })
  await expect(edit.getByLabel('字典编码', { exact: true })).toHaveAttribute('readonly')
  await edit.getByLabel('字典名称', { exact: true }).fill('修订字典')
  await edit.getByRole('button', { name: '保存', exact: true }).click()
  await expect(row).toContainText('修订字典')
  await expect(row.getByRole('button', { name: '删除', exact: true })).toHaveCount(0)
  await row.getByRole('button', { name: '停用', exact: true }).click()
  const disable = page.getByRole('dialog', { name: '停用字典？', exact: true })
  await expect(disable).toContainText('不会删除数据')
  await disable.getByRole('button', { name: '确认停用', exact: true }).click()
  await expect(row.getByRole('button', { name: '启用', exact: true })).toBeVisible()
  await row.getByRole('button', { name: '启用', exact: true }).click()
  await page
    .getByRole('dialog', { name: '启用字典？', exact: true })
    .getByRole('button', { name: '确认启用', exact: true })
    .click()
  await expect(row.getByRole('button', { name: '停用', exact: true })).toBeVisible()
})

test('exact code and fuzzy name filters reset; error and empty are distinguishable', async ({
  page,
}) => {
  await page.goto(url('retryable-error'))
  await expect(page.getByText('字典列表暂时加载失败，请重试', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '重新加载', exact: true }).click()
  await expect(page.locator('.el-table__row')).toHaveCount(4)
  await page.getByLabel('字典编码', { exact: true }).fill(' transport_mode ')
  await page.getByRole('button', { name: '查询', exact: true }).click()
  await expect(page.locator('.el-table__row')).toHaveCount(1)
  await page.getByRole('button', { name: '重置', exact: true }).click()
  await page.getByLabel('字典名称 / 关键词', { exact: true }).fill('课程')
  await page.getByRole('button', { name: '查询', exact: true }).click()
  await expect(page.locator('.el-table__row')).toHaveCount(1)
  await page.goto(url('empty'))
  await expect(page.locator('.el-table__row')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '新建字典', exact: true })).toBeVisible()
})

test('initial values are staged atomically and duplicate keys preserve both drafts', async ({
  page,
}) => {
  await page.goto(url('empty'))
  await page.getByRole('button', { name: '新建字典', exact: true }).click()
  const form = page.getByRole('dialog', { name: '新建字典', exact: true })
  await form.getByLabel('字典编码', { exact: true }).fill('ATOMIC')
  await form.getByLabel('字典名称', { exact: true }).fill('原子创建验证')
  const item = page.getByRole('dialog', { name: '编辑初始字典值', exact: true })
  await form.getByRole('button', { name: '添加初始值', exact: true }).click()
  await item.getByLabel('字典值编码', { exact: true }).fill('FIRST')
  await item.getByLabel('字典值名称', { exact: true }).fill('第一个')
  await item.getByLabel('扩展数据（JSON，可选）', { exact: true }).fill('{invalid}')
  await item.getByRole('button', { name: '保存', exact: true }).click()
  await expect(item.getByText('扩展数据不是有效的 JSON', { exact: true })).toBeVisible()
  await item.getByLabel('扩展数据（JSON，可选）', { exact: true }).fill('0')
  await item.getByRole('button', { name: '保存', exact: true }).click()
  await expect(item).not.toBeVisible()
  await form.getByRole('button', { name: '添加初始值', exact: true }).click()
  await item.getByLabel('字典值编码', { exact: true }).fill('first')
  await item.getByLabel('字典值名称', { exact: true }).fill('重复编码')
  await item.getByRole('button', { name: '保存', exact: true }).click()
  await expect(item.getByText(/初始字典值编码重复/)).toBeVisible()
  await item.getByLabel('字典值编码', { exact: true }).fill('SECOND')
  await item.getByRole('button', { name: '保存', exact: true }).click()
  await expect(form.getByText('FIRST · 第一个', { exact: true })).toBeVisible()
  await expect(form.getByText('SECOND · 重复编码', { exact: true })).toBeVisible()
  await form.getByRole('button', { name: '保存', exact: true }).click()
  await page.getByRole('button', { name: '原子创建验证', exact: true }).click()
  const values = page.getByRole('dialog', { name: '字典值', exact: true })
  await expect(values.locator('.el-table__row')).toHaveCount(2)
  await expect(
    values.getByText('0', { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible()
})

test('page and action resource permissions keep the read-only view usable without write controls', async ({
  page,
}) => {
  await page.goto(url('missing-read'))
  await expect(page.getByText('缺少字典查询权限', { exact: true })).toBeVisible()
  await page.goto(url('read-only'))
  await expect(page.locator('.el-table__row')).toHaveCount(4)
  await expect(page.getByRole('button', { name: '新建字典', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '删除', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '启用', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '停用', exact: true })).toHaveCount(0)
})

test('version conflicts preserve edit draft and unknown create cannot replay', async ({ page }) => {
  await page.goto(url('version-conflict'))
  await page
    .locator('.el-table__row')
    .filter({ hasText: 'TRANSPORT_MODE' })
    .getByRole('button', { name: '编辑', exact: true })
    .click()
  const edit = page.getByRole('dialog', { name: '编辑字典', exact: true })
  await edit.getByLabel('字典名称', { exact: true }).fill('并发修改草稿')
  await edit.getByRole('button', { name: '保存', exact: true }).click()
  await expect(edit.getByText(/数据已被其他人修改/)).toBeVisible()
  await expect(edit.getByLabel('字典名称', { exact: true })).toHaveValue('并发修改草稿')
  await page.goto(url('unknown-result'))
  await page.getByRole('button', { name: '新建字典', exact: true }).click()
  const form = page.getByRole('dialog', { name: '新建字典', exact: true })
  await form.getByLabel('字典编码', { exact: true }).fill('UNKNOWN')
  await form.getByLabel('字典名称', { exact: true }).fill('结果核对')
  await form.getByRole('button', { name: '保存', exact: true }).click()
  await expect(form.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
  await form.getByRole('button', { name: '核对创建结果', exact: true }).click()
  await expect(form.getByText(/已查到相同编码的字典/)).toBeVisible()
})
