<script setup lang="ts">
import { resourceElementAttributes, type ResourceElement } from '@shared/services/resourceElement'
withDefaults(
  defineProps<{
    resource_element?: ResourceElement | undefined

    total: number
    page: number
    pageSize: number
    pageSizes?: number[]
  }>(),
  { resource_element: undefined, pageSizes: () => [10, 20, 50, 100] },
)

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
  change: []
}>()

function handlePageChange(value: number) {
  emit('update:page', value)
  emit('change')
}

function handleSizeChange(value: number) {
  emit('update:pageSize', value)
  emit('update:page', 1)
  emit('change')
}
</script>

<template>
  <div v-bind="resourceElementAttributes(resource_element)" class="app-pagination">
    <el-pagination
      background
      :current-page="page"
      :page-size="pageSize"
      :page-sizes="pageSizes"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="handlePageChange"
      @size-change="handleSizeChange"
    />
  </div>
</template>

<style scoped lang="scss">
.app-pagination {
  display: flex;
  justify-content: flex-end;
  padding: var(--spacing-2) var(--spacing-3);
  border-top: 1px solid var(--border-light);
}
</style>
