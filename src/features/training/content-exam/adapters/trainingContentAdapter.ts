import type {
  AuditFields,
  CourseRecord,
  ExamConfigurationRecord,
  PaperRecord,
  QuestionRecord,
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
  const detail = 'questions' in dto ? dto : undefined
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
      detail?.questions
        .map((q) => ({
          questionId: q.question_id,
          stem: q.question_text,
          type: q.question_type,
          status: q.question_status,
          score: q.question_score,
          order: q.sort_order,
          questionUpdatedAt: q.question_updated_at,
        }))
        .sort((a, b) => a.order - b.order) ?? [],
    randomRules: detail
      ? detail.groups.map((group) => ({
          type: group.question_type,
          count: group.count,
          scorePerQuestion: group.question_score ?? 0,
          totalScore: group.total_score ?? undefined,
          availableCount: 0,
        }))
      : [],
    ...(detail
      ? {
          configurationValid: detail.is_configuration_valid,
          configurationInvalidReason: detail.configuration_invalid_reason,
        }
      : {}),
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
  if (!form.fixedQuestions.length || form.fixedQuestions.some((q) => !q.questionUpdatedAt))
    throw new Error('请先确认完整题集及每题版本；保存不会自动抽题，请刷新或重新选择缺少版本的题目')
  return {
    paper_name: form.name.trim(),
    paper_mode: form.mode,
    total_score: form.totalScore,
    random_question_order: form.randomizeQuestionOrder,
    random_option_order: form.randomizeOptionOrder,
    questions: form.fixedQuestions.map((item, index) => ({
      question_id: item.questionId,
      question_score: item.score,
      sort_order: index + 1,
      question_type: item.type,
      question_updated_at: item.questionUpdatedAt!,
    })),
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
