import type {
  IamGroupResponse,
  IamMemberRelationResponse,
  IamOrganizationResponse,
  IamPositionResponse,
  IamTenantMemberResponse,
  IamTenantResponse,
  IamUserQueryResponse,
  IamUserTenantsResponse,
  IamUserTenantMembershipResponse,
} from '../api/foundationApi'
import type {
  EntityStatus,
  GroupProfile,
  MemberRelationRecord,
  MembershipRecord,
  OrganizationNode,
  PositionRecord,
  TenantMembershipSummary,
  TenantRecord,
  UserTenantAssignmentSnapshot,
} from '../types/foundation'

function status(value: string | null | undefined): EntityStatus {
  return value?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'DISABLED'
}

function value(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

export function mapGroup(response: IamGroupResponse): GroupProfile {
  return {
    id: response.id,
    groupCode: value(response.group_code),
    groupName: value(response.group_name),
    fullName: value(response.full_name),
    shortName: value(response.short_name),
    logoUrl: value(response.logo_url),
    logoFileId: value(response.logo_file_id),
    platformName: value(response.platform_name),
    description: value(response.description),
    contactName: value(response.contact_name),
    contactPhone: value(response.contact_phone),
    contactEmail: value(response.contact_email),
    website: value(response.website),
    address: value(response.address),
    timezone: value(response.timezone),
    language: value(response.language),
    remarks: value(response.remarks),
    version: response.version,
    updatedAt: value(response.updated_at),
  }
}

export function mapTenant(response: IamTenantResponse): TenantRecord {
  return {
    id: response.id,
    groupId: response.group_id,
    code: value(response.tenant_code),
    name: value(response.tenant_name),
    type: value(response.tenant_type),
    status: status(response.status),
    companyName: value(response.company_name),
    address: value(response.address),
    contactName: value(response.contact_name),
    contactPhone: value(response.contact_phone),
    contactEmail: value(response.contact_email),
    domain: value(response.domain),
    subdomain: value(response.subdomain),
    logoUrl: value(response.logo_url),
    logoFileId: value(response.logo_file_id),
    timezone: value(response.timezone),
    language: value(response.language),
    sortOrder: response.sort_order,
    version: response.version,
    remarks: value(response.remarks),
    createdAt: value(response.created_at),
    memberCount: 0,
    updatedAt: value(response.updated_at),
    createdBy: value(response.created_by),
    updatedBy: value(response.updated_by),
    isolationMode: value(response.isolation_mode),
    dbKey: value(response.db_key),
    schemaName: value(response.schema_name),
  }
}

export function mapOrganization(response: IamOrganizationResponse): OrganizationNode {
  return {
    id: response.id,
    tenantId: response.tenant_id,
    tenantCode: value(response.tenant_code),
    ...(response.parent_id ? { parentId: response.parent_id } : {}),
    code: value(response.org_code),
    name: value(response.org_name),
    type: value(response.org_type),
    leader: value(response.leader_display_name),
    ...(response.leader_tenant_user_id
      ? { leaderTenantUserId: response.leader_tenant_user_id }
      : {}),
    status: status(response.status),
    activeMemberCount: response.active_member_count,
    path: value(response.path),
    level: response.level,
    sortOrder: response.sort_order,
    remarks: value(response.remarks),
    version: response.version,
    updatedAt: value(response.updated_at),
    children: (response.children ?? []).map(mapOrganization),
  }
}

export function mapPosition(response: IamPositionResponse): PositionRecord {
  return {
    id: response.id,
    tenantId: response.tenant_id,
    tenantCode: value(response.tenant_code),
    code: value(response.position_code),
    name: value(response.position_name),
    type: value(response.position_type),
    status: status(response.status),
    activeMemberCount: response.active_member_count,
    sortOrder: response.sort_order,
    remarks: value(response.remarks),
    version: response.version,
    updatedAt: value(response.updated_at),
  }
}

function mapRelation(
  response: IamMemberRelationResponse,
  kind: 'organization' | 'position',
): MemberRelationRecord {
  return {
    id: response.id,
    targetId: kind === 'organization' ? (response.org_id ?? 0) : (response.position_id ?? 0),
    code: kind === 'organization' ? value(response.org_code) : value(response.position_code),
    name: kind === 'organization' ? value(response.org_name) : value(response.position_name),
    isPrimary: response.is_primary,
    effectiveStart: value(response.effective_start),
    effectiveEnd: value(response.effective_end),
    isCurrentlyEffective: response.is_currently_effective,
    status: status(response.status),
    remarks: value(response.remarks),
    version: response.version,
    updatedAt: value(response.updated_at),
  }
}

function membershipSummary(member: IamTenantMemberResponse): TenantMembershipSummary {
  return {
    id: member.id,
    tenantId: member.tenant_id,
    tenantCode: value(member.tenant_code),
    tenantName: value(member.tenant_name) || value(member.tenant_code),
    memberCode: value(member.tenant_user_code),
    displayName: value(member.display_name),
    status: status(member.status),
    isTenantAdmin: member.is_tenant_admin,
    isCurrentlyEffective: member.is_currently_effective,
    membershipIsCurrentlyEffective: member.is_currently_effective,
    memberVersion: member.version,
    joinedAt: value(member.joined_at),
    leftAt: value(member.left_at),
    tenantStatus: 'ACTIVE',
    tenantIsDeleted: false,
    effectiveRange: [member.joined_at, member.left_at].filter(Boolean).join(' - '),
    timezone: value(member.tenant_timezone),
  }
}

export interface UserQueryTenantContext {
  id?: number
  name?: string
  timezone?: string
}

function queryMembershipSummary(
  member: IamUserTenantMembershipResponse,
  tenantContext: UserQueryTenantContext,
  selectedTenantId: number,
): TenantMembershipSummary {
  const contextMatches =
    tenantContext.id !== undefined
      ? tenantContext.id === member.tenant_id
      : selectedTenantId === member.tenant_id

  return {
    id: member.tenant_user_id,
    tenantId: member.tenant_id,
    tenantCode: value(member.tenant_code),
    tenantName:
      value(member.tenant_name) ||
      (contextMatches ? value(tenantContext.name) : '') ||
      value(member.tenant_code),
    memberCode: value(member.tenant_user_code),
    displayName: value(member.display_name),
    status: status(member.member_status),
    isTenantAdmin: member.is_tenant_admin,
    isCurrentlyEffective: member.is_currently_effective,
    membershipIsCurrentlyEffective: member.membership_is_currently_effective,
    memberVersion: member.member_version,
    joinedAt: value(member.joined_at),
    leftAt: value(member.left_at),
    tenantStatus: value(member.tenant_status).toUpperCase(),
    tenantIsDeleted: member.tenant_is_deleted ?? false,
    effectiveRange: [member.joined_at, member.left_at].filter(Boolean).join(' - '),
    timezone: contextMatches ? value(tenantContext.timezone) : '',
  }
}

export function mapUserTenantSnapshot(
  response: IamUserTenantsResponse,
): UserTenantAssignmentSnapshot {
  return {
    userId: response.user_id,
    userVersion: response.user_version,
    memberships: response.memberships.map((member) =>
      queryMembershipSummary(member, {}, member.tenant_id),
    ),
  }
}

export function mapMember(
  member: IamTenantMemberResponse,
  allMemberships: IamTenantMemberResponse[] = [member],
): MembershipRecord {
  const user = member.user
  const organizations = (member.organizations ?? []).map((item) =>
    mapRelation(item, 'organization'),
  )
  const positions = (member.positions ?? []).map((item) => mapRelation(item, 'position'))
  const primaryOrganization =
    organizations.find((item) => item.isPrimary && item.isCurrentlyEffective) ?? organizations[0]
  const primaryPosition =
    positions.find((item) => item.isPrimary && item.isCurrentlyEffective) ?? positions[0]
  return {
    id: member.id,
    tenantId: member.tenant_id,
    tenantCode: value(member.tenant_code),
    tenantName: value(member.tenant_name) || value(member.tenant_code),
    tenantTimezone: value(member.tenant_timezone),
    userId: member.user_id,
    memberCode: value(member.tenant_user_code),
    displayName: value(member.display_name),
    memberUserType: value(member.user_type),
    userName: value(user.user_name),
    realName: value(user.real_name),
    nickName: value(user.nick_name),
    phone: value(user.phone),
    email: value(user.email),
    avatarUrl: value(user.avatar_url),
    avatarFileId: value(user.avatar_file_id),
    globalUserType: value(user.user_type),
    userStatus: status(user.status),
    memberStatus: status(member.status),
    effectiveness: member.is_currently_effective
      ? 'EFFECTIVE'
      : member.left_at
        ? 'EXPIRED'
        : 'FUTURE',
    isTenantAdmin: member.is_tenant_admin,
    isDefaultTenant: member.is_default_tenant,
    joinedAt: value(member.joined_at),
    leftAt: value(member.left_at),
    primaryOrganization: primaryOrganization?.name ?? '',
    primaryPosition: primaryPosition?.name ?? '',
    effectiveStart: value(member.joined_at),
    effectiveEnd: value(member.left_at),
    effectiveRange: [member.joined_at, member.left_at].filter(Boolean).join(' - '),
    remarks: value(member.remarks),
    userRemarks: value(user.remarks),
    version: member.version,
    userVersion: user.version,
    updatedAt: value(member.updated_at),
    userUpdatedAt: value(user.updated_at),
    organizations,
    positions,
    tenantMemberships: allMemberships.map(membershipSummary),
  }
}

export function mapUserQuery(
  response: IamUserQueryResponse,
  tenantContext: UserQueryTenantContext = {},
): MembershipRecord {
  const memberships = response.memberships ?? []
  const currentMembership =
    memberships.find((item) => item.tenant_user_id === response.tenant_user_id) ??
    memberships.find((item) => item.tenant_id === response.tenant_id) ??
    (tenantContext.id === undefined
      ? undefined
      : memberships.find((item) => item.tenant_id === tenantContext.id))
  const tenantId = response.tenant_id || currentMembership?.tenant_id || tenantContext.id || 0
  const contextMatches = tenantContext.id === undefined || tenantContext.id === tenantId
  const tenantCode = value(response.tenant_code) || value(currentMembership?.tenant_code)
  const tenantName =
    value(currentMembership?.tenant_name) ||
    (contextMatches ? value(tenantContext.name) : '') ||
    tenantCode
  const tenantTimezone = contextMatches ? value(tenantContext.timezone) : ''
  const hasCurrentMember = response.tenant_user_id > 0 || currentMembership !== undefined
  const tenantUserId = response.tenant_user_id || currentMembership?.tenant_user_id || 0
  const joinedAt = value(response.joined_at) || value(currentMembership?.joined_at)
  const leftAt = value(response.left_at) || value(currentMembership?.left_at)
  const memberStatus = value(response.member_status) || value(currentMembership?.member_status)
  const isCurrentlyEffective =
    response.tenant_user_id > 0
      ? response.is_member_currently_effective
      : (currentMembership?.is_currently_effective ?? false)
  const organizations = hasCurrentMember
    ? (response.organizations ?? []).map((item) => mapRelation(item, 'organization'))
    : []
  const positions = hasCurrentMember
    ? (response.positions ?? []).map((item) => mapRelation(item, 'position'))
    : []
  const primaryOrganization =
    organizations.find((item) => item.isPrimary && item.isCurrentlyEffective) ?? organizations[0]
  const primaryPosition =
    positions.find((item) => item.isPrimary && item.isCurrentlyEffective) ?? positions[0]
  const user = response.user

  return {
    // A global user without a matching Tenant membership must never masquerade as a member.
    id: tenantUserId,
    tenantId,
    tenantCode,
    tenantName,
    tenantTimezone,
    userId: response.user_id || user.id,
    memberCode: value(response.tenant_user_code) || value(currentMembership?.tenant_user_code),
    displayName:
      value(response.display_name) ||
      value(currentMembership?.display_name) ||
      value(user.real_name) ||
      value(user.nick_name) ||
      value(user.user_name),
    memberUserType: value(currentMembership?.user_type),
    userName: value(user.user_name),
    realName: value(user.real_name),
    nickName: value(user.nick_name),
    phone: value(user.phone),
    email: value(user.email),
    avatarUrl: value(user.avatar_url),
    avatarFileId: value(user.avatar_file_id),
    globalUserType: value(user.user_type),
    userStatus: status(response.user_status || user.status),
    memberStatus: status(memberStatus),
    effectiveness: !hasCurrentMember
      ? 'EXPIRED'
      : isCurrentlyEffective
        ? 'EFFECTIVE'
        : leftAt
          ? 'EXPIRED'
          : 'FUTURE',
    isTenantAdmin:
      response.tenant_user_id > 0
        ? response.is_tenant_admin
        : (currentMembership?.is_tenant_admin ?? false),
    // QueryUsers does not expose whether the queried user's membership is their default Tenant.
    isDefaultTenant: false,
    joinedAt,
    leftAt,
    primaryOrganization: primaryOrganization?.name ?? '',
    primaryPosition: primaryPosition?.name ?? '',
    effectiveStart: joinedAt,
    effectiveEnd: leftAt,
    effectiveRange: [joinedAt, leftAt].filter(Boolean).join(' - '),
    remarks: '',
    userRemarks: value(user.remarks),
    version:
      response.tenant_user_id > 0
        ? response.member_version
        : (currentMembership?.member_version ?? ''),
    userVersion: response.user_version || user.version,
    updatedAt: value(currentMembership?.updated_at),
    userUpdatedAt: value(user.updated_at),
    organizations,
    positions,
    tenantMemberships: memberships.map((item) =>
      queryMembershipSummary(item, tenantContext, tenantId),
    ),
  }
}
