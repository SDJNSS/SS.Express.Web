<template>
  <page-container title="角色管理" description="管理租户角色信息" :show-header="true" :show-search="true">
    <template #search>
      <search-form
        :form-items="searchFormItems"
        v-model="searchParams"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #extra>
          <button class="btn btn-primary" @click="handleCreate">新增角色</button>
        </template>
      </search-form>
    </template>

    <data-table
      :columns="columns"
      :data="roleList"
      :actions="actions"
      :pagination="true"
      :total="total"
      :page-num="searchParams.pageNum"
      :page-size="searchParams.pageSize"
      @page-change="handlePageChange"
    />

    <confirm-modal
      v-model:visible="deleteModalVisible"
      title="删除角色"
      content="确定要删除该角色吗？删除后无法恢复。"
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
import { getRoleList, enableRole, disableRole, deleteRole } from '@/api/iam/role';
import { useAuthStore } from '@/stores/auth';
import type { Role, RoleQueryParams, SearchFormItem, TableColumn, ActionButton } from '@/types';

const router = useRouter();
const authStore = useAuthStore();

const searchFormItems: SearchFormItem[] = [
  { prop: 'roleCode', label: '角色编码', type: 'input' },
  { prop: 'roleName', label: '角色名称', type: 'input' },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    options: [
      { label: '启用', value: 'active' },
      { label: '停用', value: 'inactive' },
    ],
  },
];

const columns: TableColumn[] = [
  { prop: 'roleCode', label: '角色编码', width: 120 },
  { prop: 'roleName', label: '角色名称', width: 150 },
  {
    prop: 'roleType',
    label: '角色类型',
    width: 120,
    formatter: (row) => {
      const typeMap: Record<string, string> = {
        system: '系统角色',
        custom: '自定义角色',
      };
      return typeMap[row.roleType] || row.roleType;
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
    handler: (row: Role) => router.push(`/role/edit/${row.id}`),
  },
  {
    label: '资源授权',
    type: 'primary',
    handler: (row: Role) => router.push(`/role/${row.id}/resources`),
  },
  {
    label: '停用',
    type: 'warning',
    handler: (row: Role) => handleDisable(row),
    show: (row: Role) => row.status === 'active',
  },
  {
    label: '启用',
    type: 'success',
    handler: (row: Role) => handleEnable(row),
    show: (row: Role) => row.status !== 'active',
  },
  {
    label: '删除',
    type: 'danger',
    handler: (row: Role) => handleDelete(row),
  },
];

const searchParams = reactive<RoleQueryParams>({
  tenantId: authStore.tenantInfo?.tenantId || 1,
  roleCode: '',
  roleName: '',
  status: '',
  pageNum: 1,
  pageSize: 10,
});

const roleList = ref<Role[]>([]);
const total = ref(0);
const deleteModalVisible = ref(false);
const currentRole = ref<Role | null>(null);

const loadRoleList = async () => {
  try {
    const response = await getRoleList(searchParams);
    roleList.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载角色列表失败:', error);
  }
};

const handleSearch = () => {
  searchParams.pageNum = 1;
  loadRoleList();
};

const handleReset = () => {
  searchParams.pageNum = 1;
  loadRoleList();
};

const handlePageChange = (page: number) => {
  searchParams.pageNum = page;
  loadRoleList();
};

const handleCreate = () => {
  router.push('/role/create');
};

const handleEnable = async (row: Role) => {
  try {
    await enableRole(row.id);
    loadRoleList();
  } catch (error) {
    console.error('启用角色失败:', error);
  }
};

const handleDisable = async (row: Role) => {
  try {
    await disableRole(row.id);
    loadRoleList();
  } catch (error) {
    console.error('停用角色失败:', error);
  }
};

const handleDelete = (row: Role) => {
  currentRole.value = row;
  deleteModalVisible.value = true;
};

const confirmDelete = async () => {
  if (!currentRole.value) return;
  try {
    await deleteRole(currentRole.value.id);
    loadRoleList();
  } catch (error) {
    console.error('删除角色失败:', error);
  }
};

onMounted(() => {
  loadRoleList();
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
