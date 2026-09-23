import type { VersionToken } from '@shared/types/common'

export interface IamApplication {
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

export interface IamPermissionResource {
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
  children?: IamPermissionResource[]
}

export interface IamCurrentAppsResponse {
  apps: IamApplication[]
}

export interface IamCurrentAppMenusRequest {
  app_id: number
}

export type IamCurrentMenuResourceResponse = IamPermissionResource

export interface IamCurrentAppModuleMenusResponse extends IamPermissionResource {
  menus: IamCurrentMenuResourceResponse[]
}

export interface IamCurrentAppMenusResponse {
  app: IamApplication
  modules: IamCurrentAppModuleMenusResponse[]
}

export interface IamCurrentFunctionsRequest {
  menu_id: number
}

export interface IamCurrentFunctionsResponse {
  menu: IamPermissionResource
  functions: IamPermissionResource[]
  permission_codes: string[]
}

export interface IamUserSummary {
  id: number
  user_name: string
  real_name: string
  nick_name: string
  phone: string
  email: string
  avatar_url: string
  avatar_file_id?: string
  user_type: string
  status: string
  version: VersionToken
  updated_at: string
}

export interface IamMemberOrganization {
  id: number
  tenant_user_id: number
  org_id: number
  org_code: string
  org_name: string
  is_primary: boolean
  effective_start: string
  effective_end: string | null
  is_currently_effective: boolean
  status: string
  remarks: string
  version: VersionToken
  updated_at: string
}

export interface IamMemberPosition {
  id: number
  tenant_user_id: number
  position_id: number
  position_code: string
  position_name: string
  is_primary: boolean
  effective_start: string
  effective_end: string | null
  is_currently_effective: boolean
  status: string
  remarks: string
  version: VersionToken
  updated_at: string
}

export interface IamUserTenantMembership {
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
  member_version: VersionToken
  updated_at: string
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
  user: IamUserSummary
  organizations: IamMemberOrganization[]
  positions: IamMemberPosition[]
  memberships: IamUserTenantMembership[]
}

export interface IamQueryUsersRequest {
  tenant_ids: number[]
  user_id?: number
  user_name?: string
  user_status?: string
  member_status?: string
  page_index: number
  page_size: number
  status?: string
}

export interface IamQueryUsersResponse {
  total: number
  page_index: number
  page_size: number
  items: IamUserQueryResponse[]
}

export interface ShellUserProfile {
  id: string
  name: string
  title: string
  organization: string
  avatarUrl: string
  avatarFileId?: string
}
