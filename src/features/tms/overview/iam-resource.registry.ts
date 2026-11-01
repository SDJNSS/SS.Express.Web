import { bindResourceElements } from '@shared/services/resourceElement'

// Local demonstration data only; no backend statistics are implied by these declarations.
export const resourceRegistry = {
  overview: {
    page_id: 'tms-overview',
    authorization_model: 'legacy',
    resource_code: 'TMS.OVERVIEW',
    resource_name: 'TMS 运输管理',
    remarks:
      '用途：展示运输管理入口及本地演示指标，无真实订单、调度或行程统计 API；场景：进入已授权运输模块，不以演示数字作调度决策。',
    parent_resource_code: 'TMS',
    resource_type: 'menu',
    route_path: '/tms/overview',
    component: 'tms/overview/pages/TmsOverviewPage',
    buttons: {},
    elements: {
      page: {
        resource_element: 'tms.overview.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [],
          refresh: [],
        },
      },
      local: {
        resource_element: 'tms.overview.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
    },
    view_files: ['src/features/tms/overview/pages/TmsOverviewPage.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'tms-overview.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看TMS 运输管理',
          resource_key: 'page',
          permission_kind: 'frontend_only',
          element_keys: ['page', 'local'],
          local_only_reason:
            'TmsOverviewPage 的 metrics/modules 为本地样本常量；生产环境不显示 DEV 占位链接，SubsystemWorkspace 无业务网络请求。',
        },
      ],
    },
  },
} as const

export const overviewElements = bindResourceElements(resourceRegistry.overview)
