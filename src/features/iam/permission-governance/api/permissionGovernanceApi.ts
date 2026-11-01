import { defineApiPath } from '@shared/api/apiPath'
import { getStoredAuthSession } from '@shared/api/authSession'
import { serviceApiPath } from '@shared/api/backendServices'
import { ApiError, requestApi } from '@shared/api/httpClient'
import { createRequestId } from '@shared/api/requestIdentity'
import { normalizeEntityIdFields } from '@shared/utils/entityId'
import type { EntityId } from '@shared/types/entityId'
import type { VersionToken } from '@shared/types/common'

export { ApiError, createRequestId }
export const getPermissionGovernanceAuthSession = getStoredAuthSession

export interface IamPagedResponse<T> {
  total: number
  page_index: number
  page_size: number
  items: T[]
}

export type IamPermissionEntityStatus = 'active' | 'inactive'
export type IamPermissionResourceSource = 'frontend' | 'backend'
export type IamPermissionResourceType = 'module' | 'menu' | 'button' | 'button_page' | 'function'
export type IamFunctionAccessMode = 'read' | 'write'

export interface IamActionResponse {
  succeeded: boolean
  idempotent: boolean
  version: VersionToken
  message: string
}

export interface IamSystemQueryRequest {
  id?: EntityId
  app_code?: string
  managed_key?: string
  include_deleted?: boolean
}

export interface IamSystemResponse {
  id: EntityId
  app_code: string
  app_name: string
  description: string
  icon: string
  route_prefix: string
  status: IamPermissionEntityStatus
  remarks: string
  default_module_id: EntityId
  managed_by: string
  managed_key: string
  definition_hash: string
  source_revision: string
  source_schema_version: string
  last_sync_run_id: string
  is_deleted: boolean
  request_id: string
  idempotent: boolean
  no_op: boolean
  version: VersionToken
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
}

export interface IamPermissionAppQueryResponse {
  apps: IamSystemResponse[]
  snapshot_version: VersionToken
  scope_complete: boolean
  scope: string
}

export interface IamPermissionResourceQueryRequest {
  id?: EntityId
  resource_code?: string
  app_id?: EntityId
  parent_id?: EntityId
  source?: IamPermissionResourceSource
  resource_type?: IamPermissionResourceType
  api_path?: string
  http_method?: string
  page_index?: number
  page_size?: number
  keyword?: string
  status?: IamPermissionEntityStatus
}

export interface IamPermissionResourceGetRequest {
  id?: EntityId
  resource_code?: string
}

export interface IamPermissionResourceAppSummaryResponse {
  id: EntityId
  app_code: string
  app_name: string
}

export interface IamPermissionResourceParentSummaryResponse {
  id: EntityId
  resource_code: string
  resource_name: string
  resource_type: IamPermissionResourceType
}

export interface IamPermissionResourceResponse {
  id: EntityId
  app_id: EntityId
  parent_id: EntityId
  resource_code: string
  resource_name: string
  source: IamPermissionResourceSource
  resource_type: IamPermissionResourceType
  route_path: string
  component: string
  icon: string
  http_method: string
  api_path: string
  function_access_mode: IamFunctionAccessMode | null
  is_visible: boolean
  sort_order: number
  status: IamPermissionEntityStatus
  remarks: string
  version: VersionToken
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
  app: IamPermissionResourceAppSummaryResponse | null
  parent: IamPermissionResourceParentSummaryResponse | null
  authorization_category?: import('../types/permissionGovernance').ResourceAuthorizationCategory
  is_composable?: boolean
  lifecycle?: import('../types/permissionGovernance').ResourceLifecycle
  managed_by?: string
  managed_key?: string
  definition_hash?: string
  source_revision?: string
  source_schema_version?: string
  last_sync_run_id?: string
  request_id?: string
  idempotent?: boolean
  no_op?: boolean
}

export interface IamPermissionResourceCreateRequest {
  app_id: EntityId
  parent_id: EntityId
  resource_code: string
  resource_name: string
  source: IamPermissionResourceSource
  resource_type: IamPermissionResourceType
  route_path: string
  component: string
  icon: string
  http_method: string
  api_path: string
  function_access_mode?: IamFunctionAccessMode | null
  is_visible: boolean
  sort_order: number
  status: IamPermissionEntityStatus
  remarks: string
  authorization_category: import('../types/permissionGovernance').ResourceAuthorizationCategory
  is_composable: boolean
  lifecycle: import('../types/permissionGovernance').ResourceLifecycle
  request_id: string
}

export interface IamPermissionResourceUpdateRequest {
  id: EntityId
  version: VersionToken
  app_id: EntityId
  parent_id: EntityId
  resource_name: string
  route_path: string
  component: string
  icon: string
  http_method: string
  api_path: string
  function_access_mode?: IamFunctionAccessMode | null
  is_visible: boolean
  sort_order: number
  remarks: string
  authorization_category: import('../types/permissionGovernance').ResourceAuthorizationCategory
  is_composable: boolean
  lifecycle: import('../types/permissionGovernance').ResourceLifecycle
  request_id: string
}

export interface IamPermissionResourceStatusRequest {
  id: EntityId
  version: VersionToken
  target_status: IamPermissionEntityStatus
}

export interface IamPermissionResourceDeleteRequest {
  id: EntityId
  version: VersionToken
  confirm: boolean
}

export interface IamPermissionResourceImpactRequest {
  id: EntityId
}

export interface IamPermissionResourceSchemeImpactResponse {
  permission_id: EntityId
  permission_code: string
  permission_name: string
  status: IamPermissionEntityStatus
}

export interface IamPermissionSchemeRoleResponse {
  role_id: EntityId
  role_code: string
  role_name: string
  status: IamPermissionEntityStatus
}

export interface IamPermissionResourceImpactResponse {
  resource_id: EntityId
  child_resource_count: number
  active_child_resource_count: number
  permission_reference_count: number
  active_permission_reference_count: number
  active_permission_count: number
  active_role_count: number
  role_ids: EntityId[]
  permissions: IamPermissionResourceSchemeImpactResponse[]
  roles: IamPermissionSchemeRoleResponse[]
}

export interface IamPermissionSchemeQueryRequest {
  tenant_id: EntityId
  app_id?: EntityId
  id?: EntityId
  /** true 时由服务端批量返回资源树明细；列表默认保持轻量。 */
  include_details?: boolean
  page_index?: number
  page_size?: number
  keyword?: string
  status?: IamPermissionEntityStatus
}

export interface IamPermissionSchemeGetRequest {
  tenant_id: EntityId
  id: EntityId
}

export interface IamPermissionSchemeRefNodeResponse {
  ref_id: EntityId
  parent_ref_id: EntityId | null
  sort_order: number
  status: IamPermissionEntityStatus
  remarks: string
  resource: IamPermissionResourceResponse
  children: IamPermissionSchemeRefNodeResponse[]
}

export interface IamPermissionSchemeResponse {
  parent_permission_id: EntityId | null
  default_selected_with_parent: boolean
  permission_kind: 'business' | 'frontend_only' | 'backend_only'
  id: EntityId
  tenant_id: EntityId
  app_id: EntityId
  permission_code: string
  permission_name: string
  description: string
  sort_order: number
  status: IamPermissionEntityStatus
  remarks: string
  active_role_count: number
  frontend_resource_count: number
  function_resource_count: number
  frontend_resource: IamPermissionResourceResponse | null
  source_role_ids: EntityId[]
  request_id: string
  idempotent: boolean
  version: VersionToken
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
  resource_tree: IamPermissionSchemeRefNodeResponse[]
}

export interface IamPermissionSchemeCreateRequest {
  parent_permission_id: EntityId | null
  default_selected_with_parent: boolean
  permission_kind?: 'business' | 'frontend_only' | 'backend_only'
  tenant_id: EntityId
  app_id: EntityId
  /** 普通前端调用省略；服务端生成稳定编码。 */
  permission_code?: string
  permission_name: string
  description: string
  sort_order: number
  status: IamPermissionEntityStatus
  remarks: string
  request_id: string
}

export interface IamPermissionSchemeUpdateRequest {
  parent_permission_id: EntityId | null
  default_selected_with_parent: boolean
  permission_kind?: 'business' | 'frontend_only' | 'backend_only'
  id: EntityId
  tenant_id: EntityId
  version: VersionToken
  permission_name: string
  description: string
  sort_order: number
  remarks: string
  request_id: string
}

export interface IamPermissionSchemeStatusRequest {
  id: EntityId
  tenant_id: EntityId
  version: VersionToken
  target_status: IamPermissionEntityStatus
}

export interface IamPermissionSchemeDeleteRequest {
  id: EntityId
  tenant_id: EntityId
  version: VersionToken
  confirm_unbind_roles: boolean
}

export interface IamPermissionSchemeCopyRequest {
  parent_permission_id: EntityId | null
  default_selected_with_parent: boolean
  permission_kind?: 'business' | 'frontend_only' | 'backend_only'
  source_permission_id: EntityId
  tenant_id: EntityId
  source_version: VersionToken
  /** 普通前端调用省略；服务端生成稳定编码。 */
  permission_code?: string
  permission_name: string
  description: string
  sort_order: number
  remarks: string
  request_id: string
}

export interface IamPermissionSchemeFunctionInput {
  resource_id: EntityId
  sort_order: number
  remarks: string
}

export interface IamPermissionSchemeTreeSaveRequest {
  permission_id: EntityId
  tenant_id: EntityId
  version: VersionToken
  frontend_resource_id: EntityId
  function_resources: IamPermissionSchemeFunctionInput[]
  request_id: string
}

export interface IamPermissionSchemeImpactResponse {
  role_binding_count: number
  child_permission_ids: EntityId[]
  role_count: number
  permission_id: EntityId
  active_role_count: number
  roles: IamPermissionSchemeRoleResponse[]
}

export interface IamResolvedResourceResponse {
  resource: IamPermissionResourceResponse
  source_permission_ids: EntityId[]
  source_role_ids: EntityId[]
}

export interface IamResolvedResourceNodeResponse {
  grant: IamResolvedResourceResponse
  children: IamResolvedResourceNodeResponse[]
}

export interface IamRoleEligiblePermissionResponse {
  permission: IamPermissionSchemeResponse
  eligible: boolean
  assigned: boolean
  blocking_reasons: string[]
}

export interface IamRoleEligiblePermissionsResponse {
  tenant_id: EntityId
  role_id: EntityId
  role_version: VersionToken
  snapshot_version: VersionToken
  scope_complete: boolean
  permissions: IamRoleEligiblePermissionResponse[]
}

export interface IamRolePermissionSchemeQueryRequest {
  tenant_id: EntityId
  role_id: EntityId
}

export interface IamRolePermissionSchemeResponse {
  tenant_id: EntityId
  role_id: EntityId
  role_code: string
  role_name: string
  role_version: VersionToken
  snapshot_version: VersionToken
  assigned_permission_ids: EntityId[]
  permissions: IamPermissionSchemeResponse[]
  effective_resources: IamResolvedResourceResponse[]
  effective_resource_tree: IamResolvedResourceNodeResponse[]
  request_id: string
  idempotent: boolean
}

export interface IamRolePermissionSchemeSaveRequest {
  tenant_id: EntityId
  role_id: EntityId
  role_version: VersionToken
  permission_ids: EntityId[]
  snapshot_version: VersionToken
  request_id: string
}

export interface IamUserPermissionSchemeQueryRequest {
  tenant_id: EntityId
  user_id: EntityId
}

export interface IamResolvedRoleResponse {
  role_id: EntityId
  role_code: string
  role_name: string
  permission_ids: EntityId[]
}

export interface IamUserPermissionSchemeResponse {
  tenant_id: EntityId
  user_id: EntityId
  roles: IamResolvedRoleResponse[]
  permissions: IamPermissionSchemeResponse[]
  effective_resources: IamResolvedResourceResponse[]
  effective_resource_tree: IamResolvedResourceNodeResponse[]
  authorization_version: VersionToken
}

const endpoints = Object.freeze({
  querySystems: '/PermissionApp/Query',
  queryRoleMetadata: '/RolePermission/QueryRoles',
  queryUserContext: '/Membership/QueryUsers',
  queryPermissionResources: '/PermissionResource/Query',
  getPermissionResource: '/PermissionResource/Get',
  createPermissionResource: '/PermissionResource/Create',
  updatePermissionResource: '/PermissionResource/Update',
  changePermissionResourceStatus: '/PermissionResource/ChangeStatus',
  inspectPermissionResourceImpact: '/PermissionResource/Impact',
  deletePermissionResource: '/PermissionResource/Delete',
  queryPermissionSchemes: '/PermissionScheme/Query',
  getPermissionScheme: '/PermissionScheme/Get',
  createPermissionScheme: '/PermissionScheme/Create',
  updatePermissionScheme: '/PermissionScheme/Update',
  changePermissionSchemeStatus: '/PermissionScheme/ChangeStatus',
  savePermissionSchemeTree: '/PermissionScheme/SaveTree',
  copyPermissionScheme: '/PermissionScheme/Copy',
  inspectPermissionSchemeImpact: '/PermissionScheme/Impact',
  deletePermissionScheme: '/PermissionScheme/Delete',
  queryRolePermissionScheme: '/RolePermissionScheme/Query',
  saveRolePermissionScheme: '/RolePermissionScheme/Save',
  queryEligiblePermissions: '/RolePermissionScheme/QueryEligiblePermissions',
  queryUserPermissions: '/CurrentPermissionResource/QueryUserPermissions',
} as const)

const entityIdFields = new Set([
  'id',
  'tenant_id',
  'tenant_ids',
  'app_id',
  'parent_id',
  'default_module_id',
  'resource_id',
  'frontend_resource_id',
  'ref_id',
  'parent_ref_id',
  'permission_id',
  'parent_permission_id',
  'assigned_permission_ids',
  'child_permission_ids',
  'role_id',
  'user_id',
  'source_permission_id',
  'role_ids',
  'permission_ids',
  'source_permission_ids',
  'source_role_ids',
])

async function postIam<Response, Request>(
  path: string,
  data: Request,
  requestId = createRequestId(),
): Promise<Response> {
  let requestData: Request
  try {
    requestData = normalizeEntityIdFields(data, entityIdFields)
  } catch (error) {
    // No request was dispatched: do not present a local ID error as an unknown write result.
    throw new ApiError(error instanceof Error ? error.message : '接口 ID 格式无效', 'validation')
  }
  const response = await requestApi<Response, Request>({
    tenantScoped: true,
    method: 'POST',
    url: serviceApiPath('iam', defineApiPath(path)),
    data: requestData,
    headers: {
      Accept: 'text/plain',
      'Content-Type': 'application/json-patch+json',
      'X-Request-ID': requestId,
    },
  })
  return normalizeEntityIdFields(response, entityIdFields)
}

export const permissionGovernanceApi = {
  queryUserContext: (request: {
    tenant_ids: EntityId[]
    user_id: EntityId
    page_index: number
    page_size: number
  }) =>
    postIam<
      IamPagedResponse<{
        user_id: EntityId
        tenant_code: string
        user: { real_name: string; nick_name: string; user_name: string }
        memberships: { tenant_id: EntityId; tenant_name: string }[]
      }>,
      typeof request
    >(endpoints.queryUserContext, request),
  queryRoleMetadata: (request: {
    tenant_id: EntityId
    id: EntityId
    page_index: number
    page_size: number
  }) =>
    postIam<IamPagedResponse<{ id: EntityId; role_type: string; status: string }>, typeof request>(
      endpoints.queryRoleMetadata,
      request,
    ),
  querySystems: async (request: IamSystemQueryRequest = {}): Promise<IamSystemResponse[]> => {
    const response = await postIam<IamPermissionAppQueryResponse, IamSystemQueryRequest>(
      endpoints.querySystems,
      request,
    )
    if (!response.scope_complete || !Array.isArray(response.apps)) {
      throw new Error('App 查询结果不完整，请重试')
    }
    return response.apps
  },
  queryPermissionResources: (request: IamPermissionResourceQueryRequest) =>
    postIam<IamPagedResponse<IamPermissionResourceResponse>, IamPermissionResourceQueryRequest>(
      endpoints.queryPermissionResources,
      request,
    ),
  getPermissionResource: (request: IamPermissionResourceGetRequest) =>
    postIam<IamPermissionResourceResponse, IamPermissionResourceGetRequest>(
      endpoints.getPermissionResource,
      request,
    ),
  createPermissionResource: (request: IamPermissionResourceCreateRequest) =>
    postIam<IamPermissionResourceResponse, IamPermissionResourceCreateRequest>(
      endpoints.createPermissionResource,
      request,
      request.request_id,
    ),
  updatePermissionResource: (request: IamPermissionResourceUpdateRequest) =>
    postIam<IamPermissionResourceResponse, IamPermissionResourceUpdateRequest>(
      endpoints.updatePermissionResource,
      request,
      request.request_id,
    ),
  changePermissionResourceStatus: (request: IamPermissionResourceStatusRequest) =>
    postIam<IamPermissionResourceResponse, IamPermissionResourceStatusRequest>(
      endpoints.changePermissionResourceStatus,
      request,
    ),
  inspectPermissionResourceImpact: (request: IamPermissionResourceImpactRequest) =>
    postIam<IamPermissionResourceImpactResponse, IamPermissionResourceImpactRequest>(
      endpoints.inspectPermissionResourceImpact,
      request,
    ),
  deletePermissionResource: (request: IamPermissionResourceDeleteRequest) =>
    postIam<IamActionResponse, IamPermissionResourceDeleteRequest>(
      endpoints.deletePermissionResource,
      request,
    ),
  queryPermissionSchemes: (request: IamPermissionSchemeQueryRequest) =>
    postIam<IamPagedResponse<IamPermissionSchemeResponse>, IamPermissionSchemeQueryRequest>(
      endpoints.queryPermissionSchemes,
      request,
    ),
  getPermissionScheme: (request: IamPermissionSchemeGetRequest) =>
    postIam<IamPermissionSchemeResponse, IamPermissionSchemeGetRequest>(
      endpoints.getPermissionScheme,
      request,
    ),
  createPermissionScheme: (request: IamPermissionSchemeCreateRequest) =>
    postIam<IamPermissionSchemeResponse, IamPermissionSchemeCreateRequest>(
      endpoints.createPermissionScheme,
      request,
      request.request_id,
    ),
  updatePermissionScheme: (request: IamPermissionSchemeUpdateRequest) =>
    postIam<IamPermissionSchemeResponse, IamPermissionSchemeUpdateRequest>(
      endpoints.updatePermissionScheme,
      request,
      request.request_id,
    ),
  changePermissionSchemeStatus: (request: IamPermissionSchemeStatusRequest) =>
    postIam<IamPermissionSchemeResponse, IamPermissionSchemeStatusRequest>(
      endpoints.changePermissionSchemeStatus,
      request,
    ),
  savePermissionSchemeTree: (request: IamPermissionSchemeTreeSaveRequest) =>
    postIam<IamPermissionSchemeResponse, IamPermissionSchemeTreeSaveRequest>(
      endpoints.savePermissionSchemeTree,
      request,
      request.request_id,
    ),
  copyPermissionScheme: (request: IamPermissionSchemeCopyRequest) =>
    postIam<IamPermissionSchemeResponse, IamPermissionSchemeCopyRequest>(
      endpoints.copyPermissionScheme,
      request,
      request.request_id,
    ),
  inspectPermissionSchemeImpact: (request: IamPermissionSchemeGetRequest) =>
    postIam<IamPermissionSchemeImpactResponse, IamPermissionSchemeGetRequest>(
      endpoints.inspectPermissionSchemeImpact,
      request,
    ),
  deletePermissionScheme: (request: IamPermissionSchemeDeleteRequest) =>
    postIam<IamActionResponse, IamPermissionSchemeDeleteRequest>(
      endpoints.deletePermissionScheme,
      request,
    ),
  queryEligiblePermissions: (request: IamRolePermissionSchemeQueryRequest) =>
    postIam<IamRoleEligiblePermissionsResponse, IamRolePermissionSchemeQueryRequest>(
      endpoints.queryEligiblePermissions,
      request,
    ),
  queryRolePermissionScheme: (request: IamRolePermissionSchemeQueryRequest) =>
    postIam<IamRolePermissionSchemeResponse, IamRolePermissionSchemeQueryRequest>(
      endpoints.queryRolePermissionScheme,
      request,
    ),
  saveRolePermissionScheme: (request: IamRolePermissionSchemeSaveRequest) =>
    postIam<IamRolePermissionSchemeResponse, IamRolePermissionSchemeSaveRequest>(
      endpoints.saveRolePermissionScheme,
      request,
      request.request_id,
    ),
  queryUserPermissions: (request: IamUserPermissionSchemeQueryRequest) =>
    postIam<IamUserPermissionSchemeResponse, IamUserPermissionSchemeQueryRequest>(
      endpoints.queryUserPermissions,
      request,
    ),
}
