<script setup lang="ts">
import { ref } from 'vue'

import RoleAssignmentPageView from '../components/RoleAssignmentPageView.vue'
import RoleManagementPageView from '../components/RoleManagementPageView.vue'
import type { AccessControlPreviewState } from '../types/accessControl'
import { accessControlFixture } from './accessControl.fixture'

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
const titleMap: Record<string, string> = {
  'iam-role-management': '角色管理',
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
    :can-access-authorization="true"
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
