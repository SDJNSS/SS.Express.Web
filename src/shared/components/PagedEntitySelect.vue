<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import type { PagedEntityLoader, PagedEntityOption } from '@shared/types/pagedOptions'

const props = defineProps<{
  modelValue?: number | undefined
  selectedLabel?: string | undefined
  scopeKey: string
  active: boolean
  disabled?: boolean
  clearOnly?: boolean
  loadOptions?: PagedEntityLoader | undefined
  placeholder?: string
  emptyText?: string
  label?: string
  retryText?: string
  loadingText?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number | undefined] }>()
const PAGE_SIZE = 20
const SEARCH_DELAY = 300
const options = ref<PagedEntityOption[]>([])
const chosen = ref<PagedEntityOption>()
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const pageIndex = ref(1)
const total = ref(0)
const popupOpen = ref(false)
let generation = 0
let controller: AbortController | undefined
let timer: ReturnType<typeof setTimeout> | undefined

const displayOptions = computed(() => {
  const selected = chosen.value?.id === props.modelValue ? chosen.value : undefined
  return selected && !options.value.some((item) => item.id === selected.id)
    ? [selected, ...options.value]
    : options.value
})
const resolvedEmptyText = computed(() =>
  error.value ? '选项加载失败，请重试' : props.emptyText || '没有匹配的可选项',
)

function invalidate() {
  generation += 1
  controller?.abort()
  controller = undefined
  if (timer) clearTimeout(timer)
  timer = undefined
  loading.value = false
}

async function query() {
  invalidate()
  if (!props.active || !popupOpen.value || props.clearOnly || !props.loadOptions) return
  const requestGeneration = generation
  const current = new AbortController()
  controller = current
  loading.value = true
  error.value = ''
  try {
    const result = await props.loadOptions({
      keyword: keyword.value,
      pageIndex: pageIndex.value,
      pageSize: PAGE_SIZE,
      signal: current.signal,
    })
    if (requestGeneration !== generation || current.signal.aborted) return
    options.value = result.items
    total.value = result.total
    const selected = result.items.find((item) => item.id === props.modelValue)
    if (selected) chosen.value = selected
  } catch {
    if (requestGeneration !== generation || current.signal.aborted) return
    error.value = '选项加载失败，请重试。已选内容已保留。'
  } finally {
    if (requestGeneration === generation) loading.value = false
  }
}

function search(value: string) {
  invalidate()
  keyword.value = value.trim()
  pageIndex.value = 1
  options.value = []
  total.value = 0
  error.value = ''
  if (!keyword.value) void query()
  else timer = setTimeout(() => void query(), SEARCH_DELAY)
}

function changePage(page: number) {
  pageIndex.value = page
  options.value = []
  void query()
}

function changeVisibility(visible: boolean) {
  popupOpen.value = visible
  if (visible) void query()
  else invalidate()
}

function change(value: number | undefined) {
  if (props.disabled) return
  if (!value) {
    chosen.value = undefined
    emit('update:modelValue', undefined)
    return
  }
  if (props.clearOnly) return
  const option = options.value.find((item) => item.id === value)
  if (!option) return
  chosen.value = option
  emit('update:modelValue', value)
}

watch(
  [() => props.active, () => props.scopeKey, () => props.clearOnly],
  (current, previous) => {
    invalidate()
    options.value = []
    keyword.value = ''
    total.value = 0
    pageIndex.value = 1
    error.value = ''
    if (previous.length && current[1] !== previous[1]) emit('update:modelValue', undefined)
    chosen.value = props.modelValue
      ? {
          id: props.modelValue,
          label: props.selectedLabel || '当前选项',
        }
      : undefined
  },
  { immediate: true },
)
watch([() => props.modelValue, () => props.selectedLabel], () => {
  if (!props.modelValue) chosen.value = undefined
  else if (chosen.value?.id !== props.modelValue)
    chosen.value = {
      id: props.modelValue,
      label: props.selectedLabel || '当前选项',
    }
})
onBeforeUnmount(invalidate)
</script>

<template>
  <div class="paged-entity-select">
    <el-select
      :model-value="modelValue || undefined"
      :disabled="disabled"
      :loading="loading"
      :filterable="!clearOnly"
      remote
      remote-show-suffix
      clearable
      :fit-input-width="true"
      :debounce="0"
      :remote-method="search"
      :aria-label="label || '选择对象'"
      :placeholder="placeholder || '搜索并选择（可清空）'"
      :no-data-text="resolvedEmptyText"
      :no-match-text="resolvedEmptyText"
      :loading-text="loadingText || '正在加载选项'"
      @visible-change="changeVisibility"
      @update:model-value="change"
    >
      <template #empty>
        <p class="paged-entity-select__empty" role="status">
          {{ loading ? loadingText || '正在加载选项' : resolvedEmptyText }}
        </p>
      </template>
      <el-option
        v-for="option in displayOptions"
        :key="option.id"
        :value="option.id"
        :label="option.label"
        :aria-label="option.description ? `${option.label} ${option.description}` : option.label"
        :disabled="clearOnly || loading || !options.some((item) => item.id === option.id)"
      >
        <span>{{ option.label }}</span>
        <span v-if="option.description" class="paged-entity-select__description">{{
          option.description
        }}</span>
      </el-option>
      <template v-if="!clearOnly && loadOptions" #footer>
        <div class="paged-entity-select__footer">
          <span v-if="error" role="alert">{{ error }}</span>
          <span v-else-if="!loading && !options.length && modelValue" role="status">{{
            resolvedEmptyText
          }}</span>
          <el-button v-if="error" link type="primary" :disabled="loading" @click.stop="query">{{
            retryText || '重试加载选项'
          }}</el-button>
          <el-pagination
            v-if="total > PAGE_SIZE"
            :current-page="pageIndex"
            :page-size="PAGE_SIZE"
            :total="total"
            :disabled="loading"
            layout="total, prev, next"
            size="small"
            @current-change="changePage"
          />
        </div>
      </template>
    </el-select>
  </div>
</template>

<style scoped lang="scss">
.paged-entity-select {
  display: grid;
  gap: var(--spacing-1);
  width: 100%;
  min-width: 0;
}
.paged-entity-select__description {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  margin-left: var(--spacing-2);
}
.paged-entity-select__footer {
  display: grid;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  white-space: normal;
}
.paged-entity-select__empty {
  margin: 0;
  padding: var(--spacing-3);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
}
</style>
