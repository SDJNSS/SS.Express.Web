<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { UploadUserFile } from 'element-plus'
import ImageUploader from '@shared/components/ImageUploader.vue'
import type { UploadedAsset } from '@shared/services/fileTransfer'

const props = defineProps<{ fileId?: string | undefined; imageUrl: string; disabled?: boolean }>()
const emit = defineEmits<{
  'update:fileId': [value: string]
  'update:imageUrl': [value: string]
  'blocked-change': [value: boolean]
}>()
const files = ref<UploadUserFile[]>([])
const busy = ref(false)
// IAM resolves stored image references; uploads use the local file preview until saved.
const url = computed(() => props.imageUrl)
const reference = computed(() => props.fileId || props.imageUrl)
watch(
  [reference, url],
  () => {
    if (busy.value || files.value.some((file) => file.raw)) return
    files.value = reference.value
      ? [{ name: props.fileId || '已有图片', ...(url.value ? { url: url.value } : {}) }]
      : []
  },
  { immediate: true },
)
function uploaded(asset: UploadedAsset) {
  emit('update:fileId', asset.fileId)
  emit('update:imageUrl', '')
}
function remove() {
  emit('update:fileId', '')
  emit('update:imageUrl', '')
}
function blocked(value: boolean) {
  busy.value = value
  emit('blocked-change', value)
}
function changeUrl(value: string) {
  emit('update:fileId', '')
  emit('update:imageUrl', value)
  files.value = value ? [{ name: '已有图片', url: value }] : []
}
</script>
<template>
  <div class="image-asset-field">
    <ImageUploader
      v-model="files"
      :limit="1"
      :disabled="disabled"
      @uploaded="uploaded"
      @removed="remove"
      @blocked-change="blocked"
    />
    <p>支持 PNG、JPEG、WebP，单个文件不超过 20MB。上传后保存文件 ID。</p>
    <p v-if="fileId">文件 ID：{{ fileId }}</p>
    <el-input
      :model-value="imageUrl"
      :disabled="disabled || busy || Boolean(fileId)"
      placeholder="图片 URL 由信息接口返回；上传新图片后无需填写"
      @update:model-value="changeUrl"
    />
  </div>
</template>
<style scoped lang="scss">
.image-asset-field {
  width: 100%;
  min-width: 0;
}
.image-asset-field p {
  margin: var(--spacing-2) 0;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  overflow-wrap: anywhere;
}
</style>
