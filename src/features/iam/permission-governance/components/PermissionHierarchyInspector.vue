<script setup lang="ts">
import { Icon } from '@iconify/vue'

import StatusTag from '@shared/components/StatusTag.vue'
import type { PermissionTreeNode } from '../types/permissionGovernance'

withDefaults(
  defineProps<{
    node: PermissionTreeNode | undefined
    title?: string
    showAppContext?: boolean
  }>(),
  {
    title: '',
    showAppContext: true,
  },
)

function typeLabel(node: PermissionTreeNode) {
  return ({ GROUP: '分组', PERMISSION: '权限', RESOURCE: node.resourceType ?? '资源' } as const)[
    node.nodeType
  ]
}
</script>

<template>
  <aside class="permission-hierarchy-inspector" aria-label="权限层级详情">
    <template v-if="node">
      <header>
        <span><Icon icon="mdi:shield-search" width="20" aria-hidden="true" /></span>
        <div>
          <small>{{ title || typeLabel(node) }}</small>
          <h2>{{ node.name }}</h2>
        </div>
        <StatusTag
          :label="node.status === 'ACTIVE' ? '启用' : '停用'"
          :tone="node.status === 'ACTIVE' ? 'success' : 'info'"
        />
      </header>

      <dl>
        <div>
          <dt>类型</dt>
          <dd>{{ typeLabel(node) }}</dd>
        </div>
        <div v-if="showAppContext">
          <dt>所属 App</dt>
          <dd>{{ node.appName }}</dd>
        </div>
        <div>
          <dt>编码</dt>
          <dd>{{ node.code || '—' }}</dd>
        </div>
        <div v-if="node.resourceType">
          <dt>资源类型</dt>
          <dd>{{ node.resourceType }}</dd>
        </div>
        <div v-if="node.routePath">
          <dt>路由</dt>
          <dd>{{ node.routePath }}</dd>
        </div>
        <div v-if="node.httpMethod || node.apiPath">
          <dt>接口</dt>
          <dd>{{ [node.httpMethod, node.apiPath].filter(Boolean).join(' ') }}</dd>
        </div>
        <div>
          <dt>下级数量</dt>
          <dd>{{ node.children.length }}</dd>
        </div>
      </dl>

      <section v-if="node.description">
        <h3>说明</h3>
        <p>{{ node.description }}</p>
      </section>

      <section v-if="node.sourceGrants.length">
        <h3>授权来源</h3>
        <ul>
          <li v-for="source in node.sourceGrants" :key="`${source.roleId}:${source.permissionId}`">
            <strong>{{ source.roleName }}</strong>
            <small>{{ source.permissionName }}</small>
          </li>
        </ul>
      </section>
    </template>

    <el-empty v-else description="选择节点查看详情" :image-size="72" />
  </aside>
</template>

<style scoped lang="scss">
.permission-hierarchy-inspector {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  min-width: 0;
  min-height: 0;
  padding: var(--spacing-3);
  overflow: auto;
  border-left: 1px solid var(--border-default);
}

.permission-hierarchy-inspector > header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--spacing-2);
}

.permission-hierarchy-inspector > header > span {
  display: grid;
  width: var(--spacing-8);
  height: var(--spacing-8);
  place-items: center;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-small);
}

.permission-hierarchy-inspector header div {
  min-width: 0;
}

.permission-hierarchy-inspector h2,
.permission-hierarchy-inspector h3,
.permission-hierarchy-inspector p,
.permission-hierarchy-inspector dl,
.permission-hierarchy-inspector ul {
  margin: 0;
}

.permission-hierarchy-inspector h2 {
  margin-top: var(--spacing-1);
  color: var(--text-primary);
  font-size: var(--font-size-md);
  overflow-wrap: anywhere;
}

.permission-hierarchy-inspector h3 {
  margin-bottom: var(--spacing-2);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.permission-hierarchy-inspector small,
.permission-hierarchy-inspector p {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.permission-hierarchy-inspector dl {
  display: grid;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-small);
}

.permission-hierarchy-inspector dl > div {
  display: grid;
  grid-template-columns: minmax(88px, 0.34fr) minmax(0, 1fr);
  border-bottom: 1px solid var(--border-light);
}

.permission-hierarchy-inspector dl > div:last-child {
  border-bottom: 0;
}

.permission-hierarchy-inspector dt,
.permission-hierarchy-inspector dd {
  min-width: 0;
  padding: var(--spacing-2);
  margin: 0;
  overflow-wrap: anywhere;
}

.permission-hierarchy-inspector dt {
  color: var(--text-secondary);
  background: var(--background-muted);
}

.permission-hierarchy-inspector dd {
  color: var(--text-regular);
}

.permission-hierarchy-inspector ul {
  display: grid;
  gap: var(--spacing-2);
  padding: 0;
  list-style: none;
}

.permission-hierarchy-inspector li {
  display: grid;
  gap: var(--spacing-1);
  padding: var(--spacing-2);
  background: var(--background-muted);
  border-radius: var(--radius-small);
}
</style>
