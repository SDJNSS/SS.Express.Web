import type {
  RouteLocationNormalizedLoaded,
  RouteLocationRaw,
  Router,
} from 'vue-router'

type PermissionRoute = Pick<RouteLocationNormalizedLoaded, 'meta'>

export function resolvePermissionFallback(
  router: Router,
  route: PermissionRoute,
  hasPermission: (permission?: string) => boolean,
): RouteLocationRaw | null {
  const fallbackName = route.meta.permissionFallback
  if (typeof fallbackName !== 'string' || !fallbackName.trim()) return null

  const fallback = router.resolve({ name: fallbackName })
  const permission =
    typeof fallback.meta.permission === 'string' ? fallback.meta.permission : undefined
  if (!permission?.trim()) return null

  return hasPermission(permission) ? { name: fallbackName } : null
}
