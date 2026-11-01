<script setup lang="ts">
import { catalogElements } from '../iam-resource.registry'
import { computed, reactive, ref } from 'vue'
import type { EntityId } from '@shared/types/entityId'
import type { PagedEntityQuery, PagedEntityOption } from '@shared/types/pagedOptions'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import DateTimeText from '@shared/components/DateTimeText.vue'
import DetailDrawer from '@shared/components/DetailDrawer.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import SystemResourceFormDrawer from './SystemResourceFormDrawer.vue'
import type {
  PermissionGovernanceApp,
  PermissionGovernancePreviewState,
  PermissionResourceStatus,
  PermissionResourceType,
  ResourceCatalogQuery,
  SystemResourceRecord,
  SystemResourceFormValue,
} from '../types/permissionGovernance'

const props = defineProps<{
  records: SystemResourceRecord[]
  apps: PermissionGovernanceApp[]
  state: PermissionGovernancePreviewState
  total?: number
  initialQuery?: Partial<ResourceCatalogQuery>
  queryResources?: (query: ResourceCatalogQuery) => Promise<void>
  loadResourceDetail?: (record: SystemResourceRecord) => Promise<SystemResourceRecord>
  canCreate?: boolean
  canEdit?: boolean
  loadParents?: (
    appId: EntityId,
    type: PermissionResourceType,
    excludedId: EntityId | undefined,
    query: PagedEntityQuery,
  ) => Promise<{ items: PagedEntityOption<EntityId>[]; total: number }>
  submitResource?: (
    value: SystemResourceFormValue,
    mode: 'create' | 'edit',
    source?: SystemResourceRecord,
    reusePendingRequestId?: boolean,
  ) => Promise<SystemResourceRecord>
}>()

const emit = defineEmits<{
  action: [message: string]
  retry: []
}>()

const emptyQuery = (): ResourceCatalogQuery => ({
  keyword: '',
  appId: '',
  resourceType: '',
  status: '',
  pageIndex: 1,
  pageSize: 10,
})

const initialQuery = { ...emptyQuery(), ...props.initialQuery }
const draft = reactive<ResourceCatalogQuery>({ ...initialQuery })
const applied = ref<ResourceCatalogQuery>({ ...initialQuery })
const detailVisible = ref(false)
const selected = ref<SystemResourceRecord>()
const detailLoading = ref(false)
const detailError = ref('')
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref(false)
const editSource = ref<SystemResourceRecord>()

const columns: DataTableColumn[] = [
  { label: '资源名称', minWidth: 190, fixed: 'left', slot: 'name' },
  { label: '类型', width: 112, slot: 'type' },
  { label: '所属 App', minWidth: 150, slot: 'app' },
  { label: '父级资源 / ID', minWidth: 190, slot: 'parent' },
  { label: '路径 / 接口', minWidth: 250, slot: 'location' },
  { label: '状态', width: 86, slot: 'status' },
  { prop: 'updatedAt', label: '更新时间', minWidth: 168, slot: 'updatedAt' },
  { label: '操作', fixed: 'right', slot: 'actions' },
]

const normalizedKeyword = computed(() => applied.value.keyword.trim().toLocaleLowerCase('zh-CN'))

const filteredRecords = computed(() => {
  if (props.state === 'empty') return []

  return props.records.filter((record) => {
    if (applied.value.appId && record.appId !== applied.value.appId) return false
    if (applied.value.resourceType && record.resourceType !== applied.value.resourceType)
      return false
    if (applied.value.status && record.status !== applied.value.status) return false
    if (!normalizedKeyword.value) return true

    return [
      record.resourceName,
      record.resourceCode,
      record.appName,
      parentRecord(record)?.resourceName ?? '',
      record.routePath,
      record.apiPath,
    ].some((value) => value.toLocaleLowerCase('zh-CN').includes(normalizedKeyword.value))
  })
})

const visibleRecords = computed(() => {
  if (props.queryResources) return filteredRecords.value
  const start = (applied.value.pageIndex - 1) * applied.value.pageSize
  return filteredRecords.value.slice(start, start + applied.value.pageSize)
})

const resultTotal = computed(() => props.total ?? filteredRecords.value.length)

function resourceTypeLabel(type: PermissionResourceType) {
  return {
    MODULE: 'Module',
    MENU: 'Menu',
    BUTTON: 'Button',
    BUTTON_PAGE: 'ButtonPage',
    FUNCTION: 'Function',
  }[type]
}

function statusLabel(status: PermissionResourceStatus) {
  return status === 'ACTIVE' ? '启用' : '停用'
}

function typeTone(type: PermissionResourceType) {
  if (type === 'FUNCTION') return 'warning'
  if (type === 'BUTTON' || type === 'BUTTON_PAGE') return 'primary'
  return 'info'
}

function asResource(row: Record<string, unknown>) {
  return row as SystemResourceRecord
}

function parentRecord(record: SystemResourceRecord) {
  if (!record.parentId || record.parentId === '0') return undefined
  if (record.parentResourceName)
    return {
      resourceName: record.parentResourceName,
      resourceCode: record.parentResourceCode ?? '',
    }
  return props.records.find((candidate) => candidate.resourceId === record.parentId)
}

function parentLabel(record: SystemResourceRecord) {
  return (
    parentRecord(record)?.resourceName ||
    (record.parentId && record.parentId !== '0' ? `资源 ID ${record.parentId}` : 'App 根节点')
  )
}

async function openForm(mode: 'create' | 'edit', record?: SystemResourceRecord) {
  if (editing.value || formVisible.value) return
  if (!(mode === 'create' ? props.canCreate : props.canEdit)) return
  if (mode === 'edit' && !record) return
  if (mode === 'edit' && record && props.loadResourceDetail) {
    editing.value = true
    try {
      record = await props.loadResourceDetail(record)
    } catch {
      return
    } finally {
      editing.value = false
    }
  }
  editSource.value = mode === 'edit' ? record : undefined
  formMode.value = mode
  detailVisible.value = false
  formVisible.value = true
}

async function loadParentOptions(
  appId: EntityId,
  type: PermissionResourceType,
  excludedId: EntityId | undefined,
  query: PagedEntityQuery,
) {
  if (props.loadParents) return props.loadParents(appId, type, excludedId, query)
  const candidates = props.records.filter(
    (item) =>
      item.appId === appId &&
      item.resourceType === type &&
      item.status === 'ACTIVE' &&
      item.resourceId !== excludedId &&
      `${item.resourceName} ${item.resourceCode}`
        .toLocaleLowerCase('zh-CN')
        .includes(query.keyword.toLocaleLowerCase('zh-CN')),
  )
  const start = (query.pageIndex - 1) * query.pageSize
  return {
    items: candidates.slice(start, start + query.pageSize).map((item) => ({
      id: item.resourceId,
      label: item.resourceName,
      description: item.resourceCode,
    })),
    total: candidates.length,
  }
}

async function resourceSaved(record?: SystemResourceRecord) {
  selected.value = record
  emit('action', props.submitResource ? '资源已保存' : '资源候选操作已记录，未调用后端')
  if (!props.queryResources) return
  await props.queryResources(currentQuery())
  const lastPage = Math.max(1, Math.ceil(resultTotal.value / applied.value.pageSize))
  if (applied.value.pageIndex > lastPage) {
    applied.value.pageIndex = lastPage
    await changePage()
  }
}

function currentQuery(): ResourceCatalogQuery {
  return { ...applied.value }
}

async function runQuery(resetPage = true) {
  if (resetPage) draft.pageIndex = 1
  applied.value = { ...draft }
  if (props.queryResources) await props.queryResources(currentQuery())
  emit('action', '系统资源筛选条件已生效')
}

async function resetQuery() {
  Object.assign(draft, emptyQuery())
  applied.value = emptyQuery()
  if (props.queryResources) await props.queryResources(currentQuery())
  emit('action', '系统资源筛选条件已重置')
}

async function changePage() {
  draft.pageIndex = applied.value.pageIndex
  draft.pageSize = applied.value.pageSize
  if (props.queryResources) await props.queryResources(currentQuery())
  emit('action', '系统资源分页状态已更新')
}

async function openDetail(record: SystemResourceRecord) {
  selected.value = record
  detailVisible.value = true
  detailError.value = ''
  if (!props.loadResourceDetail) return

  detailLoading.value = true
  try {
    selected.value = await props.loadResourceDetail(record)
  } catch {
    detailError.value = '资源详情加载失败，列表中的摘要信息已保留。'
  } finally {
    detailLoading.value = false
  }
}
</script>

<template>
  <AppPage :resource_element="catalogElements.page" class="resource-catalog-page">
    <ListPageTemplate>
      <template #header>
        <PageHeader
          title="系统资源目录"
          description="查看 iam_resource 中已登记的 Module、Menu、Button、ButtonPage 与 Function 及其固定父子关系"
        />
      </template>

      <template #search>
        <SearchPanel
          :resource_element="catalogElements.query"
          :loading="state === 'loading'"
          @search="runQuery()"
          @reset="resetQuery"
        >
          <el-form-item label="关键词">
            <el-input
              v-model="draft.keyword"
              clearable
              placeholder="名称、编码、路由或 API Path"
              @keyup.enter="runQuery()"
            />
          </el-form-item>
          <el-form-item label="App">
            <el-select v-model="draft.appId" clearable placeholder="全部 App">
              <el-option v-for="app in apps" :key="app.id" :label="app.appName" :value="app.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="资源类型">
            <el-select v-model="draft.resourceType" clearable placeholder="全部类型">
              <el-option label="Module" value="MODULE" />
              <el-option label="Menu" value="MENU" />
              <el-option label="Button" value="BUTTON" />
              <el-option label="ButtonPage" value="BUTTON_PAGE" />
              <el-option label="Function" value="FUNCTION" />
            </el-select>
          </el-form-item>
          <el-form-item label="资源状态">
            <el-select v-model="draft.status" clearable placeholder="全部状态">
              <el-option label="启用" value="ACTIVE" />
              <el-option label="停用" value="DISABLED" />
            </el-select>
          </el-form-item>
          <template #footer-leading>
            <el-button
              v-if="canCreate"
              v-resource-element="catalogElements.create"
              type="primary"
              @click="openForm('create')"
              >新增资源</el-button
            >
          </template>
        </SearchPanel>
      </template>

      <template #toolbar>
        <TableToolbar
          :resource_element="catalogElements.query"
          title="系统资源"
          :total="resultTotal"
          :refreshing="state === 'loading'"
          @refresh="emit('retry')"
        >
          <template #summary>
            <span class="resource-catalog-page__summary"
              >Button、ButtonPage 与 Menu 的 parent_id 指向其固定所属前端资源</span
            >
          </template>
        </TableToolbar>
      </template>

      <el-alert
        v-if="state === 'retryable-error'"
        title="系统资源目录加载失败，当前筛选条件已保留"
        type="error"
        :closable="false"
        show-icon
      >
        <template #default>
          <el-button
            v-resource-element="catalogElements.query"
            link
            type="primary"
            @click="emit('retry')"
            >重新加载</el-button
          >
        </template>
      </el-alert>

      <DataTable :data="visibleRecords" :columns="columns" :loading="state === 'loading'">
        <template #name="{ row }">
          <button
            v-resource-element="catalogElements.detail"
            class="resource-catalog-page__name"
            type="button"
            @click="openDetail(asResource(row))"
          >
            <strong>{{ asResource(row).resourceName }}</strong>
            <small>{{ asResource(row).resourceCode }}</small>
          </button>
        </template>
        <template #type="{ row }">
          <StatusTag
            :label="resourceTypeLabel(asResource(row).resourceType)"
            :tone="typeTone(asResource(row).resourceType)"
          />
        </template>
        <template #app="{ row }">
          <span>{{ asResource(row).appName }}</span>
        </template>
        <template #parent="{ row }">
          <span v-if="parentRecord(asResource(row))" class="resource-catalog-page__parent">
            <strong>{{ parentRecord(asResource(row))?.resourceName }}</strong>
            <small
              >ID {{ asResource(row).parentId }} ·
              {{ parentRecord(asResource(row))?.resourceCode }}</small
            >
          </span>
          <span v-else class="resource-catalog-page__muted">{{
            parentLabel(asResource(row))
          }}</span>
        </template>
        <template #location="{ row }">
          <code class="resource-catalog-page__location">
            <template v-if="asResource(row).apiPath">
              {{ asResource(row).httpMethod }} {{ asResource(row).apiPath }}
            </template>
            <template v-else>{{ asResource(row).routePath || '—' }}</template>
          </code>
        </template>
        <template #status="{ row }">
          <StatusTag
            :label="statusLabel(asResource(row).status)"
            :tone="asResource(row).status === 'ACTIVE' ? 'success' : 'info'"
          />
        </template>
        <template #updatedAt="{ row }">
          <DateTimeText :value="asResource(row).updatedAt ?? ''" />
        </template>
        <template #actions="{ row }">
          <RowActionGrid>
            <el-button
              v-if="canEdit"
              v-resource-element="catalogElements.edit"
              link
              type="primary"
              :loading="editing"
              @click="openForm('edit', asResource(row))"
              >编辑</el-button
            >
          </RowActionGrid>
        </template>
      </DataTable>

      <template #pagination>
        <AppPagination
          v-model:page="applied.pageIndex"
          v-model:page-size="applied.pageSize"
          :resource_element="catalogElements.query"
          :total="resultTotal"
          @change="changePage"
        />
      </template>
    </ListPageTemplate>

    <DetailDrawer
      v-model="detailVisible"
      :resource_element="catalogElements.detail"
      :title="`${selected?.resourceName ?? ''} · 资源详情`"
      size="720"
    >
      <div v-if="selected" v-loading="detailLoading" class="resource-detail">
        <el-alert
          v-if="detailError"
          :title="detailError"
          type="error"
          :closable="false"
          show-icon
        />
        <el-button
          v-if="canEdit"
          v-resource-element="catalogElements.edit"
          type="primary"
          :disabled="detailLoading || !!detailError"
          :loading="editing"
          @click="openForm('edit', selected)"
          >编辑资源</el-button
        >
        <header class="resource-detail__hero">
          <div>
            <p>{{ selected.appName }}</p>
            <strong>{{ selected.resourceName }}</strong>
            <code>{{ selected.resourceCode }}</code>
          </div>
          <div class="resource-detail__tags">
            <StatusTag
              :label="resourceTypeLabel(selected.resourceType)"
              :tone="typeTone(selected.resourceType)"
            />
            <StatusTag
              :label="statusLabel(selected.status)"
              :tone="selected.status === 'ACTIVE' ? 'success' : 'info'"
            />
          </div>
        </header>

        <el-alert
          title="本页只展示 iam_resource 资源自身及 parent_id 层级；前后端资源如何组合由权限管理维护。"
          type="info"
          :closable="false"
          show-icon
        />

        <el-descriptions :column="2" border>
          <el-descriptions-item label="资源 ID">{{ selected.resourceId }}</el-descriptions-item>
          <el-descriptions-item label="所属 App">{{ selected.appName }}</el-descriptions-item>
          <el-descriptions-item label="父级资源">
            {{ parentLabel(selected) }}
          </el-descriptions-item>
          <el-descriptions-item label="父级 ID">{{
            selected.parentId || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="路由地址" :span="2">{{
            selected.routePath || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="页面组件" :span="2">{{
            selected.component || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="权限码">{{
            selected.permissionCode || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="导航显示">{{
            selected.isVisible ? '是' : '否'
          }}</el-descriptions-item>
          <el-descriptions-item label="接口方法">{{
            selected.httpMethod || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="接口路径">{{
            selected.apiPath || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="排序">{{ selected.sortOrder }}</el-descriptions-item>
          <el-descriptions-item label="当前有效">{{
            selected.isCurrentlyEffective ? '是' : '否'
          }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">
            <DateTimeText :value="selected.createdAt ?? ''" />
          </el-descriptions-item>
          <el-descriptions-item label="创建人">{{
            selected.createdBy || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">
            <DateTimeText :value="selected.updatedAt ?? ''" />
          </el-descriptions-item>
          <el-descriptions-item label="更新人">{{ selected.updatedBy }}</el-descriptions-item>
          <el-descriptions-item label="说明" :span="2">{{
            selected.remarks || '—'
          }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </DetailDrawer>
    <SystemResourceFormDrawer
      v-model="formVisible"
      :mode="formMode"
      :source="editSource"
      :apps="apps"
      :allowed="!!(formMode === 'create' ? canCreate : canEdit)"
      :load-parents="loadParentOptions"
      :submit-resource="submitResource"
      @saved="resourceSaved"
    />
  </AppPage>
</template>

<style scoped lang="scss">
.resource-catalog-page__summary,
.resource-detail__hero p,
.resource-catalog-page__muted {
  color: var(--text-secondary);
}

.resource-catalog-page__name {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-1);
  max-width: 100%;
  padding: 0;
  color: var(--color-primary);
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.resource-catalog-page__name small,
.resource-catalog-page__parent small,
.resource-catalog-page__location,
.resource-detail code {
  color: var(--text-secondary);
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
}

.resource-detail,
.resource-detail__hero > div:first-child {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.resource-detail__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-3);
  padding-bottom: var(--spacing-3);
  border-bottom: 1px solid var(--border-light);
}

.resource-detail__hero p,
.resource-detail__hero strong {
  margin: 0;
}

.resource-detail__hero strong {
  color: var(--text-primary);
  font-size: var(--font-size-lg);
}

.resource-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
}

.resource-catalog-page__parent {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  min-width: 0;
}
</style>
