import type {
  TrainingPlanDetailDto,
  TrainingPlanDto,
  TrainingPlanEmployeeDto,
  TrainingTaskCourseStatisticsDto,
  TrainingTaskDetailDto,
  TrainingTaskDto,
  TrainingTaskEmployeeDto,
  TrainingTaskExamStatisticsDto,
} from '../api/trainingOperationsApi'
import type {
  CourseLearningStatus,
  EmployeeExamStatus,
  EmployeeTrainingStatus,
  PlanFrequency,
  PlanStatus,
  TaskCourseStatisticsRecord,
  TaskEmployeeRecord,
  TaskExamStatisticsRecord,
  TaskStatus,
  TrainingAssignmentType,
  TrainingCompletionSource,
  TrainingPlanEmployeeRecord,
  TrainingPlanRecord,
  TrainingPlanType,
  TrainingTaskRecord,
  TrainingTaskType,
} from '../types/trainingOperations'

function value(input: string | null | undefined) {
  return input?.trim() ?? ''
}
function planStatus(input: string): PlanStatus {
  return value(input).toUpperCase() === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
}
function planFrequency(input: string): PlanFrequency {
  return value(input).toUpperCase() === 'MONTHLY' ? 'MONTHLY' : 'QUARTERLY'
}
function planType(input?: string): TrainingPlanType {
  return value(input).toUpperCase() === 'STANDING' ? 'STANDING' : 'ANNUAL'
}
function assignmentType(input?: string): TrainingAssignmentType {
  const type = value(input).toUpperCase()
  return type === 'ONBOARDING' || type === 'RETURN_TO_WORK' || type === 'MANUAL' ? type : 'PLAN'
}
function completionSource(input?: string): TrainingCompletionSource | undefined {
  const source = value(input).toUpperCase()
  return source === 'ADMIN' || source === 'NORMAL' ? source : undefined
}
function taskStatus(input: string): TaskStatus {
  const status = value(input).toUpperCase()
  return status === 'ACTIVE' || status === 'OVERDUE' || status === 'COMPLETED'
    ? status
    : 'NOT_STARTED'
}
function taskType(input: string, periodKey: string): TrainingTaskType {
  const type = value(input).toUpperCase()
  if (type === 'MONTHLY' || type === 'QUARTERLY' || type === 'TEMPORARY') return type
  if (periodKey.startsWith('TEMP-')) return 'TEMPORARY'
  return periodKey.includes('Q') ? 'QUARTERLY' : 'MONTHLY'
}
function employeeStatus(input: string): EmployeeTrainingStatus {
  const status = value(input).toUpperCase()
  if (
    status === 'LEARNING' ||
    status === 'READY_FOR_EXAM' ||
    status === 'EXAM_FAILED' ||
    status === 'COMPLETED' ||
    status === 'OVERDUE'
  )
    return status
  return 'NOT_STARTED'
}
function courseStatus(input: string): CourseLearningStatus {
  const status = value(input).toUpperCase()
  return status === 'LEARNING' || status === 'COMPLETED' ? status : 'NOT_STARTED'
}
function examStatus(input: string): EmployeeExamStatus {
  const status = value(input).toUpperCase()
  return status === 'IN_PROGRESS' || status === 'PASSED' || status === 'FAILED'
    ? status
    : 'NOT_STARTED'
}

export function mapTrainingPlan(dto: TrainingPlanDto | TrainingPlanDetailDto): TrainingPlanRecord {
  const detail = dto as Partial<TrainingPlanDetailDto>
  const type = planType(dto.plan_type)
  return {
    id: dto.id,
    tenantId: dto.tenant_id,
    tenantCode: value(dto.tenant_code),
    planType: type,
    ...(type === 'ANNUAL'
      ? { year: dto.plan_year, endAt: dto.end_at, frequency: planFrequency(dto.frequency) }
      : {}),
    name: value(dto.plan_name),
    startAt: dto.start_at,
    status: planStatus(dto.status),
    currentEmployees: detail.current_employee_count ?? 0,
    historicalEmployees: detail.historical_employee_count ?? 0,
    taskCount: detail.task_count ?? 0,
    notStartedTaskCount: detail.not_started_task_count ?? 0,
    activeTaskCount: detail.active_task_count ?? 0,
    overdueTaskCount: detail.overdue_task_count ?? 0,
    completedTaskCount: detail.completed_task_count ?? 0,
    updatedAt: dto.updated_at,
  }
}

export function mapPlanEmployee(dto: TrainingPlanEmployeeDto): TrainingPlanEmployeeRecord {
  return {
    id: dto.id,
    employeeId: dto.employee_id,
    employeeCode: value(dto.profile.user_name) || String(dto.employee_id),
    name:
      value(dto.profile.display_name) ||
      value(dto.profile.real_name) ||
      value(dto.profile.user_name),
    organization: value(dto.profile.organization_names) || '当前无有效组织',
    position: value(dto.profile.position_names) || '当前无有效岗位',
    isCurrent: dto.is_current,
    effectiveFrom: dto.effective_from,
    ...(dto.effective_to ? { effectiveTo: dto.effective_to } : {}),
  }
}

export function mapTrainingTask(dto: TrainingTaskDto | TrainingTaskDetailDto): TrainingTaskRecord {
  const statistics = dto.statistics
  const detail = dto as Partial<TrainingTaskDetailDto>
  return {
    id: dto.id,
    trainingId: dto.training_id,
    name: value(dto.task_name),
    planName: value(dto.plan_name),
    period: value(dto.period_key),
    taskType: taskType(dto.task_type, dto.period_key),
    startAt: dto.start_at,
    endAt: dto.deadline_at,
    isLongRunning: dto.is_long_running ?? false,
    contentVersion: dto.content_version ?? 1,
    status: taskStatus(dto.status),
    isLocked: dto.is_locked,
    expectedCount: statistics?.required_employee_count ?? 0,
    completedCount: statistics?.completed_employee_count ?? 0,
    overdueCount: statistics?.current_overdue_employee_count ?? 0,
    excludedCount: statistics?.excluded_employee_count ?? 0,
    hasRequiredEmployees: statistics?.has_required_employees ?? true,
    completionRate: statistics?.completion_rate ?? 0,
    courseCount: detail.courses?.length ?? 0,
    examId: dto.exam_id,
    examName: value(dto.exam_name),
    updatedAt: dto.updated_at,
  }
}

export function mapTaskCourse(dto: TrainingTaskCourseStatisticsDto): TaskCourseStatisticsRecord {
  return {
    taskCourseId: dto.id,
    courseId: dto.course_id,
    name: value(dto.course_name),
    trainingType: value(dto.course_type) || '未分类',
    status: value(dto.course_status),
    sortOrder: dto.sort_order,
    notStartedCount: dto.not_started_employee_count,
    learningCount: dto.learning_employee_count,
    completedCount: dto.completed_employee_count,
    requiredCount: dto.required_employee_count,
    ...(dto.completion_rate == null ? {} : { completionRate: dto.completion_rate }),
  }
}

export function mapTaskExam(dto: TrainingTaskExamStatisticsDto): TaskExamStatisticsRecord {
  return {
    examId: dto.exam_id,
    name: value(dto.exam_name),
    status: value(dto.exam_status),
    notStartedCount: dto.not_started_employee_count,
    notExaminedCount: dto.not_examined_employee_count,
    inProgressCount: dto.in_progress_employee_count,
    submittedCount: dto.examined_employee_count,
    passedCount: dto.passed_employee_count,
    failedCount: dto.failed_employee_count,
    requiredCount: dto.required_employee_count,
    ...(dto.examination_rate == null ? {} : { examRate: dto.examination_rate }),
    ...(dto.pass_rate == null ? {} : { passRate: dto.pass_rate }),
  }
}

export function mapTaskEmployee(dto: TrainingTaskEmployeeDto): TaskEmployeeRecord {
  const source = completionSource(dto.completion_source)
  return {
    id: dto.id,
    trainingTaskId: dto.training_task_id,
    employeeId: dto.employee_id,
    employeeCode: value(dto.profile.user_name) || String(dto.employee_id),
    name:
      value(dto.profile.display_name) ||
      value(dto.profile.real_name) ||
      value(dto.profile.user_name),
    organization: value(dto.profile.organization_names) || '当前无有效组织',
    position: value(dto.profile.position_names) || '当前无有效岗位',
    shouldTrain: dto.is_required,
    status: employeeStatus(dto.status),
    courseLearningStatus: courseStatus(dto.course_learning_status),
    examStatus: examStatus(dto.exam_status),
    learnedCourseCount: dto.learned_course_count,
    courseCount: dto.course_count,
    assignedAt: dto.assigned_at,
    executionNo: dto.execution_no ?? 1,
    assignmentType: assignmentType(dto.assignment_type),
    contentVersion: dto.content_version ?? 1,
    ...(dto.excluded_at ? { excludedAt: dto.excluded_at } : {}),
    learningMinutes: Math.floor(dto.total_learning_seconds / 60),
    wasOverdue: dto.ever_overdue,
    ...(dto.overdue_at ? { firstOverdueAt: dto.overdue_at } : {}),
    ...(dto.final_score == null ? {} : { finalScore: dto.final_score }),
    ...(dto.final_passed == null ? {} : { finalPassed: dto.final_passed }),
    ...(dto.completed_at ? { completedAt: dto.completed_at } : {}),
    ...(source ? { completionSource: source } : {}),
    ...(dto.admin_completed_by ? { adminCompletedBy: dto.admin_completed_by } : {}),
    ...(dto.admin_completed_at ? { adminCompletedAt: dto.admin_completed_at } : {}),
    ...(dto.admin_completion_reason ? { adminCompletionReason: dto.admin_completion_reason } : {}),
    canAdminComplete: dto.can_admin_complete ?? false,
    canArrangeAgain: dto.can_arrange_again ?? false,
    ...(dto.updated_at ? { updatedAt: dto.updated_at } : {}),
  }
}
