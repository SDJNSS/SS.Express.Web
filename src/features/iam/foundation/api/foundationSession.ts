import {
  clearStoredAuthSession,
  getStoredAuthSession,
  replaceStoredAuthSession,
  type StoredAuthSession,
} from '@shared/api/authSession'
import { ApiError } from '@shared/api/httpClient'
import { createRequestId } from '@shared/api/requestIdentity'

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
  if (!session?.currentTenantId || !session.account) {
    throw new ApiError('当前会话缺少用户或租户信息，请重新登录', 'validation')
  }
  const response = await foundationApi.queryUsers({
    tenant_ids: [session.currentTenantId],
    user_name: session.account,
    page_index: 1,
    page_size: 1,
  })
  const current = getStoredAuthSession()
  if (
    current?.accessToken !== session.accessToken ||
    current.currentTenantId !== session.currentTenantId
  ) {
    throw new ApiError('登录或租户上下文已变化，请重新加载', 'validation')
  }
  // QueryUsers 返回的 memberships 已受服务端 Function 租户范围约束；只取本人有效关系。
  const self = response.items.find(
    (item) =>
      item.user.user_name === session.account &&
      (!session.userId || String(item.user_id) === session.userId),
  )
  if (!self) throw new ApiError('未获取到当前用户的租户归属，请重试', 'validation')
  const options = new Map<number, FoundationQueryTenantOption>()
  for (const membership of self.memberships) {
    if (
      membership.user_id !== self.user_id ||
      !membership.is_currently_effective ||
      membership.tenant_is_deleted ||
      membership.tenant_id <= 0
    ) {
      continue
    }
    options.set(membership.tenant_id, {
      id: membership.tenant_id,
      code: membership.tenant_code,
      name: membership.tenant_name,
    })
  }
  return [...options.values()]
}

export function currentTenantId(): number {
  const tenantId = getStoredAuthSession()?.currentTenantId
  if (!tenantId) throw new ApiError('当前会话尚未选择 Tenant', 'validation')
  return tenantId
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
  const response = await foundationApi.switchTenant({
    tenant_id: tenantId,
    set_as_default: setAsDefault,
    session_version: current.sessionVersion,
    request_id: createRequestId(),
  })
  replaceStoredAuthSession({
    ...current,
    accessToken: response.token,
    loginState: response.login_state,
    sessionId: response.session_id,
    sessionVersion: response.session_version,
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
}

export async function logoutFoundationSession(): Promise<void> {
  try {
    await foundationApi.logout()
  } finally {
    clearStoredAuthSession()
  }
}
