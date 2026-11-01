import { ref } from 'vue'

import { notification } from '@shared/services/notification'
import { currentTenantId } from '@features/iam/foundation/public'

import {
  mapPermissionGovernanceApps,
  mapPermissionResource,
  mapPermissionScheme,
  mapPermissionSchemesPage,
  toPermissionSchemeCopyRequest,
  toPermissionSchemeCreateRequest,
  toPermissionSchemeQueryRequest,
  toPermissionSchemeUpdateRequest,
} from '../adapters/permissionGovernanceAdapter'
import {
  ApiError,
  createRequestId,
  permissionGovernanceApi,
  type IamPermissionSchemeRefNodeResponse,
} from '../api/permissionGovernanceApi'
import type {
  PermissionFormValue,
  PermissionGovernanceApp,
  PermissionGovernancePreviewState,
  PermissionQuery,
  PermissionRecord,
  SystemResourceRecord,
} from '../types/permissionGovernance'
import {
  isUnknownPermissionGovernanceMutation,
  reportPermissionGovernanceMutationError,
  reportPermissionGovernanceQueryError,
} from './permissionGovernanceFeedback'

interface PermissionManagementOptions {
  canMaintain: () => boolean
  canEdit: () => boolean
}

const defaultQuery = (): PermissionQuery => ({ permissionName: '', pageIndex: 1, pageSize: 10 })

function flattenResourceRefs(
  nodes: readonly IamPermissionSchemeRefNodeResponse[],
): IamPermissionSchemeRefNodeResponse[] {
  return nodes.flatMap((node) => [node, ...flattenResourceRefs(node.children ?? [])])
}

export function usePermissionManagement(options: PermissionManagementOptions) {
  const apps = ref<PermissionGovernanceApp[]>([])
  const permissions = ref<PermissionRecord[]>([])
  const resources = ref<SystemResourceRecord[]>([])
  const total = ref(0)
  const state = ref<PermissionGovernancePreviewState>('loading')
  const tenantId = currentTenantId()
  let activeQuery = defaultQuery()
  let loadSequence = 0
  let pendingMutation:
    | {
        requestId: string
        value: PermissionFormValue
        mode: 'create' | 'copy' | 'edit'
        source?: PermissionRecord
      }
    | undefined

  async function ensureApps(): Promise<PermissionGovernanceApp[]> {
    if (apps.value.length) return apps.value
    const response = await permissionGovernanceApi.querySystems({})
    apps.value = mapPermissionGovernanceApps(response)
    return apps.value
  }

  function rememberResources(nodes: readonly IamPermissionSchemeRefNodeResponse[]): void {
    const mapped = flattenResourceRefs(nodes).map((node) =>
      mapPermissionResource(node.resource, apps.value),
    )
    const byId = new Map(resources.value.map((resource) => [resource.resourceId, resource]))
    mapped.forEach((resource) => byId.set(resource.resourceId, resource))
    resources.value = [...byId.values()]
  }

  async function loadParentPermissions(appId: import('@shared/types/entityId').EntityId) {
    const all: PermissionRecord[] = []
    await ensureApps()
    let pageIndex = 1
    while (true) {
      const response = await permissionGovernanceApi.queryPermissionSchemes({
        tenant_id: tenantId,
        app_id: appId,
        page_index: pageIndex++,
        page_size: 200,
      })
      all.push(...response.items.map((item) => mapPermissionScheme(item, apps.value)))
      if (all.length >= response.total) return all
      if (!response.items.length) throw new Error('上级权限目录不完整')
    }
  }

  async function queryPermissions(query: PermissionQuery = activeQuery): Promise<void> {
    activeQuery = { ...query }
    const sequence = ++loadSequence
    state.value = 'loading'
    try {
      const appRecords = await ensureApps()
      const response = await permissionGovernanceApi.queryPermissionSchemes(
        toPermissionSchemeQueryRequest(activeQuery, tenantId),
      )
      if (sequence !== loadSequence) return
      const page = mapPermissionSchemesPage(response, appRecords, {
        canMaintain: options.canMaintain(),
      })
      permissions.value = page.items
      total.value = page.total
      state.value = page.items.length ? 'ready' : 'empty'
    } catch (error) {
      if (sequence !== loadSequence) return
      permissions.value = []
      total.value = 0
      state.value = 'retryable-error'
      reportPermissionGovernanceQueryError(error, '权限列表加载失败')
    }
  }

  async function loadPermissionDetail(record: PermissionRecord): Promise<PermissionRecord> {
    try {
      const response = await permissionGovernanceApi.getPermissionScheme({
        tenant_id: tenantId,
        id: record.id,
      })
      await ensureApps()
      rememberResources(response.resource_tree ?? [])
      const mapped = mapPermissionScheme(response, apps.value, {
        canMaintain: options.canMaintain(),
      })
      const index = permissions.value.findIndex((item) => item.id === mapped.id)
      if (index >= 0) permissions.value.splice(index, 1, mapped)
      return mapped
    } catch (error) {
      reportPermissionGovernanceQueryError(error, '权限详情加载失败')
      throw error
    }
  }

  function rememberPermission(record: PermissionRecord): void {
    const index = permissions.value.findIndex((item) => item.id === record.id)
    if (index >= 0) permissions.value.splice(index, 1, record)
    else {
      permissions.value.unshift(record)
      total.value += 1
    }
  }

  async function submitPermission(
    value: PermissionFormValue,
    mode: 'create' | 'copy' | 'edit',
    source?: PermissionRecord,
    mutationOptions: { reusePendingRequestId?: boolean } = {},
  ): Promise<PermissionRecord> {
    const mutation = mutationOptions.reusePendingRequestId
      ? pendingMutation
      : {
          requestId: createRequestId(),
          value: { ...value },
          mode,
          ...(source ? { source } : {}),
        }
    if (!mutation) throw new ApiError('没有可重试的权限写入请求', 'validation')
    if (mutation.mode === 'edit' && !options.canEdit()) {
      throw new ApiError('当前账号无权编辑权限信息', 'permission')
    }
    pendingMutation = mutation
    try {
      const response =
        mutation.mode === 'create'
          ? await permissionGovernanceApi.createPermissionScheme(
              toPermissionSchemeCreateRequest(mutation.value, tenantId, mutation.requestId),
            )
          : mutation.source
            ? mutation.mode === 'edit'
              ? await permissionGovernanceApi.updatePermissionScheme(
                  toPermissionSchemeUpdateRequest(
                    mutation.source,
                    mutation.value,
                    mutation.requestId,
                  ),
                )
              : await permissionGovernanceApi.copyPermissionScheme(
                  toPermissionSchemeCopyRequest(
                    mutation.source,
                    mutation.value,
                    mutation.requestId,
                  ),
                )
            : (() => {
                throw new ApiError('未找到待修改或复制的权限', 'validation')
              })()
      await ensureApps()
      rememberResources(response.resource_tree ?? [])
      const mapped = mapPermissionScheme(response, apps.value, {
        canMaintain: options.canMaintain(),
      })
      rememberPermission(mapped)
      pendingMutation = undefined
      notification.success(
        mutation.mode === 'edit'
          ? '修改已保存'
          : mutation.mode === 'create'
            ? '权限已创建'
            : '权限副本已创建',
      )
      return mapped
    } catch (error) {
      if (!isUnknownPermissionGovernanceMutation(error)) pendingMutation = undefined
      reportPermissionGovernanceMutationError(
        error,
        mutation.mode === 'edit'
          ? '编辑权限'
          : mutation.mode === 'create'
            ? '创建权限'
            : '复制权限',
        { canRetryWithSameRequestId: true },
      )
      throw error
    }
  }

  async function retry(): Promise<void> {
    pendingMutation = undefined
    await queryPermissions(activeQuery)
  }

  return {
    apps,
    permissions,
    resources,
    total,
    state,
    queryPermissions,
    loadParentPermissions,
    loadPermissionDetail,
    submitPermission,
    retry,
  }
}
