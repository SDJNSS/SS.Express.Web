<script setup lang="ts">
import PagedEntitySelect from '@shared/components/PagedEntitySelect.vue'
import type { OrganizationLeaderLoader } from '../types/organizationLeader'

defineProps<{
  modelValue?: number | undefined
  selectedLabel?: string | undefined
  scopeKey: string
  active: boolean
  disabled?: boolean
  clearOnly?: boolean
  loadOptions?: OrganizationLeaderLoader | undefined
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number | undefined] }>()
</script>

<template>
  <div class="organization-leader-selector">
    <PagedEntitySelect
      :model-value="modelValue"
      :selected-label="selectedLabel"
      :scope-key="scopeKey"
      :active="active"
      :disabled="disabled"
      :clear-only="clearOnly"
      :load-options="loadOptions"
      label="组织负责人"
      :placeholder="clearOnly ? '未设置负责人' : '搜索姓名或登录账号（可不选）'"
      empty-text="没有匹配的当前有效用户"
      retry-text="重试加载负责人"
      loading-text="正在加载负责人候选"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <small class="organization-leader-selector__hint">{{
      clearOnly
        ? '组织已停用，仅允许保留或清空现有负责人。'
        : '仅可选择当前租户的有效用户；设置负责人不会改变其组织归属。'
    }}</small>
  </div>
</template>

<style scoped lang="scss">
.organization-leader-selector {
  display: grid;
  gap: var(--spacing-1);
  width: 100%;
  min-width: 0;
}
.organization-leader-selector__hint {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}
</style>
