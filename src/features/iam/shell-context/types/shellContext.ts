import type { VersionToken } from '@shared/types/common'

export interface IamApplication {
  id: number
  app_code: string
  app_name: string
  icon: string
  route_prefix: string
}

export interface IamPermissionResource {
  id: number
  app_id: number
  parent_id: number
  resource_code: string
  resource_name: string
  resource_type: string
  route_path: string
  component: string
  icon: string
  http_method: string
  api_path: string
  is_visible: boolean
  sort_order: number
  status: string
  remarks: string
  source: string
  lifecycle: string
  version: VersionToken
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
  children?: IamPermissionResource[]
}

export interface IamCurrentAppsResponse {
  apps: IamApplication[]
  authorization_version: VersionToken
}

export interface IamCurrentAppMenusRequest {
  app_id: number
}

export type IamCurrentMenuResourceResponse = IamPermissionResource

export interface IamCurrentAppModuleMenusResponse {
  resource: IamPermissionResource
  menus: IamCurrentMenuResourceResponse[]
}

export interface IamCurrentAppMenusResponse {
  app: IamApplication
  modules: IamCurrentAppModuleMenusResponse[]
  authorization_version: VersionToken
}

export interface IamCurrentPageResourcesRequest {
  page_resource_code: string
}

export interface IamCurrentPageResourcesResponse {
  page_resource_code: string
  can_access: boolean
  button_resource_codes: string[]
  button_page_resource_codes: string[]
  read_function_resource_codes: string[]
  authorization_version: VersionToken
}

export interface IamCurrentProfileResponse {
  /** Proposed additive contract; missing branding keeps local defaults. */
  branding?: {
    brand_name?: string | null
    platform_name?: string | null
    logo_url?: string | null
  } | null
  user_id: number
  user_name: string
  real_name: string
  nick_name: string
  display_name: string
  avatar_url: string
  avatar_file_id: string
  tenant_id: number
  tenant_code: string
  tenant_name: string
  tenant_user_id: number
  tenant_user_code: string
  is_tenant_admin: boolean
  organization_id: number
  organization_name: string
  position_id: number
  position_name: string
}

export interface ShellUserProfile {
  id: string
  name: string
  title: string
  organization: string
  avatarUrl: string
  avatarFileId?: string
}
