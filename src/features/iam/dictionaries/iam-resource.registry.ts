import { bindResourceElements } from '@shared/services/resourceElement'

// Offline declaration only. Resource synchronization and grants belong to maintenance.
export const resourceRegistry = {
  dictionaries: {
    page_id: 'iam-dictionary-management',
    resource_code: 'IAM.DICTIONARIES',
    permission_code: 'iam:dictionaries:view',
    resource_name: '字典管理',
    resource_type: 'menu',
    authorization_model: 'v2',
    remarks:
      '用途：按编码精确、名称等关键词模糊查询平台字典并读取字典值；场景：授权用户查阅公共枚举，写按钮仅授予SA，不按租户隔离，不包含业务数据修复。',
    parent_resource_code: 'IAM',
    route_path: '/iam/dictionaries',
    component: 'iam/dictionaries/pages/DictionaryManagementPage',
    buttons: {
      create: {
        permission_code: 'iam:dictionaries:create',
        resource_code: 'IAM.DICTIONARIES.CREATE',
        resource_name: '新建字典',
        remarks:
          '用途：原子创建字典及可选初始字典值；场景：SA 登记稳定业务编码，失败不留下部分记录。',
      },
      update: {
        permission_code: 'iam:dictionaries:update',
        resource_code: 'IAM.DICTIONARIES.UPDATE',
        resource_name: '编辑字典',
        remarks: '用途：按版本更新字典名称和描述；场景：修订说明，编码与字典值保持独立。',
      },
      enable: {
        permission_code: 'iam:dictionaries:enable',
        resource_code: 'IAM.DICTIONARIES.ENABLE',
        resource_name: '启用字典',
        remarks:
          '用途：按当前版本启用平台字典，仅恢复自身启用子值的可用性；场景：重新开放公共枚举，不启用单独停用的值、不恢复已删除记录。',
      },
      disable: {
        permission_code: 'iam:dictionaries:disable',
        resource_code: 'IAM.DICTIONARIES.DISABLE',
        resource_name: '停用字典',
        remarks:
          '用途：按当前版本停用平台字典，使全部值不可用于新业务；场景：暂停公共枚举，保留数据及子值自身状态、版本和历史引用。',
      },
      createItem: {
        permission_code: 'iam:dictionaries:create-item',
        resource_code: 'IAM.DICTIONARIES.CREATE_ITEM',
        resource_name: '新增字典值',
        remarks:
          '用途：在指定字典中新增值及排序、状态、颜色和 JSON 扩展数据；场景：扩充公共枚举，编码在字典内唯一。',
      },
      updateItem: {
        permission_code: 'iam:dictionaries:update-item',
        resource_code: 'IAM.DICTIONARIES.UPDATE_ITEM',
        resource_name: '编辑字典值',
        remarks: '用途：按独立版本更新值的属性；场景：修订枚举显示，不修改编码、不移动字典。',
      },
      enableItem: {
        permission_code: 'iam:dictionaries:enable-item',
        resource_code: 'IAM.DICTIONARIES.ENABLE_ITEM',
        resource_name: '启用字典值',
        remarks:
          '用途：按独立版本启用指定字典值；场景：重新开放单个枚举，父字典停用时仍不可用于新业务，不隐式启用父字典。',
      },
      disableItem: {
        permission_code: 'iam:dictionaries:disable-item',
        resource_code: 'IAM.DICTIONARIES.DISABLE_ITEM',
        resource_name: '停用字典值',
        remarks:
          '用途：按独立版本停用指定字典值；场景：暂停单个枚举，不删除数据，不修改父字典或其他值，不改写历史引用。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.dictionary.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: ['POST /iam-admin/Dictionary/Query'],
        },
      },
      query: {
        resource_element: 'iam.dictionary.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/Dictionary/Query'],
          reset: ['POST /iam-admin/Dictionary/Query'],
          paginate: ['POST /iam-admin/Dictionary/Query'],
          refresh: ['POST /iam-admin/Dictionary/Query'],
        },
      },
      values: {
        resource_element: 'iam.dictionary.values',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/Dictionary/QueryItems'],
          search: ['POST /iam-admin/Dictionary/QueryItems'],
          paginate: ['POST /iam-admin/Dictionary/QueryItems'],
          refresh: ['POST /iam-admin/Dictionary/QueryItems'],
        },
      },
      local: {
        resource_element: 'iam.dictionary.local',
        resource_key: 'page',
        kind: 'local',
        events: { click: [] },
      },
      create: {
        resource_element: 'iam.dictionary.create',
        resource_key: 'create',
        kind: 'form',
        events: {
          open: [],
          submit: ['POST /iam-admin/Dictionary/Create', 'POST /iam-admin/Dictionary/Query'],
        },
      },
      update: {
        resource_element: 'iam.dictionary.update',
        resource_key: 'update',
        kind: 'form',
        events: {
          open: [],
          submit: ['POST /iam-admin/Dictionary/Update', 'POST /iam-admin/Dictionary/Query'],
        },
      },
      enable: {
        resource_element: 'iam.dictionary.enable',
        resource_key: 'enable',
        kind: 'form',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/Dictionary/Enable',
            'POST /iam-admin/Dictionary/QueryItems',
            'POST /iam-admin/Dictionary/Query',
          ],
        },
      },
      disable: {
        resource_element: 'iam.dictionary.disable',
        resource_key: 'disable',
        kind: 'form',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/Dictionary/Disable',
            'POST /iam-admin/Dictionary/QueryItems',
            'POST /iam-admin/Dictionary/Query',
          ],
        },
      },
      createItem: {
        resource_element: 'iam.dictionary.createItem',
        resource_key: 'createItem',
        kind: 'form',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/Dictionary/CreateItem',
            'POST /iam-admin/Dictionary/QueryItems',
          ],
        },
      },
      updateItem: {
        resource_element: 'iam.dictionary.updateItem',
        resource_key: 'updateItem',
        kind: 'form',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/Dictionary/UpdateItem',
            'POST /iam-admin/Dictionary/QueryItems',
          ],
        },
      },
      enableItem: {
        resource_element: 'iam.dictionary.enableItem',
        resource_key: 'enableItem',
        kind: 'form',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/Dictionary/EnableItem',
            'POST /iam-admin/Dictionary/QueryItems',
          ],
        },
      },
      disableItem: {
        resource_element: 'iam.dictionary.disableItem',
        resource_key: 'disableItem',
        kind: 'form',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/Dictionary/DisableItem',
            'POST /iam-admin/Dictionary/QueryItems',
          ],
        },
      },
    },
    view_files: [
      'src/features/iam/dictionaries/pages/DictionaryManagementPage.vue',
      'src/features/iam/dictionaries/components/DictionaryManagementPageView.vue',
      'src/features/iam/dictionaries/components/DictionaryItemFields.vue',
    ],
    maintenance: {
      permissions: [
        {
          permission_key: 'iam.dictionary.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看字典及字典值',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'values', 'local'],
        },
        {
          permission_key: 'iam.dictionary.create',
          parent_permission_key: 'iam.dictionary.view',
          default_selected_with_parent: false,
          permission_name: '新建字典',
          resource_key: 'create',
          permission_kind: 'business',
          element_keys: ['create'],
        },
        {
          permission_key: 'iam.dictionary.update',
          parent_permission_key: 'iam.dictionary.view',
          default_selected_with_parent: false,
          permission_name: '编辑字典',
          resource_key: 'update',
          permission_kind: 'business',
          element_keys: ['update'],
        },
        {
          permission_key: 'iam.dictionary.enable',
          parent_permission_key: 'iam.dictionary.view',
          default_selected_with_parent: false,
          permission_name: '启用字典',
          resource_key: 'enable',
          permission_kind: 'business',
          element_keys: ['enable'],
        },
        {
          permission_key: 'iam.dictionary.disable',
          parent_permission_key: 'iam.dictionary.view',
          default_selected_with_parent: false,
          permission_name: '停用字典',
          resource_key: 'disable',
          permission_kind: 'business',
          element_keys: ['disable'],
        },
        {
          permission_key: 'iam.dictionary.create-item',
          parent_permission_key: 'iam.dictionary.view',
          default_selected_with_parent: false,
          permission_name: '新增字典值',
          resource_key: 'createItem',
          permission_kind: 'business',
          element_keys: ['createItem'],
        },
        {
          permission_key: 'iam.dictionary.update-item',
          parent_permission_key: 'iam.dictionary.view',
          default_selected_with_parent: false,
          permission_name: '编辑字典值',
          resource_key: 'updateItem',
          permission_kind: 'business',
          element_keys: ['updateItem'],
        },
        {
          permission_key: 'iam.dictionary.enable-item',
          parent_permission_key: 'iam.dictionary.view',
          default_selected_with_parent: false,
          permission_name: '启用字典值',
          resource_key: 'enableItem',
          permission_kind: 'business',
          element_keys: ['enableItem'],
        },
        {
          permission_key: 'iam.dictionary.disable-item',
          parent_permission_key: 'iam.dictionary.view',
          default_selected_with_parent: false,
          permission_name: '停用字典值',
          resource_key: 'disableItem',
          permission_kind: 'business',
          element_keys: ['disableItem'],
        },
      ],
    },
  },
} as const
export const el = bindResourceElements(resourceRegistry.dictionaries)
