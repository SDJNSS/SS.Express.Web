import { ref } from 'vue'
import type { PagedEntityQuery, PagedEntityOption } from '@shared/types/pagedOptions'
import type { EntityId } from '@shared/types/entityId'
import { notification } from '@shared/services/notification'
import { sameEntityId } from '@shared/utils/entityId'

import {
  mapPermissionGovernanceApps,
  mapPermissionResource,
  mapPermissionResourcesPage,
  toPermissionResourceQueryRequest,
} from '../adapters/permissionGovernanceAdapter'
import {
  ApiError,
  createRequestId,
  permissionGovernanceApi,
  type IamPermissionResourceCreateRequest,
  type IamPermissionResourceUpdateRequest,
} from '../api/permissionGovernanceApi'
import {
  createSystemResourceRequest,
  updateSystemResourceRequest,
} from '../adapters/systemResourceForm'
import type {
  PermissionGovernanceApp,
  PermissionGovernancePreviewState,
  ResourceCatalogQuery,
  SystemResourceRecord,
  SystemResourceFormValue,
  PermissionResourceType,
} from '../types/permissionGovernance'
import {
  isUnknownPermissionGovernanceMutation,
  reportPermissionGovernanceMutationError,
  reportPermissionGovernanceQueryError,
} from './permissionGovernanceFeedback'

const defaultQuery = (): ResourceCatalogQuery => ({
  keyword: '',
  appId: '',
  resourceType: '',
  status: '',
  pageIndex: 1,
  pageSize: 10,
})

export function useSystemResourceCatalog(options: {
  canCreate: () => boolean
  canEdit: () => boolean
}) {
  const apps = ref<PermissionGovernanceApp[]>([])
  const records = ref<SystemResourceRecord[]>([])
  const total = ref(0)
  const state = ref<PermissionGovernancePreviewState>('loading')
  let activeQuery = defaultQuery()
  let loadSequence = 0
  let pendingMutation:
    | { mode: 'create'; request: IamPermissionResourceCreateRequest }
    | { mode: 'edit'; request: IamPermissionResourceUpdateRequest }
    | undefined

  async function ensureApps(): Promise<PermissionGovernanceApp[]> {
    if (apps.value.length) return apps.value
    const response = await permissionGovernanceApi.querySystems({})
    apps.value = mapPermissionGovernanceApps(response)
    return apps.value
  }

  async function queryResources(query: ResourceCatalogQuery = activeQuery): Promise<void> {
    activeQuery = { ...query }
    const sequence = ++loadSequence
    state.value = 'loading'
    try {
      const appRecords = await ensureApps()
      const response = await permissionGovernanceApi.queryPermissionResources(
        toPermissionResourceQueryRequest(activeQuery),
      )
      if (sequence !== loadSequence) return
      const page = mapPermissionResourcesPage(response, appRecords)
      records.value = page.items
      total.value = page.total
      state.value = page.items.length ? 'ready' : 'empty'
    } catch (error) {
      if (sequence !== loadSequence) return
      records.value = []
      total.value = 0
      state.value = 'retryable-error'
      reportPermissionGovernanceQueryError(error, '系统资源目录加载失败')
    }
  }

  async function loadResourceDetail(record: SystemResourceRecord): Promise<SystemResourceRecord> {
    try {
      const response = await permissionGovernanceApi.getPermissionResource({
        id: record.resourceId,
      })
      const mapped = mapPermissionResource(response, await ensureApps())
      const index = records.value.findIndex((item) =>
        sameEntityId(item.resourceId, mapped.resourceId),
      )
      if (index >= 0) records.value.splice(index, 1, mapped)
      return mapped
    } catch (error) {
      reportPermissionGovernanceQueryError(error, '资源详情加载失败')
      throw error
    }
  }

  async function loadParents(
    appId: EntityId,
    type: PermissionResourceType,
    excludedId: EntityId | undefined,
    query: PagedEntityQuery,
  ): Promise<{ items: PagedEntityOption<EntityId>[]; total: number }> {
    const response = await permissionGovernanceApi.queryPermissionResources({
      app_id: appId,
      source: 'frontend',
      resource_type: type.toLowerCase() as 'module' | 'menu' | 'button_page',
      status: 'active',
      keyword: query.keyword,
      page_index: query.pageIndex,
      page_size: query.pageSize,
    })
    return {
      items: response.items
        .filter((item) => !sameEntityId(item.id, excludedId))
        .map((item) => ({
          id: item.id,
          label: item.resource_name,
          description: item.resource_code,
        })),
      total: response.total,
    }
  }

  async function submitResource(
    value: SystemResourceFormValue,
    mode: 'create' | 'edit',
    source?: SystemResourceRecord,
    reusePendingRequestId = false,
  ): Promise<SystemResourceRecord> {
    if (!(mode === 'create' ? options.canCreate() : options.canEdit()))
      throw new ApiError('当前账号无权维护此资源', 'permission')
    if (
      mode === 'edit' &&
      (!source || value.resourceType !== source.resourceType || value.appId !== source.appId)
    )
      throw new ApiError('资源所属 App、类型和编码不允许修改', 'validation')
    const mutation = reusePendingRequestId
      ? pendingMutation
      : mode === 'create'
        ? {
            mode: 'create' as const,
            request: createSystemResourceRequest(value, createRequestId()),
          }
        : {
            mode: 'edit' as const,
            request: updateSystemResourceRequest(value, source!, createRequestId()),
          }
    if (!mutation || mutation.mode !== mode)
      throw new ApiError('没有可重试的资源写入请求', 'validation')
    pendingMutation = mutation
    try {
      const response =
        mutation.mode === 'create'
          ? await permissionGovernanceApi.createPermissionResource(mutation.request)
          : await permissionGovernanceApi.updatePermissionResource(mutation.request)
      pendingMutation = undefined
      const mapped = mapPermissionResource(response, apps.value)
      notification.success(mode === 'create' ? '资源已创建' : '修改已保存')
      return mapped
    } catch (error) {
      if (!isUnknownPermissionGovernanceMutation(error)) pendingMutation = undefined
      reportPermissionGovernanceMutationError(error, mode === 'create' ? '创建资源' : '编辑资源', {
        canRetryWithSameRequestId: true,
      })
      throw error
    }
  }

  async function retry(): Promise<void> {
    await queryResources(activeQuery)
  }

  return {
    apps,
    records,
    total,
    state,
    queryResources,
    loadResourceDetail,
    loadParents,
    submitResource,
    retry,
  }
}
