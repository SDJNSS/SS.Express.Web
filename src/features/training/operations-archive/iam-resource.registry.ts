import { bindResourceElements } from '@shared/services/resourceElement'

// Describes current production bindings only; candidate-only flows are explicitly local.
export const resourceRegistry = {
  plans: {
    page_id: 'training-plan-management',
    authorization_model: 'legacy',
    resource_code: 'IAM.TRAINING.PLANS',
    resource_name: '培训计划',
    remarks:
      '用途：查询当前租户年度及常设培训计划、状态与任务摘要；场景：定位计划后进入其任务及员工列表，不将所有任务混为独立运营列表。',
    parent_resource_code: 'IAM.TRAINING',
    resource_type: 'menu',
    route_path: '/iam/training/plans',
    component: 'training/operations-archive/pages/TrainingPlanManagementPage',
    buttons: {
      create: {
        resource_code: 'IAM.TRAINING.PLANS.BUTTON.CREATE',
        permission_code: 'iam:training:plans:button:create',
        resource_name: '新建培训计划',
        remarks:
          '用途：创建年度或常设计划并刷新列表；场景：建立培训安排，常设计划不提交年度、结束时间或月度季度频率。',
      },
      edit: {
        resource_code: 'IAM.TRAINING.PLANS.BUTTON.EDIT',
        permission_code: 'iam:training:plans:button:edit',
        resource_name: '编辑培训计划',
        remarks:
          '用途：通过 Update 修改选定培训计划的允许资料并回读；场景：修订计划名称、有效期等定义，常设与年度字段规则分别校验。',
      },
      publish: {
        resource_code: 'IAM.TRAINING.PLANS.BUTTON.PUBLISH',
        permission_code: 'iam:training:plans:button:publish',
        resource_name: '发布培训计划',
        remarks:
          '用途：通过 Publish 发布指定培训计划并刷新状态；场景：将符合条件的计划投入运营，发布前由服务端校验，不伪造任务完成结果。',
      },
      delete: {
        resource_code: 'IAM.TRAINING.PLANS.BUTTON.DELETE',
        permission_code: 'iam:training:plans:button:delete',
        resource_name: '删除培训计划',
        remarks:
          '用途：确认目标后调用 Delete 删除服务端允许删除的计划并刷新列表；场景：清理不再需要的计划，受状态和引用约束，不以停用冒充删除。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.training.plans.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: ['POST /iam-admin/TrainingPlan/Query'],
        },
      },
      query: {
        resource_element: 'iam.training.plans.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/TrainingPlan/Query'],
          reset: ['POST /iam-admin/TrainingPlan/Query'],
          refresh: ['POST /iam-admin/TrainingPlan/Query'],
          paginate: ['POST /iam-admin/TrainingPlan/Query'],
        },
      },
      local: {
        resource_element: 'iam.training.plans.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
          close: [],
        },
      },
      detail: {
        resource_element: 'iam.training.plans.detail',
        resource_key: 'page',
        kind: 'navigation',
        events: {
          click: [],
        },
        target_resource_code: 'IAM.TRAINING.PLANS.DETAIL',
        remarks:
          '用途：读取指定计划详情、其任务、当前员工与成员历史；场景：在计划上下文核对任务进度和员工范围，不查询其他租户员工。',
      },
      create: {
        resource_element: 'iam.training.plans.create',
        resource_key: 'create',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/TrainingPlan/Create', 'POST /iam-admin/TrainingPlan/Query'],
        },
      },
      edit: {
        resource_element: 'iam.training.plans.edit',
        resource_key: 'edit',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/TrainingPlan/Update', 'POST /iam-admin/TrainingPlan/Query'],
        },
      },
      publish: {
        resource_element: 'iam.training.plans.publish',
        resource_key: 'publish',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/TrainingPlan/Publish', 'POST /iam-admin/TrainingPlan/Query'],
        },
      },
      delete: {
        resource_element: 'iam.training.plans.delete',
        resource_key: 'delete',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/TrainingPlan/Delete', 'POST /iam-admin/TrainingPlan/Query'],
        },
      },
    },
    view_files: ['src/features/training/operations-archive/components/TrainingPlanPageView.vue'],
    maintenance: {
      permissions: [
        {
          permission_key: 'training-plan-management.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看培训计划',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'local'],
        },
        {
          permission_key: 'training-plan-management.create',
          parent_permission_key: 'training-plan-management.view',
          default_selected_with_parent: false,
          permission_name: '新建培训计划',
          resource_key: 'create',
          permission_kind: 'business',
          element_keys: ['create'],
        },
        {
          permission_key: 'training-plan-management.edit',
          parent_permission_key: 'training-plan-management.view',
          default_selected_with_parent: false,
          permission_name: '编辑培训计划',
          resource_key: 'edit',
          permission_kind: 'business',
          element_keys: ['edit'],
        },
        {
          permission_key: 'training-plan-management.publish',
          parent_permission_key: 'training-plan-management.view',
          default_selected_with_parent: false,
          permission_name: '发布培训计划',
          resource_key: 'publish',
          permission_kind: 'business',
          element_keys: ['publish'],
        },
        {
          permission_key: 'training-plan-management.delete',
          parent_permission_key: 'training-plan-management.view',
          default_selected_with_parent: false,
          permission_name: '删除培训计划',
          resource_key: 'delete',
          permission_kind: 'business',
          element_keys: ['delete'],
        },
      ],
    },
  },
  planDetail: {
    page_id: 'training-plan-detail',
    authorization_model: 'legacy',
    resource_code: 'IAM.TRAINING.PLANS.DETAIL',
    resource_name: '培训计划详情',
    remarks:
      '用途：读取指定计划详情、其任务、当前员工与成员历史；场景：在计划上下文核对任务进度和员工范围，不查询其他租户员工。',
    parent_resource_code: 'IAM.TRAINING.PLANS',
    resource_type: 'button_page',
    route_path: '/iam/training/plans/:planId',
    component: 'training/operations-archive/pages/TrainingPlanDetailPage',
    is_visible: false,
    buttons: {
      createTask: {
        resource_code: 'IAM.TRAINING.PLANS.DETAIL.BUTTON.CREATETASK',
        permission_code: 'iam:training:plans:detail:button:create-task',
        resource_name: '新建培训任务',
        remarks:
          '用途：查询课程、考试和已有周期后在当前计划创建培训任务；场景：安排月度、季度、其他或符合常设规则的长期任务，成功后回读计划及任务。',
      },
      startTask: {
        resource_code: 'IAM.TRAINING.PLANS.DETAIL.BUTTON.STARTTASK',
        permission_code: 'iam:training:plans:detail:button:start-task',
        resource_name: '重试启动培训任务',
        remarks:
          '用途：通过 TrainingTask/Start 重试启动指定任务并回读；场景：恢复服务端允许重试的启动流程，不重复创建任务或伪造员工进度。',
      },
      deleteTask: {
        resource_code: 'IAM.TRAINING.PLANS.DETAIL.BUTTON.DELETETASK',
        permission_code: 'iam:training:plans:detail:button:delete-task',
        resource_name: '删除培训任务',
        remarks:
          '用途：通过 TrainingTask/Delete 删除当前计划下允许删除的任务并回读；场景：清理错误任务，遵守任务状态和引用校验。',
      },
      addEmployees: {
        resource_code: 'IAM.TRAINING.PLANS.DETAIL.BUTTON.ADDEMPLOYEES',
        permission_code: 'iam:training:plans:detail:button:add-employees',
        resource_name: '加入计划员工',
        remarks:
          '用途：查询当前租户用户并通过 BatchAdd 加入当前培训计划；场景：扩大本计划员工范围，不创建新用户或将其他租户人员加入。',
      },
      exitEmployee: {
        resource_code: 'IAM.TRAINING.PLANS.DETAIL.BUTTON.EXITEMPLOYEE',
        permission_code: 'iam:training:plans:detail:button:exit-employee',
        resource_name: '退出计划员工',
        remarks:
          '用途：通过 Exit 退出当前计划中的指定员工并回读；场景：调整计划应培训范围，保留既有培训事实，不退出租户成员关系。',
      },
      exitEmployees: {
        resource_code: 'IAM.TRAINING.PLANS.DETAIL.BUTTON.EXITEMPLOYEES',
        permission_code: 'iam:training:plans:detail:button:exit-employees',
        resource_name: '批量退出计划员工',
        remarks:
          '用途：通过 Exit 或 BatchExit 退出当前计划中明确选定的员工并回读；场景：批量调整计划员工范围，不按当前分页默认为全部员工。',
      },
      rejoinEmployee: {
        resource_code: 'IAM.TRAINING.PLANS.DETAIL.BUTTON.REJOINEMPLOYEE',
        permission_code: 'iam:training:plans:detail:button:rejoin-employee',
        resource_name: '重新加入计划',
        remarks:
          '用途：通过 Rejoin 恢复历史退出员工在当前计划中的关系并回读；场景：重新纳入应培训范围，不删除旧历史或伪造完成结果。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.training.planDetail.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [
            'POST /iam-admin/TrainingPlan/Detail',
            'POST /iam-admin/TrainingTask/Query',
            'POST /iam-admin/TrainingPlanEmployee/Query',
          ],
          refresh: [
            'POST /iam-admin/TrainingPlan/Detail',
            'POST /iam-admin/TrainingTask/Query',
            'POST /iam-admin/TrainingPlanEmployee/Query',
          ],
        },
      },
      tasks: {
        resource_element: 'iam.training.planDetail.tasks',
        resource_key: 'page',
        kind: 'query',
        events: {
          paginate: ['POST /iam-admin/TrainingTask/Query'],
        },
      },
      employees: {
        resource_element: 'iam.training.planDetail.employees',
        resource_key: 'page',
        kind: 'query',
        events: {
          paginate: ['POST /iam-admin/TrainingPlanEmployee/Query'],
        },
      },
      history: {
        resource_element: 'iam.training.planDetail.history',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/TrainingPlanEmployee/History'],
        },
      },
      local: {
        resource_element: 'iam.training.planDetail.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
          close: [],
        },
      },
      candidateOnly: {
        resource_element: 'iam.training.planDetail.candidateOnly',
        resource_key: 'page',
        kind: 'local',
        events: {
          open: [],
          submit: [],
          retry: [],
        },
      },
      taskDetail: {
        resource_element: 'iam.training.planDetail.taskDetail',
        resource_key: 'page',
        kind: 'navigation',
        events: {
          click: [],
        },
        target_resource_code: 'IAM.TRAINING.PLANS.DETAIL.TASK',
        remarks:
          '用途：读取计划内任务、课程考试统计及员工执行记录，并按人数状态下钻；场景：核对学习与考试完成情况，结果以服务端为准，不在查看时修改进度。',
      },
      createTask: {
        resource_element: 'iam.training.planDetail.createTask',
        resource_key: 'createTask',
        kind: 'action',
        events: {
          open: [
            'POST /iam-admin/TrainingCourse/Query',
            'POST /iam-admin/TrainingExam/Query',
            'POST /iam-admin/TrainingTask/Query',
          ],
          submit: [
            'POST /iam-admin/TrainingTask/Create',
            'POST /iam-admin/TrainingTask/Query',
            'POST /iam-admin/TrainingPlan/Detail',
          ],
        },
      },
      startTask: {
        resource_element: 'iam.training.planDetail.startTask',
        resource_key: 'startTask',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/TrainingTask/Start',
            'POST /iam-admin/TrainingTask/Query',
            'POST /iam-admin/TrainingPlan/Detail',
          ],
        },
      },
      deleteTask: {
        resource_element: 'iam.training.planDetail.deleteTask',
        resource_key: 'deleteTask',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/TrainingTask/Delete',
            'POST /iam-admin/TrainingTask/Query',
            'POST /iam-admin/TrainingPlan/Detail',
          ],
        },
      },
      addEmployees: {
        resource_element: 'iam.training.planDetail.addEmployees',
        resource_key: 'addEmployees',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/Membership/QueryUsers'],
          submit: [
            'POST /iam-admin/TrainingPlanEmployee/BatchAdd',
            'POST /iam-admin/TrainingPlanEmployee/Query',
            'POST /iam-admin/TrainingPlan/Detail',
          ],
        },
      },
      exitEmployee: {
        resource_element: 'iam.training.planDetail.exitEmployee',
        resource_key: 'exitEmployee',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/TrainingPlanEmployee/Exit',
            'POST /iam-admin/TrainingPlanEmployee/Query',
            'POST /iam-admin/TrainingPlan/Detail',
          ],
        },
      },
      exitEmployees: {
        resource_element: 'iam.training.planDetail.exitEmployees',
        resource_key: 'exitEmployees',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/TrainingPlanEmployee/Exit',
            'POST /iam-admin/TrainingPlanEmployee/BatchExit',
            'POST /iam-admin/TrainingPlanEmployee/Query',
            'POST /iam-admin/TrainingPlan/Detail',
          ],
        },
      },
      rejoinEmployee: {
        resource_element: 'iam.training.planDetail.rejoinEmployee',
        resource_key: 'rejoinEmployee',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/TrainingPlanEmployee/Rejoin',
            'POST /iam-admin/TrainingPlanEmployee/Query',
            'POST /iam-admin/TrainingPlan/Detail',
          ],
        },
      },
      createCourseOptions: {
        resource_element: 'iam.training.planDetail.createCourseOptions',
        resource_key: 'createTask',
        kind: 'selector',
        events: {
          search: ['POST /iam-admin/TrainingCourse/Query'],
        },
      },
      createExamOptions: {
        resource_element: 'iam.training.planDetail.createExamOptions',
        resource_key: 'createTask',
        kind: 'selector',
        events: {
          search: ['POST /iam-admin/TrainingExam/Query'],
        },
      },
      employeeOptions: {
        resource_element: 'iam.training.planDetail.employeeOptions',
        resource_key: 'addEmployees',
        kind: 'selector',
        events: {
          search: ['POST /iam-admin/Membership/QueryUsers'],
        },
      },
    },
    view_files: [
      'src/features/training/operations-archive/components/TrainingPlanDetailPageView.vue',
    ],
    maintenance: {
      permissions: [
        {
          permission_key: 'training-plan-detail.view',
          parent_permission_key: 'training-plan-management.view',
          default_selected_with_parent: false,
          permission_name: '查看培训计划详情',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'tasks', 'employees', 'history', 'local', 'candidateOnly'],
        },
        {
          permission_key: 'training-plan-detail.createTask',
          parent_permission_key: 'training-plan-detail.view',
          default_selected_with_parent: false,
          permission_name: '新建培训任务',
          resource_key: 'createTask',
          permission_kind: 'business',
          element_keys: ['createTask', 'createCourseOptions', 'createExamOptions'],
        },
        {
          permission_key: 'training-plan-detail.startTask',
          parent_permission_key: 'training-plan-detail.view',
          default_selected_with_parent: false,
          permission_name: '重试启动培训任务',
          resource_key: 'startTask',
          permission_kind: 'business',
          element_keys: ['startTask'],
        },
        {
          permission_key: 'training-plan-detail.deleteTask',
          parent_permission_key: 'training-plan-detail.view',
          default_selected_with_parent: false,
          permission_name: '删除培训任务',
          resource_key: 'deleteTask',
          permission_kind: 'business',
          element_keys: ['deleteTask'],
        },
        {
          permission_key: 'training-plan-detail.addEmployees',
          parent_permission_key: 'training-plan-detail.view',
          default_selected_with_parent: false,
          permission_name: '加入计划员工',
          resource_key: 'addEmployees',
          permission_kind: 'business',
          element_keys: ['addEmployees', 'employeeOptions'],
        },
        {
          permission_key: 'training-plan-detail.exitEmployee',
          parent_permission_key: 'training-plan-detail.view',
          default_selected_with_parent: false,
          permission_name: '退出计划员工',
          resource_key: 'exitEmployee',
          permission_kind: 'business',
          element_keys: ['exitEmployee'],
        },
        {
          permission_key: 'training-plan-detail.exitEmployees',
          parent_permission_key: 'training-plan-detail.view',
          default_selected_with_parent: false,
          permission_name: '批量退出计划员工',
          resource_key: 'exitEmployees',
          permission_kind: 'business',
          element_keys: ['exitEmployees'],
        },
        {
          permission_key: 'training-plan-detail.rejoinEmployee',
          parent_permission_key: 'training-plan-detail.view',
          default_selected_with_parent: false,
          permission_name: '重新加入计划',
          resource_key: 'rejoinEmployee',
          permission_kind: 'business',
          element_keys: ['rejoinEmployee'],
        },
      ],
    },
  },
  taskDetail: {
    page_id: 'training-task-detail',
    authorization_model: 'legacy',
    resource_code: 'IAM.TRAINING.PLANS.DETAIL.TASK',
    resource_name: '培训任务详情',
    remarks:
      '用途：读取计划内任务、课程考试统计及员工执行记录，并按人数状态下钻；场景：核对学习与考试完成情况，结果以服务端为准，不在查看时修改进度。',
    parent_resource_code: 'IAM.TRAINING.PLANS.DETAIL',
    resource_type: 'button_page',
    route_path: '/iam/training/plans/:planId/tasks/:taskId',
    component: 'training/operations-archive/pages/TrainingTaskDetailPage',
    is_visible: false,
    buttons: {
      edit: {
        resource_code: 'IAM.TRAINING.PLANS.DETAIL.TASK.BUTTON.EDIT',
        permission_code: 'iam:training:plans:detail:task:button:edit',
        resource_name: '编辑培训任务',
        remarks:
          '用途：查询课程和考试候选后更新指定任务内容及允许资料并回读；场景：修订当前计划的培训安排，不直接编辑员工学习、答题或成绩。',
      },
      start: {
        resource_code: 'IAM.TRAINING.PLANS.DETAIL.TASK.BUTTON.START',
        permission_code: 'iam:training:plans:detail:task:button:start',
        resource_name: '重试启动培训任务',
        remarks:
          '用途：通过 TrainingTask/Start 重试启动当前任务并刷新详情和员工记录；场景：处理允许重试的任务启动，不重新创建任务。',
      },
      delete: {
        resource_code: 'IAM.TRAINING.PLANS.DETAIL.TASK.BUTTON.DELETE',
        permission_code: 'iam:training:plans:detail:task:button:delete',
        resource_name: '删除培训任务',
        remarks:
          '用途：通过 TrainingTask/Delete 删除允许删除的当前任务；场景：清理错误任务，成功后离开已删除详情，不静默删除整个计划。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.training.taskDetail.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [
            'POST /iam-admin/TrainingTask/Detail',
            'POST /iam-admin/TrainingTaskEmployee/Query',
          ],
          refresh: [
            'POST /iam-admin/TrainingTask/Detail',
            'POST /iam-admin/TrainingTaskEmployee/Query',
          ],
        },
      },
      employees: {
        resource_element: 'iam.training.taskDetail.employees',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/TrainingTaskEmployee/Query'],
          reset: ['POST /iam-admin/TrainingTaskEmployee/Query'],
          refresh: ['POST /iam-admin/TrainingTaskEmployee/Query'],
          paginate: ['POST /iam-admin/TrainingTaskEmployee/Query'],
        },
      },
      personnel: {
        resource_element: 'iam.training.taskDetail.personnel',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/TrainingTaskEmployee/Query'],
          paginate: ['POST /iam-admin/TrainingTaskEmployee/Query'],
        },
      },
      courseDetail: {
        resource_element: 'iam.training.taskDetail.courseDetail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/TrainingCourse/Detail'],
        },
      },
      examDetail: {
        resource_element: 'iam.training.taskDetail.examDetail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/TrainingExam/Detail'],
        },
      },
      local: {
        resource_element: 'iam.training.taskDetail.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
          close: [],
        },
      },
      candidateOnly: {
        resource_element: 'iam.training.taskDetail.candidateOnly',
        resource_key: 'page',
        kind: 'local',
        events: {
          open: [],
          search: [],
          submit: [],
        },
      },
      back: {
        resource_element: 'iam.training.taskDetail.back',
        resource_key: 'page',
        kind: 'navigation',
        events: {
          click: [],
        },
        target_resource_code: 'IAM.TRAINING.PLANS.DETAIL',
        remarks:
          '用途：读取指定计划详情、其任务、当前员工与成员历史；场景：在计划上下文核对任务进度和员工范围，不查询其他租户员工。',
      },
      edit: {
        resource_element: 'iam.training.taskDetail.edit',
        resource_key: 'edit',
        kind: 'action',
        events: {
          open: ['POST /iam-admin/TrainingCourse/Query', 'POST /iam-admin/TrainingExam/Query'],
          submit: [
            'POST /iam-admin/TrainingTask/Update',
            'POST /iam-admin/TrainingTask/Detail',
            'POST /iam-admin/TrainingTaskEmployee/Query',
          ],
        },
      },
      start: {
        resource_element: 'iam.training.taskDetail.start',
        resource_key: 'start',
        kind: 'action',
        events: {
          open: [],
          submit: [
            'POST /iam-admin/TrainingTask/Start',
            'POST /iam-admin/TrainingTask/Detail',
            'POST /iam-admin/TrainingTaskEmployee/Query',
          ],
        },
      },
      delete: {
        resource_element: 'iam.training.taskDetail.delete',
        resource_key: 'delete',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/TrainingTask/Delete'],
        },
      },
      courseOptions: {
        resource_element: 'iam.training.taskDetail.courseOptions',
        resource_key: 'edit',
        kind: 'selector',
        events: {
          search: ['POST /iam-admin/TrainingCourse/Query'],
        },
      },
      examOptions: {
        resource_element: 'iam.training.taskDetail.examOptions',
        resource_key: 'edit',
        kind: 'selector',
        events: {
          search: ['POST /iam-admin/TrainingExam/Query'],
        },
      },
    },
    view_files: [
      'src/features/training/operations-archive/components/TrainingTaskDetailPageView.vue',
      'src/features/training/operations-archive/pages/TrainingTaskDetailPage.vue',
      'src/features/training/operations-archive/components/TrainingPersonnelDrawer.vue',
    ],
    maintenance: {
      permissions: [
        {
          permission_key: 'training-task-detail.view',
          parent_permission_key: 'training-plan-detail.view',
          default_selected_with_parent: false,
          permission_name: '查看培训任务详情',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: [
            'page',
            'employees',
            'personnel',
            'courseDetail',
            'examDetail',
            'local',
            'candidateOnly',
          ],
        },
        {
          permission_key: 'training-task-detail.edit',
          parent_permission_key: 'training-task-detail.view',
          default_selected_with_parent: false,
          permission_name: '编辑培训任务',
          resource_key: 'edit',
          permission_kind: 'business',
          element_keys: ['edit', 'courseOptions', 'examOptions'],
        },
        {
          permission_key: 'training-task-detail.start',
          parent_permission_key: 'training-task-detail.view',
          default_selected_with_parent: false,
          permission_name: '重试启动培训任务',
          resource_key: 'start',
          permission_kind: 'business',
          element_keys: ['start'],
        },
        {
          permission_key: 'training-task-detail.delete',
          parent_permission_key: 'training-task-detail.view',
          default_selected_with_parent: false,
          permission_name: '删除培训任务',
          resource_key: 'delete',
          permission_kind: 'business',
          element_keys: ['delete'],
        },
      ],
    },
  },
  overview: {
    page_id: 'training-operations-overview',
    authorization_model: 'legacy',
    resource_code: 'IAM.TRAINING.OVERVIEW',
    resource_name: '培训概览',
    remarks:
      '用途：查询当前租户培训概览、趋势及未完成、当前逾期或曾逾期人员；场景：监控真实培训进度并下钻问题人员，三类范围不得混用。',
    parent_resource_code: 'IAM.TRAINING',
    resource_type: 'menu',
    route_path: '/iam/training/overview',
    component: 'training/operations-archive/pages/TrainingOperationsOverviewPage',
    buttons: {},
    elements: {
      page: {
        resource_element: 'iam.training.overview.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [
            'POST /iam-admin/TrainingPlan/Query',
            'POST /iam-admin/TrainingTask/Query',
            'POST /iam-admin/TrainingOverview/Overview',
            'POST /iam-admin/TrainingOverview/Trends',
            'POST /iam-admin/TrainingOverview/Incomplete',
          ],
        },
      },
      query: {
        resource_element: 'iam.training.overview.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: [
            'POST /iam-admin/TrainingOverview/Overview',
            'POST /iam-admin/TrainingOverview/Trends',
            'POST /iam-admin/TrainingOverview/Incomplete',
          ],
          reset: [
            'POST /iam-admin/TrainingOverview/Overview',
            'POST /iam-admin/TrainingOverview/Trends',
            'POST /iam-admin/TrainingOverview/Incomplete',
          ],
        },
      },
      overview: {
        resource_element: 'iam.training.overview.overview',
        resource_key: 'page',
        kind: 'detail',
        events: {
          retry: ['POST /iam-admin/TrainingOverview/Overview'],
        },
      },
      trends: {
        resource_element: 'iam.training.overview.trends',
        resource_key: 'page',
        kind: 'detail',
        events: {
          retry: ['POST /iam-admin/TrainingOverview/Trends'],
        },
      },
      incomplete: {
        resource_element: 'iam.training.overview.incomplete',
        resource_key: 'page',
        kind: 'detail',
        events: {
          select: [
            'POST /iam-admin/TrainingOverview/Overview',
            'POST /iam-admin/TrainingOverview/Trends',
            'POST /iam-admin/TrainingOverview/Incomplete',
          ],
          retry: ['POST /iam-admin/TrainingOverview/Incomplete'],
          paginate: [
            'POST /iam-admin/TrainingOverview/Overview',
            'POST /iam-admin/TrainingOverview/Trends',
            'POST /iam-admin/TrainingOverview/Incomplete',
          ],
        },
      },
      local: {
        resource_element: 'iam.training.overview.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
        },
      },
    },
    view_files: [
      'src/features/training/operations-archive/components/TrainingOverviewPageView.vue',
    ],
    maintenance: {
      permissions: [
        {
          permission_key: 'training-operations-overview.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看培训概览',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: ['page', 'query', 'overview', 'trends', 'incomplete', 'local'],
        },
      ],
    },
  },
  archives: {
    page_id: 'training-employee-archives',
    authorization_model: 'legacy',
    resource_code: 'IAM.TRAINING.EMPLOYEE_ARCHIVES',
    resource_name: '员工培训档案',
    remarks:
      '用途：查询当前租户员工档案，并读取计划任务、课程结果及考试历史；场景：按员工、组织、岗位、计划等核对真实培训记录，保留独立执行轮次。',
    parent_resource_code: 'IAM.TRAINING',
    resource_type: 'menu',
    route_path: '/iam/training/employee-archives',
    component: 'training/operations-archive/pages/EmployeeTrainingArchivePage',
    buttons: {
      export: {
        resource_code: 'IAM.TRAINING.EMPLOYEE_ARCHIVES.BUTTON.EXPORT',
        permission_code: 'iam:training:employee_archives:button:export',
        resource_name: '导出员工培训档案',
        remarks:
          '用途：按当前服务端筛选导出员工培训档案；场景：离线核对或归档员工培训情况，不以当前页可见行替代完整筛选范围。',
      },
      sensitiveExport: {
        resource_code: 'IAM.TRAINING.EMPLOYEE_ARCHIVES.BUTTON.SENSITIVEEXPORT',
        permission_code: 'iam:training:employee_archives:button:sensitive-export',
        resource_name: '导出档案及考试材料',
        remarks:
          '用途：按选择导出员工档案及考试审计材料，并保留导出范围；场景：授权后的审计取证，涉及敏感考试材料时须明确确认。',
      },
      snapshot: {
        resource_code: 'IAM.TRAINING.EMPLOYEE_ARCHIVES.BUTTON.SNAPSHOT',
        permission_code: 'iam:training:employee_archives:button:snapshot',
        resource_name: '查看历史答题快照',
        remarks:
          '用途：通过 ExamSnapshot 读取指定历史考试的答题与试卷快照；场景：授权后的争议核查，不用当前题库替代历史内容，不修改成绩。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.training.archives.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [
            'POST /iam-admin/TrainingArchive/Archives',
            'POST /iam-admin/TrainingPlan/Query',
            'POST /iam-admin/TrainingTask/Query',
            'POST /iam-admin/Organization/Query',
            'POST /iam-admin/Position/Query',
          ],
        },
      },
      query: {
        resource_element: 'iam.training.archives.query',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/TrainingArchive/Archives'],
          reset: ['POST /iam-admin/TrainingArchive/Archives'],
          refresh: ['POST /iam-admin/TrainingArchive/Archives'],
          paginate: ['POST /iam-admin/TrainingArchive/Archives'],
        },
      },
      detail: {
        resource_element: 'iam.training.archives.detail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/TrainingArchive/ArchiveDetail'],
          retry: ['POST /iam-admin/TrainingArchive/ArchiveDetail'],
        },
      },
      tasks: {
        resource_element: 'iam.training.archives.tasks',
        resource_key: 'page',
        kind: 'detail',
        events: {
          paginate: ['POST /iam-admin/TrainingArchive/EmployeeTasks'],
          retry: ['POST /iam-admin/TrainingArchive/EmployeeTasks'],
        },
      },
      taskDetail: {
        resource_element: 'iam.training.archives.taskDetail',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: [
            'POST /iam-admin/TrainingArchive/CourseResults',
            'POST /iam-admin/TrainingArchive/ExamHistory',
          ],
        },
      },
      courses: {
        resource_element: 'iam.training.archives.courses',
        resource_key: 'page',
        kind: 'detail',
        events: {
          retry: ['POST /iam-admin/TrainingArchive/CourseResults'],
        },
      },
      exams: {
        resource_element: 'iam.training.archives.exams',
        resource_key: 'page',
        kind: 'detail',
        events: {
          retry: ['POST /iam-admin/TrainingArchive/ExamHistory'],
        },
      },
      snapshot: {
        resource_element: 'iam.training.archives.snapshot',
        resource_key: 'snapshot',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/TrainingArchive/ExamSnapshot'],
          retry: ['POST /iam-admin/TrainingArchive/ExamSnapshot'],
        },
      },
      export: {
        resource_element: 'iam.training.archives.export',
        resource_key: 'export',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/TrainingExport/ExportEmployeeArchives'],
        },
      },
      sensitiveExport: {
        resource_element: 'iam.training.archives.sensitiveExport',
        resource_key: 'sensitiveExport',
        kind: 'action',
        events: {
          select: [],
          submit: [
            'POST /iam-admin/TrainingExport/ExportEmployeeArchives',
            'POST /iam-admin/TrainingExport/ExportExamMaterials',
          ],
        },
      },
      local: {
        resource_element: 'iam.training.archives.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
          close: [],
        },
      },
    },
    view_files: [
      'src/features/training/operations-archive/components/EmployeeTrainingArchivePageView.vue',
    ],
    maintenance: {
      permissions: [
        {
          permission_key: 'training-employee-archives.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看员工培训档案',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: [
            'page',
            'query',
            'detail',
            'tasks',
            'taskDetail',
            'courses',
            'exams',
            'local',
          ],
        },
        {
          permission_key: 'training-employee-archives.export',
          parent_permission_key: 'training-employee-archives.view',
          default_selected_with_parent: false,
          permission_name: '导出员工培训档案',
          resource_key: 'export',
          permission_kind: 'business',
          element_keys: ['export'],
        },
        {
          permission_key: 'training-employee-archives.sensitiveExport',
          parent_permission_key: 'training-employee-archives.view',
          default_selected_with_parent: false,
          permission_name: '导出档案及考试材料',
          resource_key: 'sensitiveExport',
          permission_kind: 'business',
          element_keys: ['sensitiveExport'],
        },
        {
          permission_key: 'training-employee-archives.snapshot',
          parent_permission_key: 'training-employee-archives.view',
          default_selected_with_parent: false,
          permission_name: '查看历史答题快照',
          resource_key: 'snapshot',
          permission_kind: 'business',
          element_keys: ['snapshot'],
        },
      ],
    },
  },
  statistics: {
    page_id: 'training-special-statistics',
    authorization_model: 'legacy',
    resource_code: 'IAM.TRAINING.STATISTICS',
    resource_name: '专项统计',
    remarks:
      '用途：按当前租户和筛选查询任务、课程、考试、逾期统计并下钻人员；场景：分析培训完成和异常，执行人次、去重人数及各类比率分别展示。',
    parent_resource_code: 'IAM.TRAINING',
    resource_type: 'menu',
    route_path: '/iam/training/statistics',
    component: 'training/operations-archive/pages/TrainingStatisticsPage',
    buttons: {
      export: {
        resource_code: 'IAM.TRAINING.STATISTICS.BUTTON.EXPORT',
        permission_code: 'iam:training:statistics:button:export',
        resource_name: '导出任务台账',
        remarks:
          '用途：按当前统计筛选通过 ExportTaskLedger 导出任务台账；场景：离线核验培训执行明细，不以页面汇总数字生成替代材料。',
      },
      auditExport: {
        resource_code: 'IAM.TRAINING.STATISTICS.BUTTON.AUDITEXPORT',
        permission_code: 'iam:training:statistics:button:audit-export',
        resource_name: '导出考试审计材料',
        remarks:
          '用途：通过 ExportExamMaterials 导出筛选范围内考试审计材料；场景：授权后的考试核查取证，包含敏感信息，需确认范围。',
      },
    },
    elements: {
      page: {
        resource_element: 'iam.training.statistics.page',
        resource_key: 'page',
        kind: 'page',
        events: {
          mount: [
            'POST /iam-admin/TrainingStatistics/TaskStatistics',
            'POST /iam-admin/TrainingPlan/Query',
            'POST /iam-admin/TrainingTask/Query',
            'POST /iam-admin/Organization/Query',
            'POST /iam-admin/Position/Query',
            'POST /iam-admin/TrainingCourse/Query',
            'POST /iam-admin/TrainingExam/Query',
          ],
        },
      },
      taskQuery: {
        resource_element: 'iam.training.statistics.taskQuery',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/TrainingStatistics/TaskStatistics'],
          reset: ['POST /iam-admin/TrainingStatistics/TaskStatistics'],
          retry: ['POST /iam-admin/TrainingStatistics/TaskStatistics'],
          paginate: ['POST /iam-admin/TrainingStatistics/TaskStatistics'],
          tab: ['POST /iam-admin/TrainingStatistics/TaskStatistics'],
        },
      },
      courseQuery: {
        resource_element: 'iam.training.statistics.courseQuery',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/TrainingStatistics/CourseStatistics'],
          reset: ['POST /iam-admin/TrainingStatistics/CourseStatistics'],
          retry: ['POST /iam-admin/TrainingStatistics/CourseStatistics'],
          paginate: ['POST /iam-admin/TrainingStatistics/CourseStatistics'],
          tab: ['POST /iam-admin/TrainingStatistics/CourseStatistics'],
        },
      },
      examQuery: {
        resource_element: 'iam.training.statistics.examQuery',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/TrainingStatistics/ExamStatistics'],
          reset: ['POST /iam-admin/TrainingStatistics/ExamStatistics'],
          retry: ['POST /iam-admin/TrainingStatistics/ExamStatistics'],
          paginate: ['POST /iam-admin/TrainingStatistics/ExamStatistics'],
          tab: ['POST /iam-admin/TrainingStatistics/ExamStatistics'],
        },
      },
      overdueQuery: {
        resource_element: 'iam.training.statistics.overdueQuery',
        resource_key: 'page',
        kind: 'query',
        events: {
          search: ['POST /iam-admin/TrainingStatistics/OverdueStatistics'],
          reset: ['POST /iam-admin/TrainingStatistics/OverdueStatistics'],
          retry: ['POST /iam-admin/TrainingStatistics/OverdueStatistics'],
          paginate: ['POST /iam-admin/TrainingStatistics/OverdueStatistics'],
          tab: ['POST /iam-admin/TrainingStatistics/OverdueStatistics'],
        },
      },
      resolveTask: {
        resource_element: 'iam.training.statistics.resolveTask',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/TrainingTask/Detail'],
        },
      },
      taskDetail: {
        resource_element: 'iam.training.statistics.taskDetail',
        resource_key: 'page',
        kind: 'navigation',
        events: {
          click: [],
        },
        target_resource_code: 'IAM.TRAINING.PLANS.DETAIL.TASK',
        remarks:
          '用途：读取计划内任务、课程考试统计及员工执行记录，并按人数状态下钻；场景：核对学习与考试完成情况，结果以服务端为准，不在查看时修改进度。',
      },
      personnel: {
        resource_element: 'iam.training.statistics.personnel',
        resource_key: 'page',
        kind: 'detail',
        events: {
          open: ['POST /iam-admin/TrainingTaskEmployee/Query'],
          retry: ['POST /iam-admin/TrainingTaskEmployee/Query'],
          paginate: ['POST /iam-admin/TrainingTaskEmployee/Query'],
        },
      },
      export: {
        resource_element: 'iam.training.statistics.export',
        resource_key: 'export',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/TrainingExport/ExportTaskLedger'],
        },
      },
      auditExport: {
        resource_element: 'iam.training.statistics.auditExport',
        resource_key: 'auditExport',
        kind: 'action',
        events: {
          open: [],
          submit: ['POST /iam-admin/TrainingExport/ExportExamMaterials'],
        },
      },
      local: {
        resource_element: 'iam.training.statistics.local',
        resource_key: 'page',
        kind: 'local',
        events: {
          click: [],
          close: [],
        },
      },
    },
    view_files: [
      'src/features/training/operations-archive/components/TrainingStatisticsPageView.vue',
    ],
    maintenance: {
      permissions: [
        {
          permission_key: 'training-special-statistics.view',
          parent_permission_key: null,
          default_selected_with_parent: false,
          permission_name: '查看专项统计',
          resource_key: 'page',
          permission_kind: 'business',
          element_keys: [
            'page',
            'taskQuery',
            'courseQuery',
            'examQuery',
            'overdueQuery',
            'resolveTask',
            'personnel',
            'local',
          ],
        },
        {
          permission_key: 'training-special-statistics.export',
          parent_permission_key: 'training-special-statistics.view',
          default_selected_with_parent: false,
          permission_name: '导出任务台账',
          resource_key: 'export',
          permission_kind: 'business',
          element_keys: ['export'],
        },
        {
          permission_key: 'training-special-statistics.auditExport',
          parent_permission_key: 'training-special-statistics.view',
          default_selected_with_parent: false,
          permission_name: '导出考试审计材料',
          resource_key: 'auditExport',
          permission_kind: 'business',
          element_keys: ['auditExport'],
        },
      ],
    },
  },
} as const

export const plansElements = bindResourceElements(resourceRegistry.plans)
export const planDetailElements = bindResourceElements(resourceRegistry.planDetail)
export const taskDetailElements = bindResourceElements(resourceRegistry.taskDetail)
export const overviewElements = bindResourceElements(resourceRegistry.overview)
export const archivesElements = bindResourceElements(resourceRegistry.archives)
export const statisticsElements = bindResourceElements(resourceRegistry.statistics)
