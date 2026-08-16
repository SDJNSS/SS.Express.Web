<template>
  <page-container title="角色模板管理" description="管理系统角色模板" :show-header="true" :show-search="true">
    <template #search>
      <search-form
        :form-items="searchFormItems"
        v-model="searchParams"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #extra>
          <button class="btn btn-primary" @click="handleCreate">新增模板</button>
        </template>
      </search-form>
    </template>

    <data-table
      :columns="columns"
      :data="templateList"
      :actions="actions"
      :pagination="true"
      :total="total"
      :page-num="searchParams.pageNum"
      :page-size="searchParams.pageSize"
      @page-change="handlePageChange"
    />

    <confirm-modal
      v-model:visible="deleteModalVisible"
      title="删除模板"
      content="确定要删除该角色模板吗？删除后无法恢复。"
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
import { getRoleTemplateList, deleteRoleTemplate } from '@/api/iam/role-template';
import type { RoleTemplate, RoleTemplateQueryParams, SearchFormItem, TableColumn, ActionButton } from '@/types';

const router = useRouter();

const searchFormItems: SearchFormItem[] = [
  { prop: 'templateCode', label: '模板编码', type: 'input' },
  { prop: 'templateName', label: '模板名称', type: 'input' },
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
  { prop: 'templateCode', label: '模板编码', width: 120 },
  { prop: 'templateName', label: '模板名称', width: 150 },
  { prop: 'appCode', label: '应用编码', width: 120 },
  {
    prop: 'templateType',
    label: '模板类型',
    width: 120,
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
    handler: (row: RoleTemplate) => router.push(`/role-template/edit/${row.id}`),
  },
  {
    label: '创建角色',
    type: 'success',
    handler: (row: RoleTemplate) => router.push(`/role-template/${row.id}/create-role`),
  },
  {
    label: '删除',
    type: 'danger',
    handler: (row: RoleTemplate) => handleDelete(row),
  },
];

const searchParams = reactive<RoleTemplateQueryParams>({
  templateCode: '',
  templateName: '',
  status: '',
  pageNum: 1,
  pageSize: 10,
});

const templateList = ref<RoleTemplate[]>([]);
const total = ref(0);
const deleteModalVisible = ref(false);
const currentTemplate = ref<RoleTemplate | null>(null);

const loadTemplateList = async () => {
  try {
    const response = await getRoleTemplateList(searchParams);
    templateList.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载角色模板列表失败:', error);
  }
};

const handleSearch = () => {
  searchParams.pageNum = 1;
  loadTemplateList();
};

const handleReset = () => {
  searchParams.pageNum = 1;
  loadTemplateList();
};

const handlePageChange = (page: number) => {
  searchParams.pageNum = page;
  loadTemplateList();
};

const handleCreate = () => {
  router.push('/role-template/create');
};

const handleDelete = (row: RoleTemplate) => {
  currentTemplate.value = row;
  deleteModalVisible.value = true;
};

const confirmDelete = async () => {
  if (!currentTemplate.value) return;
  try {
    await deleteRoleTemplate(currentTemplate.value.id);
    loadTemplateList();
  } catch (error) {
    console.error('删除角色模板失败:', error);
  }
};

onMounted(() => {
  loadTemplateList();
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
