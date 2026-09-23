import { ApiError } from '@shared/api/httpClient'
import { currentTenantId } from '@features/iam/foundation/public'

import { mapRole } from '../adapters/accessControlAdapter'
import type { RoleRecord } from '../types/accessControl'
import { accessControlApi } from './accessControlApi'

export function accessControlErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export function positiveRouteId(value: unknown): number {
  const result = Number(value)
  return Number.isSafeInteger(result) && result > 0 ? result : 0
}

export async function resolveRole(roleId: number, tenantId = 0): Promise<RoleRecord> {
  const resolvedTenantId = tenantId || currentTenantId()
  const response = await accessControlApi.queryRoles({
    tenant_id: resolvedTenantId,
    id: roleId,
    role_type: '',
    page_index: 1,
    page_size: roleId ? 1 : 20,
    keyword: '',
    status: '',
  })
  const role = response.items[0]
  if (!role) throw new ApiError('当前 Tenant 暂无可配置角色', 'validation')
  return mapRole(role)
}
