<script setup lang="ts">
import { computed, ref } from 'vue'

import PermissionSchemeManagementPageView from '../components/PermissionSchemeManagementPageView.vue'
import PermissionSchemeResourcesPageView from '../components/PermissionSchemeResourcesPageView.vue'
import RoleAuthorizationPageView from '../components/RoleAuthorizationPageView.vue'
import SystemResourceCatalogPageView from '../components/SystemResourceCatalogPageView.vue'
import UserEffectivePermissionsPageView from '../components/UserEffectivePermissionsPageView.vue'
import type {
  PermissionGovernancePreviewState,
  PermissionRecord,
} from '../types/permissionGovernance'
import { permissionGovernanceFixture } from './permissionGovernance.fixture'

const params = new URLSearchParams(window.location.search)
const requestedPreviewId = params.get('preview') ?? 'iam-system-resource-catalog'
const activePreviewId = ref(requestedPreviewId)
const scenario = params.get('scenario')
const requestedScenario = scenario as PermissionGovernancePreviewState | null
const supportedStates = new Set<PermissionGovernancePreviewState>([
  'ready',
  'loading',
  'empty',
  'empty-parent',
  'version-conflict',
  'unknown-result',
  'no-binding',
  'retryable-error',
])
const state = ref<PermissionGovernancePreviewState>(
  requestedScenario && supportedStates.has(requestedScenario) ? requestedScenario : 'ready',
)
const feedback = ref('IAM 权限治理 v2 候选页面已就绪')

const titleMap: Record<string, string> = {
  'iam-system-resource-catalog': '系统资源目录',
  'iam-permission-scheme-management': '权限管理',
  'iam-permission-scheme-resources': '权限功能配置',
  'iam-role-authorization': '角色授权',
  'iam-user-effective-permissions': '用户有效权限',
}

const selectedPermission = ref<PermissionRecord>()
const editablePermission = computed(
  () =>
    selectedPermission.value ??
    permissionGovernanceFixture.permissions.find(
      (permission) => permission.permissionCode === 'IAM.MEMBERS.EDIT_USER',
    ) ??
    permissionGovernanceFixture.permissions[0]!,
)
const selectedRole = computed(
  () =>
    permissionGovernanceFixture.roles.find((role) => role.roleCode === 'DISPATCH_MANAGER') ??
    permissionGovernanceFixture.roles[0]!,
)
const authorizationRole = computed(() =>
  state.value === 'no-binding' || scenario === 'new-role'
    ? {
        ...selectedRole.value,
        id: 599,
        roleCode: '保存后由系统生成',
        roleName: '新建运营角色',
        permissionIds: [],
        version: 'candidate',
      }
    : selectedRole.value,
)

document.title = `${titleMap[requestedPreviewId] ?? 'IAM 权限治理'} · UI Design`

function announce(message: string) {
  feedback.value = message
}

function showPreview(nextPreviewId: string) {
  activePreviewId.value = nextPreviewId
  document.title = `${titleMap[nextPreviewId] ?? 'IAM 权限治理'} · UI Design`
}

function openPermissionConfiguration(permission: PermissionRecord) {
  selectedPermission.value = permission
  showPreview('iam-permission-scheme-resources')
  announce(`已进入“${permission.permissionName}”权限功能配置候选页`)
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

  <SystemResourceCatalogPageView
    v-if="activePreviewId === 'iam-system-resource-catalog'"
    :records="permissionGovernanceFixture.resources"
    :apps="permissionGovernanceFixture.apps"
    :state="state"
    :can-create="true"
    :can-edit="true"
    @action="announce"
    @retry="retry"
  />

  <PermissionSchemeManagementPageView
    v-else-if="activePreviewId === 'iam-permission-scheme-management'"
    :permissions="permissionGovernanceFixture.permissions"
    :apps="permissionGovernanceFixture.apps"
    :resources="permissionGovernanceFixture.resources"
    :state="state"
    :can-create="true"
    :can-copy="true"
    :can-configure="true"
    :open-configuration="openPermissionConfiguration"
    @action="announce"
    @retry="retry"
  />

  <PermissionSchemeResourcesPageView
    v-else-if="activePreviewId === 'iam-permission-scheme-resources'"
    :apps="permissionGovernanceFixture.apps"
    :resources="permissionGovernanceFixture.resources"
    :permission="editablePermission"
    :state="state"
    :back="() => showPreview('iam-permission-scheme-management')"
    @action="announce"
    @retry="retry"
  />

  <RoleAuthorizationPageView
    v-else-if="activePreviewId === 'iam-role-authorization'"
    :apps="permissionGovernanceFixture.apps"
    :permission-tree-by-app="permissionGovernanceFixture.permissionTreeByApp"
    :role="authorizationRole"
    :state="state"
    :back="() => announce('返回角色列表')"
    @action="announce"
    @retry="retry"
  />

  <UserEffectivePermissionsPageView
    v-else
    :apps="permissionGovernanceFixture.apps"
    :permission-tree-by-app="permissionGovernanceFixture.permissionTreeByApp"
    :roles="permissionGovernanceFixture.roles"
    :subject="permissionGovernanceFixture.effectiveSubject"
    :state="state"
    :back="() => announce('返回用户与成员列表')"
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
