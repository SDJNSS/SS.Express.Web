import { computed, reactive, ref } from 'vue'
import {
  equalQuestionScore,
  hasUnequalScores,
  questionTypes,
  questionTypeNames,
  reconcileQuestions,
  scoreUnits,
} from '../adapters/paperComposition'
import type { FixedPaperQuestion, QuestionType } from '../types/trainingContent'
import type { PaperForm } from '../types/trainingContentRuntime'

export function usePaperComposition(form: PaperForm) {
  const randomGenerated = ref(false)
  const scoreNotice = ref('')
  const totals = reactive<Record<QuestionType, number | undefined>>({
    SINGLE_CHOICE: undefined,
    MULTIPLE_CHOICE: undefined,
    TRUE_FALSE: undefined,
  })
  function reset() {
    randomGenerated.value = form.mode === 'RANDOM' && form.fixedQuestions.length > 0
    scoreNotice.value = ''
    for (const type of questionTypes) {
      const questions = form.fixedQuestions.filter((q) => q.type === type)
      totals[type] =
        questions.length && !hasUnequalScores(questions)
          ? questions.reduce((sum, q) => sum + (scoreUnits(q.score) ?? 0), 0) / 100
          : undefined
    }
  }
  function syncRandomRules() {
    if (form.mode !== 'RANDOM' || !randomGenerated.value) return
    for (const rule of form.randomRules) {
      const group = form.fixedQuestions.filter((q) => q.type === rule.type)
      rule.count = group.length
      rule.scorePerQuestion = group[0]?.score ?? 0
      rule.totalScore = totals[rule.type]
    }
  }
  function setTotal(type: QuestionType, value: number | undefined) {
    totals[type] = value
    const group = form.fixedQuestions.filter((q) => q.type === type)
    const score = equalQuestionScore(value, group.length) ?? 0
    group.forEach((q) => {
      q.score = score
    })
    syncRandomRules()
  }
  function applySelection(questions: FixedPaperQuestion[]) {
    const result = reconcileQuestions(form.fixedQuestions, questions)
    form.fixedQuestions = result.questions
    result.changedTypes.forEach((type) => {
      totals[type] = undefined
    })
    scoreNotice.value = result.changedTypes.length
      ? `${result.changedTypes.map((type) => questionTypeNames[type]).join('、')}题数已改变，题型总分已清空，请重新设置。`
      : '已更新题目，题数未改变的题型保留原分值。'
    syncRandomRules()
  }
  function remove(id: number) {
    applySelection(form.fixedQuestions.filter((q) => q.questionId !== id))
  }
  function generated(questions: FixedPaperQuestion[]) {
    form.fixedQuestions = questions.map((q, index) => ({ ...q, order: index + 1 }))
    randomGenerated.value = true
    reset()
    syncRandomRules()
    scoreNotice.value = '预览已生成，后续移除或替换只调整这份题集，不重新抽题。'
  }
  const groups = computed(() =>
    questionTypes
      .map((type) => {
        const questions = form.fixedQuestions.filter((q) => q.type === type)
        const perScore = equalQuestionScore(totals[type], questions.length)
        return {
          type,
          name: questionTypeNames[type],
          questions,
          total: totals[type],
          perScore,
          invalid: questions.length > 0 && !perScore,
        }
      })
      .filter((g) => g.questions.length),
  )
  const totalScore = computed(
    () => form.fixedQuestions.reduce((sum, q) => sum + (scoreUnits(q.score) ?? 0), 0) / 100,
  )
  const valid = computed(
    () =>
      form.fixedQuestions.length > 0 &&
      form.fixedQuestions.length <= 1000 &&
      new Set(form.fixedQuestions.map((q) => q.questionId)).size === form.fixedQuestions.length &&
      form.fixedQuestions.every((q) => (scoreUnits(q.score) ?? 0) > 0) &&
      groups.value.every((g) => !g.invalid && g.questions.every((q) => q.score === g.perScore)),
  )
  return {
    randomGenerated,
    scoreNotice,
    groups,
    totalScore,
    valid,
    reset,
    setTotal,
    applySelection,
    remove,
    generated,
  }
}
