<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { FormInstance, FormRules } from 'element-plus'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import DetailDrawer from '@shared/components/DetailDrawer.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import ImageAssetField from '@shared/business-components/ImageAssetField.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import { IAM_PERMISSIONS } from '@shared/constants/iamPermissions'
import type {
  FoundationPreviewState,
  TenantFormValue,
  TenantInitialAdminValue,
  TenantRecord,
} from '../types/foundation'

const props = defineProps<{
  records: TenantRecord[]
  state: FoundationPreviewState
  save?: (value: TenantFormValue, record: TenantRecord) => Promise<void>
  create?: (value: TenantFormValue, admin: TenantInitialAdminValue) => Promise<void>
  changeStatus?: (record: TenantRecord, targetStatus: 'ACTIVE' | 'DISABLED') => Promise<void>
}>()

const emit = defineEmits<{
  action: [message: string]
  retry: []
}>()

const query = reactive({ id: '', keyword: '', status: '' })
const committedQuery = reactive({ id: '', keyword: '', status: '' })
const page = ref(1)
const pageSize = ref(10)
const detailVisible = ref(false)
const editVisible = ref(false)
const createVisible = ref(false)
const confirmVisible = ref(false)
const createStep = ref(0)
const adminMode = ref<'existing' | 'new'>('existing')
const editUploadBlocked = ref(false)
const createUploadBlocked = ref(false)
const adminUploadBlocked = ref(false)
const submitting = ref(false)
const createFormRef = ref<FormInstance>()
const adminFormRef = ref<FormInstance>()
const createError = ref('')
const emptyTenant: TenantRecord = {
  id: 0,
  groupId: 0,
  code: '',
  name: '',
  type: '企业租户',
  status: 'ACTIVE',
  companyName: '',
  address: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  domain: '',
  subdomain: '',
  logoUrl: '',
  timezone: 'Asia/Shanghai',
  language: 'zh-CN',
  sortOrder: 0,
  version: '',
  remarks: '',
  createdAt: '',
  memberCount: 0,
  updatedAt: '',
  createdBy: '',
  updatedBy: '',
}
const selected = ref<TenantRecord>(props.records[0] ?? emptyTenant)
function emptyTenantForm(): TenantFormValue {
  return {
    name: '',
    type: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    domain: '',
    subdomain: '',
    logoUrl: '',
    logoFileId: '',
    timezone: 'Asia/Shanghai',
    language: 'zh-CN',
    sortOrder: 0,
    remarks: '',
  }
}
function emptyAdminForm(): TenantInitialAdminValue {
  return {
    mode: 'existing',
    existingUserName: '',
    userName: '',
    realName: '',
    nickName: '',
    phone: '',
    email: '',
    avatarUrl: '',
    avatarFileId: '',
    userType: '',
    memberUserType: '',
    effectiveStart: '',
    effectiveEnd: '',
    remarks: '',
  }
}
const editForm = reactive(emptyTenantForm())
const createForm = reactive(emptyTenantForm())
const adminForm = reactive(emptyAdminForm())
const createRules: FormRules<TenantFormValue> = {
  name: [{ required: true, whitespace: true, message: '请输入 Tenant 名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择 Tenant 类型', trigger: 'change' }],
  timezone: [{ required: true, message: '请选择时区', trigger: 'change' }],
}
const adminRules: FormRules<TenantInitialAdminValue> = {
  existingUserName: [
    { required: true, whitespace: true, message: '请输入完整登录账号', trigger: 'blur' },
  ],
  userName: [
    { required: true, whitespace: true, message: '请输入新用户登录账号', trigger: 'blur' },
  ],
  effectiveStart: [
    { required: true, whitespace: true, message: '请输入有效开始时间', trigger: 'blur' },
  ],
}
const reviewValue = (value: string) => value.trim() || '未填写'
const createReview = computed(() => [
  { label: 'Tenant', value: reviewValue(createForm.name) },
  { label: 'Tenant 编码', value: '创建成功后由系统自动生成' },
  { label: '类型', value: reviewValue(createForm.type) },
  {
    label: '时区 / 语言',
    value: `${reviewValue(createForm.timezone)} · ${reviewValue(createForm.language)}`,
  },
  {
    label: '域名 / 子域名',
    value: `${reviewValue(createForm.domain)} · ${reviewValue(createForm.subdomain)}`,
  },
  {
    label: '联系人 / 联系电话',
    value: `${reviewValue(createForm.contactName)} · ${reviewValue(createForm.contactPhone)}`,
  },
  { label: '联系邮箱', value: reviewValue(createForm.contactEmail) },
  { label: '地址', value: reviewValue(createForm.address) },
  { label: '排序', value: String(createForm.sortOrder) },
  { label: 'Tenant Logo', value: createForm.logoFileId || createForm.logoUrl || '未设置' },
  { label: 'Tenant 备注', value: reviewValue(createForm.remarks) },
  { label: '管理员方式', value: adminMode.value === 'existing' ? '关联已有用户' : '创建新用户' },
  {
    label: '管理员登录账号',
    value: reviewValue(
      adminMode.value === 'existing' ? adminForm.existingUserName : adminForm.userName,
    ),
  },
  ...(adminMode.value === 'new'
    ? [
        {
          label: '姓名 / 昵称',
          value: `${reviewValue(adminForm.realName)} · ${reviewValue(adminForm.nickName)}`,
        },
        {
          label: '手机号 / 邮箱',
          value: `${reviewValue(adminForm.phone)} · ${reviewValue(adminForm.email)}`,
        },
        { label: '用户类型', value: reviewValue(adminForm.userType) },
        { label: '管理员头像', value: adminForm.avatarFileId || adminForm.avatarUrl || '未设置' },
      ]
    : []),
  {
    label: '成员用户类型',
    value: reviewValue(adminForm.memberUserType),
  },
  {
    label: '成员编号 / Tenant 内显示名称',
    value: '由服务端按租户编码与成员 ID / 登录账号自动生成',
  },
  { label: '有效开始时间', value: reviewValue(adminForm.effectiveStart) },
  { label: '有效结束时间', value: adminForm.effectiveEnd.trim() || '长期有效' },
  { label: '成员备注', value: reviewValue(adminForm.remarks) },
])

const columns: DataTableColumn[] = [
  { prop: 'id', label: 'ID', width: 72, fixed: 'left' },
  { prop: 'code', label: 'Tenant 编码', minWidth: 136, fixed: 'left', slot: 'code' },
  { prop: 'name', label: 'Tenant 名称', minWidth: 180 },
  { prop: 'type', label: '类型', minWidth: 108 },
  { label: '联系人', minWidth: 174, slot: 'contact' },
  { prop: 'timezone', label: '时区', minWidth: 142 },
  { prop: 'language', label: '语言', width: 86 },
  { prop: 'sortOrder', label: '排序', width: 72, align: 'right' },
  { label: '状态', width: 88, slot: 'status' },
  { prop: 'updatedAt', label: '更新时间', minWidth: 164 },
  { label: '操作', width: 176, fixed: 'right', slot: 'actions' },
]

const visibleRecords = computed(() => {
  if (props.state !== 'ready') return []
  const keyword = committedQuery.keyword.trim().toLocaleLowerCase('zh-CN')
  const id = Number(committedQuery.id)
  return props.records.filter((record) => {
    const matchesId = !committedQuery.id || record.id === id
    const matchesKeyword =
      !keyword ||
      [record.code, record.name, record.contactName, record.contactEmail, record.domain].some(
        (value) => value.toLocaleLowerCase('zh-CN').includes(keyword),
      )
    return (
      matchesId &&
      matchesKeyword &&
      (!committedQuery.status || record.status === committedQuery.status)
    )
  })
})

watch(
  () => props.records,
  (records) => {
    const first = records[0]
    if (first && !records.some((record) => record.id === selected.value?.id)) selected.value = first
  },
)

function asTenant(row: Record<string, unknown>): TenantRecord {
  return row as unknown as TenantRecord
}

function search() {
  Object.assign(committedQuery, query)
  page.value = 1
  emit('action', 'Tenant 查询条件已生效')
}

function reset() {
  Object.assign(query, { id: '', keyword: '', status: '' })
  Object.assign(committedQuery, query)
  page.value = 1
  emit('action', 'Tenant 查询条件已重置')
}

function openDetail(record: TenantRecord) {
  selected.value = record
  detailVisible.value = true
}

function openEdit(record: TenantRecord) {
  selected.value = record
  Object.assign(editForm, {
    name: record.name,
    type: record.type,
    contactName: record.contactName,
    contactPhone: record.contactPhone,
    contactEmail: record.contactEmail,
    address: record.address,
    domain: record.domain,
    subdomain: record.subdomain,
    logoUrl: record.logoUrl,
    logoFileId: record.logoFileId ?? '',
    timezone: record.timezone,
    language: record.language,
    sortOrder: record.sortOrder,
    remarks: record.remarks,
  })
  editUploadBlocked.value = false
  editVisible.value = true
}

function openCreate() {
  createStep.value = 0
  adminMode.value = 'existing'
  createUploadBlocked.value = false
  adminUploadBlocked.value = false
  Object.assign(createForm, emptyTenantForm())
  Object.assign(adminForm, emptyAdminForm())
  createError.value = ''
  createVisible.value = true
}

function openStatus(record: TenantRecord) {
  selected.value = record
  confirmVisible.value = true
}

async function finishEdit() {
  if (submitting.value || editUploadBlocked.value) return
  if (!props.save) {
    editVisible.value = false
    emit('action', `${selected.value.name} 的完整 Tenant 资料候选已保存`)
    return
  }
  submitting.value = true
  try {
    await props.save({ ...editForm }, selected.value)
    editVisible.value = false
  } finally {
    submitting.value = false
  }
}

async function nextCreateStep() {
  if (submitting.value || createUploadBlocked.value || adminUploadBlocked.value) return
  if (createStep.value < 2) {
    const form = createStep.value === 0 ? createFormRef.value : adminFormRef.value
    if (!(await form?.validate().catch(() => false))) return
    createStep.value += 1
    return
  }
  if (!props.create) {
    createVisible.value = false
    createStep.value = 0
    emit('action', 'Tenant 与首名管理员候选已完成，正式接入时由服务端原子提交')
    return
  }
  if (submitting.value) return
  submitting.value = true
  createError.value = ''
  try {
    await props.create({ ...createForm }, { ...adminForm, mode: adminMode.value })
    createVisible.value = false
    createStep.value = 0
  } catch (error) {
    createError.value = error instanceof Error ? error.message : '创建失败，请检查填写内容后重试'
  } finally {
    submitting.value = false
  }
}

async function confirmStatusChange() {
  if (submitting.value) return
  if (!props.changeStatus) {
    confirmVisible.value = false
    emit('action', 'Tenant 状态候选操作已确认')
    return
  }
  submitting.value = true
  try {
    await props.changeStatus(
      selected.value,
      selected.value.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
    )
    confirmVisible.value = false
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppPage class="tenant-page">
    <ListPageTemplate>
      <template #header>
        <PageHeader title="Tenant 管理" description="维护集团下的平级业务租户及首名管理员" />
      </template>

      <template #search>
        <SearchPanel :loading="state === 'loading'" @search="search" @reset="reset">
          <el-form-item label="Tenant ID">
            <el-input v-model="query.id" clearable placeholder="精确 ID" @keyup.enter="search" />
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="query.keyword"
              clearable
              placeholder="编码、名称或联系人"
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部状态">
              <el-option label="启用" value="ACTIVE" />
              <el-option label="停用" value="DISABLED" />
            </el-select>
          </el-form-item>
          <template #footer-leading>
            <el-button
              v-permission="IAM_PERMISSIONS.tenants.create"
              type="primary"
              @click="openCreate"
            >
              <Icon icon="mdi:plus" width="18" aria-hidden="true" />
              创建 Tenant
            </el-button>
          </template>
        </SearchPanel>
      </template>

      <template #toolbar>
        <TableToolbar
          title="Tenant 列表"
          :total="visibleRecords.length"
          :refreshing="state === 'loading'"
          @refresh="emit('retry')"
        >
          <template #summary>
            <span class="tenant-page__scope">集团视图 · 平级列表 · 宽表可横向滚动</span>
          </template>
        </TableToolbar>
      </template>

      <el-alert
        v-if="state === 'retryable-error'"
        class="tenant-page__alert"
        title="Tenant 数据加载失败，当前列表未更新"
        type="error"
        :closable="false"
        show-icon
      >
        <template #default>
          <el-button link type="primary" @click="emit('retry')">重新加载</el-button>
        </template>
      </el-alert>

      <DataTable
        :data="visibleRecords"
        :columns="columns"
        :loading="state === 'loading'"
        @row-click="openDetail(asTenant($event))"
      >
        <template #code="{ row }">
          <button class="tenant-page__link" type="button" @click.stop="openDetail(asTenant(row))">
            {{ asTenant(row).code }}
          </button>
        </template>
        <template #contact="{ row }">
          <div class="tenant-page__contact">
            <span>{{ asTenant(row).contactName }}</span>
            <small>{{ asTenant(row).contactPhone }}</small>
          </div>
        </template>
        <template #status="{ row }">
          <StatusTag
            :label="asTenant(row).status === 'ACTIVE' ? '启用' : '停用'"
            :tone="asTenant(row).status === 'ACTIVE' ? 'success' : 'info'"
          />
        </template>
        <template #actions="{ row }">
          <RowActionGrid :aria-label="`${asTenant(row).name} 的操作`">
            <el-button link type="primary" @click.stop="openDetail(asTenant(row))">详情</el-button>
            <el-button
              v-permission="IAM_PERMISSIONS.tenants.update"
              link
              type="primary"
              @click.stop="openEdit(asTenant(row))"
              >编辑</el-button
            >
            <el-button
              v-permission="IAM_PERMISSIONS.tenants.changeStatus"
              link
              :type="asTenant(row).status === 'ACTIVE' ? 'warning' : 'success'"
              @click.stop="openStatus(asTenant(row))"
            >
              {{ asTenant(row).status === 'ACTIVE' ? '停用' : '启用' }}
            </el-button>
          </RowActionGrid>
        </template>
      </DataTable>

      <template #pagination>
        <AppPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="visibleRecords.length"
          @change="emit('action', 'Tenant 分页状态已更新')"
        />
      </template>
    </ListPageTemplate>

    <DetailDrawer
      v-model="detailVisible"
      :title="`${selected?.name ?? ''} · Tenant 详情`"
      size="min(880px, 86%)"
    >
      <div v-if="selected" class="tenant-detail">
        <div class="tenant-detail__hero">
          <div class="tenant-detail__logo">
            <img v-if="selected.logoUrl" :src="selected.logoUrl" :alt="`${selected.name} Logo`" />
            <span v-else>{{ selected.code.slice(0, 1) }}</span>
          </div>
          <div>
            <strong>{{ selected.name }}</strong>
            <small>{{ selected.code }}</small>
          </div>
          <StatusTag
            :label="selected.status === 'ACTIVE' ? '启用' : '停用'"
            :tone="selected.status === 'ACTIVE' ? 'success' : 'info'"
          />
        </div>

        <section class="tenant-detail__section">
          <h3>基础与品牌信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="Tenant ID">{{ selected.id }}</el-descriptions-item>
            <el-descriptions-item label="集团 ID">{{ selected.groupId }}</el-descriptions-item>
            <el-descriptions-item label="Tenant 编码">{{ selected.code }}</el-descriptions-item>
            <el-descriptions-item label="Tenant 名称">{{ selected.name }}</el-descriptions-item>
            <el-descriptions-item label="Tenant 类型">{{ selected.type }}</el-descriptions-item>
            <el-descriptions-item label="Logo 文件 / 地址">{{
              selected.logoFileId || selected.logoUrl || '未设置'
            }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ selected.status }}</el-descriptions-item>
            <el-descriptions-item label="时区">{{ selected.timezone }}</el-descriptions-item>
            <el-descriptions-item label="默认语言">{{ selected.language }}</el-descriptions-item>
            <el-descriptions-item label="排序">{{ selected.sortOrder }}</el-descriptions-item>
            <el-descriptions-item label="有效成员"
              >{{ selected.memberCount }} 人</el-descriptions-item
            >
          </el-descriptions>
        </section>

        <section class="tenant-detail__section">
          <h3>联系与访问标识</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="联系人">{{ selected.contactName }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{
              selected.contactPhone
            }}</el-descriptions-item>
            <el-descriptions-item label="联系邮箱">{{
              selected.contactEmail
            }}</el-descriptions-item>
            <el-descriptions-item label="地址">{{ selected.address }}</el-descriptions-item>
            <el-descriptions-item label="域名">{{
              selected.domain || '未设置'
            }}</el-descriptions-item>
            <el-descriptions-item label="子域名">{{
              selected.subdomain || '未设置'
            }}</el-descriptions-item>
            <el-descriptions-item label="备注">{{ selected.remarks || '无' }}</el-descriptions-item>
            <el-descriptions-item label="版本">{{ selected.version }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="tenant-detail__section">
          <h3>审计信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="创建时间">{{ selected.createdAt }}</el-descriptions-item>
            <el-descriptions-item label="创建人">{{ selected.createdBy }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ selected.updatedAt }}</el-descriptions-item>
            <el-descriptions-item label="更新人">{{ selected.updatedBy }}</el-descriptions-item>
          </el-descriptions>
        </section>
      </div>
    </DetailDrawer>

    <FormDrawer
      v-model="editVisible"
      :title="`编辑 ${selected?.name ?? ''}`"
      size="min(920px, 88%)"
      confirm-button-text="保存 Tenant"
      :submitting="submitting"
      :confirm-disabled="editUploadBlocked"
      @confirm="finishEdit"
    >
      <el-alert
        title="Tenant ID、集团 ID、编码、状态与版本为只读；数据库隔离字段按 PRD 不在业务表单展示。"
        type="warning"
        :closable="false"
        show-icon
      />
      <el-form v-if="selected" class="tenant-form tenant-form--grid" label-position="top">
        <el-form-item label="Tenant ID"
          ><el-input :model-value="selected.id" disabled
        /></el-form-item>
        <el-form-item label="版本"
          ><el-input :model-value="selected.version" disabled
        /></el-form-item>
        <el-form-item label="集团 ID"
          ><el-input :model-value="selected.groupId" disabled
        /></el-form-item>
        <el-form-item label="Tenant 编码"
          ><el-input :model-value="selected.code" disabled
        /></el-form-item>
        <el-form-item label="Tenant 名称"><el-input v-model="editForm.name" /></el-form-item>
        <el-form-item label="Tenant 类型">
          <el-select v-model="editForm.type">
            <el-option label="企业租户" value="企业租户" />
            <el-option label="区域中心" value="区域中心" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系人"><el-input v-model="editForm.contactName" /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="editForm.contactPhone" /></el-form-item>
        <el-form-item label="联系邮箱"><el-input v-model="editForm.contactEmail" /></el-form-item>
        <el-form-item label="排序"
          ><el-input-number v-model="editForm.sortOrder" :min="0"
        /></el-form-item>
        <el-form-item class="tenant-form__wide" label="地址">
          <el-input v-model="editForm.address" />
        </el-form-item>
        <el-form-item label="域名"><el-input v-model="editForm.domain" /></el-form-item>
        <el-form-item label="子域名"><el-input v-model="editForm.subdomain" /></el-form-item>
        <el-form-item label="时区">
          <el-select v-model="editForm.timezone">
            <el-option label="Asia/Shanghai (UTC+08:00)" value="Asia/Shanghai" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认语言">
          <el-select v-model="editForm.language">
            <el-option label="简体中文（zh-CN）" value="zh-CN" />
            <el-option label="English（en-US）" value="en-US" />
          </el-select>
        </el-form-item>
        <el-form-item class="tenant-form__wide" label="Tenant Logo">
          <ImageAssetField
            v-model:file-id="editForm.logoFileId"
            v-model:image-url="editForm.logoUrl"
            :disabled="submitting"
            @blocked-change="editUploadBlocked = $event"
          />
        </el-form-item>
        <el-form-item class="tenant-form__wide" label="备注">
          <el-input v-model="editForm.remarks" type="textarea" :rows="4" resize="none" />
        </el-form-item>
      </el-form>
    </FormDrawer>

    <FormDrawer
      v-model="createVisible"
      title="创建 Tenant"
      size="min(960px, 90%)"
      :confirm-button-text="createStep === 2 ? '创建 Tenant' : '下一步'"
      :submitting="submitting"
      :confirm-disabled="createUploadBlocked || adminUploadBlocked"
      @confirm="nextCreateStep"
    >
      <el-steps :active="createStep" finish-status="success" align-center>
        <el-step title="Tenant 资料" />
        <el-step title="首名管理员" />
        <el-step title="确认创建" />
      </el-steps>

      <section class="tenant-wizard" aria-live="polite">
        <el-form
          v-show="createStep === 0"
          ref="createFormRef"
          :model="createForm"
          :rules="createRules"
          :disabled="submitting"
          scroll-to-error
          novalidate
          label-position="top"
          class="tenant-form tenant-form--grid"
          @submit.prevent
        >
          <el-alert
            class="tenant-form__wide"
            title="Tenant 编码将在创建成功后由系统自动生成，无需填写。"
            type="info"
            :closable="false"
            show-icon
          />
          <el-form-item label="Tenant 名称" prop="name"
            ><el-input v-model="createForm.name"
          /></el-form-item>
          <el-form-item label="Tenant 类型" prop="type">
            <el-select v-model="createForm.type">
              <el-option label="企业租户" value="企业租户" />
              <el-option label="区域中心" value="区域中心" />
            </el-select>
          </el-form-item>
          <el-form-item label="排序"
            ><el-input-number v-model="createForm.sortOrder" :min="0"
          /></el-form-item>
          <el-form-item label="联系人"><el-input v-model="createForm.contactName" /></el-form-item>
          <el-form-item label="联系电话"
            ><el-input v-model="createForm.contactPhone"
          /></el-form-item>
          <el-form-item label="联系邮箱"
            ><el-input v-model="createForm.contactEmail"
          /></el-form-item>
          <el-form-item label="时区" prop="timezone">
            <el-select v-model="createForm.timezone">
              <el-option label="Asia/Shanghai (UTC+08:00)" value="Asia/Shanghai" />
            </el-select>
          </el-form-item>
          <el-form-item label="默认语言">
            <el-select v-model="createForm.language">
              <el-option label="简体中文（zh-CN）" value="zh-CN" />
            </el-select>
          </el-form-item>
          <el-form-item label="域名"><el-input v-model="createForm.domain" /></el-form-item>
          <el-form-item label="子域名"><el-input v-model="createForm.subdomain" /></el-form-item>
          <el-form-item class="tenant-form__wide" label="地址">
            <el-input v-model="createForm.address" />
          </el-form-item>
          <el-form-item class="tenant-form__wide" label="Tenant Logo">
            <ImageAssetField
              v-model:file-id="createForm.logoFileId"
              v-model:image-url="createForm.logoUrl"
              :disabled="submitting"
              @blocked-change="createUploadBlocked = $event"
            />
          </el-form-item>
          <el-form-item class="tenant-form__wide" label="备注">
            <el-input
              v-model="createForm.remarks"
              type="textarea"
              :rows="3"
              resize="none"
              placeholder="填写 Tenant 管理备注"
            />
          </el-form-item>
        </el-form>

        <div v-show="createStep === 1" class="tenant-admin-step">
          <el-alert
            title="首名管理员固定为 Tenant 管理员并立即生效；本流程不采集初始密码。新 Tenant 暂无组织和岗位，相关数组提交为空。"
            type="info"
            :closable="false"
            show-icon
          />
          <el-radio-group v-model="adminMode">
            <el-radio-button value="existing">关联已有用户</el-radio-button>
            <el-radio-button value="new">创建新用户</el-radio-button>
          </el-radio-group>
          <el-form
            ref="adminFormRef"
            :model="adminForm"
            :rules="adminRules"
            :disabled="submitting"
            scroll-to-error
            novalidate
            label-position="top"
            class="tenant-form tenant-form--grid"
            @submit.prevent
          >
            <template v-if="adminMode === 'existing'">
              <el-form-item class="tenant-form__wide" label="完整登录账号" prop="existingUserName">
                <el-input v-model="adminForm.existingUserName" />
              </el-form-item>
            </template>
            <template v-else>
              <el-form-item label="新用户登录账号" prop="userName"
                ><el-input v-model="adminForm.userName"
              /></el-form-item>
              <el-form-item label="姓名"><el-input v-model="adminForm.realName" /></el-form-item>
              <el-form-item label="昵称"><el-input v-model="adminForm.nickName" /></el-form-item>
              <el-form-item label="用户类型">
                <el-select v-model="adminForm.userType">
                  <el-option label="平台用户" value="平台用户" />
                </el-select>
              </el-form-item>
              <el-form-item label="手机号"><el-input v-model="adminForm.phone" /></el-form-item>
              <el-form-item label="邮箱"><el-input v-model="adminForm.email" /></el-form-item>
              <el-form-item class="tenant-form__wide" label="管理员头像">
                <ImageAssetField
                  v-model:file-id="adminForm.avatarFileId"
                  v-model:image-url="adminForm.avatarUrl"
                  :disabled="submitting"
                  @blocked-change="adminUploadBlocked = $event"
                />
              </el-form-item>
            </template>
            <el-form-item label="成员用户类型">
              <el-select v-model="adminForm.memberUserType">
                <el-option label="正式员工" value="正式员工" />
              </el-select>
            </el-form-item>
            <el-form-item label="管理员身份"
              ><el-input model-value="首名 Tenant 管理员" disabled
            /></el-form-item>
            <el-form-item label="有效开始时间" prop="effectiveStart"
              ><el-input v-model="adminForm.effectiveStart" placeholder="YYYY-MM-DD HH:mm:ss"
            /></el-form-item>
            <el-form-item label="有效结束时间"
              ><el-input v-model="adminForm.effectiveEnd" placeholder="留空表示长期有效"
            /></el-form-item>
            <el-form-item class="tenant-form__wide" label="成员备注">
              <el-input v-model="adminForm.remarks" type="textarea" :rows="3" resize="none" />
            </el-form-item>
          </el-form>
        </div>

        <div v-show="createStep === 2" class="tenant-review">
          <el-alert
            title="请确认 Tenant 与首名管理员信息。提交后服务端将作为一个事务处理。"
            type="warning"
            :closable="false"
            show-icon
          />
          <dl>
            <div v-for="item in createReview" :key="item.label">
              <dt>{{ item.label }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>
          <el-alert
            v-if="createError"
            :title="createError"
            type="error"
            :closable="false"
            show-icon
          />
        </div>
      </section>
      <template #footer="{ requestClose }">
        <el-button :disabled="submitting" @click="requestClose">取消</el-button>
        <el-button
          v-if="createStep > 0"
          :disabled="submitting || createUploadBlocked || adminUploadBlocked"
          @click="createStep -= 1"
          >上一步</el-button
        >
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="submitting || createUploadBlocked || adminUploadBlocked"
          @click="nextCreateStep"
        >
          {{ createStep === 2 ? '创建 Tenant' : '下一步' }}
        </el-button>
      </template>
    </FormDrawer>

    <el-dialog
      v-model="confirmVisible"
      :title="`${selected?.status === 'ACTIVE' ? '停用' : '启用'} Tenant`"
      width="520"
    >
      <p class="tenant-confirm">
        {{
          selected?.status === 'ACTIVE'
            ? `停用后，${selected?.name} 的成员将无法进入该 Tenant；历史数据和关系仍保留。`
            : `启用 ${selected?.name} 后，成员仍需满足用户、成员和有效期条件才能进入。`
        }}
      </p>
      <template #footer>
        <el-button @click="confirmVisible = false">取消</el-button>
        <el-button
          v-permission="IAM_PERMISSIONS.tenants.changeStatus"
          :type="selected?.status === 'ACTIVE' ? 'warning' : 'success'"
          :loading="submitting"
          @click="confirmStatusChange"
        >
          {{ selected?.status === 'ACTIVE' ? '确认停用' : '确认启用' }}
        </el-button>
      </template>
    </el-dialog>
  </AppPage>
</template>

<style scoped lang="scss">
.tenant-page__scope,
.tenant-page__contact small {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.tenant-page__alert {
  margin: var(--spacing-3) var(--spacing-4);
}

.tenant-page__link {
  padding: var(--spacing-1) 0;
  color: var(--color-primary);
  font: inherit;
  font-weight: 600;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.tenant-page__link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.tenant-page__contact {
  display: grid;
  gap: var(--spacing-1);
}

.tenant-detail {
  display: grid;
  gap: var(--spacing-5);
}

.tenant-detail__hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-large);
}

.tenant-detail__logo {
  display: grid;
  width: var(--spacing-12);
  height: var(--spacing-12);
  overflow: hidden;
  color: var(--text-inverse);
  font-size: var(--font-size-lg);
  font-weight: 700;
  background: var(--background-sidebar-active);
  border-radius: var(--radius-large);
  place-items: center;
}

.tenant-detail__logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tenant-detail__hero strong,
.tenant-detail__hero small {
  display: block;
}

.tenant-detail__hero small {
  margin-top: var(--spacing-1);
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.tenant-detail__section h3 {
  margin: 0 0 var(--spacing-3);
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

.tenant-detail__section :deep(.el-descriptions__table) {
  table-layout: fixed;
}

.tenant-detail__section :deep(.el-descriptions__content) {
  overflow-wrap: anywhere;
  white-space: normal;
}

.tenant-form {
  display: grid;
  gap: var(--spacing-3);
  margin-top: var(--spacing-5);
}

.tenant-form--grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--spacing-4);
}

.tenant-form__wide {
  grid-column: 1 / -1;
}

:deep(.tenant-form .el-form-item) {
  margin-bottom: var(--spacing-4);
}

.tenant-wizard {
  min-height: calc(var(--spacing-12) * 7);
  padding: var(--spacing-8) var(--spacing-2) var(--spacing-2);
}

.tenant-admin-step,
.tenant-review {
  display: grid;
  gap: var(--spacing-5);
}

.tenant-review dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-3);
  margin: 0;
}

.tenant-review dl div {
  padding: var(--spacing-4);
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-default);
}

.tenant-review dt {
  margin-bottom: var(--spacing-2);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.tenant-review dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-weight: 600;
}

.tenant-confirm {
  margin: 0;
  color: var(--text-regular);
  line-height: 1.7;
}
</style>
