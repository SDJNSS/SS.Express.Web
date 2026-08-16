<template>
  <page-container title="组织架构管理" description="管理租户组织架构" :show-header="true">
    <div class="toolbar">
      <button class="btn btn-primary" @click="handleCreate(0)">新增根组织</button>
    </div>

    <tree-table
      v-if="orgTree.length > 0"
      :columns="columns"
      :data="orgTree"
      :actions="actions"
      :default-expand-all="true"
    />
    <div v-else class="empty-state">
      <p>暂无组织数据</p>
    </div>

    <confirm-modal
      v-model:visible="deleteModalVisible"
      title="删除组织"
      content="确定要删除该组织吗？删除后无法恢复，且会删除所有子组织。"
      type="danger"
      @confirm="confirmDelete"
    />
  </page-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import TreeTable from '@/components/common/TreeTable.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import { getOrgTree, enableOrg, disableOrg, deleteOrg } from '@/api/iam/org';
import { useAuthStore } from '@/stores/auth';
import type { Org, TableColumn, ActionButton } from '@/types';

const router = useRouter();
const authStore = useAuthStore();

const orgTree = ref<Org[]>([]);
const deleteModalVisible = ref(false);
const currentOrg = ref<Org | null>(null);

const columns: TableColumn[] = [
  { prop: 'orgName', label: '组织名称', width: 250 },
  { prop: 'orgCode', label: '组织编码', width: 150 },
  {
    prop: 'orgType',
    label: '组织类型',
    width: 100,
    formatter: (row) => {
      const typeMap: Record<string, string> = {
        company: '公司',
        department: '部门',
        team: '团队',
      };
      return typeMap[row.orgType] || row.orgType;
    },
  },
  { prop: 'level', label: '层级', width: 80 },
  { prop: 'sortOrder', label: '排序', width: 80 },
  {
    prop: 'status',
    label: '状态',
    width: 80,
    formatter: (row) => (row.status === 'active' ? '启用' : '停用'),
  },
];

const actions: ActionButton[] = [
  {
    label: '新增子组织',
    type: 'primary',
    handler: (row: Org) => handleCreate(row.id),
  },
  {
    label: '编辑',
    type: 'primary',
    handler: (row: Org) => router.push(`/org/edit/${row.id}`),
  },
  {
    label: '停用',
    type: 'warning',
    handler: (row: Org) => handleDisable(row),
    show: (row: Org) => row.status === 'active',
  },
  {
    label: '启用',
    type: 'success',
    handler: (row: Org) => handleEnable(row),
    show: (row: Org) => row.status !== 'active',
  },
  {
    label: '删除',
    type: 'danger',
    handler: (row: Org) => handleDelete(row),
  },
];

const loadOrgTree = async () => {
  try {
    const tenantId = authStore.tenantInfo?.tenantId || 1;
    const response = await getOrgTree(tenantId);
    orgTree.value = response.data;
  } catch (error) {
    console.error('加载组织树失败:', error);
  }
};

const handleCreate = (parentId: number) => {
  router.push({
    path: '/org/create',
    query: { parentId },
  });
};

const handleEnable = async (row: Org) => {
  try {
    await enableOrg(row.id);
    loadOrgTree();
  } catch (error) {
    console.error('启用组织失败:', error);
  }
};

const handleDisable = async (row: Org) => {
  try {
    await disableOrg(row.id);
    loadOrgTree();
  } catch (error) {
    console.error('停用组织失败:', error);
  }
};

const handleDelete = (row: Org) => {
  currentOrg.value = row;
  deleteModalVisible.value = true;
};

const confirmDelete = async () => {
  if (!currentOrg.value) return;
  try {
    await deleteOrg(currentOrg.value.id);
    loadOrgTree();
  } catch (error) {
    console.error('删除组织失败:', error);
  }
};

onMounted(() => {
  loadOrgTree();
});
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
}

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

.empty-state {
  padding: 80px 16px;
  text-align: center;
  color: #bfbfbf;
  font-size: 14px;
}
</style>
