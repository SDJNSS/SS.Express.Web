import { defineApiPath } from '@shared/api/apiPath'
import { serviceApiPath } from '@shared/api/backendServices'
import { requestApi } from '@shared/api/httpClient'
import { createRequestId } from '@shared/api/requestIdentity'
import type { VersionToken } from '@shared/types/common'

export type IamEntityStatus = 'ACTIVE' | 'DISABLED'

export interface IamPagedResponse<T> {
  total: number
  page_index: number
  page_size: number
  items: T[]
}

export interface IamActionResponse {
  succeeded: boolean
  idempotent: boolean
  version: VersionToken
  message: string
}

export interface IamStatusChangeRequest {
  id: number
  version: VersionToken
  target_status: IamEntityStatus
}

export interface IamGroupResponse {
  id: number
  group_code: string
  group_name: string
  full_name: string
  short_name: string
  logo_url: string
  logo_file_id?: string
  platform_name: string
  description: string
  contact_name: string
  contact_phone: string
  contact_email: string
  website: string
  address: string
  timezone: string
  language: string
  remarks: string
  version: VersionToken
  updated_at: string
}

export type IamGroupUpdateRequest = Omit<
  IamGroupResponse,
  'platform_name' | 'updated_at' | 'group_code'
>

export interface IamTenantResponse {
  group_id: number
  id: number
  tenant_code: string
  tenant_name: string
  tenant_type: string
  status: IamEntityStatus
  company_name: string
  address: string
  contact_name: string
  contact_phone: string
  contact_email: string
  domain: string
  subdomain: string
  logo_url: string
  logo_file_id?: string
  timezone: string
  language: string
  sort_order: number
  version: VersionToken
  isolation_mode: string
  db_key: string
  schema_name: string
  remarks: string
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
}

export interface IamTenantListRequest {
  id?: number
  page_index: number
  page_size: number
  keyword?: string
  status?: string
}

export interface IamNewUserRequest {
  user_name: string
  real_name: string
  nick_name: string
  phone: string
  email: string
  avatar_url: string
  avatar_file_id?: string
  user_type: string
  password?: string
}

export interface IamTenantMemberCreateRequest {
  tenant_id: number
  use_existing_user: boolean
  existing_user_name?: string
  new_user?: IamNewUserRequest
  user_type: string
  effective_start: string
  effective_end?: string
  is_tenant_admin: boolean
  remarks: string
  organizations: Array<{ org_id: number; is_primary: boolean }>
  positions: Array<{ position_id: number; is_primary: boolean }>
}

export interface IamTenantCreateRequest {
  tenant_name: string
  tenant_type: string
  company_name: string
  contact_name: string
  contact_phone: string
  contact_email: string
  address: string
  domain: string
  subdomain: string
  logo_url: string
  logo_file_id?: string
  timezone: string
  language: string
  sort_order: number
  remarks: string
  initial_admin: IamTenantMemberCreateRequest
}

export interface IamTenantUpdateRequest {
  id: number
  version: VersionToken
  group_id: number
  tenant_name: string
  tenant_type: string
  company_name: string
  contact_name: string
  contact_phone: string
  contact_email: string
  address: string
  domain: string
  subdomain: string
  logo_url: string
  logo_file_id?: string
  timezone: string
  language: string
  sort_order: number
  remarks: string
}

export interface IamOrganizationResponse {
  id: number
  tenant_id: number
  tenant_code: string
  parent_id?: number
  org_code: string
  org_name: string
  org_type: string
  leader_tenant_user_id?: number
  leader_display_name: string
  path: string
  level: number
  sort_order: number
  status: IamEntityStatus
  remarks: string
  active_member_count: number
  version: VersionToken
  updated_at: string
  children: IamOrganizationResponse[]
}

export interface IamOrganizationQueryRequest {
  tenant_id: number
  id?: number
  parent_id?: number
  query_type: 'tree' | 'list' | 'detail'
  page_index: number
  page_size: number
  keyword?: string
  status?: string
}

export interface IamOrganizationCreateRequest {
  tenant_id: number
  parent_id?: number
  org_name: string
  org_type: string
  leader_tenant_user_id?: number
  sort_order: number
  remarks: string
}

export interface IamOrganizationUpdateRequest extends IamOrganizationCreateRequest {
  id: number
  version: VersionToken
}

export interface IamOrganizationMoveRequest {
  id: number
  version: VersionToken
  new_parent_id?: number
}

export interface IamPositionResponse {
  id: number
  tenant_id: number
  tenant_code: string
  position_code: string
  position_name: string
  position_type: string
  sort_order: number
  status: IamEntityStatus
  remarks: string
  active_member_count: number
  version: VersionToken
  updated_at: string
}

export interface IamPositionQueryRequest {
  tenant_id: number
  id?: number
  page_index: number
  page_size: number
  keyword?: string
  status?: string
}

export interface IamPositionCreateRequest {
  tenant_id: number
  position_name: string
  position_type: string
  sort_order: number
  remarks: string
}

export interface IamPositionUpdateRequest extends IamPositionCreateRequest {
  id: number
  version: VersionToken
}

export interface IamUserResponse {
  id: number
  user_name: string
  real_name: string
  nick_name: string
  phone: string
  email: string
  avatar_url: string
  avatar_file_id?: string
  user_type: string
  status: IamEntityStatus
  version: VersionToken
  updated_at: string
  remarks?: string
}

export interface IamMemberRelationResponse {
  id: number
  tenant_user_id: number
  org_id?: number
  org_code?: string
  org_name?: string
  position_id?: number
  position_code?: string
  position_name?: string
  is_primary: boolean
  effective_start: string
  effective_end: string
  is_currently_effective: boolean
  status: IamEntityStatus
  remarks: string
  version: VersionToken
  updated_at: string
}

export interface IamTenantMemberResponse {
  id: number
  tenant_id: number
  tenant_code: string
  tenant_name?: string
  tenant_timezone?: string
  user_id: number
  tenant_user_code: string
  display_name: string
  user_type: string
  status: IamEntityStatus
  is_tenant_admin: boolean
  is_default_tenant: boolean
  joined_at: string
  left_at: string
  is_currently_effective: boolean
  remarks: string
  version: VersionToken
  updated_at: string
  user: IamUserResponse
  organizations: IamMemberRelationResponse[]
  positions: IamMemberRelationResponse[]
}

export interface IamUserTenantMembershipResponse {
  user_id: number
  tenant_user_id: number
  tenant_id: number
  tenant_code: string
  tenant_name: string
  tenant_user_code: string
  display_name: string
  user_type: string
  member_status: string
  is_tenant_admin: boolean
  joined_at: string
  left_at: string | null
  is_currently_effective: boolean
  membership_is_currently_effective: boolean
  member_version: VersionToken
  tenant_status?: string
  tenant_is_deleted: boolean
  updated_at: string
}

export interface IamUserTenantsResponse {
  user_id: number
  user_version: VersionToken
  memberships: IamUserTenantMembershipResponse[]
}

export interface IamUserTenantsUpdateRequest {
  user_id: number
  user_version: VersionToken
  original_memberships: Array<{
    tenant_user_id: number
    member_version: VersionToken
  }>
  tenants: Array<{
    tenant_id: number
    is_tenant_admin: boolean
    restore: boolean
  }>
  remove_tenant_user_ids: number[]
  request_id: string
}

export interface IamUserQueryResponse {
  user_id: number
  tenant_user_id: number
  user_status: string
  member_status: string
  user_version: VersionToken
  member_version: VersionToken
  tenant_id: number
  tenant_code: string
  tenant_user_code: string
  display_name: string
  is_tenant_admin: boolean
  joined_at: string | null
  left_at: string | null
  is_member_currently_effective: boolean
  user: IamUserResponse
  organizations: IamMemberRelationResponse[]
  positions: IamMemberRelationResponse[]
  memberships: IamUserTenantMembershipResponse[]
}

export interface IamUserListRequest {
  tenant_ids: number[]
  user_id?: number
  user_name?: string
  real_name?: string
  phone?: string
  email?: string
  org_id?: number
  position_id?: number
  role_id?: number
  user_status?: string
  member_status?: string
  page_index: number
  page_size: number
  status?: string
}

export interface IamMembershipFilterOption {
  id: number
  tenant_id: number
  code: string
  name: string
}

export interface IamMembershipFilterOptionsRequest {
  tenant_ids: number[]
  kind: 'organization' | 'position' | 'role'
  keyword?: string
  page_index: number
  page_size: number
}

export interface IamTenantMemberUpdateRequest {
  id: number
  version: VersionToken
  tenant_id: number
  user_id: number
  effective_start: string
  effective_end?: string
  remarks: string
}

export interface IamUserUpdateRequest {
  id: number
  version: VersionToken
  user_name: string
  real_name: string
  nick_name: string
  phone: string
  email: string
  avatar_url: string
  avatar_file_id?: string
  user_type: string
  remarks: string
}

export interface IamMemberRelationSaveRequest {
  id?: number
  version?: VersionToken
  tenant_user_id: number
  target_id: number
  is_primary: boolean
  effective_start: string
  effective_end?: string
  remarks: string
}

export interface IamTenantSwitchRequest {
  tenant_id: number
  set_as_default: boolean
  session_version: VersionToken
  request_id: string
}

export interface IamLoginTenantResponse {
  tenant_id: number
  tenant_user_id: number
  tenant_code: string
  tenant_name: string
  tenant_type: string
  logo_url: string
  logo_file_id?: string
  timezone: string
  is_default: boolean
}

export interface IamTenantSwitchResponse {
  token: string
  login_state: string
  session_id: number
  session_version: VersionToken
  expires_at: string
  user_version: VersionToken
  current_tenant: IamLoginTenantResponse | null
  available_tenants: IamLoginTenantResponse[]
}

export interface IamLogoutResponse {
  succeeded: boolean
  already_logged_out: boolean
}

const endpoints = Object.freeze({
  groupInfo: '/Group/Info',
  groupUpdate: '/Group/Update',
  tenantQuery: '/Tenant/Query',
  tenantCreate: '/Tenant/Create',
  tenantUpdate: '/Tenant/Update',
  tenantStatus: '/Tenant/ChangeStatus',
  organizationQuery: '/Organization/Query',
  organizationCreate: '/Organization/Create',
  organizationUpdate: '/Organization/Update',
  organizationMove: '/Organization/Move',
  organizationStatus: '/Organization/ChangeStatus',
  positionQuery: '/Position/Query',
  positionCreate: '/Position/Create',
  positionUpdate: '/Position/Update',
  positionStatus: '/Position/ChangeStatus',
  userQuery: '/Membership/QueryUsers',
  membershipFilterOptions: '/Membership/QueryFilterOptions',
  userTenantsQuery: '/Membership/QueryUserTenants',
  userTenantsUpdate: '/Membership/UpdateUserTenants',
  memberCreate: '/Membership/CreateMember',
  memberUpdate: '/Membership/UpdateMember',
  userUpdate: '/Membership/UpdateUser',
  memberStatus: '/Membership/ChangeMemberStatus',
  userStatus: '/Membership/ChangeUserStatus',
  saveOrganization: '/Membership/SaveOrganization',
  savePosition: '/Membership/SavePosition',
  switchTenant: '/Auth/SwitchTenant',
  logout: '/Auth/Logout',
} as const)

async function postIam<Response, Request>(
  path: string,
  data: Request,
  requestId = createRequestId(),
  signal?: AbortSignal,
): Promise<Response> {
  return requestApi<Response, Request>({
    method: 'POST',
    url: serviceApiPath('iam', defineApiPath(path)),
    data,
    ...(signal ? { signal } : {}),
    headers: {
      Accept: 'text/plain',
      'Content-Type': 'application/json-patch+json',
      'X-Request-ID': requestId,
    },
  })
}

export const foundationApi = {
  groupInfo: () =>
    postIam<IamGroupResponse, { request_id: string }>(endpoints.groupInfo, {
      request_id: createRequestId(),
    }),
  updateGroup: (request: IamGroupUpdateRequest) =>
    postIam<IamGroupResponse, IamGroupUpdateRequest>(endpoints.groupUpdate, request),
  queryTenants: (request: IamTenantListRequest) =>
    postIam<IamPagedResponse<IamTenantResponse>, IamTenantListRequest>(
      endpoints.tenantQuery,
      request,
    ),
  createTenant: (request: IamTenantCreateRequest) =>
    postIam<IamTenantResponse, IamTenantCreateRequest>(endpoints.tenantCreate, request),
  updateTenant: (request: IamTenantUpdateRequest) =>
    postIam<IamTenantResponse, IamTenantUpdateRequest>(endpoints.tenantUpdate, request),
  changeTenantStatus: (request: IamStatusChangeRequest) =>
    postIam<IamActionResponse, IamStatusChangeRequest>(endpoints.tenantStatus, request),
  queryOrganizations: (request: IamOrganizationQueryRequest) =>
    postIam<IamPagedResponse<IamOrganizationResponse>, IamOrganizationQueryRequest>(
      endpoints.organizationQuery,
      request,
    ),
  createOrganization: (request: IamOrganizationCreateRequest) =>
    postIam<IamOrganizationResponse, IamOrganizationCreateRequest>(
      endpoints.organizationCreate,
      request,
    ),
  updateOrganization: (request: IamOrganizationUpdateRequest) =>
    postIam<IamOrganizationResponse, IamOrganizationUpdateRequest>(
      endpoints.organizationUpdate,
      request,
    ),
  moveOrganization: (request: IamOrganizationMoveRequest) =>
    postIam<IamOrganizationResponse, IamOrganizationMoveRequest>(
      endpoints.organizationMove,
      request,
    ),
  changeOrganizationStatus: (request: IamStatusChangeRequest) =>
    postIam<IamActionResponse, IamStatusChangeRequest>(endpoints.organizationStatus, request),
  queryPositions: (request: IamPositionQueryRequest) =>
    postIam<IamPagedResponse<IamPositionResponse>, IamPositionQueryRequest>(
      endpoints.positionQuery,
      request,
    ),
  createPosition: (request: IamPositionCreateRequest) =>
    postIam<IamPositionResponse, IamPositionCreateRequest>(endpoints.positionCreate, request),
  updatePosition: (request: IamPositionUpdateRequest) =>
    postIam<IamPositionResponse, IamPositionUpdateRequest>(endpoints.positionUpdate, request),
  changePositionStatus: (request: IamStatusChangeRequest) =>
    postIam<IamActionResponse, IamStatusChangeRequest>(endpoints.positionStatus, request),
  queryUsers: (request: IamUserListRequest) =>
    postIam<IamPagedResponse<IamUserQueryResponse>, IamUserListRequest>(
      endpoints.userQuery,
      request,
    ),
  queryMembershipFilterOptions: (
    request: IamMembershipFilterOptionsRequest,
    signal?: AbortSignal,
  ) =>
    postIam<IamPagedResponse<IamMembershipFilterOption>, IamMembershipFilterOptionsRequest>(
      endpoints.membershipFilterOptions,
      request,
      createRequestId(),
      signal,
    ),
  queryUserTenants: (userId: number) =>
    postIam<IamUserTenantsResponse, { user_id: number }>(endpoints.userTenantsQuery, {
      user_id: userId,
    }),
  updateUserTenants: (request: Omit<IamUserTenantsUpdateRequest, 'request_id'>) => {
    const requestId = createRequestId()
    const payload: IamUserTenantsUpdateRequest = { ...request, request_id: requestId }
    return postIam<IamUserTenantsResponse, IamUserTenantsUpdateRequest>(
      endpoints.userTenantsUpdate,
      payload,
      requestId,
    )
  },
  createMember: (request: IamTenantMemberCreateRequest) =>
    postIam<IamTenantMemberResponse, IamTenantMemberCreateRequest>(endpoints.memberCreate, request),
  updateMember: (request: IamTenantMemberUpdateRequest) =>
    postIam<IamTenantMemberResponse, IamTenantMemberUpdateRequest>(endpoints.memberUpdate, request),
  updateUser: (request: IamUserUpdateRequest) =>
    postIam<IamUserResponse, IamUserUpdateRequest>(endpoints.userUpdate, request),
  changeMemberStatus: (request: IamStatusChangeRequest) =>
    postIam<IamActionResponse, IamStatusChangeRequest>(endpoints.memberStatus, request),
  changeUserStatus: (request: IamStatusChangeRequest) =>
    postIam<IamActionResponse, IamStatusChangeRequest>(endpoints.userStatus, request),
  saveOrganization: (request: IamMemberRelationSaveRequest) => {
    const { target_id, ...rest } = request
    return postIam<
      IamMemberRelationResponse,
      Omit<IamMemberRelationSaveRequest, 'target_id'> & { org_id: number }
    >(endpoints.saveOrganization, { ...rest, org_id: target_id })
  },
  savePosition: (request: IamMemberRelationSaveRequest) => {
    const { target_id, ...rest } = request
    return postIam<
      IamMemberRelationResponse,
      Omit<IamMemberRelationSaveRequest, 'target_id'> & { position_id: number }
    >(endpoints.savePosition, { ...rest, position_id: target_id })
  },
  switchTenant: (request: IamTenantSwitchRequest) =>
    postIam<IamTenantSwitchResponse, IamTenantSwitchRequest>(endpoints.switchTenant, request),
  logout: () =>
    postIam<IamLogoutResponse, { request_id: string }>(endpoints.logout, {
      request_id: createRequestId(),
    }),
}
