<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import AppPagination from '@shared/components/AppPagination.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import { IAM_PERMISSIONS } from '@shared/constants/iamPermissions'
import type {
  AccessControlPreviewState,
  AssignmentQueryValue,
  AssignmentRecord,
  MemberOption,
  RoleRecord,
  TenantOption,
} from '../types/accessControl'

const props = defineProps<{
  records: AssignmentRecord[]
  roles: RoleRecord[]
  tenants: TenantOption[]
  members: MemberOption[]
  state: AccessControlPreviewState
  total?: number
  queryAssignments?: (query: AssignmentQueryValue) => Promise<void>
  submitAssign?: (member: MemberOption, roleIds: number[]) => Promise<void>
  submitRevoke?: (member: MemberOption, records: AssignmentRecord[]) => Promise<void>
  navigateRoles?: () => void
  initialRoleId?: number
}>()
const emit = defineEmits<{ action: [message: string]; retry: [] }>()

const initialTenantId = props.records[0]?.tenantId ?? props.tenants[0]?.id ?? 0
const query = reactive({
  tenantId: initialTenantId,
  roleId: (props.initialRoleId ?? props.records[0]?.roleId ?? props.roles[0]?.id) as
    number | undefined,
  keyword: '',
  status: '',
})
const committed = reactive({ ...query })
const page = ref(1)
const pageSize = ref(10)
const assignVisible = ref(false)
const selectedMemberId = ref<number>()
const revokeVisible = ref(false)
const revokeTarget = ref<AssignmentRecord>()
const submitting = ref(false)

const columns: DataTableColumn[] = [
  { prop: 'tenantUserCode', label: '成员编码', minWidth: 184, fixed: 'left' },
  { prop: 'displayName', label: '成员姓名', minWidth: 140 },
  { label: '关系类型', width: 130, slot: 'relationType' },
  { label: '控制范围', width: 112, slot: 'control' },
  { label: '分配状态', width: 100, slot: 'assigned' },
  { label: '当前有效性', minWidth: 190, slot: 'effective' },
  { label: '操作', width: 100, fixed: 'right', slot: 'actions' },
]

const currentRole = computed(() => props.roles.find((role) => role.id === committed.roleId))
const canMaintainCurrentRole = computed(
  () =>
    currentRole.value?.roleType === 'CUSTOM' &&
    currentRole.value.status === 'ACTIVE' &&
    currentRole.value.isCurrentlyEffective &&
    currentRole.value.canMaintain &&
    !currentRole.value.isGroupControlled,
)
const visibleRecords = computed(() => {
  if (props.state !== 'ready') return []
  const keyword = committed.keyword.trim().toLocaleLowerCase('zh-CN')
  return props.records.filter(
    (record) =>
      record.tenantId === committed.tenantId &&
      (!committed.roleId || record.roleId === committed.roleId) &&
      (!committed.status ||
        (committed.status === 'EFFECTIVE'
          ? record.isCurrentlyEffective
          : !record.isCurrentlyEffective)) &&
      (!keyword ||
        [record.tenantUserCode, record.displayName].some((value) =>
          value.toLocaleLowerCase('zh-CN').includes(keyword),
        )),
  )
})
const assignedMemberIds = computed(
  () =>
    new Set(
      props.records
        .filter((item) => item.roleId === committed.roleId)
        .map((item) => item.tenantUserId),
    ),
)
const assignableMembers = computed(() =>
  props.members.filter((member) => member.effective && !assignedMemberIds.value.has(member.id)),
)
const selectedMember = computed(() =>
  props.members.find((member) => member.id === selectedMemberId.value),
)

function asAssignment(row: Record<string, unknown>) {
  return row as unknown as AssignmentRecord
}
function defaultRoleId(tenantId = query.tenantId) {
  const initialRole = props.roles.find(
    (role) => role.id === props.initialRoleId && (tenantId <= 0 || role.tenantId === tenantId),
  )
  return (
    initialRole?.id ??
    props.roles.find((role) => role.tenantId === tenantId)?.id ??
    props.roles[0]?.id
  )
}
function currentQuery(): AssignmentQueryValue {
  return {
    tenantId: committed.tenantId,
    roleId: committed.roleId ?? 0,
    pageIndex: page.value,
    pageSize: pageSize.value,
    keyword: committed.keyword,
    status: committed.status,
  }
}
function memberFor(record: AssignmentRecord): MemberOption {
  return (
    props.members.find((member) => member.id === record.tenantUserId) ?? {
      id: record.tenantUserId,
      code: record.tenantUserCode,
      name: record.displayName,
      effective: record.isCurrentlyEffective,
      isTenantAdmin: record.isTenantAdminIdentity,
      version: record.memberVersion,
    }
  )
}
function canRevoke(record: AssignmentRecord) {
  return (
    canMaintainCurrentRole.value &&
    !record.isTenantAdminIdentity &&
    record.canMaintain &&
    !record.isGroupControlled
  )
}
async function search() {
  Object.assign(committed, query)
  page.value = 1
  if (props.queryAssignments) await props.queryAssignments(currentQuery())
  emit('action', '角色成员查询条件已生效')
}
async function reset() {
  const tenantId = props.records[0]?.tenantId ?? props.tenants[0]?.id ?? 0
  Object.assign(query, {
    tenantId,
    roleId: defaultRoleId(tenantId),
    keyword: '',
    status: '',
  })
  Object.assign(committed, query)
  page.value = 1
  if (props.queryAssignments) await props.queryAssignments(currentQuery())
  emit('action', '角色成员查询条件已重置')
}
function openAssign() {
  selectedMemberId.value = undefined
  assignVisible.value = true
}
async function assignMember() {
  if (!selectedMember.value || !currentRole.value || submitting.value) return
  if (props.submitAssign) {
    submitting.value = true
    try {
      await props.submitAssign(selectedMember.value, [currentRole.value.id])
      assignVisible.value = false
    } finally {
      submitting.value = false
    }
    return
  }
  assignVisible.value = false
  emit('action', `候选已向 ${currentRole.value.roleName} 添加 ${selectedMember.value.name}`)
}
function openRevoke(record: AssignmentRecord) {
  revokeTarget.value = record
  revokeVisible.value = true
}
async function revokeMember() {
  if (!revokeTarget.value || submitting.value) return
  if (props.submitRevoke) {
    submitting.value = true
    try {
      await props.submitRevoke(memberFor(revokeTarget.value), [revokeTarget.value])
      revokeVisible.value = false
      revokeTarget.value = undefined
    } finally {
      submitting.value = false
    }
    return
  }
  emit('action', `候选已从 ${revokeTarget.value.roleName} 移除 ${revokeTarget.value.displayName}`)
  revokeVisible.value = false
  revokeTarget.value = undefined
}
async function changePage() {
  if (props.queryAssignments) await props.queryAssignments(currentQuery())
  emit('action', '角色成员分页状态已更新')
}

watch(
  () => props.tenants,
  (tenants) => {
    if (tenants.some((tenant) => tenant.id === query.tenantId)) return
    query.tenantId = tenants[0]?.id ?? 0
    committed.tenantId = query.tenantId
  },
  { deep: true, immediate: true },
)
watch(
  () => [props.roles, query.tenantId] as const,
  ([roles, tenantId]) => {
    if (roles.length === 0) return
    if (
      roles.some(
        (role) => role.id === query.roleId && (tenantId <= 0 || role.tenantId === tenantId),
      )
    )
      return
    query.roleId = defaultRoleId()
    committed.roleId = query.roleId
  },
  { deep: true, immediate: true },
)
</script>

<template>
  <AppPage class="assignment-page">
    <ListPageTemplate>
      <template #header>
        <PageHeader
          title="角色成员"
          description="按角色维护直接分配的成员；移除角色不会停用 Tenant 成员或删除用户"
        >
          <template #actions>
            <el-button v-if="navigateRoles" @click="navigateRoles">
              <Icon icon="mdi:chevron-left" width="18" aria-hidden="true" />返回角色列表
            </el-button>
            <el-button
              v-permission="IAM_PERMISSIONS.roles.assign"
              type="primary"
              :disabled="!canMaintainCurrentRole"
              @click="openAssign"
            >
              <Icon icon="mdi:account-multiple-outline" width="18" aria-hidden="true" />添加成员
            </el-button>
          </template>
        </PageHeader>
      </template>

      <template #search>
        <SearchPanel :loading="state === 'loading'" @search="search" @reset="reset">
          <el-form-item label="目标 Tenant">
            <el-select v-model="query.tenantId">
              <el-option
                v-for="tenant in tenants"
                :key="tenant.id"
                :label="`${tenant.name} · ${tenant.code}`"
                :value="tenant.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="角色">
            <el-select v-model="query.roleId" filterable placeholder="请选择角色">
              <el-option
                v-for="role in roles"
                :key="role.id"
                :label="`${role.roleName} · ${role.roleCode}`"
                :value="role.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="成员关键词">
            <el-input
              v-model="query.keyword"
              clearable
              placeholder="成员编码或姓名"
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="有效性">
            <el-select v-model="query.status" clearable placeholder="全部状态">
              <el-option label="当前有效" value="EFFECTIVE" />
              <el-option label="当前无效" value="INVALID" />
            </el-select>
          </el-form-item>
        </SearchPanel>
      </template>

      <template #toolbar>
        <TableToolbar
          title="角色成员列表"
          :total="total ?? visibleRecords.length"
          :refreshing="state === 'loading'"
          @refresh="emit('retry')"
        />
      </template>

      <el-alert
        v-if="currentRole"
        class="assignment-page__context"
        :title="`${currentRole.roleName} · ${currentRole.roleCode}`"
        :type="canMaintainCurrentRole ? 'info' : 'warning'"
        :description="
          canMaintainCurrentRole
            ? '当前列表仅展示该角色的成员，可添加或移除直接分配关系。'
            : '该角色已停用、受集团控制或不可维护，当前只能查看成员。'
        "
        :closable="false"
        show-icon
      />
      <el-alert
        v-if="state === 'retryable-error'"
        class="assignment-page__alert"
        title="角色成员加载失败，当前筛选条件已保留"
        type="error"
        :closable="false"
        show-icon
      >
        <template #default>
          <el-button link type="primary" @click="emit('retry')">重新加载</el-button>
        </template>
      </el-alert>

      <DataTable :data="visibleRecords" :columns="columns" :loading="state === 'loading'">
        <template #relationType="{ row }">
          <StatusTag
            :label="asAssignment(row).isTenantAdminIdentity ? 'Tenant 管理员' : '普通角色'"
            :tone="asAssignment(row).isTenantAdminIdentity ? 'warning' : 'info'"
          />
        </template>
        <template #control="{ row }">
          <StatusTag v-if="asAssignment(row).isGroupControlled" label="集团控制" tone="warning" />
          <span v-else>Tenant 内</span>
        </template>
        <template #assigned="{ row }">
          <StatusTag
            :label="asAssignment(row).isAssigned ? '已分配' : '未分配'"
            :tone="asAssignment(row).isAssigned ? 'success' : 'info'"
          />
        </template>
        <template #effective="{ row }">
          <StatusTag
            :label="asAssignment(row).isCurrentlyEffective ? '当前有效' : '当前无效'"
            :tone="asAssignment(row).isCurrentlyEffective ? 'success' : 'warning'"
          />
          <small v-if="asAssignment(row).invalidReason" class="assignment-page__reason">{{
            asAssignment(row).invalidReason
          }}</small>
        </template>
        <template #actions="{ row }">
          <RowActionGrid :aria-label="`${asAssignment(row).displayName} 的角色成员操作`">
            <el-button
              v-permission="IAM_PERMISSIONS.roles.revoke"
              link
              type="danger"
              :disabled="!canRevoke(asAssignment(row))"
              @click="openRevoke(asAssignment(row))"
              >移除</el-button
            >
          </RowActionGrid>
        </template>
      </DataTable>
      <template #pagination>
        <AppPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="total ?? visibleRecords.length"
          @change="changePage"
        />
      </template>
    </ListPageTemplate>

    <FormDrawer
      v-model="assignVisible"
      :title="`向 ${currentRole?.roleName ?? ''} 添加成员`"
      confirm-button-text="确认添加"
      :submitting="submitting"
      :dirty="Boolean(selectedMemberId)"
      @confirm="assignMember"
    >
      <el-alert
        title="一次添加一名当前有效的 Tenant 成员；操作成功后立即刷新角色成员列表。"
        type="info"
        :closable="false"
        show-icon
      />
      <el-form class="assignment-form" label-position="top" novalidate>
        <el-form-item label="角色">
          <el-input
            :model-value="`${currentRole?.roleName ?? ''} · ${currentRole?.roleCode ?? ''}`"
            disabled
          />
        </el-form-item>
        <el-form-item label="Tenant 成员">
          <el-select
            v-model="selectedMemberId"
            filterable
            clearable
            placeholder="请选择要添加的成员"
          >
            <el-option
              v-for="member in assignableMembers"
              :key="member.id"
              :label="`${member.name} · ${member.code}`"
              :value="member.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="selectedMember" label="成员版本">
          <el-input :model-value="selectedMember.version" disabled />
        </el-form-item>
        <el-empty v-if="assignableMembers.length === 0" description="当前 Tenant 暂无可添加成员" />
      </el-form>
      <template #footer="{ requestClose }">
        <el-button :disabled="submitting" @click="requestClose">取消</el-button>
        <el-button
          v-permission="IAM_PERMISSIONS.roles.assign"
          type="primary"
          :disabled="!selectedMember || submitting"
          :loading="submitting"
          @click="assignMember"
          >确认添加</el-button
        >
      </template>
    </FormDrawer>

    <el-dialog
      v-model="revokeVisible"
      title="移除角色成员"
      width="580"
      :close-on-click-modal="false"
    >
      <el-alert
        title="只会移除当前角色的直接分配关系，不会停用 Tenant 成员，也不会删除用户。"
        type="error"
        :closable="false"
        show-icon
      />
      <div v-if="revokeTarget" class="assignment-confirm">
        <strong>{{ revokeTarget.displayName }} · {{ revokeTarget.tenantUserCode }}</strong>
        <span>将从 {{ revokeTarget.roleName }} 中移除</span>
      </div>
      <template #footer>
        <el-button :disabled="submitting" @click="revokeVisible = false">保留成员</el-button>
        <el-button
          v-permission="IAM_PERMISSIONS.roles.revoke"
          type="danger"
          :loading="submitting"
          @click="revokeMember"
          >确认移除</el-button
        >
      </template>
    </el-dialog>
  </AppPage>
</template>

<style scoped lang="scss">
.assignment-page__context,
.assignment-page__alert {
  margin: var(--spacing-3) var(--spacing-4);
}
.assignment-page__reason {
  display: block;
  margin-top: var(--spacing-1);
  color: var(--text-secondary);
}
.assignment-form {
  display: grid;
  gap: var(--spacing-2);
  margin-top: var(--spacing-4);
}
.assignment-confirm {
  display: grid;
  gap: var(--spacing-2);
  margin-top: var(--spacing-4);
  color: var(--text-regular);
}
.assignment-confirm strong {
  color: var(--text-primary);
  font-size: var(--font-size-md);
}
</style>
