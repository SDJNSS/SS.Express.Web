import type { FixedPaperQuestion, QuestionType } from '../types/trainingContent'

export const questionTypes: QuestionType[] = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']
export const questionTypeNames: Record<QuestionType, string> = {
  SINGLE_CHOICE: '单选题',
  MULTIPLE_CHOICE: '多选题',
  TRUE_FALSE: '判断题',
}

/** Decimal scores are compared in hundredths; never round an indivisible group. */
export function scoreUnits(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 0) return undefined
  const units = Math.round(value * 100)
  return Number.isSafeInteger(units) && Math.abs(value * 100 - units) < 0.000001 ? units : undefined
}

export function equalQuestionScore(total: number | undefined, count: number): number | undefined {
  const units = scoreUnits(total)
  return units !== undefined && units > 0 && count > 0 && units % count === 0
    ? units / count / 100
    : undefined
}

export function hasUnequalScores(questions: FixedPaperQuestion[]) {
  return questionTypes.some(
    (type) => new Set(questions.filter((q) => q.type === type).map((q) => q.score)).size > 1,
  )
}

/** A count change invalidates only the affected type totals, not the target paper total. */
export function reconcileQuestions(before: FixedPaperQuestion[], after: FixedPaperQuestion[]) {
  const changed = new Set(
    questionTypes.filter(
      (type) =>
        before.filter((q) => q.type === type).length !==
        after.filter((q) => q.type === type).length,
    ),
  )
  return {
    changedTypes: [...changed],
    questions: after.map((question, index) => ({
      ...question,
      score: changed.has(question.type)
        ? 0
        : (before.find((q) => q.questionId === question.questionId)?.score ??
          before.find((q) => q.type === question.type)?.score ??
          0),
      order: index + 1,
    })),
  }
}
