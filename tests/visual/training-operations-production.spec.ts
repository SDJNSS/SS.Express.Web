import { expect, test, type Page, type Route } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

const TRAINING_PERMISSIONS = {
  overview: { view: 'iam:training:overview:view' },
  plans: {
    view: 'iam:training:plans:view',
    detail: 'iam:training:plan-detail:view',
    create: 'iam:training:plans:create',
    update: 'iam:training:plans:update',
    publish: 'iam:training:plans:publish',
    delete: 'iam:training:plans:delete',
    queryEmployees: 'iam:training:plans:employees:view',
    updateEmployees: 'iam:training:plans:employees:update',
  },
  tasks: {
    view: 'iam:training:tasks:view',
    detail: 'iam:training:task-detail:view',
    create: 'iam:training:tasks:create',
    update: 'iam:training:tasks:update',
    start: 'iam:training:tasks:start',
    delete: 'iam:training:tasks:delete',
    queryEmployees: 'iam:training:tasks:employees',
  },
  courses: { view: 'iam:training:courses:view' },
  exams: { view: 'iam:training:exams:view' },
  archives: {
    view: 'iam:training:employee-archives:view',
    audit: 'iam:training:employee-archives:audit',
    export: 'iam:training:statistics:export',
    auditExport: 'iam:training:statistics:audit-export',
  },
  statistics: {
    view: 'iam:training:statistics:view',
    export: 'iam:training:statistics:export',
    auditExport: 'iam:training:statistics:audit-export',
  },
} as const

const plan = {
  id: 101,
  year: 2026,
  name: '2026 年度驾驶员安全培训计划',
  startAt: '2026-01-01',
  endAt: '2026-12-31',
  frequency: 'QUARTERLY',
  status: 'PUBLISHED',
  currentEmployees: 10,
  historicalEmployees: 12,
  taskCount: 4,
}
const task = {
  id: 201,
  name: '2026 第三季度驾驶员安全培训',
  period: '2026 Q3',
  taskType: 'QUARTERLY',
  startAt: '2026-07-01T00:00:00+08:00',
  endAt: '2026-09-30T23:59:59+08:00',
  status: 'ACTIVE',
  isLocked: true,
  expectedCount: 10,
  completedCount: 7,
  overdueCount: 2,
  excludedCount: 1,
  hasRequiredEmployees: true,
  completionRate: 70,
  examId: 701,
  examName: 'Q3 安全培训结业考试',
  updatedAt: '2026-09-16T08:42:00+08:00',
}
const taskEmployee = {
  id: 301,
  employeeId: 9001,
  employeeCode: 'SD-JS-00018',
  name: '陈海峰',
  organization: '山东运输中心',
  position: '危化品驾驶员',
  shouldTrain: true,
  status: 'EXAM_FAILED',
  courseLearningStatus: 'COMPLETED',
  examStatus: 'FAILED',
  learnedCourseCount: 3,
  courseCount: 3,
  assignedAt: '2026-07-01T08:12:00+08:00',
  learningMinutes: 82,
  wasOverdue: true,
  firstOverdueAt: '2026-09-15T00:00:00+08:00',
  finalScore: 78,
  finalPassed: false,
  completedAt: undefined as string | undefined,
}

const trainingPermissions = Object.values(TRAINING_PERMISSIONS).flatMap((group) =>
  Object.values(group),
)

const productionRoutes = [
  { path: '/iam/training/overview', heading: '培训概览', expected: 'TrainingOverview/Overview' },
  { path: '/iam/training/plans', heading: '培训计划', expected: 'TrainingPlan/Query' },
  {
    path: `/iam/training/plans/${plan.id}`,
    heading: '培训计划详情',
    expected: 'TrainingPlan/Detail',
  },
  {
    path: `/iam/training/plans/${plan.id}/tasks/${task.id}`,
    heading: '培训任务详情',
    expected: 'TrainingTask/Detail',
  },
  {
    path: '/iam/training/employee-archives',
    heading: '员工培训档案',
    expected: 'TrainingArchive/Archives',
  },
  {
    path: '/iam/training/statistics',
    heading: '专项统计',
    expected: 'TrainingStatistics/TaskStatistics',
  },
] as const

function success(data: unknown) {
  return JSON.stringify({ data, is_success: true, status: 'success', message: '', code: 1 })
}

function profile(employeeId = taskEmployee.employeeId ?? 9001) {
  return {
    employee_id: employeeId,
    is_available: true,
    user_name: taskEmployee.employeeCode,
    real_name: taskEmployee.name,
    display_name: taskEmployee.name,
    organization_names: taskEmployee.organization,
    position_names: taskEmployee.position,
  }
}

const scope = {
  employee_exam_ids: [],
  employee_ids: [],
  time_zone: 'Asia/Shanghai',
  tenant_id: 1,
  as_of: '2026-09-17T09:00:00+08:00',
  drilldown_scope: 'INCOMPLETE',
  time_boundary: '[start_at_from,start_at_to)',
}

const population = {
  employee_task_count: 12,
  distinct_employee_count: 10,
  required_count: 10,
  completed_count: 7,
  incomplete_count: 3,
  current_overdue_count: 2,
  ever_overdue_count: 4,
  excluded_count: 2,
  effective_learning_seconds: 43_200,
  final_exam_count: 8,
  final_passed_count: 7,
  completion_rate: 70,
  final_pass_rate: 87.5,
  has_required_employees: true,
}

const planDto = {
  id: plan.id,
  tenant_id: 1,
  tenant_code: 'PLATFORM',
  plan_year: plan.year,
  plan_name: plan.name,
  start_at: plan.startAt,
  end_at: plan.endAt,
  frequency: plan.frequency,
  status: plan.status,
  current_employee_count: plan.currentEmployees,
  historical_employee_count: plan.historicalEmployees,
  task_count: plan.taskCount,
  not_started_task_count: 1,
  active_task_count: 1,
  overdue_task_count: 1,
  completed_task_count: 1,
  created_by: 'admin',
  created_at: '2026-01-01T00:00:00+08:00',
  updated_by: 'admin',
  updated_at: '2026-09-16T16:42:00+08:00',
}

const taskStatistics = {
  total_employee_count: task.expectedCount,
  required_employee_count: task.expectedCount,
  completed_employee_count: task.completedCount,
  incomplete_employee_count: task.expectedCount - task.completedCount,
  current_overdue_employee_count: task.overdueCount,
  ever_overdue_employee_count: task.overdueCount + 2,
  excluded_employee_count: task.excludedCount ?? 0,
  completion_rate: task.completionRate ?? 0,
  has_required_employees: task.hasRequiredEmployees ?? true,
}

const taskDto = {
  id: task.id,
  tenant_id: 1,
  tenant_code: 'PLATFORM',
  training_id: plan.id,
  plan_name: plan.name,
  plan_year: plan.year,
  task_name: task.name,
  task_type: task.taskType,
  period_key: task.period,
  period_start_at: task.startAt,
  period_end_at: task.endAt,
  start_at: task.startAt,
  deadline_at: task.endAt,
  exam_id: task.examId ?? 701,
  exam_name: task.examName,
  exam_status: 'ACTIVE',
  exam_disabled: false,
  status: task.status,
  is_locked: task.isLocked,
  updated_at: task.updatedAt ?? '2026-09-16T08:42:00+08:00',
  statistics: taskStatistics,
}

const taskEmployeeDto = {
  id: taskEmployee.id,
  training_id: plan.id,
  training_task_id: task.id,
  employee_id: taskEmployee.employeeId ?? 9001,
  is_required: taskEmployee.shouldTrain,
  assigned_at: taskEmployee.assignedAt,
  status: taskEmployee.status,
  course_learning_status: taskEmployee.courseLearningStatus,
  exam_status: taskEmployee.examStatus,
  learned_course_count: taskEmployee.learnedCourseCount,
  course_count: taskEmployee.courseCount,
  ever_overdue: taskEmployee.wasOverdue,
  overdue_at: taskEmployee.firstOverdueAt,
  total_learning_seconds: taskEmployee.learningMinutes * 60,
  final_score: taskEmployee.finalScore,
  final_passed: taskEmployee.finalPassed,
  completed_at: taskEmployee.completedAt,
  profile: profile(),
}

const employeeTaskRecord = {
  ...taskEmployeeDto,
  plan_year: plan.year,
  plan_name: plan.name,
  task_name: task.name,
  task_type: task.taskType,
  period_key: task.period,
  start_at: task.startAt,
  deadline_at: task.endAt,
  task_status: task.status,
  first_learning_at: '2026-07-01T09:10:00+08:00',
  overdue_seconds: 86_400,
}

const taskDetailDto = {
  ...taskDto,
  courses: [
    {
      id: 601,
      course_id: 801,
      course_name: '安全法规基础',
      course_type: '安全法规',
      course_status: 'ACTIVE',
      course_disabled: false,
      sort_order: 1,
      required_employee_count: 10,
      not_started_employee_count: 1,
      learning_employee_count: 2,
      completed_employee_count: 7,
      completion_rate: 70,
    },
  ],
  exams: [
    {
      exam_id: 701,
      exam_name: 'Q3 安全培训结业考试',
      exam_status: 'ACTIVE',
      exam_disabled: false,
      required_employee_count: 10,
      not_started_employee_count: 1,
      in_progress_employee_count: 1,
      examined_employee_count: 8,
      not_examined_employee_count: 2,
      examination_rate: 80,
      passed_employee_count: 7,
      failed_employee_count: 1,
      pass_rate: 87.5,
    },
  ],
  invalid_employee_ids: [],
}

function paged(items: unknown[], pageIndex = 1, pageSize = 10, total = items.length) {
  return { items, page_index: pageIndex, page_size: pageSize, total }
}

function report(items: unknown[], pageIndex = 1, pageSize = 10, total = items.length) {
  return { ...paged(items, pageIndex, pageSize, total), scope, warnings: [] }
}

function endpointOf(route: Route) {
  return new URL(route.request().url()).pathname.replace(/^.*\/iam-admin\//u, '')
}

async function installTrainingSession(page: Page) {
  await useAuthenticatedSession(page)
  await page.addInitScript((permissions) => {
    const stored = JSON.parse(
      window.sessionStorage.getItem('login_permissions') ?? '[]',
    ) as string[]
    window.sessionStorage.setItem(
      'login_permissions',
      JSON.stringify([...new Set([...stored, ...permissions])]),
    )
  }, trainingPermissions)
}

async function mockTrainingShell(page: Page) {
  const menus = [
    ['培训概览', '/iam/training/overview', TRAINING_PERMISSIONS.overview.view],
    ['培训计划', '/iam/training/plans', TRAINING_PERMISSIONS.plans.view],
    ['员工培训档案', '/iam/training/employee-archives', TRAINING_PERMISSIONS.archives.view],
    ['专项统计', '/iam/training/statistics', TRAINING_PERMISSIONS.statistics.view],
  ].map(([name, path, permission], index) => ({
    id: 1201 + index,
    app_id: 2,
    parent_id: 1200,
    resource_code: `IAM.TRAINING.MENU.${index + 1}`,
    resource_name: name,
    resource_type: 'menu',
    route_path: path,
    component: '',
    permission_code: permission,
    icon: 'mdi:school-outline',
    http_method: '',
    api_path: '',
    is_visible: true,
    sort_order: index + 1,
    status: 'active',
    remarks: '',
    is_currently_effective: true,
    invalid_reason: '',
    can_maintain: true,
    version: '1',
    created_at: '2026-09-17T00:00:00+08:00',
    created_by: 'admin',
    updated_at: '2026-09-17T00:00:00+08:00',
    updated_by: 'admin',
  }))

  await page.route('**/api/iam-admin/Permission/CurrentAppMenus', async (route) => {
    const body = route.request().postDataJSON() as { app_id?: number }
    if (body.app_id !== 2) {
      await route.fallback()
      return
    }
    await route.fulfill({
      contentType: 'application/json',
      body: success({
        app: { id: 2, app_code: 'IAM', app_name: 'IAM 身份中心', route_prefix: '/iam' },
        modules: [
          {
            id: 1200,
            app_id: 2,
            parent_id: 0,
            resource_code: 'IAM.TRAINING',
            resource_name: '培训中心',
            resource_type: 'module',
            route_path: '',
            component: '',
            permission_code: '',
            icon: 'mdi:school-outline',
            is_visible: true,
            sort_order: 20,
            status: 'active',
            is_currently_effective: true,
            menus,
          },
        ],
      }),
    })
  })

  await page.route('**/api/iam-admin/Permission/CurrentFunctions', async (route) => {
    const body = route.request().postDataJSON() as { menu_id?: number }
    const menu = menus.find((item) => item.id === body.menu_id)
    if (!menu) {
      await route.fallback()
      return
    }
    await route.fulfill({
      contentType: 'application/json',
      body: success({
        menu,
        functions: trainingPermissions.map((permission, index) => ({
          id: menu.id * 100 + index,
          parent_id: menu.id,
          resource_type: 'function',
          permission_code: permission,
          status: 'active',
          is_currently_effective: true,
        })),
        permission_codes: trainingPermissions,
      }),
    })
  })
}

async function mockTrainingApis(page: Page, calls: Array<{ endpoint: string; body: unknown }>) {
  await page.route('**/api/iam-admin/**', async (route) => {
    const endpoint = endpointOf(route)
    if (endpoint.startsWith('Permission/')) {
      await route.fallback()
      return
    }
    const body = route.request().postDataJSON() as Record<string, unknown>
    calls.push({ endpoint, body })
    const pageIndex = Number(body.page_index ?? 1)
    const pageSize = Number(body.page_size ?? 10)

    let data: unknown
    switch (endpoint) {
      case 'TrainingPlan/Query':
        data = paged([planDto], pageIndex, pageSize)
        break
      case 'TrainingPlan/Detail':
        data = planDto
        break
      case 'TrainingPlanEmployee/Query':
        data = paged(
          [
            {
              id: 501,
              training_id: plan.id,
              employee_id: taskEmployee.employeeId,
              is_current: true,
              effective_from: '2026-01-05T00:00:00+08:00',
              profile: profile(),
            },
          ],
          pageIndex,
          pageSize,
        )
        break
      case 'TrainingTask/Query':
        data = paged([taskDto], pageIndex, pageSize)
        break
      case 'TrainingTask/Detail':
        data = taskDetailDto
        break
      case 'TrainingTaskEmployee/Query':
        data = {
          training_task_id: task.id,
          statistics: taskStatistics,
          employees: paged([taskEmployeeDto], pageIndex, pageSize),
        }
        break
      case 'TrainingCourse/Query':
        data = paged(
          [
            {
              id: 801,
              course_name: '安全法规基础',
              training_type: '安全法规',
              introduction: '驾驶员安全法规课程',
              status: 'ACTIVE',
              is_locked: true,
              planned_learning_seconds: 3600,
              updated_at: '2026-09-16T00:00:00+08:00',
            },
          ],
          pageIndex,
          pageSize,
        )
        break
      case 'TrainingExam/Query':
        data = paged(
          [
            {
              id: 701,
              exam_name: 'Q3 安全培训结业考试',
              paper_name: 'Q3 安全试卷',
              duration_seconds: 3600,
              pass_score: 80,
              max_attempts: 2,
              status: 'ACTIVE',
              updated_at: '2026-09-16T00:00:00+08:00',
            },
          ],
          pageIndex,
          pageSize,
        )
        break
      case 'Organization/Query':
        data = paged(
          [{ id: 10, tenant_id: 1, org_code: 'EAST', org_name: '华东运营中心', status: 'ACTIVE' }],
          pageIndex,
          pageSize,
        )
        break
      case 'Position/Query':
        data = paged(
          [
            {
              id: 20,
              tenant_id: 1,
              position_code: 'DRIVER',
              position_name: '驾驶员',
              status: 'ACTIVE',
            },
          ],
          pageIndex,
          pageSize,
        )
        break
      case 'TrainingOverview/Overview':
        data = {
          scope,
          warnings: [],
          task_count: 4,
          not_started_task_count: 1,
          active_task_count: 1,
          overdue_task_count: 1,
          completed_task_count: 1,
          distinct_course_count: 3,
          employees: population,
        }
        break
      case 'TrainingOverview/Trends':
        data = {
          scope,
          warnings: [],
          granularity: 'MONTH',
          task_status_distribution: { NOT_STARTED: 1, ACTIVE: 1, OVERDUE: 1, COMPLETED: 1 },
          points: [
            {
              period_start: '2026-09-01T00:00:00+08:00',
              training_completed_count: 7,
              course_completed_count: 25,
              exam_submitted_count: 8,
              exam_passed_count: 7,
            },
          ],
        }
        break
      case 'TrainingOverview/Incomplete':
        data = report([employeeTaskRecord], pageIndex, pageSize)
        break
      case 'TrainingArchive/Archives':
        data = report(
          [
            {
              ...population,
              employee_id: taskEmployee.employeeId,
              plan_count: 1,
              latest_training_at: '2026-09-15T18:20:00+08:00',
              profile: profile(),
            },
          ],
          pageIndex,
          pageSize,
        )
        break
      case 'TrainingStatistics/TaskStatistics':
        data = {
          ...report(
            [
              {
                ...population,
                training_id: plan.id,
                training_task_id: task.id,
                plan_year: plan.year,
                plan_name: plan.name,
                task_name: task.name,
                task_type: task.taskType,
                period_key: task.period,
                start_at: task.startAt,
                deadline_at: task.endAt,
                status: task.status,
                is_locked: task.isLocked,
                exam_id: task.examId,
                exam_name: task.examName,
                exam_status: 'ACTIVE',
              },
            ],
            pageIndex,
            pageSize,
          ),
          summary: population,
        }
        break
      case 'TrainingStatistics/CourseStatistics':
        data = report(
          [
            {
              sort_order: 1,
              training_task_id: task.id,
              task_name: task.name,
              training_task_course_id: 601,
              course_id: 801,
              course_name: '安全法规基础',
              required_count: 10,
              not_started_count: 1,
              learning_count: 2,
              completed_count: 7,
              effective_learning_seconds: 18_000,
              completion_rate: 70,
              anomaly_count: 0,
            },
          ],
          pageIndex,
          pageSize,
        )
        break
      case 'TrainingStatistics/ExamStatistics':
        data = {
          ...report(
            [
              {
                training_id: plan.id,
                training_task_id: task.id,
                plan_year: plan.year,
                plan_name: plan.name,
                task_name: task.name,
                task_type: task.taskType,
                period_key: task.period,
                start_at: task.startAt,
                deadline_at: task.endAt,
                task_status: task.status,
                exam_id: 701,
                exam_name: 'Q3 安全培训结业考试',
                exam_status: 'ACTIVE',
                participant_count: 12,
                submitted_count: 10,
                passed_count: 8,
                attempt_pass_rate: 80,
                first_exam_count: 10,
                first_passed_count: 7,
                first_pass_rate: 70,
                final_exam_count: 10,
                final_passed_count: 8,
                final_pass_rate: 80,
                submitted_average_score: 85,
                final_average_score: 88,
                manual_submit_count: 9,
                timeout_submit_count: 1,
              },
            ],
            pageIndex,
            pageSize,
            12,
          ),
          summary: {
            participant_count: 12,
            submitted_count: 10,
            passed_count: 8,
            attempt_pass_rate: 80,
            first_exam_count: 10,
            first_passed_count: 7,
            first_pass_rate: 70,
            final_exam_count: 10,
            final_passed_count: 8,
            final_pass_rate: 80,
            submitted_average_score: 85,
            final_average_score: 88,
            manual_submit_count: 9,
            timeout_submit_count: 1,
          },
        }
        break
      case 'TrainingStatistics/OverdueStatistics':
        data = {
          ...report([employeeTaskRecord], pageIndex, pageSize),
          current_overdue_count: 2,
          ever_overdue_count: 4,
          completed_after_overdue_count: 2,
          still_incomplete_count: 2,
          first_overdue_distribution: [{ period_start: '2026-09-01T00:00:00+08:00', count: 4 }],
          duration_distribution: [{ bucket: 'DAY_1_TO_3', count: 4 }],
        }
        break
      default:
        await route.fallback()
        return
    }

    await route.fulfill({ contentType: 'application/json', body: success(data) })
  })
}

async function prepare(page: Page, calls: Array<{ endpoint: string; body: unknown }>) {
  await installTrainingSession(page)
  await mockTrainingApis(page, calls)
  await mockTrainingShell(page)
}

function relevantRuntimeMessage(type: string, text: string) {
  return (type === 'error' || type === 'warning') && !text.includes('Download the Vue Devtools')
}

test.describe('training operations production routes', () => {
  test.skip(
    ({ viewport }) => viewport?.width !== 1440,
    '生产合同冒烟仅在 desktop-1440 执行；路由权限合同另行覆盖三视口。',
  )

  test('renders all six production routes with their real API contracts', async ({ page }) => {
    const calls: Array<{ endpoint: string; body: unknown }> = []
    const runtimeMessages: string[] = []
    page.on('pageerror', (error) => runtimeMessages.push(error.message))
    page.on('console', (message) => {
      if (relevantRuntimeMessage(message.type(), message.text())) {
        runtimeMessages.push(`${message.type()}: ${message.text()}`)
      }
    })
    await prepare(page, calls)

    for (const target of productionRoutes) {
      calls.length = 0
      await page.goto(target.path)
      await expect(page).toHaveURL(new RegExp(`${target.path.replaceAll('/', '\\/')}$`, 'u'))
      await expect(page.getByRole('heading', { level: 1, name: target.heading })).toBeVisible()
      await expect.poll(() => calls.some((call) => call.endpoint === target.expected)).toBe(true)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        ),
        `${target.path} 不得产生页面级横向溢出`,
      ).toBe(false)
    }

    expect(runtimeMessages).toEqual([])
  })

  test('navigates Plan -> Plan Detail -> Task Detail with production bindings', async ({
    page,
  }) => {
    const calls: Array<{ endpoint: string; body: unknown }> = []
    await prepare(page, calls)

    await page.goto('/iam/training/plans')
    await page.getByRole('button', { name: plan.name }).click()
    await expect(page).toHaveURL(new RegExp(`/iam/training/plans/${plan.id}$`, 'u'))
    await expect(page.getByRole('heading', { level: 1, name: '培训计划详情' })).toBeVisible()
    await expect
      .poll(() => calls.some((call) => call.endpoint === 'TrainingPlan/Detail'))
      .toBe(true)
    await expect.poll(() => calls.some((call) => call.endpoint === 'TrainingTask/Query')).toBe(true)

    await page.getByRole('button', { name: task.name }).click()
    await expect(page).toHaveURL(
      new RegExp(`/iam/training/plans/${plan.id}/tasks/${task.id}$`, 'u'),
    )
    await expect(page.getByRole('heading', { level: 1, name: '培训任务详情' })).toBeVisible()
    await expect
      .poll(() => calls.some((call) => call.endpoint === 'TrainingTask/Detail'))
      .toBe(true)
    await expect
      .poll(() => calls.some((call) => call.endpoint === 'TrainingTaskEmployee/Query'))
      .toBe(true)
  })

  test('sends all three Overview drilldown scopes to the backend', async ({ page }) => {
    const calls: Array<{ endpoint: string; body: unknown }> = []
    await prepare(page, calls)
    await page.goto('/iam/training/overview')
    await expect(page.getByRole('heading', { level: 1, name: '培训概览' })).toBeVisible()

    for (const target of [
      { name: '未完成人次', scope: 'INCOMPLETE' },
      { name: '当前逾期', scope: 'CURRENT_OVERDUE' },
      { name: '曾逾期', scope: 'EVER_OVERDUE' },
    ]) {
      await page.getByRole('button', { name: new RegExp(`^${target.name}`, 'u') }).click()
      await expect
        .poll(() =>
          calls.some(
            (call) =>
              call.endpoint === 'TrainingOverview/Incomplete' &&
              (call.body as Record<string, unknown>).drilldown_scope === target.scope,
          ),
        )
        .toBe(true)
    }
  })

  test('loads Statistics lookup APIs and consumes the paged exam report', async ({ page }) => {
    const calls: Array<{ endpoint: string; body: unknown }> = []
    await prepare(page, calls)
    await page.goto('/iam/training/statistics')
    await expect(page.getByRole('heading', { level: 1, name: '专项统计' })).toBeVisible()

    for (const endpoint of [
      'Organization/Query',
      'Position/Query',
      'TrainingCourse/Query',
      'TrainingExam/Query',
    ]) {
      await expect.poll(() => calls.some((call) => call.endpoint === endpoint)).toBe(true)
    }

    await page.getByRole('tab', { name: '考试结果' }).click()
    await expect
      .poll(() => calls.some((call) => call.endpoint === 'TrainingStatistics/ExamStatistics'))
      .toBe(true)
    await expect(page.getByRole('columnheader', { name: '考试名称' })).toBeVisible()
    await expect(
      page.locator('tbody').getByText('Q3 安全培训结业考试', { exact: true }).first(),
    ).toBeVisible()

    await page.locator('.el-pager li.number').filter({ hasText: /^2$/u }).click()
    await expect
      .poll(() =>
        calls.some(
          (call) =>
            call.endpoint === 'TrainingStatistics/ExamStatistics' &&
            (call.body as Record<string, unknown>).page_index === 2,
        ),
      )
      .toBe(true)
  })
})
