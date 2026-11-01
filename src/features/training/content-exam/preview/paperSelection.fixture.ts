import type { PaperPreviewGenerator } from '../types/trainingContentRuntime'
import { trainingContentFixture } from './trainingContent.fixture'

// Extra candidates exercise cross-page selection, full stems and replacement in Preview only.
export const paperQuestionChoices = [
  ...trainingContentFixture.questions,
  ...Array.from({ length: 24 }, (_, index) => ({
    ...trainingContentFixture.questions[0]!,
    id: 2200 + index,
    stem: `安全培训选题演示 ${index + 1}：出车前逐项检查车辆与运输单证，确认安全条件后方可执行运输任务。`,
  })),
]

export const generatePaperFixture: PaperPreviewGenerator = async (rules) => {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 240))
  return rules.flatMap((rule) => {
    const candidates = paperQuestionChoices.filter(
      (q) => q.type === rule.type && q.status === 'ACTIVE',
    )
    if (rule.count > candidates.length) throw new Error('可用题目不足，请调整题量')
    // Deterministic sample: the canonical view must not perform real random selection.
    return candidates.slice(0, rule.count).map((q) => ({
      questionId: q.id,
      stem: q.stem,
      type: q.type,
      status: q.status,
      score: rule.scorePerQuestion,
      order: 0,
      questionUpdatedAt: q.updatedAt,
    }))
  })
}
