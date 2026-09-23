<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  DEFAULT_TABLE_CELL_MAX_CHARACTERS,
  truncateTableCellText,
} from '@shared/utils/tableText.mjs'

const props = withDefaults(
  defineProps<{
    value: unknown
    maxCharacters?: number | false
  }>(),
  {
    maxCharacters: DEFAULT_TABLE_CELL_MAX_CHARACTERS,
  },
)

const textElement = ref<HTMLElement>()
const visuallyOverflowing = ref(false)
const truncation = computed(() => truncateTableCellText(props.value, props.maxCharacters))
const needsTooltip = computed(
  () =>
    truncation.value.fullText.length > 0 &&
    (truncation.value.truncated || visuallyOverflowing.value),
)

let resizeObserver: ResizeObserver | undefined

function measureOverflow() {
  const element = textElement.value
  visuallyOverflowing.value = Boolean(element && element.scrollWidth > element.clientWidth)
}

onMounted(() => {
  void nextTick(measureOverflow)
  if (typeof ResizeObserver === 'undefined') return

  resizeObserver = new ResizeObserver(measureOverflow)
  if (textElement.value) resizeObserver.observe(textElement.value)
})

watch(
  () => [truncation.value.displayText, props.maxCharacters],
  () => void nextTick(measureOverflow),
)

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <el-tooltip
    :content="truncation.fullText"
    :disabled="!needsTooltip"
    placement="top"
    :show-after="300"
  >
    <span
      ref="textElement"
      class="table-cell-text"
      :class="{ 'table-cell-text--truncated': needsTooltip }"
      :tabindex="needsTooltip ? 0 : undefined"
      :aria-label="needsTooltip ? truncation.fullText : undefined"
      :data-full-text="needsTooltip ? truncation.fullText : undefined"
      >{{ truncation.displayText }}</span
    >
  </el-tooltip>
</template>

<style scoped lang="scss">
.table-cell-text {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-cell-text--truncated:focus-visible {
  border-radius: var(--radius-small);
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}
</style>
