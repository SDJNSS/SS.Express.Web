<script setup lang="ts">
import { Icon } from '@iconify/vue'

import StatusTag from '@shared/components/StatusTag.vue'
import type { RoleRecord } from '../types/accessControl'

defineProps<{
  role: RoleRecord
  directCount?: number
  dirty?: boolean
}>()
</script>

<template>
  <section class="role-context" aria-label="当前角色">
    <div class="role-context__mark"><Icon icon="mdi:shield-account-outline" width="22" /></div>
    <div class="role-context__identity">
      <span>当前角色</span>
      <strong>{{ role.roleName }}</strong>
      <code>{{ role.roleCode }}</code>
    </div>
    <div class="role-context__meta">
      <span>{{ role.tenantCode }}</span>
      <StatusTag :label="role.roleType === 'CUSTOM' ? '自定义角色' : '系统角色'" tone="info" />
      <StatusTag
        :label="role.status === 'ACTIVE' ? '启用' : '停用'"
        :tone="role.status === 'ACTIVE' ? 'success' : 'info'"
      />
      <StatusTag v-if="role.isGroupControlled" label="集团控制" tone="warning" />
      <span v-if="directCount !== undefined" class="role-context__count"
        >直接选择 {{ directCount }} 项</span
      >
      <StatusTag v-if="dirty" label="有未保存变更" tone="warning" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.role-context {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  min-width: 0;
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--background-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
}

.role-context__mark {
  display: grid;
  flex: none;
  width: var(--spacing-10);
  height: var(--spacing-10);
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-default);
  place-items: center;
}

.role-context__identity {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: var(--spacing-2);
}

.role-context__identity > span,
.role-context__count {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.role-context__identity strong {
  color: var(--text-primary);
  font-size: var(--font-size-md);
  white-space: nowrap;
}

.role-context__identity code {
  color: var(--text-secondary);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
}

.role-context__meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  min-width: 0;
  margin-left: auto;
}
</style>
