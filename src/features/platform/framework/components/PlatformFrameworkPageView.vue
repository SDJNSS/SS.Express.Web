<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag, { type StatusTone } from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import type {
  FrameworkPreviewState,
  FrameworkSearchModel,
  FrameworkStatus,
  FrameworkTaskRow,
} from '../types/frameworkShell'

const props = defineProps<{
  modelValue: FrameworkSearchModel
  rows: FrameworkTaskRow[]
  total: number
  page: number
  pageSize: number
  state: FrameworkPreviewState
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FrameworkSearchModel]
  'update:page': [value: number]
  'update:pageSize': [value: number]
  search: []
  reset: []
  refresh: []
  retry: []
}>()

const statusMeta: Record<FrameworkStatus, { label: string; tone: StatusTone }> = {
  pending: { label: '待调度', tone: 'warning' },
  'in-transit': { label: '运输中', tone: 'primary' },
  exception: { label: '有异常', tone: 'danger' },
  completed: { label: '已完成', tone: 'success' },
}

const columns: DataTableColumn[] = [
  { prop: 'taskNo', label: '任务编号', minWidth: 184, sortable: true },
  { prop: 'route', label: '运输线路', minWidth: 210 },
  { prop: 'planWindow', label: '计划窗口', minWidth: 170, sortable: true },
  { prop: 'vehicle', label: '车辆', width: 122 },
  { prop: 'dispatcher', label: '调度员', width: 104 },
  { label: '执行状态', width: 112, slot: 'status' },
]

const tableRows = computed(() => (props.state === 'empty' ? [] : props.rows))
const isLoading = computed(() => props.state === 'loading')
const isError = computed(() => props.state === 'retryable-error')

function updateKeyword(keyword: string) {
  emit('update:modelValue', { ...props.modelValue, keyword })
}

function updateStatus(status: FrameworkSearchModel['status']) {
  emit('update:modelValue', { ...props.modelValue, status })
}

function updateRouteType(routeType: FrameworkSearchModel['routeType']) {
  emit('update:modelValue', { ...props.modelValue, routeType })
}

function asTask(row: Record<string, unknown>): FrameworkTaskRow {
  return row as FrameworkTaskRow
}
</script>

<template>
  <AppPage class="framework-page" :data-page-state="state">
    <ListPageTemplate>
      <template #header>
        <PageHeader title="运输任务" description="统一查看调度任务、运输线路与当前执行状态">
          <template #actions>
            <el-tag type="info" effect="plain">候选预览</el-tag>
          </template>
        </PageHeader>
      </template>

      <template #search>
        <SearchPanel :loading="isLoading" @search="emit('search')" @reset="emit('reset')">
          <el-form-item label="任务检索">
            <el-input
              :model-value="modelValue.keyword"
              placeholder="输入任务编号、线路或车辆"
              clearable
              @update:model-value="updateKeyword"
            />
          </el-form-item>
          <el-form-item label="执行状态">
            <el-select
              :model-value="modelValue.status"
              placeholder="全部状态"
              clearable
              @update:model-value="updateStatus"
            >
              <el-option label="待调度" value="pending" />
              <el-option label="运输中" value="in-transit" />
              <el-option label="有异常" value="exception" />
              <el-option label="已完成" value="completed" />
            </el-select>
          </el-form-item>
          <el-form-item label="线路类型">
            <el-select
              :model-value="modelValue.routeType"
              placeholder="全部线路"
              clearable
              @update:model-value="updateRouteType"
            >
              <el-option label="本地运输" value="local" />
              <el-option label="干线运输" value="linehaul" />
            </el-select>
          </el-form-item>
        </SearchPanel>
      </template>

      <template #toolbar>
        <TableToolbar
          title="运输任务清单"
          :total="total"
          :refreshing="isLoading"
          @refresh="emit('refresh')"
        >
          <template #summary>
            <span class="framework-page__scope">预览数据 · 不连接生产服务</span>
          </template>
        </TableToolbar>
      </template>

      <section v-if="isError" class="framework-page__feedback" role="alert">
        <Icon icon="mdi:alert-circle-outline" width="28" aria-hidden="true" />
        <strong>任务数据暂时无法加载</strong>
        <span>候选场景用于验证错误信息、恢复动作和结果区域的稳定性。</span>
        <el-button type="primary" @click="emit('retry')">重新加载</el-button>
      </section>

      <div v-else class="framework-page__table" aria-label="运输任务结果">
        <DataTable :data="tableRows" :columns="columns" :loading="isLoading">
          <template #status="{ row }">
            <StatusTag
              :label="statusMeta[asTask(row).status].label"
              :tone="statusMeta[asTask(row).status].tone"
            />
          </template>
        </DataTable>
      </div>

      <template #pagination>
        <AppPagination
          :page="page"
          :page-size="pageSize"
          :total="total"
          @update:page="emit('update:page', $event)"
          @update:page-size="emit('update:pageSize', $event)"
        />
      </template>
    </ListPageTemplate>
  </AppPage>
</template>

<style scoped lang="scss">
.framework-page__scope {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.framework-page__table,
.framework-page__feedback {
  flex: 1;
  min-height: 0;
}

.framework-page__feedback {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-8);
  color: var(--text-secondary);
  text-align: center;
}

.framework-page__feedback svg,
.framework-page__feedback strong {
  color: var(--text-primary);
}
</style>
