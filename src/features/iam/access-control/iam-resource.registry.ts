import { bindResourceElements } from '@shared/services/resourceElement'

// Stable frontend identities. Markers do not replace existing authorization.
export const resourceRegistry = {
  assignments: {
    page_id: 'iam-role-assignments',
    authorization_model: 'legacy',
    resource_code: 'IAM.ROLES.ASSIGNMENTS',
    resource_name: '角色成员',
    remarks:
      '用途：查询当前租户指定角色的直接成员及有效性；场景：核对谁已获得该角色，添加和移除成员需使用独立操作。',
    parent_resource_code: 'IAM.ROLES',
    resource_type: 'button_page',
    route_path: '/iam/roles/assignments',
    component: 'iam/access-control/pages/RoleAssignmentPage',
    is_visible: false,
    buttons: {
      assign: {
        resource_code: 'IAM.ROLES.ASSIGNMENTS.BUTTON.ASSIGN',
        permission_code: 'iam:roles:assignments:button:assign',
        resource_name: '添加角色成员',
        remarks:
          '用途：从当前租户成员中选择用户并调用 Assign 建立角色关系，随后回读；场景：向指定角色增加成员，不修改角色权限或管理员身份。',
      },
      revoke: {
        resource_code: 'IAM.ROLES.ASSIGNMENTS.BUTTON.REVOKE',
        permission_code: 'iam:roles:assignments:button:revoke',
        resource_name: '移除角色成员',
        remarks:
          '用途：调用 Revoke 撤销选中成员与当前角色的关系并回读；场景：收回该角色授予，不退出租户、不取消管理员身份。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.roleAssignments.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [
            'POST /iam-admin/Membership/QueryUsers',
            'POST /iam-admin/RolePermission/QueryRoles',
            'POST /iam-admin/MemberRole/Query',
          ],
        },
      },
      query: {
        resource_element: 'iam.roleAssignments.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: [
            'POST /iam-admin/Membership/QueryUsers',
            'POST /iam-admin/RolePermission/QueryRoles',
            'POST /iam-admin/MemberRole/Query',
          ],
          reset: [
            'POST /iam-admin/Membership/QueryUsers',
            'POST /iam-admin/RolePermission/QueryRoles',
            'POST /iam-admin/MemberRole/Query',
          ],
          refresh: ['POST /iam-admin/MemberRole/Query'],
          paginate: ['POST /iam-admin/MemberRole/Query'],
        },
      },
      assign: {
        resource_element: 'iam.roleAssignments.assign',
        resource_key: 'assign',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/MemberRole/Assign',
            'POST /iam-admin/Membership/QueryUsers',
            'POST /iam-admin/RolePermission/QueryRoles',
            'POST /iam-admin/MemberRole/Query',
          ],
        },
      },
      revoke: {
        resource_element: 'iam.roleAssignments.revoke',
        resource_key: 'revoke',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/MemberRole/Revoke',
            'POST /iam-admin/Membership/QueryUsers',
            'POST /iam-admin/RolePermission/QueryRoles',
            'POST /iam-admin/MemberRole/Query',
          ],
        },
      },
      local: {
        resource_element: 'iam.roleAssignments.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
          close: [],
        },
      },
      roles: {
        resource_element: 'iam.roleAssignments.roles',
        resource_key: 'page',
        kind: 'navigation',
        events: {
          click: [],
        },
        target_resource_code: 'IAM.ROLES',
        remarks:
          '用途：查询当前租户角色的名称、类型、状态和详情；场景：查找待维护角色或进入其成员、直接 Permission 授权页，不在查询中修改授权。',
      },
    },
    view_files: ['src/features/iam/access-control/components/RoleAssignmentPageView.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam-role-assignments.view',
          parent_permission_key: 'iam.roles.view',
          default_selected_with_parent: false,
          permission_name: '查看角色成员',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'local'],
        },
        {
          permission_key: 'iam-role-assignments.assign',
          parent_permission_key: 'iam-role-assignments.view',
          default_selected_with_parent: false,
          permission_name: '添加角色成员',
          resource_key: 'assign',
          permission_kind: 'business',
          element_keys: ['assign'],
        },
        {
          permission_key: 'iam-role-assignments.revoke',
          parent_permission_key: 'iam-role-assignments.view',
          default_selected_with_parent: false,
          permission_name: '移除角色成员',
          resource_key: 'revoke',
          permission_kind: 'business',
          element_keys: ['revoke'],
        },
      ],
    },
  },
  roles: {
    page_id: 'iam-role-management',
    authorization_model: 'legacy',
    resource_code: 'IAM.ROLES',
    resource_name: '角色管理',
    remarks:
      '用途：查询当前租户角色的名称、类型、状态和详情；场景：查找待维护角色或进入其成员、直接 Permission 授权页，不在查询中修改授权。',
    parent_resource_code: 'IAM',
    route_path: '/iam/roles',
    component: 'iam/access-control/pages/RoleManagementPage',
    buttons: {
      create: {
        resource_code: 'IAM.ROLES.BUTTON.CREATE',
        permission_code: 'iam:roles:button:create',
        resource_name: '新建角色',
        remarks:
          '用途：创建当前租户的自定义角色并刷新列表，编码由服务端生成；场景：建立新职责角色，后续另行明确授予 Permission。',
      },
      edit: {
        resource_code: 'IAM.ROLES.BUTTON.EDIT',
        permission_code: 'iam:roles:button:edit',
        resource_name: '编辑角色',
        remarks:
          '用途：更新所选角色的名称、类型、说明和排序等允许字段并回读；场景：修订角色资料，不通过编辑资料替代权限或成员分配。',
      },
      status: {
        resource_code: 'IAM.ROLES.BUTTON.STATUS',
        permission_code: 'iam:roles:button:status',
        resource_name: '启用/停用',
        remarks:
          '用途：通过 ChangeRoleStatus 启用或停用角色并回读；场景：暂停或恢复角色有效性，保留既有权限和成员关系。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.roles.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: ['POST /iam-admin/RolePermission/QueryRoles'],
          refresh: ['POST /iam-admin/RolePermission/QueryRoles'],
        },
      },
      query: {
        resource_element: 'iam.roles.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/RolePermission/QueryRoles'],
          reset: ['POST /iam-admin/RolePermission/QueryRoles'],
          refresh: ['POST /iam-admin/RolePermission/QueryRoles'],
          paginate: ['POST /iam-admin/RolePermission/QueryRoles'],
        },
      },
      detail: {
        resource_element: 'iam.roles.detail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: [],
        },
      },
      local: {
        resource_element: 'iam.roles.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
      create: {
        resource_element: 'iam.roles.create',
        resource_key: 'create',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/RolePermission/CreateRole',
            'POST /iam-admin/RolePermission/QueryRoles',
          ],
        },
      },
      edit: {
        resource_element: 'iam.roles.edit',
        resource_key: 'edit',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/RolePermission/UpdateRole',
            'POST /iam-admin/RolePermission/QueryRoles',
          ],
        },
      },
      status: {
        resource_element: 'iam.roles.status',
        resource_key: 'status',
        kind: 'action',
        events: {
          confirm: [
            'POST /iam-admin/RolePermission/ChangeRoleStatus',
            'POST /iam-admin/RolePermission/QueryRoles',
          ],
        },
      },
      authorization: {
        resource_element: 'iam.roles.authorization',
        resource_key: 'page',
        kind: 'navigation',
        events: {
          access: ['POST /iam-admin/CurrentPermissionResource/CurrentPageResources'],
          click: [],
        },
        target_resource_code: 'IAM.ROLES.AUTHORIZATION',
        remarks:
          '用途：读取当前租户指定角色的明确 Permission、完整候选及资源详情；场景：审核角色授权草稿，资源和分组只读，树父子关系不产生继承。',
      },
      assignments: {
        resource_element: 'iam.roles.assignments',
        resource_key: 'page',
        kind: 'navigation',
        events: {
          click: [],
        },
        target_resource_code: 'IAM.ROLES.ASSIGNMENTS',
        remarks:
          '用途：查询当前租户指定角色的直接成员及有效性；场景：核对谁已获得该角色，添加和移除成员需使用独立操作。',
      },
    },
    view_files: ['src/features/iam/access-control/components/RoleManagementPageView.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam.roles.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看角色管理',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'detail', 'local'],
        },
        {
          permission_key: 'iam.roles.create',
          parent_permission_key: 'iam.roles.view',
          default_selected_with_parent: false,
          permission_name: '新建角色',
          resource_key: 'create',
          permission_kind: 'business',
          element_keys: ['create'],
        },
        {
          permission_key: 'iam.roles.edit',
          parent_permission_key: 'iam.roles.view',
          default_selected_with_parent: false,
          permission_name: '编辑角色',
          resource_key: 'edit',
          permission_kind: 'business',
          element_keys: ['edit'],
        },
        {
          permission_key: 'iam.roles.status',
          parent_permission_key: 'iam.roles.view',
          default_selected_with_parent: false,
          permission_name: '启用/停用',
          resource_key: 'status',
          permission_kind: 'business',
          element_keys: ['status'],
        },
      ],
    },
  },
} as const

export const rolesElements = bindResourceElements(resourceRegistry.roles)
export const assignmentsElements = bindResourceElements(resourceRegistry.assignments)
