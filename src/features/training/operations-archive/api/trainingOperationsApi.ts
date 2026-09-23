import { defineApiPath } from '@shared/api/apiPath'
import { getStoredAuthSession } from '@shared/api/authSession'
import { serviceApiPath } from '@shared/api/backendServices'
import { ApiError, requestApi, requestRaw } from '@shared/api/httpClient'
import { createRequestId } from '@shared/api/requestIdentity'
import type {
  TrainingCourseOptionDto,
  TrainingCourseResultsDto,
  TrainingCourseStatisticsDto,
  TrainingEmployeeArchiveDetailDto,
  TrainingEmployeeArchiveDto,
  TrainingEmployeeTaskRecordDto,
  TrainingExamHistoryDto,
  TrainingExamOptionDto,
  TrainingExamSnapshotDto,
  TrainingExamStatisticsDto,
  TrainingListRequest,
  TrainingOrganizationOptionDto,
  TrainingOverviewDto,
  TrainingOverdueReportDto,
  TrainingPagedReportDto,
  TrainingPagedResponse,
  TrainingPlanDetailDto,
  TrainingPlanDto,
  TrainingPlanEmployeeBatchAddDto,
  TrainingPlanEmployeeBatchExitDto,
  TrainingPlanEmployeeDto,
  TrainingPositionOptionDto,
  TrainingReportRequest,
  TrainingTaskDetailDto,
  TrainingTaskDto,
  TrainingTaskEmployeeQueryDto,
  TrainingTaskStatisticsReportDto,
  TrainingTenantEmployeeDto,
  TrainingTrendsDto,
} from '../types/trainingOperationsContracts'
import type { TrainingTaskType } from '../types/trainingOperations'

export type * from '../types/trainingOperationsContracts'

export function currentTrainingTenantId() {
  return getStoredAuthSession()?.currentTenantId ?? 0
}

export function trainingApiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

export function createTrainingRequestId() {
  return createRequestId()
}

const endpoints = Object.freeze({
  planQuery: '/TrainingPlan/Query', planDetail: '/TrainingPlan/Detail', planCreate: '/TrainingPlan/Create', planUpdate: '/TrainingPlan/Update', planPublish: '/TrainingPlan/Publish', planDelete: '/TrainingPlan/Delete',
  planEmployeeQuery: '/TrainingPlanEmployee/Query', planEmployeeHistory: '/TrainingPlanEmployee/History', planEmployeeBatchAdd: '/TrainingPlanEmployee/BatchAdd', planEmployeeExit: '/TrainingPlanEmployee/Exit', planEmployeeBatchExit: '/TrainingPlanEmployee/BatchExit', planEmployeeRejoin: '/TrainingPlanEmployee/Rejoin',
  taskQuery: '/TrainingTask/Query', taskDetail: '/TrainingTask/Detail', taskCreate: '/TrainingTask/Create', taskUpdate: '/TrainingTask/Update', taskDelete: '/TrainingTask/Delete', taskStart: '/TrainingTask/Start', taskEmployeeQuery: '/TrainingTaskEmployee/Query',
  overview: '/TrainingOverview/Overview', trends: '/TrainingOverview/Trends', incomplete: '/TrainingOverview/Incomplete',
  archives: '/TrainingArchive/Archives', archiveDetail: '/TrainingArchive/ArchiveDetail', employeeTasks: '/TrainingArchive/EmployeeTasks', courseResults: '/TrainingArchive/CourseResults', examHistory: '/TrainingArchive/ExamHistory', examSnapshot: '/TrainingArchive/ExamSnapshot',
  taskStatistics: '/TrainingStatistics/TaskStatistics', courseStatistics: '/TrainingStatistics/CourseStatistics', examStatistics: '/TrainingStatistics/ExamStatistics', overdueStatistics: '/TrainingStatistics/OverdueStatistics',
  exportTaskLedger: '/TrainingExport/ExportTaskLedger', exportEmployeeArchives: '/TrainingExport/ExportEmployeeArchives', exportExamMaterials: '/TrainingExport/ExportExamMaterials',
  courseQuery: '/TrainingCourse/Query', courseDetail: '/TrainingCourse/Detail', examQuery: '/TrainingExam/Query', examDetail: '/TrainingExam/Detail',
  organizationQuery: '/Organization/Query', positionQuery: '/Position/Query',
} as const)

async function postTraining<Response, Request>(path: string, data: Request, requestId = createRequestId()) {
  return requestApi<Response, Request>({ method: 'POST', url: serviceApiPath('iam', defineApiPath(path)), data, headers: { Accept: 'text/plain', 'Content-Type': 'application/json-patch+json', 'X-Request-ID': requestId } })
}

export const trainingOperationsApi = {
  queryPlans: (request: TrainingListRequest & { plan_year?: number }) => postTraining<TrainingPagedResponse<TrainingPlanDto>, typeof request>(endpoints.planQuery, request),
  getPlan: (id: number) => postTraining<TrainingPlanDetailDto, { id: number }>(endpoints.planDetail, { id }),
  createPlan: (request: { plan_year: number; plan_name: string; start_at: string; end_at: string; frequency: string }) => postTraining<TrainingPlanDto, typeof request>(endpoints.planCreate, request),
  updatePlan: (request: { id: number; updated_at: string; plan_year: number; plan_name: string; start_at: string; end_at: string; frequency: string }) => postTraining<TrainingPlanDto, typeof request>(endpoints.planUpdate, request),
  publishPlan: (request: { id: number; updated_at: string }) => postTraining<TrainingPlanDto, typeof request>(endpoints.planPublish, request),
  deletePlan: (request: { id: number; updated_at: string }) => postTraining<{ id: number; deleted: boolean; idempotent: boolean; updated_at: string }, typeof request>(endpoints.planDelete, request),
  queryPlanEmployees: (request: TrainingListRequest & { training_id: number; employee_id?: number; is_current?: boolean }) => postTraining<TrainingPagedResponse<TrainingPlanEmployeeDto>, typeof request>(endpoints.planEmployeeQuery, request),
  getPlanEmployeeHistory: (request: { training_id: number; employee_id: number }) => postTraining<TrainingPlanEmployeeDto[], typeof request>(endpoints.planEmployeeHistory, request),
  batchAddPlanEmployees: (request: { training_id: number; employee_ids: number[] }) => postTraining<TrainingPlanEmployeeBatchAddDto, typeof request>(endpoints.planEmployeeBatchAdd, request),
  exitPlanEmployee: (request: { training_id: number; employee_id: number; expected_period_id: number }) => postTraining<unknown, typeof request>(endpoints.planEmployeeExit, request),
  batchExitPlanEmployees: (request: { training_id: number; employees: Array<{ employee_id: number; expected_period_id: number }> }) => postTraining<TrainingPlanEmployeeBatchExitDto, typeof request>(endpoints.planEmployeeBatchExit, request),
  rejoinPlanEmployee: (request: { training_id: number; employee_id: number; expected_period_id: number }) => postTraining<unknown, typeof request>(endpoints.planEmployeeRejoin, request),
  queryTasks: (request: TrainingListRequest & { training_id?: number; plan_year?: number; task_type?: TrainingTaskType; period_key?: string; start_at_from?: string; start_at_to?: string }) => postTraining<TrainingPagedResponse<TrainingTaskDto>, typeof request>(endpoints.taskQuery, request),
  getTask: (id: number) => postTraining<TrainingTaskDetailDto, { id: number }>(endpoints.taskDetail, { id }),
  createTask: (request: { training_id: number; task_name: string; task_type: TrainingTaskType; period_key?: string; start_at: string; deadline_at: string; exam_id: number; courses: Array<{ course_id: number; sort_order: number }>; request_id: string }) => postTraining<TrainingTaskDetailDto, typeof request>(endpoints.taskCreate, request, request.request_id),
  updateTask: (request: { id: number; updated_at: string; task_name: string; task_type: TrainingTaskType; period_key: string; start_at: string; deadline_at: string; exam_id: number; courses: Array<{ course_id: number; sort_order: number }> }) => postTraining<TrainingTaskDetailDto, typeof request>(endpoints.taskUpdate, request),
  deleteTask: (request: { id: number; updated_at: string }) => postTraining<unknown, typeof request>(endpoints.taskDelete, request),
  startTask: (request: { id: number; updated_at: string }) => postTraining<unknown, typeof request>(endpoints.taskStart, request),
  queryTaskEmployees: (request: TrainingListRequest & { training_task_id: number; employee_id?: number; is_required?: boolean; employee_name?: string; training_status?: string; course_learning_status?: string; exam_status?: string; course_id?: number; exam_id?: number }) => postTraining<TrainingTaskEmployeeQueryDto, typeof request>(endpoints.taskEmployeeQuery, request),
  queryCourses: (request: TrainingListRequest & { training_type?: string; is_locked?: boolean }) => postTraining<TrainingPagedResponse<TrainingCourseOptionDto>, typeof request>(endpoints.courseQuery, request),
  getCourse: (id: number) => postTraining<TrainingCourseOptionDto, { id: number }>(endpoints.courseDetail, { id }),
  queryExams: (request: TrainingListRequest) => postTraining<TrainingPagedResponse<TrainingExamOptionDto>, typeof request>(endpoints.examQuery, request),
  getExam: (id: number) => postTraining<TrainingExamOptionDto, { id: number }>(endpoints.examDetail, { id }),
  queryTenantEmployees: (request: { tenant_ids: number[]; page_index: number; page_size: number; keyword?: string; status?: string }) => postTraining<TrainingPagedResponse<TrainingTenantEmployeeDto>, typeof request>('/Membership/QueryUsers', request),
  queryOrganizations: (request: { tenant_id: number; query_type: 'list'; page_index: number; page_size: number; keyword?: string; status?: string }) => postTraining<TrainingPagedResponse<TrainingOrganizationOptionDto>, typeof request>(endpoints.organizationQuery, request),
  queryPositions: (request: { tenant_id: number; page_index: number; page_size: number; keyword?: string; status?: string }) => postTraining<TrainingPagedResponse<TrainingPositionOptionDto>, typeof request>(endpoints.positionQuery, request),
  overview: (request: TrainingReportRequest) => postTraining<TrainingOverviewDto, TrainingReportRequest>(endpoints.overview, request),
  trends: (request: TrainingReportRequest) => postTraining<TrainingTrendsDto, TrainingReportRequest>(endpoints.trends, request),
  incomplete: (request: TrainingReportRequest) => postTraining<TrainingPagedReportDto<TrainingEmployeeTaskRecordDto>, TrainingReportRequest>(endpoints.incomplete, request),
  archives: (request: TrainingReportRequest) => postTraining<TrainingPagedReportDto<TrainingEmployeeArchiveDto>, TrainingReportRequest>(endpoints.archives, request),
  archiveDetail: (request: TrainingReportRequest) => postTraining<TrainingEmployeeArchiveDetailDto, TrainingReportRequest>(endpoints.archiveDetail, request),
  employeeTasks: (request: TrainingReportRequest) => postTraining<TrainingPagedReportDto<TrainingEmployeeTaskRecordDto>, TrainingReportRequest>(endpoints.employeeTasks, request),
  courseResults: (request: { training_task_employee_id: number }) => postTraining<TrainingCourseResultsDto, typeof request>(endpoints.courseResults, request),
  examHistory: (request: { training_task_employee_id: number }) => postTraining<TrainingExamHistoryDto, typeof request>(endpoints.examHistory, request),
  examSnapshot: (request: { employee_exam_id: number }) => postTraining<TrainingExamSnapshotDto, typeof request>(endpoints.examSnapshot, request),
  taskStatistics: (request: TrainingReportRequest) => postTraining<TrainingTaskStatisticsReportDto, TrainingReportRequest>(endpoints.taskStatistics, request),
  courseStatistics: (request: TrainingReportRequest) => postTraining<TrainingPagedReportDto<TrainingCourseStatisticsDto>, TrainingReportRequest>(endpoints.courseStatistics, request),
  examStatistics: (request: TrainingReportRequest) => postTraining<TrainingExamStatisticsDto, TrainingReportRequest>(endpoints.examStatistics, request),
  overdueStatistics: (request: TrainingReportRequest) => postTraining<TrainingOverdueReportDto, TrainingReportRequest>(endpoints.overdueStatistics, request),
  exportTaskLedger: (request: TrainingReportRequest) => requestRaw<Blob, TrainingReportRequest>({ method: 'POST', url: serviceApiPath('iam', defineApiPath(endpoints.exportTaskLedger)), data: request, responseType: 'blob' }),
  exportEmployeeArchives: (request: TrainingReportRequest) => requestRaw<Blob, TrainingReportRequest>({ method: 'POST', url: serviceApiPath('iam', defineApiPath(endpoints.exportEmployeeArchives)), data: request, responseType: 'blob' }),
  exportExamMaterials: (request: TrainingReportRequest & { employee_exam_ids?: number[] }) => requestRaw<Blob, typeof request>({ method: 'POST', url: serviceApiPath('iam', defineApiPath(endpoints.exportExamMaterials)), data: request, responseType: 'blob' }),
}

export { endpoints as trainingOperationsEndpoints }
