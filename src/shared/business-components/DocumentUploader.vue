<script setup lang="ts">
import type { UploadUserFile } from 'element-plus'
import FileUploader from '@shared/components/FileUploader.vue'
import type { UploadedAsset } from '@shared/services/fileTransfer'

defineProps<{ modelValue: UploadUserFile[]; documentType?: 'license' | 'contract' | 'receipt' }>()
const emit = defineEmits<{
  'update:modelValue': [files: UploadUserFile[]]
  uploaded: [asset: UploadedAsset]
  'blocked-change': [blocked: boolean]
}>()
</script>

<template>
  <div class="document-uploader">
    <FileUploader
      :model-value="modelValue"
      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
      :limit="8"
      @update:model-value="emit('update:modelValue', $event)"
      @uploaded="emit('uploaded', $event)"
      @blocked-change="emit('blocked-change', $event)"
    />
    <p>支持证照、合同与回单；提交前请确认文件清晰且在有效期内。</p>
  </div>
</template>

<style scoped lang="scss">
.document-uploader p {
  margin: var(--spacing-2) 0 0;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}
</style>
