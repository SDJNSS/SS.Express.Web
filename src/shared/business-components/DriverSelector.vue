<script setup lang="ts">
import { useLookupOptions } from '@shared/composables/useLookupOptions'

defineProps<{ modelValue?: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { loading, options, search } = useLookupOptions('driver')
</script>

<template>
  <el-select
    :model-value="modelValue"
    :disabled="disabled"
    :loading="loading"
    filterable
    remote
    clearable
    placeholder="请选择司机"
    :remote-method="search"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :label="option.label"
    >
      <span>{{ option.label }}</span
      ><small>{{ option.secondary }}</small>
    </el-option>
  </el-select>
</template>

<style scoped>
small {
  float: right;
  color: var(--text-secondary);
}
</style>
