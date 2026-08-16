<template>
  <page-container title="套餐管理" description="管理系统套餐与功能配置" :show-header="true" :show-search="true">
    <template #search>
      <search-form
        :form-items="searchFormItems"
        v-model="searchParams"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #extra>
          <button class="btn btn-primary" @click="handleCreate">新增套餐</button>
        </template>
      </search-form>
    </template>

    <data-table
      :columns="columns"
      :data="planList"
      :actions="actions"
      :pagination="true"
      :total="total"
      :page-num="searchParams.pageNum"
      :page-size="searchParams.pageSize"
      @page-change="handlePageChange"
    />

    <confirm-modal
      v-model:visible="deleteModalVisible"
      title="删除套餐"
      content="确定要删除该套餐吗？删除后无法恢复。"
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
import { getPlanList, enablePlan, disablePlan, deletePlan } from '@/api/saas/plan';
import type { Plan, PlanQueryParams, SearchFormItem, TableColumn, ActionButton } from '@/types';

const router = useRouter();

const searchFormItems: SearchFormItem[] = [
  { prop: 'planCode', label: '套餐编码', type: 'input', placeholder: '请输入套餐编码' },
  { prop: 'planName', label: '套餐名称', type: 'input', placeholder: '请输入套餐名称' },
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
  { prop: 'planCode', label: '套餐编码', width: 120 },
  { prop: 'planName', label: '套餐名称', width: 150 },
  {
    prop: 'planType',
    label: '套餐类型',
    width: 100,
    formatter: (row) => {
      const typeMap: Record<string, string> = {
        basic: '基础版',
        standard: '标准版',
        professional: '专业版',
        enterprise: '企业版',
      };
      return typeMap[row.planType] || row.planType;
    },
  },
  {
    prop: 'billingCycle',
    label: '计费周期',
    width: 100,
    formatter: (row) => {
      const cycleMap: Record<string, string> = {
        month: '月付',
        quarter: '季付',
        year: '年付',
        once: '一次性',
      };
      return cycleMap[row.billingCycle] || row.billingCycle;
    },
  },
  {
    prop: 'price',
    label: '价格',
    width: 100,
    formatter: (row) => `${row.currency} ${row.price}`,
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
    handler: (row: Plan) => router.push(`/plan/edit/${row.id}`),
  },
  {
    label: '功能配置',
    type: 'primary',
    handler: (row: Plan) => router.push(`/plan/${row.id}/features`),
  },
  {
    label: '停用',
    type: 'warning',
    handler: (row: Plan) => handleDisable(row),
    show: (row: Plan) => row.status === 'active',
  },
  {
    label: '启用',
    type: 'success',
    handler: (row: Plan) => handleEnable(row),
    show: (row: Plan) => row.status !== 'active',
  },
  {
    label: '删除',
    type: 'danger',
    handler: (row: Plan) => handleDelete(row),
  },
];

const searchParams = reactive<PlanQueryParams>({
  planCode: '',
  planName: '',
  status: '',
  pageNum: 1,
  pageSize: 10,
});

const planList = ref<Plan[]>([]);
const total = ref(0);
const deleteModalVisible = ref(false);
const currentPlan = ref<Plan | null>(null);

const loadPlanList = async () => {
  try {
    const response = await getPlanList(searchParams);
    planList.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载套餐列表失败:', error);
  }
};

const handleSearch = () => {
  searchParams.pageNum = 1;
  loadPlanList();
};

const handleReset = () => {
  searchParams.pageNum = 1;
  loadPlanList();
};

const handlePageChange = (page: number) => {
  searchParams.pageNum = page;
  loadPlanList();
};

const handleCreate = () => {
  router.push('/plan/create');
};

const handleEnable = async (row: Plan) => {
  try {
    await enablePlan(row.id);
    loadPlanList();
  } catch (error) {
    console.error('启用套餐失败:', error);
  }
};

const handleDisable = async (row: Plan) => {
  try {
    await disablePlan(row.id);
    loadPlanList();
  } catch (error) {
    console.error('停用套餐失败:', error);
  }
};

const handleDelete = (row: Plan) => {
  currentPlan.value = row;
  deleteModalVisible.value = true;
};

const confirmDelete = async () => {
  if (!currentPlan.value) return;
  try {
    await deletePlan(currentPlan.value.id);
    loadPlanList();
  } catch (error) {
    console.error('删除套餐失败:', error);
  }
};

onMounted(() => {
  loadPlanList();
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
