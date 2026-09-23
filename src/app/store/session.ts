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
  const loginState = ref('')
  const currentTenantName = ref('')
  const isAuthenticated = ref(false)
  let restoredAccessToken = ''

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
      navigationPermissions.value.has(permission)
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
    const sameSession = Boolean(stored?.accessToken && stored.accessToken === restoredAccessToken)
    loginState.value = stored?.loginState ?? ''
    currentTenantName.value = stored?.currentTenantName?.trim() ?? ''
    isAuthenticated.value = loginState.value === AUTH_SESSION_STATES.authenticated
    if (!sameSession) {
      permissions.value = new Set(isAuthenticated.value ? (stored?.permissions ?? []) : [])
      functionPermissionsReady.value = false
      publishFunctionPermissionSnapshot([], false)
      restoredAccessToken = stored?.accessToken ?? ''
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
  }

  restoreSession()

  return {
    user,
    permissions,
    functionPermissionsReady,
    navigationPermissions,
    navigationPermissionScope,
    navigationPermissionsReady,
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
    setUserProfile,
    restoreSession,
    expireSession,
  }
})
