import { getStoredAuthSession } from '@shared/api/authSession'
import { ApiError } from '@shared/api/httpClient'
import type { FileTransferGateway } from '@shared/services/fileTransfer'
import { createDmsUploadTask, dmsFileApi } from './fileApi'

export function createDmsFileTransferGateway(
  getApp: () => { id: number; app_code: string } | undefined,
): FileTransferGateway {
  function scope() {
    const session = getStoredAuthSession()
    const app = getApp()
    return JSON.stringify([
      session?.userId,
      session?.currentTenantId,
      session?.sessionId,
      session?.accessToken,
      app?.id,
      app?.app_code,
    ])
  }
  function ensureScope(expected: string, signal?: AbortSignal) {
    if (signal?.aborted || expected !== scope()) {
      throw new ApiError('登录、Tenant 或应用已变化，请重新选择文件', 'cancelled')
    }
  }
  return {
    scope,
    createTask(file, category) {
      const app = getApp()
      const session = getStoredAuthSession()
      if (!app?.id || !session?.currentTenantId) {
        throw new ApiError('请先选择有效的 Tenant 和来源应用再上传', 'validation')
      }
      const expected = scope()
      const task = createDmsUploadTask({
        file,
        source_app_id: app.id,
        source_app_code: app.app_code,
        file_category: category,
      })
      return {
        async run(options) {
          ensureScope(expected, options.signal)
          const result = await task.run(options)
          ensureScope(expected, options.signal)
          return {
            fileId: result.file_id,
            name: result.original_name,
            size: result.file_size_bytes,
            category: result.file_category,
            durationMs: result.media_duration_ms,
          }
        },
      }
    },
    async access(fileId, signal) {
      const expected = scope()
      const result = await dmsFileApi.getAccessUrl(fileId, 'preview', signal)
      ensureScope(expected, signal)
      return { url: result.url, expiresAt: result.expires_at }
    },
  }
}
