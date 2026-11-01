import { expect, test, type Page } from '@playwright/test'
import { previewHost } from './helpers/testServers'
import { useAuthenticatedSession } from './helpers/authenticatedSession'

const successResponse = (data: unknown) =>
  JSON.stringify({ is_success: true, code: 1, status: 'success', message: '', data })
const stamp = '2026-10-23T10:00:00.1234567'
const savedPaper = (mode: 'FIXED' | 'RANDOM') => ({
  id: 50,
  status: 'ACTIVE',
  paper_name: '最终题集试卷',
  paper_mode: mode,
  total_score: 100,
  random_question_order: false,
  random_option_order: false,
  question_count: 2,
  is_configuration_valid: true,
  configuration_invalid_reason: '',
  groups: [{ question_type: 'SINGLE_CHOICE', count: 2, total_score: 100, question_score: 50 }],
  updated_at: stamp,
  created_at: stamp,
  created_by: '管理员',
  updated_by: '管理员',
  questions: [50, 50].map((score, i) => ({
    id: i + 1,
    question_id: 100 + i,
    question_type: 'SINGLE_CHOICE',
    question_text: `已保存题目 ${i}`,
    question_status: 'DISABLED',
    question_score: score,
    sort_order: i + 1,
    question_updated_at: stamp,
  })),
})

for (const mode of ['FIXED', 'RANDOM'] as const) {
  test(`saved ${mode} final set is restored with precise versions and never redrawn on edit or save`, async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    await page.addInitScript(() => window.sessionStorage.setItem('login_user_id', '1001'))
    const calls: Array<{ action: string; body: Record<string, unknown> }> = []
    const record = savedPaper(mode)
    await page.route('**/api/iam-admin/Training*/**', async (route) => {
      const action = new URL(route.request().url()).pathname.split('/iam-admin/')[1]!
      const body = route.request().postDataJSON()
      calls.push({ action, body })
      const data =
        action.endsWith('Detail') || action.endsWith('Update')
          ? record
          : action.startsWith('TrainingQuestion')
            ? { items: [], total: 0 }
            : { items: [record], total: 1 }
      await route.fulfill({ contentType: 'application/json', body: successResponse(data) })
    })
    await page.goto('/iam/training/papers')
    await page
      .locator('.el-table__row')
      .first()
      .getByRole('button', { name: '编辑', exact: true })
      .click()
    const form = page.getByRole('dialog', { name: /编辑试卷/ })
    await form.getByLabel('试卷名称', { exact: true }).fill('仅修改名称')
    await expect(group(page, '单选题').getByText('每题 50 分')).toBeVisible()
    if (mode === 'RANDOM') {
      const rule = form.locator('tbody tr').filter({ hasText: '单选题' }).first()
      await expect(rule.getByRole('spinbutton').nth(0)).toHaveValue('2')
    }
    await form.getByRole('button', { name: '保存修改', exact: true }).click()
    await expect(form).not.toBeVisible()
    const sent = calls.findLast((c) => c.action === 'TrainingPaper/Update')!.body
    expect(sent.updated_at).toBe(stamp)
    expect(sent.paper_mode).toBe(mode)
    expect(sent.questions).toEqual(
      [100, 101].map((id, index) => ({
        question_id: id,
        question_score: 50,
        sort_order: index + 1,
        question_type: 'SINGLE_CHOICE',
        question_updated_at: stamp,
      })),
    )
    expect(sent).not.toHaveProperty('fixed_questions')
    expect(calls.some((c) => c.action.includes('GeneratePreview'))).toBe(false)
  })
}

test('picker query errors are scoped, retry recovers; closing at a short viewport preserves the parent form', async ({
  page,
}, info) => {
  await useAuthenticatedSession(page)
  await page.addInitScript(() => window.sessionStorage.setItem('login_user_id', '1001'))
  let failed = true
  await page.route('**/api/iam-admin/Training*/**', async (route) => {
    const body = route.request().postDataJSON()
    if (route.request().url().includes('TrainingQuestion') && body.page_size === 20 && failed)
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ is_success: false, code: 403, message: '选题查询被拒绝' }),
      })
    await route.fulfill({
      contentType: 'application/json',
      body: successResponse({ items: [], total: 0 }),
    })
  })
  await page.goto('/iam/training/papers')
  await page.getByRole('button', { name: '新建试卷', exact: true }).click()
  const form = page.getByRole('dialog', { name: '新建试卷', exact: true })
  await form.getByLabel('试卷名称', { exact: true }).fill('保留草稿内容')
  await form.getByRole('button', { name: '选择题目', exact: true }).click()
  await expect(picker(page).getByText('选题查询被拒绝', { exact: true })).toBeVisible()
  await expect(picker(page).getByRole('button', { name: '确认选题' })).toBeDisabled()
  failed = false
  await picker(page).getByRole('button', { name: '重新加载题目' }).click()
  await expect(picker(page).getByText('选题查询被拒绝', { exact: true })).not.toBeVisible()
  await page.setViewportSize({ width: info.project.use.viewport!.width, height: 500 })
  await expect(picker(page).getByRole('button', { name: '确认选题' })).toBeInViewport()
  await page.keyboard.press('Escape')
  await expect(picker(page)).not.toBeVisible()
  await expect(form.getByLabel('试卷名称', { exact: true })).toHaveValue('保留草稿内容')
  await expect(form.getByRole('button', { name: '创建草稿' })).toBeInViewport()
})

async function openPaper(page: Page) {
  await page.goto(`${previewHost}/?preview=training-paper-management&capture=1`)
  await expect(page).toHaveTitle('试卷管理 · UI Design')
  await page.getByRole('button', { name: '新建试卷', exact: true }).click()
  return page.getByRole('dialog', { name: '新建试卷', exact: true })
}
const group = (page: Page, name: string) =>
  page.getByRole('region', { name: `${name}分组`, exact: true })
const picker = (page: Page) => page.getByRole('dialog', { name: '选择题目', exact: true })

test('question ID is visible and a multiple choice question accepts one but not zero correct answers', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${previewHost}/?preview=training-question-bank&capture=1`)
  await expect(page.getByRole('columnheader', { name: '题目 ID' })).toBeVisible()
  await page.getByRole('button', { name: '新建题目', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '新建题目', exact: true })
  await drawer.locator('.el-radio-button').filter({ hasText: '多选题' }).click()
  await page.getByRole('button', { name: '确认切换', exact: true }).click()
  await drawer.getByLabel('题干', { exact: true }).fill('多选题允许一个正确答案')
  for (const [index, input] of (
    await drawer.getByPlaceholder('选项内容', { exact: true }).all()
  ).entries())
    await input.fill(`选项 ${index}`)
  await expect(drawer.getByRole('button', { name: '创建草稿' })).toBeEnabled()
  await drawer.getByRole('checkbox').first().locator('..').click()
  await expect(drawer.getByRole('button', { name: '创建草稿' })).toBeDisabled()
  await drawer.getByRole('checkbox').nth(1).locator('..').click()
  await expect(drawer.getByRole('button', { name: '创建草稿' })).toBeEnabled()
  expect(errors).toEqual([])
})

test('picker retains checks across pages, tabs and reopening; cancel preserves the form and keyboard closes only the top drawer', async ({
  page,
}, info) => {
  const calls: string[] = [],
    errors: string[] = []
  page.on('request', (r) => {
    if (['xhr', 'fetch'].includes(r.resourceType())) calls.push(r.url())
  })
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  const form = await openPaper(page)
  await form.getByRole('button', { name: '选择题目', exact: true }).click()
  await picker(page)
    .getByRole('checkbox', { name: '选择题目 2101', exact: true })
    .locator('..')
    .click()
  await page.screenshot({
    path: `UIDesign/candidates/training-paper-selection-20261024/picker-${info.project.name}.png`,
    animations: 'disabled',
  })
  await picker(page).locator('.el-pager li.number').filter({ hasText: /^2$/ }).click()
  await picker(page).getByRole('checkbox').first().locator('..').click()
  await picker(page).getByRole('tab', { name: '多选题', exact: true }).click()
  await picker(page)
    .getByRole('checkbox', { name: '选择题目 2102', exact: true })
    .locator('..')
    .click()
  await picker(page).getByRole('tab', { name: '单选题', exact: true }).click()
  await expect(picker(page).getByRole('checkbox').first()).toBeChecked()
  await picker(page).getByRole('button', { name: '确认选题', exact: true }).click()
  await expect(form.getByText('已选题目 · 3 题')).toBeVisible()
  await form.getByRole('button', { name: '选择题目', exact: true }).click()
  await expect(picker(page).getByRole('checkbox').first()).toBeChecked()
  await picker(page).getByRole('checkbox').first().locator('..').click()
  await page.keyboard.press('Escape')
  await page
    .getByRole('dialog', { name: '放弃未保存的修改？', exact: true })
    .getByRole('button', { name: '放弃修改', exact: true })
    .click()
  await expect(picker(page)).not.toBeVisible()
  await expect(form).toBeVisible()
  await expect(form.getByText('已选题目 · 3 题')).toBeVisible()
  await form.getByRole('button', { name: '选择题目', exact: true }).click()
  await expect(picker(page).getByRole('checkbox').first()).toBeChecked()
  await picker(page).getByRole('tab', { name: '判断题', exact: true }).click()
  await picker(page).getByRole('textbox', { name: '题干关键词' }).fill('不存在')
  await picker(page).getByRole('textbox', { name: '题干关键词' }).press('Enter')
  await expect(picker(page).locator('.el-table__row')).toHaveCount(0)
  await page.screenshot({ path: info.outputPath('picker-empty.png'), animations: 'disabled' })
  expect(calls).toEqual([])
  expect(errors).toEqual([])
})

test('group scores divide to cents and cross-type replacement clears only affected totals', async ({
  page,
}, info) => {
  const form = await openPaper(page)
  await form.getByLabel('试卷名称', { exact: true }).fill('精确计分检查')
  await form.getByLabel('目标总分', { exact: true }).fill('9.99')
  await form.getByRole('button', { name: '选择题目', exact: true }).click()
  for (const id of [2101, 2200, 2201])
    await picker(page)
      .getByRole('checkbox', { name: `选择题目 ${id}`, exact: true })
      .locator('..')
      .click()
  await picker(page).getByRole('button', { name: '确认选题' }).click()
  await group(page, '单选题')
    .getByRole('spinbutton', { name: '单选题总分', exact: true })
    .fill('10')
  await expect(group(page, '单选题').getByRole('alert')).toBeVisible()
  await expect(form.getByRole('button', { name: '创建草稿' })).toBeDisabled()
  await group(page, '单选题')
    .getByRole('spinbutton', { name: '单选题总分', exact: true })
    .fill('9.99')
  await expect(group(page, '单选题').getByText('每题 3.33 分')).toBeVisible()
  await expect(form.getByRole('button', { name: '创建草稿' })).toBeEnabled()
  const replaceButton = group(page, '单选题').getByRole('button', {
    name: '替换题目 2200',
    exact: true,
  })
  await expect(replaceButton).toHaveAttribute(
    'data-resource-element',
    'iam.training.papers.createOptions',
  )
  await replaceButton.click()
  const replacement = page.getByRole('dialog', { name: '替换题目', exact: true })
  await expect(
    replacement.getByRole('checkbox', { name: '选择题目 2101', exact: true }),
  ).toBeChecked()
  await expect(
    replacement.getByRole('checkbox', { name: '选择题目 2101', exact: true }),
  ).toBeDisabled()
  await replacement.getByRole('tab', { name: '多选题', exact: true }).click()
  await replacement
    .getByRole('checkbox', { name: '选择题目 2102', exact: true })
    .locator('..')
    .click()
  await replacement.getByRole('button', { name: '确认选题' }).click()
  await expect(group(page, '单选题').getByRole('spinbutton')).toHaveValue('')
  await expect(group(page, '多选题').getByRole('spinbutton')).toHaveValue('')
  await expect(form.getByText('已选题目 · 3 题')).toBeVisible()
  await expect(form.getByRole('button', { name: '创建草稿' })).toBeDisabled()
  await group(page, '单选题').getByRole('spinbutton').fill('6.66')
  await group(page, '多选题').getByRole('spinbutton').fill('3.33')
  await page.screenshot({ path: info.outputPath('paper-groups.png'), animations: 'disabled' })
  await expect(form.getByRole('button', { name: '创建草稿' })).toBeEnabled()
  await form.getByRole('button', { name: '创建草稿' }).click()
  await expect(page.getByRole('dialog', { name: /试卷详情/ })).toBeVisible()
  await expect(
    page.getByRole('dialog', { name: /试卷详情/ }).getByRole('cell', { name: '3.33', exact: true }),
  ).toHaveCount(3)
})

test('random preview is adjusted in place, counts change across types and candidate save retains the final set', async ({
  page,
}, info) => {
  const form = await openPaper(page)
  await form.getByLabel('试卷名称', { exact: true }).fill('随机预览最终题集')
  await form.locator('.el-radio-button').filter({ hasText: '随机组卷' }).click()
  await page.getByRole('button', { name: '确认切换', exact: true }).click()
  const row = form.locator('tbody tr').filter({ hasText: '单选题' }).first()
  await row.getByRole('spinbutton').nth(0).fill('2')
  await row.getByRole('spinbutton').nth(1).fill('100')
  await form.getByRole('button', { name: '组卷预览', exact: true }).click()
  await expect(form.getByText('已选题目 · 2 题')).toBeVisible()
  await group(page, '单选题').getByRole('button', { name: '替换题目 2200', exact: true }).click()
  const replacement = page.getByRole('dialog', { name: '替换题目', exact: true })
  await replacement.getByRole('tab', { name: '多选题', exact: true }).click()
  await replacement
    .getByRole('checkbox', { name: '选择题目 2102', exact: true })
    .locator('..')
    .click()
  await replacement.getByRole('button', { name: '确认选题' }).click()
  const rules = form.locator('table').first()
  await expect(
    rules.locator('tbody tr').filter({ hasText: '单选题' }).getByRole('spinbutton').first(),
  ).toHaveValue('1')
  await expect(
    rules.locator('tbody tr').filter({ hasText: '多选题' }).getByRole('spinbutton').first(),
  ).toHaveValue('1')
  await group(page, '单选题').getByRole('spinbutton').fill('50')
  await group(page, '多选题').getByRole('spinbutton').fill('50')
  await page.screenshot({ path: info.outputPath('random-adjusted.png'), animations: 'disabled' })
  await form.getByRole('button', { name: '创建草稿' }).click()
  const detail = page.getByRole('dialog', { name: /试卷详情/ })
  await expect(detail).toBeVisible()
  await expect(
    detail.getByRole('cell', {
      name: '发现制动系统存在异常时，驾驶员可以采取哪些措施？',
      exact: true,
    }),
  ).toBeVisible()
  await expect(detail.getByRole('cell', { name: '50', exact: true })).toHaveCount(2)
})

test('production picker sends type/filter/page, ignores stale results, saves explicit IDs and retains server errors', async ({
  page,
}) => {
  await useAuthenticatedSession(page)
  await page.addInitScript(() => window.sessionStorage.setItem('login_user_id', '1001'))
  const calls: Array<{ action: string; body: Record<string, unknown> }> = []
  const success = (data: unknown) =>
    JSON.stringify({ is_success: true, code: 1, status: 'success', message: '', data })
  const candidates = Array.from({ length: 25 }, (_, i) => ({
    id: i + 100,
    question_type: 'SINGLE_CHOICE',
    question_text: `正式候选 ${i}`,
    status: 'ACTIVE',
    updated_at: '2026-10-23T10:00:00.1234567',
  }))
  await page.route('**/api/iam-admin/Training*/**', async (route) => {
    const action = new URL(route.request().url()).pathname.split('/iam-admin/')[1]!
    const body = route.request().postDataJSON()
    calls.push({ action, body })
    if (action === 'TrainingPaper/Create')
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ is_success: false, code: 409, message: '测试并发冲突' }),
      })
    if (action === 'TrainingPaper/Query')
      return route.fulfill({
        contentType: 'application/json',
        body: success({ items: [], total: 0 }),
      })
    expect(action).toBe('TrainingQuestion/Query')
    if (body.keyword === '慢查询') await new Promise<void>((resolve) => setTimeout(resolve, 500))
    const matched = candidates.filter(
      (q) =>
        q.question_type === body.question_type &&
        (!body.keyword || q.question_text.includes(body.keyword)),
    )
    await route.fulfill({
      contentType: 'application/json',
      body: success({
        items: matched.slice(
          (body.page_index - 1) * body.page_size,
          body.page_index * body.page_size,
        ),
        total: matched.length,
      }),
    })
  })
  await page.goto('/iam/training/papers')
  await page.getByRole('button', { name: '新建试卷', exact: true }).click()
  const form = page.getByRole('dialog', { name: '新建试卷', exact: true })
  await form.getByLabel('试卷名称', { exact: true }).fill('正式固定卷')
  await form.getByRole('button', { name: '选择题目', exact: true }).click()
  await picker(page)
    .getByRole('checkbox', { name: '选择题目 100', exact: true })
    .locator('..')
    .click()
  await picker(page).locator('.el-pager li.number').filter({ hasText: /^2$/ }).click()
  await picker(page)
    .getByRole('checkbox', { name: '选择题目 120', exact: true })
    .locator('..')
    .click()
  expect(calls.findLast((c) => c.action === 'TrainingQuestion/Query')?.body).toMatchObject({
    status: 'ACTIVE',
    question_type: 'SINGLE_CHOICE',
    page_size: 20,
    page_index: 2,
  })
  await picker(page).getByRole('textbox', { name: '题干关键词' }).fill('慢查询')
  await picker(page).getByRole('textbox', { name: '题干关键词' }).press('Enter')
  await picker(page).getByRole('tab', { name: '多选题', exact: true }).click()
  await expect(picker(page).locator('.el-table__row')).toHaveCount(0)
  await expect(picker(page).getByText('加载中')).not.toBeVisible()
  await picker(page).getByRole('button', { name: '确认选题', exact: true }).click()
  await group(page, '单选题').getByRole('spinbutton').fill('100')
  await form.getByRole('button', { name: '创建草稿' }).click()
  await expect(form.getByText('测试并发冲突', { exact: true })).toBeVisible()
  expect(calls.find((c) => c.action === 'TrainingPaper/Create')?.body).toMatchObject({
    questions: [
      {
        question_id: 100,
        question_score: 50,
        sort_order: 1,
        question_type: 'SINGLE_CHOICE',
        question_updated_at: stamp,
      },
      {
        question_id: 120,
        question_score: 50,
        sort_order: 2,
        question_type: 'SINGLE_CHOICE',
        question_updated_at: stamp,
      },
    ],
  })
  await expect(form.getByLabel('试卷名称', { exact: true })).toHaveValue('正式固定卷')
  expect(calls.some((c) => c.action.includes('GeneratePreview'))).toBe(false)
})

test('production random preview persists the adjusted final set and exact versions without redrawing', async ({
  page,
}, info) => {
  await useAuthenticatedSession(page)
  await page.addInitScript(() => window.sessionStorage.setItem('login_user_id', '1001'))
  const calls: Array<{ action: string; body: Record<string, unknown> }> = []
  const record = savedPaper('RANDOM')
  let conflict = true
  await page.route('**/api/iam-admin/Training*/**', async (route) => {
    const action = new URL(route.request().url()).pathname.split('/iam-admin/')[1]!
    const body = route.request().postDataJSON()
    calls.push({ action, body })
    if (action === 'TrainingPaper/Create' && conflict)
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          is_success: false,
          code: 409,
          message: '题目版本已改变，请核对草稿',
        }),
      })
    const data =
      action === 'TrainingPaper/GeneratePreview'
        ? {
            paper_mode: 'RANDOM',
            total_score: 100,
            groups: record.groups,
            questions: record.questions.map((q) => ({ ...q, question_status: 'ACTIVE' })),
          }
        : action === 'TrainingQuestion/Query'
          ? {
              items:
                body.page_size === 1
                  ? []
                  : [
                      {
                        id: 201,
                        question_type: 'MULTIPLE_CHOICE',
                        question_text: '最终替换的多选题',
                        status: 'ACTIVE',
                        updated_at: stamp,
                      },
                    ],
              total: 10,
            }
          : action === 'TrainingPaper/Create'
            ? {
                ...record,
                paper_name: body.paper_name,
                questions: body.questions.map((q: { question_id: number }) => ({
                  ...q,
                  question_text: q.question_id === 201 ? '最终替换的多选题' : '已保存题目 0',
                  question_status: 'ACTIVE',
                })),
              }
            : { items: [], total: 0 }
    await route.fulfill({ contentType: 'application/json', body: successResponse(data) })
  })
  await page.goto('/iam/training/papers')
  await page.getByRole('button', { name: '新建试卷', exact: true }).click()
  const form = page.getByRole('dialog', { name: '新建试卷', exact: true })
  await form.getByLabel('试卷名称', { exact: true }).fill('正式随机最终题集')
  await form.locator('.el-radio-button').filter({ hasText: '随机组卷' }).click()
  await page.getByRole('button', { name: '确认切换', exact: true }).click()
  const rule = form.locator('tbody tr').filter({ hasText: '单选题' }).first()
  await rule.getByRole('spinbutton').nth(0).fill('2')
  await rule.getByRole('spinbutton').nth(1).fill('100')
  await form.getByRole('button', { name: '组卷预览', exact: true }).click()
  await expect(group(page, '单选题').getByText('每题 50 分')).toBeVisible()
  expect(calls.find((c) => c.action === 'TrainingPaper/GeneratePreview')?.body).toEqual({
    total_score: 100,
    groups: [
      { question_type: 'SINGLE_CHOICE', count: 2, total_score: 100 },
      { question_type: 'MULTIPLE_CHOICE', count: 0, total_score: null },
      { question_type: 'TRUE_FALSE', count: 0, total_score: null },
    ],
  })
  const replaceButton = group(page, '单选题').getByRole('button', {
    name: '替换题目 101',
    exact: true,
  })
  await expect(replaceButton).toHaveAttribute(
    'data-resource-element',
    'iam.training.papers.createOptions',
  )
  await replaceButton.click()
  const replacement = page.getByRole('dialog', { name: '替换题目', exact: true })
  await replacement.getByRole('tab', { name: '多选题', exact: true }).click()
  await replacement
    .getByRole('checkbox', { name: '选择题目 201', exact: true })
    .locator('..')
    .click()
  await replacement.getByRole('button', { name: '确认选题', exact: true }).click()
  await expect(group(page, '单选题').getByRole('spinbutton')).toHaveValue('')
  await expect(group(page, '多选题').getByRole('spinbutton')).toHaveValue('')
  await group(page, '单选题').getByRole('spinbutton').fill('40')
  await group(page, '多选题').getByRole('spinbutton').fill('60')
  await page.screenshot({
    path: info.outputPath('production-random-adjusted.png'),
    animations: 'disabled',
  })
  await form.getByRole('button', { name: '创建草稿', exact: true }).click()
  await expect(form.getByText('题目版本已改变，请核对草稿', { exact: true })).toBeVisible()
  await expect(group(page, '多选题').getByText('最终替换的多选题', { exact: true })).toBeVisible()
  await expect(group(page, '单选题').getByRole('spinbutton')).toHaveValue('40.00')
  const sent = calls.find((c) => c.action === 'TrainingPaper/Create')!.body
  expect(sent).toMatchObject({
    paper_mode: 'RANDOM',
    total_score: 100,
    questions: [
      {
        question_id: 100,
        question_type: 'SINGLE_CHOICE',
        question_score: 40,
        sort_order: 1,
        question_updated_at: stamp,
      },
      {
        question_id: 201,
        question_type: 'MULTIPLE_CHOICE',
        question_score: 60,
        sort_order: 2,
        question_updated_at: stamp,
      },
    ],
  })
  expect(sent).not.toHaveProperty('fixed_questions')
  expect(sent).not.toHaveProperty('single_choice_count')
  expect(calls.filter((c) => c.action === 'TrainingPaper/Create')).toHaveLength(1)
  conflict = false
  await form.getByRole('button', { name: '创建草稿', exact: true }).click()
  const detail = page.getByRole('dialog', { name: /试卷详情/ })
  await expect(detail).toBeVisible()
  await expect(detail.getByRole('cell', { name: '最终替换的多选题', exact: true })).toBeVisible()
  await expect(detail.getByRole('cell', { name: '60', exact: true })).toBeVisible()
  expect(calls.filter((c) => c.action === 'TrainingPaper/GeneratePreview')).toHaveLength(1)
})

test('production preview failure retains rules; a pending retry can be cancelled without changing the next draft', async ({
  page,
}) => {
  await useAuthenticatedSession(page)
  await page.addInitScript(() => window.sessionStorage.setItem('login_user_id', '1001'))
  let previews = 0
  let release: (() => void) | undefined
  await page.route('**/api/iam-admin/Training*/**', async (route) => {
    const path = route.request().url()
    if (path.includes('/GeneratePreview')) {
      ++previews
      if (previews === 1)
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ is_success: false, code: 400, message: '题量不足，请调整配置' }),
        })
      await new Promise<void>((resolve) => {
        release = resolve
      })
      await route.fulfill({
        contentType: 'application/json',
        body: successResponse(savedPaper('RANDOM')),
      })
      return
    }
    await route.fulfill({
      contentType: 'application/json',
      body: successResponse({ items: [], total: path.includes('/TrainingQuestion/') ? 10 : 0 }),
    })
  })
  await page.goto('/iam/training/papers')
  await page.getByRole('button', { name: '新建试卷', exact: true }).click()
  const form = page.getByRole('dialog', { name: '新建试卷', exact: true })
  await form.locator('.el-radio-button').filter({ hasText: '随机组卷' }).click()
  await page.getByRole('button', { name: '确认切换', exact: true }).click()
  const rule = form.locator('tbody tr').filter({ hasText: '单选题' }).first()
  await rule.getByRole('spinbutton').nth(0).fill('2')
  await rule.getByRole('spinbutton').nth(1).fill('100')
  await form.getByRole('button', { name: '组卷预览', exact: true }).click()
  await expect(form.getByText('题量不足，请调整配置', { exact: true })).toBeVisible()
  await expect(rule.getByRole('spinbutton').nth(0)).toHaveValue('2')
  await expect(rule.getByRole('spinbutton').nth(1)).toHaveValue('100.00')
  await expect(form.getByRole('button', { name: '创建草稿' })).toBeDisabled()
  await form.getByRole('button', { name: '组卷预览', exact: true }).click()
  await expect.poll(() => previews).toBe(2)
  await expect(form.getByRole('button', { name: '组卷预览', exact: true })).toBeDisabled()
  await form.getByRole('button', { name: '取消', exact: true }).click()
  await page
    .getByRole('dialog', { name: '放弃未保存的修改？', exact: true })
    .getByRole('button', { name: '放弃修改', exact: true })
    .click()
  await expect(form).not.toBeVisible()
  release!()
  await page.getByRole('button', { name: '新建试卷', exact: true }).click()
  await expect(form.getByLabel('试卷名称', { exact: true })).toHaveValue('')
  await expect(form.getByText('已选题目 · 2 题', { exact: true })).not.toBeVisible()
  await expect(form.getByText('题量不足，请调整配置', { exact: true })).not.toBeVisible()
  expect(previews).toBe(2)
})
