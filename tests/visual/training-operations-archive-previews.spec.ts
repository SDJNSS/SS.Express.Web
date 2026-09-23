import { expect, test } from '@playwright/test'

const previewHost = 'http://127.0.0.1:4174'
const candidatePages = [
  { id: 'training-operations-overview', heading: '培训概览' },
  { id: 'training-plan-management', heading: '培训计划' },
  { id: 'training-plan-detail', heading: '培训计划详情' },
  { id: 'training-task-detail', heading: '培训任务详情' },
  { id: 'training-employee-archives', heading: '员工培训档案' },
  { id: 'training-special-statistics', heading: '专项统计' },
] as const

test.describe('Training operations and archives candidates', () => {
  test('renders all canonical previews without business requests or horizontal overflow', async ({
    page,
  }, testInfo) => {
    const runtimeMessages: string[] = []
    const businessRequests: string[] = []
    page.on('pageerror', (error) => runtimeMessages.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning')
        runtimeMessages.push(`${message.type()}: ${message.text()}`)
    })
    page.on('request', (request) => {
      if (['fetch', 'xhr', 'websocket', 'eventsource'].includes(request.resourceType()))
        businessRequests.push(request.url())
    })

    for (const candidate of candidatePages) {
      await page.goto(`${previewHost}/?preview=${candidate.id}&capture=1`)
      await expect(page.locator(`[data-preview-id="${candidate.id}"]`)).toHaveAttribute(
        'data-preview-source',
        'canonical-feature',
      )
      await expect(page.getByRole('heading', { level: 1, name: candidate.heading })).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        ),
      ).toBe(false)
      await page.screenshot({
        path: testInfo.outputPath(`${candidate.id}-${testInfo.project.name}.png`),
        fullPage: true,
        animations: 'disabled',
      })
    }

    expect(businessRequests).toEqual([])
    expect(runtimeMessages).toEqual([])
  })

  test('navigates from plan to its tasks and then to task detail', async ({ page }) => {
    await page.goto(`${previewHost}/?preview=training-plan-management&capture=1`)
    await page.getByRole('button', { name: '2026 年度驾驶员安全培训计划' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '培训计划详情' })).toBeVisible()
    await page.getByRole('tab', { name: '计划员工' }).click()
    await expect(page.getByText('当前在计划').first()).toBeVisible()
    await page.getByRole('tab', { name: '计划与任务' }).click()
    await page.getByRole('button', { name: '2026 第三季度驾驶员安全培训' }).click()
    await expect(page.getByRole('heading', { level: 1, name: '培训任务详情' })).toBeVisible()
  })

  test('keeps annual and standing plans together and uses the standing-plan form rules', async ({
    page,
  }) => {
    await page.goto(`${previewHost}/?preview=training-plan-management&capture=1`)
    await expect(page.getByText('年度计划').first()).toBeVisible()
    await expect(page.getByText('常设计划').first()).toBeVisible()
    await expect(page.getByText(/长期有效/).first()).toBeVisible()

    await page.getByRole('button', { name: '新建计划' }).click()
    const drawer = page.getByRole('dialog', { name: '新建培训计划' })
    await drawer.getByText('常设计划', { exact: true }).click()
    await expect(drawer.getByText(/不设置年度、结束日期和月度\/季度频率/)).toBeVisible()
    await expect(drawer.getByLabel('计划年度')).toHaveCount(0)
    await expect(drawer.getByLabel('结束日期')).toHaveCount(0)
  })

  test('configures onboarding separately from long-running task completion', async ({ page }) => {
    await page.goto(`${previewHost}/?preview=training-plan-detail&capture=1`)
    await expect(page.getByText('新员工与返岗安全常设培训')).toBeVisible()
    await expect(page.getByText(/长期有效/).first()).toBeVisible()
    await expect(page.getByText('正在接收新人')).toBeVisible()
    await expect(page.getByText(/不补录启用前成员/)).toBeVisible()

    await page.getByRole('button', { name: '停止接收新人' }).click()
    const dialog = page.getByRole('dialog', { name: '停止接收新员工' })
    await expect(dialog.getByText(/已生成的员工执行轮次/)).toBeVisible()
    await dialog.getByRole('button', { name: '取消' }).click()

    await page.getByRole('button', { name: '新建培训任务' }).click()
    const taskDrawer = page.getByRole('dialog', { name: '在当前计划中新建任务' })
    await expect(taskDrawer.getByText('长期开放')).toBeVisible()
    await expect(taskDrawer.getByText(/没有截止时间，不产生逾期状态/)).toBeVisible()
  })

  test('shows execution rounds and protects return-to-work and admin completion actions', async ({
    page,
  }) => {
    await page.goto(`${previewHost}/?preview=training-task-detail&capture=1`)
    await expect(page.getByText('长期任务 · 无完成期限')).toBeVisible()
    await page.getByRole('tab', { name: /员工概况/ }).click()
    await expect(page.getByText('第 1 轮').first()).toBeVisible()
    await expect(page.getByText('第 2 轮').first()).toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: '赵安全' })).toContainText('管理员完成')

    await page.getByRole('button', { name: '安排返岗培训' }).click()
    const returnDrawer = page.getByRole('dialog', { name: '安排返岗培训' })
    await expect(returnDrawer.getByText(/每次安排都会创建新的独立执行轮次/)).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: '管理员完成', exact: true }).click()
    const completeDialog = page.getByRole('dialog', { name: '一键管理员完成' })
    await expect(completeDialog.getByText(/不会伪造课程学习记录、考试成绩/)).toBeVisible()
    await expect(completeDialog.getByRole('button', { name: '确认完成' })).toBeDisabled()
  })

  test('keeps task results read-only and exposes aggregate personnel drilldown', async ({
    page,
  }) => {
    await page.goto(`${previewHost}/?preview=training-task-detail&capture=1`)
    const examSection = page
      .locator('section.training-surface')
      .filter({ has: page.getByRole('heading', { name: '考试执行统计' }) })
    await examSection.getByRole('button', { name: '25', exact: true }).click()
    await expect(page.getByRole('heading', { name: /未考试人员/ })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('tab', { name: /员工概况/ }).click()
    await expect(page.getByRole('columnheader', { name: '已学习 / 课程' })).toBeVisible()
    await expect(page.getByRole('button', { name: /标记逾期|标记完成/ })).toHaveCount(0)
  })

  test('covers archive tabs and sensitive historical answer snapshot', async ({ page }) => {
    await page.goto(`${previewHost}/?preview=training-employee-archives&capture=1`)
    await page.getByRole('button', { name: '陈海峰' }).click()
    await page.getByRole('tab', { name: '考试历史' }).click()
    await page.getByRole('button', { name: '查看答题' }).first().click()
    await expect(page.getByRole('heading', { name: '历史考试答题快照' })).toBeVisible()
    await expect(page.getByText(/历史快照严格按考试提交时内容展示/)).toBeVisible()
  })

  test('keeps four statistics definitions separate and exports current tab scope', async ({
    page,
  }) => {
    await page.goto(`${previewHost}/?preview=training-special-statistics&capture=1`)
    await page.getByRole('tab', { name: '考试结果' }).click()
    await expect(page.getByText(/考试次数通过率/).first()).toBeVisible()
    await expect(page.getByText('首次通过', { exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '最终通过率' })).toBeVisible()
    await page.getByRole('button', { name: '导出当前统计' }).click()
    const exportDialog = page.getByRole('dialog', { name: '导出专项统计' })
    await expect(exportDialog.getByText('考试审计材料', { exact: true })).toBeVisible()
    await expect(exportDialog.getByText(/沿用当前页签筛选范围/)).toBeVisible()
  })

  test('keeps loading, empty and retryable error explicit', async ({ page }) => {
    for (const scenario of ['loading', 'empty', 'retryable-error']) {
      await page.goto(`${previewHost}/?preview=training-task-detail&capture=1&scenario=${scenario}`)
      await expect(page.getByRole('heading', { level: 1, name: '培训任务详情' })).toBeVisible()
    }
    await expect(page.getByText('任务详情加载失败')).toBeVisible()
    await page.getByRole('button', { name: '重新加载' }).click()
    await expect(page.getByText('课程学习统计')).toBeVisible()
  })
})
