import { bindResourceElements } from '@shared/services/resourceElement'

// Resource metadata only; production guards remain owned by the route/binding.
export const resourceRegistry = {
  catalog: {
    page_id: 'iam-system-resource-catalog',
    authorization_model: 'v2',
    resource_code: 'IAM.SYSTEM_RESOURCES',
    resource_type: 'menu',
    resource_name: '系统资源目录',
    remarks:
      '用途：按 App、类型、名称或编码查询原始资源并读取详情；场景：核对资源目录、前端路由或后端 Method/Path，不聚合引用统计或执行授权。',
    parent_resource_code: 'IAM',
    route_path: '/iam/system-resources',
    component: 'iam/permission-governance/pages/SystemResourceCatalogPage',
    buttons: {
      create: {
        resource_code: 'IAM.SYSTEM_RESOURCES.CREATE',
        permission_code: 'iam:system-resources:create',
        resource_name: '新增资源',
        remarks:
          '用途：创建前端 Module/Menu/Button/ButtonPage 或后端 Function，父级按同 App 类型选择，编码由后端生成；场景：人工登记资源事实，不自动创建 Permission 或授予角色。',
      },
      edit: {
        resource_code: 'IAM.SYSTEM_RESOURCES.UPDATE',
        permission_code: 'iam:system-resources:update',
        resource_name: '编辑资源',
        remarks:
          '用途：先 Get 最新资源及版本，再更新可编辑名称、路由或接口等类型适用字段；场景：修正资源定义，保留身份、所属 App 和维护归属，不直接修改角色授权。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.catalog.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionResource/Query',
          ],
        },
      },
      query: {
        resource_element: 'iam.catalog.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: [
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionResource/Query',
          ],
          reset: [
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionResource/Query',
          ],
          paginate: [
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionResource/Query',
          ],
          retry: [
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionResource/Query',
          ],
        },
      },
      local: {
        resource_element: 'iam.catalog.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
      detail: {
        resource_element: 'iam.catalog.detail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/PermissionResource/Get', 'POST /iam-admin/PermissionApp/Query'],
        },
      },
      create: {
        resource_element: 'iam.catalog.create',
        resource_key: 'create',
        kind: 'action',
        events: { open: [] },
      },
      edit: {
        resource_element: 'iam.catalog.edit',
        resource_key: 'edit',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/PermissionResource/Get', 'POST /iam-admin/PermissionApp/Query'],
        },
      },
      createForm: {
        resource_element: 'iam.catalog.createForm',
        resource_key: 'create',
        kind: 'form',
        events: {
          search: ['POST /iam-admin/PermissionResource/Query'],
          submit: [
            'POST /iam-admin/PermissionResource/Create',
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionResource/Query',
          ],
          retry: [
            'POST /iam-admin/PermissionResource/Create',
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionResource/Query',
          ],
        },
      },
      editForm: {
        resource_element: 'iam.catalog.editForm',
        resource_key: 'edit',
        kind: 'form',
        events: {
          search: ['POST /iam-admin/PermissionResource/Query'],
          submit: [
            'POST /iam-admin/PermissionResource/Update',
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionResource/Query',
          ],
          retry: [
            'POST /iam-admin/PermissionResource/Update',
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionResource/Query',
          ],
        },
      },
    },
    view_files: [
      'src/features/iam/permission-governance/components/SystemResourceCatalogPageView.vue',
      'src/features/iam/permission-governance/components/SystemResourceFormDrawer.vue',
    ],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam.catalog.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看系统资源目录',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'local', 'detail'],
        },
        {
          permission_key: 'iam.catalog.create',
          parent_permission_key: 'iam.catalog.view',
          default_selected_with_parent: false,
          permission_name: '新增系统资源',
          resource_key: 'create',
          permission_kind: 'business',
          element_keys: ['create', 'createForm'],
        },
        {
          permission_key: 'iam.catalog.update',
          parent_permission_key: 'iam.catalog.view',
          default_selected_with_parent: false,
          permission_name: '编辑系统资源',
          resource_key: 'edit',
          permission_kind: 'business',
          element_keys: ['edit', 'editForm'],
        },
      ],
    },
  },
  permissions: {
    page_id: 'iam-permission-scheme-management',
    authorization_model: 'v2',
    resource_code: 'IAM.PERMISSIONS',
    resource_type: 'menu',
    resource_name: '权限管理',
    remarks:
      '用途：按名称查询当前租户 Permission 并读取其元数据与资源组合；场景：定位业务能力进行维护，不把展示父级当作授权继承。',
    parent_resource_code: 'IAM',
    route_path: '/iam/permissions',
    component: 'iam/permission-governance/pages/PermissionManagementPage',
    buttons: {
      edit: {
        resource_code: 'IAM.PERMISSIONS.UPDATE',
        permission_code: 'iam:permissions:update',
        resource_name: '编辑权限',
        remarks:
          '用途：读取最新 Permission 后更新名称、说明、排序、展示父级及默认联动配置；场景：修订权限定义，不隐式更改既有角色授权集合。',
      },
      create: {
        resource_code: 'IAM.PERMISSIONS.CREATE',
        permission_code: 'iam:permissions:create',
        resource_name: '新建权限',
        remarks:
          '用途：在选定 App 创建 Permission 基本定义，编码由后端生成，随后进入资源配置；场景：登记新的业务能力，不通过创建自动授予角色。',
      },
      copy: {
        resource_code: 'IAM.PERMISSIONS.COPY',
        permission_code: 'iam:permissions:copy',
        resource_name: '复制权限',
        remarks:
          '用途：通过 Copy 复制现有 Permission 并提交新名称、展示父级及默认联动配置；场景：复用资源组合建立独立权限，不复制角色授权关系。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.permissions.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: ['POST /iam-admin/PermissionApp/Query', 'POST /iam-admin/PermissionScheme/Query'],
        },
      },
      query: {
        resource_element: 'iam.permissions.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/PermissionApp/Query', 'POST /iam-admin/PermissionScheme/Query'],
          reset: ['POST /iam-admin/PermissionApp/Query', 'POST /iam-admin/PermissionScheme/Query'],
          paginate: [
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionScheme/Query',
          ],
          retry: ['POST /iam-admin/PermissionApp/Query', 'POST /iam-admin/PermissionScheme/Query'],
        },
      },
      local: {
        resource_element: 'iam.permissions.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
      detail: {
        resource_element: 'iam.permissions.detail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/PermissionScheme/Get', 'POST /iam-admin/PermissionApp/Query'],
        },
      },
      configure: {
        resource_element: 'iam.permissions.configure',
        resource_key: 'page',
        kind: 'navigation',
        events: {
          click: [],
        },
        target_resource_code: 'IAM.PERMISSIONS.CONFIGURATION',
        remarks:
          '用途：读取指定 Permission 与资源候选，展示前端业务根及关联 Function；场景：核对并准备调整精确资源组合，浏览或搜索本身不保存授权。',
      },
      create: {
        resource_element: 'iam.permissions.create',
        resource_key: 'create',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/PermissionScheme/Query'],
          submit: [
            'POST /iam-admin/PermissionScheme/Create',
            'POST /iam-admin/PermissionApp/Query',
          ],
          retry: ['POST /iam-admin/PermissionScheme/Create', 'POST /iam-admin/PermissionApp/Query'],
        },
      },
      copy: {
        resource_element: 'iam.permissions.copy',
        resource_key: 'copy',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/PermissionScheme/Query'],
          submit: ['POST /iam-admin/PermissionScheme/Copy', 'POST /iam-admin/PermissionApp/Query'],
          retry: ['POST /iam-admin/PermissionScheme/Copy', 'POST /iam-admin/PermissionApp/Query'],
        },
      },
      createForm: {
        resource_element: 'iam.permissions.createForm',
        resource_key: 'create',
        kind: 'form',
        events: {
          open: ['POST /iam-admin/PermissionScheme/Query'],
          submit: [
            'POST /iam-admin/PermissionScheme/Create',
            'POST /iam-admin/PermissionApp/Query',
          ],
          retry: ['POST /iam-admin/PermissionScheme/Create', 'POST /iam-admin/PermissionApp/Query'],
        },
      },
      copyForm: {
        resource_element: 'iam.permissions.copyForm',
        resource_key: 'copy',
        kind: 'form',
        events: {
          open: ['POST /iam-admin/PermissionScheme/Query'],
          submit: ['POST /iam-admin/PermissionScheme/Copy', 'POST /iam-admin/PermissionApp/Query'],
          retry: ['POST /iam-admin/PermissionScheme/Copy', 'POST /iam-admin/PermissionApp/Query'],
        },
      },
      edit: {
        resource_element: 'iam.permissions.edit',
        resource_key: 'edit',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/PermissionScheme/Get', 'POST /iam-admin/PermissionApp/Query'],
        },
      },
      editForm: {
        resource_element: 'iam.permissions.editForm',
        resource_key: 'edit',
        kind: 'form',
        events: {
          open: ['POST /iam-admin/PermissionScheme/Query'],
          submit: [
            'POST /iam-admin/PermissionScheme/Update',
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionScheme/Query',
          ],
          retry: [
            'POST /iam-admin/PermissionScheme/Update',
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionScheme/Query',
          ],
        },
      },
    },
    view_files: [
      'src/features/iam/permission-governance/components/PermissionSchemeManagementPageView.vue',
    ],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam.permissions.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看权限管理',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'local', 'detail'],
        },
        {
          permission_key: 'iam.permissions.create',
          parent_permission_key: 'iam.permissions.view',
          default_selected_with_parent: false,
          permission_name: '新建权限',
          resource_key: 'create',
          permission_kind: 'business',
          element_keys: ['create', 'createForm'],
        },
        {
          permission_key: 'iam.permissions.copy',
          parent_permission_key: 'iam.permissions.view',
          default_selected_with_parent: false,
          permission_name: '复制权限',
          resource_key: 'copy',
          permission_kind: 'business',
          element_keys: ['copy', 'copyForm'],
        },
        {
          permission_key: 'iam.permissions.update',
          parent_permission_key: 'iam.permissions.view',
          default_selected_with_parent: false,
          permission_name: '编辑权限',
          resource_key: 'edit',
          permission_kind: 'business',
          element_keys: ['edit', 'editForm'],
        },
      ],
    },
  },
  configuration: {
    page_id: 'iam-permission-scheme-resources',
    authorization_model: 'v2',
    resource_code: 'IAM.PERMISSIONS.CONFIGURATION',
    resource_type: 'button_page',
    resource_name: '权限功能配置',
    remarks:
      '用途：读取指定 Permission 与资源候选，展示前端业务根及关联 Function；场景：核对并准备调整精确资源组合，浏览或搜索本身不保存授权。',
    parent_resource_code: 'IAM.PERMISSIONS',
    route_path: '/iam/permissions/configuration',
    component: 'iam/permission-governance/pages/PermissionConfigurationPage',
    buttons: {
      save: {
        resource_code: 'IAM.PERMISSIONS.CONFIGURATION.SAVE',
        permission_code: 'iam:permissions:configuration:save',
        resource_name: '保存权限功能配置',
        remarks:
          '用途：通过 SaveTree 保存当前 Permission 的完整资源组合并携带版本；场景：明确增加或移除该能力使用的前后端资源，保存前核对差异，不直接分配角色。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.configuration.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionScheme/Get',
            'POST /iam-admin/PermissionResource/Query',
          ],
        },
      },
      query: {
        resource_element: 'iam.configuration.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          // Search, tree selection and draft checks are local; only retry reloads APIs.
          local_search: [],
          local_select: [],
          local_check: [],
          retry: [
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/PermissionScheme/Get',
            'POST /iam-admin/PermissionResource/Query',
          ],
        },
      },
      local: {
        resource_element: 'iam.configuration.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
      save: {
        resource_element: 'iam.configuration.save',
        resource_key: 'save',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/PermissionScheme/SaveTree'],
          retry: ['POST /iam-admin/PermissionScheme/SaveTree'],
        },
      },
    },
    view_files: [
      'src/features/iam/permission-governance/components/PermissionSchemeResourcesPageView.vue',
    ],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam.configuration.view',
          parent_permission_key: 'iam.permissions.view',
          default_selected_with_parent: false,
          permission_name: '查看权限功能配置',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'local'],
        },
        {
          permission_key: 'iam.configuration.save',
          parent_permission_key: 'iam.configuration.view',
          default_selected_with_parent: false,
          permission_name: '保存权限功能配置',
          resource_key: 'save',
          permission_kind: 'business',
          element_keys: ['save'],
        },
      ],
    },
  },
  roleAuthorization: {
    page_id: 'iam-role-authorization',
    authorization_model: 'v2',
    resource_code: 'IAM.ROLES.AUTHORIZATION',
    resource_type: 'button_page',
    resource_name: '角色授权',
    remarks:
      '用途：读取当前租户指定角色的明确 Permission、完整候选及资源详情；场景：审核角色授权草稿，资源和分组只读，树父子关系不产生继承。',
    parent_resource_code: 'IAM.ROLES',
    route_path: '/iam/roles/authorization',
    component: 'iam/permission-governance/pages/RoleAuthorizationPage',
    buttons: {
      save: {
        resource_code: 'IAM.ROLES.AUTHORIZATION.SAVE',
        permission_code: 'iam:roles:authorization:save',
        resource_name: '保存角色授权',
        remarks:
          '用途：通过 Save 提交角色最终明确 Permission ID 集合、角色及目录快照版本；场景：保存已确认的授权增删，空集合表示清空，结果未知时禁止盲目重提。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.role-authorization.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/RolePermission/QueryRoles',
            'POST /iam-admin/RolePermissionScheme/Query',
            'POST /iam-admin/RolePermissionScheme/QueryEligiblePermissions',
            'POST /iam-admin/PermissionScheme/Query',
          ],
        },
      },
      query: {
        resource_element: 'iam.role-authorization.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          // Search, tree selection and draft checks are local; only retry reloads APIs.
          local_search: [],
          local_select: [],
          local_check: [],
          retry: [
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/RolePermission/QueryRoles',
            'POST /iam-admin/RolePermissionScheme/Query',
            'POST /iam-admin/RolePermissionScheme/QueryEligiblePermissions',
            'POST /iam-admin/PermissionScheme/Query',
          ],
        },
      },
      local: {
        resource_element: 'iam.role-authorization.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
      save: {
        resource_element: 'iam.role-authorization.save',
        resource_key: 'save',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/RolePermissionScheme/Save',
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/RolePermission/QueryRoles',
            'POST /iam-admin/RolePermissionScheme/Query',
            'POST /iam-admin/RolePermissionScheme/QueryEligiblePermissions',
            'POST /iam-admin/PermissionScheme/Query',
          ],
          retry: [
            'POST /iam-admin/RolePermissionScheme/Save',
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/RolePermission/QueryRoles',
            'POST /iam-admin/RolePermissionScheme/Query',
            'POST /iam-admin/RolePermissionScheme/QueryEligiblePermissions',
            'POST /iam-admin/PermissionScheme/Query',
          ],
        },
      },
    },
    view_files: ['src/features/iam/permission-governance/components/RoleAuthorizationPageView.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam.role-authorization.view',
          parent_permission_key: 'iam.roles.view',
          default_selected_with_parent: false,
          permission_name: '查看角色授权',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'local'],
        },
        {
          permission_key: 'iam.role-authorization.save',
          parent_permission_key: 'iam.role-authorization.view',
          default_selected_with_parent: false,
          permission_name: '保存角色授权',
          resource_key: 'save',
          permission_kind: 'business',
          element_keys: ['save'],
        },
      ],
    },
  },
  userEffective: {
    page_id: 'iam-user-effective-permissions',
    authorization_model: 'v2',
    resource_code: 'IAM.MEMBERS.EFFECTIVE_PERMISSIONS',
    resource_type: 'button_page',
    resource_name: '用户有效权限',
    remarks:
      '用途：通过 QueryUserPermissions 读取当前租户用户的原子有效 Permission、资源及来源角色；场景：只读排查用户能访问什么及授权来源，不直接授予权限。',
    parent_resource_code: 'IAM.MEMBERS',
    route_path: '/iam/members/effective-permissions',
    component: 'iam/permission-governance/pages/UserEffectivePermissionsPage',
    buttons: {},
    elements: {
      page: {
        resource_element: 'iam.user-effective.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/CurrentPermissionResource/QueryUserPermissions',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      query: {
        resource_element: 'iam.user-effective.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          // Search, tree selection and draft checks are local; only retry reloads APIs.
          local_search: [],
          local_select: [],
          retry: [
            'POST /iam-admin/PermissionApp/Query',
            'POST /iam-admin/CurrentPermissionResource/QueryUserPermissions',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      local: {
        resource_element: 'iam.user-effective.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
    },
    view_files: [
      'src/features/iam/permission-governance/components/UserEffectivePermissionsPageView.vue',
    ],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam.user-effective.view',
          parent_permission_key: 'iam.members.view',
          default_selected_with_parent: false,
          permission_name: '查看用户有效权限',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'local'],
        },
      ],
    },
  },
} as const

export const catalogElements = bindResourceElements(resourceRegistry.catalog)
export const permissionsElements = bindResourceElements(resourceRegistry.permissions)
export const configurationElements = bindResourceElements(resourceRegistry.configuration)
export const roleAuthorizationElements = bindResourceElements(resourceRegistry.roleAuthorization)
export const userEffectiveElements = bindResourceElements(resourceRegistry.userEffective)
