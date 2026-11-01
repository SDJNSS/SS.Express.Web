import { bindResourceElements } from '@shared/services/resourceElement'

// Local demonstration data only; no backend statistics are implied by these declarations.
export const resourceRegistry = {
  overview: {
    page_id: 'vms-overview',
    authorization_model: 'legacy',
    resource_code: 'VMS.OVERVIEW',
    resource_name: 'VMS 车辆管理',
    remarks:
      '用途：展示车务管理入口及本地演示指标，无真实车辆运营统计 API；场景：访问已授权车务模块，不执行已退役车辆样本的新增、导出或编辑。',
    parent_resource_code: 'VMS',
    resource_type: 'menu',
    route_path: '/vms/overview',
    component: 'vms/overview/pages/VmsOverviewPage',
    buttons: {},
    elements: {
      page: {
        resource_element: 'vms.overview.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [],
          refresh: [],
        },
      },
      local: {
        resource_element: 'vms.overview.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
    },
    view_files: ['src/features/vms/overview/pages/VmsOverviewPage.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'vms-overview.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看VMS 车辆管理',
          resource_key: 'page',
          permission_kind: 'frontend_only',
          element_keys: ['page', 'local'],
          local_only_reason:
            'VmsOverviewPage 的 metrics/modules 为本地样本常量；生产环境不显示 DEV 占位链接，SubsystemWorkspace 无业务网络请求。',
        },
      ],
    },
  },
} as const

export const overviewElements = bindResourceElements(resourceRegistry.overview)
