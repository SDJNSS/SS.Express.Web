import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test, type Locator, type Page } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

const success = (data: unknown) =>
  JSON.stringify({ data, is_success: true, status: 'success', message: '', code: 1 })

async function openCreate(page: Page) {
  await page.goto('/iam/tenants')
  await expect(page.getByRole('heading', { name: 'Tenant 管理', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '创建 Tenant', exact: true }).click()
  return page.getByRole('dialog', { name: '创建 Tenant', exact: true })
}

async function fillTenant(page: Page, drawer: Locator) {
  await drawer.getByLabel('Tenant 名称', { exact: true }).fill(' 南方测试租户 ')
  await drawer
    .locator('.el-form-item')
    .filter({ hasText: 'Tenant 类型' })
    .locator('.el-select__wrapper')
    .click()
  await page.getByRole('option', { name: '企业租户', exact: true }).click()
  await drawer.getByLabel('联系人', { exact: true }).fill('赵测试')
  await drawer.getByLabel('联系电话', { exact: true }).fill('13900001234')
  await drawer.getByLabel('联系邮箱', { exact: true }).fill('tenant@example.test')
  await drawer.getByLabel('域名', { exact: true }).fill('south.example.test')
  await drawer.getByLabel('子域名', { exact: true }).fill('south')
  await drawer.getByLabel('地址', { exact: true }).fill('南方测试路 8 号')
  await drawer.getByLabel('备注', { exact: true }).fill('租户备注来自实际输入')
}

async function fillMembership(drawer: Locator) {
  await expect(drawer.getByLabel('成员编号', { exact: true })).toHaveCount(0)
  await expect(drawer.getByLabel('Tenant 内显示名称', { exact: true })).toHaveCount(0)
  await drawer.getByLabel('有效开始时间', { exact: true }).fill('2026-09-01 00:00:00')
  await drawer.getByLabel('成员备注', { exact: true }).fill('成员备注来自实际输入')
}

test.describe('Tenant forms use user input rather than sample data', () => {
  test('starts blank, validates steps, submits an existing admin and resets after reopening', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    const requests: Record<string, unknown>[] = []
    await page.route('**/api/iam-admin/Tenant/Create', async (route) => {
      requests.push(route.request().postDataJSON())
      await route.fulfill({ contentType: 'application/json', body: success({ id: 2 }) })
    })
    const drawer = await openCreate(page)
    for (const label of [
      'Tenant 名称',
      '联系人',
      '联系电话',
      '联系邮箱',
      '域名',
      '子域名',
      '地址',
      '备注',
    ]) {
      await expect(drawer.getByLabel(label, { exact: true })).toHaveValue('')
    }
    await expect(drawer.getByLabel('Tenant 编码', { exact: true })).toHaveCount(0)
    await expect(drawer.getByText('Tenant 编码将在创建成功后由系统自动生成')).toBeVisible()
    await expect(drawer.getByText('企业名称', { exact: true })).toHaveCount(0)
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(drawer.getByText('请输入 Tenant 名称', { exact: true })).toBeVisible()
    expect(requests).toHaveLength(0)
    await fillTenant(page, drawer)
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    for (const label of [
      '完整登录账号',
      '有效开始时间',
      '有效结束时间',
      '成员备注',
    ]) {
      await expect(drawer.getByLabel(label, { exact: true })).toHaveValue('')
    }
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(drawer.getByText('请输入完整登录账号', { exact: true })).toBeVisible()
    await drawer.getByLabel('完整登录账号', { exact: true }).fill(' south.existing ')
    await fillMembership(drawer)
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    const review = drawer.locator('.tenant-review')
    await expect(review).toContainText('南方测试租户')
    await expect(review).toContainText('创建成功后由系统自动生成')
    await expect(review).toContainText('south.existing')
    await expect(review).not.toContainText('central.admin')
    await expect(review).not.toContainText('姓名 / 昵称')
    await drawer.getByRole('button', { name: '创建 Tenant', exact: true }).click()
    await expect(drawer).not.toBeVisible()
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({
      tenant_name: '南方测试租户',
      company_name: '南方测试租户',
      contact_name: '赵测试',
      contact_phone: '13900001234',
      domain: 'south.example.test',
      subdomain: 'south',
      initial_admin: {
        use_existing_user: true,
        existing_user_name: 'south.existing',
        is_tenant_admin: true,
      },
    })
    expect(requests[0]).not.toHaveProperty('tenant_code')
    expect(requests[0]?.initial_admin).not.toHaveProperty('new_user')
    expect(requests[0]?.initial_admin).not.toHaveProperty('tenant_user_code')
    expect(requests[0]?.initial_admin).not.toHaveProperty('display_name')
    await page.getByRole('button', { name: '创建 Tenant', exact: true }).click()
    await expect(drawer.getByLabel('Tenant 名称', { exact: true })).toHaveValue('')
    await expect(drawer.getByLabel('联系人', { exact: true })).toHaveValue('')
    await fillTenant(page, drawer)
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(drawer.getByLabel('完整登录账号', { exact: true })).toHaveValue('')
    await expect(drawer.getByLabel('成员编号', { exact: true })).toHaveCount(0)
    await drawer.getByRole('button', { name: '取消', exact: true }).click()
    const discardDialog = page.getByRole('dialog', { name: '放弃未保存的修改？' })
    await expect(discardDialog).toBeVisible()
    await discardDialog.getByRole('button', { name: '继续编辑', exact: true }).click()
    await expect(drawer).toBeVisible()
    await expect(drawer.getByLabel('Tenant 名称', { exact: true })).toHaveValue(' 南方测试租户 ')
    await drawer.getByRole('button', { name: '取消', exact: true }).click()
    await discardDialog.getByRole('button', { name: '放弃修改', exact: true }).click()
    await expect(drawer).not.toBeVisible()
    await page.getByRole('button', { name: '创建 Tenant', exact: true }).click()
    await expect(drawer.getByLabel('Tenant 编码', { exact: true })).toHaveCount(0)
    await expect(drawer.getByLabel('Tenant 名称', { exact: true })).toHaveValue('')
  })

  test('reviews real new-user values, updates after going back and retains data on failure', async ({
    page,
  }, testInfo) => {
    await useAuthenticatedSession(page)
    const runtimeErrors: string[] = []
    page.on('pageerror', (error) => runtimeErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning')
        runtimeErrors.push(message.text())
    })
    const requests: Record<string, unknown>[] = []
    await page.route('**/api/iam-admin/Tenant/Create', async (route) => {
      requests.push(route.request().postDataJSON())
      await route.fulfill({
        contentType: 'application/json',
        body:
          requests.length === 1
            ? JSON.stringify({
                data: null,
                is_success: false,
                status: 'error',
                message: '租户编码冲突，请修改后重试',
                code: 409,
              })
            : success({ id: 2 }),
      })
    })
    const drawer = await openCreate(page)
    await expect(page).toHaveURL(/\/iam\/tenants$/)
    await expect(page).not.toHaveTitle('')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    await fillTenant(page, drawer)
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    await drawer.getByLabel('完整登录账号', { exact: true }).fill('inactive.existing')
    await drawer.getByText('创建新用户', { exact: true }).click()
    for (const label of ['新用户登录账号', '姓名', '昵称', '手机号', '邮箱']) {
      await expect(drawer.getByLabel(label, { exact: true })).toHaveValue('')
    }
    await drawer.getByLabel('新用户登录账号', { exact: true }).fill(' south.new ')
    await drawer.getByLabel('姓名', { exact: true }).fill('测试管理员')
    await drawer.getByLabel('昵称', { exact: true }).fill('南方小管')
    await drawer.getByLabel('手机号', { exact: true }).fill('13800005678')
    await drawer.getByLabel('邮箱', { exact: true }).fill('admin@example.test')
    await fillMembership(drawer)
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    const review = drawer.locator('.tenant-review')
    for (const value of [
      '南方测试租户',
      '创建成功后由系统自动生成',
      '赵测试',
      '13900001234',
      'south.example.test',
      'south.new',
      '测试管理员',
      '南方小管',
      '13800005678',
      '由服务端按租户编码与成员 ID / 登录账号自动生成',
      '2026-09-01 00:00:00',
      '成员备注来自实际输入',
    ]) {
      await expect(review).toContainText(value)
    }
    await expect(review).not.toContainText('inactive.existing')
    await expect(review).not.toContainText('程远')
    await expect(review).not.toContainText('LL-CENTRAL')
    await expect(review).not.toContainText('企业 / 类型')
    await drawer.getByRole('button', { name: '上一步', exact: true }).click()
    await expect(drawer.getByLabel('新用户登录账号', { exact: true })).toHaveValue(' south.new ')
    await drawer.getByLabel('昵称', { exact: true }).fill('修改后的昵称')
    await drawer.getByRole('button', { name: '上一步', exact: true }).click()
    await drawer.getByLabel('Tenant 名称', { exact: true }).fill('最终租户名称')
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(review).toContainText('最终租户名称')
    await expect(review).toContainText('修改后的昵称')
    await expect(review).not.toContainText('南方小管')
    // The drawer owns scrolling; long review content must not push the footer outside the viewport.
    await review.locator('dd').last().scrollIntoViewIfNeeded()
    await expect(drawer.getByRole('button', { name: '创建 Tenant', exact: true })).toBeInViewport()
    await review.locator('dt').first().scrollIntoViewIfNeeded()
    await expect
      .poll(() => drawer.evaluate((element) => element.scrollWidth <= element.clientWidth))
      .toBe(true)
    await page.screenshot({
      path: join(tmpdir(), `ss-express-tenant-review-${testInfo.project.name}.png`),
      animations: 'disabled',
    })
    await drawer.getByRole('button', { name: '创建 Tenant', exact: true }).click()
    await expect(review.getByRole('alert').filter({ hasText: '租户编码冲突' })).toBeVisible()
    await expect(review).toContainText('最终租户名称')
    await drawer.getByRole('button', { name: '创建 Tenant', exact: true }).click()
    await expect(drawer).not.toBeVisible()
    expect(requests).toHaveLength(2)
    expect(requests[1]).toEqual(requests[0])
    expect(requests[1]).not.toHaveProperty('tenant_code')
    expect(requests[1]).toMatchObject({
      tenant_name: '最终租户名称',
      company_name: '最终租户名称',
      contact_email: 'tenant@example.test',
      address: '南方测试路 8 号',
      remarks: '租户备注来自实际输入',
      initial_admin: {
        use_existing_user: false,
        new_user: {
          user_name: 'south.new',
          real_name: '测试管理员',
          nick_name: '修改后的昵称',
          phone: '13800005678',
          email: 'admin@example.test',
        },
        effective_start: '2026-09-01 00:00:00',
        organizations: [],
        positions: [],
      },
    })
    expect(requests[1]?.initial_admin).not.toHaveProperty('existing_user_name')
    expect(runtimeErrors).toEqual([])
  })

  test('hides company on list and detail and derives it from the edited Tenant name', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    let saved: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/Tenant/Update', async (route) => {
      saved = route.request().postDataJSON()
      await route.fulfill({ contentType: 'application/json', body: success(saved) })
    })
    await page.goto('/iam/tenants')
    await expect(page.getByRole('columnheader', { name: '企业名称', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '详情', exact: true }).first().click()
    const detail = page.locator('.el-drawer:visible')
    await expect(detail.getByText('企业名称', { exact: true })).toHaveCount(0)
    await expect(detail.getByText('域名', { exact: true })).toBeVisible()
    await expect(detail.getByText('子域名', { exact: true })).toBeVisible()
    await detail.locator('.el-drawer__close-btn').click()
    await page.getByRole('button', { name: '编辑', exact: true }).first().click()
    const edit = page.locator('.el-drawer:visible')
    await expect(edit.getByLabel('企业名称', { exact: true })).toHaveCount(0)
    await edit.getByLabel('Tenant 名称', { exact: true }).fill(' 更新后的租户 ')
    await edit.getByLabel('域名', { exact: true }).fill('updated.example.test')
    await edit.getByLabel('子域名', { exact: true }).fill('updated')
    await edit.getByRole('button', { name: '保存 Tenant', exact: true }).click()
    await expect(edit).not.toBeVisible()
    expect(saved).toMatchObject({
      tenant_name: '更新后的租户',
      company_name: '更新后的租户',
      domain: 'updated.example.test',
      subdomain: 'updated',
    })
  })
})
