<script setup lang="ts">
import { computed, ref } from 'vue'

import RoleAssignmentPageView from '../components/RoleAssignmentPageView.vue'
import RoleDataPermissionPageView from '../components/RoleDataPermissionPageView.vue'
import RoleFunctionPermissionPageView from '../components/RoleFunctionPermissionPageView.vue'
import RoleManagementPageView from '../components/RoleManagementPageView.vue'
import MemberPermissionPageView from '../components/MemberPermissionPageView.vue'
import { mapEffectiveFunctionPermissionRecords } from '../adapters/accessControlAdapter'
import type { AccessControlPreviewState } from '../types/accessControl'
import { accessControlFixture, userFunctionPermissionFixture } from './accessControl.fixture'

const params = new URLSearchParams(window.location.search)
const previewId = params.get('preview') ?? 'iam-role-management'
const requestedScenario = params.get('scenario')
const supportedStates = new Set<AccessControlPreviewState>([
  'ready',
  'loading',
  'empty',
  'retryable-error',
])
const state = ref<AccessControlPreviewState>(
  supportedStates.has(requestedScenario as AccessControlPreviewState)
    ? (requestedScenario as AccessControlPreviewState)
    : 'ready',
)
const feedback = ref('候选页面已就绪')
const selectedRole = computed(() => accessControlFixture.roles[0]!)
const userPermissionRoles = computed(() =>
  state.value === 'empty' ? [] : userFunctionPermissionFixture.roles,
)
const userPermissionResources = computed(() =>
  state.value === 'empty'
    ? Object.fromEntries(userFunctionPermissionFixture.systems.map((system) => [system.id, []]))
    : userFunctionPermissionFixture.resourcesBySystem,
)
const userEffectiveResourceIds = computed(() =>
  state.value === 'empty' ? [] : userFunctionPermissionFixture.effectiveResourceIds,
)
const userPermissionFunctions = computed(() =>
  mapEffectiveFunctionPermissionRecords(
    Object.values(userPermissionResources.value).flat(),
    new Set(userEffectiveResourceIds.value),
    new Map(userFunctionPermissionFixture.systems.map((system) => [system.id, system])),
  ),
)
const userPermissionMemberships = [
  {
    tenantId: 7,
    tenantCode: 'LL-HUADONG',
    tenantName: '陆链华东运营中心',
    tenantUserId: 301,
    tenantUserCode: 'HD00017',
    displayName: '林嘉',
    isTenantAdmin: true,
    isCurrentlyEffective: true,
    memberVersion: '18',
  },
  {
    tenantId: 9,
    tenantCode: 'LL-HUANAN',
    tenantName: '陆链华南运营中心',
    tenantUserId: 901,
    tenantUserCode: 'HN00011',
    displayName: '林嘉',
    isTenantAdmin: false,
    isCurrentlyEffective: true,
    memberVersion: '6',
  },
]
const userTenantAssignments = computed(() =>
  state.value === 'empty'
    ? []
    : accessControlFixture.assignments.filter(
        (assignment) => assignment.tenantId === 7 && assignment.tenantUserId === 301,
      ),
)
const userTenantRoles = accessControlFixture.roles.filter((role) => role.tenantId === 7)

const titleMap: Record<string, string> = {
  'iam-role-management': '角色管理',
  'iam-role-function-permissions': '角色功能权限',
  'iam-user-function-permissions': '用户角色与权限',
  'iam-role-data-permissions': '角色数据权限',
  'iam-role-assignments': '角色成员',
}

document.title = `${titleMap[previewId] ?? 'IAM 权限治理'} · UI Design`

function announce(message: string) {
  feedback.value = message
}

function retry() {
  state.value = 'loading'
  feedback.value = '正在重新加载候选数据'
  window.setTimeout(() => {
    state.value = 'ready'
    feedback.value = '候选数据已重新加载'
  }, 240)
}
</script>

<template>
  <p class="sr-only" role="status" aria-live="polite">{{ feedback }}</p>

  <RoleManagementPageView
    v-if="previewId === 'iam-role-management'"
    :records="accessControlFixture.roles"
    :tenants="accessControlFixture.tenants"
    :state="state"
    @action="announce"
    @retry="retry"
  />

  <RoleFunctionPermissionPageView
    v-else-if="previewId === 'iam-role-function-permissions'"
    :can-edit="true"
    :role="selectedRole"
    :systems="accessControlFixture.catalog.systems"
    :resources-by-system="accessControlFixture.catalog.resourcesBySystem"
    :direct-resource-ids="accessControlFixture.directResourceIds"
    :state="state"
    @action="announce"
    @retry="retry"
  />

  <MemberPermissionPageView
    v-else-if="previewId === 'iam-user-function-permissions'"
    :subject="userFunctionPermissionFixture.subject"
    :memberships="userPermissionMemberships"
    :current-tenant-id="7"
    :assignments="userTenantAssignments"
    :available-roles="userTenantRoles"
    :function-roles="userPermissionRoles"
    :functions="userPermissionFunctions"
    :function-systems="userFunctionPermissionFixture.systems"
    :function-resources-by-system="userPermissionResources"
    :function-resource-ids="userEffectiveResourceIds"
    :state="state"
    initial-tab="functions"
    :back="() => announce('返回用户列表')"
    @retry="retry"
  />

  <RoleDataPermissionPageView
    v-else-if="previewId === 'iam-role-data-permissions'"
    :role="selectedRole"
    :systems="accessControlFixture.catalog.systems"
    :domains="accessControlFixture.dataDomains"
    :invalid-resources="accessControlFixture.invalidDataPermissionResources"
    :permissions="accessControlFixture.roleDataPermissions"
    :tenants="accessControlFixture.tenants"
    :state="state"
    @action="announce"
    @retry="retry"
  />

  <RoleAssignmentPageView
    v-else
    :records="accessControlFixture.assignments"
    :roles="accessControlFixture.roles"
    :tenants="accessControlFixture.tenants"
    :members="accessControlFixture.members"
    :state="state"
    :initial-role-id="501"
    @action="announce"
    @retry="retry"
  />
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px; /* standards-allow: visually hidden accessibility utility */
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
