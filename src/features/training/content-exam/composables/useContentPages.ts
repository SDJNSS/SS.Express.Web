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
import type { PaperRecord, QuestionRecord, QuestionType } from '../types/trainingContent'
import { useTrainingContent } from './useTrainingContent'

export function useCourseManagement() {
  return useTrainingContent({
    api: trainingContentApi.courses,
    map: mapCourse,
    payload: coursePayload,
    permissions: CONTENT_PERMISSIONS.courses,
  })
}
export function useQuestionBank() {
  return useTrainingContent({
    api: trainingContentApi.questions,
    map: mapQuestion,
    payload: questionPayload,
    permissions: CONTENT_PERMISSIONS.questions,
  })
}
export function usePaperManagement() {
  const page = useTrainingContent({
    api: trainingContentApi.papers,
    map: mapPaper,
    payload: paperPayload,
    permissions: CONTENT_PERMISSIONS.papers,
  })
  const questions = shallowRef<QuestionRecord[]>([])
  let searchSequence = 0
  page.runtime.optionsTotal = 0
  page.runtime.optionsPage = 1
  page.runtime.optionsLoading = false
  page.runtime.questionCounts = {}
  page.runtime.searchOptions = async (keyword, index = 1) => {
    const started = page.requestContext()
    page.assertAccess('view', started)
    const sequence = ++searchSequence
    page.runtime.optionsLoading = true
    try {
      const result = await trainingContentApi.questions.query({
        page_index: index,
        page_size: 20,
        status: 'ACTIVE',
        keyword: keyword.trim(),
      })
      page.assertAccess('view', started)
      if (sequence !== searchSequence) return
      questions.value = result.items.map(mapQuestion)
      page.runtime.optionsTotal = result.total
      page.runtime.optionsPage = index
    } finally {
      if (sequence === searchSequence) page.runtime.optionsLoading = false
    }
  }
  page.runtime.prepareForm = async () => {
    const started = page.requestContext()
    const types: QuestionType[] = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']
    const [, counts] = await Promise.all([
      page.runtime.searchOptions!('', 1),
      Promise.all(
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
      ),
    ])
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
