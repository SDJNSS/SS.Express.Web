<script setup lang="ts">
import { ref } from 'vue'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'

interface PrototypeVehicle extends Record<string, unknown> {
  id: string
  plateNumber: string
  vehicleType: string
  organization: string
  driver: string
  certificateStatus: string
  status: string
  updatedAt: string
}

const page = ref(1)
const pageSize = ref(10)

const rows: PrototypeVehicle[] = [
  {
    id: '1',
    plateNumber: '沪A12345',
    vehicleType: '牵引车',
    organization: '华东运输中心',
    driver: '王师傅',
    certificateStatus: '正常',
    status: '运输中',
    updatedAt: '2026-09-01 10:24:30',
  },
  {
    id: '2',
    plateNumber: '粤B56789',
    vehicleType: '厢式车',
    organization: '华南运营中心',
    driver: '李师傅',
    certificateStatus: '即将到期',
    status: '待调度',
    updatedAt: '2026-09-01 09:25:30',
  },
  {
    id: '3',
    plateNumber: '陕A11223',
    vehicleType: '罐式车',
    organization: '西北项目组',
    driver: '赵师傅',
    certificateStatus: '正常',
    status: '空闲',
    updatedAt: '2026-09-01 08:26:30',
  },
]

const columns: DataTableColumn[] = [
  { prop: 'plateNumber', label: '车牌号', minWidth: 120 },
  { prop: 'vehicleType', label: '车辆类型', minWidth: 110 },
  { prop: 'organization', label: '所属组织', minWidth: 150 },
  { prop: 'driver', label: '当前司机', minWidth: 110 },
  { label: '证照状态', width: 110, slot: 'certificateStatus' },
  { label: '运营状态', width: 110, slot: 'status' },
  { prop: 'updatedAt', label: '更新时间', minWidth: 170 },
  { label: '操作', width: 150, fixed: 'right', slot: 'actions' },
]

function asVehicle(row: Record<string, unknown>): PrototypeVehicle {
  return row as PrototypeVehicle
}
</script>

<template>
  <AppPage :scrollable="false">
    <ListPageTemplate>
      <template #header>
        <PageHeader title="车辆档案" description="统一管理车辆基础资料、证照状态与运营状态">
          <template #actions
            ><el-button>导出</el-button><el-button type="primary">新建车辆</el-button></template
          >
        </PageHeader>
      </template>
      <template #search>
        <SearchPanel collapsible>
          <el-form-item label="车牌号"><el-input placeholder="请输入车牌号" /></el-form-item>
          <el-form-item label="车辆类型"><el-select placeholder="请选择车辆类型" /></el-form-item>
          <el-form-item label="运营状态"><el-select placeholder="请选择运营状态" /></el-form-item>
          <el-form-item label="所属组织"><el-select placeholder="请选择所属组织" /></el-form-item>
        </SearchPanel>
      </template>
      <template #toolbar><TableToolbar :total="18" /></template>
      <div class="prototype-table-body">
        <DataTable :data="rows" :columns="columns" height="100%" selection>
          <template #certificateStatus="{ row }">
            <StatusTag
              :label="asVehicle(row).certificateStatus"
              :tone="asVehicle(row).certificateStatus === '正常' ? 'success' : 'warning'"
            />
          </template>
          <template #status="{ row }"
            ><StatusTag :label="asVehicle(row).status" tone="info"
          /></template>
          <template #actions
            ><el-button link type="primary">详情</el-button
            ><el-button link type="primary">编辑</el-button></template
          >
        </DataTable>
      </div>
      <template #pagination>
        <AppPagination v-model:page="page" v-model:page-size="pageSize" :total="18" />
      </template>
    </ListPageTemplate>
  </AppPage>
</template>

<style scoped lang="scss">
.prototype-table-body {
  flex: 1;
  min-height: 0;
}

:deep(.el-form-item) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin: 0;
}

:deep(.el-form-item__label) {
  justify-content: flex-start;
  height: auto;
  padding-bottom: var(--spacing-2);
}
</style>
