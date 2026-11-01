import { bindResourceElements } from '@shared/services/resourceElement'

// Local demonstration data only; no backend statistics are implied by these declarations.
export const resourceRegistry = {
  dashboard: {
    page_id: 'platform-dashboard',
    authorization_model: 'legacy',
    resource_code: 'DMS.DASHBOARD',
    resource_name: '物流运营总览',
    remarks:
      '用途：展示物流运营总览本地演示数据或登录欢迎内容，无真实运输统计 API；场景：查看总览样式与已授权导航，不能据演示数据下达运输任务。',
    parent_resource_code: 'DMS',
    resource_type: 'menu',
    route_path: '/platform/dashboard',
    component: 'platform/dashboard/pages/PlatformDashboardPage',
    buttons: {},
    elements: {
      page: {
        resource_element: 'dms.dashboard.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [],
          refresh: [],
        },
      },
      local: {
        resource_element: 'dms.dashboard.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
      vehicles: {
        resource_element: 'dms.dashboard.vehicles',
        resource_key: 'page',
        kind: 'navigation',
        events: {
          click: [],
        },
        target_resource_code: 'VMS.OVERVIEW',
        remarks:
          '用途：展示车务管理入口及本地演示指标，无真实车辆运营统计 API；场景：访问已授权车务模块，不执行已退役车辆样本的新增、导出或编辑。',
      },
    },
    view_files: ['src/features/platform/dashboard/pages/PlatformDashboardPage.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'platform-dashboard.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看物流运营总览',
          resource_key: 'page',
          permission_kind: 'frontend_only',
          element_keys: ['page', 'local'],
          local_only_reason:
            'dashboardApi.getDashboardData 仅 setTimeout 后返回本地 dashboardData 演示常量；createOrder/详情/跟踪仅 notification，RouteOverview 与图表本地渲染，无真实统计接口。',
        },
      ],
    },
  },
  welcome: {
    page_id: 'platform-welcome',
    authorization_model: 'legacy',
    resource_code: 'DMS.DASHBOARD.WELCOME',
    resource_name: '欢迎',
    remarks:
      '用途：展示登录欢迎和可访问业务入口，不调用业务统计或写入 API；场景：无 Dashboard 权限用户的登录落点，不代表拥有其他业务权限。',
    parent_resource_code: 'DMS.DASHBOARD',
    resource_type: 'button_page',
    route_path: '/platform/welcome',
    component: 'platform/dashboard/pages/PlatformWelcomePage',
    is_visible: false,
    buttons: {},
    elements: {
      page: {
        resource_element: 'dms.dashboard.welcome.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [],
          refresh: [],
        },
      },
      local: {
        resource_element: 'dms.dashboard.welcome.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
    },
    view_files: ['src/features/platform/dashboard/pages/PlatformWelcomePage.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'platform-welcome.view',
          parent_permission_key: 'platform-dashboard.view',
          default_selected_with_parent: false,
          permission_name: '查看欢迎',
          resource_key: 'page',
          permission_kind: 'frontend_only',
          element_keys: ['page', 'local'],
          local_only_reason:
            'getDashboardAccessContext 只读取 getStoredAuthSession；欢迎文案纯本地渲染，不发起业务网络请求。',
        },
      ],
    },
  },
} as const

export const dashboardElements = bindResourceElements(resourceRegistry.dashboard)
export const welcomeElements = bindResourceElements(resourceRegistry.welcome)
