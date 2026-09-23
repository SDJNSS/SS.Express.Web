import type { RouteRecordRaw } from 'vue-router'

const tmsFeatureRoutes: RouteRecordRaw[] = (
  [
    [
      'orders',
      '运输订单',
      '统一管理客户委托、线路和时效要求',
      'src/features/tms/orders',
      'ListPage',
    ],
    [
      'dispatch',
      '调度工作台',
      '编排车辆、司机和运输任务',
      'src/features/tms/dispatch',
      'WorkspacePage',
    ],
    ['trips', '运输任务', '跟踪在途执行、异常与回单闭环', 'src/features/tms/trips', 'ListPage'],
  ] as const
).map<RouteRecordRaw>(([path, title, description, featurePath, pageType]) => ({
  path: `tms/${path}`,
  name: `tms-${path}`,
  component: () => import('@shared/business-components/FeatureScaffoldPage.vue'),
  props: { title, description, featurePath, pageType },
  meta: {
    title,
    subsystem: 'tms',
    implementationStatus: 'placeholder',
    breadcrumb: ['TMS 运输管理', title],
  },
}))

export const tmsRoutes: RouteRecordRaw[] = [
  {
    path: 'tms/overview',
    name: 'tms-overview',
    component: () => import('./overview/pages/TmsOverviewPage.vue'),
    meta: {
      title: 'TMS 运输管理',
      subsystem: 'tms',
      permission: 'tms:overview:view',
      breadcrumb: ['TMS 运输管理', '运输总览'],
    },
  },
  ...tmsFeatureRoutes,
]
