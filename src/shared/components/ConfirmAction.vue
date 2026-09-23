<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    confirmButtonText?: string
    cancelButtonText?: string
  }>(),
  { confirmButtonText: '确认', cancelButtonText: '取消' },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <el-popconfirm
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
