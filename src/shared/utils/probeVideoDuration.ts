/** Best-effort metadata check only; unsupported originals still require server-side validation. */
export function probeVideoDuration(file: File, signal: AbortSignal): Promise<number | undefined> {
  if (signal.aborted) return Promise.resolve(undefined)
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    let settled = false
    const finish = (duration?: number) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      signal.removeEventListener('abort', cancel)
      video.onloadedmetadata = null
      video.onerror = null
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
      resolve(duration)
    }
    const cancel = () => finish()
    const timeout = setTimeout(cancel, 10_000)
    signal.addEventListener('abort', cancel, { once: true })
    video.preload = 'metadata'
    video.muted = true
    video.onloadedmetadata = () =>
      finish(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : undefined)
    video.onerror = cancel
    video.src = url
  })
}
