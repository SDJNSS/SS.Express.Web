<template>
  <page-container title="应用管理" description="管理平台应用信息" :show-header="true" :show-search="true">
    <template #search>
      <search-form
        :form-items="searchFormItems"
        v-model="searchParams"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #extra>
          <button class="btn btn-primary" @click="handleCreate">新增应用</button>
        </template>
      </search-form>
    </template>

    <data-table
      :columns="columns"
      :data="appList"
      :actions="actions"
      :pagination="true"
      :total="total"
      :page-num="searchParams.pageNum"
      :page-size="searchParams.pageSize"
      @page-change="handlePageChange"
    />

    <confirm-modal
      v-model:visible="deleteModalVisible"
      title="删除应用"
      content="确定要删除该应用吗？删除后无法恢复，且会影响相关套餐配置。"
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
import { getAppList, enableApp, disableApp, deleteApp } from '@/api/saas/app';
import type { App, AppQueryParams, SearchFormItem, TableColumn, ActionButton } from '@/types';

const router = useRouter();

const searchFormItems: SearchFormItem[] = [
  { prop: 'appCode', label: '应用编码', type: 'input', placeholder: '请输入应用编码' },
  { prop: 'appName', label: '应用名称', type: 'input', placeholder: '请输入应用名称' },
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
  { prop: 'appCode', label: '应用编码', width: 120 },
  { prop: 'appName', label: '应用名称', width: 150 },
  {
    prop: 'appType',
    label: '应用类型',
    width: 120,
    formatter: (row) => {
      const typeMap: Record<string, string> = {
        web: 'Web应用',
        mobile: '移动应用',
        api: 'API服务',
      };
      return typeMap[row.appType] || row.appType;
    },
  },
  { prop: 'appVersion', label: '版本', width: 100 },
  { prop: 'routePath', label: '路由路径', width: 150 },
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
    formatter: (row) => {
      return row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-';
    },
  },
];

const actions: ActionButton[] = [
  {
    label: '编辑',
    type: 'primary',
    handler: (row: App) => router.push(`/app/edit/${row.id}`),
  },
  {
    label: '停用',
    type: 'warning',
    handler: (row: App) => handleDisable(row),
    show: (row: App) => row.status === 'active',
  },
  {
    label: '启用',
    type: 'success',
    handler: (row: App) => handleEnable(row),
    show: (row: App) => row.status !== 'active',
  },
  {
    label: '删除',
    type: 'danger',
    handler: (row: App) => handleDelete(row),
  },
];

const searchParams = reactive<AppQueryParams>({
  appCode: '',
  appName: '',
  status: '',
  pageNum: 1,
  pageSize: 10,
});

const appList = ref<App[]>([]);
const total = ref(0);
const deleteModalVisible = ref(false);
const currentApp = ref<App | null>(null);

const loadAppList = async () => {
  try {
    const response = await getAppList(searchParams);
    appList.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载应用列表失败:', error);
  }
};

const handleSearch = () => {
  searchParams.pageNum = 1;
  loadAppList();
};

const handleReset = () => {
  searchParams.pageNum = 1;
  loadAppList();
};

const handlePageChange = (page: number) => {
  searchParams.pageNum = page;
  loadAppList();
};

const handleCreate = () => {
  router.push('/app/create');
};

const handleEnable = async (row: App) => {
  try {
    await enableApp(row.id);
    loadAppList();
  } catch (error) {
    console.error('启用应用失败:', error);
  }
};

const handleDisable = async (row: App) => {
  try {
    await disableApp(row.id);
    loadAppList();
  } catch (error) {
    console.error('停用应用失败:', error);
  }
};

const handleDelete = (row: App) => {
  currentApp.value = row;
  deleteModalVisible.value = true;
};

const confirmDelete = async () => {
  if (!currentApp.value) return;
  try {
    await deleteApp(currentApp.value.id);
    loadAppList();
  } catch (error) {
    console.error('删除应用失败:', error);
  }
};

onMounted(() => {
  loadAppList();
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
