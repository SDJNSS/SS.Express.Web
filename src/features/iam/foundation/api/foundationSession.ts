import {
  clearStoredAuthSession,
  getStoredAuthSession,
  replaceStoredAuthSession,
  type StoredAuthSession,
} from '@shared/api/authSession'
import { ApiError } from '@shared/api/httpClient'
import { createRequestId } from '@shared/api/requestIdentity'
import { requireCurrentTenantId } from '@shared/api/tenantContext'
import { clearCurrentPageResourceAccessCache } from '@features/iam/shell-context/public'
export { currentTenantOption, requireCurrentTenantId } from '@shared/api/tenantContext'
export { publishTenantSwitch } from '@shared/api/tenantSwitchSignal'

import { foundationApi } from './foundationApi'

export function getFoundationSession(): StoredAuthSession | null {
  return getStoredAuthSession()
}

export interface FoundationQueryTenantOption {
  id: number
  code: string
  name: string
}

export async function queryFoundationTenantOptions(): Promise<FoundationQueryTenantOption[]> {
  const session = getStoredAuthSession()
  if (!session) throw new ApiError('当前会话已失效，请重新登录', 'authentication')
  // Switch candidates are issued by Auth, never inferred from business query results.
  return (session.availableTenants ?? []).map((tenant) => ({
    id: tenant.tenantId,
    code: tenant.tenantCode,
    name: tenant.tenantName,
  }))
}

export function currentTenantId(): number {
  return requireCurrentTenantId()
}

export function foundationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export async function switchFoundationTenant(
  tenantId: number,
  setAsDefault: boolean,
): Promise<void> {
  const current = getStoredAuthSession()
  if (!current?.sessionVersion) throw new ApiError('当前会话缺少版本信息', 'validation')
  if (!current.availableTenants?.some((tenant) => tenant.tenantId === tenantId)) {
    throw new ApiError('请选择本人可进入的租户', 'validation')
  }
  const response = await foundationApi.switchTenant({
    tenant_id: tenantId,
    set_as_default: setAsDefault,
    session_version: current.sessionVersion,
    request_id: createRequestId(),
  })
  if (!response.token || response.current_tenant?.tenant_id !== tenantId) {
    // The server may have switched already. Do not keep presenting the old context as valid.
    clearStoredAuthSession()
    throw new ApiError('切换响应缺少有效租户上下文，请重新登录', 'authentication')
  }
  replaceStoredAuthSession({
    ...current,
    accessToken: response.token,
    loginState: response.login_state,
    sessionId: response.session_id,
    sessionVersion: response.session_version,
    permissions: [],
    ...(response.current_tenant?.tenant_id
      ? { currentTenantId: response.current_tenant.tenant_id }
      : {}),
    ...(response.current_tenant?.tenant_name
      ? { currentTenantName: response.current_tenant.tenant_name }
      : {}),
    ...(response.current_tenant?.tenant_code
      ? { currentTenantCode: response.current_tenant.tenant_code }
      : {}),
    availableTenants: response.available_tenants.map((tenant) => ({
      tenantId: tenant.tenant_id,
      tenantUserId: tenant.tenant_user_id,
      tenantCode: tenant.tenant_code,
      tenantName: tenant.tenant_name,
      tenantType: tenant.tenant_type,
      logoUrl: tenant.logo_url,
      timezone: tenant.timezone,
      isDefault: tenant.is_default,
    })),
  })
  clearCurrentPageResourceAccessCache()
}

export async function logoutFoundationSession(): Promise<void> {
  try {
    await foundationApi.logout()
  } finally {
    clearStoredAuthSession()
  }
}
