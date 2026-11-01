<script setup lang="ts">
import { membersElements, resourceRegistry } from '../iam-resource.registry'
import { resourceElementAttributes } from '@shared/services/resourceElement'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { FormInstance, FormRules } from 'element-plus'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import DetailDrawer from '@shared/components/DetailDrawer.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import ImageAssetField from '@shared/business-components/ImageAssetField.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import LoadingState from '@shared/components/LoadingState.vue'
import PagedEntitySelect from '@shared/components/PagedEntitySelect.vue'
import type { PagedEntityLoader, PagedEntityQuery } from '@shared/types/pagedOptions'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableCellText from '@shared/components/TableCellText.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import { IAM_PERMISSIONS } from '@shared/constants/iamPermissions'
import type {
  FoundationPreviewState,
  FoundationSelectOption,
  MemberCreateValue,
  MembershipOptionKind,
  MembershipQueryValue,
  MemberRelationRecord,
  MemberRelationValue,
  MemberUpdateValue,
  MembershipRecord,
  UserUpdateValue,
} from '../types/foundation'

import MemberRolesDrawer from './MemberRolesDrawer.vue'
import MemberAdminDialog from './MemberAdminDialog.vue'
import MemberRelationDrawer from './MemberRelationDrawer.vue'
import { memberEffective, relationUnavailable } from '../adapters/memberRelationPolicy'
import type {
  MemberAdminChangeValue,
  MemberRelationEndValue,
  MemberRelationKind,
} from '../types/memberMaintenance'
import type { MemberRoleSnapshot } from '../types/memberRoles'

const props = defineProps<{
  records: MembershipRecord[]
  state: FoundationPreviewState
  organizationOptions?: FoundationSelectOption[]
  positionOptions?: FoundationSelectOption[]
  tenantOptions?: Array<{ id: number; code: string; name: string }>
  initialTenantId?: number
  canAccessEffectivePermissions?: boolean
  rowActionPermissions?: {
    editUser: boolean
    editMember: boolean
    memberStatus: boolean
  }
  relationOptionsLoading?: boolean
  queryFilterOptions?: (
    tenantIds: number[],
    kind: 'organization' | 'position' | 'role',
    query: PagedEntityQuery,
  ) => ReturnType<PagedEntityLoader>
  queryRecords?: (query: MembershipQueryValue) => Promise<void>
  queryMemberDetail?: (record: MembershipRecord) => Promise<MembershipRecord>
  loadRelationOptions?: (tenantId: number, kind: MembershipOptionKind) => Promise<void>
  saveUser?: (value: UserUpdateValue) => Promise<void>
  saveMember?: (value: MemberUpdateValue) => Promise<void>
  createMember?: (value: MemberCreateValue) => Promise<void>
  saveRelation?: (
    mode: 'organization' | 'position',
    member: MembershipRecord,
    value: MemberRelationValue,
  ) => Promise<void>
  changeAdmin?: (value: MemberAdminChangeValue) => Promise<void>
  createAdminRequestId?: () => string
  endRelation?: (
    kind: MemberRelationKind,
    member: MembershipRecord,
    value: MemberRelationEndValue,
  ) => Promise<void>
  changeStatus?: (record: MembershipRecord, targetStatus: 'ACTIVE' | 'DISABLED') => Promise<void>
  loadMemberRoles?: (record: MembershipRecord) => Promise<MemberRoleSnapshot>
  updateMemberRoles?: (
    snapshot: MemberRoleSnapshot,
    roleIds: number[],
    operation: 'assign' | 'revoke',
  ) => Promise<void>
  inspectEffectivePermissions?: (record: MembershipRecord) => void
}>()

const rolesVisible = ref(false)
const roleMember = ref<MembershipRecord>()
function openRoles(member: MembershipRecord) {
  roleMember.value = member
  rolesVisible.value = true
}

const emit = defineEmits<{
  action: [message: string]
  retry: []
}>()

const resolvedTenantOptions = computed(() => {
  if (props.tenantOptions) return props.tenantOptions
  const tenantMap = new Map<number, { id: number; code: string; name: string }>()
  for (const record of props.records) {
    if (record.tenantId <= 0) continue
    tenantMap.set(record.tenantId, {
      id: record.tenantId,
      code: record.tenantCode,
      name: record.tenantName,
    })
  }
  return [...tenantMap.values()]
})

function allTenantIds(): number[] {
  return resolvedTenantOptions.value.map((tenant) => tenant.id)
}

const query = reactive<MembershipQueryValue>({
  tenantIds: allTenantIds(),
  memberCode: '',
  memberCodeFuzzy: false,
  userName: '',
  realName: '',
  phone: '',
  email: '',
  organizationId: undefined,
  positionId: undefined,
  roleId: undefined,
  memberStatus: '',
})
const committedQuery = reactive<MembershipQueryValue>({
  ...query,
  tenantIds: [...query.tenantIds],
})
const memberCodeError = ref('')
const memberCodeInput = ref<{ focus: () => void }>()
watch([() => query.memberCode, () => query.memberCodeFuzzy], () => {
  memberCodeError.value = ''
})
const page = ref(1)
const pageSize = ref(10)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
let detailSequence = 0
watch(detailVisible, (visible) => {
  if (!visible) detailSequence += 1
})
onBeforeUnmount(() => {
  detailSequence += 1
})
const detailTab = ref('profile')
const createVisible = ref(false)
const createStep = ref(0)
const createUserMode = ref<'existing' | 'new'>('new')
const editVisible = ref(false)
const editMode = ref<'member' | 'user'>('user')
const relationVisible = ref(false)
const relationMode = ref<'organization' | 'position'>('organization')
const relationRecord = ref<MemberRelationRecord>()
const relationEnding = ref(false)
const adminVisible = ref(false)
const statusVisible = ref(false)
const emptyMembership: MembershipRecord = {
  id: 0,
  tenantId: 0,
  tenantCode: '',
  tenantName: '',
  tenantTimezone: '',
  userId: 0,
  memberCode: '',
  displayName: '',
  memberUserType: '',
  userName: '',
  realName: '',
  nickName: '',
  phone: '',
  email: '',
  avatarUrl: '',
  globalUserType: '',
  roles: [],
  userStatus: 'DISABLED',
  memberStatus: 'DISABLED',
  effectiveness: 'EXPIRED',
  isTenantAdmin: false,
  isDefaultTenant: false,
  joinedAt: '',
  leftAt: '',
  primaryOrganization: '',
  primaryPosition: '',
  effectiveStart: '',
  effectiveEnd: '',
  effectiveRange: '',
  remarks: '',
  userRemarks: '',
  version: '',
  userVersion: '',
  updatedAt: '',
  userUpdatedAt: '',
  organizations: [],
  positions: [],
  tenantMemberships: [],
}
const selected = ref<MembershipRecord>(props.records[0] ?? emptyMembership)
const submitting = ref(false)
const editUploadBlocked = ref(false)
const createUploadBlocked = ref(false)
function emptyCreateForm(): MemberCreateValue {
  return {
    tenantId:
      props.initialTenantId ?? props.tenantOptions?.[0]?.id ?? props.records[0]?.tenantId ?? 0,
    mode: 'new',
    existingUserName: '',
    userName: '',
    realName: '',
    nickName: '',
    phone: '',
    email: '',
    avatarUrl: '',
    avatarFileId: '',
    userType: '平台用户',
    memberUserType: '正式员工',
    effectiveStart: '',
    effectiveEnd: '',
    remarks: '',
    organizationIds: [],
    primaryOrganizationId: undefined,
    positionIds: [],
    primaryPositionId: undefined,
  }
}
const createForm = reactive(emptyCreateForm())
const createTargetFormRef = ref<FormInstance>()
const createUserFormRef = ref<FormInstance>()
const createMemberFormRef = ref<FormInstance>()
const createError = ref('')
const createTransitionPending = ref(false)
const createRules: FormRules<MemberCreateValue> = {
  tenantId: [
    { type: 'number', min: 1, required: true, message: '请选择目标 Tenant', trigger: 'change' },
  ],
  userName: [{ required: true, whitespace: true, message: '请输入登录账号', trigger: 'blur' }],
  realName: [{ required: true, whitespace: true, message: '请输入姓名', trigger: 'blur' }],
  existingUserName: [
    { required: true, whitespace: true, message: '请输入完整登录账号', trigger: 'blur' },
  ],
  effectiveStart: [
    { required: true, whitespace: true, message: '请选择有效开始时间', trigger: 'change' },
  ],
  email: [{ type: 'email', message: '请输入有效邮箱地址', trigger: 'blur' }],
}
watch(
  () => createForm.tenantId,
  () => {
    createForm.organizationIds = []
    createForm.primaryOrganizationId = undefined
    createForm.positionIds = []
    createForm.primaryPositionId = undefined
  },
)
watch(
  () => createForm.organizationIds,
  (ids) => {
    if (!ids.includes(createForm.primaryOrganizationId ?? 0))
      createForm.primaryOrganizationId = undefined
  },
  { deep: true },
)
watch(
  () => createForm.positionIds,
  (ids) => {
    if (!ids.includes(createForm.primaryPositionId ?? 0)) createForm.primaryPositionId = undefined
  },
  { deep: true },
)
const editUserForm = reactive<UserUpdateValue>({
  id: 0,
  version: '',
  userName: '',
  realName: '',
  nickName: '',
  phone: '',
  email: '',
  avatarUrl: '',
  userType: '',
  remarks: '',
})
const editMemberForm = reactive<MemberUpdateValue>({
  id: 0,
  version: '',
  tenantId: 0,
  userId: 0,
  memberCode: '',
  displayName: '',
  effectiveStart: '',
  effectiveEnd: '',
  remarks: '',
})

const columns = computed<DataTableColumn[]>(() => [
  { prop: 'realName', label: '用户名称', minWidth: 140, fixed: 'left' },
  { prop: 'memberCode', label: '成员编号', minWidth: 118 },
  { prop: 'userName', label: '登录账号', minWidth: 124 },
  { prop: 'roles', label: '角色', minWidth: 180, slot: 'roles' },
  { prop: 'userId', label: '用户 ID', width: 88 },
  { label: '成员 ID', width: 88, slot: 'memberId' },
  { prop: 'phone', label: '手机号', minWidth: 140 },
  { prop: 'email', label: '邮箱', minWidth: 208 },
  { label: '用户状态', width: 96, slot: 'userStatus' },
  { label: '成员状态', width: 96, slot: 'memberStatus' },
  { label: '当前有效性', width: 116, slot: 'effectiveness' },
  { label: '管理员', width: 92, slot: 'tenantAdmin' },
  { prop: 'effectiveRange', label: '成员有效期', minWidth: 208 },
  { label: '组织/岗位', minWidth: 180, slot: 'organizationPosition' },
  { prop: 'updatedAt', label: '更新时间', minWidth: 164 },
  { label: '操作', slot: 'actions' },
])

const relationColumns: DataTableColumn[] = [
  { prop: 'id', label: '关系 ID', width: 90 },
  { prop: 'code', label: '编码', minWidth: 134 },
  { prop: 'name', label: '名称', minWidth: 148 },
  { label: '归属类型', width: 100, slot: 'primary' },
  { prop: 'effectiveStart', label: '有效开始', minWidth: 164 },
  { prop: 'effectiveEnd', label: '有效结束', minWidth: 164 },
  { label: '当前有效', width: 104, slot: 'current' },
  { label: '状态', width: 88, slot: 'relationStatus' },
  { prop: 'remarks', label: '备注', minWidth: 140 },
  { prop: 'version', label: '版本', width: 70, align: 'right' },
  { prop: 'updatedAt', label: '更新时间', minWidth: 164 },
  { label: '操作', fixed: 'right', slot: 'actions' },
]

const resolvedOrganizationOptions = computed(() => props.organizationOptions ?? [])
const resolvedPositionOptions = computed(() => props.positionOptions ?? [])
const queryTenantScope = computed(() => [...query.tenantIds].sort((a, b) => a - b).join(','))
const entityFilters = [
  { kind: 'organization', key: 'organizationId', label: '组织' },
  { kind: 'position', key: 'positionId', label: '岗位' },
  { kind: 'role', key: 'roleId', label: '角色' },
] as const
watch(
  queryTenantScope,
  () => {
    query.organizationId = undefined
    query.positionId = undefined
    query.roleId = undefined
  },
  { immediate: true },
)
async function loadScopedOptions(
  tenantIds: number[],
  kind: 'organization' | 'position' | 'role',
  params: PagedEntityQuery,
) {
  if (props.queryFilterOptions) return props.queryFilterOptions(tenantIds, kind, params)
  const options =
    kind === 'organization'
      ? resolvedOrganizationOptions.value
      : kind === 'position'
        ? resolvedPositionOptions.value
        : []
  const matching = tenantIds.length
    ? options.filter((item) => item.label.includes(params.keyword))
    : []
  return {
    items: matching.slice(
      (params.pageIndex - 1) * params.pageSize,
      params.pageIndex * params.pageSize,
    ),
    total: matching.length,
  }
}
function loadRelationCandidates(params: PagedEntityQuery) {
  return loadScopedOptions([selected.value.tenantId], relationMode.value, params)
}
const reviewValue = (value: string) => value.trim() || '未填写'
function reviewRelations(
  ids: number[],
  primaryId: number | undefined,
  options: FoundationSelectOption[],
) {
  return (
    ids
      .map(
        (id) =>
          `${options.find((option) => option.id === id)?.label ?? id}${id === primaryId ? '（主要）' : ''}`,
      )
      .join('、') || '未分配'
  )
}
const createReview = computed(() => {
  const tenant = resolvedTenantOptions.value.find((item) => item.id === createForm.tenantId)
  return [
    { label: '目标 Tenant', value: tenant ? `${tenant.name} · ${tenant.code}` : '未选择' },
    { label: '用户方式', value: createUserMode.value === 'new' ? '创建新用户' : '关联已有用户' },
    ...(createUserMode.value === 'new'
      ? [
          { label: '登录账号', value: reviewValue(createForm.userName) },
          {
            label: '姓名',
            value: reviewValue(createForm.realName),
          },
          {
            label: '手机号 / 邮箱',
            value: `${reviewValue(createForm.phone)} / ${reviewValue(createForm.email)}`,
          },
          { label: '用户类型', value: reviewValue(createForm.userType) },
          {
            label: '头像',
            value: createForm.avatarFileId || createForm.avatarUrl ? '已设置' : '未设置',
          },
        ]
      : [{ label: '完整登录账号', value: reviewValue(createForm.existingUserName) }]),
    {
      label: '成员编号',
      value: '由服务端按租户编码与成员 ID 自动生成',
    },
    {
      label: '成员类型 / 管理员身份',
      value: `${reviewValue(createForm.memberUserType)} / 普通成员`,
    },
    {
      label: '成员有效期',
      value: `${reviewValue(createForm.effectiveStart)} ～ ${createForm.effectiveEnd || '长期有效'}`,
    },
    { label: '成员备注', value: reviewValue(createForm.remarks) },
    {
      label: '初始组织',
      value: reviewRelations(
        createForm.organizationIds,
        createForm.primaryOrganizationId,
        resolvedOrganizationOptions.value,
      ),
    },
    {
      label: '初始岗位',
      value: reviewRelations(
        createForm.positionIds,
        createForm.primaryPositionId,
        resolvedPositionOptions.value,
      ),
    },
  ]
})

const visibleRecords = computed(() => {
  if (props.state !== 'ready') return []
  // Production filtering belongs to QueryUsers; do not re-interpret its tenant/role joins locally.
  if (props.queryRecords) return props.records
  const exactUserName = committedQuery.userName.trim().toLocaleLowerCase('zh-CN')
  const memberCode = committedQuery.memberCode.trim()
  const tenantIds = new Set(committedQuery.tenantIds)
  return props.records.filter((record) => {
    const hasMember = hasMemberContext(record)
    const matchesTenant =
      tenantIds.size > 0 &&
      (!hasMember ||
        tenantIds.has(record.tenantId) ||
        record.tenantMemberships.some((membership) => tenantIds.has(membership.tenantId)))
    const matchesUserName =
      !exactUserName || record.userName.toLocaleLowerCase('zh-CN') === exactUserName
    const matchesIdentity = (['realName', 'phone', 'email'] as const).every((key) =>
      record[key]
        .toLocaleLowerCase('zh-CN')
        .includes(committedQuery[key].trim().toLocaleLowerCase('zh-CN')),
    )
    return (
      matchesTenant &&
      matchesUserName &&
      matchesIdentity &&
      (!memberCode ||
        (committedQuery.memberCodeFuzzy
          ? record.memberCode.includes(memberCode)
          : record.memberCode === memberCode)) &&
      (!committedQuery.organizationId ||
        record.organizations.some(
          (item) => item.targetId === committedQuery.organizationId && item.isCurrentlyEffective,
        )) &&
      (!committedQuery.positionId ||
        record.positions.some(
          (item) => item.targetId === committedQuery.positionId && item.isCurrentlyEffective,
        )) &&
      (!committedQuery.memberStatus ||
        (hasMember && record.memberStatus === committedQuery.memberStatus))
    )
  })
})

function asMember(row: Record<string, unknown>): MembershipRecord {
  return row as unknown as MembershipRecord
}

function asRelation(row: Record<string, unknown>): MemberRelationRecord {
  return row as unknown as MemberRelationRecord
}

function hasMemberContext(record: MembershipRecord): boolean {
  return record.id > 0 && record.tenantId > 0
}

function commitQuery(): MembershipQueryValue {
  const value = { ...query, tenantIds: [...query.tenantIds] }
  Object.assign(committedQuery, value)
  return value
}

function search() {
  const memberCode = query.memberCode.trim()
  if (memberCode && query.memberCodeFuzzy && memberCode.length < 3) {
    memberCodeError.value = '成员编号模糊查询至少需要3个字符'
    memberCodeInput.value?.focus()
    return
  }
  memberCodeError.value = ''
  const value = commitQuery()
  page.value = 1
  void props.queryRecords?.(value)
  emit('action', '用户与成员查询条件已生效')
}

function searchOnEnter(event: KeyboardEvent) {
  if (event.isComposing) return
  search()
}

function resetSearch() {
  Object.assign(query, {
    tenantIds: allTenantIds(),
    memberCode: '',
    memberCodeFuzzy: false,
    userName: '',
    realName: '',
    phone: '',
    email: '',
    organizationId: undefined,
    positionId: undefined,
    roleId: undefined,
    memberStatus: '',
  })
  memberCodeError.value = ''
  const value = commitQuery()
  page.value = 1
  void props.queryRecords?.(value)
  emit('action', '用户与成员查询条件已重置')
}

function openDetail(record: MembershipRecord) {
  selected.value = record
  detailTab.value = 'profile'
  detailVisible.value = true
  void refreshDetail()
}

async function refreshDetail() {
  const sequence = ++detailSequence
  const record = selected.value
  detailError.value = ''
  if (!props.queryMemberDetail) return
  detailLoading.value = true
  const isCurrent = () => sequence === detailSequence && detailVisible.value
  try {
    const fresh = await props.queryMemberDetail(record)
    if (!isCurrent()) return
    if (fresh.userId !== record.userId || fresh.tenantId !== record.tenantId) {
      throw new Error('用户或租户上下文已变化，请关闭详情后重试')
    }
    selected.value = fresh
  } catch (error) {
    if (isCurrent())
      detailError.value = error instanceof Error ? error.message : '详情加载失败，请重试'
  } finally {
    if (isCurrent()) detailLoading.value = false
  }
}

function openRelation(mode: MemberRelationKind, relation?: MemberRelationRecord, ending = false) {
  if (
    !hasMemberContext(selected.value) ||
    detailLoading.value ||
    detailError.value ||
    relationUnavailable(selected.value, relation)
  )
    return
  relationMode.value = mode
  relationRecord.value = relation
  relationEnding.value = ending
  relationVisible.value = true
}

function openAdmin() {
  if (!memberEffective(selected.value) || detailLoading.value || detailError.value) return
  rolesVisible.value = false
  adminVisible.value = true
}

function selectAndOpenStatus(record: MembershipRecord) {
  if (!hasMemberContext(record)) return
  selected.value = record
  statusVisible.value = true
}

function openUserEdit(record: MembershipRecord) {
  selected.value = record
  editMode.value = 'user'
  Object.assign(editUserForm, {
    id: record.userId,
    version: record.userVersion,
    userName: record.userName,
    realName: record.realName,
    nickName: record.nickName,
    phone: record.phone,
    email: record.email,
    avatarUrl: record.avatarUrl,
    avatarFileId: record.avatarFileId ?? '',
    userType: record.globalUserType,
    remarks: record.userRemarks,
  })
  editUploadBlocked.value = false
  editVisible.value = true
}

function openMemberEdit(record: MembershipRecord) {
  if (!hasMemberContext(record)) return
  selected.value = record
  editMode.value = 'member'
  Object.assign(editMemberForm, {
    id: record.id,
    version: record.version,
    tenantId: record.tenantId,
    userId: record.userId,
    memberCode: record.memberCode,
    displayName: record.displayName,
    effectiveStart: record.effectiveStart,
    effectiveEnd: record.effectiveEnd,
    remarks: record.remarks,
  })
  editVisible.value = true
}

function openCreate() {
  createStep.value = 0
  createUserMode.value = 'new'
  createUploadBlocked.value = false
  createError.value = ''
  Object.assign(createForm, emptyCreateForm())
  createVisible.value = true
}

async function finishEdit() {
  if (submitting.value || (editMode.value === 'user' && editUploadBlocked.value)) return
  const save = editMode.value === 'member' ? props.saveMember : props.saveUser
  if (!save) {
    editVisible.value = false
    emit(
      'action',
      editMode.value === 'member' ? 'Tenant 成员完整资料候选已保存' : '全局用户完整资料候选已保存',
    )
    return
  }
  submitting.value = true
  try {
    if (editMode.value === 'member') await props.saveMember?.({ ...editMemberForm })
    else await props.saveUser?.({ ...editUserForm })
    editVisible.value = false
    if (detailVisible.value) await refreshDetail()
  } finally {
    submitting.value = false
  }
}

async function finishStatusChange() {
  if (submitting.value) return
  if (!props.changeStatus) {
    statusVisible.value = false
    emit('action', '成员状态候选已确认')
    return
  }
  submitting.value = true
  try {
    await props.changeStatus(
      selected.value,
      selected.value.memberStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
    )
    statusVisible.value = false
  } finally {
    submitting.value = false
  }
}

function previousCreateStep() {
  if (submitting.value || createTransitionPending.value) return
  createStep.value = Math.max(0, createStep.value - 1)
  createError.value = ''
}

async function finishCreate() {
  if (createTransitionPending.value || submitting.value) return
  createTransitionPending.value = true
  try {
    await confirmCreateStep()
  } finally {
    createTransitionPending.value = false
  }
}

async function confirmCreateStep() {
  if (submitting.value || (createUserMode.value === 'new' && createUploadBlocked.value)) return
  createError.value = ''
  const forms =
    createStep.value === 0
      ? [createTargetFormRef.value, createUserFormRef.value]
      : createStep.value === 1
        ? [createMemberFormRef.value]
        : []
  for (const form of forms) {
    if (form && !(await form.validate().catch(() => false))) return
  }
  if (!createVisible.value) return
  if (
    createStep.value === 1 &&
    createForm.effectiveEnd &&
    createForm.effectiveEnd <= createForm.effectiveStart
  ) {
    createError.value = '有效结束时间必须晚于开始时间'
    return
  }
  if (createStep.value < 2) {
    createStep.value += 1
    if (createStep.value === 1 && createForm.tenantId > 0) {
      // 组织与岗位仅在归属步骤真正需要，避免成员列表首屏产生无关请求。
      void props.loadRelationOptions?.(createForm.tenantId, 'all')
    }
    return
  }
  if (!props.createMember) {
    createVisible.value = false
    createStep.value = 0
    emit('action', '成员创建候选已完成；正式接入时不提交任何密码字段')
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    await props.createMember({
      ...createForm,
      mode: createUserMode.value,
      organizationIds: [...createForm.organizationIds],
      positionIds: [...createForm.positionIds],
    })
    createVisible.value = false
    createStep.value = 0
  } catch (error) {
    createError.value =
      error instanceof Error ? error.message : '成员创建失败，请检查填写内容后重试'
  } finally {
    submitting.value = false
  }
}

function effectivenessMeta(value: MembershipRecord['effectiveness']) {
  if (value === 'EFFECTIVE') return { label: '当前有效', tone: 'success' as const }
  if (value === 'FUTURE') return { label: '尚未生效', tone: 'warning' as const }
  return { label: '已过有效期', tone: 'info' as const }
}
</script>

<template>
  <AppPage :resource_element="membersElements.page" class="membership-page">
    <ListPageTemplate>
      <template #header>
        <PageHeader
          title="用户与成员"
          description="查询当前 Tenant 的用户、成员关系、有效期及组织岗位归属"
        />
      </template>

      <template #search>
        <SearchPanel
          :resource_element="membersElements.query"
          :loading="state === 'loading'"
          @search="search"
          @reset="resetSearch"
        >
          <el-form-item label="用户名称">
            <el-input
              v-model="query.realName"
              v-resource-element="membersElements.query"
              clearable
              placeholder="输入用户姓名"
              @keyup.enter="searchOnEnter"
            />
          </el-form-item>
          <el-form-item label="成员编号" :error="memberCodeError" :show-message="false">
            <el-input
              ref="memberCodeInput"
              v-model="query.memberCode"
              v-resource-element="membersElements.query"
              :aria-invalid="Boolean(memberCodeError)"
              :aria-describedby="memberCodeError ? 'member-code-query-error' : undefined"
              clearable
              :placeholder="query.memberCodeFuzzy ? '输入至少3个字符' : '输入完整成员编号'"
              @keyup.enter="searchOnEnter"
            />
          </el-form-item>
          <el-form-item label="编号匹配">
            <el-select v-model="query.memberCodeFuzzy" v-resource-element="membersElements.query">
              <el-option label="精确匹配" :value="false" />
              <el-option label="模糊匹配" :value="true" />
            </el-select>
          </el-form-item>
          <el-form-item label="用户手机">
            <el-input
              v-model="query.phone"
              v-resource-element="membersElements.query"
              clearable
              placeholder="输入完整手机号"
              @keyup.enter="searchOnEnter"
            />
          </el-form-item>
          <el-form-item label="用户邮箱">
            <el-input
              v-model="query.email"
              v-resource-element="membersElements.query"
              clearable
              placeholder="输入完整邮箱"
              @keyup.enter="searchOnEnter"
            />
          </el-form-item>
          <el-form-item v-for="filter in entityFilters" :key="filter.key" :label="filter.label">
            <PagedEntitySelect
              v-model="query[filter.key]"
              :resource_element="membersElements.filterOptions"
              :label="filter.label"
              :scope-key="`${queryTenantScope}:${filter.kind}`"
              :active="query.tenantIds.length > 0"
              :disabled="!query.tenantIds.length"
              :placeholder="`全部${filter.label}`"
              :empty-text="`所选租户内暂无匹配的${filter.label}`"
              :load-options="
                (params) => loadScopedOptions([...query.tenantIds], filter.kind, params)
              "
            />
          </el-form-item>
          <el-form-item label="完整登录账号">
            <el-input
              v-model="query.userName"
              v-resource-element="membersElements.query"
              clearable
              placeholder="精确账号"
              @keyup.enter="searchOnEnter"
            />
          </el-form-item>
          <el-form-item label="成员状态">
            <el-select v-model="query.memberStatus" clearable placeholder="全部状态">
              <el-option label="启用" value="ACTIVE" />
              <el-option label="停用" value="DISABLED" />
            </el-select>
          </el-form-item>
          <template #footer-leading>
            <el-button
              v-resource-element="membersElements.create"
              v-permission="IAM_PERMISSIONS.members.create"
              type="primary"
              @click="openCreate"
            >
              <Icon icon="mdi:plus" width="18" aria-hidden="true" />
              新增 Tenant 成员
            </el-button>
          </template>
        </SearchPanel>
        <el-alert
          v-if="memberCodeError"
          id="member-code-query-error"
          :title="memberCodeError"
          type="error"
          :closable="false"
          show-icon
        />
      </template>

      <template #toolbar>
        <TableToolbar
          :resource_element="membersElements.query"
          title="用户与成员列表"
          :total="visibleRecords.length"
          :refreshing="state === 'loading'"
          @refresh="emit('retry')"
        >
          <template #summary>
            <span class="membership-workspace__hint">
              当前租户成员；用户状态、成员状态与当前有效性分别判断
            </span>
          </template>
        </TableToolbar>
      </template>

      <el-alert
        v-if="state === 'retryable-error'"
        class="membership-workspace__alert"
        title="身份数据加载失败，当前列表未更新"
        type="error"
        :closable="false"
        show-icon
      >
        <template #default>
          <el-button
            v-resource-element="membersElements.query"
            link
            type="primary"
            @click="emit('retry')"
            >重新加载</el-button
          >
        </template>
      </el-alert>

      <DataTable
        :resource_element="membersElements.detail"
        :data="visibleRecords"
        :columns="columns"
        :loading="state === 'loading'"
      >
        <template #organizationPosition="{ row }">
          <span
            >{{ asMember(row).primaryOrganization || '—' }} /
            {{ asMember(row).primaryPosition || '—' }}</span
          >
        </template>
        <template #memberId="{ row }">
          <span>{{ hasMemberContext(asMember(row)) ? asMember(row).id : '—' }}</span>
        </template>
        <template #userStatus="{ row }">
          <StatusTag
            :label="asMember(row).userStatus === 'ACTIVE' ? '启用' : '停用'"
            :tone="asMember(row).userStatus === 'ACTIVE' ? 'success' : 'danger'"
          />
        </template>
        <template #memberStatus="{ row }">
          <StatusTag
            v-if="hasMemberContext(asMember(row))"
            :label="asMember(row).memberStatus === 'ACTIVE' ? '启用' : '停用'"
            :tone="asMember(row).memberStatus === 'ACTIVE' ? 'success' : 'info'"
          />
          <span v-else>—</span>
        </template>
        <template #effectiveness="{ row }">
          <StatusTag
            v-if="hasMemberContext(asMember(row))"
            :label="effectivenessMeta(asMember(row).effectiveness).label"
            :tone="effectivenessMeta(asMember(row).effectiveness).tone"
          />
          <span v-else>—</span>
        </template>
        <template #tenantAdmin="{ row }">
          <StatusTag
            v-if="hasMemberContext(asMember(row))"
            :label="asMember(row).isTenantAdmin ? '是' : '否'"
            :tone="asMember(row).isTenantAdmin ? 'primary' : 'info'"
          />
          <span v-else>—</span>
        </template>
        <template #roles="{ row }">
          <TableCellText :value="asMember(row).roles.join('、') || '—'" />
        </template>
        <template #actions="{ row }">
          <RowActionGrid
            density="compact"
            :aria-label="`${asMember(row).realName || '未设置姓名'} 的操作`"
          >
            <el-button
              v-resource-element="membersElements.detail"
              link
              type="primary"
              @click.stop="openDetail(asMember(row))"
              >详情</el-button
            >
            <el-button
              v-if="hasMemberContext(asMember(row))"
              v-resource-element="membersElements.memberStatus"
              v-permission="IAM_PERMISSIONS.members.changeStatus"
              link
              :type="asMember(row).memberStatus === 'ACTIVE' ? 'warning' : 'success'"
              @click.stop="selectAndOpenStatus(asMember(row))"
            >
              {{ asMember(row).memberStatus === 'ACTIVE' ? '停用' : '启用' }}
            </el-button>
          </RowActionGrid>
        </template>
      </DataTable>

      <template #pagination>
        <AppPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :resource_element="membersElements.local"
          :total="visibleRecords.length"
          @change="emit('action', '用户与成员分页状态已更新')"
        />
      </template>
    </ListPageTemplate>

    <DetailDrawer
      v-model="detailVisible"
      :resource_element="membersElements.detail"
      :title="`${selected.realName || '未设置姓名'} · 身份详情`"
      size="min(1040px, 92%)"
    >
      <LoadingState v-if="detailLoading" label="正在加载最新用户详情与归属…" />
      <el-alert
        v-else-if="detailError"
        :title="detailError"
        type="error"
        :closable="false"
        show-icon
      >
        <el-button
          v-resource-element="membersElements.detail"
          link
          type="primary"
          @click="refreshDetail"
          >重新加载详情</el-button
        >
      </el-alert>
      <div v-else class="membership-detail">
        <header class="membership-detail__hero">
          <el-avatar :size="52" :src="selected.avatarUrl">
            {{ (selected.realName || '未设置姓名').slice(0, 1) }}
          </el-avatar>
          <div>
            <strong>{{ selected.realName || '未设置姓名' }}</strong>
            <span v-if="hasMemberContext(selected)">
              {{ selected.userName }} · {{ selected.memberCode }} · {{ selected.tenantName }}
            </span>
            <span v-else>{{ selected.userName }} · 暂无所选 Tenant 成员上下文</span>
          </div>
          <StatusTag
            v-if="hasMemberContext(selected) && selected.isTenantAdmin"
            label="Tenant 管理员"
            tone="primary"
          />
          <RowActionGrid
            v-if="hasMemberContext(selected)"
            :aria-label="`${selected.realName || '未设置姓名'} 的权限`"
          >
            <el-button
              v-resource-element="membersElements.roles"
              v-permission="IAM_PERMISSIONS.members.queryPermissions"
              type="primary"
              plain
              @click="openRoles(selected)"
              >分配角色</el-button
            >
            <el-button
              v-if="canAccessEffectivePermissions"
              v-resource-element="membersElements.effectivePermissions"
              plain
              @click="inspectEffectivePermissions?.(selected)"
              >有效权限</el-button
            >
            <el-button
              v-if="!selected.isTenantAdmin"
              v-resource-element="membersElements.appointAdmin"
              v-permission="IAM_PERMISSIONS.members.appointAdmin"
              :disabled="!memberEffective(selected)"
              :title="!memberEffective(selected) ? '仅可任命当前有效成员' : ''"
              plain
              @click="openAdmin"
              >任命管理员</el-button
            >
            <el-button
              v-else
              v-resource-element="membersElements.cancelAdmin"
              v-permission="IAM_PERMISSIONS.members.cancelAdmin"
              :disabled="!memberEffective(selected)"
              :title="!memberEffective(selected) ? '仅可取消有效成员的管理员身份' : ''"
              type="warning"
              plain
              @click="openAdmin"
              >取消管理员</el-button
            >
          </RowActionGrid>
        </header>

        <div class="membership-detail__status-grid">
          <article>
            <span>全局用户状态</span>
            <StatusTag
              :label="selected.userStatus === 'ACTIVE' ? '启用' : '停用'"
              :tone="selected.userStatus === 'ACTIVE' ? 'success' : 'danger'"
            />
          </article>
          <article v-if="hasMemberContext(selected)">
            <span>Tenant 成员状态</span>
            <StatusTag
              :label="selected.memberStatus === 'ACTIVE' ? '启用' : '停用'"
              :tone="selected.memberStatus === 'ACTIVE' ? 'success' : 'info'"
            />
          </article>
          <article v-if="hasMemberContext(selected)">
            <span>当前有效性</span>
            <StatusTag
              :label="effectivenessMeta(selected.effectiveness).label"
              :tone="effectivenessMeta(selected.effectiveness).tone"
            />
          </article>
        </div>

        <el-tabs v-model="detailTab">
          <el-tab-pane label="身份与成员资料" name="profile">
            <div class="membership-detail__sections">
              <section>
                <div class="membership-detail__section-heading">
                  <h3>全局用户</h3>
                  <el-button
                    v-resource-element="membersElements.editUser"
                    v-permission="IAM_PERMISSIONS.members.updateUser"
                    link
                    type="primary"
                    @click="openUserEdit(selected)"
                    >编辑基本信息</el-button
                  >
                </div>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="用户 ID">{{ selected.userId }}</el-descriptions-item>
                  <el-descriptions-item label="登录账号">{{
                    selected.userName
                  }}</el-descriptions-item>
                  <el-descriptions-item label="姓名">{{
                    selected.realName || '未设置姓名'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="手机号">{{
                    selected.phone || '未设置'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="邮箱">{{
                    selected.email || '未设置'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="头像文件 / 地址">{{
                    selected.avatarFileId || selected.avatarUrl || '未设置'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="用户类型">{{
                    selected.globalUserType
                  }}</el-descriptions-item>
                  <el-descriptions-item label="用户状态">{{
                    selected.userStatus
                  }}</el-descriptions-item>
                  <el-descriptions-item label="版本">{{
                    selected.userVersion
                  }}</el-descriptions-item>
                  <el-descriptions-item label="更新时间">{{
                    selected.userUpdatedAt
                  }}</el-descriptions-item>
                  <el-descriptions-item label="管理备注">{{
                    selected.userRemarks || '无'
                  }}</el-descriptions-item>
                </el-descriptions>
              </section>

              <section v-if="hasMemberContext(selected)">
                <div class="membership-detail__section-heading">
                  <h3>当前 Tenant 成员</h3>
                  <el-button
                    v-resource-element="membersElements.editMember"
                    v-permission="IAM_PERMISSIONS.members.update"
                    link
                    type="primary"
                    @click="openMemberEdit(selected)"
                    >编辑成员资料</el-button
                  >
                </div>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="成员 ID">{{ selected.id }}</el-descriptions-item>
                  <el-descriptions-item label="用户 ID">{{ selected.userId }}</el-descriptions-item>
                  <el-descriptions-item label="Tenant ID">{{
                    selected.tenantId
                  }}</el-descriptions-item>
                  <el-descriptions-item label="Tenant 编码">{{
                    selected.tenantCode
                  }}</el-descriptions-item>
                  <el-descriptions-item label="成员编号">{{
                    selected.memberCode
                  }}</el-descriptions-item>
                  <el-descriptions-item label="成员用户类型">{{
                    selected.memberUserType
                  }}</el-descriptions-item>
                  <el-descriptions-item label="成员状态">{{
                    selected.memberStatus
                  }}</el-descriptions-item>
                  <el-descriptions-item label="Tenant 管理员">
                    {{ selected.isTenantAdmin ? '是' : '否' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="加入时间">{{
                    selected.joinedAt
                  }}</el-descriptions-item>
                  <el-descriptions-item label="离开时间">{{
                    selected.leftAt || '未离开'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="有效开始">{{
                    selected.effectiveStart
                  }}</el-descriptions-item>
                  <el-descriptions-item label="有效结束">
                    {{ selected.effectiveEnd || '长期有效' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="当前是否有效">
                    {{ selected.effectiveness === 'EFFECTIVE' ? '是' : '否' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="版本">{{ selected.version }}</el-descriptions-item>
                  <el-descriptions-item label="更新时间">{{
                    selected.updatedAt
                  }}</el-descriptions-item>
                  <el-descriptions-item label="成员备注">{{
                    selected.remarks || '无'
                  }}</el-descriptions-item>
                </el-descriptions>
              </section>
            </div>
          </el-tab-pane>

          <el-tab-pane v-if="hasMemberContext(selected)" label="组织归属" name="organizations">
            <div class="relation-section__header">
              <div>
                <strong>当前与历史组织归属</strong>
                <small>有效期按 {{ selected.tenantTimezone }} 展示</small>
              </div>
              <el-button
                v-resource-element="membersElements.organization"
                v-permission="IAM_PERMISSIONS.members.saveOrganization"
                type="primary"
                plain
                :disabled="!memberEffective(selected)"
                @click="openRelation('organization')"
                >新增组织归属</el-button
              >
            </div>
            <DataTable
              :resource_element="membersElements.detail"
              :data="selected.organizations"
              :columns="relationColumns"
              height="360"
            >
              <template #primary="{ row }">
                <StatusTag
                  :label="asRelation(row).isPrimary ? '主要' : '辅助'"
                  :tone="asRelation(row).isPrimary ? 'primary' : 'info'"
                />
              </template>
              <template #current="{ row }">
                <StatusTag
                  :label="asRelation(row).isCurrentlyEffective ? '当前有效' : '历史/未来'"
                  :tone="asRelation(row).isCurrentlyEffective ? 'success' : 'info'"
                />
              </template>
              <template #relationStatus="{ row }">
                <StatusTag
                  :label="asRelation(row).status === 'ACTIVE' ? '启用' : '停用'"
                  :tone="asRelation(row).status === 'ACTIVE' ? 'success' : 'info'"
                />
              </template>
              <template #actions="{ row }">
                <RowActionGrid>
                  <el-button
                    v-resource-element="membersElements.editOrganization"
                    v-permission="resourceRegistry.members.buttons.organization.resource_code"
                    link
                    type="primary"
                    :disabled="Boolean(relationUnavailable(selected, asRelation(row)))"
                    :title="relationUnavailable(selected, asRelation(row))"
                    @click="openRelation('organization', asRelation(row))"
                    >编辑</el-button
                  >
                  <el-button
                    v-resource-element="membersElements.endOrganization"
                    v-permission="IAM_PERMISSIONS.members.endOrganization"
                    link
                    type="danger"
                    :disabled="Boolean(relationUnavailable(selected, asRelation(row)))"
                    :title="relationUnavailable(selected, asRelation(row))"
                    @click="openRelation('organization', asRelation(row), true)"
                    >结束</el-button
                  >
                </RowActionGrid>
              </template>
            </DataTable>
          </el-tab-pane>

          <el-tab-pane v-if="hasMemberContext(selected)" label="岗位归属" name="positions">
            <div class="relation-section__header">
              <div>
                <strong>当前与历史岗位归属</strong>
                <small>岗位归属不产生任何角色或权限</small>
              </div>
              <el-button
                v-resource-element="membersElements.position"
                v-permission="IAM_PERMISSIONS.members.savePosition"
                type="primary"
                plain
                :disabled="!memberEffective(selected)"
                @click="openRelation('position')"
                >新增岗位归属</el-button
              >
            </div>
            <DataTable
              :resource_element="membersElements.detail"
              :data="selected.positions"
              :columns="relationColumns"
              height="360"
            >
              <template #primary="{ row }">
                <StatusTag
                  :label="asRelation(row).isPrimary ? '主要' : '兼职'"
                  :tone="asRelation(row).isPrimary ? 'primary' : 'info'"
                />
              </template>
              <template #current="{ row }">
                <StatusTag
                  :label="asRelation(row).isCurrentlyEffective ? '当前有效' : '历史/未来'"
                  :tone="asRelation(row).isCurrentlyEffective ? 'success' : 'info'"
                />
              </template>
              <template #relationStatus="{ row }">
                <StatusTag
                  :label="asRelation(row).status === 'ACTIVE' ? '启用' : '停用'"
                  :tone="asRelation(row).status === 'ACTIVE' ? 'success' : 'info'"
                />
              </template>
              <template #actions="{ row }">
                <RowActionGrid>
                  <el-button
                    v-resource-element="membersElements.editPosition"
                    v-permission="resourceRegistry.members.buttons.position.resource_code"
                    link
                    type="primary"
                    :disabled="Boolean(relationUnavailable(selected, asRelation(row)))"
                    :title="relationUnavailable(selected, asRelation(row))"
                    @click="openRelation('position', asRelation(row))"
                    >编辑</el-button
                  >
                  <el-button
                    v-resource-element="membersElements.endPosition"
                    v-permission="IAM_PERMISSIONS.members.endPosition"
                    link
                    type="danger"
                    :disabled="Boolean(relationUnavailable(selected, asRelation(row)))"
                    :title="relationUnavailable(selected, asRelation(row))"
                    @click="openRelation('position', asRelation(row), true)"
                    >结束</el-button
                  >
                </RowActionGrid>
              </template>
            </DataTable>
          </el-tab-pane>

          <el-tab-pane label="租户" name="tenants">
            <p>仅展示当前登录租户的成员关系，不代表该用户全部租户归属。</p>
            <el-table :data="selected.tenantMemberships" stripe>
              <el-table-column prop="tenantCode" label="Tenant 编码" min-width="130" />
              <el-table-column prop="tenantName" label="Tenant 名称" min-width="180" />
              <el-table-column prop="memberCode" label="成员编号" min-width="120" />
              <el-table-column label="成员状态" width="100">
                <template #default="{ row }">
                  <StatusTag
                    :label="row.status === 'ACTIVE' ? '启用' : '停用'"
                    :tone="row.status === 'ACTIVE' ? 'success' : 'info'"
                  />
                </template>
              </el-table-column>
              <el-table-column label="Tenant 管理员" width="116">
                <template #default="{ row }">{{ row.isTenantAdmin ? '是' : '否' }}</template>
              </el-table-column>
              <el-table-column label="Tenant 状态" width="112">
                <template #default="{ row }">
                  <StatusTag
                    :label="
                      row.tenantIsDeleted
                        ? '已删除'
                        : row.tenantStatus === 'ACTIVE'
                          ? '启用'
                          : row.tenantStatus === 'DISABLED'
                            ? '停用'
                            : '状态未知'
                    "
                    :tone="
                      row.tenantStatus === 'ACTIVE' && !row.tenantIsDeleted ? 'success' : 'danger'
                    "
                  />
                </template>
              </el-table-column>
              <el-table-column prop="effectiveRange" label="有效期" min-width="210" />
              <el-table-column prop="timezone" label="时区" min-width="140" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </DetailDrawer>

    <FormDrawer
      v-model="editVisible"
      :resource_element="
        editMode === 'member' ? membersElements.editMember : membersElements.editUser
      "
      :title="editMode === 'member' ? '编辑 Tenant 成员' : '编辑基本信息'"
      size="min(900px, 88%)"
      :confirm-button-text="editMode === 'member' ? '保存成员信息' : '保存基本信息'"
      :submitting="submitting"
      :confirm-disabled="editMode === 'user' && editUploadBlocked"
      @confirm="finishEdit"
    >
      <el-alert
        :title="
          editMode === 'member'
            ? `只更新当前租户“${selected.tenantName}”的成员有效期和备注；结束有效期保留历史，不影响全局账号及其他租户。`
            : '正在编辑跨租户共享的全局用户身份，保存后可能影响该用户在其他租户的登录与资料展示。此操作需要独立的全局用户编辑权限；用户状态和密码不属于该接口。'
        "
        type="warning"
        :closable="false"
        show-icon
      />
      <el-form class="membership-form membership-form--grid" label-position="top">
        <template v-if="editMode === 'member'">
          <el-form-item label="成员 ID"
            ><el-input :model-value="selected.id" disabled
          /></el-form-item>
          <el-form-item label="版本令牌"
            ><el-input v-model="editMemberForm.version" disabled
          /></el-form-item>
          <el-form-item label="用户 ID"
            ><el-input :model-value="selected.userId" disabled
          /></el-form-item>
          <el-form-item label="全局用户">
            <el-input :model-value="`${selected.realName} · ${selected.userName}`" disabled />
          </el-form-item>
          <el-form-item label="Tenant ID"
            ><el-input :model-value="selected.tenantId" disabled
          /></el-form-item>
          <el-form-item label="Tenant">
            <el-input :model-value="`${selected.tenantName} · ${selected.tenantCode}`" disabled />
          </el-form-item>
          <el-form-item label="成员状态"
            ><el-input :model-value="selected.memberStatus" disabled
          /></el-form-item>
          <el-form-item label="成员用户类型"
            ><el-input :model-value="selected.memberUserType" disabled
          /></el-form-item>
          <el-form-item label="成员编号"
            ><el-input v-model="editMemberForm.memberCode" disabled
          /></el-form-item>
          <el-form-item label="有效开始时间（Asia/Shanghai）">
            <el-input v-model="editMemberForm.effectiveStart" />
          </el-form-item>
          <el-form-item label="有效结束时间（Asia/Shanghai）">
            <el-input v-model="editMemberForm.effectiveEnd" placeholder="留空表示长期有效" />
          </el-form-item>
          <el-form-item class="membership-form__wide" label="成员备注">
            <el-input v-model="editMemberForm.remarks" type="textarea" :rows="4" resize="none" />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="用户 ID"
            ><el-input :model-value="selected.userId" disabled
          /></el-form-item>
          <el-form-item label="版本令牌"
            ><el-input v-model="editUserForm.version" disabled
          /></el-form-item>
          <el-form-item label="登录账号">
            <el-input v-model="editUserForm.userName" readonly />
          </el-form-item>
          <el-form-item label="姓名"><el-input v-model="editUserForm.realName" /></el-form-item>
          <el-form-item label="手机号"><el-input v-model="editUserForm.phone" /></el-form-item>
          <el-form-item label="邮箱"><el-input v-model="editUserForm.email" /></el-form-item>
          <el-form-item label="用户类型">
            <el-select v-model="editUserForm.userType">
              <el-option label="平台用户" value="平台用户" />
              <el-option label="合作方用户" value="合作方用户" />
            </el-select>
          </el-form-item>
          <el-form-item class="membership-form__wide" label="头像">
            <ImageAssetField
              v-model:file-id="editUserForm.avatarFileId"
              v-model:image-url="editUserForm.avatarUrl"
              :resource_element="membersElements.editAvatar"
              :disabled="submitting"
              @blocked-change="editUploadBlocked = $event"
            />
          </el-form-item>
          <el-form-item class="membership-form__wide" label="管理备注">
            <el-input v-model="editUserForm.remarks" type="textarea" :rows="4" resize="none" />
          </el-form-item>
        </template>
      </el-form>
    </FormDrawer>

    <FormDrawer
      v-model="createVisible"
      :resource_element="membersElements.create"
      title="新增 Tenant 成员"
      size="min(1000px, 92%)"
      :confirm-button-text="createStep === 2 ? '创建成员' : '下一步'"
      :submitting="submitting"
      :confirm-disabled="createUserMode === 'new' && createUploadBlocked"
      @confirm="finishCreate"
    >
      <p>为当前登录租户新增成员；关联已有账号不会移除其其他租户关系。</p>
      <el-steps :active="createStep" finish-status="success" align-center>
        <el-step title="目标与用户" />
        <el-step title="成员与归属" />
        <el-step title="确认创建" />
      </el-steps>
      <el-alert v-if="createError" :title="createError" type="error" :closable="false" show-icon />
      <section class="member-wizard" aria-live="polite">
        <!-- Keep the uploaded file and its object URL alive while revisiting wizard steps. -->
        <div v-show="createStep === 0" class="member-wizard__step">
          <el-form
            ref="createTargetFormRef"
            :model="createForm"
            :rules="createRules"
            :disabled="submitting"
            scroll-to-error
            class="membership-form membership-form--grid"
            label-position="top"
          >
          </el-form>

          <el-radio-group v-model="createUserMode" :disabled="submitting">
            <el-radio-button value="new">创建新用户</el-radio-button>
            <el-radio-button value="existing">关联已有用户</el-radio-button>
          </el-radio-group>

          <el-form
            ref="createUserFormRef"
            :model="createForm"
            :rules="createRules"
            :disabled="submitting"
            scroll-to-error
            class="membership-form membership-form--grid"
            label-position="top"
          >
            <template v-if="createUserMode === 'existing'">
              <el-form-item
                class="membership-form__wide"
                label="完整登录账号"
                prop="existingUserName"
              >
                <el-input
                  v-model="createForm.existingUserName"
                  placeholder="请输入需要关联的完整登录账号"
                />
              </el-form-item>
              <el-alert
                class="membership-form__wide"
                title="按完整登录账号关联已有用户；提交时将校验用户状态和租户成员关系。"
                type="info"
                :closable="false"
                show-icon
              />
            </template>
            <template v-else>
              <el-form-item label="登录账号" prop="userName"
                ><el-input v-model="createForm.userName"
              /></el-form-item>
              <el-form-item label="姓名" prop="realName"
                ><el-input v-model="createForm.realName"
              /></el-form-item>
              <el-form-item label="用户类型">
                <el-select v-model="createForm.userType">
                  <el-option label="平台用户" value="平台用户" />
                  <el-option label="合作方用户" value="合作方用户" />
                </el-select>
              </el-form-item>
              <el-form-item label="手机号"><el-input v-model="createForm.phone" /></el-form-item>
              <el-form-item label="邮箱" prop="email"
                ><el-input v-model="createForm.email"
              /></el-form-item>
              <el-form-item class="membership-form__wide" label="头像">
                <ImageAssetField
                  v-model:file-id="createForm.avatarFileId"
                  v-model:image-url="createForm.avatarUrl"
                  :resource_element="membersElements.createAvatar"
                  :disabled="submitting"
                  @blocked-change="createUploadBlocked = $event"
                />
              </el-form-item>
            </template>
          </el-form>
          <el-alert
            title="本流程不采集、生成或提交初始密码。用户首次登录策略由 IAM 服务决定。"
            type="info"
            :closable="false"
            show-icon
          />
        </div>

        <div v-show="createStep === 1" class="member-wizard__step">
          <el-alert
            title="成员编号和 Tenant 显示名称由服务端自动生成，无需填写。"
            type="info"
            :closable="false"
            show-icon
          />
          <el-form
            ref="createMemberFormRef"
            :model="createForm"
            :rules="createRules"
            :disabled="submitting"
            scroll-to-error
            class="membership-form membership-form--grid"
            label-position="top"
          >
            <el-form-item label="成员用户类型">
              <el-select v-model="createForm.memberUserType">
                <el-option label="正式员工" value="正式员工" />
                <el-option label="外包人员" value="外包人员" />
              </el-select>
            </el-form-item>
            <el-form-item label="管理员身份">
              <el-input model-value="普通成员（管理员任命使用独立功能）" disabled />
            </el-form-item>
            <el-form-item label="有效开始时间（Asia/Shanghai）" prop="effectiveStart">
              <el-date-picker
                v-model="createForm.effectiveStart"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="请选择有效开始时间"
              />
            </el-form-item>
            <el-form-item label="有效结束时间（Asia/Shanghai）">
              <el-date-picker
                v-model="createForm.effectiveEnd"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="留空表示长期有效"
              />
            </el-form-item>
            <el-form-item class="membership-form__wide" label="成员备注">
              <el-input v-model="createForm.remarks" type="textarea" :rows="3" resize="none" />
            </el-form-item>
            <el-form-item label="初始组织（可多选）">
              <el-select
                v-model="createForm.organizationIds"
                multiple
                :loading="relationOptionsLoading"
              >
                <el-option
                  v-for="option in resolvedOrganizationOptions"
                  :key="option.id"
                  :label="option.label"
                  :value="option.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="主要组织">
              <el-select
                v-model="createForm.primaryOrganizationId"
                clearable
                :loading="relationOptionsLoading"
              >
                <el-option
                  v-for="organizationId in createForm.organizationIds"
                  :key="organizationId"
                  :label="
                    resolvedOrganizationOptions.find((item) => item.id === organizationId)?.label ??
                    String(organizationId)
                  "
                  :value="organizationId"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="初始岗位（可多选）">
              <el-select
                v-model="createForm.positionIds"
                multiple
                :loading="relationOptionsLoading"
              >
                <el-option
                  v-for="option in resolvedPositionOptions"
                  :key="option.id"
                  :label="option.label"
                  :value="option.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="主要岗位">
              <el-select
                v-model="createForm.primaryPositionId"
                clearable
                :loading="relationOptionsLoading"
              >
                <el-option
                  v-for="positionId in createForm.positionIds"
                  :key="positionId"
                  :label="
                    resolvedPositionOptions.find((item) => item.id === positionId)?.label ??
                    String(positionId)
                  "
                  :value="positionId"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </div>

        <div v-show="createStep === 2" class="member-review">
          <el-alert
            title="用户、成员、组织与岗位归属将作为一个事务提交；任一失败均不创建部分关系。"
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
        </div>
      </section>
      <template #footer="{ requestClose }">
        <el-button
          v-resource-element="membersElements.local"
          :disabled="submitting || createTransitionPending"
          @click="requestClose"
          >取消</el-button
        >
        <el-button
          v-if="createStep > 0"
          v-resource-element="membersElements.local"
          :disabled="submitting || createTransitionPending"
          @click="previousCreateStep"
          >上一步</el-button
        >
        <el-button
          v-resource-element="membersElements.create"
          type="primary"
          :loading="submitting || createTransitionPending"
          :disabled="
            submitting ||
            createTransitionPending ||
            (createUserMode === 'new' && createUploadBlocked)
          "
          @click="finishCreate"
        >
          {{ createStep === 2 ? '创建成员' : '下一步' }}
        </el-button>
      </template>
    </FormDrawer>

    <MemberRelationDrawer
      v-if="relationVisible"
      v-model="relationVisible"
      :member="selected"
      :kind="relationMode"
      :relation="relationRecord"
      :ending="relationEnding"
      :load-options="loadRelationCandidates"
      :query-member="queryMemberDetail"
      :save="saveRelation"
      :end="endRelation"
      @saved="refreshDetail"
    />
    <MemberAdminDialog
      v-if="adminVisible"
      v-model="adminVisible"
      :member="selected"
      :query-member="queryMemberDetail"
      :change-admin="changeAdmin"
      :create-request-id="createAdminRequestId"
      @saved="refreshDetail"
    />

    <el-dialog
      v-bind="resourceElementAttributes(membersElements.memberStatus)"
      v-model="statusVisible"
      :title="`${selected.memberStatus === 'ACTIVE' ? '停用' : '启用'} Tenant 成员`"
      width="580"
    >
      <el-alert
        v-if="selected.isTenantAdmin"
        title="该成员是 Tenant 管理员。若为最后一名有效管理员，服务端将拒绝停用。"
        type="warning"
        :closable="false"
        show-icon
      />
      <p class="membership-confirm">
        {{
          selected.memberStatus === 'ACTIVE'
            ? `停用只影响 ${selected.realName || '未设置姓名'} 在“${selected.tenantName}”的进入资格，不改变全局用户与其他 Tenant 成员。`
            : '启用成员不会调整有效期；是否可进入仍由用户、Tenant、成员状态与有效期共同决定。'
        }}
      </p>
      <template #footer>
        <el-button v-resource-element="membersElements.local" @click="statusVisible = false"
          >取消</el-button
        >
        <el-button
          v-resource-element="membersElements.memberStatus"
          v-permission="IAM_PERMISSIONS.members.changeStatus"
          :type="selected.memberStatus === 'ACTIVE' ? 'warning' : 'success'"
          :loading="submitting"
          @click="finishStatusChange"
        >
          {{ selected.memberStatus === 'ACTIVE' ? '确认停用成员' : '确认启用成员' }}
        </el-button>
      </template>
    </el-dialog>
    <MemberRolesDrawer
      v-model="rolesVisible"
      :member="roleMember"
      :load-roles="loadMemberRoles"
      :update-roles="updateMemberRoles"
    />
  </AppPage>
</template>

<style scoped lang="scss">
.membership-workspace__hint {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.membership-workspace__alert {
  margin: var(--spacing-3) var(--spacing-4);
}

.membership-detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--spacing-5);
}

.membership-detail__hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--spacing-3);
}

.membership-detail__hero strong,
.membership-detail__hero span {
  display: block;
}

.membership-detail__hero strong {
  color: var(--text-primary);
  font-size: var(--font-size-lg);
}

.membership-detail__hero span {
  margin-top: var(--spacing-1);
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.membership-detail__status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-3);
}

.membership-detail__status-grid article {
  display: grid;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-default);
}

.membership-detail__status-grid article > span {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.membership-detail__status-grid :deep(.el-tag) {
  justify-self: start;
}

.membership-detail__sections {
  display: grid;
  gap: var(--spacing-5);
}

.membership-detail__sections h3 {
  margin: 0 0 var(--spacing-3);
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

.membership-detail__section-heading {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-3);
}

.membership-detail__section-heading h3 {
  margin: 0;
}

.membership-detail__sections :deep(.el-descriptions__table) {
  table-layout: fixed;
}

.membership-detail__sections :deep(.el-descriptions__content) {
  overflow-wrap: anywhere;
  white-space: normal;
}

.relation-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-3);
  color: var(--text-primary);
}

.relation-section__header small {
  display: block;
  margin-top: var(--spacing-1);
  color: var(--text-secondary);
}

.membership-form {
  display: grid;
  margin-top: var(--spacing-4);
}

.membership-form--grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--spacing-4);
}

.membership-form :deep(.el-input-number) {
  width: 100%;
}

.membership-form__wide {
  grid-column: 1 / -1;
}

.member-wizard {
  min-height: calc(var(--spacing-12) * 7);
  padding: var(--spacing-8) var(--spacing-2) var(--spacing-2);
}

.member-wizard__step,
.member-review {
  display: grid;
  gap: var(--spacing-4);
}

.member-review dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-3);
  margin: 0;
}

.member-review dl div {
  padding: var(--spacing-4);
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-default);
}

.member-review dt {
  margin-bottom: var(--spacing-2);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.member-review dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-weight: 600;
}

.membership-confirm {
  margin: var(--spacing-4) 0 0;
  color: var(--text-regular);
  line-height: 1.7;
}
</style>
