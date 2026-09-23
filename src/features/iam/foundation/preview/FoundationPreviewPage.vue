<script setup lang="ts">
import { computed, ref } from 'vue'

import GroupProfilePageView from '../components/GroupProfilePageView.vue'
import MembershipManagementPageView from '../components/MembershipManagementPageView.vue'
import OrganizationManagementPageView from '../components/OrganizationManagementPageView.vue'
import PositionManagementPageView from '../components/PositionManagementPageView.vue'
import TenantContextPageView from '../components/TenantContextPageView.vue'
import TenantManagementPageView from '../components/TenantManagementPageView.vue'
import type { FoundationPreviewState, OrganizationNode } from '../types/foundation'
import { foundationFixture } from './foundation.fixture'
import TenantSwitchPreviewSurface from './TenantSwitchPreviewSurface.vue'
import type { OrganizationLeaderLoader } from '../types/organizationLeader'

const params = new URLSearchParams(window.location.search)
const previewId = params.get('preview') ?? 'iam-group-profile'
const requestedScenario = params.get('scenario')
const supportedStates = new Set<FoundationPreviewState>([
  'ready',
  'loading',
  'empty',
  'retryable-error',
])
const state = ref<FoundationPreviewState>(
  supportedStates.has(requestedScenario as FoundationPreviewState)
    ? (requestedScenario as FoundationPreviewState)
    : 'ready',
)
const selectedTenantId = ref<number>()
const setAsDefault = ref(false)
const feedback = ref('候选页面已就绪')
const fixtureTenant = foundationFixture.tenantOptions.find((tenant) => tenant.isDefault)!
const loadPreviewLeaderOptions: OrganizationLeaderLoader = async ({
  keyword,
  pageIndex,
  pageSize,
}) => {
  const items = foundationFixture.memberships
    .filter(
      (member) =>
        member.tenantId === fixtureTenant.id &&
        member.effectiveness === 'EFFECTIVE' &&
        member.userStatus === 'ACTIVE' &&
        member.memberStatus === 'ACTIVE',
    )
    .map((member) => ({
      id: member.id,
      label: member.realName || member.userName,
      description: member.userName,
    }))
    .filter((item) => `${item.label} ${item.description}`.includes(keyword))
  return {
    items: items.slice((pageIndex - 1) * pageSize, pageIndex * pageSize),
    total: items.length,
  }
}
function flattenOrganizationOptions(
  nodes: OrganizationNode[],
): Array<{ id: number; label: string }> {
  return nodes.flatMap((node) => [
    { id: node.id, label: node.name },
    ...flattenOrganizationOptions(node.children ?? []),
  ])
}
const organizationOptions = flattenOrganizationOptions(foundationFixture.organizations)
const positionOptions = foundationFixture.positions.map((position) => ({
  id: position.id,
  label: position.name,
}))

const titleMap: Record<string, string> = {
  'iam-group-profile': '集团信息',
  'iam-tenant-management': 'Tenant 管理',
  'iam-organization-management': '组织管理',
  'iam-position-management': '岗位管理',
  'iam-membership-management': '用户与成员',
  'iam-tenant-context': 'Tenant 选择',
}

document.title = `${titleMap[previewId] ?? 'IAM 基础能力'} · UI Design`

const tenantContextMode = computed(() =>
  requestedScenario === 'tenant-switch' ? 'switch' : 'select',
)

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

function submitTenantContext() {
  const selected = foundationFixture.tenantOptions.find(
    (item) => item.id === selectedTenantId.value,
  )
  if (!selected) return
  announce(
    tenantContextMode.value === 'switch'
      ? `已确认切换到 ${selected.name}；正式接入时等待服务端确认后再清空旧上下文`
      : `已选择 ${selected.name}；正式接入时将进入该 Tenant 首页`,
  )
}
</script>

<template>
  <p class="sr-only" role="status" aria-live="polite">{{ feedback }}</p>

  <GroupProfilePageView
    v-if="previewId === 'iam-group-profile'"
    :profile="foundationFixture.group"
    :state="state"
    @action="announce"
    @retry="retry"
  />

  <TenantManagementPageView
    v-else-if="previewId === 'iam-tenant-management'"
    :records="foundationFixture.tenants"
    :state="state"
    @action="announce"
    @retry="retry"
  />

  <OrganizationManagementPageView
    v-else-if="previewId === 'iam-organization-management'"
    :organizations="foundationFixture.organizations"
    :tenant="fixtureTenant"
    :load-leader-options="loadPreviewLeaderOptions"
    :state="state"
    @action="announce"
    @retry="retry"
  />

  <PositionManagementPageView
    v-else-if="previewId === 'iam-position-management'"
    :records="foundationFixture.positions"
    :tenant="fixtureTenant"
    :state="state"
    @action="announce"
    @retry="retry"
  />

  <MembershipManagementPageView
    v-else-if="previewId === 'iam-membership-management'"
    :records="foundationFixture.memberships"
    :organization-options="organizationOptions"
    :position-options="positionOptions"
    :tenant-options="foundationFixture.tenantOptions"
    :state="state"
    @action="announce"
    @retry="retry"
  />

  <TenantSwitchPreviewSurface
    v-else-if="previewId === 'iam-tenant-context' && tenantContextMode === 'switch'"
    v-model:set-as-default="setAsDefault"
    :options="foundationFixture.tenantOptions"
    :selected-id="selectedTenantId"
    :state="state"
    @select="selectedTenantId = $event"
    @submit="submitTenantContext"
    @cancel="announce('已保持原 Tenant，不清空任何上下文')"
    @retry="retry"
  />

  <TenantContextPageView
    v-else
    v-model:set-as-default="setAsDefault"
    :options="foundationFixture.tenantOptions"
    :selected-id="selectedTenantId"
    :state="state"
    @select="selectedTenantId = $event"
    @submit="submitTenantContext"
    @cancel="announce('候选退出登录动作已响应')"
    @retry="retry"
  />
</template>
