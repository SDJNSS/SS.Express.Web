<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { currentTenantId } from '@features/iam/foundation/public'
import { positiveEntityId, sameEntityId } from '@shared/utils/entityId'
import { notification } from '@shared/services/notification'

import { mapDirectUserPermissions } from '../adapters/directPermissionAdapter'
import { permissionGovernanceApi } from '../api/permissionGovernanceApi'
import UserEffectivePermissionsPageView from '../components/UserEffectivePermissionsPageView.vue'
import { permissionGovernanceErrorMessage } from '../composables/permissionGovernanceFeedback'
import type {
  EffectivePermissionSubject,
  PermissionTreeNode,
  PermissionGovernanceApp,
  PermissionGovernancePreviewState,
  PermissionRoleRecord,
} from '../types/permissionGovernance'

const route = useRoute()
const router = useRouter()
const apps = ref<PermissionGovernanceApp[]>([])
const permissionTreeByApp = ref<Record<string, PermissionTreeNode[]>>({})
const roles = ref<PermissionRoleRecord[]>([])
const subject = ref<EffectivePermissionSubject>(emptySubject())
const state = ref<PermissionGovernancePreviewState>('loading')

function emptySubject(): EffectivePermissionSubject {
  return {
    userId: 0,
    userName: '用户有效权限',
    tenantId: 0,
    tenantName: '',
    roleIds: [],
    effectivePermissionIds: [],
    effectiveResourceIds: [],
    authorizationVersion: '',
    sourcesByPermissionId: {},
  }
}

let sequence = 0
onBeforeUnmount(() => sequence++)
async function load() {
  const generation = ++sequence
  permissionTreeByApp.value = {}
  roles.value = []
  subject.value = emptySubject()
  state.value = 'loading'
  const tenantId = positiveEntityId(route.query.tenantId) ?? positiveEntityId(currentTenantId())
  const userId = positiveEntityId(route.query.userId)
  if (!userId || !tenantId || !sameEntityId(tenantId, currentTenantId())) {
    state.value = 'retryable-error'
    notification.error('缺少有效的用户参数')
    return
  }

  try {
    const [systems, effective, userResponse] = await Promise.all([
      permissionGovernanceApi.querySystems(),
      permissionGovernanceApi.queryUserPermissions({ tenant_id: tenantId, user_id: userId }),
      permissionGovernanceApi.queryUserContext({
        tenant_ids: [tenantId],
        user_id: userId,
        page_index: 1,
        page_size: 1,
      }),
    ])
    const user = userResponse.items.find((item) => sameEntityId(item.user_id, userId))
    if (!user) throw new Error('未找到目标用户')
    const membership = user.memberships.find((item) => sameEntityId(item.tenant_id, tenantId))
    if (generation !== sequence) return
    const mapped = mapDirectUserPermissions(effective, systems, {
      userName:
        user.user.real_name || user.user.nick_name || user.user.user_name || `用户 ${userId}`,
      tenantName: membership?.tenant_name || user.tenant_code || `Tenant ${tenantId}`,
    })
    apps.value = mapped.apps
    permissionTreeByApp.value = mapped.permissionTreeByApp
    roles.value = mapped.roles
    subject.value = mapped.subject
    state.value = subject.value.effectivePermissionIds?.length ? 'ready' : 'empty'
  } catch (error) {
    if (generation !== sequence) return
    state.value = 'retryable-error'
    notification.error(permissionGovernanceErrorMessage(error, '用户有效权限加载失败'))
  }
}

watch(
  () => [route.query.userId, route.query.tenantId],
  () => void load(),
  { immediate: true },
)
</script>

<template>
  <UserEffectivePermissionsPageView
    :apps="apps"
    :permission-tree-by-app="permissionTreeByApp"
    :roles="roles"
    :subject="subject"
    :state="state"
    :back="() => router.push({ name: 'iam-membership-management' })"
    @retry="load"
  />
</template>
