<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import DetailDrawer from '@shared/components/DetailDrawer.vue'
import FormDialog from '@shared/components/FormDialog.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import {
  employeeStatusLabel,
  employeeStatusTone,
  percentage,
  taskStatusLabel,
  taskStatusTone,
} from '../operationsUi'
import type {
  TaskEmployeeRecord,
  TrainingOperationsPreviewState,
  TrainingPlanRecord,
  TrainingTaskRecord,
} from '../types/trainingOperations'

const props = defineProps<{
  plans: TrainingPlanRecord[]
  tasks: TrainingTaskRecord[]
  employees: TaskEmployeeRecord[]
  state: TrainingOperationsPreviewState
}>()
const emit = defineEmits<{ action: [message: string]; retry: [] }>()
const query = reactive({ planId: '', period: '', status: '', dateRange: [] as string[] })
const committed = reactive({ ...query })
const selected = ref<TrainingTaskRecord>(props.tasks[0]!)
const detailVisible = ref(false)
const detailTab = ref('config')
const formVisible = ref(false)
const confirmVisible = ref(false)
const confirmAction = ref<'start' | 'delete'>('start')
const page = ref(1)
const pageSize = ref(10)
const form = reactive({
  planId: '',
  name: '',
  period: '',
  startAt: '',
  endAt: '',
  courses: [] as string[],
  exam: '',
})

const visibleRecords = computed(() =>
  props.state === 'ready'
    ? props.tasks.filter(
        (item) =>
          (!committed.status || item.status === committed.status) &&
          (!committed.period || item.period.includes(committed.period)),
      )
    : [],
)
const columns: DataTableColumn[] = [
  { label: '任务名称', minWidth: 250, fixed: 'left', slot: 'name' },
  { prop: 'planName', label: '年度计划', minWidth: 220 },
  { prop: 'period', label: '周期', width: 100 },
  { label: '执行时间', minWidth: 250, slot: 'period' },
  { label: '状态', width: 94, slot: 'status' },
  { label: '锁定', width: 86, slot: 'locked' },
  { label: '应培训 / 完成', width: 132, slot: 'progress' },
  { label: '完成率', width: 96, slot: 'rate' },
  { label: '操作', width: 224, fixed: 'right', slot: 'actions' },
]
const employeeColumns: DataTableColumn[] = [
  { prop: 'employeeCode', label: '员工编号', width: 130 },
  { prop: 'name', label: '当前姓名', width: 100 },
  { prop: 'organization', label: '当前组织', minWidth: 150 },
  { prop: 'position', label: '当前岗位', minWidth: 130 },
  { label: '应培训', width: 86, slot: 'shouldTrain' },
  { label: '培训状态', width: 104, slot: 'employeeStatus' },
  { prop: 'learningMinutes', label: '有效学习（分钟）', width: 140, align: 'right' },
  { label: '曾逾期', width: 88, slot: 'wasOverdue' },
  { label: '最终结果', minWidth: 120, slot: 'result' },
]

function asTask(row: Record<string, unknown>) {
  return row as unknown as TrainingTaskRecord
}
function asEmployee(row: Record<string, unknown>) {
  return row as unknown as TaskEmployeeRecord
}
function search() {
  Object.assign(committed, query)
  page.value = 1
  emit('action', '培训任务筛选已生效')
}
function reset() {
  Object.assign(query, { planId: '', period: '', status: '', dateRange: [] })
  Object.assign(committed, query)
  page.value = 1
}
function openDetail(record: TrainingTaskRecord, tab = 'config') {
  selected.value = record
  detailTab.value = tab
  detailVisible.value = true
}
function openForm(record?: TrainingTaskRecord) {
  selected.value = record ?? props.tasks[0]!
  Object.assign(form, {
    planId: record
      ? String(props.plans.find((item) => item.name === record.planName)?.id ?? '')
      : '',
    name: record?.name ?? '',
    period: record?.period ?? '',
    startAt: record?.startAt ?? '',
    endAt: record?.endAt ?? '',
    courses: record ? ['安全法规基础', '危化品应急处置'] : [],
    exam: record?.examName ?? '',
  })
  formVisible.value = true
}
function openConfirm(action: 'start' | 'delete', record: TrainingTaskRecord) {
  selected.value = record
  confirmAction.value = action
  confirmVisible.value = true
}
</script>

<template>
  <AppPage class="training-operations-page">
    <ListPageTemplate>
      <template #header
        ><PageHeader title="培训任务" description="编排周期任务并只读追踪员工执行结果"
          ><template #actions
            ><el-button type="primary" @click="openForm()">生成任务</el-button></template
          ></PageHeader
        ></template
      >
      <template #search
        ><SearchPanel :loading="state === 'loading'" @search="search" @reset="reset">
          <el-form-item label="年度计划"
            ><el-select v-model="query.planId" clearable placeholder="全部计划"
              ><el-option
                v-for="plan in plans"
                :key="plan.id"
                :label="plan.name"
                :value="String(plan.id)" /></el-select
          ></el-form-item>
          <el-form-item label="周期"
            ><el-input v-model="query.period" clearable placeholder="例如 2026 Q3"
          /></el-form-item>
          <el-form-item label="开始时间"
            ><el-date-picker
              v-model="query.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
          /></el-form-item>
          <el-form-item label="任务状态"
            ><el-select v-model="query.status" clearable placeholder="全部状态"
              ><el-option label="未开始" value="NOT_STARTED" /><el-option
                label="进行中"
                value="ACTIVE" /><el-option label="已逾期" value="OVERDUE" /><el-option
                label="已完成"
                value="COMPLETED" /></el-select
          ></el-form-item> </SearchPanel
      ></template>
      <template #toolbar
        ><TableToolbar
          title="周期培训任务"
          :total="visibleRecords.length"
          :refreshing="state === 'loading'"
          @refresh="emit('retry')"
          ><template #summary
            ><span class="training-operations-page__summary"
              >状态由服务端计算 · 完成率保留分子与分母</span
            ></template
          ><template #actions
            ><el-button @click="emit('action', '打开任务台账导出确认')"
              >导出台账</el-button
            ></template
          ></TableToolbar
        ></template
      >
      <el-alert
        v-if="state === 'retryable-error'"
        class="training-operations-page__alert"
        title="培训任务加载失败，筛选条件已保留"
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
        @row-click="openDetail(asTask($event))"
      >
        <template #name="{ row }"
          ><button
            class="training-operations-link"
            type="button"
            @click.stop="openDetail(asTask(row))"
          >
            {{ asTask(row).name }}
          </button></template
        >
        <template #period="{ row }">{{ asTask(row).startAt }} 至 {{ asTask(row).endAt }}</template>
        <template #status="{ row }"
          ><StatusTag
            :label="taskStatusLabel(asTask(row).status)"
            :tone="taskStatusTone(asTask(row).status)"
        /></template>
        <template #locked="{ row }"
          ><StatusTag
            :label="asTask(row).isLocked ? '已锁定' : '未锁定'"
            :tone="asTask(row).isLocked ? 'warning' : 'info'"
        /></template>
        <template #progress="{ row }"
          >{{ asTask(row).completedCount }} / {{ asTask(row).expectedCount }}</template
        >
        <template #rate="{ row }">{{
          percentage(asTask(row).completedCount, asTask(row).expectedCount)
        }}</template>
        <template #actions="{ row }"
          ><RowActionGrid :aria-label="`${asTask(row).name} 的操作`"
            ><el-button link type="primary" @click.stop="openDetail(asTask(row))">详情</el-button
            ><el-button link type="primary" @click.stop="openDetail(asTask(row), 'employees')"
              >员工概况</el-button
            ><el-button
              v-if="asTask(row).status === 'NOT_STARTED'"
              link
              type="primary"
              :disabled="asTask(row).isLocked"
              @click.stop="openForm(asTask(row))"
              >编辑</el-button
            ><el-button
              v-if="asTask(row).status === 'NOT_STARTED'"
              link
              type="primary"
              @click.stop="openConfirm('start', asTask(row))"
              >重试启动</el-button
            ><el-button
              v-if="asTask(row).status === 'NOT_STARTED'"
              link
              type="danger"
              @click.stop="openConfirm('delete', asTask(row))"
              >删除</el-button
            ><el-button link type="primary" @click.stop="emit('action', '打开任务台账导出确认')"
              >导出</el-button
            ></RowActionGrid
          ></template
        >
      </DataTable>
      <template #pagination
        ><AppPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="visibleRecords.length"
      /></template>
    </ListPageTemplate>

    <DetailDrawer v-model="detailVisible" :title="`任务详情 · ${selected.name}`" :size="1080">
      <div class="training-detail-layout">
        <section class="training-detail-hero">
          <div>
            <h3>{{ selected.name }}</h3>
            <p>{{ selected.planName }} · {{ selected.period }}</p>
          </div>
          <div class="training-detail-tags">
            <StatusTag
              :label="taskStatusLabel(selected.status)"
              :tone="taskStatusTone(selected.status)"
            /><StatusTag
              :label="selected.isLocked ? '核心配置已锁定' : '核心配置可编辑'"
              :tone="selected.isLocked ? 'warning' : 'info'"
            />
          </div>
        </section>
        <el-tabs v-model="detailTab"
          ><el-tab-pane label="任务配置" name="config"
            ><el-descriptions :column="2" border
              ><el-descriptions-item label="执行时间"
                >{{ selected.startAt }} 至 {{ selected.endAt }}</el-descriptions-item
              ><el-descriptions-item label="周期">{{ selected.period }}</el-descriptions-item
              ><el-descriptions-item label="课程顺序"
                >1. 安全法规基础；2. 危化品应急处置；3. 防御性驾驶</el-descriptions-item
              ><el-descriptions-item label="考试配置">{{ selected.examName }}</el-descriptions-item
              ><el-descriptions-item label="人员汇总"
                >应培训 {{ selected.expectedCount }} · 完成 {{ selected.completedCount }} · 当前逾期
                {{ selected.overdueCount }}</el-descriptions-item
              ><el-descriptions-item label="完成率"
                >{{ selected.completedCount }} / {{ selected.expectedCount }} ·
                {{
                  percentage(selected.completedCount, selected.expectedCount)
                }}</el-descriptions-item
              ></el-descriptions
            ></el-tab-pane
          >
          <el-tab-pane label="员工执行概况" name="employees"
            ><el-alert
              title="当前姓名、组织和岗位来自员工目录；执行结果只读。已排除不会覆盖原执行结果。"
              type="info"
              :closable="false"
              show-icon
            /><DataTable
              :data="employees as unknown as Record<string, unknown>[]"
              :columns="employeeColumns"
              height="390px"
              ><template #shouldTrain="{ row }"
                ><StatusTag
                  :label="asEmployee(row).shouldTrain ? '是' : '已排除'"
                  :tone="asEmployee(row).shouldTrain ? 'success' : 'warning'" /></template
              ><template #employeeStatus="{ row }"
                ><StatusTag
                  :label="employeeStatusLabel(asEmployee(row).status)"
                  :tone="employeeStatusTone(asEmployee(row).status)" /></template
              ><template #wasOverdue="{ row }"
                ><StatusTag
                  :label="asEmployee(row).wasOverdue ? '曾逾期' : '否'"
                  :tone="asEmployee(row).wasOverdue ? 'warning' : 'info'" /></template
              ><template #result="{ row }">{{
                asEmployee(row).finalScore == null
                  ? '暂无结果'
                  : `${asEmployee(row).finalScore} 分 · ${asEmployee(row).finalPassed ? '通过' : '未通过'}`
              }}</template></DataTable
            ></el-tab-pane
          ></el-tabs
        >
      </div>
    </DetailDrawer>

    <FormDrawer
      v-model="formVisible"
      :title="selected?.id && form.name ? `编辑任务 · ${selected.name}` : '生成周期培训任务'"
      :size="760"
      confirm-button-text="保存任务"
      @confirm="
        formVisible = false
        emit('action', '任务候选已保存；等待服务端初始化员工')
      "
      ><el-form label-position="top"
        ><div class="training-form-grid">
          <el-form-item label="年度计划" required
            ><el-select v-model="form.planId"
              ><el-option
                v-for="plan in plans.filter((item) => item.status === 'PUBLISHED')"
                :key="plan.id"
                :label="plan.name"
                :value="String(plan.id)" /></el-select></el-form-item
          ><el-form-item label="任务名称" required><el-input v-model="form.name" /></el-form-item
          ><el-form-item label="周期" required
            ><el-input v-model="form.period" placeholder="例如 2026 Q4" /></el-form-item
          ><el-form-item label="考试配置" required><el-input v-model="form.exam" /></el-form-item
          ><el-form-item label="开始时间" required
            ><el-date-picker
              v-model="form.startAt"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm" /></el-form-item
          ><el-form-item label="截止时间" required
            ><el-date-picker
              v-model="form.endAt"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm" /></el-form-item
          ><el-form-item class="training-form-grid__full" label="课程顺序" required
            ><el-select v-model="form.courses" multiple
              ><el-option label="安全法规基础" value="安全法规基础" /><el-option
                label="危化品应急处置"
                value="危化品应急处置" /><el-option
                label="防御性驾驶"
                value="防御性驾驶" /></el-select
          ></el-form-item>
        </div>
        <el-alert
          title="生成任务会初始化任务员工，但不会生成课程进度或员工考试记录。"
          type="info"
          :closable="false"
          show-icon /></el-form
    ></FormDrawer>

    <FormDialog
      v-model="confirmVisible"
      :title="confirmAction === 'start' ? '重新尝试启动任务' : '删除未开始任务'"
      :confirm-type="confirmAction === 'delete' ? 'danger' : 'primary'"
      :confirm-button-text="confirmAction === 'start' ? '重新尝试' : '确认删除'"
      @confirm="
        confirmVisible = false
        emit(
          'action',
          confirmAction === 'start' ? '已请求服务端重新校验并启动' : '删除任务候选已确认',
        )
      "
      ><p v-if="confirmAction === 'start'">
        重新尝试不会绕过人员、课程、考试和时间校验，成功后核心配置永久锁定。
      </p>
      <p v-else>仅未开始且未形成受限执行数据的任务可删除。</p></FormDialog
    >
  </AppPage>
</template>

<style scoped lang="scss">
@use '../styles/training-operations.scss';
</style>
