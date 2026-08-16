<template>
  <page-container title="租户管理" description="管理平台租户信息" :show-header="true" :show-search="true">
    <template #search>
      <search-form
        :form-items="searchFormItems"
        v-model="searchParams"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #extra>
          <button class="btn btn-primary" @click="handleCreate">新增租户</button>
        </template>
      </search-form>
    </template>

    <data-table
      :columns="columns"
      :data="tenantList"
      :actions="actions"
      :pagination="true"
      :total="total"
      :page-num="searchParams.pageNum"
      :page-size="searchParams.pageSize"
      @page-change="handlePageChange"
    />

    <!-- 冻结确认对话框 -->
    <confirm-modal
      v-model:visible="freezeModalVisible"
      title="冻结租户"
      content="确定要冻结该租户吗？冻结后租户将无法访问系统。"
      type="danger"
      @confirm="confirmFreeze"
    />

    <!-- 解冻确认对话框 -->
    <confirm-modal
      v-model:visible="unfreezeModalVisible"
      title="解冻租户"
      content="确定要解冻该租户吗？解冻后租户将可以正常访问系统。"
      @confirm="confirmUnfreeze"
    />

    <!-- 删除确认对话框 -->
    <confirm-modal
      v-model:visible="deleteModalVisible"
      title="删除租户"
      content="确定要删除该租户吗？删除后无法恢复。"
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
import { getTenantList, freezeTenant, unfreezeTenant, deleteTenant } from '@/api/saas/tenant';
import type { Tenant, TenantQueryParams, SearchFormItem, TableColumn, ActionButton } from '@/types';

const router = useRouter();

// 搜索表单项配置
const searchFormItems: SearchFormItem[] = [
  { prop: 'tenantCode', label: '租户编码', type: 'input', placeholder: '请输入租户编码' },
  { prop: 'tenantName', label: '租户名称', type: 'input', placeholder: '请输入租户名称' },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '试用', value: 'trial' },
      { label: '正式', value: 'active' },
      { label: '冻结', value: 'frozen' },
      { label: '过期', value: 'expired' },
      { label: '注销', value: 'cancelled' },
    ],
  },
];

// 表格列配置
const columns: TableColumn[] = [
  { prop: 'tenantCode', label: '租户编码', width: 120 },
  { prop: 'tenantName', label: '租户名称', width: 150 },
  { prop: 'companyName', label: '企业名称', width: 200 },
  { prop: 'contactName', label: '联系人', width: 100 },
  { prop: 'contactPhone', label: '联系电话', width: 120 },
  {
    prop: 'status',
    label: '状态',
    width: 80,
    formatter: (row) => {
      const statusMap: Record<string, string> = {
        trial: '试用',
        active: '正式',
        frozen: '冻结',
        expired: '过期',
        cancelled: '注销',
      };
      return statusMap[row.status] || row.status;
    },
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

// 操作按钮配置
const actions: ActionButton[] = [
  {
    label: '编辑',
    type: 'primary',
    handler: (row: Tenant) => handleEdit(row),
    show: (row: Tenant) => row.status !== 'cancelled',
  },
  {
    label: '冻结',
    type: 'warning',
    handler: (row: Tenant) => handleFreeze(row),
    show: (row: Tenant) => row.status === 'active',
  },
  {
    label: '解冻',
    type: 'success',
    handler: (row: Tenant) => handleUnfreeze(row),
    show: (row: Tenant) => row.status === 'frozen',
  },
  {
    label: '删除',
    type: 'danger',
    handler: (row: Tenant) => handleDelete(row),
    show: (row: Tenant) => row.status !== 'cancelled',
  },
];

// 搜索参数
const searchParams = reactive<TenantQueryParams>({
  tenantCode: '',
  tenantName: '',
  status: '',
  pageNum: 1,
  pageSize: 10,
});

// 租户列表
const tenantList = ref<Tenant[]>([]);
const total = ref(0);

// 对话框状态
const freezeModalVisible = ref(false);
const unfreezeModalVisible = ref(false);
const deleteModalVisible = ref(false);
const currentTenant = ref<Tenant | null>(null);

// 加载租户列表
const loadTenantList = async () => {
  try {
    const response = await getTenantList(searchParams);
    tenantList.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载租户列表失败:', error);
  }
};

// 搜索
const handleSearch = () => {
  searchParams.pageNum = 1;
  loadTenantList();
};

// 重置
const handleReset = () => {
  searchParams.pageNum = 1;
  loadTenantList();
};

// 分页
const handlePageChange = (page: number) => {
  searchParams.pageNum = page;
  loadTenantList();
};

// 新增
const handleCreate = () => {
  router.push('/tenant/create');
};

// 编辑
const handleEdit = (row: Tenant) => {
  router.push(`/tenant/edit/${row.id}`);
};

// 冻结
const handleFreeze = (row: Tenant) => {
  currentTenant.value = row;
  freezeModalVisible.value = true;
};

const confirmFreeze = async () => {
  if (!currentTenant.value) return;
  try {
    await freezeTenant(currentTenant.value.id);
    loadTenantList();
  } catch (error) {
    console.error('冻结租户失败:', error);
  }
};

// 解冻
const handleUnfreeze = (row: Tenant) => {
  currentTenant.value = row;
  unfreezeModalVisible.value = true;
};

const confirmUnfreeze = async () => {
  if (!currentTenant.value) return;
  try {
    await unfreezeTenant(currentTenant.value.id);
    loadTenantList();
  } catch (error) {
    console.error('解冻租户失败:', error);
  }
};

// 删除
const handleDelete = (row: Tenant) => {
  currentTenant.value = row;
  deleteModalVisible.value = true;
};

const confirmDelete = async () => {
  if (!currentTenant.value) return;
  try {
    await deleteTenant(currentTenant.value.id);
    loadTenantList();
  } catch (error) {
    console.error('删除租户失败:', error);
  }
};

onMounted(() => {
  loadTenantList();
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
