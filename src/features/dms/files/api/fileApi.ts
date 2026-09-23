import { apiConfig } from '@shared/api/apiConfig'
import { defineApiPath } from '@shared/api/apiPath'
import { serviceApiPath } from '@shared/api/backendServices'
import { ApiError, requestApi } from '@shared/api/httpClient'
import { createRequestId } from '@shared/api/requestIdentity'

export interface DmsUploadRequest {
  file: File
  source_app_id: number
  source_app_code: string
  file_category?: string
  idempotency_key: string
  expected_md5?: string
  expected_sha256?: string
}

export interface DmsUploadResponse {
  upload_id: string
  file_id: string
  original_name: string
  file_extension: string
  file_category: string
  content_type: string
  file_size_bytes: number
  etag: string
  content_md5: string
  content_sha256: string
  oss_crc64: string
  oss_version_id: string
  storage_class: string
  encryption_method: string
  media_duration_ms: number
  status: string
  uploaded_at: string
  idempotent: boolean
}

export type DmsAccessPurpose = 'preview' | 'download'

/** Temporary access only: persist file_id, never this URL. */
export interface DmsAccessResponse {
  file_id: string
  purpose: DmsAccessPurpose
  url: string
  expires_at: string
  original_name: string
  file_extension: string
  file_category: string
  content_type: string
  file_size_bytes: number
}

export interface DmsVideoValidationResponse {
  file_id: string
  is_valid: boolean
  status: string
  file_category: string
  content_type: string
  media_duration_ms: number
}

export interface DmsTransferOptions {
  signal?: AbortSignal
  // This is byte transfer progress, not a guarantee that server processing succeeded.
  onProgress?: (progress: { loaded: number; total?: number; percent?: number }) => void
}

export const dmsFileApiPaths = Object.freeze({
  upload: serviceApiPath('dmsFile', defineApiPath('/File/Upload')),
  getAccessUrl: serviceApiPath('dmsFile', defineApiPath('/File/GetAccessUrl')),
  validateVideo: serviceApiPath('dmsFile', defineApiPath('/File/ValidateVideo')),
})

function requireFileId(fileId: string): void {
  if (!fileId.trim()) throw new ApiError('缺少文件标识', 'validation')
}

async function upload(
  input: DmsUploadRequest,
  options: DmsTransferOptions = {},
): Promise<DmsUploadResponse> {
  if (!input.file.size) throw new ApiError('不能上传空文件', 'validation')
  if (
    !Number.isSafeInteger(input.source_app_id) ||
    input.source_app_id <= 0 ||
    !input.source_app_code.trim()
  ) {
    throw new ApiError('请先选择有效的来源应用', 'validation')
  }
  if (!input.idempotency_key.trim()) throw new ApiError('上传任务缺少幂等键', 'validation')

  const body = new FormData()
  body.append('file', input.file, input.file.name)
  body.append('source_app_id', String(input.source_app_id))
  body.append('source_app_code', input.source_app_code)
  body.append('idempotency_key', input.idempotency_key)
  if (input.file_category) body.append('file_category', input.file_category)
  if (input.expected_md5) body.append('expected_md5', input.expected_md5)
  if (input.expected_sha256) body.append('expected_sha256', input.expected_sha256)

  const result = await requestApi<DmsUploadResponse, FormData>({
    url: dmsFileApiPaths.upload,
    method: 'POST',
    data: body,
    timeout: apiConfig.uploadTimeoutMs,
    retryAuth: false,
    ...(options.signal ? { signal: options.signal } : {}),
    onUploadProgress: ({ loaded, total }) => {
      options.onProgress?.({
        loaded,
        ...(total && total > 0
          ? { total, percent: Math.min(100, Math.round((loaded / total) * 100)) }
          : {}),
      })
    },
  })
  if (!result?.file_id || result.status?.toUpperCase() !== 'AVAILABLE') {
    throw new ApiError('文件尚未上传完成或不可用，请重新查询上传结果', 'business')
  }
  return result
}

async function getAccessUrl(
  fileId: string,
  purpose: DmsAccessPurpose = 'preview',
  signal?: AbortSignal,
): Promise<DmsAccessResponse> {
  requireFileId(fileId)
  const result = await requestApi<DmsAccessResponse>({
    url: dmsFileApiPaths.getAccessUrl,
    method: 'POST',
    data: { file_id: fileId, purpose },
    ...(signal ? { signal } : {}),
  })
  if (
    !result ||
    result.file_id !== fileId ||
    result.purpose !== purpose ||
    !/^https?:\/\//iu.test(result.url)
  ) {
    throw new ApiError('文件访问链接响应不正确', 'system')
  }
  return result
}

async function validateVideo(
  fileId: string,
  signal?: AbortSignal,
): Promise<DmsVideoValidationResponse> {
  requireFileId(fileId)
  return requestApi<DmsVideoValidationResponse>({
    url: dmsFileApiPaths.validateVideo,
    method: 'POST',
    data: { file_id: fileId },
    ...(signal ? { signal } : {}),
  })
}

export const dmsFileApi = Object.freeze({ upload, getAccessUrl, validateVideo })

/** Retain this task for manual retries after uncertain network outcomes.
 * A new selection creates a new task/key. Never silently replay a failed upload.
 */
export function createDmsUploadTask(input: Omit<DmsUploadRequest, 'idempotency_key'>) {
  const request: DmsUploadRequest = { ...input, idempotency_key: createRequestId() }
  let uploaded: DmsUploadResponse | undefined
  return {
    idempotencyKey: request.idempotency_key,
    async run(options: DmsTransferOptions = {}): Promise<DmsUploadResponse> {
      uploaded ??= await upload(request, options)
      if (request.file_category?.toUpperCase() === 'VIDEO') {
        const video = await validateVideo(uploaded.file_id, options.signal)
        if (
          !video?.is_valid ||
          video.file_id !== uploaded.file_id ||
          video.status?.toUpperCase() !== 'AVAILABLE' ||
          video.file_category?.toUpperCase() !== 'VIDEO' ||
          !video.content_type?.startsWith('video/') ||
          !Number.isFinite(video.media_duration_ms) ||
          video.media_duration_ms <= 0
        ) {
          throw new ApiError('视频校验未通过，不能保存为课程视频', 'validation')
        }
        return { ...uploaded, media_duration_ms: video.media_duration_ms }
      }
      return uploaded
    },
  }
}
