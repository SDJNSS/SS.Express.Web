import type { RouteRecordRaw } from 'vue-router'

export const referenceRoutes: RouteRecordRaw[] = [
  {
    path: 'reference/list',
    name: 'reference-list',
    component: () => import('./pages/ReferenceListPage.vue'),
    meta: {
      title: 'ReferenceListPage',
      subsystem: 'reference',
      breadcrumb: ['参考实现', '标准列表页'],
    },
  },
  {
    path: 'reference/detail',
    name: 'reference-detail',
    component: () => import('./pages/ReferenceDetailPage.vue'),
    meta: {
      title: 'ReferenceDetailPage',
      subsystem: 'reference',
      breadcrumb: ['参考实现', '标准详情页'],
    },
  },
  {
    path: 'reference/form',
    name: 'reference-form',
    component: () => import('./pages/ReferenceFormPage.vue'),
    meta: {
      title: 'ReferenceFormPage',
      subsystem: 'reference',
      breadcrumb: ['参考实现', '标准表单页'],
    },
  },
  {
    path: 'reference/dashboard',
    name: 'reference-dashboard',
    component: () => import('./pages/ReferenceDashboardPage.vue'),
    meta: {
      title: 'ReferenceDashboardPage',
      subsystem: 'reference',
      breadcrumb: ['参考实现', '标准仪表盘'],
    },
  },
]
