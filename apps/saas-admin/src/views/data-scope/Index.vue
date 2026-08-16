<template>
  <page-container title="数据权限配置" description="配置角色数据访问范围" :show-header="true" :show-search="true">
    <template #search>
      <search-form
        :form-items="searchFormItems"
        v-model="searchParams"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #extra>
          <button class="btn btn-primary" @click="handleCreate">新增配置</button>
        </template>
      </search-form>
    </template>

    <data-table
      :columns="columns"
      :data="dataScopeList"
      :actions="actions"
      :pagination="true"
      :total="total"
      :page-num="searchParams.pageNum"
      :page-size="searchParams.pageSize"
      @page-change="handlePageChange"
    />

    <confirm-modal
      v-model:visible="deleteModalVisible"
      title="删除数据权限"
      content="确定要删除该数据权限配置吗？删除后将影响该角色的数据访问范围。"
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
import { getDataScopeList, deleteDataScope } from '@/api/iam/data-scope';
import { useAuthStore } from '@/stores/auth';
import type { DataScope, DataScopeQueryParams, SearchFormItem, TableColumn, ActionButton } from '@/types';

const router = useRouter();
const authStore = useAuthStore();

const searchFormItems: SearchFormItem[] = [
  {
    prop: 'scopeMode',
    label: '范围模式',
    type: 'select',
    options: [
      { label: '全部数据', value: 'all' },
      { label: '本部门', value: 'dept' },
      { label: '本部门及下级', value: 'dept_tree' },
      { label: '仅本人', value: 'self' },
      { label: '自定义', value: 'custom' },
    ],
  },
];

const columns: TableColumn[] = [
  { prop: 'roleId', label: '角色ID', width: 100 },
  {
    prop: 'resourceType',
    label: '资源类型',
    width: 120,
  },
  {
    prop: 'scopeMode',
    label: '范围模式',
    width: 120,
    formatter: (row) => {
      const modeMap: Record<string, string> = {
        all: '全部数据',
        dept: '本部门',
        dept_tree: '本部门及下级',
        self: '仅本人',
        custom: '自定义',
      };
      return modeMap[row.scopeMode] || row.scopeMode;
    },
  },
  { prop: 'fieldName', label: '字段名', width: 150 },
  {
    prop: 'includeChildren',
    label: '包含下级',
    width: 80,
    formatter: (row) => (row.includeChildren ? '是' : '否'),
  },
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
    handler: (row: DataScope) => router.push(`/data-scope/edit/${row.id}`),
  },
  {
    label: '删除',
    type: 'danger',
    handler: (row: DataScope) => handleDelete(row),
  },
];

const searchParams = reactive<DataScopeQueryParams>({
  tenantId: authStore.tenantInfo?.tenantId || 1,
  scopeMode: '',
  pageNum: 1,
  pageSize: 10,
});

const dataScopeList = ref<DataScope[]>([]);
const total = ref(0);
const deleteModalVisible = ref(false);
const currentDataScope = ref<DataScope | null>(null);

const loadDataScopeList = async () => {
  try {
    const response = await getDataScopeList(searchParams);
    dataScopeList.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载数据权限列表失败:', error);
  }
};

const handleSearch = () => {
  searchParams.pageNum = 1;
  loadDataScopeList();
};

const handleReset = () => {
  searchParams.pageNum = 1;
  loadDataScopeList();
};

const handlePageChange = (page: number) => {
  searchParams.pageNum = page;
  loadDataScopeList();
};

const handleCreate = () => {
  router.push('/data-scope/create');
};

const handleDelete = (row: DataScope) => {
  currentDataScope.value = row;
  deleteModalVisible.value = true;
};

const confirmDelete = async () => {
  if (!currentDataScope.value) return;
  try {
    await deleteDataScope(currentDataScope.value.id);
    loadDataScopeList();
  } catch (error) {
    console.error('删除数据权限失败:', error);
  }
};

onMounted(() => {
  loadDataScopeList();
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
