<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import { notification } from '@shared/services/notification'
import { mapPlanEmployee, mapTrainingPlan, mapTrainingTask } from '../adapters/trainingOperationsAdapter'
import { currentTrainingTenantId, trainingApiErrorMessage, trainingOperationsApi } from '../api/trainingOperationsApi'
import TrainingPlanDetailPageView from '../components/TrainingPlanDetailPageView.vue'
import { TRAINING_PERMISSIONS } from '../trainingPermissions'
import type {
  TrainingOperationsPreviewState,
  TrainingPlanEmployeeBatchResult,
  TrainingPlanEmployeeRecord,
  TrainingPlanRecord,
  TrainingTaskRecord,
  TrainingTaskType,
} from '../types/trainingOperations'

const route = useRoute()
const router = useRouter()
const { hasPermission } = useEffectivePermissions()
const plan = ref<TrainingPlanRecord>()
const tasks = ref<TrainingTaskRecord[]>([])
const employees = ref<TrainingPlanEmployeeRecord[]>([])
const courseOptions = ref<Array<{ id: number; label: string }>>([])
const examOptions = ref<Array<{ id: number; label: string }>>([])
const employeeOptions = ref<Array<{ id: number; label: string; secondary?: string }>>([])
const occupiedPeriodKeys = ref<string[]>([])
const employeeOptionsLoading = ref(false)
const employeeHistory = ref<TrainingPlanEmployeeRecord[]>([])
const employeeHistoryLoading = ref(false)
const batchResult = ref<TrainingPlanEmployeeBatchResult>()
const batchResultVersion = ref(0)
const state = ref<TrainingOperationsPreviewState>('loading')
const taskTotal = ref(0)
const taskPage = ref(1)
const taskPageSize = ref(10)
const employeeTotal = ref(0)
const employeePage = ref(1)
const employeePageSize = ref(10)
const taskSubmitting = ref(false)
const taskSubmissionVersion = ref(0)
const employeeSubmitting = ref(false)
const employeeSubmissionVersion = ref(0)
let loadSequence = 0
let employeeSearchSequence = 0
let taskListSequence = 0
let planEmployeeSequence = 0
let courseOptionSequence = 0
let examOptionSequence = 0

const planId = computed(() => Number(route.params.planId))
const initialTab = computed<'tasks' | 'employees'>(() => route.query.tab === 'employees' ? 'employees' : 'tasks')
const canViewTasks = computed(() => hasPermission(TRAINING_PERMISSIONS.tasks.view))
const canViewEmployees = computed(() => hasPermission(TRAINING_PERMISSIONS.plans.queryEmployees))
const canCreateTask = computed(() => hasPermission(TRAINING_PERMISSIONS.tasks.create) && hasPermission(TRAINING_PERMISSIONS.courses.view) && hasPermission(TRAINING_PERMISSIONS.exams.view))
const canViewTaskDetail = computed(() => hasPermission(TRAINING_PERMISSIONS.tasks.detail))

const tenantId = currentTrainingTenantId
const errorMessage = trainingApiErrorMessage
function isCurrent(sequence: number, tenantAtStart: number) { return sequence === loadSequence && tenantAtStart === tenantId() }

async function loadTasks(pageIndex = taskPage.value, nextPageSize = taskPageSize.value) {
  if (!canViewTasks.value) return
  taskPage.value = pageIndex
  taskPageSize.value = nextPageSize
  const sequence = ++taskListSequence
  const tenantAtStart = tenantId()
  try {
    const response = await trainingOperationsApi.queryTasks({
      training_id: planId.value,
      page_index: pageIndex,
      page_size: nextPageSize,
    })
    if (sequence !== taskListSequence || tenantAtStart !== tenantId()) return
    tasks.value = response.items.map(mapTrainingTask)
    taskTotal.value = response.total
  } catch (error) {
    if (sequence === taskListSequence) notification.error(errorMessage(error, '培训任务列表加载失败'))
  }
}

async function loadEmployees(pageIndex = employeePage.value, nextPageSize = employeePageSize.value) {
  if (!canViewEmployees.value) return
  employeePage.value = pageIndex
  employeePageSize.value = nextPageSize
  const sequence = ++planEmployeeSequence
  const tenantAtStart = tenantId()
  try {
    const response = await trainingOperationsApi.queryPlanEmployees({
      training_id: planId.value,
      page_index: pageIndex,
      page_size: nextPageSize,
    })
    if (sequence !== planEmployeeSequence || tenantAtStart !== tenantId()) return
    employees.value = response.items.map(mapPlanEmployee)
    employeeTotal.value = response.total
  } catch (error) {
    if (sequence === planEmployeeSequence) notification.error(errorMessage(error, '计划员工列表加载失败'))
  }
}

async function load() {
  if (!Number.isFinite(planId.value) || planId.value <= 0) {
    state.value = 'empty'
    return
  }
  const sequence = ++loadSequence
  const tenantAtStart = tenantId()
  state.value = 'loading'
  try {
    const detail = await trainingOperationsApi.getPlan(planId.value)
    if (!isCurrent(sequence, tenantAtStart)) return
    plan.value = mapTrainingPlan(detail)
    state.value = 'ready'
    await Promise.allSettled([
      ...(canViewTasks.value ? [loadTasks(taskPage.value, taskPageSize.value)] : []),
      ...(canViewEmployees.value ? [loadEmployees(employeePage.value, employeePageSize.value)] : []),
    ])
  } catch (error) {
    if (!isCurrent(sequence, tenantAtStart)) return
    plan.value = undefined
    tasks.value = []
    employees.value = []
    state.value = 'retryable-error'
    notification.error(errorMessage(error, '培训计划详情加载失败'))
  }
}

async function loadTaskOptions() {
  if (!canCreateTask.value) return
  await Promise.all([searchCourses(''), searchExams(''), loadOccupiedPeriods()])
}

async function loadOccupiedPeriods() {
  const tenantAtStart = tenantId()
  const response = await trainingOperationsApi.queryTasks({ training_id: planId.value, ...(plan.value ? { task_type: plan.value.frequency } : {}), page_index: 1, page_size: 200 })
  if (tenantAtStart !== tenantId()) return
  occupiedPeriodKeys.value = response.items.map((item) => item.period_key).filter((value): value is string => Boolean(value))
}

async function searchCourses(keyword: string) {
  const sequence = ++courseOptionSequence
  const tenantAtStart = tenantId()
  try {
    const courses = await trainingOperationsApi.queryCourses({ page_index: 1, page_size: 50, status: 'ACTIVE', ...(keyword.trim() ? { keyword: keyword.trim() } : {}) })
    if (sequence !== courseOptionSequence || tenantAtStart !== tenantId()) return
    courseOptions.value = courses.items.map((item) => ({ id: item.id, label: `${item.course_name} · ${item.training_type}` }))
  } catch (error) {
    courseOptions.value = []
    notification.error(errorMessage(error, '课程候选加载失败，请确认权限后重试'))
  }
}

async function searchExams(keyword: string) {
  const sequence = ++examOptionSequence
  const tenantAtStart = tenantId()
  try {
    const exams = await trainingOperationsApi.queryExams({ page_index: 1, page_size: 50, status: 'ACTIVE', ...(keyword.trim() ? { keyword: keyword.trim() } : {}) })
    if (sequence !== examOptionSequence || tenantAtStart !== tenantId()) return
    examOptions.value = exams.items.map((item) => ({ id: item.id, label: item.exam_name }))
  } catch (error) {
    examOptions.value = []
    notification.error(errorMessage(error, '考试候选加载失败，请确认权限后重试'))
  }
}

async function searchEmployees(keyword: string) {
  const currentTenantId = tenantId()
  if (!currentTenantId) {
    employeeOptions.value = []
    return
  }
  const sequence = ++employeeSearchSequence
  employeeOptionsLoading.value = true
  try {
    const response = await trainingOperationsApi.queryTenantEmployees({
      tenant_ids: [currentTenantId],
      page_index: 1,
      page_size: 50,
      status: 'ACTIVE',
      ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
    })
    if (sequence !== employeeSearchSequence || currentTenantId !== tenantId()) return
    employeeOptions.value = response.items
      .filter((item) => item.is_member_currently_effective)
      .map((item) => ({
        id: item.user.id,
        label: item.display_name || item.user.real_name || item.user.user_name,
        secondary: item.tenant_user_code || item.user.user_name,
      }))
  } catch (error) {
    if (sequence === employeeSearchSequence) notification.error(errorMessage(error, '员工候选加载失败'))
  } finally {
    if (sequence === employeeSearchSequence) employeeOptionsLoading.value = false
  }
}

async function createTask(value: { taskType: TrainingTaskType; periodKey?: string; name: string; startAt: string; endAt: string; courseIds: number[]; examId: number; requestId: string }) {
  if (taskSubmitting.value) return
  taskSubmitting.value = true
  try {
    const base = {
      training_id: planId.value,
      task_name: value.name,
      task_type: value.taskType,
      start_at: value.startAt,
      deadline_at: value.endAt,
      exam_id: value.examId,
      courses: value.courseIds.map((courseId, index) => ({ course_id: courseId, sort_order: index + 1 })),
      request_id: value.requestId,
    }
    await trainingOperationsApi.createTask(value.taskType === 'TEMPORARY' ? base : { ...base, period_key: value.periodKey ?? '' })
    notification.success('培训任务已创建')
    await Promise.all([loadTasks(1, taskPageSize.value), refreshPlan()])
    taskSubmissionVersion.value += 1
  } catch (error) {
    notification.error(errorMessage(error, '培训任务创建失败'))
  } finally {
    taskSubmitting.value = false
  }
}

async function refreshPlan() {
  plan.value = mapTrainingPlan(await trainingOperationsApi.getPlan(planId.value))
}

async function addEmployees(employeeIds: number[]) {
  if (employeeSubmitting.value) return
  employeeSubmitting.value = true
  try {
    const response = await trainingOperationsApi.batchAddPlanEmployees({ training_id: planId.value, employee_ids: employeeIds })
    batchResult.value = {
      title: '加入计划员工结果',
      summary: `已加入 ${response.added_count} 人 · 已存在 ${response.existing_count} 人 · 需重新加入 ${response.rejoin_required_count} 人 · 无效 ${response.invalid_count} 人`,
      items: response.items.map((item) => ({ employeeId: item.employee_id, employeeName: employeeName(item.employee_id), result: item.result, affectedTaskCount: item.affected_task_count, ...(item.effective_from ? { effectiveFrom: item.effective_from } : {}), ...(item.effective_to ? { effectiveTo: item.effective_to } : {}) })),
    }
    batchResultVersion.value += 1
    notification.success(`计划员工处理完成：新增 ${response.added_count} 人`)
    await Promise.all([loadEmployees(1, employeePageSize.value), refreshPlan()])
    employeeSubmissionVersion.value += 1
  } catch (error) {
    notification.error(errorMessage(error, '加入计划员工失败'))
  } finally {
    employeeSubmitting.value = false
  }
}

async function exitEmployees(records: TrainingPlanEmployeeRecord[]) {
  try {
    if (records.length === 1) {
      const record = records[0]!
      await trainingOperationsApi.exitPlanEmployee({ training_id: planId.value, employee_id: record.employeeId, expected_period_id: record.id })
    } else {
      const response = await trainingOperationsApi.batchExitPlanEmployees({
        training_id: planId.value,
        employees: records.map((record) => ({ employee_id: record.employeeId, expected_period_id: record.id })),
      })
      batchResult.value = {
        title: '批量退出计划员工结果',
        summary: `已退出 ${response.exited_count} 人 · 已跳过 ${response.skipped_count} 人 · 失败 ${response.failed_count} 人`,
        items: response.items.map((item) => ({ employeeId: item.employee_id, employeeName: employeeName(item.employee_id), result: item.result, affectedTaskCount: item.affected_task_count, ...(item.effective_from ? { effectiveFrom: item.effective_from } : {}), ...(item.effective_to ? { effectiveTo: item.effective_to } : {}) })),
      }
      batchResultVersion.value += 1
    }
    notification.success(`${records.length} 名计划员工已退出`)
    await Promise.all([loadEmployees(employeePage.value, employeePageSize.value), refreshPlan()])
  } catch (error) {
    notification.error(errorMessage(error, '退出计划员工失败'))
    throw error
  }
}

function employeeName(employeeId: number) {
  return employees.value.find((item) => item.employeeId === employeeId)?.name
    ?? employeeOptions.value.find((item) => item.id === employeeId)?.label
    ?? `员工 ${employeeId}`
}

async function loadEmployeeHistory(record: TrainingPlanEmployeeRecord) {
  employeeHistory.value = []
  employeeHistoryLoading.value = true
  const tenantAtStart = tenantId()
  try {
    const response = await trainingOperationsApi.getPlanEmployeeHistory({ training_id: planId.value, employee_id: record.employeeId })
    if (tenantAtStart !== tenantId()) return
    employeeHistory.value = response.map(mapPlanEmployee).sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom))
  } catch (error) {
    notification.error(errorMessage(error, '员工有效期历史加载失败'))
  } finally {
    if (tenantAtStart === tenantId()) employeeHistoryLoading.value = false
  }
}

async function rejoinEmployee(record: TrainingPlanEmployeeRecord) {
  try {
    await trainingOperationsApi.rejoinPlanEmployee({ training_id: planId.value, employee_id: record.employeeId, expected_period_id: record.id })
    notification.success('计划员工已重新加入')
    await Promise.all([loadEmployees(employeePage.value, employeePageSize.value), refreshPlan()])
  } catch (error) {
    notification.error(errorMessage(error, '重新加入计划失败'))
    throw error
  }
}

async function startTask(task: TrainingTaskRecord) {
  if (!task.updatedAt) return
  try {
    await trainingOperationsApi.startTask({ id: task.id, updated_at: task.updatedAt })
    notification.success('培训任务已启动')
    await Promise.all([loadTasks(taskPage.value, taskPageSize.value), refreshPlan()])
  } catch (error) { notification.error(errorMessage(error, '启动培训任务失败')) }
}

async function deleteTask(task: TrainingTaskRecord) {
  if (!task.updatedAt) return
  try {
    await trainingOperationsApi.deleteTask({ id: task.id, updated_at: task.updatedAt })
    notification.success('培训任务已删除')
    await Promise.all([loadTasks(taskPage.value, taskPageSize.value), refreshPlan()])
  } catch (error) { notification.error(errorMessage(error, '删除培训任务失败')) }
}

function openTask(task: TrainingTaskRecord) {
  void router.push({ name: 'training-task-detail', params: { planId: planId.value, taskId: task.id } })
}

watch(planId, () => {
  taskPage.value = 1
  employeePage.value = 1
  void load()
})
onMounted(load)
</script>

<template>
  <TrainingPlanDetailPageView
    :plan="plan"
    :tasks="tasks"
    :employees="employees"
    :state="state"
    :course-options="courseOptions"
    :exam-options="examOptions"
    :employee-options="employeeOptions"
    :occupied-period-keys="occupiedPeriodKeys"
    :employee-options-loading="employeeOptionsLoading"
    :employee-history="employeeHistory"
    :employee-history-loading="employeeHistoryLoading"
    :batch-result="batchResult"
    :batch-result-version="batchResultVersion"
    :task-total="taskTotal"
    :task-page="taskPage"
    :task-page-size="taskPageSize"
    :employee-total="employeeTotal"
    :employee-page="employeePage"
    :employee-page-size="employeePageSize"
    :initial-tab="initialTab"
    :task-submitting="taskSubmitting"
    :task-submission-version="taskSubmissionVersion"
    :employee-submitting="employeeSubmitting"
    :employee-submission-version="employeeSubmissionVersion"
    :can-view-tasks="canViewTasks"
    :can-view-employees="canViewEmployees"
    :can-create-task="canCreateTask"
    :can-view-task-detail="canViewTaskDetail"
    @back="router.push({ name: 'training-plan-management' })"
    @retry="load"
    @open-task="openTask"
    @query-tasks="loadTasks"
    @query-plan-employees="loadEmployees"
    @manage-employees="searchEmployees('')"
    @search-employees="searchEmployees"
    @add-employees="addEmployees"
    @exit-employees="exitEmployees"
    @rejoin-employee="rejoinEmployee"
    @employee-history="loadEmployeeHistory"
    @create-task="createTask"
    @load-task-options="loadTaskOptions"
    @search-courses="searchCourses"
    @search-exams="searchExams"
    @start-task="startTask"
    @delete-task="deleteTask"
  />
</template>
