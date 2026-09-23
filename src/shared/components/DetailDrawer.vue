<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    size?: string | number
  }>(),
  { size: 640 },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    :title="title"
    :size="size"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <slot />
  </el-drawer>
</template>
