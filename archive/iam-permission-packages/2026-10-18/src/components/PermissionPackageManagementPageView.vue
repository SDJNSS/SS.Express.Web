<script setup lang="ts">
import type { EntityId } from '@shared/types/entityId'
import { packagesElements } from '../iam-resource.registry'
import { computed, reactive, ref } from 'vue'
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
import { isUnknownPermissionGovernanceMutation } from '../composables/permissionGovernanceFeedback'
import type {
  PermissionGovernanceApp,
  PermissionGovernancePreviewState,
  PermissionPackageFormValue,
  PermissionPackageQuery,
  PermissionPackageRecord,
} from '../types/permissionGovernance'

const props = defineProps<{
  apps: PermissionGovernanceApp[]
  packages: PermissionPackageRecord[]
  state: PermissionGovernancePreviewState
  total?: number
  initialQuery?: Partial<PermissionPackageQuery>
  canCreate?: boolean
  canEdit?: boolean
  canConfigure?: boolean
  queryPackages?: (query: PermissionPackageQuery) => Promise<void>
  loadPackageDetail?: (record: PermissionPackageRecord) => Promise<PermissionPackageRecord>
  submitPackage?: (
    value: PermissionPackageFormValue,
    mode: 'create' | 'edit',
    source?: PermissionPackageRecord,
    options?: { reusePendingRequestId?: boolean },
  ) => Promise<PermissionPackageRecord>
  openPermissions?: (record: PermissionPackageRecord) => void
}>()

const emit = defineEmits<{
  action: [message: string]
  retry: []
}>()

const emptyQuery = (): PermissionPackageQuery => ({
  packageName: '',
  appId: '',
  status: '',
  pageIndex: 1,
  pageSize: 10,
})

const emptyForm = (): PermissionPackageFormValue => ({
  appId: '',
  packageName: '',
  description: '',
  sortOrder: 0,
})

const initialQuery = { ...emptyQuery(), ...props.initialQuery }
const draft = reactive<PermissionPackageQuery>({ ...initialQuery })
const applied = ref<PermissionPackageQuery>({ ...initialQuery })
const selected = ref<PermissionPackageRecord>()
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const submitting = ref(false)
const mutationUnknown = ref(false)
const initialForm = ref<PermissionPackageFormValue>(emptyForm())
const form = reactive<PermissionPackageFormValue>(emptyForm())

const columns: DataTableColumn[] = [
  { label: '权限包', minWidth: 224, fixed: 'left', slot: 'name' },
  { label: '所属 App', minWidth: 170, slot: 'app' },
  { label: 'Permission', width: 112, align: 'right', slot: 'permissions' },
  { prop: 'description', label: '说明', minWidth: 220 },
  { prop: 'sortOrder', label: '排序', width: 76, align: 'right' },
  { label: '版本', minWidth: 152, slot: 'version' },
  { label: '操作', fixed: 'right', slot: 'actions' },
]

const normalizedKeyword = computed(() =>
  applied.value.packageName.trim().toLocaleLowerCase('zh-CN'),
)

const filteredPackages = computed(() => {
  if (props.state === 'empty') return []
  return props.packages.filter((record) => {
    const matchesKeyword =
      !normalizedKeyword.value ||
      [record.packageName, record.packageCode].some((value) =>
        value.toLocaleLowerCase('zh-CN').includes(normalizedKeyword.value),
      )
    const matchesApp = applied.value.appId === '' || record.appId === applied.value.appId
    return matchesKeyword && matchesApp
  })
})

const visiblePackages = computed(() => {
  if (props.queryPackages) return filteredPackages.value
  const start = (applied.value.pageIndex - 1) * applied.value.pageSize
  return filteredPackages.value.slice(start, start + applied.value.pageSize)
})

const resultTotal = computed(() => props.total ?? filteredPackages.value.length)
const formValid = computed(() => form.appId !== '' && form.packageName.trim().length > 0)
const formDirty = computed(() => JSON.stringify(form) !== JSON.stringify(initialForm.value))

function asPackage(row: Record<string, unknown>) {
  return row as PermissionPackageRecord
}

function appName(appId: EntityId | '') {
  if (appId === '') return '—'
  return props.apps.find((app) => app.id === appId)?.appName ?? '未知 App'
}

function currentQuery(): PermissionPackageQuery {
  return { ...applied.value }
}

async function runQuery(resetPage = true) {
  if (resetPage) draft.pageIndex = 1
  applied.value = { ...draft }
  if (props.queryPackages) await props.queryPackages(currentQuery())
  emit('action', '权限包筛选条件已生效')
}

async function resetQuery() {
  Object.assign(draft, emptyQuery())
  applied.value = emptyQuery()
  if (props.queryPackages) await props.queryPackages(currentQuery())
  emit('action', '权限包筛选条件已重置')
}

async function changePage() {
  draft.pageIndex = applied.value.pageIndex
  draft.pageSize = applied.value.pageSize
  if (props.queryPackages) await props.queryPackages(currentQuery())
  emit('action', '权限包分页状态已更新')
}

async function openDetail(record: PermissionPackageRecord) {
  selected.value = record
  detailVisible.value = true
  detailError.value = ''
  if (!props.loadPackageDetail) return

  detailLoading.value = true
  try {
    selected.value = await props.loadPackageDetail(record)
  } catch {
    detailError.value = '权限包详情加载失败，列表中的摘要信息已保留。'
  } finally {
    detailLoading.value = false
  }
}

function openForm(mode: 'create' | 'edit', source?: PermissionPackageRecord) {
  mutationUnknown.value = false
  formMode.value = mode
  selected.value = source
  const nextValue: PermissionPackageFormValue = source
    ? {
        appId: source.appId,
        packageName: source.packageName,
        description: source.description,
        sortOrder: source.sortOrder,
      }
    : emptyForm()
  Object.assign(form, nextValue)
  initialForm.value = { ...nextValue }
  formVisible.value = true
}

async function savePackage() {
  if (!formValid.value || submitting.value) return
  const value: PermissionPackageFormValue = {
    ...form,
    packageName: form.packageName.trim(),
    description: form.description.trim(),
  }

  if (props.submitPackage) {
    submitting.value = true
    try {
      const saved = await props.submitPackage(value, formMode.value, selected.value)
      selected.value = saved
      formVisible.value = false
      if (formMode.value === 'create') openPackagePermissions(saved)
    } catch (error) {
      mutationUnknown.value = isUnknownPermissionGovernanceMutation(error)
      // The callback has already surfaced a conflict or unknown-result message.
      // Preserve the dirty form so the operator can verify the server state before retrying.
      return
    } finally {
      submitting.value = false
    }
    return
  }

  const app = props.apps.find((item) => item.id === value.appId)
  const candidate: PermissionPackageRecord = {
    id: -1,
    appId: value.appId as EntityId,
    appCode: app?.appCode ?? '',
    appName: app?.appName ?? '未知 App',
    packageCode: '创建后由系统生成',
    packageName: value.packageName,
    description: value.description,
    sortOrder: value.sortOrder,
    status: 'ACTIVE',
    permissionIds: [],
    boundRoles: [],
    canMaintain: true,
    version: 'candidate',
    createdAt: '',
    createdBy: 'UIDesign Candidate',
    updatedAt: '',
    updatedBy: 'UIDesign Candidate',
  }
  formVisible.value = false
  emit(
    'action',
    formMode.value === 'create'
      ? `已创建“${value.packageName}”权限包候选记录，编码将在服务端生成`
      : `已保存“${value.packageName}”权限包候选修改`,
  )
  if (formMode.value === 'create') openPackagePermissions(candidate)
}

function recoverUnknownMutation() {
  formVisible.value = false
  mutationUnknown.value = false
  emit('retry')
}

async function retryUnknownMutation() {
  if (!props.submitPackage || !mutationUnknown.value || submitting.value) return
  submitting.value = true
  try {
    const saved = await props.submitPackage(form, formMode.value, selected.value, {
      reusePendingRequestId: true,
    })
    selected.value = saved
    mutationUnknown.value = false
    formVisible.value = false
    if (formMode.value === 'create') openPackagePermissions(saved)
  } catch (error) {
    mutationUnknown.value = isUnknownPermissionGovernanceMutation(error)
  } finally {
    submitting.value = false
  }
}

function openPackagePermissions(record: PermissionPackageRecord) {
  if (props.openPermissions) props.openPermissions(record)
  else emit('action', `进入“${record.packageName}”权限包权限配置`)
}
</script>

<template>
  <AppPage :resource_element="packagesElements.page" class="permission-package-management-page">
    <ListPageTemplate>
      <template #header>
        <PageHeader
          title="权限包管理"
          description="按 App 将一个或多个 Permission 组合为可分配给角色的权限包"
        />
      </template>

      <template #search>
        <SearchPanel
          :resource_element="packagesElements.query"
          :loading="state === 'loading'"
          @search="runQuery()"
          @reset="resetQuery"
        >
          <el-form-item label="权限包名称 / 编码">
            <el-input
              v-model="draft.packageName"
              clearable
              placeholder="输入名称或编码模糊查询"
              @keyup.enter="runQuery()"
            />
          </el-form-item>
          <el-form-item label="所属 App">
            <el-select v-model="draft.appId" clearable filterable placeholder="全部 App">
              <el-option v-for="app in apps" :key="app.id" :label="app.appName" :value="app.id" />
            </el-select>
          </el-form-item>
          <template #footer-leading>
            <el-button
              v-if="canCreate !== false"
              v-resource-element="packagesElements.create"
              type="primary"
              @click="openForm('create')"
            >
              <Icon icon="mdi:plus" width="16" aria-hidden="true" />新增权限包
            </el-button>
          </template>
        </SearchPanel>
      </template>

      <template #toolbar>
        <TableToolbar
          :resource_element="packagesElements.query"
          title="权限包"
          :total="resultTotal"
          :refreshing="state === 'loading'"
          @refresh="emit('retry')"
        >
          <template #summary>
            <span class="permission-package-management-page__summary"
              >角色只绑定权限包，不直接绑定 Permission 或 Resource</span
            >
          </template>
        </TableToolbar>
      </template>

      <el-alert
        v-if="state === 'retryable-error'"
        title="权限包列表加载失败，当前筛选条件已保留"
        type="error"
        :closable="false"
        show-icon
      >
        <template #default>
          <el-button
            v-resource-element="packagesElements.query"
            link
            type="primary"
            @click="emit('retry')"
            >重新加载</el-button
          >
        </template>
      </el-alert>

      <DataTable :data="visiblePackages" :columns="columns" :loading="state === 'loading'">
        <template #name="{ row }">
          <button
            v-resource-element="packagesElements.detail"
            class="permission-package-management-page__name"
            type="button"
            @click="openDetail(asPackage(row))"
          >
            <span>
              <strong>{{ asPackage(row).packageName }}</strong>
              <StatusTag
                :label="asPackage(row).status === 'ACTIVE' ? '启用' : '停用'"
                :tone="asPackage(row).status === 'ACTIVE' ? 'success' : 'info'"
              />
            </span>
            <small>{{ asPackage(row).packageCode }}</small>
          </button>
        </template>
        <template #app="{ row }">{{ asPackage(row).appName }}</template>
        <template #permissions="{ row }">
          {{ asPackage(row).permissionCount ?? asPackage(row).permissionIds.length }} 项
        </template>
        <template #version="{ row }">
          <span class="permission-package-management-page__version">
            <code>{{ asPackage(row).version }}</code>
            <DateTimeText :value="asPackage(row).updatedAt ?? ''" />
          </span>
        </template>
        <template #actions="{ row }">
          <RowActionGrid :aria-label="`${asPackage(row).packageName} 的操作`" density="compact">
            <el-button
              v-resource-element="packagesElements.configure"
              link
              type="primary"
              :disabled="canConfigure === undefined ? !asPackage(row).canMaintain : !canConfigure"
              @click="openPackagePermissions(asPackage(row))"
              >权限配置</el-button
            >
            <el-button
              v-resource-element="packagesElements.edit"
              link
              type="primary"
              :disabled="canEdit === undefined ? !asPackage(row).canMaintain : !canEdit"
              @click="openForm('edit', asPackage(row))"
              >编辑</el-button
            >
          </RowActionGrid>
        </template>
      </DataTable>

      <template #pagination>
        <AppPagination
          v-model:page="applied.pageIndex"
          v-model:page-size="applied.pageSize"
          :resource_element="packagesElements.query"
          :total="resultTotal"
          @change="changePage"
        />
      </template>
    </ListPageTemplate>

    <DetailDrawer
      v-model="detailVisible"
      :resource_element="packagesElements.detail"
      :title="`${selected?.packageName ?? ''} · 权限包详情`"
      size="720"
    >
      <div v-if="selected" v-loading="detailLoading" class="permission-package-detail">
        <el-alert
          v-if="detailError"
          :title="detailError"
          type="error"
          :closable="false"
          show-icon
        />
        <header>
          <span class="permission-package-detail__icon">
            <Icon icon="mdi:shield-key-outline" width="20" aria-hidden="true" />
          </span>
          <div>
            <small>{{ selected.appName }}</small>
            <strong>{{ selected.packageName }}</strong>
            <code>{{ selected.packageCode }}</code>
          </div>
          <StatusTag
            :label="selected.status === 'ACTIVE' ? '启用' : '停用'"
            :tone="selected.status === 'ACTIVE' ? 'success' : 'info'"
          />
        </header>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="所属 App">{{ selected.appName }}</el-descriptions-item>
          <el-descriptions-item label="Permission 数量">
            {{ selected.permissionCount ?? selected.permissionIds.length }} 项
          </el-descriptions-item>
          <el-descriptions-item label="排序">{{ selected.sortOrder }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ selected.version }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">
            <DateTimeText :value="selected.updatedAt ?? ''" />
          </el-descriptions-item>
          <el-descriptions-item label="更新人">{{ selected.updatedBy }}</el-descriptions-item>
          <el-descriptions-item label="说明" :span="2">
            {{ selected.description || '—' }}
          </el-descriptions-item>
        </el-descriptions>

        <section class="permission-package-detail__roles" aria-labelledby="package-role-title">
          <h3 id="package-role-title">已绑定角色</h3>
          <div v-if="selected.boundRoles.length">
            <el-tag v-for="role in selected.boundRoles" :key="role.roleId" effect="plain">
              {{ role.roleName }}
            </el-tag>
          </div>
          <p v-else>尚未分配给角色</p>
        </section>

        <div class="permission-package-detail__actions">
          <el-button
            v-resource-element="packagesElements.configure"
            type="primary"
            :disabled="canConfigure === undefined ? !selected.canMaintain : !canConfigure"
            @click="openPackagePermissions(selected)"
            >配置 Permission</el-button
          >
          <el-button
            v-resource-element="packagesElements.edit"
            :disabled="canEdit === undefined ? !selected.canMaintain : !canEdit"
            @click="openForm('edit', selected)"
          >
            编辑基本信息
          </el-button>
        </div>
      </div>
    </DetailDrawer>

    <FormDrawer
      v-model="formVisible"
      :resource_element="
        formMode === 'create' ? packagesElements.createForm : packagesElements.editForm
      "
      :title="formMode === 'create' ? '新增权限包' : `编辑 ${selected?.packageName ?? ''}`"
      :confirm-button-text="formMode === 'create' ? '创建权限包' : '保存修改'"
      :confirm-disabled="!formValid || mutationUnknown"
      :submitting="submitting"
      :dirty="formDirty"
      discard-title="放弃未保存的权限包信息？"
      @confirm="savePackage"
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
            formMode === 'create' ? packagesElements.createForm : packagesElements.editForm
          "
          link
          type="primary"
          :loading="submitting"
          @click="retryUnknownMutation"
        >
          使用原请求标识重试
        </el-button>
        <el-button
          v-resource-element="packagesElements.query"
          link
          type="primary"
          @click="recoverUnknownMutation"
          >关闭并刷新列表</el-button
        >
      </el-alert>
      <el-alert
        title="权限包编码由系统按统一规则生成，创建和编辑时均无需手工填写。"
        type="info"
        :closable="false"
        show-icon
      />
      <el-form class="permission-package-form" label-position="top" novalidate @submit.prevent>
        <el-form-item label="权限包编码">
          <el-input
            :model-value="formMode === 'edit' ? selected?.packageCode : '创建后由系统生成'"
            disabled
          />
        </el-form-item>
        <el-form-item label="所属 App" required>
          <el-select
            v-model="form.appId"
            :disabled="formMode === 'edit'"
            filterable
            placeholder="请选择 App"
          >
            <el-option v-for="app in apps" :key="app.id" :label="app.appName" :value="app.id" />
          </el-select>
          <small v-if="formMode === 'edit'">权限包创建后不跨 App 迁移</small>
        </el-form-item>
        <el-form-item label="权限包名称" required>
          <el-input v-model="form.packageName" clearable placeholder="请输入权限包名称" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            resize="none"
            placeholder="说明该权限包面向的职责范围"
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
        <div v-if="form.appId !== ''" class="permission-package-form__summary">
          <span>当前归属</span>
          <strong>{{ appName(form.appId) }}</strong>
          <small>创建后进入权限配置，选择该 App 下的 Permission</small>
        </div>
      </el-form>
    </FormDrawer>
  </AppPage>
</template>

<style scoped lang="scss">
.permission-package-management-page__summary,
.permission-package-management-page__name small,
.permission-package-management-page__version,
.permission-package-detail small,
.permission-package-detail code,
.permission-package-detail__roles p,
.permission-package-form small,
.permission-package-form__summary span,
.permission-package-form__summary small {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.permission-package-management-page__name,
.permission-package-management-page__version,
.permission-package-detail,
.permission-package-detail > header > div,
.permission-package-form,
.permission-package-form__summary {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.permission-package-management-page__name {
  align-items: flex-start;
  max-width: 100%;
  padding: 0;
  color: var(--color-primary);
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.permission-package-management-page__name > span {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.permission-package-management-page__version {
  gap: var(--spacing-1);
}

.permission-package-management-page__version code,
.permission-package-detail code {
  font-family: var(--font-family);
  overflow-wrap: anywhere;
}

.permission-package-detail > header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--spacing-2);
  padding-bottom: var(--spacing-3);
  border-bottom: 1px solid var(--border-light);
}

.permission-package-detail__icon {
  display: grid;
  width: var(--spacing-8);
  height: var(--spacing-8);
  place-items: center;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-small);
}

.permission-package-detail > header strong {
  color: var(--text-primary);
  font-size: var(--font-size-lg);
}

.permission-package-detail__roles {
  display: grid;
  gap: var(--spacing-2);
}

.permission-package-detail__roles h3,
.permission-package-detail__roles p {
  margin: 0;
}

.permission-package-detail__roles h3 {
  font-size: var(--font-size-md);
}

.permission-package-detail__roles > div {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
}

.permission-package-detail__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--spacing-1);
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--border-light);
}

.permission-package-form {
  padding-top: var(--spacing-3);
}

.permission-package-form__summary {
  padding: var(--spacing-3);
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-small);
}
</style>
