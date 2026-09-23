import type { StatusTone } from '@shared/components/StatusTag.vue'
import type {
  EmployeeTrainingStatus,
  PlanStatus,
  TaskStatus,
  TrainingAssignmentType,
  TrainingCompletionSource,
  TrainingPlanType,
} from './types/trainingOperations'

export function planStatusLabel(status: PlanStatus) {
  return status === 'DRAFT' ? '草稿' : '已发布'
}

export function planStatusTone(status: PlanStatus): StatusTone {
  return status === 'DRAFT' ? 'warning' : 'success'
}

export function planTypeLabel(type: TrainingPlanType | undefined) {
  return type === 'STANDING' ? '常设计划' : '年度计划'
}

export function planFrequencyLabel(frequency: string | undefined) {
  if (!frequency) return '长期有效'
  return (
    { MONTHLY: '每月', QUARTERLY: '每季度', 每月: '每月', 每季度: '每季度' }[frequency] ?? frequency
  )
}

export function assignmentTypeLabel(type: TrainingAssignmentType | undefined) {
  if (!type) return '计划分配'
  return {
    PLAN: '计划分配',
    ONBOARDING: '入职自动纳入',
    RETURN_TO_WORK: '返岗安排',
    MANUAL: '人工安排',
  }[type]
}

export function completionSourceLabel(source: TrainingCompletionSource | undefined) {
  return source === 'ADMIN' ? '管理员完成' : source === 'NORMAL' ? '正常完成' : '未完成'
}

export function taskStatusLabel(status: TaskStatus) {
  return {
    NOT_STARTED: '未开始',
    ACTIVE: '进行中',
    OVERDUE: '已逾期',
    COMPLETED: '已完成',
  }[status]
}

export function taskStatusTone(status: TaskStatus): StatusTone {
  if (status === 'ACTIVE' || status === 'COMPLETED') return 'success'
  if (status === 'OVERDUE') return 'danger'
  return 'info'
}

export function employeeStatusLabel(status: EmployeeTrainingStatus) {
  return {
    NOT_STARTED: '未开始',
    LEARNING: '学习中',
    READY_FOR_EXAM: '待考试',
    EXAM_FAILED: '考试未通过',
    COMPLETED: '已完成',
    OVERDUE: '已逾期',
  }[status]
}

export function employeeStatusTone(status: EmployeeTrainingStatus): StatusTone {
  if (status === 'COMPLETED') return 'success'
  if (status === 'OVERDUE' || status === 'EXAM_FAILED') return 'danger'
  if (status === 'LEARNING' || status === 'READY_FOR_EXAM') return 'warning'
  return 'info'
}

export function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) return '暂无口径'
  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

export function taskCompletionPercentage(
  numerator: number,
  denominator: number,
  serverRate?: number,
) {
  if (serverRate != null) return `${serverRate.toFixed(1)}%`
  if (denominator <= 0) return '100.0%'
  return percentage(numerator, denominator)
}

export function optionalRate(rate?: number) {
  return rate == null ? '暂无数据' : `${rate.toFixed(1)}%`
}

export function taskTypeLabel(type: import('./types/trainingOperations').TrainingTaskType) {
  return { MONTHLY: '月度', QUARTERLY: '季度', TEMPORARY: '临时' }[type]
}

export function courseLearningStatusLabel(
  status: import('./types/trainingOperations').CourseLearningStatus,
) {
  return { NOT_STARTED: '未开始', LEARNING: '学习中', COMPLETED: '已完成' }[status]
}

export function examStatusLabel(status: import('./types/trainingOperations').EmployeeExamStatus) {
  return { NOT_STARTED: '未考试', IN_PROGRESS: '答题中', PASSED: '通过', FAILED: '失败' }[status]
}
