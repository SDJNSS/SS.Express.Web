<script setup lang="ts">
import { computed, inject, reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useTrainingContentView } from '../composables/useTrainingContentView'
import type { ContentRuntime, CourseForm } from '../types/trainingContentRuntime'
import type { UploadUserFile } from 'element-plus'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import DetailDrawer from '@shared/components/DetailDrawer.vue'
import FileUploader from '@shared/components/FileUploader.vue'
import FormDialog from '@shared/components/FormDialog.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag, { type StatusTone } from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import { fileTransferKey, type UploadedAsset } from '@shared/services/fileTransfer'
import type { CourseRecord, TrainingPreviewState, TrainingStatus } from '../types/trainingContent'

const props = defineProps<{
  records: CourseRecord[]
  runtime?: ContentRuntime<CourseRecord, CourseForm>
  state: TrainingPreviewState
}>()

const emit = defineEmits<{
  action: [message: string]
  retry: []
}>()

const query = reactive({ keyword: '', trainingType: '', status: '', locked: '' })
const committed = reactive({ ...query })
const page = ref(1)
const pageSize = ref(10)
const selected = ref<CourseRecord | undefined>(props.records[0])
const detailVisible = ref(false)
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const statusVisible = ref(false)
const copyVisible = ref(false)
const submitting = ref(false)
const uploads = ref<UploadUserFile[]>([])
const uploadBlocked = ref(false)
const fileGateway = inject(fileTransferKey, undefined)
const copyName = ref('')

const form = reactive({
  name: '',
  trainingType: '',
  description: '',
  videoDurationSeconds: 0,
  videoFileId: '',
  plannedDurationSeconds: 0,
})

const { actionError, discardVisible, confirmDiscard, formDirty, lockedModel, run, load } =
  useTrainingContentView(() => props.runtime, query, page, pageSize, form, formVisible, submitting)
const statusModel = lockedModel(statusVisible)
const copyModel = lockedModel(copyVisible)
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
  { prop: 'name', label: '课程名称', minWidth: 260, fixed: 'left', slot: 'name' },
  { prop: 'trainingType', label: '培训类型', minWidth: 126 },
  { label: '视频时长', width: 112, slot: 'videoDuration' },
  { label: '计划学习时长', width: 132, slot: 'plannedDuration' },
  { label: '状态', width: 92, slot: 'status' },
  { label: '锁定', width: 84, slot: 'locked' },
  { prop: 'updatedAt', label: '更新时间', minWidth: 168 },
  { label: '操作', width: 208, fixed: 'right', slot: 'actions' },
]

const visibleRecords = computed(() => {
  if (props.state !== 'ready') return []
  if (props.runtime) return props.records
  const keyword = committed.keyword.trim().toLocaleLowerCase('zh-CN')
  return props.records.filter(
    (record) =>
      (!keyword || record.name.toLocaleLowerCase('zh-CN').includes(keyword)) &&
      (!committed.trainingType || record.trainingType === committed.trainingType) &&
      (!committed.status || record.status === committed.status) &&
      (!committed.locked || String(record.isLocked) === committed.locked),
  )
})

const trainingTypes = computed(() => [...new Set(props.records.map((item) => item.trainingType))])
const formValid = computed(
  () =>
    form.name.trim().length > 0 &&
    form.name.trim().length <= 200 &&
    form.trainingType.trim().length > 0 &&
    form.trainingType.trim().length <= 50 &&
    form.videoDurationSeconds > 0 &&
    !uploadBlocked.value &&
    (!fileGateway || Boolean(form.videoFileId)) &&
    form.videoDurationSeconds === form.plannedDurationSeconds,
)

function asCourse(row: Record<string, unknown>) {
  return row as unknown as CourseRecord
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes} 分 ${String(rest).padStart(2, '0')} 秒`
}

function statusLabel(status: TrainingStatus) {
  return { DRAFT: '草稿', ACTIVE: '启用', DISABLED: '停用' }[status]
}

function statusTone(status: TrainingStatus): StatusTone {
  return status === 'ACTIVE' ? 'success' : status === 'DRAFT' ? 'warning' : 'info'
}

function search() {
  Object.assign(committed, query)
  page.value = 1
  if (props.runtime) {
    load()
    return
  }
  emit('action', '课程查询条件已生效')
}

function reset() {
  Object.assign(query, { keyword: '', trainingType: '', status: '', locked: '' })
  Object.assign(committed, query)
  page.value = 1
  if (props.runtime) {
    load()
    return
  }
  emit('action', '课程查询条件已重置')
}

function handleSearchKeyup(event: KeyboardEvent) {
  if (!event.isComposing) search()
}

function openDetail(record: CourseRecord) {
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

function openForm(mode: 'create' | 'edit', record?: CourseRecord) {
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

function initializeForm(mode: 'create' | 'edit', record?: CourseRecord) {
  if (record?.isLocked) throw new Error('课程已锁定，请复制课程后修改')
  actionError.value = ''
  formMode.value = mode
  selected.value = record
  Object.assign(form, {
    name: mode === 'edit' ? (record?.name ?? '') : '',
    trainingType: mode === 'edit' ? (record?.trainingType ?? '') : '',
    description: mode === 'edit' ? (record?.description ?? '') : '',
    videoDurationSeconds: mode === 'edit' ? (record?.videoDurationSeconds ?? 0) : 0,
    videoFileId: mode === 'edit' ? (record?.videoFileId ?? '') : '',
    plannedDurationSeconds: mode === 'edit' ? (record?.plannedDurationSeconds ?? 0) : 0,
  })
  uploads.value = []
  uploadBlocked.value = false
  // Mount number inputs after loading; Element Plus initializes aria-disabled on mount.
  submitting.value = false
  formVisible.value = true
}

function saveCourse() {
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
  if (fileGateway) {
    emit('action', '视频已上传并校验；课程业务保存接口尚未接入，不能模拟保存成功')
    return
  }
  submitting.value = true
  window.setTimeout(() => {
    submitting.value = false
    formVisible.value = false
    emit(
      'action',
      formMode.value === 'create' ? '课程草稿候选已创建并进入详情' : '课程候选修改已保存并进入详情',
    )
  }, 240)
}

function openCopy(record: CourseRecord) {
  if (!allowed('copy') || submitting.value) return
  actionError.value = ''
  selected.value = record
  copyName.value = `${record.name}（副本）`
  copyVisible.value = true
}

function uploadedVideo(asset: UploadedAsset) {
  form.videoFileId = asset.fileId
  // Same conversion as the backend course validator: whole seconds rounded up.
  form.videoDurationSeconds = Math.ceil(asset.durationMs / 1000)
  form.plannedDurationSeconds = form.videoDurationSeconds
}

function removedVideo() {
  form.videoFileId = ''
  form.videoDurationSeconds = 0
  form.plannedDurationSeconds = 0
}

function copyCourse() {
  if (props.runtime?.copy && selected.value) {
    void run(async () => {
      const saved = await props.runtime!.copy!(selected.value!)
      copyVisible.value = false
      selected.value = saved
      detailVisible.value = true
    })
    return
  }
  if (!copyName.value.trim()) return
  copyVisible.value = false
  emit('action', '课程副本候选已创建：草稿、未锁定并复用原视频引用')
}

function openStatus(record: CourseRecord) {
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
  emit('action', '课程状态候选操作已由服务端确认；列表保持当前筛选上下文')
}
</script>

<template>
  <AppPage class="training-page course-management-page">
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
        <PageHeader title="课程管理" description="维护培训视频、学习时长与课程生命周期">
          <template #actions>
            <el-button
              type="primary"
              :disabled="!allowed('create') || submitting"
              @click="openForm('create')"
            >
              <Icon icon="mdi:plus" width="18" aria-hidden="true" />新建课程
            </el-button>
          </template>
        </PageHeader>
      </template>

      <template #search>
        <SearchPanel :loading="state === 'loading'" @search="search" @reset="reset">
          <el-form-item label="课程名称">
            <el-input
              v-model="query.keyword"
              clearable
              placeholder="输入课程名称"
              @keyup.enter="handleSearchKeyup"
            />
          </el-form-item>
          <el-form-item label="培训类型">
            <el-select
              v-model="query.trainingType"
              filterable
              :allow-create="Boolean(runtime)"
              clearable
              placeholder="输入或选择类型"
            >
              <el-option v-for="item in trainingTypes" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="课程状态">
            <el-select v-model="query.status" clearable placeholder="全部状态">
              <el-option label="草稿" value="DRAFT" />
              <el-option label="启用" value="ACTIVE" />
              <el-option label="停用" value="DISABLED" />
            </el-select>
          </el-form-item>
          <el-form-item label="锁定状态">
            <el-select v-model="query.locked" clearable placeholder="全部">
              <el-option label="已锁定" value="true" />
              <el-option label="未锁定" value="false" />
            </el-select>
          </el-form-item>
        </SearchPanel>
      </template>

      <template #toolbar>
        <TableToolbar
          title="课程列表"
          :total="runtime?.total ?? visibleRecords.length"
          :refreshing="state === 'loading'"
          @refresh="refresh"
        >
          <template #summary
            ><span class="training-page__summary">当前 Tenant · 服务端分页</span></template
          >
        </TableToolbar>
      </template>

      <el-alert
        v-if="state === 'retryable-error'"
        class="training-page__alert"
        title="课程列表加载失败，筛选条件已保留"
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
        :loading="state === 'loading'"
        @row-click="openDetail(asCourse($event))"
      >
        <template #name="{ row }">
          <button class="training-page__link" type="button" @click.stop="openDetail(asCourse(row))">
            {{ asCourse(row).name }}
          </button>
        </template>
        <template #videoDuration="{ row }">{{
          formatDuration(asCourse(row).videoDurationSeconds)
        }}</template>
        <template #plannedDuration="{ row }">{{
          formatDuration(asCourse(row).plannedDurationSeconds)
        }}</template>
        <template #status="{ row }"
          ><StatusTag
            :label="statusLabel(asCourse(row).status)"
            :tone="statusTone(asCourse(row).status)"
        /></template>
        <template #locked="{ row }"
          ><StatusTag
            :label="asCourse(row).isLocked ? '已锁定' : '未锁定'"
            :tone="asCourse(row).isLocked ? 'warning' : 'info'"
        /></template>
        <template #actions="{ row }">
          <RowActionGrid :aria-label="`${asCourse(row).name} 的操作`">
            <el-button link type="primary" @click.stop="openDetail(asCourse(row))">详情</el-button>
            <el-tooltip
              :disabled="!asCourse(row).isLocked"
              content="课程已被业务使用，核心内容不可编辑"
              placement="top"
            >
              <span
                ><el-button
                  link
                  type="primary"
                  :disabled="asCourse(row).isLocked || !allowed('update') || submitting"
                  @click.stop="openForm('edit', asCourse(row))"
                  >编辑</el-button
                ></span
              >
            </el-tooltip>
            <el-button
              link
              type="primary"
              :disabled="!allowed('copy') || submitting"
              @click.stop="openCopy(asCourse(row))"
              >复制</el-button
            >
            <el-button
              link
              :type="asCourse(row).status === 'ACTIVE' ? 'warning' : 'primary'"
              :disabled="!allowed('status') || submitting"
              @click.stop="openStatus(asCourse(row))"
            >
              {{ asCourse(row).status === 'ACTIVE' ? '停用' : '启用' }}
            </el-button>
          </RowActionGrid>
        </template>
      </DataTable>

      <template #pagination>
        <AppPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="runtime?.total ?? visibleRecords.length"
          @change="paginate"
        />
      </template>
    </ListPageTemplate>

    <DetailDrawer
      v-model="detailVisible"
      :title="selected ? `课程详情 · ${selected.name}` : '课程详情'"
      :size="720"
    >
      <div v-if="selected" class="training-detail">
        <section class="training-detail__hero">
          <div>
            <h3>{{ selected.name }}</h3>
            <p>{{ selected.description }}</p>
          </div>
          <div class="training-detail__tags">
            <StatusTag :label="statusLabel(selected.status)" :tone="statusTone(selected.status)" />
            <StatusTag
              :label="selected.isLocked ? '内容已锁定' : '内容可编辑'"
              :tone="selected.isLocked ? 'warning' : 'info'"
            />
          </div>
        </section>
        <el-descriptions title="基础信息" :column="2" border>
          <el-descriptions-item label="课程 ID">{{ selected.id }}</el-descriptions-item>
          <el-descriptions-item label="培训类型">{{ selected.trainingType }}</el-descriptions-item>
          <el-descriptions-item label="视频时长">{{
            formatDuration(selected.videoDurationSeconds)
          }}</el-descriptions-item>
          <el-descriptions-item label="计划学习时长">{{
            formatDuration(selected.plannedDurationSeconds)
          }}</el-descriptions-item>
        </el-descriptions>
        <el-descriptions title="视频资源" :column="2" border>
          <el-descriptions-item :label="runtime ? '文件 ID' : '文件名称'" :span="2">{{
            selected.videoFileName
          }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ selected.videoSize }}</el-descriptions-item>
          <el-descriptions-item v-if="!runtime" label="处理状态"
            ><StatusTag label="可用" tone="success"
          /></el-descriptions-item>
        </el-descriptions>
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
      :title="formMode === 'create' ? '新建课程' : `编辑课程 · ${selected?.name ?? ''}`"
      :size="760"
      :submitting="submitting"
      :dirty="formDirty"
      :confirm-disabled="!formValid"
      :confirm-button-text="formMode === 'create' ? '创建草稿' : '保存修改'"
      @confirm="saveCourse"
    >
      <el-alert v-if="actionError" :title="actionError" type="error" :closable="false" show-icon />
      <el-form class="training-form" label-position="top" :disabled="submitting" novalidate>
        <section class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>课程信息</h3>
              <p>创建后状态固定为草稿，启用需单独确认。</p>
            </div>
            <StatusTag
              :label="formMode === 'edit' ? statusLabel(selected?.status ?? 'DRAFT') : '草稿'"
              :tone="statusTone(formMode === 'edit' ? (selected?.status ?? 'DRAFT') : 'DRAFT')"
            />
          </div>
          <div class="training-form-grid">
            <el-form-item label="课程名称" required
              ><el-input
                v-model="form.name"
                maxlength="200"
                show-word-limit
                clearable
                placeholder="输入课程名称"
            /></el-form-item>
            <el-form-item label="培训类型" required
              ><el-input
                v-model="form.trainingType"
                maxlength="50"
                clearable
                placeholder="输入或选择培训类型"
            /></el-form-item>
            <el-form-item class="training-form-grid__full" label="课程说明"
              ><el-input
                v-model="form.description"
                type="textarea"
                :rows="4"
                maxlength="1000"
                show-word-limit
                placeholder="说明适用对象与学习目标"
            /></el-form-item>
          </div>
        </section>
        <section class="training-form-section">
          <div class="training-form-section__heading">
            <div>
              <h3>培训视频</h3>
              <p>
                {{
                  fileGateway
                    ? '视频上传后由 DMS 校验，自动读取时长并保存文件 ID。'
                    : '原型预览仅模拟选文件；生产环境使用 DMS 上传与视频校验。'
                }}
              </p>
            </div>
          </div>
          <div v-if="formMode === 'edit' && selected" class="training-upload-card">
            <div class="training-upload-card__file">
              <div>
                <strong>{{ selected.videoFileName }}</strong
                ><span>{{ selected.videoSize }} · 已上传</span>
              </div>
              <StatusTag v-if="!runtime" label="处理完成" tone="success" />
            </div>
            <el-progress v-if="!runtime" :percentage="100" status="success" />
          </div>
          <FileUploader
            v-model="uploads"
            accept="video/*"
            category="VIDEO"
            :limit="1"
            :max-size-mb="1024"
            :disabled="submitting"
            @blocked-change="uploadBlocked = $event"
            @uploaded="uploadedVideo"
            @removed="removedVideo"
          />
          <div class="training-form-grid">
            <el-form-item label="视频时长（秒）" required
              ><el-input-number
                v-model="form.videoDurationSeconds"
                :disabled="Boolean(fileGateway)"
                :min="0"
                :step="60"
                controls-position="right"
            /></el-form-item>
            <el-form-item label="计划学习时长（秒）" required
              ><el-input-number
                v-model="form.plannedDurationSeconds"
                :min="0"
                :step="60"
                controls-position="right"
            /></el-form-item>
          </div>
          <el-alert
            :title="
              form.videoDurationSeconds > 0 &&
              form.videoDurationSeconds === form.plannedDurationSeconds
                ? '时长校验通过'
                : '视频时长与计划学习时长必须相同且大于 0'
            "
            :type="
              form.videoDurationSeconds > 0 &&
              form.videoDurationSeconds === form.plannedDurationSeconds
                ? 'success'
                : 'warning'
            "
            :closable="false"
            show-icon
          />
        </section>
      </el-form>
    </FormDrawer>

    <FormDialog
      v-model="copyModel"
      title="复制课程"
      confirm-button-text="创建副本"
      :confirm-disabled="!runtime && !copyName.trim()"
      :submitting="submitting"
      @confirm="copyCourse"
    >
      <el-alert v-if="actionError" :title="actionError" type="error" :closable="false" show-icon />
      <p v-if="runtime">复制「{{ selected?.name }}」。副本名称由后端自动生成，创建后可编辑。</p>
      <el-form v-else label-position="top" novalidate>
        <el-form-item label="新课程名称" required
          ><el-input v-model="copyName" maxlength="200" clearable
        /></el-form-item>
      </el-form>
      <el-alert
        title="副本将以草稿、未锁定状态创建，并复用原视频引用。"
        type="info"
        :closable="false"
        show-icon
      />
    </FormDialog>

    <FormDialog
      v-model="statusModel"
      :title="selected?.status === 'ACTIVE' ? '停用课程' : '启用课程'"
      :confirm-button-text="selected?.status === 'ACTIVE' ? '确认停用' : '确认启用'"
      :confirm-type="selected?.status === 'ACTIVE' ? 'warning' : 'primary'"
      :submitting="submitting"
      @confirm="confirmStatus"
    >
      <el-alert v-if="actionError" :title="actionError" type="error" :closable="false" show-icon />
      <div v-if="selected" class="training-status-dialog">
        <p>
          操作对象：<strong>{{ selected.name }}</strong>
        </p>
        <p v-if="selected.status === 'ACTIVE'">
          {{
            runtime
              ? '停用后不可用于新培训任务。是否存在进行中的关联任务，由后端校验后决定能否停用。'
              : '停用后不可用于新培训任务；已有任务与历史记录继续按快照执行。'
          }}
        </p>
        <p v-else>启用前将由服务端重新校验视频资源与时长配置，校验通过后才变更状态。</p>
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
