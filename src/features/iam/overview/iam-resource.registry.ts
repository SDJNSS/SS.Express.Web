import { bindResourceElements } from '@shared/services/resourceElement'

// Local demonstration data only; no backend statistics are implied by these declarations.
export const resourceRegistry = {
  overview: {
    page_id: 'iam-overview',
    authorization_model: 'legacy',
    resource_code: 'IAM.OVERVIEW',
    resource_name: 'IAM 身份中心',
    remarks:
      '用途：展示身份中心入口及当前本地演示指标，不调用业务统计 API；场景：导航到已授权的身份管理页面，不作为真实人数或风险统计依据。',
    parent_resource_code: 'IAM',
    resource_type: 'menu',
    route_path: '/iam/overview',
    component: 'iam/overview/pages/IamOverviewPage',
    buttons: {},
    elements: {
      page: {
        resource_element: 'iam.overview.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [],
          refresh: [],
        },
      },
      local: {
        resource_element: 'iam.overview.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
    },
    view_files: ['src/features/iam/overview/pages/IamOverviewPage.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam-overview.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看IAM 身份中心',
          resource_key: 'page',
          permission_kind: 'frontend_only',
          element_keys: ['page', 'local'],
          local_only_reason:
            'IamOverviewPage 的 metrics/modules 为本地常量；SubsystemWorkspace 仅渲染并通过 RouterLink 导航，无业务网络请求。',
        },
      ],
    },
  },
} as const

export const overviewElements = bindResourceElements(resourceRegistry.overview)
