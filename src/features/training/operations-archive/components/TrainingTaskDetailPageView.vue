<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import FormDialog from '@shared/components/FormDialog.vue'
import DetailPageTemplate from '@shared/components/page-templates/DetailPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import {
  assignmentTypeLabel,
  completionSourceLabel,
  courseLearningStatusLabel,
  employeeStatusLabel,
  employeeStatusTone,
  examStatusLabel,
  optionalRate,
  taskCompletionPercentage,
  taskStatusLabel,
  taskStatusTone,
  taskTypeLabel,
} from '../operationsUi'
import { TRAINING_PERMISSIONS } from '../trainingPermissions'
import type {
  CourseLearningStatus,
  EmployeeExamStatus,
  PersonnelDrilldownContext,
  TaskCourseStatisticsRecord,
  TaskEmployeeRecord,
  TaskExamStatisticsRecord,
  TrainingOperationsPreviewState,
  TrainingTaskRecord,
} from '../types/trainingOperations'
import TrainingPersonnelDrawer from './TrainingPersonnelDrawer.vue'

interface ReturnToWorkEmployeeOption {
  employeeId: number
  employeeCode?: string
  name: string
  organization?: string
  position?: string
  disabled?: boolean
  disabledReason?: string
}

const props = withDefaults(
  defineProps<{
    task: TrainingTaskRecord | undefined
    courses: TaskCourseStatisticsRecord[]
    exams: TaskExamStatisticsRecord[]
    employees: TaskEmployeeRecord[]
    state: TrainingOperationsPreviewState
    employeeTotal: number
    employeePage?: number
    employeePageSize?: number
    personnelLoading?: boolean
    drilldownLoading?: boolean
    drilldownEmployees?: TaskEmployeeRecord[] | undefined
    drilldownTotal?: number
    drilldownPage?: number
    drilldownPageSize?: number
    courseOptions?: Array<{ id: number; label: string }>
    examOptions?: Array<{ id: number; label: string }>
    updateSubmitting?: boolean
    updateSubmissionVersion?: number
    canViewCourseDetails?: boolean
    canViewExamDetails?: boolean
    canEditTask?: boolean
    canEditLongRunningTask?: boolean
    canViewEmployees?: boolean
    canArrangeReturnToWork?: boolean
    returnToWorkEmployeeOptions?: ReturnToWorkEmployeeOption[]
    returnToWorkSearching?: boolean
    returnToWorkSubmitting?: boolean
    returnToWorkSubmissionVersion?: number
    returnToWorkError?: string
    canAdminCompleteEmployee?: boolean
    adminCompleteSubmitting?: boolean
    adminCompleteSubmissionVersion?: number
    adminCompleteError?: string
  }>(),
  {
    employeePage: 1,
    employeePageSize: 20,
    personnelLoading: false,
    drilldownLoading: false,
    drilldownEmployees: () => [],
    drilldownTotal: 0,
    drilldownPage: 1,
    drilldownPageSize: 20,
    courseOptions: () => [],
    examOptions: () => [],
    updateSubmitting: false,
    updateSubmissionVersion: 0,
    canViewCourseDetails: true,
    canViewExamDetails: true,
    canEditTask: true,
    canEditLongRunningTask: false,
    canViewEmployees: true,
    canArrangeReturnToWork: false,
    returnToWorkEmployeeOptions: () => [],
    returnToWorkSearching: false,
    returnToWorkSubmitting: false,
    returnToWorkSubmissionVersion: 0,
    returnToWorkError: '',
    canAdminCompleteEmployee: false,
    adminCompleteSubmitting: false,
    adminCompleteSubmissionVersion: 0,
    adminCompleteError: '',
  },
)
const emit = defineEmits<{
  back: []
  retry: []
  action: [message: string]
  openCourse: [courseId: number]
  openExam: [examId: number]
  queryEmployees: [
    query: {
      employeeName: string
      trainingStatus: string
      courseLearningStatus: string
      examStatus: string
      pageIndex: number
      pageSize: number
    },
  ]
  drilldown: [context: PersonnelDrilldownContext, pageIndex: number, pageSize: number]
  updateTask: [
    value: {
      name: string
      taskType: TrainingTaskRecord['taskType']
      periodKey: string
      startAt: string
      endAt: string
      courseIds: number[]
      examId: number
    },
  ]
  startTask: []
  deleteTask: []
  loadTaskOptions: []
  searchCourses: [keyword: string]
  searchExams: [keyword: string]
  searchReturnToWorkEmployees: [keyword: string]
  arrangeReturnToWork: [
    value: { trainingTaskId: number; employeeId: number; employeeName: string; reason: string },
  ]
  adminCompleteEmployee: [
    value: {
      trainingTaskEmployeeId: number
      updatedAt: string
      employeeName: string
      taskName: string
      executionNo: number
      reason: string
    },
  ]
}>()

const activeTab = ref('statistics')
const query = reactive({
  employeeName: '',
  trainingStatus: '',
  courseLearningStatus: '',
  examStatus: '',
})
const page = ref(props.employeePage)
const pageSize = ref(props.employeePageSize)
const personnelVisible = ref(false)
const personnelContext = ref<PersonnelDrilldownContext>()
const editVisible = ref(false)
const confirmVisible = ref(false)
const confirmAction = ref<'start' | 'delete'>('start')
const returnToWorkVisible = ref(false)
const returnToWorkAttempted = ref(false)
const returnToWorkForm = reactive({ employeeId: undefined as number | undefined, reason: '' })
const adminCompleteVisible = ref(false)
const adminCompleteAttempted = ref(false)
const adminCompleteEmployee = ref<TaskEmployeeRecord>()
const adminCompleteReason = ref('')
const editForm = reactive({
  name: '',
  taskType: 'MONTHLY' as TrainingTaskRecord['taskType'],
  periodKey: '',
  startAt: '',
  endAt: '',
  courseIds: [] as number[],
  examId: 0,
})
const isLongRunningTask = computed(() => props.task?.isLongRunning === true)
const editValid = computed(() =>
  Boolean(
    editForm.name.trim() &&
    editForm.periodKey.trim() &&
    editForm.startAt &&
    (isLongRunningTask.value || editForm.endAt) &&
    editForm.courseIds.length &&
    editForm.examId > 0,
  ),
)
const canOpenReturnToWork = computed(() =>
  Boolean(
    props.canArrangeReturnToWork && props.task?.isLongRunning && props.task.status === 'ACTIVE',
  ),
)
const selectedReturnToWorkEmployee = computed(() =>
  props.returnToWorkEmployeeOptions.find((item) => item.employeeId === returnToWorkForm.employeeId),
)
const returnToWorkValid = computed(() =>
  Boolean(returnToWorkForm.employeeId && returnToWorkForm.reason.trim()),
)
const adminCompleteValid = computed(() =>
  Boolean(adminCompleteEmployee.value?.updatedAt && adminCompleteReason.value.trim()),
)
const canRetryStart = computed(() => {
  if (props.task?.status !== 'NOT_STARTED') return false
  const startsAt = new Date(props.task.startAt).getTime()
  return Number.isFinite(startsAt) && startsAt <= Date.now()
})

const courseColumns: DataTableColumn[] = [
  { label: '课程名称', minWidth: 220, fixed: 'left', slot: 'name' },
  { prop: 'trainingType', label: '课程类型', width: 128 },
  { label: '未开始', width: 92, align: 'right', slot: 'notStarted' },
  { label: '学习中', width: 92, align: 'right', slot: 'learning' },
  { label: '已完成', width: 92, align: 'right', slot: 'completed' },
  { label: '完成率', width: 110, slot: 'rate' },
]
const examColumns: DataTableColumn[] = [
  { label: '考试名称', minWidth: 230, fixed: 'left', slot: 'name' },
  { label: '未考试', width: 92, align: 'right', slot: 'notStarted' },
  { label: '答题中', width: 92, align: 'right', slot: 'inProgress' },
  { label: '已考试', width: 92, align: 'right', slot: 'submitted' },
  { label: '考试率', width: 104, slot: 'examRate' },
  { label: '通过', width: 82, align: 'right', slot: 'passed' },
  { label: '失败', width: 82, align: 'right', slot: 'failed' },
  { label: '通过率', width: 104, slot: 'passRate' },
]
const baseEmployeeColumns: DataTableColumn[] = [
  { prop: 'employeeCode', label: '员工编号', width: 132, fixed: 'left' },
  { prop: 'name', label: '员工姓名', width: 108 },
  { prop: 'assignedAt', label: '参加时间', width: 164 },
  { label: '执行轮次', width: 112, slot: 'execution' },
  { label: '分配来源', width: 126, slot: 'assignmentType' },
  { prop: 'organization', label: '当前组织', minWidth: 160 },
  { prop: 'position', label: '当前岗位', minWidth: 136 },
  { label: '培训状态', width: 112, slot: 'trainingStatus' },
  { label: '已学习 / 课程', width: 124, slot: 'courseProgress' },
  { label: '课程状态', width: 100, slot: 'courseStatus' },
  { label: '考试状态', width: 100, slot: 'examStatus' },
  { prop: 'learningMinutes', label: '有效学习分钟', width: 126, align: 'right' },
  { label: '最终结果', minWidth: 126, slot: 'result' },
  { label: '完成来源', minWidth: 220, slot: 'completionSource' },
]
const employeeColumns = computed<DataTableColumn[]>(() => [
  ...baseEmployeeColumns,
  ...(props.canAdminCompleteEmployee
    ? [{ label: '操作', width: 120, fixed: 'right' as const, slot: 'actions' }]
    : []),
])
const effectiveTotal = computed(() => props.employeeTotal)

function asCourse(row: Record<string, unknown>) {
  return row as unknown as TaskCourseStatisticsRecord
}
function asExam(row: Record<string, unknown>) {
  return row as unknown as TaskExamStatisticsRecord
}
function asEmployee(row: Record<string, unknown>) {
  return row as unknown as TaskEmployeeRecord
}
function queryEmployeeList() {
  page.value = 1
  emit('queryEmployees', { ...query, pageIndex: page.value, pageSize: pageSize.value })
}
function resetEmployeeList() {
  Object.assign(query, {
    employeeName: '',
    trainingStatus: '',
    courseLearningStatus: '',
    examStatus: '',
  })
  queryEmployeeList()
}
function changeEmployeePage() {
  emit('queryEmployees', { ...query, pageIndex: page.value, pageSize: pageSize.value })
}
function openPersonnel(context: PersonnelDrilldownContext) {
  personnelContext.value = context
  personnelVisible.value = true
  emit('drilldown', context, 1, props.drilldownPageSize)
}
function changeDrilldownPage(pageIndex: number, nextPageSize: number) {
  if (!personnelContext.value) return
  emit('drilldown', personnelContext.value, pageIndex, nextPageSize)
}
function coursePeople(
  course: TaskCourseStatisticsRecord,
  status: CourseLearningStatus,
  label: string,
  count: number,
) {
  openPersonnel({
    title: `${course.name} · ${label}人员`,
    description: `${count} 人；当前 Tenant、当前任务、当前课程口径`,
    courseId: course.courseId,
    courseStatus: status,
  })
}
function examPeople(
  exam: TaskExamStatisticsRecord,
  status: 'NOT_SUBMITTED' | EmployeeExamStatus | 'SUBMITTED',
  label: string,
  count: number,
) {
  openPersonnel({
    title: `${exam.name} · ${label}人员`,
    description: `${count} 人；当前 Tenant、当前任务、当前考试口径`,
    examId: exam.examId,
    examStatus: status,
  })
}
function displayedTaskStatusLabel(task: TrainingTaskRecord) {
  if (task.isLongRunning && task.status === 'OVERDUE') return '进行中'
  return taskStatusLabel(task.status)
}
function displayedTaskStatusTone(task: TrainingTaskRecord) {
  if (task.isLongRunning && task.status === 'OVERDUE') return 'success'
  return taskStatusTone(task.status)
}
function displayedEmployeeStatus(employee: TaskEmployeeRecord) {
  if (isLongRunningTask.value && employee.status === 'OVERDUE') return '学习中'
  return employeeStatusLabel(employee.status)
}
function displayedEmployeeStatusTone(employee: TaskEmployeeRecord) {
  if (isLongRunningTask.value && employee.status === 'OVERDUE') return 'warning'
  return employeeStatusTone(employee.status)
}
function openReturnToWork(employee?: TaskEmployeeRecord) {
  if (!props.task || !canOpenReturnToWork.value) return
  Object.assign(returnToWorkForm, { employeeId: employee?.employeeId, reason: '' })
  returnToWorkAttempted.value = false
  returnToWorkVisible.value = true
  emit('searchReturnToWorkEmployees', employee?.name ?? '')
}
function submitReturnToWork() {
  if (!props.task || !returnToWorkValid.value || props.returnToWorkSubmitting) return
  const employee = selectedReturnToWorkEmployee.value
  if (!employee) return
  returnToWorkAttempted.value = true
  emit('arrangeReturnToWork', {
    trainingTaskId: props.task.id,
    employeeId: employee.employeeId,
    employeeName: employee.name,
    reason: returnToWorkForm.reason.trim(),
  })
}
function openAdminComplete(employee: TaskEmployeeRecord) {
  if (!props.canAdminCompleteEmployee || !employee.canAdminComplete || !employee.updatedAt) return
  adminCompleteEmployee.value = employee
  adminCompleteReason.value = ''
  adminCompleteAttempted.value = false
  adminCompleteVisible.value = true
}
function submitAdminComplete() {
  const employee = adminCompleteEmployee.value
  if (
    !props.task ||
    !employee?.updatedAt ||
    !adminCompleteValid.value ||
    props.adminCompleteSubmitting
  )
    return
  adminCompleteAttempted.value = true
  emit('adminCompleteEmployee', {
    trainingTaskEmployeeId: employee.id,
    updatedAt: employee.updatedAt,
    employeeName: employee.name,
    taskName: props.task.name,
    executionNo: employee.executionNo ?? 1,
    reason: adminCompleteReason.value.trim(),
  })
}
function openEdit() {
  if (!props.task) return
  emit('loadTaskOptions')
  Object.assign(editForm, {
    name: props.task.name,
    taskType: props.task.taskType,
    periodKey: props.task.period,
    startAt: props.task.startAt,
    endAt: props.task.endAt ?? '',
    courseIds: props.courses
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((course) => course.courseId),
    examId: props.task.examId ?? 0,
  })
  editVisible.value = true
}
function submitEdit() {
  if (!editValid.value) return
  emit('updateTask', {
    ...editForm,
    name: editForm.name.trim(),
    courseIds: [...editForm.courseIds],
  })
}
function openConfirm(action: 'start' | 'delete') {
  confirmAction.value = action
  confirmVisible.value = true
}
function submitConfirm() {
  confirmVisible.value = false
  if (confirmAction.value === 'start') emit('startTask')
  else emit('deleteTask')
}
watch(
  () => props.employeePage,
  (value) => {
    page.value = value
  },
)
watch(
  () => props.employeePageSize,
  (value) => {
    pageSize.value = value
  },
)
watch(
  () => props.updateSubmissionVersion,
  () => {
    editVisible.value = false
  },
)
watch(
  () => props.returnToWorkSubmissionVersion,
  () => {
    if (!returnToWorkVisible.value) return
    returnToWorkVisible.value = false
    Object.assign(returnToWorkForm, { employeeId: undefined, reason: '' })
  },
)
watch(
  () => props.adminCompleteSubmissionVersion,
  () => {
    if (!adminCompleteVisible.value) return
    adminCompleteVisible.value = false
    adminCompleteEmployee.value = undefined
    adminCompleteReason.value = ''
  },
)
</script>

<template>
  <AppPage class="training-operations-page">
    <DetailPageTemplate scroll-mode="page">
      <template #header>
        <PageHeader title="培训任务详情" description="核对课程、考试与员工执行结果">
          <template #actions>
            <el-button @click="emit('back')">返回培训计划</el-button>
            <el-button
              v-if="
                task &&
                (!task.isLocked || (task.isLongRunning && canEditLongRunningTask)) &&
                canEditTask
              "
              v-permission="TRAINING_PERMISSIONS.tasks.update"
              @click="openEdit"
              >编辑任务</el-button
            >
            <el-button
              v-if="canRetryStart"
              v-permission="TRAINING_PERMISSIONS.tasks.start"
              type="primary"
              @click="openConfirm('start')"
              >重试启动</el-button
            >
            <el-button
              v-if="task?.status === 'NOT_STARTED'"
              v-permission="TRAINING_PERMISSIONS.tasks.delete"
              type="danger"
              plain
              @click="openConfirm('delete')"
              >删除任务</el-button
            >
          </template>
        </PageHeader>
      </template>
      <template #summary>
        <section v-if="task" class="training-detail-hero">
          <div>
            <h3>{{ task.name }}</h3>
            <p>{{ task.planName }} · {{ taskTypeLabel(task.taskType) }} · {{ task.period }}</p>
          </div>
          <div class="training-detail-tags">
            <StatusTag
              :label="displayedTaskStatusLabel(task)"
              :tone="displayedTaskStatusTone(task)"
            />
            <StatusTag v-if="task.isLongRunning" label="长期任务 · 无完成期限" tone="info" />
            <StatusTag
              :label="
                task.isLongRunning
                  ? '内容可创建新版本'
                  : task.isLocked
                    ? '核心配置已锁定'
                    : '核心配置可编辑'
              "
              :tone="task.isLongRunning ? 'info' : task.isLocked ? 'warning' : 'info'"
            />
            <StatusTag
              v-if="task.contentVersion"
              :label="`内容 V${task.contentVersion}`"
              tone="info"
            />
            <StatusTag
              :label="`${task.completedCount} / ${task.expectedCount} 完成`"
              tone="success"
            />
          </div>
        </section>
      </template>

      <el-alert
        v-if="state === 'retryable-error'"
        title="任务详情加载失败"
        type="error"
        :closable="false"
        show-icon
        ><template #default
          ><el-button link type="primary" @click="emit('retry')">重新加载</el-button></template
        ></el-alert
      >
      <el-skeleton v-else-if="state === 'loading'" :rows="10" animated />
      <el-empty v-else-if="!task" description="未找到培训任务，或该任务不属于当前 Tenant 与计划" />
      <el-tabs v-else v-model="activeTab" class="training-detail-tabs">
        <el-tab-pane label="课程与考试" name="statistics">
          <div class="training-detail-layout">
            <el-descriptions title="任务口径" :column="2" border>
              <el-descriptions-item label="执行时间"
                >{{ task.startAt }} 至
                {{ task.isLongRunning ? '无完成期限' : task.endAt }}</el-descriptions-item
              >
              <el-descriptions-item label="任务类型"
                >{{ taskTypeLabel(task.taskType) }} · {{ task.period }}</el-descriptions-item
              >
              <el-descriptions-item label="完成口径"
                >全部课程已完成，且考试已提交</el-descriptions-item
              >
              <el-descriptions-item label="任务完成率"
                >{{ task.completedCount }} / {{ task.expectedCount }} ·
                {{
                  taskCompletionPercentage(
                    task.completedCount,
                    task.expectedCount,
                    task.completionRate,
                  )
                }}</el-descriptions-item
              >
              <el-descriptions-item v-if="task.isLongRunning" label="内容版本"
                >V{{ task.contentVersion ?? 1 }} · 各执行轮次保留分配时版本</el-descriptions-item
              >
            </el-descriptions>
            <el-alert
              v-if="task.isLongRunning"
              title="长期任务达到 100% 仅表示当前执行轮次均已完成；任务仍持续开放，不产生逾期。"
              type="info"
              :closable="false"
              show-icon
            />
            <el-alert
              v-if="task.hasRequiredEmployees === false"
              title="当前无人需要培训，任务完成率按规则显示 100%。"
              type="info"
              :closable="false"
              show-icon
            />

            <section class="training-surface">
              <div class="training-section-heading">
                <div>
                  <h3>课程学习统计</h3>
                  <p>点击课程或人数进入同口径详情</p>
                </div>
                <StatusTag :label="`${courses.length} 门课程`" tone="info" />
              </div>
              <DataTable
                :data="courses as unknown as Record<string, unknown>[]"
                :columns="courseColumns"
                height="320px"
              >
                <template #name="{ row }"
                  ><button
                    v-if="canViewCourseDetails"
                    class="training-operations-link"
                    type="button"
                    @click="emit('openCourse', asCourse(row).courseId)"
                  >
                    {{ asCourse(row).name }}</button
                  ><span v-else>{{ asCourse(row).name }}</span></template
                >
                <template #notStarted="{ row }"
                  ><el-button
                    v-if="canViewEmployees"
                    link
                    type="primary"
                    @click="
                      coursePeople(
                        asCourse(row),
                        'NOT_STARTED',
                        '未开始',
                        asCourse(row).notStartedCount,
                      )
                    "
                    >{{ asCourse(row).notStartedCount }}</el-button
                  ><span v-else>{{ asCourse(row).notStartedCount }}</span></template
                >
                <template #learning="{ row }"
                  ><el-button
                    v-if="canViewEmployees"
                    link
                    type="primary"
                    @click="
                      coursePeople(asCourse(row), 'LEARNING', '学习中', asCourse(row).learningCount)
                    "
                    >{{ asCourse(row).learningCount }}</el-button
                  ><span v-else>{{ asCourse(row).learningCount }}</span></template
                >
                <template #completed="{ row }"
                  ><el-button
                    v-if="canViewEmployees"
                    link
                    type="primary"
                    @click="
                      coursePeople(
                        asCourse(row),
                        'COMPLETED',
                        '已完成',
                        asCourse(row).completedCount,
                      )
                    "
                    >{{ asCourse(row).completedCount }}</el-button
                  ><span v-else>{{ asCourse(row).completedCount }}</span></template
                >
                <template #rate="{ row }">{{
                  optionalRate(asCourse(row).completionRate)
                }}</template>
              </DataTable>
            </section>

            <section class="training-surface">
              <div class="training-section-heading">
                <div>
                  <h3>考试执行统计</h3>
                  <p>考试完成只表示已提交，不等于通过</p>
                </div>
                <StatusTag :label="`${exams.length} 个考试`" tone="info" />
              </div>
              <DataTable
                :data="exams as unknown as Record<string, unknown>[]"
                :columns="examColumns"
                height="300px"
              >
                <template #name="{ row }"
                  ><button
                    v-if="canViewExamDetails"
                    class="training-operations-link"
                    type="button"
                    @click="emit('openExam', asExam(row).examId)"
                  >
                    {{ asExam(row).name }}</button
                  ><span v-else>{{ asExam(row).name }}</span></template
                >
                <template #notStarted="{ row }"
                  ><el-button
                    v-if="canViewEmployees"
                    link
                    type="primary"
                    @click="
                      examPeople(asExam(row), 'NOT_STARTED', '未考试', asExam(row).notStartedCount)
                    "
                    >{{ asExam(row).notStartedCount }}</el-button
                  ><span v-else>{{ asExam(row).notStartedCount }}</span></template
                >
                <template #inProgress="{ row }"
                  ><el-button
                    v-if="canViewEmployees"
                    link
                    type="primary"
                    @click="
                      examPeople(asExam(row), 'IN_PROGRESS', '答题中', asExam(row).inProgressCount)
                    "
                    >{{ asExam(row).inProgressCount }}</el-button
                  ><span v-else>{{ asExam(row).inProgressCount }}</span></template
                >
                <template #submitted="{ row }"
                  ><el-button
                    v-if="canViewEmployees"
                    link
                    type="primary"
                    @click="
                      examPeople(asExam(row), 'SUBMITTED', '已考试', asExam(row).submittedCount)
                    "
                    >{{ asExam(row).submittedCount }}</el-button
                  ><span v-else>{{ asExam(row).submittedCount }}</span></template
                >
                <template #examRate="{ row }">{{ optionalRate(asExam(row).examRate) }}</template>
                <template #passed="{ row }"
                  ><el-button
                    v-if="canViewEmployees"
                    link
                    type="primary"
                    @click="examPeople(asExam(row), 'PASSED', '通过', asExam(row).passedCount)"
                    >{{ asExam(row).passedCount }}</el-button
                  ><span v-else>{{ asExam(row).passedCount }}</span></template
                >
                <template #failed="{ row }"
                  ><el-button
                    v-if="canViewEmployees"
                    link
                    type="primary"
                    @click="examPeople(asExam(row), 'FAILED', '失败', asExam(row).failedCount)"
                    >{{ asExam(row).failedCount }}</el-button
                  ><span v-else>{{ asExam(row).failedCount }}</span></template
                >
                <template #passRate="{ row }">{{ optionalRate(asExam(row).passRate) }}</template>
              </DataTable>
            </section>
          </div>
        </el-tab-pane>

        <el-tab-pane
          v-if="canViewEmployees"
          :label="`员工概况（${effectiveTotal}）`"
          name="employees"
        >
          <div class="training-detail-layout">
            <SearchPanel
              :loading="personnelLoading"
              @search="queryEmployeeList"
              @reset="resetEmployeeList"
            >
              <el-form-item label="员工姓名"
                ><el-input
                  v-model="query.employeeName"
                  clearable
                  placeholder="输入员工姓名"
                  @keyup.enter="queryEmployeeList"
              /></el-form-item>
              <el-form-item label="培训状态"
                ><el-select v-model="query.trainingStatus" clearable placeholder="全部状态"
                  ><el-option label="未开始" value="NOT_STARTED" /><el-option
                    label="学习中"
                    value="LEARNING" /><el-option label="待考试" value="READY_FOR_EXAM" /><el-option
                    label="考试未通过"
                    value="EXAM_FAILED" /><el-option label="已完成" value="COMPLETED" /><el-option
                    v-if="!task.isLongRunning"
                    label="已逾期"
                    value="OVERDUE" /></el-select
              ></el-form-item>
              <el-form-item label="课程学习状态"
                ><el-select v-model="query.courseLearningStatus" clearable placeholder="全部状态"
                  ><el-option label="未开始" value="NOT_STARTED" /><el-option
                    label="学习中"
                    value="LEARNING" /><el-option label="已完成" value="COMPLETED" /></el-select
              ></el-form-item>
              <el-form-item label="考试状态"
                ><el-select v-model="query.examStatus" clearable placeholder="全部状态"
                  ><el-option label="未考试" value="NOT_STARTED" /><el-option
                    label="答题中"
                    value="IN_PROGRESS" /><el-option label="通过" value="PASSED" /><el-option
                    label="失败"
                    value="FAILED" /></el-select
              ></el-form-item>
            </SearchPanel>
            <section class="training-surface">
              <TableToolbar
                title="参加任务的员工"
                :total="effectiveTotal"
                :refreshing="personnelLoading"
                @refresh="queryEmployeeList"
              >
                <template #summary
                  ><span class="training-operations-page__summary"
                    >一名员工可保留多次执行轮次</span
                  ></template
                >
                <el-button
                  v-if="canOpenReturnToWork"
                  v-permission="TRAINING_PERMISSIONS.tasks.arrangeReturnToWork"
                  type="primary"
                  @click="openReturnToWork()"
                >
                  安排返岗培训
                </el-button>
              </TableToolbar>
              <DataTable
                :data="employees as unknown as Record<string, unknown>[]"
                :columns="employeeColumns"
                :loading="personnelLoading"
                height="420px"
              >
                <template #execution="{ row }"
                  ><span>第 {{ asEmployee(row).executionNo ?? 1 }} 轮</span
                  ><small class="training-execution-meta"
                    >内容 V{{ asEmployee(row).contentVersion ?? task.contentVersion ?? 1 }}</small
                  ></template
                >
                <template #assignmentType="{ row }">{{
                  assignmentTypeLabel(asEmployee(row).assignmentType)
                }}</template>
                <template #trainingStatus="{ row }"
                  ><StatusTag
                    :label="displayedEmployeeStatus(asEmployee(row))"
                    :tone="displayedEmployeeStatusTone(asEmployee(row))"
                /></template>
                <template #courseProgress="{ row }"
                  >{{ asEmployee(row).learnedCourseCount }} /
                  {{ asEmployee(row).courseCount }}</template
                >
                <template #courseStatus="{ row }">{{
                  courseLearningStatusLabel(asEmployee(row).courseLearningStatus)
                }}</template>
                <template #examStatus="{ row }">{{
                  examStatusLabel(asEmployee(row).examStatus)
                }}</template>
                <template #result="{ row }">{{
                  asEmployee(row).finalScore == null
                    ? '暂无结果'
                    : `${asEmployee(row).finalScore} 分 · ${asEmployee(row).finalPassed ? '通过' : '失败'}`
                }}</template>
                <template #completionSource="{ row }">
                  <div class="training-completion-source">
                    <StatusTag
                      :label="completionSourceLabel(asEmployee(row).completionSource)"
                      :tone="
                        asEmployee(row).completionSource === 'ADMIN'
                          ? 'warning'
                          : asEmployee(row).completionSource === 'NORMAL'
                            ? 'success'
                            : 'info'
                      "
                    />
                    <template v-if="asEmployee(row).completionSource === 'ADMIN'">
                      <small
                        >{{ asEmployee(row).adminCompletedBy || '管理员' }} ·
                        {{ asEmployee(row).adminCompletedAt || '时间待返回' }}</small
                      >
                      <el-tooltip
                        v-if="asEmployee(row).adminCompletionReason"
                        :content="asEmployee(row).adminCompletionReason"
                        placement="top"
                        ><small class="training-audit-reason">查看完成理由</small></el-tooltip
                      >
                    </template>
                  </div>
                </template>
                <template #actions="{ row }">
                  <RowActionGrid :aria-label="`${asEmployee(row).name} 的执行操作`">
                    <el-button
                      v-permission="TRAINING_PERMISSIONS.tasks.adminCompleteEmployee"
                      link
                      type="primary"
                      :disabled="
                        asEmployee(row).status === 'COMPLETED' ||
                        !asEmployee(row).canAdminComplete ||
                        !asEmployee(row).updatedAt
                      "
                      @click="openAdminComplete(asEmployee(row))"
                    >
                      {{ asEmployee(row).status === 'COMPLETED' ? '已完成' : '管理员完成' }}
                    </el-button>
                  </RowActionGrid>
                </template>
              </DataTable>
              <AppPagination
                v-model:page="page"
                v-model:page-size="pageSize"
                :total="effectiveTotal"
                @change="changeEmployeePage"
              />
            </section>
          </div>
        </el-tab-pane>
      </el-tabs>
    </DetailPageTemplate>

    <TrainingPersonnelDrawer
      v-if="personnelContext && canViewEmployees"
      v-model="personnelVisible"
      :context="personnelContext"
      :employees="drilldownEmployees ?? []"
      :loading="drilldownLoading"
      :total="drilldownTotal"
      :page="drilldownPage"
      :page-size="drilldownPageSize"
      @page-change="changeDrilldownPage"
    />

    <FormDrawer
      v-model="editVisible"
      title="编辑培训任务"
      :size="760"
      :submitting="updateSubmitting"
      :confirm-disabled="!editValid"
      confirm-button-text="保存任务"
      @confirm="submitEdit"
    >
      <el-form label-position="top">
        <div class="training-form-grid">
          <el-form-item label="任务类型"
            ><el-input :model-value="taskTypeLabel(editForm.taskType)" disabled
          /></el-form-item>
          <el-form-item label="任务周期"
            ><el-input v-model="editForm.periodKey" disabled
          /></el-form-item>
          <el-form-item label="任务名称" required
            ><el-input v-model="editForm.name" maxlength="200" show-word-limit
          /></el-form-item>
          <el-form-item label="开始时间" required
            ><el-date-picker
              v-model="editForm.startAt"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ssZ"
          /></el-form-item>
          <el-form-item label="截止时间" :required="!isLongRunningTask"
            ><el-input v-if="isLongRunningTask" model-value="无完成期限" disabled /><el-date-picker
              v-else
              v-model="editForm.endAt"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ssZ"
          /></el-form-item>
          <el-form-item class="training-form-grid__full" label="课程顺序" required
            ><el-select
              v-model="editForm.courseIds"
              multiple
              filterable
              remote
              reserve-keyword
              :remote-method="(keyword: string) => emit('searchCourses', keyword)"
              ><el-option
                v-for="option in courseOptions ?? []"
                :key="option.id"
                :label="option.label"
                :value="option.id" /></el-select
          ></el-form-item>
          <el-form-item class="training-form-grid__full" label="考试配置" required
            ><el-select
              v-model="editForm.examId"
              filterable
              remote
              reserve-keyword
              :remote-method="(keyword: string) => emit('searchExams', keyword)"
              ><el-option
                v-for="option in examOptions ?? []"
                :key="option.id"
                :label="option.label"
                :value="option.id" /></el-select
          ></el-form-item>
        </div>
        <el-alert
          :title="
            isLongRunningTask
              ? `当前内容版本 V${task?.contentVersion ?? 1}。保存后仅新分配的执行轮次使用新内容，历史轮次继续保留原版本。`
              : '任务类型和周期保持原值；任务启动后核心配置锁定。'
          "
          type="info"
          :closable="false"
          show-icon
        />
      </el-form>
    </FormDrawer>

    <FormDrawer
      v-model="returnToWorkVisible"
      title="安排返岗培训"
      :size="620"
      :submitting="returnToWorkSubmitting"
      :confirm-disabled="!returnToWorkValid"
      confirm-button-text="创建新执行轮次"
      @confirm="submitReturnToWork"
    >
      <el-form label-position="top">
        <el-alert
          title="每次安排都会创建新的独立执行轮次，历史学习、考试与完成记录不会被覆盖。"
          type="info"
          :closable="false"
          show-icon
        />
        <el-form-item label="当前 Tenant 员工" required>
          <el-select
            v-model="returnToWorkForm.employeeId"
            filterable
            remote
            reserve-keyword
            clearable
            :loading="returnToWorkSearching"
            placeholder="输入姓名或员工编号搜索"
            :remote-method="(keyword: string) => emit('searchReturnToWorkEmployees', keyword)"
          >
            <el-option
              v-for="option in returnToWorkEmployeeOptions"
              :key="option.employeeId"
              :label="`${option.name}${option.employeeCode ? ` · ${option.employeeCode}` : ''}`"
              :value="option.employeeId"
              :disabled="option.disabled"
            >
              <div class="training-employee-option">
                <span>{{ option.name }} · {{ option.employeeCode || '暂无员工编号' }}</span
                ><small
                  >{{ option.organization || '暂无组织' }} · {{ option.position || '暂无岗位'
                  }}{{ option.disabledReason ? ` · ${option.disabledReason}` : '' }}</small
                >
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="安排理由" required>
          <el-input
            v-model="returnToWorkForm.reason"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="说明本次返岗培训原因"
          />
        </el-form-item>
        <el-alert
          v-if="returnToWorkAttempted && returnToWorkError"
          :title="returnToWorkError"
          type="error"
          :closable="false"
          show-icon
        />
      </el-form>
    </FormDrawer>

    <FormDialog
      v-model="adminCompleteVisible"
      title="一键管理员完成"
      width="620"
      :submitting="adminCompleteSubmitting"
      :confirm-disabled="!adminCompleteValid"
      confirm-button-text="确认完成本轮执行"
      confirm-type="warning"
      @confirm="submitAdminComplete"
    >
      <el-descriptions v-if="task && adminCompleteEmployee" :column="1" border>
        <el-descriptions-item label="员工"
          >{{ adminCompleteEmployee.name }} ·
          {{ adminCompleteEmployee.employeeCode }}</el-descriptions-item
        >
        <el-descriptions-item label="任务">{{ task.name }}</el-descriptions-item>
        <el-descriptions-item label="执行轮次"
          >第 {{ adminCompleteEmployee.executionNo ?? 1 }} 轮 · 内容 V{{
            adminCompleteEmployee.contentVersion ?? task.contentVersion ?? 1
          }}</el-descriptions-item
        >
      </el-descriptions>
      <el-alert
        class="training-admin-complete-warning"
        title="只完成本次执行：不会伪造课程学习记录、考试成绩或通过结果，也不会自动恢复员工岗位状态。"
        type="warning"
        :closable="false"
        show-icon
      />
      <el-form label-position="top">
        <el-form-item label="完成理由" required>
          <el-input
            v-model="adminCompleteReason"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="填写线下核验依据或特殊完成原因"
          />
        </el-form-item>
      </el-form>
      <el-alert
        v-if="adminCompleteAttempted && adminCompleteError"
        :title="adminCompleteError"
        type="error"
        :closable="false"
        show-icon
      />
    </FormDialog>

    <FormDialog
      v-model="confirmVisible"
      :title="confirmAction === 'start' ? '重试启动培训任务' : '删除培训任务'"
      :confirm-type="confirmAction === 'delete' ? 'danger' : 'primary'"
      :confirm-button-text="confirmAction === 'start' ? '确认重试' : '确认删除'"
      @confirm="submitConfirm"
    >
      <p v-if="confirmAction === 'start'">
        仅用于已到开始时间但仍未启动的异常任务；服务端将重新执行员工快照与配置锁定。
      </p>
      <p v-else>仅未启动且没有执行数据的任务可删除，此操作不可撤销。</p>
    </FormDialog>
  </AppPage>
</template>

<style scoped lang="scss">
@use '../styles/training-operations.scss';

.training-execution-meta,
.training-completion-source small,
.training-employee-option small {
  display: block;
  margin-top: var(--spacing-1);
  color: var(--text-secondary);
}

.training-completion-source,
.training-employee-option {
  min-width: 0;
}

.training-audit-reason {
  color: var(--color-primary);
  cursor: help;
}

.training-employee-option {
  line-height: 1.35;
}

.training-admin-complete-warning {
  margin: var(--spacing-3) 0;
}
</style>
