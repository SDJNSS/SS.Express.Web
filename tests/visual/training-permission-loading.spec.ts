import { expect, test, type Page } from '@playwright/test'
import { useAuthenticatedSession } from './helpers/authenticatedSession'
import { pageResourcesFixture, resourceCodeForRoute } from './helpers/pageResources'

const targets = [
  { key: 'courses', title: '课程管理', controller: 'TrainingCourse', placeholder: '输入课程名称' },
  {
    key: 'questions',
    title: '题库管理',
    controller: 'TrainingQuestion',
    placeholder: '输入题干关键词',
  },
  { key: 'papers', title: '试卷管理', controller: 'TrainingPaper', placeholder: '输入试卷名称' },
  { key: 'exams', title: '考试配置管理', controller: 'TrainingExam', placeholder: '输入配置名称' },
]
const pathFor = (key: string) => `/iam/training/${key}`
const success = (data: unknown) =>
  JSON.stringify({ is_success: true, status: 'success', code: 1, message: '', data })
const denied = '当前没有此操作权限，请联系管理员授权'

function gate() {
  let release = () => {}
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release, entered: false }
}

async function prepare(page: Page) {
  await useAuthenticatedSession(page)
  // A real login stores this identity; keep CurrentProfile hydration in the same session.
  await page.addInitScript(() => window.sessionStorage.setItem('login_user_id', '1001'))
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const calls: Array<{ controller: string; body: Record<string, unknown> }> = []
  const permissions = new Map<string, ReturnType<typeof gate>>()
  const queries = new Map<string, ReturnType<typeof gate>>()
  const permissionFailures = new Map<string, 'denied' | 'forbidden' | 'unavailable'>()
  const queryFailures = new Set<string>()
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
            menus: targets.map((target, index) => ({
              id: 1201 + index,
              app_id: 2,
              parent_id: 1200,
              resource_code: resourceCodeForRoute(pathFor(target.key)),
              resource_name: target.title,
              resource_type: 'menu',
              route_path: pathFor(target.key),
              component: '',
              permission_code: `iam:training:${target.key}:view`,
              is_visible: true,
              is_currently_effective: true,
              status: 'active',
              sort_order: index,
              children: [],
            })),
          },
        ],
      }),
    })
  })
  await page.route(
    '**/api/iam-admin/CurrentPermissionResource/CurrentPageResources',
    async (route) => {
      const code = route.request().postDataJSON().page_resource_code as string
      const pending = permissions.get(code)
      if (pending) {
        pending.entered = true
        await pending.promise
      }
      const failure = permissionFailures.get(code)
      if (failure === 'forbidden' || failure === 'unavailable') {
        return route.fulfill({
          status: failure === 'forbidden' ? 403 : 503,
          contentType: 'application/json',
          body: JSON.stringify({
            is_success: false,
            code: failure === 'forbidden' ? 403 : 503,
            message: '权限校验失败',
          }),
        })
      }
      await route.fulfill({
        contentType: 'application/json',
        body: success({
          ...pageResourcesFixture(code),
          ...(failure === 'denied' ? { can_access: false } : {}),
        }),
      })
    },
  )
  await page.route('**/api/iam-admin/Training*/**', async (route) => {
    const [controller, action] = new URL(route.request().url()).pathname
      .split('/iam-admin/')[1]!
      .split('/')
    expect(action).toBe('Query') // These flows must never perform a write or detail request.
    calls.push({ controller: controller!, body: route.request().postDataJSON() })
    const pending = queries.get(controller!)
    if (pending) {
      pending.entered = true
      await pending.promise
    }
    if (queryFailures.has(controller!)) {
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ is_success: false, code: 403, message: '业务查询被拒绝' }),
      })
    }
    await route.fulfill({
      contentType: 'application/json',
      body: success({ items: [], total: 0, page_index: 1, page_size: 10 }),
    })
  })
  return { calls, permissions, queries, permissionFailures, queryFailures, errors }
}

async function settled(page: Page, title: string) {
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await expect(page).toHaveTitle(`${title} · 多式联运智慧调度平台`)
  await expect(page.locator('.el-loading-mask:visible')).toHaveCount(0)
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await expect(page.getByText(denied, { exact: true })).toHaveCount(0)
}

test('in-place shell permission refresh resumes the list without waiting for a navigation', async ({
  page,
}) => {
  const state = await prepare(page)
  let failMenus = true
  await page.route('**/api/iam-admin/CurrentPermissionResource/CurrentAppMenus', async (route) => {
    if (!failMenus || route.request().postDataJSON().app_id !== 2) return route.fallback()
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ is_success: false, code: 503, message: '导航暂不可用' }),
    })
  })
  await page.goto(pathFor('questions'))
  await settled(page, '题库管理')
  const pending = gate()
  const code = resourceCodeForRoute(pathFor('questions'))
  state.permissions.set(code, pending)
  const count = state.calls.length
  failMenus = false
  try {
    await page
      .locator('.app-shell__nav')
      .getByRole('button', { name: '重新加载', exact: true })
      .click()
    await expect.poll(() => pending.entered).toBe(true)
    await expect(page.getByText(denied, { exact: true })).toHaveCount(0)
    expect(state.calls.length).toBe(count)
  } finally {
    state.permissions.delete(code)
    pending.release()
  }
  await settled(page, '题库管理')
  expect(state.calls.length).toBe(count + 1)
  await expect(page.getByRole('link', { name: '课程管理', exact: true })).toBeVisible()
  expect(state.errors).toEqual([])
})

test('four training pages wait for destination permissions without false errors or old-page queries', async ({
  page,
}, info) => {
  const state = await prepare(page)
  await page.goto(pathFor('courses'))
  await settled(page, '课程管理')
  for (let index = 0; index < targets.length; index++) {
    const current = targets[index]!,
      next = targets[(index + 1) % targets.length]!
    if (index === targets.length - 1) {
      await page.clock.install()
      await page.clock.fastForward(6000) // Expire the documented 5s page-permission cache on the round trip.
    }
    const pending = gate()
    state.permissions.set(resourceCodeForRoute(pathFor(next.key)), pending)
    const count = state.calls.length
    const click = page.getByRole('link', { name: next.title, exact: true }).click()
    try {
      await expect.poll(() => pending.entered).toBe(true)
      await expect(page.getByRole('heading', { name: current.title, exact: true })).toBeVisible()
      await expect(page.getByText(denied, { exact: true })).toHaveCount(0)
      await expect(page.getByText(/列表加载失败/)).toHaveCount(0)
      await expect(page.getByRole('button', { name: '查询', exact: true })).toBeDisabled()
      expect(state.calls.length).toBe(count)
      await page.screenshot({
        path: info.outputPath(`pending-${current.key}.png`),
        animations: 'disabled',
      })
    } finally {
      state.permissions.delete(resourceCodeForRoute(pathFor(next.key)))
      pending.release()
    }
    await click
    await expect(page).toHaveURL(pathFor(next.key))
    await settled(page, next.title)
    expect(state.calls.length).toBe(count + 1)
    expect(state.calls.at(-1)?.controller).toBe(next.controller)
  }
  // A fresh cache-hit navigation must also avoid duplicate/old-page queries.
  const count = state.calls.length
  await page.getByRole('link', { name: '考试配置管理', exact: true }).click()
  await settled(page, '考试配置管理')
  expect(state.calls.length).toBe(count + 1)
  expect(state.errors).toEqual([])
})

test('an in-flight old list is invalidated while the next page is being authorized', async ({
  page,
}) => {
  const state = await prepare(page)
  const oldQuery = gate()
  state.queries.set('TrainingCourse', oldQuery)
  await page.goto(pathFor('courses'))
  await expect.poll(() => oldQuery.entered).toBe(true)
  const permission = gate()
  const code = resourceCodeForRoute(pathFor('questions'))
  state.permissions.set(code, permission)
  try {
    await page.getByRole('link', { name: '题库管理', exact: true }).click()
    await expect.poll(() => permission.entered).toBe(true)
    state.queryFailures.add('TrainingCourse')
    oldQuery.release()
    await expect(page.getByText(/列表加载失败/)).toHaveCount(0)
    await expect(page.getByText(denied, { exact: true })).toHaveCount(0)
    expect(state.calls.length).toBe(1)
  } finally {
    oldQuery.release()
    state.permissions.delete(code)
    permission.release()
  }
  await settled(page, '题库管理')
  expect(state.calls.map((call) => call.controller)).toEqual(['TrainingCourse', 'TrainingQuestion'])
  expect(state.errors).toEqual([])
})

for (const target of targets) {
  test(`${target.key}: same-page search and history wait for committed URL and query exactly once`, async ({
    page,
  }) => {
    const state = await prepare(page)
    await page.goto(pathFor(target.key))
    await settled(page, target.title)
    await page.clock.install()
    for (const keyword of ['安全培训', '岗位培训']) {
      await page.clock.fastForward(6000)
      const pending = gate()
      const code = resourceCodeForRoute(pathFor(target.key))
      state.permissions.set(code, pending)
      const count = state.calls.length
      await page.getByPlaceholder(target.placeholder, { exact: true }).fill(keyword)
      await page.getByRole('button', { name: '查询', exact: true }).click()
      try {
        await expect.poll(() => pending.entered).toBe(true)
        await expect(page.getByText(denied, { exact: true })).toHaveCount(0)
        expect(state.calls.length).toBe(count)
      } finally {
        state.permissions.delete(code)
        pending.release()
      }
      await expect(page).toHaveURL(new RegExp(`keyword=${encodeURIComponent(keyword)}`))
      await settled(page, target.title)
      expect(state.calls.length).toBe(count + 1)
      expect(state.calls.at(-1)?.body.keyword).toBe(keyword)
    }
    const count = state.calls.length
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`keyword=${encodeURIComponent('安全培训')}`))
    await settled(page, target.title)
    expect(state.calls.length).toBe(count + 1)
    expect(state.calls.at(-1)?.body.keyword).toBe('安全培训')
    expect(state.errors).toEqual([])
  })
}

for (const failure of ['denied', 'forbidden', 'unavailable'] as const) {
  test(`real permission ${failure} still blocks business requests`, async ({ page }) => {
    const state = await prepare(page)
    await page.goto(pathFor('courses'))
    await settled(page, '课程管理')
    state.permissionFailures.set(resourceCodeForRoute(pathFor('questions')), failure)
    const count = state.calls.length
    await page.getByRole('link', { name: '题库管理', exact: true }).click()
    await expect(page).toHaveURL(
      new RegExp(failure === 'unavailable' ? '/authorization-service-error' : '/forbidden'),
    )
    await expect(
      page.getByRole('heading', {
        name: failure === 'unavailable' ? '权限校验暂不可用' : '无权访问此页面',
        exact: true,
        level: 1,
      }),
    ).toBeVisible()
    expect(state.calls.length).toBe(count)
    expect(state.errors).toEqual([])
  })
}

test('a genuine business 403 remains visible and retryable', async ({ page }, info) => {
  const state = await prepare(page)
  state.queryFailures.add('TrainingQuestion')
  await page.goto(pathFor('questions'))
  await expect(page.getByText('题目列表加载失败，筛选条件已保留')).toBeVisible()
  expect(state.calls.length).toBe(1)
  await page.screenshot({ path: info.outputPath('real-query-failure.png'), animations: 'disabled' })
  state.queryFailures.clear()
  await page.getByRole('button', { name: '重新加载', exact: true }).click()
  await settled(page, '题库管理')
  expect(state.calls.length).toBe(2)
  expect(state.errors).toEqual([])
})

test('superseded navigation cannot query an intermediate page or replay a stale response', async ({
  page,
}) => {
  const state = await prepare(page)
  await page.goto(pathFor('courses'))
  await settled(page, '课程管理')
  const pending = gate()
  state.permissions.set(resourceCodeForRoute(pathFor('questions')), pending)
  await page.getByRole('link', { name: '题库管理', exact: true }).click()
  await expect.poll(() => pending.entered).toBe(true)
  await page.getByRole('link', { name: '试卷管理', exact: true }).click()
  await settled(page, '试卷管理')
  pending.release()
  await page.getByRole('link', { name: '考试配置管理', exact: true }).click()
  await settled(page, '考试配置管理')
  expect(state.calls.map((call) => call.controller)).toEqual([
    'TrainingCourse',
    'TrainingPaper',
    'TrainingExam',
  ])
  expect(state.errors).toEqual([])
})
