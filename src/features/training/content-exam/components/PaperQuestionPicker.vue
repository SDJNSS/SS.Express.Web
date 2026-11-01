<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { ResourceElement } from '@shared/services/resourceElement'
import FormDrawer from '@shared/components/FormDrawer.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import { questionTypes, questionTypeNames } from '../adapters/paperComposition'
import type { FixedPaperQuestion, QuestionType } from '../types/trainingContent'
import type {
  QuestionChoice,
  QuestionChoicePage,
  QuestionChoiceQuery,
} from '../types/trainingContentRuntime'

const props = defineProps<{
  modelValue: boolean
  selected: FixedPaperQuestion[]
  replaceId?: number | undefined
  action: 'create' | 'update'
  choices: QuestionChoice[]
  loader?:
    ((query: QuestionChoiceQuery, signal: AbortSignal) => Promise<QuestionChoicePage>) | undefined
  resource_element: ResourceElement
  selectionElement: ResourceElement
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [questions: FixedPaperQuestion[]]
}>()
const tab = ref<QuestionType>('SINGLE_CHOICE')
const filters = reactive(
  Object.fromEntries(
    questionTypes.map((type) => [type, { keyword: '', committed: '', page: 1 }]),
  ) as Record<QuestionType, { keyword: string; committed: string; page: number }>,
)
const draft = ref<FixedPaperQuestion[]>([])
const replacement = ref<QuestionChoice>()
const items = ref<QuestionChoice[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
let generation = 0
let controller: AbortController | undefined
const columns: DataTableColumn[] = [
  { label: '选择', width: 64, slot: 'selection' },
  { prop: 'id', label: '题目 ID', width: 96 },
  { prop: 'stem', label: '完整题干', minWidth: 380, slot: 'stem' },
]
const filter = computed(() => filters[tab.value])
const count = computed(() => draft.value.length)
const dirty = computed(
  () =>
    Boolean(replacement.value) ||
    draft.value.map((q) => q.questionId).join() !== props.selected.map((q) => q.questionId).join(),
)
const replacing = computed(() => props.selected.find((q) => q.questionId === props.replaceId))

function asChoice(row: Record<string, unknown>) {
  return row as unknown as QuestionChoice
}
function checked(question: QuestionChoice) {
  return (
    draft.value.some((q) => q.questionId === question.id) || replacement.value?.id === question.id
  )
}
function disabled(question: QuestionChoice) {
  return Boolean(props.replaceId && draft.value.some((q) => q.questionId === question.id))
}
function toggle(question: QuestionChoice, value: boolean) {
  if (loading.value || disabled(question)) return
  if (props.replaceId) {
    replacement.value = value ? question : undefined
    return
  }
  if (value && !checked(question)) draft.value.push(toSelection(question))
  if (!value) draft.value = draft.value.filter((q) => q.questionId !== question.id)
}
function toSelection(question: QuestionChoice): FixedPaperQuestion {
  return {
    questionId: question.id,
    stem: question.stem,
    type: question.type,
    status: question.status,
    score: 0,
    order: 0,
    questionUpdatedAt: question.updatedAt,
  }
}
function cancelPending() {
  ++generation
  controller?.abort()
  controller = undefined
  loading.value = false
}
async function load() {
  cancelPending()
  const sequence = generation
  controller = new AbortController()
  const signal = controller.signal
  loading.value = true
  error.value = ''
  items.value = []
  const query = {
    keyword: filter.value.committed,
    page: filter.value.page,
    type: tab.value,
    action: props.action,
  }
  try {
    let result: QuestionChoicePage
    if (props.loader) result = await props.loader(query, signal)
    else {
      const matched = props.choices.filter(
        (q) =>
          q.status === 'ACTIVE' &&
          q.type === query.type &&
          q.stem.toLocaleLowerCase('zh-CN').includes(query.keyword.toLocaleLowerCase('zh-CN')),
      )
      result = {
        items: matched.slice((query.page - 1) * 20, query.page * 20),
        total: matched.length,
      }
    }
    if (sequence !== generation || signal.aborted || !props.modelValue) return
    total.value = result.total
    if (query.page > 1 && (query.page - 1) * 20 >= total.value) {
      filter.value.page = Math.max(1, Math.ceil(total.value / 20))
      await load()
      return
    }
    items.value = result.items
  } catch (reason) {
    if (sequence === generation && !signal.aborted)
      error.value = reason instanceof Error ? reason.message : '题目加载失败，请重试'
  } finally {
    if (sequence === generation) loading.value = false
  }
}
function search() {
  filter.value.committed = filter.value.keyword.trim()
  filter.value.page = 1
  void load()
}
function changeTab() {
  void load()
}
function confirm() {
  if (loading.value || error.value || (props.replaceId && !replacement.value)) return
  const next =
    props.replaceId && replacement.value
      ? draft.value.map((q) =>
          q.questionId === props.replaceId ? toSelection(replacement.value!) : q,
        )
      : draft.value
  emit(
    'confirm',
    next.map((q, index) => ({ ...q, order: index + 1 })),
  )
  emit('update:modelValue', false)
}
watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) {
      cancelPending()
      return
    }
    draft.value = props.selected.map((q) => ({ ...q }))
    replacement.value = undefined
    tab.value = replacing.value?.type ?? tab.value
    void load()
  },
)
onBeforeUnmount(cancelPending)
</script>

<template>
  <FormDrawer
    :model-value="modelValue"
    :title="replaceId ? '替换题目' : '选择题目'"
    :size="860"
    :resource_element="selectionElement"
    :dirty="dirty"
    :confirm-disabled="loading || !!error || (!!replaceId && !replacement)"
    confirm-button-text="确认选题"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="confirm"
  >
    <div class="question-picker">
      <p v-if="replacing">
        正在替换 #{{ replacing.questionId }}：{{
          replacing.stem
        }}。可跨题型替换，其他已选题目保持不变。
      </p>
      <p role="status" aria-live="polite">
        已选 {{ count }} 题{{
          replacement ? `；待替换为 #${replacement.id}` : ''
        }}。跨页、切换题型保留勾选，确认后才修改试卷。
      </p>
      <el-tabs v-model="tab" v-resource-element="resource_element" @tab-change="changeTab">
        <el-tab-pane
          v-for="type in questionTypes"
          :key="type"
          :name="type"
          :label="questionTypeNames[type]"
        />
      </el-tabs>
      <div class="question-picker__search">
        <el-input
          v-model="filter.keyword"
          v-resource-element="resource_element"
          aria-label="题干关键词"
          placeholder="搜索当前题型的题干"
          clearable
          @clear="search"
          @keyup.enter="!$event.isComposing && search()"
        />
        <el-button
          v-resource-element="resource_element"
          type="primary"
          :loading="loading"
          @click="search"
          >搜索题目</el-button
        >
      </div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon>
        <el-button v-resource-element="resource_element" @click="load">重新加载题目</el-button>
      </el-alert>
      <DataTable
        :resource_element="resource_element"
        :columns="columns"
        :data="items"
        :loading="loading"
        row-key="id"
        empty-description="当前题型暂无匹配的启用题目，可修改关键词或切换题型"
      >
        <template #selection="{ row }">
          <el-checkbox
            v-resource-element="selectionElement"
            :model-value="checked(asChoice(row))"
            :disabled="loading || disabled(asChoice(row))"
            :aria-label="`选择题目 ${row.id}`"
            @change="toggle(asChoice(row), Boolean($event))"
          />
        </template>
        <template #stem="{ row }"
          ><span class="question-picker__stem">{{ row.stem }}</span></template
        >
      </DataTable>
      <AppPagination
        :page="filter.page"
        :page-size="20"
        :page-sizes="[20]"
        :total="total"
        :resource_element="resource_element"
        @update:page="filter.page = $event"
        @change="load"
      />
    </div>
  </FormDrawer>
</template>

<style scoped lang="scss">
.question-picker {
  display: grid;
  gap: var(--spacing-2);
}
.question-picker p {
  margin: 0;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.question-picker__search {
  display: flex;
  gap: var(--spacing-2);
}
.question-picker__stem {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
