<script setup lang="ts">
import type { EntityId } from '@shared/types/entityId'
import { positiveEntityId } from '@shared/utils/entityId'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { currentTenantId } from '@features/iam/foundation/public'
import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import { IAM_PERMISSION_GOVERNANCE_RESOURCES } from '@shared/constants/iamPermissions'
import { notification } from '@shared/services/notification'

import {
  mapPermissionGovernanceApps,
  mapPermissionResource,
  mapPermissionScheme,
  toPermissionSchemeTreeSaveRequest,
} from '../adapters/permissionGovernanceAdapter'
import { ApiError, createRequestId, permissionGovernanceApi } from '../api/permissionGovernanceApi'
import PermissionSchemeResourcesPageView from '../components/PermissionSchemeResourcesPageView.vue'
import {
  permissionGovernanceErrorMessage,
  isUnknownPermissionGovernanceMutation,
  reportPermissionGovernanceMutationError,
} from '../composables/permissionGovernanceFeedback'
import type {
  PermissionGovernanceApp,
  PermissionGovernancePreviewState,
  PermissionRecord,
  SystemResourceRecord,
} from '../types/permissionGovernance'

const route = useRoute()
const router = useRouter()
const { hasPermission } = useEffectivePermissions()
const apps = ref<PermissionGovernanceApp[]>([])
const resources = ref<SystemResourceRecord[]>([])
const state = ref<PermissionGovernancePreviewState>('loading')
const permission = ref<PermissionRecord>(emptyPermission())
const pendingSave = ref<{
  record: PermissionRecord
  frontendResourceId: EntityId
  functionResourceIds: EntityId[]
  requestId: string
}>()

const canSave = computed(() =>
  hasPermission(IAM_PERMISSION_GOVERNANCE_RESOURCES.permissions.saveConfiguration),
)

function positiveId(value: unknown): string {
  return positiveEntityId(Array.isArray(value) ? value[0] : value) ?? ''
}

function emptyPermission(): PermissionRecord {
  return {
    id: 0,
    tenantId: 0,
    appId: 0,
    appCode: '',
    appName: '',
    permissionCode: '',
    permissionName: '权限配置',
    frontendResourceId: 0,
    functionResourceIds: [],
    description: '',
    status: 'DISABLED',
    sortOrder: 0,
    canMaintain: false,
    version: '',
    createdAt: '',
    createdBy: '',
    updatedAt: '',
    updatedBy: '',
  }
}

async function queryAllResources(appId: EntityId) {
  const result = []
  let pageIndex = 1
  while (true) {
    const response = await permissionGovernanceApi.queryPermissionResources({
      app_id: appId,
      page_index: pageIndex,
      page_size: 200,
    })
    result.push(...response.items)
    if (result.length >= response.total || response.items.length === 0) return result
    pageIndex += 1
  }
}

async function load() {
  pendingSave.value = undefined
  state.value = 'loading'
  const permissionId = positiveId(route.query.permissionId)
  const tenantId = positiveId(route.query.tenantId) || currentTenantId()
  if (!permissionId) {
    state.value = 'retryable-error'
    notification.error('缺少有效的 Permission 参数')
    return
  }

  try {
    const [systems, detail] = await Promise.all([
      permissionGovernanceApi.querySystems(),
      permissionGovernanceApi.getPermissionScheme({ tenant_id: tenantId, id: permissionId }),
    ])
    const catalog = await queryAllResources(detail.app_id)
    apps.value = mapPermissionGovernanceApps(systems)
    resources.value = catalog.map((item) => mapPermissionResource(item, apps.value))
    permission.value = mapPermissionScheme(detail, apps.value, { canMaintain: canSave.value })
    state.value = resources.value.length
      ? permission.value.frontendResourceId
        ? 'ready'
        : 'empty-parent'
      : 'empty'
  } catch (error) {
    state.value = 'retryable-error'
    notification.error(permissionGovernanceErrorMessage(error, '权限功能配置加载失败'))
  }
}

async function saveComposition(
  record: PermissionRecord,
  frontendResourceId: EntityId,
  functionResourceIds: EntityId[],
) {
  if (!canSave.value) throw new Error('当前账号无权保存权限配置')
  pendingSave.value = {
    record,
    frontendResourceId,
    functionResourceIds: [...functionResourceIds],
    requestId: createRequestId(),
  }
  await executePendingSave()
}

async function executePendingSave() {
  const pending = pendingSave.value
  if (!pending) return
  try {
    const response = await permissionGovernanceApi.savePermissionSchemeTree(
      toPermissionSchemeTreeSaveRequest(
        pending.record,
        pending.frontendResourceId,
        pending.functionResourceIds,
        resources.value,
        pending.requestId,
      ),
    )
    permission.value = mapPermissionScheme(response, apps.value, { canMaintain: canSave.value })
    pendingSave.value = undefined
    state.value = 'ready'
    notification.success('权限配置已保存')
  } catch (error) {
    if (isUnknownPermissionGovernanceMutation(error)) state.value = 'unknown-result'
    else {
      pendingSave.value = undefined
      if (error instanceof ApiError && error.status === 409) state.value = 'version-conflict'
    }
    reportPermissionGovernanceMutationError(error, '保存权限配置', {
      canRetryWithSameRequestId: true,
    })
    throw error
  }
}

async function retryPendingSave() {
  if (state.value !== 'unknown-result' || !pendingSave.value) return
  try {
    await executePendingSave()
  } catch {
    // executePendingSave 已保留相同 request_id 并呈现准确恢复状态。
  }
}

onMounted(load)
</script>

<template>
  <PermissionSchemeResourcesPageView
    :apps="apps"
    :resources="resources"
    :permission="permission"
    :state="state"
    :back="() => router.push({ name: 'iam-permission-management' })"
    :save-composition="saveComposition"
    @retry="load"
    @retry-save="retryPendingSave"
  />
</template>
