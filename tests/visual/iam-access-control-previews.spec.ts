import { expect, test } from '@playwright/test'

const previewHost = 'http://127.0.0.1:4174'

const candidatePages = [
  { id: 'iam-role-management', heading: '角色管理' },
  { id: 'iam-role-function-permissions', heading: '角色功能权限' },
  { id: 'iam-user-function-permissions', heading: '用户角色与权限' },
  { id: 'iam-role-data-permissions', heading: '角色数据权限' },
  { id: 'iam-role-assignments', heading: '角色成员' },
] as const

test.describe('IAM role, resource and data permission candidates', () => {
  test('renders every PRD page from canonical isolated previews', async ({ page }, testInfo) => {
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

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(hasHorizontalOverflow).toBe(false)

      await page.screenshot({
        path: testInfo.outputPath(`${candidate.id}-${testInfo.project.name}.png`),
        fullPage: true,
        animations: 'disabled',
      })
    }

    expect(businessRequests).toEqual([])
    expect(runtimeMessages).toEqual([])
  })

  test('exposes the role creation workflow', async ({ page }, testInfo) => {
    await page.goto(`${previewHost}/?preview=iam-role-management&capture=1`)
    await page.getByRole('button', { name: '新建自定义角色' }).click()
    await expect(page.getByRole('heading', { name: '新建自定义角色' })).toBeVisible()
    await expect(page.getByLabel('角色编码')).toHaveCount(0)
    await expect(page.getByText('角色编码由系统自动生成')).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath(`iam-role-create-${testInfo.project.name}.png`),
      animations: 'disabled',
    })
  })

  test('supports Tenant role management while keeping user Function permissions read-only', async ({
    page,
  }) => {
    await page.goto(`${previewHost}/?preview=iam-user-function-permissions&capture=1`)

    await expect(page.getByRole('heading', { level: 1, name: '用户角色与权限' })).toBeVisible()
    await expect(page.getByText('HD00017 · 陆链华东运营中心', { exact: true })).toBeVisible()
    await expect(page.getByRole('combobox', { name: '当前 Tenant' })).toBeVisible()
    await page.getByRole('tab', { name: /角色/ }).click()
    await expect(page.getByRole('button', { name: '分配角色' })).toBeVisible()
    await page.getByRole('tab', { name: /Function/ }).click()

    const permissionPanel = page.locator('[data-function-permission-panel]')
    await expect(permissionPanel).toHaveAttribute('data-subject-type', 'member')
    await expect(permissionPanel).toHaveAttribute('data-can-edit', 'false')
    await expect(permissionPanel.locator('.el-checkbox:not(.is-disabled)')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /保存 Function 权限|取消更改/ })).toHaveCount(0)

    await page.locator('.permission-systems button').filter({ hasText: 'TMS' }).click()
    const viewOrderNode = page.locator('.el-tree-node__content').filter({ hasText: '查看订单' })
    await expect(viewOrderNode.getByText('tms.orders.view', { exact: true })).toHaveCount(0)
    await expect(viewOrderNode.locator('.permission-node > *')).toHaveCount(1)
    await viewOrderNode.click()
    const inspector = page.locator('.permission-inspector')
    await expect(inspector.getByText('来源角色', { exact: true })).toBeVisible()
    await expect(
      inspector.getByText('LL-HUADONG · dispatch_manager', { exact: true }),
    ).toBeVisible()
    await expect(inspector.getByText('LL-HUANAN · operation_auditor', { exact: true })).toHaveCount(
      0,
    )
  })

  test('keeps user Function loading, empty and retryable-error states explicit', async ({
    page,
  }) => {
    await page.goto(
      `${previewHost}/?preview=iam-user-function-permissions&capture=1&scenario=loading`,
    )
    await expect(page.getByText('正在加载权限资源', { exact: true })).toBeVisible()

    await page.goto(
      `${previewHost}/?preview=iam-user-function-permissions&capture=1&scenario=empty`,
    )
    await expect(
      page.getByText('该用户当前没有通过角色获得 Function 权限', { exact: true }),
    ).toBeVisible()

    await page.goto(
      `${previewHost}/?preview=iam-user-function-permissions&capture=1&scenario=retryable-error`,
    )
    await expect(page.getByText('权限树加载失败', { exact: true })).toBeVisible()
    await page
      .locator('[data-function-permission-panel]')
      .getByRole('button', { name: '重新加载' })
      .click()
    await expect(page.locator('.permission-tree')).toBeVisible()
  })

  test('exposes permission replacement, safe data scope and atomic assignment flows', async ({
    page,
  }, testInfo) => {
    await page.goto(`${previewHost}/?preview=iam-role-function-permissions&capture=1`)
    await page.locator('.permission-systems button').filter({ hasText: 'TMS' }).click()
    const viewOrderNode = page.locator('.el-tree-node__content').filter({ hasText: '查看订单' })
    await viewOrderNode.locator('.el-checkbox__inner').click()
    const savePermissions = page.getByRole('button', { name: '保存功能权限' })
    await expect(savePermissions).toBeEnabled()
    await savePermissions.click()
    await expect(page.getByRole('heading', { name: '保存功能权限' })).toBeVisible()

    await page.goto(`${previewHost}/?preview=iam-role-data-permissions&capture=1`)
    await page.getByRole('button', { name: '配置' }).first().click()
    await expect(page.getByRole('heading', { name: '配置 运输任务 数据范围' })).toBeVisible()
    await page.locator('.el-radio').filter({ hasText: '指定 Tenant' }).click()
    await expect(page.getByRole('combobox', { name: '指定 Tenant' })).toBeVisible()
    await expect(page.getByRole('button', { name: '保存数据范围' }).last()).toBeDisabled()
    await page.screenshot({
      path: testInfo.outputPath(`iam-role-data-custom-${testInfo.project.name}.png`),
      animations: 'disabled',
    })

    await page.goto(`${previewHost}/?preview=iam-role-assignments&capture=1`)
    await expect(page.getByText('按成员查看', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '详情', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '添加成员' }).click()
    await expect(page.getByRole('heading', { name: /向 调度经理 添加成员/ })).toBeVisible()
    await page.getByRole('combobox', { name: 'Tenant 成员' }).click()
    await page.getByText('沈拓 · HD00041', { exact: true }).click()
    await expect(page.getByLabel('成员版本')).toBeDisabled()
    await expect(page.getByText('一次添加一名当前有效的 Tenant 成员')).toBeVisible()
  })

  test('supports explicit parent bulk selection and tree expansion controls', async ({ page }) => {
    await page.goto(`${previewHost}/?preview=iam-role-function-permissions&capture=1`)
    await page.locator('.permission-systems button').filter({ hasText: 'TMS' }).click()

    await page.getByRole('button', { name: '收起全部' }).click()
    await expect(page.locator('.permission-tree .el-tree-node.is-expanded')).toHaveCount(0)
    await page.getByRole('button', { name: '展开全部' }).click()
    await expect
      .poll(() => page.locator('.permission-tree .el-tree-node.is-expanded').count())
      .toBeGreaterThan(1)

    const treeContents = page.locator('.permission-tree .el-tree-node__content')
    const moduleNode = treeContents.filter({ hasText: '运输调度' }).first()
    const viewNode = treeContents.filter({ hasText: '查看订单' }).first()
    const resourceName = viewNode.locator('.permission-node > span')
    await expect(resourceName).toHaveText(
      '查看订单、运输全程轨迹、签收凭证、费用明细与异常处置完整详情',
    )
    await expect(viewNode.getByText('tms.orders.view', { exact: true })).toHaveCount(0)
    await expect(viewNode.locator('.permission-node > *')).toHaveCount(1)
    await expect(
      page.locator('[data-function-permission-panel]').getByText('精确授权', { exact: true }),
    ).toHaveCount(0)
    await expect(resourceName).toHaveCSS('white-space', 'normal')
    await expect(resourceName).toHaveCSS('overflow', 'visible')
    expect(
      await resourceName.evaluate(
        (element) =>
          element.scrollWidth <= element.clientWidth + 1 &&
          element.scrollHeight <= element.clientHeight + 1,
      ),
    ).toBe(true)
    await moduleNode.locator('.el-checkbox__inner').click()
    await expect(viewNode.locator('.el-checkbox')).toHaveClass(/is-checked/)

    await viewNode.locator('.el-checkbox__inner').click()
    await expect(viewNode.locator('.el-checkbox')).not.toHaveClass(/is-checked/)
    await expect(moduleNode.locator('.el-checkbox')).toHaveClass(/is-checked/)
  })

  test('searches role and member resource trees by API Path fragments', async ({ page }) => {
    await page.goto(`${previewHost}/?preview=iam-role-function-permissions&capture=1`)
    const rolePanel = page.locator('[data-function-permission-panel]')
    const roleSearch = rolePanel.getByRole('textbox', { name: '搜索资源树' })

    await roleSearch.fill('savefunctionpermissions')
    await expect(rolePanel.getByText('保存功能权限', { exact: true })).toBeVisible()
    await expect(rolePanel.getByText('角色管理', { exact: true })).toBeVisible()

    await roleSearch.fill('不存在的接口路径')
    await expect(rolePanel.getByText('当前 App 中未找到匹配资源', { exact: true })).toBeVisible()
    await rolePanel.getByRole('button', { name: '清空搜索' }).click()
    await expect(rolePanel.getByText('保存功能权限', { exact: true })).toBeVisible()

    await rolePanel.locator('.permission-systems button').filter({ hasText: 'TMS' }).click()
    await roleSearch.fill('查看订单')
    await rolePanel
      .locator('.el-tree-node__content')
      .filter({ hasText: '运输调度' })
      .first()
      .locator('.el-checkbox__inner')
      .click()
    await roleSearch.clear()
    await expect(
      rolePanel
        .locator('.el-tree-node__content')
        .filter({ hasText: '导出订单' })
        .locator('.el-checkbox'),
    ).toHaveClass(/is-checked/)
    await expect(
      rolePanel
        .locator('.el-tree-node__content')
        .filter({ hasText: '订单查询接口' })
        .locator('.el-checkbox'),
    ).toHaveClass(/is-checked/)

    await page.goto(`${previewHost}/?preview=iam-user-function-permissions&capture=1`)
    await page.getByRole('tab', { name: /Function/ }).click()
    const memberPanel = page.locator('[data-function-permission-panel]')
    await memberPanel.getByRole('textbox', { name: '搜索资源树' }).fill('SAVEFUNCTIONPERMISSIONS')
    await expect(memberPanel.getByText('保存功能权限', { exact: true })).toBeVisible()
    await expect(memberPanel).toHaveAttribute('data-can-edit', 'false')
  })

  test('keeps loading, empty and retryable-error states explicit and recoverable', async ({
    page,
  }) => {
    for (const scenario of ['loading', 'empty', 'retryable-error']) {
      await page.goto(
        `${previewHost}/?preview=iam-role-data-permissions&capture=1&scenario=${scenario}`,
      )
      await expect(page.getByRole('heading', { level: 1, name: '角色数据权限' })).toBeVisible()
    }

    await expect(page.getByText('数据权限加载失败')).toBeVisible()
    await page.getByRole('button', { name: '重新加载' }).click()
    await expect(page.getByText('运输任务', { exact: true }).first()).toBeVisible()
  })
})
