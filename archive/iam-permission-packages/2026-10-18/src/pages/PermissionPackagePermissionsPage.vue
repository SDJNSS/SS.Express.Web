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
  buildPermissionTreeByApp,
  mapPermissionGovernanceApps,
  mapPermissionPackage,
  mapPermissionScheme,
  toPermissionPackagePermissionsSaveRequest,
} from '../adapters/permissionGovernanceAdapter'
import { ApiError, createRequestId, permissionGovernanceApi } from '../api/permissionGovernanceApi'
import PermissionPackagePermissionsPageView from '../components/PermissionPackagePermissionsPageView.vue'
import {
  permissionGovernanceErrorMessage,
  isUnknownPermissionGovernanceMutation,
  reportPermissionGovernanceMutationError,
} from '../composables/permissionGovernanceFeedback'
import type {
  PackagePermissionTreeNode,
  PermissionGovernanceApp,
  PermissionGovernancePreviewState,
  PermissionPackageRecord,
  PermissionRecord,
} from '../types/permissionGovernance'

const route = useRoute()
const router = useRouter()
const { hasPermission } = useEffectivePermissions()
const apps = ref<PermissionGovernanceApp[]>([])
const permissions = ref<PermissionRecord[]>([])
const packageRecord = ref<PermissionPackageRecord>(emptyPackage())
const permissionTreeByApp = ref<Record<string, PackagePermissionTreeNode[]>>({})
const state = ref<PermissionGovernancePreviewState>('loading')
const pendingSave = ref<{
  record: PermissionPackageRecord
  permissionIds: EntityId[]
  requestId: string
}>()
const canSave = computed(() =>
  hasPermission(IAM_PERMISSION_GOVERNANCE_RESOURCES.permissionPackages.savePermissions),
)

function positiveId(value: unknown): string {
  return positiveEntityId(Array.isArray(value) ? value[0] : value) ?? ''
}

function emptyPackage(): PermissionPackageRecord {
  return {
    id: 0,
    tenantId: 0,
    appId: 0,
    appCode: '',
    appName: '',
    packageCode: '',
    packageName: '权限包',
    description: '',
    sortOrder: 0,
    status: 'DISABLED',
    permissionIds: [],
    boundRoles: [],
    canMaintain: false,
    version: '',
    createdAt: '',
    createdBy: '',
    updatedAt: '',
    updatedBy: '',
  }
}

async function queryAllPermissions(tenantId: EntityId, appId: EntityId) {
  const result = []
  let pageIndex = 1
  while (true) {
    const response = await permissionGovernanceApi.queryPermissionSchemes({
      tenant_id: tenantId,
      app_id: appId,
      include_details: true,
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
  const packageId = positiveId(route.query.packageId)
  const tenantId = positiveId(route.query.tenantId) || currentTenantId()
  if (!packageId) {
    state.value = 'retryable-error'
    notification.error('缺少有效的权限包参数')
    return
  }

  try {
    const [systems, detail] = await Promise.all([
      permissionGovernanceApi.querySystems(),
      permissionGovernanceApi.getPermissionPackage({ tenant_id: tenantId, id: packageId }),
    ])
    const candidates = await queryAllPermissions(tenantId, detail.app_id)
    apps.value = mapPermissionGovernanceApps(systems)
    permissions.value = candidates.map((item) => mapPermissionScheme(item, apps.value))
    packageRecord.value = mapPermissionPackage(detail, apps.value, {
      canMaintain: canSave.value,
    })
    permissionTreeByApp.value = buildPermissionTreeByApp(candidates, apps.value, {
      selectedPermissionIds: new Set(packageRecord.value.permissionIds),
    })
    state.value = candidates.length ? 'ready' : 'empty'
  } catch (error) {
    state.value = 'retryable-error'
    notification.error(permissionGovernanceErrorMessage(error, '权限包权限配置加载失败'))
  }
}

async function savePermissions(record: PermissionPackageRecord, permissionIds: EntityId[]) {
  if (!canSave.value) throw new Error('当前账号无权保存权限包配置')
  pendingSave.value = {
    record,
    permissionIds: [...permissionIds],
    requestId: createRequestId(),
  }
  await executePendingSave()
}

async function executePendingSave() {
  const pending = pendingSave.value
  if (!pending) return
  try {
    const response = await permissionGovernanceApi.savePermissionPackagePermissions(
      toPermissionPackagePermissionsSaveRequest(
        pending.record,
        pending.permissionIds,
        permissions.value,
        pending.requestId,
      ),
    )
    packageRecord.value = mapPermissionPackage(response, apps.value, {
      canMaintain: canSave.value,
    })
    pendingSave.value = undefined
    state.value = 'ready'
    notification.success('权限包 Permission 配置已保存')
  } catch (error) {
    if (isUnknownPermissionGovernanceMutation(error)) state.value = 'unknown-result'
    else {
      pendingSave.value = undefined
      if (error instanceof ApiError && error.status === 409) state.value = 'version-conflict'
    }
    reportPermissionGovernanceMutationError(error, '保存权限包配置', {
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
  <PermissionPackagePermissionsPageView
    :permission-tree-by-app="permissionTreeByApp"
    :package-record="packageRecord"
    :state="state"
    :back="() => router.push({ name: 'iam-permission-package-management' })"
    :save-permissions="savePermissions"
    @retry="load"
    @retry-save="retryPendingSave"
  />
</template>
