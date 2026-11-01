import { getStoredAuthSession } from './authSession'
import { sameEntityId } from '@shared/utils/entityId'
import type { EntityId } from '@shared/types/entityId'

export class TenantContextError extends Error {
  constructor(message = '当前租户上下文已变化，请重新进入页面') {
    super(message)
    this.name = 'TenantContextError'
  }
}

export function requireCurrentTenantId(expected?: EntityId): number {
  const id = getStoredAuthSession()?.currentTenantId
  if (!id || !Number.isSafeInteger(id) || id <= 0) {
    throw new TenantContextError('尚未选择有效租户，请先通过框架选择租户')
  }
  if (expected !== undefined && !sameEntityId(expected, id)) {
    throw new TenantContextError('目标租户与当前会话不一致，请先切换租户')
  }
  return id
}

// Validate, never rewrite a stale form's tenant to the new session's tenant.
export function assertTenantRequest(data: unknown): void {
  const id = requireCurrentTenantId()
  if (!data || typeof data !== 'object') return
  const value = data as Record<string, unknown>
  if ('tenant_id' in value && !sameEntityId(value.tenant_id, id)) {
    throw new TenantContextError('目标租户与当前会话不一致，请先切换租户')
  }
  if ('tenant_ids' in value) {
    const ids = value.tenant_ids
    if (!Array.isArray(ids) || ids.length !== 1 || !sameEntityId(ids[0], id)) {
      throw new TenantContextError('业务查询仅允许当前租户；管理其他租户请先切换租户')
    }
  }
}

export function currentTenantOption() {
  const session = getStoredAuthSession()
  return {
    id: requireCurrentTenantId(),
    code: session?.currentTenantCode ?? '',
    name: session?.currentTenantName || session?.currentTenantCode || '当前租户',
  }
}
