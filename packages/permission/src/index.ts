import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { App, Directive } from 'vue'
import type { Router } from 'vue-router'
import type { PermissionState } from '@logistics/types'

export const usePermissionStore = defineStore('permission', () => {
  const permissionState = ref<PermissionState | null>(null)

  const appCodes = computed(() => permissionState.value?.appCodes || [])
  const featureCodes = computed(() => permissionState.value?.featureCodes || [])
  const permissionCodes = computed(() => permissionState.value?.permissionCodes || [])
  const buttonCodes = computed(() => permissionState.value?.buttonCodes || [])
  const menuTree = computed(() => permissionState.value?.menuTree || [])

  function setPermissions(state: PermissionState) {
    permissionState.value = state
  }

  function clearPermissions() {
    permissionState.value = null
  }

  function hasPermission(code: string): boolean {
    return permissionCodes.value.includes(code)
  }

  function hasAnyPermission(codes: string[]): boolean {
    return codes.some(code => hasPermission(code))
  }

  function hasAllPermissions(codes: string[]): boolean {
    return codes.every(code => hasPermission(code))
  }

  function hasApp(appCode: string): boolean {
    return appCodes.value.includes(appCode)
  }

  function hasFeature(featureCode: string): boolean {
    return featureCodes.value.includes(featureCode)
  }

  return {
    permissionState,
    appCodes,
    featureCodes,
    permissionCodes,
    buttonCodes,
    menuTree,
    setPermissions,
    clearPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasApp,
    hasFeature
  }
})

export const permissionDirective: Directive = {
  mounted(el, binding) {
    const { value } = binding
    const permissionStore = usePermissionStore()

    if (value && !permissionStore.hasPermission(value)) {
      el.parentNode?.removeChild(el)
    }
  }
}

export function setupPermissionDirective(app: App) {
  app.directive('permission', permissionDirective)
}

export function setupPermissionGuard(router: Router) {
  router.beforeEach((to, from, next) => {
    const permissionStore = usePermissionStore()
    const requiredPermission = to.meta.permission as string | undefined

    if (requiredPermission && !permissionStore.hasPermission(requiredPermission)) {
      next({ name: 'forbidden' })
      return
    }

    const requiredApp = to.meta.appCode as string | undefined
    if (requiredApp && !permissionStore.hasApp(requiredApp)) {
      next({ name: 'forbidden' })
      return
    }

    next()
  })
}
