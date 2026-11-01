import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import type { FileAccessAsset, FileTransferGateway } from '@shared/services/fileTransfer'

interface PlaybackState {
  time: number
  playing: boolean
  volume: number
  muted: boolean
  rate: number
}

/** Admin-only media preview: no learning/progress writes and no persisted signed URLs. */
export function useCourseVideoPreview(
  fileId: () => string | undefined,
  gateway: () => FileTransferGateway | undefined,
) {
  const video = shallowRef<HTMLVideoElement>()
  const asset = shallowRef<FileAccessAsset>()
  const source = ref('')
  const poster = ref('')
  const posterHint = ref('')
  const pending = ref(false)
  const loadingMedia = ref(false)
  const frameReady = ref(false)
  const playing = ref(false)
  const error = ref('')
  const hint = ref('')
  let disposed = false
  let controller: AbortController | undefined
  let renewal: ReturnType<typeof setTimeout> | undefined
  let mediaTimeout: ReturnType<typeof setTimeout> | undefined
  let restore: PlaybackState | undefined
  let remembered: PlaybackState = { time: 0, playing: false, volume: 1, muted: false, rate: 1 }
  let expiresAt = 0
  let recoveredExpiry = false

  function snapshot(): PlaybackState {
    const element = video.value
    if (!element || !source.value || restore) return restore ?? remembered
    return {
      time: Number.isFinite(element.currentTime) ? element.currentTime : remembered.time,
      playing: element.error ? remembered.playing : !element.paused && !element.ended,
      volume: element.volume,
      muted: element.muted,
      rate: element.playbackRate,
    }
  }
  function release() {
    clearTimeout(mediaTimeout)
    const element = video.value
    if (element) {
      element.pause()
      element.removeAttribute('src')
      element.removeAttribute('poster')
      element.load()
    }
    source.value = ''
    poster.value = ''
    loadingMedia.value = false
    frameReady.value = false
    playing.value = false
  }
  function reset() {
    controller?.abort()
    controller = undefined
    clearTimeout(renewal)
    restore = undefined
    release()
    remembered = { time: 0, playing: false, volume: 1, muted: false, rate: 1 }
    asset.value = undefined
    pending.value = false
    error.value = ''
    hint.value = ''
    posterHint.value = ''
    expiresAt = 0
    recoveredExpiry = false
  }
  function fail(message: string) {
    remembered = snapshot()
    // Keep the snapshot for an explicit retry, never keep playing after denied renewal.
    restore = remembered
    clearTimeout(renewal)
    release()
    error.value = message
  }
  async function requestLease(automatic = false) {
    const transport = gateway()
    const id = fileId()?.trim()
    if (pending.value || disposed || !transport || !id) return
    if (!automatic) recoveredExpiry = false
    clearTimeout(renewal)
    clearTimeout(mediaTimeout)
    const current = new AbortController()
    controller?.abort()
    controller = current
    const scope = transport.scope()
    pending.value = true
    error.value = ''
    hint.value = ''
    try {
      const result = await transport.access(id, current.signal)
      if (disposed || current.signal.aborted || controller !== current) return
      if (scope !== transport.scope() || id !== fileId()?.trim()) {
        reset()
        return
      }
      const remaining = Date.parse(result.expiresAt) - Date.now()
      if (!Number.isFinite(remaining) || remaining <= 0)
        throw new Error('视频链接已过期，请重新加载')
      if (!/^https?:\/\//iu.test(result.url)) throw new Error('视频访问链接无效，请重新加载')
      if (result.contentType && !result.contentType.toLowerCase().startsWith('video/'))
        throw new Error('该附件不是可播放的视频，请联系课程管理员')
      asset.value = result
      expiresAt = Date.parse(result.expiresAt)
      // Poster is optional: an absent, expired or malformed image never blocks video playback.
      const posterRemaining =
        typeof result.thumbnailExpiresAt === 'string'
          ? Date.parse(result.thumbnailExpiresAt) - Date.now()
          : 0
      poster.value =
        result.thumbnailStatus === 'ready' &&
        typeof result.thumbnailUrl === 'string' &&
        /^https?:\/\//iu.test(result.thumbnailUrl) &&
        Number.isFinite(posterRemaining) &&
        posterRemaining > 0
          ? result.thumbnailUrl
          : ''
      posterHint.value =
        result.thumbnailStatus === 'failed' || (result.thumbnailStatus === 'ready' && !poster.value)
          ? '缩略图暂不可用，使用视频首帧预览；不影响播放'
          : ''
      if (source.value !== result.url) {
        restore = snapshot()
        source.value = result.url
        loadingMedia.value = true
        frameReady.value = false
        playing.value = false
        await nextTick()
        if (disposed || current.signal.aborted) return
        video.value?.load()
        clearTimeout(mediaTimeout)
        mediaTimeout = setTimeout(() => fail('视频加载超时，请检查网络后重新加载'), 30_000)
      }
      // A failed lease is never automatically retried; every renewal rechecks tenant and permission.
      renewal = setTimeout(
        () => void requestLease(true),
        Math.min(
          2_147_000_000,
          Math.max(1_000, (poster.value ? Math.min(remaining, posterRemaining) : remaining) * 0.9),
        ),
      )
    } catch (reason) {
      if (!disposed && !current.signal.aborted && controller === current)
        fail(reason instanceof Error ? reason.message : '视频链接获取失败，请重试')
    } finally {
      if (!disposed && controller === current) pending.value = false
    }
  }
  function loadedMetadata() {
    const element = video.value
    const state = restore
    if (!element || !state) return
    element.volume = state.volume
    element.muted = state.muted
    element.playbackRate = state.rate
    if (state.time > 0)
      element.currentTime = Number.isFinite(element.duration)
        ? Math.min(state.time, Math.max(0, element.duration - 0.01))
        : state.time
    // Metadata/audio success does not prove there is a decodable video frame.
    // Wait for loadeddata before clearing the loading state or resuming playback.
  }
  async function play() {
    const element = video.value
    if (!element || !frameReady.value || disposed) return
    hint.value = ''
    try {
      await element.play()
    } catch {
      if (!disposed && video.value === element)
        hint.value = '无法开始播放，请点击播放器播放按钮重试或检查浏览器设置'
    }
  }
  function loadedData() {
    const element = video.value
    if (!element || !source.value || disposed) return
    if (element.videoWidth <= 0 || element.videoHeight <= 0) {
      fail(
        '未检测到可显示的视频画面，文件可能缺少视频轨道或编码不兼容。请联系管理员检查原视频并提供兼容的 MP4。',
      )
      return
    }
    clearTimeout(mediaTimeout)
    loadingMedia.value = false
    frameReady.value = true
    const state = restore
    restore = undefined
    if (state) remembered = state
    if (state?.playing) void play()
  }
  function remember() {
    if (!restore) {
      remembered = snapshot()
      playing.value = remembered.playing
    }
  }
  function mediaError() {
    if (!source.value || disposed) return
    const code = video.value?.error?.code
    if (code === 1) return // Source replacement/close can abort the browser's old read.
    if (code === 2 && expiresAt <= Date.now() + 1_000 && !recoveredExpiry && !pending.value) {
      recoveredExpiry = true
      void requestLease(true)
      return
    }
    fail(
      code === 3 || code === 4
        ? '当前视频格式或编码无法在浏览器中播放，请联系课程管理员提供兼容视频'
        : '视频读取失败，请检查网络或访问权限后重新加载',
    )
  }

  watch(
    [fileId, () => gateway()?.scope()],
    () => {
      reset()
      // Mounted only in an open course drawer. Preview never receives a transport.
      if (fileId()?.trim() && gateway()) void requestLease()
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    disposed = true
    reset()
  })
  return {
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
  }
}
