<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

withDefaults(
  defineProps<{
    ariaLabel?: string
    density?: 'default' | 'compact'
  }>(),
  {
    ariaLabel: '行操作',
    density: 'compact',
  },
)

const grid = ref<HTMLElement>()
const columns = ref(1)
let observer: MutationObserver | undefined

function updateColumns() {
  const visibleCount = Array.from(grid.value?.children ?? []).filter(
    (child) =>
      child instanceof HTMLElement && !child.hidden && getComputedStyle(child).display !== 'none',
  ).length
  columns.value = Math.max(1, Math.min(3, visibleCount))
}

onMounted(() => {
  updateColumns()
  observer = new MutationObserver(updateColumns)
  if (grid.value)
    observer.observe(grid.value, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'style', 'class'],
    })
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div
    ref="grid"
    class="row-action-grid"
    :style="{ gridTemplateColumns: `repeat(${columns}, max-content)` }"
    :class="{ 'row-action-grid--compact': density === 'compact' }"
    role="group"
    :aria-label="ariaLabel"
  >
    <slot />
  </div>
</template>

<style scoped>
.row-action-grid {
  display: inline-grid;
  width: max-content;
  align-items: center;
  justify-content: start;
  row-gap: 0;
  column-gap: var(--spacing-1);
  min-width: 0;
}

.row-action-grid :deep(.el-button) {
  justify-self: start;
  margin-left: 0;
}

.row-action-grid :deep(.el-button.is-link) {
  height: auto;
  min-height: var(--spacing-6);
  padding: 0;
}

.row-action-grid :deep([hidden]) {
  display: none !important;
}
</style>
