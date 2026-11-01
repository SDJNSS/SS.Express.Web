import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { findSubsystem, subsystemConfigs } from '@app/config/subsystems'
import { resolvePermissionFallback } from '@app/router/permissionFallback'
import { useSessionStore } from '@app/store/session'
import {
  collectCurrentAppPermissionRoutes,
  collectCurrentAppMenuPermissionCodes,
  getCurrentAppMenus,
  getCurrentApps,
  clearCurrentPageResourceAccessCache,
  getCurrentPageResourcesCached,
  mapCurrentAppMenusToNavigation,
  mapCurrentProfileToUser,
  normalizeInternalRoute,
  resolveFirstCurrentAppMenuRoute,
  getCurrentProfile,
  type IamApplication,
  type IamCurrentAppMenusResponse,
} from '@features/iam/shell-context/public'
import { getStoredAuthSession } from '@shared/api/authSession'
import { ApiError } from '@shared/api/httpClient'
import {
  DEFAULT_SHELL_BRANDING,
  resolveAppShellBranding,
} from '@shared/components/appShellBranding'
import type { AppShellNavigationState, AppShellSystem } from '@shared/components/appShell.types'
import { isRetiredIamRoute } from '@shared/constants/iamRetirements'
import { resolveLocalMdiIcon } from '@shared/icons/registerIcons'
import { notification } from '@shared/services/notification'
import { subscribePermissionCatalogChanged } from '@shared/services/permissionCatalogEvents'

type LoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

const permissionPageModules = import.meta.glob([
  '../../features/**/pages/*.vue',
  '!../../features/reference/**/*.vue',
])

function normalizeComponentKey(value: string): string {
  return value
    .trim()
    .replace(/\\/gu, '/')
    .replace(/^\/+|\.vue$/giu, '')
}

function permissionPageComponent(value: string): (() => Promise<Component>) | undefined {
  const expected = normalizeComponentKey(value)
  const entry = Object.entries(permissionPageModules).find(([path]) =>
    normalizeComponentKey(path).endsWith(`/features/${expected}`),
  )
  return entry?.[1] as (() => Promise<Component>) | undefined
}

function normalizedAppCode(value: string): string {
  return value.trim().toLowerCase()
}

function shellErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback
  if (error.category === 'network') return '无法连接权限服务，请检查网络后重试'
  if (error.category === 'permission') return '当前账号无法读取权限导航'
  return error.message || fallback
}

export function useAppShellContext() {
  const route = useRoute()
  const router = useRouter()
  const session = useSessionStore()
  const shellBranding = ref({ ...DEFAULT_SHELL_BRANDING })
  const apps = ref<IamApplication[]>([])
  const activeAppMenus = ref<IamCurrentAppMenusResponse | null>(null)
  const appState = ref<LoadState>('idle')
  const menuState = ref<LoadState>('idle')
  const permissionRoutes = ref<ReturnType<typeof collectCurrentAppPermissionRoutes>>([])
  const appError = ref('')
  const menuError = ref('')
  const menuCache = new Map<number, IamCurrentAppMenusResponse>()
  const menuRequests = new Map<number, Promise<IamCurrentAppMenusResponse>>()
  const appEntryRoutes = ref<Record<number, string>>({})
  let appRequestSequence = 0
  let contextRequestSequence = 0
  let functionRequestSequence = 0
  let isLoadingApps = false
  let isUnmounted = false
  let unsubscribePermissionCatalog: () => void = () => undefined

  const knownSubsystems = new Map<string, (typeof subsystemConfigs)[number]>(
    subsystemConfigs.map((subsystem) => [subsystem.id, subsystem] as const),
  )

  function appEntryHref(app: IamApplication): string {
    const appCode = normalizedAppCode(app.app_code)
    const resolvedEntry = appEntryRoutes.value[app.id]
    if (resolvedEntry) return resolvedEntry
    const routePrefix = normalizeInternalRoute(app.route_prefix)
    return routePrefix ?? `/${encodeURIComponent(appCode)}`
  }

  const shellSystems = computed<AppShellSystem[]>(() =>
    apps.value.map((app) => {
      const id = normalizedAppCode(app.app_code)
      const known = knownSubsystems.get(id)
      return {
        id,
        label: app.app_name.trim() || '未命名应用',
        icon: resolveLocalMdiIcon(app.icon, known?.icon ?? 'mdi:layers-triple-outline'),
        href: appEntryHref(app),
      }
    }),
  )

  const routeSubsystem = computed(() => {
    const subsystem =
      typeof route.meta.subsystem === 'string'
        ? route.meta.subsystem.toLowerCase()
        : route.path.split('/').filter(Boolean)[0]?.toLowerCase()
    return subsystem === 'reference' ? 'dms' : subsystem
  })

  const currentApp = computed(() => {
    const directMatch = apps.value.find(
      (app) => normalizedAppCode(app.app_code) === routeSubsystem.value,
    )
    if (directMatch) return directMatch

    return (
      apps.value.find((app) => {
        const prefix = normalizeInternalRoute(app.route_prefix)
        return prefix && (route.path === prefix || route.path.startsWith(`${prefix}/`))
      }) ?? apps.value[0]
    )
  })

  const currentSystemId = computed(() =>
    normalizedAppCode(currentApp.value?.app_code ?? routeSubsystem.value ?? 'dms'),
  )
  const currentSystemLabel = computed(
    () =>
      currentApp.value?.app_name.trim() ||
      knownSubsystems.get(currentSystemId.value)?.label ||
      findSubsystem(route.path).label,
  )

  function includeInShellNavigation(path: string): boolean {
    if (isRetiredIamRoute(path)) return false
    if (import.meta.env.DEV) return true
    return router.resolve(path).meta.implementationStatus !== 'placeholder'
  }

  const shellNavigation = computed(() =>
    activeAppMenus.value
      ? mapCurrentAppMenusToNavigation(activeAppMenus.value, route.path, includeInShellNavigation)
      : [],
  )

  const navigationState = computed<AppShellNavigationState>(() => {
    if (session.isWelcomeOnlySession) return 'empty'
    if (appState.value === 'loading' || menuState.value === 'loading') {
      return 'loading'
    }
    if (appState.value === 'error' || menuState.value === 'error') {
      return 'error'
    }
    if (appState.value === 'empty' || menuState.value === 'empty') {
      return 'empty'
    }
    return 'ready'
  })

  const navigationMessage = computed(() => {
    if (session.isWelcomeOnlySession) return '当前仅开放欢迎页'
    if (appState.value === 'error') return appError.value
    if (menuState.value === 'error') return menuError.value
    if (appState.value === 'empty') return '当前账号暂无可用应用'
    if (menuState.value === 'empty') return '当前应用暂无可用菜单'
    if (navigationState.value === 'loading') return '正在加载权限导航'
    return ''
  })

  function registerPermissionPageRoutes() {
    for (const item of permissionRoutes.value) {
      if (isRetiredIamRoute(item.path)) continue
      if (router.resolve(item.path).name !== 'not-found') continue
      const component = permissionPageComponent(item.component)
      if (!component) {
        notification.warning(`页面组件未注册：${item.component}`)
        continue
      }
      router.addRoute('app-shell', {
        path: item.path.replace(/^\//u, ''),
        name: `permission-page-${item.appId}-${encodeURIComponent(item.path)}`,
        component,
        meta: {
          title: item.title || '业务页面',
          resourceCode: item.resourceCode,
          authorizationModel: 'v2',
          subsystem: normalizedAppCode(
            apps.value.find((app) => app.id === item.appId)?.app_code ?? '',
          ) as 'dms' | 'iam' | 'tms' | 'vms',
          hidden: item.type === 'page',
        },
      })
    }
  }

  async function enforceCurrentRoutePermission(app: IamApplication) {
    // Registered pages are checked by CurrentPageResources in the router, not by navigation.
    if (route.meta.resourceCode || route.path === '/platform/welcome') return
    const permission = typeof route.meta.permission === 'string' ? route.meta.permission : undefined
    const scope = normalizedAppCode(app.app_code)
    if (!permission || !session.canEvaluatePermission(scope) || session.hasPermission(permission)) {
      return
    }
    if (route.name === 'forbidden' || route.name === 'not-found') return
    const fallback = resolvePermissionFallback(router, route, session.hasPermission)
    if (fallback) {
      await router.replace(fallback)
      return
    }
    await router.replace({ name: 'forbidden', query: { from: route.fullPath } })
  }

  async function refreshPagePermissions() {
    const pageCode = typeof route.meta.resourceCode === 'string' ? route.meta.resourceCode : ''
    if (!pageCode || route.path === '/platform/welcome') return
    const sequence = ++functionRequestSequence
    const stored = getStoredAuthSession()
    const isCurrent = () =>
      !isUnmounted &&
      sequence === functionRequestSequence &&
      route.meta.resourceCode === pageCode &&
      stored?.accessToken === getStoredAuthSession()?.accessToken &&
      stored?.currentTenantId === getStoredAuthSession()?.currentTenantId
    session.beginPageResourcePermissionLoad(pageCode)
    try {
      const response = await getCurrentPageResourcesCached(pageCode, { force: true })
      if (!isCurrent()) return
      if (!response.can_access) {
        session.setPageResourcePermissions(pageCode, [])
        await router.replace({ name: 'forbidden', query: { from: route.fullPath } })
        return
      }
      session.setPageResourcePermissions(pageCode, [
        pageCode,
        ...response.button_resource_codes,
        ...response.button_page_resource_codes,
      ])
    } catch (error) {
      if (!isCurrent()) return
      session.setPageResourcePermissions(pageCode, [])
      notification.warning(shellErrorMessage(error, '功能权限加载失败，相关操作已默认隐藏'))
      await router.replace({ name: 'authorization-service-error', query: { from: route.fullPath } })
    }
  }

  function rememberAppMenus(app: IamApplication, response: IamCurrentAppMenusResponse) {
    menuCache.set(app.id, response)
    const entry = resolveFirstCurrentAppMenuRoute(response, includeInShellNavigation)
    if (!entry) return
    appEntryRoutes.value = { ...appEntryRoutes.value, [app.id]: entry }
  }

  async function readAppMenus(
    app: IamApplication,
    force = false,
  ): Promise<IamCurrentAppMenusResponse> {
    if (!force) {
      const cached = menuCache.get(app.id)
      if (cached) return cached
      const pending = menuRequests.get(app.id)
      if (pending) return pending
    }

    const request = getCurrentAppMenus(app.id)
    menuRequests.set(app.id, request)
    try {
      const response = await request
      rememberAppMenus(app, response)
      return response
    } finally {
      if (menuRequests.get(app.id) === request) menuRequests.delete(app.id)
    }
  }

  async function resolveAppEntry(systemId: string): Promise<string | undefined> {
    const app = apps.value.find((item) => normalizedAppCode(item.app_code) === systemId)
    if (!app) return undefined
    try {
      const response = await readAppMenus(app)
      const entry = resolveFirstCurrentAppMenuRoute(response, includeInShellNavigation)
      if (!entry) notification.warning(`${app.app_name || app.app_code} 暂无可用菜单`)
      return entry
    } catch (error) {
      notification.warning(shellErrorMessage(error, '应用入口加载失败，请重试'))
      return undefined
    }
  }

  async function loadAppContext(app: IamApplication, force = false) {
    const scope = normalizedAppCode(app.app_code)
    const sequence = ++contextRequestSequence
    session.beginNavigationPermissionLoad(scope)
    menuError.value = ''
    activeAppMenus.value = null
    menuState.value = 'loading'

    try {
      const response = await readAppMenus(app, force)
      if (sequence !== contextRequestSequence) return

      activeAppMenus.value = response
      permissionRoutes.value = collectCurrentAppPermissionRoutes(response)
      registerPermissionPageRoutes()
      session.setNavigationPermissions(collectCurrentAppMenuPermissionCodes(response), scope)
      menuState.value = shellNavigation.value.length ? 'ready' : 'empty'

      await enforceCurrentRoutePermission(app)
    } catch (error) {
      if (sequence !== contextRequestSequence) return
      activeAppMenus.value = null
      menuState.value = 'error'
      menuError.value = shellErrorMessage(error, '权限菜单加载失败，请重试')
    }
  }

  async function ensureAllowedApp() {
    const requested = routeSubsystem.value
    const requestedIsKnownApp = Boolean(requested && knownSubsystems.has(requested))
    const allowed = apps.value.some((app) => normalizedAppCode(app.app_code) === requested)
    const firstAllowedApp = apps.value[0]
    if (requestedIsKnownApp && !allowed && firstAllowedApp) {
      const entry = await resolveAppEntry(normalizedAppCode(firstAllowedApp.app_code))
      if (entry) await router.replace(entry)
      else await router.replace({ name: 'forbidden', query: { from: route.fullPath } })
    }
  }

  async function loadApps(force = false) {
    const sequence = ++appRequestSequence
    contextRequestSequence += 1
    isLoadingApps = true
    appState.value = 'loading'
    appError.value = ''
    if (force) {
      menuCache.clear()
      menuRequests.clear()
      appEntryRoutes.value = {}
    }
    try {
      const response = await getCurrentApps()
      if (sequence !== appRequestSequence) return
      apps.value = (response.apps ?? []).filter((app) => app.app_code.trim())
      appState.value = apps.value.length ? 'ready' : 'empty'
      if (!apps.value.length) {
        activeAppMenus.value = null
        permissionRoutes.value = []
        menuState.value = 'empty'
        return
      }
      await ensureAllowedApp()
      if (currentApp.value) await loadAppContext(currentApp.value, force)
    } catch (error) {
      if (sequence !== appRequestSequence) return
      apps.value = []
      activeAppMenus.value = null
      appState.value = 'error'
      menuState.value = 'idle'
      appError.value = shellErrorMessage(error, '应用权限加载失败，请重试')
    } finally {
      if (sequence === appRequestSequence) isLoadingApps = false
    }
  }

  async function loadUserProfile() {
    const stored = getStoredAuthSession()
    if (!stored) return
    try {
      const response = await getCurrentProfile()
      const current = getStoredAuthSession()
      // 旧会话/旧 Tenant 的慢响应不得覆盖退出或切换后的展示资料。
      if (
        isUnmounted ||
        current?.accessToken !== stored.accessToken ||
        current?.currentTenantId !== stored.currentTenantId
      )
        return
      shellBranding.value = resolveAppShellBranding({
        brandName: response.branding?.brand_name,
        platformName: response.branding?.platform_name,
        logoUrl: response.branding?.logo_url,
      })
      session.setUserProfile(mapCurrentProfileToUser(response))
    } catch (error) {
      if (isUnmounted || getStoredAuthSession()?.accessToken !== stored.accessToken) return
      if (error instanceof ApiError && error.category === 'authentication') return
      notification.warning('用户资料加载失败，当前显示登录账号')
    }
  }

  async function retryNavigation() {
    if (session.isWelcomeOnlySession) return
    await refreshPagePermissions()
    if (appState.value === 'error') {
      await loadApps(true)
      return
    }
    if (currentApp.value) await loadAppContext(currentApp.value, true)
  }

  watch(
    () => currentSystemId.value,
    async (current, previous) => {
      if (!current || current === previous || isLoadingApps || appState.value !== 'ready') return
      if (currentApp.value) await loadAppContext(currentApp.value)
    },
  )

  watch(
    () => route.path,
    async (current, previous) => {
      if (current === previous || isLoadingApps || appState.value !== 'ready') return
      const app = currentApp.value
      const response = activeAppMenus.value
      if (!app || !response || response.app.id !== app.id) return
      await enforceCurrentRoutePermission(app)
    },
  )

  onMounted(() => {
    unsubscribePermissionCatalog = subscribePermissionCatalogChanged(async () => {
      if (!session.isWelcomeOnlySession) {
        clearCurrentPageResourceAccessCache()
        await Promise.all([loadApps(true), refreshPagePermissions()])
      }
    })
    if (session.isWelcomeOnlySession) {
      appState.value = 'empty'
      menuState.value = 'empty'
      return
    }
    void Promise.allSettled([loadApps(), loadUserProfile()])
  })

  onBeforeUnmount(() => {
    isUnmounted = true
    unsubscribePermissionCatalog()
  })

  return {
    shellBranding,
    currentApp,
    currentSystemId,
    currentSystemLabel,
    shellSystems,
    shellNavigation,
    navigationState,
    navigationMessage,
    resolveAppEntry,
    retryNavigation,
  }
}
