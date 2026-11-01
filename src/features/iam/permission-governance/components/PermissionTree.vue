<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import StatusTag from '@shared/components/StatusTag.vue'
import type {
  PermissionTreeNode,
  PermissionGovernancePreviewState,
  PermissionTreeNodeType,
} from '../types/permissionGovernance'

const props = withDefaults(
  defineProps<{
    scopeKey: string
    nodes: PermissionTreeNode[]
    state: PermissionGovernancePreviewState
    checkableType?: PermissionTreeNodeType
    checkedNodeKeys?: string[]
    selectedNodeKey?: string
    readonly?: boolean
    emptyDescription?: string
    searchPlaceholder?: string
  }>(),
  {
    checkableType: 'PERMISSION',
    checkedNodeKeys: () => [],
    selectedNodeKey: '',
    readonly: false,
    emptyDescription: '当前范围暂无可用权限数据',
    searchPlaceholder: '搜索名称或 API Path',
  },
)

const emit = defineEmits<{
  select: [node: PermissionTreeNode]
  'update:checkedNodeKeys': [keys: string[]]
  action: [message: string]
  retry: []
  toggle: [node: PermissionTreeNode, checked: boolean]
  batch: [keys: string[], checked: boolean]
}>()

interface TreeNodeHandle {
  expanded: boolean
}

interface TreeControl {
  filter: (keyword: string) => void
  getNode: (key: string) => TreeNodeHandle | undefined
}

interface SearchSnapshot {
  expandedKeys: Set<string>
  scrollTop: number
}

const treeRef = ref<TreeControl>()
const scrollRef = ref<HTMLElement>()
const keyword = ref('')
const expandedKeysByScope = new Map<string, Set<string>>()
const scrollTopByScope = new Map<string, number>()
const searchSnapshots = new Map<string, SearchSnapshot>()
const treeProps = { children: 'children', label: 'name' }

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLocaleLowerCase('zh-CN')
}

function flatten(nodes: PermissionTreeNode[]): PermissionTreeNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])])
}

const normalizedKeyword = computed(() => normalize(keyword.value))
const flatNodes = computed(() => flatten(props.nodes))
const checkedSet = computed(() => new Set(props.checkedNodeKeys))
const expandableKeys = computed(() =>
  flatNodes.value.filter((node) => node.children.length > 0).map((node) => node.nodeKey),
)

function nodeMatches(node: PermissionTreeNode, search: string) {
  return [node.name, node.code, node.apiPath, node.httpMethod, node.routePath].some((value) =>
    normalize(value).includes(search),
  )
}

function collectSearchState(
  nodes: PermissionTreeNode[],
  search: string,
  visibleKeys: Set<string>,
  expandKeys: Set<string>,
): boolean {
  let branchMatches = false
  nodes.forEach((node) => {
    const directMatch = nodeMatches(node, search)
    const childMatch = collectSearchState(node.children, search, visibleKeys, expandKeys)
    if (directMatch || childMatch) {
      visibleKeys.add(node.nodeKey)
      branchMatches = true
      if (node.children.length) expandKeys.add(node.nodeKey)
    }
    if (directMatch) flatten(node.children).forEach((child) => visibleKeys.add(child.nodeKey))
  })
  return branchMatches
}

const searchState = computed(() => {
  const visibleKeys = new Set<string>()
  const expandKeys = new Set<string>()
  if (normalizedKeyword.value) {
    collectSearchState(props.nodes, normalizedKeyword.value, visibleKeys, expandKeys)
  }
  return { visibleKeys, expandKeys }
})

const hasSearchResult = computed(
  () => !normalizedKeyword.value || searchState.value.visibleKeys.size > 0,
)
const isInteractiveState = computed(() => props.state === 'ready' || props.state === 'no-binding')

function filterNode(_value: string, node: PermissionTreeNode) {
  return !normalizedKeyword.value || searchState.value.visibleKeys.has(node.nodeKey)
}

function currentExpandedKeys() {
  return new Set(
    expandableKeys.value.filter((key) => Boolean(treeRef.value?.getNode(key)?.expanded)),
  )
}

function rememberCurrentScope(scope = props.scopeKey) {
  expandedKeysByScope.set(scope, currentExpandedKeys())
  if (scrollRef.value) scrollTopByScope.set(scope, scrollRef.value.scrollTop)
}

async function applyExpansion(keys: Set<string>, preserveScroll = true) {
  const scrollTop = scrollRef.value?.scrollTop ?? 0
  expandableKeys.value.forEach((key) => {
    const node = treeRef.value?.getNode(key)
    if (node) node.expanded = keys.has(key)
  })
  await nextTick()
  if (preserveScroll && scrollRef.value) scrollRef.value.scrollTop = scrollTop
}

function defaultExpandedKeys(nodes: PermissionTreeNode[], depth = 0) {
  const keys = new Set<string>()
  nodes.forEach((node) => {
    if (node.children.length && depth < 1) keys.add(node.nodeKey)
    defaultExpandedKeys(node.children, depth + 1).forEach((key) => keys.add(key))
  })
  return keys
}

async function restoreScope() {
  await nextTick()
  treeRef.value?.filter(normalizedKeyword.value)
  const saved = expandedKeysByScope.get(props.scopeKey) ?? defaultExpandedKeys(props.nodes)
  await applyExpansion(saved, false)
  await nextTick()
  if (scrollRef.value) scrollRef.value.scrollTop = scrollTopByScope.get(props.scopeKey) ?? 0
}

function setAllExpanded(expanded: boolean) {
  const keys = new Set(expanded ? expandableKeys.value : [])
  expandedKeysByScope.set(props.scopeKey, keys)
  void applyExpansion(keys)
  emit('action', expanded ? '已展开全部层级' : '已收起全部层级')
}

function handleExpand(node: PermissionTreeNode, expanded: boolean) {
  if (normalizedKeyword.value) return
  const keys = expandedKeysByScope.get(props.scopeKey) ?? currentExpandedKeys()
  if (expanded) keys.add(node.nodeKey)
  else keys.delete(node.nodeKey)
  expandedKeysByScope.set(props.scopeKey, new Set(keys))
}

function canCheck(node: PermissionTreeNode) {
  return (
    isInteractiveState.value &&
    !props.readonly &&
    Boolean(props.checkableType) &&
    node.nodeType === props.checkableType &&
    node.selectable &&
    !node.readOnly &&
    ((node.status === 'ACTIVE' && node.eligible !== false) || checkedSet.value.has(node.nodeKey))
  )
}

function toggleNode(node: PermissionTreeNode, checked: boolean | string | number) {
  if (!canCheck(node)) return
  emit('toggle', node, checked === true)
  const next = new Set(props.checkedNodeKeys)
  if (checked === true) next.add(node.nodeKey)
  else next.delete(node.nodeKey)
  emit('update:checkedNodeKeys', [...next])
  emit('action', `${checked === true ? '已选择' : '已取消'}“${node.name}”`)
}

function handleTreeKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (target.getAttribute('role') !== 'treeitem') return
  const key = target.querySelector<HTMLElement>(':scope > .el-tree-node__content [data-node-key]')
    ?.dataset.nodeKey
  const data = flatNodes.value.find((node) => node.nodeKey === key)
  if (!data || ![' ', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  event.stopPropagation()
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    const handle = treeRef.value?.getNode(data.nodeKey)
    if (handle && data.children.length) {
      handle.expanded = event.key === 'ArrowRight'
      handleExpand(data, handle.expanded)
    }
  } else if (data.nodeType === 'PERMISSION' && !props.readonly)
    toggleNode(data, !checkedSet.value.has(data.nodeKey))
  else emit('select', data)
}

function typeLabel(type: PermissionTreeNodeType) {
  return ({ GROUP: '分组', PERMISSION: '权限', RESOURCE: '资源' } as const)[type]
}

function typeIcon(type: PermissionTreeNodeType) {
  return (
    {
      GROUP: 'mdi:layers-triple-outline',
      PERMISSION: 'mdi:shield-key-outline',
      RESOURCE: 'mdi:source-branch',
    } as const
  )[type]
}

watch(
  () => props.scopeKey,
  async (_scope, previousScope) => {
    if (previousScope) rememberCurrentScope(previousScope)
    keyword.value = ''
    await restoreScope()
  },
)

watch(
  normalizedKeyword,
  async (search, previousSearch) => {
    if (search && !previousSearch) {
      searchSnapshots.set(props.scopeKey, {
        expandedKeys: currentExpandedKeys(),
        scrollTop: scrollRef.value?.scrollTop ?? 0,
      })
    }

    treeRef.value?.filter(search)
    await nextTick()
    if (search) {
      await applyExpansion(searchState.value.expandKeys, false)
      if (scrollRef.value) scrollRef.value.scrollTop = 0
      return
    }

    const snapshot = searchSnapshots.get(props.scopeKey)
    if (!snapshot) return
    await applyExpansion(snapshot.expandedKeys, false)
    await nextTick()
    if (scrollRef.value) scrollRef.value.scrollTop = snapshot.scrollTop
    expandedKeysByScope.set(props.scopeKey, new Set(snapshot.expandedKeys))
    searchSnapshots.delete(props.scopeKey)
  },
  { flush: 'post' },
)

watch(
  () => props.nodes,
  async () => {
    treeRef.value?.filter(normalizedKeyword.value)
    await nextTick()
    if (!normalizedKeyword.value) {
      await applyExpansion(
        expandedKeysByScope.get(props.scopeKey) ?? defaultExpandedKeys(props.nodes),
      )
    }
  },
)

onMounted(() => void restoreScope())
</script>

<template>
  <section class="permission-package-tree" data-permission-package-tree>
    <header class="permission-package-tree__toolbar">
      <el-input
        v-model="keyword"
        clearable
        :placeholder="searchPlaceholder"
        aria-label="搜索权限层级"
        :disabled="!isInteractiveState"
      >
        <template #prefix><Icon icon="mdi:magnify" width="16" aria-hidden="true" /></template>
      </el-input>
      <el-button-group aria-label="权限层级展开控制">
        <el-button size="small" :disabled="!isInteractiveState" @click="setAllExpanded(true)">
          <Icon icon="mdi:unfold-more-horizontal" width="16" aria-hidden="true" />展开全部
        </el-button>
        <el-button size="small" :disabled="!isInteractiveState" @click="setAllExpanded(false)">
          <Icon icon="mdi:unfold-less-horizontal" width="16" aria-hidden="true" />收起全部
        </el-button>
      </el-button-group>
    </header>

    <div v-if="!readonly && isInteractiveState" class="permission-package-tree__batch">
      <el-button
        size="small"
        @click="
          emit(
            'batch',
            flatNodes
              .filter(canCheck)
              .filter((n) => n.eligible !== false && n.status === 'ACTIVE')
              .map((n) => n.nodeKey),
            true,
          )
        "
        >全选本组</el-button
      >
      <el-button
        size="small"
        @click="
          emit(
            'batch',
            flatNodes.filter(canCheck).map((n) => n.nodeKey),
            false,
          )
        "
        >清空本组</el-button
      >
    </div>
    <div v-if="state === 'loading'" class="permission-package-tree__state">
      <el-icon class="is-loading"><Icon icon="mdi:loading" /></el-icon>
      正在加载权限数据
    </div>
    <el-result
      v-else-if="state === 'retryable-error'"
      icon="error"
      title="权限数据加载失败"
      sub-title="未使用上一次主体的缓存结果"
    >
      <template #extra
        ><el-button type="primary" @click="emit('retry')">重新加载</el-button></template
      >
    </el-result>
    <el-empty v-else-if="state === 'empty' || !nodes.length" :description="emptyDescription" />
    <el-empty v-else-if="normalizedKeyword && !hasSearchResult" description="未找到匹配结果">
      <el-button type="primary" plain @click="keyword = ''">清空搜索</el-button>
    </el-empty>
    <div
      v-else
      ref="scrollRef"
      class="permission-package-tree__scroll"
      @scroll.passive="rememberCurrentScope()"
    >
      <el-tree
        ref="treeRef"
        :data="nodes"
        :props="treeProps"
        node-key="nodeKey"
        :expand-on-click-node="false"
        :filter-node-method="filterNode"
        @keydown.capture="handleTreeKeydown"
        @node-expand="handleExpand($event, true)"
        @node-collapse="handleExpand($event, false)"
      >
        <template #default="{ data, node }">
          <div
            class="permission-package-node"
            :class="{
              'permission-package-node--selected': data.nodeKey === selectedNodeKey,
              'permission-package-node--disabled': data.status !== 'ACTIVE',
            }"
            :data-node-type="data.nodeType"
            :data-node-key="data.nodeKey"
            :data-expanded="Boolean(node.expanded)"
          >
            <button
              type="button"
              class="permission-package-node__name"
              :aria-current="data.nodeKey === selectedNodeKey ? 'true' : undefined"
              @click.stop="emit('select', data)"
            >
              <Icon :icon="typeIcon(data.nodeType)" width="15" aria-hidden="true" />
              <span>{{ data.name }}</span>
            </button>
            <span class="permission-package-node__meta">
              <el-tooltip
                v-if="data.blockingReasons?.length"
                :content="data.blockingReasons.join('；')"
                ><span tabindex="0">不可授予</span></el-tooltip
              >
              <small v-if="data.defaultSelectedWithParent">随父项默认勾选</small>
              <StatusTag
                v-if="data.sourceGrants.length"
                :label="`${data.sourceGrants.length} 个来源`"
                tone="primary"
              />
              <small v-else>{{ typeLabel(data.nodeType) }}</small>
            </span>
            <el-checkbox
              v-if="!readonly && data.nodeType === checkableType"
              :model-value="checkedSet.has(data.nodeKey)"
              :disabled="!canCheck(data)"
              :aria-label="`${checkedSet.has(data.nodeKey) ? '取消' : '选择'}${data.name}`"
              @click.stop
              @change="toggleNode(data, $event)"
            />
          </div>
        </template>
      </el-tree>
    </div>
  </section>
</template>

<style scoped lang="scss">
.permission-package-tree {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-2);
  min-width: 0;
  min-height: 0;
}

.permission-package-tree__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--spacing-2);
}

.permission-package-tree__toolbar :deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
}

.permission-package-tree__batch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
}

.permission-package-tree__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

.permission-package-tree :deep(.el-tree-node__content) {
  height: auto;
  min-height: var(--size-control);
  padding-block: var(--spacing-1);
}

.permission-package-tree :deep(.el-tree-node__content:hover) {
  background: var(--background-muted);
}

.permission-package-node {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
  min-width: 0;
  padding-right: var(--spacing-2);
  border-radius: var(--radius-small);
}

.permission-package-node--selected {
  background: var(--color-primary-light);
}

.permission-package-node--disabled {
  color: var(--text-disabled);
}

.permission-package-node__name {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-2);
  min-width: 0;
  padding: var(--spacing-1);
  color: inherit;
  font: inherit;
  line-height: 1.45;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: var(--radius-small);
  cursor: pointer;
}

.permission-package-node__name:hover {
  color: var(--color-primary);
}

.permission-package-node__name:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 1px;
}

.permission-package-node__name span {
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: normal;
}

.permission-package-node__meta {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  color: var(--text-secondary);
}

.permission-package-node__meta small {
  font-size: var(--font-size-xs);
}

.permission-package-tree__state {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  min-height: calc(var(--size-table-row) * 6);
  color: var(--text-secondary);
}

@media (max-width: 1450px) {
  .permission-package-node__meta small {
    display: none;
  }
}
</style>
