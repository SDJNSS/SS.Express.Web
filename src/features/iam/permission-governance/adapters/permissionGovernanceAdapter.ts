import { compareEntityIds, sameEntityId } from '@shared/utils/entityId'
import type { EntityId } from '@shared/types/entityId'
import type {
  IamPagedResponse,
  IamPermissionResourceQueryRequest,
  IamPermissionResourceResponse,
  IamPermissionSchemeCreateRequest,
  IamPermissionSchemeCopyRequest,
  IamPermissionSchemeFunctionInput,
  IamPermissionSchemeQueryRequest,
  IamPermissionSchemeRefNodeResponse,
  IamPermissionSchemeResponse,
  IamPermissionSchemeTreeSaveRequest,
  IamPermissionSchemeUpdateRequest,
  IamResolvedResourceNodeResponse,
  IamResolvedResourceResponse,
  IamSystemResponse,
} from '../api/permissionGovernanceApi'
import { createRequestId } from '../api/permissionGovernanceApi'
import type {
  EffectivePermissionSourceGrant,
  PermissionTreeNode,
  PermissionFormValue,
  PermissionGovernanceApp,
  PermissionGovernancePage,
  PermissionQuery,
  PermissionRecord,
  PermissionResourceType,
  PermissionRoleRecord,
  PermissionRoleType,
  PermissionSchemeResourceRefNode,
  PermissionStatus,
  ResourceCatalogQuery,
  SystemResourceRecord,
  SystemResourceTreeNode,
} from '../types/permissionGovernance'

export interface PermissionResourceMappingOptions {
  canMaintain?: boolean
  effectiveResourceIds?: ReadonlySet<EntityId>
}

export interface PermissionRecordMappingOptions {
  canMaintain?: boolean
}

export interface PermissionTreeBuildOptions {
  selectable?: boolean
  selectedPermissionIds?: ReadonlySet<EntityId>
  includedPermissionIds?: ReadonlySet<EntityId>
  includedResourceIds?: ReadonlySet<EntityId>
  sourceGrants?: readonly EffectivePermissionSourceGrant[]
}

export interface RoleAuthorizationMappingContext {
  tenantName: string
  roleType: PermissionRoleType
  status: PermissionRoleRecord['status']
  canMaintain: boolean
}

export interface UserEffectivePermissionRoleMetadata {
  roleType: PermissionRoleType
  status: PermissionRoleRecord['status']
  version: PermissionRoleRecord['version']
}

export interface UserEffectivePermissionsMappingContext {
  userName: string
  tenantName: string
  roleMetadataById?: ReadonlyMap<EntityId, UserEffectivePermissionRoleMetadata>
}

function entityStatus(value: string): PermissionStatus {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'active') return 'ACTIVE'
  if (normalized === 'inactive') return 'DISABLED'
  throw new Error(`未知权限状态：${value}`)
}

function resourceType(value: string): PermissionResourceType {
  const normalized = value.trim().toUpperCase()
  if (['MODULE', 'MENU', 'BUTTON', 'BUTTON_PAGE', 'FUNCTION'].includes(normalized)) {
    return normalized as PermissionResourceType
  }
  throw new Error(`未知权限资源类型：${value}`)
}

function uniqueIds(values: readonly EntityId[]): EntityId[] {
  return [...new Set(values)]
}

function apiStatus(value: PermissionStatus) {
  return value === 'ACTIVE' ? ('active' as const) : ('inactive' as const)
}

function apiResourceType(
  value: PermissionResourceType,
): NonNullable<IamPermissionResourceQueryRequest['resource_type']> {
  return value.toLowerCase() as NonNullable<IamPermissionResourceQueryRequest['resource_type']>
}

function bySortOrder(
  left: Pick<SystemResourceRecord, 'sortOrder' | 'resourceId'>,
  right: Pick<SystemResourceRecord, 'sortOrder' | 'resourceId'>,
) {
  return left.sortOrder - right.sortOrder || compareEntityIds(left.resourceId, right.resourceId)
}

function appLookup(apps: readonly PermissionGovernanceApp[]) {
  return new Map(apps.map((app) => [app.id, app]))
}

function appFor(appId: EntityId, apps: readonly PermissionGovernanceApp[]) {
  return appLookup(apps).get(appId)
}

export function mapPermissionGovernanceApp(value: IamSystemResponse): PermissionGovernanceApp {
  return {
    id: value.id,
    appCode: value.app_code,
    appName: value.app_name,
  }
}

export function mapPermissionGovernanceApps(
  values: readonly IamSystemResponse[],
): PermissionGovernanceApp[] {
  return values
    .map(mapPermissionGovernanceApp)
    .sort((left, right) => compareEntityIds(left.id, right.id))
}

export function mapPermissionResource(
  value: IamPermissionResourceResponse,
  apps: readonly PermissionGovernanceApp[],
  options: PermissionResourceMappingOptions = {},
): SystemResourceRecord {
  const app = appFor(value.app_id, apps)
  const responseApp = value.app
  const status = entityStatus(value.status)

  return {
    resourceId: value.id,
    appId: value.app_id,
    appCode: responseApp?.app_code ?? app?.appCode ?? '',
    appName: responseApp?.app_name ?? app?.appName ?? '',
    parentId: value.parent_id,
    resourceCode: value.resource_code,
    resourceName: value.resource_name,
    source: value.source,
    resourceType: resourceType(value.resource_type),
    routePath: value.route_path,
    component: value.component,
    // PermissionResource v2 does not expose the legacy permission_code field.
    permissionCode: '',
    icon: value.icon,
    httpMethod: value.http_method,
    apiPath: value.api_path,
    functionAccessMode: value.function_access_mode,
    authorizationCategory: value.authorization_category,
    isComposable: value.is_composable,
    lifecycle: value.lifecycle,
    managedBy: value.managed_by,
    managedKey: value.managed_key,
    definitionHash: value.definition_hash,
    sourceRevision: value.source_revision,
    sourceSchemaVersion: value.source_schema_version,
    lastSyncRunId: value.last_sync_run_id,
    ...(value.parent
      ? {
          parentResourceCode: value.parent.resource_code,
          parentResourceName: value.parent.resource_name,
          parentResourceType: resourceType(value.parent.resource_type),
        }
      : {}),
    isVisible: value.is_visible,
    sortOrder: value.sort_order,
    status,
    remarks: value.remarks,
    // Without an effective-resource result, only the resource's direct status is known.
    isCurrentlyEffective: options.effectiveResourceIds?.has(value.id) ?? status === 'ACTIVE',
    invalidReason: '',
    // The v2 DTO has no can_maintain field. Keep the adapter fail-closed unless injected.
    canMaintain: options.canMaintain ?? false,
    version: value.version,
    createdAt: value.created_at,
    createdBy: value.created_by,
    updatedAt: value.updated_at,
    updatedBy: value.updated_by,
  }
}

export function mapPermissionResourcesPage(
  value: IamPagedResponse<IamPermissionResourceResponse>,
  apps: readonly PermissionGovernanceApp[],
  options: PermissionResourceMappingOptions = {},
): PermissionGovernancePage<SystemResourceRecord> {
  return {
    items: value.items.map((item) => mapPermissionResource(item, apps, options)),
    total: value.total,
    pageIndex: value.page_index,
    pageSize: value.page_size,
  }
}

export function buildSystemResourceTree(
  records: readonly SystemResourceRecord[],
): Record<string, SystemResourceTreeNode[]> {
  const result: Record<string, SystemResourceTreeNode[]> = {}
  const appCodes = uniqueIds(records.map((record) => record.appId))

  appCodes.forEach((appId) => {
    const appRecords = records.filter((record) => record.appId === appId).sort(bySortOrder)
    const recordsById = new Map(appRecords.map((record) => [record.resourceId, record]))
    const builtIds = new Set<EntityId>()

    function build(
      record: SystemResourceRecord,
      ancestors: ReadonlySet<EntityId>,
    ): SystemResourceTreeNode {
      const nextAncestors = new Set(ancestors)
      nextAncestors.add(record.resourceId)
      builtIds.add(record.resourceId)
      const children = appRecords
        .filter(
          (candidate) =>
            candidate.parentId === record.resourceId && !nextAncestors.has(candidate.resourceId),
        )
        .map((candidate) => build(candidate, nextAncestors))
        .sort(bySortOrder)

      return {
        ...record,
        instanceKey: `${record.appCode || record.appId}.resource.${record.resourceId}`,
        children,
      }
    }

    const roots = appRecords.filter(
      (record) => sameEntityId(record.parentId, 0) || !recordsById.has(record.parentId),
    )
    const trees = roots.map((record) => build(record, new Set())).sort(bySortOrder)

    appRecords
      .filter((record) => !builtIds.has(record.resourceId))
      .forEach((record) => trees.push(build(record, new Set())))

    const appCode = appRecords[0]?.appCode ?? ''
    result[appCode] = trees
  })

  return result
}

function mapResourceRef(
  value: IamPermissionSchemeRefNodeResponse,
): PermissionSchemeResourceRefNode {
  return {
    refId: value.ref_id,
    parentRefId: value.parent_ref_id,
    resourceId: value.resource.id,
    sortOrder: value.sort_order,
    status: entityStatus(value.status),
    remarks: value.remarks,
    children: (value.children ?? []).map(mapResourceRef),
  }
}

function flattenResourceRefs(
  values: readonly IamPermissionSchemeRefNodeResponse[],
): IamPermissionSchemeRefNodeResponse[] {
  return values.flatMap((value) => [value, ...flattenResourceRefs(value.children ?? [])])
}

function flattenDomainResourceRefs(
  values: readonly PermissionSchemeResourceRefNode[],
): PermissionSchemeResourceRefNode[] {
  return values.flatMap((value) => [value, ...flattenDomainResourceRefs(value.children)])
}

export function mapPermissionScheme(
  value: IamPermissionSchemeResponse,
  apps: readonly PermissionGovernanceApp[],
  options: PermissionRecordMappingOptions = {},
): PermissionRecord {
  const app = appFor(value.app_id, apps)
  const flattened = flattenResourceRefs(value.resource_tree ?? [])
  const frontend =
    (value.resource_tree ?? []).find(
      (node) => resourceType(node.resource.resource_type) !== 'FUNCTION',
    ) ?? flattened.find((node) => resourceType(node.resource.resource_type) !== 'FUNCTION')
  const frontendResource = value.frontend_resource ?? frontend?.resource

  return {
    id: value.id,
    parentPermissionId: value.parent_permission_id ?? null,
    defaultSelectedWithParent: value.default_selected_with_parent ?? false,
    permissionKind: value.permission_kind,
    tenantId: value.tenant_id,
    appId: value.app_id,
    appCode: app?.appCode ?? '',
    appName: app?.appName ?? '',
    permissionCode: value.permission_code,
    permissionName: value.permission_name,
    frontendResourceId: frontendResource?.id ?? 0,
    functionResourceIds: uniqueIds(
      flattened
        .filter((node) => resourceType(node.resource.resource_type) === 'FUNCTION')
        .map((node) => node.resource.id),
    ),
    frontendResourceCount: value.frontend_resource_count,
    functionResourceCount: value.function_resource_count,
    frontendResourceCode: frontendResource?.resource_code ?? '',
    frontendResourceName: frontendResource?.resource_name ?? '',
    description: value.description,
    remarks: value.remarks,
    status: entityStatus(value.status),
    sortOrder: value.sort_order,
    activeRoleCount: value.active_role_count,
    sourceRoleIds: uniqueIds(value.source_role_ids ?? []),
    resourceRefs: (value.resource_tree ?? []).map(mapResourceRef),
    lastRequestId: value.request_id,
    idempotent: value.idempotent,
    // PermissionScheme v2 currently omits can_maintain; production permission gates inject it.
    canMaintain: options.canMaintain ?? false,
    version: value.version,
    createdAt: value.created_at,
    createdBy: value.created_by,
    updatedAt: value.updated_at,
    updatedBy: value.updated_by,
  }
}

export function mapPermissionSchemesPage(
  value: IamPagedResponse<IamPermissionSchemeResponse>,
  apps: readonly PermissionGovernanceApp[],
  options: PermissionRecordMappingOptions = {},
): PermissionGovernancePage<PermissionRecord> {
  return {
    items: value.items.map((item) => mapPermissionScheme(item, apps, options)),
    total: value.total,
    pageIndex: value.page_index,
    pageSize: value.page_size,
  }
}

function mapPermissionResourceTreeNode(
  value: IamPermissionSchemeRefNodeResponse,
  apps: readonly PermissionGovernanceApp[],
  keyPrefix: string,
  includedResourceIds?: ReadonlySet<EntityId>,
  sourceGrants: readonly EffectivePermissionSourceGrant[] = [],
): PermissionTreeNode | undefined {
  const app = appFor(value.resource.app_id, apps)
  const nodeKey = `${keyPrefix}resource:${value.resource.id}`
  const children = (value.children ?? [])
    .map((child) =>
      mapPermissionResourceTreeNode(child, apps, `${nodeKey}/`, includedResourceIds, sourceGrants),
    )
    .filter((child): child is PermissionTreeNode => Boolean(child))

  if (includedResourceIds && !includedResourceIds.has(value.resource.id) && !children.length) {
    return undefined
  }

  return {
    nodeKey,
    nodeType: 'RESOURCE',
    id: value.resource.id,
    appId: value.resource.app_id,
    appCode: app?.appCode ?? '',
    appName: app?.appName ?? '',
    code: value.resource.resource_code,
    name: value.resource.resource_name,
    description: value.remarks || value.resource.remarks,
    status: entityStatus(value.status || value.resource.status),
    selectable: false,
    readOnly: true,
    isSelected: includedResourceIds?.has(value.resource.id) ?? false,
    resourceId: value.resource.id,
    resourceType: resourceType(value.resource.resource_type),
    routePath: value.resource.route_path,
    component: value.resource.component,
    httpMethod: value.resource.http_method,
    apiPath: value.resource.api_path,
    sourceGrants: [...sourceGrants],
    children,
  }
}

function mapPermissionTreeNode(
  value: IamPermissionSchemeResponse,
  apps: readonly PermissionGovernanceApp[],
  keyPrefix: string,
  options: PermissionTreeBuildOptions,
): PermissionTreeNode | undefined {
  if (options.includedPermissionIds && !options.includedPermissionIds.has(value.id))
    return undefined

  const app = appFor(value.app_id, apps)
  const nodeKey = `${keyPrefix}permission:${value.id}`
  const selectable = options.selectable ?? true
  const children = (value.resource_tree ?? [])
    .map((node) =>
      mapPermissionResourceTreeNode(
        node,
        apps,
        `${nodeKey}/`,
        options.includedResourceIds,
        options.sourceGrants,
      ),
    )
    .filter((node): node is PermissionTreeNode => Boolean(node))

  return {
    nodeKey,
    nodeType: 'PERMISSION',
    id: value.id,
    appId: value.app_id,
    appCode: app?.appCode ?? '',
    appName: app?.appName ?? '',
    code: value.permission_code,
    name: value.permission_name,
    description: value.description,
    status: entityStatus(value.status),
    selectable,
    readOnly: !selectable,
    isSelected: options.selectedPermissionIds?.has(value.id) ?? false,
    permissionId: value.id,
    parentPermissionId: value.parent_permission_id ?? null,
    defaultSelectedWithParent: value.default_selected_with_parent ?? false,
    sourceGrants: [...(options.sourceGrants ?? [])],
    children,
  }
}

function initialTreeByApp(apps: readonly PermissionGovernanceApp[]) {
  return Object.fromEntries(apps.map((app) => [app.appCode, [] as PermissionTreeNode[]]))
}

export function buildPermissionTreeByApp(
  values: readonly IamPermissionSchemeResponse[],
  apps: readonly PermissionGovernanceApp[],
  options: PermissionTreeBuildOptions = {},
): Record<string, PermissionTreeNode[]> {
  const result = initialTreeByApp(apps)

  values
    .slice()
    .sort(
      (left, right) => left.sort_order - right.sort_order || compareEntityIds(left.id, right.id),
    )
    .forEach((value) => {
      const app = appFor(value.app_id, apps)
      const node = mapPermissionTreeNode(value, apps, '', options)
      if (app && node) result[app.appCode]?.push(node)
    })

  return result
}

export function mapResolvedPermissionResources(
  values: readonly IamResolvedResourceResponse[],
  apps: readonly PermissionGovernanceApp[],
): SystemResourceRecord[] {
  const effectiveResourceIds = new Set(values.map((value) => value.resource.id))
  return values.map((value) =>
    mapPermissionResource(value.resource, apps, { effectiveResourceIds, canMaintain: false }),
  )
}

export function mapResolvedPermissionResourceTree(
  values: readonly IamResolvedResourceNodeResponse[],
  apps: readonly PermissionGovernanceApp[],
): SystemResourceTreeNode[] {
  const effectiveIds = new Set<EntityId>()
  const collect = (nodes: readonly IamResolvedResourceNodeResponse[]) => {
    nodes.forEach((node) => {
      effectiveIds.add(node.grant.resource.id)
      collect(node.children ?? [])
    })
  }
  collect(values)

  const mapNode = (
    node: IamResolvedResourceNodeResponse,
    prefix: string,
  ): SystemResourceTreeNode => {
    const record = mapPermissionResource(node.grant.resource, apps, {
      effectiveResourceIds: effectiveIds,
      canMaintain: false,
    })
    const instanceKey = `${prefix}${record.appCode || record.appId}.resource.${record.resourceId}`
    return {
      ...record,
      instanceKey,
      children: (node.children ?? []).map((child) => mapNode(child, `${instanceKey}/`)),
    }
  }

  return values.map((node) => mapNode(node, ''))
}

export function toPermissionResourceQueryRequest(
  query: ResourceCatalogQuery,
): IamPermissionResourceQueryRequest {
  return {
    keyword: query.keyword.trim(),
    page_index: query.pageIndex,
    page_size: query.pageSize,
    ...(query.appId === '' ? {} : { app_id: query.appId }),
    ...(query.resourceType ? { resource_type: apiResourceType(query.resourceType) } : {}),
    ...(query.status ? { status: apiStatus(query.status) } : {}),
    ...(query.apiPath?.trim() ? { api_path: query.apiPath.trim() } : {}),
    ...(query.httpMethod?.trim() ? { http_method: query.httpMethod.trim().toUpperCase() } : {}),
  }
}

export function toPermissionSchemeQueryRequest(
  query: PermissionQuery,
  tenantId: EntityId,
): IamPermissionSchemeQueryRequest {
  return {
    tenant_id: tenantId,
    keyword: query.permissionName.trim(),
    page_index: query.pageIndex,
    page_size: query.pageSize,
  }
}

function requireSelectedId(value: EntityId | '', label: string): EntityId {
  if (value === '') throw new Error(`${label}不能为空`)
  return value
}

function requireTenantId(value: EntityId | undefined): EntityId {
  if (value === undefined) throw new Error('生产请求缺少 tenant_id')
  return value
}

export type PermissionSchemeCreateFields = IamPermissionSchemeCreateRequest

/** 普通页面不提交 permission_code，编码由服务端生成。 */
export function toPermissionSchemeCreateRequest(
  value: PermissionFormValue,
  tenantId: EntityId,
  requestId = createRequestId(),
): IamPermissionSchemeCreateRequest {
  return {
    parent_permission_id: value.parentPermissionId,
    default_selected_with_parent: value.defaultSelectedWithParent,
    tenant_id: tenantId,
    app_id: requireSelectedId(value.appId, '所属 App'),
    permission_name: value.permissionName.trim(),
    description: value.description.trim(),
    sort_order: value.sortOrder,
    status: 'inactive',
    remarks: '',
    request_id: requestId,
  }
}

/** @deprecated 使用 toPermissionSchemeCreateRequest。 */
export function toPermissionSchemeCreateFields(
  value: PermissionFormValue,
  tenantId: EntityId,
): PermissionSchemeCreateFields {
  return toPermissionSchemeCreateRequest(value, tenantId)
}

export function toPermissionSchemeCopyRequest(
  source: PermissionRecord,
  value: PermissionFormValue,
  requestId = createRequestId(),
): IamPermissionSchemeCopyRequest {
  return {
    parent_permission_id: value.parentPermissionId,
    default_selected_with_parent: value.defaultSelectedWithParent,
    permission_kind: source.permissionKind ?? 'business',
    source_permission_id: source.id,
    tenant_id: requireTenantId(source.tenantId),
    source_version: source.version,
    permission_name: value.permissionName.trim(),
    description: value.description.trim(),
    sort_order: value.sortOrder,
    remarks: '',
    request_id: requestId,
  }
}

export function toPermissionSchemeUpdateRequest(
  record: PermissionRecord,
  value: PermissionFormValue,
  requestId = createRequestId(),
): IamPermissionSchemeUpdateRequest {
  return {
    parent_permission_id: value.parentPermissionId,
    default_selected_with_parent: value.defaultSelectedWithParent,
    permission_kind: record.permissionKind ?? 'business',
    id: record.id,
    tenant_id: requireTenantId(record.tenantId),
    version: record.version,
    permission_name: value.permissionName.trim(),
    description: value.description.trim(),
    sort_order: value.sortOrder,
    remarks: record.remarks ?? '',
    request_id: requestId,
  }
}

function requireResource(
  resourcesById: ReadonlyMap<EntityId, SystemResourceRecord>,
  resourceId: EntityId,
) {
  const resource = resourcesById.get(resourceId)
  if (!resource) throw new Error(`权限资源 ${resourceId} 不在当前 App 目录中`)
  return resource
}

function permissionFunctionInput(
  resource: SystemResourceRecord,
  existing: PermissionSchemeResourceRefNode | undefined,
): IamPermissionSchemeFunctionInput {
  return {
    resource_id: resource.resourceId,
    sort_order: existing?.sortOrder ?? resource.sortOrder,
    remarks: existing?.remarks ?? '',
  }
}

export function toPermissionSchemeTreeSaveRequest(
  record: PermissionRecord,
  frontendResourceId: EntityId,
  functionResourceIds: readonly EntityId[],
  resources: readonly SystemResourceRecord[],
  requestId = createRequestId(),
): IamPermissionSchemeTreeSaveRequest {
  const resourcesById = new Map(resources.map((resource) => [resource.resourceId, resource]))
  const existingByResourceId = new Map(
    flattenDomainResourceRefs(record.resourceRefs ?? []).map((reference) => [
      reference.resourceId,
      reference,
    ]),
  )
  const frontendResource = requireResource(resourcesById, frontendResourceId)
  if (frontendResource.appId !== record.appId) {
    throw new Error('前端业务资源与 Permission 不属于同一 App')
  }
  if (!['MENU', 'BUTTON', 'BUTTON_PAGE'].includes(frontendResource.resourceType)) {
    throw new Error('前端业务资源仅支持 Menu、ButtonPage 或 Button')
  }
  if (frontendResource.source && frontendResource.source !== 'frontend') {
    throw new Error('前端业务资源的 source 必须是 frontend')
  }

  const uniqueFunctionIds = uniqueIds(functionResourceIds)
  if (!uniqueFunctionIds.length) throw new Error('Permission 至少需要一个 Function')
  const functionResources = uniqueFunctionIds.map((resourceId) => {
    const resource = requireResource(resourcesById, resourceId)
    if (resource.appId !== record.appId || resource.resourceType !== 'FUNCTION') {
      throw new Error(`资源 ${resourceId} 不是当前 App 的 Function`)
    }
    if (resource.source && resource.source !== 'backend') {
      throw new Error(`Function ${resourceId} 的 source 必须是 backend`)
    }
    return permissionFunctionInput(resource, existingByResourceId.get(resourceId))
  })

  return {
    permission_id: record.id,
    tenant_id: requireTenantId(record.tenantId),
    version: record.version,
    frontend_resource_id: frontendResource.resourceId,
    function_resources: functionResources,
    request_id: requestId,
  }
}
