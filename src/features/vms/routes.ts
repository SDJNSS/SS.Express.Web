import type { RouteRecordRaw } from 'vue-router'

const vmsFeatureRoutes: RouteRecordRaw[] = (
  [
    ['drivers', '司机档案', '司机资质、服务记录与排班状态', 'src/features/vms/drivers', 'ListPage'],
    [
      'certificates',
      '证照管理',
      '车辆与司机证照有效期、年检和预警',
      'src/features/vms/certificates',
      'ListPage',
    ],
    [
      'maintenance',
      '维保计划',
      '按里程和周期安排车辆维保',
      'src/features/vms/maintenance',
      'WorkspacePage',
    ],
  ] as const
).map<RouteRecordRaw>(([path, title, description, featurePath, pageType]) => ({
  path: `vms/${path}`,
  name: `vms-${path}`,
  component: () => import('@shared/business-components/FeatureScaffoldPage.vue'),
  props: { title, description, featurePath, pageType },
  meta: {
    title,
    subsystem: 'vms',
    implementationStatus: 'placeholder',
    breadcrumb: ['VMS 车辆管理', title],
  },
}))

export const vmsRoutes: RouteRecordRaw[] = [
  {
    path: 'vms/overview',
    name: 'vms-overview',
    component: () => import('./overview/pages/VmsOverviewPage.vue'),
    meta: {
      title: 'VMS 车辆管理',
      subsystem: 'vms',
      permission: 'vms:overview:view',
      breadcrumb: ['VMS 车辆管理', '工作台'],
    },
  },
  ...vmsFeatureRoutes,
]
