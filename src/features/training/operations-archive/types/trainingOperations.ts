export type TrainingOperationsPreviewState = 'ready' | 'loading' | 'empty' | 'retryable-error'
export type PlanStatus = 'DRAFT' | 'PUBLISHED'
export type TrainingPlanType = 'ANNUAL' | 'STANDING'
export type PlanFrequency = 'MONTHLY' | 'QUARTERLY'
export type TaskStatus = 'NOT_STARTED' | 'ACTIVE' | 'OVERDUE' | 'COMPLETED'
export type TrainingTaskType = 'MONTHLY' | 'QUARTERLY' | 'TEMPORARY'
export type EmployeeTrainingStatus =
  'NOT_STARTED' | 'LEARNING' | 'READY_FOR_EXAM' | 'EXAM_FAILED' | 'COMPLETED' | 'OVERDUE'
export type CourseLearningStatus = 'NOT_STARTED' | 'LEARNING' | 'COMPLETED'
export type EmployeeExamStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED'
export type ExamDrilldownStatus = EmployeeExamStatus | 'NOT_SUBMITTED' | 'SUBMITTED'
export type TrainingAssignmentType = 'PLAN' | 'ONBOARDING' | 'RETURN_TO_WORK' | 'MANUAL'
export type TrainingCompletionSource = 'NORMAL' | 'ADMIN'

export interface TrainingPlanRecord {
  id: number
  tenantId?: number
  tenantCode?: string
  planType?: TrainingPlanType
  year?: number
  name: string
  startAt: string
  endAt?: string
  frequency?: PlanFrequency
  status: PlanStatus
  currentEmployees: number
  historicalEmployees: number
  taskCount: number
  notStartedTaskCount?: number
  activeTaskCount?: number
  overdueTaskCount?: number
  completedTaskCount?: number
  updatedAt: string
}

export interface TrainingPlanFormValue {
  planType: TrainingPlanType
  year: number | undefined
  name: string
  startAt: string
  endAt: string | undefined
  frequency: PlanFrequency | undefined
}

export interface TrainingPlanEmployeeRecord {
  id: number
  employeeId: number
  employeeCode: string
  name: string
  organization: string
  position: string
  isCurrent: boolean
  effectiveFrom: string
  effectiveTo?: string
}

export interface TrainingPlanEmployeeBatchResultRecord {
  employeeId: number
  employeeName: string
  result: string
  affectedTaskCount: number
  effectiveFrom?: string
  effectiveTo?: string
}

export interface TrainingPlanEmployeeBatchResult {
  title: string
  summary: string
  items: TrainingPlanEmployeeBatchResultRecord[]
}

export interface TrainingTaskRecord {
  id: number
  trainingId?: number
  name: string
  planName: string
  period: string
  taskType: TrainingTaskType
  startAt: string
  endAt?: string
  isLongRunning?: boolean
  contentVersion?: number
  status: TaskStatus
  isLocked: boolean
  expectedCount: number
  completedCount: number
  overdueCount: number
  excludedCount?: number
  hasRequiredEmployees?: boolean
  completionRate?: number
  courseCount: number
  examId?: number
  examName: string
  updatedAt?: string
}

export interface TaskCourseStatisticsRecord {
  taskCourseId: number
  courseId: number
  name: string
  trainingType: string
  status: string
  sortOrder: number
  notStartedCount: number
  learningCount: number
  completedCount: number
  requiredCount: number
  completionRate?: number
}

export interface TaskExamStatisticsRecord {
  examId: number
  name: string
  status: string
  notStartedCount: number
  notExaminedCount: number
  inProgressCount: number
  submittedCount: number
  passedCount: number
  failedCount: number
  requiredCount: number
  examRate?: number
  passRate?: number
}

export interface TaskEmployeeRecord {
  id: number
  trainingTaskId?: number
  employeeId?: number
  employeeCode: string
  name: string
  organization: string
  position: string
  shouldTrain: boolean
  status: EmployeeTrainingStatus
  courseLearningStatus: CourseLearningStatus
  examStatus: EmployeeExamStatus
  learnedCourseCount: number
  courseCount: number
  assignedAt: string
  executionNo?: number
  assignmentType?: TrainingAssignmentType
  contentVersion?: number
  excludedAt?: string
  learningMinutes: number
  wasOverdue: boolean
  firstOverdueAt?: string
  finalScore?: number
  finalPassed?: boolean
  completedAt?: string
  completionSource?: TrainingCompletionSource
  adminCompletedBy?: string
  adminCompletedAt?: string
  adminCompletionReason?: string
  canAdminComplete?: boolean
  canArrangeAgain?: boolean
  updatedAt?: string
}

export interface TrainingAutoEnrollmentRuleRecord {
  id: number
  trainingId: number
  trainingTaskId: number
  planName: string
  taskName: string
  isEnabled: boolean
  enabledAt?: string
  updatedAt: string
}

export interface TrainingAutoEnrollmentJobRecord {
  id: number
  employeeId: number
  employeeName: string
  memberEffectiveAt: string
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED'
  attemptCount: number
  nextRetryAt?: string
  lastError?: string
  trainingTaskEmployeeId?: number
  updatedAt: string
}

export interface PersonnelDrilldownContext {
  title: string
  description: string
  courseId?: number
  courseStatus?: CourseLearningStatus
  examId?: number
  examStatus?: ExamDrilldownStatus
}

export interface EmployeeArchiveRecord {
  id: number
  employeeCode: string
  name: string
  organization: string
  position: string
  taskCount: number
  completedCount: number
  overdueCount: number
  finalPassedCount: number
  learningMinutes: number
  latestTrainingAt: string
}

export interface TrainingOperationsFixture {
  plans: TrainingPlanRecord[]
  planEmployees: TrainingPlanEmployeeRecord[]
  tasks: TrainingTaskRecord[]
  taskCourses: TaskCourseStatisticsRecord[]
  taskExams: TaskExamStatisticsRecord[]
  taskEmployees: TaskEmployeeRecord[]
  archives: EmployeeArchiveRecord[]
  autoEnrollmentRule: TrainingAutoEnrollmentRuleRecord
  autoEnrollmentJobs: TrainingAutoEnrollmentJobRecord[]
}
