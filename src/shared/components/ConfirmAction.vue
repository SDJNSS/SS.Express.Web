<script setup lang="ts">
import { resourceElementAttributes, type ResourceElement } from '@shared/services/resourceElement'
withDefaults(
  defineProps<{
    resource_element?: ResourceElement | undefined

    title: string
    confirmButtonText?: string
    cancelButtonText?: string
  }>(),
  { resource_element: undefined, confirmButtonText: '确认', cancelButtonText: '取消' },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <el-popconfirm
    v-bind="resourceElementAttributes(resource_element)"
    :title="title"
    :confirm-button-text="confirmButtonText"
    :cancel-button-text="cancelButtonText"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  >
    <template #reference>
      <slot />
    </template>
  </el-popconfirm>
</template>
