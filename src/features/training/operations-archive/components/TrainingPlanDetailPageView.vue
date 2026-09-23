<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import DetailDrawer from '@shared/components/DetailDrawer.vue'
import FormDialog from '@shared/components/FormDialog.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import DetailPageTemplate from '@shared/components/page-templates/DetailPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import { createTrainingRequestId } from '../api/trainingOperationsApi'
import {
  planFrequencyLabel,
  planStatusLabel,
  planStatusTone,
  planTypeLabel,
  taskCompletionPercentage,
  taskStatusLabel,
  taskStatusTone,
  taskTypeLabel,
} from '../operationsUi'
import { TRAINING_PERMISSIONS } from '../trainingPermissions'
import type {
  TrainingAutoEnrollmentJobRecord,
  TrainingAutoEnrollmentRuleRecord,
  TrainingOperationsPreviewState,
  TrainingPlanEmployeeBatchResult,
  TrainingPlanEmployeeRecord,
  TrainingPlanRecord,
  TrainingTaskRecord,
  TrainingTaskType,
} from '../types/trainingOperations'

const props = withDefaults(
  defineProps<{
    plan: TrainingPlanRecord | undefined
    tasks: TrainingTaskRecord[]
    employees: TrainingPlanEmployeeRecord[]
    state: TrainingOperationsPreviewState
    courseOptions?: Array<{ id: number; label: string }>
    examOptions?: Array<{ id: number; label: string }>
    employeeOptions?: Array<{ id: number; label: string; secondary?: string }>
    employeeHistory?: TrainingPlanEmployeeRecord[]
    employeeHistoryLoading?: boolean
    batchResult: TrainingPlanEmployeeBatchResult | undefined
    batchResultVersion?: number
    occupiedPeriodKeys?: string[]
    employeeOptionsLoading?: boolean
    taskTotal: number
    taskPage?: number
    taskPageSize?: number
    employeeTotal: number
    employeePage?: number
    employeePageSize?: number
    initialTab?: 'tasks' | 'employees'
    taskSubmitting?: boolean
    taskSubmissionVersion?: number
    employeeSubmitting?: boolean
    employeeSubmissionVersion?: number
    canViewTasks?: boolean
    canViewEmployees?: boolean
    canCreateTask?: boolean
    canViewTaskDetail?: boolean
    autoEnrollmentRule?: TrainingAutoEnrollmentRuleRecord | undefined
    autoEnrollmentJobs?: TrainingAutoEnrollmentJobRecord[]
    onboardingSubmitting?: boolean
    onboardingSubmissionVersion?: number
    canManageOnboarding?: boolean
  }>(),
  {
    taskPage: 1,
    taskPageSize: 10,
    employeePage: 1,
    employeePageSize: 10,
    employeeOptionsLoading: false,
    initialTab: 'tasks',
    taskSubmitting: false,
    taskSubmissionVersion: 0,
    employeeSubmitting: false,
    employeeSubmissionVersion: 0,
    canViewTasks: true,
    canViewEmployees: true,
    canCreateTask: true,
    canViewTaskDetail: true,
    autoEnrollmentRule: undefined,
    autoEnrollmentJobs: () => [],
    onboardingSubmitting: false,
    onboardingSubmissionVersion: 0,
    canManageOnboarding: true,
    courseOptions: () => [],
    examOptions: () => [],
    employeeOptions: () => [],
    employeeHistory: () => [],
    employeeHistoryLoading: false,
    batchResultVersion: 0,
    occupiedPeriodKeys: () => [],
  },
)
const emit = defineEmits<{
  back: []
  retry: []
  openTask: [task: TrainingTaskRecord]
  action: [message: string]
  manageEmployees: []
  searchEmployees: [keyword: string]
  addEmployees: [employeeIds: number[]]
  exitEmployees: [employees: TrainingPlanEmployeeRecord[]]
  rejoinEmployee: [employee: TrainingPlanEmployeeRecord]
  employeeHistory: [employee: TrainingPlanEmployeeRecord]
  startTask: [task: TrainingTaskRecord]
  deleteTask: [task: TrainingTaskRecord]
  loadTaskOptions: []
  searchCourses: [keyword: string]
  searchExams: [keyword: string]
  queryTasks: [pageIndex: number, pageSize: number]
  queryPlanEmployees: [pageIndex: number, pageSize: number]
  createTask: [
    value: {
      taskType: TrainingTaskType
      periodKey?: string
      name: string
      startAt: string
      endAt: string
      isLongRunning: boolean
      courseIds: number[]
      examId: number
      requestId: string
    },
  ]
  saveOnboardingRule: [
    value: { trainingId: number; trainingTaskId: number; isEnabled: boolean; updatedAt?: string },
  ]
  retryOnboardingJob: [job: TrainingAutoEnrollmentJobRecord]
}>()

const activeTab = ref(props.initialTab)
const taskFormVisible = ref(false)
const employeeFormVisible = ref(false)
const employeeIds = ref<number[]>([])
const taskConfirmVisible = ref(false)
const taskConfirmAction = ref<'start' | 'delete'>('start')
const taskConfirmTarget = ref<TrainingTaskRecord>()
const onboardingVisible = ref(false)
const onboardingStopVisible = ref(false)
const selectedEmployees = ref<TrainingPlanEmployeeRecord[]>([])
const historyVisible = ref(false)
const historyEmployee = ref<TrainingPlanEmployeeRecord>()
const batchResultVisible = ref(false)
const taskPage = ref(props.taskPage)
const taskPageSize = ref(props.taskPageSize)
const employeePage = ref(props.employeePage)
const employeePageSize = ref(props.employeePageSize)
const form = reactive({
  taskType: 'TEMPORARY' as TrainingTaskType,
  periodKey: '',
  name: '',
  startAt: '',
  endAt: '',
  isLongRunning: false,
  courseIds: [] as number[],
  examId: 0,
  requestId: '',
})
const taskColumns: DataTableColumn[] = [
  { label: '任务名称', minWidth: 248, fixed: 'left', slot: 'name' },
  { label: '类型 / 周期', width: 148, slot: 'type' },
  { label: '执行时间', minWidth: 236, slot: 'period' },
  { label: '状态', width: 96, slot: 'status' },
  { label: '完成', width: 108, slot: 'progress' },
  { label: '完成率', width: 96, slot: 'rate' },
  { label: '操作', width: 224, fixed: 'right', slot: 'actions' },
]
const employeeColumns: DataTableColumn[] = [
  { prop: 'employeeCode', label: '员工编号', width: 132 },
  { prop: 'name', label: '当前姓名', width: 108 },
  { prop: 'organization', label: '当前组织', minWidth: 168 },
  { prop: 'position', label: '当前岗位', minWidth: 136 },
  { label: '关系', width: 108, slot: 'relation' },
  { prop: 'effectiveFrom', label: '加入时间', minWidth: 144 },
  { prop: 'effectiveTo', label: '退出时间', minWidth: 144 },
  { label: '操作', width: 176, fixed: 'right', slot: 'actions' },
]
const historyColumns: DataTableColumn[] = [
  { prop: 'effectiveFrom', label: '加入时间', minWidth: 176 },
  { prop: 'effectiveTo', label: '退出时间', minWidth: 176 },
  { label: '关系状态', width: 112, slot: 'relation' },
]
const batchResultColumns: DataTableColumn[] = [
  { prop: 'employeeName', label: '员工', minWidth: 160 },
  { label: '处理结果', width: 124, slot: 'result' },
  { prop: 'affectedTaskCount', label: '影响任务数', width: 112, align: 'right' },
  { prop: 'effectiveFrom', label: '生效起点', minWidth: 170 },
  { prop: 'effectiveTo', label: '生效终点', minWidth: 170 },
]
const onboardingJobColumns: DataTableColumn[] = [
  { prop: 'employeeName', label: '员工', minWidth: 140 },
  { prop: 'memberEffectiveAt', label: '成员生效时间', minWidth: 168 },
  { label: '状态', width: 96, slot: 'status' },
  { prop: 'attemptCount', label: '尝试次数', width: 88, align: 'right' },
  { prop: 'lastError', label: '最近错误', minWidth: 180 },
  { label: '操作', width: 84, fixed: 'right', slot: 'actions' },
]
const onboardingForm = reactive({ taskId: 0, enabled: false })
const planTasks = computed(() =>
  props.tasks.filter(
    (task) => !props.plan || !task.trainingId || task.trainingId === props.plan.id,
  ),
)
const effectiveTaskTotal = computed(() => props.taskTotal)
const effectiveEmployeeTotal = computed(() => props.employeeTotal)
const taskCreationAvailable = computed(() =>
  Boolean(
    props.canCreateTask &&
    props.plan?.status === 'PUBLISHED' &&
    (props.plan.planType === 'STANDING' || props.plan.currentEmployees > 0),
  ),
)
const allowedTaskTypes = computed<TrainingTaskType[]>(() => {
  if (props.plan?.planType === 'STANDING') return ['TEMPORARY']
  return props.plan?.frequency ? [props.plan.frequency, 'TEMPORARY'] : ['TEMPORARY']
})
const standingTasks = computed(() => planTasks.value.filter((task) => task.isLongRunning))
const onboardingFormValid = computed(() => onboardingForm.taskId > 0)
const periodOptions = computed(() => {
  const plan = props.plan
  if (!plan || form.taskType === 'TEMPORARY') return []
  const start = new Date(`${plan.startAt.slice(0, 10)}T00:00:00`)
  if (!plan.endAt) return []
  const end = new Date(`${plan.endAt.slice(0, 10)}T00:00:00`)
  const keys: string[] = []
  if (form.taskType === 'MONTHLY') {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cursor <= end) {
      keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)
      cursor.setMonth(cursor.getMonth() + 1)
    }
  } else {
    let year = start.getFullYear()
    let quarter = Math.floor(start.getMonth() / 3) + 1
    while (
      year < end.getFullYear() ||
      (year === end.getFullYear() && quarter <= Math.floor(end.getMonth() / 3) + 1)
    ) {
      keys.push(`${year}-Q${quarter}`)
      quarter += 1
      if (quarter > 4) {
        quarter = 1
        year += 1
      }
    }
  }
  const occupied = new Set(props.occupiedPeriodKeys)
  return keys.filter((key) => !occupied.has(key))
})

function timestamp(value: string, endOfDay = false) {
  if (!value) return Number.NaN
  const normalized = /^\d{4}-\d{2}-\d{2}$/u.test(value)
    ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`
    : value
  return new Date(normalized).getTime()
}

const taskScheduleError = computed(() => {
  if (!props.plan || !form.startAt) return ''
  const start = timestamp(form.startAt)
  if (!Number.isFinite(start)) return '开始时间格式不正确。'
  if (form.isLongRunning)
    return start < timestamp(props.plan.startAt) ? '开始时间不得早于计划开始日期。' : ''
  if (!form.endAt) return '请选择截止时间。'
  const end = timestamp(form.endAt)
  if (!Number.isFinite(end) || end <= start) return '截止时间必须晚于开始时间。'
  let lower = timestamp(props.plan.startAt)
  let upper = props.plan.endAt ? timestamp(props.plan.endAt, true) : Number.POSITIVE_INFINITY
  if (form.taskType !== 'TEMPORARY' && form.periodKey) {
    const monthly = /^(\d{4})-(\d{2})$/u.exec(form.periodKey)
    const quarterly = /^(\d{4})-Q([1-4])$/u.exec(form.periodKey)
    if (monthly) {
      const year = Number(monthly[1])
      const month = Number(monthly[2]) - 1
      lower = Math.max(lower, new Date(year, month, 1).getTime())
      upper = Math.min(upper, new Date(year, month + 1, 1).getTime() - 1)
    } else if (quarterly) {
      const year = Number(quarterly[1])
      const month = (Number(quarterly[2]) - 1) * 3
      lower = Math.max(lower, new Date(year, month, 1).getTime())
      upper = Math.min(upper, new Date(year, month + 3, 1).getTime() - 1)
    }
  }
  return start < lower || end > upper ? '任务时间必须位于计划有效期与所选自然周期的交集内。' : ''
})
const taskFormValid = computed(() =>
  Boolean(
    form.name.trim() &&
    (form.taskType === 'TEMPORARY' || form.periodKey.trim()) &&
    form.startAt &&
    (form.isLongRunning || form.endAt) &&
    !taskScheduleError.value &&
    form.courseIds.length &&
    form.examId > 0,
  ),
)

function asTask(row: Record<string, unknown>) {
  return row as unknown as TrainingTaskRecord
}
function asEmployee(row: Record<string, unknown>) {
  return row as unknown as TrainingPlanEmployeeRecord
}
function openTaskIfAllowed(task: TrainingTaskRecord) {
  if (props.canViewTaskDetail) emit('openTask', task)
}
function selectEmployees(rows: Record<string, unknown>[]) {
  selectedEmployees.value = rows.map(asEmployee).filter((employee) => employee.isCurrent)
}
function openEmployeeHistory(employee: TrainingPlanEmployeeRecord) {
  historyEmployee.value = employee
  historyVisible.value = true
  emit('employeeHistory', employee)
}
function batchResultLabel(result: string) {
  return (
    (
      {
        ADDED: '已加入',
        EXISTING: '已存在',
        REJOIN_REQUIRED: '需重新加入',
        INVALID_EMPLOYEE: '无效员工',
        EXITED: '已退出',
        ALREADY_EXITED: '已跳过',
        NOT_FOUND: '未找到',
        PERIOD_CONFLICT: '期间冲突',
      } as Record<string, string>
    )[result] ?? result
  )
}
function openTaskForm() {
  Object.assign(form, {
    taskType: 'TEMPORARY',
    periodKey: '',
    name: '',
    startAt: '',
    endAt: '',
    isLongRunning: props.plan?.planType === 'STANDING',
    courseIds: [],
    examId: 0,
    requestId: createTrainingRequestId(),
  })
  taskFormVisible.value = true
  emit('loadTaskOptions')
}
function openOnboarding() {
  onboardingForm.taskId =
    props.autoEnrollmentRule?.trainingTaskId ?? standingTasks.value[0]?.id ?? 0
  onboardingForm.enabled = props.autoEnrollmentRule?.isEnabled ?? false
  onboardingVisible.value = true
}
function submitOnboarding() {
  if (!props.plan || !onboardingFormValid.value) return
  emit('saveOnboardingRule', {
    trainingId: props.plan.id,
    trainingTaskId: onboardingForm.taskId,
    isEnabled: onboardingForm.enabled,
    ...(props.autoEnrollmentRule?.updatedAt
      ? { updatedAt: props.autoEnrollmentRule.updatedAt }
      : {}),
  })
}
function stopOnboarding() {
  if (!props.plan || !props.autoEnrollmentRule) return
  onboardingStopVisible.value = false
  emit('saveOnboardingRule', {
    trainingId: props.plan.id,
    trainingTaskId: props.autoEnrollmentRule.trainingTaskId,
    isEnabled: false,
    updatedAt: props.autoEnrollmentRule.updatedAt,
  })
}
function openEmployeeForm() {
  employeeIds.value = []
  employeeFormVisible.value = true
  emit('searchEmployees', '')
}
function submitEmployees() {
  if (!employeeIds.value.length) return
  emit('addEmployees', [...employeeIds.value])
}
function openTaskConfirm(action: 'start' | 'delete', task: TrainingTaskRecord) {
  taskConfirmAction.value = action
  taskConfirmTarget.value = task
  taskConfirmVisible.value = true
}
function canRetryStart(task: TrainingTaskRecord) {
  const startsAt = timestamp(task.startAt)
  return task.status === 'NOT_STARTED' && Number.isFinite(startsAt) && startsAt <= Date.now()
}
function confirmTaskAction() {
  const target = taskConfirmTarget.value
  taskConfirmVisible.value = false
  if (!target) return
  if (taskConfirmAction.value === 'start') emit('startTask', target)
  else emit('deleteTask', target)
}
function submitTask() {
  if (!taskFormValid.value) return
  const base = {
    taskType: form.taskType,
    name: form.name.trim(),
    startAt: form.startAt,
    endAt: form.endAt,
    isLongRunning: form.isLongRunning,
    courseIds: [...form.courseIds],
    examId: form.examId,
    requestId: form.requestId,
  }
  emit(
    'createTask',
    form.taskType === 'TEMPORARY' ? base : { ...base, periodKey: form.periodKey.trim() },
  )
}
watch(
  () => form.taskType,
  () => {
    form.periodKey = ''
    if (form.taskType !== 'TEMPORARY') form.isLongRunning = false
  },
)
watch(
  () => form.isLongRunning,
  (value) => {
    if (value) form.endAt = ''
  },
)
watch(
  () => props.taskPage,
  (value) => {
    taskPage.value = value
  },
)
watch(
  () => props.taskPageSize,
  (value) => {
    taskPageSize.value = value
  },
)
watch(
  () => props.employeePage,
  (value) => {
    employeePage.value = value
  },
)
watch(
  () => props.employeePageSize,
  (value) => {
    employeePageSize.value = value
  },
)
watch(
  [() => props.canViewTasks, () => props.canViewEmployees],
  ([tasksVisible, employeesVisible]) => {
    if (activeTab.value === 'tasks' && !tasksVisible && employeesVisible)
      activeTab.value = 'employees'
    if (activeTab.value === 'employees' && !employeesVisible && tasksVisible)
      activeTab.value = 'tasks'
  },
  { immediate: true },
)
watch(
  () => props.taskSubmissionVersion,
  () => {
    taskFormVisible.value = false
  },
)
watch(
  () => props.employeeSubmissionVersion,
  () => {
    employeeFormVisible.value = false
  },
)
watch(
  () => props.onboardingSubmissionVersion,
  () => {
    onboardingVisible.value = false
  },
)
watch(
  () => props.batchResultVersion,
  () => {
    if (props.batchResult) batchResultVisible.value = true
  },
)
</script>

<template>
  <AppPage class="training-operations-page">
    <DetailPageTemplate scroll-mode="page">
      <template #header>
        <PageHeader title="培训计划详情" description="计划资料与任务执行上下文保持在同一页面">
          <template #actions>
            <el-button @click="emit('back')">返回计划列表</el-button>
            <el-button
              v-if="plan?.planType === 'STANDING' && canManageOnboarding"
              v-permission="TRAINING_PERMISSIONS.onboarding.update"
              @click="openOnboarding"
              >配置入职自动纳入</el-button
            >
            <el-button
              v-if="canCreateTask"
              v-permission="TRAINING_PERMISSIONS.tasks.create"
              type="primary"
              :disabled="!taskCreationAvailable"
              :title="
                plan?.status !== 'PUBLISHED'
                  ? '计划发布后方可创建任务'
                  : plan?.planType !== 'STANDING' && !plan?.currentEmployees
                    ? '年度计划至少需要 1 名当前员工'
                    : ''
              "
              @click="openTaskForm"
              >新建培训任务</el-button
            >
          </template>
        </PageHeader>
      </template>
      <template #summary>
        <section v-if="plan" class="training-detail-hero">
          <div>
            <h3>{{ plan.name }}</h3>
            <p v-if="plan.planType === 'STANDING'">
              {{ planTypeLabel(plan.planType) }} · 长期有效 · {{ plan.startAt }} 起
            </p>
            <p v-else>
              {{ plan.year }} 年 · {{ planFrequencyLabel(plan.frequency) }} · {{ plan.startAt }} 至
              {{ plan.endAt }}
            </p>
          </div>
          <div class="training-detail-tags">
            <StatusTag :label="planStatusLabel(plan.status)" :tone="planStatusTone(plan.status)" />
            <StatusTag :label="`${plan.currentEmployees} 名当前员工`" tone="info" />
            <StatusTag :label="`${plan.taskCount} 个任务`" tone="info" />
          </div>
        </section>
      </template>

      <el-alert
        v-if="state === 'retryable-error'"
        title="计划详情加载失败"
        type="error"
        :closable="false"
        show-icon
      >
        <template #default
          ><el-button link type="primary" @click="emit('retry')">重新加载</el-button></template
        >
      </el-alert>
      <el-skeleton v-else-if="state === 'loading'" :rows="8" animated />
      <el-empty v-else-if="!plan" description="未找到培训计划，或该计划不属于当前 Tenant" />
      <div v-else class="training-detail-layout">
        <el-descriptions title="计划基础信息" :column="2" border>
          <el-descriptions-item label="计划类型">{{
            planTypeLabel(plan.planType)
          }}</el-descriptions-item>
          <el-descriptions-item label="计划年度">{{ plan.year ?? '不适用' }}</el-descriptions-item>
          <el-descriptions-item label="培训频率">{{
            planFrequencyLabel(plan.frequency)
          }}</el-descriptions-item>
          <el-descriptions-item label="有效期">{{
            plan.planType === 'STANDING'
              ? `${plan.startAt} 起 · 长期有效`
              : `${plan.startAt} 至 ${plan.endAt}`
          }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ plan.updatedAt }}</el-descriptions-item>
          <el-descriptions-item label="当前 / 历史员工"
            >{{ plan.currentEmployees }} / {{ plan.historicalEmployees }}</el-descriptions-item
          >
          <el-descriptions-item label="任务状态"
            >未开始 {{ plan.notStartedTaskCount ?? 0 }} · 进行中 {{ plan.activeTaskCount ?? 0 }} ·
            逾期 {{ plan.overdueTaskCount ?? 0 }} · 完成
            {{ plan.completedTaskCount ?? 0 }}</el-descriptions-item
          >
        </el-descriptions>
        <section
          v-if="plan.planType === 'STANDING'"
          class="training-surface training-onboarding-card"
        >
          <div class="training-section-heading">
            <div>
              <h3>入职培训自动纳入</h3>
              <p>由服务端识别规则启用后首次生效的 Tenant 员工，不补录启用前成员。</p>
            </div>
            <div class="training-detail-actions">
              <StatusTag
                :label="autoEnrollmentRule?.isEnabled ? '正在接收新人' : '未启用'"
                :tone="autoEnrollmentRule?.isEnabled ? 'success' : 'info'"
              />
              <el-button
                v-if="autoEnrollmentRule?.isEnabled"
                v-permission="TRAINING_PERMISSIONS.onboarding.update"
                type="warning"
                plain
                @click="onboardingStopVisible = true"
                >停止接收新人</el-button
              >
              <el-button
                v-else
                v-permission="TRAINING_PERMISSIONS.onboarding.update"
                type="primary"
                @click="openOnboarding"
                >配置规则</el-button
              >
            </div>
          </div>
          <div class="training-onboarding-facts">
            <span>目标任务：{{ autoEnrollmentRule?.taskName ?? '尚未配置' }}</span>
            <span>生效基线：{{ autoEnrollmentRule?.enabledAt ?? '启用时由服务端生成' }}</span>
            <span>历史轮次：停止接收后仍完整保留</span>
          </div>
        </section>
        <el-tabs
          v-if="canViewTasks || canViewEmployees"
          v-model="activeTab"
          class="training-detail-tabs"
        >
          <el-tab-pane v-if="canViewTasks" label="计划与任务" name="tasks">
            <div class="training-detail-layout">
              <section class="training-surface">
                <TableToolbar title="培训任务" :total="effectiveTaskTotal" @refresh="emit('retry')">
                  <template #summary
                    ><span class="training-operations-page__summary"
                      >月度、季度与临时任务统一在计划内管理</span
                    ></template
                  >
                </TableToolbar>
                <DataTable
                  :data="planTasks as unknown as Record<string, unknown>[]"
                  :columns="taskColumns"
                  height="420px"
                  @row-click="openTaskIfAllowed(asTask($event))"
                >
                  <template #name="{ row }"
                    ><button
                      v-if="canViewTaskDetail"
                      class="training-operations-link"
                      type="button"
                      @click.stop="emit('openTask', asTask(row))"
                    >
                      {{ asTask(row).name }}</button
                    ><span v-else>{{ asTask(row).name }}</span></template
                  >
                  <template #type="{ row }"
                    >{{
                      asTask(row).isLongRunning ? '长期任务' : taskTypeLabel(asTask(row).taskType)
                    }}
                    · {{ asTask(row).period || '常设' }}</template
                  >
                  <template #period="{ row }">{{
                    asTask(row).isLongRunning
                      ? `${asTask(row).startAt} 起 · 无完成期限`
                      : `${asTask(row).startAt} 至 ${asTask(row).endAt}`
                  }}</template>
                  <template #status="{ row }"
                    ><StatusTag
                      :label="taskStatusLabel(asTask(row).status)"
                      :tone="taskStatusTone(asTask(row).status)"
                  /></template>
                  <template #progress="{ row }"
                    >{{ asTask(row).completedCount }} / {{ asTask(row).expectedCount }}</template
                  >
                  <template #rate="{ row }"
                    ><span
                      >{{
                        taskCompletionPercentage(
                          asTask(row).completedCount,
                          asTask(row).expectedCount,
                          asTask(row).completionRate,
                        )
                      }}<small
                        v-if="asTask(row).hasRequiredEmployees === false"
                        class="training-zero-note"
                        >当前无人</small
                      ></span
                    ></template
                  >
                  <template #actions="{ row }"
                    ><RowActionGrid :aria-label="`${asTask(row).name} 的操作`">
                      <el-button
                        v-permission="TRAINING_PERMISSIONS.tasks.detail"
                        link
                        type="primary"
                        @click.stop="emit('openTask', asTask(row))"
                        >查看任务</el-button
                      >
                      <el-button
                        v-if="canRetryStart(asTask(row))"
                        v-permission="TRAINING_PERMISSIONS.tasks.start"
                        link
                        type="primary"
                        @click.stop="openTaskConfirm('start', asTask(row))"
                        >重试启动</el-button
                      >
                      <el-button
                        v-if="asTask(row).status === 'NOT_STARTED'"
                        v-permission="TRAINING_PERMISSIONS.tasks.delete"
                        link
                        type="danger"
                        @click.stop="openTaskConfirm('delete', asTask(row))"
                        >删除</el-button
                      >
                    </RowActionGrid></template
                  >
                </DataTable>
                <AppPagination
                  v-model:page="taskPage"
                  v-model:page-size="taskPageSize"
                  :total="effectiveTaskTotal"
                  @change="emit('queryTasks', taskPage, taskPageSize)"
                />
              </section>
            </div>
          </el-tab-pane>
          <el-tab-pane
            v-if="canViewEmployees"
            :label="`计划员工（${effectiveEmployeeTotal}）`"
            name="employees"
          >
            <div class="training-detail-layout">
              <el-alert
                title="员工选择范围仅限当前 Tenant；已退出关系保留历史有效期。"
                type="info"
                :closable="false"
                show-icon
              />
              <div class="training-section-heading">
                <div>
                  <h3>计划员工</h3>
                  <p>当前资料随 IAM 员工目录更新</p>
                </div>
                <div class="training-detail-actions">
                  <el-button
                    v-permission="TRAINING_PERMISSIONS.plans.exitEmployees"
                    :disabled="!selectedEmployees.length"
                    @click="emit('exitEmployees', selectedEmployees)"
                    >批量退出</el-button
                  ><el-button
                    v-permission="TRAINING_PERMISSIONS.plans.addEmployees"
                    type="primary"
                    @click="openEmployeeForm"
                    >加入员工</el-button
                  >
                </div>
              </div>
              <DataTable
                :data="employees as unknown as Record<string, unknown>[]"
                :columns="employeeColumns"
                selection
                height="420px"
                @selection-change="selectEmployees"
              >
                <template #relation="{ row }"
                  ><StatusTag
                    :label="asEmployee(row).isCurrent ? '当前在计划' : '已退出'"
                    :tone="asEmployee(row).isCurrent ? 'success' : 'info'"
                /></template>
                <template #actions="{ row }"
                  ><RowActionGrid :aria-label="`${asEmployee(row).name} 的计划关系操作`"
                    ><el-button
                      v-permission="TRAINING_PERMISSIONS.plans.queryEmployees"
                      link
                      type="primary"
                      @click="openEmployeeHistory(asEmployee(row))"
                      >有效期历史</el-button
                    ><el-button
                      v-if="asEmployee(row).isCurrent"
                      v-permission="TRAINING_PERMISSIONS.plans.exitEmployees"
                      link
                      type="warning"
                      @click="emit('exitEmployees', [asEmployee(row)])"
                      >退出</el-button
                    ><el-button
                      v-else
                      v-permission="TRAINING_PERMISSIONS.plans.rejoinEmployee"
                      link
                      type="primary"
                      @click="emit('rejoinEmployee', asEmployee(row))"
                      >重新加入</el-button
                    ></RowActionGrid
                  ></template
                >
              </DataTable>
              <AppPagination
                v-model:page="employeePage"
                v-model:page-size="employeePageSize"
                :total="effectiveEmployeeTotal"
                @change="emit('queryPlanEmployees', employeePage, employeePageSize)"
              />
            </div>
          </el-tab-pane>
        </el-tabs>
        <el-alert
          v-else
          title="你可以查看计划资料，但没有任务列表或计划员工的查看权限。"
          type="info"
          :closable="false"
          show-icon
        />
      </div>
    </DetailPageTemplate>

    <FormDrawer
      v-model="taskFormVisible"
      title="在当前计划中新建任务"
      :size="760"
      :submitting="taskSubmitting"
      :confirm-disabled="!taskFormValid"
      confirm-button-text="创建任务"
      @confirm="submitTask"
    >
      <el-form label-position="top" novalidate>
        <div class="training-form-grid">
          <el-form-item label="任务类型" required
            ><el-select v-model="form.taskType"
              ><el-option
                v-for="type in allowedTaskTypes"
                :key="type"
                :label="`${taskTypeLabel(type)}任务`"
                :value="type" /></el-select
          ></el-form-item>
          <el-form-item label="任务名称" required
            ><el-input v-model="form.name" maxlength="200" show-word-limit
          /></el-form-item>
          <el-form-item
            v-if="form.taskType === 'TEMPORARY' && plan?.planType === 'STANDING'"
            label="执行模式"
            required
            ><el-switch
              v-model="form.isLongRunning"
              active-text="长期开放"
              inactive-text="限时任务"
          /></el-form-item>
          <el-form-item v-if="form.taskType !== 'TEMPORARY'" label="任务周期" required
            ><el-select v-model="form.periodKey" placeholder="选择计划有效期内周期"
              ><el-option
                v-for="period in periodOptions"
                :key="period"
                :label="period"
                :value="period" /></el-select
          ></el-form-item>
          <el-form-item label="开始时间" required
            ><el-date-picker
              v-model="form.startAt"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ssZ"
          /></el-form-item>
          <el-form-item v-if="!form.isLongRunning" label="截止时间" required
            ><el-date-picker
              v-model="form.endAt"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ssZ"
          /></el-form-item>
          <el-form-item class="training-form-grid__full" label="课程顺序" required
            ><el-select
              v-model="form.courseIds"
              multiple
              filterable
              remote
              reserve-keyword
              :remote-method="(keyword: string) => emit('searchCourses', keyword)"
              placeholder="搜索并选择启用课程"
              ><el-option
                v-for="option in courseOptions ?? []"
                :key="option.id"
                :label="option.label"
                :value="option.id" /></el-select
          ></el-form-item>
          <el-form-item class="training-form-grid__full" label="考试配置" required
            ><el-select
              v-model="form.examId"
              filterable
              remote
              reserve-keyword
              :remote-method="(keyword: string) => emit('searchExams', keyword)"
              placeholder="搜索并选择启用考试"
              ><el-option
                v-for="option in examOptions ?? []"
                :key="option.id"
                :label="option.label"
                :value="option.id" /></el-select
          ></el-form-item>
        </div>
        <el-alert
          v-if="taskScheduleError"
          :title="taskScheduleError"
          type="error"
          :closable="false"
          show-icon
        />
        <el-alert
          v-if="form.isLongRunning"
          title="长期任务没有截止时间，不产生逾期状态；零员工也可开放，完成率达到 100% 后仍保持开放。"
          type="info"
          :closable="false"
          show-icon
        />
        <el-alert
          v-else-if="form.taskType === 'TEMPORARY'"
          title="临时任务技术周期标识由服务端生成；任务仍受当前计划有效期与 Tenant 边界约束。"
          type="info"
          :closable="false"
          show-icon
        />
      </el-form>
    </FormDrawer>

    <FormDrawer
      v-model="onboardingVisible"
      title="配置入职培训自动纳入"
      :size="760"
      :submitting="onboardingSubmitting"
      :confirm-disabled="!onboardingFormValid"
      confirm-button-text="保存规则"
      @confirm="submitOnboarding"
    >
      <el-form label-position="top">
        <el-form-item label="目标长期任务" required>
          <el-select v-model="onboardingForm.taskId" placeholder="选择常设计划下的长期任务">
            <el-option
              v-for="task in standingTasks"
              :key="task.id"
              :label="task.name"
              :value="task.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="规则状态"
          ><el-switch
            v-model="onboardingForm.enabled"
            active-text="启用并接收新人"
            inactive-text="仅保存配置"
        /></el-form-item>
        <el-alert
          title="启用或切换目标任务时，服务端以当前时间建立新基线；启用前已生效员工不会被补录。"
          type="warning"
          :closable="false"
          show-icon
        />
        <section v-if="autoEnrollmentJobs.length" class="training-surface training-onboarding-jobs">
          <div class="training-section-heading">
            <div>
              <h3>最近处理记录</h3>
              <p>失败记录可单独重试，不影响其他员工。</p>
            </div>
          </div>
          <DataTable
            :data="autoEnrollmentJobs as unknown as Record<string, unknown>[]"
            :columns="onboardingJobColumns"
            height="240px"
          >
            <template #status="{ row }"
              ><StatusTag
                :label="String(row.status)"
                :tone="
                  row.status === 'SUCCEEDED'
                    ? 'success'
                    : row.status === 'FAILED'
                      ? 'danger'
                      : 'info'
                "
            /></template>
            <template #actions="{ row }"
              ><el-button
                v-if="row.status === 'FAILED'"
                v-permission="TRAINING_PERMISSIONS.onboarding.retry"
                link
                type="primary"
                @click="
                  emit('retryOnboardingJob', row as unknown as TrainingAutoEnrollmentJobRecord)
                "
                >重试</el-button
              ></template
            >
          </DataTable>
        </section>
      </el-form>
    </FormDrawer>

    <FormDialog
      v-model="onboardingStopVisible"
      title="停止接收新员工"
      confirm-type="warning"
      confirm-button-text="停止接收"
      @confirm="stopOnboarding"
    >
      <p>
        仅停用后续自动纳入。已生成的员工执行轮次、学习记录与历史统计均会保留，员工仍可继续完成现有培训。
      </p>
    </FormDialog>

    <DetailDrawer
      v-model="historyVisible"
      :title="`${historyEmployee?.name ?? '员工'} · 计划有效期历史`"
      :size="760"
    >
      <DataTable
        :data="employeeHistory as unknown as Record<string, unknown>[]"
        :columns="historyColumns"
        :loading="employeeHistoryLoading"
        height="480px"
      >
        <template #relation="{ row }"
          ><StatusTag
            :label="asEmployee(row).isCurrent ? '当前有效' : '已结束'"
            :tone="asEmployee(row).isCurrent ? 'success' : 'info'"
        /></template>
      </DataTable>
    </DetailDrawer>

    <DetailDrawer
      v-model="batchResultVisible"
      :title="batchResult?.title ?? '批量处理结果'"
      :size="900"
    >
      <el-alert
        :title="batchResult?.summary ?? '处理完成'"
        type="info"
        :closable="false"
        show-icon
      />
      <DataTable
        :data="(batchResult?.items ?? []) as unknown as Record<string, unknown>[]"
        :columns="batchResultColumns"
        height="480px"
      >
        <template #result="{ row }">{{ batchResultLabel(String(row.result ?? '')) }}</template>
      </DataTable>
    </DetailDrawer>

    <FormDrawer
      v-model="employeeFormVisible"
      title="加入计划员工"
      :size="640"
      :submitting="employeeSubmitting"
      :confirm-disabled="!employeeIds.length"
      confirm-button-text="加入计划"
      @confirm="submitEmployees"
    >
      <el-form label-position="top">
        <el-form-item label="当前 Tenant 员工" required>
          <el-select
            v-model="employeeIds"
            multiple
            filterable
            remote
            reserve-keyword
            :remote-method="(keyword: string) => emit('searchEmployees', keyword)"
            :loading="employeeOptionsLoading"
            placeholder="输入员工编号或姓名搜索"
          >
            <el-option
              v-for="option in employeeOptions ?? []"
              :key="option.id"
              :label="option.secondary ? `${option.label} · ${option.secondary}` : option.label"
              :value="option.id"
            />
          </el-select>
        </el-form-item>
        <el-alert
          title="只能选择当前 Tenant 的有效员工；已退出该计划的员工请使用“重新加入”。"
          type="info"
          :closable="false"
          show-icon
        />
      </el-form>
    </FormDrawer>

    <FormDialog
      v-model="taskConfirmVisible"
      :title="taskConfirmAction === 'start' ? '重试启动培训任务' : '删除培训任务'"
      :confirm-type="taskConfirmAction === 'delete' ? 'danger' : 'primary'"
      :confirm-button-text="taskConfirmAction === 'start' ? '确认重试' : '确认删除'"
      @confirm="confirmTaskAction"
    >
      <p v-if="taskConfirmAction === 'start'">
        仅用于已到开始时间但仍未启动的异常任务；服务端将重新执行员工快照与配置锁定。
      </p>
      <p v-else>仅未启动且没有执行数据的任务可删除，此操作不可撤销。</p>
    </FormDialog>
  </AppPage>
</template>

<style scoped lang="scss">
@use '../styles/training-operations.scss';
</style>
