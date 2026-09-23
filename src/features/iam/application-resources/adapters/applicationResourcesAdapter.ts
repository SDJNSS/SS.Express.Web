import type {
  IamApplicationResourceResponse,
  IamModuleResourceResponse,
  IamResourceTreeResponse,
} from '../api/applicationResourcesApi'
import type {
  ApplicationRecord,
  CatalogStatus,
  PermissionResourceRecord,
  PermissionResourceType,
} from '../types/applicationResources'

function catalogStatus(value: string): CatalogStatus {
  return value.trim().toUpperCase() === 'ACTIVE' ? 'active' : 'disabled'
}

function resourceType(value: string): PermissionResourceType {
  const normalized = value.trim().toLowerCase()
  return ['module', 'menu', 'page', 'function'].includes(normalized)
    ? (normalized as PermissionResourceType)
    : 'function'
}

function hierarchyReason(parentType: PermissionResourceType | 'app', type: PermissionResourceType) {
  const allowed: Record<PermissionResourceType | 'app', PermissionResourceType[]> = {
    app: ['module'],
    module: ['menu'],
    menu: ['page', 'function'],
    page: ['page', 'function'],
    function: [],
  }
  return allowed[parentType].includes(type)
    ? ''
    : `${parentType === 'app' ? 'App' : parentType} 下不允许挂载 ${type}`
}

function mapResource(
  value: IamResourceTreeResponse,
  parentType: PermissionResourceType | 'app',
): PermissionResourceRecord {
  const type = resourceType(value.resource_type)
  const nested = [
    ...(value.children ?? []),
    ...(value.menus ?? []),
    ...(value.pages ?? []),
    ...(value.functions ?? []),
  ].filter((child, index, all) => all.findIndex((candidate) => candidate.id === child.id) === index)
  const mismatchReason = hierarchyReason(parentType, type)
  const functionChildrenReason =
    type === 'function' && nested.length ? 'Function 必须是叶子节点，不能包含子资源' : ''
  return {
    id: value.id,
    appId: value.app_id,
    parentId: value.parent_id,
    resourceCode: value.resource_code,
    resourceName: value.resource_name,
    resourceType: type,
    routePath: value.route_path,
    component: value.component,
    permissionCode: value.permission_code,
    icon: value.icon,
    httpMethod: value.http_method,
    apiPath: value.api_path,
    isVisible: value.is_visible,
    sortOrder: value.sort_order,
    status: catalogStatus(value.status),
    remarks: value.remarks,
    isCurrentlyEffective: value.is_currently_effective && !mismatchReason,
    invalidReason: [value.invalid_reason, mismatchReason, functionChildrenReason]
      .filter(Boolean)
      .join('；'),
    canMaintain: value.can_maintain,
    version: value.version,
    createdAt: value.created_at,
    createdBy: value.created_by,
    updatedAt: value.updated_at,
    updatedBy: value.updated_by,
    children:
      type === 'function' ? [] : nested.map((child) => mapResource(child, type)).sort(bySortOrder),
  }
}

function bySortOrder(left: PermissionResourceRecord, right: PermissionResourceRecord): number {
  return left.sortOrder - right.sortOrder || left.resourceCode.localeCompare(right.resourceCode)
}

function mapModule(value: IamModuleResourceResponse): PermissionResourceRecord {
  return mapResource(value, 'app')
}

export function mapApplication(value: IamApplicationResourceResponse): ApplicationRecord {
  return {
    id: value.id,
    appCode: value.app_code,
    appName: value.app_name,
    description: value.description,
    icon: value.icon,
    routePrefix: value.route_prefix,
    status: catalogStatus(value.status),
    remarks: value.remarks,
    canMaintain: value.can_maintain,
    version: value.version,
    createdAt: value.created_at,
    createdBy: value.created_by,
    updatedAt: value.updated_at,
    updatedBy: value.updated_by,
    modules: (value.modules ?? []).map(mapModule).sort(bySortOrder),
  }
}

export function mapApplications(values: IamApplicationResourceResponse[]): ApplicationRecord[] {
  return values
    .map(mapApplication)
    .sort((left, right) => left.appCode.localeCompare(right.appCode, 'zh-CN'))
}
