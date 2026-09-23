<script setup lang="ts">
import { computed, inject, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import { appShellContentContextKey } from '@shared/components/appShellContentContext'
import WorkspacePageTemplate from '@shared/components/page-templates/WorkspacePageTemplate.vue'
import { IAM_PERMISSIONS } from '@shared/constants/iamPermissions'
import OrganizationLeaderSelector from './OrganizationLeaderSelector.vue'
import type { OrganizationLeaderLoader } from '../types/organizationLeader'
import type {
  FoundationPreviewState,
  OrganizationFormValue,
  OrganizationNode,
  TenantOption,
} from '../types/foundation'

const props = defineProps<{
  organizations: OrganizationNode[]
  state: FoundationPreviewState
  tenant: Pick<TenantOption, 'name' | 'code' | 'timezone'>
  tenantId?: number | undefined
  loadLeaderOptions?: OrganizationLeaderLoader | undefined
  save?: (
    mode: 'create' | 'edit',
    value: OrganizationFormValue,
    record: OrganizationNode,
  ) => Promise<void>
  move?: (record: OrganizationNode, newParentId: number | undefined) => Promise<void>
  changeStatus?: (record: OrganizationNode, targetStatus: 'ACTIVE' | 'DISABLED') => Promise<void>
}>()

const emit = defineEmits<{
  action: [message: string]
  retry: []
}>()

const appShellContext = inject(appShellContentContextKey, undefined)

const emptyOrganization: OrganizationNode = {
  id: 0,
  code: '',
  name: '',
  type: '职能部门',
  leader: '',
  status: 'ACTIVE',
  activeMemberCount: 0,
  children: [],
}
const selected = ref<OrganizationNode>(props.organizations[0] ?? emptyOrganization)
const keyword = ref('')
const status = ref('')
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const moveVisible = ref(false)
const confirmVisible = ref(false)
const submitting = ref(false)
const formError = ref('')
const formRecord = ref<OrganizationNode>(emptyOrganization)
const newParentId = ref<number>()
const form = reactive<OrganizationFormValue>({
  parentId: undefined,
  name: '',
  type: '职能部门',
  leaderTenantUserId: undefined,
  sortOrder: 0,
  remarks: '',
})

const treeProps = { children: 'children', label: 'name' }
const treeSelectProps = {
  children: 'children',
  label: 'name',
  value: 'id',
  disabled: 'disabled',
}
type OrganizationSelectNode = OrganizationNode & {
  disabled: boolean
  children: OrganizationSelectNode[]
}

function flattenOrganizations(nodes: OrganizationNode[]): OrganizationNode[] {
  return nodes.flatMap((node) => [node, ...flattenOrganizations(node.children ?? [])])
}
function toOrganizationSelectNodes(nodes: OrganizationNode[]): OrganizationSelectNode[] {
  return nodes.map((node) => ({
    ...node,
    disabled: node.status !== 'ACTIVE',
    children: toOrganizationSelectNodes(node.children ?? []),
  }))
}
const organizationNodes = computed(() => flattenOrganizations(props.organizations))
const organizationSelectNodes = computed(() => toOrganizationSelectNodes(props.organizations))
const selectedPath = computed(() => {
  const path: OrganizationNode[] = []
  const visited = new Set<number>()
  let node: OrganizationNode | undefined = selected.value
  while (node?.id && !visited.has(node.id)) {
    visited.add(node.id)
    path.unshift(node)
    const parentId: number | undefined = node.parentId
    node = organizationNodes.value.find((item) => item.id === parentId)
  }
  return path
})
const breadcrumbPath = computed(() => selectedPath.value.map((node) => node.name).join(' / '))

watch(organizationNodes, (nodes) => {
  selected.value =
    nodes.find((node) => node.id === selected.value.id) ?? nodes[0] ?? emptyOrganization
})

function selectOrganization(node: OrganizationNode) {
  selected.value = node
  emit('action', `已选择组织：${node.name}`)
}

function openForm(mode: 'create' | 'edit', parentId?: number) {
  formMode.value = mode
  formRecord.value = selected.value
  formError.value = ''
  Object.assign(form, {
    parentId:
      mode === 'create'
        ? Number.isFinite(parentId)
          ? parentId
          : undefined
        : selected.value.parentId,
    name: mode === 'create' ? '' : selected.value.name,
    type: mode === 'create' ? '职能部门' : selected.value.type,
    leaderTenantUserId: mode === 'create' ? undefined : selected.value.leaderTenantUserId,
    sortOrder: mode === 'create' ? 0 : (selected.value.sortOrder ?? 0),
    remarks: mode === 'create' ? '' : (selected.value.remarks ?? ''),
  })
  formVisible.value = true
}

async function finishForm() {
  if (submitting.value) return
  formError.value = ''
  if (!form.name.trim()) {
    formError.value = '请填写组织名称。'
    return
  }
  if (
    formMode.value === 'edit' &&
    formRecord.value.status === 'DISABLED' &&
    form.leaderTenantUserId &&
    form.leaderTenantUserId !== formRecord.value.leaderTenantUserId
  ) {
    formError.value = '停用组织不能设置新的负责人，请保留或清空原负责人。'
    return
  }
  if (!props.save) {
    formVisible.value = false
    emit('action', formMode.value === 'create' ? '组织创建候选已保存' : '组织编辑候选已保存')
    return
  }
  submitting.value = true
  try {
    await props.save(formMode.value, { ...form }, formRecord.value)
    formVisible.value = false
  } catch {
    formError.value = '组织保存失败，填写内容已保留。请确认负责人仍有效后重试。'
  } finally {
    submitting.value = false
  }
}

async function finishMove() {
  if (submitting.value) return
  if (!props.move) {
    moveVisible.value = false
    emit('action', '组织子树候选移动已确认')
    return
  }
  submitting.value = true
  try {
    await props.move(selected.value, newParentId.value)
    moveVisible.value = false
  } finally {
    submitting.value = false
  }
}

async function confirmStatusChange() {
  if (submitting.value) return
  if (!props.changeStatus) {
    confirmVisible.value = false
    emit('action', '组织状态候选操作已确认')
    return
  }
  submitting.value = true
  try {
    await props.changeStatus(
      selected.value,
      selected.value.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
    )
    confirmVisible.value = false
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppPage :scrollable="false" class="organization-page">
    <PageHeader title="组织管理" description="在当前 Tenant 内维护组织树、负责人和层级关系">
      <template #actions>
        <el-button @click="emit('retry')">
          <Icon icon="mdi:refresh" width="18" aria-hidden="true" />
          刷新组织树
        </el-button>
      </template>
    </PageHeader>

    <section
      v-if="!appShellContext"
      class="organization-context surface"
      aria-label="当前 Tenant 上下文"
    >
      <span class="organization-context__label">当前 Tenant</span>
      <strong>{{ tenant.name || '当前租户' }}</strong>
      <span>{{ tenant.code }}</span>
      <i aria-hidden="true"></i>
      <span>{{ tenant.timezone || '—' }}</span>
    </section>

    <WorkspacePageTemplate aside-width="320px">
      <template #aside>
        <section class="organization-tree" aria-labelledby="organization-tree-title">
          <header>
            <div>
              <h2 id="organization-tree-title">组织架构</h2>
              <span>共 {{ organizationNodes.length }} 个组织节点</span>
            </div>
            <el-button
              v-permission="IAM_PERMISSIONS.organizations.create"
              class="organization-tree__add"
              type="primary"
              plain
              @click="openForm('create', undefined)"
            >
              <Icon icon="mdi:plus" width="18" aria-hidden="true" />
              创建顶级组织
            </el-button>
          </header>

          <div class="organization-tree__filters">
            <el-input v-model="keyword" clearable placeholder="搜索组织编码或名称">
              <template #prefix><Icon icon="mdi:magnify" width="18" aria-hidden="true" /></template>
            </el-input>
            <el-select v-model="status" clearable placeholder="全部状态">
              <el-option label="启用" value="ACTIVE" />
              <el-option label="停用" value="DISABLED" />
            </el-select>
          </div>

          <div v-if="state === 'loading'" class="organization-tree__state">
            <el-icon class="is-loading"><Icon icon="mdi:refresh" width="20" /></el-icon>
            <span>正在加载组织树</span>
          </div>
          <el-result
            v-else-if="state === 'retryable-error'"
            icon="error"
            title="加载失败"
            sub-title="组织树未更新"
          >
            <template #extra
              ><el-button link type="primary" @click="emit('retry')">重试</el-button></template
            >
          </el-result>
          <el-empty v-else-if="state === 'empty'" description="当前 Tenant 暂无组织" />
          <el-tree
            v-else
            class="organization-tree__control"
            :data="organizations"
            :props="treeProps"
            node-key="id"
            default-expand-all
            highlight-current
            :current-node-key="selected.id"
            @node-click="selectOrganization"
          >
            <template #default="{ data }">
              <div class="organization-tree__node">
                <span class="organization-tree__node-icon">
                  <Icon icon="mdi:domain" width="17" aria-hidden="true" />
                </span>
                <span>{{ data.name }}</span>
                <i v-if="data.status === 'DISABLED'">停用</i>
              </div>
            </template>
          </el-tree>
        </section>
      </template>

      <section class="organization-detail" aria-labelledby="organization-detail-title">
        <header class="organization-detail__header">
          <div>
            <p>{{ breadcrumbPath }}</p>
            <div class="organization-detail__title-row">
              <h2 id="organization-detail-title">{{ selected.name }}</h2>
              <StatusTag
                :label="selected.status === 'ACTIVE' ? '启用' : '停用'"
                :tone="selected.status === 'ACTIVE' ? 'success' : 'info'"
              />
            </div>
            <span>{{ selected.code }}</span>
          </div>
          <div class="organization-detail__actions">
            <el-button
              v-permission="IAM_PERMISSIONS.organizations.create"
              @click="openForm('create', selected.id)"
              >新增下级</el-button
            >
            <el-button v-permission="IAM_PERMISSIONS.organizations.move" @click="moveVisible = true"
              >调整层级</el-button
            >
            <el-button
              v-permission="IAM_PERMISSIONS.organizations.update"
              type="primary"
              @click="openForm('edit')"
              >编辑组织</el-button
            >
            <el-button
              v-permission="IAM_PERMISSIONS.organizations.changeStatus"
              :type="selected.status === 'ACTIVE' ? 'warning' : 'success'"
              plain
              @click="confirmVisible = true"
            >
              {{ selected.status === 'ACTIVE' ? '停用' : '启用' }}
            </el-button>
          </div>
        </header>

        <div class="organization-detail__metrics">
          <article>
            <span>当前有效成员</span>
            <strong>{{ selected.activeMemberCount }}</strong>
            <small>人</small>
          </article>
          <article>
            <span>组织层级</span>
            <strong>{{ selectedPath.length }}</strong>
            <small>级</small>
          </article>
          <article>
            <span>直属下级</span>
            <strong>{{ selected.children?.length ?? 0 }}</strong>
            <small>个</small>
          </article>
        </div>

        <section class="organization-detail__section">
          <h3>组织档案</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="组织编码">{{ selected.code }}</el-descriptions-item>
            <el-descriptions-item label="组织类型">{{ selected.type }}</el-descriptions-item>
            <el-descriptions-item label="组织负责人">{{ selected.leader }}</el-descriptions-item>
            <el-descriptions-item label="排序值">{{
              selected.sortOrder ?? 0
            }}</el-descriptions-item>
            <el-descriptions-item label="完整路径" :span="2">{{
              breadcrumbPath
            }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{
              selected.remarks || '—'
            }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <el-alert
          v-if="selected.status === 'ACTIVE' && selected.activeMemberCount > 0"
          title="停用前需确保无有效成员、有效负责人及启用中的下级组织。"
          type="info"
          :closable="false"
          show-icon
        />
      </section>
    </WorkspacePageTemplate>

    <FormDrawer
      v-model="formVisible"
      :title="formMode === 'create' ? '新建组织' : `编辑 ${formRecord.name}`"
      :confirm-button-text="formMode === 'create' ? '创建组织' : '保存组织'"
      :submitting="submitting"
      @confirm="finishForm"
    >
      <el-alert v-if="formError" :title="formError" type="error" :closable="false" show-icon />
      <el-form class="organization-form" label-position="top" :disabled="submitting" novalidate>
        <el-form-item label="所属 Tenant"
          ><el-input :model-value="tenant.name || '当前租户'" disabled
        /></el-form-item>
        <el-form-item label="上级组织"
          ><el-tree-select
            v-model="form.parentId"
            :data="organizationSelectNodes"
            :props="treeSelectProps"
            check-strictly
            clearable
            placeholder="顶级组织（无上级）"
            :disabled="formMode === 'edit'"
        /></el-form-item>
        <el-form-item v-if="formMode === 'edit'" label="组织编码">
          <el-input :model-value="formRecord.code" disabled />
        </el-form-item>
        <p v-else class="organization-form__hint">组织编码将在创建成功后由系统自动生成。</p>
        <el-form-item label="组织名称"
          ><el-input v-model="form.name" placeholder="请输入组织名称"
        /></el-form-item>
        <el-form-item label="组织类型"
          ><el-select v-model="form.type"
            ><el-option label="运营中心" value="运营中心" /><el-option
              label="职能部门"
              value="职能部门" /><el-option label="业务小组" value="业务小组" /></el-select
        ></el-form-item>
        <el-form-item label="组织负责人">
          <OrganizationLeaderSelector
            v-model="form.leaderTenantUserId"
            :selected-label="formMode === 'edit' ? formRecord.leader : ''"
            :scope-key="String(tenantId ?? tenant.code)"
            :active="formVisible"
            :disabled="submitting"
            :clear-only="formMode === 'edit' && formRecord.status === 'DISABLED'"
            :load-options="loadLeaderOptions"
          />
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="form.sortOrder" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="备注"
          ><el-input v-model="form.remarks" type="textarea" :rows="4" resize="none"
        /></el-form-item>
      </el-form>
    </FormDrawer>

    <FormDrawer
      v-model="moveVisible"
      title="调整组织层级"
      confirm-button-text="确认移动"
      :submitting="submitting"
      @confirm="finishMove"
    >
      <el-alert
        title="移动将作用于当前组织及其完整子树，成功后重新加载整棵组织树。"
        type="warning"
        :closable="false"
        show-icon
      />
      <div class="organization-move-summary">
        <span>待移动组织</span><strong>{{ selected.name }}</strong
        ><small>{{ breadcrumbPath }}</small>
      </div>
      <el-form label-position="top">
        <el-form-item label="新的上级组织"
          ><el-tree-select
            v-model="newParentId"
            :data="organizations"
            :props="treeProps"
            check-strictly
            placeholder="顶级组织（无上级）"
        /></el-form-item>
      </el-form>
    </FormDrawer>

    <el-dialog
      v-model="confirmVisible"
      :title="`${selected.status === 'ACTIVE' ? '停用' : '启用'}组织`"
      width="540"
    >
      <p class="organization-confirm">
        {{
          selected.status === 'ACTIVE'
            ? `停用 ${selected.name} 前，服务端将校验有效下级、有效成员和负责人关系。不会级联停用。`
            : `启用 ${selected.name} 前，服务端将校验所属 Tenant 与上级组织均为启用状态。`
        }}
      </p>
      <template #footer>
        <el-button @click="confirmVisible = false">取消</el-button>
        <el-button
          v-permission="IAM_PERMISSIONS.organizations.changeStatus"
          :type="selected.status === 'ACTIVE' ? 'warning' : 'success'"
          :loading="submitting"
          @click="confirmStatusChange"
        >
          {{ selected.status === 'ACTIVE' ? '确认停用' : '确认启用' }}
        </el-button>
      </template>
    </el-dialog>
  </AppPage>
</template>

<style scoped lang="scss">
.organization-context {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  min-height: var(--spacing-12);
  padding: 0 var(--spacing-4);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.organization-context strong {
  color: var(--text-primary);
}

.organization-context i {
  width: 1px;
  height: var(--spacing-4);
  background: var(--border-default);
}

.organization-context__label {
  color: var(--color-primary);
  font-weight: 600;
}

.organization-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.organization-tree > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: calc(var(--spacing-12) + var(--spacing-5));
  padding: 0 var(--spacing-4);
  border-bottom: 1px solid var(--border-light);
}

.organization-tree h2,
.organization-detail h2,
.organization-detail h3 {
  margin: 0;
  color: var(--text-primary);
}

.organization-tree h2 {
  font-size: var(--font-size-md);
}

.organization-tree header span {
  display: block;
  margin-top: var(--spacing-1);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.organization-tree__add {
  flex: 0 0 auto;
}

.organization-tree__filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) calc(var(--spacing-10) * 3);
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border-bottom: 1px solid var(--border-light);
}

.organization-tree__state {
  display: grid;
  flex: 1;
  gap: var(--spacing-2);
  color: var(--text-secondary);
  place-content: center;
  text-align: center;
}

.organization-tree__control {
  flex: 1;
  min-height: 0;
  padding: var(--spacing-3);
  overflow: auto;
}

:deep(.organization-tree__control .el-tree-node__content) {
  min-height: calc(var(--size-control) + var(--spacing-1));
  border-radius: var(--radius-default);
}

.organization-tree__node {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  min-width: 0;
}

.organization-tree__node-icon {
  display: grid;
  color: var(--color-primary);
  place-items: center;
}

.organization-tree__node > span:nth-child(2) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organization-tree__node i {
  padding: var(--spacing-1) var(--spacing-2);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  font-style: normal;
  background: var(--background-muted);
  border-radius: var(--radius-small);
}

.organization-detail {
  display: grid;
  align-content: start;
  gap: var(--spacing-5);
  padding: var(--spacing-5);
}

.organization-detail__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-5);
  padding-bottom: var(--spacing-5);
  border-bottom: 1px solid var(--border-light);
}

.organization-detail__header p,
.organization-detail__header span {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.organization-detail__title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin: var(--spacing-2) 0;
}

.organization-detail h2 {
  font-size: var(--font-size-xl);
}

.organization-detail__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--spacing-2);
}

.organization-detail__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-3);
}

.organization-detail__metrics article {
  padding: var(--spacing-4);
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-large);
}

.organization-detail__metrics span,
.organization-detail__metrics small {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.organization-detail__metrics strong {
  margin: 0 var(--spacing-1) 0 var(--spacing-3);
  color: var(--text-primary);
  font-size: var(--font-size-metric);
}

.organization-detail__section {
  display: grid;
  gap: var(--spacing-3);
}

.organization-detail h3 {
  font-size: var(--font-size-md);
}

.organization-form {
  display: grid;
  margin-top: var(--spacing-3);
}

.organization-form__hint {
  margin: 0 0 var(--spacing-4);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.organization-move-summary {
  display: grid;
  gap: var(--spacing-1);
  margin: var(--spacing-5) 0;
  padding: var(--spacing-4);
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-default);
}

.organization-move-summary span,
.organization-move-summary small {
  color: var(--text-secondary);
}

.organization-confirm {
  margin: 0;
  color: var(--text-regular);
  line-height: 1.7;
}
</style>
