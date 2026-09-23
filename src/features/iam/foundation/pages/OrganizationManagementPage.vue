<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { notification } from '@shared/services/notification'
import { foundationApi } from '../api/foundationApi'
import { queryOrganizationLeaderCandidates } from '../api/organizationLeaderApi'
import type { OrganizationLeaderLoader } from '../types/organizationLeader'
import { mapOrganization } from '../adapters/foundationAdapter'
import OrganizationManagementPageView from '../components/OrganizationManagementPageView.vue'
import {
  currentTenantId,
  foundationErrorMessage,
  getFoundationSession,
} from '../api/foundationSession'
import type {
  FoundationPreviewState,
  OrganizationFormValue,
  OrganizationNode,
} from '../types/foundation'

const organizations = ref<OrganizationNode[]>([])
const state = ref<FoundationPreviewState>('loading')
const tenant = ref({ name: '', code: '', timezone: '' })
const tenantId = ref<number>()

const loadLeaderOptions: OrganizationLeaderLoader = async (query) => {
  const session = getFoundationSession()
  const contextTenantId = currentTenantId()
  const response = await queryOrganizationLeaderCandidates(
    {
      tenant_id: contextTenantId,
      keyword: query.keyword,
      page_index: query.pageIndex,
      page_size: query.pageSize,
    },
    query.signal,
  )
  const current = getFoundationSession()
  if (
    current?.currentTenantId !== contextTenantId ||
    current?.accessToken !== session?.accessToken
  ) {
    throw new Error('租户或登录上下文已变化，请重新加载')
  }
  return {
    items: response.items.map((candidate) => ({
      id: candidate.tenant_user_id,
      label: candidate.real_name || candidate.display_name || candidate.user_name,
      description: candidate.user_name,
    })),
    total: response.total,
  }
}

async function load() {
  state.value = 'loading'
  try {
    const session = getFoundationSession()
    tenantId.value = currentTenantId()
    tenant.value = {
      name: session?.currentTenantName ?? '',
      code: session?.currentTenantCode ?? '',
      timezone:
        session?.availableTenants?.find((item) => item.tenantId === session.currentTenantId)
          ?.timezone ?? '',
    }
    const response = await foundationApi.queryOrganizations({
      tenant_id: currentTenantId(),
      query_type: 'tree',
      page_index: 1,
      page_size: 1000,
    })
    organizations.value = response.items.map(mapOrganization)
    state.value = organizations.value.length ? 'ready' : 'empty'
  } catch (error) {
    state.value = 'retryable-error'
    notification.error(foundationErrorMessage(error, '组织树加载失败'))
  }
}

async function save(
  mode: 'create' | 'edit',
  value: OrganizationFormValue,
  record: OrganizationNode,
) {
  try {
    const common = {
      tenant_id: currentTenantId(),
      ...(value.parentId ? { parent_id: value.parentId } : {}),
      org_name: value.name.trim(),
      org_type: value.type,
      // IAM uses 0 to explicitly clear the optional leader relationship.
      leader_tenant_user_id: value.leaderTenantUserId ?? 0,
      sort_order: value.sortOrder,
      remarks: value.remarks.trim(),
    }
    if (mode === 'create') await foundationApi.createOrganization(common)
    else {
      await foundationApi.updateOrganization({
        ...common,
        id: record.id,
        version: record.version ?? '',
      })
    }
    notification.success(mode === 'create' ? '组织已创建' : '组织已保存')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, '组织保存失败'))
    throw error
  }
}

async function move(record: OrganizationNode, newParentId: number | undefined) {
  try {
    await foundationApi.moveOrganization({
      id: record.id,
      version: record.version ?? '',
      ...(newParentId ? { new_parent_id: newParentId } : {}),
    })
    notification.success('组织层级已调整')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, '组织移动失败'))
    throw error
  }
}

async function changeStatus(record: OrganizationNode, targetStatus: 'ACTIVE' | 'DISABLED') {
  try {
    await foundationApi.changeOrganizationStatus({
      id: record.id,
      version: record.version ?? '',
      target_status: targetStatus,
    })
    notification.success(targetStatus === 'ACTIVE' ? '组织已启用' : '组织已停用')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, '组织状态更新失败'))
    throw error
  }
}

onMounted(load)
</script>

<template>
  <OrganizationManagementPageView
    :organizations="organizations"
    :state="state"
    :tenant="tenant"
    :tenant-id="tenantId"
    :load-leader-options="loadLeaderOptions"
    :save="save"
    :move="move"
    :change-status="changeStatus"
    @retry="load"
  />
</template>
