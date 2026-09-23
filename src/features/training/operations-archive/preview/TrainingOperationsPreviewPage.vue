<script setup lang="ts">
import { computed, ref } from 'vue'

import EmployeeTrainingArchivePageView from '../components/EmployeeTrainingArchivePageView.vue'
import TrainingOverviewPageView from '../components/TrainingOverviewPageView.vue'
import TrainingPlanDetailPageView from '../components/TrainingPlanDetailPageView.vue'
import TrainingPlanPageView from '../components/TrainingPlanPageView.vue'
import TrainingStatisticsPageView from '../components/TrainingStatisticsPageView.vue'
import TrainingTaskDetailPageView from '../components/TrainingTaskDetailPageView.vue'
import type {
  TrainingExamHistoryDto,
  TrainingExamSnapshotDto,
} from '../types/trainingOperationsContracts'
import type { TrainingPlanRecord, TrainingTaskRecord } from '../types/trainingOperations'
import type { TrainingOperationsPreviewState } from '../types/trainingOperations'
import {
  trainingArchiveReportFixture,
  trainingIncompleteFixture,
  trainingOperationsFixture,
  trainingOverviewFixture,
  trainingTrendsFixture,
} from './trainingOperations.fixture'

const params = new URLSearchParams(window.location.search)
const previewId = params.get('preview') ?? 'training-operations-overview'
const activePreviewId = ref(previewId)
const standingPlan = trainingOperationsFixture.plans.find((item) => item.planType === 'STANDING')!
const longRunningTask = trainingOperationsFixture.tasks.find((item) => item.isLongRunning)!
const selectedPlan = ref<TrainingPlanRecord>(
  previewId === 'training-plan-detail' ? standingPlan : trainingOperationsFixture.plans[0]!,
)
const selectedTask = ref<TrainingTaskRecord>(
  previewId === 'training-task-detail' ? longRunningTask : trainingOperationsFixture.tasks[0]!,
)
const selectedTaskEmployees = computed(() =>
  selectedTask.value.isLongRunning
    ? trainingOperationsFixture.taskEmployees.filter((item) => item.id >= 305)
    : trainingOperationsFixture.taskEmployees.filter((item) => item.id < 305),
)
const onboardingSubmissionVersion = ref(0)
const returnToWorkSubmissionVersion = ref(0)
const adminCompleteSubmissionVersion = ref(0)
const selectedPlanTasks = computed(() =>
  trainingOperationsFixture.tasks.filter((item) => item.trainingId === selectedPlan.value.id),
)
function distinctOptions(values: string[]) {
  return [...new Set(values.filter(Boolean))].map((label, index) => ({ id: index + 1, label }))
}
const organizationOptions = distinctOptions(
  trainingOperationsFixture.taskEmployees.map((item) => item.organization),
)
const positionOptions = distinctOptions(
  trainingOperationsFixture.taskEmployees.map((item) => item.position),
)
const courseOptions = trainingOperationsFixture.taskCourses.map((item) => ({
  id: item.courseId,
  label: item.name,
}))
const examOptions = trainingOperationsFixture.taskExams.map((item) => ({
  id: item.examId,
  label: item.name,
}))
const requestedScenario = params.get('scenario')
const supportedStates = new Set<TrainingOperationsPreviewState>([
  'ready',
  'loading',
  'empty',
  'retryable-error',
])
const state = ref<TrainingOperationsPreviewState>(
  supportedStates.has(requestedScenario as TrainingOperationsPreviewState)
    ? (requestedScenario as TrainingOperationsPreviewState)
    : 'ready',
)
const feedback = ref('候选页面已就绪')
const previewExam = {
  id: 9101,
  training_task_id: 201,
  training_task_employee_id: 401,
  employee_id: 501,
  exam_id: 701,
  paper_id: 301,
  attempt_no: 1,
  status: 'SUBMITTED',
  started_at: '2026-09-10T08:00:00+08:00',
  expires_at: '2026-09-10T09:00:00+08:00',
  submitted_at: '2026-09-10T08:42:00+08:00',
  submit_type: 'MANUAL',
  score: 92,
  passed: true,
  duration_seconds: 2520,
  pass_score: 80,
  max_attempts: 2,
  show_correct_answer: true,
  show_explanation: true,
  is_final: true,
}
const previewScope = {
  employee_exam_ids: [previewExam.id],
  time_zone: 'Asia/Shanghai',
  tenant_id: 1,
  as_of: '2026-09-17T10:00:00+08:00',
  employee_ids: [previewExam.employee_id],
  drilldown_scope: '',
  time_boundary: '2026-09-17T10:00:00+08:00',
}
const previewExamHistory = {
  scope: previewScope,
  warnings: [],
  exams: [previewExam],
} satisfies TrainingExamHistoryDto
const previewExamSnapshot = {
  scope: previewScope,
  warnings: [],
  exam: previewExam,
  questions: [
    {
      employee_exam_id: previewExam.id,
      id: 9201,
      source_question_id: 1201,
      question_type: 'SINGLE_CHOICE',
      question_text: '行车前应优先确认哪项安全状态？',
      explanation: '出车前应完成车况和装载安全检查。',
      question_order: 1,
      question_score: 10,
      awarded_score: 10,
      is_correct: true,
      options: [
        {
          id: 9301,
          employee_exam_question_id: 9201,
          source_option_id: 1,
          option_text: '车况与装载安全',
          option_order: 1,
          is_correct: true,
          is_selected: true,
        },
        {
          id: 9302,
          employee_exam_question_id: 9201,
          source_option_id: 2,
          option_text: '手机电量',
          option_order: 2,
          is_correct: false,
          is_selected: false,
        },
      ],
    },
  ],
} satisfies TrainingExamSnapshotDto
const titleMap: Record<string, string> = {
  'training-operations-overview': '培训概览',
  'training-plan-management': '培训计划',
  'training-plan-detail': '培训计划详情',
  'training-task-detail': '培训任务详情',
  'training-employee-archives': '员工培训档案',
  'training-special-statistics': '专项统计',
}

document.title = `${titleMap[previewId] ?? '培训运营管理'} · UI Design`
function announce(message: string) {
  feedback.value = message
}
function retry() {
  state.value = 'loading'
  feedback.value = '正在重新加载候选数据'
  window.setTimeout(() => {
    state.value = 'ready'
    feedback.value = '候选数据已重新加载'
  }, 240)
}
function openPlan(record: TrainingPlanRecord) {
  selectedPlan.value = record
  activePreviewId.value = 'training-plan-detail'
  announce('已进入培训计划详情')
}
function openTask(record: TrainingTaskRecord) {
  selectedTask.value = record
  activePreviewId.value = 'training-task-detail'
  announce('已进入培训任务详情')
}
function saveOnboardingRule() {
  onboardingSubmissionVersion.value += 1
  announce('入职自动纳入规则已保存')
}
function arrangeReturnToWork() {
  returnToWorkSubmissionVersion.value += 1
  announce('已创建新的返岗培训执行轮次')
}
function adminCompleteEmployee() {
  adminCompleteSubmissionVersion.value += 1
  announce('指定员工执行已由管理员完成，学习与考试结果保持原值')
}
</script>

<template>
  <p class="sr-only" role="status" aria-live="polite">{{ feedback }}</p>
  <TrainingOverviewPageView
    v-if="activePreviewId === 'training-operations-overview'"
    :plans="trainingOperationsFixture.plans"
    :tasks="trainingOperationsFixture.tasks"
    :employees="trainingOperationsFixture.taskEmployees"
    :overview="trainingOverviewFixture"
    :trends="trainingTrendsFixture"
    :incomplete="trainingIncompleteFixture"
    :section-states="{ overview: 'ready', trends: 'ready', incomplete: 'ready' }"
    :state="state"
    @action="announce"
    @retry="retry"
  />
  <TrainingPlanPageView
    v-else-if="activePreviewId === 'training-plan-management'"
    :plans="trainingOperationsFixture.plans"
    :total="trainingOperationsFixture.plans.length"
    :state="state"
    @action="announce"
    @query="announce('培训计划筛选已生效')"
    @save="announce('培训计划候选数据已保存')"
    @publish="announce('培训计划已发布')"
    @delete="announce('培训计划草稿已删除')"
    @open-detail="openPlan"
    @retry="retry"
  />
  <TrainingPlanDetailPageView
    v-else-if="activePreviewId === 'training-plan-detail'"
    :plan="selectedPlan"
    :tasks="selectedPlanTasks"
    :task-total="selectedPlanTasks.length"
    :employees="trainingOperationsFixture.planEmployees"
    :employee-total="trainingOperationsFixture.planEmployees.length"
    :employee-history="trainingOperationsFixture.planEmployees"
    :batch-result="undefined"
    :auto-enrollment-rule="trainingOperationsFixture.autoEnrollmentRule"
    :auto-enrollment-jobs="trainingOperationsFixture.autoEnrollmentJobs"
    :onboarding-submission-version="onboardingSubmissionVersion"
    :course-options="
      trainingOperationsFixture.taskCourses.map((item) => ({
        id: item.courseId,
        label: `${item.name} · ${item.trainingType}`,
      }))
    "
    :exam-options="
      trainingOperationsFixture.taskExams.map((item) => ({ id: item.examId, label: item.name }))
    "
    :employee-options="
      trainingOperationsFixture.planEmployees.map((item) => ({
        id: item.employeeId,
        label: item.name,
        secondary: item.employeeCode,
      }))
    "
    :occupied-period-keys="
      trainingOperationsFixture.tasks
        .filter((item) => item.taskType !== 'TEMPORARY')
        .map((item) => item.period)
    "
    :state="state"
    @action="announce"
    @back="activePreviewId = 'training-plan-management'"
    @open-task="openTask"
    @create-task="announce('任务候选已创建')"
    @add-employees="announce('计划员工已加入')"
    @search-employees="announce('员工搜索已刷新')"
    @exit-employees="announce('计划员工已退出')"
    @rejoin-employee="announce('计划员工已重新加入')"
    @employee-history="announce('有效期历史已加载')"
    @start-task="announce('培训任务已启动')"
    @delete-task="announce('培训任务已删除')"
    @save-onboarding-rule="saveOnboardingRule"
    @retry-onboarding-job="announce('失败作业已重新提交')"
    @retry="retry"
  />
  <TrainingTaskDetailPageView
    v-else-if="activePreviewId === 'training-task-detail'"
    :task="selectedTask"
    :courses="trainingOperationsFixture.taskCourses"
    :exams="trainingOperationsFixture.taskExams"
    :employees="selectedTaskEmployees"
    :employee-total="selectedTaskEmployees.length"
    :can-arrange-return-to-work="true"
    :can-admin-complete-employee="true"
    :can-edit-long-running-task="true"
    :return-to-work-employee-options="
      trainingOperationsFixture.planEmployees.map((item) => ({
        employeeId: item.employeeId,
        employeeCode: item.employeeCode,
        name: item.name,
        organization: item.organization,
        position: item.position,
      }))
    "
    :return-to-work-submission-version="returnToWorkSubmissionVersion"
    :admin-complete-submission-version="adminCompleteSubmissionVersion"
    :state="state"
    @action="announce"
    @back="activePreviewId = 'training-plan-detail'"
    @open-course="announce('已打开课程只读详情')"
    @open-exam="announce('已打开考试只读详情')"
    @query-employees="announce('员工筛选已生效')"
    @drilldown="announce('人员下钻已生效')"
    @search-return-to-work-employees="announce('当前 Tenant 员工候选已刷新')"
    @arrange-return-to-work="arrangeReturnToWork"
    @admin-complete-employee="adminCompleteEmployee"
    @retry="retry"
  />
  <EmployeeTrainingArchivePageView
    v-else-if="activePreviewId === 'training-employee-archives'"
    :archives="trainingOperationsFixture.archives"
    :archive-report="trainingArchiveReportFixture"
    :plans="trainingOperationsFixture.plans"
    :tasks="trainingOperationsFixture.tasks"
    :employees="trainingOperationsFixture.taskEmployees"
    :organization-options="organizationOptions"
    :position-options="positionOptions"
    :exam-history="previewExamHistory"
    :exam-snapshot="previewExamSnapshot"
    :section-states="{ exams: 'ready', snapshot: 'ready' }"
    :can-view-exam-snapshot="true"
    :state="state"
    @action="announce"
    @retry="retry"
  />
  <TrainingStatisticsPageView
    v-else
    :plans="trainingOperationsFixture.plans"
    :tasks="trainingOperationsFixture.tasks"
    :employees="trainingOperationsFixture.taskEmployees"
    :archives="trainingOperationsFixture.archives"
    :organization-options="organizationOptions"
    :position-options="positionOptions"
    :course-options="courseOptions"
    :exam-options="examOptions"
    :can-audit-export="true"
    :state="state"
    @action="announce"
    @retry="retry"
  />
</template>

<style lang="scss">
@use '@shared/styles/index.scss';
</style>
