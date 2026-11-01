import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

import type { MemberRelationRecord, MembershipRecord } from '../types/foundation'

dayjs.extend(utc)
dayjs.extend(timezone)

export function tenantWallTime(value: string, zone: string): string {
  if (!value) return ''
  // Offset-bearing API values are instants; offset-free values already are Tenant wall time.
  const date = /(?:Z|[+-]\d{2}:?\d{2})$/iu.test(value)
    ? dayjs(value).tz(zone || 'Asia/Shanghai')
    : dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : ''
}

export function tenantNow(zone: string): string {
  return dayjs()
    .tz(zone || 'Asia/Shanghai')
    .format('YYYY-MM-DD HH:mm:ss')
}

export function memberEffective(member: MembershipRecord): boolean {
  return (
    member.userStatus === 'ACTIVE' &&
    member.memberStatus === 'ACTIVE' &&
    member.effectiveness === 'EFFECTIVE'
  )
}

export function relationUnavailable(
  member: MembershipRecord,
  relation?: MemberRelationRecord,
): string {
  if (!memberEffective(member)) return '仅可维护当前租户的有效用户成员'
  if (relation?.status !== undefined && relation.status !== 'ACTIVE') return '已停用的历史归属只读'
  if (
    relation?.effectiveEnd &&
    tenantWallTime(relation.effectiveEnd, member.tenantTimezone) <= tenantNow(member.tenantTimezone)
  ) {
    return '已结束的历史归属只读；重新归属请新增记录'
  }
  return ''
}
