<template>
  <page-container title="岗位管理" description="管理租户岗位信息" :show-header="true" :show-search="true">
    <template #search>
      <search-form
        :form-items="searchFormItems"
        v-model="searchParams"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #extra>
          <button class="btn btn-primary" @click="handleCreate">新增岗位</button>
        </template>
      </search-form>
    </template>

    <data-table
      :columns="columns"
      :data="positionList"
      :actions="actions"
      :pagination="true"
      :total="total"
      :page-num="searchParams.pageNum"
      :page-size="searchParams.pageSize"
      @page-change="handlePageChange"
    />

    <confirm-modal
      v-model:visible="deleteModalVisible"
      title="删除岗位"
      content="确定要删除该岗位吗？删除后无法恢复。"
      type="danger"
      @confirm="confirmDelete"
    />
  </page-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import SearchForm from '@/components/common/SearchForm.vue';
import DataTable from '@/components/common/DataTable.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import { getPositionList, enablePosition, disablePosition, deletePosition } from '@/api/iam/position';
import { useAuthStore } from '@/stores/auth';
import type { Position, PositionQueryParams, SearchFormItem, TableColumn, ActionButton } from '@/types';

const router = useRouter();
const authStore = useAuthStore();

const searchFormItems: SearchFormItem[] = [
  { prop: 'positionCode', label: '岗位编码', type: 'input', placeholder: '请输入岗位编码' },
  { prop: 'positionName', label: '岗位名称', type: 'input', placeholder: '请输入岗位名称' },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '启用', value: 'active' },
      { label: '停用', value: 'inactive' },
    ],
  },
];

const columns: TableColumn[] = [
  { prop: 'positionCode', label: '岗位编码', width: 120 },
  { prop: 'positionName', label: '岗位名称', width: 150 },
  {
    prop: 'positionType',
    label: '岗位类型',
    width: 120,
    formatter: (row) => {
      const typeMap: Record<string, string> = {
        management: '管理岗',
        technical: '技术岗',
        operation: '运营岗',
        support: '支持岗',
      };
      return typeMap[row.positionType] || row.positionType;
    },
  },
  { prop: 'sortOrder', label: '排序', width: 80 },
  {
    prop: 'status',
    label: '状态',
    width: 80,
    formatter: (row) => (row.status === 'active' ? '启用' : '停用'),
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    width: 160,
    formatter: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-',
  },
];

const actions: ActionButton[] = [
  {
    label: '编辑',
    type: 'primary',
    handler: (row: Position) => router.push(`/position/edit/${row.id}`),
  },
  {
    label: '成员管理',
    type: 'primary',
    handler: (row: Position) => router.push(`/position/${row.id}/members`),
  },
  {
    label: '停用',
    type: 'warning',
    handler: (row: Position) => handleDisable(row),
    show: (row: Position) => row.status === 'active',
  },
  {
    label: '启用',
    type: 'success',
    handler: (row: Position) => handleEnable(row),
    show: (row: Position) => row.status !== 'active',
  },
  {
    label: '删除',
    type: 'danger',
    handler: (row: Position) => handleDelete(row),
  },
];

const searchParams = reactive<PositionQueryParams>({
  tenantId: authStore.tenantInfo?.tenantId || 1,
  positionCode: '',
  positionName: '',
  status: '',
  pageNum: 1,
  pageSize: 10,
});

const positionList = ref<Position[]>([]);
const total = ref(0);
const deleteModalVisible = ref(false);
const currentPosition = ref<Position | null>(null);

const loadPositionList = async () => {
  try {
    const response = await getPositionList(searchParams);
    positionList.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载岗位列表失败:', error);
  }
};

const handleSearch = () => {
  searchParams.pageNum = 1;
  loadPositionList();
};

const handleReset = () => {
  searchParams.pageNum = 1;
  loadPositionList();
};

const handlePageChange = (page: number) => {
  searchParams.pageNum = page;
  loadPositionList();
};

const handleCreate = () => {
  router.push('/position/create');
};

const handleEnable = async (row: Position) => {
  try {
    await enablePosition(row.id);
    loadPositionList();
  } catch (error) {
    console.error('启用岗位失败:', error);
  }
};

const handleDisable = async (row: Position) => {
  try {
    await disablePosition(row.id);
    loadPositionList();
  } catch (error) {
    console.error('停用岗位失败:', error);
  }
};

const handleDelete = (row: Position) => {
  currentPosition.value = row;
  deleteModalVisible.value = true;
};

const confirmDelete = async () => {
  if (!currentPosition.value) return;
  try {
    await deletePosition(currentPosition.value.id);
    loadPositionList();
  } catch (error) {
    console.error('删除岗位失败:', error);
  }
};

onMounted(() => {
  loadPositionList();
});
</script>

<style scoped>
.btn {
  height: 32px;
  padding: 4px 15px;
  font-size: 14px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  color: #fff;
  background: #1890ff;
  border-color: #1890ff;
}

.btn-primary:hover {
  background: #40a9ff;
  border-color: #40a9ff;
}
</style>
