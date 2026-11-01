import { nestPermissionNodes } from '../adapters/permissionSelection'
import { compareEntityIds } from '@shared/utils/entityId'
import type { EntityId } from '@shared/types/entityId'
import type {
  PermissionTreeNode,
  PermissionGovernanceFixture,
  PermissionRecord,
  PermissionResourceType,
  SystemResourceRecord,
  SystemResourceTreeNode,
} from '../types/permissionGovernance'

const tenantId = 3
const tenantName = '汉明巡天山东'

const apps = [
  { id: 1, appCode: 'IAM', appName: 'IAM 身份权限管理' },
  { id: 2, appCode: 'TMS', appName: 'TMS 运输管理' },
  { id: 3, appCode: 'VMS', appName: 'VMS 车辆管理' },
]

type ResourceSeed = Pick<
  SystemResourceRecord,
  | 'resourceId'
  | 'appId'
  | 'appCode'
  | 'appName'
  | 'parentId'
  | 'resourceCode'
  | 'resourceName'
  | 'resourceType'
> &
  Partial<
    Omit<
      SystemResourceRecord,
      | 'resourceId'
      | 'appId'
      | 'appCode'
      | 'appName'
      | 'parentId'
      | 'resourceCode'
      | 'resourceName'
      | 'resourceType'
    >
  >

function resource(seed: ResourceSeed): SystemResourceRecord {
  return {
    routePath: '',
    component: '',
    permissionCode: '',
    icon: '',
    httpMethod: '',
    apiPath: '',
    isVisible: true,
    sortOrder: 0,
    status: 'ACTIVE',
    remarks: '',
    isCurrentlyEffective: true,
    invalidReason: '',
    canMaintain: false,
    version: `63926004721${String(seed.resourceId).padStart(6, '0')}`,
    createdAt: '2026-09-20T09:00:00+08:00',
    createdBy: 'system-resource-init',
    updatedAt: '2026-09-26T10:42:00+08:00',
    updatedBy: 'system-resource-init',
    ...seed,
  }
}

const resources: SystemResourceRecord[] = [
  resource({
    resourceId: 100,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    parentId: 0,
    resourceCode: 'IAM.IDENTITY',
    resourceName: '身份与权限治理',
    resourceType: 'MODULE',
    icon: 'mdi:shield-account-outline',
  }),
  resource({
    resourceId: 110,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    parentId: 100,
    resourceCode: 'IAM.MEMBERS',
    resourceName: '用户与成员',
    resourceType: 'MENU',
    routePath: '/iam/members',
    component: 'iam/foundation/pages/MembershipManagementPage',
    permissionCode: 'iam:members:view',
    sortOrder: 10,
  }),
  resource({
    resourceId: 111,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    parentId: 110,
    resourceCode: 'IAM.MEMBERS.EDIT_USER',
    resourceName: '编辑用户',
    resourceType: 'BUTTON',
    permissionCode: 'iam:members:user:update',
    sortOrder: 20,
  }),
  resource({
    resourceId: 112,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    parentId: 110,
    resourceCode: 'IAM.MEMBERS.PERMISSIONS',
    resourceName: '用户角色与权限',
    resourceType: 'BUTTON_PAGE',
    routePath: '/iam/members/permissions',
    component: 'iam/access-control/pages/MemberPermissionsPage',
    permissionCode: 'iam:members:permissions:view',
    sortOrder: 30,
  }),
  resource({
    resourceId: 113,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    parentId: 110,
    resourceCode: 'IAM.MEMBERS.CREATE',
    resourceName: '新增 Tenant 成员',
    resourceType: 'BUTTON',
    permissionCode: 'iam:members:create',
    sortOrder: 10,
  }),
  resource({
    resourceId: 114,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    parentId: 112,
    resourceCode: 'IAM.MEMBERS.PERMISSIONS.REFRESH',
    resourceName: '刷新权限结果',
    resourceType: 'BUTTON',
    permissionCode: 'iam:members:permissions:refresh',
    sortOrder: 10,
  }),
  resource({
    resourceId: 120,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    parentId: 100,
    resourceCode: 'IAM.ROLES',
    resourceName: '角色管理',
    resourceType: 'MENU',
    routePath: '/iam/roles',
    component: 'iam/access-control/pages/RoleManagementPage',
    permissionCode: 'iam:roles:view',
    sortOrder: 20,
  }),
  resource({
    resourceId: 190,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    parentId: 0,
    resourceCode: 'IAM.API.QUERY_USERS',
    resourceName: '查询用户列表',
    resourceType: 'FUNCTION',
    httpMethod: 'POST',
    apiPath: '/iam-admin/Membership/QueryUsers',
    isVisible: false,
    sortOrder: 100,
  }),
  resource({
    resourceId: 191,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    parentId: 0,
    resourceCode: 'IAM.API.UPDATE_USER',
    resourceName: '保存用户资料',
    resourceType: 'FUNCTION',
    httpMethod: 'POST',
    apiPath: '/iam-admin/Membership/UpdateUser',
    isVisible: false,
    sortOrder: 110,
  }),
  resource({
    resourceId: 192,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    parentId: 0,
    resourceCode: 'IAM.API.QUERY_MEMBER_FUNCTION_PERMISSIONS',
    resourceName: '查询成员功能权限',
    resourceType: 'FUNCTION',
    httpMethod: 'POST',
    apiPath: '/iam-admin/Permission/QueryMemberFunctionPermissions',
    isVisible: false,
    sortOrder: 120,
  }),
  resource({
    resourceId: 193,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    parentId: 0,
    resourceCode: 'IAM.API.CREATE_TENANT_MEMBER',
    resourceName: '创建 Tenant 成员',
    resourceType: 'FUNCTION',
    httpMethod: 'POST',
    apiPath: '/iam-admin/Membership/CreateTenantMember',
    isVisible: false,
    sortOrder: 130,
  }),
  resource({
    resourceId: 194,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    parentId: 0,
    resourceCode: 'IAM.API.QUERY_ROLES',
    resourceName: '查询角色',
    resourceType: 'FUNCTION',
    httpMethod: 'POST',
    apiPath: '/iam-admin/RolePermission/QueryRoles',
    isVisible: false,
    sortOrder: 140,
  }),
  resource({
    resourceId: 200,
    appId: 2,
    appCode: 'TMS',
    appName: 'TMS 运输管理',
    parentId: 0,
    resourceCode: 'TMS.TRANSPORT',
    resourceName: '运输履约',
    resourceType: 'MODULE',
    icon: 'mdi:truck-outline',
  }),
  resource({
    resourceId: 210,
    appId: 2,
    appCode: 'TMS',
    appName: 'TMS 运输管理',
    parentId: 200,
    resourceCode: 'TMS.ORDERS',
    resourceName: '运输订单',
    resourceType: 'MENU',
    routePath: '/tms/orders',
    component: 'tms/orders/pages/OrderListPage',
    permissionCode: 'tms:orders:view',
    sortOrder: 10,
  }),
  resource({
    resourceId: 211,
    appId: 2,
    appCode: 'TMS',
    appName: 'TMS 运输管理',
    parentId: 210,
    resourceCode: 'TMS.ORDERS.DETAIL',
    resourceName: '运输订单详情',
    resourceType: 'BUTTON_PAGE',
    routePath: '/tms/orders/:id',
    component: 'tms/orders/pages/OrderDetailPage',
    permissionCode: 'tms:orders:detail:view',
    sortOrder: 10,
  }),
  resource({
    resourceId: 212,
    appId: 2,
    appCode: 'TMS',
    appName: 'TMS 运输管理',
    parentId: 210,
    resourceCode: 'TMS.ORDERS.EDIT',
    resourceName: '编辑运输订单',
    resourceType: 'BUTTON',
    permissionCode: 'tms:orders:update',
    sortOrder: 20,
  }),
  resource({
    resourceId: 290,
    appId: 2,
    appCode: 'TMS',
    appName: 'TMS 运输管理',
    parentId: 0,
    resourceCode: 'TMS.API.QUERY_ORDERS',
    resourceName: '查询运输订单',
    resourceType: 'FUNCTION',
    httpMethod: 'POST',
    apiPath: '/tms-admin/Order/Query',
    isVisible: false,
    sortOrder: 100,
  }),
  resource({
    resourceId: 291,
    appId: 2,
    appCode: 'TMS',
    appName: 'TMS 运输管理',
    parentId: 0,
    resourceCode: 'TMS.API.GET_ORDER',
    resourceName: '查询运输订单详情',
    resourceType: 'FUNCTION',
    httpMethod: 'POST',
    apiPath: '/tms-admin/Order/Get',
    isVisible: false,
    sortOrder: 110,
  }),
  resource({
    resourceId: 292,
    appId: 2,
    appCode: 'TMS',
    appName: 'TMS 运输管理',
    parentId: 0,
    resourceCode: 'TMS.API.UPDATE_ORDER',
    resourceName: '保存运输订单',
    resourceType: 'FUNCTION',
    httpMethod: 'POST',
    apiPath: '/tms-admin/Order/Update',
    isVisible: false,
    sortOrder: 120,
  }),
  resource({
    resourceId: 300,
    appId: 3,
    appCode: 'VMS',
    appName: 'VMS 车辆管理',
    parentId: 0,
    resourceCode: 'VMS.FLEET',
    resourceName: '车队基础资料',
    resourceType: 'MODULE',
    icon: 'mdi:car-multiple',
  }),
  resource({
    resourceId: 310,
    appId: 3,
    appCode: 'VMS',
    appName: 'VMS 车辆管理',
    parentId: 300,
    resourceCode: 'VMS.VEHICLES',
    resourceName: '车辆档案',
    resourceType: 'MENU',
    routePath: '/vms/vehicles',
    component: 'vms/vehicles/pages/VehicleListPage',
    permissionCode: 'vms:vehicles:view',
    sortOrder: 10,
  }),
  resource({
    resourceId: 390,
    appId: 3,
    appCode: 'VMS',
    appName: 'VMS 车辆管理',
    parentId: 0,
    resourceCode: 'VMS.API.QUERY_VEHICLES',
    resourceName: '查询车辆',
    resourceType: 'FUNCTION',
    httpMethod: 'POST',
    apiPath: '/vms-admin/Vehicle/Query',
    isVisible: false,
    sortOrder: 100,
  }),
]

const resourceById = new Map(resources.map((item) => [item.resourceId, item]))

function buildResourceTree(appCode: string, parentId: EntityId = 0): SystemResourceTreeNode[] {
  return resources
    .filter((item) => item.appCode === appCode && item.parentId === parentId)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || compareEntityIds(left.resourceId, right.resourceId),
    )
    .map((item) => ({
      ...item,
      instanceKey: `${item.appCode.toLowerCase()}.resource.${item.resourceId}`,
      children: buildResourceTree(appCode, item.resourceId),
    }))
}

const resourceTreeByApp: Record<string, SystemResourceTreeNode[]> = Object.fromEntries(
  apps.map((app) => [app.appCode, buildResourceTree(app.appCode)]),
)

type PermissionSeed = Pick<
  PermissionRecord,
  | 'id'
  | 'appId'
  | 'appCode'
  | 'appName'
  | 'permissionCode'
  | 'permissionName'
  | 'frontendResourceId'
  | 'functionResourceIds'
  | 'description'
> &
  Partial<
    Pick<
      PermissionRecord,
      | 'parentPermissionId'
      | 'defaultSelectedWithParent'
      | 'status'
      | 'sortOrder'
      | 'canMaintain'
      | 'updatedAt'
      | 'updatedBy'
    >
  >

function permission(seed: PermissionSeed): PermissionRecord {
  return {
    parentPermissionId: null,
    defaultSelectedWithParent: false,
    status: 'ACTIVE',
    sortOrder: 0,
    canMaintain: true,
    version: `63926004722${String(seed.id).padStart(6, '0')}`,
    createdAt: '2026-09-24T09:00:00+08:00',
    createdBy: 'permission.admin',
    updatedAt: '2026-09-26T11:00:00+08:00',
    updatedBy: 'permission.admin',
    ...seed,
  }
}

const permissions: PermissionRecord[] = [
  permission({
    id: 1001,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    permissionCode: 'IAM.MEMBERS.QUERY',
    permissionName: '用户列表查询',
    frontendResourceId: 110,
    functionResourceIds: [190],
    description: '进入用户列表并查询当前条件下的用户数据。',
    sortOrder: 10,
  }),
  permission({
    id: 1002,
    parentPermissionId: 1001,
    defaultSelectedWithParent: false,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    permissionCode: 'IAM.MEMBERS.EDIT_USER',
    permissionName: '编辑用户',
    frontendResourceId: 111,
    functionResourceIds: [190, 191],
    description: '打开用户编辑入口、读取目标用户并保存用户资料。',
    sortOrder: 20,
  }),
  permission({
    id: 1003,
    parentPermissionId: 1001,
    defaultSelectedWithParent: false,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    permissionCode: 'IAM.MEMBERS.EFFECTIVE_PERMISSIONS',
    permissionName: '查看用户有效权限',
    frontendResourceId: 112,
    functionResourceIds: [192],
    description: '打开用户角色与权限页面并查询成员聚合后的有效权限。',
    sortOrder: 30,
  }),
  permission({
    id: 1004,
    parentPermissionId: 1001,
    defaultSelectedWithParent: false,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    permissionCode: 'IAM.MEMBERS.CREATE',
    permissionName: '新增用户成员',
    frontendResourceId: 113,
    functionResourceIds: [190, 193],
    description: '查找已有用户并在当前 Tenant 创建成员关系。',
    sortOrder: 40,
  }),
  permission({
    id: 1005,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    permissionCode: 'IAM.ROLES.QUERY',
    permissionName: '角色列表查询',
    frontendResourceId: 120,
    functionResourceIds: [194],
    description: '进入角色管理并查询当前 Tenant 的角色。',
    sortOrder: 50,
  }),
  permission({
    id: 1006,
    parentPermissionId: 1001,
    defaultSelectedWithParent: true,
    appId: 1,
    appCode: 'IAM',
    appName: 'IAM 身份权限管理',
    permissionCode: 'IAM.MEMBERS.EFFECTIVE_PERMISSIONS.REFRESH',
    permissionName: '刷新用户有效权限',
    frontendResourceId: 114,
    functionResourceIds: [192],
    description: '在用户角色与权限页面重新查询成员有效权限。',
    sortOrder: 35,
  }),
  permission({
    id: 1101,
    appId: 2,
    appCode: 'TMS',
    appName: 'TMS 运输管理',
    permissionCode: 'TMS.ORDERS.QUERY',
    permissionName: '运输订单列表查询',
    frontendResourceId: 210,
    functionResourceIds: [290],
    description: '进入运输订单列表并查询订单。',
    sortOrder: 10,
  }),
  permission({
    id: 1102,
    parentPermissionId: 1101,
    appId: 2,
    appCode: 'TMS',
    appName: 'TMS 运输管理',
    permissionCode: 'TMS.ORDERS.DETAIL',
    permissionName: '查看运输订单详情',
    frontendResourceId: 211,
    functionResourceIds: [291],
    description: '打开并查询运输订单详情。',
    sortOrder: 20,
  }),
  permission({
    id: 1103,
    parentPermissionId: 1101,
    appId: 2,
    appCode: 'TMS',
    appName: 'TMS 运输管理',
    permissionCode: 'TMS.ORDERS.EDIT',
    permissionName: '编辑运输订单',
    frontendResourceId: 212,
    functionResourceIds: [291, 292],
    description: '读取订单详情并保存运输订单变更。',
    sortOrder: 30,
  }),
  permission({
    id: 1201,
    appId: 3,
    appCode: 'VMS',
    appName: 'VMS 车辆管理',
    permissionCode: 'VMS.VEHICLES.QUERY',
    permissionName: '车辆档案查询',
    frontendResourceId: 310,
    functionResourceIds: [390],
    description: '进入车辆档案并查询车辆数据。',
    sortOrder: 10,
  }),
]

function requireResource(resourceId: EntityId): SystemResourceRecord {
  const record = resourceById.get(resourceId)
  if (!record) throw new Error(`Permission fixture resource ${resourceId} does not exist`)
  return record
}

function resourcePermissionNode(
  record: SystemResourceRecord,
  nodeKey: string,
  children: PermissionTreeNode[] = [],
): PermissionTreeNode {
  return {
    nodeKey,
    nodeType: 'RESOURCE',
    id: record.resourceId,
    appId: record.appId,
    appCode: record.appCode,
    appName: record.appName,
    code: record.resourceCode,
    name: record.resourceName,
    description: record.remarks,
    status: record.status,
    selectable: false,
    readOnly: true,
    isSelected: false,
    resourceId: record.resourceId,
    resourceType: record.resourceType,
    routePath: record.routePath,
    component: record.component,
    httpMethod: record.httpMethod,
    apiPath: record.apiPath,
    sourceGrants: [],
    children,
  }
}

function permissionTreeNode(
  record: PermissionRecord,
  selectable: boolean,
  keyPrefix = '',
): PermissionTreeNode {
  const permissionKey = `${keyPrefix}permission:${record.id}`
  const frontendResource = requireResource(record.frontendResourceId)
  const frontendKey = `${permissionKey}/resource:${frontendResource.resourceId}`
  const functionNodes = record.functionResourceIds.map((resourceId) =>
    resourcePermissionNode(requireResource(resourceId), `${frontendKey}/resource:${resourceId}`),
  )
  const frontendNode = resourcePermissionNode(frontendResource, frontendKey, functionNodes)

  return {
    nodeKey: permissionKey,
    nodeType: 'PERMISSION',
    id: record.id,
    appId: record.appId,
    appCode: record.appCode,
    appName: record.appName,
    code: record.permissionCode,
    name: record.permissionName,
    description: record.description,
    status: record.status,
    selectable,
    readOnly: !selectable,
    isSelected: false,
    permissionId: record.id,
    parentPermissionId: record.parentPermissionId ?? null,
    defaultSelectedWithParent: record.defaultSelectedWithParent ?? false,
    sourceGrants: [],
    children: [frontendNode],
  }
}

const permissionTreeByApp: Record<string, PermissionTreeNode[]> = Object.fromEntries(
  apps.map((app) => [
    app.appCode,
    permissions
      .filter((item) => item.appId === app.id)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item) => permissionTreeNode(item, true)),
  ]),
)

const roles = [
  {
    id: 501,
    tenantId,
    tenantName,
    roleCode: 'TENANT_ADMIN',
    roleName: 'Tenant 管理员',
    roleType: 'SYSTEM' as const,
    status: 'ACTIVE' as const,
    permissionIds: [1001, 1002],
    snapshotVersion: 'fixture-snapshot',
    canMaintain: false,
    version: '63926004724000501',
  },
  {
    id: 503,
    tenantId,
    tenantName,
    roleCode: 'DISPATCH_MANAGER',
    roleName: '调度经理',
    roleType: 'CUSTOM' as const,
    status: 'ACTIVE' as const,
    permissionIds: [1001, 1002, 1101, 1102, 1103],
    snapshotVersion: 'fixture-snapshot',
    canMaintain: true,
    version: '63926004724000503',
  },
  {
    id: 504,
    tenantId,
    tenantName,
    roleCode: 'DISPATCHER',
    roleName: '运输调度员',
    roleType: 'CUSTOM' as const,
    status: 'ACTIVE' as const,
    permissionIds: [1101, 1102, 1103],
    snapshotVersion: 'fixture-snapshot',
    canMaintain: true,
    version: '63926004724000504',
  },
  {
    id: 505,
    tenantId,
    tenantName,
    roleCode: 'CUSTOMER_SERVICE',
    roleName: '客服专员',
    roleType: 'CUSTOM' as const,
    status: 'ACTIVE' as const,
    permissionIds: [1101, 1102],
    snapshotVersion: 'fixture-snapshot',
    canMaintain: true,
    version: '63926004724000505',
  },
]

export const permissionGovernanceFixture: PermissionGovernanceFixture = {
  apps,
  resources,
  resourceTreeByApp,
  permissions,
  permissionTreeByApp: Object.fromEntries(
    Object.entries(permissionTreeByApp).map(([app, nodes]) => [app, nestPermissionNodes(nodes)]),
  ),
  roles,
  effectiveSubject: {
    userId: 5,
    userName: '汉明巡天',
    tenantId,
    tenantName,
    roleIds: [501, 503, 505],
    effectivePermissionIds: [1001, 1002, 1101, 1102, 1103],
    sourcesByPermissionId: Object.fromEntries(
      permissions.map((permission) => [
        permission.id,
        roles
          .filter((role) => role.permissionIds.some((id) => String(id) === String(permission.id)))
          .map((role) => ({
            roleId: role.id,
            roleCode: role.roleCode,
            roleName: role.roleName,
            permissionId: permission.id,
            permissionName: permission.permissionName,
          })),
      ]),
    ),
  },
}

export function isFrontendResourceType(type: PermissionResourceType) {
  return type === 'MENU' || type === 'BUTTON' || type === 'BUTTON_PAGE'
}
