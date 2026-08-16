<template>
  <page-container title="功能管理" description="管理应用功能模块与功能点" :show-header="true">
    <div class="toolbar">
      <div class="toolbar-left">
        <label>选择应用：</label>
        <select v-model="selectedAppId" class="app-select" @change="loadFeatureTree">
          <option value="">请选择应用</option>
          <option v-for="app in appList" :key="app.id" :value="app.id">
            {{ app.appName }}
          </option>
        </select>
      </div>
      <div class="toolbar-right">
        <button
          class="btn btn-primary"
          :disabled="!selectedAppId"
          @click="handleCreate(0)"
        >
          新增根功能
        </button>
      </div>
    </div>

    <tree-table
      v-if="featureTree.length > 0"
      :columns="columns"
      :data="featureTree"
      :actions="actions"
      :default-expand-all="true"
    />
    <div v-else class="empty-state">
      <p>{{ selectedAppId ? '暂无功能数据' : '请先选择应用' }}</p>
    </div>

    <confirm-modal
      v-model:visible="deleteModalVisible"
      title="删除功能"
      content="确定要删除该功能吗？删除后无法恢复，且会删除所有子功能。"
      type="danger"
      @confirm="confirmDelete"
    />
  </page-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import TreeTable from '@/components/common/TreeTable.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import { getAppList } from '@/api/saas/app';
import { getFeatureTree, enableFeature, disableFeature, deleteFeature } from '@/api/saas/feature';
import type { App, Feature, TableColumn, ActionButton } from '@/types';

const router = useRouter();

const selectedAppId = ref<number | string>('');
const appList = ref<App[]>([]);
const featureTree = ref<Feature[]>([]);
const deleteModalVisible = ref(false);
const currentFeature = ref<Feature | null>(null);

const columns: TableColumn[] = [
  { prop: 'featureName', label: '功能名称', width: 250 },
  { prop: 'featureCode', label: '功能编码', width: 150 },
  {
    prop: 'featureType',
    label: '功能类型',
    width: 100,
    formatter: (row) => (row.featureType === 'module' ? '模块' : '功能点'),
  },
  { prop: 'routePath', label: '路由路径', width: 150 },
  { prop: 'permissionCode', label: '权限标识', width: 150 },
  {
    prop: 'isVisible',
    label: '是否可见',
    width: 80,
    formatter: (row) => (row.isVisible ? '是' : '否'),
  },
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
    label: '新增子功能',
    type: 'primary',
    handler: (row: Feature) => handleCreate(row.id),
  },
  {
    label: '编辑',
    type: 'primary',
    handler: (row: Feature) => router.push(`/feature/edit/${row.id}`),
  },
  {
    label: '停用',
    type: 'warning',
    handler: (row: Feature) => handleDisable(row),
    show: (row: Feature) => row.status === 'active',
  },
  {
    label: '启用',
    type: 'success',
    handler: (row: Feature) => handleEnable(row),
    show: (row: Feature) => row.status !== 'active',
  },
  {
    label: '删除',
    type: 'danger',
    handler: (row: Feature) => handleDelete(row),
  },
];

const loadAppList = async () => {
  try {
    const response = await getAppList({ pageNum: 1, pageSize: 100 });
    appList.value = response.data.list.filter((app) => app.status === 'active');
  } catch (error) {
    console.error('加载应用列表失败:', error);
  }
};

const loadFeatureTree = async () => {
  if (!selectedAppId.value) {
    featureTree.value = [];
    return;
  }
  try {
    const response = await getFeatureTree(Number(selectedAppId.value));
    featureTree.value = response.data;
  } catch (error) {
    console.error('加载功能树失败:', error);
  }
};

const handleCreate = (parentId: number) => {
  router.push({
    path: '/feature/create',
    query: { appId: selectedAppId.value, parentId },
  });
};

const handleEnable = async (row: Feature) => {
  try {
    await enableFeature(row.id);
    loadFeatureTree();
  } catch (error) {
    console.error('启用功能失败:', error);
  }
};

const handleDisable = async (row: Feature) => {
  try {
    await disableFeature(row.id);
    loadFeatureTree();
  } catch (error) {
    console.error('停用功能失败:', error);
  }
};

const handleDelete = (row: Feature) => {
  currentFeature.value = row;
  deleteModalVisible.value = true;
};

const confirmDelete = async () => {
  if (!currentFeature.value) return;
  try {
    await deleteFeature(currentFeature.value.id);
    loadFeatureTree();
  } catch (error) {
    console.error('删除功能失败:', error);
  }
};

onMounted(() => {
  loadAppList();
});
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-left label {
  font-size: 14px;
  color: #262626;
  font-weight: 500;
}

.app-select {
  min-width: 200px;
  height: 32px;
  padding: 4px 11px;
  font-size: 14px;
  color: #262626;
  background-color: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.3s;
}

.app-select:hover {
  border-color: #40a9ff;
}

.app-select:focus {
  border-color: #40a9ff;
  outline: 0;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
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

.btn-primary:hover:not(:disabled) {
  background: #40a9ff;
  border-color: #40a9ff;
}

.btn:disabled {
  color: rgba(0, 0, 0, 0.25);
  background: #f5f5f5;
  border-color: #d9d9d9;
  cursor: not-allowed;
}

.empty-state {
  padding: 80px 16px;
  text-align: center;
  color: #bfbfbf;
  font-size: 14px;
}
</style>
