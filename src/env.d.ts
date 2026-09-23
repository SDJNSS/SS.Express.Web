/// <reference types="vite/client" />

import 'vue-router'

export {}

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string
    readonly VITE_API_TIMEOUT_MS?: string
    readonly VITE_API_UPLOAD_TIMEOUT_MS?: string
    readonly VITE_API_WITH_CREDENTIALS?: string
    readonly VITE_API_SUCCESS_CODES?: string
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    permission?: string
    subsystem?: 'dms' | 'iam' | 'tms' | 'vms' | 'reference'
    implementationStatus?: 'implemented' | 'placeholder'
    breadcrumb?: string[]
    hidden?: boolean
    public?: boolean
    permissionFallback?: string
  }
}
