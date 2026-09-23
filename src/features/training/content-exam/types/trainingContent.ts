export type TrainingPreviewState = 'ready' | 'loading' | 'empty' | 'retryable-error'
export type TrainingStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED'
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE'
export type PaperMode = 'FIXED' | 'RANDOM'

export interface AuditFields {
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  version: string
}

export interface CourseRecord extends AuditFields {
  [key: string]: unknown
  id: number
  name: string
  trainingType: string
  description: string
  videoFileName: string
  videoFileId?: string
  videoSize: string
  videoDurationSeconds: number
  plannedDurationSeconds: number
  status: TrainingStatus
  isLocked: boolean
}

export interface QuestionOption {
  label: string
  content: string
  isCorrect: boolean
  order: number
}

export interface QuestionRecord extends AuditFields {
  [key: string]: unknown
  id: number
  stem: string
  type: QuestionType
  options: QuestionOption[]
  optionsLoaded?: boolean
  analysis: string
  status: TrainingStatus
}

export interface FixedPaperQuestion {
  questionId: number
  stem: string
  type: QuestionType
  status: TrainingStatus
  score: number
  order: number
}

export interface RandomPaperRule {
  type: QuestionType
  count: number
  scorePerQuestion: number
  availableCount: number
}

export interface PaperRecord extends AuditFields {
  [key: string]: unknown
  id: number
  name: string
  description: string
  mode: PaperMode
  totalScore: number
  status: TrainingStatus
  randomizeQuestionOrder: boolean
  randomizeOptionOrder: boolean
  fixedQuestions: FixedPaperQuestion[]
  randomRules: RandomPaperRule[]
}

export interface ExamConfigurationRecord extends AuditFields {
  [key: string]: unknown
  id: number
  name: string
  description: string
  paperId: number
  paperName: string
  paperMode: PaperMode
  paperStatus?: TrainingStatus
  paperTotalScore: number
  durationSeconds: number
  passScore: number
  maxAttempts: number
  showCorrectAnswer: boolean
  showAnswerAnalysis: boolean
  status: TrainingStatus
}

export interface TrainingContentFixture {
  courses: CourseRecord[]
  questions: QuestionRecord[]
  papers: PaperRecord[]
  examConfigurations: ExamConfigurationRecord[]
}
