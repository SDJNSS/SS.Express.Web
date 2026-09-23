import type { AppShellNavigationItem } from '@shared/components/appShell.types'
import { resolveLocalMdiIcon } from '@shared/icons/registerIcons'

import type {
  IamCurrentAppMenusResponse,
  IamCurrentFunctionsResponse,
  IamCurrentMenuResourceResponse,
  IamPermissionResource,
  IamUserQueryResponse,
  ShellUserProfile,
} from '../types/shellContext'

export interface CurrentPermissionRoute {
  appId: number
  type: 'menu' | 'page'
  path: string
  component: string
  permissionCode: string
  title: string
}

export type NavigationRoutePredicate = (routePath: string) => boolean

const routeProtocolPattern = /^[a-z][a-z\d+.-]*:\/\//iu

function activeRoute(currentPath: string, routePath: string): boolean {
  return currentPath === routePath || currentPath.startsWith(`${routePath}/`)
}

export function normalizeInternalRoute(value: string): string | null {
  const route = value.trim()
  if (!route.startsWith('/') || route.startsWith('//') || route.includes('\\')) return null
  if (routeProtocolPattern.test(route)) return null
  return route
}

function isEffectiveResource(resource: IamPermissionResource): boolean {
  return resource.is_currently_effective !== false
}

function isVisibleMenu(resource: IamPermissionResource): boolean {
  return (
    resource.resource_type.trim().toLowerCase() === 'menu' &&
    isEffectiveResource(resource) &&
    resource.is_visible !== false
  )
}

function isAvailableModuleContainer(resource: IamPermissionResource): boolean {
  return (
    resource.resource_type.trim().toLowerCase() === 'module' &&
    resource.is_currently_effective !== false
  )
}

function compareResources(left: IamPermissionResource, right: IamPermissionResource): number {
  return left.sort_order - right.sort_order || left.resource_code.localeCompare(right.resource_code)
}

export function collectCurrentPermissionCodes(response: IamCurrentFunctionsResponse): string[] {
  return [
    ...(response.permission_codes ?? []),
    ...(response.functions ?? []).map((item) => item.permission_code),
  ]
    .map((code) => code.trim())
    .filter((code, index, values) => Boolean(code) && values.indexOf(code) === index)
}

function permissionRoute(resource: IamPermissionResource): CurrentPermissionRoute[] {
  const type = resource.resource_type.trim().toLowerCase()
  const path = normalizeInternalRoute(resource.route_path)
  if (
    (type !== 'menu' && type !== 'page') ||
    resource.is_currently_effective === false ||
    !path ||
    !resource.component.trim()
  ) {
    return []
  }
  return [
    {
      appId: resource.app_id,
      type,
      path,
      component: resource.component.trim(),
      permissionCode: resource.permission_code.trim(),
      title: resource.resource_name.trim(),
    },
  ]
}

export function collectCurrentAppPermissionRoutes(
  response: IamCurrentAppMenusResponse,
): CurrentPermissionRoute[] {
  return (response.modules ?? []).flatMap((module) => {
    if (!isAvailableModuleContainer(module)) return []
    return (module.menus ?? []).flatMap(permissionRoute)
  })
}

export function collectCurrentAppMenuPermissionCodes(
  response: IamCurrentAppMenusResponse,
): string[] {
  return (response.modules ?? []).flatMap((module) => {
    if (!isAvailableModuleContainer(module)) return []
    return (module.menus ?? []).flatMap((menu) => {
      const permissionCode = menu.permission_code.trim()
      if (menu.resource_type.trim().toLowerCase() !== 'menu' || !isEffectiveResource(menu)) {
        return []
      }
      return permissionCode ? [permissionCode] : []
    })
  })
}

function routeMatchScore(resource: IamPermissionResource, currentPath: string): number {
  if (resource.is_currently_effective === false) return -1
  const routePath = normalizeInternalRoute(resource.route_path)
  if (!routePath) return -1
  if (currentPath === routePath) return routePath.length + 1
  return currentPath.startsWith(`${routePath}/`) ? routePath.length : -1
}

export function findCurrentMenuForRoute(
  response: IamCurrentAppMenusResponse,
  currentPath: string,
): IamCurrentMenuResourceResponse | undefined {
  return (response.modules ?? [])
    .filter(isAvailableModuleContainer)
    .flatMap((module) => module.menus ?? [])
    .filter(
      (menu) => menu.resource_type.trim().toLowerCase() === 'menu' && isEffectiveResource(menu),
    )
    .map((menu) => ({ menu, score: routeMatchScore(menu, currentPath) }))
    .filter((candidate) => candidate.score >= 0)
    .sort((left, right) => right.score - left.score)[0]?.menu
}

export function mapCurrentAppMenusToNavigation(
  response: IamCurrentAppMenusResponse,
  currentPath: string,
  includeRoute: NavigationRoutePredicate = () => true,
): AppShellNavigationItem[] {
  return [...(response.modules ?? [])]
    .sort(compareResources)
    .flatMap((module): AppShellNavigationItem[] => {
      const label = module.resource_name.trim()
      if (!label || !isAvailableModuleContainer(module)) return []

      const moduleHref = normalizeInternalRoute(module.route_path)
      const visibleMenus = [...(module.menus ?? [])].sort(compareResources).filter(isVisibleMenu)
      const children = visibleMenus.flatMap((menu) => {
        // is_visible 的唯一作用域是左侧菜单栏；路由解析与授权上下文不得使用它。
        const menuLabel = menu.resource_name.trim()
        const href = normalizeInternalRoute(menu.route_path)
        if (!menuLabel || !href || !includeRoute(href)) return []
        return [
          {
            id: String(menu.id || menu.resource_code),
            label: menuLabel,
            href,
            active: activeRoute(currentPath, href),
          },
        ]
      })

      const childActive = children.some((child) => child.active)
      if (children.length) {
        return [
          {
            id: String(module.id || module.resource_code),
            label,
            icon: resolveLocalMdiIcon(module.icon, 'mdi:layers-triple-outline'),
            active: childActive || Boolean(moduleHref && activeRoute(currentPath, moduleHref)),
            expanded: childActive,
            children,
          },
        ]
      }

      // Module 原本包含可见 Menu、但这些 Menu 均被本地实现状态过滤时，不能退化为
      // module.route_path 链接，否则会把 `/tms` 一类分组前缀错误暴露为 404 入口。
      if (visibleMenus.length) return []

      if (!moduleHref || !includeRoute(moduleHref)) return []
      return [
        {
          id: String(module.id || module.resource_code),
          label,
          icon: resolveLocalMdiIcon(module.icon, 'mdi:layers-triple-outline'),
          href: moduleHref,
          active: activeRoute(currentPath, moduleHref),
        },
      ]
    })
}

export function resolveFirstCurrentAppMenuRoute(
  response: IamCurrentAppMenusResponse,
  includeRoute: NavigationRoutePredicate = () => true,
): string | undefined {
  for (const item of mapCurrentAppMenusToNavigation(response, '', includeRoute)) {
    const href = item.children?.[0]?.href ?? item.href
    if (href) return href
  }
  return undefined
}

export function mapUserDetailToProfile(
  detail: IamUserQueryResponse,
  tenantCode?: string,
): ShellUserProfile {
  const membership =
    detail.memberships.find((item) => item.tenant_code === tenantCode) ??
    detail.memberships.find((item) => item.tenant_user_id === detail.tenant_user_id) ??
    detail.memberships.find((item) => item.is_currently_effective) ??
    detail.memberships[0]
  const hasExpandedMembership =
    detail.tenant_user_id > 0 &&
    (membership === undefined || membership.tenant_user_id === detail.tenant_user_id)
  const position =
    (hasExpandedMembership
      ? detail.positions.find((item) => item.is_primary && item.is_currently_effective)
      : undefined) ??
    (hasExpandedMembership
      ? detail.positions.find((item) => item.is_currently_effective)
      : undefined) ??
    (hasExpandedMembership ? detail.positions[0] : undefined)
  const organization =
    (hasExpandedMembership
      ? detail.organizations.find((item) => item.is_primary && item.is_currently_effective)
      : undefined) ??
    (hasExpandedMembership
      ? detail.organizations.find((item) => item.is_currently_effective)
      : undefined) ??
    (hasExpandedMembership ? detail.organizations[0] : undefined)

  return {
    id: String(detail.user.id),
    name:
      (hasExpandedMembership ? detail.display_name : membership?.display_name) ||
      detail.user.real_name ||
      detail.user.nick_name ||
      detail.user.user_name,
    title: position?.position_name ?? '',
    organization: organization?.org_name ?? '',
    avatarUrl: detail.user.avatar_url?.trim() ?? '',
    avatarFileId: detail.user.avatar_file_id?.trim() ?? '',
  }
}
