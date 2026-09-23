import axios, {
  AxiosHeaders,
  isAxiosError,
  isCancel,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'

import { apiConfig } from './apiConfig'
import { clearStoredAccessToken, getStoredAccessToken, setStoredAccessToken } from './authSession'
import { createRequestId } from './requestIdentity'

export interface ApiEnvelope<T> {
  code: string | number
  message: string
  data?: T
  requestId?: string
  status?: string
}

export type ApiErrorCategory =
  'authentication' | 'permission' | 'validation' | 'business' | 'network' | 'system' | 'cancelled'

interface ApiErrorDetails {
  status?: number | undefined
  code?: string | undefined
  requestId?: string | undefined
}

export class ApiError extends Error {
  readonly status: number | undefined
  readonly code: string | undefined
  readonly requestId: string | undefined

  constructor(
    message: string,
    public readonly category: ApiErrorCategory,
    details: ApiErrorDetails = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = details.status
    this.code = details.code
    this.requestId = details.requestId
  }
}

export type RequestAuthMode = 'required' | 'optional' | 'none'

export interface ApiRequestConfig<RequestData = unknown> extends AxiosRequestConfig<RequestData> {
  authMode?: RequestAuthMode
  retryAuth?: boolean
}

interface InternalApiRequestConfig extends InternalAxiosRequestConfig {
  authMode?: RequestAuthMode
  retryAuth?: boolean
  authenticationRetried?: boolean
}

export interface HttpAuthAdapter {
  getAccessToken: () => string | null
  setAccessToken: (accessToken: string) => void
  clearAccessToken: () => void
  refreshAccessToken?: () => Promise<string | null>
  onSessionExpired?: () => void
}

interface ResolvedHttpAuthAdapter {
  getAccessToken: () => string | null
  setAccessToken: (accessToken: string) => void
  clearAccessToken: () => void
  refreshAccessToken: (() => Promise<string | null>) | undefined
  onSessionExpired: (() => void) | undefined
}

const defaultAuthAdapter: ResolvedHttpAuthAdapter = {
  getAccessToken: getStoredAccessToken,
  setAccessToken: setStoredAccessToken,
  clearAccessToken: clearStoredAccessToken,
  refreshAccessToken: undefined,
  onSessionExpired: undefined,
}

let authAdapter: ResolvedHttpAuthAdapter = { ...defaultAuthAdapter }
let refreshRequest: Promise<string | null> | null = null
let sessionExpiredNotified = false

export function configureHttpAuth(adapter: Partial<HttpAuthAdapter>): () => void {
  authAdapter = {
    getAccessToken: adapter.getAccessToken ?? defaultAuthAdapter.getAccessToken,
    setAccessToken: adapter.setAccessToken ?? defaultAuthAdapter.setAccessToken,
    clearAccessToken: adapter.clearAccessToken ?? defaultAuthAdapter.clearAccessToken,
    refreshAccessToken: adapter.refreshAccessToken,
    onSessionExpired: adapter.onSessionExpired,
  }
  refreshRequest = null
  sessionExpiredNotified = false

  return () => {
    authAdapter = { ...defaultAuthAdapter }
    refreshRequest = null
    sessionExpiredNotified = false
  }
}

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (typeof value !== 'object' || value === null) return false
  const envelope = value as Record<string, unknown>
  return (
    (typeof envelope.code === 'string' || typeof envelope.code === 'number') &&
    typeof envelope.message === 'string'
  )
}

function responseRequestId(error: AxiosError<ApiEnvelope<unknown>>): string | undefined {
  const bodyRequestId = error.response?.data?.requestId
  if (bodyRequestId) return bodyRequestId
  const headerRequestId = error.response?.headers['x-request-id']
  return typeof headerRequestId === 'string' ? headerRequestId : undefined
}

function errorMessage(error: AxiosError<ApiEnvelope<unknown>>, fallback: string): string {
  const message = error.response?.data?.message
  return typeof message === 'string' && message.trim() ? message : fallback
}

function normalizeHttpError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isCancel(error)) return new ApiError('请求已取消', 'cancelled')
  if (!isAxiosError<ApiEnvelope<unknown>>(error)) {
    return new ApiError('系统繁忙，请稍后重试', 'system')
  }
  if (!error.response) return new ApiError('网络连接异常，请稍后重试', 'network')

  const status = error.response.status
  const requestId = responseRequestId(error)
  const code = String(error.response.data?.code ?? status)
  if (status === 401) {
    return new ApiError('登录状态已失效，请重新登录', 'authentication', {
      status,
      code,
      requestId,
    })
  }
  if (status === 403) {
    return new ApiError('当前账号无权执行此操作', 'permission', { status, code, requestId })
  }
  if (status === 400 || status === 422) {
    return new ApiError(errorMessage(error, '提交内容不符合要求'), 'validation', {
      status,
      code,
      requestId,
    })
  }
  if (status >= 500) {
    return new ApiError(errorMessage(error, '系统繁忙，请稍后重试'), 'system', {
      status,
      code,
      requestId,
    })
  }
  return new ApiError(errorMessage(error, '请求处理失败，请稍后重试'), 'business', {
    status,
    code,
    requestId,
  })
}

async function refreshAccessToken(): Promise<string | null> {
  if (!authAdapter.refreshAccessToken) return null
  refreshRequest ??= authAdapter.refreshAccessToken().finally(() => {
    refreshRequest = null
  })
  return refreshRequest
}

function expireSession(): void {
  authAdapter.clearAccessToken()
  if (sessionExpiredNotified) return
  sessionExpiredNotified = true
  authAdapter.onSessionExpired?.()
}

const httpClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeoutMs,
  withCredentials: apiConfig.withCredentials,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

httpClient.interceptors.request.use((requestConfig) => {
  const config = requestConfig as InternalApiRequestConfig
  const url = config.url?.trim()
  if (
    !url ||
    !url.startsWith('/') ||
    /^[a-z][a-z\d+.-]*:\/\//iu.test(url) ||
    url.startsWith('//')
  ) {
    return Promise.reject(new ApiError('接口必须使用统一 Host 和以 / 开头的相对路径', 'system'))
  }

  const headers = AxiosHeaders.from(config.headers)
  // Let the browser generate the multipart boundary. Keeping the JSON default
  // causes Axios to serialize FormData as JSON instead of sending the file.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    headers.delete('Content-Type')
  }
  const token = authAdapter.getAccessToken()
  const authMode = config.authMode ?? 'required'
  if (authMode === 'required' && !token) {
    return Promise.reject(new ApiError('请先登录后再继续操作', 'authentication'))
  }
  if (authMode !== 'none' && token) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('X-Request-ID')) headers.set('X-Request-ID', createRequestId())
  config.headers = headers
  return config
})

httpClient.interceptors.response.use(
  (response) => {
    if (authAdapter.getAccessToken()) sessionExpiredNotified = false
    return response
  },
  async (error: unknown) => {
    if (!isAxiosError<ApiEnvelope<unknown>>(error)) return Promise.reject(normalizeHttpError(error))

    const config = error.config as InternalApiRequestConfig | undefined
    const mayRefresh =
      error.response?.status === 401 &&
      config &&
      config.authMode !== 'none' &&
      config.retryAuth !== false &&
      !config.authenticationRetried &&
      Boolean(authAdapter.refreshAccessToken)

    if (mayRefresh) {
      config.authenticationRetried = true
      try {
        const accessToken = await refreshAccessToken()
        if (accessToken) {
          authAdapter.setAccessToken(accessToken)
          config.headers = AxiosHeaders.from(config.headers)
          config.headers.set('Authorization', `Bearer ${accessToken}`)
          return httpClient.request(config)
        }
      } catch {
        // The original 401 remains the stable error exposed to the feature.
      }
    }

    if (error.response?.status === 401 && config?.authMode !== 'none') expireSession()
    return Promise.reject(normalizeHttpError(error))
  },
)

export async function requestApi<ResponseData, RequestData = unknown>(
  config: ApiRequestConfig<RequestData>,
): Promise<ResponseData> {
  const response = await httpClient.request<ApiEnvelope<ResponseData>>(config)
  if (!isApiEnvelope(response.data)) {
    const headerRequestId = response.headers['x-request-id']
    throw new ApiError('接口响应格式不符合统一协议', 'system', {
      status: response.status,
      requestId: typeof headerRequestId === 'string' ? headerRequestId : undefined,
    })
  }

  const code = String(response.data.code)
  if (!apiConfig.successCodes.has(code)) {
    throw new ApiError(response.data.message || '业务处理失败', 'business', {
      status: response.status,
      code,
      requestId: response.data.requestId,
    })
  }
  if (!('data' in response.data)) {
    throw new ApiError('接口成功响应缺少 data 字段', 'system', {
      status: response.status,
      code,
      requestId: response.data.requestId,
    })
  }
  return response.data.data as ResponseData
}

export async function requestRaw<ResponseData, RequestData = unknown>(
  config: ApiRequestConfig<RequestData>,
): Promise<ResponseData> {
  const response = await httpClient.request<ResponseData>(config)
  return response.data
}

export default httpClient
