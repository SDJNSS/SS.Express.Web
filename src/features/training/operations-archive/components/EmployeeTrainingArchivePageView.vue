<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, reactive, ref, watch } from 'vue'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import DetailDrawer from '@shared/components/DetailDrawer.vue'
import FormDialog from '@shared/components/FormDialog.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import type {
  TrainingCourseResultsDto,
  TrainingEmployeeArchiveDetailDto,
  TrainingEmployeeArchiveDto,
  TrainingEmployeeTaskRecordDto,
  TrainingExamAttemptDto,
  TrainingExamHistoryDto,
  TrainingExamSnapshotDto,
  TrainingPagedReportDto,
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
  TaskEmployeeRecord,
  TrainingOperationsPreviewState,
  TrainingPlanRecord,
  TrainingTaskRecord,
  TrainingTaskType,
} from '../types/trainingOperations'

type ArchiveSection = 'list' | 'detail' | 'tasks' | 'courses' | 'exams' | 'snapshot'
type ArchiveStates = Partial<Record<ArchiveSection, TrainingOperationsPreviewState>>

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
  executionNo: string
  assignmentType: string
  completionSource: string
  assignedAtPeriod: string[]
  pageIndex: number
  pageSize: number
}

interface ArchiveRow {
  employeeId: number
  employeeCode: string
  name: string
  organization: string
  position: string
  planCount: number
  taskCount: number
  requiredCount: number
  completedCount: number
  overdueCount: number
  finalExamCount: number
  finalPassedCount: number
  learningMinutes: number
  completionRate: number
  hasRequiredEmployees: boolean
  latestTrainingAt: string
}

interface LookupOption {
  id: number
  label: string
}

const props = withDefaults(
  defineProps<{
    archives: EmployeeArchiveRecord[]
    plans: TrainingPlanRecord[]
    tasks: TrainingTaskRecord[]
    employees: TaskEmployeeRecord[]
    state: TrainingOperationsPreviewState
    archiveReport?: TrainingPagedReportDto<TrainingEmployeeArchiveDto> | undefined
    detail?: TrainingEmployeeArchiveDetailDto | undefined
    taskReport?: TrainingPagedReportDto<TrainingEmployeeTaskRecordDto> | undefined
    courseResults?: TrainingCourseResultsDto | undefined
    examHistory?: TrainingExamHistoryDto | undefined
    examSnapshot?: TrainingExamSnapshotDto | undefined
    sectionStates?: ArchiveStates
    page?: number
    pageSize?: number
    detailTaskPage?: number
    detailTaskPageSize?: number
    canExport?: boolean
    canExportExamMaterials?: boolean
    canViewExamSnapshot?: boolean
    exporting?: boolean
    exportVersion?: number
    organizationOptions?: LookupOption[]
    positionOptions?: LookupOption[]
  }>(),
  {
    archiveReport: undefined,
    detail: undefined,
    taskReport: undefined,
    courseResults: undefined,
    examHistory: undefined,
    examSnapshot: undefined,
    sectionStates: () => ({}),
    page: 1,
    pageSize: 10,
    detailTaskPage: 1,
    detailTaskPageSize: 10,
    canExport: true,
    canExportExamMaterials: false,
    canViewExamSnapshot: false,
    exporting: false,
    exportVersion: 0,
    organizationOptions: () => [],
    positionOptions: () => [],
  },
)

const emit = defineEmits<{
  action: [message: string]
  query: [value: ArchiveQuery]
  retry: [section?: ArchiveSection]
  openDetail: [employeeId: number]
  queryDetailTasks: [value: { employeeId: number; pageIndex: number; pageSize: number }]
  openTaskDetails: [trainingTaskEmployeeId: number]
  openExamSnapshot: [employeeExamId: number]
  export: [value: { includeSensitive: boolean }]
}>()

const query = reactive({
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
  period: [] as string[],
  executionNo: '',
  assignmentType: '',
  completionSource: '',
  assignedAtPeriod: [] as string[],
})
const selected = ref<ArchiveRow>()
const selectedTaskEmployeeId = ref<number>()
const detailVisible = ref(false)
const detailTab = ref('overview')
const answerVisible = ref(false)
const exportVisible = ref(false)
const includeSensitive = ref(false)

watch(
  () => props.exportVersion,
  () => {
    exportVisible.value = false
  },
)

function sectionState(section: ArchiveSection) {
  return props.sectionStates[section] ?? (section === 'list' ? props.state : 'empty')
}
function normalizeTaskType(type: string): TrainingTaskType {
  return type === 'QUARTERLY' || type === 'TEMPORARY' ? type : 'MONTHLY'
}
function normalizeEmployeeStatus(status: string): TaskEmployeeRecord['status'] {
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

const rows = computed<ArchiveRow[]>(() => {
  if (props.archiveReport) {
    return props.archiveReport.items.map((item) => ({
      employeeId: item.employee_id,
      employeeCode: item.profile.user_name || String(item.employee_id),
      name: item.profile.display_name || item.profile.real_name || item.profile.user_name,
      organization: item.profile.organization_names || '当前无有效组织',
      position: item.profile.position_names || '当前无有效岗位',
      planCount: item.plan_count,
      taskCount: item.employee_task_count,
      requiredCount: item.required_count,
      completedCount: item.completed_count,
      overdueCount: item.ever_overdue_count,
      finalExamCount: item.final_exam_count,
      finalPassedCount: item.final_passed_count,
      learningMinutes: Math.floor(item.effective_learning_seconds / 60),
      completionRate: item.completion_rate,
      hasRequiredEmployees: item.has_required_employees,
      latestTrainingAt: item.latest_training_at
        ? dayjs(item.latest_training_at).format('YYYY-MM-DD HH:mm')
        : '—',
    }))
  }
  return props.archives.map((item) => ({
    employeeId: item.id,
    employeeCode: item.employeeCode,
    name: item.name,
    organization: item.organization,
    position: item.position,
    planCount: 0,
    taskCount: item.taskCount,
    requiredCount: item.taskCount,
    completedCount: item.completedCount,
    overdueCount: item.overdueCount,
    finalExamCount: item.completedCount,
    finalPassedCount: item.finalPassedCount,
    learningMinutes: item.learningMinutes,
    completionRate: item.taskCount ? (item.completedCount / item.taskCount) * 100 : 100,
    hasRequiredEmployees: item.taskCount > 0,
    latestTrainingAt: item.latestTrainingAt || '—',
  }))
})

const columns: DataTableColumn[] = [
  { prop: 'employeeCode', label: '员工编号', width: 132, fixed: 'left' },
  { label: '当前姓名', width: 118, slot: 'name' },
  { prop: 'organization', label: '当前组织', minWidth: 160 },
  { prop: 'position', label: '当前岗位', minWidth: 140 },
  { prop: 'planCount', label: '计划数', width: 82, align: 'right' },
  { label: '任务完成', width: 154, slot: 'tasks' },
  { prop: 'overdueCount', label: '曾逾期', width: 86, align: 'right' },
  { label: '最终通过', width: 154, slot: 'passed' },
  { prop: 'learningMinutes', label: '有效学习（分钟）', width: 140, align: 'right' },
  { prop: 'latestTrainingAt', label: '最近培训', minWidth: 160 },
  { label: '操作', width: 128, fixed: 'right', slot: 'actions' },
]

const detailTasks = computed(() => props.taskReport ?? props.detail?.tasks)
const fallbackTasks = computed(() =>
  props.tasks.map((task) => ({
    id: task.id,
    training_task_id: task.id,
    task_name: task.name,
    plan_name: task.planName,
    plan_type: props.plans.find((plan) => plan.id === task.trainingId)?.planType ?? 'ANNUAL',
    plan_year: props.plans.find((plan) => plan.id === task.trainingId)?.year,
    task_type: task.taskType,
    period_key: task.period,
    task_status: task.status,
    status: task.status,
    start_at: task.startAt,
    deadline_at: task.endAt,
    execution_no: 1,
    assignment_type: 'PLAN',
    assigned_at: task.startAt,
    learned_course_count: 0,
    course_count: task.courseCount,
    final_score: undefined,
    final_passed: undefined,
    completed_at: undefined,
    completion_source: undefined,
    admin_completed_by: undefined,
    admin_completed_at: undefined,
    admin_completion_reason: undefined,
  })),
)
const taskRows = computed(() => detailTasks.value?.items ?? fallbackTasks.value)

const selectedTask = computed(() =>
  taskRows.value.find((item) => item.id === selectedTaskEmployeeId.value),
)

function runQuery(pageIndex = 1, pageSize = props.pageSize) {
  emit('query', { ...query, period: [...query.period], pageIndex, pageSize })
}
function reset() {
  Object.assign(query, {
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
    executionNo: '',
    assignmentType: '',
    completionSource: '',
    assignedAtPeriod: [],
  })
  runQuery(1, props.pageSize)
}
function openDetail(record: ArchiveRow) {
  selected.value = record
  selectedTaskEmployeeId.value = undefined
  detailTab.value = 'overview'
  detailVisible.value = true
  emit('openDetail', record.employeeId)
}
function openTask(item: { id: number }) {
  selectedTaskEmployeeId.value = item.id
  detailTab.value = 'courses'
  emit('openTaskDetails', item.id)
}
function openSnapshot(attempt: TrainingExamAttemptDto) {
  answerVisible.value = true
  emit('openExamSnapshot', attempt.id)
}
function taskEmployeeStatus(status: string) {
  return normalizeEmployeeStatus(status)
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
function assignmentTypeLabel(value?: string) {
  return (
    (
      {
        PLAN: '计划分配',
        ONBOARDING: '入职自动纳入',
        RETURN_TO_WORK: '返岗安排',
        MANUAL: '人工分配',
      } as Record<string, string>
    )[value?.toUpperCase() ?? ''] ?? '—'
  )
}
function completionSourceLabel(value?: string) {
  return value?.toUpperCase() === 'ADMIN'
    ? '管理员完成'
    : value?.toUpperCase() === 'NORMAL'
      ? '正常完成'
      : '未完成'
}
function taskStatusForRecord(item: {
  task_status: string
  deadline_at?: string
}): TrainingTaskRecord['status'] {
  return (
    !item.deadline_at && item.task_status?.toUpperCase() === 'OVERDUE' ? 'ACTIVE' : item.task_status
  ) as TrainingTaskRecord['status']
}
function employeeStatusForRecord(item: {
  status: string
  deadline_at?: string
}): TaskEmployeeRecord['status'] {
  return (
    !item.deadline_at && item.status?.toUpperCase() === 'OVERDUE' ? 'LEARNING' : item.status
  ) as TaskEmployeeRecord['status']
}
</script>

<template>
  <AppPage class="training-operations-page">
    <ListPageTemplate>
      <template #header
        ><PageHeader title="员工培训档案" description="按员工汇总任务、课程学习、考试历史与逾期结果"
          ><template #actions
            ><el-button v-if="canExport" @click="exportVisible = true"
              >导出档案</el-button
            ></template
          ></PageHeader
        ></template
      >
      <template #search>
        <SearchPanel
          collapsible
          :loading="sectionState('list') === 'loading'"
          @search="runQuery()"
          @reset="reset"
        >
          <el-form-item label="员工"
            ><el-input v-model="query.keyword" clearable placeholder="员工编号 / 当前姓名"
          /></el-form-item>
          <el-form-item label="年度"
            ><el-input v-model="query.year" clearable inputmode="numeric" placeholder="全部年度"
          /></el-form-item>
          <el-form-item label="培训计划"
            ><el-select v-model="query.planId" clearable placeholder="全部计划"
              ><el-option
                v-for="plan in plans"
                :key="plan.id"
                :label="plan.name"
                :value="String(plan.id)" /></el-select
          ></el-form-item>
          <el-form-item label="任务类型"
            ><el-select v-model="query.taskType" clearable placeholder="全部类型"
              ><el-option label="月度" value="MONTHLY" /><el-option
                label="季度"
                value="QUARTERLY" /><el-option label="临时" value="TEMPORARY" /></el-select
          ></el-form-item>
          <template #advanced>
            <el-form-item label="统计时间"
              ><el-date-picker
                v-model="query.period"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
            /></el-form-item>
            <el-form-item label="任务状态"
              ><el-select v-model="query.taskStatus" clearable placeholder="全部状态"
                ><el-option label="未开始" value="NOT_STARTED" /><el-option
                  label="进行中"
                  value="ACTIVE" /><el-option label="已逾期" value="OVERDUE" /><el-option
                  label="已完成"
                  value="COMPLETED" /></el-select
            ></el-form-item>
            <el-form-item label="培训状态"
              ><el-select v-model="query.employeeStatus" clearable placeholder="全部状态"
                ><el-option label="未开始" value="NOT_STARTED" /><el-option
                  label="学习中"
                  value="LEARNING" /><el-option label="待考试" value="READY_FOR_EXAM" /><el-option
                  label="考试未通过"
                  value="EXAM_FAILED" /><el-option label="已完成" value="COMPLETED" /><el-option
                  label="已逾期"
                  value="OVERDUE" /></el-select
            ></el-form-item>
            <el-form-item label="曾逾期"
              ><el-select v-model="query.overdue" clearable placeholder="全部"
                ><el-option label="是" value="true" /><el-option
                  label="否"
                  value="false" /></el-select
            ></el-form-item>
            <el-form-item label="当前组织">
              <el-select v-model="query.organizationId" clearable filterable placeholder="全部组织">
                <el-option
                  v-for="option in organizationOptions"
                  :key="option.id"
                  :label="option.label"
                  :value="String(option.id)"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="当前岗位">
              <el-select v-model="query.positionId" clearable filterable placeholder="全部岗位">
                <el-option
                  v-for="option in positionOptions"
                  :key="option.id"
                  :label="option.label"
                  :value="String(option.id)"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="最终考试">
              <el-select v-model="query.finalPassed" clearable placeholder="全部结果">
                <el-option label="通过" value="true" />
                <el-option label="未通过" value="false" />
              </el-select>
            </el-form-item>
            <el-form-item label="执行轮次">
              <el-input
                v-model="query.executionNo"
                clearable
                inputmode="numeric"
                placeholder="输入轮次"
              />
            </el-form-item>
            <el-form-item label="分配来源">
              <el-select v-model="query.assignmentType" clearable placeholder="全部来源">
                <el-option label="计划分配" value="PLAN" />
                <el-option label="入职自动纳入" value="ONBOARDING" />
                <el-option label="返岗安排" value="RETURN_TO_WORK" />
                <el-option label="人工分配" value="MANUAL" />
              </el-select>
            </el-form-item>
            <el-form-item label="完成来源">
              <el-select v-model="query.completionSource" clearable placeholder="全部来源">
                <el-option label="正常完成" value="NORMAL" />
                <el-option label="管理员完成" value="ADMIN" />
              </el-select>
            </el-form-item>
            <el-form-item label="参加时间">
              <el-date-picker
                v-model="query.assignedAtPeriod"
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
      <template #toolbar
        ><TableToolbar
          title="员工档案列表"
          :total="archiveReport?.total ?? rows.length"
          :refreshing="sectionState('list') === 'loading'"
          @refresh="emit('retry', 'list')"
          ><template #summary
            ><span class="training-operations-page__summary"
              >姓名、组织、岗位均为当前员工目录信息</span
            ></template
          ></TableToolbar
        ></template
      >
      <el-alert
        v-if="sectionState('list') === 'retryable-error'"
        class="training-operations-page__alert"
        title="员工培训档案加载失败，筛选条件已保留"
        type="error"
        :closable="false"
        show-icon
        ><template #default
          ><el-button link type="primary" @click="emit('retry', 'list')"
            >重新加载</el-button
          ></template
        ></el-alert
      >
      <DataTable
        v-else
        :data="rows as unknown as Record<string, unknown>[]"
        :columns="columns"
        :loading="sectionState('list') === 'loading'"
        @row-click="openDetail($event as unknown as ArchiveRow)"
      >
        <template #name="{ row }"
          ><button
            class="training-operations-link"
            type="button"
            @click.stop="openDetail(row as unknown as ArchiveRow)"
          >
            {{ (row as unknown as ArchiveRow).name }}
          </button></template
        >
        <template #tasks="{ row }"
          ><span v-if="(row as unknown as ArchiveRow).hasRequiredEmployees"
            >{{ (row as unknown as ArchiveRow).completedCount }} /
            {{ (row as unknown as ArchiveRow).requiredCount }} ·
            {{
              percentage(
                (row as unknown as ArchiveRow).completedCount,
                (row as unknown as ArchiveRow).requiredCount,
              )
            }}</span
          ><span v-else
            >0 / 0 · 100%<small class="training-zero-note">当前无人需要培训</small></span
          ></template
        >
        <template #passed="{ row }"
          >{{ (row as unknown as ArchiveRow).finalPassedCount }} /
          {{ (row as unknown as ArchiveRow).finalExamCount }} ·
          {{
            percentage(
              (row as unknown as ArchiveRow).finalPassedCount,
              (row as unknown as ArchiveRow).finalExamCount,
            )
          }}</template
        >
        <template #actions="{ row }"
          ><RowActionGrid :aria-label="`${(row as unknown as ArchiveRow).name} 的操作`"
            ><el-button link type="primary" @click.stop="openDetail(row as unknown as ArchiveRow)"
              >查看档案</el-button
            ></RowActionGrid
          ></template
        >
      </DataTable>
      <template #pagination
        ><AppPagination
          :page="page"
          :page-size="pageSize"
          :total="archiveReport?.total ?? rows.length"
          @update:page="runQuery($event, pageSize)"
          @update:page-size="runQuery(1, $event)"
      /></template>
    </ListPageTemplate>

    <DetailDrawer
      v-model="detailVisible"
      :title="`${selected?.name ?? '员工'} · 培训档案`"
      :size="1120"
    >
      <div class="training-detail-layout">
        <section v-if="selected" class="training-detail-hero">
          <div>
            <h3>{{ selected.name }}</h3>
            <p>
              {{ selected.employeeCode }} · {{ selected.organization }} · {{ selected.position }}
            </p>
          </div>
          <div class="training-detail-tags">
            <StatusTag
              :label="`${selected.completedCount} / ${selected.requiredCount} 任务完成`"
              tone="success"
            /><StatusTag
              :label="`${selected.overdueCount} 次曾逾期`"
              :tone="selected.overdueCount ? 'warning' : 'info'"
            />
          </div>
        </section>
        <el-alert
          v-if="sectionState('detail') === 'retryable-error'"
          title="员工档案详情加载失败"
          type="error"
          :closable="false"
          show-icon
          ><template #default
            ><el-button link type="primary" @click="emit('retry', 'detail')"
              >重新加载</el-button
            ></template
          ></el-alert
        >
        <div v-loading="sectionState('detail') === 'loading'">
          <el-tabs v-model="detailTab">
            <el-tab-pane label="档案概览" name="overview">
              <section v-if="selected" class="training-kpi-grid">
                <article class="training-kpi-card">
                  <div class="training-kpi-card__header">培训计划</div>
                  <div class="training-kpi-card__value">
                    <strong>{{ detail?.employee.plan_count ?? selected.planCount }}</strong
                    ><span>累计计划</span>
                  </div>
                </article>
                <article class="training-kpi-card">
                  <div class="training-kpi-card__header">任务完成</div>
                  <div class="training-kpi-card__value">
                    <strong>{{ selected.completedCount }}</strong
                    ><span>/ {{ selected.requiredCount }}</span>
                  </div>
                </article>
                <article class="training-kpi-card">
                  <div class="training-kpi-card__header">有效学习</div>
                  <div class="training-kpi-card__value">
                    <strong>{{ selected.learningMinutes }}</strong
                    ><span>分钟</span>
                  </div>
                </article>
                <article class="training-kpi-card">
                  <div class="training-kpi-card__header">最终通过</div>
                  <div class="training-kpi-card__value">
                    <strong>{{ selected.finalPassedCount }}</strong
                    ><span>/ {{ selected.finalExamCount }}</span>
                  </div>
                </article>
              </section>
              <el-table v-if="detail?.plans.length" :data="detail.plans" stripe
                ><el-table-column label="计划类型 / 年度" width="130"
                  ><template #default="scope">{{
                    planScopeLabel(scope.row.plan_type, scope.row.plan_year)
                  }}</template></el-table-column
                ><el-table-column
                  prop="plan_name"
                  label="培训计划"
                  min-width="220"
                /><el-table-column
                  prop="period_count"
                  label="成员关系阶段"
                  width="120"
                /><el-table-column label="首次加入" min-width="160"
                  ><template #default="scope">{{
                    formatTime(scope.row.first_joined_at)
                  }}</template></el-table-column
                ><el-table-column label="最近退出" min-width="160"
                  ><template #default="scope">{{
                    formatTime(scope.row.last_exited_at)
                  }}</template></el-table-column
                ></el-table
              >
            </el-tab-pane>
            <el-tab-pane label="任务记录" name="tasks">
              <el-alert
                v-if="sectionState('tasks') === 'retryable-error'"
                title="任务记录加载失败"
                type="error"
                :closable="false"
                show-icon
                ><template #default
                  ><el-button link type="primary" @click="emit('retry', 'tasks')"
                    >重新加载</el-button
                  ></template
                ></el-alert
              >
              <el-table
                v-else
                v-loading="sectionState('tasks') === 'loading'"
                :data="taskRows"
                stripe
                height="380"
                @row-click="openTask"
                ><el-table-column prop="plan_name" label="计划" min-width="180" /><el-table-column
                  label="计划类型 / 年度"
                  width="130"
                  ><template #default="scope">{{
                    planScopeLabel(scope.row.plan_type, scope.row.plan_year)
                  }}</template></el-table-column
                ><el-table-column label="任务" min-width="220"
                  ><template #default="scope"
                    ><button
                      type="button"
                      class="training-operations-link"
                      @click.stop="openTask(scope.row)"
                    >
                      {{ scope.row.task_name }}
                    </button></template
                  ></el-table-column
                ><el-table-column prop="execution_no" label="执行轮次" width="92"
                  ><template #default="scope">{{
                    scope.row.execution_no == null ? '—' : `第 ${scope.row.execution_no} 轮`
                  }}</template></el-table-column
                ><el-table-column label="分配来源" width="126"
                  ><template #default="scope">{{
                    assignmentTypeLabel(scope.row.assignment_type)
                  }}</template></el-table-column
                ><el-table-column label="参加时间" min-width="160"
                  ><template #default="scope">{{
                    formatTime(scope.row.assigned_at)
                  }}</template></el-table-column
                ><el-table-column label="类型" width="90"
                  ><template #default="scope">{{
                    { MONTHLY: '月度', QUARTERLY: '季度', TEMPORARY: '临时' }[
                      normalizeTaskType(scope.row.task_type)
                    ]
                  }}</template></el-table-column
                ><el-table-column prop="period_key" label="周期" width="110" /><el-table-column
                  label="任务状态"
                  width="100"
                  ><template #default="scope"
                    ><StatusTag
                      :label="taskStatusLabel(taskStatusForRecord(scope.row))"
                      :tone="
                        taskStatusTone(taskStatusForRecord(scope.row))
                      " /></template></el-table-column
                ><el-table-column label="培训状态" width="110"
                  ><template #default="scope"
                    ><StatusTag
                      :label="
                        employeeStatusLabel(taskEmployeeStatus(employeeStatusForRecord(scope.row)))
                      "
                      :tone="
                        employeeStatusTone(taskEmployeeStatus(employeeStatusForRecord(scope.row)))
                      " /></template></el-table-column
                ><el-table-column label="课程完成" width="110"
                  ><template #default="scope"
                    >{{ scope.row.learned_course_count }} / {{ scope.row.course_count }}</template
                  ></el-table-column
                ><el-table-column label="完成期限" min-width="160"
                  ><template #default="scope">{{
                    formatDeadline(scope.row.deadline_at)
                  }}</template></el-table-column
                ><el-table-column label="完成来源" width="116"
                  ><template #default="scope"
                    ><StatusTag
                      :label="completionSourceLabel(scope.row.completion_source)"
                      :tone="
                        scope.row.completion_source === 'ADMIN' ? 'warning' : 'info'
                      " /></template></el-table-column
                ><el-table-column prop="final_score" label="最终成绩" width="90" /><el-table-column
                  label="完成时间"
                  min-width="160"
                  ><template #default="scope">{{
                    formatTime(scope.row.completed_at)
                  }}</template></el-table-column
                ><el-table-column label="管理员完成记录" min-width="260"
                  ><template #default="scope"
                    ><template v-if="scope.row.completion_source === 'ADMIN'">
                      {{ scope.row.admin_completed_by || '未记录操作人' }} ·
                      {{ formatTime(scope.row.admin_completed_at) }} ·
                      {{ scope.row.admin_completion_reason || '未记录原因' }}
                    </template>
                    <span v-else>—</span>
                  </template></el-table-column
                ></el-table
              >
              <AppPagination
                v-if="detailTasks"
                :page="detailTaskPage"
                :page-size="detailTaskPageSize"
                :total="detailTasks.total"
                @update:page="
                  selected &&
                  emit('queryDetailTasks', {
                    employeeId: selected.employeeId,
                    pageIndex: $event,
                    pageSize: detailTaskPageSize,
                  })
                "
                @update:page-size="
                  selected &&
                  emit('queryDetailTasks', {
                    employeeId: selected.employeeId,
                    pageIndex: 1,
                    pageSize: $event,
                  })
                "
              />
            </el-tab-pane>
            <el-tab-pane label="课程学习" name="courses">
              <p v-if="selectedTask" class="training-operations-page__summary">
                当前任务：{{ selectedTask.task_name }}
              </p>
              <el-alert
                v-if="sectionState('courses') === 'retryable-error'"
                title="课程学习结果加载失败"
                type="error"
                :closable="false"
                show-icon
                ><template #default
                  ><el-button link type="primary" @click="emit('retry', 'courses')"
                    >重新加载</el-button
                  ></template
                ></el-alert
              >
              <el-table
                v-else
                v-loading="sectionState('courses') === 'loading'"
                :data="courseResults?.courses ?? []"
                stripe
                height="340"
                ><el-table-column prop="sort_order" label="顺序" width="70" /><el-table-column
                  prop="course_name"
                  label="课程名称"
                  min-width="190" /><el-table-column
                  prop="status"
                  label="学习状态"
                  width="100" /><el-table-column
                  prop="learned_position_seconds"
                  label="已学习位置（秒）"
                  width="140" /><el-table-column
                  prop="effective_learning_seconds"
                  label="有效学习（秒）"
                  width="130" /><el-table-column label="首次开始" min-width="160"
                  ><template #default="scope">{{
                    formatTime(scope.row.started_at)
                  }}</template></el-table-column
                ><el-table-column label="最近学习" min-width="160"
                  ><template #default="scope">{{
                    formatTime(scope.row.last_learning_at)
                  }}</template></el-table-column
                ><el-table-column label="完成时间" min-width="160"
                  ><template #default="scope">{{
                    formatTime(scope.row.completed_at)
                  }}</template></el-table-column
                ><el-table-column label="异常" width="80"
                  ><template #default="scope"
                    ><StatusTag
                      :label="scope.row.has_anomaly ? '有' : '无'"
                      :tone="
                        scope.row.has_anomaly ? 'warning' : 'info'
                      " /></template></el-table-column
              ></el-table>
            </el-tab-pane>
            <el-tab-pane label="考试历史" name="exams">
              <p v-if="selectedTask" class="training-operations-page__summary">
                当前任务：{{ selectedTask.task_name }}
              </p>
              <el-alert
                v-if="sectionState('exams') === 'retryable-error'"
                title="考试历史加载失败"
                type="error"
                :closable="false"
                show-icon
                ><template #default
                  ><el-button link type="primary" @click="emit('retry', 'exams')"
                    >重新加载</el-button
                  ></template
                ></el-alert
              >
              <el-table
                v-else
                v-loading="sectionState('exams') === 'loading'"
                :data="examHistory?.exams ?? []"
                stripe
                height="340"
                ><el-table-column prop="attempt_no" label="次数" width="70" /><el-table-column
                  prop="status"
                  label="状态"
                  width="100"
                /><el-table-column label="开始时间" min-width="160"
                  ><template #default="scope">{{
                    formatTime(scope.row.started_at)
                  }}</template></el-table-column
                ><el-table-column label="提交时间" min-width="160"
                  ><template #default="scope">{{
                    formatTime(scope.row.submitted_at)
                  }}</template></el-table-column
                ><el-table-column prop="submit_type" label="提交方式" width="110" /><el-table-column
                  prop="score"
                  label="成绩"
                  width="80"
                /><el-table-column label="结果" width="90"
                  ><template #default="scope"
                    ><StatusTag
                      :label="
                        scope.row.passed == null ? '未形成' : scope.row.passed ? '通过' : '未通过'
                      "
                      :tone="
                        scope.row.passed == null ? 'info' : scope.row.passed ? 'success' : 'danger'
                      " /></template></el-table-column
                ><el-table-column label="操作" width="110"
                  ><template #default="scope"
                    ><el-button
                      v-if="canViewExamSnapshot && scope.row.submitted_at"
                      link
                      type="primary"
                      @click="openSnapshot(scope.row)"
                      >查看答题</el-button
                    ><span v-else>—</span></template
                  ></el-table-column
                ></el-table
              >
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </DetailDrawer>

    <DetailDrawer v-model="answerVisible" title="历史考试答题快照" :size="900">
      <div v-loading="sectionState('snapshot') === 'loading'" class="training-detail-layout">
        <el-alert
          v-if="sectionState('snapshot') === 'retryable-error'"
          title="历史答题快照加载失败"
          type="error"
          :closable="false"
          show-icon
          ><template #default
            ><el-button link type="primary" @click="emit('retry', 'snapshot')"
              >重新加载</el-button
            ></template
          ></el-alert
        >
        <el-alert
          v-else
          title="历史快照严格按考试提交时内容展示；标准答案与解析受敏感权限控制"
          type="warning"
          :closable="false"
          show-icon
        />
        <el-empty
          v-if="sectionState('snapshot') === 'empty'"
          description="暂无可查看的历史答题快照"
        />
        <section
          v-for="(question, index) in examSnapshot?.questions ?? []"
          :key="question.id"
          class="training-surface"
        >
          <div class="training-section-heading">
            <div>
              <h3>第 {{ index + 1 }} 题 · {{ question.question_type }}</h3>
              <p>{{ question.question_text }}</p>
            </div>
            <StatusTag
              :label="
                question.is_correct == null
                  ? '未判定'
                  : question.is_correct
                    ? '答题正确'
                    : '答题错误'
              "
              :tone="
                question.is_correct == null ? 'info' : question.is_correct ? 'success' : 'danger'
              "
            />
          </div>
          <el-descriptions :column="1" border
            ><el-descriptions-item label="员工选择">{{
              question.options
                .filter((item) => item.is_selected)
                .map((item) => item.option_text)
                .join('；') || '未作答'
            }}</el-descriptions-item
            ><el-descriptions-item v-if="examSnapshot?.exam.show_correct_answer" label="标准答案">{{
              question.options
                .filter((item) => item.is_correct)
                .map((item) => item.option_text)
                .join('；') || '未配置'
            }}</el-descriptions-item
            ><el-descriptions-item v-if="examSnapshot?.exam.show_explanation" label="历史解析">{{
              question.explanation || '暂无解析'
            }}</el-descriptions-item></el-descriptions
          >
        </section>
      </div>
    </DetailDrawer>

    <FormDialog
      v-model="exportVisible"
      title="导出员工培训档案"
      confirm-button-text="开始生成"
      :submitting="exporting"
      @confirm="emit('export', { includeSensitive })"
      ><div class="training-detail-layout">
        <div class="training-export-note">
          <span>导出范围</span
          ><strong>当前筛选条件 · {{ archiveReport?.total ?? rows.length }} 名员工</strong>
        </div>
        <el-checkbox model-value disabled>包含任务、课程与考试结果</el-checkbox
        ><el-checkbox v-if="canExportExamMaterials" v-model="includeSensitive"
          >另行导出敏感答题材料</el-checkbox
        >
        <p class="training-operations-page__muted">
          生成文件保留当前筛选范围；敏感材料使用独立权限与独立文件。
        </p>
      </div></FormDialog
    >
  </AppPage>
</template>

<style scoped lang="scss">
@use '../styles/training-operations.scss';
</style>
