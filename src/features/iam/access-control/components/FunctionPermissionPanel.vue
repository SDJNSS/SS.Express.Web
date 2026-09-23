<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import StatusTag from '@shared/components/StatusTag.vue'
import WorkspacePageTemplate from '@shared/components/page-templates/WorkspacePageTemplate.vue'
import type { AccessControlPreviewState, ResourceNode, SystemRecord } from '../types/accessControl'

const props = withDefaults(
  defineProps<{
    subjectType: 'role' | 'member' | 'user'
    canEdit: boolean
    systems: SystemRecord[]
    resourcesBySystem: Record<number, ResourceNode[]>
    selectedResourceIds: number[]
    state: AccessControlPreviewState
    readOnlyMessage?: string
  }>(),
  {
    readOnlyMessage: '',
  },
)
const emit = defineEmits<{
  'update:selectedResourceIds': [ids: number[]]
  action: [message: string]
  retry: []
}>()

const activeSystemId = ref(
  props.systems.find((item) => item.status === 'ACTIVE')?.id ?? props.systems[0]?.id,
)
const selectedResource = ref<ResourceNode>()
const treeKeyword = ref('')
const treeRef = ref<{
  getNode: (key: number) => { expanded: boolean } | undefined
  setCheckedKeys: (keys: number[], leafOnly?: boolean) => void
}>()
const treeScrollRef = ref<HTMLElement>()
const expandedIdsBySystem = ref<Record<number, number[]>>({})
const scrollTopBySystem = new Map<number, number>()
const treeProps = { children: 'children', label: 'resourceName', disabled: 'selectionDisabled' }
const effectiveCanEdit = computed(() => props.subjectType === 'role' && props.canEdit)
const activeResources = computed(() => props.resourcesBySystem[activeSystemId.value ?? 0] ?? [])

function normalizeSearchValue(value: string | null | undefined) {
  return (value ?? '').trim().toLocaleLowerCase('zh-CN')
}

const normalizedTreeKeyword = computed(() => normalizeSearchValue(treeKeyword.value))

function resourceMatchesKeyword(node: ResourceNode, keyword: string) {
  return [
    node.resourceName,
    node.resourceCode,
    node.permissionCode,
    node.routePath,
    node.httpMethod,
    node.apiPath,
  ].some((value) => normalizeSearchValue(value).includes(keyword))
}

function filterResourceTree(nodes: ResourceNode[], keyword: string): ResourceNode[] {
  if (!keyword) return nodes

  return nodes.flatMap((node) => {
    const children = filterResourceTree(node.children ?? [], keyword)
    if (resourceMatchesKeyword(node, keyword) || children.length) {
      return [{ ...node, children }]
    }
    return []
  })
}

const visibleResources = computed(() =>
  filterResourceTree(activeResources.value, normalizedTreeKeyword.value),
)

function nodeDisabled(node: ResourceNode) {
  return !effectiveCanEdit.value || !node.isCurrentlyEffective || !node.canMaintain
}

type DecoratedResourceNode = Omit<ResourceNode, 'children'> & {
  selectionDisabled: boolean
  children?: DecoratedResourceNode[]
}

function decorateTree(nodes: ResourceNode[]): DecoratedResourceNode[] {
  return nodes.map(({ children, ...node }) => ({
    ...node,
    selectionDisabled: nodeDisabled(node),
    ...(children ? { children: decorateTree(children) } : {}),
  }))
}

const decoratedResources = computed(() => decorateTree(visibleResources.value))

function flattenNodes(nodes: ResourceNode[]): ResourceNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children ?? [])])
}

function normalizeIds(ids: Iterable<number>): number[] {
  return [...new Set(ids)].sort((left, right) => left - right)
}

const activeExpandableNodeIds = computed(() =>
  flattenNodes(activeResources.value)
    .filter((node) => Boolean(node.children?.length))
    .map((node) => node.id),
)
const visibleExpandableNodeIds = computed(() =>
  flattenNodes(visibleResources.value)
    .filter((node) => Boolean(node.children?.length))
    .map((node) => node.id),
)
const activeExpandedKeys = computed(() =>
  normalizedTreeKeyword.value
    ? visibleExpandableNodeIds.value
    : (expandedIdsBySystem.value[activeSystemId.value ?? 0] ?? activeExpandableNodeIds.value),
)
const uncoveredParentCount = computed(() => {
  if (props.subjectType !== 'role') return 0
  const selectedIds = new Set(props.selectedResourceIds)
  return Object.values(props.resourcesBySystem)
    .flatMap(flattenNodes)
    .filter(
      (node) =>
        selectedIds.has(node.id) &&
        (node.resourceType === 'MENU' || node.resourceType === 'PAGE') &&
        !flattenNodes(node.children ?? []).some(
          (descendant) => descendant.resourceType === 'FUNCTION' && selectedIds.has(descendant.id),
        ),
    ).length
})

async function preserveTreeScroll(action: () => void) {
  const scrollTop = treeScrollRef.value?.scrollTop ?? 0
  action()
  await nextTick()
  if (treeScrollRef.value) treeScrollRef.value.scrollTop = scrollTop
}

function syncCheckedKeys(ids: number[]) {
  void preserveTreeScroll(() => treeRef.value?.setCheckedKeys(ids, false))
}

function findNodeById(nodes: ResourceNode[], nodeId: number): ResourceNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) return node
    const child = findNodeById(node.children ?? [], nodeId)
    if (child) return child
  }
  return undefined
}

function handleCheck(node: DecoratedResourceNode, state: { checkedKeys: Array<string | number> }) {
  if (!effectiveCanEdit.value) return
  const checked = state.checkedKeys.map(Number).includes(node.id)
  const nextIds = new Set(props.selectedResourceIds)
  const sourceNode = findNodeById(activeResources.value, node.id) ?? node
  const affectedNodes = [sourceNode, ...flattenNodes(sourceNode.children ?? [])].filter(
    (item) => !nodeDisabled(item),
  )

  affectedNodes.forEach((item) => {
    if (checked) nextIds.add(item.id)
    else nextIds.delete(item.id)
  })

  const ids = normalizeIds(nextIds)
  syncCheckedKeys(ids)
  emit('update:selectedResourceIds', ids)
  emit(
    'action',
    affectedNodes.length > 1
      ? `${checked ? '已选择' : '已取消'}该资源及 ${affectedNodes.length - 1} 项下级权限，尚未保存`
      : `${checked ? '已选择' : '已取消'}该资源，当前共选择 ${ids.length} 项，尚未保存`,
  )
}

function updateExpandedNode(nodeId: number, expanded: boolean) {
  if (normalizedTreeKeyword.value) return
  const systemId = activeSystemId.value
  if (!systemId) return
  const nextIds = new Set(activeExpandedKeys.value)
  if (expanded) nextIds.add(nodeId)
  else nextIds.delete(nodeId)
  expandedIdsBySystem.value = {
    ...expandedIdsBySystem.value,
    [systemId]: normalizeIds(nextIds),
  }
}

function setAllExpanded(expanded: boolean) {
  const systemId = activeSystemId.value
  if (!systemId) return
  const expandableNodeIds = normalizedTreeKeyword.value
    ? visibleExpandableNodeIds.value
    : activeExpandableNodeIds.value
  if (!normalizedTreeKeyword.value) {
    expandedIdsBySystem.value = {
      ...expandedIdsBySystem.value,
      [systemId]: expanded ? expandableNodeIds : [],
    }
  }
  void preserveTreeScroll(() => {
    expandableNodeIds.forEach((id) => {
      const node = treeRef.value?.getNode(id)
      if (node) node.expanded = expanded
    })
  })
  emit('action', expanded ? '已展开当前系统全部资源' : '已收起当前系统全部资源')
}

function selectSystem(systemId: number) {
  const currentSystemId = activeSystemId.value
  if (currentSystemId && treeScrollRef.value) {
    scrollTopBySystem.set(currentSystemId, treeScrollRef.value.scrollTop)
  }
  activeSystemId.value = systemId
  selectedResource.value = undefined
}

async function restoreActiveTreeState() {
  const systemId = activeSystemId.value
  if (!systemId) return
  await nextTick()
  treeRef.value?.setCheckedKeys(props.selectedResourceIds, false)
  const expandedIds = new Set(activeExpandedKeys.value)
  visibleExpandableNodeIds.value.forEach((id) => {
    const node = treeRef.value?.getNode(id)
    if (node) node.expanded = expandedIds.has(id)
  })
  await nextTick()
  if (treeScrollRef.value) {
    treeScrollRef.value.scrollTop = normalizedTreeKeyword.value
      ? 0
      : (scrollTopBySystem.get(systemId) ?? 0)
  }
}

function clearTreeSearch() {
  treeKeyword.value = ''
}

function sourceLabel(node: ResourceNode) {
  if (props.subjectType === 'member' || props.subjectType === 'user') {
    if (node.resourceType !== 'FUNCTION') return '导航层级'
    return props.selectedResourceIds.includes(node.id) || node.sourceRoles?.length
      ? '角色授予'
      : '未授予'
  }
  if (props.selectedResourceIds.includes(node.id)) return '已选择'
  if (node.permissionSource === 'navigation') return '仅导航'
  return '未授权'
}

function sourceTone(node: ResourceNode) {
  if (!node.isCurrentlyEffective) return 'warning' as const
  if (props.subjectType === 'member' || props.subjectType === 'user') {
    return node.resourceType === 'FUNCTION' &&
      (props.selectedResourceIds.includes(node.id) || Boolean(node.sourceRoles?.length))
      ? ('success' as const)
      : ('info' as const)
  }
  if (props.selectedResourceIds.includes(node.id)) return 'success' as const
  return 'info' as const
}

function resolvedReadOnlyMessage() {
  if (props.readOnlyMessage) return props.readOnlyMessage
  if (props.subjectType === 'user') return '用户功能权限为跨 Tenant 有效角色的聚合结果，只能查看。'
  if (props.subjectType === 'member') return '用户有效功能权限只读展示；权限来源于当前有效角色。'
  return '当前账号缺少保存角色功能权限的 Function，只能查看。'
}

watch(
  () => props.systems,
  (systems) => {
    if (!systems.some((item) => item.id === activeSystemId.value)) {
      activeSystemId.value = systems.find((item) => item.status === 'ACTIVE')?.id ?? systems[0]?.id
    }
  },
)

watch(
  () => props.selectedResourceIds,
  (ids) => syncCheckedKeys(ids),
  { flush: 'post' },
)

watch(
  normalizedTreeKeyword,
  (keyword, previousKeyword) => {
    const systemId = activeSystemId.value
    if (keyword && !previousKeyword && systemId && treeScrollRef.value) {
      scrollTopBySystem.set(systemId, treeScrollRef.value.scrollTop)
    }
    if (
      selectedResource.value &&
      !flattenNodes(visibleResources.value).some((node) => node.id === selectedResource.value?.id)
    ) {
      selectedResource.value = undefined
    }
  },
  { flush: 'sync' },
)

watch([activeSystemId, activeResources, normalizedTreeKeyword], restoreActiveTreeState, {
  flush: 'post',
})
</script>

<template>
  <section
    class="function-permission-panel"
    :data-subject-type="subjectType"
    :data-can-edit="effectiveCanEdit"
    data-function-permission-panel
  >
    <section v-if="subjectType === 'role'" class="permission-legend" aria-label="资源树说明">
      <span>勾选需要授予该角色的资源；勾选父资源会批量选择当前全部下级。</span>
      <small>批量选择后仍可逐项取消；当前无效资源不可选择。</small>
    </section>

    <WorkspacePageTemplate aside-width="248px">
      <template #aside>
        <section class="permission-systems" aria-labelledby="permission-system-title">
          <header>
            <h2 id="permission-system-title">系统分组</h2>
            <span>{{ systems.length }} 个</span>
          </header>
          <button
            v-for="system in systems"
            :key="system.id"
            type="button"
            :class="{ 'permission-system--active': activeSystemId === system.id }"
            @click="selectSystem(system.id)"
          >
            <Icon :icon="system.icon" width="19" aria-hidden="true" />
            <span
              ><strong>{{ system.appName }}</strong
              ><small>{{ system.appCode }}</small></span
            >
            <StatusTag
              :label="system.status === 'ACTIVE' ? '启用' : '停用'"
              :tone="system.status === 'ACTIVE' ? 'success' : 'info'"
            />
          </button>
        </section>
      </template>

      <div class="function-workspace">
        <section class="permission-tree-panel" aria-labelledby="permission-tree-title">
          <header>
            <div>
              <h2 id="permission-tree-title">
                {{ systems.find((item) => item.id === activeSystemId)?.appName || '功能权限' }}资源
              </h2>
              <span>{{
                effectiveCanEdit ? '勾选需要授予该角色的资源' : '选择资源名称可查看权限来源'
              }}</span>
            </div>
            <div class="permission-tree-panel__actions">
              <el-button-group v-if="subjectType === 'role'" aria-label="资源树展开控制">
                <el-button size="small" @click="setAllExpanded(true)">
                  <Icon icon="mdi:chevron-down" width="16" aria-hidden="true" />展开全部
                </el-button>
                <el-button size="small" @click="setAllExpanded(false)">
                  <Icon icon="mdi:chevron-up" width="16" aria-hidden="true" />收起全部
                </el-button>
              </el-button-group>
              <StatusTag v-if="!effectiveCanEdit" label="只读" tone="warning" />
            </div>
          </header>
          <el-input
            v-model="treeKeyword"
            class="permission-tree-search"
            clearable
            aria-label="搜索资源树"
            placeholder="搜索当前 App 的资源名称、权限标识或 API Path"
            :disabled="state !== 'ready'"
          >
            <template #prefix><Icon icon="mdi:magnify" width="18" aria-hidden="true" /></template>
          </el-input>
          <el-alert
            v-if="!effectiveCanEdit"
            :title="resolvedReadOnlyMessage()"
            type="warning"
            :closable="false"
            show-icon
          />
          <el-alert
            v-if="effectiveCanEdit && uncoveredParentCount"
            :title="`有 ${uncoveredParentCount} 个已授权菜单或页面未授权任何下级 Function，相关接口操作仍可能返回 403。`"
            type="warning"
            :closable="false"
            show-icon
          />
          <div v-if="state === 'loading'" class="function-state">
            <el-icon class="is-loading"><Icon icon="mdi:refresh" /></el-icon>正在加载权限资源
          </div>
          <el-result
            v-else-if="state === 'retryable-error'"
            icon="error"
            title="权限树加载失败"
            sub-title="未使用旧结果推断当前权限"
            ><template #extra
              ><el-button type="primary" @click="emit('retry')">重新加载</el-button></template
            ></el-result
          >
          <el-empty
            v-else-if="state === 'empty' || !activeResources.length"
            :description="
              subjectType === 'user'
                ? '该用户当前未通过有效角色获得功能权限'
                : subjectType === 'member'
                  ? '该用户当前没有通过角色获得 Function 权限'
                  : '该角色暂无可配置的功能权限资源'
            "
          />
          <el-empty
            v-else-if="normalizedTreeKeyword && !visibleResources.length"
            description="当前 App 中未找到匹配资源"
          >
            <el-button type="primary" plain @click="clearTreeSearch">清空搜索</el-button>
          </el-empty>
          <div v-else ref="treeScrollRef" class="permission-tree-scroll">
            <el-tree
              :key="`${activeSystemId ?? 0}:${normalizedTreeKeyword}`"
              ref="treeRef"
              class="permission-tree"
              :data="decoratedResources"
              :props="treeProps"
              node-key="id"
              :show-checkbox="subjectType === 'role'"
              check-strictly
              :auto-expand-parent="false"
              :expand-on-click-node="false"
              :default-expanded-keys="activeExpandedKeys"
              :default-checked-keys="selectedResourceIds"
              @check="handleCheck"
              @node-click="selectedResource = $event"
              @node-expand="updateExpandedNode($event.id, true)"
              @node-collapse="updateExpandedNode($event.id, false)"
            >
              <template #default="{ data }">
                <div class="permission-node">
                  <span>{{ data.resourceName }}</span>
                </div>
              </template>
            </el-tree>
          </div>
        </section>

        <aside class="permission-inspector" aria-labelledby="permission-detail-title">
          <template v-if="selectedResource">
            <div>
              <h2 id="permission-detail-title">{{ selectedResource.resourceName }}</h2>
              <code>{{ selectedResource.resourceCode }}</code>
            </div>
            <div class="permission-inspector__tags">
              <StatusTag
                :label="sourceLabel(selectedResource)"
                :tone="sourceTone(selectedResource)"
              /><StatusTag :label="selectedResource.resourceType" tone="info" />
            </div>
            <el-alert
              v-if="selectedResource.invalidReason"
              :title="selectedResource.invalidReason"
              type="warning"
              :closable="false"
              show-icon
            />
            <dl>
              <div>
                <dt>权限标识</dt>
                <dd>{{ selectedResource.permissionCode || '—' }}</dd>
              </div>
              <div v-if="selectedResource.apiPath">
                <dt>接口路径</dt>
                <dd>
                  <code
                    >{{ selectedResource.httpMethod || '—' }} {{ selectedResource.apiPath }}</code
                  >
                </dd>
              </div>
              <div v-if="selectedResource.resourceType === 'MENU'">
                <dt>导航可见</dt>
                <dd>{{ selectedResource.isVisible ? '显示' : '隐藏' }}</dd>
              </div>
              <div v-if="selectedResource.sourceRoles?.length" class="permission-source-roles">
                <dt>来源角色</dt>
                <dd>
                  <span
                    v-for="role in selectedResource.sourceRoles"
                    :key="`${role.tenantId}:${role.id}`"
                  >
                    <strong>{{ role.tenantCode }} · {{ role.roleName }}</strong>
                    <small>{{ role.tenantCode }} · {{ role.roleCode }}</small>
                  </span>
                </dd>
              </div>
              <div v-else-if="selectedResource.sourceRoleNames?.length">
                <dt>来源角色</dt>
                <dd>{{ selectedResource.sourceRoleNames.join('、') }}</dd>
              </div>
              <div>
                <dt>版本</dt>
                <dd>{{ selectedResource.version || '—' }}</dd>
              </div>
            </dl>
            <p>{{ selectedResource.remarks || '暂无资源备注。' }}</p>
          </template>
          <el-empty v-else description="选择节点查看权限来源与约束" />
        </aside>
      </div>
    </WorkspacePageTemplate>
  </section>
</template>

<style scoped lang="scss">
.function-permission-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-4);
  min-width: 0;
  min-height: 0;
}
.permission-legend {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  min-height: var(--spacing-12);
  padding: 0 var(--spacing-4);
  color: var(--text-regular);
  background: var(--background-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
}
.permission-legend > span {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  white-space: nowrap;
}
.permission-legend small {
  margin-left: auto;
  color: var(--text-secondary);
}
.permission-systems {
  display: grid;
  align-content: start;
  gap: var(--spacing-2);
  height: 100%;
  padding: var(--spacing-4);
}
.permission-systems header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-2);
}
.permission-systems h2,
.permission-tree-panel h2,
.permission-inspector h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-md);
}
.permission-systems header span,
.permission-tree-panel header span {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}
.permission-systems button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  color: var(--text-regular);
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-default);
  cursor: pointer;
}
.permission-systems button:hover {
  background: var(--background-muted);
}
.permission-systems button:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 1px;
}
.permission-systems button.permission-system--active {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}
.permission-systems strong,
.permission-systems small {
  display: block;
}
.permission-systems small {
  color: var(--text-secondary);
}
.function-workspace {
  display: grid;
  grid-template-columns: minmax(480px, 1.35fr) minmax(300px, 0.65fr);
  height: 100%;
  min-height: 0;
}
.permission-tree-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  min-width: 0;
  min-height: 0;
  padding: var(--spacing-4);
}
.permission-tree-panel > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
}
.permission-tree-panel__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}
.permission-tree-panel__actions :deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
}
.permission-tree-search {
  flex: 0 0 auto;
}
.permission-tree-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.permission-tree {
  min-width: 0;
}
.permission-tree :deep(.el-tree-node__content) {
  height: auto;
  min-height: var(--size-control);
  padding-block: var(--spacing-1);
}
.permission-node {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}
.permission-node > span {
  flex: 1;
  min-width: 0;
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: normal;
}
.permission-inspector {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  min-width: 0;
  padding: var(--spacing-5);
  overflow: auto;
  background: var(--background-muted);
  border-left: 1px solid var(--border-default);
}
.permission-inspector code {
  color: var(--text-secondary);
  font-family: var(--font-family);
}
.permission-inspector__tags {
  display: flex;
  gap: var(--spacing-2);
}
.permission-inspector dl {
  display: grid;
  gap: var(--spacing-2);
  margin: 0;
}
.permission-inspector dl div {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  background: var(--background-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-default);
}
.permission-inspector dt {
  color: var(--text-secondary);
}
.permission-inspector dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.permission-source-roles dd,
.permission-source-roles dd span {
  display: grid;
  gap: var(--spacing-1);
}
.permission-source-roles dd span + span {
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--border-light);
}
.permission-source-roles dd small {
  color: var(--text-secondary);
}
.permission-inspector p {
  color: var(--text-regular);
  line-height: 1.7;
}
.function-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  min-height: calc(var(--spacing-12) * 3);
  color: var(--text-secondary);
}
@media (max-width: 1500px) {
  .permission-legend small {
    display: none;
  }
  .function-workspace {
    grid-template-columns: minmax(430px, 1.2fr) minmax(280px, 0.8fr);
  }
}
</style>
