export type SubsystemId = 'dms' | 'iam' | 'tms' | 'vms' | 'reference'

/**
 * Opaque concurrency token returned by the backend.
 *
 * It must never be converted to a JavaScript number because IAM versions can
 * exceed Number.MAX_SAFE_INTEGER.
 */
export type VersionToken = string

export interface SubsystemConfig {
  id: SubsystemId
  label: string
  icon: string
}

export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export type AsyncState = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
