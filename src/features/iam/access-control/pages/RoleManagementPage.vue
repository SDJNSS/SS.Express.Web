<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { notification } from '@shared/services/notification'
import { IAM_PERMISSION_GOVERNANCE_RESOURCES } from '@shared/constants/iamPermissions'
import { currentTenantOption, requireCurrentTenantId } from '../api/accessControlSession'
import { getCurrentPageResourcesCached } from '@features/iam/shell-context/public'
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
  return ['function-permissions', 'assignments'].includes(value ?? '') ? value : ''
})
const records = ref<RoleRecord[]>([])
const tenants = ref<TenantOption[]>([])
const total = ref(0)
const state = ref<AccessControlPreviewState>('loading')
const canAccessAuthorization = ref(false)
let activeQuery: RoleQueryValue = {
  tenantId: requireCurrentTenantId(),
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
    records.value = response.items.map(mapRole).filter((role) => role.tenantId === query.tenantId)
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
    tenants.value = [currentTenantOption()]
    requireCurrentTenantId(activeQuery.tenantId)
    await queryRoles(activeQuery)
  } catch (error) {
    state.value = 'retryable-error'
    notification.error(accessControlErrorMessage(error, '角色上下文加载失败'))
  }
}

async function loadAuthorizationEntryAccess() {
  const resourceCode = IAM_PERMISSION_GOVERNANCE_RESOURCES.roles.authorization
  try {
    const response = await getCurrentPageResourcesCached(resourceCode)
    canAccessAuthorization.value =
      response.can_access && response.page_resource_code.trim() === resourceCode
  } catch {
    canAccessAuthorization.value = false
    notification.warning('角色授权入口暂时无法校验，请刷新页面后重试')
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
    function: 'iam-role-authorization',
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
        'function-permissions': 'iam-role-authorization',
        assignments: 'iam-role-assignments',
      } as const
      void router.replace({
        name: routeNames[value as keyof typeof routeNames],
        query: { roleId: route.query.roleId, tenantId: route.query.tenantId },
      })
    } else if (!listLoaded) {
      listLoaded = true
      void loadAuthorizationEntryAccess()
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
    :can-access-authorization="canAccessAuthorization"
    :query-roles="queryRoles"
    :submit-role="submitRole"
    :submit-status="submitStatus"
    :navigate="navigate"
    @retry="queryRoles()"
  />
</template>
