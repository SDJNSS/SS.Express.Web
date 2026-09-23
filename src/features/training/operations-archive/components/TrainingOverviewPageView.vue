<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, reactive, ref, watch } from 'vue'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import DashboardPageTemplate from '@shared/components/page-templates/DashboardPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import type {
  TrainingEmployeeTaskRecordDto,
  TrainingOverviewDto,
  TrainingPagedReportDto,
  TrainingTrendsDto,
} from '../api/trainingOperationsApi'
import {
  employeeStatusLabel,
  employeeStatusTone,
  percentage,
  taskStatusLabel,
  taskStatusTone,
} from '../operationsUi'
import type {
  TaskEmployeeRecord,
  TrainingOperationsPreviewState,
  TrainingPlanRecord,
  TrainingTaskRecord,
} from '../types/trainingOperations'

type OverviewSection = 'overview' | 'trends' | 'incomplete'
type OverviewDrilldownScope = 'INCOMPLETE' | 'CURRENT_OVERDUE' | 'EVER_OVERDUE'
type SectionStates = Partial<Record<OverviewSection, TrainingOperationsPreviewState>>

interface OverviewQuery {
  period: string[]
  planId: string
  taskId: string
  drilldownScope: OverviewDrilldownScope
  pageIndex: number
  pageSize: number
}

interface IncompleteRow {
  id: number
  employeeCode: string
  name: string
  organization: string
  planName: string
  taskName: string
  assignedAt: string
  firstLearningAt: string
  deadlineAt: string
  learningMinutes: number
  status: TaskEmployeeRecord['status']
  wasOverdue: boolean
  firstOverdueAt: string
  finalScore?: number
  finalPassed?: boolean
  completedAt: string
  hasDeadline: boolean
}

interface OverviewMetric {
  label: string
  value: number | string
  detail: string
  scope?: OverviewDrilldownScope
}

const props = withDefaults(
  defineProps<{
    plans: TrainingPlanRecord[]
    tasks: TrainingTaskRecord[]
    employees?: TaskEmployeeRecord[]
    state: TrainingOperationsPreviewState
    overview?: TrainingOverviewDto | undefined
    trends?: TrainingTrendsDto | undefined
    incomplete?: TrainingPagedReportDto<TrainingEmployeeTaskRecordDto> | undefined
    sectionStates?: SectionStates
    page?: number
    pageSize?: number
  }>(),
  {
    employees: () => [],
    overview: undefined,
    trends: undefined,
    incomplete: undefined,
    sectionStates: () => ({}),
    page: 1,
    pageSize: 10,
  },
)

const emit = defineEmits<{
  action: [message: string]
  query: [value: OverviewQuery]
  retry: [section?: OverviewSection]
}>()

const defaultPeriod = () => [
  dayjs().startOf('year').format('YYYY-MM-DD'),
  dayjs().endOf('year').format('YYYY-MM-DD'),
]
const query = reactive({ period: defaultPeriod(), planId: '', taskId: '' })
const drilldownScope = ref<OverviewDrilldownScope>('INCOMPLETE')
const currentPage = computed(() => props.page)
const currentPageSize = computed(() => props.pageSize)

watch(
  () => query.planId,
  () => {
    if (!query.taskId) return
    const selectedTask = props.tasks.find((item) => String(item.id) === query.taskId)
    if (selectedTask?.trainingId != null && String(selectedTask.trainingId) !== query.planId)
      query.taskId = ''
  },
)

const availableTasks = computed(() => {
  if (!query.planId) return props.tasks
  return props.tasks.filter(
    (item) => item.trainingId == null || String(item.trainingId) === query.planId,
  )
})

function sectionState(section: OverviewSection) {
  return props.sectionStates[section] ?? props.state
}

const fallbackTotals = computed(() => {
  const required = props.tasks.reduce((sum, item) => sum + item.expectedCount, 0)
  const completed = props.tasks.reduce((sum, item) => sum + item.completedCount, 0)
  const overdue = props.tasks.reduce((sum, item) => sum + (item.endAt ? item.overdueCount : 0), 0)
  return { required, completed, overdue }
})

const metricCards = computed<OverviewMetric[]>(() => {
  const report = props.overview
  if (!report) {
    return [
      { label: '培训任务', value: props.tasks.length, detail: '当前范围内任务总数' },
      {
        label: '未开始任务',
        value: props.tasks.filter((item) => item.status === 'NOT_STARTED').length,
        detail: '尚未开始',
      },
      {
        label: '进行中任务',
        value: props.tasks.filter((item) => item.status === 'ACTIVE').length,
        detail: '正在执行',
      },
      {
        label: '逾期任务',
        value: props.tasks.filter((item) => item.endAt && item.status === 'OVERDUE').length,
        detail: '任务已逾期',
      },
      {
        label: '已完成任务',
        value: props.tasks.filter((item) => item.status === 'COMPLETED').length,
        detail: '任务已完成',
      },
      {
        label: '执行人次',
        value: fallbackTotals.value.required,
        detail: '员工 × 任务 × 执行轮次',
      },
      {
        label: '已完成人次',
        value: fallbackTotals.value.completed,
        detail: `完成率 ${percentage(fallbackTotals.value.completed, fallbackTotals.value.required)}`,
      },
      {
        label: '未完成人次',
        value: Math.max(0, fallbackTotals.value.required - fallbackTotals.value.completed),
        detail: '点击查看清单',
        scope: 'INCOMPLETE',
      },
      {
        label: '总完成率',
        value: percentage(fallbackTotals.value.completed, fallbackTotals.value.required),
        detail: '包含管理员完成；不改写课程与考试事实',
      },
      {
        label: '当前逾期',
        value: fallbackTotals.value.overdue,
        detail: '点击查看清单',
        scope: 'CURRENT_OVERDUE',
      },
      {
        label: '曾逾期',
        value: props.employees.filter((item) => item.wasOverdue).length,
        detail: '点击查看清单',
        scope: 'EVER_OVERDUE',
      },
      {
        label: '去重员工',
        value: new Set(props.employees.map((item) => item.employeeId ?? item.id)).size,
        detail: '当前筛选范围',
      },
    ]
  }

  const population = report.employees
  const completionDetail = population.has_required_employees
    ? `完成率 ${percentage(population.completed_count, population.required_count)}`
    : '当前无人需要培训 · 100%'
  return [
    { label: '培训任务', value: report.task_count, detail: '当前范围内任务总数' },
    { label: '未开始任务', value: report.not_started_task_count, detail: '尚未开始' },
    { label: '进行中任务', value: report.active_task_count, detail: '正在执行' },
    { label: '逾期任务', value: report.overdue_task_count, detail: '任务已逾期' },
    { label: '已完成任务', value: report.completed_task_count, detail: '任务已完成' },
    {
      label: '执行人次',
      value: population.employee_task_count,
      detail: '员工 × 任务 × 执行轮次',
    },
    {
      label: '应培训人次',
      value: population.required_count,
      detail: `${population.distinct_employee_count} 名去重员工`,
    },
    {
      label: '已完成人次',
      value: population.completed_count,
      detail: `${completionDetail} · 包含管理员完成`,
    },
    {
      label: '未完成人次',
      value: population.incomplete_count,
      detail: '点击查看清单',
      scope: 'INCOMPLETE',
    },
    {
      label: '总完成率',
      value: `${population.completion_rate.toFixed(1)}%`,
      detail: population.has_required_employees
        ? '培训完成含管理员完成；课程与考试不伪造'
        : '当前无人需要培训',
    },
    {
      label: '当前逾期',
      value: population.current_overdue_count,
      detail: '点击查看清单',
      scope: 'CURRENT_OVERDUE',
    },
    {
      label: '曾逾期',
      value: population.ever_overdue_count,
      detail: '点击查看清单',
      scope: 'EVER_OVERDUE',
    },
    {
      label: '去重员工',
      value: population.distinct_employee_count,
      detail: '按员工去重，不等于执行人次',
    },
  ]
})

const statusDistribution = computed(() => {
  const distribution = props.trends?.task_status_distribution
  const source = distribution
    ? [
        { label: '未开始', count: distribution.NOT_STARTED ?? 0 },
        { label: '进行中', count: distribution.ACTIVE ?? 0 },
        { label: '已逾期', count: distribution.OVERDUE ?? 0 },
        { label: '已完成', count: distribution.COMPLETED ?? 0 },
      ]
    : [
        {
          label: '未开始',
          count: props.tasks.filter((item) => item.status === 'NOT_STARTED').length,
        },
        { label: '进行中', count: props.tasks.filter((item) => item.status === 'ACTIVE').length },
        {
          label: '已逾期',
          count: props.tasks.filter((item) => item.endAt && item.status === 'OVERDUE').length,
        },
        {
          label: '已完成',
          count: props.tasks.filter((item) => item.status === 'COMPLETED').length,
        },
      ]
  const total = source.reduce((sum, item) => sum + item.count, 0)
  return source.map((item) => ({
    ...item,
    percent: total ? Math.round((item.count / total) * 100) : 0,
  }))
})

const trendPoints = computed(() => props.trends?.points ?? [])
const trendMaximum = computed(() =>
  Math.max(
    1,
    ...trendPoints.value.flatMap((item) => [
      item.training_completed_count,
      item.course_completed_count,
      item.exam_submitted_count,
      item.exam_passed_count,
    ]),
  ),
)
const taskCount = computed(() =>
  statusDistribution.value.reduce((sum, item) => sum + item.count, 0),
)

function normalizeEmployeeStatus(status: string): TaskEmployeeRecord['status'] {
  const upper = status.toUpperCase()
  if (
    upper === 'LEARNING' ||
    upper === 'READY_FOR_EXAM' ||
    upper === 'EXAM_FAILED' ||
    upper === 'COMPLETED' ||
    upper === 'OVERDUE'
  )
    return upper
  return 'NOT_STARTED'
}

const incompleteRows = computed<IncompleteRow[]>(() => {
  if (props.incomplete) {
    return props.incomplete.items.map((item) => {
      const hasDeadline = Boolean(item.deadline_at)
      return {
        id: item.id,
        employeeCode: item.profile.user_name || String(item.employee_id),
        name: item.profile.display_name || item.profile.real_name || item.profile.user_name,
        organization: item.profile.organization_names || '当前无有效组织',
        planName: item.plan_name,
        taskName: item.task_name,
        assignedAt: dayjs(item.assigned_at).format('YYYY-MM-DD HH:mm'),
        firstLearningAt: item.first_learning_at
          ? dayjs(item.first_learning_at).format('YYYY-MM-DD HH:mm')
          : '—',
        deadlineAt: hasDeadline ? dayjs(item.deadline_at).format('YYYY-MM-DD HH:mm') : '无完成期限',
        learningMinutes: Math.floor(item.total_learning_seconds / 60),
        status: normalizeEmployeeStatus(
          !hasDeadline && item.status.toUpperCase() === 'OVERDUE' ? 'LEARNING' : item.status,
        ),
        wasOverdue: hasDeadline && item.ever_overdue,
        firstOverdueAt: hasDeadline ? (item.overdue_at ?? '—') : '—',
        ...(item.final_score == null ? {} : { finalScore: item.final_score }),
        ...(item.final_passed == null ? {} : { finalPassed: item.final_passed }),
        completedAt: item.completed_at ? dayjs(item.completed_at).format('YYYY-MM-DD HH:mm') : '—',
        hasDeadline,
      }
    })
  }
  return props.employees.map((item) => {
    const task = props.tasks.find((candidate) => candidate.id === item.id)
    const hasDeadline = Boolean(task?.endAt)
    return {
      id: item.id,
      employeeCode: item.employeeCode,
      name: item.name,
      organization: item.organization,
      planName: '—',
      taskName: task?.name ?? '—',
      assignedAt: item.assignedAt,
      firstLearningAt: '—',
      deadlineAt: task?.endAt ?? '无完成期限',
      learningMinutes: item.learningMinutes,
      status: !hasDeadline && item.status === 'OVERDUE' ? 'LEARNING' : item.status,
      wasOverdue: hasDeadline && item.wasOverdue,
      firstOverdueAt: hasDeadline ? (item.firstOverdueAt ?? '—') : '—',
      ...(item.finalScore == null ? {} : { finalScore: item.finalScore }),
      ...(item.finalPassed == null ? {} : { finalPassed: item.finalPassed }),
      completedAt: item.completedAt ?? '—',
      hasDeadline,
    }
  })
})

const employeeColumns: DataTableColumn[] = [
  { prop: 'employeeCode', label: '员工编号', width: 132 },
  { prop: 'name', label: '当前姓名', width: 110 },
  { prop: 'organization', label: '当前组织', minWidth: 156 },
  { prop: 'planName', label: '培训计划', minWidth: 190 },
  { prop: 'taskName', label: '培训任务', minWidth: 210 },
  { prop: 'assignedAt', label: '分配时间', minWidth: 160 },
  { prop: 'firstLearningAt', label: '首次学习', minWidth: 160 },
  { prop: 'deadlineAt', label: '截止时间', minWidth: 160 },
  { prop: 'learningMinutes', label: '累计学习（分钟）', width: 140, align: 'right' },
  { label: '培训状态', width: 112, slot: 'status' },
  { label: '曾逾期', width: 90, slot: 'wasOverdue' },
  { prop: 'firstOverdueAt', label: '首次逾期时间', minWidth: 168 },
  { label: '最终结果', width: 126, slot: 'result' },
  { prop: 'completedAt', label: '完成时间', minWidth: 160 },
]

function runQuery(pageIndex = 1, pageSize = currentPageSize.value) {
  emit('query', {
    period: [...query.period],
    planId: query.planId,
    taskId: query.taskId,
    drilldownScope: drilldownScope.value,
    pageIndex,
    pageSize,
  })
}

function reset() {
  query.period = defaultPeriod()
  query.planId = ''
  query.taskId = ''
  drilldownScope.value = 'INCOMPLETE'
  runQuery(1, currentPageSize.value)
}

const drilldownTitle = computed(
  () =>
    ({ INCOMPLETE: '未完成清单', CURRENT_OVERDUE: '当前逾期清单', EVER_OVERDUE: '曾逾期清单' })[
      drilldownScope.value
    ],
)
function selectDrilldown(scope: OverviewDrilldownScope) {
  drilldownScope.value = scope
  runQuery(1, currentPageSize.value)
}
function trendHeight(value: number) {
  return value ? `${Math.max(4, Math.round((value / trendMaximum.value) * 100))}%` : '0'
}

function onPageChange(pageIndex: number, pageSize: number) {
  runQuery(pageIndex, pageSize)
}
function displayTaskStatus(task: TrainingTaskRecord) {
  return !task.endAt && task.status === 'OVERDUE' ? 'ACTIVE' : task.status
}
</script>

<template>
  <AppPage class="training-operations-page training-overview-page">
    <DashboardPageTemplate>
      <template #header>
        <PageHeader title="培训概览" description="统一观察计划、任务、完成、考试与逾期结果" />
        <SearchPanel
          :loading="
            Object.values(sectionStates).some((item) => item === 'loading') || state === 'loading'
          "
          @search="runQuery()"
          @reset="reset"
        >
          <el-form-item label="统计时间"
            ><el-date-picker
              v-model="query.period"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
          /></el-form-item>
          <el-form-item label="培训计划"
            ><el-select v-model="query.planId" clearable placeholder="全部计划"
              ><el-option
                v-for="plan in plans"
                :key="plan.id"
                :label="plan.name"
                :value="String(plan.id)" /></el-select
          ></el-form-item>
          <el-form-item label="培训任务"
            ><el-select v-model="query.taskId" clearable placeholder="全部任务"
              ><el-option
                v-for="task in availableTasks"
                :key="task.id"
                :label="task.name"
                :value="String(task.id)" /></el-select
          ></el-form-item>
          <template #footer-leading>
            <span class="training-operations-page__summary"
              >统计时点：{{
                overview?.scope?.as_of
                  ? dayjs(overview.scope.as_of).format('YYYY-MM-DD HH:mm')
                  : '—'
              }}
              · {{ overview?.scope?.time_zone ?? 'Asia/Shanghai' }}</span
            >
          </template>
        </SearchPanel>
        <el-alert
          class="training-operations-page__alert"
          title="口径说明：管理员完成计入培训完成，但不伪造课程学习、考试提交、分数或通过率；执行人次与去重员工分别统计，无完成期限任务不计逾期。"
          type="info"
          :closable="false"
          show-icon
        />
      </template>

      <template #metrics>
        <el-alert
          v-if="sectionState('overview') === 'retryable-error'"
          title="核心指标加载失败，其他区域仍可继续查看"
          type="error"
          :closable="false"
          show-icon
          ><template #default
            ><el-button link type="primary" @click="emit('retry', 'overview')"
              >重试核心指标</el-button
            ></template
          ></el-alert
        >
        <section
          v-else
          v-loading="sectionState('overview') === 'loading'"
          class="training-kpi-grid"
          aria-label="培训核心指标"
        >
          <template v-for="metric in metricCards" :key="metric.label">
            <button
              v-if="metric.scope"
              type="button"
              class="training-kpi-card training-kpi-card--action"
              :class="{ 'training-kpi-card--active': drilldownScope === metric.scope }"
              :aria-pressed="drilldownScope === metric.scope"
              @click="selectDrilldown(metric.scope)"
            >
              <div class="training-kpi-card__header">
                <span>{{ metric.label }}</span
                ><span aria-hidden="true">●</span>
              </div>
              <div class="training-kpi-card__value">
                <strong>{{ sectionState('overview') === 'empty' ? '—' : metric.value }}</strong>
                <span>{{
                  sectionState('overview') === 'empty' ? '当前范围暂无统计结果' : metric.detail
                }}</span>
              </div>
            </button>
            <article v-else class="training-kpi-card">
              <div class="training-kpi-card__header">
                <span>{{ metric.label }}</span
                ><span aria-hidden="true">●</span>
              </div>
              <div class="training-kpi-card__value">
                <strong>{{ sectionState('overview') === 'empty' ? '—' : metric.value }}</strong
                ><span>{{
                  sectionState('overview') === 'empty' ? '当前范围暂无统计结果' : metric.detail
                }}</span>
              </div>
            </article>
          </template>
        </section>
      </template>

      <section class="training-dashboard-grid">
        <article v-loading="sectionState('trends') === 'loading'" class="training-surface">
          <div class="training-section-heading">
            <div>
              <h2>任务状态分布</h2>
              <p>同一筛选范围内的任务数量</p>
            </div>
            <StatusTag :label="`${taskCount} 个任务`" tone="info" />
          </div>
          <el-alert
            v-if="sectionState('trends') === 'retryable-error'"
            title="任务分布加载失败"
            type="error"
            :closable="false"
            show-icon
            ><template #default
              ><el-button link type="primary" @click="emit('retry', 'trends')"
                >重新加载</el-button
              ></template
            ></el-alert
          >
          <el-empty
            v-else-if="sectionState('trends') === 'empty'"
            description="当前范围暂无任务分布"
          />
          <div v-else class="training-distribution">
            <div v-for="item in statusDistribution" :key="item.label" class="training-progress-row">
              <span>{{ item.label }}</span
              ><el-progress
                :percentage="item.percent"
                :stroke-width="10"
                :show-text="false"
              /><strong>{{ item.count }} 个</strong>
            </div>
          </div>
        </article>

        <article v-loading="sectionState('trends') === 'loading'" class="training-surface">
          <div class="training-section-heading">
            <div>
              <h2>培训完成量趋势</h2>
              <p>柱高按区间最大完成量归一，精确数量见提示</p>
            </div>
            <span class="training-operations-page__summary">{{
              trends?.granularity || '按月'
            }}</span>
          </div>
          <el-alert
            v-if="sectionState('trends') === 'retryable-error'"
            title="趋势加载失败"
            type="error"
            :closable="false"
            show-icon
            ><template #default
              ><el-button link type="primary" @click="emit('retry', 'trends')"
                >重新加载</el-button
              ></template
            ></el-alert
          >
          <el-empty
            v-else-if="!trendPoints.length && sectionState('trends') !== 'loading'"
            description="当前范围暂无趋势数据"
          />
          <div v-else class="training-trend-wrap">
            <div class="training-trend-legend" aria-label="趋势图图例">
              <span><i class="training-trend-legend__training" />培训完成</span>
              <span><i class="training-trend-legend__course" />课程完成</span>
              <span><i class="training-trend-legend__exam" />考试提交（次数）</span>
              <span><i class="training-trend-legend__passed" />考试通过（次数）</span>
            </div>
            <div class="training-trend" role="img" aria-label="培训、课程与考试完成量趋势">
              <div
                v-for="point in trendPoints"
                :key="point.period_start"
                class="training-trend__item"
              >
                <div class="training-trend__bars">
                  <div
                    class="training-trend__bar training-trend__bar--training"
                    :style="{ height: trendHeight(point.training_completed_count) }"
                    :title="`培训完成 ${point.training_completed_count}`"
                  />
                  <div
                    class="training-trend__bar training-trend__bar--course"
                    :style="{ height: trendHeight(point.course_completed_count) }"
                    :title="`课程完成 ${point.course_completed_count}`"
                  />
                  <div
                    class="training-trend__bar training-trend__bar--exam"
                    :style="{ height: trendHeight(point.exam_submitted_count) }"
                    :title="`考试提交 ${point.exam_submitted_count} 次`"
                  />
                  <div
                    class="training-trend__bar training-trend__bar--passed"
                    :style="{ height: trendHeight(point.exam_passed_count) }"
                    :title="`考试通过 ${point.exam_passed_count} 次`"
                  />
                </div>
                <span>{{ dayjs(point.period_start).format('MM月') }}</span>
                <small
                  >{{ point.training_completed_count }} / {{ point.course_completed_count }} /
                  {{ point.exam_submitted_count }} / {{ point.exam_passed_count }}</small
                >
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="training-surface">
        <div class="training-section-heading">
          <div>
            <h2>{{ drilldownTitle }}</h2>
            <p>只读下钻；进度与结果均由服务端形成</p>
          </div>
          <span class="training-operations-page__summary"
            >共 {{ incomplete?.total ?? incompleteRows.length }} 条</span
          >
        </div>
        <el-alert
          v-if="sectionState('incomplete') === 'retryable-error'"
          title="清单加载失败，筛选条件已保留"
          type="error"
          :closable="false"
          show-icon
          ><template #default
            ><el-button link type="primary" @click="emit('retry', 'incomplete')"
              >重新加载</el-button
            ></template
          ></el-alert
        >
        <DataTable
          v-else
          :data="incompleteRows as unknown as Record<string, unknown>[]"
          :columns="employeeColumns"
          :loading="sectionState('incomplete') === 'loading'"
          height="300px"
        >
          <template #status="{ row }"
            ><StatusTag
              :label="employeeStatusLabel((row as unknown as IncompleteRow).status)"
              :tone="employeeStatusTone((row as unknown as IncompleteRow).status)"
          /></template>
          <template #wasOverdue="{ row }"
            ><StatusTag
              :label="(row as unknown as IncompleteRow).wasOverdue ? '曾逾期' : '否'"
              :tone="(row as unknown as IncompleteRow).wasOverdue ? 'warning' : 'info'"
          /></template>
          <template #result="{ row }">{{
            (row as unknown as IncompleteRow).finalScore == null
              ? '暂无结果'
              : `${(row as unknown as IncompleteRow).finalScore} 分 · ${(row as unknown as IncompleteRow).finalPassed ? '通过' : '未通过'}`
          }}</template>
        </DataTable>
        <AppPagination
          v-if="sectionState('incomplete') !== 'retryable-error'"
          :page="currentPage"
          :page-size="currentPageSize"
          :total="incomplete?.total ?? incompleteRows.length"
          @update:page="onPageChange($event, currentPageSize)"
          @update:page-size="onPageChange(1, $event)"
        />
      </section>

      <section v-if="tasks.length" class="training-surface">
        <div class="training-section-heading">
          <div>
            <h2>任务运行状态</h2>
            <p>状态由服务端形成，浏览器不自行推导</p>
          </div>
        </div>
        <div class="training-detail-tags">
          <StatusTag
            v-for="task in tasks"
            :key="task.id"
            :label="`${taskStatusLabel(displayTaskStatus(task))} · ${task.name} · ${task.endAt ? dayjs(task.endAt).format('YYYY-MM-DD HH:mm') : '无完成期限'}`"
            :tone="taskStatusTone(displayTaskStatus(task))"
          />
        </div>
      </section>
    </DashboardPageTemplate>
  </AppPage>
</template>

<style scoped lang="scss">
@use '../styles/training-operations.scss';

.training-kpi-card--action {
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.training-kpi-card--action:hover,
.training-kpi-card--active {
  border-color: var(--color-primary);
}

.training-kpi-card--action:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: var(--spacing-1);
}

.training-trend-wrap,
.training-trend__bars {
  display: grid;
}

.training-trend-wrap {
  gap: var(--spacing-3);
}

.training-trend-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.training-trend-legend span {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
}

.training-trend-legend i {
  width: var(--spacing-2);
  height: var(--spacing-2);
  border-radius: var(--radius-small);
}

.training-trend-legend__training,
.training-trend__bar--training {
  background: var(--color-primary);
}

.training-trend-legend__course,
.training-trend__bar--course {
  background: var(--color-success);
}

.training-trend-legend__exam,
.training-trend__bar--exam {
  background: var(--color-warning);
}

.training-trend-legend__passed,
.training-trend__bar--passed {
  background: var(--color-danger);
}

.training-trend__bars {
  grid-template-columns: repeat(4, minmax(3px, 1fr));
  align-items: end;
  gap: var(--spacing-1);
  height: 100%;
}

.training-trend__bars .training-trend__bar {
  width: auto;
  min-height: 0;
}

.training-trend__item {
  grid-template-rows: minmax(0, 1fr) auto auto;
}

.training-trend__item small {
  overflow: hidden;
  color: var(--text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
