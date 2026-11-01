<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

import type {
  PermissionTreeNode,
  PermissionGovernanceApp,
  PermissionTreeNodeType,
} from '../types/permissionGovernance'

const props = withDefaults(
  defineProps<{
    apps: PermissionGovernanceApp[]
    resourceTreeByApp: Record<string, PermissionTreeNode[]>
    activeAppCode?: string
    includedInstanceKeys?: string[]
    title?: string
    readonly?: boolean
    countNodeType?: PermissionTreeNodeType
  }>(),
  {
    activeAppCode: '',
    includedInstanceKeys: () => [],
    title: 'App 分组',
    readonly: false,
    countNodeType: 'PERMISSION',
  },
)

const emit = defineEmits<{ select: [appCode: string] }>()

function flattenNodes(nodes: PermissionTreeNode[]): PermissionTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children ?? [])])
}

const includedSet = computed(() => new Set(props.includedInstanceKeys))

function totalCount(appCode: string) {
  const nodes = flattenNodes(props.resourceTreeByApp[appCode] ?? [])
  return props.countNodeType
    ? nodes.filter((node) => node.nodeType === props.countNodeType).length
    : nodes.length
}

function activeCount(appCode: string) {
  const flattened = flattenNodes(props.resourceTreeByApp[appCode] ?? [])
  const nodes = props.countNodeType
    ? flattened.filter((node) => node.nodeType === props.countNodeType)
    : flattened
  if (props.readonly) return nodes.filter((node) => node.sourceGrants.length > 0).length
  return nodes.filter((node) => includedSet.value.has(node.nodeKey)).length
}
</script>

<template>
  <nav class="permission-app-navigator" :aria-label="title">
    <header>
      <div>
        <h2>{{ title }}</h2>
        <small>{{ apps.length }} 个 App</small>
      </div>
      <Icon icon="mdi:apps" width="18" aria-hidden="true" />
    </header>

    <div class="permission-app-navigator__list">
      <button
        v-for="app in apps"
        :key="app.appCode"
        type="button"
        :class="{ 'permission-app-navigator__item--active': app.appCode === activeAppCode }"
        :aria-current="app.appCode === activeAppCode ? 'page' : undefined"
        @click="emit('select', app.appCode)"
      >
        <span class="permission-app-navigator__icon">
          <Icon icon="mdi:cube-outline" width="18" aria-hidden="true" />
        </span>
        <span class="permission-app-navigator__copy">
          <strong>{{ app.appName }}</strong>
          <small>{{ app.appCode }}</small>
        </span>
        <span class="permission-app-navigator__count">
          <strong>{{ activeCount(app.appCode) }}</strong>
          <small>/ {{ totalCount(app.appCode) }}</small>
        </span>
      </button>
    </div>

    <footer>
      <span class="permission-app-navigator__legend-dot" aria-hidden="true" />
      <small>{{ readonly ? '当前有效 / 层级总数' : '已选择 / 可用总数' }}</small>
    </footer>
  </nav>
</template>

<style scoped lang="scss">
.permission-app-navigator {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  height: 100%;
  min-height: 0;
  padding: var(--spacing-3);
}

.permission-app-navigator > header,
.permission-app-navigator > footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.permission-app-navigator > header > div {
  display: grid;
  gap: var(--spacing-1);
}

.permission-app-navigator h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

.permission-app-navigator small {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.permission-app-navigator__list {
  display: grid;
  align-content: start;
  gap: var(--spacing-2);
  min-height: 0;
  overflow: auto;
}

.permission-app-navigator__list button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--spacing-2);
  min-height: var(--size-table-row);
  padding: var(--spacing-2);
  color: var(--text-regular);
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-default);
  cursor: pointer;
}

.permission-app-navigator__list button:hover {
  background: var(--background-muted);
}

.permission-app-navigator__list button:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 1px;
}

.permission-app-navigator__list button.permission-app-navigator__item--active {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.permission-app-navigator__icon {
  display: grid;
  width: var(--spacing-8);
  height: var(--spacing-8);
  place-items: center;
  color: var(--color-primary);
  background: var(--background-card);
  border-radius: var(--radius-small);
}

.permission-app-navigator__copy,
.permission-app-navigator__count {
  display: grid;
  gap: var(--spacing-1);
}

.permission-app-navigator__copy {
  min-width: 0;
}

.permission-app-navigator__copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.permission-app-navigator__count {
  grid-template-columns: auto auto;
  align-items: baseline;
}

.permission-app-navigator__count strong {
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

.permission-app-navigator > footer {
  justify-content: flex-start;
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--border-light);
}

.permission-app-navigator__legend-dot {
  width: var(--spacing-2);
  height: var(--spacing-2);
  background: var(--color-primary);
  border-radius: 50%;
}
</style>
