#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import Ajv2020 from 'ajv/dist/2020.js'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultOutput = join(projectRoot, 'artifacts', 'iam-resource-catalog.json')
const defaultSchemaCandidates = [
  join(projectRoot, 'standards', 'schemas', 'iam-resource-catalog.schema.json'),
  resolve(
    projectRoot,
    '..',
    'SS.Express.Platform',
    'Doc',
    'Prd',
    'IAM',
    'iam-resource-catalog.schema.json',
  ),
]

const status = 'active'

function functionResource(code, name, permission, sortOrder, apiPath, remarks = '') {
  if (!apiPath) throw new Error(`Function ${code} 必须绑定后端 API`)
  return {
    resource_code: code,
    resource_name: name,
    resource_type: 'function',
    permission_code: permission,
    icon: '',
    http_method: 'POST',
    api_path: apiPath,
    is_visible: false,
    sort_order: sortOrder,
    status,
    remarks,
  }
}

function menuResource({
  approvalRef,
  confirmedEntry = false,
  code,
  name,
  route,
  component,
  permission,
  icon,
  sortOrder,
  remarks = '',
  pages = [],
  functions = [],
}) {
  return {
    approvalRef,
    confirmedEntry,
    resource_code: code,
    resource_name: name,
    resource_type: 'menu',
    route_path: route,
    component,
    permission_code: permission,
    icon,
    is_visible: true,
    sort_order: sortOrder,
    status,
    remarks,
    pages,
    functions,
  }
}

function pageResource({
  approvalRef,
  code,
  name,
  route,
  component,
  permission,
  icon = '',
  sortOrder,
  remarks = '',
  pages = [],
  functions = [],
}) {
  return {
    approvalRef,
    resource_code: code,
    resource_name: name,
    resource_type: 'page',
    route_path: route,
    component,
    permission_code: permission,
    icon,
    is_visible: false,
    sort_order: sortOrder,
    status,
    remarks,
    pages,
    functions,
  }
}

function flattenResources(resources) {
  return resources.flatMap((item) => [
    item,
    ...flattenResources(item.pages ?? []),
    ...(item.functions ?? []),
  ])
}

function moduleDefinition({
  approvalRefs = [],
  code,
  name,
  icon = '',
  sortOrder = 0,
  remarks = '',
  menus = [],
}) {
  return {
    moduleApprovalRefs: approvalRefs,
    resource_code: code,
    resource_name: name,
    resource_type: 'module',
    icon,
    is_visible: false,
    sort_order: sortOrder,
    status,
    remarks,
    menus,
  }
}

const trainingModule = moduleDefinition({
  approvalRefs: [
    'training-operations-overview',
    'training-plan-management',
    'training-plan-detail',
    'training-task-detail',
    'training-employee-archives',
    'training-special-statistics',
  ],
  code: 'IAM.TRAINING',
  name: '培训中心',
  icon: 'mdi:school-outline',
  sortOrder: 100,
  remarks: 'IAM App 下独立培训中心 Module；所有数据由当前 Tenant 上下文隔离。',
  menus: [
    menuResource({
      approvalRef: 'training-operations-overview',
      code: 'IAM.TRAINING.OVERVIEW',
      name: '培训概览',
      route: '/iam/training/overview',
      component: 'training/operations-archive/pages/TrainingOperationsOverviewPage',
      permission: 'iam:training:overview:view',
      icon: 'mdi:view-dashboard-outline',
      sortOrder: 10,
      functions: [
        functionResource(
          'IAM.TRAINING.OVERVIEW.QUERY',
          '查询培训概览',
          'iam:training:overview:view',
          10,
          '/iam-admin/TrainingOverview/Overview',
        ),
        functionResource(
          'IAM.TRAINING.OVERVIEW.TRENDS',
          '查询培训趋势',
          'iam:training:overview:view',
          20,
          '/iam-admin/TrainingOverview/Trends',
        ),
        functionResource(
          'IAM.TRAINING.OVERVIEW.INCOMPLETE',
          '查询未完成人员',
          'iam:training:overview:view',
          30,
          '/iam-admin/TrainingOverview/Incomplete',
        ),
        functionResource(
          'IAM.TRAINING.OVERVIEW.PLAN_OPTIONS',
          '查询培训计划筛选项',
          'iam:training:overview:view',
          40,
          '/iam-admin/TrainingPlan/Query',
        ),
        functionResource(
          'IAM.TRAINING.OVERVIEW.TASK_OPTIONS',
          '查询培训任务筛选项',
          'iam:training:overview:view',
          50,
          '/iam-admin/TrainingTask/Query',
        ),
      ],
    }),
    menuResource({
      approvalRef: 'training-plan-management',
      code: 'IAM.TRAINING.PLANS',
      name: '培训计划',
      route: '/iam/training/plans',
      component: 'training/operations-archive/pages/TrainingPlanManagementPage',
      permission: 'iam:training:plans:view',
      icon: 'mdi:calendar-check-outline',
      sortOrder: 20,
      functions: [
        functionResource(
          'IAM.TRAINING.PLANS.QUERY',
          '查询培训计划',
          'iam:training:plans:view',
          10,
          '/iam-admin/TrainingPlan/Query',
        ),
        functionResource(
          'IAM.TRAINING.PLANS.CREATE',
          '创建培训计划',
          'iam:training:plans:create',
          20,
          '/iam-admin/TrainingPlan/Create',
        ),
        functionResource(
          'IAM.TRAINING.PLANS.UPDATE',
          '编辑培训计划',
          'iam:training:plans:update',
          30,
          '/iam-admin/TrainingPlan/Update',
        ),
        functionResource(
          'IAM.TRAINING.PLANS.PUBLISH',
          '发布培训计划',
          'iam:training:plans:publish',
          40,
          '/iam-admin/TrainingPlan/Publish',
        ),
        functionResource(
          'IAM.TRAINING.PLANS.DELETE',
          '删除培训计划',
          'iam:training:plans:delete',
          50,
          '/iam-admin/TrainingPlan/Delete',
        ),
      ],
      pages: [
        pageResource({
          approvalRef: 'training-plan-detail',
          code: 'IAM.TRAINING.PLANS.DETAIL',
          name: '培训计划详情',
          route: '/iam/training/plans/:planId',
          component: 'training/operations-archive/pages/TrainingPlanDetailPage',
          permission: 'iam:training:plan-detail:view',
          sortOrder: 10,
          functions: [
            functionResource(
              'IAM.TRAINING.PLANS.DETAIL.QUERY',
              '查询培训计划详情',
              'iam:training:plan-detail:view',
              10,
              '/iam-admin/TrainingPlan/Detail',
            ),
            functionResource(
              'IAM.TRAINING.PLANS.DETAIL.EMPLOYEES_QUERY',
              '查询计划员工',
              'iam:training:plans:employees:view',
              20,
              '/iam-admin/TrainingPlanEmployee/Query',
            ),
            functionResource(
              'IAM.TRAINING.PLANS.DETAIL.EMPLOYEE_HISTORY',
              '查询计划员工历史',
              'iam:training:plans:employees:view',
              30,
              '/iam-admin/TrainingPlanEmployee/History',
            ),
            functionResource(
              'IAM.TRAINING.PLANS.DETAIL.EMPLOYEE_OPTIONS',
              '查询当前 Tenant 员工候选',
              'iam:training:plans:employees:view',
              40,
              '/iam-admin/Membership/QueryUsers',
            ),
            functionResource(
              'IAM.TRAINING.PLANS.DETAIL.EMPLOYEES_ADD',
              '批量加入计划员工',
              'iam:training:plans:employees:update',
              50,
              '/iam-admin/TrainingPlanEmployee/BatchAdd',
            ),
            functionResource(
              'IAM.TRAINING.PLANS.DETAIL.EMPLOYEE_EXIT',
              '退出计划员工',
              'iam:training:plans:employees:update',
              60,
              '/iam-admin/TrainingPlanEmployee/Exit',
            ),
            functionResource(
              'IAM.TRAINING.PLANS.DETAIL.EMPLOYEES_EXIT',
              '批量退出计划员工',
              'iam:training:plans:employees:update',
              70,
              '/iam-admin/TrainingPlanEmployee/BatchExit',
            ),
            functionResource(
              'IAM.TRAINING.PLANS.DETAIL.EMPLOYEE_REJOIN',
              '重新加入计划员工',
              'iam:training:plans:employees:update',
              80,
              '/iam-admin/TrainingPlanEmployee/Rejoin',
            ),
            functionResource(
              'IAM.TRAINING.PLANS.DETAIL.TASKS_QUERY',
              '查询计划内任务',
              'iam:training:tasks:view',
              90,
              '/iam-admin/TrainingTask/Query',
            ),
            functionResource(
              'IAM.TRAINING.PLANS.DETAIL.TASK_CREATE',
              '创建培训任务',
              'iam:training:tasks:create',
              100,
              '/iam-admin/TrainingTask/Create',
            ),
          ],
          pages: [
            pageResource({
              approvalRef: 'training-task-detail',
              code: 'IAM.TRAINING.PLANS.DETAIL.TASK',
              name: '培训任务详情',
              route: '/iam/training/plans/:planId/tasks/:taskId',
              component: 'training/operations-archive/pages/TrainingTaskDetailPage',
              permission: 'iam:training:task-detail:view',
              sortOrder: 10,
              functions: [
                functionResource(
                  'IAM.TRAINING.PLANS.DETAIL.TASK.QUERY',
                  '查询培训任务详情',
                  'iam:training:task-detail:view',
                  10,
                  '/iam-admin/TrainingTask/Detail',
                ),
                functionResource(
                  'IAM.TRAINING.PLANS.DETAIL.TASK.UPDATE',
                  '编辑培训任务',
                  'iam:training:tasks:update',
                  20,
                  '/iam-admin/TrainingTask/Update',
                ),
                functionResource(
                  'IAM.TRAINING.PLANS.DETAIL.TASK.DELETE',
                  '删除培训任务',
                  'iam:training:tasks:delete',
                  30,
                  '/iam-admin/TrainingTask/Delete',
                ),
                functionResource(
                  'IAM.TRAINING.PLANS.DETAIL.TASK.START',
                  '启动培训任务',
                  'iam:training:tasks:start',
                  40,
                  '/iam-admin/TrainingTask/Start',
                ),
                functionResource(
                  'IAM.TRAINING.PLANS.DETAIL.TASK.EMPLOYEES',
                  '查询任务员工',
                  'iam:training:tasks:employees',
                  50,
                  '/iam-admin/TrainingTaskEmployee/Query',
                ),
                functionResource(
                  'IAM.TRAINING.PLANS.DETAIL.TASK.COURSE_OPTIONS',
                  '查询课程候选',
                  'iam:training:courses:view',
                  60,
                  '/iam-admin/TrainingCourse/Query',
                ),
                functionResource(
                  'IAM.TRAINING.PLANS.DETAIL.TASK.COURSE_DETAIL',
                  '查看课程详情',
                  'iam:training:courses:view',
                  70,
                  '/iam-admin/TrainingCourse/Detail',
                ),
                functionResource(
                  'IAM.TRAINING.PLANS.DETAIL.TASK.EXAM_OPTIONS',
                  '查询考试候选',
                  'iam:training:exams:view',
                  80,
                  '/iam-admin/TrainingExam/Query',
                ),
                functionResource(
                  'IAM.TRAINING.PLANS.DETAIL.TASK.EXAM_DETAIL',
                  '查看考试详情',
                  'iam:training:exams:view',
                  90,
                  '/iam-admin/TrainingExam/Detail',
                ),
              ],
            }),
          ],
        }),
      ],
    }),
    menuResource({
      approvalRef: 'training-employee-archives',
      code: 'IAM.TRAINING.EMPLOYEE_ARCHIVES',
      name: '员工培训档案',
      route: '/iam/training/employee-archives',
      component: 'training/operations-archive/pages/EmployeeTrainingArchivePage',
      permission: 'iam:training:employee-archives:view',
      icon: 'mdi:account-school-outline',
      sortOrder: 30,
      functions: [
        functionResource(
          'IAM.TRAINING.EMPLOYEE_ARCHIVES.QUERY',
          '查询员工培训档案',
          'iam:training:employee-archives:view',
          10,
          '/iam-admin/TrainingArchive/Archives',
        ),
        functionResource(
          'IAM.TRAINING.EMPLOYEE_ARCHIVES.DETAIL',
          '查询员工档案详情',
          'iam:training:employee-archives:view',
          20,
          '/iam-admin/TrainingArchive/ArchiveDetail',
        ),
        functionResource(
          'IAM.TRAINING.EMPLOYEE_ARCHIVES.TASKS',
          '查询员工历史任务',
          'iam:training:employee-archives:view',
          30,
          '/iam-admin/TrainingArchive/EmployeeTasks',
        ),
        functionResource(
          'IAM.TRAINING.EMPLOYEE_ARCHIVES.COURSES',
          '查询员工课程结果',
          'iam:training:employee-archives:view',
          40,
          '/iam-admin/TrainingArchive/CourseResults',
        ),
        functionResource(
          'IAM.TRAINING.EMPLOYEE_ARCHIVES.EXAMS',
          '查询员工考试历史',
          'iam:training:employee-archives:view',
          50,
          '/iam-admin/TrainingArchive/ExamHistory',
        ),
        functionResource(
          'IAM.TRAINING.EMPLOYEE_ARCHIVES.EXAM_SNAPSHOT',
          '查看考试答题快照',
          'iam:training:employee-archives:audit',
          60,
          '/iam-admin/TrainingArchive/ExamSnapshot',
        ),
        functionResource(
          'IAM.TRAINING.EMPLOYEE_ARCHIVES.EXPORT',
          '导出员工培训档案',
          'iam:training:statistics:export',
          70,
          '/iam-admin/TrainingExport/ExportEmployeeArchives',
        ),
        functionResource(
          'IAM.TRAINING.EMPLOYEE_ARCHIVES.EXPORT_EXAM_MATERIALS',
          '导出考试审计材料',
          'iam:training:statistics:audit-export',
          80,
          '/iam-admin/TrainingExport/ExportExamMaterials',
        ),
        functionResource(
          'IAM.TRAINING.EMPLOYEE_ARCHIVES.PLAN_OPTIONS',
          '查询培训计划筛选项',
          'iam:training:employee-archives:view',
          90,
          '/iam-admin/TrainingPlan/Query',
        ),
        functionResource(
          'IAM.TRAINING.EMPLOYEE_ARCHIVES.TASK_OPTIONS',
          '查询培训任务筛选项',
          'iam:training:employee-archives:view',
          100,
          '/iam-admin/TrainingTask/Query',
        ),
        functionResource(
          'IAM.TRAINING.EMPLOYEE_ARCHIVES.ORGANIZATION_OPTIONS',
          '查询组织筛选项',
          'iam:training:employee-archives:view',
          110,
          '/iam-admin/Organization/Query',
        ),
        functionResource(
          'IAM.TRAINING.EMPLOYEE_ARCHIVES.POSITION_OPTIONS',
          '查询岗位筛选项',
          'iam:training:employee-archives:view',
          120,
          '/iam-admin/Position/Query',
        ),
      ],
    }),
    menuResource({
      approvalRef: 'training-special-statistics',
      code: 'IAM.TRAINING.STATISTICS',
      name: '培训专项统计',
      route: '/iam/training/statistics',
      component: 'training/operations-archive/pages/TrainingStatisticsPage',
      permission: 'iam:training:statistics:view',
      icon: 'mdi:chart-box-outline',
      sortOrder: 40,
      functions: [
        functionResource(
          'IAM.TRAINING.STATISTICS.TASKS',
          '查询任务完成统计',
          'iam:training:statistics:view',
          10,
          '/iam-admin/TrainingStatistics/TaskStatistics',
        ),
        functionResource(
          'IAM.TRAINING.STATISTICS.COURSES',
          '查询课程学习统计',
          'iam:training:statistics:view',
          20,
          '/iam-admin/TrainingStatistics/CourseStatistics',
        ),
        functionResource(
          'IAM.TRAINING.STATISTICS.EXAMS',
          '查询考试结果统计',
          'iam:training:statistics:view',
          30,
          '/iam-admin/TrainingStatistics/ExamStatistics',
        ),
        functionResource(
          'IAM.TRAINING.STATISTICS.OVERDUE',
          '查询培训逾期统计',
          'iam:training:statistics:view',
          40,
          '/iam-admin/TrainingStatistics/OverdueStatistics',
        ),
        functionResource(
          'IAM.TRAINING.STATISTICS.EXPORT_TASK_LEDGER',
          '导出培训任务台账',
          'iam:training:statistics:export',
          50,
          '/iam-admin/TrainingExport/ExportTaskLedger',
        ),
        functionResource(
          'IAM.TRAINING.STATISTICS.EXPORT_EXAM_MATERIALS',
          '导出考试审计材料',
          'iam:training:statistics:audit-export',
          60,
          '/iam-admin/TrainingExport/ExportExamMaterials',
        ),
        functionResource(
          'IAM.TRAINING.STATISTICS.PLAN_OPTIONS',
          '查询培训计划筛选项',
          'iam:training:statistics:view',
          70,
          '/iam-admin/TrainingPlan/Query',
        ),
        functionResource(
          'IAM.TRAINING.STATISTICS.TASK_OPTIONS',
          '查询培训任务筛选项',
          'iam:training:statistics:view',
          80,
          '/iam-admin/TrainingTask/Query',
        ),
        functionResource(
          'IAM.TRAINING.STATISTICS.ORGANIZATION_OPTIONS',
          '查询组织筛选项',
          'iam:training:statistics:view',
          90,
          '/iam-admin/Organization/Query',
        ),
        functionResource(
          'IAM.TRAINING.STATISTICS.POSITION_OPTIONS',
          '查询岗位筛选项',
          'iam:training:statistics:view',
          100,
          '/iam-admin/Position/Query',
        ),
        functionResource(
          'IAM.TRAINING.STATISTICS.COURSE_OPTIONS',
          '查询课程筛选项',
          'iam:training:statistics:view',
          110,
          '/iam-admin/TrainingCourse/Query',
        ),
        functionResource(
          'IAM.TRAINING.STATISTICS.EXAM_OPTIONS',
          '查询考试筛选项',
          'iam:training:statistics:view',
          120,
          '/iam-admin/TrainingExam/Query',
        ),
        functionResource(
          'IAM.TRAINING.STATISTICS.EMPLOYEE_DRILLDOWN',
          '查询统计人员明细',
          'iam:training:statistics:view',
          130,
          '/iam-admin/TrainingTaskEmployee/Query',
        ),
      ],
    }),
  ],
})

const appDefinitions = [
  {
    app_code: 'DMS',
    app_name: 'DMS 物流平台门户',
    description: '统一物流平台框架、Welcome 与运营 Dashboard',
    icon: 'mdi:view-dashboard-outline',
    route_prefix: '/platform',
    status,
    remarks: 'AppShell 与无 Dashboard 权限时的 Welcome 均归属 DMS。',
    moduleApprovalRefs: ['platform-framework-shell'],
    menus: [
      menuResource({
        approvalRef: 'platform-dashboard',
        code: 'DMS.DASHBOARD',
        name: '物流运营总览',
        route: '/platform/dashboard',
        component: 'platform/dashboard/pages/PlatformDashboardPage',
        permission: 'dms:dashboard:view',
        icon: 'mdi:view-dashboard-outline',
        sortOrder: 10,
        remarks: 'DMS 的可见导航入口；Dashboard 自身即为 Menu，不再重复登记同路由 Page。',
        pages: [
          pageResource({
            approvalRef: 'platform-framework-shell',
            code: 'DMS.DASHBOARD.WELCOME',
            name: 'Welcome',
            route: '/platform/welcome',
            component: 'platform/dashboard/pages/PlatformWelcomePage',
            permission: 'dms:welcome:view',
            sortOrder: 10,
            remarks: '无 Dashboard 权限时进入的隐藏兜底页面，不出现在导航菜单。',
          }),
        ],
      }),
    ],
  },
  {
    app_code: 'IAM',
    app_name: 'IAM 身份权限管理',
    description: '组织、租户、用户、角色与权限资源管理',
    icon: 'mdi:shield-account-outline',
    route_prefix: '/iam',
    status,
    remarks: '',
    modules: [trainingModule],
    menus: [
      menuResource({
        confirmedEntry: true,
        code: 'IAM.OVERVIEW',
        name: '身份总览',
        route: '/iam/overview',
        component: 'iam/overview/pages/IamOverviewPage',
        permission: 'iam:overview:view',
        icon: 'mdi:view-dashboard-outline',
        sortOrder: 1,
        remarks: '产品确认的 IAM 默认入口；当前仅展示本地概览，不登记虚构统计 Function。',
      }),
      menuResource({
        approvalRef: 'iam-group-profile',
        code: 'IAM.GROUP',
        name: '集团信息',
        route: '/iam/group',
        component: 'iam/foundation/pages/GroupProfilePage',
        permission: 'iam:group:view',
        icon: 'mdi:domain',
        sortOrder: 10,
        functions: [
          functionResource(
            'IAM.GROUP.VIEW',
            '查看集团信息',
            'iam:group:view',
            10,
            '/iam-admin/Group/Info',
          ),
          functionResource(
            'IAM.GROUP.UPDATE',
            '编辑集团信息',
            'iam:group:update',
            20,
            '/iam-admin/Group/Update',
          ),
        ],
      }),
      menuResource({
        approvalRef: 'iam-tenant-management',
        code: 'IAM.TENANTS',
        name: 'Tenant 管理',
        route: '/iam/tenants',
        component: 'iam/foundation/pages/TenantManagementPage',
        permission: 'iam:tenants:view',
        icon: 'mdi:office-building-cog-outline',
        sortOrder: 20,
        functions: [
          functionResource(
            'IAM.TENANTS.QUERY',
            '查询 Tenant',
            'iam:tenants:view',
            10,
            '/iam-admin/Tenant/Query',
          ),
          functionResource(
            'IAM.TENANTS.CREATE',
            '创建 Tenant',
            'iam:tenants:create',
            20,
            '/iam-admin/Tenant/Create',
          ),
          functionResource(
            'IAM.TENANTS.UPDATE',
            '编辑 Tenant',
            'iam:tenants:update',
            30,
            '/iam-admin/Tenant/Update',
          ),
          functionResource(
            'IAM.TENANTS.CHANGE_STATUS',
            '变更 Tenant 状态',
            'iam:tenants:change-status',
            40,
            '/iam-admin/Tenant/ChangeStatus',
          ),
        ],
      }),
      menuResource({
        approvalRef: 'iam-organization-management',
        code: 'IAM.ORGANIZATIONS',
        name: '组织管理',
        route: '/iam/organizations',
        component: 'iam/foundation/pages/OrganizationManagementPage',
        permission: 'iam:organizations:view',
        icon: 'mdi:file-tree-outline',
        sortOrder: 30,
        functions: [
          functionResource(
            'IAM.ORGANIZATIONS.QUERY',
            '查询组织',
            'iam:organizations:view',
            10,
            '/iam-admin/Organization/Query',
          ),
          functionResource(
            'IAM.ORGANIZATIONS.QUERY_LEADER_CANDIDATES',
            '查询当前租户负责人候选',
            'iam:organizations:view',
            15,
            '/iam-admin/Organization/QueryLeaderCandidates',
          ),
          functionResource(
            'IAM.ORGANIZATIONS.CREATE',
            '创建组织',
            'iam:organizations:create',
            20,
            '/iam-admin/Organization/Create',
          ),
          functionResource(
            'IAM.ORGANIZATIONS.UPDATE',
            '编辑组织',
            'iam:organizations:update',
            30,
            '/iam-admin/Organization/Update',
          ),
          functionResource(
            'IAM.ORGANIZATIONS.MOVE',
            '移动组织',
            'iam:organizations:move',
            40,
            '/iam-admin/Organization/Move',
          ),
          functionResource(
            'IAM.ORGANIZATIONS.CHANGE_STATUS',
            '变更组织状态',
            'iam:organizations:change-status',
            50,
            '/iam-admin/Organization/ChangeStatus',
          ),
        ],
      }),
      menuResource({
        approvalRef: 'iam-position-management',
        code: 'IAM.POSITIONS',
        name: '岗位管理',
        route: '/iam/positions',
        component: 'iam/foundation/pages/PositionManagementPage',
        permission: 'iam:positions:view',
        icon: 'mdi:badge-account-horizontal-outline',
        sortOrder: 40,
        functions: [
          functionResource(
            'IAM.POSITIONS.QUERY',
            '查询岗位',
            'iam:positions:view',
            10,
            '/iam-admin/Position/Query',
          ),
          functionResource(
            'IAM.POSITIONS.CREATE',
            '创建岗位',
            'iam:positions:create',
            20,
            '/iam-admin/Position/Create',
          ),
          functionResource(
            'IAM.POSITIONS.UPDATE',
            '编辑岗位',
            'iam:positions:update',
            30,
            '/iam-admin/Position/Update',
          ),
          functionResource(
            'IAM.POSITIONS.CHANGE_STATUS',
            '变更岗位状态',
            'iam:positions:change-status',
            40,
            '/iam-admin/Position/ChangeStatus',
          ),
        ],
      }),
      menuResource({
        approvalRef: 'iam-membership-management',
        code: 'IAM.MEMBERS',
        name: '用户与成员',
        route: '/iam/members',
        component: 'iam/foundation/pages/MembershipManagementPage',
        permission: 'iam:members:view',
        icon: 'mdi:account-multiple-outline',
        sortOrder: 50,
        pages: [
          pageResource({
            approvalRef: 'iam-membership-management',
            code: 'IAM.MEMBERS.PERMISSIONS',
            name: '用户角色与权限',
            route: '/iam/members/permissions',
            component: 'iam/access-control/pages/MemberPermissionPage',
            permission: 'iam:members:permissions',
            icon: 'mdi:account-key-outline',
            sortOrder: 10,
            functions: [
              functionResource(
                'IAM.MEMBERS.PERMISSIONS.QUERY_USER_TENANTS',
                '查询用户 Tenant 关系',
                'iam:members:permissions:view',
                10,
                '/iam-admin/Membership/QueryUserTenants',
              ),
              functionResource(
                'IAM.MEMBERS.PERMISSIONS.QUERY_ROLES',
                '查询可分配角色',
                'iam:members:permissions:view',
                20,
                '/iam-admin/RolePermission/QueryRoles',
              ),
              functionResource(
                'IAM.MEMBERS.PERMISSIONS.QUERY_ASSIGNMENTS',
                '查询用户当前 Tenant 角色',
                'iam:members:permissions:view',
                30,
                '/iam-admin/MemberRole/Query',
              ),
              functionResource(
                'IAM.MEMBERS.PERMISSIONS.QUERY_FUNCTIONS',
                '查询当前 Tenant 成员功能权限',
                'iam:members:permissions:view',
                40,
                '/iam-admin/Permission/QueryMemberFunctionPermissions',
              ),
              functionResource(
                'IAM.MEMBERS.PERMISSIONS.ASSIGN_ROLE',
                '为用户分配角色',
                'iam:members:permissions:assign-role',
                50,
                '/iam-admin/MemberRole/Assign',
              ),
              functionResource(
                'IAM.MEMBERS.PERMISSIONS.REVOKE_ROLE',
                '移除用户角色',
                'iam:members:permissions:revoke-role',
                60,
                '/iam-admin/MemberRole/Revoke',
              ),
            ],
          }),
        ],
        functions: [
          functionResource(
            'IAM.MEMBERS.QUERY_USERS',
            '查询用户及 Tenant 成员',
            'iam:members:view',
            10,
            '/iam-admin/Membership/QueryUsers',
            '请求体使用 tenant_ids:int64[]；默认传入会话全部可用 Tenant，空数组由后端校验。',
          ),
          functionResource(
            'IAM.MEMBERS.QUERY_FILTER_OPTIONS',
            '查询租户范围组织岗位角色候选',
            'iam:members:view',
            20,
            '/iam-admin/Membership/QueryFilterOptions',
          ),
          functionResource(
            'IAM.MEMBERS.QUERY_ORGANIZATION_OPTIONS',
            '查询组织归属选项',
            'iam:members:view',
            40,
            '/iam-admin/Organization/Query',
          ),
          functionResource(
            'IAM.MEMBERS.QUERY_POSITION_OPTIONS',
            '查询岗位归属选项',
            'iam:members:view',
            50,
            '/iam-admin/Position/Query',
          ),
          functionResource(
            'IAM.MEMBERS.CREATE',
            '创建 Tenant 成员',
            'iam:members:create',
            60,
            '/iam-admin/Membership/CreateMember',
          ),
          functionResource(
            'IAM.MEMBERS.UPDATE',
            '编辑 Tenant 成员',
            'iam:members:update',
            70,
            '/iam-admin/Membership/UpdateMember',
          ),
          functionResource(
            'IAM.MEMBERS.UPDATE_USER',
            '编辑用户',
            'iam:members:update-user',
            80,
            '/iam-admin/Membership/UpdateUser',
          ),
          functionResource(
            'IAM.MEMBERS.CHANGE_STATUS',
            '变更成员状态',
            'iam:members:change-status',
            90,
            '/iam-admin/Membership/ChangeMemberStatus',
          ),
          functionResource(
            'IAM.MEMBERS.CHANGE_USER_STATUS',
            '变更用户状态',
            'iam:members:change-user-status',
            100,
            '/iam-admin/Membership/ChangeUserStatus',
          ),
          functionResource(
            'IAM.MEMBERS.UPDATE_USER_TENANTS',
            '调整用户 Tenant 归属',
            'iam:members:update-user-tenants',
            102,
            '/iam-admin/Membership/UpdateUserTenants',
            '仅 SA；统一调整用户所属 Tenant 及各 Tenant 管理员身份。',
          ),
          functionResource(
            'IAM.MEMBERS.QUERY_ORGANIZATIONS',
            '查询成员组织归属',
            'iam:members:organizations:view',
            105,
            '/iam-admin/Membership/QueryOrganizations',
            '查询成员当前及历史组织归属。',
          ),
          functionResource(
            'IAM.MEMBERS.SAVE_ORGANIZATION',
            '维护成员组织归属',
            'iam:members:save-organization',
            110,
            '/iam-admin/Membership/SaveOrganization',
          ),
          functionResource(
            'IAM.MEMBERS.END_ORGANIZATION',
            '结束成员组织归属',
            'iam:members:end-organization',
            115,
            '/iam-admin/Membership/EndOrganization',
            '结束当前有效的成员组织归属。',
          ),
          functionResource(
            'IAM.MEMBERS.QUERY_POSITIONS',
            '查询成员岗位归属',
            'iam:members:positions:view',
            120,
            '/iam-admin/Membership/QueryPositions',
            '查询成员当前及历史岗位归属。',
          ),
          functionResource(
            'IAM.MEMBERS.SAVE_POSITION',
            '维护成员岗位归属',
            'iam:members:save-position',
            130,
            '/iam-admin/Membership/SavePosition',
          ),
          functionResource(
            'IAM.MEMBERS.END_POSITION',
            '结束成员岗位归属',
            'iam:members:end-position',
            140,
            '/iam-admin/Membership/EndPosition',
            '结束当前有效的成员岗位归属。',
          ),
        ],
      }),
      menuResource({
        approvalRef: 'iam-role-management',
        code: 'IAM.ROLES',
        name: '角色管理',
        route: '/iam/roles',
        component: 'iam/access-control/pages/RoleManagementPage',
        permission: 'iam:roles:view',
        icon: 'mdi:shield-account-outline',
        sortOrder: 60,
        pages: [
          pageResource({
            approvalRef: 'iam-role-function-permissions',
            code: 'IAM.ROLES.FUNCTION_PERMISSIONS',
            name: '角色功能权限',
            route: '/iam/roles/function-permissions',
            component: 'iam/access-control/pages/RoleFunctionPermissionPage',
            permission: 'iam:roles:function-permissions',
            icon: 'mdi:shield-key-outline',
            sortOrder: 10,
            functions: [
              functionResource(
                'IAM.ROLES.FUNCTION_PERMISSIONS.QUERY_ROLE',
                '查询当前角色',
                'iam:roles:function-permissions:view',
                10,
                '/iam-admin/RolePermission/QueryRoles',
              ),
              functionResource(
                'IAM.ROLES.FUNCTION_PERMISSIONS.QUERY_SYSTEMS',
                '查询授权系统',
                'iam:roles:function-permissions:view',
                20,
                '/iam-admin/AuthorizationCatalog/QuerySystems',
              ),
              functionResource(
                'IAM.ROLES.FUNCTION_PERMISSIONS.QUERY',
                '查询功能权限',
                'iam:roles:function-permissions:view',
                30,
                '/iam-admin/RolePermission/QueryFunctionPermissions',
              ),
              functionResource(
                'IAM.ROLES.FUNCTION_PERMISSIONS.SAVE',
                '保存功能权限',
                'iam:roles:function-permissions:update',
                40,
                '/iam-admin/RolePermission/SaveFunctionPermissions',
              ),
            ],
          }),
          pageResource({
            approvalRef: 'iam-role-data-permissions',
            code: 'IAM.ROLES.DATA_PERMISSIONS',
            name: '角色数据权限',
            route: '/iam/roles/data-permissions',
            component: 'iam/access-control/pages/RoleDataPermissionPage',
            permission: 'iam:roles:data-permissions',
            icon: 'mdi:database-lock-outline',
            sortOrder: 20,
            functions: [
              functionResource(
                'IAM.ROLES.DATA_PERMISSIONS.QUERY_ROLE',
                '查询当前角色',
                'iam:role-data-permissions:view',
                10,
                '/iam-admin/RolePermission/QueryRoles',
              ),
              functionResource(
                'IAM.ROLES.DATA_PERMISSIONS.QUERY_SYSTEMS',
                '查询授权系统',
                'iam:role-data-permissions:view',
                20,
                '/iam-admin/AuthorizationCatalog/QuerySystems',
              ),
              functionResource(
                'IAM.ROLES.DATA_PERMISSIONS.QUERY_DOMAINS',
                '查询数据域',
                'iam:role-data-permissions:view',
                30,
                '/iam-admin/RolePermission/QueryDataDomains',
              ),
              functionResource(
                'IAM.ROLES.DATA_PERMISSIONS.QUERY',
                '查询数据权限',
                'iam:role-data-permissions:view',
                40,
                '/iam-admin/RolePermission/QueryDataPermissions',
              ),
              functionResource(
                'IAM.ROLES.DATA_PERMISSIONS.QUERY_TENANT_OPTIONS',
                '查询 Tenant 数据范围选项',
                'iam:role-data-permissions:view',
                50,
                '/iam-admin/Tenant/Query',
              ),
              functionResource(
                'IAM.ROLES.DATA_PERMISSIONS.SAVE',
                '保存数据权限',
                'iam:role-data-permissions:update',
                60,
                '/iam-admin/RolePermission/SaveDataPermission',
              ),
            ],
          }),
          pageResource({
            approvalRef: 'iam-role-assignments',
            code: 'IAM.ROLES.ASSIGNMENTS',
            name: '角色成员',
            route: '/iam/roles/assignments',
            component: 'iam/access-control/pages/RoleAssignmentPage',
            permission: 'iam:roles:assignments',
            icon: 'mdi:account-key-outline',
            sortOrder: 30,
            functions: [
              functionResource(
                'IAM.ROLES.ASSIGNMENTS.QUERY_TENANT_OPTIONS',
                '查询 Tenant 选项',
                'iam:role-assignments:view',
                10,
                '/iam-admin/Tenant/Query',
              ),
              functionResource(
                'IAM.ROLES.ASSIGNMENTS.QUERY_MEMBER_OPTIONS',
                '通过 QueryUsers 查询成员选项',
                'iam:role-assignments:view',
                20,
                '/iam-admin/Membership/QueryUsers',
                '请求体使用 tenant_ids:int64[]；角色分配场景传入当前 Tenant 单元素数组。',
              ),
              functionResource(
                'IAM.ROLES.ASSIGNMENTS.QUERY_ROLE_OPTIONS',
                '查询角色选项',
                'iam:role-assignments:view',
                30,
                '/iam-admin/RolePermission/QueryRoles',
              ),
              functionResource(
                'IAM.ROLES.ASSIGNMENTS.QUERY',
                '查询角色分配',
                'iam:role-assignments:view',
                40,
                '/iam-admin/MemberRole/Query',
              ),
              functionResource(
                'IAM.ROLES.ASSIGNMENTS.ASSIGN',
                '分配角色',
                'iam:role-assignments:assign',
                50,
                '/iam-admin/MemberRole/Assign',
              ),
              functionResource(
                'IAM.ROLES.ASSIGNMENTS.REVOKE',
                '撤销角色',
                'iam:role-assignments:revoke',
                60,
                '/iam-admin/MemberRole/Revoke',
              ),
            ],
          }),
        ],
        functions: [
          functionResource(
            'IAM.ROLES.QUERY',
            '查询角色',
            'iam:roles:view',
            10,
            '/iam-admin/RolePermission/QueryRoles',
          ),
          functionResource(
            'IAM.ROLES.QUERY_TENANT_OPTIONS',
            '查询 Tenant 筛选项',
            'iam:roles:view',
            20,
            '/iam-admin/Tenant/Query',
          ),
          functionResource(
            'IAM.ROLES.CREATE',
            '创建角色',
            'iam:roles:create',
            30,
            '/iam-admin/RolePermission/CreateRole',
          ),
          functionResource(
            'IAM.ROLES.UPDATE',
            '编辑角色',
            'iam:roles:update',
            40,
            '/iam-admin/RolePermission/UpdateRole',
          ),
          functionResource(
            'IAM.ROLES.CHANGE_STATUS',
            '变更角色状态',
            'iam:roles:change-status',
            50,
            '/iam-admin/RolePermission/ChangeRoleStatus',
          ),
        ],
      }),
      menuResource({
        approvalRef: 'iam-application-resources',
        code: 'IAM.APPLICATION_RESOURCES',
        name: '应用与权限资源',
        route: '/iam/application-resources',
        component: 'iam/application-resources/pages/ApplicationResourcesPage',
        permission: 'iam:application-resources:view',
        icon: 'mdi:layers-triple-outline',
        sortOrder: 70,
        remarks: '仅集团超级管理员可见',
        functions: [
          functionResource(
            'IAM.APPLICATION_RESOURCES.VIEW',
            '查看应用与权限资源',
            'iam:application-resources:view',
            10,
            '/iam-admin/Permission/SystemResources',
          ),
          functionResource(
            'IAM.APPLICATION_RESOURCES.CREATE_APP',
            '创建 App',
            'iam:application-resources:create',
            20,
            '/iam-admin/AuthorizationCatalog/CreateSystem',
          ),
          functionResource(
            'IAM.APPLICATION_RESOURCES.UPDATE_APP',
            '编辑 App',
            'iam:application-resources:update',
            30,
            '/iam-admin/AuthorizationCatalog/UpdateSystem',
          ),
          functionResource(
            'IAM.APPLICATION_RESOURCES.CHANGE_APP_STATUS',
            '变更 App 状态',
            'iam:application-resources:change-status',
            40,
            '/iam-admin/AuthorizationCatalog/ChangeSystemStatus',
          ),
          functionResource(
            'IAM.APPLICATION_RESOURCES.DELETE_APP',
            '删除 App',
            'iam:application-resources:delete',
            50,
            '/iam-admin/AuthorizationCatalog/DeleteSystem',
          ),
          functionResource(
            'IAM.APPLICATION_RESOURCES.CREATE_RESOURCE',
            '创建权限资源',
            'iam:application-resources:create',
            60,
            '/iam-admin/AuthorizationCatalog/CreateResource',
          ),
          functionResource(
            'IAM.APPLICATION_RESOURCES.UPDATE_RESOURCE',
            '编辑权限资源',
            'iam:application-resources:update',
            70,
            '/iam-admin/AuthorizationCatalog/UpdateResource',
          ),
          functionResource(
            'IAM.APPLICATION_RESOURCES.CHANGE_RESOURCE_STATUS',
            '变更权限资源状态',
            'iam:application-resources:change-status',
            80,
            '/iam-admin/AuthorizationCatalog/ChangeResourceStatus',
          ),
          functionResource(
            'IAM.APPLICATION_RESOURCES.DELETE_RESOURCE',
            '删除权限资源',
            'iam:application-resources:delete',
            90,
            '/iam-admin/AuthorizationCatalog/DeleteResource',
          ),
        ],
      }),
    ],
  },
  {
    app_code: 'TMS',
    app_name: 'TMS 运输管理',
    description: '运输订单、调度与在途任务管理',
    icon: 'mdi:truck-delivery-outline',
    route_prefix: '/tms',
    status,
    remarks: '',
    menus: [
      menuResource({
        confirmedEntry: true,
        code: 'TMS.OVERVIEW',
        name: '运输总览',
        route: '/tms/overview',
        component: 'tms/overview/pages/TmsOverviewPage',
        permission: 'tms:overview:view',
        icon: 'mdi:view-dashboard-outline',
        sortOrder: 1,
        remarks: '产品确认的 TMS 默认入口；当前仅展示本地概览，不登记虚构统计 Function。',
      }),
    ],
  },
  {
    app_code: 'VMS',
    app_name: 'VMS 车辆管理',
    description: '车辆档案与车务管理',
    icon: 'mdi:car-cog',
    route_prefix: '/vms',
    status,
    remarks: '',
    menus: [
      menuResource({
        confirmedEntry: true,
        code: 'VMS.OVERVIEW',
        name: '车辆管理总览',
        route: '/vms/overview',
        component: 'vms/overview/pages/VmsOverviewPage',
        permission: 'vms:overview:view',
        icon: 'mdi:view-dashboard-outline',
        sortOrder: 1,
        remarks: '产品确认的 VMS 默认入口；当前仅展示本地概览，不登记虚构统计 Function。',
      }),
    ],
  },
]

const excludedApprovedPages = new Map([
  ['iam-login', '公开认证页面，不写入权限资源目录'],
  ['iam-password-recovery', '公开认证页面，不写入权限资源目录'],
  ['iam-tenant-context', '登录态 Tenant 选择流程，不作为业务导航资源'],
  // 已批准设计尚无生产路由、业务 API 与权限编码；补齐后迁入 appDefinitions。
  [
    'training-course-management',
    '课程管理设计已批准；待培训 API、权限编码及生产路由，暂不导出初始化资源',
  ],
  [
    'training-question-bank',
    '题库管理设计已批准；待培训 API、权限编码及生产路由，暂不导出初始化资源',
  ],
  [
    'training-paper-management',
    '试卷管理设计已批准；待培训 API、权限编码及生产路由，暂不导出初始化资源',
  ],
  [
    'training-exam-configuration',
    '考试配置设计已批准；待培训 API、权限编码及生产路由，暂不导出初始化资源',
  ],
])

function parseArguments(argv) {
  const options = { check: false, output: defaultOutput, schema: undefined }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--check') options.check = true
    else if (argument === '--output') options.output = resolve(projectRoot, argv[++index] ?? '')
    else if (argument === '--schema') options.schema = resolve(projectRoot, argv[++index] ?? '')
    else if (argument === '--help') {
      console.log(
        '用法: pnpm resource-catalog:generate -- [--output <path>] [--schema <path>] [--check]',
      )
      process.exit(0)
    } else throw new Error(`未知参数: ${argument}`)
  }
  return options
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function collectApprovedPages() {
  const approved = new Set()
  const approvalsDir = join(projectRoot, 'UIDesign', 'approvals')
  for (const file of readdirSync(approvalsDir).filter((name) => name.endsWith('.json'))) {
    const record = readJson(join(approvalsDir, file))
    if (record.status === 'approved') approved.add(record.pageId)
  }

  const legacy = readJson(join(projectRoot, 'UIDesign', 'approved-prototypes.json'))
  for (const prototype of legacy.prototypes ?? []) {
    if (prototype.status === 'approved') approved.add(prototype.id)
  }
  return approved
}

function buildCatalog(approvedPages, generatedAt = new Date().toISOString()) {
  const consumed = new Set()

  const buildApprovedPage = (page) => {
    if (page.approvalRef && !approvedPages.has(page.approvalRef)) return []
    if (page.approvalRef) consumed.add(page.approvalRef)
    const resource = { ...page }
    const pages = resource.pages ?? []
    delete resource.approvalRef
    return [
      {
        ...resource,
        pages: pages.flatMap(buildApprovedPage),
      },
    ]
  }

  const apps = appDefinitions.flatMap((app) => {
    const configuredModules = [
      moduleDefinition({
        approvalRefs: app.moduleApprovalRefs ?? [],
        code: app.app_code,
        name: app.app_name,
        sortOrder: 0,
        remarks:
          app.app_code === 'DMS'
            ? '默认 Module；承载统一 AppShell、Welcome 与 Dashboard。'
            : '默认 Module',
        menus: app.menus ?? [],
      }),
      ...(app.modules ?? []),
    ]
    const modules = configuredModules.flatMap((module) => {
      const moduleApproved = (module.moduleApprovalRefs ?? []).some((pageId) =>
        approvedPages.has(pageId),
      )
      for (const pageId of module.moduleApprovalRefs ?? []) {
        if (approvedPages.has(pageId)) consumed.add(pageId)
      }
      const menus = module.menus.flatMap((menu) => {
        if (menu.approvalRef && !approvedPages.has(menu.approvalRef)) return []
        if (!menu.approvalRef && !menu.confirmedEntry) return []
        if (menu.approvalRef) consumed.add(menu.approvalRef)
        const resource = { ...menu }
        const pages = resource.pages ?? []
        delete resource.approvalRef
        delete resource.confirmedEntry
        return [{ ...resource, pages: pages.flatMap(buildApprovedPage) }]
      })
      if (!moduleApproved && menus.length === 0) return []
      const fields = { ...module }
      delete fields.moduleApprovalRefs
      delete fields.menus
      return [{ ...fields, menus }]
    })

    if (modules.length === 0) return []
    const appFields = { ...app }
    delete appFields.moduleApprovalRefs
    delete appFields.menus
    delete appFields.modules
    return [
      {
        ...appFields,
        modules,
      },
    ]
  })

  for (const pageId of excludedApprovedPages.keys()) {
    if (approvedPages.has(pageId)) consumed.add(pageId)
  }
  const unhandled = [...approvedPages].filter((pageId) => !consumed.has(pageId)).sort()
  if (unhandled.length) {
    throw new Error(`存在未登记处理方式的 approved 页面: ${unhandled.join(', ')}`)
  }

  return { schema_version: '2.0', generated_at: generatedAt, apps }
}

function validateBusinessRules(catalog) {
  const errors = []
  const resourceCodes = new Set()
  const routePaths = new Set()

  for (const app of catalog.apps) {
    const defaultModule = app.modules.find(
      (module) => module.resource_code === app.app_code && module.resource_name === app.app_name,
    )
    if (!defaultModule) errors.push(`${app.app_code} 缺少同编码、同名称的默认 Module`)

    for (const module of app.modules) {
      const resources = [
        module,
        ...module.menus.flatMap((menu) => [
          menu,
          ...flattenResources([...(menu.pages ?? []), ...(menu.functions ?? [])]),
        ]),
      ]
      for (const resource of resources) {
        const code = resource.resource_code.toUpperCase()
        if (!code.startsWith(app.app_code)) errors.push(`${code} 未以 ${app.app_code} 开头`)
        if (resourceCodes.has(code)) errors.push(`resource_code 重复: ${code}`)
        resourceCodes.add(code)
      }
      for (const resource of resources) {
        if (resource.resource_type === 'menu' || resource.resource_type === 'page') {
          if (routePaths.has(resource.route_path))
            errors.push(`route_path 重复: ${resource.route_path}`)
          routePaths.add(resource.route_path)
          if (resource.resource_type === 'menu' && resource.is_visible !== true) {
            errors.push(`Menu 必须是可见导航入口: ${resource.resource_code}`)
          }
          if (resource.resource_type === 'page' && resource.is_visible !== false) {
            errors.push(`Page 必须是隐藏业务路由: ${resource.resource_code}`)
          }
        }
        if (resource.resource_type !== 'menu' && resource.resource_type !== 'page') continue
        const componentFile = join(projectRoot, 'src', 'features', `${resource.component}.vue`)
        if (!existsSync(componentFile)) {
          errors.push(`组件不存在: ${relative(projectRoot, componentFile)}`)
        }
      }
    }
  }
  if (errors.length) throw new Error(`资源目录业务规则校验失败:\n- ${errors.join('\n- ')}`)
}

function validateSchema(catalog, schemaPath) {
  const schema = readJson(schemaPath)
  const ajv = new Ajv2020({ allErrors: true, strict: false })
  ajv.addFormat('date-time', (value) => !Number.isNaN(Date.parse(value)))
  const validate = ajv.compile(schema)
  if (validate(catalog)) return
  const details = (validate.errors ?? [])
    .map((error) => `${error.instancePath || '/'} ${error.message}`)
    .join('\n- ')
  throw new Error(`JSON Schema 校验失败:\n- ${details}`)
}

function comparableCatalog(catalog) {
  const clone = JSON.parse(JSON.stringify(catalog))
  delete clone.generated_at
  return clone
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function main() {
  const options = parseArguments(process.argv.slice(2))
  const schemaPath =
    options.schema ?? defaultSchemaCandidates.find((candidate) => existsSync(candidate))
  if (!schemaPath) {
    throw new Error('找不到资源目录 Schema；请使用 --schema <path> 指定。')
  }

  const approvedPages = collectApprovedPages()
  const existing = existsSync(options.output) ? readJson(options.output) : undefined
  const catalog = buildCatalog(
    approvedPages,
    options.check && existing?.generated_at ? existing.generated_at : undefined,
  )
  validateSchema(catalog, schemaPath)
  validateBusinessRules(catalog)

  if (options.check) {
    if (!existing) throw new Error(`资源目录不存在: ${relative(projectRoot, options.output)}`)
    validateSchema(existing, schemaPath)
    validateBusinessRules(existing)
    if (digest(comparableCatalog(existing)) !== digest(comparableCatalog(catalog))) {
      throw new Error('资源目录已过期，请运行 pnpm resource-catalog:generate')
    }
    console.log(`资源目录校验通过: ${relative(projectRoot, options.output)}`)
    return
  }

  mkdirSync(dirname(options.output), { recursive: true })
  writeFileSync(options.output, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
  const menuCount = catalog.apps.flatMap((app) =>
    app.modules.flatMap((module) => module.menus),
  ).length
  const functionCount = catalog.apps.flatMap((app) =>
    app.modules.flatMap((module) =>
      module.menus.flatMap((menu) =>
        flattenResources([...(menu.pages ?? []), ...(menu.functions ?? [])]).filter(
          (resource) => resource.resource_type === 'function',
        ),
      ),
    ),
  ).length
  const pageCount = catalog.apps.flatMap((app) =>
    app.modules.flatMap((module) =>
      module.menus.flatMap((menu) =>
        flattenResources(menu.pages ?? []).filter((resource) => resource.resource_type === 'page'),
      ),
    ),
  ).length
  const excluded = [...excludedApprovedPages]
    .filter(([pageId]) => approvedPages.has(pageId))
    .map(([pageId, reason]) => `${pageId}（${reason}）`)
  console.log(
    `已生成 ${relative(projectRoot, options.output)}：${catalog.apps.length} Apps / ${menuCount} Menus / ${pageCount} Pages / ${functionCount} Functions`,
  )
  if (excluded.length) console.log(`未导出: ${excluded.join('；')}`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
