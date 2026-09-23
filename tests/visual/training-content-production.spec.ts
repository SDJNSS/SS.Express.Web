import { expect, test, type Page } from '@playwright/test'
import { useAuthenticatedSession } from './helpers/authenticatedSession'

const stamp = '2026-09-17T09:10:11.1234567'
const common = {
  id: 10,
  tenant_id: 1,
  tenant_code: 'PLATFORM',
  status: 'ACTIVE',
  created_at: stamp,
  updated_at: stamp,
  created_by: '管理员',
  updated_by: '管理员',
}
const course = {
  ...common,
  course_name: '接口课程',
  training_type: '安全',
  introduction: '接口课程说明',
  video_file_id: 'video-file-10',
  video_duration_seconds: 180,
  planned_learning_seconds: 180,
  is_locked: false,
}
const question = {
  ...common,
  question_type: 'SINGLE_CHOICE',
  question_text: '接口题目',
  explanation: '接口答案解析',
  options: [
    { id: 1, option_code: 'A', option_text: '正确选项', is_correct: true, sort_order: 1 },
    { id: 2, option_code: 'B', option_text: '错误选项', is_correct: false, sort_order: 2 },
  ],
}
const paper = {
  ...common,
  paper_name: '接口试卷',
  paper_mode: 'FIXED',
  total_score: 100,
  random_question_order: false,
  random_option_order: false,
  single_choice_count: null,
  single_choice_score: null,
  multiple_choice_count: null,
  multiple_choice_score: null,
  true_false_count: null,
  true_false_score: null,
  fixed_questions: [
    {
      id: 1,
      question_id: 10,
      question_type: 'SINGLE_CHOICE',
      question_text: '接口题目',
      question_status: 'DISABLED',
      question_score: 100,
      sort_order: 1,
    },
  ],
}
const exam = {
  ...common,
  exam_name: '接口考试配置',
  paper_id: 10,
  paper_name: '接口试卷',
  paper_mode: 'FIXED',
  paper_total_score: 100,
  duration_seconds: 1800,
  pass_score: 60,
  max_attempts: 2,
  show_correct_answer: false,
  show_explanation: true,
}
const targets = [
  {
    key: 'courses',
    controller: 'TrainingCourse',
    name: '课程管理',
    entity: course.course_name,
    label: '课程名称',
    data: course,
  },
  {
    key: 'questions',
    controller: 'TrainingQuestion',
    name: '题库管理',
    entity: question.question_text,
    label: '题干',
    data: question,
  },
  {
    key: 'papers',
    controller: 'TrainingPaper',
    name: '试卷管理',
    entity: paper.paper_name,
    label: '试卷名称',
    data: paper,
  },
  {
    key: 'exams',
    controller: 'TrainingExam',
    name: '考试配置管理',
    entity: exam.exam_name,
    label: '配置名称',
    data: exam,
  },
]
type Call = { endpoint: string; body: Record<string, unknown> }
const success = (data: unknown) =>
  JSON.stringify({ is_success: true, status: 'success', code: 1, message: '', data })

async function prepare(
  page: Page,
  calls: Call[],
  options: { readOnly?: boolean; failWrite?: boolean; failQuery?: boolean } = {},
) {
  await useAuthenticatedSession(page)
  const permissions = targets.flatMap((target) =>
    (options.readOnly ? ['view'] : ['view', 'create', 'update', 'change-status', 'copy']).map(
      (action) => `iam:training:${target.key}:${action}`,
    ),
  )
  await page.addInitScript((values) => {
    window.sessionStorage.setItem('login_permissions', JSON.stringify(values))
  }, permissions)
  const menus = targets.map((target, index) => ({
    id: 1201 + index,
    app_id: 2,
    parent_id: 1200,
    resource_code: `IAM.TRAINING.${target.key}`,
    resource_name: target.name,
    resource_type: 'menu',
    route_path: `/iam/training/${target.key}`,
    component: '',
    permission_code: `iam:training:${target.key}:view`,
    is_visible: true,
    is_currently_effective: true,
    status: 'active',
    sort_order: index,
    children: [],
  }))
  await page.route('**/api/iam-admin/Permission/CurrentAppMenus', async (route) => {
    if (route.request().postDataJSON().app_id !== 2) return route.fallback()
    await route.fulfill({
      contentType: 'application/json',
      body: success({
        app: { id: 2, app_code: 'IAM', app_name: 'IAM 身份中心', route_prefix: '/iam' },
        modules: [
          {
            id: 1200,
            app_id: 2,
            resource_code: 'IAM.TRAINING',
            resource_name: '培训中心',
            resource_type: 'module',
            route_path: '',
            component: '',
            permission_code: '',
            icon: 'mdi:school-outline',
            sort_order: 1,
            status: 'active',
            is_visible: true,
            is_currently_effective: true,
            menus,
          },
        ],
      }),
    })
  })
  await page.route('**/api/iam-admin/Permission/CurrentFunctions', async (route) => {
    const menu = menus.find((item) => item.id === route.request().postDataJSON().menu_id)
    if (!menu) return route.fallback()
    await route.fulfill({
      contentType: 'application/json',
      body: success({
        menu,
        functions: permissions.map((permission, index) => ({
          id: menu.id * 100 + index,
          parent_id: menu.id,
          resource_type: 'function',
          permission_code: permission,
          status: 'active',
          is_currently_effective: true,
        })),
        permission_codes: permissions,
      }),
    })
  })
  await page.route('**/api/iam-admin/Training*/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname.split('/iam-admin/')[1]!
    const [controller, action] = endpoint.split('/')
    const body = route.request().postDataJSON() as Record<string, unknown>
    calls.push({ endpoint, body })
    expect(route.request().headers().authorization).toBe('Bearer visual-test-access-token')
    const target = targets.find((item) => item.controller === controller)
    if (!target) return route.fulfill({ status: 500, body: 'Unexpected test endpoint' })
    const failed =
      (options.failQuery && action === 'Query') ||
      (options.failWrite && ['Create', 'Update', 'ChangeStatus'].includes(action!))
    if (failed)
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          is_success: false,
          status: 'error',
          code: 409,
          message: '测试并发冲突，请重新加载后重试',
          data: null,
        }),
      })
    let data: unknown = target.data
    if (action === 'Query') {
      const item =
        controller === 'TrainingQuestion'
          ? {
              ...common,
              question_text: question.question_text,
              question_type: question.question_type,
            }
          : controller === 'TrainingPaper'
            ? {
                ...common,
                paper_name: paper.paper_name,
                paper_mode: paper.paper_mode,
                total_score: paper.total_score,
              }
            : target.data
      data = {
        items: body.keyword === '不存在' ? [] : [item],
        total: body.keyword === '不存在' ? 0 : body.question_type ? 7 : 21,
        page_index: body.page_index,
        page_size: body.page_size,
      }
    } else if (action === 'Update' || action === 'Create')
      data = {
        ...target.data,
        ...body,
        updated_at: stamp,
        status: action === 'Create' ? 'DRAFT' : 'ACTIVE',
      }
    else if (action === 'ChangeStatus')
      data = { ...common, status: body.target_status, idempotent: false }
    else if (action === 'Copy')
      data = {
        ...course,
        id: 11,
        course_name: '接口课程（副本）',
        status: 'DRAFT',
        is_locked: false,
      }
    await route.fulfill({ contentType: 'application/json', body: success(data) })
  })
}

test('four production pages render with real DTO shapes at all standard viewports', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) errors.push(message.text())
  })
  const calls: Call[] = []
  await prepare(page, calls)
  for (const target of targets) {
    await page.goto(`/iam/training/${target.key}`)
    await expect(page.getByRole('heading', { level: 1, name: target.name })).toBeVisible()
    await expect(page.getByRole('button', { name: target.entity, exact: true })).toBeVisible()
    await expect(page).toHaveTitle(new RegExp(target.name))
    expect(await page.locator('vite-error-overlay').count()).toBe(0)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    ).toBe(true)
    await page.screenshot({
      path: info.outputPath(`${target.key}-${info.project.name}.png`),
      animations: 'disabled',
    })
  }
  expect(errors).toEqual([])
})

test.describe('training content production interactions', () => {
  test.skip(({ viewport }) => viewport?.width !== 1440, '交互在 1440 验证；页面布局覆盖三视口')

  test('reads fresh details, saves every editor and preserves exact updated_at', async ({
    page,
  }) => {
    const calls: Call[] = []
    await prepare(page, calls)
    for (const target of targets) {
      await page.goto(`/iam/training/${target.key}`)
      await page
        .locator('.el-table__row')
        .first()
        .getByRole('button', { name: '编辑', exact: true })
        .click()
      const drawer = page.getByRole('dialog', {
        name: new RegExp(
          `编辑${target.key === 'questions' ? '题目' : target.key === 'exams' ? '考试配置' : target.key === 'courses' ? '课程' : '试卷'}`,
        ),
      })
      await expect(drawer).toBeVisible()
      await expect
        .poll(() => calls.some((call) => call.endpoint === `${target.controller}/Detail`))
        .toBe(true)
      await drawer.getByLabel(target.label, { exact: true }).fill(`${target.entity} 已修改`)
      await drawer.getByRole('button', { name: '保存修改', exact: true }).click()
      await expect(drawer).not.toBeVisible()
      const sent = calls.findLast((call) => call.endpoint === `${target.controller}/Update`)!.body
      expect(sent.id).toBe(10)
      expect(sent.updated_at).toBe(stamp)
      expect(sent).not.toHaveProperty('description')
      expect(sent).not.toHaveProperty('tenant_id')
      expect(sent).not.toHaveProperty('version')
      await expect(page.getByRole('dialog', { name: /详情/ })).toBeVisible()
      await page.keyboard.press('Escape')
    }
    const sent = calls.findLast((call) => call.endpoint === 'TrainingQuestion/Update')!.body
    expect(sent.options).toEqual(
      question.options.map((option) => ({
        option_code: option.option_code,
        option_text: option.option_text,
        is_correct: option.is_correct,
        sort_order: option.sort_order,
      })),
    )
    const paperBody = calls.findLast((call) => call.endpoint === 'TrainingPaper/Update')!.body
    expect(paperBody.fixed_questions).toEqual([
      { question_id: 10, question_score: 100, sort_order: 1 },
    ])
    expect(paperBody.single_choice_count).toBeNull()
  })

  test('server pagination, empty results and browser back restore committed filters', async ({
    page,
  }) => {
    const calls: Call[] = []
    await prepare(page, calls)
    await page.goto('/iam/training/courses')
    await page.getByRole('button', { name: course.course_name, exact: true }).waitFor()
    await page.locator('.el-pager li.number').filter({ hasText: /^2$/ }).click()
    await expect.poll(() => calls.some((call) => call.body.page_index === 2)).toBe(true)
    await page.getByPlaceholder('输入课程名称').fill('不存在')
    await page.getByRole('button', { name: '查询', exact: true }).click()
    await expect
      .poll(() =>
        calls.some((call) => call.body.keyword === '不存在' && call.body.page_index === 1),
      )
      .toBe(true)
    await expect(page.locator('.el-table__row')).toHaveCount(0)
    await page.goBack()
    await expect(page.getByPlaceholder('输入课程名称')).toHaveValue('')
    await expect(page.locator('.el-pager .is-active')).toHaveText('2')
    await expect(page.getByRole('button', { name: course.course_name, exact: true })).toBeVisible()
  })

  test('write conflicts preserve form and status dialog; closing dirty editor requires confirmation', async ({
    page,
  }) => {
    const calls: Call[] = []
    await prepare(page, calls, { failWrite: true })
    await page.goto('/iam/training/questions')
    await page
      .locator('.el-table__row')
      .first()
      .getByRole('button', { name: '编辑', exact: true })
      .click()
    const drawer = page.getByRole('dialog', { name: /编辑题目/ })
    await drawer.getByLabel('题干', { exact: true }).fill('保留填写内容')
    await drawer.getByRole('button', { name: '保存修改' }).click()
    await expect(drawer.getByText('测试并发冲突，请重新加载后重试')).toBeVisible()
    await expect(drawer.getByLabel('题干', { exact: true })).toHaveValue('保留填写内容')
    await drawer.getByRole('button', { name: '取消', exact: true }).click()
    await expect(page.getByRole('dialog', { name: '放弃未保存的修改？' })).toBeVisible()
    await page.getByRole('button', { name: '放弃修改', exact: true }).click()
    await expect(drawer).not.toBeVisible()
    await page
      .locator('.el-table__row')
      .first()
      .getByRole('button', { name: '停用', exact: true })
      .click()
    const dialog = page.getByRole('dialog', { name: '停用题目', exact: true })
    await dialog.getByRole('button', { name: '确认停用' }).click()
    await expect(dialog.getByText('测试并发冲突，请重新加载后重试')).toBeVisible()
    expect(calls.filter((call) => call.endpoint === 'TrainingQuestion/ChangeStatus')).toHaveLength(
      1,
    )
  })

  test('course copying uses backend-generated name; permission denial disables writes', async ({
    page,
  }) => {
    const calls: Call[] = []
    await prepare(page, calls)
    await page.goto('/iam/training/courses')
    await page
      .locator('.el-table__row')
      .first()
      .getByRole('button', { name: '复制', exact: true })
      .click()
    await expect(page.getByText('副本名称由后端自动生成', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: '创建副本', exact: true }).click()
    await expect(page.getByRole('heading', { name: /课程详情 · 接口课程（副本）/ })).toBeVisible()
    expect(calls.find((call) => call.endpoint === 'TrainingCourse/Copy')?.body).toEqual({
      source_course_id: 10,
    })
    await page.keyboard.press('Escape')
    await prepare(page, calls, { readOnly: true })
    await page.goto('/iam/training/courses')
    await expect(page.getByRole('button', { name: course.course_name, exact: true })).toBeVisible()
    for (const name of ['新建课程', '编辑', '复制', '停用'])
      await expect(page.getByRole('button', { name, exact: true }).first()).toBeDisabled()
  })

  test('random paper uses server totals and serializes zero-count scores as null', async ({
    page,
  }) => {
    const calls: Call[] = []
    await prepare(page, calls)
    await page.goto('/iam/training/papers')
    await page.getByRole('button', { name: '新建试卷', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '新建试卷', exact: true })
    await drawer.getByLabel('试卷名称', { exact: true }).fill('随机试卷')
    await drawer.getByLabel('目标总分').fill('100')
    await drawer.locator('.el-radio-button').filter({ hasText: '随机组卷' }).click()
    await page.getByRole('button', { name: '确认切换', exact: true }).click()
    const row = drawer.locator('tbody tr').filter({ hasText: '单选题' })
    await expect(row.locator('td').nth(1)).toHaveText('7')
    await row.getByRole('spinbutton').nth(0).fill('5')
    await row.getByRole('spinbutton').nth(1).fill('20')
    await drawer.getByRole('button', { name: '创建草稿' }).click()
    await expect(drawer).not.toBeVisible()
    expect(calls.find((call) => call.endpoint === 'TrainingPaper/Create')?.body).toMatchObject({
      paper_mode: 'RANDOM',
      fixed_questions: [],
      single_choice_count: 5,
      single_choice_score: 20,
      multiple_choice_count: 0,
      multiple_choice_score: null,
      true_false_count: 0,
      true_false_score: null,
    })
  })

  test('creates a course from DMS upload and validates the rounded duration before saving', async ({
    page,
  }) => {
    const calls: Call[] = []
    await prepare(page, calls)
    let uploadCount = 0
    await page.route('**/api/dms/File/Upload', async (route) => {
      uploadCount++
      expect(route.request().postDataBuffer()?.toString()).toContain('source_app_code')
      await route.fulfill({
        contentType: 'application/json',
        body: success({
          file_id: 'new-video',
          upload_id: 'test-upload',
          status: 'AVAILABLE',
          original_name: 'lesson.mp4',
          file_category: 'VIDEO',
          content_type: 'video/mp4',
          file_size_bytes: 5,
          media_duration_ms: 120123,
          idempotent: false,
        }),
      })
    })
    await page.route('**/api/dms/File/ValidateVideo', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: success({
          file_id: 'new-video',
          is_valid: true,
          status: 'AVAILABLE',
          file_category: 'VIDEO',
          content_type: 'video/mp4',
          media_duration_ms: 120123,
        }),
      }),
    )
    await page.goto('/iam/training/courses')
    await page.getByRole('button', { name: '新建课程', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '新建课程', exact: true })
    await drawer.getByLabel('课程名称', { exact: true }).fill('上传课程')
    await drawer.getByLabel('培训类型', { exact: true }).fill('安全')
    await expect(drawer.getByRole('button', { name: '创建草稿' })).toBeDisabled()
    await drawer
      .locator('input[type=file]')
      .setInputFiles({ name: 'lesson.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video') })
    await expect(drawer.getByLabel('计划学习时长（秒）')).toHaveValue('121')
    await drawer.getByRole('button', { name: '创建草稿' }).click()
    await expect(drawer).not.toBeVisible()
    expect(uploadCount).toBe(1)
    expect(calls.find((call) => call.endpoint === 'TrainingCourse/Create')?.body).toEqual({
      course_name: '上传课程',
      training_type: '安全',
      introduction: '',
      planned_learning_seconds: 121,
      video_file_id: 'new-video',
    })
  })

  test('creates question and exam drafts, validates input, and keeps feedback flags independent', async ({
    page,
  }) => {
    const calls: Call[] = []
    await prepare(page, calls)
    await page.goto('/iam/training/questions')
    await page.getByRole('button', { name: '新建题目', exact: true }).click()
    const questionDrawer = page.getByRole('dialog', { name: '新建题目', exact: true })
    await expect(questionDrawer.getByRole('button', { name: '创建草稿' })).toBeDisabled()
    await questionDrawer.getByLabel('题干', { exact: true }).fill('新单选题')
    await questionDrawer.getByPlaceholder('选项内容').nth(0).fill('答案 A')
    await questionDrawer.getByPlaceholder('选项内容').nth(1).fill('答案 B')
    await questionDrawer.getByRole('button', { name: '创建草稿' }).click()
    await expect(questionDrawer).not.toBeVisible()
    expect(calls.find((call) => call.endpoint === 'TrainingQuestion/Create')?.body).toMatchObject({
      question_type: 'SINGLE_CHOICE',
      question_text: '新单选题',
      options: [
        { option_code: 'A', option_text: '答案 A', is_correct: true, sort_order: 1 },
        { option_code: 'B', option_text: '答案 B', is_correct: false, sort_order: 2 },
      ],
    })
    await page.keyboard.press('Escape')
    await page.goto('/iam/training/exams')
    await page.getByRole('button', { name: '新建考试配置', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '新建考试配置', exact: true })
    await drawer.getByLabel('配置名称', { exact: true }).fill('新考试')
    await drawer.getByRole('combobox', { name: '关联试卷' }).click()
    await expect(page.getByRole('option', { name: '接口试卷 · 100 分' })).toBeVisible()
    await page.getByRole('option', { name: '接口试卷 · 100 分' }).click()
    await drawer.getByRole('switch', { name: '展示答案解析' }).locator('..').click()
    await expect(drawer.getByRole('switch', { name: '展示答案解析' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await drawer.getByRole('button', { name: '创建草稿' }).click()
    await expect(drawer).not.toBeVisible()
    expect(calls.find((call) => call.endpoint === 'TrainingExam/Create')?.body).toMatchObject({
      exam_name: '新考试',
      paper_id: 10,
      show_correct_answer: false,
      show_explanation: true,
      duration_seconds: 3600,
      max_attempts: 1,
    })
  })

  test('recovers a failed list query without losing filters and blocks duplicate pending saves', async ({
    page,
  }) => {
    const calls: Call[] = []
    const options = { failQuery: true }
    await prepare(page, calls, options)
    await page.goto('/iam/training/questions?keyword=接口')
    await expect(page.getByText('测试并发冲突，请重新加载后重试').first()).toBeVisible()
    options.failQuery = false
    await page.getByRole('button', { name: '重新加载', exact: true }).click()
    await expect(page.getByRole('button', { name: '接口题目', exact: true })).toBeVisible()
    await expect(page.getByPlaceholder('输入题干关键词')).toHaveValue('接口')
    let complete: (() => void) | undefined
    let count = 0
    await page.route('**/api/iam-admin/TrainingQuestion/Update', async (route) => {
      count++
      await new Promise<void>((resolve) => {
        complete = resolve
      })
      await route.fulfill({ contentType: 'application/json', body: success(question) })
    })
    await page
      .locator('.el-table__row')
      .first()
      .getByRole('button', { name: '编辑', exact: true })
      .click()
    const drawer = page.getByRole('dialog', { name: /编辑题目/ })
    await drawer.getByRole('button', { name: '保存修改' }).click()
    await expect.poll(() => count).toBe(1)
    await expect(drawer.getByRole('button', { name: '保存修改' })).toBeDisabled()
    await drawer.getByRole('button', { name: '取消', exact: true }).click()
    await expect(drawer).toBeVisible()
    complete?.()
    await expect(drawer).not.toBeVisible()
    expect(count).toBe(1)
  })
})
