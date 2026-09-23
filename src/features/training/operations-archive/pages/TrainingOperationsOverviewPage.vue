<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, ref } from 'vue'

import { notification } from '@shared/services/notification'
import { mapTrainingPlan, mapTrainingTask } from '../adapters/trainingOperationsAdapter'
import {
  currentTrainingTenantId,
  trainingApiErrorMessage,
  trainingOperationsApi,
  type TrainingEmployeeTaskRecordDto,
  type TrainingOverviewDto,
  type TrainingPagedReportDto,
  type TrainingReportRequest,
  type TrainingTrendsDto,
} from '../api/trainingOperationsApi'
import TrainingOverviewPageView from '../components/TrainingOverviewPageView.vue'
import type {
  TrainingOperationsPreviewState,
  TrainingPlanRecord,
  TrainingTaskRecord,
} from '../types/trainingOperations'

type OverviewSection = 'overview' | 'trends' | 'incomplete'
interface OverviewQuery {
  period: string[]
  planId: string
  taskId: string
  drilldownScope: 'INCOMPLETE' | 'CURRENT_OVERDUE' | 'EVER_OVERDUE'
  pageIndex: number
  pageSize: number
}

const plans = ref<TrainingPlanRecord[]>([])
const tasks = ref<TrainingTaskRecord[]>([])
const overview = ref<TrainingOverviewDto>()
const trends = ref<TrainingTrendsDto>()
const incomplete = ref<TrainingPagedReportDto<TrainingEmployeeTaskRecordDto>>()
const sectionStates = ref<Record<OverviewSection, TrainingOperationsPreviewState>>({
  overview: 'loading',
  trends: 'loading',
  incomplete: 'loading',
})
const page = ref(1)
const pageSize = ref(10)
const currentQuery = ref<OverviewQuery>({
  period: [
    dayjs().startOf('year').format('YYYY-MM-DD'),
    dayjs().endOf('year').format('YYYY-MM-DD'),
  ],
  planId: '',
  taskId: '',
  drilldownScope: 'INCOMPLETE',
  pageIndex: 1,
  pageSize: 10,
})
let overviewSequence = 0
let trendsSequence = 0
let incompleteSequence = 0
let optionSequence = 0

const pageState = computed<TrainingOperationsPreviewState>(() => {
  const values = Object.values(sectionStates.value)
  if (values.every((item) => item === 'loading')) return 'loading'
  if (values.every((item) => item === 'retryable-error')) return 'retryable-error'
  if (values.every((item) => item === 'empty')) return 'empty'
  return 'ready'
})

const tenantId = currentTrainingTenantId
const errorMessage = trainingApiErrorMessage
function numericId(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function requestFor(
  query: OverviewQuery,
  targetPage = 1,
  targetPageSize = 10,
  includeDrilldown = false,
): TrainingReportRequest {
  const planId = numericId(query.planId)
  const taskId = numericId(query.taskId)
  return {
    page_index: targetPage,
    page_size: targetPageSize,
    ...(query.period[0]
      ? { start_at_from: dayjs(query.period[0]).startOf('day').format('YYYY-MM-DDTHH:mm:ss') }
      : {}),
    ...(query.period[1]
      ? {
          start_at_to: dayjs(query.period[1])
            .add(1, 'day')
            .startOf('day')
            .format('YYYY-MM-DDTHH:mm:ss'),
        }
      : {}),
    ...(planId == null ? {} : { training_id: planId }),
    ...(taskId == null ? {} : { training_task_id: taskId }),
    ...(includeDrilldown ? { drilldown_scope: query.drilldownScope } : {}),
  }
}

async function loadOptions() {
  const sequence = ++optionSequence
  const tenantAtStart = tenantId()
  const [planResult, taskResult] = await Promise.allSettled([
    trainingOperationsApi.queryPlans({ page_index: 1, page_size: 100 }),
    trainingOperationsApi.queryTasks({ page_index: 1, page_size: 100 }),
  ])
  if (sequence !== optionSequence || tenantAtStart !== tenantId()) return
  if (planResult.status === 'fulfilled') plans.value = planResult.value.items.map(mapTrainingPlan)
  else notification.error(errorMessage(planResult.reason, '培训计划筛选项加载失败'))
  if (taskResult.status === 'fulfilled') tasks.value = taskResult.value.items.map(mapTrainingTask)
  else notification.error(errorMessage(taskResult.reason, '培训任务筛选项加载失败'))
}

async function loadOverview() {
  const sequence = ++overviewSequence
  const tenantAtStart = tenantId()
  sectionStates.value.overview = 'loading'
  try {
    const result = await trainingOperationsApi.overview(requestFor(currentQuery.value, 1, 1))
    if (sequence !== overviewSequence || tenantAtStart !== tenantId()) return
    overview.value = result
    sectionStates.value.overview =
      result.task_count || result.employees.employee_task_count ? 'ready' : 'empty'
  } catch (error) {
    if (sequence !== overviewSequence || tenantAtStart !== tenantId()) return
    sectionStates.value.overview = 'retryable-error'
    notification.error(errorMessage(error, '培训核心指标加载失败'))
  }
}

async function loadTrends() {
  const sequence = ++trendsSequence
  const tenantAtStart = tenantId()
  sectionStates.value.trends = 'loading'
  try {
    const result = await trainingOperationsApi.trends(requestFor(currentQuery.value, 1, 1))
    if (sequence !== trendsSequence || tenantAtStart !== tenantId()) return
    trends.value = result
    const distributionTotal = Object.values(result.task_status_distribution).reduce(
      (sum, value) => sum + value,
      0,
    )
    sectionStates.value.trends = result.points.length || distributionTotal ? 'ready' : 'empty'
  } catch (error) {
    if (sequence !== trendsSequence || tenantAtStart !== tenantId()) return
    sectionStates.value.trends = 'retryable-error'
    notification.error(errorMessage(error, '培训趋势加载失败'))
  }
}

async function loadIncomplete() {
  const sequence = ++incompleteSequence
  const tenantAtStart = tenantId()
  sectionStates.value.incomplete = 'loading'
  try {
    const result = await trainingOperationsApi.incomplete(
      requestFor(currentQuery.value, page.value, pageSize.value, true),
    )
    if (sequence !== incompleteSequence || tenantAtStart !== tenantId()) return
    incomplete.value = result
    sectionStates.value.incomplete = result.total ? 'ready' : 'empty'
  } catch (error) {
    if (sequence !== incompleteSequence || tenantAtStart !== tenantId()) return
    sectionStates.value.incomplete = 'retryable-error'
    notification.error(errorMessage(error, '未完成与逾期清单加载失败'))
  }
}

async function query(value: OverviewQuery) {
  const previous = currentQuery.value
  const filtersChanged =
    previous.planId !== value.planId ||
    previous.taskId !== value.taskId ||
    previous.period.join('|') !== value.period.join('|')
  currentQuery.value = { ...value, period: [...value.period] }
  page.value = value.pageIndex
  pageSize.value = value.pageSize
  if (filtersChanged) await Promise.all([loadOverview(), loadTrends(), loadIncomplete()])
  else await loadIncomplete()
}

async function retry(section?: OverviewSection) {
  if (section === 'overview') return loadOverview()
  if (section === 'trends') return loadTrends()
  if (section === 'incomplete') return loadIncomplete()
  await Promise.all([loadOverview(), loadTrends(), loadIncomplete()])
}

onMounted(() => {
  document.title = '培训概览 · 陆链控制台'
  void Promise.all([loadOptions(), retry()])
})
</script>

<template>
  <TrainingOverviewPageView
    :plans="plans"
    :tasks="tasks"
    :state="pageState"
    :overview="overview"
    :trends="trends"
    :incomplete="incomplete"
    :section-states="sectionStates"
    :page="page"
    :page-size="pageSize"
    @query="query"
    @retry="retry"
  />
</template>
