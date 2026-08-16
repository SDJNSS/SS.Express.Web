<template>
  <page-container title="权限资源管理" description="管理租户权限资源" :show-header="true">
    <div class="toolbar">
      <button class="btn btn-primary" @click="handleCreate(0)">新增根资源</button>
    </div>

    <tree-table
      v-if="resourceTree.length > 0"
      :columns="columns"
      :data="resourceTree"
      :actions="actions"
      :default-expand-all="true"
    />
    <div v-else class="empty-state">
      <p>暂无资源数据</p>
    </div>

    <confirm-modal
      v-model:visible="deleteModalVisible"
      title="删除资源"
      content="确定要删除该资源吗？删除后无法恢复，且会删除所有子资源。"
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
import { getResourceTree, enableResource, disableResource, deleteResource } from '@/api/iam/resource';
import { useAuthStore } from '@/stores/auth';
import type { Resource, TableColumn, ActionButton } from '@/types';

const router = useRouter();
const authStore = useAuthStore();

const resourceTree = ref<Resource[]>([]);
const deleteModalVisible = ref(false);
const currentResource = ref<Resource | null>(null);

const columns: TableColumn[] = [
  { prop: 'resourceName', label: '资源名称', width: 250 },
  { prop: 'resourceCode', label: '资源编码', width: 150 },
  {
    prop: 'resourceType',
    label: '资源类型',
    width: 100,
    formatter: (row) => {
      const typeMap: Record<string, string> = {
        app: '应用',
        module: '模块',
        menu: '菜单',
        page: '页面',
        button: '按钮',
        api: 'API',
      };
      return typeMap[row.resourceType] || row.resourceType;
    },
  },
  { prop: 'permissionCode', label: '权限标识', width: 150 },
  { prop: 'routePath', label: '路由', width: 150 },
  {
    prop: 'isVisible',
    label: '可见',
    width: 60,
    formatter: (row) => (row.isVisible ? '是' : '否'),
  },
  { prop: 'sortOrder', label: '排序', width: 60 },
  {
    prop: 'status',
    label: '状态',
    width: 80,
    formatter: (row) => (row.status === 'active' ? '启用' : '停用'),
  },
];

const actions: ActionButton[] = [
  {
    label: '新增子资源',
    type: 'primary',
    handler: (row: Resource) => handleCreate(row.id),
  },
  {
    label: '编辑',
    type: 'primary',
    handler: (row: Resource) => router.push(`/resource/edit/${row.id}`),
  },
  {
    label: '停用',
    type: 'warning',
    handler: (row: Resource) => handleDisable(row),
    show: (row: Resource) => row.status === 'active',
  },
  {
    label: '启用',
    type: 'success',
    handler: (row: Resource) => handleEnable(row),
    show: (row: Resource) => row.status !== 'active',
  },
  {
    label: '删除',
    type: 'danger',
    handler: (row: Resource) => handleDelete(row),
  },
];

const loadResourceTree = async () => {
  try {
    const tenantId = authStore.tenantInfo?.tenantId || 1;
    const response = await getResourceTree(tenantId);
    resourceTree.value = response.data;
  } catch (error) {
    console.error('加载资源树失败:', error);
  }
};

const handleCreate = (parentId: number) => {
  router.push({
    path: '/resource/create',
    query: { parentId },
  });
};

const handleEnable = async (row: Resource) => {
  try {
    await enableResource(row.id);
    loadResourceTree();
  } catch (error) {
    console.error('启用资源失败:', error);
  }
};

const handleDisable = async (row: Resource) => {
  try {
    await disableResource(row.id);
    loadResourceTree();
  } catch (error) {
    console.error('停用资源失败:', error);
  }
};

const handleDelete = (row: Resource) => {
  currentResource.value = row;
  deleteModalVisible.value = true;
};

const confirmDelete = async () => {
  if (!currentResource.value) return;
  try {
    await deleteResource(currentResource.value.id);
    loadResourceTree();
  } catch (error) {
    console.error('删除资源失败:', error);
  }
};

onMounted(() => {
  loadResourceTree();
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
