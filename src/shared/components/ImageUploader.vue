<script setup lang="ts">
import type { UploadUserFile } from 'element-plus'
import FileUploader from './FileUploader.vue'
import type { UploadedAsset } from '@shared/services/fileTransfer'

withDefaults(
  defineProps<{
    modelValue: UploadUserFile[]
    limit?: number
    disabled?: boolean
  }>(),
  { limit: 4, disabled: false },
)

const emit = defineEmits<{
  'update:modelValue': [files: UploadUserFile[]]
  uploaded: [asset: UploadedAsset]
  removed: []
  'blocked-change': [blocked: boolean]
}>()
</script>

<template>
  <FileUploader
    list-type="picture-card"
    accept="image/png,image/jpeg,image/webp"
    :model-value="modelValue"
    :limit="limit"
    :disabled="disabled"
    :show-tip="false"
    category="IMAGE"
    @update:model-value="emit('update:modelValue', $event)"
    @uploaded="emit('uploaded', $event)"
    @removed="emit('removed')"
    @blocked-change="emit('blocked-change', $event)"
  >
    <span class="image-uploader__add" aria-label="选择图片">+</span>
  </FileUploader>
</template>

<style scoped lang="scss">
.image-uploader__add {
  color: var(--text-secondary);
  font-size: var(--font-size-metric);
}
</style>
