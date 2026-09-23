import { defineApiPath } from '@shared/api/apiPath'
import { serviceApiPath } from '@shared/api/backendServices'
import { ApiError, requestApi } from '@shared/api/httpClient'
import { getStoredAuthSession } from '@shared/api/authSession'
import type {
  ContentPage,
  ContentQuery,
  CourseContentRequest,
  CourseDto,
  ExamContentRequest,
  ExamDto,
  PaperContentRequest,
  PaperDetailDto,
  PaperSummaryDto,
  QuestionContentRequest,
  QuestionDetailDto,
  QuestionSummaryDto,
  ResourceVersionRequest,
  StatusChangeRequest,
  StatusChangeResponse,
} from '../types/trainingContentContracts'

function post<T>(path: string, data: unknown, signal?: AbortSignal) {
  return requestApi<T>({
    method: 'POST',
    url: serviceApiPath('iam', defineApiPath(path)),
    data,
    ...(signal ? { signal } : {}),
    headers: { Accept: 'text/plain', 'Content-Type': 'application/json-patch+json' },
  })
}

function resourceApi<Summary, Detail, Content>(controller: string) {
  return {
    query: (query: ContentQuery, signal?: AbortSignal) =>
      post<ContentPage<Summary>>(`${controller}/Query`, query, signal),
    detail: (id: number, signal?: AbortSignal) =>
      post<Detail>(`${controller}/Detail`, { id }, signal),
    create: (body: Content) => post<Detail>(`${controller}/Create`, body),
    update: (body: Content & ResourceVersionRequest) => post<Detail>(`${controller}/Update`, body),
    changeStatus: (body: StatusChangeRequest) =>
      post<StatusChangeResponse>(`${controller}/ChangeStatus`, body),
  }
}

export const trainingContentApi = {
  courses: {
    ...resourceApi<CourseDto, CourseDto, CourseContentRequest>('/TrainingCourse'),
    copy: (sourceCourseId: number) =>
      post<CourseDto>('/TrainingCourse/Copy', { source_course_id: sourceCourseId }),
  },
  questions: resourceApi<QuestionSummaryDto, QuestionDetailDto, QuestionContentRequest>(
    '/TrainingQuestion',
  ),
  papers: resourceApi<PaperSummaryDto, PaperDetailDto, PaperContentRequest>('/TrainingPaper'),
  exams: resourceApi<ExamDto, ExamDto, ExamContentRequest>('/TrainingExam'),
}

export function contentSessionKey() {
  const session = getStoredAuthSession()
  return `${session?.userId ?? ''}:${session?.currentTenantId ?? ''}:${session?.sessionId ?? ''}:${session?.sessionVersion ?? ''}`
}

export function hasContentTenant() {
  return Boolean(getStoredAuthSession()?.currentTenantId)
}

export function contentErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : '请求失败，请重新加载后重试'
}
