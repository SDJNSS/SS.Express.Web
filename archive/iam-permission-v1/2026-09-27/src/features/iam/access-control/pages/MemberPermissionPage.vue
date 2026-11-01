<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { currentTenantId, foundationApi } from '@features/iam/foundation/public'
import { getCurrentApps } from '@features/iam/shell-context/public'
import { notification } from '@shared/services/notification'
import {
  mapEffectiveFunctionPermissionRecords,
  mapAssignment,
  mapFunctionPermissionSubject,
  mapPermissionTree,
  mapRole,
  mapSystem,
} from '../adapters/accessControlAdapter'
import { accessControlApi } from '../api/accessControlApi'
import { accessControlErrorMessage, positiveRouteId } from '../api/accessControlSession'
import MemberPermissionPageView from '../components/MemberPermissionPageView.vue'
import type {
  AccessControlPreviewState,
  AssignmentRecord,
  FunctionPermissionRole,
  FunctionPermissionSubject,
  MemberFunctionPermissionRecord,
  MemberPermissionTenantContext,
  ResourceNode,
  RoleRecord,
  SystemRecord,
} from '../types/accessControl'

const route = useRoute()
const router = useRouter()
const subject = ref<FunctionPermissionSubject>()
const resolvedUserId = ref(0)
const memberships = ref<MemberPermissionTenantContext[]>([])
const currentMembershipTenantId = ref(0)
const assignments = ref<AssignmentRecord[]>([])
const availableRoles = ref<RoleRecord[]>([])
const functionRoles = ref<FunctionPermissionRole[]>([])
const functions = ref<MemberFunctionPermissionRecord[]>([])
const functionSystems = ref<SystemRecord[]>([])
const functionResourcesBySystem = ref<Record<number, ResourceNode[]>>({})
const functionResourceIds = ref<number[]>([])
const state = ref<AccessControlPreviewState>('loading')
const initialTab = computed<'roles' | 'functions'>(() => {
  const tab = Array.isArray(route.query.tab) ? route.query.tab[0] : route.query.tab
  return tab === 'functions' ? tab : 'roles'
})

function mapMembership(
  membership: Awaited<ReturnType<typeof foundationApi.queryUserTenants>>['memberships'][number],
): MemberPermissionTenantContext {
  return {
    tenantId: membership.tenant_id,
    tenantCode: membership.tenant_code,
    tenantName: membership.tenant_name,
    tenantUserId: membership.tenant_user_id,
    tenantUserCode: membership.tenant_user_code,
    displayName: membership.display_name,
    isTenantAdmin: membership.is_tenant_admin,
    isCurrentlyEffective:
      membership.is_currently_effective && membership.membership_is_currently_effective !== false,
    memberVersion: membership.member_version,
  }
}

async function resolveUserId(tenantId: number): Promise<number> {
  const userId = positiveRouteId(route.query.userId)
  if (userId) return userId

  const legacyTenantUserId = positiveRouteId(route.query.tenantUserId)
  if (!tenantId || !legacyTenantUserId) return 0
  const response = await foundationApi.queryUsers({
    tenant_ids: [tenantId],
    page_index: 1,
    page_size: 1000,
  })
  return response.items.find((item) => item.tenant_user_id === legacyTenantUserId)?.user_id ?? 0
}

async function replaceCanonicalQuery(userId: number, tenantId: number) {
  if (
    positiveRouteId(route.query.userId) === userId &&
    positiveRouteId(route.query.tenantId) === tenantId &&
    !positiveRouteId(route.query.tenantUserId)
  )
    return

  const query: Record<string, string | string[] | null | undefined> = {
    ...route.query,
    userId: String(userId),
    tenantId: String(tenantId),
  }
  delete query.tenantUserId
  await router.replace({ name: 'iam-member-permissions', query })
}

function resetLoadedData() {
  subject.value = undefined
  memberships.value = []
  currentMembershipTenantId.value = 0
  assignments.value = []
  availableRoles.value = []
  functions.value = []
  functionRoles.value = []
  functionSystems.value = []
  functionResourcesBySystem.value = {}
  functionResourceIds.value = []
}

async function load() {
  const requestedTenantId = positiveRouteId(route.query.tenantId) || currentTenantId()
  state.value = 'loading'
  resetLoadedData()
  try {
    const userId = await resolveUserId(requestedTenantId)
    if (!userId) throw new Error('缺少有效的全局用户参数')
    resolvedUserId.value = userId

    const [membershipResponse, appResponse] = await Promise.all([
      foundationApi.queryUserTenants(userId),
      getCurrentApps(),
    ])
    memberships.value = membershipResponse.memberships.map(mapMembership)
    const selectedMembership =
      memberships.value.find((item) => item.tenantId === requestedTenantId) ??
      memberships.value.find((item) => item.isCurrentlyEffective) ??
      memberships.value[0]
    if (!selectedMembership) throw new Error('该用户没有可查看的 Tenant 成员关系')
    currentMembershipTenantId.value = selectedMembership.tenantId

    const [roleResponse, roleAssignmentResponse, functionResponse] = await Promise.all([
      accessControlApi.queryRoles({
        tenant_id: selectedMembership.tenantId,
        id: 0,
        role_type: '',
        page_index: 1,
        page_size: 1000,
        keyword: '',
        status: '',
      }),
      accessControlApi.queryAssignments({
        tenant_id: selectedMembership.tenantId,
        tenant_user_id: selectedMembership.tenantUserId,
        page_index: 1,
        page_size: 200,
        keyword: '',
        status: '',
      }),
      accessControlApi.queryMemberFunctionPermissions(selectedMembership.tenantUserId),
    ])

    availableRoles.value = roleResponse.items.map(mapRole)
    assignments.value = roleAssignmentResponse.items.map(mapAssignment)
    subject.value = mapFunctionPermissionSubject(functionResponse.subject)
    functionRoles.value = functionResponse.roles.map((role) => ({
      id: role.id,
      tenantId: role.tenant_id,
      tenantCode: role.tenant_code,
      roleCode: role.role_code,
      roleName: role.role_name,
      roleType: role.role_type.toUpperCase() === 'SYSTEM' ? 'SYSTEM' : 'CUSTOM',
    }))
    const permissionTree = mapPermissionTree(functionResponse.resource_tree ?? [])
    const treeSystemIds = new Set(permissionTree.map((resource) => resource.appId))
    const systemsById = new Map(
      appResponse.apps.map(mapSystem).map((system) => [system.id, system] as const),
    )
    functionSystems.value = [...treeSystemIds].map(
      (appId): SystemRecord =>
        systemsById.get(appId) ?? {
          id: appId,
          appCode: `APP-${appId}`,
          appName: `应用 ${appId}`,
          description: '',
          icon: 'mdi:cube-outline',
          routePrefix: '',
          status: 'ACTIVE',
          remarks: '',
          canMaintain: false,
          version: '',
          createdAt: '',
          createdBy: '',
          updatedAt: '',
          updatedBy: '',
        },
    )
    functionResourcesBySystem.value = Object.fromEntries(
      functionSystems.value.map((system) => [
        system.id,
        permissionTree.filter((resource) => resource.appId === system.id),
      ]),
    )
    functionResourceIds.value = [...new Set(functionResponse.effective_resource_ids ?? [])]
    const visibleSystemsById = new Map(functionSystems.value.map((system) => [system.id, system]))
    functions.value = mapEffectiveFunctionPermissionRecords(
      permissionTree,
      new Set(functionResourceIds.value),
      visibleSystemsById,
    )
    await replaceCanonicalQuery(userId, selectedMembership.tenantId)
    state.value = 'ready'
  } catch (error) {
    resetLoadedData()
    state.value = 'retryable-error'
    notification.error(accessControlErrorMessage(error, '用户角色与权限加载失败'))
  }
}

async function changeTenant(tenantId: number) {
  if (!resolvedUserId.value || tenantId === currentMembershipTenantId.value) return
  await replaceCanonicalQuery(resolvedUserId.value, tenantId)
  await load()
}

async function submitAssign(roleIds: number[]) {
  const membership = memberships.value.find(
    (item) => item.tenantId === currentMembershipTenantId.value,
  )
  if (!membership) throw new Error('当前 Tenant 成员上下文已失效')
  try {
    await accessControlApi.assignRoles({
      tenant_user_id: membership.tenantUserId,
      member_version: membership.memberVersion,
      role_ids: roleIds,
    })
    notification.success(`已分配 ${roleIds.length} 个角色`)
    await load()
  } catch (error) {
    notification.error(accessControlErrorMessage(error, '用户角色分配失败'))
    throw error
  }
}

async function submitRevoke(record: AssignmentRecord) {
  const membership = memberships.value.find(
    (item) => item.tenantId === currentMembershipTenantId.value,
  )
  if (!membership) throw new Error('当前 Tenant 成员上下文已失效')
  try {
    await accessControlApi.revokeRoles({
      tenant_user_id: membership.tenantUserId,
      member_version: membership.memberVersion,
      role_ids: [record.roleId],
    })
    notification.success(`已移除角色“${record.roleName}”`)
    await load()
  } catch (error) {
    notification.error(accessControlErrorMessage(error, '用户角色移除失败'))
    throw error
  }
}

void load()
</script>

<template>
  <MemberPermissionPageView
    :subject="subject"
    :memberships="memberships"
    :current-tenant-id="currentMembershipTenantId"
    :assignments="assignments"
    :available-roles="availableRoles"
    :function-roles="functionRoles"
    :functions="functions"
    :function-systems="functionSystems"
    :function-resources-by-system="functionResourcesBySystem"
    :function-resource-ids="functionResourceIds"
    :state="state"
    :initial-tab="initialTab"
    :back="() => router.push({ name: 'iam-membership-management' })"
    :change-tenant="changeTenant"
    :submit-assign="submitAssign"
    :submit-revoke="submitRevoke"
    @retry="load"
  />
</template>
