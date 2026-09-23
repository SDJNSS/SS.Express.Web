<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useTrainingContentView } from '../composables/useTrainingContentView'
import type { ContentRuntime, ExamForm } from '../types/trainingContentRuntime'

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
import StatusTag, { type StatusTone } from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import type {
  ExamConfigurationRecord,
  PaperRecord,
  TrainingPreviewState,
  TrainingStatus,
} from '../types/trainingContent'

const props = defineProps<{
  records: ExamConfigurationRecord[]
  papers: PaperRecord[]
  runtime?: ContentRuntime<ExamConfigurationRecord, ExamForm>
  state: TrainingPreviewState
}>()

const emit = defineEmits<{
  action: [message: string]
  retry: []
}>()

const query = reactive({ keyword: '', status: '' })
const committed = reactive({ ...query })
const page = ref(1)
const pageSize = ref(10)
const selected = ref<ExamConfigurationRecord | undefined>(props.records[0])
const detailVisible = ref(false)
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const statusVisible = ref(false)
const submitting = ref(false)

const form = reactive({
  name: '',
  description: '',
  paperId: 0,
  durationSeconds: 3600,
  passScore: 60,
  maxAttempts: 1,
  showCorrectAnswer: false,
  showAnswerAnalysis: false,
})

const { actionError, discardVisible, confirmDiscard, formDirty, lockedModel, run, load } =
  useTrainingContentView(() => props.runtime, query, page, pageSize, form, formVisible, submitting)
const statusModel = lockedModel(statusVisible)
function allowed(action: 'create' | 'update' | 'status') {
  return !props.runtime || props.runtime.allowed(action)
}
function refresh() {
  if (props.runtime) void props.runtime.load()
  else emit('retry')
}
function paginate() {
  if (props.runtime) load({ ...props.runtime.query, page: page.value, pageSize: pageSize.value })
  else emit('action', '分页状态已更新')
}

const columns: DataTableColumn[] = [
  { prop: 'name', label: '配置名称', minWidth: 250, fixed: 'left', slot: 'name' },
  { prop: 'paperName', label: '关联试卷', minWidth: 260 },
  { label: '考试时长', width: 112, slot: 'duration' },
  { prop: 'passScore', label: '及格分', width: 90, align: 'right' },
  { prop: 'maxAttempts', label: '最大次数', width: 100, align: 'right' },
  { label: '状态', width: 92, slot: 'status' },
  { label: '操作', width: 190, fixed: 'right', slot: 'actions' },
]

const visibleRecords = computed(() => {
  if (props.state !== 'ready') return []
  if (props.runtime) return props.records
  const keyword = committed.keyword.trim().toLocaleLowerCase('zh-CN')
  return props.records.filter(
    (record) =>
      (!keyword || record.name.toLocaleLowerCase('zh-CN').includes(keyword)) &&
      (!committed.status || record.status === committed.status),
  )
})

const optionKeyword = ref('')
const chosenPaper = ref<PaperRecord>()
watch(
  [() => form.paperId, () => props.papers],
  ([id]) => {
    chosenPaper.value =
      props.papers.find((item) => item.id === id) ??
      (chosenPaper.value?.id === id ? chosenPaper.value : undefined)
  },
  { flush: 'sync' },
)
function searchOptions(index = 1) {
  void run(async () => {
    await props.runtime?.searchOptions?.(optionKeyword.value, index)
  })
}
const selectablePapers = computed(() => {
  const originalId = formMode.value === 'edit' ? selected.value?.paperId : undefined
  const options = props.papers.filter((item) => item.status === 'ACTIVE' || item.id === originalId)
  return chosenPaper.value && !options.some((item) => item.id === chosenPaper.value?.id)
    ? [chosenPaper.value, ...options]
    : options
})
const selectedPaper = computed(
  () =>
    props.papers.find((item) => item.id === form.paperId) ??
    (chosenPaper.value?.id === form.paperId ? chosenPaper.value : undefined),
)
const formValid = computed(
  () =>
    form.name.trim().length > 0 &&
    form.name.trim().length <= 200 &&
    form.paperId > 0 &&
    Boolean(selectedPaper.value) &&
    form.durationSeconds > 0 &&
    Number.isInteger(form.durationSeconds) &&
    form.passScore >= 0 &&
    form.passScore <= (selectedPaper.value?.totalScore ?? 0) &&
    form.maxAttempts >= 1 &&
    Number.isInteger(form.maxAttempts),
)

function asConfiguration(row: Record<string, unknown>) {
  return row as unknown as ExamConfigurationRecord
}

function statusLabel(status: TrainingStatus) {
  return { DRAFT: '草稿', ACTIVE: '启用', DISABLED: '停用' }[status]
}

function statusTone(status: TrainingStatus): StatusTone {
  return status === 'ACTIVE' ? 'success' : status === 'DRAFT' ? 'warning' : 'info'
}

function modeLabel(mode: ExamConfigurationRecord['paperMode']) {
  return mode === 'FIXED' ? '固定组卷' : '随机组卷'
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes} 分钟`
}

function search() {
  Object.assign(committed, query)
  page.value = 1
  if (props.runtime) {
    load()
    return
  }
  emit('action', '考试配置查询条件已生效')
}

function reset() {
  Object.assign(query, { keyword: '', status: '' })
  Object.assign(committed, query)
  page.value = 1
  if (props.runtime) {
    load()
    return
  }
  emit('action', '考试配置查询条件已重置')
}

function handleSearchKeyup(event: KeyboardEvent) {
  if (!event.isComposing) search()
}

function openDetail(record: ExamConfigurationRecord) {
  if (props.runtime) {
    void run(async () => {
      selected.value = await props.runtime!.detail(record)
      detailVisible.value = true
    })
    return
  }
  selected.value = record
  detailVisible.value = true
}

function openForm(mode: 'create' | 'edit', record?: ExamConfigurationRecord) {
  if (!allowed(mode === 'edit' ? 'update' : 'create')) return
  if (props.runtime) {
    void run(async () => {
      const detail = record ? await props.runtime!.detail(record) : undefined
      await props.runtime!.prepareForm?.(detail)
      initializeForm(mode, detail)
    })
    return
  }
  initializeForm(mode, record)
}

function initializeForm(mode: 'create' | 'edit', record?: ExamConfigurationRecord) {
  actionError.value = ''
  formMode.value = mode
  selected.value = record
  Object.assign(form, {
    name: mode === 'edit' ? (record?.name ?? '') : '',
    description: mode === 'edit' ? (record?.description ?? '') : '',
    paperId: mode === 'edit' ? (record?.paperId ?? 0) : 0,
    durationSeconds: mode === 'edit' ? (record?.durationSeconds ?? 3600) : 3600,
    passScore: mode === 'edit' ? (record?.passScore ?? 60) : 60,
    maxAttempts: mode === 'edit' ? (record?.maxAttempts ?? 1) : 1,
    showCorrectAnswer: mode === 'edit' ? Boolean(record?.showCorrectAnswer) : false,
    showAnswerAnalysis: mode === 'edit' ? Boolean(record?.showAnswerAnalysis) : false,
  })
  optionKeyword.value = ''
  submitting.value = false
  formVisible.value = true
}

function saveConfiguration() {
  if (!formValid.value || submitting.value) return
  if (props.runtime) {
    void run(async () => {
      const saved = await props.runtime!.save(
        form,
        formMode.value === 'edit' ? selected.value : undefined,
      )
      formVisible.value = false
      selected.value = saved
      detailVisible.value = true
    })
    return
  }
  submitting.value = true
  window.setTimeout(() => {
    submitting.value = false
    formVisible.value = false
    emit(
      'action',
      formMode.value === 'create'
        ? '考试配置草稿候选已创建并进入详情'
        : '考试配置候选修改已保存；后续考试实例将采用新快照',
    )
  }, 240)
}

function openStatus(record: ExamConfigurationRecord) {
  if (!allowed('status') || submitting.value) return
  actionError.value = ''
  selected.value = record
  statusVisible.value = true
}

function confirmStatus() {
  if (props.runtime && selected.value) {
    void run(async () => {
      selected.value = await props.runtime!.changeStatus(selected.value!)
      statusVisible.value = false
    })
    return
  }
  statusVisible.value = false
  emit('action', '考试配置状态候选操作已由服务端确认；历史考试实例保持不变')
}
</script>

<template>
  <AppPage class="training-page exam-configuration-page">
    <ListPageTemplate>
      <el-alert
        v-if="actionError && !formVisible && !statusVisible"
        :title="actionError"
        type="error"
        :closable="false"
        show-icon
      />
      <el-alert
        v-if="runtime?.error"
        :title="runtime.error"
        type="error"
        :closable="false"
        show-icon
      />
      <template #header>
        <PageHeader
          title="考试配置管理"
          description="绑定启用试卷并配置考试时长、及格线与考后反馈策略"
        >
          <template #actions
            ><el-button
              type="primary"
              :disabled="!allowed('create') || submitting"
              @click="openForm('create')"
              ><Icon icon="mdi:plus" width="18" aria-hidden="true" />新建考试配置</el-button
            ></template
          >
        </PageHeader>
      </template>

      <template #search>
        <SearchPanel :loading="state === 'loading'" @search="search" @reset="reset">
          <el-form-item label="配置名称"
            ><el-input
              v-model="query.keyword"
              clearable
              placeholder="输入配置名称"
              @keyup.enter="handleSearchKeyup"
          /></el-form-item>
          <el-form-item label="配置状态"
            ><el-select v-model="query.status" clearable placeholder="全部状态"
              ><el-option label="草稿" value="DRAFT" /><el-option
                label="启用"
                value="ACTIVE" /><el-option label="停用" value="DISABLED" /></el-select
          ></el-form-item>
        </SearchPanel>
      </template>

      <template #toolbar
        ><TableToolbar
          title="考试配置列表"
          :total="runtime?.total ?? visibleRecords.length"
          :refreshing="state === 'loading'"
          @refresh="refresh"
          ><template #summary
            ><span class="training-page__summary"
              >当前 Tenant · 最大考试次数包含首次考试</span
            ></template
          ></TableToolbar
        ></template
      >

      <el-alert
        v-if="state === 'retryable-error'"
        class="training-page__alert"
        title="考试配置列表加载失败，筛选条件已保留"
        type="error"
        :closable="false"
        show-icon
        ><template #default
          ><el-button link type="primary" @click="refresh">重新加载</el-button></template
        ></el-alert
      >

      <DataTable
        :data="visibleRecords"
        :columns="columns"
        :loading="state === 'loading' || submitting"
        @row-click="openDetail(asConfiguration($event))"
      >
        <template #name="{ row }"
          ><button
            class="training-page__link"
            type="button"
            @click.stop="openDetail(asConfiguration(row))"
          >
            {{ asConfiguration(row).name }}
          </button></template
        >
        <template #duration="{ row }">{{
          formatDuration(asConfiguration(row).durationSeconds)
        }}</template>
        <template #status="{ row }"
          ><StatusTag
            :label="statusLabel(asConfiguration(row).status)"
            :tone="statusTone(asConfiguration(row).status)"
        /></template>
        <template #actions="{ row }"
          ><RowActionGrid :aria-label="`${asConfiguration(row).name} 的操作`"
            ><el-button link type="primary" @click.stop="openDetail(asConfiguration(row))"
              >详情</el-button
            ><el-button
              link
              type="primary"
              :disabled="!allowed('update') || submitting"
              @click.stop="openForm('edit', asConfiguration(row))"
              >编辑</el-button
            ><el-button
              link
              :type="asConfiguration(row).status === 'ACTIVE' ? 'warning' : 'primary'"
              :disabled="!allowed('status') || submitting"
              @click.stop="openStatus(asConfiguration(row))"
              >{{ asConfiguration(row).status === 'ACTIVE' ? '停用' : '启用' }}</el-button
            ></RowActionGrid
          ></template
        >
      </DataTable>

      <template #pagination
        ><AppPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="runtime?.total ?? visibleRecords.length"
          @change="paginate"
      /></template>
    </ListPageTemplate>

    <DetailDrawer
      v-model="detailVisible"
      :title="selected ? `考试配置详情 · ${selected.name}` : '考试配置详情'"
      :size="760"
    >
      <div v-if="selected" class="training-detail">
        <section class="training-detail__hero">
          <div>
            <h3>{{ selected.name }}</h3>
            <p>{{ selected.description }}</p>
          </div>
          <div class="training-detail__tags">
            <StatusTag :label="statusLabel(selected.status)" :tone="statusTone(selected.status)" />
          </div>
        </section>
        <el-descriptions title="关联试卷" :column="2" border
          ><el-descriptions-item label="试卷名称" :span="2">{{
            selected.paperName
          }}</el-descriptions-item
          ><el-descriptions-item label="组卷模式">{{
            modeLabel(selected.paperMode)
          }}</el-descriptions-item
          ><el-descriptions-item label="试卷状态"
            ><StatusTag
              v-if="selected.paperStatus"
              :label="statusLabel(selected.paperStatus)"
              :tone="statusTone(selected.paperStatus)"
            /><span v-else>接口未提供</span></el-descriptions-item
          ><el-descriptions-item label="试卷总分">{{
            selected.paperTotalScore
          }}</el-descriptions-item></el-descriptions
        >
        <el-descriptions title="考试规则" :column="2" border
          ><el-descriptions-item label="考试时长"
            >{{ formatDuration(selected.durationSeconds) }}（{{
              selected.durationSeconds
            }}
            秒）</el-descriptions-item
          ><el-descriptions-item label="及格分"
            >{{ selected.passScore }} / {{ selected.paperTotalScore }}</el-descriptions-item
          ><el-descriptions-item label="最大考试次数"
            >{{ selected.maxAttempts }} 次（含首次）</el-descriptions-item
          ><el-descriptions-item label="展示正确答案">{{
            selected.showCorrectAnswer ? '是' : '否'
          }}</el-descriptions-item
          ><el-descriptions-item label="展示答案解析">{{
            selected.showAnswerAnalysis ? '是' : '否'
          }}</el-descriptions-item></el-descriptions
        >
        <el-alert
          title="规则更新只影响后续创建的考试实例，历史实例继续按创建时快照执行。"
          type="info"
          :closable="false"
          show-icon
        />
        <el-descriptions title="审计信息" :column="2" border
          ><el-descriptions-item label="创建信息"
            >{{ selected.createdBy }} · {{ selected.createdAt }}</el-descriptions-item
          ><el-descriptions-item label="更新信息"
            >{{ selected.updatedBy }} · {{ selected.updatedAt }}</el-descriptions-item
          ><el-descriptions-item label="版本">{{
            selected.version
          }}</el-descriptions-item></el-descriptions
        >
      </div>
    </DetailDrawer>

    <FormDrawer
      v-model="formVisible"
      :title="formMode === 'create' ? '新建考试配置' : `编辑考试配置 · ${selected?.name ?? ''}`"
      :size="760"
      :submitting="submitting"
      :dirty="formDirty"
      :confirm-disabled="!formValid"
      :confirm-button-text="formMode === 'create' ? '创建草稿' : '保存修改'"
      @confirm="saveConfiguration"
    >
      <el-alert v-if="actionError" :title="actionError" type="error" :closable="false" show-icon />
      <el-form class="training-form" label-position="top" :disabled="submitting" novalidate>
        <el-alert
          v-if="formMode === 'edit'"
          title="编辑不会改变配置状态；新规则只影响后续创建的考试实例。"
          type="info"
          :closable="false"
          show-icon
        />
        <section v-if="runtime" class="training-form-section">
          <div class="training-form-grid">
            <el-form-item label="查找启用试卷"
              ><el-input
                v-model="optionKeyword"
                clearable
                placeholder="输入关键词后查询"
                @keyup.enter="!$event.isComposing && searchOptions()" /></el-form-item
            ><el-button :loading="runtime.optionsLoading" @click="searchOptions()"
              >查询试卷</el-button
            >
          </div>
          <div class="training-detail__tags">
            <span>共 {{ runtime.optionsTotal }} 份 · 第 {{ runtime.optionsPage }} 页</span
            ><el-button
              :disabled="submitting || (runtime.optionsPage ?? 1) <= 1"
              @click="searchOptions((runtime.optionsPage ?? 1) - 1)"
              >上一页试卷</el-button
            ><el-button
              :disabled="
                submitting || (runtime.optionsPage ?? 1) * 20 >= (runtime.optionsTotal ?? 0)
              "
              @click="searchOptions((runtime.optionsPage ?? 1) + 1)"
              >下一页试卷</el-button
            >
          </div>
        </section>
        <section class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>配置基础信息</h3>
              <p>创建后固定为草稿；启用需单独确认。</p>
            </div>
            <StatusTag
              :label="formMode === 'create' ? '草稿' : statusLabel(selected?.status ?? 'DRAFT')"
              :tone="formMode === 'create' ? 'warning' : statusTone(selected?.status ?? 'DRAFT')"
            />
          </div>
          <div class="training-form-grid">
            <el-form-item label="配置名称" required
              ><el-input
                v-model="form.name"
                maxlength="200"
                show-word-limit
                clearable
                placeholder="输入配置名称" /></el-form-item
            ><el-form-item label="关联试卷" required
              ><el-select
                :model-value="form.paperId || undefined"
                filterable
                placeholder="选择启用试卷"
                @update:model-value="form.paperId = $event ?? 0"
                ><el-option
                  v-for="paper in selectablePapers"
                  :key="paper.id"
                  :label="`${paper.name} · ${paper.totalScore} 分`"
                  :value="paper.id"
                  :disabled="
                    paper.status !== 'ACTIVE' && paper.id !== selected?.paperId
                  " /></el-select></el-form-item
            ><el-form-item v-if="!runtime" class="training-form-grid__full" label="配置说明"
              ><el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                maxlength="1000"
                show-word-limit
                placeholder="说明适用人群和考试要求"
            /></el-form-item>
          </div>
        </section>
        <section class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>考试规则</h3>
              <p>时长使用秒存储；及格分不得超过试卷总分。</p>
            </div>
          </div>
          <div class="training-form-grid">
            <el-form-item label="考试时长（秒）" required
              ><el-input-number
                v-model="form.durationSeconds"
                :min="1"
                :step="60"
                controls-position="right" /></el-form-item
            ><el-form-item label="及格分" required
              ><el-input-number
                v-model="form.passScore"
                :min="0"
                :max="selectedPaper?.totalScore ?? 0"
                :precision="2"
                controls-position="right" /></el-form-item
            ><el-form-item label="最大考试次数" required
              ><el-input-number
                v-model="form.maxAttempts"
                :min="1"
                :step="1"
                controls-position="right"
            /></el-form-item>
          </div>
          <el-alert
            v-if="selectedPaper"
            :title="`已选 ${selectedPaper.name}：${selectedPaper.totalScore} 分，${selectedPaper.mode === 'FIXED' ? '固定组卷' : '随机组卷'}`"
            :type="selectedPaper.status === 'ACTIVE' ? 'success' : 'warning'"
            :closable="false"
            show-icon
          />
        </section>
        <section class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>考后反馈</h3>
              <p>两个开关相互独立，默认均关闭。</p>
            </div>
          </div>
          <div class="training-form-grid">
            <el-form-item label="展示正确答案"
              ><el-switch
                v-model="form.showCorrectAnswer"
                inline-prompt
                active-text="开"
                inactive-text="关" /></el-form-item
            ><el-form-item label="展示答案解析"
              ><el-switch
                v-model="form.showAnswerAnalysis"
                inline-prompt
                active-text="开"
                inactive-text="关"
            /></el-form-item>
          </div>
        </section>
      </el-form>
    </FormDrawer>

    <FormDialog
      v-model="statusModel"
      :title="selected?.status === 'ACTIVE' ? '停用考试配置' : '启用考试配置'"
      :confirm-button-text="selected?.status === 'ACTIVE' ? '确认停用' : '确认启用'"
      :confirm-type="selected?.status === 'ACTIVE' ? 'warning' : 'primary'"
      :submitting="submitting"
      @confirm="confirmStatus"
      ><el-alert v-if="actionError" :title="actionError" type="error" :closable="false" show-icon />
      <div v-if="selected" class="training-status-dialog">
        <p>
          操作对象：<strong>{{ selected.name }}</strong>
        </p>
        <p>
          {{
            selected.status === 'ACTIVE'
              ? '停用后不可用于新培训任务，历史考试实例继续按快照执行。'
              : '启用前由服务端校验关联试卷、时长、及格分与次数。'
          }}
        </p>
      </div></FormDialog
    >
    <FormDialog
      v-model="discardVisible"
      title="放弃未保存的修改？"
      confirm-button-text="放弃修改"
      confirm-type="warning"
      @confirm="confirmDiscard"
      ><p>关闭后，当前未保存的填写内容将丢失。</p></FormDialog
    >
  </AppPage>
</template>

<style scoped lang="scss">
@use '../styles/training-content.scss';
</style>
