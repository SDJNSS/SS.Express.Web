<script setup lang="ts">
import { reactive, ref } from 'vue'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import { notification } from '@shared/services/notification'

interface ReferenceRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  owner: string
  status: 'active' | 'pending'
  updatedAt: string
}

const query = reactive({ keyword: '', status: '' })
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)

const rows: ReferenceRow[] = [
  {
    id: '1',
    code: 'REF-202609-001',
    name: '华东区域基础资料',
    owner: '林嘉',
    status: 'active',
    updatedAt: '2026-09-01 10:24',
  },
  {
    id: '2',
    code: 'REF-202609-002',
    name: '承运商准入复核',
    owner: '周宁',
    status: 'pending',
    updatedAt: '2026-09-01 09:18',
  },
  {
    id: '3',
    code: 'REF-202609-003',
    name: '车辆证照巡检',
    owner: '陈曦',
    status: 'active',
    updatedAt: '2026-08-31 17:42',
  },
]

const columns: DataTableColumn[] = [
  { prop: 'code', label: '编号', minWidth: 150, sortable: true },
  { prop: 'name', label: '名称', minWidth: 220 },
  { prop: 'owner', label: '负责人', width: 120 },
  { label: '状态', width: 100, slot: 'status' },
  { prop: 'updatedAt', label: '更新时间', width: 170, sortable: true },
  { label: '操作', width: 130, slot: 'actions' },
]

async function search() {
  loading.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 260))
  loading.value = false
  notification.success('查询条件已生效')
}

function reset() {
  query.keyword = ''
  query.status = ''
  void search()
}

function asReference(row: Record<string, unknown>): ReferenceRow {
  return row as ReferenceRow
}
</script>

<template>
  <AppPage>
    <ListPageTemplate>
      <template #header>
        <PageHeader
          title="ReferenceListPage"
          description="标准列表页模板：统一查询、工具栏、表格、分页与详情入口"
        >
          <template #actions><el-button type="primary">新建记录</el-button></template>
        </PageHeader>
      </template>
      <template #search>
        <SearchPanel :loading="loading" @search="search" @reset="reset">
          <el-form-item label="关键词"
            ><el-input v-model="query.keyword" placeholder="输入编号或名称"
          /></el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" placeholder="请选择状态" clearable>
              <el-option label="正常" value="active" /><el-option label="待处理" value="pending" />
            </el-select>
          </el-form-item>
        </SearchPanel>
      </template>
      <template #toolbar>
        <TableToolbar :total="rows.length" :refreshing="loading" @refresh="search" />
      </template>
      <div class="reference-table__body">
        <DataTable :data="rows" :columns="columns" :loading="loading" selection>
          <template #status="{ row }"
            ><StatusTag
              :label="asReference(row).status === 'active' ? '正常' : '待处理'"
              :tone="asReference(row).status === 'active' ? 'success' : 'warning'"
          /></template>
          <template #actions>
            <RowActionGrid aria-label="参考记录操作">
              <el-button link type="primary" @click="$router.push('/reference/detail')"
                >详情</el-button
              >
              <el-button link type="primary">编辑</el-button>
            </RowActionGrid>
          </template>
        </DataTable>
      </div>
      <template #pagination>
        <AppPagination v-model:page="page" v-model:page-size="pageSize" :total="rows.length" />
      </template>
    </ListPageTemplate>
  </AppPage>
</template>

<style scoped lang="scss">
.reference-table__body {
  flex: 1;
  min-height: 0;
}
</style>
