import type { VersionToken } from '@shared/types/common'

export type AccessControlPreviewState = 'ready' | 'loading' | 'empty' | 'retryable-error'

export type EntityStatus = 'ACTIVE' | 'DISABLED'

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

export interface AccessControlFixture {
  tenants: TenantOption[]
  members: MemberOption[]
  roles: RoleRecord[]
  assignments: AssignmentRecord[]
}
