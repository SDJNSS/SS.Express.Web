import type {
  CourseRecord,
  ExamConfigurationRecord,
  PaperRecord,
  QuestionRecord,
  QuestionType,
  FixedPaperQuestion,
  RandomPaperRule,
} from './trainingContent'

export type QuestionChoice = Pick<QuestionRecord, 'id' | 'stem' | 'type' | 'status' | 'updatedAt'>
export interface QuestionChoiceQuery {
  keyword: string
  type: QuestionType
  page: number
  action: 'create' | 'update'
}
export interface QuestionChoicePage {
  items: QuestionChoice[]
  total: number
}
/** Page model adapter; offline Preview injects its fixture separately from the production runtime. */
export type PaperPreviewGenerator = (rules: RandomPaperRule[]) => Promise<FixedPaperQuestion[]>

export type ContentAction = 'view' | 'create' | 'update' | 'status' | 'copy'
export type ContentSearch = Record<string, string | number>
export type CourseForm = Pick<
  CourseRecord,
  'name' | 'trainingType' | 'description' | 'videoDurationSeconds' | 'plannedDurationSeconds'
> & { videoFileId: string }
export type QuestionForm = Pick<QuestionRecord, 'stem' | 'type' | 'options' | 'analysis'>
export type PaperForm = Pick<
  PaperRecord,
  | 'name'
  | 'description'
  | 'mode'
  | 'totalScore'
  | 'randomizeQuestionOrder'
  | 'randomizeOptionOrder'
  | 'fixedQuestions'
  | 'randomRules'
>
export type ExamForm = Pick<
  ExamConfigurationRecord,
  | 'name'
  | 'description'
  | 'paperId'
  | 'durationSeconds'
  | 'passScore'
  | 'maxAttempts'
  | 'showCorrectAnswer'
  | 'showAnswerAnalysis'
>

/** UI-facing port. Preview never imports the production API or session. */
export interface ContentRuntime<RecordType, FormType> {
  total: number
  query: ContentSearch
  contextKey: string
  error: string
  allowed: (action: ContentAction) => boolean
  load: (query?: ContentSearch) => Promise<void>
  detail: (record: RecordType) => Promise<RecordType>
  save: (form: FormType, record?: RecordType) => Promise<RecordType>
  changeStatus: (record: RecordType) => Promise<RecordType>
  copy?: (record: RecordType) => Promise<RecordType>
  prepareForm?: (record?: RecordType) => Promise<void>
  searchOptions?: (keyword: string, page?: number) => Promise<void>
  optionsTotal?: number
  optionsPage?: number
  optionsLoading?: boolean
  questionCounts?: Record<string, number>
  queryQuestions?: (query: QuestionChoiceQuery, signal: AbortSignal) => Promise<QuestionChoicePage>
  generatePaperPreview?: (
    rules: RandomPaperRule[],
    total: number,
    action: 'create' | 'update',
    signal: AbortSignal,
  ) => Promise<FixedPaperQuestion[]>
  setLeaveGuard?: (guard: () => boolean | Promise<boolean>) => void
}
