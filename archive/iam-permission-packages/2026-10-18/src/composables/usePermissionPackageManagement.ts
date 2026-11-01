import { ref } from 'vue'

import { notification } from '@shared/services/notification'
import { currentTenantId } from '@features/iam/foundation/public'

import {
  mapPermissionGovernanceApps,
  mapPermissionPackage,
  mapPermissionPackagesPage,
  toPermissionPackageCreateRequest,
  toPermissionPackageQueryRequest,
  toPermissionPackageUpdateRequest,
} from '../adapters/permissionGovernanceAdapter'
import { ApiError, createRequestId, permissionGovernanceApi } from '../api/permissionGovernanceApi'
import type {
  PermissionGovernanceApp,
  PermissionGovernancePreviewState,
  PermissionPackageFormValue,
  PermissionPackageQuery,
  PermissionPackageRecord,
} from '../types/permissionGovernance'
import {
  isUnknownPermissionGovernanceMutation,
  reportPermissionGovernanceMutationError,
  reportPermissionGovernanceQueryError,
} from './permissionGovernanceFeedback'

interface PermissionPackageManagementOptions {
  canMaintain: () => boolean
}

const defaultQuery = (): PermissionPackageQuery => ({
  packageName: '',
  appId: '',
  status: '',
  pageIndex: 1,
  pageSize: 10,
})

export function usePermissionPackageManagement(options: PermissionPackageManagementOptions) {
  const apps = ref<PermissionGovernanceApp[]>([])
  const packages = ref<PermissionPackageRecord[]>([])
  const total = ref(0)
  const state = ref<PermissionGovernancePreviewState>('loading')
  const tenantId = currentTenantId()
  let activeQuery = defaultQuery()
  let loadSequence = 0
  let pendingMutation:
    | {
        requestId: string
        value: PermissionPackageFormValue
        mode: 'create' | 'edit'
        source?: PermissionPackageRecord
      }
    | undefined

  async function ensureApps(): Promise<PermissionGovernanceApp[]> {
    if (apps.value.length) return apps.value
    const response = await permissionGovernanceApi.querySystems({})
    apps.value = mapPermissionGovernanceApps(response)
    return apps.value
  }

  async function queryPackages(query: PermissionPackageQuery = activeQuery): Promise<void> {
    activeQuery = { ...query }
    const sequence = ++loadSequence
    state.value = 'loading'
    try {
      const appRecords = await ensureApps()
      const response = await permissionGovernanceApi.queryPermissionPackages(
        toPermissionPackageQueryRequest(activeQuery, tenantId),
      )
      if (sequence !== loadSequence) return
      const page = mapPermissionPackagesPage(response, appRecords, {
        canMaintain: options.canMaintain(),
      })
      packages.value = page.items
      total.value = page.total
      state.value = page.items.length ? 'ready' : 'empty'
    } catch (error) {
      if (sequence !== loadSequence) return
      packages.value = []
      total.value = 0
      state.value = 'retryable-error'
      reportPermissionGovernanceQueryError(error, '权限包列表加载失败')
    }
  }

  async function loadPackageDetail(
    record: PermissionPackageRecord,
  ): Promise<PermissionPackageRecord> {
    try {
      const response = await permissionGovernanceApi.getPermissionPackage({
        tenant_id: tenantId,
        id: record.id,
      })
      const mapped = mapPermissionPackage(response, await ensureApps(), {
        canMaintain: options.canMaintain(),
      })
      const index = packages.value.findIndex((item) => item.id === mapped.id)
      if (index >= 0) packages.value.splice(index, 1, mapped)
      return mapped
    } catch (error) {
      reportPermissionGovernanceQueryError(error, '权限包详情加载失败')
      throw error
    }
  }

  function rememberPackage(record: PermissionPackageRecord): void {
    const index = packages.value.findIndex((item) => item.id === record.id)
    if (index >= 0) packages.value.splice(index, 1, record)
    else {
      packages.value.unshift(record)
      total.value += 1
    }
  }

  async function submitPackage(
    value: PermissionPackageFormValue,
    mode: 'create' | 'edit',
    source?: PermissionPackageRecord,
    mutationOptions: { reusePendingRequestId?: boolean } = {},
  ): Promise<PermissionPackageRecord> {
    const mutation = mutationOptions.reusePendingRequestId
      ? pendingMutation
      : {
          requestId: createRequestId(),
          value: { ...value },
          mode,
          ...(source ? { source } : {}),
        }
    if (!mutation) throw new ApiError('没有可重试的权限包写入请求', 'validation')
    pendingMutation = mutation
    try {
      const response =
        mutation.mode === 'create'
          ? await permissionGovernanceApi.createPermissionPackage(
              toPermissionPackageCreateRequest(mutation.value, tenantId, mutation.requestId),
            )
          : mutation.source
            ? await permissionGovernanceApi.updatePermissionPackage(
                toPermissionPackageUpdateRequest(
                  mutation.source,
                  mutation.value,
                  mutation.requestId,
                ),
              )
            : (() => {
                throw new ApiError('未找到待编辑的权限包', 'validation')
              })()
      const mapped = mapPermissionPackage(response, await ensureApps(), {
        canMaintain: options.canMaintain(),
      })
      rememberPackage(mapped)
      pendingMutation = undefined
      notification.success(mutation.mode === 'create' ? '权限包已创建' : '权限包修改已保存')
      return mapped
    } catch (error) {
      if (!isUnknownPermissionGovernanceMutation(error)) pendingMutation = undefined
      reportPermissionGovernanceMutationError(
        error,
        mutation.mode === 'create' ? '创建权限包' : '保存权限包',
        { canRetryWithSameRequestId: true },
      )
      throw error
    }
  }

  async function retry(): Promise<void> {
    pendingMutation = undefined
    await queryPackages(activeQuery)
  }

  return {
    apps,
    packages,
    total,
    state,
    queryPackages,
    loadPackageDetail,
    submitPackage,
    retry,
  }
}
