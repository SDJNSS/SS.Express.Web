<script setup lang="ts">
import { resourceElementAttributes, type ResourceElement } from '@shared/services/resourceElement'
import { Icon } from '@iconify/vue'

withDefaults(
  defineProps<{
    resource_element?: ResourceElement | undefined

    total?: number
    title?: string
    refreshing?: boolean
  }>(),
  { resource_element: undefined, total: 0, title: '', refreshing: false },
)

const emit = defineEmits<{
  refresh: []
}>()
</script>

<template>
  <div v-bind="resourceElementAttributes(resource_element)" class="table-toolbar">
    <div class="table-toolbar__summary">
      <strong v-if="title">{{ title }}</strong>
      <span>共 {{ total }} 条</span>
      <slot name="summary" />
    </div>
    <div class="table-toolbar__actions">
      <slot />
      <el-tooltip content="刷新数据" placement="top">
        <el-button
          v-resource-element="resource_element"
          class="icon-button"
          :loading="refreshing"
          aria-label="刷新数据"
          @click="emit('refresh')"
        >
          <Icon v-if="!refreshing" icon="mdi:refresh" width="18" aria-hidden="true" />
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: calc(var(--size-control) + var(--spacing-2));
  padding: 0 var(--spacing-3);
  border-bottom: 1px solid var(--border-light);
}

.table-toolbar__summary,
.table-toolbar__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.table-toolbar__summary {
  color: var(--text-regular);

  strong {
    color: var(--text-primary);
    font-weight: 600;
  }
}

.icon-button {
  width: var(--size-control);
  padding: 0;
}
</style>
