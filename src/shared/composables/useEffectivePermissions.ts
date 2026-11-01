import { onBeforeUnmount, shallowRef } from 'vue'

import {
  getFunctionPermissionSnapshot,
  subscribeFunctionPermissionSnapshot,
} from '@shared/services/functionPermissionState'
import {
  getNavigationPermissionSnapshot,
  subscribeNavigationPermissionSnapshot,
} from '@shared/services/navigationPermissionState'
import {
  getPageResourcePermissionSnapshot,
  subscribePageResourcePermissionSnapshot,
} from '@shared/services/pageResourcePermissionState'

export function useEffectivePermissions() {
  const functionSnapshot = shallowRef(getFunctionPermissionSnapshot())
  const navigationSnapshot = shallowRef(getNavigationPermissionSnapshot())
  const pageResourceSnapshot = shallowRef(getPageResourcePermissionSnapshot())
  const unsubscribeFunctions = subscribeFunctionPermissionSnapshot((value) => {
    functionSnapshot.value = value
  })
  const unsubscribeNavigation = subscribeNavigationPermissionSnapshot((value) => {
    navigationSnapshot.value = value
  })
  const unsubscribePageResources = subscribePageResourcePermissionSnapshot((value) => {
    pageResourceSnapshot.value = value
  })

  onBeforeUnmount(() => {
    unsubscribeFunctions()
    unsubscribeNavigation()
    unsubscribePageResources()
  })

  function hasPermission(permission: string): boolean {
    return (
      (functionSnapshot.value.ready && functionSnapshot.value.permissions.has(permission)) ||
      (navigationSnapshot.value.ready && navigationSnapshot.value.permissions.has(permission)) ||
      (pageResourceSnapshot.value.ready && pageResourceSnapshot.value.permissions.has(permission))
    )
  }

  function hasFunctionPermission(permission: string): boolean {
    return (
      (functionSnapshot.value.ready && functionSnapshot.value.permissions.has(permission)) ||
      (pageResourceSnapshot.value.ready && pageResourceSnapshot.value.permissions.has(permission))
    )
  }

  return { hasPermission, hasFunctionPermission }
}
