<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  currentTenantId,
  foundationApi,
  mapTenant,
  mapUserQuery,
} from '@features/iam/foundation/public'
import { notification } from '@shared/services/notification'
import { mapAssignment, mapRole } from '../adapters/accessControlAdapter'
import { accessControlApi } from '../api/accessControlApi'
import { accessControlErrorMessage, positiveRouteId } from '../api/accessControlSession'
import RoleAssignmentPageView from '../components/RoleAssignmentPageView.vue'
import type {
  AccessControlPreviewState,
  AssignmentQueryValue,
  AssignmentRecord,
  MemberOption,
  RoleRecord,
  TenantOption,
} from '../types/accessControl'

const router = useRouter()
const route = useRoute()
const records = ref<AssignmentRecord[]>([])
const roles = ref<RoleRecord[]>([])
const tenants = ref<TenantOption[]>([])
const members = ref<MemberOption[]>([])
const total = ref(0)
const state = ref<AccessControlPreviewState>('loading')
let activeQuery: AssignmentQueryValue = {
  tenantId: positiveRouteId(route.query.tenantId),
  roleId: positiveRouteId(route.query.roleId),
  pageIndex: 1,
  pageSize: 10,
  keyword: '',
  status: '',
}

async function loadTenantOptions(tenantId: number) {
  const [memberResponse, roleResponse] = await Promise.all([
    foundationApi.queryUsers({ tenant_ids: [tenantId], page_index: 1, page_size: 1000 }),
    accessControlApi.queryRoles({
      tenant_id: tenantId,
      id: 0,
      role_type: '',
      page_index: 1,
      page_size: 1000,
      keyword: '',
      status: '',
    }),
  ])
  const mappedMembers = memberResponse.items
    .map((item) => mapUserQuery(item, { id: tenantId }))
    .filter((member) => member.id > 0 && member.tenantId === tenantId)
  const effectiveAdminCount = mappedMembers.filter(
    (item) => item.isTenantAdmin && item.effectiveness === 'EFFECTIVE',
  ).length
  members.value = mappedMembers.map((member) => ({
    id: member.id,
    code: member.memberCode,
    name: member.displayName,
    effective: member.effectiveness === 'EFFECTIVE',
    isTenantAdmin: member.isTenantAdmin,
    isLastTenantAdmin:
      member.isTenantAdmin && member.effectiveness === 'EFFECTIVE' && effectiveAdminCount <= 1,
    version: member.version,
  }))
  roles.value = roleResponse.items.map(mapRole)
}

async function queryAssignments(query = activeQuery) {
  state.value = 'loading'
  try {
    const tenantChanged = query.tenantId !== activeQuery.tenantId
    if (tenantChanged) await loadTenantOptions(query.tenantId)
    const resolvedRoleId =
      query.roleId && roles.value.some((role) => role.id === query.roleId)
        ? query.roleId
        : roles.value[0]?.id || 0
    const resolvedQuery = {
      ...query,
      roleId: resolvedRoleId,
    }
    activeQuery = resolvedQuery
    const response = await accessControlApi.queryAssignments({
      tenant_id: resolvedQuery.tenantId,
      role_id: resolvedQuery.roleId,
      page_index: resolvedQuery.pageIndex,
      page_size: resolvedQuery.pageSize,
      keyword: resolvedQuery.keyword.trim(),
      status: resolvedQuery.status,
    })
    records.value = response.items.map(mapAssignment)
    total.value = response.total
    state.value = records.value.length ? 'ready' : 'empty'
  } catch (error) {
    records.value = []
    state.value = 'retryable-error'
    notification.error(accessControlErrorMessage(error, '角色分配关系加载失败'))
  }
}

async function load() {
  state.value = 'loading'
  try {
    const tenantId = activeQuery.tenantId || currentTenantId()
    const tenantResponse = await foundationApi.queryTenants({ page_index: 1, page_size: 1000 })
    await loadTenantOptions(tenantId)
    tenants.value = tenantResponse.items.map(mapTenant).map((tenant) => ({
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
    }))
    activeQuery = {
      ...activeQuery,
      tenantId,
      roleId:
        activeQuery.roleId && roles.value.some((role) => role.id === activeQuery.roleId)
          ? activeQuery.roleId
          : roles.value[0]?.id || 0,
    }
    await queryAssignments(activeQuery)
  } catch (error) {
    state.value = 'retryable-error'
    notification.error(accessControlErrorMessage(error, '角色分配上下文加载失败'))
  }
}

async function submitAssign(member: MemberOption, roleIds: number[]) {
  try {
    await accessControlApi.assignRoles({
      tenant_user_id: member.id,
      member_version: member.version,
      role_ids: roleIds,
    })
    notification.success(`已分配 ${roleIds.length} 个角色`)
    await load()
  } catch (error) {
    notification.error(accessControlErrorMessage(error, '角色分配失败'))
    throw error
  }
}

async function submitRevoke(member: MemberOption, assignments: AssignmentRecord[]) {
  try {
    await accessControlApi.revokeRoles({
      tenant_user_id: member.id,
      member_version: member.version,
      role_ids: assignments.map((item) => item.roleId),
    })
    notification.success(`已撤销 ${assignments.length} 个角色`)
    await load()
  } catch (error) {
    notification.error(accessControlErrorMessage(error, '角色撤销失败'))
    throw error
  }
}

onMounted(load)
</script>

<template>
  <RoleAssignmentPageView
    :records="records"
    :roles="roles"
    :tenants="tenants"
    :members="members"
    :state="state"
    :total="total"
    :initial-role-id="positiveRouteId(route.query.roleId)"
    :query-assignments="queryAssignments"
    :submit-assign="submitAssign"
    :submit-revoke="submitRevoke"
    :navigate-roles="() => router.push({ name: 'iam-role-management' })"
    @retry="queryAssignments()"
  />
</template>
