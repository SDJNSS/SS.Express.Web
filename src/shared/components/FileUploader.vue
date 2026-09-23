<script setup lang="ts">
import { computed, inject, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { UploadProps, UploadUserFile } from 'element-plus'
import { fileTransferKey, type UploadedAsset } from '@shared/services/fileTransfer'

const props = withDefaults(
  defineProps<{
    modelValue: UploadUserFile[]
    accept?: string
    limit?: number
    maxSizeMb?: number
    category?: string
    listType?: 'text' | 'picture-card'
    showTip?: boolean
    disabled?: boolean
  }>(),
  {
    accept: '',
    limit: 5,
    maxSizeMb: 20,
    category: '',
    listType: 'text',
    showTip: true,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [files: UploadUserFile[]]
  uploaded: [asset: UploadedAsset]
  removed: []
  'blocked-change': [blocked: boolean]
}>()

const gateway = inject(fileTransferKey, undefined)
type Task = ReturnType<NonNullable<typeof gateway>['createTask']>
interface Job {
  uid: number
  name: string
  state: 'uploading' | 'error' | 'cancelled' | 'success'
  percent: number
  determinate: boolean
  message: string
  task?: Task
  controller?: AbortController
}
const jobs = reactive(new Map<number, Job>())
const files = ref<UploadUserFile[]>([])
const validation = ref('')
let disposed = false
const blocked = computed(
  () => Boolean(gateway) && [...jobs.values()].some((job) => job.state !== 'success'),
)
const uploading = computed(() => [...jobs.values()].some((job) => job.state === 'uploading'))
watch(blocked, (value) => emit('blocked-change', value), { immediate: true, flush: 'sync' })
function publish(next: UploadUserFile[]) {
  files.value = next
  emit('update:modelValue', next)
}
function revokePreview(file: UploadUserFile) {
  if (file.url?.startsWith('blob:')) URL.revokeObjectURL(file.url)
}
function cancel(uid: number) {
  const job = jobs.get(uid)
  if (!job) return
  job.controller?.abort()
  job.state = 'cancelled'
  job.message = '上传已取消，可重试或移除文件'
}
watch(
  () => props.modelValue,
  (next) => {
    files.value = next
    for (const [uid, job] of jobs) {
      if (!next.some((file) => file.uid === uid)) {
        job.controller?.abort()
        jobs.delete(uid)
      }
    }
  },
  { immediate: true },
)
watch(
  () => gateway?.scope(),
  () => {
    if (!jobs.size) return
    for (const job of jobs.values()) job.controller?.abort()
    files.value.filter((file) => file.uid && jobs.has(file.uid)).forEach(revokePreview)
    const remaining = files.value.filter((file) => !file.uid || !jobs.has(file.uid))
    jobs.clear()
    publish(remaining)
    emit('removed')
    validation.value = '登录、Tenant 或应用已变化，请重新选择文件'
  },
)
function fileError(file: File): string {
  if (!file.size) return '不能选择空文件'
  if (file.size > props.maxSizeMb * 1024 * 1024) return `单个文件不能超过 ${props.maxSizeMb}MB`
  const accepts = props.accept
    .toLowerCase()
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (
    accepts.length &&
    !accepts.some((accept) =>
      accept.startsWith('.')
        ? file.name.toLowerCase().endsWith(accept)
        : accept.endsWith('/*')
          ? file.type.toLowerCase().startsWith(accept.slice(0, -1))
          : file.type.toLowerCase() === accept,
    )
  ) {
    return `不支持此文件类型；请选择 ${props.accept}`
  }
  return ''
}
async function run(uid: number) {
  const job = jobs.get(uid)
  const file = files.value.find((item) => item.uid === uid)
  if (!job || !file?.raw || !gateway || disposed) return
  const controller = new AbortController()
  job.controller = controller
  job.state = 'uploading'
  job.percent = 0
  job.determinate = false
  job.message = '正在上传'
  try {
    job.task ??= gateway.createTask(file.raw, props.category)
    const asset = await job.task.run({
      signal: controller.signal,
      onProgress(progress) {
        if (controller.signal.aborted) return
        job.percent = progress.percent ?? 0
        job.determinate = progress.percent !== undefined
        job.message = job.percent === 100 ? '文件已传输，等待服务端校验' : '正在上传'
      },
    })
    if (controller.signal.aborted || disposed || !jobs.has(uid)) return
    job.state = 'success'
    job.percent = 100
    job.message = '上传完成'
    publish(
      files.value.map((item) =>
        item.uid === uid ? { ...item, status: 'success', response: asset } : item,
      ),
    )
    emit('uploaded', asset)
  } catch (reason) {
    if (controller.signal.aborted || disposed || !jobs.has(uid)) return
    job.state = 'error'
    job.message = reason instanceof Error ? reason.message : '上传失败，请重试'
  }
}
const handleChange: UploadProps['onChange'] = (file, next) => {
  if (!file.raw) return
  validation.value = fileError(file.raw)
  if (validation.value) {
    revokePreview(file)
    publish(next.filter((item) => item.uid !== file.uid))
    return
  }
  publish(next)
  if (!gateway) return
  jobs.set(file.uid, {
    uid: file.uid,
    name: file.name,
    state: 'uploading',
    percent: 0,
    determinate: false,
    message: '正在上传',
  })
  void run(file.uid)
}
const handleRemove: UploadProps['onRemove'] = (file, next) => {
  jobs.get(file.uid)?.controller?.abort()
  jobs.delete(file.uid)
  validation.value = ''
  publish(next)
  emit('removed')
}
onBeforeUnmount(() => {
  disposed = true
  for (const job of jobs.values()) job.controller?.abort()
  emit('blocked-change', false)
})
</script>

<template>
  <div class="file-uploader" :aria-busy="uploading">
    <el-upload
      :file-list="files"
      :accept="accept"
      :limit="limit"
      :auto-upload="false"
      :list-type="listType"
      :disabled="disabled"
      :on-change="handleChange"
      :on-remove="handleRemove"
      :on-exceed="
        () => {
          validation = `最多选择 ${limit} 个文件，请先移除已有文件`
        }
      "
    >
      <slot><el-button :disabled="disabled">选择文件</el-button></slot>
      <template v-if="showTip" #tip>
        <div class="uploader-tip">
          单个文件不超过 {{ maxSizeMb }}MB，最多 {{ limit }} 个<span v-if="accept"
            >；{{ accept }}</span
          >
        </div>
      </template>
    </el-upload>
    <p v-if="validation" class="uploader-error" role="alert">{{ validation }}</p>
    <div v-for="job in jobs.values()" :key="job.uid" class="uploader-job" aria-live="polite">
      <span>{{ job.name }}：{{ job.message }}</span>
      <el-progress v-if="job.state === 'uploading' && job.determinate" :percentage="job.percent" />
      <el-button v-if="job.state === 'uploading'" link @click="cancel(job.uid)">取消上传</el-button>
      <el-button
        v-if="job.state === 'error' || job.state === 'cancelled'"
        link
        type="primary"
        @click="run(job.uid)"
        >重试上传</el-button
      >
    </div>
  </div>
</template>

<style scoped lang="scss">
.file-uploader {
  min-width: 0;
  width: 100%;
}
.uploader-error {
  color: var(--color-danger);
  margin: var(--spacing-1) 0;
}
.uploader-tip,
.uploader-job {
  margin-top: var(--spacing-1);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  overflow-wrap: anywhere;
}
</style>
