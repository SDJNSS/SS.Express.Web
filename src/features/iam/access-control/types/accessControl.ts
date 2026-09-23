import type { VersionToken } from '@shared/types/common'

export type AccessControlPreviewState = 'ready' | 'loading' | 'empty' | 'retryable-error'
export type EntityStatus = 'ACTIVE' | 'DISABLED'
export type ResourceType = 'MODULE' | 'MENU' | 'PAGE' | 'FUNCTION'
export type PermissionSource = 'direct' | 'navigation' | 'none'
export type DataScopeMode = 'SELF' | 'ORG' | 'ORG_AND_CHILDREN' | 'TENANT' | 'GROUP' | 'CUSTOM'

export interface FunctionPermissionRole {
  id: number
  tenantId: number
  tenantCode: string
  roleCode: string
  roleName: string
  roleType: 'CUSTOM' | 'SYSTEM'
}

export interface FunctionPermissionSubject {
  subjectType: 'role' | 'user' | 'member'
  subjectId: number
  tenantId: number
  subjectCode: string
  subjectName: string
  isCurrentlyEffective: boolean
  invalidReason: string
  version: VersionToken
}

export interface SystemRecord {
  [key: string]: unknown
  id: number
  appCode: string
  appName: string
  description: string
  icon: string
  routePrefix: string
  status: EntityStatus
  remarks: string
  canMaintain: boolean
  version: VersionToken
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export interface ResourceNode {
  id: number
  appId: number
  parentId?: number
  resourceCode: string
  resourceName: string
  resourceType: ResourceType
  routePath: string
  component: string
  permissionCode: string
  icon: string
  httpMethod: string
  apiPath: string
  isVisible: boolean
  sortOrder: number
  status: EntityStatus
  remarks: string
  isCurrentlyEffective: boolean
  invalidReason: string
  canMaintain: boolean
  version: VersionToken
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  permissionSource?: PermissionSource
  isDirect?: boolean
  isNavigationOnly?: boolean
  sourceRoles?: FunctionPermissionRole[]
  sourceRoleNames?: string[]
  children?: ResourceNode[]
}

export interface CatalogDeleteImpact {
  entityType: 'system' | 'resource'
  entityId: number
  descendantCount: number
  resourceCount: number
}

export interface RoleRecord {
  [key: string]: unknown
  id: number
  tenantId: number
  tenantCode: string
  roleCode: string
  roleName: string
  roleType: 'CUSTOM' | 'SYSTEM'
  sortOrder: number
  status: EntityStatus
  description: string
  remarks: string
  isCurrentlyEffective: boolean
  isGroupControlled: boolean
  canMaintain: boolean
  version: VersionToken
  createdAt: string
  updatedAt: string
}

export interface RoleFormValue {
  tenantId: number
  roleName: string
  roleType: 'CUSTOM' | 'SYSTEM'
  status: EntityStatus
  description: string
  remarks: string
  sortOrder: number
}

export interface DataDomainRecord {
  [key: string]: unknown
  id: number
  appId: number
  appCode: string
  domainCode: string
  domainName: string
  supportedScopes: DataScopeMode[]
  selfDefinition: string
  status: EntityStatus
  linkedResourceIds: number[]
  isConfigurationValid: boolean
  invalidReason: string
}

export interface InvalidDataPermissionResourceRecord {
  resourceId: number
  appId: number
  resourceCode: string
  resourceName: string
  invalidReason: string
}

export interface RoleDataPermissionRecord {
  [key: string]: unknown
  domainCode: string
  domainName: string
  isConfigured: boolean
  scopeMode?: DataScopeMode
  targetTenantIds: number[]
  targetTenantNames: string[]
  isCurrentlyEffective: boolean
  invalidReason: string
  version: VersionToken
}

export interface AssignmentRecord {
  [key: string]: unknown
  assignmentId: number
  tenantId: number
  tenantUserId: number
  tenantUserCode: string
  displayName: string
  roleId: number
  roleCode: string
  roleName: string
  roleType: 'CUSTOM' | 'SYSTEM'
  isTenantAdminIdentity: boolean
  isGroupControlled: boolean
  isAssigned: boolean
  isCurrentlyEffective: boolean
  canMaintain: boolean
  invalidReason: string
  memberVersion: VersionToken
}

export interface TenantOption {
  id: number
  code: string
  name: string
}

export interface MemberOption {
  id: number
  code: string
  name: string
  effective: boolean
  isTenantAdmin: boolean
  isLastTenantAdmin?: boolean
  version: VersionToken
}

export interface CatalogFixture {
  systems: SystemRecord[]
  resourcesBySystem: Record<number, ResourceNode[]>
  deleteImpacts: CatalogDeleteImpact[]
}

export interface AccessControlFixture {
  tenants: TenantOption[]
  members: MemberOption[]
  roles: RoleRecord[]
  catalog: CatalogFixture
  dataDomains: DataDomainRecord[]
  invalidDataPermissionResources: InvalidDataPermissionResourceRecord[]
  roleDataPermissions: RoleDataPermissionRecord[]
  assignments: AssignmentRecord[]
  directResourceIds: number[]
}

export interface UserFunctionPermissionFixture {
  subject: FunctionPermissionSubject
  roles: FunctionPermissionRole[]
  systems: SystemRecord[]
  resourcesBySystem: Record<number, ResourceNode[]>
  effectiveResourceIds: number[]
}

export interface RoleQueryValue {
  tenantId: number
  roleId: number
  roleType: string
  pageIndex: number
  pageSize: number
  keyword: string
  status: string
}

export interface AssignmentQueryValue {
  tenantId: number
  roleId: number
  pageIndex: number
  pageSize: number
  keyword: string
  status: string
}

export interface MemberPermissionSubject {
  tenantId: number
  tenantUserId: number
  tenantUserCode: string
  displayName: string
  isCurrentlyEffective: boolean
  invalidReason: string
}

export interface MemberPermissionTenantContext {
  tenantId: number
  tenantCode: string
  tenantName: string
  tenantUserId: number
  tenantUserCode: string
  displayName: string
  isTenantAdmin: boolean
  isCurrentlyEffective: boolean
  memberVersion: VersionToken
}

export interface MemberPermissionRole {
  id: number
  roleCode: string
  roleName: string
  roleType: 'CUSTOM' | 'SYSTEM'
}

export interface MemberFunctionPermissionRecord {
  [key: string]: unknown
  id: number
  appId: number
  appCode: string
  appName: string
  moduleId: number
  moduleName: string
  menuId: number
  menuName: string
  resourceCode: string
  resourceName: string
  permissionCode: string
  sourceRoleNames: string[]
}

export interface FunctionPermissionWorkspace {
  systems: SystemRecord[]
  resourcesBySystem: Record<number, ResourceNode[]>
  selectedResourceIds: number[]
}

export interface MemberDataPermissionRecord {
  [key: string]: unknown
  key: string
  appCode: string
  appName: string
  domainCode: string
  domainName: string
  roleCode: string
  roleName: string
  scopeMode: string
  targetTenantIds: number[]
  isCurrentlyEffective: boolean
  invalidReason: string
}
