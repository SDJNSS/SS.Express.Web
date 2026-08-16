import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import type { ApiResponse } from '@logistics/types'

export interface RequestConfig extends AxiosRequestConfig {
  skipErrorHandler?: boolean
}

export class RequestClient {
  private instance: AxiosInstance
  private tokenGetter?: () => string | null
  private tenantIdGetter?: () => number | null
  private appCodeGetter?: () => string | null
  private onUnauthorized?: () => void
  private onForbidden?: () => void

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  setTokenGetter(getter: () => string | null) {
    this.tokenGetter = getter
  }

  setTenantIdGetter(getter: () => number | null) {
    this.tenantIdGetter = getter
  }

  setAppCodeGetter(getter: () => string | null) {
    this.appCodeGetter = getter
  }

  onUnauthorizedCallback(callback: () => void) {
    this.onUnauthorized = callback
  }

  onForbiddenCallback(callback: () => void) {
    this.onForbidden = callback
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      config => {
        const token = this.tokenGetter?.()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        const tenantId = this.tenantIdGetter?.()
        if (tenantId) {
          config.headers['X-Tenant-Id'] = String(tenantId)
        }

        const appCode = this.appCodeGetter?.()
        if (appCode) {
          config.headers['X-App-Code'] = appCode
        }

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        config.headers['X-Timezone'] = timezone

        const language = navigator.language || 'zh-CN'
        config.headers['X-Language'] = language

        return config
      },
      error => {
        return Promise.reject(error)
      }
    )

    this.instance.interceptors.response.use(
      response => {
        const data = response.data as ApiResponse<any>
        if (!data.success) {
          return Promise.reject(new Error(data.message || 'Request failed'))
        }
        return response
      },
      error => {
        if (error.response) {
          const status = error.response.status
          if (status === 401) {
            this.onUnauthorized?.()
          } else if (status === 403) {
            this.onForbidden?.()
          }
        }
        return Promise.reject(error)
      }
    )
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.instance.get<ApiResponse<T>>(url, config)
    return response.data.data
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.instance.post<ApiResponse<T>>(url, data, config)
    return response.data.data
  }

  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config)
    return response.data.data
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config)
    return response.data.data
  }

  async download(url: string, filename?: string, config?: RequestConfig): Promise<void> {
    const response = await this.instance.get(url, {
      ...config,
      responseType: 'blob'
    })

    const blob = new Blob([response.data])
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename || 'download'
    link.click()
    URL.revokeObjectURL(link.href)
  }
}

export const createRequestClient = (baseURL: string) => {
  return new RequestClient(baseURL)
}

// 默认实例（使用环境变量或默认值）
const defaultBaseURL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL || '/api'
export const request = new RequestClient(defaultBaseURL)
