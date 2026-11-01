import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  clearStoredAuthSession,
  getStoredAuthSession,
  updateStoredAuthSession,
} from '@shared/api/authSession'
import { AUTH_SESSION_STATES } from '@shared/constants/authSession'
import { publishFunctionPermissionSnapshot } from '@shared/services/functionPermissionState'
import { publishNavigationPermissionSnapshot } from '@shared/services/navigationPermissionState'
import { publishPageResourcePermissionSnapshot } from '@shared/services/pageResourcePermissionState'
import { projectPageResourceAliases } from '@shared/services/pageResourceAliases'

export interface SessionUser {
  id: string
  name: string
  title: string
  organization: string
  avatarUrl: string
  avatarFileId?: string
}

export const useSessionStore = defineStore('session', () => {
  const user = ref<SessionUser>({
    id: '',
    name: '当前用户',
    title: '平台用户',
    organization: '',
    avatarUrl: '',
  })
  const permissions = ref(new Set<string>())
  const functionPermissionsReady = ref(false)
  const navigationPermissions = ref(new Set<string>())
  const navigationPermissionScope = ref<string | null>(null)
  const navigationPermissionsReady = ref(false)
  const pageResourcePermissions = ref(new Set<string>())
  const pageResourcePermissionScope = ref<string | null>(null)
  const pageResourcePermissionsReady = ref(false)
  const loginState = ref('')
  const currentTenantName = ref('')
  const isAuthenticated = ref(false)
  let restoredAccessToken = ''
  let restoredTenantId: number | undefined

  const isWelcomeOnlySession = computed(
    () => loginState.value === AUTH_SESSION_STATES.initialPasswordChangeRequired,
  )
  const canSelectTenant = computed(
    () => loginState.value === AUTH_SESSION_STATES.tenantSelectionRequired,
  )
  const canEnterAppShell = computed(() => isAuthenticated.value || isWelcomeOnlySession.value)

  const displayName = computed(() =>
    [user.value.name, user.value.title].filter((value) => value.trim()).join(' · '),
  )

  function hasPermission(permission?: string): boolean {
    return (
      !permission ||
      permissions.value.has(permission) ||
      navigationPermissions.value.has(permission) ||
      pageResourcePermissions.value.has(permission)
    )
  }

  function canEvaluateNavigationPermission(scope?: string): boolean {
    return (
      navigationPermissionsReady.value &&
      Boolean(scope) &&
      navigationPermissionScope.value === scope
    )
  }

  function canEvaluatePermission(scope?: string): boolean {
    return canEvaluateNavigationPermission(scope)
  }

  function beginFunctionPermissionLoad() {
    permissions.value = new Set()
    functionPermissionsReady.value = false
    publishFunctionPermissionSnapshot([], false)
  }

  function setFunctionPermissions(values: Iterable<string>) {
    const nextPermissions = new Set(values)
    permissions.value = nextPermissions
    functionPermissionsReady.value = true
    publishFunctionPermissionSnapshot(nextPermissions, true)
  }

  function setNavigationPermissions(values: Iterable<string>, scope: string) {
    const nextPermissions = new Set(values)
    navigationPermissions.value = nextPermissions
    navigationPermissionScope.value = scope
    navigationPermissionsReady.value = true
    publishNavigationPermissionSnapshot(scope, nextPermissions, true)
  }

  function beginNavigationPermissionLoad(scope: string) {
    navigationPermissions.value = new Set()
    navigationPermissionsReady.value = false
    navigationPermissionScope.value = scope
    publishNavigationPermissionSnapshot(scope, [], false)
  }

  function beginPageResourcePermissionLoad(
    pageResourceCode: string,
    loadingReason: 'navigation' | 'refresh' = 'refresh',
  ) {
    beginFunctionPermissionLoad()
    pageResourcePermissions.value = new Set()
    pageResourcePermissionScope.value = pageResourceCode
    pageResourcePermissionsReady.value = false
    publishPageResourcePermissionSnapshot(pageResourceCode, [], false, loadingReason)
  }

  function setPageResourcePermissions(pageResourceCode: string, values: Iterable<string>) {
    const nextPermissions = new Set(values)
    pageResourcePermissions.value = nextPermissions
    pageResourcePermissionScope.value = pageResourceCode
    pageResourcePermissionsReady.value = true
    publishPageResourcePermissionSnapshot(pageResourceCode, nextPermissions, true)
    setFunctionPermissions(projectPageResourceAliases(pageResourceCode, nextPermissions))
  }

  function clearPageResourcePermissions() {
    beginFunctionPermissionLoad()
    pageResourcePermissions.value = new Set()
    pageResourcePermissionScope.value = null
    pageResourcePermissionsReady.value = false
    publishPageResourcePermissionSnapshot(null, [], false)
  }

  function setUserProfile(profile: SessionUser) {
    user.value = profile
    updateStoredAuthSession({
      userId: profile.id,
      userName: profile.name,
      displayTitle: profile.title,
      avatarUrl: profile.avatarUrl,
      avatarFileId: profile.avatarFileId ?? '',
    })
  }

  function restoreSession() {
    const stored = getStoredAuthSession()
    const sameSession = Boolean(
      stored?.accessToken &&
      stored.accessToken === restoredAccessToken &&
      stored.currentTenantId === restoredTenantId,
    )
    loginState.value = stored?.loginState ?? ''
    currentTenantName.value = stored?.currentTenantName?.trim() ?? ''
    isAuthenticated.value = loginState.value === AUTH_SESSION_STATES.authenticated
    if (!sameSession) {
      clearPageResourcePermissions()
      navigationPermissions.value = new Set()
      navigationPermissionsReady.value = false
      navigationPermissionScope.value = null
      publishNavigationPermissionSnapshot(null, [], false)
      restoredAccessToken = stored?.accessToken ?? ''
      restoredTenantId = stored?.currentTenantId
    }
    user.value = stored
      ? {
          id: stored.userId ?? stored.account,
          name: stored.userName ?? stored.account,
          title: stored.displayTitle ?? '',
          organization: stored.currentTenantName ?? '',
          avatarUrl: stored.avatarUrl ?? '',
          avatarFileId: stored.avatarFileId ?? '',
        }
      : { id: '', name: '当前用户', title: '平台用户', organization: '', avatarUrl: '' }
  }

  function expireSession() {
    clearStoredAuthSession()
    loginState.value = ''
    currentTenantName.value = ''
    isAuthenticated.value = false
    permissions.value = new Set()
    functionPermissionsReady.value = false
    publishFunctionPermissionSnapshot([], false)
    restoredAccessToken = ''
    navigationPermissions.value = new Set()
    navigationPermissionScope.value = null
    navigationPermissionsReady.value = false
    publishNavigationPermissionSnapshot(null, [], false)
    clearPageResourcePermissions()
  }

  restoreSession()

  return {
    user,
    permissions,
    functionPermissionsReady,
    navigationPermissions,
    navigationPermissionScope,
    navigationPermissionsReady,
    pageResourcePermissions,
    pageResourcePermissionScope,
    pageResourcePermissionsReady,
    loginState,
    currentTenantName,
    isAuthenticated,
    isWelcomeOnlySession,
    canSelectTenant,
    canEnterAppShell,
    displayName,
    hasPermission,
    canEvaluateNavigationPermission,
    canEvaluatePermission,
    beginFunctionPermissionLoad,
    setFunctionPermissions,
    beginNavigationPermissionLoad,
    setNavigationPermissions,
    beginPageResourcePermissionLoad,
    setPageResourcePermissions,
    clearPageResourcePermissions,
    setUserProfile,
    restoreSession,
    expireSession,
  }
})
