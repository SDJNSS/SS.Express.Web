<template>
  <page-container title="租户用户管理" description="管理租户内的用户身份" :show-header="true" :show-search="true">
    <template #search>
      <search-form
        :form-items="searchFormItems"
        v-model="searchParams"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #extra>
          <button class="btn btn-primary" @click="handleCreate">绑定用户</button>
        </template>
      </search-form>
    </template>

    <data-table
      :columns="columns"
      :data="tenantUserList"
      :actions="actions"
      :pagination="true"
      :total="total"
      :page-num="searchParams.pageNum"
      :page-size="searchParams.pageSize"
      @page-change="handlePageChange"
    />

    <confirm-modal
      v-model:visible="leaveModalVisible"
      title="移出租户"
      content="确定要将该用户移出租户吗？移出后用户将无法访问该租户。"
      type="danger"
      @confirm="confirmLeave"
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
import { getTenantUserList, disableTenantUser, leaveTenant, setTenantAdmin } from '@/api/iam/tenant-user';
import type { TenantUser, TenantUserQueryParams, SearchFormItem, TableColumn, ActionButton } from '@/types';

const router = useRouter();

const searchFormItems: SearchFormItem[] = [
  { prop: 'displayName', label: '显示名称', type: 'input', placeholder: '请输入显示名称' },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '正常', value: 'active' },
      { label: '禁用', value: 'disabled' },
    ],
  },
];

const columns: TableColumn[] = [
  {
    prop: 'user',
    label: '用户名',
    width: 120,
    formatter: (row) => row.user?.username || '-',
  },
  { prop: 'displayName', label: '显示名称', width: 120 },
  {
    prop: 'isTenantAdmin',
    label: '租户管理员',
    width: 100,
    formatter: (row) => (row.isTenantAdmin ? '是' : '否'),
  },
  {
    prop: 'status',
    label: '状态',
    width: 80,
    formatter: (row) => (row.status === 'active' ? '正常' : '禁用'),
  },
  {
    prop: 'joinedAt',
    label: '加入时间',
    width: 160,
    formatter: (row) => row.joinedAt ? new Date(row.joinedAt).toLocaleString('zh-CN') : '-',
  },
];

const actions: ActionButton[] = [
  {
    label: '设为管理员',
    type: 'primary',
    handler: (row: TenantUser) => handleSetAdmin(row, true),
    show: (row: TenantUser) => !row.isTenantAdmin,
  },
  {
    label: '取消管理员',
    type: 'warning',
    handler: (row: TenantUser) => handleSetAdmin(row, false),
    show: (row: TenantUser) => row.isTenantAdmin,
  },
  {
    label: '禁用',
    type: 'warning',
    handler: (row: TenantUser) => handleDisable(row),
    show: (row: TenantUser) => row.status === 'active',
  },
  {
    label: '移出租户',
    type: 'danger',
    handler: (row: TenantUser) => handleLeave(row),
  },
];

const searchParams = reactive<TenantUserQueryParams>({
  tenantId: 1,
  displayName: '',
  status: '',
  pageNum: 1,
  pageSize: 10,
});

const tenantUserList = ref<TenantUser[]>([]);
const total = ref(0);
const leaveModalVisible = ref(false);
const currentTenantUser = ref<TenantUser | null>(null);

const loadTenantUserList = async () => {
  try {
    const response = await getTenantUserList(searchParams);
    tenantUserList.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载租户用户列表失败:', error);
  }
};

const handleSearch = () => {
  searchParams.pageNum = 1;
  loadTenantUserList();
};

const handleReset = () => {
  searchParams.pageNum = 1;
  loadTenantUserList();
};

const handlePageChange = (page: number) => {
  searchParams.pageNum = page;
  loadTenantUserList();
};

const handleCreate = () => {
  router.push('/tenant-user/create');
};

const handleSetAdmin = async (row: TenantUser, isAdmin: boolean) => {
  try {
    await setTenantAdmin(row.id, isAdmin);
    loadTenantUserList();
  } catch (error) {
    console.error('设置租户管理员失败:', error);
  }
};

const handleDisable = async (row: TenantUser) => {
  try {
    await disableTenantUser(row.id);
    loadTenantUserList();
  } catch (error) {
    console.error('禁用租户用户失败:', error);
  }
};

const handleLeave = (row: TenantUser) => {
  currentTenantUser.value = row;
  leaveModalVisible.value = true;
};

const confirmLeave = async () => {
  if (!currentTenantUser.value) return;
  try {
    await leaveTenant(currentTenantUser.value.id);
    loadTenantUserList();
  } catch (error) {
    console.error('移出租户失败:', error);
  }
};

onMounted(() => {
  loadTenantUserList();
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
