<script setup lang="ts">
import { resourceElementAttributes, type ResourceElement } from '@shared/services/resourceElement'
import { computed, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'
import type { TableInstance } from 'element-plus'

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
    resource_element?: ResourceElement | undefined

    data: Record<string, unknown>[]
    columns: DataTableColumn[]
    loading?: boolean
    selection?: boolean
    rowKey?: string
    height?: number | string | undefined
    scrollMode?: DataTableScrollMode
  }>(),
  {
    resource_element: undefined,
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

// Measure intrinsic action content after permission directives run, never the
// stretched cell itself. All rows share the widest visible action group.
const table = ref<TableInstance>()
const actionWidth = ref<number>()
let resizeObserver: ResizeObserver | undefined
let contentObserver: MutationObserver | undefined
let frame: number | undefined
const observedGrids = new Set<Element>()

function measureActions() {
  frame = undefined
  const root = table.value?.$el as HTMLElement | undefined
  if (!root || props.loading || !props.columns.some((column) => column.slot === 'actions')) return
  const header = root.querySelector<HTMLElement>('th.data-table__actions .cell')
  if (!header) return
  const headerStyle = getComputedStyle(header)
  const range = document.createRange()
  range.selectNodeContents(header)
  let width =
    range.getBoundingClientRect().width +
    parseFloat(headerStyle.paddingLeft) +
    parseFloat(headerStyle.paddingRight)
  for (const grid of observedGrids) {
    const cell = grid.closest<HTMLElement>('.cell')
    if (!cell || !grid.getClientRects().length) continue
    const style = getComputedStyle(cell)
    width = Math.max(
      width,
      grid.getBoundingClientRect().width +
        parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight),
    )
  }
  // Retain the previous width during an empty/loading refresh to avoid jitter.
  if (!props.data.length && actionWidth.value !== undefined) return
  const nextWidth = Math.ceil(width) + 1 // table border / fractional text rounding
  if (actionWidth.value !== nextWidth) actionWidth.value = nextWidth
}

function scheduleMeasure() {
  if (frame === undefined) frame = requestAnimationFrame(measureActions)
}

function observeActions() {
  const root = table.value?.$el as HTMLElement | undefined
  if (!root) return
  const grids = new Set(root.querySelectorAll('td.data-table__actions .row-action-grid'))
  for (const grid of observedGrids) {
    if (!grids.has(grid)) {
      resizeObserver?.unobserve(grid)
      observedGrids.delete(grid)
    }
  }
  for (const grid of grids) {
    if (!observedGrids.has(grid)) {
      observedGrids.add(grid)
      resizeObserver?.observe(grid)
    }
  }
  scheduleMeasure()
}

onMounted(() => {
  resizeObserver = new ResizeObserver(scheduleMeasure)
  if (table.value?.$el) {
    resizeObserver.observe(table.value.$el)
    // ElTable registers columns/rows in a later child update; parent lifecycle
    // hooks alone cannot see those grids (or later pagination replacements).
    contentObserver = new MutationObserver(observeActions)
    contentObserver.observe(table.value.$el, { childList: true, subtree: true })
  }
  observeActions()
})
onUpdated(observeActions)
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  contentObserver?.disconnect()
  if (frame !== undefined) cancelAnimationFrame(frame)
})

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
    ref="table"
    v-loading="loading"
    v-bind="resourceElementAttributes(resource_element)"
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
      :width="column.slot === 'actions' ? (actionWidth ?? 64) : column.width"
      :min-width="column.slot === 'actions' ? undefined : column.minWidth"
      :class-name="column.slot === 'actions' ? 'data-table__actions' : undefined"
      :align="column.align"
      :fixed="column.fixed"
      :sortable="column.sortable"
      :show-overflow-tooltip="Boolean(column.slot && column.slot !== 'actions')"
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
