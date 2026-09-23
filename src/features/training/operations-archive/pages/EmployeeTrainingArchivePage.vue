<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, ref } from 'vue'

import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import { notification } from '@shared/services/notification'
import { mapTrainingPlan, mapTrainingTask } from '../adapters/trainingOperationsAdapter'
import {
  currentTrainingTenantId,
  trainingApiErrorMessage,
  trainingOperationsApi,
  type TrainingCourseResultsDto,
  type TrainingEmployeeArchiveDetailDto,
  type TrainingEmployeeArchiveDto,
  type TrainingExamHistoryDto,
  type TrainingExamSnapshotDto,
  type TrainingPagedReportDto,
  type TrainingReportRequest,
} from '../api/trainingOperationsApi'
import EmployeeTrainingArchivePageView from '../components/EmployeeTrainingArchivePageView.vue'
import { TRAINING_PERMISSIONS } from '../trainingPermissions'
import type {
  TrainingOperationsPreviewState,
  TrainingPlanRecord,
  TrainingTaskRecord,
} from '../types/trainingOperations'

type ArchiveSection = 'list' | 'detail' | 'tasks' | 'courses' | 'exams' | 'snapshot'
interface ArchiveQuery {
  keyword: string
  year: string
  planId: string
  taskType: string
  taskStatus: string
  employeeStatus: string
  overdue: string
  organizationId: string
  positionId: string
  finalPassed: string
  period: string[]
  pageIndex: number
  pageSize: number
}

const { hasPermission } = useEffectivePermissions()
const plans = ref<TrainingPlanRecord[]>([])
const tasks = ref<TrainingTaskRecord[]>([])
const organizationOptions = ref<Array<{ id: number; label: string }>>([])
const positionOptions = ref<Array<{ id: number; label: string }>>([])
const archiveReport = ref<TrainingPagedReportDto<TrainingEmployeeArchiveDto>>()
const detail = ref<TrainingEmployeeArchiveDetailDto>()
const taskReport = ref<TrainingEmployeeArchiveDetailDto['tasks']>()
const courseResults = ref<TrainingCourseResultsDto>()
const examHistory = ref<TrainingExamHistoryDto>()
const examSnapshot = ref<TrainingExamSnapshotDto>()
const sectionStates = ref<Record<ArchiveSection, TrainingOperationsPreviewState>>({
  list: 'loading',
  detail: 'empty',
  tasks: 'empty',
  courses: 'empty',
  exams: 'empty',
  snapshot: 'empty',
})
const page = ref(1)
const pageSize = ref(10)
const detailTaskPage = ref(1)
const detailTaskPageSize = ref(10)
const exporting = ref(false)
const exportVersion = ref(0)
const selectedEmployeeId = ref<number>()
const selectedTaskEmployeeId = ref<number>()
const selectedExamId = ref<number>()
const currentQuery = ref<ArchiveQuery>({
  keyword: '',
  year: '',
  planId: '',
  taskType: '',
  taskStatus: '',
  employeeStatus: '',
  overdue: '',
  organizationId: '',
  positionId: '',
  finalPassed: '',
  period: [],
  pageIndex: 1,
  pageSize: 10,
})
let listSequence = 0
let detailSequence = 0
let taskSequence = 0
let courseSequence = 0
let examSequence = 0
let snapshotSequence = 0
let optionSequence = 0

const canExport = computed(() => hasPermission(TRAINING_PERMISSIONS.archives.export))
const canExportExamMaterials = computed(() =>
  hasPermission(TRAINING_PERMISSIONS.archives.exportExamMaterials),
)
const canViewExamSnapshot = computed(() =>
  hasPermission(TRAINING_PERMISSIONS.archives.examSnapshot),
)

const tenantId = currentTrainingTenantId
const errorMessage = trainingApiErrorMessage
function numberValue(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function buildRequest(
  query: ArchiveQuery,
  targetPage = query.pageIndex,
  targetPageSize = query.pageSize,
): TrainingReportRequest & { task_type?: string } {
  const year = numberValue(query.year)
  const planId = numberValue(query.planId)
  const organizationId = numberValue(query.organizationId)
  const positionId = numberValue(query.positionId)
  return {
    page_index: targetPage,
    page_size: targetPageSize,
    ...(query.keyword.trim() ? { keyword: query.keyword.trim() } : {}),
    ...(year == null ? {} : { plan_year: year }),
    ...(planId == null ? {} : { training_id: planId }),
    ...(query.taskType ? { task_type: query.taskType } : {}),
    ...(query.taskStatus ? { task_status: query.taskStatus } : {}),
    ...(query.employeeStatus ? { employee_status: query.employeeStatus } : {}),
    ...(query.overdue ? { ever_overdue: query.overdue === 'true' } : {}),
    ...(organizationId == null ? {} : { org_id: organizationId }),
    ...(positionId == null ? {} : { position_id: positionId }),
    ...(query.finalPassed ? { final_passed: query.finalPassed === 'true' } : {}),
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
  }
}

async function loadOptions() {
  const sequence = ++optionSequence
  const tenantAtStart = tenantId()
  const currentTenantId = tenantAtStart
  const [planResult, taskResult, organizationResult, positionResult] = await Promise.allSettled([
    trainingOperationsApi.queryPlans({ page_index: 1, page_size: 100 }),
    trainingOperationsApi.queryTasks({ page_index: 1, page_size: 100 }),
    trainingOperationsApi.queryOrganizations({
      tenant_id: currentTenantId,
      query_type: 'list',
      page_index: 1,
      page_size: 200,
      status: 'ACTIVE',
    }),
    trainingOperationsApi.queryPositions({
      tenant_id: currentTenantId,
      page_index: 1,
      page_size: 200,
      status: 'ACTIVE',
    }),
  ])
  if (sequence !== optionSequence || tenantAtStart !== tenantId()) return
  if (planResult.status === 'fulfilled') plans.value = planResult.value.items.map(mapTrainingPlan)
  else notification.error(errorMessage(planResult.reason, '培训计划筛选项加载失败'))
  if (taskResult.status === 'fulfilled') tasks.value = taskResult.value.items.map(mapTrainingTask)
  else notification.error(errorMessage(taskResult.reason, '培训任务筛选项加载失败'))
  if (organizationResult.status === 'fulfilled')
    organizationOptions.value = organizationResult.value.items.map((item) => ({
      id: item.id,
      label: `${item.org_name} · ${item.org_code}`,
    }))
  else notification.error(errorMessage(organizationResult.reason, '组织筛选项加载失败'))
  if (positionResult.status === 'fulfilled')
    positionOptions.value = positionResult.value.items.map((item) => ({
      id: item.id,
      label: `${item.position_name} · ${item.position_code}`,
    }))
  else notification.error(errorMessage(positionResult.reason, '岗位筛选项加载失败'))
}

async function loadList() {
  const sequence = ++listSequence
  const tenantAtStart = tenantId()
  sectionStates.value.list = 'loading'
  try {
    const result = await trainingOperationsApi.archives(
      buildRequest(currentQuery.value, page.value, pageSize.value),
    )
    if (sequence !== listSequence || tenantAtStart !== tenantId()) return
    archiveReport.value = result
    sectionStates.value.list = result.total ? 'ready' : 'empty'
  } catch (error) {
    if (sequence !== listSequence || tenantAtStart !== tenantId()) return
    sectionStates.value.list = 'retryable-error'
    notification.error(errorMessage(error, '员工培训档案加载失败'))
  }
}

async function query(value: ArchiveQuery) {
  currentQuery.value = { ...value, period: [...value.period] }
  page.value = value.pageIndex
  pageSize.value = value.pageSize
  selectedEmployeeId.value = undefined
  selectedTaskEmployeeId.value = undefined
  detail.value = undefined
  taskReport.value = undefined
  courseResults.value = undefined
  examHistory.value = undefined
  await loadList()
}

async function openDetail(employeeId: number) {
  selectedEmployeeId.value = employeeId
  selectedTaskEmployeeId.value = undefined
  detail.value = undefined
  taskReport.value = undefined
  courseResults.value = undefined
  examHistory.value = undefined
  const sequence = ++detailSequence
  const tenantAtStart = tenantId()
  sectionStates.value.detail = 'loading'
  sectionStates.value.tasks = 'loading'
  try {
    const result = await trainingOperationsApi.archiveDetail({
      ...buildRequest(currentQuery.value, 1, detailTaskPageSize.value),
      employee_id: employeeId,
    })
    if (sequence !== detailSequence || tenantAtStart !== tenantId()) return
    detail.value = result
    taskReport.value = result.tasks
    detailTaskPage.value = result.tasks.page_index
    detailTaskPageSize.value = result.tasks.page_size
    sectionStates.value.detail = 'ready'
    sectionStates.value.tasks = result.tasks.total ? 'ready' : 'empty'
  } catch (error) {
    if (sequence !== detailSequence || tenantAtStart !== tenantId()) return
    sectionStates.value.detail = 'retryable-error'
    sectionStates.value.tasks = 'retryable-error'
    notification.error(errorMessage(error, '员工培训档案详情加载失败'))
  }
}

async function queryDetailTasks(value: {
  employeeId: number
  pageIndex: number
  pageSize: number
}) {
  selectedEmployeeId.value = value.employeeId
  detailTaskPage.value = value.pageIndex
  detailTaskPageSize.value = value.pageSize
  const sequence = ++taskSequence
  const tenantAtStart = tenantId()
  sectionStates.value.tasks = 'loading'
  try {
    const result = await trainingOperationsApi.employeeTasks({
      ...buildRequest(currentQuery.value, value.pageIndex, value.pageSize),
      employee_id: value.employeeId,
    })
    if (sequence !== taskSequence || tenantAtStart !== tenantId()) return
    taskReport.value = result
    sectionStates.value.tasks = result.total ? 'ready' : 'empty'
  } catch (error) {
    if (sequence !== taskSequence || tenantAtStart !== tenantId()) return
    sectionStates.value.tasks = 'retryable-error'
    notification.error(errorMessage(error, '员工任务记录加载失败'))
  }
}

async function loadCourses(trainingTaskEmployeeId: number) {
  const sequence = ++courseSequence
  const tenantAtStart = tenantId()
  sectionStates.value.courses = 'loading'
  try {
    const result = await trainingOperationsApi.courseResults({
      training_task_employee_id: trainingTaskEmployeeId,
    })
    if (sequence !== courseSequence || tenantAtStart !== tenantId()) return
    courseResults.value = result
    sectionStates.value.courses = result.courses.length ? 'ready' : 'empty'
  } catch (error) {
    if (sequence !== courseSequence || tenantAtStart !== tenantId()) return
    sectionStates.value.courses = 'retryable-error'
    notification.error(errorMessage(error, '课程学习结果加载失败'))
  }
}

async function loadExams(trainingTaskEmployeeId: number) {
  const sequence = ++examSequence
  const tenantAtStart = tenantId()
  sectionStates.value.exams = 'loading'
  try {
    const result = await trainingOperationsApi.examHistory({
      training_task_employee_id: trainingTaskEmployeeId,
    })
    if (sequence !== examSequence || tenantAtStart !== tenantId()) return
    examHistory.value = result
    sectionStates.value.exams = result.exams.length ? 'ready' : 'empty'
  } catch (error) {
    if (sequence !== examSequence || tenantAtStart !== tenantId()) return
    sectionStates.value.exams = 'retryable-error'
    notification.error(errorMessage(error, '考试历史加载失败'))
  }
}

async function openTaskDetails(trainingTaskEmployeeId: number) {
  selectedTaskEmployeeId.value = trainingTaskEmployeeId
  courseResults.value = undefined
  examHistory.value = undefined
  await Promise.all([loadCourses(trainingTaskEmployeeId), loadExams(trainingTaskEmployeeId)])
}

async function openExamSnapshot(employeeExamId: number) {
  if (!canViewExamSnapshot.value) {
    notification.warning('当前账号无权查看历史答题快照')
    return
  }
  selectedExamId.value = employeeExamId
  examSnapshot.value = undefined
  const sequence = ++snapshotSequence
  const tenantAtStart = tenantId()
  sectionStates.value.snapshot = 'loading'
  try {
    const result = await trainingOperationsApi.examSnapshot({ employee_exam_id: employeeExamId })
    if (sequence !== snapshotSequence || tenantAtStart !== tenantId()) return
    examSnapshot.value = result
    sectionStates.value.snapshot = result.questions.length ? 'ready' : 'empty'
  } catch (error) {
    if (sequence !== snapshotSequence || tenantAtStart !== tenantId()) return
    sectionStates.value.snapshot = 'retryable-error'
    notification.error(errorMessage(error, '历史答题快照加载失败'))
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

async function exportArchive(value: { includeSensitive: boolean }) {
  if (!canExport.value || exporting.value) return
  exporting.value = true
  try {
    const request = buildRequest(currentQuery.value, 1, 200)
    const archive = await trainingOperationsApi.exportEmployeeArchives(request)
    download(archive, `员工培训档案-${dayjs().format('YYYYMMDD-HHmmss')}.xlsx`)
    if (value.includeSensitive && canExportExamMaterials.value) {
      const materials = await trainingOperationsApi.exportExamMaterials(request)
      download(materials, `员工考试材料-${dayjs().format('YYYYMMDD-HHmmss')}.xlsx`)
    }
    notification.success(
      value.includeSensitive ? '员工培训档案与考试材料已导出' : '员工培训档案已导出',
    )
    exportVersion.value += 1
  } catch (error) {
    notification.error(errorMessage(error, '员工培训档案导出失败'))
  } finally {
    exporting.value = false
  }
}

async function retry(section?: ArchiveSection) {
  if (section === 'detail' && selectedEmployeeId.value) return openDetail(selectedEmployeeId.value)
  if (section === 'tasks' && selectedEmployeeId.value)
    return queryDetailTasks({
      employeeId: selectedEmployeeId.value,
      pageIndex: detailTaskPage.value,
      pageSize: detailTaskPageSize.value,
    })
  if (section === 'courses' && selectedTaskEmployeeId.value)
    return loadCourses(selectedTaskEmployeeId.value)
  if (section === 'exams' && selectedTaskEmployeeId.value)
    return loadExams(selectedTaskEmployeeId.value)
  if (section === 'snapshot' && selectedExamId.value) return openExamSnapshot(selectedExamId.value)
  return loadList()
}

onMounted(() => {
  document.title = '员工培训档案 · 陆链控制台'
  void Promise.all([loadOptions(), loadList()])
})
</script>

<template>
  <EmployeeTrainingArchivePageView
    :archives="[]"
    :plans="plans"
    :tasks="tasks"
    :employees="[]"
    :state="sectionStates.list"
    :archive-report="archiveReport"
    :detail="detail"
    :task-report="taskReport"
    :course-results="courseResults"
    :exam-history="examHistory"
    :exam-snapshot="examSnapshot"
    :section-states="sectionStates"
    :page="page"
    :page-size="pageSize"
    :detail-task-page="detailTaskPage"
    :detail-task-page-size="detailTaskPageSize"
    :can-export="canExport"
    :can-export-exam-materials="canExportExamMaterials"
    :can-view-exam-snapshot="canViewExamSnapshot"
    :exporting="exporting"
    :export-version="exportVersion"
    :organization-options="organizationOptions"
    :position-options="positionOptions"
    @query="query"
    @retry="retry"
    @open-detail="openDetail"
    @query-detail-tasks="queryDetailTasks"
    @open-task-details="openTaskDetails"
    @open-exam-snapshot="openExamSnapshot"
    @export="exportArchive"
  />
</template>
