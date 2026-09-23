<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
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
  FoundationPreviewState,
  PositionFormValue,
  PositionRecord,
  TenantOption,
} from '../types/foundation'

const props = defineProps<{
  records: PositionRecord[]
  state: FoundationPreviewState
  tenant: Pick<TenantOption, 'name' | 'code' | 'timezone'>
  save?: (
    mode: 'create' | 'edit',
    value: PositionFormValue,
    record: PositionRecord,
  ) => Promise<void>
  changeStatus?: (record: PositionRecord, targetStatus: 'ACTIVE' | 'DISABLED') => Promise<void>
}>()

const emit = defineEmits<{
  action: [message: string]
  retry: []
}>()

const query = reactive({ keyword: '', status: '' })
const committed = reactive({ keyword: '', status: '' })
const page = ref(1)
const pageSize = ref(10)
const detailVisible = ref(false)
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const statusVisible = ref(false)
const submitting = ref(false)
const emptyPosition: PositionRecord = {
  id: 0,
  code: '',
  name: '',
  type: '业务岗位',
  status: 'ACTIVE',
  activeMemberCount: 0,
  sortOrder: 0,
  updatedAt: '',
}
const selected = ref<PositionRecord>(props.records[0] ?? emptyPosition)
const form = reactive<PositionFormValue>({
  name: '',
  type: '',
  sortOrder: 0,
  remarks: '',
})

const columns: DataTableColumn[] = [
  { prop: 'code', label: '岗位编码', minWidth: 170, fixed: 'left', slot: 'code' },
  { prop: 'name', label: '岗位名称', minWidth: 180 },
  { prop: 'type', label: '岗位类型', minWidth: 128 },
  { label: '状态', width: 96, slot: 'status' },
  { prop: 'activeMemberCount', label: '有效成员', width: 112, align: 'right', slot: 'members' },
  { prop: 'sortOrder', label: '排序值', width: 92, align: 'right' },
  { prop: 'updatedAt', label: '更新时间', minWidth: 168 },
  { label: '操作', width: 176, fixed: 'right', slot: 'actions' },
]

const visibleRecords = computed(() => {
  if (props.state !== 'ready') return []
  const keyword = committed.keyword.trim().toLocaleLowerCase('zh-CN')
  return props.records.filter(
    (record) =>
      (!keyword ||
        [record.code, record.name, record.type].some((value) =>
          value.toLocaleLowerCase('zh-CN').includes(keyword),
        )) &&
      (!committed.status || record.status === committed.status),
  )
})

function asPosition(row: Record<string, unknown>): PositionRecord {
  return row as unknown as PositionRecord
}

function search() {
  Object.assign(committed, query)
  page.value = 1
  emit('action', '岗位查询条件已生效')
}

function reset() {
  Object.assign(query, { keyword: '', status: '' })
  Object.assign(committed, query)
  page.value = 1
  emit('action', '岗位查询条件已重置')
}

function openDetail(record: PositionRecord) {
  selected.value = record
  detailVisible.value = true
}

function openForm(mode: 'create' | 'edit', record = selected.value) {
  selected.value = record
  formMode.value = mode
  Object.assign(form, {
    name: mode === 'create' ? '' : record.name,
    type: mode === 'create' ? '业务岗位' : record.type,
    sortOrder: mode === 'create' ? 0 : record.sortOrder,
    remarks: mode === 'create' ? '' : (record.remarks ?? ''),
  })
  formVisible.value = true
}

async function finishForm() {
  if (submitting.value) return
  if (!props.save) {
    formVisible.value = false
    emit('action', formMode.value === 'create' ? '岗位创建候选已保存' : '岗位编辑候选已保存')
    return
  }
  submitting.value = true
  try {
    await props.save(formMode.value, { ...form }, selected.value)
    formVisible.value = false
  } finally {
    submitting.value = false
  }
}

function openStatus(record: PositionRecord) {
  selected.value = record
  statusVisible.value = true
}

async function confirmStatusChange() {
  if (submitting.value) return
  if (!props.changeStatus) {
    statusVisible.value = false
    emit('action', '岗位状态候选操作已确认')
    return
  }
  submitting.value = true
  try {
    await props.changeStatus(
      selected.value,
      selected.value.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
    )
    statusVisible.value = false
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppPage class="position-page">
    <ListPageTemplate>
      <template #header>
        <PageHeader
          title="岗位管理"
          description="维护当前 Tenant 的岗位档案；岗位不承载角色或功能权限"
        />
      </template>

      <template #search>
        <SearchPanel :loading="state === 'loading'" @search="search" @reset="reset">
          <el-form-item label="关键词">
            <el-input
              v-model="query.keyword"
              clearable
              placeholder="岗位编码、名称或类型"
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="岗位状态">
            <el-select v-model="query.status" clearable placeholder="全部状态">
              <el-option label="启用" value="ACTIVE" />
              <el-option label="停用" value="DISABLED" />
            </el-select>
          </el-form-item>
          <el-form-item label="当前 Tenant">
            <el-input :model-value="tenant.name || '当前租户'" disabled />
          </el-form-item>
          <template #footer-leading>
            <el-button
              v-permission="IAM_PERMISSIONS.positions.create"
              type="primary"
              @click="openForm('create')"
            >
              <Icon icon="mdi:plus" width="18" aria-hidden="true" />
              新建岗位
            </el-button>
          </template>
        </SearchPanel>
      </template>

      <template #toolbar>
        <TableToolbar
          title="岗位列表"
          :total="visibleRecords.length"
          :refreshing="state === 'loading'"
          @refresh="emit('retry')"
        >
          <template #summary
            ><span class="position-page__timezone">有效期时区：Asia/Shanghai</span></template
          >
        </TableToolbar>
      </template>

      <el-alert
        v-if="state === 'retryable-error'"
        class="position-page__alert"
        title="岗位数据加载失败，当前列表未更新"
        type="error"
        :closable="false"
        show-icon
      >
        <template #default
          ><el-button link type="primary" @click="emit('retry')">重新加载</el-button></template
        >
      </el-alert>

      <DataTable
        :data="visibleRecords"
        :columns="columns"
        :loading="state === 'loading'"
        @row-click="openDetail(asPosition($event))"
      >
        <template #code="{ row }">
          <button
            class="position-page__link"
            type="button"
            @click.stop="openDetail(asPosition(row))"
          >
            {{ asPosition(row).code }}
          </button>
        </template>
        <template #status="{ row }">
          <StatusTag
            :label="asPosition(row).status === 'ACTIVE' ? '启用' : '停用'"
            :tone="asPosition(row).status === 'ACTIVE' ? 'success' : 'info'"
          />
        </template>
        <template #members="{ row }">
          <span :class="{ 'position-page__member-block': asPosition(row).activeMemberCount > 0 }">
            {{ asPosition(row).activeMemberCount }} 人
          </span>
        </template>
        <template #actions="{ row }">
          <RowActionGrid :aria-label="`${asPosition(row).name} 的操作`">
            <el-button link type="primary" @click.stop="openDetail(asPosition(row))"
              >详情</el-button
            >
            <el-button
              v-permission="IAM_PERMISSIONS.positions.update"
              link
              type="primary"
              @click.stop="openForm('edit', asPosition(row))"
              >编辑</el-button
            >
            <el-button
              v-permission="IAM_PERMISSIONS.positions.changeStatus"
              link
              :type="asPosition(row).status === 'ACTIVE' ? 'warning' : 'success'"
              @click.stop="openStatus(asPosition(row))"
            >
              {{ asPosition(row).status === 'ACTIVE' ? '停用' : '启用' }}
            </el-button>
          </RowActionGrid>
        </template>
      </DataTable>

      <template #pagination>
        <AppPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="visibleRecords.length"
          @change="emit('action', '岗位分页状态已更新')"
        />
      </template>
    </ListPageTemplate>

    <DetailDrawer v-model="detailVisible" :title="`${selected?.name ?? ''} · 岗位详情`">
      <div v-if="selected" class="position-detail">
        <div class="position-detail__summary">
          <div class="position-detail__icon">
            <Icon icon="mdi:account-tie-hat-outline" width="26" aria-hidden="true" />
          </div>
          <div>
            <strong>{{ selected.name }}</strong
            ><span>{{ selected.code }}</span>
          </div>
          <StatusTag
            :label="selected.status === 'ACTIVE' ? '启用' : '停用'"
            :tone="selected.status === 'ACTIVE' ? 'success' : 'info'"
          />
        </div>
        <el-alert
          title="岗位归属仅描述人员职责，不产生任何角色和权限。"
          type="info"
          :closable="false"
          show-icon
        />
        <el-descriptions :column="1" border>
          <el-descriptions-item label="所属 Tenant">{{
            tenant.name || '当前租户'
          }}</el-descriptions-item>
          <el-descriptions-item label="岗位类型">{{ selected.type }}</el-descriptions-item>
          <el-descriptions-item label="当前有效成员"
            >{{ selected.activeMemberCount }} 人</el-descriptions-item
          >
          <el-descriptions-item label="排序值">{{ selected.sortOrder }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ selected.updatedAt }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ selected.remarks || '—' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </DetailDrawer>

    <FormDrawer
      v-model="formVisible"
      :title="formMode === 'create' ? '新建岗位' : `编辑 ${selected.name}`"
      :confirm-button-text="formMode === 'create' ? '创建岗位' : '保存岗位'"
      :submitting="submitting"
      @confirm="finishForm"
    >
      <el-alert
        v-if="formMode === 'create'"
        title="岗位编码将在创建成功后由系统自动生成，无需填写。"
        type="info"
        :closable="false"
        show-icon
      />
      <el-form class="position-form" label-position="top">
        <el-form-item label="所属 Tenant"
          ><el-input :model-value="tenant.name || '当前租户'" disabled
        /></el-form-item>
        <el-form-item v-if="formMode === 'edit'" label="岗位编码">
          <el-input :model-value="selected.code" disabled />
        </el-form-item>
        <el-form-item label="岗位名称"
          ><el-input v-model="form.name" placeholder="请输入岗位名称"
        /></el-form-item>
        <el-form-item label="岗位类型"
          ><el-select v-model="form.type"
            ><el-option label="管理岗位" value="管理岗位" /><el-option
              label="业务岗位"
              value="业务岗位" /><el-option label="临时岗位" value="临时岗位" /></el-select
        ></el-form-item>
        <el-form-item label="排序值"
          ><el-input-number v-model="form.sortOrder" :min="0" controls-position="right"
        /></el-form-item>
        <el-form-item label="备注"
          ><el-input v-model="form.remarks" type="textarea" :rows="4" resize="none"
        /></el-form-item>
      </el-form>
    </FormDrawer>

    <el-dialog
      v-model="statusVisible"
      :title="`${selected.status === 'ACTIVE' ? '停用' : '启用'}岗位`"
      width="540"
    >
      <el-alert
        v-if="selected.status === 'ACTIVE' && selected.activeMemberCount > 0"
        title="该岗位存在有效成员，服务端会拒绝停用。请先结束成员岗位归属。"
        type="warning"
        :closable="false"
        show-icon
      />
      <p class="position-confirm">
        {{
          selected.status === 'ACTIVE'
            ? `停用 ${selected.name} 不会删除历史归属，也不会改变任何角色或权限。`
            : `启用 ${selected.name} 前将校验所属 Tenant 为启用状态。`
        }}
      </p>
      <template #footer>
        <el-button @click="statusVisible = false">取消</el-button>
        <el-button
          v-permission="IAM_PERMISSIONS.positions.changeStatus"
          :type="selected.status === 'ACTIVE' ? 'warning' : 'success'"
          :disabled="selected.status === 'ACTIVE' && selected.activeMemberCount > 0"
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
.position-page__timezone {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.position-page__alert {
  margin: var(--spacing-3) var(--spacing-4);
}

.position-page__link {
  padding: var(--spacing-1) 0;
  color: var(--color-primary);
  font: inherit;
  font-weight: 600;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.position-page__member-block {
  color: var(--color-warning);
  font-weight: 600;
}

.position-detail {
  display: grid;
  gap: var(--spacing-5);
}

.position-detail__summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-large);
}

.position-detail__icon {
  display: grid;
  width: var(--spacing-12);
  height: var(--spacing-12);
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-large);
  place-items: center;
}

.position-detail strong,
.position-detail span {
  display: block;
}

.position-detail span {
  margin-top: var(--spacing-1);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.position-form {
  display: grid;
}

.position-confirm {
  margin: var(--spacing-4) 0 0;
  color: var(--text-regular);
  line-height: 1.7;
}
</style>
