export { AUTH_SESSION_STATES as IAM_LOGIN_STATES } from '@shared/constants/authSession'

import type { VersionToken } from '@shared/types/common'

export interface IamLoginRequest {
  user_name: string
  password: string
  device_id: string
  device_type: 'web'
  request_id: string
}

export interface IamLoginTenant {
  tenant_id: number
  tenant_user_id: number
  tenant_code: string
  tenant_name: string
  tenant_type: string
  logo_url: string
  timezone: string
  is_default: boolean
}

export interface IamLoginResponse {
  token: string
  login_state: string
  session_id: number
  session_version: VersionToken
  expires_at: string
  user_version: VersionToken
  current_tenant: IamLoginTenant | null
  available_tenants: IamLoginTenant[]
}
