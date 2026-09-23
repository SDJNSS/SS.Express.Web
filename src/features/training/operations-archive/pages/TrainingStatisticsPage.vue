<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import { notification } from '@shared/services/notification'
import {
  mapTaskEmployee,
  mapTrainingPlan,
  mapTrainingTask,
} from '../adapters/trainingOperationsAdapter'
import {
  currentTrainingTenantId,
  trainingApiErrorMessage,
  trainingOperationsApi,
  type TrainingCourseStatisticsDto,
  type TrainingExamStatisticsDto,
  type TrainingOverdueReportDto,
  type TrainingPagedReportDto,
  type TrainingReportRequest,
  type TrainingTaskStatisticsReportDto,
} from '../api/trainingOperationsApi'
import TrainingStatisticsPageView from '../components/TrainingStatisticsPageView.vue'
import { TRAINING_PERMISSIONS } from '../trainingPermissions'
import type {
  TrainingOperationsPreviewState,
  PersonnelDrilldownContext,
  TaskEmployeeRecord,
  TrainingPlanRecord,
  TrainingTaskRecord,
} from '../types/trainingOperations'

type StatisticsTab = 'task' | 'course' | 'exam' | 'overdue'
interface StatisticsQuery {
  tab: StatisticsTab
  period: string[]
  planId: string
  taskId: string
  taskType: string
  taskStatus: string
  employeeStatus: string
  overdue: string
  keyword: string
  organizationId: string
  positionId: string
  courseId: string
  examId: string
  pageIndex: number
  pageSize: number
}
interface PersonnelDrilldownRequest extends PersonnelDrilldownContext {
  trainingTaskId: number
  pageIndex: number
  pageSize: number
}

function defaultQuery(tab: StatisticsTab): StatisticsQuery {
  return {
    tab,
    period: [
      dayjs().startOf('year').format('YYYY-MM-DD'),
      dayjs().endOf('year').format('YYYY-MM-DD'),
    ],
    planId: '',
    taskId: '',
    taskType: '',
    taskStatus: '',
    employeeStatus: '',
    overdue: '',
    keyword: '',
    organizationId: '',
    positionId: '',
    courseId: '',
    examId: '',
    pageIndex: 1,
    pageSize: 10,
  }
}

const { hasPermission } = useEffectivePermissions()
const router = useRouter()
const plans = ref<TrainingPlanRecord[]>([])
const tasks = ref<TrainingTaskRecord[]>([])
const organizationOptions = ref<Array<{ id: number; label: string }>>([])
const positionOptions = ref<Array<{ id: number; label: string }>>([])
const courseOptions = ref<Array<{ id: number; label: string }>>([])
const examOptions = ref<Array<{ id: number; label: string }>>([])
const taskReport = ref<TrainingTaskStatisticsReportDto>()
const courseReport = ref<TrainingPagedReportDto<TrainingCourseStatisticsDto>>()
const examReport = ref<TrainingExamStatisticsDto>()
const overdueReport = ref<TrainingOverdueReportDto>()
const sectionStates = ref<Record<StatisticsTab, TrainingOperationsPreviewState>>({
  task: 'loading',
  course: 'empty',
  exam: 'empty',
  overdue: 'empty',
})
const pages = ref<Record<StatisticsTab, number>>({ task: 1, course: 1, exam: 1, overdue: 1 })
const pageSizes = ref<Record<StatisticsTab, number>>({
  task: 10,
  course: 10,
  exam: 10,
  overdue: 10,
})
const queries = ref<Record<StatisticsTab, StatisticsQuery>>({
  task: defaultQuery('task'),
  course: defaultQuery('course'),
  exam: defaultQuery('exam'),
  overdue: defaultQuery('overdue'),
})
const sequences = ref<Record<StatisticsTab, number>>({ task: 0, course: 0, exam: 0, overdue: 0 })
const exporting = ref(false)
const exportVersion = ref(0)
const drilldownEmployees = ref<TaskEmployeeRecord[]>([])
const drilldownTotal = ref(0)
const drilldownPage = ref(1)
const drilldownPageSize = ref(10)
const drilldownState = ref<TrainingOperationsPreviewState>('empty')
let optionSequence = 0
let drilldownSequence = 0

const canExport = computed(() => hasPermission(TRAINING_PERMISSIONS.statistics.export))
const canAuditExport = computed(() => hasPermission(TRAINING_PERMISSIONS.statistics.auditExport))
const canViewTaskDetail = computed(() => hasPermission(TRAINING_PERMISSIONS.tasks.detail))

const tenantId = currentTrainingTenantId
const errorMessage = trainingApiErrorMessage
function numberValue(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function buildRequest(query: StatisticsQuery): TrainingReportRequest & { task_type?: string } {
  const planId = numberValue(query.planId)
  const taskId = numberValue(query.taskId)
  const organizationId = numberValue(query.organizationId)
  const positionId = numberValue(query.positionId)
  const courseId = numberValue(query.courseId)
  const examId = numberValue(query.examId)
  return {
    page_index: query.pageIndex,
    page_size: query.pageSize,
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
    ...(query.taskType ? { task_type: query.taskType } : {}),
    ...(query.taskStatus ? { task_status: query.taskStatus } : {}),
    ...(query.employeeStatus ? { employee_status: query.employeeStatus } : {}),
    ...(query.overdue ? { ever_overdue: query.overdue === 'true' } : {}),
    ...(query.keyword.trim() ? { keyword: query.keyword.trim() } : {}),
    ...(organizationId == null ? {} : { org_id: organizationId }),
    ...(positionId == null ? {} : { position_id: positionId }),
    ...(courseId == null ? {} : { course_id: courseId }),
    ...(examId == null ? {} : { exam_id: examId }),
  }
}

async function loadOptions() {
  const sequence = ++optionSequence
  const tenantAtStart = tenantId()
  organizationOptions.value = []
  positionOptions.value = []
  courseOptions.value = []
  examOptions.value = []
  const [planResult, taskResult, organizationResult, positionResult, courseResult, examResult] =
    await Promise.allSettled([
      trainingOperationsApi.queryPlans({ page_index: 1, page_size: 100 }),
      trainingOperationsApi.queryTasks({ page_index: 1, page_size: 100 }),
      trainingOperationsApi.queryOrganizations({
        tenant_id: tenantAtStart,
        query_type: 'list',
        page_index: 1,
        page_size: 200,
        status: 'ACTIVE',
      }),
      trainingOperationsApi.queryPositions({
        tenant_id: tenantAtStart,
        page_index: 1,
        page_size: 200,
        status: 'ACTIVE',
      }),
      trainingOperationsApi.queryCourses({ page_index: 1, page_size: 200 }),
      trainingOperationsApi.queryExams({ page_index: 1, page_size: 200 }),
    ])
  if (sequence !== optionSequence || tenantAtStart !== tenantId()) return
  if (planResult.status === 'fulfilled') plans.value = planResult.value.items.map(mapTrainingPlan)
  else notification.error(errorMessage(planResult.reason, '培训计划筛选项加载失败'))
  if (taskResult.status === 'fulfilled') tasks.value = taskResult.value.items.map(mapTrainingTask)
  else notification.error(errorMessage(taskResult.reason, '培训任务筛选项加载失败'))
  if (organizationResult.status === 'fulfilled') {
    organizationOptions.value = organizationResult.value.items.map((item) => ({
      id: item.id,
      label: `${item.org_name} · ${item.org_code}`,
    }))
  } else notification.error(errorMessage(organizationResult.reason, '组织筛选项加载失败'))
  if (positionResult.status === 'fulfilled') {
    positionOptions.value = positionResult.value.items.map((item) => ({
      id: item.id,
      label: `${item.position_name} · ${item.position_code}`,
    }))
  } else notification.error(errorMessage(positionResult.reason, '岗位筛选项加载失败'))
  if (courseResult.status === 'fulfilled') {
    courseOptions.value = courseResult.value.items.map((item) => ({
      id: item.id,
      label: item.course_name,
    }))
  } else notification.error(errorMessage(courseResult.reason, '课程筛选项加载失败'))
  if (examResult.status === 'fulfilled') {
    examOptions.value = examResult.value.items.map((item) => ({
      id: item.id,
      label: item.exam_name,
    }))
  } else notification.error(errorMessage(examResult.reason, '考试筛选项加载失败'))
}

async function load(tab: StatisticsTab) {
  const sequence = ++sequences.value[tab]
  const tenantAtStart = tenantId()
  const query = queries.value[tab]
  sectionStates.value[tab] = 'loading'
  try {
    if (tab === 'task') {
      const result = await trainingOperationsApi.taskStatistics(buildRequest(query))
      if (sequence !== sequences.value[tab] || tenantAtStart !== tenantId()) return
      taskReport.value = result
      sectionStates.value[tab] = result.total ? 'ready' : 'empty'
    } else if (tab === 'course') {
      const result = await trainingOperationsApi.courseStatistics(buildRequest(query))
      if (sequence !== sequences.value[tab] || tenantAtStart !== tenantId()) return
      courseReport.value = result
      sectionStates.value[tab] = result.total ? 'ready' : 'empty'
    } else if (tab === 'exam') {
      const result = await trainingOperationsApi.examStatistics(buildRequest(query))
      if (sequence !== sequences.value[tab] || tenantAtStart !== tenantId()) return
      examReport.value = result
      sectionStates.value[tab] =
        result.total || result.summary.participant_count ? 'ready' : 'empty'
    } else {
      const result = await trainingOperationsApi.overdueStatistics(buildRequest(query))
      if (sequence !== sequences.value[tab] || tenantAtStart !== tenantId()) return
      overdueReport.value = result
      sectionStates.value[tab] = result.total || result.ever_overdue_count ? 'ready' : 'empty'
    }
  } catch (error) {
    if (sequence !== sequences.value[tab] || tenantAtStart !== tenantId()) return
    sectionStates.value[tab] = 'retryable-error'
    notification.error(errorMessage(error, '专项统计加载失败'))
  }
}

async function query(value: StatisticsQuery) {
  queries.value[value.tab] = { ...value, period: [...value.period] }
  pages.value[value.tab] = value.pageIndex
  pageSizes.value[value.tab] = value.pageSize
  await load(value.tab)
}

async function openTask(target: { taskId: number; trainingId?: number }) {
  if (!canViewTaskDetail.value) return
  const tenantAtStart = tenantId()
  try {
    const trainingId =
      target.trainingId ?? (await trainingOperationsApi.getTask(target.taskId)).training_id
    if (tenantAtStart !== tenantId()) return
    await router.push({
      name: 'training-task-detail',
      params: { planId: trainingId, taskId: target.taskId },
    })
  } catch (error) {
    notification.error(errorMessage(error, '无法打开培训任务详情'))
  }
}

async function loadPersonnel(value: PersonnelDrilldownRequest) {
  const sequence = ++drilldownSequence
  const tenantAtStart = tenantId()
  drilldownPage.value = value.pageIndex
  drilldownPageSize.value = value.pageSize
  drilldownState.value = 'loading'
  try {
    const result = await trainingOperationsApi.queryTaskEmployees({
      training_task_id: value.trainingTaskId,
      page_index: value.pageIndex,
      page_size: value.pageSize,
      ...(value.courseId == null ? {} : { course_id: value.courseId }),
      ...(value.courseStatus ? { course_learning_status: value.courseStatus } : {}),
      ...(value.examId == null ? {} : { exam_id: value.examId }),
      ...(value.examStatus ? { exam_status: value.examStatus } : {}),
    })
    if (sequence !== drilldownSequence || tenantAtStart !== tenantId()) return
    drilldownEmployees.value = result.employees.items.map(mapTaskEmployee)
    drilldownTotal.value = result.employees.total
    drilldownState.value = result.employees.total ? 'ready' : 'empty'
  } catch (error) {
    if (sequence !== drilldownSequence || tenantAtStart !== tenantId()) return
    drilldownState.value = 'retryable-error'
    notification.error(errorMessage(error, '人员明细加载失败'))
  }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

async function exportCurrent(tab: StatisticsTab) {
  if (exporting.value) return
  if (tab !== 'task' && tab !== 'exam') return
  if (tab === 'exam' ? !canAuditExport.value : !canExport.value) return
  exporting.value = true
  try {
    const request = buildRequest({ ...queries.value[tab], pageIndex: 1, pageSize: 200 })
    const blob =
      tab === 'exam'
        ? await trainingOperationsApi.exportExamMaterials(request)
        : await trainingOperationsApi.exportTaskLedger(request)
    download(
      blob,
      `${tab === 'exam' ? '考试审计材料' : '培训任务台账'}-${dayjs().format('YYYYMMDD-HHmmss')}.xlsx`,
    )
    notification.success(tab === 'exam' ? '考试审计材料已导出' : '培训任务台账已导出')
    exportVersion.value += 1
  } catch (error) {
    notification.error(errorMessage(error, '专项统计导出失败'))
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  document.title = '专项统计 · 陆链控制台'
  void Promise.all([loadOptions(), load('task')])
})
</script>

<template>
  <TrainingStatisticsPageView
    :plans="plans"
    :tasks="tasks"
    :employees="[]"
    :archives="[]"
    :state="sectionStates.task"
    :task-report="taskReport"
    :course-report="courseReport"
    :exam-report="examReport"
    :overdue-report="overdueReport"
    :section-states="sectionStates"
    :pages="pages"
    :page-sizes="pageSizes"
    :can-export="canExport"
    :can-audit-export="canAuditExport"
    :exporting="exporting"
    :export-version="exportVersion"
    :organization-options="organizationOptions"
    :position-options="positionOptions"
    :course-options="courseOptions"
    :exam-options="examOptions"
    :can-view-task-detail="canViewTaskDetail"
    :drilldown-employees="drilldownEmployees"
    :drilldown-total="drilldownTotal"
    :drilldown-state="drilldownState"
    :drilldown-page="drilldownPage"
    :drilldown-page-size="drilldownPageSize"
    @query="query"
    @retry="load"
    @export="exportCurrent"
    @open-task="openTask"
    @drilldown="loadPersonnel"
  />
</template>
