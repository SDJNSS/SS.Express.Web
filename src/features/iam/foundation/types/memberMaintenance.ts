import type { VersionToken } from '@shared/types/common'

export type MemberRelationKind = 'organization' | 'position'
export interface MemberRelationEndValue {
  id: number
  version: VersionToken
  effectiveEnd: string | null
}

export interface MemberAdminChangeValue {
  tenantId: number
  userId: number
  memberVersion: VersionToken
  requestId: string
  appoint: boolean
}
