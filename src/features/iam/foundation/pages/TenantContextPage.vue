<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { notification } from '@shared/services/notification'
import {
  foundationErrorMessage,
  getFoundationSession,
  logoutFoundationSession,
  publishTenantSwitch,
  switchFoundationTenant,
} from '../api/foundationSession'
import TenantContextPageView from '../components/TenantContextPageView.vue'
import type { FoundationPreviewState, TenantOption } from '../types/foundation'

const router = useRouter()
const stored = computed(() => getFoundationSession())
const mode = computed<'select' | 'switch'>(() => stored.value?.currentTenantId ? 'switch' : 'select')
const selectedId = ref<number>()
const setAsDefault = ref(false)
const state = ref<FoundationPreviewState>('ready')
const options = computed<TenantOption[]>(() =>
  (stored.value?.availableTenants ?? []).map((tenant, index) => ({
    id: tenant.tenantId,
    code: tenant.tenantCode,
    name: tenant.tenantName,
    type: tenant.tenantType,
    timezone: tenant.timezone,
    isDefault: tenant.isDefault,
    accent: ['blue', 'cyan', 'amber'][index % 3] ?? 'blue',
  })),
)

async function switchTenant() {
  if (!selectedId.value) return
  state.value = 'loading'
  try {
    const previous = getFoundationSession()
    await switchFoundationTenant(selectedId.value, setAsDefault.value)
    if (previous) publishTenantSwitch(previous)
    await router.replace('/platform/welcome')
  } catch (error) {
    if (!getFoundationSession()) {
      await router.replace('/login')
      return
    }
    state.value = 'retryable-error'
    notification.error(foundationErrorMessage(error, 'Tenant 切换失败'))
  }
}

async function logout() {
  if (mode.value === 'switch') {
    await router.replace('/platform/welcome')
    return
  }
  try {
    await logoutFoundationSession()
  } catch (error) {
    notification.warning(foundationErrorMessage(error, '服务端退出失败，本地会话已清理'))
  } finally {
    await router.replace('/login')
  }
}
</script>

<template>
  <TenantContextPageView
    v-model:set-as-default="setAsDefault"
    :options="options"
    :selected-id="selectedId"
    :state="options.length ? state : 'empty'"
    :account="stored?.account"
    :mode="mode"
    @select="selectedId = $event"
    @submit="switchTenant"
    @cancel="logout"
    @retry="state = 'ready'"
  />
</template>
