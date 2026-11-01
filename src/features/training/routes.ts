import type { RouteRecordRaw } from 'vue-router'
import { resourceRegistry as contentResources } from './content-exam/iam-resource.registry'
import { resourceRegistry as operationsResources } from './operations-archive/iam-resource.registry'

import { TRAINING_PERMISSIONS } from './operations-archive/trainingPermissions'
import { CONTENT_PERMISSIONS } from './content-exam/trainingContentPermissions'

export const trainingRoutes: RouteRecordRaw[] = [
  {
    path: 'iam/training/courses',
    name: 'training-course-management',
    component: () => import('./content-exam/pages/CourseManagementPage.vue'),
    meta: {
      title: '课程管理',
      resourceCode: contentResources.courses.resource_code,
      resource_element: contentResources.courses.elements.page.resource_element,
      subsystem: 'iam',
      permission: CONTENT_PERMISSIONS.courses.view,
      breadcrumb: ['培训中心', '课程管理'],
    },
  },
  {
    path: 'iam/training/questions',
    name: 'training-question-bank',
    component: () => import('./content-exam/pages/QuestionBankPage.vue'),
    meta: {
      title: '题库管理',
      resourceCode: contentResources.questions.resource_code,
      resource_element: contentResources.questions.elements.page.resource_element,
      subsystem: 'iam',
      permission: CONTENT_PERMISSIONS.questions.view,
      breadcrumb: ['培训中心', '题库管理'],
    },
  },
  {
    path: 'iam/training/papers',
    name: 'training-paper-management',
    component: () => import('./content-exam/pages/PaperManagementPage.vue'),
    meta: {
      title: '试卷管理',
      resourceCode: contentResources.papers.resource_code,
      resource_element: contentResources.papers.elements.page.resource_element,
      subsystem: 'iam',
      permission: CONTENT_PERMISSIONS.papers.view,
      breadcrumb: ['培训中心', '试卷管理'],
    },
  },
  {
    path: 'iam/training/exams',
    name: 'training-exam-configuration',
    component: () => import('./content-exam/pages/ExamConfigurationPage.vue'),
    meta: {
      title: '考试配置管理',
      resourceCode: contentResources.exams.resource_code,
      resource_element: contentResources.exams.elements.page.resource_element,
      subsystem: 'iam',
      permission: CONTENT_PERMISSIONS.exams.view,
      breadcrumb: ['培训中心', '考试配置管理'],
    },
  },
  {
    path: 'iam/training/overview',
    name: 'training-operations-overview',
    component: () => import('./operations-archive/pages/TrainingOperationsOverviewPage.vue'),
    meta: {
      title: '培训概览',
      resourceCode: operationsResources.overview.resource_code,
      resource_element: operationsResources.overview.elements.page.resource_element,
      subsystem: 'iam',
      permission: TRAINING_PERMISSIONS.overview.view,
      breadcrumb: ['培训中心', '培训概览'],
    },
  },
  {
    path: 'iam/training/plans',
    name: 'training-plan-management',
    component: () => import('./operations-archive/pages/TrainingPlanManagementPage.vue'),
    meta: {
      title: '培训计划',
      resourceCode: operationsResources.plans.resource_code,
      resource_element: operationsResources.plans.elements.page.resource_element,
      subsystem: 'iam',
      permission: TRAINING_PERMISSIONS.plans.view,
      breadcrumb: ['培训中心', '培训计划'],
    },
  },
  {
    path: 'iam/training/plans/:planId',
    name: 'training-plan-detail',
    component: () => import('./operations-archive/pages/TrainingPlanDetailPage.vue'),
    meta: {
      title: '培训计划详情',
      resourceCode: operationsResources.planDetail.resource_code,
      resource_element: operationsResources.planDetail.elements.page.resource_element,
      subsystem: 'iam',
      permission: TRAINING_PERMISSIONS.plans.detail,
      hidden: true,
      breadcrumb: ['培训中心', '培训计划', '计划详情'],
    },
  },
  {
    path: 'iam/training/plans/:planId/tasks/:taskId',
    name: 'training-task-detail',
    component: () => import('./operations-archive/pages/TrainingTaskDetailPage.vue'),
    meta: {
      title: '培训任务详情',
      resourceCode: operationsResources.taskDetail.resource_code,
      resource_element: operationsResources.taskDetail.elements.page.resource_element,
      subsystem: 'iam',
      permission: TRAINING_PERMISSIONS.tasks.detail,
      hidden: true,
      breadcrumb: ['培训中心', '培训计划', '计划详情', '任务详情'],
    },
  },
  {
    path: 'iam/training/employee-archives',
    name: 'training-employee-archives',
    component: () => import('./operations-archive/pages/EmployeeTrainingArchivePage.vue'),
    meta: {
      title: '员工培训档案',
      resourceCode: operationsResources.archives.resource_code,
      resource_element: operationsResources.archives.elements.page.resource_element,
      subsystem: 'iam',
      permission: TRAINING_PERMISSIONS.archives.view,
      breadcrumb: ['培训中心', '员工培训档案'],
    },
  },
  {
    path: 'iam/training/statistics',
    name: 'training-special-statistics',
    component: () => import('./operations-archive/pages/TrainingStatisticsPage.vue'),
    meta: {
      title: '专项统计',
      resourceCode: operationsResources.statistics.resource_code,
      resource_element: operationsResources.statistics.elements.page.resource_element,
      subsystem: 'iam',
      permission: TRAINING_PERMISSIONS.statistics.view,
      breadcrumb: ['培训中心', '专项统计'],
    },
  },
]
