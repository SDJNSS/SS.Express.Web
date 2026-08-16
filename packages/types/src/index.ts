export interface ApiResponse<T> {
  code: string
  message: string
  data: T
  success: boolean
}

export interface PageResult<T> {
  records: T[]
  total: number
  pageNo: number
  pageSize: number
}

export interface PageQuery {
  pageNo: number
  pageSize: number
}

export interface AuthState {
  accessToken: string
  refreshToken: string
  userId: number
  username: string
  realName: string
  tenantId: number
  tenantUserId: number
  tenantCode: string
  tenantName: string
  tenantStatus: string
  planId: number
  planCode: string
  planName: string
  subscriptionStatus: string
  subscriptionEndAt: string
}

export interface PermissionState {
  appCodes: string[]
  featureCodes: string[]
  permissionCodes: string[]
  buttonCodes: string[]
  menuTree: MenuNode[]
}

export interface MenuNode {
  id: number
  code: string
  name: string
  path?: string
  icon?: string
  children?: MenuNode[]
}

export interface DictItem {
  label: string
  value: string | number
  type?: string
  color?: string
}
