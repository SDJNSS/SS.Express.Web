import type { VersionToken } from '@shared/types/common'

export type EntityStatus = 'ACTIVE' | 'DISABLED'

export interface GroupProfile {
  id: number
  groupCode: string
  groupName: string
  fullName: string
  shortName: string
  logoUrl: string
  logoFileId?: string
  platformName: string
  description: string
  contactName: string
  contactPhone: string
  contactEmail: string
  website: string
  address: string
  timezone: string
  language: string
  remarks: string
  version: VersionToken
  updatedAt: string
}

export interface TenantRecord {
  [key: string]: unknown
  id: number
  groupId: number
  code: string
  name: string
  type: string
  status: EntityStatus
  companyName: string
  address: string
  contactName: string
  contactPhone: string
  contactEmail: string
  domain: string
  subdomain: string
  logoUrl: string
  logoFileId?: string
  timezone: string
  language: string
  sortOrder: number
  version: VersionToken
  remarks: string
  createdAt: string
  memberCount: number
  updatedAt: string
  createdBy: string
  updatedBy: string
  isolationMode?: string
  dbKey?: string
  schemaName?: string
}

export interface OrganizationNode {
  id: number
  tenantId?: number
  tenantCode?: string
  parentId?: number
  code: string
  name: string
  type: string
  leader: string
  status: EntityStatus
  activeMemberCount: number
  leaderTenantUserId?: number
  path?: string
  level?: number
  sortOrder?: number
  remarks?: string
  version?: VersionToken
  updatedAt?: string
  children?: OrganizationNode[]
}

export interface PositionRecord {
  [key: string]: unknown
  id: number
  code: string
  name: string
  type: string
  status: EntityStatus
  activeMemberCount: number
  sortOrder: number
  updatedAt: string
  tenantId?: number
  tenantCode?: string
  remarks?: string
  version?: VersionToken
}

export interface MembershipRecord {
  [key: string]: unknown
  id: number
  tenantId: number
  tenantCode: string
  tenantName: string
  tenantTimezone: string
  userId: number
  memberCode: string
  displayName: string
  memberUserType: string
  userName: string
  realName: string
  nickName: string
  phone: string
  email: string
  avatarUrl: string
  avatarFileId?: string
  globalUserType: string
  userStatus: EntityStatus
  memberStatus: EntityStatus
  effectiveness: 'EFFECTIVE' | 'FUTURE' | 'EXPIRED'
  isTenantAdmin: boolean
  isDefaultTenant: boolean
  joinedAt: string
  leftAt: string
  primaryOrganization: string
  primaryPosition: string
  effectiveStart: string
  effectiveEnd: string
  effectiveRange: string
  remarks: string
  userRemarks: string
  version: VersionToken
  userVersion: VersionToken
  updatedAt: string
  userUpdatedAt: string
  organizations: MemberRelationRecord[]
  positions: MemberRelationRecord[]
  tenantMemberships: TenantMembershipSummary[]
}

export interface MemberRelationRecord {
  [key: string]: unknown
  id: number
  targetId: number
  code: string
  name: string
  isPrimary: boolean
  effectiveStart: string
  effectiveEnd: string
  isCurrentlyEffective: boolean
  status: EntityStatus
  remarks: string
  version: VersionToken
  updatedAt: string
}

export interface TenantMembershipSummary {
  [key: string]: unknown
  id: number
  tenantId: number
  tenantCode: string
  tenantName: string
  memberCode: string
  displayName: string
  status: EntityStatus
  isTenantAdmin: boolean
  isCurrentlyEffective: boolean
  membershipIsCurrentlyEffective: boolean
  memberVersion: VersionToken
  joinedAt: string
  leftAt: string
  tenantStatus: string
  tenantIsDeleted: boolean
  effectiveRange: string
  timezone: string
}

export interface UserTenantAssignmentSnapshot {
  userId: number
  userVersion: VersionToken
  memberships: TenantMembershipSummary[]
}

export interface TenantAssignmentOption {
  id: number
  code: string
  name: string
  status: EntityStatus
}

export interface UserTenantAssignmentTarget {
  tenantId: number
  isTenantAdmin: boolean
  restore: boolean
}

export interface UserTenantAssignmentUpdateValue {
  userId: number
  userVersion: VersionToken
  originalMemberships: Array<{
    tenantUserId: number
    memberVersion: VersionToken
  }>
  tenants: UserTenantAssignmentTarget[]
  removeTenantUserIds: number[]
}

export interface TenantOption {
  id: number
  code: string
  name: string
  type: string
  timezone: string
  isDefault: boolean
  accent: string
}

export type FoundationPreviewState = 'ready' | 'loading' | 'empty' | 'retryable-error'

export interface PositionFormValue {
  name: string
  type: string
  sortOrder: number
  remarks: string
}

export interface OrganizationFormValue {
  parentId: number | undefined
  name: string
  type: string
  leaderTenantUserId: number | undefined
  sortOrder: number
  remarks: string
}

export interface TenantFormValue {
  name: string
  type: string
  contactName: string
  contactPhone: string
  contactEmail: string
  address: string
  domain: string
  subdomain: string
  logoUrl: string
  logoFileId?: string
  timezone: string
  language: string
  sortOrder: number
  remarks: string
}

export interface TenantInitialAdminValue {
  mode: 'existing' | 'new'
  existingUserName: string
  userName: string
  realName: string
  nickName: string
  phone: string
  email: string
  avatarUrl: string
  avatarFileId?: string
  userType: string
  memberUserType: string
  effectiveStart: string
  effectiveEnd: string
  remarks: string
}

export interface UserUpdateValue {
  id: number
  version: VersionToken
  userName: string
  realName: string
  nickName: string
  phone: string
  email: string
  avatarUrl: string
  avatarFileId?: string
  userType: string
  remarks: string
}

export interface MemberUpdateValue {
  id: number
  version: VersionToken
  tenantId: number
  userId: number
  memberCode: string
  displayName: string
  effectiveStart: string
  effectiveEnd: string
  remarks: string
}

export interface MembershipQueryValue {
  tenantIds: number[]
  userId: string
  userName: string
  realName: string
  phone: string
  email: string
  organizationId: number | undefined
  positionId: number | undefined
  roleId: number | undefined
  userStatus: string
  memberStatus: string
}

export type MembershipOptionKind = 'all' | 'organization' | 'position'

export interface MemberCreateValue {
  tenantId: number
  mode: 'existing' | 'new'
  existingUserName: string
  userName: string
  realName: string
  nickName: string
  phone: string
  email: string
  avatarUrl: string
  avatarFileId?: string
  userType: string
  memberUserType: string
  effectiveStart: string
  effectiveEnd: string
  remarks: string
  organizationIds: number[]
  primaryOrganizationId: number | undefined
  positionIds: number[]
  primaryPositionId: number | undefined
}

export interface MemberRelationValue {
  targetId: number | undefined
  primary: boolean
  effectiveStart: string
  effectiveEnd: string
  remarks: string
}

export interface FoundationSelectOption {
  id: number
  label: string
}
