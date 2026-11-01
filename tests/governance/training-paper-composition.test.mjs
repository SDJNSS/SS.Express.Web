import assert from 'node:assert/strict'
import test from 'node:test'
import {
  equalQuestionScore,
  scoreUnits,
  reconcileQuestions,
  hasUnequalScores,
} from '../../src/features/training/content-exam/adapters/paperComposition.ts'
const q = (id, type = 'SINGLE_CHOICE', score = 3.33) => ({
  questionId: id,
  type,
  score,
  stem: '题干',
  status: 'ACTIVE',
  order: id,
})
test('paper scores divide exactly at hundredth precision, without rounding or integer-points restriction', () => {
  assert.equal(equalQuestionScore(1, 4), 0.25)
  assert.equal(equalQuestionScore(9.99, 3), 3.33)
  assert.equal(equalQuestionScore(10, 3), undefined)
  assert.equal(equalQuestionScore(0, 1), undefined)
  assert.equal(equalQuestionScore(1, 0), undefined)
  assert.equal(scoreUnits(1.001), undefined)
  assert.equal(scoreUnits(NaN), undefined)
  assert.equal(scoreUnits(0.1 + 0.2), 30)
})
test('cross-type replacement resets exactly both affected groups and preserves unrelated scores', () => {
  const before = [q(1), q(2), q(3, 'MULTIPLE_CHOICE', 4), q(4, 'TRUE_FALSE', 7)]
  const next = reconcileQuestions(before, [q(1), q(5, 'MULTIPLE_CHOICE', 0), before[2], before[3]])
  assert.deepEqual(next.changedTypes, ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'])
  assert.deepEqual(
    next.questions.map((v) => v.score),
    [0, 0, 0, 7],
  )
  assert.deepEqual(
    next.questions.map((v) => v.order),
    [1, 2, 3, 4],
  )
})
test('same-type replacement keeps group score and invalid unequal scores are detected without averaging', () => {
  const result = reconcileQuestions([q(1), q(2)], [q(1), q(3, 'SINGLE_CHOICE', 0)])
  assert.deepEqual(result.changedTypes, [])
  assert.deepEqual(
    result.questions.map((v) => v.score),
    [3.33, 3.33],
  )
  assert.equal(hasUnequalScores([q(1, 'SINGLE_CHOICE', 1), q(2, 'SINGLE_CHOICE', 2)]), true)
  assert.equal(hasUnequalScores([q(1), q(2)]), false)
})
