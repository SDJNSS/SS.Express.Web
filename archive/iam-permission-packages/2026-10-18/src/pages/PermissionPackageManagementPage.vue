<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import { IAM_PERMISSION_GOVERNANCE_RESOURCES } from '@shared/constants/iamPermissions'
import { currentTenantId } from '@features/iam/foundation/public'
import { positiveEntityId } from '@shared/utils/entityId'

import PermissionPackageManagementPageView from '../components/PermissionPackageManagementPageView.vue'
import { usePermissionPackageManagement } from '../composables/usePermissionPackageManagement'
import type {
  PermissionPackageQuery,
  PermissionPackageRecord,
  PermissionPackageStatus,
} from '../types/permissionGovernance'

const route = useRoute()
const router = useRouter()
const { hasPermission } = useEffectivePermissions()
const canCreate = computed(() =>
  hasPermission(IAM_PERMISSION_GOVERNANCE_RESOURCES.permissionPackages.create),
)
const canEdit = computed(() =>
  hasPermission(IAM_PERMISSION_GOVERNANCE_RESOURCES.permissionPackages.update),
)
const canConfigure = computed(() =>
  hasPermission(IAM_PERMISSION_GOVERNANCE_RESOURCES.permissionPackages.configure),
)
const { apps, packages, total, state, queryPackages, loadPackageDetail, submitPackage, retry } =
  usePermissionPackageManagement({
    canMaintain: () => canEdit.value || canConfigure.value,
  })

function scalar(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(scalar(value), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function packageStatus(value: unknown): '' | PermissionPackageStatus {
  const candidate = scalar(value).toUpperCase()
  return candidate === 'ACTIVE' || candidate === 'DISABLED'
    ? (candidate as PermissionPackageStatus)
    : ''
}

const initialQuery: PermissionPackageQuery = {
  packageName: scalar(route.query.packageName),
  appId: positiveEntityId(route.query.appId) ?? '',
  status: packageStatus(route.query.status),
  pageIndex: positiveInteger(route.query.pageIndex, 1),
  pageSize: positiveInteger(route.query.pageSize, 10),
}

async function submitQuery(query: PermissionPackageQuery): Promise<void> {
  await router.replace({
    query: {
      ...route.query,
      packageName: query.packageName || undefined,
      appId: query.appId || undefined,
      status: query.status || undefined,
      pageIndex: query.pageIndex === 1 ? undefined : query.pageIndex,
      pageSize: query.pageSize === 10 ? undefined : query.pageSize,
    },
  })
  await queryPackages(query)
}

function openPermissions(record: PermissionPackageRecord): void {
  void router.push({
    name: 'iam-permission-package-permissions',
    query: {
      packageId: record.id,
      tenantId: record.tenantId ?? currentTenantId(),
    },
  })
}

onMounted(() => queryPackages(initialQuery))
</script>

<template>
  <PermissionPackageManagementPageView
    :apps="apps"
    :packages="packages"
    :state="state"
    :total="total"
    :initial-query="initialQuery"
    :can-create="canCreate"
    :can-edit="canEdit"
    :can-configure="canConfigure"
    :query-packages="submitQuery"
    :load-package-detail="loadPackageDetail"
    :submit-package="submitPackage"
    :open-permissions="openPermissions"
    @retry="retry"
  />
</template>
