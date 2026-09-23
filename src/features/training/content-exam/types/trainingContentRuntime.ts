import type {
  CourseRecord,
  ExamConfigurationRecord,
  PaperRecord,
  QuestionRecord,
} from './trainingContent'

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
  setLeaveGuard?: (guard: () => boolean | Promise<boolean>) => void
}
