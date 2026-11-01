import { bindResourceElements } from '@shared/services/resourceElement'

// Stable frontend identities. Markers do not replace existing authorization.
export const resourceRegistry = {
  group: {
    page_id: 'iam-group-profile',
    authorization_model: 'legacy',
    resource_code: 'IAM.GROUP',
    resource_name: '集团信息',
    remarks:
      '用途：通过 Group/Info 读取部署集团的品牌、联系与区域资料；场景：核对集团共享信息，不用于查询租户或切换登录租户。',
    parent_resource_code: 'IAM',
    route_path: '/iam/group',
    component: 'iam/foundation/pages/GroupProfilePage',
    buttons: {
      edit: {
        resource_code: 'IAM.GROUP.BUTTON.EDIT',
        permission_code: 'iam:group:button:edit',
        resource_name: '编辑集团信息',
        remarks:
          '用途：更新集团基础、联系与区域资料，Logo 经 DMS 上传后保存文件引用；场景：修订集团共享资料，编码不可手工修改。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.group.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: ['POST /iam-admin/Group/Info'],
          refresh: ['POST /iam-admin/Group/Info'],
        },
      },
      query: {
        resource_element: 'iam.group.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/Group/Info'],
          reset: ['POST /iam-admin/Group/Info'],
          refresh: ['POST /iam-admin/Group/Info'],
          paginate: [],
        },
      },
      detail: {
        resource_element: 'iam.group.detail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: [],
        },
      },
      local: {
        resource_element: 'iam.group.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
      edit: {
        resource_element: 'iam.group.edit',
        resource_key: 'edit',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/Group/Update'],
        },
      },
      logo: {
        resource_element: 'iam.group.logo',
        resource_key: 'edit',
        kind: 'upload',
        events: {
          upload: ['POST /dms/File/Upload'],
          preview: [],
          remove: [],
        },
      },
    },
    view_files: ['src/features/iam/foundation/components/GroupProfilePageView.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam.group.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看集团信息',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'detail', 'local'],
        },
        {
          permission_key: 'iam.group.edit',
          parent_permission_key: 'iam.group.view',
          default_selected_with_parent: false,
          permission_name: '编辑集团信息',
          resource_key: 'edit',
          permission_kind: 'business',
          element_keys: ['edit', 'logo'],
        },
      ],
    },
  },
  tenants: {
    page_id: 'iam-tenant-management',
    authorization_model: 'legacy',
    resource_code: 'IAM.TENANTS',
    resource_name: 'Tenant 管理',
    remarks:
      '用途：查询租户目录及租户资料；场景：平台管理员查找和核对租户，不将目录结果用作本人可切换租户清单。',
    parent_resource_code: 'IAM',
    route_path: '/iam/tenants',
    component: 'iam/foundation/pages/TenantManagementPage',
    buttons: {
      create: {
        resource_code: 'IAM.TENANTS.BUTTON.CREATE',
        permission_code: 'iam:tenants:button:create',
        resource_name: '新建 Tenant',
        remarks:
          '用途：事务创建租户及首名管理员，图片经 DMS 上传，企业名称取租户名称；场景：开通新租户，不由用户填写系统编码。',
      },
      edit: {
        resource_code: 'IAM.TENANTS.BUTTON.EDIT',
        permission_code: 'iam:tenants:button:edit',
        resource_name: '编辑 Tenant',
        remarks:
          '用途：更新指定租户的名称、Logo、联系及区域设置并刷新目录；场景：维护租户主资料，不切换当前会话租户。',
      },
      status: {
        resource_code: 'IAM.TENANTS.BUTTON.STATUS',
        permission_code: 'iam:tenants:button:status',
        resource_name: '启用/停用',
        remarks:
          '用途：通过 Tenant/ChangeStatus 启用或停用指定租户；场景：控制租户当前可用性，不物理删除租户或重建其编码。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.tenants.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: ['POST /iam-admin/Tenant/Query'],
          refresh: ['POST /iam-admin/Tenant/Query'],
        },
      },
      query: {
        resource_element: 'iam.tenants.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: [],
          reset: [],
          refresh: ['POST /iam-admin/Tenant/Query'],
          paginate: [],
        },
      },
      detail: {
        resource_element: 'iam.tenants.detail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: [],
        },
      },
      local: {
        resource_element: 'iam.tenants.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
      create: {
        resource_element: 'iam.tenants.create',
        resource_key: 'create',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/Tenant/Create', 'POST /iam-admin/Tenant/Query'],
        },
      },
      edit: {
        resource_element: 'iam.tenants.edit',
        resource_key: 'edit',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/Tenant/Update', 'POST /iam-admin/Tenant/Query'],
        },
      },
      status: {
        resource_element: 'iam.tenants.status',
        resource_key: 'status',
        kind: 'action',
        events: {
          confirm: ['POST /iam-admin/Tenant/ChangeStatus', 'POST /iam-admin/Tenant/Query'],
        },
      },
      createLogo: {
        resource_element: 'iam.tenants.createLogo',
        resource_key: 'create',
        kind: 'upload',
        events: {
          upload: ['POST /dms/File/Upload'],
          preview: [],
          remove: [],
        },
      },
      editLogo: {
        resource_element: 'iam.tenants.editLogo',
        resource_key: 'edit',
        kind: 'upload',
        events: {
          upload: ['POST /dms/File/Upload'],
          preview: [],
          remove: [],
        },
      },
      adminAvatar: {
        resource_element: 'iam.tenants.adminAvatar',
        resource_key: 'create',
        kind: 'upload',
        events: {
          upload: ['POST /dms/File/Upload'],
          preview: [],
          remove: [],
        },
      },
    },
    view_files: ['src/features/iam/foundation/components/TenantManagementPageView.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam.tenants.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看Tenant 管理',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'detail', 'local'],
        },
        {
          permission_key: 'iam.tenants.create',
          parent_permission_key: 'iam.tenants.view',
          default_selected_with_parent: false,
          permission_name: '新建 Tenant',
          resource_key: 'create',
          permission_kind: 'business',
          element_keys: ['create', 'createLogo', 'adminAvatar'],
        },
        {
          permission_key: 'iam.tenants.edit',
          parent_permission_key: 'iam.tenants.view',
          default_selected_with_parent: false,
          permission_name: '编辑 Tenant',
          resource_key: 'edit',
          permission_kind: 'business',
          element_keys: ['edit', 'editLogo'],
        },
        {
          permission_key: 'iam.tenants.status',
          parent_permission_key: 'iam.tenants.view',
          default_selected_with_parent: false,
          permission_name: '启用/停用',
          resource_key: 'status',
          permission_kind: 'business',
          element_keys: ['status'],
        },
      ],
    },
  },
  organizations: {
    page_id: 'iam-organization-management',
    authorization_model: 'legacy',
    resource_code: 'IAM.ORGANIZATIONS',
    resource_name: '组织管理',
    remarks:
      '用途：查询当前租户组织并展示层级及详情；场景：定位部门和上下级关系，查询不改变组织或成员归属。',
    parent_resource_code: 'IAM',
    route_path: '/iam/organizations',
    component: 'iam/foundation/pages/OrganizationManagementPage',
    buttons: {
      create: {
        resource_code: 'IAM.ORGANIZATIONS.BUTTON.CREATE',
        permission_code: 'iam:organizations:button:create',
        resource_name: '新建组织',
        remarks:
          '用途：创建当前租户组织，可查询负责人候选并选择上级组织；场景：新增部门或顶级组织，组织编码由服务端生成。',
      },
      edit: {
        resource_code: 'IAM.ORGANIZATIONS.BUTTON.EDIT',
        permission_code: 'iam:organizations:button:edit',
        resource_name: '编辑组织',
        remarks:
          '用途：更新组织名称、负责人及允许的资料，候选负责人限定当前租户；场景：修订组织资料，调整父级使用独立层级操作。',
      },
      status: {
        resource_code: 'IAM.ORGANIZATIONS.BUTTON.STATUS',
        permission_code: 'iam:organizations:button:status',
        resource_name: '启用/停用',
        remarks:
          '用途：启用或停用选定组织并重查组织树；场景：控制组织当前有效性，不删除组织或直接改写员工归属。',
      },
      move: {
        resource_code: 'IAM.ORGANIZATIONS.BUTTON.MOVE',
        permission_code: 'iam:organizations:button:move',
        resource_name: '调整组织层级',
        remarks:
          '用途：通过 Organization/Move 修改组织父级并刷新树；场景：调整当前租户部门层级，不修改成员、岗位或角色授权。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.organizations.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: ['POST /iam-admin/Organization/Query'],
          refresh: ['POST /iam-admin/Organization/Query'],
        },
      },
      query: {
        resource_element: 'iam.organizations.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/Organization/Query'],
          reset: ['POST /iam-admin/Organization/Query'],
          refresh: ['POST /iam-admin/Organization/Query'],
          paginate: [],
        },
      },
      detail: {
        resource_element: 'iam.organizations.detail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: [],
        },
      },
      local: {
        resource_element: 'iam.organizations.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
      create: {
        resource_element: 'iam.organizations.create',
        resource_key: 'create',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/Organization/Create', 'POST /iam-admin/Organization/Query'],
        },
      },
      edit: {
        resource_element: 'iam.organizations.edit',
        resource_key: 'edit',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/Organization/Update', 'POST /iam-admin/Organization/Query'],
        },
      },
      status: {
        resource_element: 'iam.organizations.status',
        resource_key: 'status',
        kind: 'action',
        events: {
          confirm: [
            'POST /iam-admin/Organization/ChangeStatus',
            'POST /iam-admin/Organization/Query',
          ],
        },
      },
      move: {
        resource_element: 'iam.organizations.move',
        resource_key: 'move',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/Organization/Move', 'POST /iam-admin/Organization/Query'],
        },
      },
      createLeader: {
        resource_element: 'iam.organizations.createLeader',
        resource_key: 'create',
        kind: 'selector',
        events: {
          search: ['POST /iam-admin/Organization/QueryLeaderCandidates'],
          paginate: ['POST /iam-admin/Organization/QueryLeaderCandidates'],
        },
      },
      editLeader: {
        resource_element: 'iam.organizations.editLeader',
        resource_key: 'edit',
        kind: 'selector',
        events: {
          search: ['POST /iam-admin/Organization/QueryLeaderCandidates'],
          paginate: ['POST /iam-admin/Organization/QueryLeaderCandidates'],
        },
      },
    },
    view_files: ['src/features/iam/foundation/components/OrganizationManagementPageView.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam.organizations.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看组织管理',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'detail', 'local'],
        },
        {
          permission_key: 'iam.organizations.create',
          parent_permission_key: 'iam.organizations.view',
          default_selected_with_parent: false,
          permission_name: '新建组织',
          resource_key: 'create',
          permission_kind: 'business',
          element_keys: ['create', 'createLeader'],
        },
        {
          permission_key: 'iam.organizations.edit',
          parent_permission_key: 'iam.organizations.view',
          default_selected_with_parent: false,
          permission_name: '编辑组织',
          resource_key: 'edit',
          permission_kind: 'business',
          element_keys: ['edit', 'editLeader'],
        },
        {
          permission_key: 'iam.organizations.status',
          parent_permission_key: 'iam.organizations.view',
          default_selected_with_parent: false,
          permission_name: '启用/停用',
          resource_key: 'status',
          permission_kind: 'business',
          element_keys: ['status'],
        },
        {
          permission_key: 'iam.organizations.move',
          parent_permission_key: 'iam.organizations.view',
          default_selected_with_parent: false,
          permission_name: '调整组织层级',
          resource_key: 'move',
          permission_kind: 'business',
          element_keys: ['move'],
        },
      ],
    },
  },
  positions: {
    page_id: 'iam-position-management',
    authorization_model: 'legacy',
    resource_code: 'IAM.POSITIONS',
    resource_name: '岗位管理',
    remarks:
      '用途：查询当前租户岗位的名称、类型、状态、人数和详情；场景：核对岗位目录，不将岗位自动解释为权限角色。',
    parent_resource_code: 'IAM',
    route_path: '/iam/positions',
    component: 'iam/foundation/pages/PositionManagementPage',
    buttons: {
      create: {
        resource_code: 'IAM.POSITIONS.BUTTON.CREATE',
        permission_code: 'iam:positions:button:create',
        resource_name: '新建岗位',
        remarks:
          '用途：创建当前租户岗位并刷新列表，岗位编码由服务端生成；场景：登记新的工作岗位，不自动给员工分配岗位或角色。',
      },
      edit: {
        resource_code: 'IAM.POSITIONS.BUTTON.EDIT',
        permission_code: 'iam:positions:button:edit',
        resource_name: '编辑岗位',
        remarks:
          '用途：更新岗位名称、类型、排序等允许字段并刷新列表；场景：维护岗位主资料，不修改岗位编码或员工归属。',
      },
      status: {
        resource_code: 'IAM.POSITIONS.BUTTON.STATUS',
        permission_code: 'iam:positions:button:status',
        resource_name: '启用/停用',
        remarks:
          '用途：通过 Position/ChangeStatus 启用或停用岗位；场景：控制岗位当前可用性，不删除历史成员岗位关系。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.positions.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: ['POST /iam-admin/Position/Query'],
          refresh: ['POST /iam-admin/Position/Query'],
        },
      },
      query: {
        resource_element: 'iam.positions.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: [],
          reset: [],
          refresh: ['POST /iam-admin/Position/Query'],
          paginate: [],
        },
      },
      detail: {
        resource_element: 'iam.positions.detail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: [],
        },
      },
      local: {
        resource_element: 'iam.positions.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
      create: {
        resource_element: 'iam.positions.create',
        resource_key: 'create',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/Position/Create', 'POST /iam-admin/Position/Query'],
        },
      },
      edit: {
        resource_element: 'iam.positions.edit',
        resource_key: 'edit',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/Position/Update', 'POST /iam-admin/Position/Query'],
        },
      },
      status: {
        resource_element: 'iam.positions.status',
        resource_key: 'status',
        kind: 'action',
        events: {
          confirm: ['POST /iam-admin/Position/ChangeStatus', 'POST /iam-admin/Position/Query'],
        },
      },
    },
    view_files: ['src/features/iam/foundation/components/PositionManagementPageView.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam.positions.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看岗位管理',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'detail', 'local'],
        },
        {
          permission_key: 'iam.positions.create',
          parent_permission_key: 'iam.positions.view',
          default_selected_with_parent: false,
          permission_name: '新建岗位',
          resource_key: 'create',
          permission_kind: 'business',
          element_keys: ['create'],
        },
        {
          permission_key: 'iam.positions.edit',
          parent_permission_key: 'iam.positions.view',
          default_selected_with_parent: false,
          permission_name: '编辑岗位',
          resource_key: 'edit',
          permission_kind: 'business',
          element_keys: ['edit'],
        },
        {
          permission_key: 'iam.positions.status',
          parent_permission_key: 'iam.positions.view',
          default_selected_with_parent: false,
          permission_name: '启用/停用',
          resource_key: 'status',
          permission_kind: 'business',
          element_keys: ['status'],
        },
      ],
    },
  },
  members: {
    page_id: 'iam-membership-management',
    authorization_model: 'legacy',
    resource_code: 'IAM.MEMBERS',
    resource_name: '用户与成员',
    remarks:
      '用途：按当前租户筛选用户及成员，读取详情、组织岗位关系和角色，筛选候选来自 QueryFilterOptions；场景：查找员工及核对身份，不跨租户聚合管理。',
    parent_resource_code: 'IAM',
    route_path: '/iam/members',
    component: 'iam/foundation/pages/MembershipManagementPage',
    buttons: {
      create: {
        resource_code: 'IAM.MEMBERS.BUTTON.CREATE',
        permission_code: 'iam:members:button:create',
        resource_name: '新增 Tenant 成员',
        remarks:
          '用途：创建新用户或关联已有账号加入当前租户，可上传头像并设置初始组织岗位；场景：建立租户成员，编码和成员显示名由服务端生成。',
      },
      editUser: {
        resource_code: 'IAM.MEMBERS.BUTTON.EDIT_USER',
        permission_code: 'iam:members:button:edit-user',
        resource_name: '编辑基本信息',
        remarks:
          '用途：通过 UpdateUser 修改姓名、手机、邮箱、头像等共享基本信息，登录账号只读且保留原昵称数据；场景：修订用户资料，可能影响该账号在其他租户的展示，不修改成员归属。',
      },
      editMember: {
        resource_code: 'IAM.MEMBERS.BUTTON.EDIT_MEMBER',
        permission_code: 'iam:members:button:edit-member',
        resource_name: '编辑成员资料',
        remarks:
          '用途：通过 UpdateMember 更新当前租户成员的允许资料并回读详情；场景：修订租户内成员信息，不改共享用户资料或系统生成编码、显示名。',
      },
      memberStatus: {
        resource_code: 'IAM.MEMBERS.BUTTON.MEMBER_STATUS',
        permission_code: 'iam:members:button:member-status',
        resource_name: '启用/停用成员',
        remarks:
          '用途：启用或停用当前租户成员关系并回读；场景：冻结或恢复该租户内成员，不停用全局账号、不永久清退成员。',
      },
      organization: {
        resource_code: 'IAM.MEMBERS.BUTTON.ORGANIZATION',
        permission_code: 'iam:members:button:organization',
        resource_name: '维护组织归属',
        remarks:
          '用途：新增或编辑成员组织关系，编辑使用原关系 ID/版本并选择当前租户组织；场景：维护主要组织和有效期，历史结束关系只读，不新增重复关系替代编辑。',
      },
      position: {
        resource_code: 'IAM.MEMBERS.BUTTON.POSITION',
        permission_code: 'iam:members:button:position',
        resource_name: '维护岗位归属',
        remarks:
          '用途：新增或编辑成员岗位关系，编辑使用原关系 ID/版本并选择当前租户岗位；场景：维护主要岗位和有效期，不据岗位推导角色或功能权限。',
      },
      assignRole: {
        resource_code: 'IAM.MEMBERS.BUTTON.ASSIGN_ROLE',
        permission_code: 'iam:members:button:assign-role',
        resource_name: '分配角色',
        remarks:
          '用途：查询成员已有角色和可分配角色，再通过 Assign 添加当前租户角色关系；场景：在员工详情抽屉分配角色，不直接授予 Function 或任命管理员。',
      },
      revokeRole: {
        resource_code: 'IAM.MEMBERS.BUTTON.REVOKE_ROLE',
        permission_code: 'iam:members:button:revoke-role',
        resource_name: '移除角色',
        remarks:
          '用途：通过 Revoke 移除当前租户成员的所选角色并回读；场景：撤销该角色带来的授权，不移除其他角色或取消管理员身份。',
      },
      appointAdmin: {
        resource_code: 'IAM.MEMBERS.BUTTON.APPOINT_ADMIN',
        permission_code: 'iam:members:button:appoint-admin',
        resource_name: '任命管理员',
        remarks:
          '用途：通过 AppointTenantAdmin 任命当前租户有效成员为管理员并回读；场景：SA 执行管理员身份变更，不以身份代替明确的业务 Permission 授权。',
      },
      cancelAdmin: {
        resource_code: 'IAM.MEMBERS.BUTTON.CANCEL_ADMIN',
        permission_code: 'iam:members:button:cancel-admin',
        resource_name: '取消管理员',
        remarks:
          '用途：通过 CancelTenantAdmin 取消当前租户管理员身份并回读，受最后一名有效管理员限制；场景：SA 调整管理职责，不撤销普通角色或结束成员关系。',
      },
      endOrganization: {
        resource_code: 'IAM.MEMBERS.BUTTON.END_ORGANIZATION',
        permission_code: 'iam:members:button:end-organization',
        resource_name: '结束组织归属',
        remarks:
          '用途：通过 EndOrganization 设置指定组织关系的结束时间并保留历史；场景：结束员工的一段组织归属，不删除组织或自动指定新主要组织。',
      },
      endPosition: {
        resource_code: 'IAM.MEMBERS.BUTTON.END_POSITION',
        permission_code: 'iam:members:button:end-position',
        resource_name: '结束岗位归属',
        remarks:
          '用途：通过 EndPosition 设置指定岗位关系的结束时间并保留历史；场景：结束员工的一段岗位归属，不删除岗位或自动指定新主要岗位。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.members.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: ['POST /iam-admin/Membership/QueryUsers'],
          refresh: ['POST /iam-admin/Membership/QueryUsers'],
        },
      },
      query: {
        resource_element: 'iam.members.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/Membership/QueryUsers'],
          reset: ['POST /iam-admin/Membership/QueryUsers'],
          refresh: ['POST /iam-admin/Membership/QueryUsers'],
          paginate: [],
        },
      },
      detail: {
        resource_element: 'iam.members.detail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/Membership/QueryUsers'],
        },
      },
      local: {
        resource_element: 'iam.members.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
      create: {
        resource_element: 'iam.members.create',
        resource_key: 'create',
        kind: 'action',
        events: {
          open: [],
          next: ['POST /iam-admin/Organization/Query', 'POST /iam-admin/Position/Query'],
          submit: [
            'POST /iam-admin/Membership/CreateMember',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      editUser: {
        resource_element: 'iam.members.editUser',
        resource_key: 'editUser',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/Membership/UpdateUser',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      editMember: {
        resource_element: 'iam.members.editMember',
        resource_key: 'editMember',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/Membership/UpdateMember',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      memberStatus: {
        resource_element: 'iam.members.memberStatus',
        resource_key: 'memberStatus',
        kind: 'action',
        events: {
          confirm: [
            'POST /iam-admin/Membership/ChangeMemberStatus',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      organization: {
        resource_element: 'iam.members.organization',
        resource_key: 'organization',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/Membership/SaveOrganization',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      editOrganization: {
        resource_element: 'iam.members.editOrganization',
        resource_key: 'organization',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/Membership/QueryUsers'],
          refresh: ['POST /iam-admin/Membership/QueryUsers'],
          submit: [
            'POST /iam-admin/Membership/SaveOrganization',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      endOrganization: {
        resource_element: 'iam.members.endOrganization',
        resource_key: 'endOrganization',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/Membership/QueryUsers'],
          refresh: ['POST /iam-admin/Membership/QueryUsers'],
          submit: [
            'POST /iam-admin/Membership/EndOrganization',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      position: {
        resource_element: 'iam.members.position',
        resource_key: 'position',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/Membership/SavePosition',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      editPosition: {
        resource_element: 'iam.members.editPosition',
        resource_key: 'position',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/Membership/QueryUsers'],
          refresh: ['POST /iam-admin/Membership/QueryUsers'],
          submit: [
            'POST /iam-admin/Membership/SavePosition',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      endPosition: {
        resource_element: 'iam.members.endPosition',
        resource_key: 'endPosition',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/Membership/QueryUsers'],
          refresh: ['POST /iam-admin/Membership/QueryUsers'],
          submit: [
            'POST /iam-admin/Membership/EndPosition',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      appointAdmin: {
        resource_element: 'iam.members.appointAdmin',
        resource_key: 'appointAdmin',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/Membership/QueryUsers'],
          refresh: ['POST /iam-admin/Membership/QueryUsers'],
          submit: [
            'POST /iam-admin/MemberRole/AppointTenantAdmin',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      cancelAdmin: {
        resource_element: 'iam.members.cancelAdmin',
        resource_key: 'cancelAdmin',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/Membership/QueryUsers'],
          refresh: ['POST /iam-admin/Membership/QueryUsers'],
          submit: [
            'POST /iam-admin/MemberRole/CancelTenantAdmin',
            'POST /iam-admin/Membership/QueryUsers',
          ],
        },
      },
      assignRole: {
        resource_element: 'iam.members.assignRole',
        resource_key: 'assignRole',
        kind: 'action',
        events: {
          open: [
            'POST /iam-admin/Membership/QueryUsers',
            'POST /iam-admin/MemberRole/Query',
            'POST /iam-admin/RolePermission/QueryRoles',
          ],
          submit: [
            'POST /iam-admin/MemberRole/Assign',
            'POST /iam-admin/Membership/QueryUsers',
            'POST /iam-admin/MemberRole/Query',
            'POST /iam-admin/RolePermission/QueryRoles',
          ],
        },
      },
      revokeRole: {
        resource_element: 'iam.members.revokeRole',
        resource_key: 'revokeRole',
        kind: 'action',
        events: {
          confirm: [
            'POST /iam-admin/MemberRole/Revoke',
            'POST /iam-admin/Membership/QueryUsers',
            'POST /iam-admin/MemberRole/Query',
          ],
        },
      },
      roles: {
        resource_element: 'iam.members.roles',
        resource_key: 'page',
        kind: 'drawer',
        events: {
          open: ['POST /iam-admin/Membership/QueryUsers', 'POST /iam-admin/MemberRole/Query'],
          refresh: ['POST /iam-admin/Membership/QueryUsers', 'POST /iam-admin/MemberRole/Query'],
        },
      },
      filterOptions: {
        resource_element: 'iam.members.filterOptions',
        resource_key: 'page',
        kind: 'selector',
        events: {
          search: ['POST /iam-admin/Membership/QueryFilterOptions'],
          paginate: ['POST /iam-admin/Membership/QueryFilterOptions'],
        },
      },
      organizationOptions: {
        resource_element: 'iam.members.organizationOptions',
        resource_key: 'organization',
        kind: 'selector',
        events: {
          search: ['POST /iam-admin/Membership/QueryFilterOptions'],
        },
      },
      positionOptions: {
        resource_element: 'iam.members.positionOptions',
        resource_key: 'position',
        kind: 'selector',
        events: {
          search: ['POST /iam-admin/Membership/QueryFilterOptions'],
        },
      },
      createAvatar: {
        resource_element: 'iam.members.createAvatar',
        resource_key: 'create',
        kind: 'upload',
        events: {
          upload: ['POST /dms/File/Upload'],
          preview: [],
          remove: [],
        },
      },
      editAvatar: {
        resource_element: 'iam.members.editAvatar',
        resource_key: 'editUser',
        kind: 'upload',
        events: {
          upload: ['POST /dms/File/Upload'],
          preview: [],
          remove: [],
        },
      },
      tenantContext: {
        resource_element: 'iam.members.tenantContext',
        resource_key: 'page',
        kind: 'lifecycle',
        events: {
          load: ['POST /iam-admin/Membership/QueryUsers'],
        },
      },
      effectivePermissions: {
        resource_element: 'iam.members.effectivePermissions',
        resource_key: 'page',
        kind: 'navigation',
        events: {
          access: ['POST /iam-admin/CurrentPermissionResource/CurrentPageResources'],
          click: [],
        },
        target_resource_code: 'IAM.MEMBERS.EFFECTIVE_PERMISSIONS',
        remarks:
          '用途：通过 QueryUserPermissions 读取当前租户用户的原子有效 Permission、资源及来源角色；场景：只读排查用户能访问什么及授权来源，不直接授予权限。',
      },
    },
    view_files: [
      'src/features/iam/foundation/components/MembershipManagementPageView.vue',
      'src/features/iam/foundation/components/MemberRolesDrawer.vue',
      'src/features/iam/foundation/components/MemberAdminDialog.vue',
      'src/features/iam/foundation/components/MemberRelationDrawer.vue',
    ],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam.members.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看用户与成员',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: [
            'page',
            'query',
            'detail',
            'local',
            'roles',
            'filterOptions',
            'tenantContext',
          ],
        },
        {
          permission_key: 'iam.members.create',
          parent_permission_key: 'iam.members.view',
          default_selected_with_parent: false,
          permission_name: '新增 Tenant 成员',
          resource_key: 'create',
          permission_kind: 'business',
          element_keys: ['create', 'createAvatar'],
        },
        {
          permission_key: 'iam.members.edit-user',
          parent_permission_key: 'iam.members.view',
          default_selected_with_parent: false,
          permission_name: '编辑基本信息',
          resource_key: 'editUser',
          permission_kind: 'business',
          element_keys: ['editUser', 'editAvatar'],
        },
        {
          permission_key: 'iam.members.edit-member',
          parent_permission_key: 'iam.members.view',
          default_selected_with_parent: false,
          permission_name: '编辑成员资料',
          resource_key: 'editMember',
          permission_kind: 'business',
          element_keys: ['editMember'],
        },
        {
          permission_key: 'iam.members.member-status',
          parent_permission_key: 'iam.members.view',
          default_selected_with_parent: false,
          permission_name: '启用/停用成员',
          resource_key: 'memberStatus',
          permission_kind: 'business',
          element_keys: ['memberStatus'],
        },
        {
          permission_key: 'iam.members.organization',
          parent_permission_key: 'iam.members.view',
          default_selected_with_parent: false,
          permission_name: '维护组织归属',
          resource_key: 'organization',
          permission_kind: 'business',
          element_keys: ['organization', 'editOrganization', 'organizationOptions'],
        },
        {
          permission_key: 'iam.members.position',
          parent_permission_key: 'iam.members.view',
          default_selected_with_parent: false,
          permission_name: '维护岗位归属',
          resource_key: 'position',
          permission_kind: 'business',
          element_keys: ['position', 'editPosition', 'positionOptions'],
        },
        {
          permission_key: 'iam.members.assign-role',
          parent_permission_key: 'iam.members.view',
          default_selected_with_parent: false,
          permission_name: '分配角色',
          resource_key: 'assignRole',
          permission_kind: 'business',
          element_keys: ['assignRole'],
        },
        {
          permission_key: 'iam.members.revoke-role',
          parent_permission_key: 'iam.members.view',
          default_selected_with_parent: false,
          permission_name: '移除角色',
          resource_key: 'revokeRole',
          permission_kind: 'business',
          element_keys: ['revokeRole'],
        },
        {
          permission_key: 'iam.members.appoint-admin',
          parent_permission_key: 'iam.members.view',
          default_selected_with_parent: false,
          permission_name: '任命管理员',
          resource_key: 'appointAdmin',
          permission_kind: 'business',
          element_keys: ['appointAdmin'],
        },
        {
          permission_key: 'iam.members.cancel-admin',
          parent_permission_key: 'iam.members.view',
          default_selected_with_parent: false,
          permission_name: '取消管理员',
          resource_key: 'cancelAdmin',
          permission_kind: 'business',
          element_keys: ['cancelAdmin'],
        },
        {
          permission_key: 'iam.members.end-organization',
          parent_permission_key: 'iam.members.view',
          default_selected_with_parent: false,
          permission_name: '结束组织归属',
          resource_key: 'endOrganization',
          permission_kind: 'business',
          element_keys: ['endOrganization'],
        },
        {
          permission_key: 'iam.members.end-position',
          parent_permission_key: 'iam.members.view',
          default_selected_with_parent: false,
          permission_name: '结束岗位归属',
          resource_key: 'endPosition',
          permission_kind: 'business',
          element_keys: ['endPosition'],
        },
      ],
    },
  },
} as const

export const groupElements = bindResourceElements(resourceRegistry.group)
export const tenantsElements = bindResourceElements(resourceRegistry.tenants)
export const organizationsElements = bindResourceElements(resourceRegistry.organizations)
export const positionsElements = bindResourceElements(resourceRegistry.positions)
export const membersElements = bindResourceElements(resourceRegistry.members)
