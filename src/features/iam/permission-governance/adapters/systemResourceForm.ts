import type {
  IamPermissionResourceCreateRequest,
  IamPermissionResourceUpdateRequest,
} from '../api/permissionGovernanceApi'
import type {
  PermissionResourceType,
  SystemResourceFormValue,
  SystemResourceRecord,
} from '../types/permissionGovernance'

export function emptySystemResourceForm(): SystemResourceFormValue {
  return {
    appId: '',
    parentId: undefined,
    resourceName: '',
    resourceType: 'MODULE',
    routePath: '',
    component: '',
    icon: '',
    httpMethod: 'POST',
    apiPath: '',
    functionAccessMode: 'read',
    sortOrder: 0,
    remarks: '',
    authorizationCategory: 'business',
    isComposable: false,
    lifecycle: 'active',
  }
}

export function systemResourceForm(record: SystemResourceRecord): SystemResourceFormValue {
  return {
    appId: record.appId,
    parentId: record.parentId === '0' || record.parentId === 0 ? undefined : record.parentId,
    resourceName: record.resourceName,
    resourceType: record.resourceType,
    routePath: record.routePath,
    component: record.component,
    icon: record.icon,
    httpMethod: record.httpMethod || 'POST',
    apiPath: record.apiPath,
    functionAccessMode: record.functionAccessMode ?? 'read',
    sortOrder: record.sortOrder,
    remarks: record.remarks,
    authorizationCategory: record.authorizationCategory ?? 'business',
    isComposable: record.isComposable ?? false,
    lifecycle: record.lifecycle ?? 'active',
  }
}

export function resourceParentTypes(type: PermissionResourceType): PermissionResourceType[] {
  if (type === 'MENU') return ['MODULE']
  if (type === 'BUTTON' || type === 'BUTTON_PAGE') return ['MENU', 'BUTTON_PAGE']
  return []
}

export function systemResourceRequest(value: SystemResourceFormValue) {
  const backend = value.resourceType === 'FUNCTION'
  const routed = value.resourceType === 'MENU' || value.resourceType === 'BUTTON_PAGE'
  return {
    app_id: value.appId as SystemResourceRecord['appId'],
    parent_id: resourceParentTypes(value.resourceType).length ? (value.parentId ?? '0') : '0',
    resource_name: value.resourceName.trim(),
    route_path: routed ? value.routePath.trim() : '',
    component: routed ? value.component.trim() : '',
    icon: value.icon.trim(),
    http_method: backend ? value.httpMethod.trim().toUpperCase() : '',
    api_path: backend ? value.apiPath.trim() : '',
    function_access_mode: backend ? value.functionAccessMode : null,
    is_visible: value.resourceType === 'MENU',
    sort_order: value.sortOrder,
    remarks: value.remarks.trim(),
    authorization_category: backend ? value.authorizationCategory : ('business' as const),
    is_composable: backend && value.authorizationCategory === 'business' && value.isComposable,
    lifecycle: value.lifecycle,
  }
}

export function createSystemResourceRequest(
  value: SystemResourceFormValue,
  requestId: string,
): IamPermissionResourceCreateRequest {
  return {
    ...systemResourceRequest(value),
    source: value.resourceType === 'FUNCTION' ? 'backend' : 'frontend',
    resource_type:
      value.resourceType.toLowerCase() as IamPermissionResourceCreateRequest['resource_type'],
    // Manual creation delegates identity generation to IAM; no user-entered or random client code.
    resource_code: '',
    status: 'active',
    request_id: requestId,
  }
}

export function updateSystemResourceRequest(
  value: SystemResourceFormValue,
  source: SystemResourceRecord,
  requestId: string,
): IamPermissionResourceUpdateRequest {
  return {
    ...systemResourceRequest(value),
    id: source.resourceId,
    version: source.version,
    app_id: source.appId,
    request_id: requestId,
  }
}
