<script setup lang="ts">
withDefaults(
  defineProps<{
    ariaLabel?: string
    density?: 'default' | 'compact'
  }>(),
  {
    ariaLabel: '行操作',
    density: 'default',
  },
)
</script>

<template>
  <div
    class="row-action-grid"
    :class="{ 'row-action-grid--compact': density === 'compact' }"
    role="group"
    :aria-label="ariaLabel"
  >
    <slot />
  </div>
</template>

<style scoped>
.row-action-grid {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  align-items: center;
  justify-content: start;
  row-gap: var(--spacing-1);
  column-gap: var(--spacing-2);
  min-width: 0;
}

.row-action-grid :deep(.el-button) {
  justify-self: start;
  margin-left: 0;
}

.row-action-grid :deep([hidden]) {
  display: none !important;
}

.row-action-grid--compact {
  row-gap: 0;
  column-gap: var(--spacing-1);
}

.row-action-grid--compact :deep(.el-button.is-link) {
  height: auto;
  min-height: var(--spacing-6);
  padding: 0;
}
</style>
