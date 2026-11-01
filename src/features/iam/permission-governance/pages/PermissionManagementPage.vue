<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import { IAM_PERMISSION_GOVERNANCE_RESOURCES } from '@shared/constants/iamPermissions'
import { currentTenantId } from '@features/iam/foundation/public'

import PermissionSchemeManagementPageView from '../components/PermissionSchemeManagementPageView.vue'
import { usePermissionManagement } from '../composables/usePermissionManagement'
import type { PermissionQuery, PermissionRecord } from '../types/permissionGovernance'

const route = useRoute()
const router = useRouter()
const { hasPermission } = useEffectivePermissions()
const canCreate = computed(() =>
  hasPermission(IAM_PERMISSION_GOVERNANCE_RESOURCES.permissions.create),
)
const canCopy = computed(() => hasPermission(IAM_PERMISSION_GOVERNANCE_RESOURCES.permissions.copy))
const canEdit = computed(() =>
  hasPermission(IAM_PERMISSION_GOVERNANCE_RESOURCES.permissions.update),
)
const canConfigure = computed(() =>
  hasPermission(IAM_PERMISSION_GOVERNANCE_RESOURCES.permissions.configure),
)
const {
  apps,
  permissions,
  resources,
  total,
  state,
  queryPermissions,
  loadPermissionDetail,
  loadParentPermissions,
  submitPermission,
  retry,
} = usePermissionManagement({ canMaintain: () => canConfigure.value, canEdit: () => canEdit.value })

function scalar(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(scalar(value), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const initialQuery: PermissionQuery = {
  permissionName: scalar(route.query.permissionName),
  pageIndex: positiveInteger(route.query.pageIndex, 1),
  pageSize: positiveInteger(route.query.pageSize, 10),
}

async function submitQuery(query: PermissionQuery): Promise<void> {
  await router.replace({
    query: {
      ...route.query,
      permissionName: query.permissionName || undefined,
      pageIndex: query.pageIndex === 1 ? undefined : query.pageIndex,
      pageSize: query.pageSize === 10 ? undefined : query.pageSize,
    },
  })
  await queryPermissions(query)
}

function openConfiguration(permission: PermissionRecord): void {
  void router.push({
    name: 'iam-permission-configuration',
    query: {
      permissionId: permission.id,
      tenantId: permission.tenantId ?? currentTenantId(),
    },
  })
}

onMounted(() => queryPermissions(initialQuery))
</script>

<template>
  <PermissionSchemeManagementPageView
    :permissions="permissions"
    :apps="apps"
    :resources="resources"
    :state="state"
    :total="total"
    :initial-query="initialQuery"
    :can-create="canCreate"
    :can-copy="canCopy"
    :can-edit="canEdit"
    :can-configure="canConfigure"
    :query-permissions="submitQuery"
    :load-permission-detail="loadPermissionDetail"
    :load-parent-permissions="loadParentPermissions"
    :submit-permission="submitPermission"
    :open-configuration="openConfiguration"
    @retry="retry"
  />
</template>
