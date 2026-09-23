import { expect, test } from '@playwright/test'

const previewHost = 'http://127.0.0.1:4174'

const candidatePages = [
  { id: 'iam-group-profile', heading: '集团信息' },
  { id: 'iam-tenant-management', heading: 'Tenant 管理' },
  { id: 'iam-organization-management', heading: '组织管理' },
  { id: 'iam-position-management', heading: '岗位管理' },
  { id: 'iam-membership-management', heading: '用户与成员' },
  { id: 'iam-tenant-context', heading: '选择要进入的 Tenant' },
] as const

test.describe('IAM organization identity and tenant foundation candidates', () => {
  test('renders all PRD page tasks from canonical feature previews', async ({ page }, testInfo) => {
    const runtimeMessages: string[] = []
    const businessRequests: string[] = []

    page.on('pageerror', (error) => runtimeMessages.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        runtimeMessages.push(`${message.type()}: ${message.text()}`)
      }
    })
    page.on('request', (request) => {
      if (['fetch', 'xhr', 'websocket', 'eventsource'].includes(request.resourceType())) {
        businessRequests.push(request.url())
      }
    })

    for (const candidate of candidatePages) {
      await page.goto(`${previewHost}/?preview=${candidate.id}&capture=1`)
      await expect(page.locator(`[data-preview-id="${candidate.id}"]`)).toHaveAttribute(
        'data-preview-source',
        'canonical-feature',
      )
      await expect(page.getByRole('heading', { level: 1, name: candidate.heading })).toBeVisible()
      await page.screenshot({
        path: testInfo.outputPath(`${candidate.id}-${testInfo.project.name}.png`),
        fullPage: true,
        animations: 'disabled',
      })
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(hasHorizontalOverflow).toBe(false)
    }

    expect(businessRequests).toEqual([])
    expect(runtimeMessages).toEqual([])
  })

  test('supports the candidate CRUD and context interactions without production side effects', async ({
    page,
  }, testInfo) => {
    await page.goto(`${previewHost}/?preview=iam-group-profile&capture=1`)
    await page.getByRole('button', { name: '编辑集团信息' }).click()
    await expect(page.getByRole('heading', { name: '编辑集团信息' })).toBeVisible()
    await expect(page.getByLabel('集团编码')).toBeDisabled()
    await expect(page.getByText('支持 PNG、JPEG、WebP')).toBeVisible()
    await expect(page.locator('input[type="file"]')).toHaveCount(1)
    await page.screenshot({
      path: testInfo.outputPath(`iam-group-profile-edit-${testInfo.project.name}.png`),
      animations: 'disabled',
    })

    await page.goto(`${previewHost}/?preview=iam-tenant-management&capture=1`)
    await page.getByRole('button', { name: 'HMXTSD' }).click()
    await expect(page.getByText('联系与访问标识')).toBeVisible()
    await expect(page.getByText('hmxtsd.ss-express.cn')).toBeVisible()
    await page.getByRole('button', { name: '关闭' }).click()
    await page.getByRole('button', { name: '创建 Tenant' }).click()
    await expect(page.getByLabel('域名', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Tenant Logo')).toBeVisible()
    await expect(page.getByText('首名管理员', { exact: true })).toBeVisible()
    await expect(page.getByText('Tenant 编码将在创建成功后由系统自动生成')).toBeVisible()
    await page.getByLabel('Tenant 名称', { exact: true }).fill('预览新租户')
    await page
      .locator('.el-form-item')
      .filter({ hasText: 'Tenant 类型' })
      .locator('.el-select__wrapper')
      .click()
    await page.getByRole('option', { name: '企业租户', exact: true }).click()
    await page.getByRole('button', { name: '下一步' }).click()
    await expect(page.getByText('本流程不采集初始密码', { exact: false })).toBeVisible()
    await expect(page.getByLabel('成员用户类型')).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath(`iam-tenant-create-admin-${testInfo.project.name}.png`),
      animations: 'disabled',
    })

    await page.goto(`${previewHost}/?preview=iam-organization-management&capture=1`)
    await page.getByRole('button', { name: '调整层级' }).click()
    await expect(page.getByText('移动将作用于当前组织及其完整子树')).toBeVisible()

    await page.goto(`${previewHost}/?preview=iam-position-management&capture=1`)
    await page.getByRole('button', { name: '新建岗位' }).click()
    await expect(page.getByText('岗位编码将在创建成功后由系统自动生成')).toBeVisible()
    await expect(page.getByLabel('岗位编码')).toHaveCount(0)

    await page.goto(`${previewHost}/?preview=iam-membership-management&capture=1`)
    await expect(page.getByRole('heading', { name: '身份数据范围' })).toHaveCount(0)
    await expect(page.getByText('当前 Tenant', { exact: true })).toHaveCount(0)
    await expect(page.getByLabel('查询对象')).toHaveCount(0)
    await expect(page.getByLabel('Tenant', { exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '手机号' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '邮箱' })).toBeVisible()
    await expect(page.getByRole('button', { name: '更多', exact: true })).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: '角色与权限', exact: true }).first(),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: '数据权限', exact: true })).toHaveCount(0)
    const actionGrid = page
      .locator('.el-table .row-action-grid')
      .filter({ hasText: '详情' })
      .first()
    const actionLayout = await actionGrid.evaluate((element) => {
      return {
        columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
        rowGap: getComputedStyle(element).rowGap,
      }
    })
    expect(actionLayout.columns).toBe(3)
    expect(actionLayout.rowGap).toBe('0px')
    await page.getByRole('button', { name: '编辑用户' }).first().click()
    const editUserDrawer = page.getByRole('dialog', { name: '编辑全局用户' })
    await expect(editUserDrawer).toBeVisible()
    const versionToken = editUserDrawer.getByLabel('版本令牌', { exact: true })
    await expect(versionToken).toBeDisabled()
    await expect(versionToken).toHaveValue('9')
    await expect(editUserDrawer.getByLabel('用户 ID', { exact: true })).toBeDisabled()
    for (const field of [
      '登录账号',
      '姓名',
      '昵称',
      '手机号',
      '邮箱',
      '用户类型',
      '头像',
      '管理备注',
    ]) {
      await expect(editUserDrawer.getByLabel(field, { exact: true })).toBeEnabled()
    }
    await page.screenshot({
      path: testInfo.outputPath(`iam-membership-edit-user-${testInfo.project.name}.png`),
      animations: 'disabled',
    })
    await editUserDrawer.getByRole('button', { name: '取消' }).click()
    await page.getByRole('button', { name: '新增 Tenant 成员' }).click()
    await expect(page.getByText('本流程不采集、生成或提交初始密码')).toBeVisible()
    await page.getByLabel('登录账号', { exact: true }).fill('preview.member')
    await page.getByLabel('姓名', { exact: true }).fill('预览成员')
    await page.getByRole('button', { name: '下一步' }).click()
    await expect(page.getByLabel('初始组织（可多选）')).toBeVisible()
    await expect(page.getByLabel('初始岗位（可多选）')).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath(`iam-membership-create-${testInfo.project.name}.png`),
      animations: 'disabled',
    })

    await page.goto(`${previewHost}/?preview=iam-tenant-context&capture=1`)
    const enterButton = page.getByRole('button', { name: '进入 Tenant' })
    await expect(enterButton).toBeDisabled()
    await page.getByRole('radio', { name: /陆链华东运营中心/ }).click()
    await expect(enterButton).toBeEnabled()

    await page.goto(`${previewHost}/?preview=iam-tenant-context&capture=1&scenario=tenant-switch`)
    await expect(page.getByRole('heading', { name: '切换当前 Tenant' })).toBeVisible()
    await expect(page.getByText('当前 Tenant 上下文保持可用')).toBeVisible()
  })

  test('defaults the Tenant multi-select to every option and allows an empty query', async ({
    page,
  }) => {
    await page.goto(`${previewHost}/?preview=iam-membership-management&capture=1`)
    const tenantSelect = page.getByLabel('Tenant', { exact: true })
    const optionNames = [
      '汉明巡天山东 · HMXTSD',
      '陆链华东运营中心 · LL-HUADONG',
      '陆链华南运营中心 · LL-HUANAN',
    ]
    await tenantSelect.press('ArrowDown')
    for (const name of optionNames) {
      await expect(page.getByRole('option', { name })).toHaveAttribute('aria-selected', 'true')
    }
    for (const name of optionNames) {
      await page.getByRole('option', { name }).click()
    }
    await page.keyboard.press('Escape')

    const queryButton = page.getByRole('button', { name: '查询', exact: true })
    await expect(queryButton).toBeEnabled()
    await queryButton.click()
    await expect(page.locator('p.sr-only[role="status"]')).toContainText('用户与成员查询条件已生效')

    await page.getByRole('button', { name: '重置', exact: true }).click()
    await tenantSelect.press('ArrowDown')
    for (const name of optionNames) {
      await expect(page.getByRole('option', { name })).toHaveAttribute('aria-selected', 'true')
    }
  })

  test('exposes stable loading, empty and retryable failure states', async ({ page }) => {
    for (const scenario of ['loading', 'empty', 'retryable-error']) {
      await page.goto(`${previewHost}/?preview=iam-tenant-context&capture=1&scenario=${scenario}`)
      await expect(page.locator('[data-tenant-choice-mode="select"]')).toBeVisible()
    }

    await expect(page.getByText('可用 Tenant 加载失败')).toBeVisible()
    await page.getByRole('button', { name: '重新加载' }).click()
    await expect(page.getByRole('radio', { name: /汉明巡天山东/ })).toBeVisible()
  })
})
