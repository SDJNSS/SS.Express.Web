<script setup lang="ts">
import type { EntityId } from '@shared/types/entityId'
import { permissionsElements } from '../iam-resource.registry'
import { computed, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import DateTimeText from '@shared/components/DateTimeText.vue'
import DetailDrawer from '@shared/components/DetailDrawer.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import {
  isUnknownPermissionGovernanceMutation,
  permissionGovernanceErrorMessage,
} from '../composables/permissionGovernanceFeedback'
import type {
  PermissionFormValue,
  PermissionGovernanceApp,
  PermissionGovernancePreviewState,
  PermissionQuery,
  PermissionRecord,
  SystemResourceRecord,
} from '../types/permissionGovernance'

const props = defineProps<{
  permissions: PermissionRecord[]
  apps: PermissionGovernanceApp[]
  resources: SystemResourceRecord[]
  state: PermissionGovernancePreviewState
  total?: number
  initialQuery?: Partial<PermissionQuery>
  canCreate?: boolean
  canCopy?: boolean
  canEdit?: boolean
  canConfigure?: boolean
  loadParentPermissions?: (appId: EntityId) => Promise<PermissionRecord[]>
  queryPermissions?: (query: PermissionQuery) => Promise<void>
  loadPermissionDetail?: (permission: PermissionRecord) => Promise<PermissionRecord>
  submitPermission?: (
    value: PermissionFormValue,
    mode: 'create' | 'copy' | 'edit',
    source?: PermissionRecord,
    options?: { reusePendingRequestId?: boolean },
  ) => Promise<PermissionRecord>
  openConfiguration?: (permission: PermissionRecord) => void
}>()

const emit = defineEmits<{
  action: [message: string]
  retry: []
}>()

const emptyQuery = (): PermissionQuery => ({
  permissionName: '',
  pageIndex: 1,
  pageSize: 10,
})

const emptyForm = (): PermissionFormValue => ({
  appId: '',
  parentPermissionId: null,
  defaultSelectedWithParent: false,
  permissionName: '',
  description: '',
  sortOrder: 0,
})

const initialQuery = { ...emptyQuery(), ...props.initialQuery }
const draft = reactive<PermissionQuery>({ ...initialQuery })
const applied = ref<PermissionQuery>({ ...initialQuery })
const selected = ref<PermissionRecord>()
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const formVisible = ref(false)
const formMode = ref<'create' | 'copy' | 'edit'>('create')
const editingId = ref<EntityId>()
const formError = ref('')
const submitting = ref(false)
const mutationUnknown = ref(false)
const initialForm = ref<PermissionFormValue>(emptyForm())
const form = reactive<PermissionFormValue>(emptyForm())

const columns: DataTableColumn[] = [
  { label: '权限名称', minWidth: 220, fixed: 'left', slot: 'name' },
  { label: '所属 App', minWidth: 170, slot: 'app' },
  { label: '前端资源', minWidth: 210, slot: 'frontendResource' },
  { label: '后端 Function', width: 126, align: 'right', slot: 'functions' },
  { label: '状态', width: 86, slot: 'status' },
  { prop: 'sortOrder', label: '排序', width: 76, align: 'right' },
  { label: '版本', minWidth: 152, slot: 'version' },
  { label: '更新时间', minWidth: 168, slot: 'updatedAt' },
  { label: '操作', fixed: 'right', slot: 'actions' },
]

const normalizedName = computed(() =>
  applied.value.permissionName.trim().toLocaleLowerCase('zh-CN'),
)

const filteredPermissions = computed(() => {
  if (props.state === 'empty') return []
  if (!normalizedName.value) return props.permissions
  return props.permissions.filter((permission) =>
    permission.permissionName.toLocaleLowerCase('zh-CN').includes(normalizedName.value),
  )
})

const visiblePermissions = computed(() => {
  if (props.queryPermissions) return filteredPermissions.value
  const start = (applied.value.pageIndex - 1) * applied.value.pageSize
  return filteredPermissions.value.slice(start, start + applied.value.pageSize)
})

const resultTotal = computed(() => props.total ?? filteredPermissions.value.length)

const parentCandidates = ref<PermissionRecord[]>([])
const parentsLoading = ref(false)
const parentError = ref('')
let parentSequence = 0
const containsWrite = computed(
  () =>
    Boolean(selected.value) &&
    formMode.value !== 'create' &&
    functionsFor(selected.value!).some((resource) => resource.functionAccessMode === 'write'),
)
const invalidParentIds = computed(() => {
  const ids = new Set<EntityId>()
  if (formMode.value === 'edit' && selected.value) ids.add(selected.value.id)
  let changed = true
  while (changed) {
    changed = false
    for (const item of parentCandidates.value)
      if (
        item.parentPermissionId != null &&
        ids.has(item.parentPermissionId) &&
        !ids.has(item.id)
      ) {
        ids.add(item.id)
        changed = true
      }
  }
  return ids
})
async function loadParents() {
  const generation = ++parentSequence
  parentCandidates.value = []
  parentError.value = ''
  if (form.appId === '') return
  parentsLoading.value = true
  try {
    const candidates = props.loadParentPermissions
      ? await props.loadParentPermissions(form.appId)
      : props.permissions.filter((item) => item.appId === form.appId)
    if (generation === parentSequence) parentCandidates.value = candidates
  } catch {
    if (generation === parentSequence) parentError.value = '上级权限加载失败，请重试后保存'
  } finally {
    if (generation === parentSequence) parentsLoading.value = false
  }
}
watch(
  () => [formVisible.value, form.appId],
  () => {
    if (formVisible.value) void loadParents()
    else parentSequence++
  },
)
const formValid = computed(
  () =>
    form.appId !== '' &&
    form.permissionName.trim().length > 0 &&
    !parentsLoading.value &&
    !parentError.value,
)

const formDirty = computed(() => JSON.stringify(form) !== JSON.stringify(initialForm.value))
const formTitle = computed(() =>
  formMode.value === 'edit'
    ? '编辑权限'
    : formMode.value === 'create'
      ? '新建权限'
      : `复制 ${selected.value?.permissionName ?? ''}`,
)
const confirmText = computed(() =>
  formMode.value === 'edit' ? '保存修改' : formMode.value === 'create' ? '创建权限' : '创建副本',
)

function asPermission(row: Record<string, unknown>) {
  return row as PermissionRecord
}

function resourceById(resourceId: EntityId | '') {
  if (resourceId === '') return undefined
  return props.resources.find((resource) => resource.resourceId === resourceId)
}

function functionsFor(permission: PermissionRecord) {
  return permission.functionResourceIds
    .map((resourceId) => resourceById(resourceId))
    .filter((resource): resource is SystemResourceRecord => Boolean(resource))
}

function currentQuery(): PermissionQuery {
  return { ...applied.value }
}

async function runQuery(resetPage = true) {
  if (resetPage) draft.pageIndex = 1
  applied.value = { ...draft }
  if (props.queryPermissions) await props.queryPermissions(currentQuery())
  emit('action', '权限名称筛选条件已生效')
}

async function resetQuery() {
  Object.assign(draft, emptyQuery())
  applied.value = emptyQuery()
  if (props.queryPermissions) await props.queryPermissions(currentQuery())
  emit('action', '权限名称筛选条件已重置')
}

async function changePage() {
  draft.pageIndex = applied.value.pageIndex
  draft.pageSize = applied.value.pageSize
  if (props.queryPermissions) await props.queryPermissions(currentQuery())
  emit('action', '权限列表分页状态已更新')
}

async function openDetail(permission: PermissionRecord) {
  selected.value = permission
  detailVisible.value = true
  detailError.value = ''
  if (!props.loadPermissionDetail) return

  detailLoading.value = true
  try {
    selected.value = await props.loadPermissionDetail(permission)
  } catch {
    detailError.value = '权限详情加载失败，列表中的摘要信息已保留。'
  } finally {
    detailLoading.value = false
  }
}

async function openForm(mode: 'create' | 'copy' | 'edit', source?: PermissionRecord) {
  if (editingId.value !== undefined || submitting.value) return
  if (mode === 'edit') {
    if (!source || props.canEdit === false) return
    if (props.loadPermissionDetail) {
      editingId.value = source.id
      try {
        source = await props.loadPermissionDetail(source)
      } catch {
        // Do not open an editable form with a stale version after a failed Get.
        return
      } finally {
        editingId.value = undefined
      }
    }
    detailVisible.value = false
  }
  mutationUnknown.value = false
  formError.value = ''
  formMode.value = mode
  selected.value = source
  const nextValue: PermissionFormValue = source
    ? {
        appId: source.appId,
        parentPermissionId: source.parentPermissionId ?? null,
        defaultSelectedWithParent: source.defaultSelectedWithParent ?? false,
        permissionName:
          mode === 'edit' ? source.permissionName : `${source.permissionName}（副本）`,
        description: source.description,
        sortOrder: source.sortOrder,
      }
    : emptyForm()
  Object.assign(form, nextValue)
  initialForm.value = { ...nextValue }
  formVisible.value = true
}

watch(
  () => form.parentPermissionId,
  (id) => {
    if (id == null) form.defaultSelectedWithParent = false
  },
)
function candidateConfigurationTarget(
  value: PermissionFormValue,
  source?: PermissionRecord,
): PermissionRecord {
  const app = props.apps.find((item) => item.id === value.appId)
  const keepCopiedComposition = Boolean(source && source.appId === value.appId)

  return {
    id: -1,
    appId: value.appId as EntityId,
    appCode: app?.appCode ?? '',
    appName: app?.appName ?? '未知 App',
    permissionCode: '创建后由系统生成',
    permissionName: value.permissionName,
    frontendResourceId: keepCopiedComposition ? source!.frontendResourceId : 0,
    functionResourceIds: keepCopiedComposition ? [...source!.functionResourceIds] : [],
    description: value.description,
    status: 'ACTIVE',
    sortOrder: value.sortOrder,
    canMaintain: true,
    version: 'candidate',
    createdAt: '',
    createdBy: 'UIDesign Candidate',
    updatedAt: '',
    updatedBy: 'UIDesign Candidate',
  }
}

async function savePermission() {
  if (!formValid.value || submitting.value) return
  if (formMode.value === 'edit' && props.canEdit === false) return
  formError.value = ''
  const value: PermissionFormValue = {
    ...form,
    permissionName: form.permissionName.trim(),
  }
  let createdPermission =
    formMode.value === 'edit' && selected.value
      ? { ...selected.value, ...value, appId: selected.value.appId }
      : candidateConfigurationTarget(value, selected.value)

  if (props.submitPermission) {
    submitting.value = true
    try {
      createdPermission = await props.submitPermission(value, formMode.value, selected.value)
    } catch (error) {
      mutationUnknown.value = isUnknownPermissionGovernanceMutation(error)
      formError.value = permissionGovernanceErrorMessage(error, '权限提交失败，请重试')
      // The callback has already surfaced a conflict or unknown-result message.
      // Preserve the dirty form so the operator can verify the server state before retrying.
      return
    } finally {
      submitting.value = false
    }
  }

  formVisible.value = false
  selected.value = createdPermission
  emit(
    'action',
    formMode.value === 'edit'
      ? `已保存“${value.permissionName}”权限修改`
      : formMode.value === 'create'
        ? `已创建“${value.permissionName}”权限候选记录`
        : `已创建“${value.permissionName}”独立副本`,
  )
  if (formMode.value === 'edit') await refreshEditedList()
  else openPermissionConfiguration(createdPermission)
}

async function refreshEditedList() {
  if (!props.queryPermissions) return
  await props.queryPermissions(currentQuery())
  const lastPage = Math.max(1, Math.ceil(resultTotal.value / applied.value.pageSize))
  if (applied.value.pageIndex > lastPage) {
    applied.value.pageIndex = lastPage
    draft.pageIndex = lastPage
    await props.queryPermissions(currentQuery())
  }
}

function recoverUnknownMutation() {
  formVisible.value = false
  mutationUnknown.value = false
  emit('retry')
}

async function retryUnknownMutation() {
  if (!props.submitPermission || !mutationUnknown.value || submitting.value) return
  submitting.value = true
  try {
    const saved = await props.submitPermission(form, formMode.value, selected.value, {
      reusePendingRequestId: true,
    })
    mutationUnknown.value = false
    formVisible.value = false
    selected.value = saved
    if (formMode.value === 'edit') await refreshEditedList()
    else openPermissionConfiguration(saved)
  } catch (error) {
    mutationUnknown.value = isUnknownPermissionGovernanceMutation(error)
    formError.value = permissionGovernanceErrorMessage(error, '权限提交失败，请重试')
  } finally {
    submitting.value = false
  }
}

function openPermissionConfiguration(permission: PermissionRecord) {
  if (props.openConfiguration) props.openConfiguration(permission)
  else emit('action', `进入“${permission.permissionName}”权限功能配置`)
}
</script>

<template>
  <AppPage :resource_element="permissionsElements.page" class="permission-management-page">
    <ListPageTemplate>
      <template #header>
        <PageHeader
          title="权限管理"
          description="维护 iam_permission：每项权限由一个前端资源与同一 App 下一个或多个后端 Function 组成"
        />
      </template>

      <template #search>
        <SearchPanel
          :resource_element="permissionsElements.query"
          :loading="state === 'loading'"
          @search="runQuery()"
          @reset="resetQuery"
        >
          <el-form-item label="权限名称">
            <el-input
              v-model="draft.permissionName"
              clearable
              placeholder="输入权限名称模糊查询"
              @keyup.enter="runQuery()"
            />
          </el-form-item>
          <template #footer-leading>
            <el-button
              v-if="canCreate !== false"
              v-resource-element="permissionsElements.create"
              type="primary"
              @click="openForm('create')"
            >
              <Icon icon="mdi:plus" width="18" aria-hidden="true" />新建权限
            </el-button>
          </template>
        </SearchPanel>
      </template>

      <template #toolbar>
        <TableToolbar
          :resource_element="permissionsElements.query"
          title="权限"
          :total="resultTotal"
          :refreshing="state === 'loading'"
          @refresh="emit('retry')"
        >
          <template #summary>
            <span class="permission-management-page__summary"
              >前端资源定义交互入口，Function 定义完成该操作所需的后端能力</span
            >
          </template>
        </TableToolbar>
      </template>

      <el-alert
        v-if="state === 'retryable-error'"
        title="权限列表加载失败，当前权限名称已保留"
        type="error"
        :closable="false"
        show-icon
      >
        <template #default>
          <el-button
            v-resource-element="permissionsElements.query"
            link
            type="primary"
            @click="emit('retry')"
            >重新加载</el-button
          >
        </template>
      </el-alert>

      <DataTable :data="visiblePermissions" :columns="columns" :loading="state === 'loading'">
        <template #name="{ row }">
          <button
            v-resource-element="permissionsElements.detail"
            class="permission-management-page__name"
            type="button"
            @click="openDetail(asPermission(row))"
          >
            <strong>{{ asPermission(row).permissionName }}</strong>
            <small>{{ asPermission(row).permissionCode }}</small>
          </button>
        </template>
        <template #app="{ row }">{{ asPermission(row).appName }}</template>
        <template #frontendResource="{ row }">
          <span class="permission-management-page__resource">
            <strong>
              {{
                resourceById(asPermission(row).frontendResourceId)?.resourceName ||
                asPermission(row).frontendResourceName ||
                '尚未配置'
              }}
            </strong>
            <small>
              {{
                resourceById(asPermission(row).frontendResourceId)?.resourceCode ||
                asPermission(row).frontendResourceCode ||
                '—'
              }}
            </small>
          </span>
        </template>
        <template #functions="{ row }">
          {{
            asPermission(row).functionResourceCount ?? asPermission(row).functionResourceIds.length
          }}
          项
        </template>
        <template #status="{ row }">
          <StatusTag
            :label="asPermission(row).status === 'ACTIVE' ? '启用' : '停用'"
            :tone="asPermission(row).status === 'ACTIVE' ? 'success' : 'info'"
          />
        </template>
        <template #version="{ row }">
          <code>{{ asPermission(row).version }}</code>
        </template>
        <template #updatedAt="{ row }">
          <DateTimeText :value="asPermission(row).updatedAt ?? ''" />
        </template>
        <template #actions="{ row }">
          <RowActionGrid
            :aria-label="`${asPermission(row).permissionName} 的操作`"
            density="compact"
          >
            <el-button
              v-if="canEdit !== false"
              v-resource-element="permissionsElements.edit"
              link
              type="primary"
              :loading="editingId === asPermission(row).id"
              :disabled="editingId !== undefined"
              @click="openForm('edit', asPermission(row))"
              >编辑</el-button
            >
            <el-button
              v-resource-element="permissionsElements.configure"
              link
              type="primary"
              :disabled="
                canConfigure === undefined ? !asPermission(row).canMaintain : !canConfigure
              "
              @click="openPermissionConfiguration(asPermission(row))"
              >配置功能</el-button
            >
            <el-button
              v-if="canCopy !== false"
              v-resource-element="permissionsElements.copy"
              link
              type="primary"
              @click="openForm('copy', asPermission(row))"
            >
              复制
            </el-button>
          </RowActionGrid>
        </template>
      </DataTable>

      <template #pagination>
        <AppPagination
          v-model:page="applied.pageIndex"
          v-model:page-size="applied.pageSize"
          :resource_element="permissionsElements.query"
          :total="resultTotal"
          @change="changePage"
        />
      </template>
    </ListPageTemplate>

    <DetailDrawer
      v-model="detailVisible"
      :resource_element="permissionsElements.detail"
      :title="`${selected?.permissionName ?? ''} · 权限详情`"
      size="720"
    >
      <div v-if="selected" v-loading="detailLoading" class="permission-detail">
        <el-alert
          v-if="detailError"
          :title="detailError"
          type="error"
          :closable="false"
          show-icon
        />
        <header class="permission-detail__hero">
          <div>
            <p>{{ selected.appName }}</p>
            <strong>{{ selected.permissionName }}</strong>
            <code>{{ selected.permissionCode }}</code>
          </div>
          <StatusTag
            :label="selected.status === 'ACTIVE' ? '启用' : '停用'"
            :tone="selected.status === 'ACTIVE' ? 'success' : 'info'"
          />
        </header>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="所属 App">{{ selected.appName }}</el-descriptions-item>
          <el-descriptions-item label="排序">{{ selected.sortOrder }}</el-descriptions-item>
          <el-descriptions-item label="展示上级">{{
            selected.parentPermissionId == null
              ? '无'
              : permissions.find((item) => item.id === selected?.parentPermissionId)
                  ?.permissionName || '查看编辑表单'
          }}</el-descriptions-item>
          <el-descriptions-item label="随父项默认勾选">{{
            selected.defaultSelectedWithParent ? '是（非强制继承）' : '否'
          }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ selected.version }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">
            <DateTimeText :value="selected.updatedAt ?? ''" />
          </el-descriptions-item>
          <el-descriptions-item label="更新人">{{ selected.updatedBy }}</el-descriptions-item>
          <el-descriptions-item label="说明" :span="2">{{
            selected.description || '—'
          }}</el-descriptions-item>
        </el-descriptions>

        <section class="permission-composition" aria-labelledby="permission-composition-title">
          <h3 id="permission-composition-title">权限组成</h3>
          <article class="permission-composition__frontend">
            <span>前端资源</span>
            <strong>
              {{
                resourceById(selected.frontendResourceId)?.resourceName ||
                selected.frontendResourceName ||
                '尚未配置'
              }}
            </strong>
            <code>
              {{
                resourceById(selected.frontendResourceId)?.resourceCode ||
                selected.frontendResourceCode ||
                '—'
              }}
            </code>
          </article>
          <span class="permission-composition__connector" aria-hidden="true">关联</span>
          <div class="permission-composition__functions">
            <article v-for="resource in functionsFor(selected)" :key="resource.resourceId">
              <span>后端 Function</span>
              <strong>{{ resource.resourceName }}</strong>
              <code>{{ resource.httpMethod }} {{ resource.apiPath }}</code>
            </article>
          </div>
        </section>

        <div class="permission-detail__actions">
          <el-button
            v-if="canEdit !== false"
            v-resource-element="permissionsElements.edit"
            :loading="editingId === selected.id"
            :disabled="detailLoading || editingId !== undefined"
            @click="openForm('edit', selected)"
            >编辑</el-button
          >
          <el-button
            v-resource-element="permissionsElements.configure"
            type="primary"
            :disabled="canConfigure === undefined ? !selected.canMaintain : !canConfigure"
            @click="openPermissionConfiguration(selected)"
            >配置权限功能</el-button
          >
          <el-button
            v-if="canCopy !== false"
            v-resource-element="permissionsElements.copy"
            @click="openForm('copy', selected)"
          >
            复制为独立权限
          </el-button>
        </div>
      </div>
    </DetailDrawer>

    <FormDrawer
      v-model="formVisible"
      :resource_element="
        formMode === 'edit'
          ? permissionsElements.editForm
          : formMode === 'create'
            ? permissionsElements.createForm
            : permissionsElements.copyForm
      "
      :title="formTitle"
      :confirm-button-text="confirmText"
      :confirm-disabled="!formValid || mutationUnknown"
      :submitting="submitting"
      :dirty="formDirty"
      discard-title="放弃未保存的权限信息？"
      @confirm="savePermission"
    >
      <el-alert
        v-if="mutationUnknown"
        title="提交结果尚未确认。可使用原 request_id 安全重试，或关闭并刷新列表核对。"
        type="warning"
        :closable="false"
        show-icon
      >
        <el-button
          v-resource-element="
            formMode === 'edit'
              ? permissionsElements.editForm
              : formMode === 'create'
                ? permissionsElements.createForm
                : permissionsElements.copyForm
          "
          link
          type="primary"
          :loading="submitting"
          @click="retryUnknownMutation"
        >
          使用原请求标识重试
        </el-button>
        <el-button
          v-resource-element="permissionsElements.query"
          link
          type="primary"
          @click="recoverUnknownMutation"
          >关闭并刷新列表</el-button
        >
      </el-alert>
      <el-alert
        v-if="formError && !mutationUnknown"
        :title="formError"
        type="error"
        :closable="false"
        show-icon
      />
      <el-alert
        :title="
          formMode === 'edit'
            ? '修改名称、说明、排序及展示层级；所属 App、权限编码及资源组合保持不变。'
            : '权限编码由系统生成。创建基本信息后将进入权限功能配置，再选择前端资源和后端 Function。'
        "
        type="info"
        :closable="false"
        show-icon
      />
      <el-form
        class="permission-form"
        label-position="top"
        :disabled="submitting || mutationUnknown"
        novalidate
        @submit.prevent
      >
        <el-form-item label="所属 App" required>
          <el-select
            v-model="form.appId"
            :disabled="formMode === 'edit'"
            placeholder="请选择 App"
            filterable
          >
            <el-option v-for="app in apps" :key="app.id" :label="app.appName" :value="app.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="展示上级权限">
          <el-select
            v-model="form.parentPermissionId"
            clearable
            filterable
            :loading="parentsLoading"
            placeholder="无父级"
            @clear="form.parentPermissionId = null"
          >
            <el-option
              v-for="item in parentCandidates"
              :key="item.id"
              :value="item.id"
              :label="item.permissionName"
              :disabled="invalidParentIds.has(item.id)"
            />
          </el-select>
          <span v-if="parentError" role="alert"
            >{{ parentError }}
            <el-button
              v-resource-element="
                formMode === 'edit'
                  ? permissionsElements.editForm
                  : formMode === 'copy'
                    ? permissionsElements.copyForm
                    : permissionsElements.createForm
              "
              link
              @click="loadParents"
              >重新加载</el-button
            ></span
          >
        </el-form-item>
        <el-form-item label="默认联动">
          <el-checkbox
            v-model="form.defaultSelectedWithParent"
            :disabled="form.parentPermissionId == null || containsWrite"
            >主动勾选父项时默认选中（允许取消）</el-checkbox
          >
          <small v-if="containsWrite">含写操作，不允许默认联动</small>
        </el-form-item>
        <el-form-item label="权限名称" required>
          <el-input v-model="form.permissionName" clearable placeholder="例如：新增用户" />
        </el-form-item>
        <el-form-item label="权限说明">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            resize="none"
            placeholder="说明该前端操作与后端能力的边界"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="form.sortOrder"
            :min="0"
            :max="9999"
            controls-position="right"
          />
        </el-form-item>
      </el-form>
    </FormDrawer>
  </AppPage>
</template>

<style scoped lang="scss">
.permission-management-page__summary,
.permission-detail__hero p,
.permission-composition article > span,
.permission-form__summary > span {
  color: var(--text-secondary);
}

.permission-management-page__name,
.permission-management-page__resource,
.permission-detail,
.permission-detail__hero > div,
.permission-composition,
.permission-composition article,
.permission-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.permission-management-page__name {
  align-items: flex-start;
  max-width: 100%;
  padding: 0;
  color: var(--color-primary);
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.permission-management-page__name small,
.permission-management-page__resource small,
.permission-detail code,
.permission-composition code {
  color: var(--text-secondary);
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
}

.permission-management-page__resource {
  gap: var(--spacing-1);
}

.permission-detail__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-3);
  padding-bottom: var(--spacing-3);
  border-bottom: 1px solid var(--border-light);
}

.permission-detail__hero p,
.permission-detail__hero strong,
.permission-composition h3 {
  margin: 0;
}

.permission-detail__hero strong {
  color: var(--text-primary);
  font-size: var(--font-size-lg);
}

.permission-composition {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1.4fr);
  align-items: stretch;
  padding-top: var(--spacing-2);
}

.permission-composition h3 {
  grid-column: 1 / -1;
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

.permission-composition article,
.permission-form__summary {
  padding: var(--spacing-3);
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-small);
}

.permission-composition__functions {
  display: grid;
  gap: var(--spacing-2);
}

.permission-composition__connector {
  align-self: center;
  padding: 0 var(--spacing-2);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
}

.permission-detail__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--spacing-1);
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--border-light);
}

.permission-form {
  padding-top: var(--spacing-3);
}

.permission-form__summary {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

@media (max-width: 900px) {
  .permission-composition {
    grid-template-columns: 1fr;
  }

  .permission-composition__connector {
    justify-self: center;
    padding: var(--spacing-1) 0;
  }
}
</style>
