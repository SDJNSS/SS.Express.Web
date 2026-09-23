import { expect, test } from '@playwright/test'

const previewUrl = 'http://127.0.0.1:4174/?preview=iam-application-resources&capture=1'

test.describe('IAM application and permission resources candidate', () => {
  test('renders the canonical isolated preview without network or overflow', async ({
    page,
  }, testInfo) => {
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

    await page.goto(previewUrl)
    await expect(page.locator('[data-preview-id="iam-application-resources"]')).toHaveAttribute(
      'data-preview-source',
      'canonical-feature',
    )
    await expect(page.getByRole('heading', { level: 1, name: '应用与权限资源' })).toBeVisible()
    await expect(page.getByText('Module → Menu → Page / Function')).toBeVisible()
    await expect(page.getByText('运输订单', { exact: true }).last()).toBeVisible()
    await expect(page.getByText('tms:orders:view', { exact: true })).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
    expect(businessRequests).toEqual([])
    expect(runtimeMessages).toEqual([])

    await page.screenshot({
      path: testInfo.outputPath(`iam-application-resources-${testInfo.project.name}.png`),
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('covers App and typed resource forms using backend-owned fields', async ({
    page,
  }, testInfo) => {
    await page.goto(previewUrl)

    await page.getByRole('button', { name: '新增 App' }).click()
    await expect(page.getByRole('heading', { name: '新增 App' })).toBeVisible()
    await expect(page.getByLabel('App 编码')).toHaveCount(0)
    await expect(page.getByLabel('App 名称')).toBeEnabled()
    await expect(page.getByLabel('路由前缀')).toBeEnabled()
    await expect(page.getByLabel('初始状态')).toBeEnabled()
    await expect(page.getByText(/App 编码由服务端生成/)).toBeVisible()
    const createApp = page.getByRole('button', { name: '创建 App' })
    await expect(createApp).toBeDisabled()
    await page.getByLabel('App 名称').fill('仓储管理')
    await page.getByLabel('路由前缀').fill('/wms')
    await expect(createApp).toBeEnabled()
    await page.getByRole('button', { name: '取消' }).click()
    await expect(page.getByRole('heading', { name: '放弃未保存的 App 信息？' })).toBeVisible()
    await page.getByRole('button', { name: '放弃修改' }).click()

    await page.getByRole('button', { name: /运输管理.*TMS/ }).click()
    await page.getByRole('button', { name: '编辑 App' }).click()
    await expect(page.getByRole('heading', { name: '编辑 App · 运输管理' })).toBeVisible()
    await expect(page.getByLabel('当前状态')).toBeDisabled()
    await expect(page.getByText(/ID 2 · 版本/)).toBeVisible()
    await page.getByRole('button', { name: '取消' }).click()

    await page.getByRole('button', { name: '新增 Module' }).first().click()
    const moduleDialog = page.getByRole('dialog', { name: '新增 Module' })
    await expect(moduleDialog).toBeVisible()
    await expect(moduleDialog.getByRole('combobox', { name: '所属 App' })).toBeDisabled()
    await expect(moduleDialog.getByRole('combobox', { name: '资源类型' })).toBeDisabled()
    await expect(moduleDialog.getByLabel('父节点')).toBeDisabled()
    await expect(moduleDialog.getByLabel('资源编码')).toHaveCount(0)
    await expect(moduleDialog.getByText(/资源编码由服务端生成/)).toBeVisible()
    await expect(moduleDialog.getByLabel('展示排序')).toBeEnabled()
    await page.getByRole('button', { name: '取消' }).click()

    const dispatchNode = page.locator('.el-tree-node__content').filter({ hasText: '运输调度' })
    await dispatchNode.click()
    await page.getByRole('button', { name: '新增 Page / Function' }).click()
    const resourceDialog = page.locator('.el-drawer.open')
    await expect(resourceDialog.getByRole('heading', { name: '新增 Page' })).toBeVisible()
    await expect(resourceDialog).toBeVisible()
    await resourceDialog
      .locator('.el-form-item')
      .filter({ hasText: '资源类型' })
      .locator('.el-select')
      .click()
    await page.getByRole('option', { name: 'Function' }).click()
    await expect(resourceDialog.getByRole('heading', { name: '新增 Function' })).toBeVisible()
    await expect(resourceDialog.getByLabel('功能权限编码')).toBeEnabled()
    await expect(resourceDialog.getByRole('combobox', { name: '请求方式' })).toBeEnabled()
    await expect(resourceDialog.getByLabel('接口路径')).toBeEnabled()
    await expect(resourceDialog.getByLabel('路由地址')).toHaveCount(0)
    await page.screenshot({
      path: testInfo.outputPath(`iam-function-create-${testInfo.project.name}.png`),
      animations: 'disabled',
    })
  })

  test('keeps destructive actions blocked until authoritative impact exists', async ({ page }) => {
    await page.goto(previewUrl)
    await page.getByRole('button', { name: /运输管理.*TMS/ }).click()
    await page.getByRole('button', { name: '删除 App' }).click()
    await expect(page.getByRole('heading', { name: '删除 App' })).toBeVisible()
    await expect(page.getByText('后端尚未提供删除前角色授权影响接口')).toBeVisible()
    const deleteButton = page.getByRole('button', { name: '确认删除 App' })
    await expect(deleteButton).toBeDisabled()
    await page.getByLabel('请输入 TMS 确认删除').fill('TMS')
    await expect(page.getByText('编码已匹配；还需等待权威影响查询完成。')).toBeVisible()
    await expect(deleteButton).toBeDisabled()
  })

  test('shows explicit loading, empty, error, unauthorized and filter-empty states', async ({
    page,
  }) => {
    for (const [scenario, expected] of [
      ['loading', '刷新完整目录'],
      ['empty', '暂无 App'],
      ['retryable-error', '目录加载失败'],
      ['unauthorized', '无权访问应用与权限资源'],
      ['filter-empty', '无匹配结果'],
    ] as const) {
      await page.goto(`${previewUrl}&scenario=${scenario}`)
      await expect(page.getByText(expected, { exact: scenario !== 'loading' })).toBeVisible()
    }
  })

  test('searches the catalog by API Path fragments without losing its ancestors', async ({
    page,
  }) => {
    await page.goto(previewUrl)

    await page.getByRole('textbox', { name: '关键字' }).fill('createresource')
    await page.getByRole('button', { name: '查询' }).click()

    await expect(page.getByText('新增应用与资源', { exact: true })).toBeVisible()
    await expect(page.getByText('应用与权限资源', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('运输订单', { exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: '重置' }).click()
    await expect(page.getByRole('button', { name: /运输管理.*TMS/ })).toBeVisible()
  })
})
