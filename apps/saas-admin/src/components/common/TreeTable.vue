<template>
  <div class="tree-table">
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
        <template v-for="(item, index) in flattenedData" :key="item.id">
          <tr>
            <td
              v-for="(column, colIndex) in columns"
              :key="column.prop"
              :class="{ 'tree-cell': colIndex === 0 }"
            >
              <div
                v-if="colIndex === 0"
                class="tree-content"
                :style="{ paddingLeft: `${item._level * 24}px` }"
              >
                <span
                  v-if="item.children && item.children.length > 0"
                  class="expand-icon"
                  @click="toggleExpand(item)"
                >
                  {{ item._expanded ? '▼' : '▶' }}
                </span>
                <span v-else class="expand-placeholder"></span>
                <span v-if="column.formatter">{{
                  column.formatter(item, column, item[column.prop], index)
                }}</span>
                <span v-else>{{ item[column.prop] }}</span>
              </div>
              <template v-else>
                <span v-if="column.formatter">{{
                  column.formatter(item, column, item[column.prop], index)
                }}</span>
                <span v-else>{{ item[column.prop] }}</span>
              </template>
            </td>
            <td v-if="$slots.actions || actions" class="action-cell">
              <slot name="actions" :row="item" :index="index">
                <button
                  v-for="action in getVisibleActions(item)"
                  :key="action.label"
                  class="action-btn"
                  :class="`action-${action.type || 'text'}`"
                  :disabled="getActionDisabled(action, item)"
                  @click="action.handler(item)"
                >
                  {{ action.label }}
                </button>
              </slot>
            </td>
          </tr>
        </template>
        <tr v-if="!data || data.length === 0">
          <td :colspan="columns.length + (actions ? 1 : 0)" class="empty-cell">暂无数据</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { TableColumn, ActionButton } from '@/types';

interface TreeNode {
  id: number;
  children?: TreeNode[];
  _level?: number;
  _expanded?: boolean;
  [key: string]: any;
}

const props = withDefaults(
  defineProps<{
    columns: TableColumn[];
    data: TreeNode[];
    actions?: ActionButton[];
    defaultExpandAll?: boolean;
  }>(),
  {
    defaultExpandAll: false,
  }
);

// 展开状态管理
const expandedKeys = ref<Set<number>>(new Set());

// 初始化展开状态
const initExpandState = (nodes: TreeNode[], expandAll: boolean) => {
  if (expandAll) {
    nodes.forEach((node) => {
      expandedKeys.value.add(node.id);
      if (node.children && node.children.length > 0) {
        initExpandState(node.children, expandAll);
      }
    });
  }
};

// 监听数据变化
watch(
  () => props.data,
  (newData) => {
    if (props.defaultExpandAll) {
      expandedKeys.value.clear();
      initExpandState(newData, true);
    }
  },
  { immediate: true, deep: true }
);

// 扁平化树形数据
const flattenedData = computed(() => {
  const result: TreeNode[] = [];
  const flatten = (nodes: TreeNode[], level: number = 0) => {
    nodes.forEach((node) => {
      const item = { ...node, _level: level, _expanded: expandedKeys.value.has(node.id) };
      result.push(item);
      if (item.children && item.children.length > 0 && item._expanded) {
        flatten(item.children, level + 1);
      }
    });
  };
  flatten(props.data);
  return result;
});

// 切换展开/收起
const toggleExpand = (item: TreeNode) => {
  if (expandedKeys.value.has(item.id)) {
    expandedKeys.value.delete(item.id);
  } else {
    expandedKeys.value.add(item.id);
  }
};

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
</script>

<style scoped>
.tree-table {
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

.tree-cell {
  padding: 0 !important;
}

.tree-content {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  min-height: 48px;
}

.expand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  cursor: pointer;
  color: #8c8c8c;
  font-size: 12px;
  user-select: none;
  transition: transform 0.3s;
}

.expand-icon:hover {
  color: #1890ff;
}

.expand-placeholder {
  display: inline-block;
  width: 16px;
  margin-right: 8px;
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
</style>
