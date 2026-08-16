import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthState } from '@logistics/types'

const TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'auth_refresh_token'
const AUTH_STATE_KEY = 'auth_state'

export const useAuthStore = defineStore('auth', () => {
  const authState = ref<AuthState | null>(null)

  const isAuthenticated = computed(() => !!authState.value)
  const accessToken = computed(() => authState.value?.accessToken || null)
  const refreshToken = computed(() => authState.value?.refreshToken || null)
  const currentUser = computed(() =>
    authState.value
      ? {
          userId: authState.value.userId,
          username: authState.value.username,
          realName: authState.value.realName
        }
      : null
  )
  const currentTenant = computed(() =>
    authState.value
      ? {
          tenantId: authState.value.tenantId,
          tenantCode: authState.value.tenantCode,
          tenantName: authState.value.tenantName,
          tenantStatus: authState.value.tenantStatus
        }
      : null
  )
  const currentPlan = computed(() =>
    authState.value
      ? {
          planId: authState.value.planId,
          planCode: authState.value.planCode,
          planName: authState.value.planName
        }
      : null
  )
  const subscriptionInfo = computed(() =>
    authState.value
      ? {
          status: authState.value.subscriptionStatus,
          endAt: authState.value.subscriptionEndAt
        }
      : null
  )

  function setAuth(state: AuthState) {
    authState.value = state
    localStorage.setItem(TOKEN_KEY, state.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, state.refreshToken)
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state))
  }

  function clearAuth() {
    authState.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(AUTH_STATE_KEY)
  }

  function restoreAuth() {
    const savedState = localStorage.getItem(AUTH_STATE_KEY)
    if (savedState) {
      try {
        authState.value = JSON.parse(savedState)
      } catch (error) {
        clearAuth()
      }
    }
  }

  function updateTokens(accessToken: string, refreshToken: string) {
    if (authState.value) {
      authState.value.accessToken = accessToken
      authState.value.refreshToken = refreshToken
      localStorage.setItem(TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authState.value))
    }
  }

  return {
    authState,
    isAuthenticated,
    accessToken,
    refreshToken,
    currentUser,
    currentTenant,
    currentPlan,
    subscriptionInfo,
    setAuth,
    clearAuth,
    restoreAuth,
    updateTokens
  }
})
