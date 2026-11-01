<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import FunctionPermissionPanel from './FunctionPermissionPanel.vue'
import type {
  AccessControlPreviewState,
  FunctionPermissionRole,
  FunctionPermissionSubject,
  ResourceNode,
  SystemRecord,
} from '../types/accessControl'

const props = defineProps<{
  subject: FunctionPermissionSubject | undefined
  roles: FunctionPermissionRole[]
  systems: SystemRecord[]
  resourcesBySystem: Record<number, ResourceNode[]>
  effectiveResourceIds: number[]
  state: AccessControlPreviewState
  back?: () => void
}>()
const emit = defineEmits<{ action: [message: string]; retry: [] }>()

const tenantCount = computed(() => new Set(props.roles.map((role) => role.tenantId)).size)
const effectiveFunctionCount = computed(() => {
  const effectiveIds = new Set(props.effectiveResourceIds)
  const visit = (nodes: ResourceNode[]): number =>
    nodes.reduce(
      (count, node) =>
        count +
        (node.resourceType === 'FUNCTION' && effectiveIds.has(node.id) ? 1 : 0) +
        visit(node.children ?? []),
      0,
    )

  return Object.values(props.resourcesBySystem).reduce((count, nodes) => count + visit(nodes), 0)
})
</script>

<template>
  <AppPage :scrollable="false" class="user-function-page">
    <PageHeader
      title="用户功能权限"
      description="汇总全局用户在全部有效 Tenant 中通过角色获得的功能权限"
    >
      <template #actions>
        <el-button v-if="back" @click="back">
          <Icon icon="mdi:chevron-left" width="18" aria-hidden="true" />返回用户列表
        </el-button>
        <el-button :loading="state === 'loading'" @click="emit('retry')">
          <Icon icon="mdi:refresh" width="18" aria-hidden="true" />刷新权限结果
        </el-button>
      </template>
    </PageHeader>

    <section class="user-permission-summary" aria-label="用户权限摘要">
      <div class="user-permission-identity">
        <span class="user-permission-identity__icon">
          <Icon icon="mdi:shield-account-outline" width="24" aria-hidden="true" />
        </span>
        <div>
          <strong>{{ subject?.subjectName || '用户信息待加载' }}</strong>
          <small>
            {{ subject?.subjectCode || '—' }}
            <template v-if="subject"> · 全局用户 #{{ subject.subjectId }}</template>
          </small>
        </div>
        <StatusTag
          :label="subject?.isCurrentlyEffective ? '用户当前有效' : '用户当前无效'"
          :tone="subject?.isCurrentlyEffective ? 'success' : 'warning'"
        />
      </div>

      <dl class="user-permission-metrics">
        <div>
          <dt>来源角色</dt>
          <dd>{{ roles.length }}</dd>
        </div>
        <div>
          <dt>涉及 Tenant</dt>
          <dd>{{ tenantCount }}</dd>
        </div>
        <div>
          <dt>有效 Function</dt>
          <dd>{{ effectiveFunctionCount }}</dd>
        </div>
      </dl>

      <div class="user-permission-roles">
        <div class="user-permission-roles__heading">
          <strong>跨 Tenant 来源角色</strong>
          <small>同名角色以 Tenant 编码区分</small>
        </div>
        <div v-if="roles.length" class="user-permission-roles__list">
          <span v-for="role in roles" :key="`${role.tenantId}:${role.id}`">
            <strong>{{ role.roleName }}</strong>
            <small>{{ role.tenantCode }} · {{ role.roleCode }}</small>
          </span>
        </div>
        <el-empty v-else description="当前无有效来源角色" :image-size="40" />
      </div>
    </section>

    <el-alert
      v-if="subject?.invalidReason"
      :title="subject.invalidReason"
      type="warning"
      :closable="false"
      show-icon
    />

    <FunctionPermissionPanel
      subject-type="user"
      :can-edit="false"
      :systems="systems"
      :resources-by-system="resourcesBySystem"
      :selected-resource-ids="effectiveResourceIds"
      :state="state"
      read-only-message="用户功能权限为跨 Tenant 有效角色的聚合结果，只能查看；权限调整请在角色管理中完成。"
      @action="emit('action', $event)"
      @retry="emit('retry')"
    />
  </AppPage>
</template>

<style scoped lang="scss">
.user-permission-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1.45fr);
  align-items: stretch;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  background: var(--background-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
}

.user-permission-identity {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  min-width: 0;
}

.user-permission-identity__icon {
  display: grid;
  flex: none;
  width: var(--spacing-10);
  height: var(--spacing-10);
  place-items: center;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-default);
}

.user-permission-identity > div,
.user-permission-roles__heading,
.user-permission-roles__list span {
  display: grid;
  gap: var(--spacing-1);
}

.user-permission-identity > div {
  min-width: 0;
  margin-right: auto;
}

.user-permission-identity strong,
.user-permission-roles strong {
  overflow: hidden;
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-permission-identity small,
.user-permission-roles small,
.user-permission-metrics dt {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.user-permission-metrics {
  display: grid;
  grid-template-columns: repeat(3, auto);
  align-items: center;
  gap: var(--spacing-5);
  margin: 0;
  padding: 0 var(--spacing-5);
  border-right: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
}

.user-permission-metrics div {
  display: grid;
  gap: var(--spacing-1);
  text-align: center;
}

.user-permission-metrics dd {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  font-weight: 650;
}

.user-permission-roles {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--spacing-4);
  min-width: 0;
}

.user-permission-roles__heading {
  flex: none;
}

.user-permission-roles__list {
  display: flex;
  gap: var(--spacing-2);
  min-width: 0;
  overflow-x: auto;
}

.user-permission-roles__list span {
  flex: none;
  min-width: calc(var(--spacing-12) * 3);
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-default);
}

.user-permission-roles :deep(.el-empty) {
  padding: 0;
}

@media (max-width: 1500px) {
  .user-permission-summary {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .user-permission-roles {
    grid-column: 1 / -1;
    padding-top: var(--spacing-3);
    border-top: 1px solid var(--border-light);
  }
}
</style>
