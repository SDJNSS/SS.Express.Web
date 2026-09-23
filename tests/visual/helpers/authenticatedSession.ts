import type { Page } from '@playwright/test'

interface ShellMenuItem {
  label: string
  path: string
  icon: string
  permission?: string
}

interface ShellContextMockOptions {
  hiddenMenuPaths?: string[]
  excludedMenuPaths?: string[]
  excludedFunctionPermissions?: string[]
  tenantAdminIdentity?: boolean
  firstMenuPathByApp?: Record<string, string>
  moduleRoutePathByApp?: Record<string, string>
}

const shellMenus: Record<string, ShellMenuItem[]> = {
  DMS: [
    {
      label: '工作台',
      path: '/platform/dashboard',
      icon: 'mdi:view-dashboard-outline',
      permission: 'dms:dashboard:view',
    },
    { label: '待办中心', path: '/platform/todos', icon: 'mdi:clipboard-check-outline' },
    { label: '经营分析', path: '/platform/analytics', icon: 'mdi:chart-line' },
  ],
  IAM: [
    {
      label: '身份总览',
      path: '/iam/overview',
      icon: 'mdi:view-dashboard-outline',
      permission: 'iam:overview:view',
    },
    {
      label: '集团信息',
      path: '/iam/group',
      icon: 'mdi:office-building-outline',
      permission: 'iam:group:view',
    },
    {
      label: '应用与权限资源',
      path: '/iam/application-resources',
      icon: 'mdi:layers-triple-outline',
      permission: 'iam:application-resources:view',
    },
    {
      label: 'Tenant 管理',
      path: '/iam/tenants',
      icon: 'mdi:domain',
      permission: 'iam:tenants:view',
    },
    {
      label: '组织架构',
      path: '/iam/organizations',
      icon: 'mdi:file-tree-outline',
      permission: 'iam:organizations:view',
    },
    {
      label: '岗位管理',
      path: '/iam/positions',
      icon: 'mdi:badge-account-outline',
      permission: 'iam:positions:view',
    },
    {
      label: '用户与成员',
      path: '/iam/members',
      icon: 'mdi:account-multiple-outline',
      permission: 'iam:members:view',
    },
    {
      label: '角色权限',
      path: '/iam/roles',
      icon: 'mdi:shield-account-outline',
      permission: 'iam:roles:view',
    },
  ],
  TMS: [
    {
      label: '运输总览',
      path: '/tms/overview',
      icon: 'mdi:view-dashboard-outline',
      permission: 'tms:overview:view',
    },
    {
      label: '运输订单',
      path: '/tms/orders',
      icon: 'mdi:clipboard-text-outline',
      permission: 'tms.order.read',
    },
    { label: '调度工作台', path: '/tms/dispatch', icon: 'mdi:map-marker-path' },
    { label: '运输任务', path: '/tms/trips', icon: 'mdi:routes' },
  ],
  VMS: [
    {
      label: '车辆管理总览',
      path: '/vms/overview',
      icon: 'mdi:view-dashboard-outline',
      permission: 'vms:overview:view',
    },
    { label: '司机档案', path: '/vms/drivers', icon: 'mdi:account-tie-hat-outline' },
    {
      label: '证照管理',
      path: '/vms/certificates',
      icon: 'mdi:card-account-details-outline',
    },
    { label: '维保计划', path: '/vms/maintenance', icon: 'mdi:wrench-outline' },
  ],
}

const shellFunctionPermissions: Record<string, string[]> = {
  '/iam/group': ['iam:group:view', 'iam:group:update'],
  '/iam/tenants': [
    'iam:tenants:view',
    'iam:tenants:create',
    'iam:tenants:update',
    'iam:tenants:change-status',
  ],
  '/iam/organizations': [
    'iam:organizations:view',
    'iam:organizations:create',
    'iam:organizations:update',
    'iam:organizations:move',
    'iam:organizations:change-status',
  ],
  '/iam/positions': [
    'iam:positions:view',
    'iam:positions:create',
    'iam:positions:update',
    'iam:positions:change-status',
  ],
  '/iam/members': [
    'iam:members:view',
    'iam:members:create',
    'iam:members:update',
    'iam:members:update-user',
    'iam:members:update-user-tenants',
    'iam:members:change-status',
    'iam:members:change-user-status',
    'iam:members:save-organization',
    'iam:members:save-position',
    'iam:members:permissions:view',
    'iam:members:permissions:assign-role',
    'iam:members:permissions:revoke-role',
  ],
  '/iam/roles': [
    'iam:roles:view',
    'iam:roles:create',
    'iam:roles:update',
    'iam:roles:change-status',
    'iam:roles:function-permissions:view',
    'iam:roles:function-permissions:update',
    'iam:role-data-permissions:view',
    'iam:role-data-permissions:update',
    'iam:role-assignments:view',
    'iam:role-assignments:assign',
    'iam:role-assignments:revoke',
    'iam:role-assignments:manage-admin',
  ],
  '/iam/application-resources': [
    'iam:application-resources:view',
    'iam:application-resources:create',
    'iam:application-resources:update',
    'iam:application-resources:change-status',
    'iam:application-resources:delete',
  ],
}

function apiSuccess(data: unknown): string {
  return JSON.stringify({ status: 'success', code: 1, message: '', data })
}

function mockQueryUsersPage(pageSize: number, tenantAdminIdentity = true) {
  const userVersion = '63924670932147368'
  const memberVersion = '63924670932147368'
  return {
    total: 1,
    page_index: 1,
    page_size: pageSize,
    items: [
      {
        user_id: 1001,
        tenant_user_id: 1,
        user_status: 'ACTIVE',
        member_status: 'ACTIVE',
        user_version: userVersion,
        member_version: memberVersion,
        tenant_id: 1,
        tenant_code: 'PLATFORM',
        tenant_user_code: 'HD0001',
        display_name: '林嘉',
        is_tenant_admin: tenantAdminIdentity,
        joined_at: '2026-01-01T00:00:00Z',
        left_at: '',
        is_member_currently_effective: true,
        user: {
          id: 1001,
          user_name: '林嘉',
          real_name: '林嘉',
          nick_name: '',
          phone: '13800000000',
          email: 'linjia@example.com',
          avatar_url: '',
          user_type: 'internal',
          status: 'ACTIVE',
          remarks: '',
          version: userVersion,
          updated_at: '2026-09-04T00:00:00Z',
        },
        organizations: [
          {
            id: 1,
            tenant_user_id: 1,
            org_id: 10,
            org_code: 'EAST',
            org_name: '华东运营中心',
            is_primary: true,
            effective_start: '2026-01-01T00:00:00Z',
            effective_end: '',
            is_currently_effective: true,
            status: 'ACTIVE',
            remarks: '',
            version: '1',
            updated_at: '2026-09-04T00:00:00Z',
          },
        ],
        positions: [
          {
            id: 1,
            tenant_user_id: 1,
            position_id: 20,
            position_code: 'OPS_MANAGER',
            position_name: '运营经理',
            is_primary: true,
            effective_start: '2026-01-01T00:00:00Z',
            effective_end: '',
            is_currently_effective: true,
            status: 'ACTIVE',
            remarks: '',
            version: '1',
            updated_at: '2026-09-04T00:00:00Z',
          },
        ],
        memberships: [
          {
            user_id: 1001,
            tenant_user_id: 1,
            tenant_id: 1,
            tenant_code: 'PLATFORM',
            tenant_name: '华东运营中心',
            tenant_user_code: 'HD0001',
            display_name: '林嘉',
            user_type: '正式员工',
            member_status: 'ACTIVE',
            is_tenant_admin: tenantAdminIdentity,
            joined_at: '2026-01-01T00:00:00Z',
            left_at: '',
            is_currently_effective: true,
            membership_is_currently_effective: true,
            member_version: memberVersion,
            tenant_status: 'ACTIVE',
            tenant_is_deleted: false,
            updated_at: '2026-09-04T00:00:00Z',
          },
          {
            user_id: 1001,
            tenant_user_id: 3,
            tenant_id: 3,
            tenant_code: 'HMXTSD',
            tenant_name: '汉明巡天山东',
            tenant_user_code: 'SD0009',
            display_name: '林嘉',
            user_type: '正式员工',
            member_status: 'ACTIVE',
            is_tenant_admin: false,
            joined_at: '2026-02-01T00:00:00Z',
            left_at: '',
            is_currently_effective: true,
            membership_is_currently_effective: true,
            member_version: memberVersion,
            tenant_status: 'ACTIVE',
            tenant_is_deleted: false,
            updated_at: '2026-09-04T00:00:00Z',
          },
        ],
      },
    ],
  }
}

export async function mockShellContextApis(
  page: Page,
  options: ShellContextMockOptions = {},
): Promise<void> {
  const hiddenMenuPaths = new Set(options.hiddenMenuPaths ?? [])
  const excludedMenuPaths = new Set(options.excludedMenuPaths ?? [])
  const excludedFunctionPermissions = new Set(options.excludedFunctionPermissions ?? [])
  const firstMenuPathByApp = options.firstMenuPathByApp ?? {}
  const moduleRoutePathByApp = options.moduleRoutePathByApp ?? {}
  const apps = [
    ['DMS', 'DMS 物流平台门户', 'mdi:view-dashboard-outline', '/platform'],
    ['IAM', 'IAM 身份中心', 'mdi:account-key-outline', '/iam'],
    ['TMS', 'TMS 运输管理', 'mdi:truck-delivery-outline', '/tms'],
    ['VMS', 'VMS 车辆管理', 'mdi:car-cog', '/vms'],
  ].map(([appCode, appName, icon, routePrefix], index) => ({
    id: index + 1,
    app_code: appCode,
    app_name: appName,
    description: '',
    icon,
    route_prefix: routePrefix,
    status: 'active',
    remarks: '',
    can_maintain: true,
    version: '1',
    created_at: '2026-09-04T00:00:00Z',
    created_by: 'admin',
    updated_at: '2026-09-04T00:00:00Z',
    updated_by: 'admin',
  }))
  const menusById = new Map<number, Record<string, unknown>>()

  await page.route('**/api/iam-admin/Permission/CurrentApps', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: apiSuccess({ apps }) })
  })

  await page.route('**/api/iam-admin/Permission/CurrentFunctions', async (route) => {
    const request = route.request().postDataJSON() as { menu_id?: number }
    const menuId = request.menu_id ?? 0
    const menu = menusById.get(menuId)
    if (!menu) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', code: 400, message: 'menu_id is required' }),
      })
      return
    }
    const menuPath = String(menu.route_path ?? '')
    const permissionCodes = (shellFunctionPermissions[menuPath] ?? []).filter(
      (permissionCode) => !excludedFunctionPermissions.has(permissionCode),
    )
    const functions = permissionCodes.map((permissionCode, index) => ({
      id: menuId * 100 + index + 1,
      app_id: menu.app_id,
      parent_id: menuId,
      resource_code: `${String(menu.resource_code)}.FUNCTION.${index + 1}`,
      resource_name: permissionCode,
      resource_type: 'function',
      route_path: '',
      component: '',
      permission_code: permissionCode,
      icon: '',
      http_method: '',
      api_path: '',
      is_visible: false,
      sort_order: index + 1,
      status: 'active',
      remarks: '',
      is_currently_effective: true,
      invalid_reason: '',
      can_maintain: true,
      version: '1',
      created_at: '2026-09-04T00:00:00Z',
      created_by: 'admin',
      updated_at: '2026-09-04T00:00:00Z',
      updated_by: 'admin',
    }))
    await route.fulfill({
      contentType: 'application/json',
      body: apiSuccess({
        menu,
        functions,
        permission_codes: permissionCodes,
      }),
    })
  })

  await page.route('**/api/iam-admin/Permission/CurrentAppMenus', async (route) => {
    const request = route.request().postDataJSON() as { app_id?: number }
    const app = apps.find((item) => item.id === request.app_id) ?? apps[0]!
    const appCode = app.app_code
    const moduleId = 101 + apps.indexOf(app)
    const appMenus = (shellMenus[appCode] ?? []).filter((item) => !excludedMenuPaths.has(item.path))
    const firstMenuPath = firstMenuPathByApp[appCode]
    if (firstMenuPath) {
      appMenus.sort((left, right) => {
        if (left.path === firstMenuPath) return -1
        if (right.path === firstMenuPath) return 1
        return 0
      })
    }
    const menus = appMenus.map((item, index) => {
      const menuId = moduleId * 100 + index + 1
      const menu = {
        id: menuId,
        app_id: app.id,
        parent_id: moduleId,
        resource_code: `${appCode}.${index + 1}`,
        resource_name: item.label,
        resource_type: 'menu',
        route_path: item.path,
        component: '',
        permission_code: item.permission ?? '',
        icon: item.icon,
        http_method: '',
        api_path: '',
        is_visible: !hiddenMenuPaths.has(item.path),
        sort_order: index + 1,
        status: 'active',
        remarks: '',
        is_currently_effective: true,
        invalid_reason: '',
        can_maintain: true,
        version: '1',
        created_at: '2026-09-04T00:00:00Z',
        created_by: 'admin',
        updated_at: '2026-09-04T00:00:00Z',
        updated_by: 'admin',
      }
      menusById.set(menuId, menu)
      return menu
    })
    await route.fulfill({
      contentType: 'application/json',
      body: apiSuccess({
        app,
        modules: [
          {
            id: moduleId,
            app_id: app.id,
            parent_id: 0,
            resource_code: `${appCode}.MAIN`,
            resource_name: `${app.app_name}导航`,
            resource_type: 'module',
            route_path: moduleRoutePathByApp[appCode] ?? '',
            component: '',
            permission_code: '',
            icon: app.icon,
            http_method: '',
            api_path: '',
            is_visible: false,
            sort_order: 1,
            status: 'active',
            remarks: '',
            is_currently_effective: true,
            invalid_reason: '',
            can_maintain: true,
            version: '63924670932147368',
            created_at: '2026-09-04T00:00:00Z',
            created_by: 'admin',
            updated_at: '2026-09-04T00:00:00Z',
            updated_by: 'admin',
            menus,
          },
        ],
      }),
    })
  })

  await page.route('**/api/iam-admin/Membership/QueryUsers', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: apiSuccess(mockQueryUsersPage(20, options.tenantAdminIdentity)),
    })
  })
}

export async function mockFoundationReadApis(
  page: Page,
  options: Pick<ShellContextMockOptions, 'tenantAdminIdentity'> = {},
): Promise<void> {
  const tenant = {
    group_id: 1,
    id: 1,
    tenant_code: 'PLATFORM',
    tenant_name: '华东运营中心',
    tenant_type: 'enterprise',
    status: 'ACTIVE',
    company_name: '陆链物流有限公司',
    address: '济南市高新区',
    contact_name: '林嘉',
    contact_phone: '13800000000',
    contact_email: 'linjia@example.com',
    domain: 'platform.ss-express.cn',
    subdomain: 'platform',
    logo_url: '',
    timezone: 'Asia/Shanghai',
    language: 'zh-CN',
    sort_order: 1,
    version: '1',
    isolation_mode: 'shared',
    db_key: '',
    schema_name: '',
    remarks: '',
    created_at: '2026-09-04T00:00:00Z',
    updated_at: '2026-09-04T00:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
  }
  const organization = {
    id: 10,
    tenant_id: 1,
    tenant_code: 'PLATFORM',
    parent_id: 0,
    org_code: 'EAST',
    org_name: '华东运营中心',
    org_type: '运营中心',
    leader_tenant_user_id: 1001,
    leader_display_name: '林嘉',
    path: '/EAST',
    level: 1,
    sort_order: 1,
    status: 'ACTIVE',
    remarks: '',
    active_member_count: 1,
    version: '1',
    updated_at: '2026-09-04T00:00:00Z',
    children: [],
  }
  const position = {
    id: 20,
    tenant_id: 1,
    tenant_code: 'PLATFORM',
    position_code: 'OPS_MANAGER',
    position_name: '运营经理',
    position_type: '管理岗位',
    sort_order: 1,
    status: 'ACTIVE',
    remarks: '',
    active_member_count: 1,
    version: '1',
    updated_at: '2026-09-04T00:00:00Z',
  }
  await page.route('**/api/iam-admin/Group/Info', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: apiSuccess({
        id: 1,
        group_code: 'SS-EXPRESS',
        group_name: '陆链物流集团',
        full_name: '山东陆链智慧物流集团有限公司',
        short_name: '陆链物流',
        logo_url: '',
        platform_name: 'SS Express',
        description: '',
        contact_name: '林嘉',
        contact_phone: '13800000000',
        contact_email: 'linjia@example.com',
        website: 'www.ss-express.cn',
        address: '济南市高新区',
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        remarks: '',
        version: '1',
        updated_at: '2026-09-04T00:00:00Z',
      }),
    }),
  )
  await page.route('**/api/iam-admin/Tenant/Query', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: apiSuccess({ total: 1, page_index: 1, page_size: 1000, items: [tenant] }),
    }),
  )
  await page.route('**/api/iam-admin/Organization/Query', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: apiSuccess({ total: 1, page_index: 1, page_size: 1000, items: [organization] }),
    }),
  )
  await page.route('**/api/iam-admin/Position/Query', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: apiSuccess({ total: 1, page_index: 1, page_size: 1000, items: [position] }),
    }),
  )
  await page.route('**/api/iam-admin/Membership/QueryUsers', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: apiSuccess(mockQueryUsersPage(1000, options.tenantAdminIdentity)),
    }),
  )
}

export async function useAuthenticatedSession(
  page: Page,
  options: ShellContextMockOptions = {},
): Promise<void> {
  await mockShellContextApis(page, options)
  await mockFoundationReadApis(page, options)
  await page.addInitScript(
    ({ tenantAdminIdentity }) => {
      const identity =
        tenantAdminIdentity === null
          ? {}
          : {
              isTenantAdmin: tenantAdminIdentity,
              is_tenant_admin: tenantAdminIdentity,
            }
      window.sessionStorage.setItem('access_token', 'visual-test-access-token')
      window.sessionStorage.setItem('login_state', 'AUTHENTICATED')
      window.sessionStorage.setItem('login_account', '林嘉')
      window.sessionStorage.setItem('login_display_title', '运营经理')
      window.sessionStorage.setItem('login_tenant_name', '华东运营中心')
      window.sessionStorage.setItem('login_tenant_code', 'PLATFORM')
      window.sessionStorage.setItem('login_tenant_id', '1')
      window.sessionStorage.setItem(
        'login_available_tenants',
        JSON.stringify([
          {
            tenantId: 1,
            tenantUserId: 1,
            tenantCode: 'PLATFORM',
            tenantName: '华东运营中心',
            tenantType: 'enterprise',
            logoUrl: '',
            timezone: 'Asia/Shanghai',
            isDefault: true,
            ...identity,
          },
          {
            tenantId: 3,
            tenantUserId: 3,
            tenantCode: 'HMXTSD',
            tenantName: '汉明巡天山东',
            tenantType: 'enterprise',
            logoUrl: '',
            timezone: 'Asia/Shanghai',
            isDefault: false,
            ...identity,
          },
        ]),
      )
      if (tenantAdminIdentity !== null) {
        window.sessionStorage.setItem('login_is_tenant_admin', String(tenantAdminIdentity))
      }
      window.sessionStorage.setItem(
        'login_permissions',
        JSON.stringify([
          'dms:dashboard:view',
          'iam:overview:view',
          'tms:overview:view',
          'vms:overview:view',
          'iam.user.read',
          'tms.order.read',
        ]),
      )
    },
    { tenantAdminIdentity: options.tenantAdminIdentity ?? null },
  )
}
