<script setup lang="ts">
import type { EntityId } from '@shared/types/entityId'
import { resourceElementAttributes } from '@shared/services/resourceElement'
import { packagePermissionsElements } from '../iam-resource.registry'
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import WorkspacePageTemplate from '@shared/components/page-templates/WorkspacePageTemplate.vue'
import PermissionHierarchyInspector from './PermissionHierarchyInspector.vue'
import PermissionPackageTree from './PermissionPackageTree.vue'
import type {
  PackagePermissionTreeNode,
  PermissionGovernancePreviewState,
  PermissionPackageRecord,
} from '../types/permissionGovernance'

const props = defineProps<{
  permissionTreeByApp: Record<string, PackagePermissionTreeNode[]>
  packageRecord: PermissionPackageRecord
  state: PermissionGovernancePreviewState
  back?: () => void
  savePermissions?: (record: PermissionPackageRecord, permissionIds: EntityId[]) => Promise<void>
}>()

const emit = defineEmits<{
  action: [message: string]
  retry: []
  'retry-save': []
}>()

const selectedNodeKey = ref('')
const baselineKeys = ref(props.packageRecord.permissionIds.map((id) => `permission:${id}`))
const checkedNodeKeys = ref([...baselineKeys.value])
const confirmVisible = ref(false)
const submitting = ref(false)

const activeNodes = computed(() =>
  (props.permissionTreeByApp[props.packageRecord.appCode] ?? []).filter(
    (node) =>
      node.appId === props.packageRecord.appId && node.appCode === props.packageRecord.appCode,
  ),
)
const checkedSet = computed(() => new Set(checkedNodeKeys.value))
const baselineSet = computed(() => new Set(baselineKeys.value))
const addedKeys = computed(() => checkedNodeKeys.value.filter((key) => !baselineSet.value.has(key)))
const removedKeys = computed(() => baselineKeys.value.filter((key) => !checkedSet.value.has(key)))
const dirty = computed(() => addedKeys.value.length > 0 || removedKeys.value.length > 0)
const selectedPermissionCount = computed(() => checkedNodeKeys.value.length)

function findNode(
  nodes: PackagePermissionTreeNode[],
  key: string,
): PackagePermissionTreeNode | undefined {
  for (const node of nodes) {
    if (node.nodeKey === key) return node
    const child = findNode(node.children, key)
    if (child) return child
  }
  return undefined
}

const selectedNode = computed(() => findNode(activeNodes.value, selectedNodeKey.value))
const addedNodes = computed(() =>
  addedKeys.value
    .map((key) => findNode(activeNodes.value, key))
    .filter((node): node is PackagePermissionTreeNode => Boolean(node)),
)
const removedNodes = computed(() =>
  removedKeys.value
    .map((key) => findNode(activeNodes.value, key))
    .filter((node): node is PackagePermissionTreeNode => Boolean(node)),
)

function permissionIdsFromKeys(keys: string[]) {
  return keys
    .map((key) => findNode(activeNodes.value, key))
    .filter((node): node is PackagePermissionTreeNode & { permissionId: EntityId } =>
      Boolean(node?.permissionId),
    )
    .map((node) => node.permissionId)
}

function restoreChanges() {
  checkedNodeKeys.value = [...baselineKeys.value]
  emit('action', '已恢复为权限包最近一次 Permission 配置')
}

function requestSave() {
  if (
    !dirty.value ||
    submitting.value ||
    props.state === 'version-conflict' ||
    props.state === 'unknown-result'
  )
    return
  confirmVisible.value = true
}

async function confirmSave() {
  if (
    !dirty.value ||
    submitting.value ||
    props.state === 'version-conflict' ||
    props.state === 'unknown-result'
  )
    return
  const added = addedKeys.value.length
  const removed = removedKeys.value.length
  const permissionIds = permissionIdsFromKeys(checkedNodeKeys.value)

  if (props.savePermissions) {
    submitting.value = true
    try {
      await props.savePermissions(props.packageRecord, permissionIds)
      baselineKeys.value = [...checkedNodeKeys.value]
      confirmVisible.value = false
    } catch {
      confirmVisible.value = false
      return
    } finally {
      submitting.value = false
    }
  } else {
    baselineKeys.value = [...checkedNodeKeys.value]
    confirmVisible.value = false
  }

  emit('action', `权限包配置已保存：新增 ${added} 个 Permission，移除 ${removed} 个 Permission`)
}

watch(
  () => props.packageRecord,
  (record) => {
    baselineKeys.value = record.permissionIds.map((id) => `permission:${id}`)
    checkedNodeKeys.value = [...baselineKeys.value]
    selectedNodeKey.value = ''
    confirmVisible.value = false
  },
)
</script>

<template>
  <AppPage
    :resource_element="packagePermissionsElements.page"
    :scrollable="false"
    class="permission-package-permissions-page"
  >
    <PageHeader
      title="权限包权限配置"
      description="权限包只选择 Permission；展开后仅查看前端资源与后端 Function"
    >
      <template #actions>
        <el-button v-if="back" v-resource-element="packagePermissionsElements.local" @click="back">
          <Icon icon="mdi:chevron-left" width="16" aria-hidden="true" />返回权限包管理
        </el-button>
        <el-button
          v-resource-element="packagePermissionsElements.local"
          :disabled="!dirty || submitting"
          @click="restoreChanges"
          >放弃更改</el-button
        >
        <el-button
          v-resource-element="packagePermissionsElements.save"
          type="primary"
          :disabled="
            !packageRecord.canMaintain ||
            !dirty ||
            state === 'version-conflict' ||
            state === 'unknown-result'
          "
          :loading="submitting"
          @click="requestSave"
        >
          保存 Permission 配置
        </el-button>
      </template>
    </PageHeader>

    <section class="permission-package-context" aria-label="当前权限包">
      <div class="permission-package-context__identity">
        <span><Icon icon="mdi:shield-key-outline" width="20" aria-hidden="true" /></span>
        <div>
          <strong>{{ packageRecord.packageName }}</strong>
          <small>{{ packageRecord.packageCode }}</small>
        </div>
      </div>
      <div class="permission-package-context__metrics">
        <span
          ><strong>{{ selectedPermissionCount }}</strong
          ><small>已选 Permission</small></span
        >
        <span
          ><strong>{{ addedKeys.length }}</strong
          ><small>待新增</small></span
        >
        <span
          ><strong>{{ removedKeys.length }}</strong
          ><small>待移除</small></span
        >
      </div>
      <div class="permission-package-context__status">
        <StatusTag
          :label="packageRecord.status === 'ACTIVE' ? '权限包启用' : '权限包停用'"
          :tone="packageRecord.status === 'ACTIVE' ? 'success' : 'info'"
        />
        <StatusTag v-if="!packageRecord.canMaintain" label="只读" tone="warning" />
        <StatusTag v-else-if="dirty" label="有未保存更改" tone="warning" />
      </div>
    </section>

    <el-alert
      v-if="state === 'version-conflict'"
      title="权限包版本已变化，本地 Permission 选择已保留。请重新加载最新结果后核对再保存。"
      type="warning"
      :closable="false"
      show-icon
    >
      <template #default>
        <el-button
          v-resource-element="packagePermissionsElements.query"
          link
          type="primary"
          @click="emit('retry')"
          >重新加载并核对</el-button
        >
      </template>
    </el-alert>

    <el-alert
      v-else-if="state === 'unknown-result'"
      title="保存结果尚未确认。本地 Permission 选择已保留，请勿再次点击保存。"
      type="warning"
      :closable="false"
      show-icon
    >
      <template #default>
        <div class="permission-package-recovery">
          <span>可先回读服务端结果，或使用原 request_id 显式重试同一请求。</span>
          <el-button
            v-resource-element="packagePermissionsElements.query"
            link
            type="primary"
            @click="emit('retry')"
            >刷新确认结果</el-button
          >
          <el-button
            v-resource-element="packagePermissionsElements.save"
            link
            type="primary"
            @click="emit('retry-save')"
            >使用原请求标识重试</el-button
          >
        </div>
      </template>
    </el-alert>

    <WorkspacePageTemplate aside-width="232px" scroll-mode="contained">
      <template #aside>
        <aside class="permission-package-summary" aria-label="权限包摘要">
          <dl>
            <div>
              <dt>权限包编码</dt>
              <dd>{{ packageRecord.packageCode }}</dd>
            </div>
            <div>
              <dt>排序</dt>
              <dd>{{ packageRecord.sortOrder }}</dd>
            </div>
            <div>
              <dt>已绑定角色</dt>
              <dd>{{ packageRecord.activeRoleCount ?? packageRecord.boundRoles.length }} 个</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>{{ packageRecord.version }}</dd>
            </div>
          </dl>
          <p>{{ packageRecord.description || '暂无说明' }}</p>
          <el-alert
            title="只有 Permission 节点可选择，Resource 子节点只读。"
            type="info"
            :closable="false"
            show-icon
          />
        </aside>
      </template>

      <div class="permission-package-workspace">
        <section
          class="permission-package-workspace__tree"
          aria-labelledby="package-permission-title"
        >
          <header>
            <div>
              <h2 id="package-permission-title">可选 Permission</h2>
              <small>勾选 Permission；展开节点可核对其前端资源和后端 Function</small>
            </div>
            <StatusTag label="按 Permission 配置" tone="primary" />
          </header>
          <PermissionPackageTree
            v-bind="resourceElementAttributes(packagePermissionsElements.query)"
            :scope-key="`package:${packageRecord.id}:${packageRecord.appId}:${packageRecord.appCode}`"
            :nodes="activeNodes"
            :state="state"
            checkable-type="PERMISSION"
            :readonly="!packageRecord.canMaintain"
            :checked-node-keys="checkedNodeKeys"
            :selected-node-key="selectedNodeKey"
            empty-description="暂无可加入权限包的 Permission"
            search-placeholder="搜索 Permission 名称"
            @select="selectedNodeKey = $event.nodeKey"
            @update:checked-node-keys="checkedNodeKeys = $event"
            @action="emit('action', $event)"
            @retry="emit('retry')"
          />
        </section>

        <PermissionHierarchyInspector :node="selectedNode" :show-app-context="false" />
      </div>
    </WorkspacePageTemplate>

    <el-dialog
      v-model="confirmVisible"
      v-bind="resourceElementAttributes(packagePermissionsElements.save)"
      title="确认保存权限包 Permission"
      width="520"
      append-to-body
    >
      <div class="permission-package-confirm">
        <span
          ><strong>{{ selectedPermissionCount }}</strong
          ><small>保存后 Permission</small></span
        >
        <span
          ><strong>{{ addedKeys.length }}</strong
          ><small>新增</small></span
        >
        <span
          ><strong>{{ removedKeys.length }}</strong
          ><small>移除</small></span
        >
      </div>
      <p>本次只变更权限包包含的 Permission；Permission 内的前端资源和 Function 不会被修改。</p>
      <dl class="permission-package-confirm__details">
        <div>
          <dt>当前版本</dt>
          <dd>{{ packageRecord.version }}</dd>
        </div>
        <div v-if="addedNodes.length">
          <dt>新增</dt>
          <dd>{{ addedNodes.map((node) => node.name).join('、') }}</dd>
        </div>
        <div v-if="removedNodes.length">
          <dt>移除</dt>
          <dd>{{ removedNodes.map((node) => node.name).join('、') }}</dd>
        </div>
      </dl>
      <template #footer>
        <el-button
          v-resource-element="packagePermissionsElements.local"
          :disabled="submitting"
          @click="confirmVisible = false"
          >继续检查</el-button
        >
        <el-button
          v-resource-element="packagePermissionsElements.save"
          type="primary"
          :loading="submitting"
          @click="confirmSave"
        >
          确认保存
        </el-button>
      </template>
    </el-dialog>
  </AppPage>
</template>

<style scoped lang="scss">
.permission-package-permissions-page {
  min-height: 0;
}

.permission-package-context {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--background-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
}

.permission-package-context__identity,
.permission-package-context__metrics,
.permission-package-context__status {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.permission-package-context__identity > span {
  display: grid;
  width: var(--spacing-8);
  height: var(--spacing-8);
  place-items: center;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-small);
}

.permission-package-context__identity > div,
.permission-package-context__metrics span {
  display: grid;
  gap: var(--spacing-1);
}

.permission-package-context small,
.permission-package-summary small,
.permission-package-summary p,
.permission-package-workspace small,
.permission-package-confirm small,
.permission-package-permissions-page :deep(.el-dialog p) {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.permission-package-context__metrics {
  padding-inline: var(--spacing-3);
  border-right: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
}

.permission-package-context__metrics span {
  min-width: var(--spacing-12);
  text-align: center;
}

.permission-package-summary {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  height: 100%;
  min-height: 0;
  padding: var(--spacing-3);
  overflow: auto;
}

.permission-package-summary dl,
.permission-package-summary p {
  margin: 0;
}

.permission-package-summary dl {
  display: grid;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-small);
}

.permission-package-summary dl > div {
  display: grid;
  gap: var(--spacing-1);
  padding: var(--spacing-2);
  border-bottom: 1px solid var(--border-light);
}

.permission-package-summary dl > div:last-child {
  border-bottom: 0;
}

.permission-package-summary dt {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.permission-package-summary dd {
  margin: 0;
  color: var(--text-regular);
  overflow-wrap: anywhere;
}

.permission-package-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.42fr);
  height: 100%;
  min-height: 0;
}

.permission-package-workspace__tree {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  min-width: 0;
  min-height: 0;
  padding: var(--spacing-3);
}

.permission-package-workspace__tree > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.permission-package-workspace__tree > header > div {
  display: grid;
  gap: var(--spacing-1);
}

.permission-package-workspace h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

.permission-package-confirm {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-3);
}

.permission-package-confirm span {
  display: grid;
  gap: var(--spacing-1);
  padding: var(--spacing-3);
  text-align: center;
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-default);
}

.permission-package-confirm strong {
  color: var(--color-primary);
  font-size: var(--font-size-lg);
}

.permission-package-recovery {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
}

.permission-package-confirm__details {
  display: grid;
  gap: var(--spacing-1);
  max-height: 128px;
  padding: var(--spacing-2);
  margin: var(--spacing-2) 0 0;
  overflow: auto;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-small);
}

.permission-package-confirm__details > div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: var(--spacing-2);
}

.permission-package-confirm__details dt {
  color: var(--text-secondary);
}

.permission-package-confirm__details dd {
  margin: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 1450px) {
  .permission-package-workspace {
    grid-template-columns: minmax(0, 1fr) minmax(248px, 0.38fr);
  }
}
</style>
