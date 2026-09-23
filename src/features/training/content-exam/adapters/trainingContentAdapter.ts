import type {
  AuditFields,
  CourseRecord,
  ExamConfigurationRecord,
  PaperRecord,
  QuestionRecord,
  QuestionType,
} from '../types/trainingContent'
import type { CourseForm, ExamForm, PaperForm, QuestionForm } from '../types/trainingContentRuntime'
import type {
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
  TrainingResourceDto,
} from '../types/trainingContentContracts'

function audit(dto: TrainingResourceDto): AuditFields {
  return {
    createdAt: dto.created_at,
    createdBy: dto.created_by,
    updatedAt: dto.updated_at,
    updatedBy: dto.updated_by,
    version: dto.updated_at,
  }
}
export function mapCourse(dto: CourseDto): CourseRecord {
  return {
    ...audit(dto),
    id: dto.id,
    name: dto.course_name,
    trainingType: dto.training_type,
    description: dto.introduction,
    videoFileId: dto.video_file_id,
    videoFileName: dto.video_file_id,
    videoSize: '接口未提供',
    videoDurationSeconds: dto.video_duration_seconds,
    plannedDurationSeconds: dto.planned_learning_seconds,
    status: dto.status,
    isLocked: dto.is_locked,
  }
}
export function mapQuestion(dto: QuestionSummaryDto | QuestionDetailDto): QuestionRecord {
  return {
    ...audit(dto),
    id: dto.id,
    stem: dto.question_text,
    type: dto.question_type,
    status: dto.status,
    analysis: 'explanation' in dto ? dto.explanation : '',
    optionsLoaded: 'options' in dto,
    options:
      'options' in dto
        ? dto.options
            .map((option) => ({
              label: option.option_code,
              content: option.option_text,
              isCorrect: option.is_correct,
              order: option.sort_order,
            }))
            .sort((a, b) => a.order - b.order)
        : [],
  }
}
export function mapPaper(dto: PaperSummaryDto | PaperDetailDto): PaperRecord {
  const detail = 'fixed_questions' in dto ? dto : undefined
  return {
    ...audit(dto),
    id: dto.id,
    name: dto.paper_name,
    description: '',
    mode: dto.paper_mode,
    totalScore: dto.total_score,
    status: dto.status,
    randomizeQuestionOrder: detail?.random_question_order ?? false,
    randomizeOptionOrder: detail?.random_option_order ?? false,
    fixedQuestions:
      detail?.fixed_questions
        .map((q) => ({
          questionId: q.question_id,
          stem: q.question_text,
          type: q.question_type,
          status: q.question_status,
          score: q.question_score,
          order: q.sort_order,
        }))
        .sort((a, b) => a.order - b.order) ?? [],
    randomRules: detail
      ? [
          {
            type: 'SINGLE_CHOICE',
            count: detail.single_choice_count ?? 0,
            scorePerQuestion: detail.single_choice_score ?? 0,
            availableCount: 0,
          },
          {
            type: 'MULTIPLE_CHOICE',
            count: detail.multiple_choice_count ?? 0,
            scorePerQuestion: detail.multiple_choice_score ?? 0,
            availableCount: 0,
          },
          {
            type: 'TRUE_FALSE',
            count: detail.true_false_count ?? 0,
            scorePerQuestion: detail.true_false_score ?? 0,
            availableCount: 0,
          },
        ]
      : [],
  }
}
export function mapExam(dto: ExamDto): ExamConfigurationRecord {
  return {
    ...audit(dto),
    id: dto.id,
    name: dto.exam_name,
    description: '',
    paperId: dto.paper_id,
    paperName: dto.paper_name,
    paperMode: dto.paper_mode,
    paperTotalScore: dto.paper_total_score,
    durationSeconds: dto.duration_seconds,
    passScore: dto.pass_score,
    maxAttempts: dto.max_attempts,
    showCorrectAnswer: dto.show_correct_answer,
    showAnswerAnalysis: dto.show_explanation,
    status: dto.status,
  }
}
export function coursePayload(form: CourseForm): CourseContentRequest {
  return {
    course_name: form.name.trim(),
    training_type: form.trainingType.trim(),
    introduction: form.description.trim(),
    planned_learning_seconds: form.plannedDurationSeconds,
    video_file_id: form.videoFileId,
  }
}
export function questionPayload(form: QuestionForm): QuestionContentRequest {
  return {
    question_type: form.type,
    question_text: form.stem.trim(),
    explanation: form.analysis.trim(),
    options: form.options.map((option, index) => ({
      option_code: option.label.trim(),
      option_text: option.content.trim(),
      is_correct: option.isCorrect,
      sort_order: index + 1,
    })),
  }
}
export function paperPayload(form: PaperForm): PaperContentRequest {
  const rule = (type: QuestionType) => form.randomRules.find((item) => item.type === type)
  const count = (type: QuestionType) => (form.mode === 'RANDOM' ? (rule(type)?.count ?? 0) : null)
  const score = (type: QuestionType) =>
    count(type) ? (rule(type)?.scorePerQuestion ?? null) : null
  return {
    paper_name: form.name.trim(),
    paper_mode: form.mode,
    total_score: form.totalScore,
    random_question_order: form.randomizeQuestionOrder,
    random_option_order: form.randomizeOptionOrder,
    fixed_questions:
      form.mode === 'FIXED'
        ? form.fixedQuestions.map((item, index) => ({
            question_id: item.questionId,
            question_score: item.score,
            sort_order: index + 1,
          }))
        : [],
    single_choice_count: count('SINGLE_CHOICE'),
    single_choice_score: score('SINGLE_CHOICE'),
    multiple_choice_count: count('MULTIPLE_CHOICE'),
    multiple_choice_score: score('MULTIPLE_CHOICE'),
    true_false_count: count('TRUE_FALSE'),
    true_false_score: score('TRUE_FALSE'),
  }
}
export function examPayload(form: ExamForm): ExamContentRequest {
  return {
    exam_name: form.name.trim(),
    paper_id: form.paperId,
    duration_seconds: form.durationSeconds,
    pass_score: form.passScore,
    max_attempts: form.maxAttempts,
    show_correct_answer: form.showCorrectAnswer,
    show_explanation: form.showAnswerAnalysis,
  }
}
