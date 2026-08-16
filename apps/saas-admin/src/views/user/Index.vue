<template>
  <page-container title="用户管理" description="管理全局用户信息" :show-header="true" :show-search="true">
    <template #search>
      <search-form
        :form-items="searchFormItems"
        v-model="searchParams"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #extra>
          <button class="btn btn-primary" @click="handleCreate">新增用户</button>
        </template>
      </search-form>
    </template>

    <data-table
      :columns="columns"
      :data="userList"
      :actions="actions"
      :pagination="true"
      :total="total"
      :page-num="searchParams.pageNum"
      :page-size="searchParams.pageSize"
      @page-change="handlePageChange"
    />

    <confirm-modal
      v-model:visible="deleteModalVisible"
      title="删除用户"
      content="确定要删除该用户吗？删除后无法恢复。"
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
import { getUserList, disableUser, deleteUser } from '@/api/iam/user';
import type { User, UserQueryParams, SearchFormItem, TableColumn, ActionButton } from '@/types';

const router = useRouter();

const searchFormItems: SearchFormItem[] = [
  { prop: 'username', label: '用户名', type: 'input', placeholder: '请输入用户名' },
  { prop: 'realName', label: '真实姓名', type: 'input', placeholder: '请输入真实姓名' },
  { prop: 'phone', label: '手机号', type: 'input', placeholder: '请输入手机号' },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '正常', value: 'active' },
      { label: '禁用', value: 'disabled' },
      { label: '锁定', value: 'locked' },
    ],
  },
];

const columns: TableColumn[] = [
  { prop: 'username', label: '用户名', width: 120 },
  { prop: 'realName', label: '真实姓名', width: 100 },
  { prop: 'phone', label: '手机号', width: 120 },
  { prop: 'email', label: '邮箱', width: 180 },
  {
    prop: 'userType',
    label: '用户类型',
    width: 100,
    formatter: (row) => {
      const typeMap: Record<string, string> = {
        platform_admin: '平台管理员',
        tenant_admin: '租户管理员',
        normal_user: '普通用户',
      };
      return typeMap[row.userType] || row.userType;
    },
  },
  {
    prop: 'status',
    label: '状态',
    width: 80,
    formatter: (row) => {
      const statusMap: Record<string, string> = {
        active: '正常',
        disabled: '禁用',
        locked: '锁定',
      };
      return statusMap[row.status] || row.status;
    },
  },
  {
    prop: 'lastLoginAt',
    label: '最后登录',
    width: 160,
    formatter: (row) => row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString('zh-CN') : '-',
  },
];

const actions: ActionButton[] = [
  {
    label: '编辑',
    type: 'primary',
    handler: (row: User) => router.push(`/user/edit/${row.id}`),
  },
  {
    label: '禁用',
    type: 'warning',
    handler: (row: User) => handleDisable(row),
    show: (row: User) => row.status === 'active',
  },
  {
    label: '删除',
    type: 'danger',
    handler: (row: User) => handleDelete(row),
  },
];

const searchParams = reactive<UserQueryParams>({
  username: '',
  realName: '',
  phone: '',
  email: '',
  userType: '',
  status: '',
  pageNum: 1,
  pageSize: 10,
});

const userList = ref<User[]>([]);
const total = ref(0);
const deleteModalVisible = ref(false);
const currentUser = ref<User | null>(null);

const loadUserList = async () => {
  try {
    const response = await getUserList(searchParams);
    userList.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载用户列表失败:', error);
  }
};

const handleSearch = () => {
  searchParams.pageNum = 1;
  loadUserList();
};

const handleReset = () => {
  searchParams.pageNum = 1;
  loadUserList();
};

const handlePageChange = (page: number) => {
  searchParams.pageNum = page;
  loadUserList();
};

const handleCreate = () => {
  router.push('/user/create');
};

const handleDisable = async (row: User) => {
  try {
    await disableUser(row.id);
    loadUserList();
  } catch (error) {
    console.error('禁用用户失败:', error);
  }
};

const handleDelete = (row: User) => {
  currentUser.value = row;
  deleteModalVisible.value = true;
};

const confirmDelete = async () => {
  if (!currentUser.value) return;
  try {
    await deleteUser(currentUser.value.id);
    loadUserList();
  } catch (error) {
    console.error('删除用户失败:', error);
  }
};

onMounted(() => {
  loadUserList();
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
