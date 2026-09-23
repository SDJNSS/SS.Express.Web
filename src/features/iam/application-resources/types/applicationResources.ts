import type { VersionToken } from '@shared/types/common'

export type ApplicationResourcesState =
  'ready' | 'loading' | 'empty' | 'filter-empty' | 'retryable-error' | 'unauthorized'

export type CatalogStatus = 'active' | 'disabled'
export type PermissionResourceType = 'module' | 'menu' | 'page' | 'function'
export type CatalogTargetType = 'application' | 'resource'

export interface PermissionResourceRecord {
  id: number
  appId: number
  parentId: number
  resourceCode: string
  resourceName: string
  resourceType: PermissionResourceType
  routePath: string
  component: string
  permissionCode: string
  icon: string
  httpMethod: string
  apiPath: string
  isVisible: boolean
  sortOrder: number
  status: CatalogStatus
  remarks: string
  isCurrentlyEffective: boolean
  invalidReason: string
  canMaintain: boolean
  version: VersionToken
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  children: PermissionResourceRecord[]
}

export interface ApplicationRecord {
  id: number
  appCode: string
  appName: string
  description: string
  icon: string
  routePrefix: string
  status: CatalogStatus
  remarks: string
  canMaintain: boolean
  version: VersionToken
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  modules: PermissionResourceRecord[]
}

export interface ApplicationFormValue {
  appName: string
  description: string
  icon: string
  routePrefix: string
  status: CatalogStatus
  remarks: string
}

export interface ResourceFormValue {
  appId: number
  parentId: number
  resourceName: string
  resourceType: PermissionResourceType
  routePath: string
  component: string
  permissionCode: string
  icon: string
  httpMethod: string
  apiPath: string
  isVisible: boolean
  sortOrder: number
  status: CatalogStatus
  remarks: string
}

export interface CatalogFilters {
  keyword: string
  appStatus: '' | CatalogStatus
  resourceStatus: '' | CatalogStatus
  resourceType: '' | PermissionResourceType
}

export interface CatalogDeleteImpact {
  moduleCount: number
  menuCount: number
  pageCount: number
  functionCount: number
  descendantCount: number
  roleGrantCount?: number
  isLastModule?: boolean
}

export interface CatalogTarget {
  targetType: CatalogTargetType
  id: number
  code: string
  name: string
  status: CatalogStatus
  version: VersionToken
  canMaintain: boolean
  resourceType?: PermissionResourceType
}
