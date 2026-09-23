<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { notification } from '@shared/services/notification'
import type { PagedEntityQuery } from '@shared/types/pagedOptions'
import { foundationApi, type IamUserQueryResponse } from '../api/foundationApi'
import {
  mapOrganization,
  mapPosition,
  mapUserQuery,
  mapUserTenantSnapshot,
} from '../adapters/foundationAdapter'
import MembershipManagementPageView from '../components/MembershipManagementPageView.vue'
import {
  currentTenantId,
  foundationErrorMessage,
  getFoundationSession,
  queryFoundationTenantOptions,
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
  TenantAssignmentOption,
  UserTenantAssignmentSnapshot,
  UserTenantAssignmentUpdateValue,
  UserUpdateValue,
} from '../types/foundation'

const activeTenantId = currentTenantId()
const route = useRoute()
const router = useRouter()
const permissionWorkspace = computed(() => {
  const view = Array.isArray(route.query.view) ? route.query.view[0] : route.query.view
  return (
    view === 'permissions' &&
    (Number(route.query.userId) > 0 || Number(route.query.tenantUserId) > 0)
  )
})
const session = getFoundationSession()
const records = ref<MembershipRecord[]>([])
const tenants = ref<Array<{ id: number; code: string; name: string }>>(
  session?.availableTenants?.map((tenant) => ({
    id: tenant.tenantId,
    code: tenant.tenantCode,
    name: tenant.tenantName,
  })) ?? [],
)
const organizationOptions = ref<FoundationSelectOption[]>([])
const positionOptions = ref<FoundationSelectOption[]>([])
const organizationOptionsTenantId = ref<number>()
const positionOptionsTenantId = ref<number>()
const relationOptionsLoading = ref(false)
const state = ref<FoundationPreviewState>('loading')
let loadSequence = 0
let defaultTenantSelectionPending = true
let organizationOptionsSequence = 0
let positionOptionsSequence = 0
let relationOptionsRequestCount = 0

const initialQuery: MembershipQueryValue = {
  tenantIds: tenants.value.map((tenant) => tenant.id),
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
}
const activeQuery = ref<MembershipQueryValue>({
  ...initialQuery,
  tenantIds: [...initialQuery.tenantIds],
})

function positiveInteger(value: string): number | undefined {
  const result = Number(value)
  return Number.isInteger(result) && result > 0 ? result : undefined
}

async function load(query?: MembershipQueryValue) {
  const shouldRefreshTenantOptions = query === undefined
  if (!shouldRefreshTenantOptions) defaultTenantSelectionPending = false
  const currentQuery = query ?? activeQuery.value
  const sequence = ++loadSequence
  activeQuery.value = { ...currentQuery, tenantIds: [...currentQuery.tenantIds] }
  const requestedQuery = { ...currentQuery, tenantIds: [...currentQuery.tenantIds] }
  state.value = 'loading'
  try {
    if (shouldRefreshTenantOptions) {
      const previousTenantIds = tenants.value.map((tenant) => tenant.id)
      const selectAll =
        defaultTenantSelectionPending ||
        (previousTenantIds.length > 0 &&
          previousTenantIds.length === requestedQuery.tenantIds.length &&
          previousTenantIds.every((id) => requestedQuery.tenantIds.includes(id)))
      const options = await queryFoundationTenantOptions()
      if (sequence !== loadSequence) return
      defaultTenantSelectionPending = false
      tenants.value = options
      const requestedTenantIds = [...requestedQuery.tenantIds]
      requestedQuery.tenantIds = selectAll
        ? options.map((tenant) => tenant.id)
        : requestedQuery.tenantIds.filter((id) => options.some((tenant) => tenant.id === id))
      if (
        requestedTenantIds.length !== requestedQuery.tenantIds.length ||
        requestedTenantIds.some((id) => !requestedQuery.tenantIds.includes(id))
      ) {
        requestedQuery.organizationId = undefined
        requestedQuery.positionId = undefined
        requestedQuery.roleId = undefined
      }
    }
    activeQuery.value = requestedQuery
    const userId = positiveInteger(requestedQuery.userId)
    const response = await foundationApi.queryUsers({
      tenant_ids: [...requestedQuery.tenantIds],
      page_index: 1,
      page_size: 1000,
      ...(userId ? { user_id: userId } : {}),
      ...(requestedQuery.userName.trim() ? { user_name: requestedQuery.userName.trim() } : {}),
      ...(requestedQuery.realName.trim() ? { real_name: requestedQuery.realName.trim() } : {}),
      ...(requestedQuery.phone.trim() ? { phone: requestedQuery.phone.trim() } : {}),
      ...(requestedQuery.email.trim() ? { email: requestedQuery.email.trim() } : {}),
      ...(requestedQuery.organizationId ? { org_id: requestedQuery.organizationId } : {}),
      ...(requestedQuery.positionId ? { position_id: requestedQuery.positionId } : {}),
      ...(requestedQuery.roleId ? { role_id: requestedQuery.roleId } : {}),
      ...(requestedQuery.userStatus ? { user_status: requestedQuery.userStatus } : {}),
      ...(requestedQuery.memberStatus ? { member_status: requestedQuery.memberStatus } : {}),
    })
    if (sequence !== loadSequence) return
    records.value = response.items.map(mapQueryRecord)
    state.value = records.value.length ? 'ready' : 'empty'
  } catch (error) {
    if (sequence !== loadSequence) return
    records.value = []
    state.value = 'retryable-error'
    notification.error(foundationErrorMessage(error, '用户与成员加载失败'))
  }
}

function mapQueryRecord(item: IamUserQueryResponse): MembershipRecord {
  const tenant = tenants.value.find((option) => option.id === item.tenant_id)
  const storedTenant = session?.availableTenants?.find(
    (option) => option.tenantId === item.tenant_id,
  )
  return mapUserQuery(item, {
    id: item.tenant_id,
    ...(tenant ? { name: tenant.name } : {}),
    ...(storedTenant?.timezone ? { timezone: storedTenant.timezone } : {}),
  })
}

async function queryFilterOptions(
  tenantIds: number[],
  kind: 'organization' | 'position' | 'role',
  query: PagedEntityQuery,
): Promise<{ items: FoundationSelectOption[]; total: number }> {
  if (!tenantIds.length) return { items: [], total: 0 }
  const response = await foundationApi.queryMembershipFilterOptions(
    {
      tenant_ids: [...tenantIds],
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

async function queryUserTenants(userId: number): Promise<UserTenantAssignmentSnapshot> {
  return mapUserTenantSnapshot(await foundationApi.queryUserTenants(userId))
}

async function loadTenantAssignmentOptions(): Promise<TenantAssignmentOption[]> {
  const pageSize = 200
  let pageIndex = 1
  let total = Number.POSITIVE_INFINITY
  const result: TenantAssignmentOption[] = []

  while (result.length < total) {
    const response = await foundationApi.queryTenants({
      page_index: pageIndex,
      page_size: pageSize,
    })
    total = response.total
    result.push(
      ...response.items.map((tenant) => ({
        id: tenant.id,
        code: tenant.tenant_code,
        name: tenant.tenant_name,
        status: (tenant.status.toUpperCase() === 'ACTIVE'
          ? 'ACTIVE'
          : 'DISABLED') as TenantAssignmentOption['status'],
      })),
    )
    if (!response.items.length || result.length >= total) break
    pageIndex += 1
  }

  return result
}

async function saveUserTenants(
  value: UserTenantAssignmentUpdateValue,
): Promise<UserTenantAssignmentSnapshot> {
  try {
    const response = await foundationApi.updateUserTenants({
      user_id: value.userId,
      user_version: value.userVersion,
      original_memberships: value.originalMemberships.map((membership) => ({
        tenant_user_id: membership.tenantUserId,
        member_version: membership.memberVersion,
      })),
      tenants: value.tenants.map((tenant) => ({
        tenant_id: tenant.tenantId,
        is_tenant_admin: tenant.isTenantAdmin,
        restore: tenant.restore,
      })),
      remove_tenant_user_ids: [...value.removeTenantUserIds],
    })
    notification.success('用户租户归属已更新')
    await load()
    return mapUserTenantSnapshot(response)
  } catch (error) {
    notification.error(foundationErrorMessage(error, '用户租户归属更新失败'))
    throw error
  }
}

async function saveUser(value: UserUpdateValue) {
  try {
    await foundationApi.updateUser({
      id: value.id,
      version: value.version,
      user_name: value.userName.trim(),
      real_name: value.realName.trim(),
      nick_name: value.nickName.trim(),
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
    if (!value.targetId || !Number.isSafeInteger(value.targetId) || value.targetId <= 0) {
      throw new Error(relationMode === 'organization' ? '请选择目标组织' : '请选择目标岗位')
    }
    const request = {
      tenant_user_id: member.id,
      target_id: value.targetId,
      is_primary: value.primary,
      effective_start: value.effectiveStart,
      ...(value.effectiveEnd ? { effective_end: value.effectiveEnd } : {}),
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

async function changeStatus(
  target: 'member' | 'user',
  record: MembershipRecord,
  targetStatus: 'ACTIVE' | 'DISABLED',
) {
  try {
    const request = {
      id: target === 'member' ? record.id : record.userId,
      version: target === 'member' ? record.version : record.userVersion,
      target_status: targetStatus,
    }
    if (target === 'member') await foundationApi.changeMemberStatus(request)
    else await foundationApi.changeUserStatus(request)
    notification.success(targetStatus === 'ACTIVE' ? '状态已启用' : '状态已停用')
    await load()
  } catch (error) {
    notification.error(foundationErrorMessage(error, '状态更新失败'))
    throw error
  }
}

function inspectPermissions(record: MembershipRecord) {
  void router.push({
    name: 'iam-member-permissions',
    query: { tenantId: record.tenantId, userId: record.userId, tab: 'roles' },
  })
}

let listLoaded = false
onBeforeUnmount(() => {
  loadSequence += 1
  organizationOptionsSequence += 1
  positionOptionsSequence += 1
})
watch(
  permissionWorkspace,
  (value) => {
    if (value) {
      void router.replace({
        name: 'iam-member-permissions',
        query: {
          tenantId: route.query.tenantId,
          userId: route.query.userId,
          tenantUserId: route.query.tenantUserId,
          tab: route.query.tab,
        },
      })
    } else if (!listLoaded) {
      listLoaded = true
      void load()
    }
  },
  { immediate: true },
)
</script>

<template>
  <MembershipManagementPageView
    v-if="!permissionWorkspace"
    :records="records"
    :state="state"
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
    :change-status="changeStatus"
    :inspect-permissions="inspectPermissions"
    :query-user-tenants="queryUserTenants"
    :load-tenant-assignment-options="loadTenantAssignmentOptions"
    :save-user-tenants="saveUserTenants"
    @retry="load"
  />
</template>
