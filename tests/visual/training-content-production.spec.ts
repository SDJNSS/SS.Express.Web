import { expect, test, type Page } from '@playwright/test'
import { useAuthenticatedSession } from './helpers/authenticatedSession'
import { pageResourcesFixture, resourceCodeForRoute } from './helpers/pageResources'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { readFileSync } from 'node:fs'

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
  question_count: 1,
  is_configuration_valid: true,
  configuration_invalid_reason: '',
  groups: [{ question_type: 'SINGLE_CHOICE', count: 1, total_score: 100, question_score: 100 }],
  questions: [
    {
      id: 1,
      question_id: 10,
      question_type: 'SINGLE_CHOICE',
      question_text: '接口题目',
      question_status: 'DISABLED',
      question_score: 100,
      sort_order: 1,
      question_updated_at: stamp,
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
    resource_code: resourceCodeForRoute(`/iam/training/${target.key}`),
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
  await page.route('**/api/iam-admin/CurrentPermissionResource/CurrentAppMenus', async (route) => {
    if (route.request().postDataJSON().app_id !== 2) return route.fallback()
    await route.fulfill({
      contentType: 'application/json',
      body: success({
        app: { id: 2, app_code: 'IAM', app_name: 'IAM 身份中心', route_prefix: '/iam' },
        authorization_version: '1',
        modules: [
          {
            resource: {
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
            },
            menus,
          },
        ],
      }),
    })
  })
  await page.route(
    '**/api/iam-admin/CurrentPermissionResource/CurrentPageResources',
    async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: success(
          pageResourcesFixture(route.request().postDataJSON().page_resource_code, {
            readOnly: options.readOnly,
          }),
        ),
      })
    },
  )
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
  // Existing CRUD tests open course details too; never send their fake identity to a real DMS.
  await page.route('**/api/dms/File/GetAccessUrl', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        is_success: false,
        code: 400,
        message: '此测试场景未配置视频文件',
        data: null,
      }),
    }),
  )
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

// Generate a real, tiny offline clip with Chromium rather than mocking HTMLMediaElement.
// This proves the player lifecycle, not real OSS/MP4 codec or storage configuration.
let previewClip: Buffer | undefined
const previewMime = process.env.DMS_VIDEO_TEST_FILE ? 'video/mp4' : 'video/webm'
const previewName = process.env.DMS_VIDEO_TEST_FILE ? '安全培训视频.mp4' : '安全培训视频.webm'
async function videoFixture(page: Page) {
  if (previewClip) return previewClip
  // Explicit local codec QA only; normal CI remains self-contained and generates its own clip.
  if (process.env.DMS_VIDEO_TEST_FILE) {
    previewClip = readFileSync(process.env.DMS_VIDEO_TEST_FILE)
    return previewClip
  }
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 180
    const context = canvas.getContext('2d')!
    const stream = canvas.captureStream(10)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' })
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => chunks.push(event.data)
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
    })
    recorder.start()
    for (let frame = 0; frame < 20; frame++) {
      context.fillStyle = '#17478d'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = '#ffffff'
      context.font = '22px sans-serif'
      context.fillText(`Course preview ${frame}`, 32, 90)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    recorder.stop()
    await stopped
    stream.getTracks().forEach((track) => track.stop())
    return [...new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())]
  })
  previewClip = Buffer.from(bytes)
  return previewClip
}

async function prepareVideo(page: Page, calls: Call[], readOnly = true) {
  await prepare(page, calls, { readOnly })
  await page.goto('/iam/training/courses')
  await page.getByRole('button', { name: course.course_name, exact: true }).waitFor()
  const clip = await videoFixture(page)
  const access: Record<string, unknown>[] = []
  let denied = false
  let lifetime = 3600_000
  let metadata: Record<string, unknown> = {}
  await page.route('https://course-video.test/**', async (route) => {
    expect(route.request().headers().authorization).toBeUndefined()
    const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range ?? '')
    const start = range ? Number(range[1]) : 0
    const end = range?.[2] ? Math.min(Number(range[2]), clip.length - 1) : clip.length - 1
    await route.fulfill({
      status: range ? 206 : 200,
      contentType: previewMime,
      headers: {
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${clip.length}` } : {}),
      },
      body: clip.subarray(start, end + 1),
    })
  })
  await page.route('**/api/dms/File/GetAccessUrl', async (route) => {
    access.push(route.request().postDataJSON())
    const now = await page.evaluate(() => Date.now())
    expect(route.request().headers().authorization).toBe('Bearer visual-test-access-token')
    await route.fulfill({
      contentType: 'application/json',
      body: denied
        ? JSON.stringify({ is_success: false, code: 403, message: '没有文件预览权限', data: null })
        : success({
            file_id: route.request().postDataJSON().file_id,
            purpose: 'preview',
            url: `https://course-video.test/lesson.${process.env.DMS_VIDEO_TEST_FILE ? 'mp4' : 'webm'}?lease=${access.length}`,
            expires_at: new Date(now + lifetime).toISOString(),
            original_name: previewName,
            file_category: 'VIDEO',
            content_type: previewMime,
            file_size_bytes: clip.length,
            ...metadata,
          }),
    })
  })
  const open = async () => {
    await page.getByRole('button', { name: course.course_name, exact: true }).click()
    const drawer = page.getByRole('dialog', {
      name: `课程详情 · ${course.course_name}`,
      exact: true,
    })
    await expect(drawer).toBeVisible()
    return drawer
  }
  return {
    access,
    open,
    deny: () => {
      denied = true
    },
    lifetime: (value: number) => {
      lifetime = value
    },
    metadata: (value: Record<string, unknown>) => {
      metadata = value
    },
  }
}

test.describe('course editor video preview', () => {
  async function uploadFixture(page: Page, durationMs = 2000, pauseValidation = false) {
    let uploads = 0
    let validations = 0
    let finishValidation = () => {}
    await page.route('**/api/dms/File/Upload', async (route) => {
      uploads++
      await route.fulfill({
        contentType: 'application/json',
        body: success({
          file_id: `editor-video-${uploads}`,
          status: 'AVAILABLE',
          original_name: 'replacement.mov',
          file_category: 'VIDEO',
          content_type: 'video/quicktime',
          file_size_bytes: 5,
          media_duration_ms: durationMs,
          playback_status: 'ready',
          playback_profile: 'browser-mp4-v1',
          thumbnail_status: 'ready',
        }),
      })
    })
    await page.route('**/api/dms/File/ValidateVideo', async (route) => {
      validations++
      if (pauseValidation)
        await new Promise<void>((resolve) => {
          finishValidation = resolve
        })
      await route.fulfill({
        contentType: 'application/json',
        body: success({
          file_id: route.request().postDataJSON().file_id,
          is_valid: true,
          status: 'AVAILABLE',
          file_category: 'VIDEO',
          content_type: 'video/mp4',
          media_duration_ms: durationMs,
        }),
      })
    })
    return {
      uploads: () => uploads,
      validations: () => validations,
      finish: () => finishValidation(),
    }
  }
  async function openEditor(page: Page) {
    await page
      .locator('.el-table__row')
      .first()
      .getByRole('button', { name: '编辑', exact: true })
      .click()
    const drawer = page.getByRole('dialog', {
      name: `编辑课程 · ${course.course_name}`,
      exact: true,
    })
    await expect(drawer).toBeVisible()
    return drawer
  }
  const replacement = {
    name: 'replacement.mov',
    mimeType: 'video/quicktime',
    buffer: Buffer.from('unprocessed original'),
  }

  test('plays existing editor video, replaces only after upload validation and saves the stable ID', async ({
    page,
  }, info) => {
    const calls: Call[] = []
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const fixture = await prepareVideo(page, calls, false)
    await expect(page).toHaveURL(/\/iam\/training\/courses(?:\?|$)/)
    await expect(page).toHaveTitle('课程管理 · 多式联运智慧调度平台')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    const upload = await uploadFixture(page, 2000, true)
    const poster = 'https://editor-poster.test/preview.svg'
    await page.route('https://editor-poster.test/**', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#17478d"/><text x="60" y="90" fill="white" font-size="24">上传后的视频</text></svg>',
      }),
    )
    fixture.metadata({
      playback_status: 'ready',
      thumbnail_status: 'ready',
      thumbnail_url: poster,
      thumbnail_expires_at: new Date(Date.now() + 3600_000).toISOString(),
    })
    const drawer = await openEditor(page)
    const old = await drawer.locator('video').elementHandle()
    await drawer.getByRole('button', { name: `播放视频：${course.course_name}` }).click()
    await expect
      .poll(() => old!.evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeGreaterThan(0)
    await drawer.locator('input[type=file]').setInputFiles(replacement)
    await expect.poll(upload.validations).toBe(1)
    expect(await old!.evaluate((v: HTMLVideoElement) => v.paused && !v.hasAttribute('src'))).toBe(
      true,
    )
    await expect(drawer.locator('video')).toHaveCount(0)
    await expect(drawer.getByRole('button', { name: '保存修改', exact: true })).toBeDisabled()
    expect(fixture.access.map((r) => r.file_id)).toEqual([course.video_file_id])
    upload.finish()
    await expect(drawer.locator('video')).toHaveAttribute('poster', poster)
    await expect(
      drawer.getByRole('button', { name: `播放视频：${course.course_name}` }),
    ).toBeVisible()
    expect(await drawer.locator('video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
    await expect(drawer.locator('.course-video-preview')).toHaveAttribute(
      'data-resource-element',
      'iam.training.courses.editVideoPreview',
    )
    await drawer.getByRole('button', { name: `播放视频：${course.course_name}` }).click()
    await expect
      .poll(() => drawer.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeGreaterThan(0)
    await drawer.locator('video').evaluate((v: HTMLVideoElement) => v.pause())
    await page.screenshot({
      path: info.outputPath(`editor-preview-${info.project.name}.png`),
      animations: 'disabled',
    })
    const viewport = page.viewportSize()!
    await page.setViewportSize({ ...viewport, height: 600 })
    const planned = drawer.getByLabel('计划学习时长（秒）', { exact: true })
    await planned.scrollIntoViewIfNeeded()
    await expect(planned).toBeVisible()
    const fieldBounds = await planned.boundingBox()
    const footerBounds = await drawer.locator('.el-drawer__footer').boundingBox()
    expect(fieldBounds!.y + fieldBounds!.height).toBeLessThanOrEqual(footerBounds!.y)
    expect(fixture.access.map((r) => r.file_id)).toEqual([course.video_file_id, 'editor-video-1'])
    const detached = await drawer.locator('video').elementHandle()
    await drawer.getByRole('button', { name: '保存修改', exact: true }).click()
    await expect(drawer).not.toBeVisible()
    expect(
      await detached!.evaluate((v) => !v.hasAttribute('src') && !v.hasAttribute('poster')),
    ).toBe(true)
    expect(calls.find((r) => r.endpoint === 'TrainingCourse/Update')?.body).toMatchObject({
      video_file_id: 'editor-video-1',
      planned_learning_seconds: 2,
      updated_at: stamp,
    })
    expect(JSON.stringify(calls)).not.toContain(poster)
    expect(errors).toEqual([])
    await old!.dispose()
    await detached!.dispose()
  })

  test('new course preview is post-upload, preview denial is retryable without reuploading', async ({
    page,
  }) => {
    const fixture = await prepareVideo(page, [], false)
    const upload = await uploadFixture(page)
    await page.getByRole('button', { name: '新建课程', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '新建课程', exact: true })
    await drawer.getByLabel('课程名称', { exact: true }).fill('预览新课程')
    await drawer.getByLabel('培训类型', { exact: true }).fill('安全')
    expect(fixture.access).toHaveLength(0)
    await expect(drawer.locator('video')).toHaveCount(0)
    fixture.deny()
    await drawer.locator('input[type=file]').setInputFiles(replacement)
    await expect(drawer.getByText('没有文件预览权限', { exact: true })).toBeVisible()
    expect(upload.uploads()).toBe(1)
    expect(fixture.access).toHaveLength(1)
    await expect(drawer.getByRole('button', { name: '创建草稿', exact: true })).toBeEnabled()
    await page.route('**/api/dms/File/GetAccessUrl', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: success({
          file_id: 'editor-video-1',
          purpose: 'preview',
          url: 'https://course-video.test/lesson.webm?editor-retry',
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          content_type: previewMime,
        }),
      }),
    )
    await drawer.getByRole('button', { name: '重新加载视频' }).click()
    await drawer.getByRole('button', { name: '播放视频：预览新课程' }).click()
    await expect
      .poll(() => drawer.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeGreaterThan(0)
    expect(upload.uploads()).toBe(1)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '继续编辑', exact: true }).click()
    await expect(drawer).toBeVisible()
    await expect(drawer.locator('video')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '放弃修改', exact: true }).click()
    await expect(drawer).not.toBeVisible()
    await page.getByRole('button', { name: '新建课程', exact: true }).click()
    await expect(drawer.locator('video')).toHaveCount(0)
  })

  test('blocks files above 200MB without sending an upload', async ({ page }) => {
    await prepareVideo(page, [], false)
    const upload = await uploadFixture(page)
    await page.getByRole('button', { name: '新建课程', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '新建课程', exact: true })
    await drawer.locator('input[type=file]').evaluate((input: HTMLInputElement) => {
      const transfer = new DataTransfer()
      transfer.items.add(
        new File([new Uint8Array(200 * 1024 * 1024 + 1)], 'large.mp4', { type: 'video/mp4' }),
      )
      input.files = transfer.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(drawer.getByText('单个文件不能超过 200MB', { exact: true })).toBeVisible()
    expect(upload.uploads()).toBe(0)
    await expect(drawer.locator('video')).toHaveCount(0)
  })

  test('checks metadata before upload and server duration after unsupported-original upload', async ({
    page,
  }) => {
    await prepareVideo(page, [], false)
    const upload = await uploadFixture(page, 600001)
    // Metadata boundary fixture only, not evidence of actual decoding or browser codec support.
    await page.evaluate(() => {
      const original = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src')!
      Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        ...original,
        set(value: string) {
          if (value.startsWith('blob:')) {
            Object.defineProperty(this, 'duration', { configurable: true, value: 600.001 })
            queueMicrotask(() => this.dispatchEvent(new Event('loadedmetadata')))
          } else original.set!.call(this, value)
        },
      })
    })
    await page.getByRole('button', { name: '新建课程', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '新建课程', exact: true })
    await drawer.locator('input[type=file]').setInputFiles(replacement)
    await expect(drawer.getByText(/视频时长不能超过 10 分钟，请重新选择/)).toBeVisible()
    expect(upload.uploads()).toBe(0)
    await drawer.locator('.el-upload-list__item').hover()
    await drawer.locator('.el-upload-list__item .el-icon--close').click()
    // Reload restores native media methods; undecodable original takes the transparent fallback.
    await page.reload()
    await page.getByRole('button', { name: '新建课程', exact: true }).click()
    const fresh = page.getByRole('dialog', { name: '新建课程', exact: true })
    await fresh.getByLabel('课程名称', { exact: true }).fill('超时长课程')
    await fresh.getByLabel('培训类型', { exact: true }).fill('安全')
    await fresh.locator('input[type=file]').setInputFiles(replacement)
    await expect(fresh.getByText(/浏览器无法读取原片时长/)).toBeVisible()
    await expect(fresh.getByText(/视频时长不能超过 10 分钟，请移除并重新选择/)).toBeVisible()
    expect(upload.uploads()).toBe(1)
    expect(upload.validations()).toBe(1)
    await expect(fresh.getByRole('button', { name: '创建草稿', exact: true })).toBeDisabled()
    await expect(fresh.locator('video')).toHaveCount(0)
  })

  test('allows exactly ten minutes and releases the metadata blob before uploading', async ({
    page,
  }) => {
    await prepare(page, [])
    const upload = await uploadFixture(page, 600000)
    await page.goto('/iam/training/courses')
    await page.evaluate(() => {
      const original = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src')!
      const revoke = URL.revokeObjectURL.bind(URL)
      URL.revokeObjectURL = (value) => {
        sessionStorage.setItem('duration-blob-released', value)
        revoke(value)
      }
      // Isolated boundary fixture; the actual preview player is tested with real video elsewhere.
      Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        ...original,
        set(value: string) {
          if (value.startsWith('blob:')) {
            Object.defineProperty(this, 'duration', { configurable: true, value: 600 })
            queueMicrotask(() => this.dispatchEvent(new Event('loadedmetadata')))
          } else original.set!.call(this, value)
        },
      })
    })
    await page.getByRole('button', { name: '新建课程', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '新建课程', exact: true })
    await drawer.getByLabel('课程名称', { exact: true }).fill('十分钟课程')
    await drawer.getByLabel('培训类型', { exact: true }).fill('安全')
    await drawer.locator('input[type=file]').setInputFiles(replacement)
    await expect.poll(upload.validations).toBe(1)
    await expect(drawer.getByRole('button', { name: '创建草稿', exact: true })).toBeEnabled()
    await expect(drawer.getByLabel('视频时长（秒）', { exact: true })).toHaveValue('600')
    expect(await page.evaluate(() => sessionStorage.getItem('duration-blob-released'))).toMatch(
      /^blob:/,
    )
    expect(upload.uploads()).toBe(1)
  })

  test('cancelling a pending metadata check releases it and never starts uploading', async ({
    page,
  }) => {
    await prepare(page, [])
    const upload = await uploadFixture(page)
    await page.goto('/iam/training/courses')
    await page.clock.install()
    await page.evaluate(() => {
      const original = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src')!
      const revoke = URL.revokeObjectURL.bind(URL)
      URL.revokeObjectURL = (value) => {
        sessionStorage.setItem('duration-blob-released', value)
        revoke(value)
      }
      Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        ...original,
        set(value: string) {
          if (!value.startsWith('blob:')) original.set!.call(this, value)
        },
      })
    })
    await page.getByRole('button', { name: '新建课程', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '新建课程', exact: true })
    await drawer.locator('input[type=file]').setInputFiles(replacement)
    await expect(drawer.getByText(/正在检查视频时长/)).toBeVisible()
    await drawer.getByRole('button', { name: '取消上传', exact: true }).click()
    await expect(drawer.getByText(/上传已取消/)).toBeVisible()
    await page.clock.fastForward(11000)
    expect(await page.evaluate(() => sessionStorage.getItem('duration-blob-released'))).toMatch(
      /^blob:/,
    )
    expect(upload.uploads()).toBe(0)
    await expect(drawer.getByRole('button', { name: '创建草稿', exact: true })).toBeDisabled()
  })
})

test.describe('course detail video preview', () => {
  const posterUrl = 'https://course-poster.test/poster.svg'
  async function mockPoster(page: Page, failed = false) {
    const requests: string[] = []
    await page.route('https://course-poster.test/**', async (route) => {
      requests.push(route.request().url())
      expect(route.request().headers().authorization).toBeUndefined()
      await route.fulfill({
        status: failed ? 404 : 200,
        contentType: process.env.DMS_POSTER_TEST_FILE ? 'image/jpeg' : 'image/svg+xml',
        body: failed
          ? ''
          : process.env.DMS_POSTER_TEST_FILE
            ? readFileSync(process.env.DMS_POSTER_TEST_FILE)
            : '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#17478d"/><text x="80" y="90" fill="white" font-size="24">课程封面</text></svg>',
      })
    })
    return requests
  }

  test('uses the signed thumbnail without autoplay or persisting either lease', async ({
    page,
  }, info) => {
    const fixture = await prepareVideo(page, [])
    const posters = await mockPoster(page)
    fixture.metadata({
      playback_status: 'ready',
      playback_profile: 'browser-mp4-v1',
      thumbnail_status: 'ready',
      thumbnail_url: posterUrl,
      thumbnail_expires_at: new Date(Date.now() + 3600_000).toISOString(),
    })
    const drawer = await fixture.open()
    const video = drawer.locator('video')
    await expect(video).toHaveAttribute('poster', posterUrl)
    await expect.poll(() => posters.length).toBeGreaterThan(0)
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.videoWidth))
      .toBeGreaterThan(0)
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
    await expect(
      drawer.getByRole('button', { name: `播放视频：${course.course_name}` }),
    ).toBeVisible()
    await expect(drawer.locator('.course-video-preview__media .el-loading-mask')).not.toBeVisible()
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
      .toBeGreaterThanOrEqual(3)
    await page.screenshot({
      path: info.outputPath(`course-poster-${info.project.name}.png`),
      animations: 'disabled',
    })
    await drawer.getByRole('button', { name: `播放视频：${course.course_name}` }).click()
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeGreaterThan(0)
    await video.evaluate((v: HTMLVideoElement) => {
      v.pause()
      v.currentTime = 0.3
    })
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeCloseTo(0.3, 1)
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
    await video.evaluate((v: HTMLVideoElement) => v.play())
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeGreaterThan(0.35)
    const decoded = await video.evaluate((v: HTMLVideoElement) => ({
      width: v.videoWidth,
      height: v.videoHeight,
      frames: v.getVideoPlaybackQuality().totalVideoFrames,
      time: v.currentTime,
      error: v.error?.code ?? null,
    }))
    expect(decoded.frames).toBeGreaterThan(0)
    await info.attach('decoded-video', {
      body: JSON.stringify(decoded),
      contentType: 'application/json',
    })
    expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))).not.toContain(
      posterUrl,
    )
    const detached = await video.elementHandle()
    await page.keyboard.press('Escape')
    await expect(drawer).not.toBeVisible()
    expect(
      await detached!.evaluate((v) => !v.hasAttribute('poster') && !v.hasAttribute('src')),
    ).toBe(true)
    await detached!.dispose()
  })

  for (const failure of ['backend', 'image'] as const) {
    test(`thumbnail ${failure} failure does not stop decoded video or trigger signing retries`, async ({
      page,
    }) => {
      const fixture = await prepareVideo(page, [])
      const posters = await mockPoster(page, true)
      fixture.metadata({
        playback_status: 'ready',
        thumbnail_status: failure === 'backend' ? 'failed' : 'ready',
        thumbnail_url: failure === 'backend' ? null : posterUrl,
        thumbnail_expires_at: new Date(Date.now() + 3600_000).toISOString(),
      })
      const drawer = await fixture.open()
      if (failure === 'backend') {
        await expect(drawer.getByText(/缩略图暂不可用/)).toBeVisible()
        await expect(drawer.locator('video')).not.toHaveAttribute('poster')
        expect(posters).toHaveLength(0)
      }
      await drawer.getByRole('button', { name: `播放视频：${course.course_name}` }).click()
      await expect
        .poll(() => drawer.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime))
        .toBeGreaterThan(0)
      await expect(drawer.getByRole('alert')).toHaveCount(0)
      expect(fixture.access).toHaveLength(1)
    })
  }

  test('expired and unsafe thumbnail URLs fall back locally without a signing loop', async ({
    page,
  }) => {
    const fixture = await prepareVideo(page, [])
    for (const value of [
      { thumbnail_url: posterUrl, thumbnail_expires_at: new Date(Date.now() - 1000).toISOString() },
      {
        thumbnail_url: 'javascript:alert(1)',
        thumbnail_expires_at: new Date(Date.now() + 3600_000).toISOString(),
      },
      { thumbnail_url: posterUrl, thumbnail_expires_at: 'invalid' },
    ]) {
      fixture.metadata({ thumbnail_status: 'ready', ...value })
      const drawer = await fixture.open()
      await expect(drawer.getByText(/缩略图暂不可用/)).toBeVisible()
      await expect(drawer.locator('video')).not.toHaveAttribute('poster')
      await expect
        .poll(() => drawer.locator('video').evaluate((v: HTMLVideoElement) => v.videoWidth))
        .toBe(320)
      await page.keyboard.press('Escape')
    }
    expect(fixture.access).toHaveLength(3)
  })

  test('renews the earlier thumbnail lease while preserving paused playback position', async ({
    page,
  }) => {
    const fixture = await prepareVideo(page, [])
    await mockPoster(page)
    await page.clock.install()
    fixture.metadata({
      thumbnail_status: 'ready',
      thumbnail_url: `${posterUrl}?lease=1`,
      thumbnail_expires_at: new Date(Date.now() + 3000).toISOString(),
    })
    const drawer = await fixture.open()
    const video = drawer.locator('video')
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.videoWidth)).toBe(320)
    await video.evaluate((v: HTMLVideoElement) => {
      v.currentTime = 0.4
    })
    fixture.metadata({
      thumbnail_status: 'ready',
      thumbnail_url: `${posterUrl}?lease=2`,
      thumbnail_expires_at: new Date(Date.now() + 3600_000).toISOString(),
    })
    await page.clock.fastForward(3000)
    await expect(video).toHaveAttribute('poster', `${posterUrl}?lease=2`)
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeGreaterThanOrEqual(0.35)
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
    expect(fixture.access).toHaveLength(2)
  })

  test('labels historical unprocessed video without claiming conversion or inventing a poster', async ({
    page,
  }) => {
    const fixture = await prepareVideo(page, [])
    fixture.metadata({
      playback_status: 'unprocessed',
      thumbnail_status: null,
      thumbnail_url: null,
    })
    const drawer = await fixture.open()
    await expect(drawer.getByText(/历史视频尚未标准化/)).toBeVisible()
    await expect(drawer.locator('video')).not.toHaveAttribute('poster')
    await expect
      .poll(() => drawer.locator('video').evaluate((v: HTMLVideoElement) => v.videoWidth))
      .toBe(320)
    expect(fixture.access).toHaveLength(1)
  })

  test('read-only viewer auto-loads a visible first frame without autoplay and releases media on close', async ({
    page,
  }, info) => {
    const calls: Call[] = []
    const errors: string[] = []
    page.on('pageerror', (reason) => errors.push(reason.message))
    const fixture = await prepareVideo(page, calls)
    const drawer = await fixture.open()
    const video = drawer.locator('video')
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
      .toBeGreaterThanOrEqual(2)
    expect(
      await video.evaluate((element: HTMLVideoElement) => [
        element.videoWidth,
        element.videoHeight,
      ]),
    ).toEqual([320, 180])
    expect(
      await video.evaluate(
        (element: HTMLVideoElement) => element.getVideoPlaybackQuality().totalVideoFrames,
      ),
    ).toBeGreaterThan(0)
    await expect(drawer.getByText(previewName, { exact: false })).toBeVisible()
    expect(fixture.access).toEqual([{ file_id: course.video_file_id, purpose: 'preview' }])
    expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true)
    await drawer
      .getByRole('button', { name: `播放视频：${course.course_name}`, exact: true })
      .focus()
    await page.keyboard.press('Enter')
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
      .toBeGreaterThan(0)
    await expect(drawer.locator('.course-video-preview__placeholder')).toHaveCount(0)
    const [mediaHeight, videoHeight] = await video.evaluate((element) => [
      element.parentElement!.getBoundingClientRect().height,
      element.getBoundingClientRect().height,
    ])
    expect(mediaHeight! - videoHeight!).toBeLessThanOrEqual(1)
    await video.evaluate((element: HTMLVideoElement) => {
      element.pause()
      element.currentTime = 0.5
    })
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
      .toBeCloseTo(0.5, 1)
    const mediaBox = await video.boundingBox()
    const drawerBox = await drawer.boundingBox()
    expect(mediaBox!.width).toBeLessThanOrEqual(drawerBox!.width)
    await page.screenshot({
      path: info.outputPath(`course-video-${info.project.name}.png`),
      animations: 'disabled',
    })
    await page.setViewportSize({ width: page.viewportSize()!.width, height: 480 })
    await drawer.locator('.el-descriptions').last().scrollIntoViewIfNeeded()
    await expect(drawer.locator('.el-descriptions').last()).toBeInViewport()
    const detachedVideo = await video.elementHandle()
    await page.keyboard.press('Escape')
    await expect(drawer).not.toBeVisible()
    expect(
      await detachedVideo!.evaluate(
        (element) => (element as HTMLVideoElement).paused && !element.hasAttribute('src'),
      ),
    ).toBe(true)
    await detachedVideo!.dispose()
    await fixture.open()
    await expect(page.locator('video')).toHaveCount(1)
    await expect.poll(() => fixture.access.length).toBe(2)
    expect(calls.every((call) => /\/(Query|Detail)$/.test(call.endpoint))).toBe(true)
    expect(errors).toEqual([])
  })

  test('manual reload preserves playing intent, position, volume and speed', async ({ page }) => {
    const fixture = await prepareVideo(page, [])
    const drawer = await fixture.open()
    const video = drawer.locator('video')
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
      .toBeGreaterThanOrEqual(2)
    await video.evaluate(async (element: HTMLVideoElement) => {
      element.currentTime = 0.4
      element.volume = 0.4
      element.playbackRate = 0.5
      await element.play()
    })
    await drawer.getByRole('button', { name: '重新加载视频', exact: true }).click()
    await expect(video).toHaveAttribute('src', /lease=2/)
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
      .toBe(false)
    expect(
      await video.evaluate((element: HTMLVideoElement) => element.currentTime),
    ).toBeGreaterThanOrEqual(0.35)
    expect(await video.evaluate((element: HTMLVideoElement) => element.volume)).toBeCloseTo(0.4)
    expect(await video.evaluate((element: HTMLVideoElement) => element.playbackRate)).toBe(0.5)
  })

  test('lease renewal keeps paused position and denial stops playback without retry loops', async ({
    page,
  }) => {
    const fixture = await prepareVideo(page, [])
    fixture.lifetime(10_000)
    await page.clock.install()
    const drawer = await fixture.open()
    const video = drawer.locator('video')
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
      .toBeGreaterThanOrEqual(1)
    await video.evaluate((element: HTMLVideoElement) => {
      element.currentTime = 0.7
      element.volume = 0.3
    })
    await page.clock.fastForward(9_100)
    await expect(video).toHaveAttribute('src', /lease=2/)
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
      .toBeCloseTo(0.7, 1)
    expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true)
    fixture.deny()
    await page.clock.fastForward(9_100)
    await expect(drawer.getByRole('alert')).toHaveText('没有文件预览权限')
    await expect(video).toHaveCount(0)
    const count = fixture.access.length
    await page.clock.fastForward(120_000)
    expect(fixture.access).toHaveLength(count)
  })

  test('failed access is explicit, retryable and duplicate clicks do not send duplicate requests', async ({
    page,
  }) => {
    const fixture = await prepareVideo(page, [])
    let complete: (() => void) | undefined
    let count = 0
    await page.route('**/api/dms/File/GetAccessUrl', async (route) => {
      count++
      await new Promise<void>((resolve) => {
        complete = resolve
      })
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          is_success: false,
          code: 400,
          message: '该文件格式不支持直接预览',
          data: null,
        }),
      })
    })
    const drawer = await fixture.open()
    const load = drawer.getByRole('button', { name: '重新加载视频', exact: true })
    await expect(load).toBeDisabled()
    expect(count).toBe(1)
    complete?.()
    await expect(drawer.getByRole('alert')).toHaveText('该文件格式不支持直接预览')
    await expect(drawer.locator('video')).toHaveCount(0)
    await drawer.getByRole('button', { name: '重新加载视频', exact: true }).click()
    await expect.poll(() => count).toBe(2)
    complete?.()
    await expect(drawer.getByRole('alert')).toBeVisible()
  })

  test('closing a pending preview cancels it and ignores a late result', async ({ page }) => {
    const fixture = await prepareVideo(page, [])
    let complete: (() => void) | undefined
    let count = 0
    await page.route('**/api/dms/File/GetAccessUrl', async (route) => {
      count++
      if (count > 1) return route.fallback()
      await new Promise<void>((resolve) => {
        complete = resolve
      })
      await route.fulfill({
        contentType: 'application/json',
        body: success({
          file_id: course.video_file_id,
          purpose: 'preview',
          url: 'https://course-video.test/late.webm',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
        }),
      })
    })
    const drawer = await fixture.open()
    await expect.poll(() => count).toBe(1)
    await page.keyboard.press('Escape')
    await expect(drawer).not.toBeVisible()
    complete?.()
    const reopened = await fixture.open()
    await expect(reopened.getByRole('button', { name: '重新加载视频', exact: true })).toBeEnabled()
    await expect(reopened.locator('video')).toHaveAttribute('src', /lesson.webm/)
    expect(count).toBe(2)
  })

  test('unplayable media displays a decode error and never enters a signing retry loop', async ({
    page,
  }) => {
    const fixture = await prepareVideo(page, [])
    await page.route('https://course-video.test/**', (route) =>
      route.fulfill({ contentType: 'video/webm', body: 'not a video' }),
    )
    await page.clock.install()
    const drawer = await fixture.open()
    await expect(drawer.getByRole('alert')).toContainText('格式或编码无法在浏览器中播放')
    await expect(drawer.locator('video')).toHaveCount(0)
    await page.clock.fastForward(120_000)
    expect(fixture.access).toHaveLength(1)
  })

  test('missing course video is an explicit empty state without an access request', async ({
    page,
  }) => {
    const fixture = await prepareVideo(page, [])
    await page.route('**/api/iam-admin/TrainingCourse/Detail', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: success({ ...course, video_file_id: '' }),
      }),
    )
    const drawer = await fixture.open()
    await expect(drawer.getByText('此课程尚未关联视频')).toBeVisible()
    await expect(drawer.getByRole('button', { name: '重新加载视频', exact: true })).toHaveCount(0)
    expect(fixture.access).toHaveLength(0)
  })

  test('audio-only media is stopped with a missing-video-frame explanation, not presented as playable video', async ({
    page,
  }) => {
    const fixture = await prepareVideo(page, [])
    // Real PCM WAV: the browser can decode audio but its video dimensions remain zero.
    const pcm = Buffer.alloc(44 + 16_000)
    pcm.write('RIFF', 0)
    pcm.writeUInt32LE(pcm.length - 8, 4)
    pcm.write('WAVEfmt ', 8)
    pcm.writeUInt32LE(16, 16)
    pcm.writeUInt16LE(1, 20)
    pcm.writeUInt16LE(1, 22)
    pcm.writeUInt32LE(8000, 24)
    pcm.writeUInt32LE(16000, 28)
    pcm.writeUInt16LE(2, 32)
    pcm.writeUInt16LE(16, 34)
    pcm.write('data', 36)
    pcm.writeUInt32LE(pcm.length - 44, 40)
    await page.route('https://course-video.test/**', (route) =>
      route.fulfill({ contentType: 'audio/wav', body: pcm }),
    )
    const drawer = await fixture.open()
    await expect(drawer.getByRole('alert')).toContainText('未检测到可显示的视频画面')
    await expect(drawer.locator('video')).toHaveCount(0)
    await expect(
      drawer.getByRole('button', { name: `播放视频：${course.course_name}`, exact: true }),
    ).toHaveCount(0)
    expect(fixture.access).toHaveLength(1)
  })
})

test('synchronous video upload waits through processing and validation before permitting course save', async ({
  page,
}, info) => {
  const calls: Call[] = []
  await prepare(page, calls)
  let completeUpload: (() => void) | undefined
  let completeValidation: (() => void) | undefined
  let validations = 0
  let uploads = 0
  let authorization: string | undefined
  const server = createServer((request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization,content-type,x-request-id',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
      })
      response.end()
      return
    }
    request.resume()
    request.on('end', () => {
      uploads++
      authorization = request.headers.authorization
      completeUpload = () => {
        response.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        response.end(
          success({
            file_id: 'normalized-video',
            upload_id: 'upload-video',
            original_name: 'source.mov',
            file_extension: '.mov',
            file_category: 'VIDEO',
            content_type: 'video/quicktime',
            file_size_bytes: 64 * 1024,
            status: 'AVAILABLE',
            media_duration_ms: 2333,
            playback_status: 'ready',
            playback_profile: 'browser-mp4-v1',
            thumbnail_status: 'failed',
            video_width: 608,
            video_height: 1080,
            video_codec: 'h264',
            audio_codec: null,
          }),
        )
      }
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    await page.route('**/api/dms/File/Upload', (route) =>
      route.continue({ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/upload` }),
    )
    await page.route('**/api/dms/File/ValidateVideo', async (route) => {
      validations++
      await new Promise<void>((resolve) => {
        completeValidation = resolve
      })
      await route.fulfill({
        contentType: 'application/json',
        body: success({
          file_id: 'normalized-video',
          is_valid: true,
          status: 'AVAILABLE',
          file_category: 'VIDEO',
          content_type: 'video/quicktime',
          media_duration_ms: 2333,
        }),
      })
    })
    await page.goto('/iam/training/courses')
    await page.getByRole('button', { name: '新建课程', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: '新建课程', exact: true })
    await drawer.getByLabel('课程名称', { exact: true }).fill('同步转换课程')
    await drawer.getByLabel('培训类型', { exact: true }).fill('安全')
    await drawer.locator('input[type=file]').setInputFiles({
      name: 'source.mov',
      mimeType: 'video/quicktime',
      buffer: Buffer.alloc(64 * 1024, 1),
    })
    await expect.poll(() => uploads).toBe(1)
    expect(authorization).toBe('Bearer visual-test-access-token')
    await expect(drawer.getByText(/视频转换及保存中/)).toBeVisible()
    const save = drawer.getByRole('button', { name: '创建草稿', exact: true })
    await expect(save).toBeDisabled()
    await expect(drawer.locator('.el-progress')).not.toContainText('100%')
    await expect(drawer.locator('.el-progress')).not.toHaveAttribute('aria-valuenow')
    expect(validations).toBe(0)
    await page.screenshot({ path: info.outputPath(`video-processing-${info.project.name}.png`) })
    completeUpload!()
    await expect(drawer.getByText('正在校验视频', { exact: false })).toBeVisible()
    await expect(save).toBeDisabled()
    completeValidation!()
    await expect(drawer.getByText(/缩略图生成失败，不影响使用/)).toBeVisible()
    await expect(save).toBeEnabled()
    await save.click()
    await expect
      .poll(
        () => calls.find((call) => call.endpoint === 'TrainingCourse/Create')?.body.video_file_id,
      )
      .toBe('normalized-video')
    const body = calls.find((call) => call.endpoint === 'TrainingCourse/Create')!.body
    expect(body).not.toHaveProperty('video_duration_seconds')
    expect(body.planned_learning_seconds).toBe(3)
    expect(body).not.toHaveProperty('thumbnail_url')
    expect(body).not.toHaveProperty('playback_status')
    expect(uploads).toBe(1)
    expect(validations).toBe(1)
  } finally {
    completeValidation?.()
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
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
    expect(paperBody.questions).toEqual([
      {
        question_id: 10,
        question_score: 100,
        sort_order: 1,
        question_type: 'SINGLE_CHOICE',
        question_updated_at: stamp,
      },
    ])
    expect(paperBody).not.toHaveProperty('single_choice_count')
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

  test('new random paper must explicitly preview before saving the concrete set', async ({
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
    await row.getByRole('spinbutton').nth(1).fill('100')
    await expect(drawer.getByRole('button', { name: '创建草稿' })).toBeDisabled()
    await expect(drawer.getByRole('button', { name: '组卷预览' })).toBeEnabled()
    expect(calls.some((call) => call.endpoint === 'TrainingPaper/Create')).toBe(false)
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
