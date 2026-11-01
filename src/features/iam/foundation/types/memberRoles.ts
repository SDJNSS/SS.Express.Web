import type { VersionToken } from '@shared/types/common'

export interface MemberRoleRow {
  [key: string]: unknown
  roleId: number
  roleName: string
  roleCode: string
  effective: boolean
  removable: boolean
  reason: string
}

export interface MemberRoleSnapshot {
  tenantUserId: number
  memberVersion: VersionToken
  effective: boolean
  roles: MemberRoleRow[]
  candidates: Array<{ id: number; name: string }>
}
