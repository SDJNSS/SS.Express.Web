import { onBeforeUnmount, shallowRef } from 'vue'

import {
  getFunctionPermissionSnapshot,
  subscribeFunctionPermissionSnapshot,
} from '@shared/services/functionPermissionState'
import {
  getNavigationPermissionSnapshot,
  subscribeNavigationPermissionSnapshot,
} from '@shared/services/navigationPermissionState'

export function useEffectivePermissions() {
  const functionSnapshot = shallowRef(getFunctionPermissionSnapshot())
  const navigationSnapshot = shallowRef(getNavigationPermissionSnapshot())
  const unsubscribeFunctions = subscribeFunctionPermissionSnapshot((value) => {
    functionSnapshot.value = value
  })
  const unsubscribeNavigation = subscribeNavigationPermissionSnapshot((value) => {
    navigationSnapshot.value = value
  })

  onBeforeUnmount(() => {
    unsubscribeFunctions()
    unsubscribeNavigation()
  })

  function hasPermission(permission: string): boolean {
    return (
      (functionSnapshot.value.ready && functionSnapshot.value.permissions.has(permission)) ||
      (navigationSnapshot.value.ready && navigationSnapshot.value.permissions.has(permission))
    )
  }

  function hasFunctionPermission(permission: string): boolean {
    return functionSnapshot.value.ready && functionSnapshot.value.permissions.has(permission)
  }

  return { hasPermission, hasFunctionPermission }
}
