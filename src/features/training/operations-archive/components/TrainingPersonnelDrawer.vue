<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import DetailDrawer from '@shared/components/DetailDrawer.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import {
  assignmentTypeLabel,
  completionSourceLabel,
  courseLearningStatusLabel,
  employeeStatusLabel,
  employeeStatusTone,
  examStatusLabel,
} from '../operationsUi'
import type { PersonnelDrilldownContext, TaskEmployeeRecord } from '../types/trainingOperations'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    context: PersonnelDrilldownContext | undefined
    employees: TaskEmployeeRecord[]
    loading?: boolean
    total?: number
    page?: number
    pageSize?: number
  }>(),
  { loading: false, total: 0, page: 1, pageSize: 20 },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  pageChange: [page: number, pageSize: number]
}>()
const currentPage = ref(props.page)
const currentPageSize = ref(props.pageSize)

const columns: DataTableColumn[] = [
  { prop: 'employeeCode', label: '员工编号', width: 132 },
  { prop: 'name', label: '员工姓名', width: 108 },
  { prop: 'organization', label: '当前组织', minWidth: 160 },
  { prop: 'position', label: '当前岗位', minWidth: 136 },
  { prop: 'assignedAt', label: '参加时间', width: 164 },
  { label: '轮次 / 来源', width: 154, slot: 'execution' },
  { label: '培训状态', width: 112, slot: 'trainingStatus' },
  { label: '课程进度', width: 118, slot: 'courseProgress' },
  { label: '学习状态', width: 100, slot: 'courseStatus' },
  { label: '考试状态', width: 100, slot: 'examStatus' },
  { label: '完成来源', width: 116, slot: 'completionSource' },
]

const rows = computed(() => props.employees as unknown as Record<string, unknown>[])
const effectiveTotal = computed(() => props.total || props.employees.length)
function asEmployee(row: Record<string, unknown>) {
  return row as unknown as TaskEmployeeRecord
}
watch(
  () => props.page,
  (value) => {
    currentPage.value = value
  },
)
watch(
  () => props.pageSize,
  (value) => {
    currentPageSize.value = value
  },
)
</script>

<template>
  <DetailDrawer
    :model-value="modelValue"
    :title="context?.title ?? '人员明细'"
    :size="1080"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="training-detail-layout">
      <el-alert
        :title="context?.description ?? '当前任务范围内人员'"
        type="info"
        :closable="false"
        show-icon
      />
      <DataTable :data="rows" :columns="columns" :loading="loading" height="520px">
        <template #trainingStatus="{ row }">
          <StatusTag
            :label="employeeStatusLabel(asEmployee(row).status)"
            :tone="employeeStatusTone(asEmployee(row).status)"
          />
        </template>
        <template #courseProgress="{ row }">
          {{ asEmployee(row).learnedCourseCount }} / {{ asEmployee(row).courseCount }}
        </template>
        <template #courseStatus="{ row }">
          {{ courseLearningStatusLabel(asEmployee(row).courseLearningStatus) }}
        </template>
        <template #examStatus="{ row }">{{ examStatusLabel(asEmployee(row).examStatus) }}</template>
        <template #execution="{ row }">
          第 {{ asEmployee(row).executionNo ?? 1 }} 轮 ·
          {{ assignmentTypeLabel(asEmployee(row).assignmentType) }}
        </template>
        <template #completionSource="{ row }">
          {{ completionSourceLabel(asEmployee(row).completionSource) }}
        </template>
      </DataTable>
      <AppPagination
        v-model:page="currentPage"
        v-model:page-size="currentPageSize"
        :total="effectiveTotal"
        @change="emit('pageChange', currentPage, currentPageSize)"
      />
    </div>
  </DetailDrawer>
</template>

<style scoped lang="scss">
@use '../styles/training-operations.scss';
</style>
