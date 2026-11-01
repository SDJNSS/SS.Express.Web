import { defineApiPath } from '@shared/api/apiPath'

import { serviceApiPath } from '@shared/api/backendServices'

import { requestApi } from '@shared/api/httpClient'

import { createRequestId } from '@shared/api/requestIdentity'

import type { VersionToken } from '@shared/types/common'

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
  target_status: string
}

export interface IamRoleDetailResponse {
  id: number
  tenant_id: number
  tenant_code: string
  role_code: string
  role_name: string
  role_type: string
  sort_order: number
  status: string
  description: string
  remarks: string
  is_currently_effective: boolean
  is_group_controlled: boolean
  can_maintain: boolean
  version: VersionToken
  created_at: string
  updated_at: string
}

export interface IamRoleQueryRequest {
  tenant_id: number
  id: number
  role_type: string
  page_index: number
  page_size: number
  keyword: string
  status: string
}

export interface IamRoleCreateRequest {
  tenant_id: number
  role_name: string
  description: string
  remarks: string
  sort_order: number
}

export interface IamRoleUpdateRequest {
  id: number
  version: VersionToken
  tenant_id: number
  role_type: string
  status: string
  role_name: string
  description: string
  remarks: string
  sort_order: number
}

export interface IamRoleAssignmentDetailResponse {
  assignment_id: number
  tenant_id: number
  tenant_user_id: number
  tenant_user_code: string
  display_name: string
  role_id: number
  role_code: string
  role_name: string
  role_type: string
  is_tenant_admin_identity: boolean
  is_group_controlled: boolean
  is_assigned: boolean
  is_currently_effective: boolean
  can_maintain: boolean
  invalid_reason: string
  member_version: VersionToken
}

export interface IamRoleAssignmentQueryRequest {
  tenant_id: number
  tenant_user_id?: number
  role_id?: number
  page_index: number
  page_size: number
  keyword: string
  status: string
}

export interface IamRoleAssignmentMutationRequest {
  tenant_user_id: number
  member_version: VersionToken
  role_ids: number[]
}

const endpoints = Object.freeze({
  queryRoles: '/RolePermission/QueryRoles',
  createRole: '/RolePermission/CreateRole',
  updateRole: '/RolePermission/UpdateRole',
  changeRoleStatus: '/RolePermission/ChangeRoleStatus',
  queryAssignments: '/MemberRole/Query',
  assignRoles: '/MemberRole/Assign',
  revokeRoles: '/MemberRole/Revoke',
} as const)

async function postIam<Response, Request>(path: string, data: Request): Promise<Response> {
  return requestApi<Response, Request>({
    tenantScoped: true,
    method: 'POST',
    url: serviceApiPath('iam', defineApiPath(path)),
    data,
    headers: {
      Accept: 'text/plain',
      'Content-Type': 'application/json-patch+json',
      'X-Request-ID': createRequestId(),
    },
  })
}

export const accessControlApi = {
  queryRoles: (request: IamRoleQueryRequest) =>
    postIam<IamPagedResponse<IamRoleDetailResponse>, IamRoleQueryRequest>(
      endpoints.queryRoles,
      request,
    ),
  createRole: (request: IamRoleCreateRequest) =>
    postIam<IamRoleDetailResponse, IamRoleCreateRequest>(endpoints.createRole, request),
  updateRole: (request: IamRoleUpdateRequest) =>
    postIam<IamRoleDetailResponse, IamRoleUpdateRequest>(endpoints.updateRole, request),
  changeRoleStatus: (request: IamStatusChangeRequest & { tenant_id: number }) =>
    postIam<IamActionResponse, IamStatusChangeRequest & { tenant_id: number }>(
      endpoints.changeRoleStatus,
      request,
    ),
  queryAssignments: (request: IamRoleAssignmentQueryRequest) =>
    postIam<IamPagedResponse<IamRoleAssignmentDetailResponse>, IamRoleAssignmentQueryRequest>(
      endpoints.queryAssignments,
      request,
    ),
  assignRoles: (request: IamRoleAssignmentMutationRequest) =>
    postIam<IamRoleAssignmentDetailResponse[], IamRoleAssignmentMutationRequest>(
      endpoints.assignRoles,
      request,
    ),
  revokeRoles: (request: IamRoleAssignmentMutationRequest) =>
    postIam<IamRoleAssignmentDetailResponse[], IamRoleAssignmentMutationRequest>(
      endpoints.revokeRoles,
      request,
    ),
}
