<script setup lang="ts">
import { positiveEntityId } from '@shared/utils/entityId'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import { IAM_PERMISSION_GOVERNANCE_RESOURCES } from '@shared/constants/iamPermissions'

import SystemResourceCatalogPageView from '../components/SystemResourceCatalogPageView.vue'
import { useSystemResourceCatalog } from '../composables/useSystemResourceCatalog'
import type {
  PermissionResourceStatus,
  PermissionResourceType,
  ResourceCatalogQuery,
} from '../types/permissionGovernance'

const route = useRoute()
const router = useRouter()
const { hasPermission } = useEffectivePermissions()
const canCreate = computed(() =>
  hasPermission(IAM_PERMISSION_GOVERNANCE_RESOURCES.systemResources.create),
)
const canEdit = computed(() =>
  hasPermission(IAM_PERMISSION_GOVERNANCE_RESOURCES.systemResources.update),
)
const {
  apps,
  records,
  total,
  state,
  queryResources,
  loadResourceDetail,
  loadParents,
  submitResource,
  retry,
} = useSystemResourceCatalog({ canCreate: () => canCreate.value, canEdit: () => canEdit.value })

function scalar(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(scalar(value), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function resourceType(value: unknown): '' | PermissionResourceType {
  const candidate = scalar(value).toUpperCase()
  return ['MODULE', 'MENU', 'BUTTON', 'BUTTON_PAGE', 'FUNCTION'].includes(candidate)
    ? (candidate as PermissionResourceType)
    : ''
}

function resourceStatus(value: unknown): '' | PermissionResourceStatus {
  const candidate = scalar(value).toUpperCase()
  return candidate === 'ACTIVE' || candidate === 'DISABLED'
    ? (candidate as PermissionResourceStatus)
    : ''
}

const initialQuery: ResourceCatalogQuery = {
  keyword: scalar(route.query.keyword),
  appId: positiveEntityId(route.query.appId) ?? '',
  resourceType: resourceType(route.query.resourceType),
  status: resourceStatus(route.query.status),
  pageIndex: positiveInteger(route.query.pageIndex, 1),
  pageSize: positiveInteger(route.query.pageSize, 10),
}

async function submitQuery(query: ResourceCatalogQuery): Promise<void> {
  await router.replace({
    query: {
      ...route.query,
      keyword: query.keyword || undefined,
      appId: query.appId || undefined,
      resourceType: query.resourceType || undefined,
      status: query.status || undefined,
      pageIndex: query.pageIndex === 1 ? undefined : query.pageIndex,
      pageSize: query.pageSize === 10 ? undefined : query.pageSize,
    },
  })
  await queryResources(query)
}

onMounted(() => queryResources(initialQuery))
</script>

<template>
  <SystemResourceCatalogPageView
    :records="records"
    :apps="apps"
    :state="state"
    :total="total"
    :initial-query="initialQuery"
    :query-resources="submitQuery"
    :load-resource-detail="loadResourceDetail"
    :load-parents="loadParents"
    :submit-resource="submitResource"
    :can-create="canCreate"
    :can-edit="canEdit"
    @retry="retry"
  />
</template>
