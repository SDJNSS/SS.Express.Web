<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    width?: string | number
    submitting?: boolean
    confirmDisabled?: boolean
    confirmButtonText?: string
    cancelButtonText?: string
    confirmType?: 'primary' | 'success' | 'warning' | 'danger'
  }>(),
  {
    width: 560,
    submitting: false,
    confirmDisabled: false,
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    confirmType: 'primary',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <slot />
    <template #footer>
      <slot name="footer">
        <el-button :disabled="submitting" @click="emit('update:modelValue', false)">{{
          cancelButtonText
        }}</el-button>
        <el-button
          :type="confirmType"
          :disabled="confirmDisabled || submitting"
          :loading="submitting"
          @click="emit('confirm')"
          >{{ confirmButtonText }}</el-button
        >
      </slot>
    </template>
  </el-dialog>
</template>
