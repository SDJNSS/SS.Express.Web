import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/tenant',
    children: [
      {
        path: 'tenant',
        name: 'TenantManagement',
        component: () => import('../views/tenant/Index.vue'),
        meta: { title: '租户管理' },
      },
      {
        path: 'tenant/create',
        name: 'TenantCreate',
        component: () => import('../views/tenant/Form.vue'),
        meta: { title: '创建租户' },
      },
      {
        path: 'tenant/edit/:id',
        name: 'TenantEdit',
        component: () => import('../views/tenant/Form.vue'),
        meta: { title: '编辑租户' },
      },
      {
        path: 'app',
        name: 'AppManagement',
        component: () => import('../views/app/Index.vue'),
        meta: { title: '应用管理' },
      },
      {
        path: 'app/create',
        name: 'AppCreate',
        component: () => import('../views/app/Form.vue'),
        meta: { title: '创建应用' },
      },
      {
        path: 'app/edit/:id',
        name: 'AppEdit',
        component: () => import('../views/app/Form.vue'),
        meta: { title: '编辑应用' },
      },
      {
        path: 'feature',
        name: 'FeatureManagement',
        component: () => import('../views/feature/Index.vue'),
        meta: { title: '功能管理' },
      },
      {
        path: 'feature/create',
        name: 'FeatureCreate',
        component: () => import('../views/feature/Form.vue'),
        meta: { title: '创建功能' },
      },
      {
        path: 'feature/edit/:id',
        name: 'FeatureEdit',
        component: () => import('../views/feature/Form.vue'),
        meta: { title: '编辑功能' },
      },
      {
        path: 'plan',
        name: 'PlanManagement',
        component: () => import('../views/plan/Index.vue'),
        meta: { title: '套餐管理' },
      },
      {
        path: 'plan/create',
        name: 'PlanCreate',
        component: () => import('../views/plan/Form.vue'),
        meta: { title: '创建套餐' },
      },
      {
        path: 'plan/edit/:id',
        name: 'PlanEdit',
        component: () => import('../views/plan/Form.vue'),
        meta: { title: '编辑套餐' },
      },
      {
        path: 'subscription',
        name: 'SubscriptionManagement',
        component: () => import('../views/subscription/Index.vue'),
        meta: { title: '订阅管理' },
      },
      {
        path: 'subscription/create',
        name: 'SubscriptionCreate',
        component: () => import('../views/subscription/Form.vue'),
        meta: { title: '创建订阅' },
      },
      {
        path: 'subscription/edit/:id',
        name: 'SubscriptionEdit',
        component: () => import('../views/subscription/Form.vue'),
        meta: { title: '编辑订阅' },
      },
      {
        path: 'user',
        name: 'UserManagement',
        component: () => import('../views/user/Index.vue'),
        meta: { title: '用户管理' },
      },
      {
        path: 'user/create',
        name: 'UserCreate',
        component: () => import('../views/user/Form.vue'),
        meta: { title: '创建用户' },
      },
      {
        path: 'user/edit/:id',
        name: 'UserEdit',
        component: () => import('../views/user/Form.vue'),
        meta: { title: '编辑用户' },
      },
      {
        path: 'tenant-user',
        name: 'TenantUserManagement',
        component: () => import('../views/tenant-user/Index.vue'),
        meta: { title: '租户用户管理' },
      },
      {
        path: 'tenant-user/create',
        name: 'TenantUserCreate',
        component: () => import('../views/tenant-user/Form.vue'),
        meta: { title: '绑定租户用户' },
      },
      {
        path: 'tenant-user/edit/:id',
        name: 'TenantUserEdit',
        component: () => import('../views/tenant-user/Form.vue'),
        meta: { title: '编辑租户用户' },
      },
      {
        path: 'session',
        name: 'SessionManagement',
        component: () => import('../views/session/Index.vue'),
        meta: { title: '会话管理' },
      },
      {
        path: 'org',
        name: 'OrgManagement',
        component: () => import('../views/org/Index.vue'),
        meta: { title: '组织架构管理' },
      },
      {
        path: 'org/create',
        name: 'OrgCreate',
        component: () => import('../views/org/Form.vue'),
        meta: { title: '创建组织' },
      },
      {
        path: 'org/edit/:id',
        name: 'OrgEdit',
        component: () => import('../views/org/Form.vue'),
        meta: { title: '编辑组织' },
      },
      {
        path: 'position',
        name: 'PositionManagement',
        component: () => import('../views/position/Index.vue'),
        meta: { title: '岗位管理' },
      },
      {
        path: 'position/create',
        name: 'PositionCreate',
        component: () => import('../views/position/Form.vue'),
        meta: { title: '创建岗位' },
      },
      {
        path: 'position/edit/:id',
        name: 'PositionEdit',
        component: () => import('../views/position/Form.vue'),
        meta: { title: '编辑岗位' },
      },
      {
        path: 'role',
        name: 'RoleManagement',
        component: () => import('../views/role/Index.vue'),
        meta: { title: '角色管理' },
      },
      {
        path: 'role/create',
        name: 'RoleCreate',
        component: () => import('../views/role/Form.vue'),
        meta: { title: '创建角色' },
      },
      {
        path: 'role/edit/:id',
        name: 'RoleEdit',
        component: () => import('../views/role/Form.vue'),
        meta: { title: '编辑角色' },
      },
      {
        path: 'role-template',
        name: 'RoleTemplateManagement',
        component: () => import('../views/role-template/Index.vue'),
        meta: { title: '角色模板管理' },
      },
      {
        path: 'resource',
        name: 'ResourceManagement',
        component: () => import('../views/resource/Index.vue'),
        meta: { title: '资源管理' },
      },
      {
        path: 'resource/create',
        name: 'ResourceCreate',
        component: () => import('../views/resource/Form.vue'),
        meta: { title: '创建资源' },
      },
      {
        path: 'resource/edit/:id',
        name: 'ResourceEdit',
        component: () => import('../views/resource/Form.vue'),
        meta: { title: '编辑资源' },
      },
      {
        path: 'data-scope',
        name: 'DataScopeManagement',
        component: () => import('../views/data-scope/Index.vue'),
        meta: { title: '数据权限配置' },
      },
      {
        path: 'data-scope/create',
        name: 'DataScopeCreate',
        component: () => import('../views/data-scope/Form.vue'),
        meta: { title: '创建数据权限' },
      },
      {
        path: 'data-scope/edit/:id',
        name: 'DataScopeEdit',
        component: () => import('../views/data-scope/Form.vue'),
        meta: { title: '编辑数据权限' },
      },
      {
        path: 'audit/login',
        name: 'LoginAudit',
        component: () => import('../views/audit/LoginLog.vue'),
        meta: { title: '登录审计' },
      },
      {
        path: 'audit/operation',
        name: 'OperationAudit',
        component: () => import('../views/audit/OperationLog.vue'),
        meta: { title: '操作审计' },
      },
      {
        path: 'audit/permission-change',
        name: 'PermissionChangeAudit',
        component: () => import('../views/audit/PermissionChangeLog.vue'),
        meta: { title: '权限变更审计' },
      },
      {
        path: 'audit/data-export',
        name: 'DataExportAudit',
        component: () => import('../views/audit/DataExportLog.vue'),
        meta: { title: '数据导出审计' },
      },
    ],
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录', public: true },
  },
];

const router = createRouter({
  history: createWebHistory('/saas-admin'),
  routes,
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // 公开路由直接放行
  if (to.meta.public) {
    next();
    return;
  }

  // 检查登录状态
  if (!authStore.isAuthenticated()) {
    next('/login');
    return;
  }

  next();
});

export default router;
