import type { RouteRecordRaw } from 'vue-router'

export const platformRoutes: RouteRecordRaw[] = [
  {
    path: 'platform/welcome',
    name: 'platform-welcome',
    component: () => import('./dashboard/pages/PlatformWelcomePage.vue'),
    meta: {
      title: '欢迎',
      subsystem: 'dms',
      permission: 'dms:welcome:view',
      hidden: true,
      breadcrumb: ['平台总览', '欢迎'],
    },
  },
  {
    path: 'platform/dashboard',
    name: 'platform-dashboard',
    component: () => import('./dashboard/pages/PlatformDashboardPage.vue'),
    meta: {
      title: '物流运营总览',
      subsystem: 'dms',
      permission: 'dms:dashboard:view',
      permissionFallback: 'platform-welcome',
      breadcrumb: ['平台总览', '工作台'],
    },
  },
  {
    path: 'platform/todos',
    name: 'platform-todos',
    component: () => import('@shared/business-components/FeatureScaffoldPage.vue'),
    props: {
      title: '待办中心',
      description: '聚合跨子系统的待处理事项与时效提醒',
      featurePath: 'src/features/platform/todos',
      pageType: 'WorkspacePage',
    },
    meta: {
      title: '待办中心',
      subsystem: 'dms',
      implementationStatus: 'placeholder',
      breadcrumb: ['平台总览', '待办中心'],
    },
  },
  {
    path: 'platform/analytics',
    name: 'platform-analytics',
    component: () => import('@shared/business-components/FeatureScaffoldPage.vue'),
    props: {
      title: '经营分析',
      description: '面向管理者的运输效率、成本与服务质量分析',
      featurePath: 'src/features/platform/analytics',
      pageType: 'DashboardPage',
    },
    meta: {
      title: '经营分析',
      subsystem: 'dms',
      implementationStatus: 'placeholder',
      breadcrumb: ['平台总览', '经营分析'],
    },
  },
]
