<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: '数据加载中…' })
</script>

<template>
  <div class="loading-state" role="status" aria-live="polite">
    <span class="loading-state__spinner" aria-hidden="true" />
    <span>{{ label }}</span>
  </div>
</template>

<style scoped lang="scss">
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  min-height: 160px;
  color: var(--text-secondary);
}

.loading-state__spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border-default);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
