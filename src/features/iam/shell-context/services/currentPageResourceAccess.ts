import { getCurrentPageResources, getStoredAuthSession } from '../api/shellContextApi'
import type { IamCurrentPageResourcesResponse } from '../types/shellContext'

interface CacheEntry {
  expiresAt: number
  response?: IamCurrentPageResourcesResponse
  pending?: Promise<IamCurrentPageResourcesResponse>
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5_000

function sessionScope(): string {
  const session = getStoredAuthSession()
  return [
    session?.accessToken ?? 'no-token',
    session?.sessionId ?? 'anonymous',
    session?.sessionVersion ?? 'unversioned',
    session?.currentTenantId ?? 'no-tenant',
  ].join(':')
}

function cacheKey(pageResourceCode: string): string {
  return `${sessionScope()}:${pageResourceCode}`
}

/**
 * 复用同一会话、Tenant 下短时间内的精确页面资源校验。
 * 仅缓存成功响应；网络或服务异常不会被缓存，避免把临时故障伪装成无权限。
 */
export function getCurrentPageResourcesCached(
  pageResourceCode: string,
  options: { force?: boolean } = {},
): Promise<IamCurrentPageResourcesResponse> {
  const normalizedCode = pageResourceCode.trim()
  if (!normalizedCode) return Promise.reject(new Error('页面资源编码不能为空'))

  const key = cacheKey(normalizedCode)
  const current = cache.get(key)
  const now = Date.now()
  if (!options.force && current?.pending) return current.pending
  if (!options.force && current?.response && current.expiresAt > now) {
    return Promise.resolve(current.response)
  }

  const pending = getCurrentPageResources(normalizedCode)
    .then((response) => {
      if (
        response.page_resource_code !== normalizedCode ||
        typeof response.can_access !== 'boolean' ||
        ![
          response.button_resource_codes,
          response.button_page_resource_codes,
          response.read_function_resource_codes,
        ].every((codes) => Array.isArray(codes) && codes.every((code) => typeof code === 'string'))
      )
        throw new Error('页面资源权限响应不符合契约')
      // A force refresh / cache clear supersedes pending responses.
      if (cache.get(key)?.pending === pending) {
        cache.set(key, { response, expiresAt: Date.now() + CACHE_TTL_MS })
      }
      return response
    })
    .catch((error: unknown) => {
      if (cache.get(key)?.pending === pending) cache.delete(key)
      throw error
    })
  cache.set(key, { pending, expiresAt: now + CACHE_TTL_MS })
  return pending
}

export function clearCurrentPageResourceAccessCache(): void {
  cache.clear()
}
