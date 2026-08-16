<template>
  <page-container title="订阅管理" description="管理租户订阅信息" :show-header="true" :show-search="true">
    <template #search>
      <search-form
        :form-items="searchFormItems"
        v-model="searchParams"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #extra>
          <button class="btn btn-primary" @click="handleCreate">新增订阅</button>
        </template>
      </search-form>
    </template>

    <data-table
      :columns="columns"
      :data="subscriptionList"
      :actions="actions"
      :pagination="true"
      :total="total"
      :page-num="searchParams.pageNum"
      :page-size="searchParams.pageSize"
      @page-change="handlePageChange"
    />

    <confirm-modal
      v-model:visible="cancelModalVisible"
      title="取消订阅"
      content="确定要取消该订阅吗？取消后租户将无法访问相关功能。"
      type="danger"
      @confirm="confirmCancel"
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
import { getSubscriptionList, cancelSubscription } from '@/api/saas/subscription';
import type { Subscription, SubscriptionQueryParams, SearchFormItem, TableColumn, ActionButton } from '@/types';

const router = useRouter();

const searchFormItems: SearchFormItem[] = [
  {
    prop: 'subscriptionStatus',
    label: '订阅状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '试用', value: 'trial' },
      { label: '正式', value: 'active' },
      { label: '冻结', value: 'frozen' },
      { label: '过期', value: 'expired' },
      { label: '取消', value: 'cancelled' },
    ],
  },
];

const columns: TableColumn[] = [
  { prop: 'subscriptionCode', label: '订阅编码', width: 150 },
  {
    prop: 'tenant',
    label: '租户',
    width: 150,
    formatter: (row) => row.tenant?.tenantName || '-',
  },
  {
    prop: 'plan',
    label: '套餐',
    width: 150,
    formatter: (row) => row.plan?.planName || '-',
  },
  {
    prop: 'subscriptionStatus',
    label: '订阅状态',
    width: 100,
    formatter: (row) => {
      const statusMap: Record<string, string> = {
        trial: '试用',
        active: '正式',
        frozen: '冻结',
        expired: '过期',
        cancelled: '取消',
      };
      return statusMap[row.subscriptionStatus] || row.subscriptionStatus;
    },
  },
  {
    prop: 'startAt',
    label: '开始时间',
    width: 160,
    formatter: (row) => row.startAt ? new Date(row.startAt).toLocaleString('zh-CN') : '-',
  },
  {
    prop: 'endAt',
    label: '结束时间',
    width: 160,
    formatter: (row) => row.endAt ? new Date(row.endAt).toLocaleString('zh-CN') : '-',
  },
  {
    prop: 'autoRenew',
    label: '自动续费',
    width: 80,
    formatter: (row) => (row.autoRenew ? '是' : '否'),
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
    handler: (row: Subscription) => router.push(`/subscription/edit/${row.id}`),
    show: (row: Subscription) => row.subscriptionStatus !== 'cancelled',
  },
  {
    label: '续费',
    type: 'success',
    handler: (row: Subscription) => router.push(`/subscription/${row.id}/renew`),
    show: (row: Subscription) => ['active', 'trial', 'expired'].includes(row.subscriptionStatus),
  },
  {
    label: '取消',
    type: 'danger',
    handler: (row: Subscription) => handleCancel(row),
    show: (row: Subscription) => row.subscriptionStatus !== 'cancelled',
  },
];

const searchParams = reactive<SubscriptionQueryParams>({
  subscriptionStatus: '',
  pageNum: 1,
  pageSize: 10,
});

const subscriptionList = ref<Subscription[]>([]);
const total = ref(0);
const cancelModalVisible = ref(false);
const currentSubscription = ref<Subscription | null>(null);

const loadSubscriptionList = async () => {
  try {
    const response = await getSubscriptionList(searchParams);
    subscriptionList.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载订阅列表失败:', error);
  }
};

const handleSearch = () => {
  searchParams.pageNum = 1;
  loadSubscriptionList();
};

const handleReset = () => {
  searchParams.pageNum = 1;
  loadSubscriptionList();
};

const handlePageChange = (page: number) => {
  searchParams.pageNum = page;
  loadSubscriptionList();
};

const handleCreate = () => {
  router.push('/subscription/create');
};

const handleCancel = (row: Subscription) => {
  currentSubscription.value = row;
  cancelModalVisible.value = true;
};

const confirmCancel = async () => {
  if (!currentSubscription.value) return;
  try {
    await cancelSubscription(currentSubscription.value.id);
    loadSubscriptionList();
  } catch (error) {
    console.error('取消订阅失败:', error);
  }
};

onMounted(() => {
  loadSubscriptionList();
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
