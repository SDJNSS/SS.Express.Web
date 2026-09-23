import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { notification } from '@shared/services/notification'
import {
  getNavigationPermissionSnapshot,
  subscribeNavigationPermissionSnapshot,
} from '@shared/services/navigationPermissionState'
import {
  getDashboardAccessContext,
  getDashboardData,
  type DashboardData,
} from '../api/dashboardApi'

export function useDashboard() {
  const accessContext = getDashboardAccessContext()
  const navigationPermission = ref(getNavigationPermissionSnapshot())
  const unsubscribe = subscribeNavigationPermissionSnapshot((snapshot) => {
    navigationPermission.value = snapshot
  })
  const isWelcomeOnlySession = computed(
    () =>
      accessContext.isWelcomeOnlySession ||
      navigationPermission.value.scope !== 'dms' ||
      !navigationPermission.value.ready ||
      !navigationPermission.value.permissions.has('dms:dashboard:view'),
  )
  const welcomeDisplayName = ref(accessContext.displayName)
  const loading = ref(false)
  const data = ref<DashboardData>()

  async function refresh() {
    if (isWelcomeOnlySession.value) return
    loading.value = true
    try {
      data.value = await getDashboardData()
    } catch {
      notification.error('总览数据加载失败，请稍后重试')
    } finally {
      loading.value = false
    }
  }

  watch(
    isWelcomeOnlySession,
    (welcomeOnly) => {
      if (!welcomeOnly && !data.value) void refresh()
    },
    { immediate: true },
  )

  onBeforeUnmount(unsubscribe)

  return { data, loading, refresh, isWelcomeOnlySession, welcomeDisplayName }
}
