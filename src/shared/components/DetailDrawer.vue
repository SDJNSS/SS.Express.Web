<script setup lang="ts">
import { resourceElementAttributes, type ResourceElement } from '@shared/services/resourceElement'
withDefaults(
  defineProps<{
    resource_element?: ResourceElement | undefined

    modelValue: boolean
    title: string
    size?: string | number
  }>(),
  { resource_element: undefined, size: 640 },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <el-drawer
    v-bind="resourceElementAttributes(resource_element)"
    :model-value="modelValue"
    :title="title"
    :size="size"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <slot />
  </el-drawer>
</template>
