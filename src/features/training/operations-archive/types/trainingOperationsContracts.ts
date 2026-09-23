import type {
  CourseLearningStatus,
  EmployeeExamStatus,
  TrainingTaskType,
} from './trainingOperations'

export interface TrainingPagedResponse<T> {
  total: number
  page_index: number
  page_size: number
  items: T[]
}
export interface TrainingPlanDto {
  id: number
  tenant_id: number
  tenant_code: string
  plan_type?: string
  plan_year: number
  plan_name: string
  start_at: string
  end_at: string
  frequency: string
  status: string
  current_employee_count: number
  task_count: number
  not_started_task_count: number
  active_task_count: number
  overdue_task_count: number
  completed_task_count: number
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}
export interface TrainingPlanDetailDto extends TrainingPlanDto {
  historical_employee_count: number
}
export interface TrainingEmployeeProfileDto {
  employee_id: number
  is_available: boolean
  user_name: string
  real_name: string
  display_name: string
  organization_names: string
  position_names: string
}
export interface TrainingPlanEmployeeDto {
  id: number
  training_id: number
  employee_id: number
  is_current: boolean
  effective_from: string
  effective_to?: string
  profile: TrainingEmployeeProfileDto
}
export interface TrainingPlanEmployeeChangeDto {
  training_id: number
  employee_id: number
  period_id?: number
  result: string
  affected_task_count: number
  effective_from?: string
  effective_to?: string
}
export interface TrainingPlanEmployeeBatchAddDto {
  training_id: number
  added_count: number
  existing_count: number
  rejoin_required_count: number
  invalid_count: number
  items: TrainingPlanEmployeeChangeDto[]
}
export interface TrainingPlanEmployeeBatchExitDto {
  training_id: number
  exited_count: number
  skipped_count: number
  failed_count: number
  items: TrainingPlanEmployeeChangeDto[]
}
export interface TrainingTaskStatisticsDto {
  total_employee_count: number
  required_employee_count: number
  completed_employee_count: number
  incomplete_employee_count: number
  current_overdue_employee_count: number
  ever_overdue_employee_count: number
  excluded_employee_count: number
  completion_rate: number
  has_required_employees: boolean
}
export interface TrainingTaskDto {
  id: number
  tenant_id: number
  tenant_code: string
  training_id: number
  plan_name: string
  plan_type?: string
  plan_year: number
  task_name: string
  task_type: TrainingTaskType
  period_key: string
  period_start_at: string
  period_end_at: string
  is_long_running?: boolean
  content_version?: number
  start_at: string
  deadline_at: string
  exam_id: number
  exam_name: string
  exam_status: string
  exam_disabled: boolean
  status: string
  is_locked: boolean
  updated_at: string
  statistics?: TrainingTaskStatisticsDto
}
export interface TrainingTaskCourseStatisticsDto {
  id: number
  course_id: number
  course_name: string
  course_type: string
  course_status: string
  course_disabled: boolean
  sort_order: number
  required_employee_count: number
  not_started_employee_count: number
  learning_employee_count: number
  completed_employee_count: number
  completion_rate?: number
}
export interface TrainingTaskExamStatisticsDto {
  exam_id: number
  exam_name: string
  exam_status: string
  exam_disabled: boolean
  required_employee_count: number
  not_started_employee_count: number
  in_progress_employee_count: number
  examined_employee_count: number
  not_examined_employee_count: number
  examination_rate?: number
  passed_employee_count: number
  failed_employee_count: number
  pass_rate?: number
}
export interface TrainingTaskDetailDto extends TrainingTaskDto {
  courses: TrainingTaskCourseStatisticsDto[]
  exams: TrainingTaskExamStatisticsDto[]
  statistics: TrainingTaskStatisticsDto
  invalid_employee_ids: number[]
}
export interface TrainingTaskEmployeeDto {
  id: number
  training_id: number
  training_task_id: number
  employee_id: number
  execution_no?: number
  assignment_type?: string
  assignment_request_id?: string
  content_version?: number
  exam_id?: number
  is_required: boolean
  assigned_at: string
  excluded_at?: string
  status: string
  course_learning_status: CourseLearningStatus
  exam_status: EmployeeExamStatus
  learned_course_count: number
  course_count: number
  ever_overdue: boolean
  overdue_at?: string
  total_learning_seconds: number
  final_score?: number
  final_passed?: boolean
  completed_at?: string
  completion_source?: string
  admin_completed_by?: string
  admin_completed_at?: string
  admin_completion_reason?: string
  can_admin_complete?: boolean
  can_arrange_again?: boolean
  updated_at?: string
  profile: TrainingEmployeeProfileDto
}
export interface TrainingTaskEmployeeQueryDto {
  training_task_id: number
  statistics: TrainingTaskStatisticsDto
  employees: TrainingPagedResponse<TrainingTaskEmployeeDto>
}
export interface TrainingCourseOptionDto {
  id: number
  course_name: string
  training_type: string
  introduction: string
  status: string
  is_locked: boolean
  planned_learning_seconds: number
  updated_at: string
}
export interface TrainingExamOptionDto {
  id: number
  exam_name: string
  paper_name: string
  duration_seconds: number
  pass_score: number
  max_attempts: number
  status: string
  updated_at: string
}
export interface TrainingOrganizationOptionDto {
  id: number
  tenant_id: number
  org_code: string
  org_name: string
  status: string
}
export interface TrainingPositionOptionDto {
  id: number
  tenant_id: number
  position_code: string
  position_name: string
  status: string
}
export interface TrainingListRequest {
  page_index: number
  page_size: number
  keyword?: string
  status?: string
}
export interface TrainingReportRequest extends TrainingListRequest {
  plan_year?: number
  training_id?: number
  training_task_id?: number
  task_type?: string
  employee_id?: number
  employee_ids?: number[]
  org_id?: number
  position_id?: number
  start_at_from?: string
  start_at_to?: string
  task_status?: string
  employee_status?: string
  is_required?: boolean
  ever_overdue?: boolean
  final_passed?: boolean
  course_id?: number
  exam_id?: number
  execution_no?: number
  assignment_type?: string
  completion_source?: string
  assigned_at_from?: string
  assigned_at_to?: string
  drilldown_scope?: 'INCOMPLETE' | 'CURRENT_OVERDUE' | 'EVER_OVERDUE'
}
export interface TrainingTenantEmployeeDto {
  tenant_user_id: number
  display_name: string
  tenant_user_code: string
  is_member_currently_effective: boolean
  user: { id: number; user_name: string; real_name: string; status: string }
}
export interface TrainingReportScopeDto {
  training_task_employee_id?: number
  employee_exam_ids: number[]
  time_zone: string
  tenant_id: number
  as_of: string
  plan_year?: number
  training_id?: number
  training_task_id?: number
  employee_ids: number[]
  org_id?: number
  position_id?: number
  keyword?: string
  start_at_from?: string
  start_at_to?: string
  task_status?: string
  task_type?: string
  employee_status?: string
  is_required?: boolean
  ever_overdue?: boolean
  final_passed?: boolean
  course_id?: number
  exam_id?: number
  execution_no?: number
  assignment_type?: string
  completion_source?: string
  assigned_at_from?: string
  assigned_at_to?: string
  drilldown_scope: string
  time_boundary: string
}
export interface TrainingReportBaseDto {
  scope: TrainingReportScopeDto
  warnings: string[]
}
export interface TrainingPopulationStatisticsDto {
  employee_task_count: number
  distinct_employee_count: number
  required_count: number
  completed_count: number
  incomplete_count: number
  current_overdue_count: number
  ever_overdue_count: number
  excluded_count: number
  effective_learning_seconds: number
  final_exam_count: number
  final_passed_count: number
  completion_rate: number
  final_pass_rate?: number
  has_required_employees: boolean
}
export interface TrainingOverviewDto extends TrainingReportBaseDto {
  task_count: number
  not_started_task_count: number
  active_task_count: number
  overdue_task_count: number
  completed_task_count: number
  distinct_course_count: number
  employees: TrainingPopulationStatisticsDto
}
export interface TrainingTrendPointDto {
  period_start: string
  training_completed_count: number
  course_completed_count: number
  exam_submitted_count: number
  exam_passed_count: number
}
export interface TrainingTrendsDto extends TrainingReportBaseDto {
  granularity: string
  task_status_distribution: Record<string, number>
  points: TrainingTrendPointDto[]
}
export interface TrainingPagedReportDto<T> extends TrainingReportBaseDto {
  total: number
  page_index: number
  page_size: number
  items: T[]
}
export interface TrainingEmployeeTaskRecordDto extends TrainingTaskEmployeeDto {
  plan_type?: string
  plan_year: number
  plan_name: string
  task_name: string
  task_type: string
  period_key: string
  start_at: string
  deadline_at: string
  task_status: string
  first_learning_at?: string
  overdue_seconds?: number
}
export interface TrainingEmployeeArchiveDto extends TrainingPopulationStatisticsDto {
  employee_id: number
  plan_count: number
  latest_training_at?: string
  profile: TrainingEmployeeProfileDto
}
export interface TrainingEmployeePlanHistoryDto {
  training_id: number
  plan_type?: string
  plan_year: number
  plan_name: string
  period_count: number
  current_period_id?: number
  first_joined_at: string
  last_exited_at?: string
}
export interface TrainingEmployeeArchiveDetailDto extends TrainingReportBaseDto {
  employee: TrainingEmployeeArchiveDto
  plans: TrainingEmployeePlanHistoryDto[]
  tasks: TrainingPagedReportDto<TrainingEmployeeTaskRecordDto>
}
export interface TrainingCourseResultDto {
  has_anomaly: boolean
  training_task_employee_id: number
  employee_id?: number
  execution_no?: number
  assignment_type?: string
  content_version?: number
  training_task_course_id: number
  course_id: number
  course_name: string
  course_status: string
  sort_order: number
  progress_id?: number
  status: string
  learned_position_seconds: number
  effective_learning_seconds: number
  started_at?: string
  last_learning_at?: string
  completed_at?: string
}
export interface TrainingCourseResultsDto extends TrainingReportBaseDto {
  courses: TrainingCourseResultDto[]
}
export interface TrainingExamAttemptDto {
  id: number
  training_task_id: number
  training_task_employee_id: number
  employee_id: number
  exam_id: number
  paper_id: number
  attempt_no: number
  status: string
  started_at: string
  expires_at: string
  submitted_at?: string
  submit_type?: string
  score?: number
  passed?: boolean
  duration_seconds: number
  pass_score: number
  max_attempts: number
  show_correct_answer: boolean
  show_explanation: boolean
  is_final: boolean
}
export interface TrainingExamHistoryDto extends TrainingReportBaseDto {
  exams: TrainingExamAttemptDto[]
}
export interface TrainingExamOptionSnapshotDto {
  id: number
  employee_exam_question_id: number
  source_option_id: number
  option_text: string
  option_order: number
  is_correct: boolean
  is_selected: boolean
}
export interface TrainingExamQuestionSnapshotDto {
  employee_exam_id: number
  id: number
  source_question_id: number
  question_type: string
  question_text: string
  explanation?: string
  question_order: number
  question_score: number
  awarded_score?: number
  is_correct?: boolean
  options: TrainingExamOptionSnapshotDto[]
}
export interface TrainingExamSnapshotDto extends TrainingReportBaseDto {
  exam: TrainingExamAttemptDto
  questions: TrainingExamQuestionSnapshotDto[]
}
export interface TrainingTaskStatisticsRowDto extends TrainingPopulationStatisticsDto {
  training_id: number
  training_task_id: number
  plan_type?: string
  plan_year: number
  plan_name: string
  task_name: string
  task_type: string
  period_key: string
  start_at: string
  deadline_at: string
  status: string
  is_locked: boolean
  exam_id: number
  exam_name: string
  exam_status: string
}
export interface TrainingTaskStatisticsReportDto extends TrainingPagedReportDto<TrainingTaskStatisticsRowDto> {
  summary: TrainingPopulationStatisticsDto
}
export interface TrainingCourseStatisticsDto {
  sort_order: number
  training_task_id: number
  task_name: string
  training_task_course_id: number
  course_id: number
  course_name: string
  required_count: number
  not_started_count: number
  learning_count: number
  completed_count: number
  effective_learning_seconds: number
  completion_rate?: number
  anomaly_count: number
}
export interface TrainingExamStatisticsSummaryDto {
  participant_count: number
  submitted_count: number
  passed_count: number
  attempt_pass_rate?: number
  first_exam_count: number
  first_passed_count: number
  first_pass_rate?: number
  final_exam_count: number
  final_passed_count: number
  final_pass_rate?: number
  submitted_average_score?: number
  final_average_score?: number
  manual_submit_count: number
  timeout_submit_count: number
}
export interface TrainingExamStatisticsRowDto extends TrainingExamStatisticsSummaryDto {
  training_id: number
  training_task_id: number
  plan_type?: string
  plan_year: number
  plan_name: string
  task_name: string
  task_type: string
  period_key: string
  start_at: string
  deadline_at: string
  task_status: string
  exam_id: number
  exam_name: string
  exam_status: string
}
export interface TrainingExamStatisticsDto extends TrainingPagedReportDto<TrainingExamStatisticsRowDto> {
  summary: TrainingExamStatisticsSummaryDto
}
export interface TrainingOverdueDistributionDto {
  period_start: string
  count: number
}
export interface TrainingOverdueDurationDistributionDto {
  bucket: string
  count: number
}
export interface TrainingOverdueReportDto extends TrainingPagedReportDto<TrainingEmployeeTaskRecordDto> {
  current_overdue_count: number
  ever_overdue_count: number
  completed_after_overdue_count: number
  still_incomplete_count: number
  first_overdue_distribution: TrainingOverdueDistributionDto[]
  duration_distribution: TrainingOverdueDurationDistributionDto[]
}
