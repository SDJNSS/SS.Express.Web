<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { notification } from '@shared/services/notification'
import type { VersionToken } from '@shared/types/common'
import { currentTenantId, foundationApi, mapTenant } from '@features/iam/foundation/public'
import {
  mapDataDomain,
  mapInvalidDataPermissionResource,
  mapRoleDataPermission,
  mapSystem,
} from '../adapters/accessControlAdapter'
import {
  accessControlErrorMessage,
  positiveRouteId,
  resolveRole,
} from '../api/accessControlSession'
import { accessControlApi } from '../api/accessControlApi'
import RoleDataPermissionPageView from '../components/RoleDataPermissionPageView.vue'
import type {
  AccessControlPreviewState,
  DataDomainRecord,
  DataScopeMode,
  InvalidDataPermissionResourceRecord,
  RoleDataPermissionRecord,
  RoleRecord,
  SystemRecord,
  TenantOption,
} from '../types/accessControl'

const route = useRoute()
const router = useRouter()
const state = ref<AccessControlPreviewState>('loading')
const role = ref<RoleRecord>()
const systems = ref<SystemRecord[]>([])
const domains = ref<DataDomainRecord[]>([])
const invalidResources = ref<InvalidDataPermissionResourceRecord[]>([])
const permissions = ref<RoleDataPermissionRecord[]>([])
const tenants = ref<TenantOption[]>([])
let roleVersion: VersionToken = ''

async function load() {
  state.value = 'loading'
  try {
    const tenantId = positiveRouteId(route.query.tenantId) || currentTenantId()
    role.value = await resolveRole(positiveRouteId(route.query.roleId), tenantId)
    const [systemResponse, domainResponse, permissionResponse, tenantResponse] = await Promise.all([
      accessControlApi.querySystems({ id: 0, keyword: '' }),
      accessControlApi.queryDataDomains({ app_id: 0, domain_code: '' }),
      accessControlApi.queryDataPermissions(role.value.id),
      foundationApi.queryTenants({ page_index: 1, page_size: 1000 }),
    ])
    systems.value = systemResponse.map(mapSystem)
    domains.value = domainResponse.domains.map(mapDataDomain)
    invalidResources.value = domainResponse.invalid_resources.map(mapInvalidDataPermissionResource)
    tenants.value = tenantResponse.items.map(mapTenant).map((tenant) => ({
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
    }))
    const tenantNames = new Map(tenants.value.map((tenant) => [tenant.id, tenant.name]))
    permissions.value = permissionResponse.domains.map((item) =>
      mapRoleDataPermission(item, tenantNames),
    )
    roleVersion = permissionResponse.role_version
    state.value = domains.value.length || permissions.value.length ? 'ready' : 'empty'
  } catch (error) {
    state.value = 'retryable-error'
    notification.error(accessControlErrorMessage(error, '数据权限加载失败'))
  }
}

async function submit(
  record: RoleDataPermissionRecord,
  scopeMode: DataScopeMode | undefined,
  targetTenantIds: number[],
  clear: boolean,
) {
  if (!role.value) return
  try {
    const response = await accessControlApi.saveDataPermission({
      role_id: role.value.id,
      role_version: roleVersion,
      domain_code: record.domainCode,
      scope_mode: scopeMode ?? '',
      clear,
      target_tenant_ids: targetTenantIds,
    })
    roleVersion = response.role_version
    notification.success(clear ? '数据权限配置已清除' : '数据权限已保存')
    await load()
  } catch (error) {
    notification.error(accessControlErrorMessage(error, '数据权限保存失败'))
    throw error
  }
}

onMounted(load)
</script>

<template>
  <RoleDataPermissionPageView
    v-if="role"
    :role="role"
    :systems="systems"
    :domains="domains"
    :invalid-resources="invalidResources"
    :permissions="permissions"
    :tenants="tenants"
    :state="state"
    :submit="submit"
    :back="() => router.push({ name: 'iam-role-management' })"
    @retry="load"
  />
  <RoleDataPermissionPageView
    v-else
    :role="{
      id: 0,
      tenantId: 0,
      tenantCode: '—',
      roleCode: 'loading',
      roleName: '正在加载角色',
      roleType: 'CUSTOM',
      sortOrder: 0,
      status: 'DISABLED',
      description: '',
      remarks: '',
      isCurrentlyEffective: false,
      isGroupControlled: false,
      canMaintain: false,
      version: '',
      createdAt: '',
      updatedAt: '',
    }"
    :systems="[]"
    :domains="[]"
    :permissions="[]"
    :tenants="[]"
    :state="state"
    :back="() => router.push({ name: 'iam-role-management' })"
    @retry="load"
  />
</template>
