<script setup lang="ts">
import type { EntityId } from '@shared/types/entityId'
import { resourceElementAttributes } from '@shared/services/resourceElement'
import { roleAuthorizationElements } from '../iam-resource.registry'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import WorkspacePageTemplate from '@shared/components/page-templates/WorkspacePageTemplate.vue'
import PermissionAppNavigator from './PermissionAppNavigator.vue'
import { flattenPermissionNodes, selectPermission } from '../adapters/permissionSelection'
import { setFormUnsaved } from '@shared/services/unsavedNavigation'
import PermissionHierarchyInspector from './PermissionHierarchyInspector.vue'
import PermissionTree from './PermissionTree.vue'
import type {
  PermissionTreeNode,
  PermissionGovernanceApp,
  PermissionGovernancePreviewState,
  PermissionRoleRecord,
} from '../types/permissionGovernance'

const props = defineProps<{
  apps: PermissionGovernanceApp[]
  permissionTreeByApp: Record<string, PermissionTreeNode[]>
  role: PermissionRoleRecord
  state: PermissionGovernancePreviewState
  back?: () => void
  savePermissions?: (role: PermissionRoleRecord, permissionIds: EntityId[]) => Promise<void>
}>()

const emit = defineEmits<{ action: [message: string]; retry: [] }>()

const availableApps = computed(() =>
  props.apps.filter((app) => Boolean(props.permissionTreeByApp[app.appCode]?.length)),
)
const activeAppCode = ref(availableApps.value[0]?.appCode ?? '')
const selectedNodeKey = ref('')
const baselineKeys = ref(props.role.permissionIds.map((id) => `permission:${id}`))
const checkedNodeKeys = ref([...baselineKeys.value])
const confirmVisible = ref(false)
const submitting = ref(false)
const selectionFeedback = ref('')
const unsavedOwner = Symbol('direct-role-authorization')
onBeforeUnmount(() => setFormUnsaved(unsavedOwner, false))

const activeNodes = computed(() => props.permissionTreeByApp[activeAppCode.value] ?? [])
const checkedSet = computed(() => new Set(checkedNodeKeys.value))
const baselineSet = computed(() => new Set(baselineKeys.value))
const addedCount = computed(
  () => checkedNodeKeys.value.filter((key) => !baselineSet.value.has(key)).length,
)
const removedCount = computed(
  () => baselineKeys.value.filter((key) => !checkedSet.value.has(key)).length,
)
const dirty = computed(() => addedCount.value > 0 || removedCount.value > 0)
watch(dirty, (value) => setFormUnsaved(unsavedOwner, value))
function togglePermission(node: PermissionTreeNode, checked: boolean) {
  const result = selectPermission(activeNodes.value, checkedNodeKeys.value, node.nodeKey, checked)
  checkedNodeKeys.value = result.keys
  selectionFeedback.value = result.defaultAdded.length
    ? '默认新增 ' +
      result.defaultAdded.length +
      ' 项：' +
      result.defaultAdded.map((n) => n.name).join('、')
    : checked
      ? '已勾选 ' + node.name
      : '仅取消 ' + node.name + '，下级选择保持不变'
}
function batchPermissions(keys: string[], checked: boolean) {
  const next = new Set(checkedNodeKeys.value)
  let count = 0
  for (const key of keys) {
    if (checked && !next.has(key)) {
      next.add(key)
      count++
    }
    if (!checked && next.has(key)) {
      next.delete(key)
      count++
    }
  }
  checkedNodeKeys.value = [...next]
  selectionFeedback.value =
    (checked ? '本组新增 ' : '本组清除 ') + count + ' 项权限；仅修改草稿，保存前可核对'
}
const readOnlyLabel = computed(() => {
  if (props.role.status !== 'ACTIVE') return '角色已停用'
  return '当前账号无角色授权保存权限'
})

function findNode(nodes: PermissionTreeNode[], key: string): PermissionTreeNode | undefined {
  for (const node of nodes) {
    if (node.nodeKey === key) return node
    const child = findNode(node.children, key)
    if (child) return child
  }
  return undefined
}

const selectedNode = computed(() => findNode(activeNodes.value, selectedNodeKey.value))
const allPermissionNodes = computed(() =>
  Object.values(props.permissionTreeByApp).flatMap((nodes) =>
    flattenPermissionNodes(nodes).filter((node) => node.nodeType === 'PERMISSION'),
  ),
)
const addedNodes = computed(() =>
  allPermissionNodes.value.filter(
    (node) => checkedSet.value.has(node.nodeKey) && !baselineSet.value.has(node.nodeKey),
  ),
)
const removedNodes = computed(() =>
  allPermissionNodes.value.filter(
    (node) => baselineSet.value.has(node.nodeKey) && !checkedSet.value.has(node.nodeKey),
  ),
)

function switchApp(appCode: string) {
  activeAppCode.value = appCode
  selectedNodeKey.value = ''
}

function restoreChanges() {
  checkedNodeKeys.value = [...baselineKeys.value]
  emit('action', '已恢复为角色最近一次权限绑定结果')
}

function permissionIdsFromKeys(keys: string[]) {
  return keys
    .map((key) => {
      for (const nodes of Object.values(props.permissionTreeByApp)) {
        const node = findNode(nodes, key)
        if (node?.permissionId) return node.permissionId
      }
      return undefined
    })
    .filter((id): id is EntityId => Boolean(id))
}

async function requestReload() {
  if (submitting.value) return
  if (dirty.value) {
    try {
      await ElMessageBox.confirm(
        '重新加载会放弃未保存的选择，并以服务端明确授权为准。',
        '重新加载角色授权？',
        { confirmButtonText: '放弃并重新加载', cancelButtonText: '保留修改', type: 'warning' },
      )
    } catch {
      return
    }
  }
  emit('retry')
}
function requestSave() {
  if (
    !props.role.canMaintain ||
    !['ready', 'no-binding'].includes(props.state) ||
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
  const added = addedCount.value
  const removed = removedCount.value

  if (props.savePermissions) {
    submitting.value = true
    try {
      await props.savePermissions(props.role, permissionIdsFromKeys(checkedNodeKeys.value))
    } catch {
      confirmVisible.value = false
      return
    } finally {
      submitting.value = false
    }
  }

  baselineKeys.value = [...checkedNodeKeys.value]
  confirmVisible.value = false
  emit('action', `角色授权已保存：新增 ${added} 个权限，移除 ${removed} 个权限`)
}

watch(
  () => props.role,
  (role) => {
    baselineKeys.value = role.permissionIds.map((id) => `permission:${id}`)
    checkedNodeKeys.value = [...baselineKeys.value]
    selectedNodeKey.value = ''
    selectionFeedback.value = ''
    confirmVisible.value = false
  },
)

watch(availableApps, (apps) => {
  if (!apps.some((app) => app.appCode === activeAppCode.value)) {
    activeAppCode.value = apps[0]?.appCode ?? ''
  }
})
</script>

<template>
  <AppPage
    :resource_element="roleAuthorizationElements.page"
    :scrollable="false"
    class="role-authorization-page"
  >
    <PageHeader title="角色授权" description="直接选择 Permission；层级不产生继承，资源仅供查看">
      <template #actions>
        <el-button v-if="back" v-resource-element="roleAuthorizationElements.local" @click="back">
          <Icon icon="mdi:chevron-left" width="16" aria-hidden="true" />返回角色列表
        </el-button>
        <el-button
          v-resource-element="roleAuthorizationElements.local"
          :disabled="!dirty || submitting"
          @click="restoreChanges"
          >放弃更改</el-button
        >
        <el-button
          v-if="role.canMaintain"
          v-resource-element="roleAuthorizationElements.save"
          type="primary"
          :disabled="!dirty || submitting || !['ready', 'no-binding'].includes(state)"
          :loading="submitting"
          @click="requestSave"
        >
          保存角色授权
        </el-button>
      </template>
    </PageHeader>

    <section class="role-authorization-context" aria-label="当前角色">
      <div class="role-authorization-context__identity">
        <span><Icon icon="mdi:account-key-outline" width="20" aria-hidden="true" /></span>
        <div>
          <strong>{{ role.roleName }}</strong>
          <small>{{ role.roleCode }} · {{ role.tenantName }}</small>
        </div>
      </div>
      <div class="role-authorization-context__metrics">
        <span
          ><strong>{{ checkedNodeKeys.length }}</strong
          ><small>已选权限</small></span
        >
        <span
          ><strong>{{ addedCount }}</strong
          ><small>待新增</small></span
        >
        <span
          ><strong>{{ removedCount }}</strong
          ><small>待移除</small></span
        >
      </div>
      <div class="role-authorization-context__status">
        <StatusTag
          :label="role.status === 'ACTIVE' ? '角色启用' : '角色停用'"
          :tone="role.status === 'ACTIVE' ? 'success' : 'info'"
        />
        <StatusTag v-if="!role.canMaintain" :label="readOnlyLabel" tone="warning" />
        <StatusTag v-else-if="dirty" label="有未保存更改" tone="warning" />
      </div>
    </section>

    <el-alert
      v-if="state === 'version-conflict'"
      title="角色版本已变化，本地权限选择已保留。请重新加载最新结果后核对再保存。"
      type="warning"
      :closable="false"
      show-icon
    >
      <template #default>
        <el-button
          v-resource-element="roleAuthorizationElements.query"
          link
          type="primary"
          @click="requestReload"
          >重新加载并核对</el-button
        >
      </template>
    </el-alert>

    <el-alert
      v-else-if="state === 'unknown-result'"
      title="保存结果尚未确认。本地权限选择已保留，请勿再次点击保存。"
      type="warning"
      :closable="false"
      show-icon
    >
      <template #default>
        <div class="role-authorization-recovery">
          <span>保存结果未知，请先回读核对。当前业务端不提供 RequestStatus，禁止盲目重提。</span>
          <el-button
            v-resource-element="roleAuthorizationElements.query"
            link
            type="primary"
            @click="requestReload"
            >刷新确认结果</el-button
          >
        </div>
      </template>
    </el-alert>

    <el-alert
      v-else-if="state === 'no-binding'"
      title="新角色默认不绑定任何权限，请按需显式选择后再保存。"
      type="info"
      :closable="false"
      show-icon
    />

    <p v-if="selectionFeedback" role="status" class="role-authorization-selection-feedback">
      {{ selectionFeedback }}
    </p>
    <WorkspacePageTemplate aside-width="224px" scroll-mode="contained">
      <template #aside>
        <PermissionAppNavigator
          v-bind="resourceElementAttributes(roleAuthorizationElements.local)"
          :apps="availableApps"
          :resource-tree-by-app="permissionTreeByApp"
          :active-app-code="activeAppCode"
          :included-instance-keys="checkedNodeKeys"
          count-node-type="PERMISSION"
          title="所属 App"
          @select="switchApp"
        />
      </template>

      <div class="role-authorization-workspace">
        <section class="role-authorization-workspace__tree" aria-labelledby="role-package-title">
          <header>
            <div>
              <h2 id="role-package-title">
                {{ apps.find((app) => app.appCode === activeAppCode)?.appName || '权限' }}
              </h2>
              <small>勾选仅表示当前权限；默认联动可取消，资源仅供查看</small>
            </div>
            <StatusTag label="直接授权" tone="primary" />
          </header>
          <PermissionTree
            v-bind="resourceElementAttributes(roleAuthorizationElements.query)"
            :scope-key="`role:${role.id}:${activeAppCode}`"
            :nodes="activeNodes"
            :state="state"
            checkable-type="PERMISSION"
            :readonly="!role.canMaintain"
            :checked-node-keys="checkedNodeKeys"
            :selected-node-key="selectedNodeKey"
            empty-description="当前 App 暂无可分配权限"
            search-placeholder="搜索权限、权限名称或 API Path"
            @select="selectedNodeKey = $event.nodeKey"
            @toggle="togglePermission"
            @batch="batchPermissions"
            @action="emit('action', $event)"
            @retry="requestReload"
          />
        </section>

        <PermissionHierarchyInspector :node="selectedNode" />
      </div>
    </WorkspacePageTemplate>

    <el-dialog
      v-model="confirmVisible"
      v-bind="resourceElementAttributes(roleAuthorizationElements.save)"
      title="确认保存角色授权"
      width="540"
      append-to-body
      :close-on-click-modal="!submitting"
      :close-on-press-escape="!submitting"
      :show-close="!submitting"
    >
      <div class="role-authorization-confirm">
        <span
          ><strong>{{ checkedNodeKeys.length }}</strong
          ><small>保存后权限</small></span
        >
        <span
          ><strong>{{ addedCount }}</strong
          ><small>新增</small></span
        >
        <span
          ><strong>{{ removedCount }}</strong
          ><small>移除</small></span
        >
      </div>
      <dl class="role-authorization-confirm__details">
        <div>
          <dt>角色版本</dt>
          <dd>{{ role.version }}</dd>
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
          v-resource-element="roleAuthorizationElements.local"
          :disabled="submitting"
          @click="confirmVisible = false"
          >继续检查</el-button
        >
        <el-button
          v-resource-element="roleAuthorizationElements.save"
          type="primary"
          :loading="submitting"
          @click="confirmSave"
          >确认保存</el-button
        >
      </template>
    </el-dialog>
  </AppPage>
</template>

<style scoped lang="scss">
.role-authorization-page {
  min-height: 0;
}

.role-authorization-context {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--background-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
}

.role-authorization-context__identity,
.role-authorization-context__metrics,
.role-authorization-context__status {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.role-authorization-context__identity > span {
  display: grid;
  width: var(--spacing-8);
  height: var(--spacing-8);
  place-items: center;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-small);
}

.role-authorization-context__identity > div,
.role-authorization-context__metrics span {
  display: grid;
  gap: var(--spacing-1);
}

.role-authorization-context__identity small,
.role-authorization-context__metrics small,
.role-authorization-workspace small {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.role-authorization-context__metrics {
  padding-inline: var(--spacing-3);
  border-right: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
}

.role-authorization-context__metrics span {
  min-width: var(--spacing-12);
  text-align: center;
}

.role-authorization-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.42fr);
  height: 100%;
  min-height: 0;
}

.role-authorization-workspace__tree {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  min-width: 0;
  min-height: 0;
  padding: var(--spacing-3);
}

.role-authorization-workspace__tree > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.role-authorization-workspace__tree > header > div {
  display: grid;
  gap: var(--spacing-1);
}

.role-authorization-workspace h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

.role-authorization-selection-feedback {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.role-authorization-recovery {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
}

.role-authorization-confirm {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-2);
}

.role-authorization-confirm span {
  display: grid;
  gap: var(--spacing-1);
  padding: var(--spacing-2);
  text-align: center;
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-small);
}

.role-authorization-confirm strong {
  color: var(--color-primary);
  font-size: var(--font-size-lg);
}

.role-authorization-confirm small,
.role-authorization-confirm__details dt {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.role-authorization-confirm__details {
  display: grid;
  gap: var(--spacing-1);
  max-height: 128px;
  padding: var(--spacing-2);
  margin: var(--spacing-2) 0 0;
  overflow: auto;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-small);
}

.role-authorization-confirm__details > div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: var(--spacing-2);
}

.role-authorization-confirm__details dd {
  margin: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 1450px) {
  .role-authorization-workspace {
    grid-template-columns: minmax(0, 1fr) minmax(248px, 0.38fr);
  }
}
</style>
