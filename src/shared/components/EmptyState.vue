<script setup lang="ts">
import { Icon } from '@iconify/vue'

withDefaults(defineProps<{ description?: string }>(), { description: '暂无数据' })
</script>

<template>
  <div class="empty-state" role="status">
    <Icon icon="mdi:inbox-outline" width="42" aria-hidden="true" />
    <p>{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  color: var(--text-disabled);

  p {
    margin: var(--spacing-2) 0 0;
  }
}
</style>
