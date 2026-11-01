<script setup lang="ts">
import { computed } from 'vue'
import type { FileTransferGateway } from '@shared/services/fileTransfer'
import { coursesElements } from '../iam-resource.registry'
import { useCourseVideoPreview } from '../composables/useCourseVideoPreview'

const props = defineProps<{
  fileId?: string | undefined
  courseName: string
  production: boolean
  gateway?: FileTransferGateway | undefined
  editorMode?: 'create' | 'edit' | undefined
}>()
const {
  video,
  asset,
  source,
  poster,
  posterHint,
  pending,
  loadingMedia,
  frameReady,
  playing,
  error,
  hint,
  requestLease,
  loadedMetadata,
  loadedData,
  play,
  remember,
  mediaError,
} = useCourseVideoPreview(
  () => props.fileId,
  () => (props.production ? props.gateway : undefined),
)
function attachVideo(element: unknown) {
  video.value = element instanceof HTMLVideoElement ? element : undefined
}
const size = computed(() => {
  const bytes = asset.value?.size
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return ''
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
})
</script>

<template>
  <section
    v-resource-element="
      editorMode === 'create'
        ? coursesElements.createVideoPreview
        : editorMode === 'edit'
          ? coursesElements.editVideoPreview
          : coursesElements.videoPreview
    "
    class="course-video-preview"
    aria-label="课程视频预览"
  >
    <div class="course-video-preview__heading">
      <h3>课程视频</h3>
      <el-button
        v-if="production && fileId && gateway"
        v-resource-element="
          editorMode === 'create'
            ? coursesElements.createVideoPreview
            : editorMode === 'edit'
              ? coursesElements.editVideoPreview
              : coursesElements.videoPreview
        "
        :loading="pending"
        :disabled="pending"
        @click="requestLease()"
        >重新加载视频</el-button
      >
    </div>
    <div
      v-loading="loadingMedia || (pending && !source)"
      class="course-video-preview__media"
      element-loading-text="正在加载视频"
    >
      <video
        v-if="source"
        :ref="attachVideo"
        v-resource-element="
          editorMode === 'create'
            ? coursesElements.createVideoPreview
            : editorMode === 'edit'
              ? coursesElements.editVideoPreview
              : coursesElements.videoPreview
        "
        :src="source"
        :poster="poster || undefined"
        :aria-label="`课程视频：${courseName}`"
        controls
        playsinline
        preload="auto"
        @loadedmetadata="loadedMetadata"
        @loadeddata="loadedData"
        @timeupdate="remember"
        @play="remember"
        @pause="remember"
        @ended="remember"
        @volumechange="remember"
        @ratechange="remember"
        @error="mediaError"
      >
        当前浏览器不支持视频播放，请使用新版 Chrome 或 Edge。
      </video>
      <el-button
        v-if="source && frameReady && !playing && !loadingMedia"
        v-resource-element="
          editorMode === 'create'
            ? coursesElements.createVideoPlayback
            : editorMode === 'edit'
              ? coursesElements.editVideoPlayback
              : coursesElements.videoPlayback
        "
        class="course-video-preview__play"
        type="primary"
        :aria-label="`播放视频：${courseName}`"
        @click="play"
        >播放视频</el-button
      >
      <p v-else-if="!source && !error" class="course-video-preview__placeholder">
        {{
          !production
            ? '设计预览不连接真实视频，正式页面可加载课程视频。'
            : !fileId
              ? '此课程尚未关联视频'
              : !gateway
                ? '视频服务暂不可用，请刷新页面后重试'
                : '正在获取课程视频与首帧预览'
        }}
      </p>
      <p v-else-if="!source" class="course-video-preview__placeholder" role="alert">
        {{ error }}
      </p>
    </div>
    <div class="course-video-preview__status" role="status" aria-live="polite">
      <span v-if="asset?.name" class="course-video-preview__filename"
        >{{ asset.name }}<template v-if="size"> · {{ size }}</template></span
      >
      <span v-if="hint">{{ hint }}</span>
      <span v-else-if="pending && source">正在更新视频链接，将保留播放位置</span>
      <span v-else-if="source">管理端预览，不计入员工学习记录</span>
      <span v-if="source && asset?.playbackStatus === 'unprocessed'"
        >历史视频尚未标准化；若无法播放，请重新上传视频。</span
      >
      <span v-if="source && posterHint">{{ posterHint }}</span>
    </div>
  </section>
</template>

<style scoped lang="scss">
.course-video-preview {
  display: grid;
  gap: var(--spacing-2);
  min-width: 0;
  &__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
    h3 {
      margin: 0;
      font-size: var(--font-size-md);
    }
  }
  &__media {
    position: relative;
    display: grid;
    place-items: center;
    aspect-ratio: 16 / 9;
    min-width: 0;
    background: var(--background-sidebar);
    border-radius: var(--radius-default);
    video {
      display: block;
      width: 100%;
      height: 100%;
      min-width: 0;
      aspect-ratio: 16 / 9;
      object-fit: contain;
    }
  }
  &__play {
    position: absolute;
    inset-inline-start: 50%;
    inset-block-start: 50%;
    transform: translate(-50%, -50%);
  }
  &__placeholder {
    padding: var(--spacing-4);
    margin: 0;
    color: var(--text-inverse);
    text-align: center;
    overflow-wrap: anywhere;
  }
  &__status {
    display: grid;
    gap: var(--spacing-1);
    min-height: var(--spacing-6);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    overflow-wrap: anywhere;
  }
  &__filename {
    color: var(--text-regular);
  }
}
</style>
