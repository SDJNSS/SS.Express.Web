<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { notification } from '@shared/services/notification'
import { foundationApi, mapTenant } from '@features/iam/foundation/public'
import { mapRole } from '../adapters/accessControlAdapter'
import { accessControlApi } from '../api/accessControlApi'
import { accessControlErrorMessage } from '../api/accessControlSession'
import RoleManagementPageView from '../components/RoleManagementPageView.vue'
import type {
  AccessControlPreviewState,
  RoleFormValue,
  RoleQueryValue,
  RoleRecord,
  TenantOption,
} from '../types/accessControl'

const router = useRouter()
const route = useRoute()
const workspace = computed(() => {
  const value = Array.isArray(route.query.view) ? route.query.view[0] : route.query.view
  return ['function-permissions', 'data-permissions', 'assignments'].includes(value ?? '')
    ? value
    : ''
})
const records = ref<RoleRecord[]>([])
const tenants = ref<TenantOption[]>([])
const total = ref(0)
const state = ref<AccessControlPreviewState>('loading')
let activeQuery: RoleQueryValue = {
  tenantId: 0,
  roleId: 0,
  roleType: '',
  pageIndex: 1,
  pageSize: 10,
  keyword: '',
  status: '',
}

async function queryRoles(query = activeQuery) {
  activeQuery = { ...query }
  state.value = 'loading'
  try {
    const response = await accessControlApi.queryRoles({
      tenant_id: query.tenantId,
      id: query.roleId,
      role_type: query.roleType,
      page_index: query.pageIndex,
      page_size: query.pageSize,
      keyword: query.keyword.trim(),
      status: query.status,
    })
    records.value = response.items.map(mapRole)
    total.value = response.total
    state.value = records.value.length ? 'ready' : 'empty'
  } catch (error) {
    records.value = []
    state.value = 'retryable-error'
    notification.error(accessControlErrorMessage(error, '角色列表加载失败'))
  }
}

async function load() {
  state.value = 'loading'
  try {
    const response = await foundationApi.queryTenants({ page_index: 1, page_size: 1000 })
    tenants.value = response.items.map(mapTenant).map((tenant) => ({
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
    }))
    activeQuery.tenantId = activeQuery.tenantId || tenants.value[0]?.id || 0
    await queryRoles(activeQuery)
  } catch (error) {
    state.value = 'retryable-error'
    notification.error(accessControlErrorMessage(error, '角色上下文加载失败'))
  }
}

async function submitRole(value: RoleFormValue, mode: 'create' | 'edit', record?: RoleRecord) {
  try {
    if (mode === 'create') {
      await accessControlApi.createRole({
        tenant_id: value.tenantId,
        role_name: value.roleName.trim(),
        description: value.description.trim(),
        remarks: value.remarks.trim(),
        sort_order: value.sortOrder,
      })
      notification.success('角色已创建')
    } else if (record) {
      await accessControlApi.updateRole({
        id: record.id,
        version: record.version,
        tenant_id: value.tenantId,
        role_type: value.roleType,
        status: value.status,
        role_name: value.roleName.trim(),
        description: value.description.trim(),
        remarks: value.remarks.trim(),
        sort_order: value.sortOrder,
      })
      notification.success('角色已保存')
    }
    await queryRoles()
  } catch (error) {
    notification.error(
      accessControlErrorMessage(error, mode === 'create' ? '角色创建失败' : '角色保存失败'),
    )
    throw error
  }
}

async function submitStatus(record: RoleRecord, targetStatus: 'ACTIVE' | 'DISABLED') {
  try {
    await accessControlApi.changeRoleStatus({
      tenant_id: record.tenantId,
      id: record.id,
      version: record.version,
      target_status: targetStatus,
    })
    notification.success(targetStatus === 'ACTIVE' ? '角色已启用' : '角色已停用')
    await queryRoles()
  } catch (error) {
    notification.error(accessControlErrorMessage(error, '角色状态更新失败'))
    throw error
  }
}

function navigate(target: 'function' | 'assignments', role: RoleRecord) {
  const routeNames = {
    function: 'iam-role-function-permissions',
    assignments: 'iam-role-assignments',
  } as const
  void router.push({
    name: routeNames[target],
    query: { roleId: role.id, tenantId: role.tenantId },
  })
}

let listLoaded = false
watch(
  workspace,
  (value) => {
    if (value) {
      const routeNames = {
        'function-permissions': 'iam-role-function-permissions',
        'data-permissions': 'iam-role-data-permissions',
        assignments: 'iam-role-assignments',
      } as const
      void router.replace({
        name: routeNames[value as keyof typeof routeNames],
        query: { roleId: route.query.roleId, tenantId: route.query.tenantId },
      })
    } else if (!listLoaded) {
      listLoaded = true
      void load()
    }
  },
  { immediate: true },
)
</script>

<template>
  <RoleManagementPageView
    v-if="!workspace"
    :records="records"
    :tenants="tenants"
    :state="state"
    :total="total"
    :query-roles="queryRoles"
    :submit-role="submitRole"
    :submit-status="submitStatus"
    :navigate="navigate"
    @retry="queryRoles()"
  />
</template>
