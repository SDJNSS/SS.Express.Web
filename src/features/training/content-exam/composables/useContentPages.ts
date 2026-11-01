import { shallowRef } from 'vue'
import { trainingContentApi } from '../api/trainingContentApi'
import {
  coursePayload,
  examPayload,
  mapCourse,
  mapExam,
  mapPaper,
  mapQuestion,
  paperPayload,
  questionPayload,
} from '../adapters/trainingContentAdapter'
import { CONTENT_PERMISSIONS } from '../trainingContentPermissions'
import { resourceRegistry } from '../iam-resource.registry'
import { scoreUnits } from '../adapters/paperComposition'
import type { PaperRecord, QuestionRecord, QuestionType } from '../types/trainingContent'
import { useTrainingContent } from './useTrainingContent'

export function useCourseManagement() {
  return useTrainingContent({
    api: trainingContentApi.courses,
    map: mapCourse,
    payload: coursePayload,
    permissions: CONTENT_PERMISSIONS.courses,
    pageResourceCode: resourceRegistry.courses.resource_code,
  })
}
export function useQuestionBank() {
  return useTrainingContent({
    api: trainingContentApi.questions,
    map: mapQuestion,
    payload: questionPayload,
    permissions: CONTENT_PERMISSIONS.questions,
    pageResourceCode: resourceRegistry.questions.resource_code,
  })
}
export function usePaperManagement() {
  const page = useTrainingContent({
    api: trainingContentApi.papers,
    map: mapPaper,
    payload: paperPayload,
    permissions: CONTENT_PERMISSIONS.papers,
    pageResourceCode: resourceRegistry.papers.resource_code,
  })
  const questions = shallowRef<QuestionRecord[]>([])
  page.runtime.questionCounts = {}
  page.runtime.generatePaperPreview = async (rules, total, action, signal) => {
    const started = page.requestContext()
    page.assertAccess(action, started)
    const result = await trainingContentApi.papers.generatePreview(
      {
        total_score: total,
        groups: rules.map((rule) => ({
          question_type: rule.type,
          count: rule.count,
          total_score: rule.count ? (rule.totalScore ?? null) : null,
        })),
      },
      signal,
    )
    page.assertAccess(action, started)
    if (scoreUnits(result.total_score) !== scoreUnits(total))
      throw new Error('组卷预览总分与请求不一致，请重试')
    return result.questions.map((q) => ({
      questionId: q.question_id,
      stem: q.question_text,
      type: q.question_type,
      status: q.question_status,
      questionUpdatedAt: q.question_updated_at,
      score: q.question_score,
      order: q.sort_order,
    }))
  }
  page.runtime.queryQuestions = async (query, signal) => {
    const started = page.requestContext()
    page.assertAccess(query.action, started)
    const result = await trainingContentApi.questions.query(
      {
        page_index: query.page,
        page_size: 20,
        status: 'ACTIVE',
        keyword: query.keyword.trim(),
        question_type: query.type,
      },
      signal,
    )
    page.assertAccess(query.action, started)
    return { items: result.items.map(mapQuestion), total: result.total }
  }
  page.runtime.prepareForm = async () => {
    const started = page.requestContext()
    const types: QuestionType[] = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']
    const counts = await Promise.all(
      types.map(
        async (type) =>
          [
            type,
            (
              await trainingContentApi.questions.query({
                page_index: 1,
                page_size: 1,
                status: 'ACTIVE',
                question_type: type,
              })
            ).total,
          ] as const,
      ),
    )
    page.assertAccess('view', started)
    page.runtime.questionCounts = Object.fromEntries(counts)
  }
  return { ...page, questions }
}
export function useExamConfiguration() {
  const page = useTrainingContent({
    api: trainingContentApi.exams,
    map: mapExam,
    payload: examPayload,
    permissions: CONTENT_PERMISSIONS.exams,
    pageResourceCode: resourceRegistry.exams.resource_code,
  })
  const papers = shallowRef<PaperRecord[]>([])
  let retainedPaper: PaperRecord | undefined
  let searchSequence = 0
  page.runtime.optionsTotal = 0
  page.runtime.optionsPage = 1
  page.runtime.optionsLoading = false
  page.runtime.searchOptions = async (keyword, index = 1) => {
    const started = page.requestContext()
    page.assertAccess('view', started)
    const sequence = ++searchSequence
    page.runtime.optionsLoading = true
    try {
      const result = await trainingContentApi.papers.query({
        page_index: index,
        page_size: 20,
        status: 'ACTIVE',
        keyword: keyword.trim(),
      })
      page.assertAccess('view', started)
      if (sequence !== searchSequence) return
      papers.value = result.items.map(mapPaper)
      if (retainedPaper && !papers.value.some((item) => item.id === retainedPaper?.id))
        papers.value = [retainedPaper, ...papers.value]
      page.runtime.optionsTotal = result.total
      page.runtime.optionsPage = index
    } finally {
      if (sequence === searchSequence) page.runtime.optionsLoading = false
    }
  }
  page.runtime.prepareForm = async (record) => {
    const started = page.requestContext()
    retainedPaper = undefined
    if (record) {
      const paper = await trainingContentApi.papers.detail(record.paperId)
      page.assertAccess('view', started)
      retainedPaper = mapPaper(paper)
    }
    await page.runtime.searchOptions!('', 1)
  }
  return { ...page, papers }
}
