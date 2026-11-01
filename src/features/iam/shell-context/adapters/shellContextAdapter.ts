import type { AppShellNavigationItem } from '@shared/components/appShell.types'
import { resolveLocalMdiIcon } from '@shared/icons/registerIcons'

import type {
  IamCurrentAppMenusResponse,
  IamCurrentMenuResourceResponse,
  IamPermissionResource,
  IamCurrentProfileResponse,
  ShellUserProfile,
} from '../types/shellContext'

export interface CurrentPermissionRoute {
  appId: number
  type: 'menu' | 'page'
  path: string
  component: string
  resourceCode: string
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
  return resource.status?.trim().toLowerCase() === 'active' && resource.lifecycle !== 'retired'
}

function isVisibleMenu(resource: IamPermissionResource): boolean {
  return (
    resource.resource_type.trim().toLowerCase() === 'menu' &&
    isEffectiveResource(resource) &&
    resource.is_visible !== false
  )
}

function isAvailableModuleContainer(resource: IamPermissionResource): boolean {
  return resource.resource_type.trim().toLowerCase() === 'module' && isEffectiveResource(resource)
}

function compareResources(left: IamPermissionResource, right: IamPermissionResource): number {
  return left.sort_order - right.sort_order || left.id - right.id
}

function permissionRoute(resource: IamPermissionResource): CurrentPermissionRoute[] {
  const type = resource.resource_type.trim().toLowerCase()
  const path = normalizeInternalRoute(resource.route_path)
  if (
    (type !== 'menu' && type !== 'page') ||
    !isEffectiveResource(resource) ||
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
      resourceCode: resource.resource_code.trim(),
      title: resource.resource_name.trim(),
    },
  ]
}

export function collectCurrentAppPermissionRoutes(
  response: IamCurrentAppMenusResponse,
): CurrentPermissionRoute[] {
  return (response.modules ?? []).flatMap((module) => {
    if (!isAvailableModuleContainer(module.resource)) return []
    return (module.menus ?? []).flatMap(permissionRoute)
  })
}

export function collectCurrentAppMenuPermissionCodes(
  response: IamCurrentAppMenusResponse,
): string[] {
  return (response.modules ?? []).flatMap((module) => {
    if (!isAvailableModuleContainer(module.resource)) return []
    return (module.menus ?? []).flatMap((menu) => {
      const permissionCode = menu.resource_code.trim()
      if (menu.resource_type.trim().toLowerCase() !== 'menu' || !isEffectiveResource(menu)) {
        return []
      }
      return permissionCode ? [permissionCode] : []
    })
  })
}

function routeMatchScore(resource: IamPermissionResource, currentPath: string): number {
  if (!isEffectiveResource(resource)) return -1
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
    .filter((module) => isAvailableModuleContainer(module.resource))
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
    .sort((left, right) => compareResources(left.resource, right.resource))
    .flatMap(({ resource: module, menus }): AppShellNavigationItem[] => {
      const label = module.resource_name.trim()
      if (!label || !isAvailableModuleContainer(module)) return []

      const moduleHref = normalizeInternalRoute(module.route_path)
      const visibleMenus = [...(menus ?? [])].sort(compareResources).filter(isVisibleMenu)
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

export function mapCurrentProfileToUser(profile: IamCurrentProfileResponse): ShellUserProfile {
  return {
    id: String(profile.user_id),
    name: profile.display_name || profile.real_name || profile.nick_name || profile.user_name,
    title: profile.position_name,
    organization: profile.organization_name,
    avatarUrl: profile.avatar_url.trim(),
    avatarFileId: profile.avatar_file_id.trim(),
  }
}
