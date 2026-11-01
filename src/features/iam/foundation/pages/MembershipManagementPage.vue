<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'

import { notification } from '@shared/services/notification'
import {
  IAM_PERMISSIONS,
  IAM_PERMISSION_GOVERNANCE_RESOURCES,
} from '@shared/constants/iamPermissions'
import type { PagedEntityQuery } from '@shared/types/pagedOptions'
import { sameEntityId } from '@shared/utils/entityId'
import { publishPageResourcePermissionSnapshot } from '@shared/services/pageResourcePermissionState'
import { currentTenantOption, requireCurrentTenantId } from '../api/foundationSession'
import {
  clearCurrentPageResourceAccessCache,
  getCurrentPageResourcesCached,
} from '@features/iam/shell-context/public'
import { createRequestId, foundationApi, type IamUserQueryResponse } from '../api/foundationApi'
import { mapOrganization, mapPosition, mapUserQuery } from '../adapters/foundationAdapter'
import { accessControlApi } from '@features/iam/access-control/public'
import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import type { MemberRoleSnapshot } from '../types/memberRoles'
import MembershipManagementPageView from '../components/MembershipManagementPageView.vue'
import { resourceRegistry } from '../iam-resource.registry'
import type {
  MemberAdminChangeValue,
  MemberRelationEndValue,
  MemberRelationKind,
} from '../types/memberMaintenance'
import {
  currentTenantId,
  foundationErrorMessage,
  getFoundationSession,
} from '../api/foundationSession'
import type {
  FoundationPreviewState,
  FoundationSelectOption,
  MemberCreateValue,
  MembershipOptionKind,
  MembershipQueryValue,
  MemberRelationValue,
  MemberUpdateValue,
  MembershipRecord,
  UserUpdateValue,
} from '../types/foundation'

const activeTenantId = currentTenantId()
const router = useRouter()
const session = getFoundationSession()
const records = ref<MembershipRecord[]>([])
const tenants = ref([currentTenantOption()])
const organizationOptions = ref<FoundationSelectOption[]>([])
const positionOptions = ref<FoundationSelectOption[]>([])
const organizationOptionsTenantId = ref<number>()
const positionOptionsTenantId = ref<number>()
const relationOptionsLoading = ref(false)
const state = ref<FoundationPreviewState>('loading')
const canAccessEffectivePermissions = ref(false)
let loadSequence = 0
let organizationOptionsSequence = 0
let positionOptionsSequence = 0
let relationOptionsRequestCount = 0
let disposed = false

const initialQuery: MembershipQueryValue = {
  tenantIds: tenants.value.map((tenant) => tenant.id),
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
}
const activeQuery = ref<MembershipQueryValue>({
  ...initialQuery,
  tenantIds: [...initialQuery.tenantIds],
})

async function load(query?: MembershipQueryValue) {
  const currentQuery = query ?? activeQuery.value
  const sequence = ++loadSequence
  activeQuery.value = { ...currentQuery, tenantIds: [activeTenantId] }
  const requestedQuery = { ...currentQuery, tenantIds: [activeTenantId] }
  state.value = 'loading'
  try {
    requireCurrentTenantId(activeTenantId)
    activeQuery.value = requestedQuery
    const memberCode = requestedQuery.memberCode.trim()
    if (memberCode && requestedQuery.memberCodeFuzzy && memberCode.length < 3) {
      throw new Error('成员编号模糊查询至少需要3个字符')
    }
    const response = await foundationApi.queryUsers({
      tenant_ids: [activeTenantId],
      page_index: 1,
      page_size: 1000,
      ...(memberCode
        ? { tenant_user_code: memberCode, tenant_user_code_fuzzy: requestedQuery.memberCodeFuzzy }
        : {}),
      ...(requestedQuery.userName.trim() ? { user_name: requestedQuery.userName.trim() } : {}),
      ...(requestedQuery.realName.trim() ? { real_name: requestedQuery.realName.trim() } : {}),
      ...(requestedQuery.phone.trim() ? { phone: requestedQuery.phone.trim() } : {}),
      ...(requestedQuery.email.trim() ? { email: requestedQuery.email.trim() } : {}),
      ...(requestedQuery.organizationId ? { org_id: requestedQuery.organizationId } : {}),
      ...(requestedQuery.positionId ? { position_id: requestedQuery.positionId } : {}),
      ...(requestedQuery.roleId ? { role_id: requestedQuery.roleId } : {}),
      ...(requestedQuery.memberStatus ? { member_status: requestedQuery.memberStatus } : {}),
    })
    if (sequence !== loadSequence) return
    records.value = response.items
      .filter((item) => item.tenant_id === activeTenantId)
      .map(mapQueryRecord)
    state.value = records.value.length ? 'ready' : 'empty'
  } catch (error) {
    if (sequence !== loadSequence) return
    records.value = []
    state.value = 'retryable-error'
    notification.error(foundationErrorMessage(error, '用户与成员加载失败'))
  }
}

async function loadEffectivePermissionsEntryAccess() {
  const resourceCode = IAM_PERMISSION_GOVERNANCE_RESOURCES.members.effectivePermissions
  try {
    const response = await getCurrentPageResourcesCached(resourceCode)
    canAccessEffectivePermissions.value =
      response.can_access && response.page_resource_code.trim() === resourceCode
  } catch {
    canAccessEffectivePermissions.value = false
    notification.warning('有效权限入口暂时无法校验，请刷新页面后重试')
  }
}

function mapQueryRecord(item: IamUserQueryResponse): MembershipRecord {
  requireCurrentTenantId(item.tenant_id)
  const tenant = tenants.value.find((option) => option.id === item.tenant_id)
  const storedTenant = session?.availableTenants?.find(
    (option) => option.tenantId === item.tenant_id,
  )
  const record = mapUserQuery(item, {
    id: item.tenant_id,
    ...(tenant ? { name: tenant.name } : {}),
    ...(storedTenant?.timezone ? { timezone: storedTenant.timezone } : {}),
  })
  return {
    ...record,
    tenantMemberships: record.tenantMemberships.filter(
      (member) => member.tenantId === activeTenantId,
    ),
  }
}

async function queryFilterOptions(
  tenantIds: number[],
  kind: 'organization' | 'position' | 'role',
  query: PagedEntityQuery,
): Promise<{ items: FoundationSelectOption[]; total: number }> {
  if (tenantIds.length !== 1 || tenantIds[0] !== activeTenantId) return { items: [], total: 0 }
  requireCurrentTenantId(activeTenantId)
  const response = await foundationApi.queryMembershipFilterOptions(
    {
      tenant_ids: [activeTenantId],
      kind,
      ...(query.keyword.trim() ? { keyword: query.keyword.trim() } : {}),
      page_index: query.pageIndex,
      page_size: query.pageSize,
    },
    query.signal,
  )
  return {
    total: response.total,
    items: response.items.map((option) => {
      const tenant = tenants.value.find((item) => item.id === option.tenant_id)
      const tenantLabel = tenant?.name || tenant?.code || String(option.tenant_id)
      return {
        id: option.id,
        label: `${option.name} · ${option.code} · ${tenantLabel}`,
      }
    }),
  }
}

async function queryMemberDetail(record: MembershipRecord): Promise<MembershipRecord> {
  requireCurrentTenantId(record.tenantId)
  const response = await foundationApi.queryUsers({
    tenant_ids: [record.tenantId],
    user_id: record.userId,
    page_index: 1,
    page_size: 1,
  })
  const item = response.items.find(
    (value) => value.user_id === record.userId && value.tenant_id === record.tenantId,
  )
  if (!item) throw new Error('未获取到当前用户的最新成员详情，请重新查询')
  return mapQueryRecord(item)
}

async function loadOrganizationOptions(tenantId: number) {
  requireCurrentTenantId(tenantId)
  if (organizationOptionsTenantId.value === tenantId) return
  const sequence = ++organizationOptionsSequence
  organizationOptions.value = []
  organizationOptionsTenantId.value = undefined
  const response = await foundationApi.queryOrganizations({
    tenant_id: tenantId,
    query_type: 'list',
    page_index: 1,
    page_size: 1000,
    status: 'ACTIVE',
  })
  if (sequence !== organizationOptionsSequence) return
  organizationOptions.value = response.items.map(mapOrganization).map((item) => ({
    id: item.id,
    label: `${item.name} · ${item.code}`,
  }))
  organizationOptionsTenantId.value = tenantId
}

async function loadPositionOptions(tenantId: number) {
  requireCurrentTenantId(tenantId)
  if (positionOptionsTenantId.value === tenantId) return
  const sequence = ++positionOptionsSequence
  positionOptions.value = []
  positionOptionsTenantId.value = undefined
  const response = await foundationApi.queryPositions({
    tenant_id: tenantId,
    page_index: 1,
    page_size: 1000,
    status: 'ACTIVE',
  })
  if (sequence !== positionOptionsSequence) return
  positionOptions.value = response.items.map(mapPosition).map((item) => ({
    id: item.id,
    label: `${item.name} · ${item.code}`,
  }))
  positionOptionsTenantId.value = tenantId
}

async function loadRelationOptions(tenantId: number, kind: MembershipOptionKind) {
  relationOptionsRequestCount += 1
  relationOptionsLoading.value = true
  try {
    const requests: Promise<void>[] = []
    if (kind === 'all' || kind === 'organization') {
      requests.push(loadOrganizationOptions(tenantId))
    }
    if (kind === 'all' || kind === 'position') {
      requests.push(loadPositionOptions(tenantId))
    }
    await Promise.all(requests)
  } catch (error) {
    notification.warning(foundationErrorMessage(error, '组织或岗位选项加载失败'))
  } finally {
    relationOptionsRequestCount -= 1
    relationOptionsLoading.value = relationOptionsRequestCount > 0
  }
}

async function saveUser(value: UserUpdateValue) {
  try {
    await foundationApi.updateUser({
      id: value.id,
      version: value.version,
      user_name: value.userName.trim(),
      real_name: value.realName.trim(),
      // Nickname is retired from the UI, not deleted from existing user data.
      nick_name: value.nickName,
      phone: value.phone.trim(),
      email: value.email.trim(),
      avatar_url: value.avatarFileId ? '' : value.avatarUrl.trim(),
      avatar_file_id: value.avatarFileId ?? '',
      user_type: value.userType,
      remarks: value.remarks.trim(),
    })
    notification.success('全局用户资料已保存')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, '用户资料保存失败'))
    throw error
  }
}

async function saveMember(value: MemberUpdateValue) {
  try {
    await foundationApi.updateMember({
      id: value.id,
      version: value.version,
      tenant_id: value.tenantId,
      user_id: value.userId,
      effective_start: value.effectiveStart,
      ...(value.effectiveEnd ? { effective_end: value.effectiveEnd } : {}),
      remarks: value.remarks.trim(),
    })
    notification.success('Tenant 成员资料已保存')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, '成员资料保存失败'))
    throw error
  }
}

async function createMember(value: MemberCreateValue) {
  try {
    await foundationApi.createMember({
      tenant_id: value.tenantId,
      use_existing_user: value.mode === 'existing',
      ...(value.mode === 'existing'
        ? { existing_user_name: value.existingUserName.trim() }
        : {
            new_user: {
              user_name: value.userName.trim(),
              real_name: value.realName.trim(),
              nick_name: value.nickName.trim(),
              phone: value.phone.trim(),
              email: value.email.trim(),
              avatar_url: value.avatarFileId ? '' : value.avatarUrl.trim(),
              avatar_file_id: value.avatarFileId ?? '',
              user_type: value.userType,
            },
          }),
      user_type: value.memberUserType,
      effective_start: value.effectiveStart,
      ...(value.effectiveEnd ? { effective_end: value.effectiveEnd } : {}),
      is_tenant_admin: false,
      remarks: value.remarks.trim(),
      organizations: value.organizationIds.map((id) => ({
        org_id: id,
        is_primary: id === value.primaryOrganizationId,
      })),
      positions: value.positionIds.map((id) => ({
        position_id: id,
        is_primary: id === value.primaryPositionId,
      })),
    })
    notification.success('Tenant 成员已创建')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, '成员创建失败'))
    throw error
  }
}

async function saveRelation(
  relationMode: 'organization' | 'position',
  member: MembershipRecord,
  value: MemberRelationValue,
) {
  try {
    requireCurrentTenantId(member.tenantId)
    const permission = resourceRegistry.members.buttons[relationMode].resource_code
    if (!hasFunctionPermission(permission)) throw new Error('没有维护该归属的权限')
    if (
      value.id &&
      !member[relationMode === 'organization' ? 'organizations' : 'positions'].some(
        (row) => row.id === value.id,
      )
    ) {
      throw new Error('归属不属于当前成员，请重新加载')
    }
    if (!value.targetId || !Number.isSafeInteger(value.targetId) || value.targetId <= 0) {
      throw new Error(relationMode === 'organization' ? '请选择目标组织' : '请选择目标岗位')
    }
    const request = {
      ...(value.id ? { id: value.id, version: value.version } : {}),
      tenant_user_id: member.id,
      target_id: value.targetId,
      is_primary: value.primary,
      effective_start: value.effectiveStart,
      effective_end: value.effectiveEnd || null,
      remarks: value.remarks.trim(),
    }
    if (relationMode === 'organization') await foundationApi.saveOrganization(request)
    else await foundationApi.savePosition(request)
    notification.success(relationMode === 'organization' ? '组织归属已保存' : '岗位归属已保存')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, '成员归属保存失败'))
    throw error
  }
}

async function endRelation(
  kind: MemberRelationKind,
  member: MembershipRecord,
  value: MemberRelationEndValue,
) {
  requireCurrentTenantId(member.tenantId)
  const permission =
    kind === 'organization'
      ? resourceRegistry.members.buttons.endOrganization.resource_code
      : resourceRegistry.members.buttons.endPosition.resource_code
  if (!hasFunctionPermission(permission)) throw new Error('没有结束该归属的权限')
  const relations = kind === 'organization' ? member.organizations : member.positions
  if (!relations.some((row) => row.id === value.id && row.version === value.version))
    throw new Error('归属快照已变化，请重新加载')
  const request = { id: value.id, version: value.version, effective_end: value.effectiveEnd }
  if (kind === 'organization') await foundationApi.endOrganization(request)
  else await foundationApi.endPosition(request)
  if (disposed) return
  notification.success(
    kind === 'organization' ? '组织归属结束时间已保存' : '岗位归属结束时间已保存',
  )
  await load()
}

async function changeAdmin(value: MemberAdminChangeValue) {
  requireCurrentTenantId(value.tenantId)
  const permission = value.appoint
    ? resourceRegistry.members.buttons.appointAdmin.resource_code
    : resourceRegistry.members.buttons.cancelAdmin.resource_code
  if (!hasFunctionPermission(permission)) throw new Error('没有变更管理员身份的权限')
  const request = {
    tenant_id: value.tenantId,
    user_id: value.userId,
    member_version: value.memberVersion,
    request_id: value.requestId,
  }
  const result = value.appoint
    ? await foundationApi.appointTenantAdmin(request)
    : await foundationApi.cancelTenantAdmin(request)
  if (disposed) return
  requireCurrentTenantId(value.tenantId)
  if (
    !sameEntityId(result.tenant_id, value.tenantId) ||
    !sameEntityId(result.user_id, value.userId)
  ) {
    throw new Error('响应身份不一致，请重新加载成员状态')
  }
  notification.success(
    result.idempotent
      ? '请求已处理，请以最新身份为准'
      : result.changed
        ? '管理员身份已更新'
        : '该成员已是目标身份',
  )
  // Rebuild all local context for self/unknown identity; never keep stale Menu/Button grants.
  const actor = getFoundationSession()?.userId
  if (!actor || sameEntityId(actor, value.userId)) {
    clearCurrentPageResourceAccessCache()
    publishPageResourcePermissionSnapshot('IAM.MEMBERS', [], false)
    window.location.reload()
    return
  }
  await load()
}

async function changeStatus(record: MembershipRecord, targetStatus: 'ACTIVE' | 'DISABLED') {
  try {
    const request = {
      id: record.id,
      version: record.version,
      target_status: targetStatus,
    }
    await foundationApi.changeMemberStatus(request)
    notification.success(targetStatus === 'ACTIVE' ? '状态已启用' : '状态已停用')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, '状态更新失败'))
    throw error
  }
}

const { hasFunctionPermission } = useEffectivePermissions()
const rowActionPermissions = computed(() => ({
  editUser: hasFunctionPermission(IAM_PERMISSIONS.members.updateUser),
  editMember: hasFunctionPermission(IAM_PERMISSIONS.members.update),
  memberStatus: hasFunctionPermission(IAM_PERMISSIONS.members.changeStatus),
}))

async function allRolePages<T>(query: (page: number) => Promise<{ total: number; items: T[] }>) {
  const items: T[] = []
  for (let page = 1; ; page += 1) {
    const result = await query(page)
    items.push(...result.items)
    if (items.length >= result.total) return items
    if (!result.items.length) throw new Error('角色分页结果不完整，请刷新后重试')
  }
}

async function loadMemberRoles(record: MembershipRecord): Promise<MemberRoleSnapshot> {
  const current = await queryMemberDetail(record)
  const [assignments, roles] = await Promise.all([
    allRolePages((page) =>
      accessControlApi.queryAssignments({
        tenant_id: current.tenantId,
        tenant_user_id: current.id,
        page_index: page,
        page_size: 100,
        keyword: '',
        status: '',
      }),
    ),
    hasFunctionPermission(IAM_PERMISSIONS.members.assignRole)
      ? allRolePages((page) =>
          accessControlApi.queryRoles({
            tenant_id: current.tenantId,
            id: 0,
            role_type: '',
            page_index: page,
            page_size: 100,
            keyword: '',
            status: 'ACTIVE',
          }),
        )
      : Promise.resolve([]),
  ])
  return {
    tenantUserId: current.id,
    memberVersion: current.version,
    effective:
      current.effectiveness === 'EFFECTIVE' &&
      current.memberStatus === 'ACTIVE' &&
      current.userStatus === 'ACTIVE',
    roles: assignments.map((assignment) => ({
      roleId: assignment.role_id,
      roleName: assignment.role_name,
      roleCode: assignment.role_code,
      effective: assignment.is_currently_effective,
      removable:
        assignment.can_maintain &&
        !assignment.is_group_controlled &&
        !assignment.is_tenant_admin_identity,
      reason:
        assignment.invalid_reason ||
        (assignment.is_tenant_admin_identity
          ? '管理员身份不通过角色分配调整；请返回员工详情使用管理员专用操作（需独立授权）'
          : ''),
    })),
    candidates: roles
      .filter(
        (role) =>
          role.role_type.toUpperCase() === 'CUSTOM' &&
          role.status.toUpperCase() === 'ACTIVE' &&
          role.is_currently_effective &&
          role.can_maintain &&
          !role.is_group_controlled,
      )
      .map((role) => ({ id: role.id, name: role.role_name })),
  }
}

async function updateMemberRoles(
  snapshot: MemberRoleSnapshot,
  roleIds: number[],
  operation: 'assign' | 'revoke',
) {
  const permission =
    operation === 'assign' ? IAM_PERMISSIONS.members.assignRole : IAM_PERMISSIONS.members.revokeRole
  if (!hasFunctionPermission(permission)) throw new Error('没有执行此角色操作的权限')
  const request = {
    tenant_user_id: snapshot.tenantUserId,
    member_version: snapshot.memberVersion,
    role_ids: roleIds,
  }
  if (operation === 'assign') await accessControlApi.assignRoles(request)
  else await accessControlApi.revokeRoles(request)
  await load()
}

function inspectEffectivePermissions(record: MembershipRecord) {
  void router.push({
    name: 'iam-user-effective-permissions',
    query: { tenantId: record.tenantId, userId: record.userId },
  })
}

onBeforeUnmount(() => {
  disposed = true
  loadSequence += 1
  organizationOptionsSequence += 1
  positionOptionsSequence += 1
})
void loadEffectivePermissionsEntryAccess()
void load()
</script>

<template>
  <MembershipManagementPageView
    :records="records"
    :state="state"
    :can-access-effective-permissions="canAccessEffectivePermissions"
    :row-action-permissions="rowActionPermissions"
    :initial-tenant-id="activeTenantId"
    :tenant-options="tenants"
    :organization-options="organizationOptions"
    :position-options="positionOptions"
    :relation-options-loading="relationOptionsLoading"
    :query-filter-options="queryFilterOptions"
    :query-records="load"
    :query-member-detail="queryMemberDetail"
    :load-relation-options="loadRelationOptions"
    :save-user="saveUser"
    :save-member="saveMember"
    :create-member="createMember"
    :save-relation="saveRelation"
    :end-relation="endRelation"
    :change-admin="changeAdmin"
    :create-admin-request-id="createRequestId"
    :change-status="changeStatus"
    :load-member-roles="loadMemberRoles"
    :update-member-roles="updateMemberRoles"
    :inspect-effective-permissions="inspectEffectivePermissions"
    @retry="load"
  />
</template>
