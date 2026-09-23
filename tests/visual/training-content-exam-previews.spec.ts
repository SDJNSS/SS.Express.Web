import { expect, test } from '@playwright/test'

const previewHost = 'http://127.0.0.1:4174'

const candidatePages = [
  { id: 'training-course-management', heading: '课程管理' },
  { id: 'training-question-bank', heading: '题库管理' },
  { id: 'training-paper-management', heading: '试卷管理' },
  { id: 'training-exam-configuration', heading: '考试配置管理' },
] as const

test.describe('Training resources and exam rules candidates', () => {
  test('renders all four canonical previews without business requests or overflow', async ({
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

    for (const candidate of candidatePages) {
      await page.goto(`${previewHost}/?preview=${candidate.id}&capture=1`)
      await expect(page.locator(`[data-preview-id="${candidate.id}"]`)).toHaveAttribute(
        'data-preview-source',
        'canonical-feature',
      )
      await expect(page.getByRole('heading', { level: 1, name: candidate.heading })).toBeVisible()
      await expect(page.getByText('当前 Tenant', { exact: false }).first()).toBeVisible()

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

  test('covers course detail, locked editing, copy and duration validation', async ({ page }, testInfo) => {
    await page.goto(`${previewHost}/?preview=training-course-management&capture=1`)
    await page.getByRole('button', { name: '危化品道路运输安全基础' }).click()
    await expect(page.getByRole('heading', { name: /课程详情/ })).toBeVisible()
    await expect(page.getByText('内容已锁定')).toBeVisible()
    await page.keyboard.press('Escape')

    const firstRow = page.locator('.el-table__row').first()
    await expect(firstRow.getByRole('button', { name: '编辑' })).toBeDisabled()
    await firstRow.getByRole('button', { name: '复制' }).click()
    await expect(page.getByRole('heading', { name: '复制课程' })).toBeVisible()
    await expect(page.getByText('复用原视频引用')).toBeVisible()
    await page.getByRole('button', { name: '取消' }).click()

    await page.getByRole('button', { name: '新建课程' }).click()
    await expect(page.getByRole('heading', { name: '新建课程' })).toBeVisible()
    await expect(page.getByText('视频时长与计划学习时长必须相同且大于 0')).toBeVisible()
    await expect(page.getByRole('button', { name: '创建草稿' })).toBeDisabled()
    await page.screenshot({ path: testInfo.outputPath(`training-course-form-${testInfo.project.name}.png`), animations: 'disabled' })
  })

  test('guards question type switching and exposes answer structure', async ({ page }, testInfo) => {
    await page.goto(`${previewHost}/?preview=training-question-bank&capture=1`)
    await page.getByRole('button', { name: '新建题目' }).click()
    await expect(page.getByRole('heading', { name: '新建题目' })).toBeVisible()
    await page.locator('.el-radio-button').filter({ hasText: '多选题' }).click()
    await expect(page.getByRole('heading', { name: '切换题型并重置选项？' })).toBeVisible()
    await expect(page.getByText('当前选项与正确答案将清空')).toBeVisible()
    await page.getByRole('button', { name: '确认切换' }).click()
    await expect(page.getByText('至少 3 个选项、至少 2 个正确答案')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`training-question-form-${testInfo.project.name}.png`), animations: 'disabled' })
  })

  test('covers fixed and random paper editing with real-time score validation', async ({ page }, testInfo) => {
    await page.goto(`${previewHost}/?preview=training-paper-management&capture=1`)
    await page.getByRole('button', { name: '新建试卷' }).click()
    await expect(page.getByRole('heading', { name: '新建试卷' })).toBeVisible()
    await expect(page.getByText('实时计算总分 / 目标总分')).toBeVisible()
    await page.locator('.el-radio-button').filter({ hasText: '随机组卷' }).click()
    await expect(page.getByRole('heading', { name: '切换组卷模式并清空配置？' })).toBeVisible()
    await page.getByRole('button', { name: '确认切换' }).click()
    await expect(page.getByText('随机抽题规则')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '可用题数' })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`training-paper-form-${testInfo.project.name}.png`), animations: 'disabled' })
  })

  test('covers exam configuration constraints and independent feedback switches', async ({
    page,
  }, testInfo) => {
    await page.goto(`${previewHost}/?preview=training-exam-configuration&capture=1`)
    await page.getByRole('button', { name: '新建考试配置' }).click()
    await expect(page.getByRole('heading', { name: '新建考试配置' })).toBeVisible()
    await expect(page.getByLabel('考试时长（秒）')).toHaveValue('3600')
    await expect(page.getByLabel('最大考试次数')).toHaveValue('1')
    await expect(page.getByText('两个开关相互独立，默认均关闭。')).toBeVisible()
    await expect(page.getByLabel('展示正确答案')).not.toBeChecked()
    await expect(page.getByLabel('展示答案解析')).not.toBeChecked()
    await page.screenshot({ path: testInfo.outputPath(`training-exam-form-${testInfo.project.name}.png`), animations: 'disabled' })
  })

  test('keeps loading, empty and retryable-error states explicit', async ({ page }) => {
    for (const scenario of ['loading', 'empty', 'retryable-error']) {
      await page.goto(
        `${previewHost}/?preview=training-course-management&capture=1&scenario=${scenario}`,
      )
      await expect(page.getByRole('heading', { level: 1, name: '课程管理' })).toBeVisible()
    }
    await expect(page.getByText('课程列表加载失败，筛选条件已保留')).toBeVisible()
    await page.getByRole('button', { name: '重新加载' }).click()
    await expect(page.getByRole('button', { name: '危化品道路运输安全基础' })).toBeVisible()
  })
})
