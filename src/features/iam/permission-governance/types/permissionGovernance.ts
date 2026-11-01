import type { EntityId } from '@shared/types/entityId'
import type { VersionToken } from '@shared/types/common'

export type PermissionGovernancePreviewState =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'empty-parent'
  | 'version-conflict'
  | 'unknown-result'
  | 'no-binding'
  | 'retryable-error'

export type PermissionResourceType = 'MODULE' | 'MENU' | 'BUTTON' | 'BUTTON_PAGE' | 'FUNCTION'
export type PermissionResourceStatus = 'ACTIVE' | 'DISABLED'
export type PermissionStatus = 'ACTIVE' | 'DISABLED'
export type PermissionTreeNodeType = 'GROUP' | 'PERMISSION' | 'RESOURCE'
export type PermissionRoleType = 'CUSTOM' | 'SYSTEM' | 'UNKNOWN'
export type ResourceAuthorizationCategory =
  'public' | 'session_self_service' | 'business' | 'restricted_automation' | 'internal' | 'webhook'
export type ResourceLifecycle = 'active' | 'deprecated' | 'retired'

export interface PermissionGovernanceApp {
  id: EntityId
  appCode: string
  appName: string
}

/**
 * iam_resource 的页面视图模型。这里只描述资源自身与 parent_id 层级，
 * 不混入前后端关联、权限引用或权限包引用。
 */
export interface SystemResourceRecord {
  [key: string]: unknown
  resourceId: EntityId
  appId: EntityId
  appCode: string
  appName: string
  parentId: EntityId
  resourceCode: string
  resourceName: string
  /** v2 权限资源接口返回的登记来源；旧 Preview 数据可不提供。 */
  source?: string
  resourceType: PermissionResourceType
  routePath: string
  component: string
  permissionCode: string
  icon: string
  httpMethod: string
  apiPath: string
  /** Function 的鉴权模式；非 Function 或旧 Preview 数据可不提供。 */
  functionAccessMode?: 'read' | 'write' | null
  authorizationCategory?: ResourceAuthorizationCategory | undefined
  isComposable?: boolean | undefined
  lifecycle?: ResourceLifecycle | undefined
  managedBy?: string | undefined
  managedKey?: string | undefined
  definitionHash?: string | undefined
  sourceRevision?: string | undefined
  sourceSchemaVersion?: string | undefined
  lastSyncRunId?: string | undefined
  parentResourceCode?: string
  parentResourceName?: string
  parentResourceType?: PermissionResourceType
  isVisible: boolean
  sortOrder: number
  status: PermissionResourceStatus
  remarks: string
  isCurrentlyEffective: boolean
  invalidReason: string
  canMaintain: boolean
  version: VersionToken
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export interface SystemResourceTreeNode extends SystemResourceRecord {
  instanceKey: string
  children: SystemResourceTreeNode[]
}

/**
 * iam_permission：一个前端资源与同一 App 下一个或多个后端 Function 的组合。
 * frontendResourceId 只能指向 Menu/Button/ButtonPage 等前端资源，
 * functionResourceIds 只能指向 Function。
 */
export interface PermissionRecord {
  parentPermissionId?: EntityId | null
  defaultSelectedWithParent?: boolean
  permissionKind?: 'business' | 'frontend_only' | 'backend_only'
  [key: string]: unknown
  id: EntityId
  tenantId?: EntityId
  appId: EntityId
  appCode: string
  appName: string
  permissionCode: string
  permissionName: string
  frontendResourceId: EntityId
  functionResourceIds: EntityId[]
  /** Query 列表返回的轻量摘要；不伪造未随列表返回的 Function ID。 */
  frontendResourceCount?: number
  functionResourceCount?: number
  frontendResourceCode?: string
  frontendResourceName?: string
  description: string
  remarks?: string
  status: PermissionStatus
  sortOrder: number
  activeRoleCount?: number
  sourceRoleIds?: EntityId[]
  resourceRefs?: PermissionSchemeResourceRefNode[]
  lastRequestId?: string
  idempotent?: boolean
  canMaintain: boolean
  version: VersionToken
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export interface PermissionSchemeResourceRefNode {
  refId: EntityId
  parentRefId: EntityId | null
  resourceId: EntityId
  sortOrder: number
  status: PermissionStatus
  remarks: string
  children: PermissionSchemeResourceRefNode[]
}

export interface PermissionRoleRecord {
  [key: string]: unknown
  id: EntityId
  tenantId: EntityId
  tenantName: string
  roleCode: string
  roleName: string
  roleType: PermissionRoleType
  status: 'ACTIVE' | 'DISABLED'
  permissionIds: EntityId[]
  snapshotVersion: VersionToken
  canMaintain: boolean
  version: VersionToken
}

export interface EffectivePermissionSourceGrant {
  roleId: EntityId
  roleCode: string
  roleName: string
  permissionId: EntityId
  permissionName: string
}

/** Permission 可选；分组、Resource/Function 均只读。 */
export interface PermissionTreeNode {
  nodeKey: string
  nodeType: PermissionTreeNodeType
  id: EntityId
  appId: EntityId
  appCode: string
  appName: string
  code: string
  name: string
  description: string
  status: PermissionResourceStatus | PermissionStatus
  selectable: boolean
  readOnly: boolean
  isSelected: boolean
  parentPermissionId?: EntityId | null
  defaultSelectedWithParent?: boolean
  eligible?: boolean
  blockingReasons?: string[]
  permissionId?: EntityId
  resourceId?: EntityId
  resourceType?: PermissionResourceType
  routePath?: string
  component?: string
  httpMethod?: string
  apiPath?: string
  sourceGrants: EffectivePermissionSourceGrant[]
  children: PermissionTreeNode[]
}

export interface EffectivePermissionSubject {
  userId: EntityId
  userName: string
  tenantId: EntityId
  tenantName: string
  roleIds: EntityId[]
  effectivePermissionIds?: EntityId[]
  effectiveResourceIds?: EntityId[]
  authorizationVersion?: VersionToken
  sourcesByPermissionId: Record<EntityId, EffectivePermissionSourceGrant[]>
}

export interface PermissionGovernancePage<T> {
  items: T[]
  total: number
  pageIndex: number
  pageSize: number
}

export interface ResourceCatalogQuery {
  keyword: string
  apiPath?: string
  httpMethod?: string
  appId: EntityId | ''
  resourceType: '' | PermissionResourceType
  status: '' | PermissionResourceStatus
  pageIndex: number
  pageSize: number
}

export interface SystemResourceFormValue {
  appId: EntityId | ''
  parentId: EntityId | undefined
  resourceName: string
  resourceType: PermissionResourceType
  routePath: string
  component: string
  icon: string
  httpMethod: string
  apiPath: string
  functionAccessMode: 'read' | 'write'
  sortOrder: number
  remarks: string
  authorizationCategory: ResourceAuthorizationCategory
  isComposable: boolean
  lifecycle: ResourceLifecycle
}

export interface PermissionQuery {
  permissionName: string
  pageIndex: number
  pageSize: number
}

export interface PermissionFormValue {
  parentPermissionId: EntityId | null
  defaultSelectedWithParent: boolean
  appId: EntityId | ''
  permissionName: string
  description: string
  sortOrder: number
}

export interface PermissionGovernanceFixture {
  apps: PermissionGovernanceApp[]
  resources: SystemResourceRecord[]
  resourceTreeByApp: Record<string, SystemResourceTreeNode[]>
  permissions: PermissionRecord[]
  permissionTreeByApp: Record<string, PermissionTreeNode[]>
  roles: PermissionRoleRecord[]
  effectiveSubject: EffectivePermissionSubject
}
