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

export interface IamSystemResponse {
  id: number
  app_code: string
  app_name: string
  description: string
  icon: string
  route_prefix: string
  status: string
  remarks: string
  can_maintain: boolean
  version: VersionToken
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
}

export interface IamSystemQueryRequest {
  id: number
  keyword: string
}

export interface IamResourceCatalogResponse {
  id: number
  app_id: number
  parent_id: number
  resource_code: string
  resource_name: string
  resource_type: string
  route_path: string
  component: string
  permission_code: string
  icon: string
  http_method: string
  api_path: string
  is_visible: boolean
  sort_order: number
  status: string
  remarks: string
  is_currently_effective: boolean
  invalid_reason: string
  can_maintain: boolean
  version: VersionToken
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
  children: IamResourceCatalogResponse[]
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

export interface IamDataPermissionDomainResponse {
  id: number
  app_id: number
  app_code: string
  domain_code: string
  domain_name: string
  supported_scopes: string[]
  self_definition: string
  status: string
  linked_resource_ids: number[]
  is_configuration_valid: boolean
  invalid_reason: string
}

export interface IamInvalidDataPermissionResourceResponse {
  resource_id: number
  app_id: number
  resource_code: string
  resource_name: string
  invalid_reason: string
}

export interface IamDataPermissionDomainCatalogResponse {
  domains: IamDataPermissionDomainResponse[]
  invalid_resources: IamInvalidDataPermissionResourceResponse[]
}

export interface IamDataDomainQueryRequest {
  app_id: number
  domain_code: string
}

export interface IamRoleDataPermissionDetailResponse {
  domain_code: string
  domain_name: string
  is_configured: boolean
  scope_mode: string
  target_tenant_ids: number[]
  is_currently_effective: boolean
  invalid_reason: string
  version: VersionToken
}

export interface IamRoleDataPermissionsResponse {
  role_id: number
  role_version: VersionToken
  domains: IamRoleDataPermissionDetailResponse[]
}

export interface IamRoleDataPermissionSaveRequest {
  role_id: number
  role_version: VersionToken
  domain_code: string
  scope_mode: string
  clear: boolean
  target_tenant_ids: number[]
}

export interface IamFunctionPermissionSubjectResponse {
  subject_type: string
  subject_id: number
  tenant_id: number
  subject_code: string
  subject_name: string
  is_currently_effective: boolean
  invalid_reason: string
  version: VersionToken
}

export interface IamFunctionPermissionRoleResponse {
  id: number
  tenant_id: number
  tenant_code: string
  role_code: string
  role_name: string
  role_type: string
}

export interface IamFunctionPermissionResourceResponse extends IamResourceCatalogResponse {
  is_direct: boolean
  is_inherited: boolean
  is_navigation_only: boolean
  source_roles: IamFunctionPermissionRoleResponse[]
}

export interface IamFunctionPermissionResourceTreeNode {
  resource: IamFunctionPermissionResourceResponse
  children: IamFunctionPermissionResourceTreeNode[]
}

export interface IamFunctionPermissionTreeResponse {
  subject: IamFunctionPermissionSubjectResponse
  roles: IamFunctionPermissionRoleResponse[]
  direct_resource_ids: number[]
  effective_resource_ids: number[]
  resource_tree: IamFunctionPermissionResourceTreeNode[]
}

export type IamRoleFunctionPermissionsResponse = IamFunctionPermissionTreeResponse

export interface IamRoleFunctionPermissionsSaveRequest {
  role_id: number
  role_version: VersionToken
  direct_resource_ids: number[]
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

export interface IamMemberPermissionSubjectResponse {
  tenant_id: number
  tenant_user_id: number
  tenant_user_code: string
  display_name: string
  is_currently_effective: boolean
  invalid_reason: string
}

export interface IamMemberPermissionRoleResponse {
  id: number
  role_code: string
  role_name: string
  role_type: string
}

export interface IamMemberDataPermissionSourceResponse {
  role: IamMemberPermissionRoleResponse
  scope_mode: string
  target_tenant_ids: number[]
  is_currently_effective: boolean
  invalid_reason: string
}

export interface IamMemberDataPermissionItemResponse {
  app_id: number
  app_code: string
  app_name: string
  domain_code: string
  domain_name: string
  sources: IamMemberDataPermissionSourceResponse[]
}

export interface IamMemberDataPermissionResponse {
  subject: IamMemberPermissionSubjectResponse
  roles: IamMemberPermissionRoleResponse[]
  domains: IamMemberDataPermissionItemResponse[]
}

const endpoints = Object.freeze({
  querySystems: '/AuthorizationCatalog/QuerySystems',
  queryRoles: '/RolePermission/QueryRoles',
  createRole: '/RolePermission/CreateRole',
  updateRole: '/RolePermission/UpdateRole',
  changeRoleStatus: '/RolePermission/ChangeRoleStatus',
  queryFunctionPermissions: '/RolePermission/QueryFunctionPermissions',
  saveFunctionPermissions: '/RolePermission/SaveFunctionPermissions',
  queryDataDomains: '/RolePermission/QueryDataDomains',
  queryDataPermissions: '/RolePermission/QueryDataPermissions',
  saveDataPermission: '/RolePermission/SaveDataPermission',
  queryAssignments: '/MemberRole/Query',
  assignRoles: '/MemberRole/Assign',
  revokeRoles: '/MemberRole/Revoke',
  queryUserFunctionPermissions: '/Permission/QueryUserFunctionPermissions',
  queryMemberFunctionPermissions: '/Permission/QueryMemberFunctionPermissions',
  queryMemberDataPermissions: '/Permission/QueryMemberDataPermissions',
} as const)

async function postIam<Response, Request>(path: string, data: Request): Promise<Response> {
  return requestApi<Response, Request>({
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
  querySystems: (request: IamSystemQueryRequest) =>
    postIam<IamSystemResponse[], IamSystemQueryRequest>(endpoints.querySystems, request),
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
  queryFunctionPermissions: (roleId: number) =>
    postIam<IamRoleFunctionPermissionsResponse, { role_id: number }>(
      endpoints.queryFunctionPermissions,
      { role_id: roleId },
    ),
  saveFunctionPermissions: (request: IamRoleFunctionPermissionsSaveRequest) =>
    postIam<IamRoleFunctionPermissionsResponse, IamRoleFunctionPermissionsSaveRequest>(
      endpoints.saveFunctionPermissions,
      request,
    ),
  queryDataDomains: (request: IamDataDomainQueryRequest) =>
    postIam<IamDataPermissionDomainCatalogResponse, IamDataDomainQueryRequest>(
      endpoints.queryDataDomains,
      request,
    ),
  queryDataPermissions: (roleId: number) =>
    postIam<IamRoleDataPermissionsResponse, { role_id: number }>(endpoints.queryDataPermissions, {
      role_id: roleId,
    }),
  saveDataPermission: (request: IamRoleDataPermissionSaveRequest) =>
    postIam<IamRoleDataPermissionsResponse, IamRoleDataPermissionSaveRequest>(
      endpoints.saveDataPermission,
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
  queryUserFunctionPermissions: (userId: number) =>
    postIam<IamFunctionPermissionTreeResponse, { user_id: number }>(
      endpoints.queryUserFunctionPermissions,
      { user_id: userId },
    ),
  queryMemberFunctionPermissions: (tenantUserId: number) =>
    postIam<IamFunctionPermissionTreeResponse, { tenant_user_id: number }>(
      endpoints.queryMemberFunctionPermissions,
      { tenant_user_id: tenantUserId },
    ),
  queryMemberDataPermissions: (tenantUserId: number) =>
    postIam<IamMemberDataPermissionResponse, { tenant_user_id: number }>(
      endpoints.queryMemberDataPermissions,
      { tenant_user_id: tenantUserId },
    ),
}
