import { ref } from 'vue'

import { notifyPermissionCatalogChanged } from '@shared/services/permissionCatalogEvents'
import { notification } from '@shared/services/notification'

import { mapApplications } from '../adapters/applicationResourcesAdapter'
import { ApiError, applicationResourcesApi } from '../api/applicationResourcesApi'
import type {
  ApplicationFormValue,
  ApplicationRecord,
  ApplicationResourcesState,
  CatalogDeleteImpact,
  CatalogTarget,
  PermissionResourceRecord,
  ResourceFormValue,
} from '../types/applicationResources'

function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback
  if (error.category === 'network') return '无法连接权限服务，请检查网络后重试'
  if (error.category === 'authentication') return '登录状态已失效，请重新登录'
  if (error.category === 'permission') return '当前账号无权维护应用与权限资源'
  if (error.status === 409) return '数据已被其他用户修改，请刷新完整目录后重试'
  return error.message || fallback
}

function requireSucceeded(succeeded: boolean, message: string, fallback: string): void {
  if (!succeeded) throw new ApiError(message || fallback, 'business')
}

function normalized(value: string): string {
  return value.trim()
}

export function useApplicationResources() {
  const applications = ref<ApplicationRecord[]>([])
  const state = ref<ApplicationResourcesState>('loading')
  const catalogWarning = ref('')
  let loadSequence = 0

  async function load(): Promise<void> {
    const sequence = ++loadSequence
    const hadData = applications.value.length > 0
    catalogWarning.value = ''
    state.value = 'loading'
    try {
      const response = await applicationResourcesApi.getSystemResources()
      if (sequence !== loadSequence) return
      applications.value = mapApplications(response.apps ?? [])
      state.value = applications.value.length ? 'ready' : 'empty'
    } catch (error) {
      if (sequence !== loadSequence) return
      if (error instanceof ApiError && error.category === 'cancelled') return
      if (error instanceof ApiError && error.category === 'permission') {
        applications.value = []
        state.value = 'unauthorized'
        return
      }
      const message = errorMessage(error, '应用与权限资源加载失败')
      if (hadData) {
        state.value = 'ready'
        catalogWarning.value = `${message}；当前目录可能不是最新数据。`
        notification.warning(catalogWarning.value)
        return
      }
      applications.value = []
      state.value = 'retryable-error'
      notification.error(message)
    }
  }

  async function refreshAfterMutation(): Promise<void> {
    await Promise.all([load(), notifyPermissionCatalogChanged()])
  }

  async function submitApplication(
    value: ApplicationFormValue,
    mode: 'create' | 'edit',
    record?: ApplicationRecord,
  ): Promise<void> {
    try {
      if (mode === 'create') {
        await applicationResourcesApi.createApplication({
          app_name: normalized(value.appName),
          description: normalized(value.description),
          icon: normalized(value.icon),
          route_prefix: normalized(value.routePrefix),
          status: value.status.toUpperCase(),
          remarks: normalized(value.remarks),
        })
        notification.success('App 已创建，默认 Module 已同步生成')
      } else {
        if (!record) throw new ApiError('未找到待编辑的 App', 'validation')
        await applicationResourcesApi.updateApplication({
          id: record.id,
          version: record.version,
          app_name: normalized(value.appName),
          description: normalized(value.description),
          icon: normalized(value.icon),
          route_prefix: normalized(value.routePrefix),
          remarks: normalized(value.remarks),
        })
        notification.success('App 修改已保存')
      }
      await refreshAfterMutation()
    } catch (error) {
      const message = errorMessage(error, mode === 'create' ? 'App 创建失败' : 'App 保存失败')
      notification.error(message)
      throw new ApiError(message, error instanceof ApiError ? error.category : 'system')
    }
  }

  async function submitResource(
    value: ResourceFormValue,
    mode: 'create' | 'edit',
    record?: PermissionResourceRecord,
  ): Promise<void> {
    const common = {
      app_id: value.appId,
      parent_id: value.parentId,
      resource_name: normalized(value.resourceName),
      resource_type: value.resourceType.toUpperCase(),
      route_path: normalized(value.routePath),
      component: normalized(value.component),
      permission_code: normalized(value.permissionCode),
      icon: normalized(value.icon),
      http_method: normalized(value.httpMethod),
      api_path: normalized(value.apiPath),
      is_visible: value.isVisible,
      sort_order: value.sortOrder,
      remarks: normalized(value.remarks),
    }
    try {
      if (mode === 'create') {
        await applicationResourcesApi.createResource({
          ...common,
          status: value.status.toUpperCase(),
        })
        notification.success(`${value.resourceType.toUpperCase()} 已创建`)
      } else {
        if (!record) throw new ApiError('未找到待编辑的资源', 'validation')
        await applicationResourcesApi.updateResource({
          id: record.id,
          version: record.version,
          ...common,
        })
        notification.success(`${value.resourceType.toUpperCase()} 修改已保存`)
      }
      await refreshAfterMutation()
    } catch (error) {
      const message = errorMessage(error, mode === 'create' ? '资源创建失败' : '资源保存失败')
      notification.error(message)
      throw new ApiError(message, error instanceof ApiError ? error.category : 'system')
    }
  }

  async function submitStatus(
    target: CatalogTarget,
    targetStatus: 'active' | 'disabled',
  ): Promise<void> {
    try {
      const request = {
        id: target.id,
        version: target.version,
        target_status: targetStatus.toUpperCase(),
      }
      const response =
        target.targetType === 'application'
          ? await applicationResourcesApi.changeApplicationStatus(request)
          : await applicationResourcesApi.changeResourceStatus(request)
      requireSucceeded(response.succeeded, response.message, '状态更新未成功')
      notification.success(`${target.name}已${targetStatus === 'active' ? '启用' : '停用'}`)
      await refreshAfterMutation()
    } catch (error) {
      const message = errorMessage(error, '状态更新失败')
      notification.error(message)
      throw new ApiError(message, error instanceof ApiError ? error.category : 'system')
    }
  }

  async function submitDelete(target: CatalogTarget, impact: CatalogDeleteImpact): Promise<void> {
    if (impact.isLastModule) throw new ApiError('每个 App 至少保留一个 Module', 'validation')
    try {
      const response =
        target.targetType === 'application'
          ? await applicationResourcesApi.deleteApplication({
              id: target.id,
              version: target.version,
              confirm_delete_resources: true,
            })
          : await applicationResourcesApi.deleteResource({
              id: target.id,
              version: target.version,
              confirm_delete_descendants: true,
            })
      requireSucceeded(response.succeeded, '', '删除未成功')
      notification.success(
        `${target.name}已删除：处理 ${response.deleted_resource_count} 个资源，撤销 ${response.revoked_role_grant_count} 条角色授权`,
      )
      await refreshAfterMutation()
    } catch (error) {
      const message = errorMessage(error, '删除失败')
      notification.error(message)
      throw new ApiError(message, error instanceof ApiError ? error.category : 'system')
    }
  }

  return {
    applications,
    state,
    catalogWarning,
    load,
    submitApplication,
    submitResource,
    submitStatus,
    submitDelete,
  }
}
