<script setup lang="ts">
import { computed } from 'vue'

import { DEFAULT_TABLE_CELL_MAX_CHARACTERS } from '@shared/utils/tableText.mjs'

import EmptyState from './EmptyState.vue'
import TableCellText from './TableCellText.vue'

export interface DataTableColumn {
  prop?: string
  label: string
  width?: number | string
  minWidth?: number | string
  align?: 'left' | 'center' | 'right'
  fixed?: boolean | 'left' | 'right'
  sortable?: boolean
  slot?: string
  maxCharacters?: number | false
}

export type DataTableScrollMode = 'page' | 'contained'

const props = withDefaults(
  defineProps<{
    data: Record<string, unknown>[]
    columns: DataTableColumn[]
    loading?: boolean
    selection?: boolean
    rowKey?: string
    height?: number | string | undefined
    scrollMode?: DataTableScrollMode
  }>(),
  {
    loading: false,
    selection: false,
    rowKey: 'id',
    height: undefined,
    scrollMode: 'page',
  },
)

const resolvedScrollMode = computed<DataTableScrollMode>(() =>
  props.height === undefined ? props.scrollMode : 'contained',
)

const resolvedHeight = computed<number | string | undefined>(
  () => props.height ?? (props.scrollMode === 'contained' ? '100%' : undefined),
)

const emit = defineEmits<{
  selectionChange: [rows: Record<string, unknown>[]]
  rowClick: [row: Record<string, unknown>]
}>()

function getCellValue(row: Record<string, unknown>, prop?: string): unknown {
  if (!prop) return ''

  return prop.split('.').reduce<unknown>((value, key) => {
    if (typeof value !== 'object' || value === null) return undefined
    return (value as Record<string, unknown>)[key]
  }, row)
}
</script>

<template>
  <el-table
    v-loading="loading"
    :data="data"
    :row-key="rowKey"
    :height="resolvedHeight"
    :data-scroll-mode="resolvedScrollMode"
    stripe
    highlight-current-row
    @selection-change="emit('selectionChange', $event)"
    @row-click="emit('rowClick', $event)"
  >
    <el-table-column v-if="selection" type="selection" width="48" align="center" />
    <el-table-column
      v-for="column in columns"
      :key="`${column.prop ?? column.slot}-${column.label}`"
      :prop="column.prop"
      :label="column.label"
      :width="column.width"
      :min-width="column.minWidth"
      :align="column.align"
      :fixed="column.fixed"
      :sortable="column.sortable"
      :show-overflow-tooltip="Boolean(column.slot)"
    >
      <template #default="scope">
        <slot
          v-if="column.slot && scope.row"
          :name="column.slot"
          :row="scope.row"
          :column="column"
        />
        <TableCellText
          v-else
          :value="getCellValue(scope.row, column.prop)"
          :max-characters="column.maxCharacters ?? DEFAULT_TABLE_CELL_MAX_CHARACTERS"
        />
      </template>
    </el-table-column>

    <template #empty>
      <EmptyState description="暂无符合条件的数据" />
    </template>
  </el-table>
</template>
