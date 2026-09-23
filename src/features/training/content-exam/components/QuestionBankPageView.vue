<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useTrainingContentView } from '../composables/useTrainingContentView'
import type { ContentRuntime, QuestionForm } from '../types/trainingContentRuntime'

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
  QuestionOption,
  QuestionRecord,
  QuestionType,
  TrainingPreviewState,
  TrainingStatus,
} from '../types/trainingContent'

const props = defineProps<{
  records: QuestionRecord[]
  runtime?: ContentRuntime<QuestionRecord, QuestionForm>
  state: TrainingPreviewState
}>()

const emit = defineEmits<{
  action: [message: string]
  retry: []
}>()

const query = reactive({ keyword: '', type: '', status: '' })
const committed = reactive({ ...query })
const page = ref(1)
const pageSize = ref(10)
const selected = ref<QuestionRecord | undefined>(props.records[0])
const detailVisible = ref(false)
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const statusVisible = ref(false)
const typeDialogVisible = ref(false)
const pendingType = ref<QuestionType>()
const confirmedType = ref<QuestionType>('SINGLE_CHOICE')
const submitting = ref(false)

const form = reactive<{
  stem: string
  type: QuestionType
  options: QuestionOption[]
  analysis: string
}>({
  stem: '',
  type: 'SINGLE_CHOICE',
  options: [],
  analysis: '',
})

const { actionError, discardVisible, confirmDiscard, formDirty, lockedModel, run, load } =
  useTrainingContentView(() => props.runtime, query, page, pageSize, form, formVisible, submitting)
const statusModel = lockedModel(statusVisible)
function allowed(action: 'create' | 'update' | 'status' | 'copy') {
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
  { prop: 'stem', label: '题干摘要', minWidth: 440, fixed: 'left', slot: 'stem' },
  { label: '题型', width: 124, slot: 'type' },
  { label: '选项数', width: 92, align: 'right', slot: 'optionCount' },
  { label: '状态', width: 92, slot: 'status' },
  { prop: 'updatedAt', label: '更新时间', minWidth: 168 },
  { label: '操作', width: 190, fixed: 'right', slot: 'actions' },
]

const visibleRecords = computed(() => {
  if (props.state !== 'ready') return []
  if (props.runtime) return props.records
  const keyword = committed.keyword.trim().toLocaleLowerCase('zh-CN')
  return props.records.filter(
    (record) =>
      (!keyword || record.stem.toLocaleLowerCase('zh-CN').includes(keyword)) &&
      (!committed.type || record.type === committed.type) &&
      (!committed.status || record.status === committed.status),
  )
})

const correctCount = computed(() => form.options.filter((item) => item.isCorrect).length)
const minimumOptions = computed(() => (form.type === 'MULTIPLE_CHOICE' ? 3 : 2))
const labelsUnique = computed(
  () => new Set(form.options.map((item) => item.label.trim())).size === form.options.length,
)
const answerValid = computed(() =>
  form.type === 'MULTIPLE_CHOICE' ? correctCount.value >= 2 : correctCount.value === 1,
)
const formValid = computed(
  () =>
    form.stem.trim().length > 0 &&
    form.options.length >= minimumOptions.value &&
    form.options.every(
      (item) =>
        item.label.trim().length > 0 &&
        item.label.trim().length <= 10 &&
        item.content.trim().length > 0,
    ) &&
    labelsUnique.value &&
    answerValid.value,
)

function asQuestion(row: Record<string, unknown>) {
  return row as unknown as QuestionRecord
}

function typeLabel(type: QuestionType) {
  return { SINGLE_CHOICE: '单选题', MULTIPLE_CHOICE: '多选题', TRUE_FALSE: '判断题' }[type]
}

function statusLabel(status: TrainingStatus) {
  return { DRAFT: '草稿', ACTIVE: '启用', DISABLED: '停用' }[status]
}

function statusTone(status: TrainingStatus): StatusTone {
  return status === 'ACTIVE' ? 'success' : status === 'DRAFT' ? 'warning' : 'info'
}

function defaultOptions(type: QuestionType): QuestionOption[] {
  if (type === 'TRUE_FALSE') {
    return [
      { label: 'A', content: '正确', isCorrect: true, order: 1 },
      { label: 'B', content: '错误', isCorrect: false, order: 2 },
    ]
  }
  const count = type === 'MULTIPLE_CHOICE' ? 3 : 2
  return Array.from({ length: count }, (_, index) => ({
    label: String.fromCharCode(65 + index),
    content: '',
    isCorrect: type === 'MULTIPLE_CHOICE' ? index < 2 : index === 0,
    order: index + 1,
  }))
}

function search() {
  Object.assign(committed, query)
  page.value = 1
  if (props.runtime) {
    load()
    return
  }
  emit('action', '题库查询条件已生效')
}

function reset() {
  Object.assign(query, { keyword: '', type: '', status: '' })
  Object.assign(committed, query)
  page.value = 1
  if (props.runtime) {
    load()
    return
  }
  emit('action', '题库查询条件已重置')
}

function handleSearchKeyup(event: KeyboardEvent) {
  if (!event.isComposing) search()
}

function openDetail(record: QuestionRecord) {
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

function openForm(mode: 'create' | 'edit', record?: QuestionRecord) {
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

function initializeForm(mode: 'create' | 'edit', record?: QuestionRecord) {
  actionError.value = ''
  formMode.value = mode
  selected.value = record
  const nextType = mode === 'edit' ? (record?.type ?? 'SINGLE_CHOICE') : 'SINGLE_CHOICE'
  confirmedType.value = nextType
  Object.assign(form, {
    stem: mode === 'edit' ? (record?.stem ?? '') : '',
    type: nextType,
    options:
      mode === 'edit' && record
        ? record.options.map((item) => ({ ...item }))
        : defaultOptions(nextType),
    analysis: mode === 'edit' ? (record?.analysis ?? '') : '',
  })
  submitting.value = false
  formVisible.value = true
}

function requestTypeChange(value: QuestionType) {
  if (value === confirmedType.value) return
  pendingType.value = value
  form.type = confirmedType.value
  typeDialogVisible.value = true
}

function confirmTypeChange() {
  if (!pendingType.value) return
  confirmedType.value = pendingType.value
  form.type = pendingType.value
  form.options = defaultOptions(pendingType.value)
  pendingType.value = undefined
  typeDialogVisible.value = false
  emit('action', '题型已切换，原选项已按确认结果重置')
}

function setSingleCorrect(label: string) {
  for (const option of form.options) option.isCorrect = option.label === label
}

function addOption() {
  const index = form.options.length
  form.options.push({
    label: String.fromCharCode(65 + index),
    content: '',
    isCorrect: false,
    order: index + 1,
  })
}

function removeOption(index: number) {
  if (form.options.length <= minimumOptions.value) return
  form.options.splice(index, 1)
  form.options.forEach((item, itemIndex) => (item.order = itemIndex + 1))
}

function saveQuestion() {
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
        ? '题目草稿候选已创建并进入详情'
        : '题目候选修改已保存，原状态保持不变',
    )
  }, 240)
}

function openStatus(record: QuestionRecord) {
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
  emit('action', '题目状态候选操作已由服务端确认；历史考试快照保持不变')
}
</script>

<template>
  <AppPage class="training-page question-bank-page">
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
        <PageHeader title="题库管理" description="维护考试题目、选项、正确答案与解析">
          <template #actions>
            <el-button
              type="primary"
              :disabled="!allowed('create') || submitting"
              @click="openForm('create')"
              ><Icon icon="mdi:plus" width="18" aria-hidden="true" />新建题目</el-button
            >
          </template>
        </PageHeader>
      </template>

      <template #search>
        <SearchPanel :loading="state === 'loading'" @search="search" @reset="reset">
          <el-form-item label="题干关键词"
            ><el-input
              v-model="query.keyword"
              clearable
              placeholder="输入题干关键词"
              @keyup.enter="handleSearchKeyup"
          /></el-form-item>
          <el-form-item label="题型">
            <el-select v-model="query.type" clearable placeholder="全部题型">
              <el-option label="单选题" value="SINGLE_CHOICE" />
              <el-option label="多选题" value="MULTIPLE_CHOICE" />
              <el-option label="判断题" value="TRUE_FALSE" />
            </el-select>
          </el-form-item>
          <el-form-item label="题目状态">
            <el-select v-model="query.status" clearable placeholder="全部状态">
              <el-option label="草稿" value="DRAFT" />
              <el-option label="启用" value="ACTIVE" />
              <el-option label="停用" value="DISABLED" />
            </el-select>
          </el-form-item>
        </SearchPanel>
      </template>

      <template #toolbar>
        <TableToolbar
          title="题目列表"
          :total="runtime?.total ?? visibleRecords.length"
          :refreshing="state === 'loading'"
          @refresh="refresh"
        >
          <template #summary
            ><span class="training-page__summary"
              >当前 Tenant · 答案与解析仅授权管理员可见</span
            ></template
          >
        </TableToolbar>
      </template>

      <el-alert
        v-if="state === 'retryable-error'"
        class="training-page__alert"
        title="题目列表加载失败，筛选条件已保留"
        type="error"
        :closable="false"
        show-icon
      >
        <template #default
          ><el-button link type="primary" @click="refresh">重新加载</el-button></template
        >
      </el-alert>

      <DataTable
        :data="visibleRecords"
        :columns="columns"
        :loading="state === 'loading' || submitting"
        @row-click="openDetail(asQuestion($event))"
      >
        <template #stem="{ row }"
          ><button
            class="training-page__link"
            type="button"
            @click.stop="openDetail(asQuestion(row))"
          >
            {{ asQuestion(row).stem }}
          </button></template
        >
        <template #type="{ row }"
          ><StatusTag :label="typeLabel(asQuestion(row).type)" tone="info"
        /></template>
        <template #optionCount="{ row }">{{
          asQuestion(row).optionsLoaded === false ? '—' : asQuestion(row).options.length
        }}</template>
        <template #status="{ row }"
          ><StatusTag
            :label="statusLabel(asQuestion(row).status)"
            :tone="statusTone(asQuestion(row).status)"
        /></template>
        <template #actions="{ row }">
          <RowActionGrid :aria-label="`${asQuestion(row).stem} 的操作`">
            <el-button link type="primary" @click.stop="openDetail(asQuestion(row))"
              >详情</el-button
            >
            <el-button
              link
              type="primary"
              :disabled="!allowed('update') || submitting"
              @click.stop="openForm('edit', asQuestion(row))"
              >编辑</el-button
            >
            <el-button
              link
              :type="asQuestion(row).status === 'ACTIVE' ? 'warning' : 'primary'"
              :disabled="!allowed('status') || submitting"
              @click.stop="openStatus(asQuestion(row))"
              >{{ asQuestion(row).status === 'ACTIVE' ? '停用' : '启用' }}</el-button
            >
          </RowActionGrid>
        </template>
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
      :title="selected ? `题目详情 · #${selected.id}` : '题目详情'"
      :size="760"
    >
      <div v-if="selected" class="training-detail">
        <section class="training-detail__hero">
          <div>
            <h3>{{ selected.stem }}</h3>
            <p>正确答案与解析属于管理端敏感信息，仅具备查看权限的管理员可见。</p>
          </div>
          <div class="training-detail__tags">
            <StatusTag :label="typeLabel(selected.type)" tone="info" /><StatusTag
              :label="statusLabel(selected.status)"
              :tone="statusTone(selected.status)"
            />
          </div>
        </section>
        <section class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>有序选项</h3>
              <p>选项顺序与作答快照一致。</p>
            </div>
          </div>
          <div class="training-option-list">
            <div v-for="option in selected.options" :key="option.label" class="training-option-row">
              <span class="training-option-row__order">{{ option.order }}</span
              ><StatusTag :label="option.label" tone="info" /><span>{{ option.content }}</span
              ><strong v-if="option.isCorrect" class="training-option-row__answer">正确答案</strong>
            </div>
          </div>
        </section>
        <el-descriptions title="答案解析" :column="1" border
          ><el-descriptions-item label="解析">{{
            selected.analysis
          }}</el-descriptions-item></el-descriptions
        >
        <el-alert
          title="题目修改不影响已生成的历史考试，历史记录继续使用快照。"
          type="info"
          :closable="false"
          show-icon
        />
        <el-descriptions title="审计信息" :column="2" border>
          <el-descriptions-item label="创建信息"
            >{{ selected.createdBy }} · {{ selected.createdAt }}</el-descriptions-item
          >
          <el-descriptions-item label="更新信息"
            >{{ selected.updatedBy }} · {{ selected.updatedAt }}</el-descriptions-item
          >
          <el-descriptions-item label="版本">{{ selected.version }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </DetailDrawer>

    <FormDrawer
      v-model="formVisible"
      :title="formMode === 'create' ? '新建题目' : `编辑题目 · #${selected?.id ?? ''}`"
      :size="840"
      :submitting="submitting"
      :dirty="formDirty"
      :confirm-disabled="!formValid"
      :confirm-button-text="formMode === 'create' ? '创建草稿' : '保存修改'"
      @confirm="saveQuestion"
    >
      <el-alert v-if="actionError" :title="actionError" type="error" :closable="false" show-icon />
      <el-form class="training-form" label-position="top" :disabled="submitting" novalidate>
        <el-alert
          v-if="formMode === 'edit'"
          title="编辑不改变题目状态；已生成考试继续使用历史快照。"
          type="info"
          :closable="false"
          show-icon
        />
        <section class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>题目内容</h3>
              <p>题型切换会影响选项结构，必须确认后执行。</p>
            </div>
            <StatusTag
              :label="formMode === 'create' ? '草稿' : statusLabel(selected?.status ?? 'DRAFT')"
              :tone="formMode === 'create' ? 'warning' : statusTone(selected?.status ?? 'DRAFT')"
            />
          </div>
          <el-form-item label="题型" required>
            <el-radio-group v-model="form.type" @change="requestTypeChange">
              <el-radio-button value="SINGLE_CHOICE">单选题</el-radio-button>
              <el-radio-button value="MULTIPLE_CHOICE">多选题</el-radio-button>
              <el-radio-button value="TRUE_FALSE">判断题</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="题干" required
            ><el-input
              v-model="form.stem"
              type="textarea"
              :rows="4"
              maxlength="1000"
              show-word-limit
              placeholder="输入完整题干"
          /></el-form-item>
        </section>
        <section class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>答案选项</h3>
              <p>
                {{
                  form.type === 'MULTIPLE_CHOICE'
                    ? '至少 3 个选项、至少 2 个正确答案'
                    : '至少 2 个选项、恰好 1 个正确答案'
                }}
              </p>
            </div>
            <el-button v-if="form.type !== 'TRUE_FALSE'" @click="addOption"
              ><Icon icon="mdi:plus" width="18" aria-hidden="true" />增加选项</el-button
            >
          </div>
          <div class="training-option-list">
            <div
              v-for="(option, index) in form.options"
              :key="option.order"
              class="training-option-row"
            >
              <span class="training-option-row__order">{{ option.order }}</span>
              <el-checkbox
                v-if="form.type === 'MULTIPLE_CHOICE'"
                v-model="option.isCorrect"
                :aria-label="`将选项 ${option.label} 设为正确答案`"
              />
              <el-radio
                v-else
                :model-value="form.options.find((item) => item.isCorrect)?.label"
                :value="option.label"
                :aria-label="`将选项 ${option.label} 设为正确答案`"
                @change="setSingleCorrect(option.label)"
              />
              <div class="training-form-grid">
                <el-input v-model="option.label" maxlength="10" placeholder="标签" />
                <el-input
                  v-model="option.content"
                  :disabled="form.type === 'TRUE_FALSE'"
                  placeholder="选项内容"
                />
              </div>
              <el-button
                v-if="form.type !== 'TRUE_FALSE'"
                link
                type="danger"
                :disabled="form.options.length <= minimumOptions"
                @click="removeOption(index)"
                >移除</el-button
              >
            </div>
          </div>
          <el-alert
            :title="formValid ? '题目结构校验通过' : '请检查题干、选项标签、选项数量与正确答案数量'"
            :type="formValid ? 'success' : 'warning'"
            :closable="false"
            show-icon
          />
        </section>
        <section class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>答案解析</h3>
              <p>仅授权管理端查看，不进入普通员工页面。</p>
            </div>
          </div>
          <el-form-item label="解析内容"
            ><el-input
              v-model="form.analysis"
              type="textarea"
              :rows="4"
              maxlength="2000"
              show-word-limit
              placeholder="说明正确答案与判断依据"
          /></el-form-item>
        </section>
      </el-form>
    </FormDrawer>

    <FormDialog
      v-model="typeDialogVisible"
      title="切换题型并重置选项？"
      confirm-button-text="确认切换"
      confirm-type="warning"
      @confirm="confirmTypeChange"
    >
      <div class="training-status-dialog">
        <p>
          切换为
          <strong>{{ pendingType ? typeLabel(pendingType) : '' }}</strong>
          后，当前选项与正确答案将清空并按新题型重建。
        </p>
        <p>此操作仅影响当前未保存的编辑内容。</p>
      </div>
    </FormDialog>

    <FormDialog
      v-model="statusModel"
      :title="selected?.status === 'ACTIVE' ? '停用题目' : '启用题目'"
      :confirm-button-text="selected?.status === 'ACTIVE' ? '确认停用' : '确认启用'"
      :confirm-type="selected?.status === 'ACTIVE' ? 'warning' : 'primary'"
      :submitting="submitting"
      @confirm="confirmStatus"
    >
      <el-alert v-if="actionError" :title="actionError" type="error" :closable="false" show-icon />
      <div v-if="selected" class="training-status-dialog">
        <p>
          操作对象：<strong>#{{ selected.id }} · {{ selected.stem }}</strong>
        </p>
        <p>
          {{
            selected.status === 'ACTIVE'
              ? '停用后不可被新试卷选择，已有试卷和历史考试继续使用快照。'
              : '启用前由服务端校验题型、选项和正确答案结构。'
          }}
        </p>
      </div>
    </FormDialog>
    <FormDialog
      v-model="discardVisible"
      title="放弃未保存的修改？"
      confirm-button-text="放弃修改"
      confirm-type="warning"
      @confirm="confirmDiscard"
    >
      <p>关闭后，当前未保存的填写内容将丢失。</p>
    </FormDialog>
  </AppPage>
</template>

<style scoped lang="scss">
@use '../styles/training-content.scss';
</style>
