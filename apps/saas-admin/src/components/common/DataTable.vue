<template>
  <div class="data-table">
    <table class="table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.prop" :width="column.width">
            {{ column.label }}
          </th>
          <th v-if="$slots.actions || actions" width="200">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in data" :key="index">
          <td v-for="column in columns" :key="column.prop">
            <span v-if="column.formatter">{{
              column.formatter(row, column, row[column.prop], index)
            }}</span>
            <span v-else>{{ row[column.prop] }}</span>
          </td>
          <td v-if="$slots.actions || actions" class="action-cell">
            <slot name="actions" :row="row" :index="index">
              <button
                v-for="action in getVisibleActions(row)"
                :key="action.label"
                class="action-btn"
                :class="`action-${action.type || 'text'}`"
                :disabled="getActionDisabled(action, row)"
                @click="action.handler(row)"
              >
                {{ action.label }}
              </button>
            </slot>
          </td>
        </tr>
        <tr v-if="!data || data.length === 0">
          <td :colspan="columns.length + (actions ? 1 : 0)" class="empty-cell">
            暂无数据
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="pagination" class="table-pagination">
      <div class="pagination-info">
        共 {{ total }} 条记录，第 {{ pageNum }} / {{ totalPages }} 页
      </div>
      <div class="pagination-btns">
        <button class="btn" :disabled="pageNum <= 1" @click="handlePageChange(pageNum - 1)">
          上一页
        </button>
        <button
          v-for="page in displayPages"
          :key="page"
          class="btn"
          :class="{ active: page === pageNum }"
          @click="handlePageChange(page)"
        >
          {{ page }}
        </button>
        <button
          class="btn"
          :disabled="pageNum >= totalPages"
          @click="handlePageChange(pageNum + 1)"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TableColumn, ActionButton } from '@/types';

const props = withDefaults(
  defineProps<{
    columns: TableColumn[];
    data: any[];
    actions?: ActionButton[];
    pagination?: boolean;
    total?: number;
    pageNum?: number;
    pageSize?: number;
  }>(),
  {
    pagination: true,
    total: 0,
    pageNum: 1,
    pageSize: 10,
  }
);

const emit = defineEmits<{
  (e: 'pageChange', page: number): void;
}>();

const totalPages = computed(() => Math.ceil(props.total / props.pageSize));

const displayPages = computed(() => {
  const pages: number[] = [];
  const start = Math.max(1, props.pageNum - 2);
  const end = Math.min(totalPages.value, props.pageNum + 2);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

const getVisibleActions = (row: any) => {
  if (!props.actions) return [];
  return props.actions.filter((action) => {
    if (typeof action.show === 'function') {
      return action.show(row);
    }
    return action.show !== false;
  });
};

const getActionDisabled = (action: ActionButton, row: any) => {
  if (typeof action.disabled === 'function') {
    return action.disabled(row);
  }
  return action.disabled || false;
};

const handlePageChange = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    emit('pageChange', page);
  }
};
</script>

<style scoped>
.data-table {
  width: 100%;
}

.table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #f0f0f0;
}

.table thead {
  background: #fafafa;
}

.table th,
.table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}

.table th {
  font-weight: 600;
  color: #262626;
}

.table td {
  color: #595959;
}

.table tbody tr:hover {
  background: #fafafa;
}

.action-cell {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 8px;
  font-size: 14px;
  border: none;
  background: none;
  cursor: pointer;
  color: #1890ff;
  transition: all 0.3s;
}

.action-btn:hover:not(:disabled) {
  color: #40a9ff;
}

.action-btn:disabled {
  color: #d9d9d9;
  cursor: not-allowed;
}

.action-danger {
  color: #ff4d4f;
}

.action-danger:hover:not(:disabled) {
  color: #ff7875;
}

.empty-cell {
  text-align: center;
  color: #bfbfbf;
  padding: 48px 16px;
}

.table-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 16px 0;
}

.pagination-info {
  font-size: 14px;
  color: #595959;
}

.pagination-btns {
  display: flex;
  gap: 8px;
}

.pagination-btns .btn {
  min-width: 32px;
  height: 32px;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.pagination-btns .btn:hover:not(:disabled) {
  color: #40a9ff;
  border-color: #40a9ff;
}

.pagination-btns .btn.active {
  color: #fff;
  background: #1890ff;
  border-color: #1890ff;
}

.pagination-btns .btn:disabled {
  color: rgba(0, 0, 0, 0.25);
  background: #f5f5f5;
  border-color: #d9d9d9;
  cursor: not-allowed;
}
</style>
