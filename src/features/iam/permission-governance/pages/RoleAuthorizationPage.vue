<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { currentTenantId } from '@features/iam/foundation/public'
import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import { IAM_PERMISSION_GOVERNANCE_RESOURCES } from '@shared/constants/iamPermissions'
import { positiveEntityId, sameEntityId } from '@shared/utils/entityId'
import { notification } from '@shared/services/notification'
import type { EntityId } from '@shared/types/entityId'
import {
  mapDirectRoleAuthorization,
  toDirectPermissionSaveRequest,
} from '../adapters/directPermissionAdapter'
import {
  ApiError,
  createRequestId,
  getPermissionGovernanceAuthSession,
  permissionGovernanceApi,
} from '../api/permissionGovernanceApi'
import RoleAuthorizationPageView from '../components/RoleAuthorizationPageView.vue'
import {
  permissionGovernanceErrorMessage,
  isUnknownPermissionGovernanceMutation,
} from '../composables/permissionGovernanceFeedback'
import type {
  PermissionTreeNode,
  PermissionGovernanceApp,
  PermissionGovernancePreviewState,
  PermissionRoleRecord,
} from '../types/permissionGovernance'
const route = useRoute()
const router = useRouter()
const { hasPermission } = useEffectivePermissions()
const apps = ref<PermissionGovernanceApp[]>([])
const permissionTreeByApp = ref<Record<string, PermissionTreeNode[]>>({})
const role = ref<PermissionRoleRecord>({
  id: '0',
  tenantId: '0',
  tenantName: '',
  roleCode: '',
  roleName: '角色授权',
  roleType: 'UNKNOWN',
  status: 'DISABLED',
  permissionIds: [],
  canMaintain: false,
  version: '',
  snapshotVersion: '',
})
const state = ref<PermissionGovernancePreviewState>('loading')
let sequence = 0
let saving = false
const canSave = computed(() =>
  hasPermission(IAM_PERMISSION_GOVERNANCE_RESOURCES.roles.saveAuthorization),
)
onBeforeUnmount(() => sequence++)
async function load() {
  const generation = ++sequence
  state.value = 'loading'
  const tenantId = positiveEntityId(route.query.tenantId) ?? positiveEntityId(currentTenantId())
  const roleId = positiveEntityId(route.query.roleId)
  if (!tenantId || !roleId || !sameEntityId(tenantId, currentTenantId())) {
    state.value = 'retryable-error'
    notification.error('角色参数无效或不属于当前会话租户')
    return
  }
  try {
    const [systems, metadata, authorization, candidates] = await Promise.all([
      permissionGovernanceApi.querySystems(),
      permissionGovernanceApi.queryRoleMetadata({
        tenant_id: tenantId,
        id: roleId,
        page_index: 1,
        page_size: 1,
      }),
      permissionGovernanceApi.queryRolePermissionScheme({ tenant_id: tenantId, role_id: roleId }),
      permissionGovernanceApi.queryEligiblePermissions({ tenant_id: tenantId, role_id: roleId }),
    ])
    const target = metadata.items.find((item) => sameEntityId(item.id, roleId))
    if (!target) throw new Error('当前租户未找到目标角色')
    // QueryEligiblePermissions is a summary; load detail pages in batches, never one request per Permission.
    const details = []
    let pageIndex = 1
    while (true) {
      const page = await permissionGovernanceApi.queryPermissionSchemes({
        tenant_id: tenantId,
        include_details: true,
        page_index: pageIndex++,
        page_size: 200,
      })
      if (generation !== sequence) return
      details.push(...page.items)
      if (details.length >= page.total) break
      if (!page.items.length) throw new Error('权限目录分页不完整')
    }
    const byId = new Map(details.map((item) => [item.id, item]))
    if (
      candidates.permissions.some(
        (item) =>
          byId.has(item.permission.id) &&
          byId.get(item.permission.id)?.version !== item.permission.version,
      )
    )
      throw new Error('权限目录已变化，请重新加载最新快照')
    candidates.permissions = candidates.permissions.map((item) => ({
      ...item,
      permission: byId.get(item.permission.id) ?? item.permission,
    }))
    const session = getPermissionGovernanceAuthSession()
    const mapped = mapDirectRoleAuthorization(authorization, candidates, systems, {
      tenantName: session?.currentTenantName ?? '',
      roleType: target.role_type.toLowerCase() === 'system' ? 'SYSTEM' : 'CUSTOM',
      status: target.status.toLowerCase() === 'active' ? 'ACTIVE' : 'DISABLED',
      canMaintain: canSave.value && target.status.toLowerCase() === 'active',
    })
    if (generation !== sequence) return
    apps.value = mapped.apps
    permissionTreeByApp.value = mapped.permissionTreeByApp
    role.value = mapped.role
    state.value = candidates.permissions.length
      ? authorization.assigned_permission_ids.length
        ? 'ready'
        : 'no-binding'
      : 'empty'
  } catch (error) {
    if (generation !== sequence) return
    state.value = 'retryable-error'
    notification.error(permissionGovernanceErrorMessage(error, '角色授权加载失败'))
  }
}
async function savePermissions(record: PermissionRoleRecord, permissionIds: EntityId[]) {
  if (
    saving ||
    !canSave.value ||
    state.value === 'unknown-result' ||
    state.value === 'version-conflict'
  )
    throw new Error('当前状态不可保存')
  if (
    record !== role.value ||
    record.status !== 'ACTIVE' ||
    !sameEntityId(record.tenantId, currentTenantId())
  )
    throw new Error('角色上下文已变化，请重新加载')
  saving = true
  const generation = sequence
  try {
    await permissionGovernanceApi.saveRolePermissionScheme(
      toDirectPermissionSaveRequest(record, permissionIds, createRequestId()),
    )
    if (generation !== sequence) return
    notification.success('角色授权已保存')
    await load()
  } catch (error) {
    if (generation === sequence) {
      state.value = isUnknownPermissionGovernanceMutation(error)
        ? 'unknown-result'
        : error instanceof ApiError && error.status === 409
          ? 'version-conflict'
          : 'ready'
      notification.error(
        permissionGovernanceErrorMessage(error, '保存角色授权失败，修改内容已保留'),
      )
    }
    throw error
  } finally {
    saving = false
  }
}
watch(
  () => [route.query.roleId, route.query.tenantId],
  () => void load(),
  { immediate: true },
)
</script>
<template>
  <RoleAuthorizationPageView
    :apps="apps"
    :permission-tree-by-app="permissionTreeByApp"
    :role="role"
    :state="state"
    :back="() => router.push({ name: 'iam-role-management' })"
    :save-permissions="savePermissions"
    @retry="load"
  />
</template>
