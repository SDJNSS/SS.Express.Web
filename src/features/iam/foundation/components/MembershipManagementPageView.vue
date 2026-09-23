<script setup lang="ts">
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
  TenantAssignmentOption,
  TenantMembershipSummary,
  UserTenantAssignmentSnapshot,
  UserTenantAssignmentUpdateValue,
  UserUpdateValue,
} from '../types/foundation'

type TenantAssignmentAction = 'unchanged' | 'update-admin' | 'restore' | 'remove' | 'add'

interface TenantAssignmentRow {
  key: string
  tenantUserId?: number
  tenantId: number
  tenantCode: string
  tenantName: string
  memberCode: string
  displayName: string
  memberStatus: 'ACTIVE' | 'DISABLED'
  isCurrentlyEffective: boolean
  membershipIsCurrentlyEffective: boolean
  tenantStatus: string
  tenantIsDeleted: boolean
  originalIsTenantAdmin: boolean
  isTenantAdmin: boolean
  memberVersion: string
  joinedAt: string
  leftAt: string
  action: TenantAssignmentAction
  source: 'membership' | 'candidate'
}

const props = defineProps<{
  records: MembershipRecord[]
  state: FoundationPreviewState
  organizationOptions?: FoundationSelectOption[]
  positionOptions?: FoundationSelectOption[]
  tenantOptions?: Array<{ id: number; code: string; name: string }>
  initialTenantId?: number
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
  changeStatus?: (
    target: 'member' | 'user',
    record: MembershipRecord,
    targetStatus: 'ACTIVE' | 'DISABLED',
  ) => Promise<void>
  inspectPermissions?: (record: MembershipRecord) => void
  queryUserTenants?: (userId: number) => Promise<UserTenantAssignmentSnapshot>
  loadTenantAssignmentOptions?: () => Promise<TenantAssignmentOption[]>
  saveUserTenants?: (
    value: UserTenantAssignmentUpdateValue,
  ) => Promise<UserTenantAssignmentSnapshot>
}>()

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
  userId: '',
  userName: '',
  realName: '',
  phone: '',
  email: '',
  organizationId: undefined,
  positionId: undefined,
  roleId: undefined,
  userStatus: '',
  memberStatus: '',
})
const committedQuery = reactive<MembershipQueryValue>({
  ...query,
  tenantIds: [...query.tenantIds],
})
let queryTenantSelectionExplicit = false
let committedTenantSelectionExplicit = false
function markTenantSelectionExplicit() {
  queryTenantSelectionExplicit = true
}
watch(resolvedTenantOptions, (options, previous) => {
  const previousIds = previous.map((tenant) => tenant.id)
  const nextIds = options.map((tenant) => tenant.id)
  for (const value of [query, committedQuery]) {
    const explicitlySelected =
      value === query ? queryTenantSelectionExplicit : committedTenantSelectionExplicit
    const wasAll =
      (previousIds.length > 0 || !explicitlySelected) &&
      value.tenantIds.length === previousIds.length &&
      previousIds.every((id) => value.tenantIds.includes(id))
    value.tenantIds = wasAll ? [...nextIds] : value.tenantIds.filter((id) => nextIds.includes(id))
  }
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
const relationFormRef = ref<FormInstance>()
const relationError = ref('')
const statusVisible = ref(false)
const statusTarget = ref<'member' | 'user'>('member')
const tenantAssignmentVisible = ref(false)
const tenantAssignmentConfirmVisible = ref(false)
const tenantAssignmentLoading = ref(false)
const tenantAssignmentRetryBlocked = ref(false)
const tenantAssignmentError = ref('')
const tenantAssignmentSnapshot = ref<UserTenantAssignmentSnapshot>()
const tenantAssignmentOptions = ref<TenantAssignmentOption[]>([])
const tenantAssignmentRows = ref<TenantAssignmentRow[]>([])
const tenantCandidateId = ref<number>()

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
const relationForm = reactive<MemberRelationValue>({
  targetId: undefined,
  primary: false,
  effectiveStart: '',
  effectiveEnd: '',
  remarks: '',
})
const relationRules: FormRules<MemberRelationValue> = {
  targetId: [
    { type: 'number', min: 1, required: true, message: '请选择目标归属', trigger: 'change' },
  ],
  effectiveStart: [{ required: true, message: '请选择有效开始时间', trigger: 'change' }],
}
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

const columns: DataTableColumn[] = [
  { prop: 'realName', label: '用户名称', minWidth: 140, fixed: 'left' },
  { label: 'Tenant', minWidth: 188, fixed: 'left', slot: 'tenant' },
  { prop: 'memberCode', label: '成员编号', minWidth: 118 },
  { prop: 'displayName', label: '昵称', minWidth: 148 },
  { prop: 'userName', label: '登录账号', minWidth: 124 },
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
  { label: '操作', width: 300, fixed: 'right', slot: 'actions' },
]

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
            label: '姓名 / 昵称',
            value: `${reviewValue(createForm.realName)} / ${reviewValue(createForm.nickName)}`,
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
      label: '成员编号 / Tenant 显示名称',
      value: '由服务端按租户编码与成员 ID / 登录账号自动生成',
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

const currentTenantAssignmentRows = computed(() =>
  tenantAssignmentRows.value.filter(
    (row) => row.source === 'membership' && row.membershipIsCurrentlyEffective,
  ),
)
const historicalTenantAssignmentRows = computed(() =>
  tenantAssignmentRows.value.filter(
    (row) => row.source === 'membership' && !currentTenantAssignmentRows.value.includes(row),
  ),
)
const addedTenantAssignmentRows = computed(() =>
  tenantAssignmentRows.value.filter((row) => row.source === 'candidate'),
)
const availableTenantAssignmentOptions = computed(() => {
  const existingIds = new Set(tenantAssignmentRows.value.map((row) => row.tenantId))
  return tenantAssignmentOptions.value.filter(
    (tenant) => tenant.status === 'ACTIVE' && !existingIds.has(tenant.id),
  )
})
const tenantAssignmentChanges = computed(() =>
  tenantAssignmentRows.value.filter((row) => row.action !== 'unchanged'),
)
const tenantAssignmentChangeSummary = computed(() => ({
  add: tenantAssignmentChanges.value.filter((row) => row.action === 'add').length,
  restore: tenantAssignmentChanges.value.filter((row) => row.action === 'restore').length,
  remove: tenantAssignmentChanges.value.filter((row) => row.action === 'remove').length,
  admin: tenantAssignmentChanges.value.filter((row) => row.action === 'update-admin').length,
}))
const visibleRecords = computed(() => {
  if (props.state !== 'ready') return []
  // Production filtering belongs to QueryUsers; do not re-interpret its tenant/role joins locally.
  if (props.queryRecords) return props.records
  const exactUserName = committedQuery.userName.trim().toLocaleLowerCase('zh-CN')
  const userId = Number(committedQuery.userId)
  const tenantIds = new Set(committedQuery.tenantIds)
  return props.records.filter((record) => {
    const hasMember = hasMemberContext(record)
    const matchesUserId = !committedQuery.userId || record.userId === userId
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
      matchesUserId &&
      matchesTenant &&
      matchesUserName &&
      matchesIdentity &&
      (!committedQuery.organizationId ||
        record.organizations.some(
          (item) => item.targetId === committedQuery.organizationId && item.isCurrentlyEffective,
        )) &&
      (!committedQuery.positionId ||
        record.positions.some(
          (item) => item.targetId === committedQuery.positionId && item.isCurrentlyEffective,
        )) &&
      (!committedQuery.userStatus || record.userStatus === committedQuery.userStatus) &&
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

function tenantAssignmentRow(member: TenantMembershipSummary): TenantAssignmentRow {
  return {
    key: `membership-${member.id}`,
    tenantUserId: member.id,
    tenantId: member.tenantId,
    tenantCode: member.tenantCode,
    tenantName: member.tenantName,
    memberCode: member.memberCode,
    displayName: member.displayName,
    memberStatus: member.status,
    isCurrentlyEffective: member.isCurrentlyEffective,
    membershipIsCurrentlyEffective: member.membershipIsCurrentlyEffective,
    tenantStatus: member.tenantStatus,
    tenantIsDeleted: member.tenantIsDeleted,
    originalIsTenantAdmin: member.isTenantAdmin,
    isTenantAdmin: member.isTenantAdmin,
    memberVersion: member.memberVersion,
    joinedAt: member.joinedAt,
    leftAt: member.leftAt,
    action: 'unchanged',
    source: 'membership',
  }
}

function applyTenantAssignmentSnapshot(snapshot: UserTenantAssignmentSnapshot) {
  tenantAssignmentSnapshot.value = snapshot
  tenantAssignmentRows.value = snapshot.memberships.map(tenantAssignmentRow)
  selected.value = {
    ...selected.value,
    userVersion: snapshot.userVersion,
    tenantMemberships: snapshot.memberships,
  }
}

function fallbackTenantAssignmentSnapshot(): UserTenantAssignmentSnapshot {
  return {
    userId: selected.value.userId,
    userVersion: selected.value.userVersion,
    memberships: selected.value.tenantMemberships,
  }
}

let tenantAssignmentLoadSequence = 0
watch(tenantAssignmentVisible, (visible) => {
  if (!visible) {
    tenantAssignmentLoadSequence += 1
    tenantAssignmentLoading.value = false
  }
})

async function loadTenantAssignments() {
  const sequence = ++tenantAssignmentLoadSequence
  const userId = selected.value.userId
  const isCurrent = () =>
    sequence === tenantAssignmentLoadSequence &&
    tenantAssignmentVisible.value &&
    selected.value.userId === userId
  tenantAssignmentLoading.value = true
  tenantAssignmentError.value = ''
  try {
    const [snapshot, options] = await Promise.all([
      props.queryUserTenants?.(userId) ?? Promise.resolve(fallbackTenantAssignmentSnapshot()),
      props.loadTenantAssignmentOptions?.() ??
        Promise.resolve(
          resolvedTenantOptions.value.map((tenant) => ({ ...tenant, status: 'ACTIVE' as const })),
        ),
    ])
    if (!isCurrent()) return
    if (snapshot.userId !== userId) throw new Error('租户归属响应用户不匹配，请重新加载')
    applyTenantAssignmentSnapshot(snapshot)
    tenantAssignmentOptions.value = options
    tenantCandidateId.value = undefined
    tenantAssignmentRetryBlocked.value = false
  } catch (error) {
    if (!isCurrent()) return
    tenantAssignmentError.value =
      error instanceof Error ? error.message : '租户归属加载失败，请重新加载'
  } finally {
    if (isCurrent()) tenantAssignmentLoading.value = false
  }
}

function openTenantAssignments() {
  tenantAssignmentVisible.value = true
  tenantAssignmentConfirmVisible.value = false
  void loadTenantAssignments()
}

function resetTenantAssignmentAction(row: TenantAssignmentRow) {
  row.isTenantAdmin = row.originalIsTenantAdmin
  row.action = 'unchanged'
}

function toggleTenantAssignmentRemoval(row: TenantAssignmentRow) {
  if (row.source === 'candidate') {
    tenantAssignmentRows.value = tenantAssignmentRows.value.filter((item) => item.key !== row.key)
    return
  }
  if (row.action === 'remove') resetTenantAssignmentAction(row)
  else row.action = 'remove'
}

function toggleTenantAssignmentRestore(row: TenantAssignmentRow) {
  if (row.action === 'restore') resetTenantAssignmentAction(row)
  else {
    row.isTenantAdmin = row.originalIsTenantAdmin
    row.action = 'restore'
  }
}

function updateTenantAssignmentAdmin(row: TenantAssignmentRow, value: boolean) {
  row.isTenantAdmin = value
  if (row.action === 'restore' || row.action === 'add') return
  row.action = value === row.originalIsTenantAdmin ? 'unchanged' : 'update-admin'
}

function addTenantAssignment() {
  const tenant = tenantAssignmentOptions.value.find((item) => item.id === tenantCandidateId.value)
  if (!tenant) return
  tenantAssignmentRows.value.push({
    key: `candidate-${tenant.id}`,
    tenantId: tenant.id,
    tenantCode: tenant.code,
    tenantName: tenant.name,
    memberCode: '',
    displayName: '',
    memberStatus: 'ACTIVE',
    isCurrentlyEffective: false,
    membershipIsCurrentlyEffective: true,
    tenantStatus: tenant.status,
    tenantIsDeleted: false,
    originalIsTenantAdmin: false,
    isTenantAdmin: false,
    memberVersion: '',
    joinedAt: '',
    leftAt: '',
    action: 'add',
    source: 'candidate',
  })
  tenantCandidateId.value = undefined
}

function prepareTenantAssignmentConfirmation() {
  if (
    !tenantAssignmentChanges.value.length ||
    tenantAssignmentLoading.value ||
    tenantAssignmentRetryBlocked.value
  )
    return
  tenantAssignmentError.value = ''
  tenantAssignmentConfirmVisible.value = true
}

function tenantAssignmentUpdateValue(): UserTenantAssignmentUpdateValue | undefined {
  const snapshot = tenantAssignmentSnapshot.value
  if (!snapshot) return undefined
  return {
    userId: snapshot.userId,
    userVersion: snapshot.userVersion,
    originalMemberships: snapshot.memberships.map((membership) => ({
      tenantUserId: membership.id,
      memberVersion: membership.memberVersion,
    })),
    tenants: tenantAssignmentRows.value
      .filter((row) => ['add', 'restore', 'update-admin'].includes(row.action))
      .map((row) => ({
        tenantId: row.tenantId,
        isTenantAdmin: row.isTenantAdmin,
        restore: row.action === 'restore',
      })),
    removeTenantUserIds: tenantAssignmentRows.value
      .filter((row) => row.action === 'remove' && row.tenantUserId)
      .map((row) => row.tenantUserId as number),
  }
}

async function finishTenantAssignmentUpdate() {
  if (submitting.value) return
  const value = tenantAssignmentUpdateValue()
  if (!value) return
  if (!props.saveUserTenants) {
    tenantAssignmentConfirmVisible.value = false
    tenantAssignmentVisible.value = false
    emit('action', '用户租户归属候选变更已确认')
    return
  }
  submitting.value = true
  tenantAssignmentError.value = ''
  try {
    const snapshot = await props.saveUserTenants(value)
    applyTenantAssignmentSnapshot(snapshot)
    tenantAssignmentConfirmVisible.value = false
    tenantAssignmentVisible.value = false
  } catch (error) {
    tenantAssignmentRetryBlocked.value = true
    tenantAssignmentError.value = `${
      error instanceof Error ? error.message : '用户租户归属更新失败'
    }。已保留当前变更，可重新加载最新快照后再处理。`
  } finally {
    submitting.value = false
  }
}

function reloadTenantAssignmentsFromConfirmation() {
  tenantAssignmentConfirmVisible.value = false
  void loadTenantAssignments()
}

function commitQuery(): MembershipQueryValue {
  queryTenantSelectionExplicit = true
  committedTenantSelectionExplicit = true
  const value = { ...query, tenantIds: [...query.tenantIds] }
  Object.assign(committedQuery, value)
  return value
}

function search() {
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
    userId: '',
    userName: '',
    realName: '',
    phone: '',
    email: '',
    organizationId: undefined,
    positionId: undefined,
    roleId: undefined,
    userStatus: '',
    memberStatus: '',
  })
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

function openRelation(mode: 'organization' | 'position') {
  if (!hasMemberContext(selected.value) || detailLoading.value || detailError.value) return
  relationMode.value = mode
  relationError.value = ''
  Object.assign(relationForm, {
    targetId: undefined,
    primary: false,
    effectiveStart: '',
    effectiveEnd: '',
    remarks: '',
  })
  relationVisible.value = true
  if (!props.queryFilterOptions) void props.loadRelationOptions?.(selected.value.tenantId, mode)
}

function selectAndOpenStatus(record: MembershipRecord, target: 'member' | 'user') {
  if (target === 'member' && !hasMemberContext(record)) return
  selected.value = record
  statusTarget.value = target
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

async function finishRelation() {
  if (submitting.value || props.relationOptionsLoading) return
  relationError.value = ''
  if (!(await relationFormRef.value?.validate().catch(() => false))) return
  if (!relationForm.targetId) return
  if (relationForm.effectiveEnd && relationForm.effectiveEnd <= relationForm.effectiveStart) {
    relationError.value = '有效结束时间必须晚于开始时间'
    return
  }
  if (!props.saveRelation) {
    relationVisible.value = false
    emit('action', '成员归属候选已保存并重新加载完整归属')
    return
  }
  submitting.value = true
  try {
    await props.saveRelation(relationMode.value, selected.value, { ...relationForm })
    relationVisible.value = false
    await refreshDetail()
  } catch (error) {
    relationError.value = error instanceof Error ? error.message : '归属保存失败，请重试'
  } finally {
    submitting.value = false
  }
}

async function finishStatusChange() {
  if (submitting.value) return
  if (!props.changeStatus) {
    statusVisible.value = false
    emit(
      'action',
      statusTarget.value === 'member' ? '成员状态候选已确认' : '全局用户状态候选已确认',
    )
    return
  }
  submitting.value = true
  try {
    const current =
      statusTarget.value === 'member' ? selected.value.memberStatus : selected.value.userStatus
    await props.changeStatus(
      statusTarget.value,
      selected.value,
      current === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
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
  <AppPage class="membership-page">
    <ListPageTemplate>
      <template #header>
        <PageHeader
          title="用户与成员"
          description="统一查询可访问 Tenant 中的用户、成员关系、有效期及组织岗位归属"
        />
      </template>

      <template #search>
        <SearchPanel
          :loading="state === 'loading'"
          collapsible
          @search="search"
          @reset="resetSearch"
        >
          <el-form-item label="Tenant">
            <el-select
              v-model="query.tenantIds"
              clearable
              collapse-tags
              collapse-tags-tooltip
              filterable
              :max-collapse-tags="1"
              multiple
              placeholder="请选择 Tenant"
              @change="markTenantSelectionExplicit"
            >
              <el-option
                v-for="tenant in resolvedTenantOptions"
                :key="tenant.id"
                :label="`${tenant.name} · ${tenant.code}`"
                :value="tenant.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="用户名称">
            <el-input
              v-model="query.realName"
              clearable
              placeholder="输入用户姓名"
              @keyup.enter="searchOnEnter"
            />
          </el-form-item>
          <el-form-item label="用户手机">
            <el-input
              v-model="query.phone"
              clearable
              placeholder="输入完整手机号"
              @keyup.enter="searchOnEnter"
            />
          </el-form-item>
          <el-form-item label="用户邮箱">
            <el-input
              v-model="query.email"
              clearable
              placeholder="输入完整邮箱"
              @keyup.enter="searchOnEnter"
            />
          </el-form-item>
          <el-form-item v-for="filter in entityFilters" :key="filter.key" :label="filter.label">
            <PagedEntitySelect
              v-model="query[filter.key]"
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
          <template #advanced>
            <el-form-item label="用户 ID">
              <el-input
                v-model="query.userId"
                clearable
                placeholder="精确用户 ID"
                @keyup.enter="searchOnEnter"
              />
            </el-form-item>
            <el-form-item label="完整登录账号">
              <el-input
                v-model="query.userName"
                clearable
                placeholder="精确账号"
                @keyup.enter="searchOnEnter"
              />
            </el-form-item>
            <el-form-item label="用户状态">
              <el-select v-model="query.userStatus" clearable placeholder="全部状态">
                <el-option label="启用" value="ACTIVE" />
                <el-option label="停用" value="DISABLED" />
              </el-select>
            </el-form-item>
            <el-form-item label="成员状态">
              <el-select v-model="query.memberStatus" clearable placeholder="全部状态">
                <el-option label="启用" value="ACTIVE" />
                <el-option label="停用" value="DISABLED" />
              </el-select>
            </el-form-item>
          </template>
          <template #footer-leading>
            <el-button
              v-permission="IAM_PERMISSIONS.members.create"
              type="primary"
              @click="openCreate"
            >
              <Icon icon="mdi:plus" width="18" aria-hidden="true" />
              新增 Tenant 成员
            </el-button>
          </template>
        </SearchPanel>
      </template>

      <template #toolbar>
        <TableToolbar
          title="用户与成员列表"
          :total="visibleRecords.length"
          :refreshing="state === 'loading'"
          @refresh="emit('retry')"
        >
          <template #summary>
            <span class="membership-workspace__hint">
              按所选 Tenant 查询；用户状态、成员状态与当前有效性分别判断
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
          <el-button link type="primary" @click="emit('retry')">重新加载</el-button>
        </template>
      </el-alert>

      <DataTable :data="visibleRecords" :columns="columns" :loading="state === 'loading'">
        <template #tenant="{ row }">
          {{
            hasMemberContext(asMember(row))
              ? `${asMember(row).tenantName} · ${asMember(row).tenantCode}`
              : '无成员上下文'
          }}
        </template>
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
        <template #actions="{ row }">
          <RowActionGrid
            density="compact"
            :aria-label="`${asMember(row).displayName || asMember(row).userName} 的操作`"
          >
            <el-button link type="primary" @click.stop="openDetail(asMember(row))">详情</el-button>
            <el-button
              v-if="hasMemberContext(asMember(row))"
              v-permission="IAM_PERMISSIONS.members.queryPermissions"
              link
              type="primary"
              @click.stop="inspectPermissions?.(asMember(row))"
              >角色与权限</el-button
            >
            <el-button
              v-permission="IAM_PERMISSIONS.members.updateUser"
              link
              type="primary"
              @click.stop="openUserEdit(asMember(row))"
              >编辑用户</el-button
            >
            <el-button
              v-if="hasMemberContext(asMember(row))"
              v-permission="IAM_PERMISSIONS.members.update"
              link
              type="primary"
              @click.stop="openMemberEdit(asMember(row))"
            >
              编辑成员资料
            </el-button>
            <el-button
              v-if="hasMemberContext(asMember(row))"
              v-permission="IAM_PERMISSIONS.members.changeStatus"
              link
              :type="asMember(row).memberStatus === 'ACTIVE' ? 'warning' : 'success'"
              @click.stop="selectAndOpenStatus(asMember(row), 'member')"
            >
              {{ asMember(row).memberStatus === 'ACTIVE' ? '停用成员' : '启用成员' }}
            </el-button>
            <el-button
              v-permission="IAM_PERMISSIONS.members.changeUserStatus"
              link
              :type="asMember(row).userStatus === 'ACTIVE' ? 'warning' : 'success'"
              @click.stop="selectAndOpenStatus(asMember(row), 'user')"
            >
              {{ asMember(row).userStatus === 'ACTIVE' ? '停用全局用户' : '启用全局用户' }}
            </el-button>
          </RowActionGrid>
        </template>
      </DataTable>

      <template #pagination>
        <AppPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="visibleRecords.length"
          @change="emit('action', '用户与成员分页状态已更新')"
        />
      </template>
    </ListPageTemplate>

    <DetailDrawer
      v-model="detailVisible"
      :title="`${selected.displayName || selected.realName || selected.userName} · 身份详情`"
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
        <el-button link type="primary" @click="refreshDetail">重新加载详情</el-button>
      </el-alert>
      <div v-else class="membership-detail">
        <header class="membership-detail__hero">
          <el-avatar :size="52" :src="selected.avatarUrl">
            {{ (selected.displayName || selected.realName || selected.userName).slice(0, 1) }}
          </el-avatar>
          <div>
            <strong>{{ selected.displayName || selected.realName || selected.userName }}</strong>
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
            :aria-label="`${selected.displayName} 的权限`"
          >
            <el-button
              v-permission="IAM_PERMISSIONS.members.queryPermissions"
              type="primary"
              plain
              @click="inspectPermissions?.(selected)"
              >角色与权限</el-button
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
                <h3>全局用户</h3>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="用户 ID">{{ selected.userId }}</el-descriptions-item>
                  <el-descriptions-item label="登录账号">{{
                    selected.userName
                  }}</el-descriptions-item>
                  <el-descriptions-item label="姓名">{{ selected.realName }}</el-descriptions-item>
                  <el-descriptions-item label="昵称">{{
                    selected.nickName || '未设置'
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
                <h3>当前 Tenant 成员</h3>
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
                  <el-descriptions-item label="Tenant 显示名称">{{
                    selected.displayName
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
                v-permission="IAM_PERMISSIONS.members.saveOrganization"
                type="primary"
                plain
                @click="openRelation('organization')"
                >新增组织归属</el-button
              >
            </div>
            <DataTable :data="selected.organizations" :columns="relationColumns" height="360">
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
            </DataTable>
          </el-tab-pane>

          <el-tab-pane v-if="hasMemberContext(selected)" label="岗位归属" name="positions">
            <div class="relation-section__header">
              <div>
                <strong>当前与历史岗位归属</strong>
                <small>岗位归属不产生任何角色或权限</small>
              </div>
              <el-button
                v-permission="IAM_PERMISSIONS.members.savePosition"
                type="primary"
                plain
                @click="openRelation('position')"
                >新增岗位归属</el-button
              >
            </div>
            <DataTable :data="selected.positions" :columns="relationColumns" height="360">
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
            </DataTable>
          </el-tab-pane>

          <el-tab-pane label="租户" name="tenants">
            <div class="relation-section__header">
              <el-button
                v-permission="IAM_PERMISSIONS.members.updateUserTenants"
                type="primary"
                plain
                @click="openTenantAssignments"
              >
                编辑租户归属
              </el-button>
            </div>
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
      v-model="tenantAssignmentVisible"
      title="编辑用户租户归属"
      size="min(980px, 92%)"
      confirm-button-text="复核变更"
      :submitting="submitting"
      :dirty="tenantAssignmentChanges.length > 0"
      :confirm-disabled="
        tenantAssignmentLoading ||
        Boolean(tenantAssignmentError) ||
        tenantAssignmentRetryBlocked ||
        !tenantAssignmentChanges.length
      "
      @confirm="prepareTenantAssignmentConfirmation"
    >
      <div class="tenant-assignment-editor">
        <el-alert
          title="仅集团超级管理员可调整。历史关系不会因未选择而改变，必须显式恢复或正式移除。"
          type="warning"
          :closable="false"
          show-icon
        />
        <el-alert
          v-if="selected.userStatus !== 'ACTIVE'"
          title="全局用户当前已停用：可正式移除关系，但不能新增、恢复或授予 Tenant 管理员身份。"
          type="warning"
          :closable="false"
          show-icon
        />

        <div v-if="tenantAssignmentError" class="tenant-assignment-editor__error" role="alert">
          <el-alert :title="tenantAssignmentError" type="error" :closable="false" show-icon />
          <el-button :loading="tenantAssignmentLoading" @click="loadTenantAssignments">
            重新加载最新快照
          </el-button>
        </div>

        <div v-loading="tenantAssignmentLoading" class="tenant-assignment-editor__content">
          <section>
            <div class="tenant-assignment-editor__section-title">
              <div>
                <h3>成员当前有效关系</h3>
                <p>按成员自身状态与有效期分组；可调整管理员身份或正式移除。</p>
              </div>
              <StatusTag :label="`${currentTenantAssignmentRows.length} 项`" tone="success" />
            </div>
            <el-table :data="currentTenantAssignmentRows" stripe>
              <el-table-column prop="tenantName" label="Tenant" min-width="180" />
              <el-table-column prop="tenantCode" label="编码" min-width="120" />
              <el-table-column prop="memberCode" label="成员编号" min-width="120" />
              <el-table-column label="Tenant 管理员" width="150">
                <template #default="{ row }">
                  <el-switch
                    :model-value="row.isTenantAdmin"
                    :disabled="
                      row.action === 'remove' ||
                      row.tenantIsDeleted ||
                      row.tenantStatus !== 'ACTIVE' ||
                      (selected.userStatus !== 'ACTIVE' && !row.isTenantAdmin)
                    "
                    :aria-label="`${row.tenantName} Tenant 管理员身份`"
                    @change="updateTenantAssignmentAdmin(row, Boolean($event))"
                  />
                </template>
              </el-table-column>
              <el-table-column label="待执行动作" min-width="124">
                <template #default="{ row }">
                  <StatusTag
                    :label="
                      row.action === 'remove'
                        ? '正式移除'
                        : row.action === 'update-admin'
                          ? '调整管理员'
                          : '保持原状'
                    "
                    :tone="
                      row.action === 'remove'
                        ? 'danger'
                        : row.action === 'update-admin'
                          ? 'warning'
                          : 'info'
                    "
                  />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="132" fixed="right">
                <template #default="{ row }">
                  <el-button
                    link
                    :type="row.action === 'remove' ? 'primary' : 'danger'"
                    @click="toggleTenantAssignmentRemoval(row)"
                  >
                    {{ row.action === 'remove' ? '撤销移除' : '正式移除' }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <section>
            <div class="tenant-assignment-editor__section-title">
              <div>
                <h3>历史或非当前有效关系</h3>
                <p>默认保持原状；恢复会重新建立有效成员身份，正式移除会收回关联权限。</p>
              </div>
              <StatusTag :label="`${historicalTenantAssignmentRows.length} 项`" tone="info" />
            </div>
            <el-table :data="historicalTenantAssignmentRows" stripe>
              <el-table-column prop="tenantName" label="Tenant" min-width="180" />
              <el-table-column prop="tenantCode" label="编码" min-width="120" />
              <el-table-column label="关系状态" min-width="136">
                <template #default="{ row }">
                  <StatusTag
                    :label="
                      row.tenantIsDeleted
                        ? 'Tenant 已删除'
                        : row.isCurrentlyEffective
                          ? 'Tenant 不可用'
                          : '历史/未生效'
                    "
                    :tone="row.tenantIsDeleted ? 'danger' : 'info'"
                  />
                </template>
              </el-table-column>
              <el-table-column label="恢复为管理员" width="150">
                <template #default="{ row }">
                  <el-switch
                    :model-value="row.isTenantAdmin"
                    :disabled="row.action !== 'restore'"
                    :aria-label="`${row.tenantName} 恢复为 Tenant 管理员`"
                    @change="updateTenantAssignmentAdmin(row, Boolean($event))"
                  />
                </template>
              </el-table-column>
              <el-table-column label="待执行动作" min-width="112">
                <template #default="{ row }">
                  <StatusTag
                    :label="
                      row.action === 'restore'
                        ? '恢复'
                        : row.action === 'remove'
                          ? '正式移除'
                          : '保持原状'
                    "
                    :tone="
                      row.action === 'restore'
                        ? 'success'
                        : row.action === 'remove'
                          ? 'danger'
                          : 'info'
                    "
                  />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="188" fixed="right">
                <template #default="{ row }">
                  <RowActionGrid :aria-label="`${row.tenantName} 历史关系操作`">
                    <el-button
                      link
                      type="success"
                      :disabled="
                        selected.userStatus !== 'ACTIVE' ||
                        row.tenantIsDeleted ||
                        row.tenantStatus !== 'ACTIVE' ||
                        row.action === 'remove'
                      "
                      @click="toggleTenantAssignmentRestore(row)"
                    >
                      {{ row.action === 'restore' ? '撤销恢复' : '恢复' }}
                    </el-button>
                    <el-button
                      link
                      :type="row.action === 'remove' ? 'primary' : 'danger'"
                      :disabled="row.action === 'restore'"
                      @click="toggleTenantAssignmentRemoval(row)"
                    >
                      {{ row.action === 'remove' ? '撤销移除' : '正式移除' }}
                    </el-button>
                  </RowActionGrid>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <section>
            <div class="tenant-assignment-editor__section-title">
              <div>
                <h3>新增 Tenant 关系</h3>
                <p>候选项来自 Tenant 管理接口的完整分页结果，只允许选择启用的 Tenant。</p>
              </div>
            </div>
            <div class="tenant-assignment-editor__add">
              <el-select
                v-model="tenantCandidateId"
                aria-label="选择新增 Tenant"
                filterable
                clearable
                :disabled="selected.userStatus !== 'ACTIVE'"
                placeholder="选择启用的 Tenant"
              >
                <el-option
                  v-for="tenant in availableTenantAssignmentOptions"
                  :key="tenant.id"
                  :label="`${tenant.name} · ${tenant.code}`"
                  :value="tenant.id"
                />
              </el-select>
              <el-button
                type="primary"
                plain
                :disabled="selected.userStatus !== 'ACTIVE' || !tenantCandidateId"
                @click="addTenantAssignment"
              >
                添加 Tenant
              </el-button>
            </div>
            <el-table
              v-if="addedTenantAssignmentRows.length"
              :data="addedTenantAssignmentRows"
              stripe
            >
              <el-table-column prop="tenantName" label="Tenant" min-width="180" />
              <el-table-column prop="tenantCode" label="编码" min-width="120" />
              <el-table-column label="Tenant 管理员" width="150">
                <template #default="{ row }">
                  <el-switch
                    :model-value="row.isTenantAdmin"
                    :disabled="selected.userStatus !== 'ACTIVE'"
                    :aria-label="`${row.tenantName} 新成员 Tenant 管理员身份`"
                    @change="updateTenantAssignmentAdmin(row, Boolean($event))"
                  />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="{ row }">
                  <el-button link type="danger" @click="toggleTenantAssignmentRemoval(row)">
                    移除草稿
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </section>
        </div>
      </div>
    </FormDrawer>

    <el-dialog v-model="tenantAssignmentConfirmVisible" title="确认更新用户租户归属" width="620">
      <el-alert
        v-if="tenantAssignmentError"
        :title="tenantAssignmentError"
        type="error"
        :closable="false"
        show-icon
      />
      <p class="membership-confirm">
        本次将新增 {{ tenantAssignmentChangeSummary.add }} 项、恢复
        {{ tenantAssignmentChangeSummary.restore }} 项、调整管理员身份
        {{ tenantAssignmentChangeSummary.admin }} 项、正式移除
        {{ tenantAssignmentChangeSummary.remove }} 项。
      </p>
      <el-alert
        v-if="tenantAssignmentChangeSummary.remove"
        title="正式移除会收回对应成员的角色及关联权限，并结束相关组织、岗位归属。"
        type="error"
        :closable="false"
        show-icon
      />
      <el-alert
        v-if="tenantAssignmentChangeSummary.restore"
        title="恢复只恢复成员身份，不会恢复历史角色、组织或岗位授权。"
        type="warning"
        :closable="false"
        show-icon
      />
      <template #footer>
        <el-button :disabled="submitting" @click="tenantAssignmentConfirmVisible = false">
          返回检查
        </el-button>
        <el-button
          v-if="tenantAssignmentRetryBlocked"
          type="primary"
          :disabled="submitting"
          @click="reloadTenantAssignmentsFromConfirmation"
        >
          重新加载最新快照
        </el-button>
        <el-button
          v-else
          :type="tenantAssignmentChangeSummary.remove ? 'danger' : 'primary'"
          :loading="submitting"
          @click="finishTenantAssignmentUpdate"
        >
          确认更新租户归属
        </el-button>
      </template>
    </el-dialog>

    <FormDrawer
      v-model="editVisible"
      :title="editMode === 'member' ? '编辑 Tenant 成员' : '编辑全局用户'"
      size="min(900px, 88%)"
      :confirm-button-text="editMode === 'member' ? '保存成员信息' : '保存全局资料'"
      :submitting="submitting"
      :confirm-disabled="editMode === 'user' && editUploadBlocked"
      @confirm="finishEdit"
    >
      <el-alert
        :title="
          editMode === 'member'
            ? `只更新 ${selected.tenantName} 的成员资料；用户、Tenant 与成员状态不可在此修改。`
            : '表单对应 UpdateUser 可编辑字段（含头像文件 ID）；用户状态和密码不属于该接口。'
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
          <el-form-item label="Tenant 显示名称"
            ><el-input v-model="editMemberForm.displayName" disabled
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
          <el-form-item label="登录账号"><el-input v-model="editUserForm.userName" /></el-form-item>
          <el-form-item label="姓名"><el-input v-model="editUserForm.realName" /></el-form-item>
          <el-form-item label="昵称"><el-input v-model="editUserForm.nickName" /></el-form-item>
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
      title="新增 Tenant 成员"
      size="min(1000px, 92%)"
      :confirm-button-text="createStep === 2 ? '创建成员' : '下一步'"
      :submitting="submitting"
      :confirm-disabled="createUserMode === 'new' && createUploadBlocked"
      @confirm="finishCreate"
    >
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
            <el-form-item label="目标 Tenant" prop="tenantId">
              <el-select v-model="createForm.tenantId">
                <el-option
                  v-for="tenant in resolvedTenantOptions"
                  :key="tenant.id"
                  :label="`${tenant.name} · ${tenant.code}`"
                  :value="tenant.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="Tenant ID"
              ><el-input :model-value="createForm.tenantId" disabled
            /></el-form-item>
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
              <el-form-item label="昵称"><el-input v-model="createForm.nickName" /></el-form-item>
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
        <el-button :disabled="submitting || createTransitionPending" @click="requestClose"
          >取消</el-button
        >
        <el-button
          v-if="createStep > 0"
          :disabled="submitting || createTransitionPending"
          @click="previousCreateStep"
          >上一步</el-button
        >
        <el-button
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

    <FormDrawer
      v-model="relationVisible"
      :title="relationMode === 'organization' ? '维护组织归属' : '维护岗位归属'"
      :confirm-button-text="relationMode === 'organization' ? '保存组织归属' : '保存岗位归属'"
      size="min(760px, 86%)"
      :submitting="submitting"
      :confirm-disabled="relationOptionsLoading"
      @confirm="finishRelation"
    >
      <el-alert
        :title="
          relationMode === 'organization'
            ? '仅可选择当前 Tenant 的启用组织；同一时点最多一个主要组织。'
            : '岗位归属不产生任何角色或权限；同一时点最多一个主要岗位。'
        "
        type="info"
        :closable="false"
        show-icon
      />
      <el-alert
        v-if="relationError"
        :title="relationError"
        type="error"
        :closable="false"
        show-icon
      />
      <el-form
        ref="relationFormRef"
        :model="relationForm"
        :rules="relationRules"
        :disabled="submitting"
        scroll-to-error
        class="membership-form membership-form--grid"
        label-position="top"
      >
        <el-form-item label="关系 ID"
          ><el-input placeholder="新增时由服务端生成" disabled
        /></el-form-item>
        <el-form-item label="版本"><el-input placeholder="新增时为空" disabled /></el-form-item>
        <el-form-item
          class="membership-form__wide"
          :label="relationMode === 'organization' ? '目标组织' : '目标岗位'"
          prop="targetId"
        >
          <PagedEntitySelect
            v-model="relationForm.targetId"
            :label="relationMode === 'organization' ? '目标组织' : '目标岗位'"
            :scope-key="`${selected.userId}:${selected.tenantId}:${relationMode}`"
            :active="relationVisible"
            :disabled="submitting"
            :placeholder="relationMode === 'organization' ? '选择启用组织' : '选择启用岗位'"
            :load-options="loadRelationCandidates"
          />
        </el-form-item>
        <el-form-item label="归属类型">
          <el-switch
            v-model="relationForm.primary"
            active-text="主要"
            inactive-text="辅助 / 兼职"
          />
        </el-form-item>
        <el-form-item label="Tenant 成员 ID"
          ><el-input :model-value="selected.id" disabled
        /></el-form-item>
        <el-form-item label="有效开始时间（Asia/Shanghai）" prop="effectiveStart">
          <el-date-picker
            v-model="relationForm.effectiveStart"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择有效开始时间"
          />
        </el-form-item>
        <el-form-item label="有效结束时间（Asia/Shanghai）">
          <el-date-picker
            v-model="relationForm.effectiveEnd"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="留空表示长期有效"
          />
        </el-form-item>
        <el-form-item class="membership-form__wide" label="备注">
          <el-input v-model="relationForm.remarks" type="textarea" :rows="4" resize="none" />
        </el-form-item>
      </el-form>
    </FormDrawer>

    <el-dialog
      v-model="statusVisible"
      :title="
        statusTarget === 'member'
          ? `${selected.memberStatus === 'ACTIVE' ? '停用' : '启用'} Tenant 成员`
          : `${selected.userStatus === 'ACTIVE' ? '停用' : '启用'}全局用户`
      "
      width="580"
    >
      <el-alert
        v-if="statusTarget === 'member' && selected.isTenantAdmin"
        title="该成员是 Tenant 管理员。若为最后一名有效管理员，服务端将拒绝停用。"
        type="warning"
        :closable="false"
        show-icon
      />
      <el-alert
        v-else-if="statusTarget === 'user'"
        title="全局用户停用会影响其全部 Tenant 的进入资格，但不会删除成员与历史关系。"
        type="warning"
        :closable="false"
        show-icon
      />
      <p class="membership-confirm">
        {{
          statusTarget === 'user'
            ? `确认变更 ${selected.realName} 的全局用户状态。最终管理员和负责人保护由服务端校验。`
            : selected.memberStatus === 'ACTIVE'
              ? `停用只影响 ${selected.displayName} 在“${selected.tenantName}”的进入资格，不改变全局用户与其他 Tenant 成员。`
              : '启用成员不会调整有效期；是否可进入仍由用户、Tenant、成员状态与有效期共同决定。'
        }}
      </p>
      <template #footer>
        <el-button @click="statusVisible = false">取消</el-button>
        <el-button
          v-permission="
            statusTarget === 'user'
              ? IAM_PERMISSIONS.members.changeUserStatus
              : IAM_PERMISSIONS.members.changeStatus
          "
          :type="
            statusTarget === 'user'
              ? selected.userStatus === 'ACTIVE'
                ? 'danger'
                : 'success'
              : selected.memberStatus === 'ACTIVE'
                ? 'warning'
                : 'success'
          "
          :loading="submitting"
          @click="finishStatusChange"
        >
          {{
            statusTarget === 'user'
              ? selected.userStatus === 'ACTIVE'
                ? '确认停用全局用户'
                : '确认启用全局用户'
              : selected.memberStatus === 'ACTIVE'
                ? '确认停用成员'
                : '确认启用成员'
          }}
        </el-button>
      </template>
    </el-dialog>
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

.tenant-assignment-editor {
  display: grid;
  gap: var(--spacing-5);
}

.tenant-assignment-editor__error,
.tenant-assignment-editor__content {
  display: grid;
  gap: var(--spacing-4);
}

.tenant-assignment-editor__error > .el-button {
  justify-self: start;
}

.tenant-assignment-editor__content {
  min-height: calc(var(--spacing-12) * 4);
}

.tenant-assignment-editor__content section {
  display: grid;
  gap: var(--spacing-3);
}

.tenant-assignment-editor__section-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-4);
}

.tenant-assignment-editor__section-title h3,
.tenant-assignment-editor__section-title p {
  margin: 0;
}

.tenant-assignment-editor__section-title h3 {
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

.tenant-assignment-editor__section-title p {
  margin-top: var(--spacing-1);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.tenant-assignment-editor__add {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--spacing-3);
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
