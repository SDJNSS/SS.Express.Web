<script setup lang="ts">
import { useLookupOptions } from '@shared/composables/useLookupOptions'

defineProps<{ modelValue?: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { loading, options, search } = useLookupOptions('customer')
</script>

<template>
  <el-select
    :model-value="modelValue"
    :disabled="disabled"
    :loading="loading"
    filterable
    remote
    clearable
    placeholder="请选择客户"
    :remote-method="search"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :label="option.label"
    />
  </el-select>
</template>
