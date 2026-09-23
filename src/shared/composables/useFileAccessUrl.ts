import { inject, onBeforeUnmount, ref, watch } from 'vue'
import { fileTransferKey, type FileTransferGateway } from '@shared/services/fileTransfer'

/** Ephemeral URL only. Never copy this URL back into the business model. */
export function useFileAccessUrl(
  fileId: () => string | undefined,
  legacyUrl: () => string,
  providedGateway?: FileTransferGateway,
) {
  const gateway = providedGateway ?? inject(fileTransferKey, undefined)
  const url = ref('')
  const error = ref('')
  let controller: AbortController | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  function stop() {
    controller?.abort()
    clearTimeout(timer)
  }
  async function refresh() {
    stop()
    error.value = ''
    const id = fileId()
    url.value = id ? '' : legacyUrl()
    if (!id || !gateway || disposed) return
    const current = new AbortController()
    controller = current
    try {
      const result = await gateway.access(id, current.signal)
      if (current.signal.aborted || disposed) return
      const remaining = Date.parse(result.expiresAt) - Date.now()
      if (!Number.isFinite(remaining) || remaining <= 0)
        throw new Error('文件访问链接已过期，请重试')
      url.value = result.url
      // Renew by lease; denied access is not retried automatically.
      timer = setTimeout(
        () => void refresh(),
        Math.min(2_147_000_000, Math.max(1_000, remaining * 0.9)),
      )
    } catch (reason) {
      if (!current.signal.aborted && !disposed)
        error.value = reason instanceof Error ? reason.message : '文件预览加载失败'
    }
  }
  watch([fileId, legacyUrl, () => gateway?.scope()], () => void refresh(), { immediate: true })
  onBeforeUnmount(() => {
    disposed = true
    stop()
    url.value = ''
  })
  return { url, error, refresh }
}
