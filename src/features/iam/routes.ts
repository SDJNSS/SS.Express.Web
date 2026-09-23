import type { RouteRecordRaw } from 'vue-router'

import { IAM_PERMISSIONS } from '@shared/constants/iamPermissions'

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
    path: 'iam/overview',
    name: 'iam-overview',
    component: () => import('./overview/pages/IamOverviewPage.vue'),
    meta: {
      title: 'IAM 身份中心',
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
      breadcrumb: ['IAM 身份中心', '角色管理'],
    },
  },
  {
    path: 'iam/application-resources',
    name: 'iam-application-resources',
    component: () => import('./application-resources/pages/ApplicationResourcesPage.vue'),
    meta: {
      title: '应用与权限资源',
      subsystem: 'iam',
      permission: IAM_PERMISSIONS.applicationResources.view,
      breadcrumb: ['IAM 身份中心', '应用与权限资源'],
    },
  },
  {
    path: 'iam/roles/function-permissions',
    name: 'iam-role-function-permissions',
    component: () => import('./access-control/pages/RoleFunctionPermissionPage.vue'),
    meta: {
      title: '角色功能权限',
      subsystem: 'iam',
      permission: IAM_PERMISSIONS.roles.queryFunctionPermissions,
      hidden: true,
      breadcrumb: ['IAM 身份中心', '角色管理', '功能权限'],
    },
  },
  {
    path: 'iam/roles/data-permissions',
    name: 'iam-role-data-permissions',
    component: () => import('./access-control/pages/RoleDataPermissionPage.vue'),
    meta: {
      title: '角色数据权限',
      subsystem: 'iam',
      permission: IAM_PERMISSIONS.roles.queryDataPermissions,
      hidden: true,
      breadcrumb: ['IAM 身份中心', '角色管理', '数据权限'],
    },
  },
  {
    path: 'iam/roles/assignments',
    name: 'iam-role-assignments',
    component: () => import('./access-control/pages/RoleAssignmentPage.vue'),
    meta: {
      title: '角色分配',
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
    path: 'iam/members/permissions',
    name: 'iam-member-permissions',
    component: () => import('./access-control/pages/MemberPermissionPage.vue'),
    meta: {
      title: '用户角色与权限',
      subsystem: 'iam',
      permission: IAM_PERMISSIONS.members.queryPermissions,
      hidden: true,
      breadcrumb: ['IAM 身份中心', '用户与成员', '角色与权限'],
    },
  },
  {
    path: 'iam/users',
    name: 'iam-users',
    redirect: { name: 'iam-membership-management' },
  },
]
