import type { PaperMode, QuestionType, TrainingStatus } from './trainingContent'

/** Wire contracts: TrainingManagementContracts.cs. Preserve updated_at verbatim. */
export interface TrainingResourceDto {
  id: number
  tenant_id: number
  tenant_code: string
  status: TrainingStatus
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

export interface ContentQuery {
  page_index: number
  page_size: number
  keyword?: string
  status?: string
  training_type?: string
  is_locked?: boolean
  question_type?: QuestionType
  paper_mode?: PaperMode
}

export interface ContentPage<T> {
  items: T[]
  total: number
  page_index: number
  page_size: number
}

export interface CourseContentRequest {
  course_name: string
  training_type: string
  introduction: string
  planned_learning_seconds: number
  video_file_id: string
}
export interface CourseDto extends TrainingResourceDto, CourseContentRequest {
  video_duration_seconds: number
  is_locked: boolean
}
export interface QuestionOptionRequest {
  option_code: string
  option_text: string
  is_correct: boolean
  sort_order: number
}
export interface QuestionContentRequest {
  question_type: QuestionType
  question_text: string
  explanation: string
  options: QuestionOptionRequest[]
}
export interface QuestionSummaryDto extends TrainingResourceDto {
  question_type: QuestionType
  question_text: string
}
export interface QuestionDetailDto extends QuestionSummaryDto {
  explanation: string
  options: Array<QuestionOptionRequest & { id: number }>
}
export interface FixedQuestionRequest {
  question_id: number
  question_score: number
  sort_order: number
}
export interface PaperContentRequest {
  paper_name: string
  paper_mode: PaperMode
  total_score: number
  random_question_order: boolean
  random_option_order: boolean
  fixed_questions: FixedQuestionRequest[]
  single_choice_count: number | null
  single_choice_score: number | null
  multiple_choice_count: number | null
  multiple_choice_score: number | null
  true_false_count: number | null
  true_false_score: number | null
}
export interface PaperSummaryDto extends TrainingResourceDto {
  paper_name: string
  paper_mode: PaperMode
  total_score: number
}
export interface PaperDetailDto
  extends PaperSummaryDto, Omit<PaperContentRequest, 'fixed_questions'> {
  fixed_questions: Array<
    FixedQuestionRequest & {
      id: number
      question_type: QuestionType
      question_text: string
      question_status: TrainingStatus
    }
  >
}
export interface ExamContentRequest {
  exam_name: string
  paper_id: number
  duration_seconds: number
  pass_score: number
  max_attempts: number
  show_correct_answer: boolean
  show_explanation: boolean
}
export interface ExamDto extends TrainingResourceDto, ExamContentRequest {
  paper_name: string
  paper_mode: PaperMode
  paper_total_score: number
}
export interface ResourceVersionRequest {
  id: number
  updated_at: string
}
export interface StatusChangeRequest extends ResourceVersionRequest {
  target_status: 'ACTIVE' | 'DISABLED'
}
export interface StatusChangeResponse extends ResourceVersionRequest {
  tenant_id: number
  tenant_code: string
  status: TrainingStatus
  idempotent: boolean
}
