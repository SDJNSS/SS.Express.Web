<script setup lang="ts">
import { papersElements } from '../iam-resource.registry'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useTrainingContentView } from '../composables/useTrainingContentView'
import type {
  ContentRuntime,
  PaperForm,
  PaperPreviewGenerator,
} from '../types/trainingContentRuntime'
import { usePaperComposition } from '../composables/usePaperComposition'
import { equalQuestionScore, scoreUnits } from '../adapters/paperComposition'
import PaperQuestionPicker from './PaperQuestionPicker.vue'
import PaperQuestionGroups from './PaperQuestionGroups.vue'

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
  FixedPaperQuestion,
  PaperMode,
  PaperRecord,
  QuestionRecord,
  QuestionType,
  RandomPaperRule,
  TrainingPreviewState,
  TrainingStatus,
} from '../types/trainingContent'

const props = defineProps<{
  records: PaperRecord[]
  questions: QuestionRecord[]
  runtime?: ContentRuntime<PaperRecord, PaperForm>
  state: TrainingPreviewState
  generatePreview?: PaperPreviewGenerator
}>()

const emit = defineEmits<{
  action: [message: string]
  retry: []
}>()

const query = reactive({ keyword: '', mode: '', status: '' })
const committed = reactive({ ...query })
const page = ref(1)
const pageSize = ref(10)
const selected = ref<PaperRecord | undefined>(props.records[0])
const detailVisible = ref(false)
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const statusVisible = ref(false)
const modeDialogVisible = ref(false)
const pendingMode = ref<PaperMode>()
const confirmedMode = ref<PaperMode>('FIXED')
const submitting = ref(false)
const pickerVisible = ref(false)
const replacingId = ref<number>()
const generationLoading = ref(false)
const generationError = ref('')
const resetPreviewVisible = ref(false)
let generation = 0
let generationController: AbortController | undefined

const form = reactive<{
  name: string
  description: string
  mode: PaperMode
  totalScore: number
  randomizeQuestionOrder: boolean
  randomizeOptionOrder: boolean
  fixedQuestions: FixedPaperQuestion[]
  randomRules: RandomPaperRule[]
}>({
  name: '',
  description: '',
  mode: 'FIXED',
  totalScore: 100,
  randomizeQuestionOrder: false,
  randomizeOptionOrder: false,
  fixedQuestions: [],
  randomRules: [],
})

const { actionError, discardVisible, confirmDiscard, formDirty, lockedModel, run, load } =
  useTrainingContentView(() => props.runtime, query, page, pageSize, form, formVisible, submitting)
const statusModel = lockedModel(statusVisible)
const composition = usePaperComposition(form)
const { randomGenerated, scoreNotice, groups } = composition
const selectionElement = computed(() =>
  formMode.value === 'create' ? papersElements.createSelection : papersElements.editSelection,
)
const selectedHasQuestions = computed(() => !!selected.value?.fixedQuestions.length)
watch(formVisible, (visible) => {
  if (!visible) {
    ++generation
    generationController?.abort()
    pickerVisible.value = false
    generationLoading.value = false
  }
})
onBeforeUnmount(() => {
  ++generation
  generationController?.abort()
})
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
  { prop: 'name', label: '试卷名称', minWidth: 300, fixed: 'left', slot: 'name' },
  { label: '组卷模式', width: 120, slot: 'mode' },
  { prop: 'totalScore', label: '总分', width: 92, align: 'right' },
  { label: '状态', width: 92, slot: 'status' },
  { prop: 'updatedAt', label: '更新时间', minWidth: 168 },
  { label: '操作', fixed: 'right', slot: 'actions' },
]

const visibleRecords = computed(() => {
  if (props.state !== 'ready') return []
  if (props.runtime) return props.records
  const keyword = committed.keyword.trim().toLocaleLowerCase('zh-CN')
  return props.records.filter(
    (record) =>
      (!keyword || record.name.toLocaleLowerCase('zh-CN').includes(keyword)) &&
      (!committed.mode || record.mode === committed.mode) &&
      (!committed.status || record.status === committed.status),
  )
})

const computedScore = computed(() => {
  if (form.mode === 'FIXED' || randomGenerated.value) return composition.totalScore.value
  return (
    form.randomRules.reduce(
      (total, item) => total + (item.count ? (scoreUnits(item.totalScore) ?? 0) : 0),
      0,
    ) / 100
  )
})
const scoreMatched = computed(
  () => computedScore.value > 0 && scoreUnits(computedScore.value) === scoreUnits(form.totalScore),
)
const randomRuleValid = computed(
  () =>
    form.randomRules.some((item) => item.count > 0) &&
    form.randomRules.reduce((sum, rule) => sum + rule.count, 0) <= 1000 &&
    form.randomRules.every(
      (item) =>
        Number.isInteger(item.count) &&
        item.count >= 0 &&
        item.count <= item.availableCount &&
        (item.count === 0 || equalQuestionScore(item.totalScore, item.count) !== undefined),
    ),
)
const formValid = computed(
  () =>
    form.name.trim().length > 0 &&
    form.name.trim().length <= 200 &&
    form.totalScore > 0 &&
    scoreMatched.value &&
    !generationLoading.value &&
    !pickerVisible.value &&
    (form.mode === 'FIXED' || randomGenerated.value) &&
    composition.valid.value &&
    (!props.runtime || form.fixedQuestions.every((q) => !!q.questionUpdatedAt)),
)

function asPaper(row: Record<string, unknown>) {
  return row as unknown as PaperRecord
}

function modeLabel(mode: PaperMode) {
  return mode === 'FIXED' ? '固定组卷' : '随机组卷'
}

function questionTypeLabel(type: QuestionType) {
  return { SINGLE_CHOICE: '单选题', MULTIPLE_CHOICE: '多选题', TRUE_FALSE: '判断题' }[type]
}

function statusLabel(status: TrainingStatus) {
  return { DRAFT: '草稿', ACTIVE: '启用', DISABLED: '停用' }[status]
}

function statusTone(status: TrainingStatus): StatusTone {
  return status === 'ACTIVE' ? 'success' : status === 'DRAFT' ? 'warning' : 'info'
}

function defaultRules(): RandomPaperRule[] {
  return (['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'] as QuestionType[]).map((type) => ({
    type,
    count: 0,
    scorePerQuestion: 0,
    availableCount: props.runtime
      ? (props.runtime.questionCounts?.[type] ?? 0)
      : props.questions.filter((question) => question.type === type && question.status === 'ACTIVE')
          .length,
  }))
}

function search() {
  Object.assign(committed, query)
  page.value = 1
  if (props.runtime) {
    load()
    return
  }
  emit('action', '试卷查询条件已生效')
}

function reset() {
  Object.assign(query, { keyword: '', mode: '', status: '' })
  Object.assign(committed, query)
  page.value = 1
  if (props.runtime) {
    load()
    return
  }
  emit('action', '试卷查询条件已重置')
}

function handleSearchKeyup(event: KeyboardEvent) {
  if (!event.isComposing) search()
}

function openDetail(record: PaperRecord) {
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

function openForm(mode: 'create' | 'edit', record?: PaperRecord) {
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

function initializeForm(mode: 'create' | 'edit', record?: PaperRecord) {
  actionError.value = ''
  formMode.value = mode
  selected.value = record
  const nextMode = mode === 'edit' ? (record?.mode ?? 'FIXED') : 'FIXED'
  confirmedMode.value = nextMode
  Object.assign(form, {
    name: mode === 'edit' ? (record?.name ?? '') : '',
    description: mode === 'edit' ? (record?.description ?? '') : '',
    mode: nextMode,
    totalScore: mode === 'edit' ? (record?.totalScore ?? 100) : 100,
    randomizeQuestionOrder: mode === 'edit' ? Boolean(record?.randomizeQuestionOrder) : false,
    randomizeOptionOrder: mode === 'edit' ? Boolean(record?.randomizeOptionOrder) : false,
    fixedQuestions:
      mode === 'edit' && record ? record.fixedQuestions.map((item) => ({ ...item })) : [],
    randomRules:
      mode === 'edit' && record && record.randomRules.length
        ? record.randomRules.map((item) => ({ ...item }))
        : defaultRules(),
  })
  composition.reset()
  pickerVisible.value = false
  generationError.value = ''
  if (props.runtime)
    form.randomRules.forEach((rule) => {
      rule.availableCount = props.runtime?.questionCounts?.[rule.type] ?? 0
    })
  submitting.value = false
  formVisible.value = true
}

function requestModeChange(value: PaperMode) {
  if (value === confirmedMode.value) return
  pendingMode.value = value
  form.mode = confirmedMode.value
  modeDialogVisible.value = true
}

function confirmModeChange() {
  if (!pendingMode.value) return
  confirmedMode.value = pendingMode.value
  form.mode = pendingMode.value
  if (pendingMode.value === 'FIXED') form.randomRules = defaultRules()
  form.fixedQuestions = []
  composition.reset()
  pendingMode.value = undefined
  modeDialogVisible.value = false
  emit('action', '组卷模式已切换，另一模式的未保存配置已清空')
}

function moveQuestion(id: number, offset: number) {
  const index = form.fixedQuestions.findIndex((q) => q.questionId === id)
  const current = form.fixedQuestions[index]
  if (!current) return
  const group = form.fixedQuestions.filter((q) => q.type === current.type)
  const neighbor = group[group.indexOf(current) + offset]
  const target = form.fixedQuestions.findIndex((q) => q.questionId === neighbor?.questionId)
  if (target < 0 || target >= form.fixedQuestions.length) return
  const next = form.fixedQuestions[target]
  if (!current || !next) return
  form.fixedQuestions.splice(index, 1, next)
  form.fixedQuestions.splice(target, 1, current)
  form.fixedQuestions.forEach((item, itemIndex) => (item.order = itemIndex + 1))
}

function openPicker(id?: number) {
  if (submitting.value || generationLoading.value) return
  replacingId.value = id
  pickerVisible.value = true
}
async function generatePaperPreview() {
  if (
    (props.runtime ? !props.runtime.generatePaperPreview : !props.generatePreview) ||
    !randomRuleValid.value ||
    !scoreMatched.value ||
    generationLoading.value
  )
    return
  const started = ++generation
  generationLoading.value = true
  generationError.value = ''
  generationController?.abort()
  generationController = new AbortController()
  try {
    const rules = form.randomRules.map((rule) => ({ ...rule }))
    const result = props.runtime
      ? await props.runtime.generatePaperPreview!(
          rules,
          form.totalScore,
          formMode.value === 'create' ? 'create' : 'update',
          generationController.signal,
        )
      : await props.generatePreview!(rules)
    if (started !== generation || !formVisible.value) return
    composition.generated(result)
  } catch (reason) {
    if (started === generation)
      generationError.value = reason instanceof Error ? reason.message : '组卷预览失败，请重试'
  } finally {
    if (started === generation) generationLoading.value = false
  }
}
function resetRandomPreview() {
  form.fixedQuestions = []
  composition.reset()
  resetPreviewVisible.value = false
}
function clearZeroCountScore(rule: RandomPaperRule) {
  if (!rule.count) {
    rule.scorePerQuestion = 0
    rule.totalScore = undefined
  } else rule.scorePerQuestion = equalQuestionScore(rule.totalScore, rule.count) ?? 0
}
function updateRuleScore(rule: RandomPaperRule, value: number | undefined) {
  rule.totalScore = rule.count ? value : undefined
  rule.scorePerQuestion = equalQuestionScore(rule.totalScore, rule.count) ?? 0
}

function savePaper() {
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
    selected.value = {
      ...selected.value,
      ...structuredClone({
        ...form,
        fixedQuestions: form.fixedQuestions.map((q) => ({ ...q })),
        randomRules: form.randomRules.map((r) => ({ ...r })),
      }),
      id: selected.value?.id ?? 9999,
      status: selected.value?.status ?? 'DRAFT',
      createdAt: '',
      createdBy: 'Preview',
      updatedAt: '',
      updatedBy: 'Preview',
      version: '',
    }
    detailVisible.value = true
    emit(
      'action',
      formMode.value === 'create'
        ? '试卷草稿候选已创建并进入详情'
        : '试卷候选修改已保存，历史考试快照保持不变',
    )
  }, 240)
}

function openStatus(record: PaperRecord) {
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
  emit('action', '试卷状态候选操作已由服务端确认；当前列表上下文已保留')
}
</script>

<template>
  <AppPage :resource_element="papersElements.page" class="training-page paper-management-page">
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
        <PageHeader title="试卷管理" description="以固定或随机模式配置题目、分值与随机策略">
          <template #actions
            ><el-button
              v-resource-element="papersElements.create"
              type="primary"
              :disabled="!allowed('create') || submitting"
              @click="openForm('create')"
              ><Icon icon="mdi:plus" width="18" aria-hidden="true" />新建试卷</el-button
            ></template
          >
        </PageHeader>
      </template>

      <template #search>
        <SearchPanel
          :resource_element="papersElements.query"
          :loading="state === 'loading'"
          @search="search"
          @reset="reset"
        >
          <el-form-item label="试卷名称"
            ><el-input
              v-model="query.keyword"
              v-resource-element="papersElements.query"
              clearable
              placeholder="输入试卷名称"
              @keyup.enter="handleSearchKeyup"
          /></el-form-item>
          <el-form-item label="组卷模式"
            ><el-select v-model="query.mode" clearable placeholder="全部模式"
              ><el-option label="固定组卷" value="FIXED" /><el-option
                label="随机组卷"
                value="RANDOM" /></el-select
          ></el-form-item>
          <el-form-item label="试卷状态"
            ><el-select v-model="query.status" clearable placeholder="全部状态"
              ><el-option label="草稿" value="DRAFT" /><el-option
                label="启用"
                value="ACTIVE" /><el-option label="停用" value="DISABLED" /></el-select
          ></el-form-item>
        </SearchPanel>
      </template>

      <template #toolbar
        ><TableToolbar
          :resource_element="papersElements.query"
          title="试卷列表"
          :total="runtime?.total ?? visibleRecords.length"
          :refreshing="state === 'loading'"
          @refresh="refresh"
          ><template #summary
            ><span class="training-page__summary"
              >当前 Tenant · 题目变更不回写历史考试快照</span
            ></template
          ></TableToolbar
        ></template
      >

      <el-alert
        v-if="state === 'retryable-error'"
        class="training-page__alert"
        title="试卷列表加载失败，筛选条件已保留"
        type="error"
        :closable="false"
        show-icon
        ><template #default
          ><el-button v-resource-element="papersElements.query" link type="primary" @click="refresh"
            >重新加载</el-button
          ></template
        ></el-alert
      >

      <DataTable
        :data="visibleRecords"
        :columns="columns"
        :loading="state === 'loading' || submitting"
      >
        <template #name="{ row }"
          ><button
            v-resource-element="papersElements.detail"
            class="training-page__link"
            type="button"
            @click.stop="openDetail(asPaper(row))"
          >
            {{ asPaper(row).name }}
          </button></template
        >
        <template #mode="{ row }"
          ><StatusTag :label="modeLabel(asPaper(row).mode)" tone="info"
        /></template>
        <template #status="{ row }"
          ><StatusTag
            :label="statusLabel(asPaper(row).status)"
            :tone="statusTone(asPaper(row).status)"
        /></template>
        <template #actions="{ row }"
          ><RowActionGrid :aria-label="`${asPaper(row).name} 的操作`"
            ><el-button
              v-resource-element="papersElements.edit"
              link
              type="primary"
              :disabled="!allowed('update') || submitting"
              @click.stop="openForm('edit', asPaper(row))"
              >编辑</el-button
            ><el-button
              v-resource-element="papersElements.status"
              link
              :type="asPaper(row).status === 'ACTIVE' ? 'warning' : 'primary'"
              :disabled="!allowed('status') || submitting"
              @click.stop="openStatus(asPaper(row))"
              >{{ asPaper(row).status === 'ACTIVE' ? '停用' : '启用' }}</el-button
            ></RowActionGrid
          ></template
        >
      </DataTable>

      <template #pagination
        ><AppPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :resource_element="papersElements.query"
          :total="runtime?.total ?? visibleRecords.length"
          @change="paginate"
      /></template>
    </ListPageTemplate>

    <DetailDrawer
      v-model="detailVisible"
      :resource_element="papersElements.detail"
      :title="selected ? `试卷详情 · ${selected.name}` : '试卷详情'"
      :size="860"
    >
      <div v-if="selected" class="training-detail">
        <section class="training-detail__hero">
          <div>
            <h3>{{ selected.name }}</h3>
            <p>{{ selected.description }}</p>
          </div>
          <div class="training-detail__tags">
            <StatusTag :label="modeLabel(selected.mode)" tone="info" /><StatusTag
              :label="statusLabel(selected.status)"
              :tone="statusTone(selected.status)"
            />
          </div>
        </section>
        <el-descriptions title="组卷摘要" :column="2" border
          ><el-descriptions-item label="目标总分">{{ selected.totalScore }}</el-descriptions-item
          ><el-descriptions-item label="题目顺序随机">{{
            selected.randomizeQuestionOrder ? '是' : '否'
          }}</el-descriptions-item
          ><el-descriptions-item label="选项顺序随机">{{
            selected.randomizeOptionOrder ? '是' : '否'
          }}</el-descriptions-item
          ><el-descriptions-item label="版本">{{
            selected.version
          }}</el-descriptions-item></el-descriptions
        >
        <section class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>已确认题目与分值</h3>
              <p>计算总分必须与目标总分一致。</p>
            </div>
          </div>
          <table class="training-rule-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>完整题目</th>
                <th>题型</th>
                <th>分值</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selected.fixedQuestions" :key="item.questionId">
                <td>{{ item.order }}</td>
                <td>{{ item.stem }}</td>
                <td>{{ questionTypeLabel(item.type) }}</td>
                <td>{{ item.score }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="!selectedHasQuestions">尚未配置最终题集，请编辑试卷后保存。</p>
          <el-alert
            v-if="selected.configurationValid === false"
            title="试卷配置无效，请编辑并重新确认题集及题型分值后保存。"
            type="warning"
            :closable="false"
          />
        </section>
        <el-alert
          title="试卷修改只影响后续创建的考试；历史考试继续按快照执行。"
          type="info"
          :closable="false"
          show-icon
        />
        <el-descriptions title="审计信息" :column="2" border
          ><el-descriptions-item label="创建信息"
            >{{ selected.createdBy }} · {{ selected.createdAt }}</el-descriptions-item
          ><el-descriptions-item label="更新信息"
            >{{ selected.updatedBy }} · {{ selected.updatedAt }}</el-descriptions-item
          ></el-descriptions
        >
      </div>
    </DetailDrawer>

    <FormDrawer
      v-model="formVisible"
      :resource_element="formMode === 'create' ? papersElements.create : papersElements.edit"
      :title="formMode === 'create' ? '新建试卷' : `编辑试卷 · ${selected?.name ?? ''}`"
      :size="980"
      :submitting="submitting"
      :dirty="formDirty"
      :confirm-disabled="!formValid"
      :confirm-button-text="formMode === 'create' ? '创建草稿' : '保存修改'"
      @confirm="savePaper"
    >
      <el-alert v-if="actionError" :title="actionError" type="error" :closable="false" show-icon />
      <el-form
        class="training-form"
        label-position="top"
        :disabled="submitting || generationLoading"
        novalidate
      >
        <el-alert
          v-if="formMode === 'edit'"
          title="编辑不改变试卷状态；已生成考试继续使用历史快照。"
          type="info"
          :closable="false"
          show-icon
        />
        <section class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>试卷信息</h3>
              <p>创建后固定为草稿；启用需单独执行状态操作。</p>
            </div>
            <StatusTag
              :label="formMode === 'create' ? '草稿' : statusLabel(selected?.status ?? 'DRAFT')"
              :tone="formMode === 'create' ? 'warning' : statusTone(selected?.status ?? 'DRAFT')"
            />
          </div>
          <div class="training-form-grid">
            <el-form-item label="试卷名称" required
              ><el-input
                v-model="form.name"
                maxlength="200"
                show-word-limit
                clearable
                placeholder="输入试卷名称" /></el-form-item
            ><el-form-item label="目标总分" required
              ><el-input-number
                v-model="form.totalScore"
                :min="0.01"
                :max="1000000"
                :precision="2"
                :step="10"
                controls-position="right" /></el-form-item
            ><el-form-item v-if="!runtime" class="training-form-grid__full" label="试卷说明"
              ><el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                maxlength="1000"
                show-word-limit
                placeholder="说明适用对象与考试目标"
            /></el-form-item>
          </div>
          <el-form-item label="组卷模式" required
            ><el-radio-group v-model="form.mode" @change="requestModeChange"
              ><el-radio-button value="FIXED">固定组卷</el-radio-button
              ><el-radio-button value="RANDOM">随机组卷</el-radio-button></el-radio-group
            ></el-form-item
          >
        </section>

        <section v-if="form.mode === 'FIXED'" class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>固定题目</h3>
              <p>新选择仅展示启用题目；编辑时原有停用题目可保留但不可重新选择。</p>
            </div>
          </div>
          <el-button
            v-resource-element="
              formMode === 'create' ? papersElements.createOptions : papersElements.editOptions
            "
            @click="openPicker()"
            >选择题目</el-button
          >
        </section>

        <section v-else class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>随机抽题规则</h3>
              <p>题量不得超过当前可用题数，至少一种题型题量大于 0。</p>
            </div>
          </div>
          <el-alert
            title="随机仅生成一次初稿；确认后的题集按原样保存，不会在保存或考试时重新抽取。"
            type="info"
            :closable="false"
          />
          <p v-if="!runtime">Preview 使用隔离样例，不发送业务请求。</p>
          <el-alert
            v-if="generationError"
            :title="generationError"
            type="error"
            :closable="false"
          />
          <table class="training-rule-table">
            <thead>
              <tr>
                <th>题型</th>
                <th>可用题数</th>
                <th>抽取题数</th>
                <th>题型总分</th>
                <th>每题分值</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rule in form.randomRules" :key="rule.type">
                <td>{{ questionTypeLabel(rule.type) }}</td>
                <td>{{ rule.availableCount }}</td>
                <td>
                  <el-input-number
                    v-model="rule.count"
                    :disabled="randomGenerated"
                    :min="0"
                    :max="randomGenerated ? 1000 : Math.min(1000, rule.availableCount)"
                    :step="1"
                    controls-position="right"
                    @change="clearZeroCountScore(rule)"
                  />
                </td>
                <td>
                  <el-input-number
                    :key="String(rule.count === 0)"
                    :model-value="rule.count > 0 ? rule.totalScore : undefined"
                    :disabled="rule.count === 0 || randomGenerated"
                    :min="0.01"
                    :max="1000000"
                    :precision="2"
                    controls-position="right"
                    @update:model-value="updateRuleScore(rule, $event ?? undefined)"
                  />
                </td>
                <td>
                  {{ equalQuestionScore(rule.totalScore, rule.count) ?? '—' }}
                  <p
                    v-if="rule.count > 0 && !equalQuestionScore(rule.totalScore, rule.count)"
                    class="training-page__summary"
                  >
                    请设置可精确均分至两位小数的题型总分。
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
          <el-button
            v-if="!randomGenerated"
            v-resource-element="
              formMode === 'create' ? papersElements.createPreview : papersElements.editPreview
            "
            :disabled="!randomRuleValid || !scoreMatched"
            :loading="generationLoading"
            @click="generatePaperPreview"
            >组卷预览</el-button
          >
          <el-button
            v-else
            v-resource-element="
              formMode === 'create' ? papersElements.createSelection : papersElements.editSelection
            "
            @click="resetPreviewVisible = true"
            >重新设置抽题规则</el-button
          >
        </section>

        <section v-if="form.mode === 'FIXED' || randomGenerated" class="training-form-section">
          <div class="training-form-section__heading">
            <h3>已选题目 · {{ form.fixedQuestions.length }} 题</h3>
          </div>
          <p v-if="scoreNotice" role="status" aria-live="polite">{{ scoreNotice }}</p>
          <PaperQuestionGroups
            :groups="groups"
            :query-element="
              formMode === 'create' ? papersElements.createOptions : papersElements.editOptions
            "
            :resource_element="
              formMode === 'create' ? papersElements.createSelection : papersElements.editSelection
            "
            @total="composition.setTotal"
            @remove="composition.remove"
            @replace="openPicker"
            @move="moveQuestion"
          />
        </section>

        <section class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>随机策略</h3>
              <p>题目顺序与选项顺序分别控制。</p>
            </div>
          </div>
          <div class="training-form-grid">
            <el-form-item label="题目顺序随机"
              ><el-switch
                v-model="form.randomizeQuestionOrder"
                inline-prompt
                active-text="开"
                inactive-text="关" /></el-form-item
            ><el-form-item label="选项顺序随机"
              ><el-switch
                v-model="form.randomizeOptionOrder"
                inline-prompt
                active-text="开"
                inactive-text="关"
            /></el-form-item>
          </div>
          <div
            class="training-score-strip"
            :class="{ 'training-score-strip--matched': scoreMatched }"
          >
            <span>实时计算总分 / 目标总分</span
            ><strong>{{ computedScore }} / {{ form.totalScore }}</strong
            ><StatusTag
              :label="scoreMatched ? '校验通过' : '总分不一致'"
              :tone="scoreMatched ? 'success' : 'warning'"
            />
          </div>
        </section>
      </el-form>
    </FormDrawer>

    <PaperQuestionPicker
      v-if="formVisible"
      v-model="pickerVisible"
      :selected="form.fixedQuestions"
      :replace-id="replacingId"
      :action="formMode === 'create' ? 'create' : 'update'"
      :choices="questions"
      :loader="runtime?.queryQuestions"
      :resource_element="
        formMode === 'create' ? papersElements.createOptions : papersElements.editOptions
      "
      :selection-element="selectionElement"
      @confirm="composition.applySelection"
    />

    <FormDialog
      v-model="resetPreviewVisible"
      :resource_element="
        formMode === 'create' ? papersElements.createSelection : papersElements.editSelection
      "
      title="重新设置抽题规则？"
      confirm-button-text="清空预览并重新设置"
      confirm-type="warning"
      @confirm="resetRandomPreview"
      ><p>
        将清空当前预览题集及人工调整；重新点击组卷预览才会抽取新题，不影响目标总分。
      </p></FormDialog
    >

    <FormDialog
      v-model="modeDialogVisible"
      :resource_element="papersElements.local"
      title="切换组卷模式并清空配置？"
      confirm-button-text="确认切换"
      confirm-type="warning"
      @confirm="confirmModeChange"
      ><div class="training-status-dialog">
        <p>
          切换为
          <strong>{{ pendingMode ? modeLabel(pendingMode) : '' }}</strong>
          后，当前模式下的未保存题目或抽题规则将被清空。
        </p>
        <p>试卷名称、说明、总分与随机开关将保留。</p>
      </div></FormDialog
    >

    <FormDialog
      v-model="statusModel"
      :resource_element="papersElements.status"
      :title="selected?.status === 'ACTIVE' ? '停用试卷' : '启用试卷'"
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
              ? '停用后不可用于新的考试配置，已创建考试实例继续使用快照。'
              : '启用前由服务端校验题目状态、抽题范围和总分一致性。'
          }}
        </p>
      </div></FormDialog
    >
    <FormDialog
      v-model="discardVisible"
      :resource_element="papersElements.local"
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
