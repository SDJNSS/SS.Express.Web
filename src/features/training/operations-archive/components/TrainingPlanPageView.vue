<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import FormDialog from '@shared/components/FormDialog.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import { planFrequencyLabel, planStatusLabel, planStatusTone, planTypeLabel } from '../operationsUi'
import { TRAINING_PERMISSIONS } from '../trainingPermissions'
import type {
  TrainingOperationsPreviewState,
  TrainingPlanFormValue,
  TrainingPlanRecord,
} from '../types/trainingOperations'

const props = withDefaults(
  defineProps<{
    plans: TrainingPlanRecord[]
    state: TrainingOperationsPreviewState
    total?: number
    page?: number
    pageSize?: number
    submitting?: boolean
    submissionVersion?: number
  }>(),
  { total: 0, page: 1, pageSize: 10, submitting: false, submissionVersion: 0 },
)
const emit = defineEmits<{
  action: [message: string]
  retry: []
  openDetail: [record: TrainingPlanRecord, section?: 'tasks' | 'employees']
  save: [value: TrainingPlanFormValue, record?: TrainingPlanRecord]
  publish: [record: TrainingPlanRecord]
  delete: [record: TrainingPlanRecord]
  query: [
    value: {
      planYear?: number
      planType?: string
      keyword?: string
      status?: string
      pageIndex: number
      pageSize: number
    },
  ]
}>()
const query = reactive({ year: '', planType: '', keyword: '', status: '' })
const page = ref(props.page)
const pageSize = ref(props.pageSize)
const selected = ref<TrainingPlanRecord>(props.plans[0]!)
const formVisible = ref(false)
const confirmVisible = ref(false)
const confirmAction = ref<'publish' | 'delete'>('publish')
const formMode = ref<'create' | 'edit'>('create')
const currentYear = new Date().getFullYear()
const form = reactive<TrainingPlanFormValue>({
  planType: 'ANNUAL',
  year: currentYear,
  name: '',
  startAt: '',
  endAt: '',
  frequency: 'MONTHLY',
})

const visibleRecords = computed(() => (props.state === 'ready' ? props.plans : []))
const effectiveTotal = computed(() => props.total || props.plans.length)
const yearOptions = computed(() => {
  const years = new Set<number>([currentYear - 1, currentYear, currentYear + 1])
  props.plans.forEach((item) => {
    if (item.year != null) years.add(item.year)
  })
  return [...years].sort((left, right) => right - left)
})
const formValid = computed(() => {
  if (!form.name.trim() || !form.startAt) return false
  if (form.planType === 'STANDING') return true
  return Boolean(
    Number.isInteger(form.year) &&
    form.endAt &&
    form.startAt <= form.endAt &&
    (form.frequency === 'MONTHLY' || form.frequency === 'QUARTERLY'),
  )
})
const columns: DataTableColumn[] = [
  { label: '计划类型', width: 100, slot: 'planType' },
  { label: '计划名称', minWidth: 250, slot: 'name' },
  { label: '年度 / 有效期', minWidth: 204, slot: 'period' },
  { label: '频率', width: 100, slot: 'frequency' },
  { label: '状态', width: 92, slot: 'status' },
  { prop: 'currentEmployees', label: '当前员工', width: 100, align: 'right' },
  { prop: 'taskCount', label: '任务数', width: 84, align: 'right' },
  { prop: 'updatedAt', label: '更新时间', minWidth: 158 },
  { label: '操作', width: 224, fixed: 'right', slot: 'actions' },
]

function asPlan(row: Record<string, unknown>) {
  return row as unknown as TrainingPlanRecord
}
function requestPage() {
  emit('query', {
    ...(query.year ? { planYear: Number(query.year) } : {}),
    ...(query.planType ? { planType: query.planType } : {}),
    ...(query.keyword.trim() ? { keyword: query.keyword.trim() } : {}),
    ...(query.status ? { status: query.status } : {}),
    pageIndex: page.value,
    pageSize: pageSize.value,
  })
}
function search() {
  page.value = 1
  requestPage()
}
function reset() {
  Object.assign(query, { year: '', planType: '', keyword: '', status: '' })
  page.value = 1
  requestPage()
}
function changePage() {
  requestPage()
}
function openDetail(record: TrainingPlanRecord, section: 'tasks' | 'employees' = 'tasks') {
  selected.value = record
  emit('openDetail', record, section)
}
function openForm(mode: 'create' | 'edit', record?: TrainingPlanRecord) {
  formMode.value = mode
  selected.value = record ?? props.plans[0]!
  Object.assign(form, {
    planType: record?.planType ?? 'ANNUAL',
    year: record?.year ?? currentYear,
    name: record?.name ?? '',
    startAt: record?.startAt ?? '',
    endAt: record?.endAt ?? '',
    frequency: record?.frequency ?? 'MONTHLY',
  })
  formVisible.value = true
}
function openConfirm(action: 'publish' | 'delete', record: TrainingPlanRecord) {
  selected.value = record
  confirmAction.value = action
  confirmVisible.value = true
}
function savePlan() {
  if (!formValid.value) return
  emit('save', { ...form }, formMode.value === 'edit' ? selected.value : undefined)
}
function confirm() {
  confirmVisible.value = false
  if (confirmAction.value === 'publish') emit('publish', selected.value)
  else emit('delete', selected.value)
}
watch(
  () => form.planType,
  (value) => {
    if (value === 'STANDING') {
      form.year = undefined
      form.endAt = undefined
      form.frequency = undefined
    } else {
      form.year ??= currentYear
      form.frequency ??= 'MONTHLY'
    }
  },
)
watch(
  () => props.page,
  (value) => {
    page.value = value
  },
)
watch(
  () => props.pageSize,
  (value) => {
    pageSize.value = value
  },
)
watch(
  () => props.submissionVersion,
  () => {
    formVisible.value = false
  },
)
</script>

<template>
  <AppPage class="training-operations-page">
    <ListPageTemplate>
      <template #header
        ><PageHeader title="培训计划" description="统一维护年度计划与长期有效的常设计划"
          ><template #actions
            ><el-button
              v-permission="TRAINING_PERMISSIONS.plans.create"
              type="primary"
              @click="openForm('create')"
              >新建计划</el-button
            ></template
          ></PageHeader
        ></template
      >
      <template #search
        ><SearchPanel :loading="state === 'loading'" @search="search" @reset="reset">
          <el-form-item label="计划类型"
            ><el-select v-model="query.planType" clearable placeholder="全部类型"
              ><el-option label="年度计划" value="ANNUAL" /><el-option
                label="常设计划"
                value="STANDING" /></el-select
          ></el-form-item>
          <el-form-item label="计划年度"
            ><el-select v-model="query.year" clearable placeholder="全部年度（含常设）"
              ><el-option
                v-for="year in yearOptions"
                :key="year"
                :label="String(year)"
                :value="String(year)" /></el-select
          ></el-form-item>
          <el-form-item label="计划名称"
            ><el-input
              v-model="query.keyword"
              clearable
              placeholder="输入计划名称"
              @keyup.enter="search"
          /></el-form-item>
          <el-form-item label="计划状态"
            ><el-select v-model="query.status" clearable placeholder="全部状态"
              ><el-option label="草稿" value="DRAFT" /><el-option
                label="已发布"
                value="PUBLISHED" /></el-select
          ></el-form-item> </SearchPanel
      ></template>
      <template #toolbar
        ><TableToolbar
          title="培训计划"
          :total="effectiveTotal"
          :refreshing="state === 'loading'"
          @refresh="emit('retry')"
          ><template #summary
            ><span class="training-operations-page__summary"
              >当前 Tenant · 年度计划与常设计划并行管理</span
            ></template
          ></TableToolbar
        ></template
      >
      <el-alert
        v-if="state === 'retryable-error'"
        class="training-operations-page__alert"
        title="培训计划加载失败，筛选条件已保留"
        type="error"
        :closable="false"
        show-icon
        ><template #default
          ><el-button link type="primary" @click="emit('retry')">重新加载</el-button></template
        ></el-alert
      >
      <DataTable
        :data="visibleRecords as unknown as Record<string, unknown>[]"
        :columns="columns"
        :loading="state === 'loading'"
        @row-click="openDetail(asPlan($event))"
      >
        <template #name="{ row }"
          ><button
            class="training-operations-link"
            type="button"
            @click.stop="openDetail(asPlan(row))"
          >
            {{ asPlan(row).name }}
          </button></template
        >
        <template #planType="{ row }"
          ><StatusTag
            :label="planTypeLabel(asPlan(row).planType)"
            :tone="asPlan(row).planType === 'STANDING' ? 'info' : 'primary'"
        /></template>
        <template #period="{ row }"
          ><span v-if="asPlan(row).planType === 'STANDING'"
            >长期有效 · {{ asPlan(row).startAt }} 起</span
          ><span v-else
            >{{ asPlan(row).year }} · {{ asPlan(row).startAt }} 至 {{ asPlan(row).endAt }}</span
          ></template
        >
        <template #frequency="{ row }">{{ planFrequencyLabel(asPlan(row).frequency) }}</template>
        <template #status="{ row }"
          ><StatusTag
            :label="planStatusLabel(asPlan(row).status)"
            :tone="planStatusTone(asPlan(row).status)"
        /></template>
        <template #actions="{ row }"
          ><RowActionGrid :aria-label="`${asPlan(row).name} 的操作`">
            <el-button
              v-permission="TRAINING_PERMISSIONS.plans.detail"
              link
              type="primary"
              @click.stop="openDetail(asPlan(row))"
              >详情</el-button
            >
            <el-button
              v-permission="TRAINING_PERMISSIONS.plans.queryEmployees"
              link
              type="primary"
              @click.stop="openDetail(asPlan(row), 'employees')"
              >计划员工</el-button
            >
            <el-button
              v-permission="TRAINING_PERMISSIONS.plans.update"
              link
              type="primary"
              @click.stop="openForm('edit', asPlan(row))"
              >{{ asPlan(row).status === 'DRAFT' ? '编辑' : '修改名称' }}</el-button
            >
            <el-button
              v-if="asPlan(row).status === 'DRAFT'"
              v-permission="TRAINING_PERMISSIONS.plans.publish"
              link
              type="primary"
              @click.stop="openConfirm('publish', asPlan(row))"
              >发布</el-button
            >
            <el-button
              v-else
              v-permission="TRAINING_PERMISSIONS.plans.detail"
              link
              type="primary"
              @click.stop="openDetail(asPlan(row))"
              >任务列表</el-button
            >
            <el-button
              v-if="asPlan(row).status === 'DRAFT'"
              v-permission="TRAINING_PERMISSIONS.plans.delete"
              link
              type="danger"
              @click.stop="openConfirm('delete', asPlan(row))"
              >删除</el-button
            >
          </RowActionGrid></template
        >
      </DataTable>
      <template #pagination
        ><AppPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="effectiveTotal"
          @change="changePage"
      /></template>
    </ListPageTemplate>

    <FormDrawer
      v-model="formVisible"
      :title="formMode === 'create' ? '新建培训计划' : `编辑培训计划 · ${selected.name}`"
      :size="720"
      :submitting="submitting"
      :confirm-disabled="!formValid"
      confirm-button-text="保存计划"
      @confirm="savePlan"
    >
      <el-form label-position="top" novalidate
        ><div class="training-form-grid">
          <el-form-item label="计划类型" required
            ><el-radio-group
              v-model="form.planType"
              :disabled="formMode === 'edit' && selected.status === 'PUBLISHED'"
              ><el-radio-button value="ANNUAL">年度计划</el-radio-button
              ><el-radio-button value="STANDING">常设计划</el-radio-button></el-radio-group
            ></el-form-item
          >
          <el-form-item v-if="form.planType === 'ANNUAL'" label="计划年度" required
            ><el-input-number
              v-model="form.year"
              :min="currentYear - 10"
              :max="2100"
              :disabled="formMode === 'edit' && selected.status === 'PUBLISHED'" /></el-form-item
          ><el-form-item label="计划名称" required
            ><el-input v-model="form.name" maxlength="200" show-word-limit /></el-form-item
          ><el-form-item label="开始日期" required
            ><el-date-picker
              v-model="form.startAt"
              type="date"
              value-format="YYYY-MM-DD"
              :disabled="formMode === 'edit' && selected.status === 'PUBLISHED'" /></el-form-item
          ><el-form-item v-if="form.planType === 'ANNUAL'" label="结束日期" required
            ><el-date-picker
              v-model="form.endAt"
              type="date"
              value-format="YYYY-MM-DD"
              :disabled="formMode === 'edit' && selected.status === 'PUBLISHED'" /></el-form-item
          ><el-form-item v-if="form.planType === 'ANNUAL'" label="培训频率" required
            ><el-select
              v-model="form.frequency"
              :disabled="formMode === 'edit' && selected.status === 'PUBLISHED'"
              ><el-option label="每月" value="MONTHLY" /><el-option
                label="每季度"
                value="QUARTERLY" /></el-select
          ></el-form-item>
        </div>
        <el-alert
          v-if="form.planType === 'STANDING'"
          title="常设计划长期有效，不设置年度、结束日期和月度/季度频率；发布时允许暂时没有员工。"
          type="info"
          :closable="false"
          show-icon />
        <el-alert
          v-if="formMode === 'edit' && selected.status === 'PUBLISHED'"
          title="计划已发布，仅允许修改名称；计划类型与执行周期不可变更。"
          type="warning"
          :closable="false"
          show-icon
      /></el-form>
    </FormDrawer>

    <FormDialog
      v-model="confirmVisible"
      :title="confirmAction === 'publish' ? '发布培训计划' : '删除草稿计划'"
      :confirm-type="confirmAction === 'delete' ? 'danger' : 'primary'"
      :confirm-button-text="confirmAction === 'publish' ? '确认发布' : '确认删除'"
      @confirm="confirm"
    >
      <template v-if="confirmAction === 'publish'"
        ><el-descriptions :column="2" border
          ><el-descriptions-item label="计划名称">{{ selected.name }}</el-descriptions-item
          ><el-descriptions-item label="计划类型">{{
            planTypeLabel(selected.planType)
          }}</el-descriptions-item
          ><el-descriptions-item label="计划年度">{{
            selected.year ?? '长期有效'
          }}</el-descriptions-item
          ><el-descriptions-item label="培训频率">{{
            planFrequencyLabel(selected.frequency)
          }}</el-descriptions-item
          ><el-descriptions-item label="当前有效员工"
            >{{ selected.currentEmployees }} 人</el-descriptions-item
          ></el-descriptions
        >
        <p>
          发布不可撤回，计划类型与执行周期将锁定；常设计划允许零员工发布，启用入职自动纳入后仅处理启用后的新生效员工。
        </p></template
      >
      <p v-else>仅删除尚未形成执行数据的草稿计划，此操作不可撤销。</p>
    </FormDialog>
  </AppPage>
</template>

<style scoped lang="scss">
@use '../styles/training-operations.scss';
</style>
