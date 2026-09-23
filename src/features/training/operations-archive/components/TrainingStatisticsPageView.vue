<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, reactive, ref, watch } from 'vue'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import DetailDrawer from '@shared/components/DetailDrawer.vue'
import FormDialog from '@shared/components/FormDialog.vue'
import DashboardPageTemplate from '@shared/components/page-templates/DashboardPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import type {
  TrainingCourseStatisticsDto,
  TrainingEmployeeTaskRecordDto,
  TrainingExamStatisticsDto,
  TrainingExamStatisticsRowDto,
  TrainingOverdueReportDto,
  TrainingPagedReportDto,
  TrainingTaskStatisticsReportDto,
  TrainingTaskStatisticsRowDto,
} from '../api/trainingOperationsApi'
import {
  employeeStatusLabel,
  employeeStatusTone,
  percentage,
  taskStatusLabel,
  taskStatusTone,
} from '../operationsUi'
import type {
  EmployeeArchiveRecord,
  PersonnelDrilldownContext,
  TaskEmployeeRecord,
  TrainingOperationsPreviewState,
  TrainingPlanRecord,
  TrainingTaskRecord,
} from '../types/trainingOperations'

type StatisticsTab = 'task' | 'course' | 'exam' | 'overdue'
type StatisticsStates = Partial<Record<StatisticsTab, TrainingOperationsPreviewState>>
interface TaskRouteTarget {
  taskId: number
  trainingId?: number
}
interface PersonnelDrilldownRequest extends PersonnelDrilldownContext {
  trainingTaskId: number
  pageIndex: number
  pageSize: number
}
interface LookupOption {
  id: number
  label: string
}

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
  executionNo: string
  assignmentType: string
  completionSource: string
  assignedAtPeriod: string[]
  pageIndex: number
  pageSize: number
}

const props = withDefaults(
  defineProps<{
    plans: TrainingPlanRecord[]
    tasks: TrainingTaskRecord[]
    employees: TaskEmployeeRecord[]
    archives: EmployeeArchiveRecord[]
    state: TrainingOperationsPreviewState
    taskReport?: TrainingTaskStatisticsReportDto | undefined
    courseReport?: TrainingPagedReportDto<TrainingCourseStatisticsDto> | undefined
    examReport?: TrainingExamStatisticsDto | undefined
    overdueReport?: TrainingOverdueReportDto | undefined
    sectionStates?: StatisticsStates
    pages?: Partial<Record<StatisticsTab, number>>
    pageSizes?: Partial<Record<StatisticsTab, number>>
    canExport?: boolean
    canAuditExport?: boolean
    exporting?: boolean
    exportVersion?: number
    canViewTaskDetail?: boolean
    drilldownEmployees?: TaskEmployeeRecord[]
    drilldownTotal?: number
    drilldownState?: TrainingOperationsPreviewState
    drilldownPage?: number
    drilldownPageSize?: number
    organizationOptions?: LookupOption[]
    positionOptions?: LookupOption[]
    courseOptions?: LookupOption[]
    examOptions?: LookupOption[]
  }>(),
  {
    taskReport: undefined,
    courseReport: undefined,
    examReport: undefined,
    overdueReport: undefined,
    sectionStates: () => ({}),
    pages: () => ({}),
    pageSizes: () => ({}),
    canExport: true,
    canAuditExport: false,
    exporting: false,
    exportVersion: 0,
    canViewTaskDetail: true,
    drilldownEmployees: () => [],
    drilldownTotal: 0,
    drilldownState: 'empty',
    drilldownPage: 1,
    drilldownPageSize: 10,
    organizationOptions: () => [],
    positionOptions: () => [],
    courseOptions: () => [],
    examOptions: () => [],
  },
)

const emit = defineEmits<{
  action: [message: string]
  query: [value: StatisticsQuery]
  retry: [tab: StatisticsTab]
  export: [tab: StatisticsTab]
  openTask: [target: TaskRouteTarget]
  drilldown: [value: PersonnelDrilldownRequest]
}>()

const activeTab = ref<StatisticsTab>('task')
const exportVisible = ref(false)
const drilldownVisible = ref(false)
const drilldownContext = ref<PersonnelDrilldownContext>()
const drilldownTaskId = ref<number>()
const defaultPeriod = () => [
  dayjs().startOf('year').format('YYYY-MM-DD'),
  dayjs().endOf('year').format('YYYY-MM-DD'),
]
function createQuery() {
  return {
    period: defaultPeriod(),
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
    executionNo: '',
    assignmentType: '',
    completionSource: '',
    assignedAtPeriod: [] as string[],
  }
}
const queryByTab = reactive<Record<StatisticsTab, ReturnType<typeof createQuery>>>({
  task: createQuery(),
  course: createQuery(),
  exam: createQuery(),
  overdue: createQuery(),
})
const currentQuery = computed(() => queryByTab[activeTab.value])
const currentPage = computed(() => props.pages[activeTab.value] ?? 1)
const currentPageSize = computed(() => props.pageSizes[activeTab.value] ?? 10)
const currentState = computed(() => props.sectionStates[activeTab.value] ?? props.state)
const canExportCurrent = computed(() => {
  if (activeTab.value === 'task') return props.canExport
  if (activeTab.value === 'exam') return props.canAuditExport
  return false
})

watch(
  () => props.exportVersion,
  () => {
    exportVisible.value = false
  },
)
watch(activeTab, () => runQuery(currentPage.value, currentPageSize.value))

const availableTasks = computed(() => {
  if (!currentQuery.value.planId) return props.tasks
  return props.tasks.filter(
    (item) => item.trainingId == null || String(item.trainingId) === currentQuery.value.planId,
  )
})

function fallbackOptions(values: string[]) {
  return [...new Set(values.filter(Boolean))].map((label, index) => ({ id: index + 1, label }))
}
const resolvedOrganizationOptions = computed(() =>
  props.organizationOptions.length
    ? props.organizationOptions
    : fallbackOptions(props.employees.map((item) => item.organization)),
)
const resolvedPositionOptions = computed(() =>
  props.positionOptions.length
    ? props.positionOptions
    : fallbackOptions(props.employees.map((item) => item.position)),
)

const taskRows = computed<TrainingTaskStatisticsRowDto[]>(() => {
  if (props.taskReport) return props.taskReport.items
  return props.tasks.map((item) => ({
    training_id: item.trainingId ?? 0,
    training_task_id: item.id,
    plan_year: 0,
    plan_name: item.planName,
    task_name: item.name,
    task_type: item.taskType,
    period_key: item.period,
    start_at: item.startAt,
    deadline_at: item.endAt ?? '',
    status: item.status,
    is_locked: item.isLocked,
    exam_id: item.examId ?? 0,
    exam_name: item.examName,
    exam_status: '',
    employee_task_count: item.expectedCount,
    distinct_employee_count: item.expectedCount,
    required_count: item.expectedCount,
    completed_count: item.completedCount,
    incomplete_count: Math.max(0, item.expectedCount - item.completedCount),
    current_overdue_count: item.overdueCount,
    ever_overdue_count: item.overdueCount,
    excluded_count: item.excludedCount ?? 0,
    effective_learning_seconds: 0,
    final_exam_count: 0,
    final_passed_count: 0,
    completion_rate: item.completionRate ?? 0,
    has_required_employees: item.hasRequiredEmployees ?? item.expectedCount > 0,
  }))
})

const taskSummaryCards = computed(() => {
  const summary = props.taskReport?.summary
  const fallback = {
    employee_task_count: taskRows.value.reduce((sum, item) => sum + item.employee_task_count, 0),
    distinct_employee_count: taskRows.value.reduce(
      (sum, item) => sum + item.distinct_employee_count,
      0,
    ),
    required_count: taskRows.value.reduce((sum, item) => sum + item.required_count, 0),
    completed_count: taskRows.value.reduce((sum, item) => sum + item.completed_count, 0),
    incomplete_count: taskRows.value.reduce((sum, item) => sum + item.incomplete_count, 0),
    current_overdue_count: taskRows.value.reduce(
      (sum, item) => sum + item.current_overdue_count,
      0,
    ),
    ever_overdue_count: taskRows.value.reduce((sum, item) => sum + item.ever_overdue_count, 0),
    excluded_count: taskRows.value.reduce((sum, item) => sum + item.excluded_count, 0),
  }
  const value = summary ?? fallback
  return [
    { label: '执行人次', value: value.employee_task_count },
    { label: '去重员工数', value: value.distinct_employee_count },
    { label: '应培训人次', value: value.required_count },
    { label: '已完成人次', value: value.completed_count },
    { label: '未完成人次', value: value.incomplete_count },
    { label: '当前逾期', value: value.current_overdue_count },
    { label: '曾逾期', value: value.ever_overdue_count },
    { label: '排除人次', value: value.excluded_count },
    {
      label: '总完成率',
      value: summary
        ? `${summary.completion_rate.toFixed(1)}%`
        : percentage(value.completed_count, value.required_count),
    },
  ]
})

const examRows = computed<TrainingExamStatisticsRowDto[]>(() => props.examReport?.items ?? [])
const examSummary = computed(() => props.examReport?.summary)

const overdueRows = computed<TrainingEmployeeTaskRecordDto[]>(
  () => props.overdueReport?.items ?? [],
)
const taskColumns: DataTableColumn[] = [
  { prop: 'plan_name', label: '培训计划', minWidth: 210 },
  { label: '计划类型 / 年度', width: 130, slot: 'planScope' },
  { label: '培训任务', minWidth: 230, slot: 'taskName' },
  { prop: 'task_type', label: '类型', width: 90 },
  { prop: 'period_key', label: '周期', width: 110 },
  { label: '任务状态', width: 100, slot: 'taskStatus' },
  { label: '执行时间', minWidth: 250, slot: 'execution' },
  { prop: 'employee_task_count', label: '执行人次', width: 96, align: 'right' },
  { prop: 'distinct_employee_count', label: '去重员工', width: 96, align: 'right' },
  { prop: 'required_count', label: '应培训', width: 90, align: 'right' },
  { prop: 'completed_count', label: '完成', width: 80, align: 'right' },
  { prop: 'incomplete_count', label: '未完成', width: 90, align: 'right' },
  { prop: 'current_overdue_count', label: '当前逾期', width: 100, align: 'right' },
  { prop: 'ever_overdue_count', label: '曾逾期', width: 90, align: 'right' },
  { prop: 'excluded_count', label: '排除', width: 80, align: 'right' },
  { label: '完成率', width: 150, slot: 'rate' },
]
const courseColumns: DataTableColumn[] = [
  { label: '培训任务', minWidth: 220, slot: 'courseTask' },
  { prop: 'course_name', label: '课程名称', minWidth: 210 },
  { prop: 'sort_order', label: '顺序', width: 72, align: 'right' },
  { prop: 'required_count', label: '应学习', width: 90, align: 'right' },
  { label: '未开始', width: 90, align: 'right', slot: 'courseNotStarted' },
  { label: '学习中', width: 90, align: 'right', slot: 'courseLearning' },
  { label: '已完成', width: 90, align: 'right', slot: 'courseCompleted' },
  { prop: 'effective_learning_seconds', label: '有效学习（秒）', width: 140, align: 'right' },
  { prop: 'anomaly_count', label: '异常数', width: 90, align: 'right' },
  { label: '完成率', width: 150, slot: 'courseRate' },
]
const examColumns: DataTableColumn[] = [
  { prop: 'plan_name', label: '培训计划', minWidth: 190 },
  { label: '计划类型 / 年度', width: 130, slot: 'examPlanScope' },
  { label: '培训任务', minWidth: 210, slot: 'examTask' },
  { prop: 'exam_name', label: '考试名称', minWidth: 190 },
  { prop: 'participant_count', label: '应考试', width: 90, align: 'right' },
  { label: '未提交', width: 90, align: 'right', slot: 'examNotSubmitted' },
  { label: '已提交', width: 90, align: 'right', slot: 'examSubmitted' },
  { label: '最终通过', width: 100, align: 'right', slot: 'examPassed' },
  { label: '最终未通过', width: 110, align: 'right', slot: 'examFailed' },
  { label: '最终通过率', width: 120, slot: 'examRate' },
]
const overdueColumns: DataTableColumn[] = [
  { prop: 'plan_name', label: '培训计划', minWidth: 190 },
  { label: '计划类型 / 年度', width: 130, slot: 'overduePlanScope' },
  { prop: 'task_name', label: '培训任务', minWidth: 210 },
  { label: '员工', minWidth: 170, slot: 'employee' },
  { label: '培训状态', width: 110, slot: 'employeeStatus' },
  { label: '曾逾期', width: 90, slot: 'wasOverdue' },
  { prop: 'overdue_seconds', label: '逾期秒数', width: 110, align: 'right' },
  { label: '首次逾期', minWidth: 160, slot: 'overdueAt' },
  { label: '完成时间', minWidth: 160, slot: 'completedAt' },
  { label: '完成期限', minWidth: 160, slot: 'deadlineAt' },
]

function runQuery(pageIndex = 1, pageSize = currentPageSize.value) {
  emit('query', {
    tab: activeTab.value,
    ...currentQuery.value,
    period: [...currentQuery.value.period],
    assignedAtPeriod: [...currentQuery.value.assignedAtPeriod],
    pageIndex,
    pageSize,
  })
}
function reset() {
  Object.assign(currentQuery.value, createQuery())
  runQuery(1, currentPageSize.value)
}
function employeeStatus(status: string): TaskEmployeeRecord['status'] {
  const value = status.toUpperCase()
  if (
    value === 'LEARNING' ||
    value === 'READY_FOR_EXAM' ||
    value === 'EXAM_FAILED' ||
    value === 'COMPLETED' ||
    value === 'OVERDUE'
  )
    return value
  return 'NOT_STARTED'
}
function formatRate(rate: number | undefined, numerator: number, denominator: number) {
  if (!denominator) return '暂无口径'
  return `${numerator} / ${denominator} · ${rate == null ? percentage(numerator, denominator) : `${rate.toFixed(1)}%`}`
}
function formatTime(value?: string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'
}
function formatDeadline(value?: string) {
  return value ? formatTime(value) : '无完成期限'
}
function planScopeLabel(planType?: string, planYear?: number) {
  return planType?.toUpperCase() === 'STANDING' ? '常设' : planYear ? `年度 · ${planYear}` : '年度'
}
function taskStatusForRow(row: TrainingTaskStatisticsRowDto) {
  return (
    !row.deadline_at && row.status?.toUpperCase() === 'OVERDUE' ? 'ACTIVE' : row.status
  ) as TrainingTaskRecord['status']
}
function overdueFlagForRow(row: TrainingEmployeeTaskRecordDto) {
  return Boolean(row.deadline_at && row.ever_overdue)
}
function openTask(target: TaskRouteTarget) {
  if (props.canViewTaskDetail) emit('openTask', target)
}
function openPersonnel(value: Omit<PersonnelDrilldownRequest, 'pageIndex' | 'pageSize'>) {
  drilldownContext.value = value
  drilldownTaskId.value = value.trainingTaskId
  drilldownVisible.value = true
  emit('drilldown', { ...value, pageIndex: 1, pageSize: props.drilldownPageSize })
}
function changeDrilldownPage(pageIndex: number, pageSize: number) {
  if (!drilldownContext.value || !drilldownTaskId.value) return
  emit('drilldown', {
    ...drilldownContext.value,
    trainingTaskId: drilldownTaskId.value,
    pageIndex,
    pageSize,
  })
}
function durationLabel(bucket: string) {
  return (
    (
      {
        LT_1_DAY: '不足 1 天',
        DAY_1_TO_3: '1–3 天',
        DAY_3_TO_7: '3–7 天',
        GTE_7_DAYS: '7 天及以上',
      } as Record<string, string>
    )[bucket] ?? bucket
  )
}
</script>

<template>
  <AppPage class="training-operations-page">
    <DashboardPageTemplate>
      <template #header>
        <PageHeader
          title="专项统计"
          description="分别核对任务完成、课程学习、考试结果与培训逾期口径"
          ><template #actions
            ><el-button v-if="canExportCurrent" @click="exportVisible = true"
              >导出当前统计</el-button
            ></template
          ></PageHeader
        >
        <el-tabs v-model="activeTab" class="training-stat-tabs"
          ><el-tab-pane label="任务完成" name="task" /><el-tab-pane
            label="课程学习"
            name="course" /><el-tab-pane label="考试结果" name="exam" /><el-tab-pane
            label="培训逾期"
            name="overdue"
        /></el-tabs>
        <SearchPanel
          collapsible
          :loading="currentState === 'loading'"
          @search="runQuery()"
          @reset="reset"
        >
          <el-form-item label="统计时间"
            ><el-date-picker
              v-model="currentQuery.period"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
          /></el-form-item>
          <el-form-item label="培训计划"
            ><el-select v-model="currentQuery.planId" clearable placeholder="全部计划"
              ><el-option
                v-for="plan in plans"
                :key="plan.id"
                :label="plan.name"
                :value="String(plan.id)" /></el-select
          ></el-form-item>
          <el-form-item label="培训任务"
            ><el-select v-model="currentQuery.taskId" clearable placeholder="全部任务"
              ><el-option
                v-for="task in availableTasks"
                :key="task.id"
                :label="task.name"
                :value="String(task.id)" /></el-select
          ></el-form-item>
          <el-form-item label="任务类型"
            ><el-select v-model="currentQuery.taskType" clearable placeholder="全部类型"
              ><el-option label="月度" value="MONTHLY" /><el-option
                label="季度"
                value="QUARTERLY" /><el-option label="临时" value="TEMPORARY" /></el-select
          ></el-form-item>
          <el-form-item label="当前组织">
            <el-select
              v-model="currentQuery.organizationId"
              clearable
              filterable
              placeholder="全部组织"
            >
              <el-option
                v-for="option in resolvedOrganizationOptions"
                :key="option.id"
                :label="option.label"
                :value="String(option.id)"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="当前岗位">
            <el-select
              v-model="currentQuery.positionId"
              clearable
              filterable
              placeholder="全部岗位"
            >
              <el-option
                v-for="option in resolvedPositionOptions"
                :key="option.id"
                :label="option.label"
                :value="String(option.id)"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="activeTab === 'course'" label="培训课程">
            <el-select v-model="currentQuery.courseId" clearable filterable placeholder="全部课程">
              <el-option
                v-for="option in courseOptions"
                :key="option.id"
                :label="option.label"
                :value="String(option.id)"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="activeTab === 'exam'" label="培训考试">
            <el-select v-model="currentQuery.examId" clearable filterable placeholder="全部考试">
              <el-option
                v-for="option in examOptions"
                :key="option.id"
                :label="option.label"
                :value="String(option.id)"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="activeTab === 'task'" label="任务状态"
            ><el-select v-model="currentQuery.taskStatus" clearable placeholder="全部状态"
              ><el-option label="未开始" value="NOT_STARTED" /><el-option
                label="进行中"
                value="ACTIVE" /><el-option label="已逾期" value="OVERDUE" /><el-option
                label="已完成"
                value="COMPLETED" /></el-select
          ></el-form-item>
          <el-form-item v-else-if="activeTab === 'overdue'" label="员工"
            ><el-input v-model="currentQuery.keyword" clearable placeholder="员工编号 / 姓名"
          /></el-form-item>
          <el-form-item v-if="activeTab === 'overdue'" label="培训状态"
            ><el-select v-model="currentQuery.employeeStatus" clearable placeholder="全部状态"
              ><el-option label="未开始" value="NOT_STARTED" /><el-option
                label="学习中"
                value="LEARNING" /><el-option label="待考试" value="READY_FOR_EXAM" /><el-option
                label="考试未通过"
                value="EXAM_FAILED" /><el-option label="已完成" value="COMPLETED" /><el-option
                label="已逾期"
                value="OVERDUE" /></el-select
          ></el-form-item>
          <el-form-item v-if="activeTab === 'overdue'" label="曾逾期"
            ><el-select v-model="currentQuery.overdue" clearable placeholder="全部"
              ><el-option label="是" value="true" /><el-option
                label="否"
                value="false" /></el-select
          ></el-form-item>
          <template #advanced>
            <el-form-item label="执行轮次">
              <el-input
                v-model="currentQuery.executionNo"
                clearable
                inputmode="numeric"
                placeholder="输入轮次"
              />
            </el-form-item>
            <el-form-item label="分配来源">
              <el-select v-model="currentQuery.assignmentType" clearable placeholder="全部来源">
                <el-option label="计划分配" value="PLAN" />
                <el-option label="入职自动纳入" value="ONBOARDING" />
                <el-option label="返岗安排" value="RETURN_TO_WORK" />
                <el-option label="人工分配" value="MANUAL" />
              </el-select>
            </el-form-item>
            <el-form-item label="完成来源">
              <el-select v-model="currentQuery.completionSource" clearable placeholder="全部来源">
                <el-option label="正常完成" value="NORMAL" />
                <el-option label="管理员完成" value="ADMIN" />
              </el-select>
            </el-form-item>
            <el-form-item label="参加时间">
              <el-date-picker
                v-model="currentQuery.assignedAtPeriod"
                type="daterange"
                range-separator="至"
                start-placeholder="参加开始"
                end-placeholder="参加结束"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </template>
        </SearchPanel>
      </template>

      <el-alert
        v-if="currentState === 'retryable-error'"
        title="当前统计加载失败，页签与筛选条件已保留"
        type="error"
        :closable="false"
        show-icon
        ><template #default
          ><el-button link type="primary" @click="emit('retry', activeTab)"
            >重新加载</el-button
          ></template
        ></el-alert
      >

      <section
        v-if="activeTab === 'task' && currentState !== 'retryable-error'"
        class="training-surface"
      >
        <div class="training-section-heading">
          <div>
            <h2>培训任务完成统计</h2>
            <p>管理员完成计入培训完成；执行人次与去重员工数分别展示</p>
          </div>
          <span class="training-operations-page__summary"
            >统计时点：{{
              taskReport?.scope?.as_of ? formatTime(taskReport.scope.as_of) : '—'
            }}</span
          >
        </div>
        <section class="training-kpi-grid" aria-label="任务统计汇总">
          <article v-for="metric in taskSummaryCards" :key="metric.label" class="training-kpi-card">
            <div class="training-kpi-card__header">{{ metric.label }}</div>
            <div class="training-kpi-card__value">
              <strong>{{ metric.value }}</strong>
            </div>
          </article>
        </section>
        <DataTable
          :data="taskRows as unknown as Record<string, unknown>[]"
          :columns="taskColumns"
          :loading="currentState === 'loading'"
          height="420px"
          ><template #planScope="{ row }">{{
            planScopeLabel(
              (row as unknown as TrainingTaskStatisticsRowDto).plan_type,
              (row as unknown as TrainingTaskStatisticsRowDto).plan_year,
            )
          }}</template>
          <template #taskName="{ row }">
            <button
              v-if="canViewTaskDetail"
              class="training-operations-link"
              type="button"
              @click="
                openTask({
                  trainingId: (row as unknown as TrainingTaskStatisticsRowDto).training_id,
                  taskId: (row as unknown as TrainingTaskStatisticsRowDto).training_task_id,
                })
              "
            >
              {{ (row as unknown as TrainingTaskStatisticsRowDto).task_name }}
            </button>
            <span v-else>{{ (row as unknown as TrainingTaskStatisticsRowDto).task_name }}</span>
          </template>
          <template #taskStatus="{ row }"
            ><StatusTag
              :label="
                taskStatusLabel(taskStatusForRow(row as unknown as TrainingTaskStatisticsRowDto))
              "
              :tone="
                taskStatusTone(taskStatusForRow(row as unknown as TrainingTaskStatisticsRowDto))
              " /></template
          ><template #execution="{ row }"
            >{{ formatTime((row as unknown as TrainingTaskStatisticsRowDto).start_at) }} —
            {{
              formatDeadline((row as unknown as TrainingTaskStatisticsRowDto).deadline_at)
            }}</template
          ><template #rate="{ row }"
            ><span v-if="(row as unknown as TrainingTaskStatisticsRowDto).has_required_employees">{{
              formatRate(
                (row as unknown as TrainingTaskStatisticsRowDto).completion_rate,
                (row as unknown as TrainingTaskStatisticsRowDto).completed_count,
                (row as unknown as TrainingTaskStatisticsRowDto).required_count,
              )
            }}</span
            ><span v-else
              >0 / 0 · 100%<small class="training-zero-note">当前无人需要培训</small></span
            ></template
          ></DataTable
        >
        <AppPagination
          :page="currentPage"
          :page-size="currentPageSize"
          :total="taskReport?.total ?? taskRows.length"
          @update:page="runQuery($event, currentPageSize)"
          @update:page-size="runQuery(1, $event)"
        />
      </section>

      <section
        v-else-if="activeTab === 'course' && currentState !== 'retryable-error'"
        class="training-surface"
      >
        <div class="training-section-heading">
          <div>
            <h2>课程学习统计</h2>
            <p>只展示真实课程学习事实；管理员完成不伪造课程完成率</p>
          </div>
          <span class="training-operations-page__summary"
            >共 {{ courseReport?.total ?? 0 }} 条</span
          >
        </div>
        <DataTable
          :data="(courseReport?.items ?? []) as unknown as Record<string, unknown>[]"
          :columns="courseColumns"
          :loading="currentState === 'loading'"
          height="420px"
          ><template #courseTask="{ row }">
            <button
              v-if="canViewTaskDetail"
              class="training-operations-link"
              type="button"
              @click="
                openTask({
                  taskId: (row as unknown as TrainingCourseStatisticsDto).training_task_id,
                })
              "
            >
              {{ (row as unknown as TrainingCourseStatisticsDto).task_name }}
            </button>
            <span v-else>{{ (row as unknown as TrainingCourseStatisticsDto).task_name }}</span>
          </template>
          <template #courseNotStarted="{ row }"
            ><el-button
              link
              type="primary"
              @click="
                openPersonnel({
                  title: '课程未开始人员',
                  description: (row as unknown as TrainingCourseStatisticsDto).course_name,
                  trainingTaskId: (row as unknown as TrainingCourseStatisticsDto).training_task_id,
                  courseId: (row as unknown as TrainingCourseStatisticsDto).course_id,
                  courseStatus: 'NOT_STARTED',
                })
              "
              >{{ (row as unknown as TrainingCourseStatisticsDto).not_started_count }}</el-button
            ></template
          >
          <template #courseLearning="{ row }"
            ><el-button
              link
              type="primary"
              @click="
                openPersonnel({
                  title: '课程学习中人员',
                  description: (row as unknown as TrainingCourseStatisticsDto).course_name,
                  trainingTaskId: (row as unknown as TrainingCourseStatisticsDto).training_task_id,
                  courseId: (row as unknown as TrainingCourseStatisticsDto).course_id,
                  courseStatus: 'LEARNING',
                })
              "
              >{{ (row as unknown as TrainingCourseStatisticsDto).learning_count }}</el-button
            ></template
          >
          <template #courseCompleted="{ row }"
            ><el-button
              link
              type="primary"
              @click="
                openPersonnel({
                  title: '课程已完成人员',
                  description: (row as unknown as TrainingCourseStatisticsDto).course_name,
                  trainingTaskId: (row as unknown as TrainingCourseStatisticsDto).training_task_id,
                  courseId: (row as unknown as TrainingCourseStatisticsDto).course_id,
                  courseStatus: 'COMPLETED',
                })
              "
              >{{ (row as unknown as TrainingCourseStatisticsDto).completed_count }}</el-button
            ></template
          >
          <template #courseRate="{ row }">{{
            formatRate(
              (row as unknown as TrainingCourseStatisticsDto).completion_rate,
              (row as unknown as TrainingCourseStatisticsDto).completed_count,
              (row as unknown as TrainingCourseStatisticsDto).required_count,
            )
          }}</template></DataTable
        >
        <AppPagination
          :page="currentPage"
          :page-size="currentPageSize"
          :total="courseReport?.total ?? 0"
          @update:page="runQuery($event, currentPageSize)"
          @update:page-size="runQuery(1, $event)"
        />
      </section>

      <section
        v-else-if="activeTab === 'exam' && currentState !== 'retryable-error'"
        v-loading="currentState === 'loading'"
        class="training-surface"
      >
        <div class="training-section-heading">
          <div>
            <h2>考试结果统计</h2>
            <p>考试提交、分数与通过率只取真实考试事实，不随管理员完成改写</p>
          </div>
          <span class="training-operations-page__summary"
            >统计时点：{{
              examReport?.scope?.as_of ? formatTime(examReport.scope.as_of) : '—'
            }}</span
          >
        </div>
        <el-empty v-if="currentState === 'empty'" description="当前范围暂无考试统计" />
        <template v-else>
          <section class="training-kpi-grid" aria-label="考试结果统计汇总">
            <article class="training-kpi-card">
              <div class="training-kpi-card__header">参与人次</div>
              <div class="training-kpi-card__value">
                <strong>{{ examSummary?.participant_count ?? 0 }}</strong
                ><span>员工任务人次</span>
              </div>
            </article>
            <article class="training-kpi-card">
              <div class="training-kpi-card__header">已提交考试</div>
              <div class="training-kpi-card__value">
                <strong>{{ examSummary?.submitted_count ?? 0 }}</strong
                ><span
                  >考试次数通过率
                  {{
                    examSummary?.attempt_pass_rate == null
                      ? '暂无口径'
                      : `${examSummary.attempt_pass_rate.toFixed(1)}%`
                  }}</span
                >
              </div>
            </article>
            <article class="training-kpi-card">
              <div class="training-kpi-card__header">首次通过</div>
              <div class="training-kpi-card__value">
                <strong>{{ examSummary?.first_passed_count ?? 0 }}</strong
                ><span
                  >{{ examSummary?.first_exam_count ?? 0 }} 次首次考试 ·
                  {{
                    examSummary?.first_pass_rate == null
                      ? '暂无口径'
                      : `${examSummary.first_pass_rate.toFixed(1)}%`
                  }}</span
                >
              </div>
            </article>
            <article class="training-kpi-card">
              <div class="training-kpi-card__header">最终通过</div>
              <div class="training-kpi-card__value">
                <strong>{{ examSummary?.final_passed_count ?? 0 }}</strong
                ><span
                  >{{ examSummary?.final_exam_count ?? 0 }} 人次最终结果 ·
                  {{
                    examSummary?.final_pass_rate == null
                      ? '暂无口径'
                      : `${examSummary.final_pass_rate.toFixed(1)}%`
                  }}</span
                >
              </div>
            </article>
            <article class="training-kpi-card">
              <div class="training-kpi-card__header">提交均分</div>
              <div class="training-kpi-card__value">
                <strong>{{ examSummary?.submitted_average_score?.toFixed(1) ?? '—' }}</strong
                ><span>全部已提交考试</span>
              </div>
            </article>
            <article class="training-kpi-card">
              <div class="training-kpi-card__header">最终均分</div>
              <div class="training-kpi-card__value">
                <strong>{{ examSummary?.final_average_score?.toFixed(1) ?? '—' }}</strong
                ><span>最终结果</span>
              </div>
            </article>
            <article class="training-kpi-card">
              <div class="training-kpi-card__header">人工提交</div>
              <div class="training-kpi-card__value">
                <strong>{{ examSummary?.manual_submit_count ?? 0 }}</strong
                ><span>考试次数</span>
              </div>
            </article>
            <article class="training-kpi-card">
              <div class="training-kpi-card__header">超时提交</div>
              <div class="training-kpi-card__value">
                <strong>{{ examSummary?.timeout_submit_count ?? 0 }}</strong
                ><span>考试次数</span>
              </div>
            </article>
          </section>
          <DataTable
            :data="examRows as unknown as Record<string, unknown>[]"
            :columns="examColumns"
            height="420px"
          >
            <template #examPlanScope="{ row }">{{
              planScopeLabel(
                (row as unknown as TrainingExamStatisticsRowDto).plan_type,
                (row as unknown as TrainingExamStatisticsRowDto).plan_year,
              )
            }}</template>
            <template #examTask="{ row }"
              ><button
                v-if="canViewTaskDetail"
                class="training-operations-link"
                type="button"
                @click="
                  openTask({
                    trainingId: (row as unknown as TrainingExamStatisticsRowDto).training_id,
                    taskId: (row as unknown as TrainingExamStatisticsRowDto).training_task_id,
                  })
                "
              >
                {{ (row as unknown as TrainingExamStatisticsRowDto).task_name }}</button
              ><span v-else>{{
                (row as unknown as TrainingExamStatisticsRowDto).task_name
              }}</span></template
            >
            <template #examNotSubmitted="{ row }"
              ><el-button
                link
                type="primary"
                @click="
                  openPersonnel({
                    title: '未提交考试人员',
                    description: (row as unknown as TrainingExamStatisticsRowDto).exam_name,
                    trainingTaskId: (row as unknown as TrainingExamStatisticsRowDto)
                      .training_task_id,
                    examId: (row as unknown as TrainingExamStatisticsRowDto).exam_id,
                    examStatus: 'NOT_SUBMITTED',
                  })
                "
                >{{
                  Math.max(
                    0,
                    (row as unknown as TrainingExamStatisticsRowDto).participant_count -
                      (row as unknown as TrainingExamStatisticsRowDto).submitted_count,
                  )
                }}</el-button
              ></template
            >
            <template #examSubmitted="{ row }"
              ><el-button
                link
                type="primary"
                @click="
                  openPersonnel({
                    title: '已提交考试人员',
                    description: (row as unknown as TrainingExamStatisticsRowDto).exam_name,
                    trainingTaskId: (row as unknown as TrainingExamStatisticsRowDto)
                      .training_task_id,
                    examId: (row as unknown as TrainingExamStatisticsRowDto).exam_id,
                    examStatus: 'SUBMITTED',
                  })
                "
                >{{ (row as unknown as TrainingExamStatisticsRowDto).submitted_count }}</el-button
              ></template
            >
            <template #examPassed="{ row }"
              ><el-button
                link
                type="primary"
                @click="
                  openPersonnel({
                    title: '最终通过人员',
                    description: (row as unknown as TrainingExamStatisticsRowDto).exam_name,
                    trainingTaskId: (row as unknown as TrainingExamStatisticsRowDto)
                      .training_task_id,
                    examId: (row as unknown as TrainingExamStatisticsRowDto).exam_id,
                    examStatus: 'PASSED',
                  })
                "
                >{{
                  (row as unknown as TrainingExamStatisticsRowDto).final_passed_count
                }}</el-button
              ></template
            >
            <template #examFailed="{ row }"
              ><el-button
                link
                type="primary"
                @click="
                  openPersonnel({
                    title: '最终未通过人员',
                    description: (row as unknown as TrainingExamStatisticsRowDto).exam_name,
                    trainingTaskId: (row as unknown as TrainingExamStatisticsRowDto)
                      .training_task_id,
                    examId: (row as unknown as TrainingExamStatisticsRowDto).exam_id,
                    examStatus: 'FAILED',
                  })
                "
                >{{
                  Math.max(
                    0,
                    (row as unknown as TrainingExamStatisticsRowDto).final_exam_count -
                      (row as unknown as TrainingExamStatisticsRowDto).final_passed_count,
                  )
                }}</el-button
              ></template
            >
            <template #examRate="{ row }">{{
              (row as unknown as TrainingExamStatisticsRowDto).final_pass_rate == null
                ? '暂无口径'
                : `${(row as unknown as TrainingExamStatisticsRowDto).final_pass_rate!.toFixed(1)}%`
            }}</template>
          </DataTable>
          <AppPagination
            :page="currentPage"
            :page-size="currentPageSize"
            :total="examReport?.total ?? 0"
            @update:page="runQuery($event, currentPageSize)"
            @update:page-size="runQuery(1, $event)"
          />
        </template>
      </section>

      <section v-else-if="currentState !== 'retryable-error'" class="training-surface">
        <div class="training-section-heading">
          <div>
            <h2>培训逾期统计</h2>
            <p>当前逾期与曾逾期分列，完成后仍保留历史逾期事实</p>
          </div>
          <div class="training-detail-tags">
            <StatusTag
              :label="`当前逾期 ${overdueReport?.current_overdue_count ?? 0}`"
              tone="danger"
            /><StatusTag
              :label="`曾逾期 ${overdueReport?.ever_overdue_count ?? 0}`"
              tone="warning"
            /><StatusTag
              :label="`完成后消除当前逾期 ${overdueReport?.completed_after_overdue_count ?? 0}`"
              tone="info"
            /><StatusTag
              :label="`仍未完成 ${overdueReport?.still_incomplete_count ?? 0}`"
              tone="danger"
            />
          </div>
        </div>
        <div class="training-dashboard-grid">
          <section class="training-surface">
            <div class="training-section-heading">
              <div>
                <h3>首次逾期趋势</h3>
                <p>按首次逾期时间分桶</p>
              </div>
            </div>
            <div class="training-detail-tags">
              <StatusTag
                v-for="item in overdueReport?.first_overdue_distribution ?? []"
                :key="item.period_start"
                :label="`${dayjs(item.period_start).format('YYYY-MM-DD')} · ${item.count}`"
                tone="warning"
              />
              <span
                v-if="!overdueReport?.first_overdue_distribution.length"
                class="training-operations-page__muted"
                >暂无分布数据</span
              >
            </div>
          </section>
          <section class="training-surface">
            <div class="training-section-heading">
              <div>
                <h3>逾期持续时长</h3>
                <p>按统一完成口径或统计时点计算</p>
              </div>
            </div>
            <div class="training-detail-tags">
              <StatusTag
                v-for="item in overdueReport?.duration_distribution ?? []"
                :key="item.bucket"
                :label="`${durationLabel(item.bucket)} · ${item.count}`"
                tone="danger"
              />
              <span
                v-if="!overdueReport?.duration_distribution.length"
                class="training-operations-page__muted"
                >暂无分布数据</span
              >
            </div>
          </section>
        </div>
        <DataTable
          :data="overdueRows as unknown as Record<string, unknown>[]"
          :columns="overdueColumns"
          :loading="currentState === 'loading'"
          height="420px"
          ><template #overduePlanScope="{ row }">{{
            planScopeLabel(
              (row as unknown as TrainingEmployeeTaskRecordDto).plan_type,
              (row as unknown as TrainingEmployeeTaskRecordDto).plan_year,
            )
          }}</template
          ><template #employee="{ row }">{{
            (row as unknown as TrainingEmployeeTaskRecordDto).profile.display_name ||
            (row as unknown as TrainingEmployeeTaskRecordDto).profile.real_name ||
            (row as unknown as TrainingEmployeeTaskRecordDto).profile.user_name
          }}</template
          ><template #employeeStatus="{ row }"
            ><StatusTag
              :label="
                employeeStatusLabel(
                  employeeStatus((row as unknown as TrainingEmployeeTaskRecordDto).status),
                )
              "
              :tone="
                employeeStatusTone(
                  employeeStatus((row as unknown as TrainingEmployeeTaskRecordDto).status),
                )
              " /></template
          ><template #wasOverdue="{ row }"
            ><StatusTag
              :label="
                overdueFlagForRow(row as unknown as TrainingEmployeeTaskRecordDto) ? '是' : '否'
              "
              :tone="
                overdueFlagForRow(row as unknown as TrainingEmployeeTaskRecordDto)
                  ? 'warning'
                  : 'info'
              " /></template
          ><template #overdueAt="{ row }">{{
            overdueFlagForRow(row as unknown as TrainingEmployeeTaskRecordDto)
              ? formatTime((row as unknown as TrainingEmployeeTaskRecordDto).overdue_at)
              : '—'
          }}</template
          ><template #completedAt="{ row }">{{
            formatTime((row as unknown as TrainingEmployeeTaskRecordDto).completed_at)
          }}</template
          ><template #deadlineAt="{ row }">{{
            formatDeadline((row as unknown as TrainingEmployeeTaskRecordDto).deadline_at)
          }}</template></DataTable
        >
        <AppPagination
          :page="currentPage"
          :page-size="currentPageSize"
          :total="overdueReport?.total ?? 0"
          @update:page="runQuery($event, currentPageSize)"
          @update:page-size="runQuery(1, $event)"
        />
      </section>

      <DetailDrawer
        v-model="drilldownVisible"
        :title="drilldownContext?.title ?? '人员明细'"
        size="860px"
      >
        <p class="training-operations-page__muted">{{ drilldownContext?.description }}</p>
        <el-alert
          v-if="drilldownState === 'retryable-error'"
          title="人员明细加载失败"
          type="error"
          :closable="false"
          show-icon
        >
          <template #default
            ><el-button
              link
              type="primary"
              @click="changeDrilldownPage(drilldownPage, drilldownPageSize)"
              >重新加载</el-button
            ></template
          >
        </el-alert>
        <el-table v-else v-loading="drilldownState === 'loading'" :data="drilldownEmployees" stripe>
          <el-table-column prop="employeeCode" label="员工编号" width="130" />
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="organization" label="组织" min-width="160" />
          <el-table-column prop="position" label="岗位" min-width="140" />
          <el-table-column label="培训状态" width="110"
            ><template #default="scope"
              ><StatusTag
                :label="employeeStatusLabel(scope.row.status)"
                :tone="employeeStatusTone(scope.row.status)" /></template
          ></el-table-column>
          <el-table-column prop="learnedCourseCount" label="已学 / 总课程" width="120"
            ><template #default="scope"
              >{{ scope.row.learnedCourseCount }} / {{ scope.row.courseCount }}</template
            ></el-table-column
          >
        </el-table>
        <AppPagination
          :page="drilldownPage"
          :page-size="drilldownPageSize"
          :total="drilldownTotal"
          @update:page="changeDrilldownPage($event, drilldownPageSize)"
          @update:page-size="changeDrilldownPage(1, $event)"
        />
      </DetailDrawer>

      <FormDialog
        v-model="exportVisible"
        title="导出专项统计"
        confirm-button-text="开始生成"
        :submitting="exporting"
        @confirm="emit('export', activeTab)"
        ><div class="training-detail-layout">
          <div class="training-export-note">
            <span>导出类型</span
            ><strong>{{
              {
                task: '任务完成统计',
                course: '课程学习统计',
                exam: '考试审计材料',
                overdue: '培训逾期统计',
              }[activeTab]
            }}</strong>
          </div>
          <p>沿用当前页签筛选范围，不扩大到未授权数据。</p>
          <p v-if="activeTab === 'exam'" class="training-operations-page__muted">
            考试材料包含敏感答题信息，仅具有审计导出权限时可用。
          </p>
        </div></FormDialog
      >
    </DashboardPageTemplate>
  </AppPage>
</template>

<style scoped lang="scss">
@use '../styles/training-operations.scss';
</style>
