<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import DetailDrawer from '@shared/components/DetailDrawer.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import { IAM_PERMISSIONS } from '@shared/constants/iamPermissions'
import type {
  AccessControlPreviewState,
  RoleFormValue,
  RoleQueryValue,
  RoleRecord,
  TenantOption,
} from '../types/accessControl'

const props = defineProps<{
  records: RoleRecord[]
  tenants: TenantOption[]
  state: AccessControlPreviewState
  total?: number
  queryRoles?: (query: RoleQueryValue) => Promise<void>
  submitRole?: (value: RoleFormValue, mode: 'create' | 'edit', record?: RoleRecord) => Promise<void>
  submitStatus?: (record: RoleRecord, targetStatus: 'ACTIVE' | 'DISABLED') => Promise<void>
  navigate?: (target: 'function' | 'assignments', role: RoleRecord) => void
}>()
const emit = defineEmits<{ action: [message: string]; retry: [] }>()

const query = reactive({
  tenantId: props.records[0]?.tenantId ?? props.tenants[0]?.id ?? 0,
  keyword: '',
  roleType: '',
  status: '',
})
const committed = reactive({ ...query })
const page = ref(1)
const pageSize = ref(10)
const detailVisible = ref(false)
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const statusVisible = ref(false)
const submitting = ref(false)
const selected = ref<RoleRecord | undefined>(props.records[0])
const initialForm = ref<RoleFormValue | null>(null)
const form = reactive<RoleFormValue>({
  tenantId: props.tenants[0]?.id ?? 0,
  roleName: '',
  roleType: 'CUSTOM',
  status: 'ACTIVE',
  description: '',
  remarks: '',
  sortOrder: 0,
})
const formValid = computed(() => Boolean(form.tenantId) && form.roleName.trim().length > 0)
const formDirty = computed(() => {
  const initial = initialForm.value
  if (formMode.value !== 'edit' || !initial) return false
  return (
    form.tenantId !== initial.tenantId ||
    form.roleName !== initial.roleName ||
    form.roleType !== initial.roleType ||
    form.status !== initial.status ||
    form.description !== initial.description ||
    form.remarks !== initial.remarks ||
    form.sortOrder !== initial.sortOrder
  )
})

const columns: DataTableColumn[] = [
  { prop: 'roleCode', label: '角色编码', minWidth: 170, fixed: 'left', slot: 'code' },
  { prop: 'roleName', label: '角色名称', minWidth: 160 },
  { label: '角色类型', width: 118, slot: 'type' },
  { label: '状态', width: 90, slot: 'status' },
  { label: '当前有效性', width: 118, slot: 'effective' },
  { label: '控制范围', width: 112, slot: 'control' },
  { prop: 'sortOrder', label: '排序', width: 76, align: 'right' },
  { prop: 'updatedAt', label: '更新时间', minWidth: 168 },
  { label: '操作', width: 196, fixed: 'right', slot: 'actions' },
]

const visibleRecords = computed(() => {
  if (props.state !== 'ready') return []
  const keyword = committed.keyword.trim().toLocaleLowerCase('zh-CN')
  return props.records.filter(
    (record) =>
      record.tenantId === committed.tenantId &&
      (!keyword ||
        [record.roleCode, record.roleName, record.description].some((value) =>
          value.toLocaleLowerCase('zh-CN').includes(keyword),
        )) &&
      (!committed.roleType || record.roleType === committed.roleType) &&
      (!committed.status || record.status === committed.status),
  )
})

function asRole(row: Record<string, unknown>) {
  return row as unknown as RoleRecord
}
function currentQuery(): RoleQueryValue {
  return {
    tenantId: committed.tenantId,
    roleId: 0,
    roleType: committed.roleType,
    pageIndex: page.value,
    pageSize: pageSize.value,
    keyword: committed.keyword,
    status: committed.status,
  }
}
async function search() {
  Object.assign(committed, query)
  page.value = 1
  if (props.queryRoles) await props.queryRoles(currentQuery())
  emit('action', '角色查询条件已生效')
}
async function reset() {
  Object.assign(query, {
    tenantId: props.records[0]?.tenantId ?? props.tenants[0]?.id ?? 0,
    keyword: '',
    roleType: '',
    status: '',
  })
  Object.assign(committed, query)
  page.value = 1
  if (props.queryRoles) await props.queryRoles(currentQuery())
  emit('action', '角色查询条件已重置')
}
function openDetail(record: RoleRecord) {
  selected.value = record
  detailVisible.value = true
}
function openForm(mode: 'create' | 'edit', record = selected.value) {
  if (mode === 'edit' && !record) return
  formMode.value = mode
  selected.value = record
  const nextForm: RoleFormValue = {
    tenantId: mode === 'create' ? committed.tenantId : (record?.tenantId ?? committed.tenantId),
    roleName: mode === 'create' ? '' : (record?.roleName ?? ''),
    roleType: mode === 'create' ? 'CUSTOM' : (record?.roleType ?? 'CUSTOM'),
    status: mode === 'create' ? 'ACTIVE' : (record?.status ?? 'ACTIVE'),
    description: mode === 'create' ? '' : (record?.description ?? ''),
    remarks: mode === 'create' ? '' : (record?.remarks ?? ''),
    sortOrder: mode === 'create' ? 0 : (record?.sortOrder ?? 0),
  }
  Object.assign(form, nextForm)
  initialForm.value = { ...nextForm }
  formVisible.value = true
}
async function saveRole() {
  if (submitting.value) return
  if (!formValid.value) return
  if (props.submitRole) {
    submitting.value = true
    try {
      await props.submitRole({ ...form }, formMode.value, selected.value)
      formVisible.value = false
    } finally {
      submitting.value = false
    }
    return
  }
  formVisible.value = false
  emit(
    'action',
    formMode.value === 'create'
      ? '自定义角色候选已创建；下一步可配置功能权限'
      : '角色展示信息候选已保存',
  )
}
function openStatus(record: RoleRecord) {
  selected.value = record
  statusVisible.value = true
}
async function confirmStatus() {
  if (!selected.value || submitting.value) return
  if (props.submitStatus) {
    submitting.value = true
    try {
      await props.submitStatus(
        selected.value,
        selected.value.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
      )
      statusVisible.value = false
    } finally {
      submitting.value = false
    }
    return
  }
  statusVisible.value = false
  emit('action', '角色状态候选操作已确认；配置与成员关系保持不变')
}

function openRelated(target: 'function' | 'assignments', record: RoleRecord) {
  if (props.navigate) props.navigate(target, record)
  else
    emit('action', `进入 ${record.roleName} 的${target === 'function' ? '功能权限' : '成员分配'}`)
}

function openFunctionPermissionsFromForm() {
  if (formMode.value !== 'edit' || !selected.value || formDirty.value || submitting.value) return
  formVisible.value = false
  openRelated('function', selected.value)
}

async function changePage() {
  if (props.queryRoles) await props.queryRoles(currentQuery())
  emit('action', '角色分页状态已更新')
}

watch(
  () => props.tenants,
  (tenants) => {
    if (!tenants.some((item) => item.id === query.tenantId)) {
      query.tenantId = tenants[0]?.id ?? 0
      committed.tenantId = query.tenantId
    }
  },
)

watch(
  () => props.records,
  (records) => {
    selected.value = records.find((item) => item.id === selected.value?.id) ?? records[0]
  },
)
</script>

<template>
  <AppPage class="role-page">
    <ListPageTemplate>
      <template #header>
        <PageHeader
          title="角色管理"
          description="维护目标 Tenant 的自定义角色；系统角色与集团控制角色按权限只读"
        />
      </template>
      <template #search>
        <SearchPanel :loading="state === 'loading'" @search="search" @reset="reset">
          <el-form-item label="目标 Tenant"
            ><el-select v-model="query.tenantId"
              ><el-option
                v-for="tenant in tenants"
                :key="tenant.id"
                :label="`${tenant.name} · ${tenant.code}`"
                :value="tenant.id" /></el-select
          ></el-form-item>
          <el-form-item label="关键词"
            ><el-input
              v-model="query.keyword"
              clearable
              placeholder="角色编码、名称或说明"
              @keyup.enter="search"
          /></el-form-item>
          <el-form-item label="角色类型"
            ><el-select v-model="query.roleType" clearable placeholder="全部类型"
              ><el-option label="自定义角色" value="CUSTOM" /><el-option
                label="系统角色"
                value="SYSTEM" /></el-select
          ></el-form-item>
          <el-form-item label="角色状态"
            ><el-select v-model="query.status" clearable placeholder="全部状态"
              ><el-option label="启用" value="ACTIVE" /><el-option
                label="停用"
                value="DISABLED" /></el-select
          ></el-form-item>
          <template #footer-leading>
            <el-button
              v-permission="IAM_PERMISSIONS.roles.create"
              type="primary"
              @click="openForm('create')"
            >
              <Icon icon="mdi:plus" width="18" aria-hidden="true" />新建自定义角色
            </el-button>
          </template>
        </SearchPanel>
      </template>
      <template #toolbar
        ><TableToolbar
          title="角色列表"
          :total="total ?? visibleRecords.length"
          :refreshing="state === 'loading'"
          @refresh="emit('retry')"
          ><template #summary
            ><span class="role-page__summary">服务端分页 · 目标范围明确</span></template
          ></TableToolbar
        ></template
      >

      <el-alert
        v-if="state === 'retryable-error'"
        class="role-page__alert"
        title="角色列表加载失败，筛选条件与当前 Tenant 已保留"
        type="error"
        :closable="false"
        show-icon
        ><template #default
          ><el-button link type="primary" @click="emit('retry')">重新加载</el-button></template
        ></el-alert
      >
      <DataTable
        :data="visibleRecords"
        :columns="columns"
        :loading="state === 'loading'"
        @row-click="openDetail(asRole($event))"
      >
        <template #code="{ row }"
          ><button class="role-page__link" type="button" @click.stop="openDetail(asRole(row))">
            {{ asRole(row).roleCode }}
          </button></template
        >
        <template #type="{ row }"
          ><StatusTag
            :label="asRole(row).roleType === 'CUSTOM' ? '自定义角色' : '系统角色'"
            tone="info"
        /></template>
        <template #status="{ row }"
          ><StatusTag
            :label="asRole(row).status === 'ACTIVE' ? '启用' : '停用'"
            :tone="asRole(row).status === 'ACTIVE' ? 'success' : 'info'"
        /></template>
        <template #effective="{ row }"
          ><StatusTag
            :label="asRole(row).isCurrentlyEffective ? '当前有效' : '当前无效'"
            :tone="asRole(row).isCurrentlyEffective ? 'success' : 'warning'"
        /></template>
        <template #control="{ row }"
          ><StatusTag v-if="asRole(row).isGroupControlled" label="集团控制" tone="warning" /><span
            v-else
            >Tenant 内</span
          ></template
        >
        <template #actions="{ row }">
          <RowActionGrid :aria-label="`${asRole(row).roleName} 的操作`">
            <el-button link type="primary" @click.stop="openDetail(asRole(row))">详情</el-button>
            <el-button
              v-permission="IAM_PERMISSIONS.roles.update"
              link
              type="primary"
              :disabled="!asRole(row).canMaintain"
              @click.stop="openForm('edit', asRole(row))"
              >编辑</el-button
            >
            <el-button
              v-permission="IAM_PERMISSIONS.roles.queryFunctionPermissions"
              link
              type="primary"
              @click.stop="openRelated('function', asRole(row))"
              >功能权限</el-button
            >
            <el-button
              v-permission="IAM_PERMISSIONS.roles.queryAssignments"
              link
              type="primary"
              @click.stop="openRelated('assignments', asRole(row))"
              >角色成员</el-button
            >
            <el-button
              v-permission="IAM_PERMISSIONS.roles.changeStatus"
              link
              :type="asRole(row).status === 'ACTIVE' ? 'warning' : 'success'"
              :disabled="!asRole(row).canMaintain"
              @click.stop="openStatus(asRole(row))"
              >{{ asRole(row).status === 'ACTIVE' ? '停用' : '启用' }}</el-button
            >
          </RowActionGrid>
        </template>
      </DataTable>
      <template #pagination
        ><AppPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="total ?? visibleRecords.length"
          @change="changePage"
      /></template>
    </ListPageTemplate>

    <DetailDrawer
      v-model="detailVisible"
      :title="`${selected?.roleName ?? ''} · 角色详情`"
      size="680"
    >
      <div v-if="selected" class="role-detail">
        <div class="role-detail__hero">
          <span class="role-detail__icon"
            ><Icon icon="mdi:shield-account-outline" width="24" aria-hidden="true"
          /></span>
          <div>
            <strong>{{ selected.roleName }}</strong
            ><code>{{ selected.roleCode }}</code>
          </div>
          <StatusTag
            :label="selected.status === 'ACTIVE' ? '启用' : '停用'"
            :tone="selected.status === 'ACTIVE' ? 'success' : 'info'"
          />
        </div>
        <el-alert
          v-if="selected.isGroupControlled"
          title="该角色包含 GROUP 或 CUSTOM 数据范围，Tenant 管理员只能查看。"
          type="warning"
          :closable="false"
          show-icon
        />
        <el-descriptions :column="2" border>
          <el-descriptions-item label="所属 Tenant">{{ selected.tenantCode }}</el-descriptions-item
          ><el-descriptions-item label="角色类型">{{
            selected.roleType === 'CUSTOM' ? '自定义角色' : '系统角色'
          }}</el-descriptions-item>
          <el-descriptions-item label="当前有效性">{{
            selected.isCurrentlyEffective ? '当前有效' : '当前无效'
          }}</el-descriptions-item
          ><el-descriptions-item label="可维护">{{
            selected.canMaintain ? '是' : '否'
          }}</el-descriptions-item>
          <el-descriptions-item label="排序值">{{ selected.sortOrder }}</el-descriptions-item
          ><el-descriptions-item label="版本">{{ selected.version }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ selected.createdAt }}</el-descriptions-item
          ><el-descriptions-item label="更新时间">{{ selected.updatedAt }}</el-descriptions-item>
          <el-descriptions-item label="说明" :span="2">{{
            selected.description || '—'
          }}</el-descriptions-item
          ><el-descriptions-item label="备注" :span="2">{{
            selected.remarks || '—'
          }}</el-descriptions-item>
        </el-descriptions>
        <div class="role-detail__actions">
          <el-button
            v-permission="IAM_PERMISSIONS.roles.queryFunctionPermissions"
            type="primary"
            @click="openRelated('function', selected)"
            >查看/配置功能权限</el-button
          ><el-button
            v-permission="IAM_PERMISSIONS.roles.queryAssignments"
            @click="openRelated('assignments', selected)"
            >查看成员分配</el-button
          >
        </div>
      </div>
    </DetailDrawer>

    <FormDrawer
      v-model="formVisible"
      :title="formMode === 'create' ? '新建自定义角色' : `编辑 ${selected?.roleName ?? ''}`"
      :confirm-button-text="formMode === 'create' ? '创建角色' : '保存角色'"
      :submitting="submitting"
      :confirm-disabled="!formValid"
      @confirm="saveRole"
    >
      <el-alert
        v-if="formMode === 'create'"
        title="角色编码由系统自动生成；创建后默认启用，不复制权限，也不自动分配成员。"
        type="info"
        :closable="false"
        show-icon
      />
      <el-form class="role-form" label-position="top" novalidate>
        <el-form-item label="所属 Tenant"
          ><el-select v-model="form.tenantId" :disabled="formMode === 'create'"
            ><el-option
              v-for="tenant in tenants"
              :key="tenant.id"
              :label="`${tenant.name} · ${tenant.code}`"
              :value="tenant.id" /></el-select
        ></el-form-item>
        <el-form-item v-if="formMode === 'edit'" label="角色编码">
          <el-input :model-value="selected?.roleCode ?? ''" disabled />
        </el-form-item>
        <el-form-item label="角色类型"
          ><el-select v-model="form.roleType" :disabled="formMode === 'create'"
            ><el-option label="自定义角色" value="CUSTOM" /><el-option
              label="系统角色"
              value="SYSTEM" /></el-select
        ></el-form-item>
        <el-form-item label="状态"
          ><el-select v-model="form.status" :disabled="formMode === 'create'"
            ><el-option label="启用" value="ACTIVE" /><el-option
              label="停用"
              value="DISABLED" /></el-select
        ></el-form-item>
        <el-form-item label="角色名称"
          ><el-input v-model="form.roleName" placeholder="请输入角色名称"
        /></el-form-item>
        <el-form-item label="说明"
          ><el-input v-model="form.description" type="textarea" :rows="3" resize="none"
        /></el-form-item>
        <el-form-item label="备注"
          ><el-input v-model="form.remarks" type="textarea" :rows="3" resize="none"
        /></el-form-item>
        <el-form-item label="展示排序"
          ><el-input-number v-model="form.sortOrder" :min="0" controls-position="right"
        /></el-form-item>
      </el-form>
      <div v-if="formMode === 'edit'" class="role-form__related-action">
        <span v-permission="IAM_PERMISSIONS.roles.queryFunctionPermissions">
          <el-tooltip
            :disabled="!formDirty"
            content="角色资料有未保存修改，请先保存或还原后再进入功能权限。"
            placement="top"
          >
            <span>
              <el-button
                :disabled="formDirty || submitting"
                @click="openFunctionPermissionsFromForm"
              >
                查看/配置功能权限
              </el-button>
            </span>
          </el-tooltip>
        </span>
        <small v-if="formDirty">先保存或还原当前角色资料，避免丢失未保存内容。</small>
      </div>
    </FormDrawer>

    <el-dialog
      v-model="statusVisible"
      :title="`${selected?.status === 'ACTIVE' ? '停用' : '启用'}自定义角色`"
      width="560"
    >
      <el-alert
        title="状态变更会从下一次权限判断开始生效；功能权限、数据权限和成员分配将完整保留。"
        type="warning"
        :closable="false"
        show-icon
      />
      <p class="role-confirm">
        目标角色：{{ selected?.roleName }}（{{ selected?.roleCode }}）。操作将携带当前版本
        {{ selected?.version }}。
      </p>
      <template #footer
        ><el-button @click="statusVisible = false">取消</el-button
        ><el-button
          v-permission="IAM_PERMISSIONS.roles.changeStatus"
          :type="selected?.status === 'ACTIVE' ? 'warning' : 'success'"
          :loading="submitting"
          @click="confirmStatus"
          >{{ selected?.status === 'ACTIVE' ? '确认停用' : '确认启用' }}</el-button
        ></template
      >
    </el-dialog>
  </AppPage>
</template>

<style scoped lang="scss">
.role-page__summary {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}
.role-page__alert {
  margin: var(--spacing-3) var(--spacing-4);
}
.role-page__link {
  padding: var(--spacing-1) 0;
  color: var(--color-primary);
  font: inherit;
  font-weight: 600;
  background: transparent;
  border: 0;
  cursor: pointer;
}
.role-page__link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}
.role-detail {
  display: grid;
  gap: var(--spacing-5);
}
.role-detail__hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-large);
}
.role-detail__icon {
  display: grid;
  width: var(--spacing-12);
  height: var(--spacing-12);
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-default);
  place-items: center;
}
.role-detail strong,
.role-detail code {
  display: block;
}
.role-detail code {
  margin-top: var(--spacing-1);
  color: var(--text-secondary);
  font-family: var(--font-family);
}
.role-detail__actions {
  display: flex;
  gap: var(--spacing-3);
}
.role-detail :deep(.el-descriptions__table) {
  table-layout: fixed;
}
.role-detail :deep(.el-descriptions__content) {
  overflow-wrap: anywhere;
  white-space: normal;
}
.role-form {
  display: grid;
  margin-top: var(--spacing-4);
}
.role-form :deep(.el-input-number),
.role-form :deep(.el-select) {
  width: 100%;
}
.role-form__related-action {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--border-light);
}
.role-form__related-action small {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}
.role-confirm {
  margin: var(--spacing-4) 0 0;
  color: var(--text-regular);
  line-height: 1.7;
}
</style>
