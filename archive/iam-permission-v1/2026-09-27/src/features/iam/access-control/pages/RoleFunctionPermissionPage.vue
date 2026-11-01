<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import { IAM_PERMISSIONS } from '@shared/constants/iamPermissions'
import { notification } from '@shared/services/notification'
import type { VersionToken } from '@shared/types/common'
import { currentTenantId } from '@features/iam/foundation/public'
import { mapPermissionTree, mapSystem } from '../adapters/accessControlAdapter'
import {
  accessControlErrorMessage,
  positiveRouteId,
  resolveRole,
} from '../api/accessControlSession'
import { accessControlApi } from '../api/accessControlApi'
import RoleFunctionPermissionPageView from '../components/RoleFunctionPermissionPageView.vue'
import type {
  AccessControlPreviewState,
  ResourceNode,
  RoleRecord,
  SystemRecord,
} from '../types/accessControl'

const route = useRoute()
const router = useRouter()
const { hasFunctionPermission } = useEffectivePermissions()
const canEdit = computed(() => hasFunctionPermission(IAM_PERMISSIONS.roles.saveFunctionPermissions))
const state = ref<AccessControlPreviewState>('loading')
const role = ref<RoleRecord>()
const systems = ref<SystemRecord[]>([])
const resourcesBySystem = ref<Record<number, ResourceNode[]>>({})
const directResourceIds = ref<number[]>([])
let roleVersion: VersionToken = ''

function normalizeResourceIds(ids: Iterable<number>): number[] {
  return [...new Set(ids)].sort((left, right) => left - right)
}

async function load() {
  state.value = 'loading'
  try {
    const tenantId = positiveRouteId(route.query.tenantId) || currentTenantId()
    role.value = await resolveRole(positiveRouteId(route.query.roleId), tenantId)
    const [systemResponse, permissionResponse] = await Promise.all([
      accessControlApi.querySystems({ id: 0, keyword: '' }),
      accessControlApi.queryFunctionPermissions(role.value.id),
    ])
    systems.value = systemResponse.map(mapSystem)
    const tree = mapPermissionTree(permissionResponse.resource_tree ?? [])
    resourcesBySystem.value = systems.value.reduce<Record<number, ResourceNode[]>>(
      (result, system) => ({
        ...result,
        [system.id]: tree.filter((resource) => resource.appId === system.id),
      }),
      {},
    )
    directResourceIds.value = normalizeResourceIds(permissionResponse.direct_resource_ids ?? [])
    roleVersion = permissionResponse.subject.version
    state.value = tree.length || directResourceIds.value.length ? 'ready' : 'empty'
  } catch (error) {
    state.value = 'retryable-error'
    notification.error(accessControlErrorMessage(error, '功能权限加载失败'))
  }
}

async function submit(ids: number[]) {
  if (!role.value || !canEdit.value) {
    notification.warning('当前账号没有保存角色功能权限的权限')
    return
  }
  try {
    const response = await accessControlApi.saveFunctionPermissions({
      role_id: role.value.id,
      role_version: roleVersion,
      direct_resource_ids: normalizeResourceIds(ids),
    })
    directResourceIds.value = normalizeResourceIds(response.direct_resource_ids ?? [])
    roleVersion = response.subject.version
    notification.success('功能权限已保存')
    await load()
  } catch (error) {
    notification.error(accessControlErrorMessage(error, '功能权限保存失败'))
    throw error
  }
}

onMounted(load)
</script>

<template>
  <RoleFunctionPermissionPageView
    v-if="role"
    :can-edit="canEdit"
    :role="role"
    :systems="systems"
    :resources-by-system="resourcesBySystem"
    :direct-resource-ids="directResourceIds"
    :state="state"
    :submit="submit"
    :back="() => router.push({ name: 'iam-role-management' })"
    @retry="load"
  />
  <RoleFunctionPermissionPageView
    v-else
    :can-edit="false"
    :role="{
      id: 0,
      tenantId: 0,
      tenantCode: '—',
      roleCode: 'loading',
      roleName: '正在加载角色',
      roleType: 'CUSTOM',
      sortOrder: 0,
      status: 'DISABLED',
      description: '',
      remarks: '',
      isCurrentlyEffective: false,
      isGroupControlled: false,
      canMaintain: false,
      version: '',
      createdAt: '',
      updatedAt: '',
    }"
    :systems="[]"
    :resources-by-system="{}"
    :direct-resource-ids="[]"
    :state="state"
    :back="() => router.push({ name: 'iam-role-management' })"
    @retry="load"
  />
</template>
