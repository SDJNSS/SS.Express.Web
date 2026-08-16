<template>
  <page-container title="会话管理" description="管理用户会话信息" :show-header="true" :show-search="true">
    <template #search>
      <search-form
        :form-items="searchFormItems"
        v-model="searchParams"
        @search="handleSearch"
        @reset="handleReset"
      />
    </template>

    <data-table
      :columns="columns"
      :data="sessionList"
      :actions="actions"
      :pagination="true"
      :total="total"
      :page-num="searchParams.pageNum"
      :page-size="searchParams.pageSize"
      @page-change="handlePageChange"
    />

    <confirm-modal
      v-model:visible="revokeModalVisible"
      title="强制下线"
      content="确定要强制该会话下线吗？用户将被踢出系统。"
      type="danger"
      @confirm="confirmRevoke"
    />
  </page-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import PageContainer from '@/components/common/PageContainer.vue';
import SearchForm from '@/components/common/SearchForm.vue';
import DataTable from '@/components/common/DataTable.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import { getSessionList, revokeSession } from '@/api/iam/session';
import type { Session, SessionQueryParams, SearchFormItem, TableColumn, ActionButton } from '@/types';

const searchFormItems: SearchFormItem[] = [
  {
    prop: 'sessionStatus',
    label: '会话状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '活跃', value: 'active' },
      { label: '过期', value: 'expired' },
      { label: '撤销', value: 'revoked' },
    ],
  },
];

const columns: TableColumn[] = [
  { prop: 'userId', label: '用户ID', width: 100 },
  { prop: 'deviceType', label: '设备类型', width: 100 },
  { prop: 'loginIp', label: '登录IP', width: 150 },
  {
    prop: 'sessionStatus',
    label: '会话状态',
    width: 100,
    formatter: (row) => {
      const statusMap: Record<string, string> = {
        active: '活跃',
        expired: '过期',
        revoked: '撤销',
      };
      return statusMap[row.sessionStatus] || row.sessionStatus;
    },
  },
  {
    prop: 'issuedAt',
    label: '签发时间',
    width: 160,
    formatter: (row) => row.issuedAt ? new Date(row.issuedAt).toLocaleString('zh-CN') : '-',
  },
  {
    prop: 'expiresAt',
    label: '过期时间',
    width: 160,
    formatter: (row) => row.expiresAt ? new Date(row.expiresAt).toLocaleString('zh-CN') : '-',
  },
  {
    prop: 'revokedAt',
    label: '撤销时间',
    width: 160,
    formatter: (row) => row.revokedAt ? new Date(row.revokedAt).toLocaleString('zh-CN') : '-',
  },
];

const actions: ActionButton[] = [
  {
    label: '强制下线',
    type: 'danger',
    handler: (row: Session) => handleRevoke(row),
    show: (row: Session) => row.sessionStatus === 'active',
  },
];

const searchParams = reactive<SessionQueryParams>({
  sessionStatus: '',
  pageNum: 1,
  pageSize: 10,
});

const sessionList = ref<Session[]>([]);
const total = ref(0);
const revokeModalVisible = ref(false);
const currentSession = ref<Session | null>(null);

const loadSessionList = async () => {
  try {
    const response = await getSessionList(searchParams);
    sessionList.value = response.data.list;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载会话列表失败:', error);
  }
};

const handleSearch = () => {
  searchParams.pageNum = 1;
  loadSessionList();
};

const handleReset = () => {
  searchParams.pageNum = 1;
  loadSessionList();
};

const handlePageChange = (page: number) => {
  searchParams.pageNum = page;
  loadSessionList();
};

const handleRevoke = (row: Session) => {
  currentSession.value = row;
  revokeModalVisible.value = true;
};

const confirmRevoke = async () => {
  if (!currentSession.value) return;
  try {
    await revokeSession(currentSession.value.id);
    loadSessionList();
  } catch (error) {
    console.error('撤销会话失败:', error);
  }
};

onMounted(() => {
  loadSessionList();
});
</script>
