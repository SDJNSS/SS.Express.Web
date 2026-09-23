import type {
  IamDataPermissionDomainResponse,
  IamFunctionPermissionTreeResponse,
  IamFunctionPermissionResourceResponse,
  IamFunctionPermissionResourceTreeNode,
  IamInvalidDataPermissionResourceResponse,
  IamMemberDataPermissionResponse,
  IamResourceCatalogResponse,
  IamRoleAssignmentDetailResponse,
  IamRoleDataPermissionDetailResponse,
  IamRoleDetailResponse,
  IamSystemResponse,
} from '../api/accessControlApi'
import type {
  AssignmentRecord,
  DataDomainRecord,
  DataScopeMode,
  InvalidDataPermissionResourceRecord,
  MemberDataPermissionRecord,
  MemberFunctionPermissionRecord,
  MemberPermissionSubject,
  FunctionPermissionSubject,
  ResourceNode,
  RoleDataPermissionRecord,
  RoleRecord,
  SystemRecord,
} from '../types/accessControl'

function entityStatus(value: string): 'ACTIVE' | 'DISABLED' {
  return value.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'DISABLED'
}

function resourceType(value: string): ResourceNode['resourceType'] {
  const normalized = value.toUpperCase()
  return ['MODULE', 'MENU', 'PAGE', 'FUNCTION'].includes(normalized)
    ? (normalized as ResourceNode['resourceType'])
    : 'FUNCTION'
}

export function mapSystem(value: IamSystemResponse): SystemRecord {
  return {
    id: value.id,
    appCode: value.app_code,
    appName: value.app_name,
    description: value.description,
    icon: value.icon,
    routePrefix: value.route_prefix,
    status: entityStatus(value.status),
    remarks: value.remarks,
    canMaintain: value.can_maintain,
    version: value.version,
    createdAt: value.created_at,
    createdBy: value.created_by,
    updatedAt: value.updated_at,
    updatedBy: value.updated_by,
  }
}

export function mapResource(
  value: IamResourceCatalogResponse | IamFunctionPermissionResourceResponse,
): ResourceNode {
  const permissionValue = value as Partial<IamFunctionPermissionResourceResponse>
  return {
    id: value.id,
    appId: value.app_id,
    ...(value.parent_id ? { parentId: value.parent_id } : {}),
    resourceCode: value.resource_code,
    resourceName: value.resource_name,
    resourceType: resourceType(value.resource_type),
    routePath: value.route_path,
    component: value.component,
    permissionCode: value.permission_code,
    icon: value.icon,
    httpMethod: value.http_method,
    apiPath: value.api_path,
    isVisible: value.is_visible,
    sortOrder: value.sort_order,
    status: entityStatus(value.status),
    remarks: value.remarks,
    isCurrentlyEffective: value.is_currently_effective,
    invalidReason: value.invalid_reason,
    canMaintain: value.can_maintain,
    version: value.version,
    createdAt: value.created_at,
    createdBy: value.created_by,
    updatedAt: value.updated_at,
    updatedBy: value.updated_by,
    ...('is_direct' in value ? { isDirect: Boolean(permissionValue.is_direct) } : {}),
    ...('is_navigation_only' in value
      ? { isNavigationOnly: Boolean(permissionValue.is_navigation_only) }
      : {}),
    ...(permissionValue.is_direct
      ? { permissionSource: 'direct' as const }
      : permissionValue.is_navigation_only
        ? { permissionSource: 'navigation' as const }
        : { permissionSource: 'none' as const }),
    ...(permissionValue.source_roles?.length
      ? {
          sourceRoles: permissionValue.source_roles.map((role) => ({
            id: role.id,
            tenantId: role.tenant_id,
            tenantCode: role.tenant_code,
            roleCode: role.role_code,
            roleName: role.role_name,
            roleType: role.role_type.toUpperCase() === 'SYSTEM' ? 'SYSTEM' : 'CUSTOM',
          })),
          sourceRoleNames: permissionValue.source_roles.map((role) => role.role_name),
        }
      : {}),
    children: (value.children ?? []).map(mapResource),
  }
}

export function mapPermissionTree(nodes: IamFunctionPermissionResourceTreeNode[]): ResourceNode[] {
  return nodes.map((node) => ({
    ...mapResource(node.resource),
    children: mapPermissionTree(node.children ?? []),
  }))
}

export function mapRole(value: IamRoleDetailResponse): RoleRecord {
  return {
    id: value.id,
    tenantId: value.tenant_id,
    tenantCode: value.tenant_code,
    roleCode: value.role_code,
    roleName: value.role_name,
    roleType: value.role_type.toUpperCase() === 'SYSTEM' ? 'SYSTEM' : 'CUSTOM',
    sortOrder: value.sort_order,
    status: entityStatus(value.status),
    description: value.description,
    remarks: value.remarks,
    isCurrentlyEffective: value.is_currently_effective,
    isGroupControlled: value.is_group_controlled,
    canMaintain: value.can_maintain,
    version: value.version,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  }
}

export function mapDataDomain(value: IamDataPermissionDomainResponse): DataDomainRecord {
  return {
    id: value.id,
    appId: value.app_id,
    appCode: value.app_code,
    domainCode: value.domain_code,
    domainName: value.domain_name,
    supportedScopes: value.supported_scopes.map((scope) => scope as DataScopeMode),
    selfDefinition: value.self_definition,
    status: entityStatus(value.status),
    linkedResourceIds: value.linked_resource_ids,
    isConfigurationValid: value.is_configuration_valid,
    invalidReason: value.invalid_reason,
  }
}

export function mapInvalidDataPermissionResource(
  value: IamInvalidDataPermissionResourceResponse,
): InvalidDataPermissionResourceRecord {
  return {
    resourceId: value.resource_id,
    appId: value.app_id,
    resourceCode: value.resource_code,
    resourceName: value.resource_name,
    invalidReason: value.invalid_reason,
  }
}

export function mapRoleDataPermission(
  value: IamRoleDataPermissionDetailResponse,
  tenantNames: ReadonlyMap<number, string> = new Map(),
): RoleDataPermissionRecord {
  return {
    domainCode: value.domain_code,
    domainName: value.domain_name,
    isConfigured: value.is_configured,
    ...(value.scope_mode ? { scopeMode: value.scope_mode as DataScopeMode } : {}),
    targetTenantIds: value.target_tenant_ids,
    targetTenantNames: value.target_tenant_ids.map(
      (tenantId) => tenantNames.get(tenantId) ?? `Tenant #${tenantId}`,
    ),
    isCurrentlyEffective: value.is_currently_effective,
    invalidReason: value.invalid_reason,
    version: value.version,
  }
}

export function mapAssignment(value: IamRoleAssignmentDetailResponse): AssignmentRecord {
  return {
    assignmentId: value.assignment_id,
    tenantId: value.tenant_id,
    tenantUserId: value.tenant_user_id,
    tenantUserCode: value.tenant_user_code,
    displayName: value.display_name,
    roleId: value.role_id,
    roleCode: value.role_code,
    roleName: value.role_name,
    roleType: value.role_type.toUpperCase() === 'SYSTEM' ? 'SYSTEM' : 'CUSTOM',
    isTenantAdminIdentity: value.is_tenant_admin_identity,
    isGroupControlled: value.is_group_controlled,
    isAssigned: value.is_assigned,
    isCurrentlyEffective: value.is_currently_effective,
    canMaintain: value.can_maintain,
    invalidReason: value.invalid_reason,
    memberVersion: value.member_version,
  }
}

export function mapMemberPermissionSubject(
  value: IamFunctionPermissionTreeResponse['subject'],
): MemberPermissionSubject {
  return {
    tenantId: value.tenant_id,
    tenantUserId: value.subject_id,
    tenantUserCode: value.subject_code,
    displayName: value.subject_name,
    isCurrentlyEffective: value.is_currently_effective,
    invalidReason: value.invalid_reason,
  }
}

export function mapFunctionPermissionSubject(
  value: IamFunctionPermissionTreeResponse['subject'],
): FunctionPermissionSubject {
  const subjectType = value.subject_type.toLowerCase()
  return {
    subjectType: subjectType === 'role' ? 'role' : subjectType === 'member' ? 'member' : 'user',
    subjectId: value.subject_id,
    tenantId: value.tenant_id,
    subjectCode: value.subject_code,
    subjectName: value.subject_name,
    isCurrentlyEffective: value.is_currently_effective,
    invalidReason: value.invalid_reason,
    version: value.version,
  }
}

export function mapEffectiveFunctionPermissionRecords(
  nodes: ResourceNode[],
  effectiveResourceIds: ReadonlySet<number>,
  systemsById: ReadonlyMap<number, SystemRecord>,
): MemberFunctionPermissionRecord[] {
  const records: MemberFunctionPermissionRecord[] = []

  function visit(branch: ResourceNode[], ancestors: ResourceNode[]) {
    branch.forEach((node) => {
      const path = [...ancestors, node]
      if (node.resourceType === 'FUNCTION' && effectiveResourceIds.has(node.id)) {
        const system = systemsById.get(node.appId)
        const module = ancestors.find((item) => item.resourceType === 'MODULE')
        const menu = ancestors.find((item) => item.resourceType === 'MENU')
        records.push({
          id: node.id,
          appId: node.appId,
          appCode: system?.appCode ?? '',
          appName: system?.appName ?? '',
          moduleId: module?.id ?? 0,
          moduleName: module?.resourceName ?? '',
          menuId: menu?.id ?? 0,
          menuName: menu?.resourceName ?? '',
          resourceCode: node.resourceCode,
          resourceName: node.resourceName,
          permissionCode: node.permissionCode,
          sourceRoleNames: (node.sourceRoles ?? []).map(
            (role) => `${role.tenantCode} · ${role.roleName}`,
          ),
        })
      }
      visit(node.children ?? [], path)
    })
  }

  visit(nodes, [])
  return records
}

export function mapMemberDataPermissions(
  value: IamMemberDataPermissionResponse,
): MemberDataPermissionRecord[] {
  return value.domains.flatMap((domain) =>
    domain.sources.map((source) => ({
      key: `${domain.app_id}:${domain.domain_code}:${source.role.id}`,
      appCode: domain.app_code,
      appName: domain.app_name,
      domainCode: domain.domain_code,
      domainName: domain.domain_name,
      roleCode: source.role.role_code,
      roleName: source.role.role_name,
      scopeMode: source.scope_mode,
      targetTenantIds: source.target_tenant_ids,
      isCurrentlyEffective: source.is_currently_effective,
      invalidReason: source.invalid_reason,
    })),
  )
}
