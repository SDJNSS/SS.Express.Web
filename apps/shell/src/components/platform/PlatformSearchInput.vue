<template>
  <div
    class="platform-search-input"
    :class="[`variant-${variant}`, { open: isPanelVisible }]"
  >
    <label class="platform-search-input__field">
      <span class="platform-search-input__icon" aria-hidden="true"></span>
      <input
        type="search"
        role="combobox"
        :aria-activedescendant="activeDescendantId"
        aria-autocomplete="list"
        :aria-controls="resultListId"
        :aria-expanded="isPanelVisible"
        aria-haspopup="listbox"
        :aria-label="ariaLabel"
        :placeholder="placeholder"
        :readonly="readonly"
        :value="inputValue"
        autocomplete="off"
        @blur="handleBlur"
        @focus="handleFocus"
        @input="handleInput"
        @keydown.down.prevent="moveActiveResult(1)"
        @keydown.enter.prevent="handleEnter"
        @keydown.esc="closePanel"
        @keydown.up.prevent="moveActiveResult(-1)"
      />
      <kbd v-if="shortcut">{{ shortcut }}</kbd>
    </label>

    <div v-if="isPanelVisible" class="platform-search-input__panel">
      <ul
        v-if="results.length > 0"
        :id="resultListId"
        class="platform-search-input__results"
        role="listbox"
      >
        <li
          v-for="(result, index) in results"
          :id="getResultId(index)"
          :key="result.key"
          class="platform-search-input__result"
          :class="{ active: activeResultIndex === index }"
          role="option"
          :aria-selected="activeResultIndex === index"
          @mousedown.prevent="selectResult(result)"
          @mouseenter="activeResultIndex = index"
        >
          <span>
            <strong>{{ result.title }}</strong>
            <small v-if="result.description">{{ result.description }}</small>
          </span>
          <em>{{ result.actionLabel ?? '打开' }}</em>
        </li>
      </ul>

      <div v-else-if="showEmptyState" class="platform-search-input__empty">
        未找到相关结果
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PlatformSearchResult } from '@/types/platform'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  ariaLabel?: string
  readonly?: boolean
  shortcut?: string
  variant?: 'toolbar' | 'sidebar' | 'compact'
  results?: PlatformSearchResult[]
  searchThreshold?: number
  showEmptyState?: boolean
}>(), {
  modelValue: '',
  placeholder: '搜索',
  ariaLabel: '搜索',
  readonly: false,
  variant: 'toolbar',
  results: () => [],
  searchThreshold: 1,
  showEmptyState: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
  'result-select': [result: PlatformSearchResult]
}>()

const inputValue = ref(props.modelValue)
const isFocused = ref(false)
const activeResultIndex = ref(-1)
const resultListId = `platform-search-results-${Math.random().toString(36).slice(2, 9)}`

const normalizedQuery = computed(() => inputValue.value.trim())
const hasReachedSearchThreshold = computed(() => normalizedQuery.value.length > props.searchThreshold)
const results = computed(() => props.results)
const isPanelVisible = computed(() => {
  return isFocused.value && hasReachedSearchThreshold.value && (results.value.length > 0 || props.showEmptyState)
})
const activeDescendantId = computed(() => {
  return activeResultIndex.value >= 0 ? getResultId(activeResultIndex.value) : undefined
})
const showEmptyState = computed(() => hasReachedSearchThreshold.value && props.showEmptyState)

watch(() => props.modelValue, value => {
  if (value !== inputValue.value) inputValue.value = value
})

watch(normalizedQuery, query => {
  activeResultIndex.value = -1
  if (query.length > props.searchThreshold) emit('search', query)
})

watch(results, value => {
  activeResultIndex.value = value.length > 0 ? 0 : -1
})

const getResultId = (index: number) => `${resultListId}-option-${index}`

const closePanel = () => {
  isFocused.value = false
  activeResultIndex.value = -1
}

const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  window.setTimeout(closePanel, 120)
}

const handleInput = (event: Event) => {
  inputValue.value = (event.target as HTMLInputElement).value
  emit('update:modelValue', inputValue.value)
}

const moveActiveResult = (offset: number) => {
  if (!isPanelVisible.value || results.value.length === 0) return

  const nextIndex = activeResultIndex.value + offset
  if (nextIndex < 0) {
    activeResultIndex.value = results.value.length - 1
    return
  }

  activeResultIndex.value = nextIndex % results.value.length
}

const selectResult = (result: PlatformSearchResult) => {
  inputValue.value = result.title
  emit('update:modelValue', result.title)
  emit('result-select', result)
  closePanel()
}

const handleEnter = () => {
  if (isPanelVisible.value && activeResultIndex.value >= 0) {
    selectResult(results.value[activeResultIndex.value])
    return
  }

  if (hasReachedSearchThreshold.value) emit('search', normalizedQuery.value)
}
</script>

<style scoped>
.platform-search-input {
  position: relative;
  width: 100%;
  min-width: 0;
}

.platform-search-input__field {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  border: 1px solid #e3e5eb;
  background: #f7f8fa;
  color: #6c717c;
  padding: 0 12px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.platform-search-input.open .platform-search-input__field,
.platform-search-input__field:focus-within {
  border-color: #c7b9ff;
  box-shadow: 0 0 0 3px rgba(125, 85, 238, 0.12);
}

.platform-search-input.variant-toolbar .platform-search-input__field {
  height: 40px;
  border-radius: 20px;
}

.platform-search-input.variant-sidebar {
  margin-bottom: 18px;
}

.platform-search-input.variant-sidebar .platform-search-input__field {
  height: 36px;
  border-radius: 18px;
  background: #fff;
}

.platform-search-input.variant-compact .platform-search-input__field {
  height: 34px;
  border-radius: 17px;
  background: #fff;
}

.platform-search-input__icon {
  position: relative;
  flex: 0 0 15px;
  width: 15px;
  height: 15px;
  margin-right: 8px;
  border: 2px solid #838894;
  border-radius: 50%;
}

.platform-search-input__icon::after {
  position: absolute;
  right: -6px;
  bottom: -5px;
  width: 7px;
  height: 2px;
  border-radius: 2px;
  background: #838894;
  content: '';
  transform: rotate(45deg);
}

input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #333846;
  font: inherit;
}

input::placeholder {
  color: #7c828d;
}

kbd {
  display: grid;
  flex: 0 0 22px;
  height: 22px;
  place-items: center;
  border: 1px solid #ebedf2;
  border-radius: 6px;
  background: #fff;
  color: #7a7f89;
  font-family: inherit;
  font-size: 11px;
}

.platform-search-input__panel {
  position: absolute;
  z-index: 20;
  top: calc(100% + 8px);
  left: 0;
  width: min(420px, 100%);
  overflow: hidden;
  border: 1px solid #e5e7ee;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
}

.platform-search-input__results {
  display: grid;
  max-height: 320px;
  margin: 0;
  overflow: auto;
  padding: 6px;
  list-style: none;
}

.platform-search-input__result {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  border-radius: 10px;
  color: #20242d;
  cursor: pointer;
  padding: 8px 10px;
}

.platform-search-input__result.active,
.platform-search-input__result:hover {
  background: #f4f1ff;
}

.platform-search-input__result strong,
.platform-search-input__result small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.platform-search-input__result strong {
  font-size: 14px;
  font-weight: 800;
}

.platform-search-input__result small {
  margin-top: 3px;
  color: #777d88;
  font-size: 12px;
}

.platform-search-input__result em {
  border-radius: 999px;
  background: #f7f8fa;
  color: #6b45dc;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
  padding: 4px 8px;
}

.platform-search-input__empty {
  color: #777d88;
  font-size: 13px;
  padding: 14px;
}

@media (max-width: 760px) {
  .platform-search-input__panel {
    width: 100%;
  }
}
</style>
