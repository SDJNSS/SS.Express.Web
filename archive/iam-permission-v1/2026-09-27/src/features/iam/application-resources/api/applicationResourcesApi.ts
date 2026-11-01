import { defineApiPath } from '@shared/api/apiPath'
import { serviceApiPath } from '@shared/api/backendServices'
import { ApiError, requestApi } from '@shared/api/httpClient'
import { createRequestId } from '@shared/api/requestIdentity'
import type { VersionToken } from '@shared/types/common'

export { ApiError }

interface IamResourceResponseBase {
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
}

export interface IamResourceTreeResponse extends IamResourceResponseBase {
  children?: IamResourceTreeResponse[]
  menus?: IamResourceTreeResponse[]
  pages?: IamResourceTreeResponse[]
  functions?: IamResourceTreeResponse[]
}

export interface IamModuleResourceResponse extends IamResourceTreeResponse {
  menus: IamResourceTreeResponse[]
}

export interface IamApplicationResourceResponse {
  modules: IamModuleResourceResponse[]
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

export interface IamSystemResourcesResponse {
  apps: IamApplicationResourceResponse[]
}

export interface IamApplicationCreateRequest {
  app_name: string
  description: string
  icon: string
  route_prefix: string
  status: string
  remarks: string
}

export interface IamApplicationUpdateRequest {
  id: number
  version: VersionToken
  app_name: string
  description: string
  icon: string
  route_prefix: string
  remarks: string
}

export interface IamResourceCreateRequest {
  app_id: number
  parent_id: number
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
}

export interface IamResourceUpdateRequest extends Omit<IamResourceCreateRequest, 'status'> {
  id: number
  version: VersionToken
}

export interface IamStatusChangeRequest {
  id: number
  version: VersionToken
  target_status: string
}

export interface IamApplicationDeleteRequest {
  id: number
  version: VersionToken
  confirm_delete_resources: boolean
}

export interface IamResourceDeleteRequest {
  id: number
  version: VersionToken
  confirm_delete_descendants: boolean
}

export type IamApplicationResponse = Omit<IamApplicationResourceResponse, 'modules'>

export interface IamResourceResponse extends IamResourceResponseBase {
  children: IamResourceResponse[]
}

export interface IamActionResponse {
  succeeded: boolean
  idempotent: boolean
  version: VersionToken
  message: string
}

export interface IamCatalogDeleteResponse {
  id: number
  succeeded: boolean
  idempotent: boolean
  deleted_resource_count: number
  revoked_role_grant_count: number
  version: VersionToken
  deleted_at: string
}

const endpoints = Object.freeze({
  systemResources: '/Permission/SystemResources',
  createApplication: '/AuthorizationCatalog/CreateSystem',
  updateApplication: '/AuthorizationCatalog/UpdateSystem',
  changeApplicationStatus: '/AuthorizationCatalog/ChangeSystemStatus',
  deleteApplication: '/AuthorizationCatalog/DeleteSystem',
  createResource: '/AuthorizationCatalog/CreateResource',
  updateResource: '/AuthorizationCatalog/UpdateResource',
  changeResourceStatus: '/AuthorizationCatalog/ChangeResourceStatus',
  deleteResource: '/AuthorizationCatalog/DeleteResource',
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

export const applicationResourcesApi = {
  getSystemResources: () =>
    postIam<IamSystemResourcesResponse, Record<string, never>>(endpoints.systemResources, {}),
  createApplication: (request: IamApplicationCreateRequest) =>
    postIam<IamApplicationResponse, IamApplicationCreateRequest>(
      endpoints.createApplication,
      request,
    ),
  updateApplication: (request: IamApplicationUpdateRequest) =>
    postIam<IamApplicationResponse, IamApplicationUpdateRequest>(
      endpoints.updateApplication,
      request,
    ),
  changeApplicationStatus: (request: IamStatusChangeRequest) =>
    postIam<IamActionResponse, IamStatusChangeRequest>(endpoints.changeApplicationStatus, request),
  deleteApplication: (request: IamApplicationDeleteRequest) =>
    postIam<IamCatalogDeleteResponse, IamApplicationDeleteRequest>(
      endpoints.deleteApplication,
      request,
    ),
  createResource: (request: IamResourceCreateRequest) =>
    postIam<IamResourceResponse, IamResourceCreateRequest>(endpoints.createResource, request),
  updateResource: (request: IamResourceUpdateRequest) =>
    postIam<IamResourceResponse, IamResourceUpdateRequest>(endpoints.updateResource, request),
  changeResourceStatus: (request: IamStatusChangeRequest) =>
    postIam<IamActionResponse, IamStatusChangeRequest>(endpoints.changeResourceStatus, request),
  deleteResource: (request: IamResourceDeleteRequest) =>
    postIam<IamCatalogDeleteResponse, IamResourceDeleteRequest>(endpoints.deleteResource, request),
}
