import type { RouteRecordRaw } from 'vue-router'
import { resourceRegistry as overviewResources } from './overview/iam-resource.registry'
import { resourceRegistry as foundationResources } from './foundation/iam-resource.registry'
import { resourceRegistry as accessControlResources } from './access-control/iam-resource.registry'
import { resourceRegistry as permissionGovernanceResources } from './permission-governance/iam-resource.registry'
import { resourceRegistry as dictionaryResources } from './dictionaries/iam-resource.registry'

import {
  IAM_PERMISSION_GOVERNANCE_RESOURCES,
  IAM_PERMISSIONS,
} from '@shared/constants/iamPermissions'

export const iamPublicRoutes: RouteRecordRaw[] = [
  {
    path: 'login',
    name: 'iam-login',
    component: () => import('./login/pages/LoginPage.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: 'iam/select-tenant',
    name: 'iam-select-tenant',
    component: () => import('./foundation/pages/TenantContextPage.vue'),
    meta: { title: '选择 Tenant', standaloneAuth: true },
  },
]

export const iamRoutes: RouteRecordRaw[] = [
  {
    path: 'iam/dictionaries',
    name: 'iam-dictionary-management',
    component: () => import('./dictionaries/pages/DictionaryManagementPage.vue'),
    meta: {
      title: '字典管理',
      subsystem: 'iam',
      resourceCode: dictionaryResources.dictionaries.resource_code,
      resource_element: dictionaryResources.dictionaries.elements.page.resource_element,
      authorizationModel: 'v2',
      breadcrumb: ['IAM 身份中心', '字典管理'],
    },
  },
  {
    path: 'iam/overview',
    name: 'iam-overview',
    component: () => import('./overview/pages/IamOverviewPage.vue'),
    meta: {
      title: 'IAM 身份中心',
      resourceCode: overviewResources.overview.resource_code,
      resource_element: overviewResources.overview.elements.page.resource_element,
      subsystem: 'iam',
      permission: 'iam:overview:view',
      breadcrumb: ['IAM 身份中心', '身份总览'],
    },
  },
  {
    path: 'iam/group',
    name: 'iam-group-profile',
    component: () => import('./foundation/pages/GroupProfilePage.vue'),
    meta: {
      title: '集团信息',
      subsystem: 'iam',
      permission: IAM_PERMISSIONS.group.view,
      resourceCode: foundationResources.group.resource_code,
      resource_element: foundationResources.group.elements.page.resource_element,
      breadcrumb: ['IAM 身份中心', '集团信息'],
    },
  },
  {
    path: 'iam/tenants',
    name: 'iam-tenant-management',
    component: () => import('./foundation/pages/TenantManagementPage.vue'),
    meta: {
      title: 'Tenant 管理',
      subsystem: 'iam',
      permission: IAM_PERMISSIONS.tenants.view,
      resourceCode: foundationResources.tenants.resource_code,
      resource_element: foundationResources.tenants.elements.page.resource_element,
      breadcrumb: ['IAM 身份中心', 'Tenant 管理'],
    },
  },
  {
    path: 'iam/organizations',
    name: 'iam-organization-management',
    component: () => import('./foundation/pages/OrganizationManagementPage.vue'),
    meta: {
      title: '组织管理',
      subsystem: 'iam',
      permission: IAM_PERMISSIONS.organizations.view,
      resourceCode: foundationResources.organizations.resource_code,
      resource_element: foundationResources.organizations.elements.page.resource_element,
      breadcrumb: ['IAM 身份中心', '组织管理'],
    },
  },
  {
    path: 'iam/positions',
    name: 'iam-position-management',
    component: () => import('./foundation/pages/PositionManagementPage.vue'),
    meta: {
      title: '岗位管理',
      subsystem: 'iam',
      permission: IAM_PERMISSIONS.positions.view,
      resourceCode: foundationResources.positions.resource_code,
      resource_element: foundationResources.positions.elements.page.resource_element,
      breadcrumb: ['IAM 身份中心', '岗位管理'],
    },
  },
  {
    path: 'iam/members',
    name: 'iam-membership-management',
    component: () => import('./foundation/pages/MembershipManagementPage.vue'),
    meta: {
      title: '用户与成员',
      subsystem: 'iam',
      permission: IAM_PERMISSIONS.members.view,
      resourceCode: foundationResources.members.resource_code,
      resource_element: foundationResources.members.elements.page.resource_element,
      breadcrumb: ['IAM 身份中心', '用户与成员'],
    },
  },
  {
    path: 'iam/roles',
    name: 'iam-role-management',
    component: () => import('./access-control/pages/RoleManagementPage.vue'),
    meta: {
      title: '角色管理',
      subsystem: 'iam',
      permission: IAM_PERMISSIONS.roles.view,
      resourceCode: accessControlResources.roles.resource_code,
      resource_element: accessControlResources.roles.elements.page.resource_element,
      breadcrumb: ['IAM 身份中心', '角色管理'],
    },
  },
  {
    path: 'iam/system-resources',
    name: 'iam-system-resource-catalog',
    component: () => import('./permission-governance/pages/SystemResourceCatalogPage.vue'),
    meta: {
      title: '系统资源目录',
      subsystem: 'iam',
      authorizationModel: 'v2',
      resourceCode: IAM_PERMISSION_GOVERNANCE_RESOURCES.systemResources.view,
      resource_element: permissionGovernanceResources.catalog.elements.page.resource_element,
      breadcrumb: ['IAM 身份中心', '系统资源目录'],
    },
  },
  {
    path: 'iam/permissions',
    name: 'iam-permission-management',
    component: () => import('./permission-governance/pages/PermissionManagementPage.vue'),
    meta: {
      title: '权限管理',
      subsystem: 'iam',
      authorizationModel: 'v2',
      resourceCode: IAM_PERMISSION_GOVERNANCE_RESOURCES.permissions.view,
      resource_element: permissionGovernanceResources.permissions.elements.page.resource_element,
      breadcrumb: ['IAM 身份中心', '权限管理'],
    },
  },
  {
    path: 'iam/permissions/configuration',
    name: 'iam-permission-configuration',
    component: () => import('./permission-governance/pages/PermissionConfigurationPage.vue'),
    meta: {
      title: '权限功能配置',
      subsystem: 'iam',
      authorizationModel: 'v2',
      resourceCode: IAM_PERMISSION_GOVERNANCE_RESOURCES.permissions.configure,
      resource_element: permissionGovernanceResources.configuration.elements.page.resource_element,
      hidden: true,
      breadcrumb: ['IAM 身份中心', '权限管理', '权限功能配置'],
    },
  },
  {
    path: 'iam/roles/authorization',
    name: 'iam-role-authorization',
    component: () => import('./permission-governance/pages/RoleAuthorizationPage.vue'),
    meta: {
      title: '角色授权',
      subsystem: 'iam',
      authorizationModel: 'v2',
      resourceCode: IAM_PERMISSION_GOVERNANCE_RESOURCES.roles.authorization,
      resource_element:
        permissionGovernanceResources.roleAuthorization.elements.page.resource_element,
      hidden: true,
      breadcrumb: ['IAM 身份中心', '角色管理', '角色授权'],
    },
  },
  {
    path: 'iam/members/effective-permissions',
    name: 'iam-user-effective-permissions',
    component: () => import('./permission-governance/pages/UserEffectivePermissionsPage.vue'),
    meta: {
      title: '用户有效权限',
      subsystem: 'iam',
      authorizationModel: 'v2',
      resourceCode: IAM_PERMISSION_GOVERNANCE_RESOURCES.members.effectivePermissions,
      resource_element: permissionGovernanceResources.userEffective.elements.page.resource_element,
      hidden: true,
      breadcrumb: ['IAM 身份中心', '用户与成员', '用户有效权限'],
    },
  },
  {
    path: 'iam/roles/assignments',
    name: 'iam-role-assignments',
    component: () => import('./access-control/pages/RoleAssignmentPage.vue'),
    meta: {
      title: '角色分配',
      resourceCode: accessControlResources.assignments.resource_code,
      resource_element: accessControlResources.assignments.elements.page.resource_element,
      subsystem: 'iam',
      permission: IAM_PERMISSIONS.roles.queryAssignments,
      hidden: true,
      breadcrumb: ['IAM 身份中心', '角色管理', '角色分配'],
    },
  },
  {
    path: 'iam/role-assignments',
    name: 'iam-role-assignments-legacy',
    redirect: (to) => ({ name: 'iam-role-assignments', query: to.query }),
  },
  {
    path: 'iam/users',
    name: 'iam-users',
    redirect: { name: 'iam-membership-management' },
  },
]
