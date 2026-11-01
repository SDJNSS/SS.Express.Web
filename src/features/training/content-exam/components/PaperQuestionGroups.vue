<script setup lang="ts">
import type { ResourceElement } from '@shared/services/resourceElement'
import type { FixedPaperQuestion, QuestionType } from '../types/trainingContent'
const props = defineProps<{
  groups: {
    type: QuestionType
    name: string
    questions: FixedPaperQuestion[]
    total: number | undefined
    perScore: number | undefined
    invalid: boolean
  }[]
  resource_element: ResourceElement
  queryElement: ResourceElement
}>()
const emit = defineEmits<{
  total: [type: QuestionType, value: number | undefined]
  remove: [id: number]
  replace: [id: number]
  move: [id: number, offset: number]
}>()
</script>
<template>
  <p v-if="!groups.length" class="question-groups__empty">尚未选择题目，请点击“选择题目”。</p>
  <section
    v-for="group in props.groups"
    :key="group.type"
    class="question-group"
    :aria-label="`${group.name}分组`"
  >
    <header class="question-group__header">
      <h4>{{ group.name }} · {{ group.questions.length }} 题</h4>
      <template v-if="group.questions.length">
        <label :for="`group-score-${group.type}`">题型总分</label>
        <el-input-number
          :id="`group-score-${group.type}`"
          v-resource-element="resource_element"
          :model-value="group.total"
          :min="0.01"
          :max="1000000"
          :precision="2"
          :step="1"
          controls-position="right"
          :aria-label="`${group.name}总分`"
          @update:model-value="emit('total', group.type, $event ?? undefined)"
        />
        <span>每题 {{ group.perScore ?? '—' }} 分</span>
      </template>
    </header>
    <p v-if="group.invalid" class="question-group__error" role="alert">
      请设置题型总分，须能按题数精确均分至两位小数，不做四舍五入。
    </p>
    <table class="training-rule-table">
      <thead>
        <tr>
          <th>题目 ID / 完整题干</th>
          <th>分值</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(question, index) in group.questions" :key="question.questionId">
          <td class="question-group__stem">
            <small
              >#{{ question.questionId
              }}{{ question.status !== 'ACTIVE' ? ' · 原有停用题目' : '' }}</small
            >
            <div>{{ question.stem }}</div>
          </td>
          <td>
            <span>{{ question.score || '—' }}</span>
          </td>
          <td>
            <div class="question-group__actions">
              <el-button
                v-resource-element="queryElement"
                link
                type="primary"
                :aria-label="`替换题目 ${question.questionId}`"
                @click="emit('replace', question.questionId)"
                >替换</el-button
              >
              <el-button
                v-resource-element="resource_element"
                link
                type="danger"
                :aria-label="`移除题目 ${question.questionId}`"
                @click="emit('remove', question.questionId)"
                >移除</el-button
              >
              <el-button
                v-resource-element="resource_element"
                link
                :disabled="index === 0"
                :aria-label="`上移题目 ${question.questionId}`"
                @click="emit('move', question.questionId, -1)"
                >上移</el-button
              >
              <el-button
                v-resource-element="resource_element"
                link
                :disabled="index === group.questions.length - 1"
                :aria-label="`下移题目 ${question.questionId}`"
                @click="emit('move', question.questionId, 1)"
                >下移</el-button
              >
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
<style scoped lang="scss">
@use '../styles/training-content.scss';
.question-group {
  display: grid;
  gap: var(--spacing-2);
  min-width: 0;
}
.question-group__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
}
.question-group__header h4 {
  margin: 0 auto 0 0;
  font-size: var(--font-size-base);
}
.question-group__header span,
.question-group__stem small,
.question-groups__empty {
  color: var(--text-secondary);
}
.question-group__error {
  margin: 0;
  color: var(--color-danger);
}
.question-group__stem {
  width: 65%;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.question-group__actions {
  display: grid;
  grid-template-columns: repeat(2, max-content);
  gap: 0 var(--spacing-1);
}
.question-group__actions .el-button {
  margin: 0;
}
</style>
