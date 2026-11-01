# IAM 维护注册迁移与逐链证据（Harness U2 / U1）

日期：2026-09-27。范围：原 pending_routes 的 16 个正式入口。只增补静态注册与资源元素标记，不重写页面、不切换 V1/V2 判权、不修改审批/基线、不访问线上或后端运行环境。

## 结论与边界

- 16 个入口全部具有稳定 Page/Menu/ButtonPage 身份；新增 34 个独立 Button，118 个 resource_element。pending_routes 已清空，这只表示维护注册完成。
- Permission 按真实操作元素取可达 API，Package 组合本页 Permission；写 Function 均绑定独立 Button。没有把整页接口并给每个按钮。导航目标的加载不反向并入源按钮。
- 权威接口来自 standards/iam/backend-functions.snapshot.json（backend source catalog；runtime_verified=false），精确 method + api_path 查到唯一 Function。下表无前端自造 Function 编码。
- 通信片段：docs/coordination/harness-evidence/routes-communication.json；69 个源码，834 个扫描候选，逐候选分类与 298 条调用链。片段不直接覆盖中央清单，交由主 Agent 逐链复核与集成。源码锁防止辅助生成脚本自动认可新/变更文件。
- 已执行定向 ESLint、pnpm typecheck、资源注册/标记与精确 Function 静态校验、premium strict 审计。浏览器与最终构建由质量 Agent 独占执行，本报告不据静态注册宣称在线授权已生效。

## 已知生产缺口（保持原状）

1. Dashboard 的 getDashboardData 在 260ms 定时器后返回 dashboardData 样本；新建运输单/查看/跟踪仅通知演示。IAM/TMS/VMS Overview 也是本地样本指标，不是真实统计。Welcome 仅读取本地会话。这些 Permission 明确 frontend_only。
2. TrainingPlanManagementPage.save 在 planType=STANDING 时 warning 后直接返回；常设计划未接正式保存。TrainingPlanDetailPageView 的入职规则 saveOnboardingRule / retryOnboardingJob 没有生产父页监听。TrainingTaskDetailPageView 的返岗、管理员完成、返岗人员搜索 emit 没有生产监听，can* 默认 false。candidateOnly 标记明确无 API；未据 PRD/后台能力编造绑定。
3. task 表单 isLongRunning、报表新增 executionNo/assignmentType/completionSource/assignedAtPeriod 等候选字段并未全部承接到生产请求 payload。本次不补业务，只登记真实已接调用。
4. TrainingTaskPageView、PlatformFrameworkPageView 是无生产入口绑定的候选展示视图；无网络、非正式能力。保留其源码并作 mock 分类，没有把它们加入正式 route 注册。
5. 动态详情以及 Welcome/角色分配登记 button_page。现存兼容资源在线类型、资源同步结果、角色生效授权、跨服务消费约束均需主链与运行环境验收；本次不修改线上状态。

## 文件分工

新增 content-exam、operations-archive、iam/overview、platform/dashboard、tms/overview、vms/overview 六个 Feature registry；access-control registry 仅新增 assignments 与其绑定导出。18 个既有 Vue 视图/绑定只加资源标记，五个 features/*/routes.ts 增加 registry 稳定身份。maintenance-migration.json 只清空 pending_routes。脚本/schema、central communication-inventory、生成产物由其他 Harness Agent 维护。

设计技能约束促使保留全部布局、交互、审批及视觉基线；仅使用既有共享组件的 resource_element / directive 属性。质量 Agent 的 TrainingOverview 宽度修复是独立变更。

## 阅读规则

下表的 API 均为 POST，IAM 接口前缀 /iam-admin，File 前缀 /dms。空集合 ∅ 表示回调确认为本地/未绑定，不是待猜测的 API。条件分支列出可达集合，不表示每次都发全组请求。底部给出每个精确 API 对应的权威 Function。

### 角色成员 — iam-role-assignments

- 路由：`/iam/roles/assignments`；资源：`IAM.ROLES.ASSIGNMENTS`（button_page，parent=IAM.ROLES）。
- 生产绑定：`src/features/iam/access-control/pages/RoleAssignmentPage.vue`；注册：`src/features/iam/access-control/iam-resource.registry.ts`。
- Package：`iam-role-assignments.manage`；Permission：`iam-role-assignments.view`、`iam-role-assignments.assign`、`iam-role-assignments.revoke`。

| resource_element             | 实际回调 → binding/API                                                                                                                   | 事件 → 请求                                                                                                                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iam.roleAssignments.page`   | onMounted(load) → foundationApi.queryTenants + loadTenantOptions(queryUsers/queryRoles) → queryAssignments                               | mount → Tenant/Query, Membership/QueryUsers, RolePermission/QueryRoles, MemberRole/Query                                                                                                                               |
| `iam.roleAssignments.query`  | search/reset/changePage → props.queryAssignments → binding.queryAssignments；Tenant 改变才 loadTenantOptions。retry → queryAssignments() | search → Membership/QueryUsers, RolePermission/QueryRoles, MemberRole/Query<br>reset → Membership/QueryUsers, RolePermission/QueryRoles, MemberRole/Query<br>refresh → MemberRole/Query<br>paginate → MemberRole/Query |
| `iam.roleAssignments.assign` | openAssign 本地；assignMember → props.submitAssign → binding.submitAssign → accessControlApi.assignRoles → load()                        | open → ∅<br>submit → MemberRole/Assign, Tenant/Query, Membership/QueryUsers, RolePermission/QueryRoles, MemberRole/Query                                                                                               |
| `iam.roleAssignments.revoke` | openRevoke 本地；revokeMember → props.submitRevoke → binding.submitRevoke → accessControlApi.revokeRoles → load()                        | open → ∅<br>submit → MemberRole/Revoke, Tenant/Query, Membership/QueryUsers, RolePermission/QueryRoles, MemberRole/Query                                                                                               |
| `iam.roleAssignments.local`  | 表单字段/选项/排序/选择/关闭/取消/丢弃本地状态；不请求服务                                                                               | click → ∅<br>close → ∅                                                                                                                                                                                                 |
| `iam.roleAssignments.roles`  | navigateRoles prop → router.push(iam-role-management)                                                                                    | click → ∅                                                                                                                                                                                                              |

### IAM 身份中心 — iam-overview

- 路由：`/iam/overview`；资源：`IAM.OVERVIEW`（menu，parent=IAM）。
- 生产绑定：`src/features/iam/overview/pages/IamOverviewPage.vue`；注册：`src/features/iam/overview/iam-resource.registry.ts`。
- Package：`iam-overview.manage`；Permission：`iam-overview.view`。

| resource_element     | 实际回调 → binding/API                                                                                     | 事件 → 请求              |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------ |
| `iam.overview.page`  | metrics/modules 本地常量 → SubsystemWorkspace；不是在线用户/角色统计                                       | mount → ∅<br>refresh → ∅ |
| `iam.overview.local` | SubsystemWorkspace.RouterLink → /iam/members、/iam/organizations、/iam/roles；目标页独立加载，审计日志无to | click → ∅                |

### 物流运营总览 — platform-dashboard

- 路由：`/platform/dashboard`；资源：`DMS.DASHBOARD`（menu，parent=DMS）。
- 生产绑定：`src/features/platform/dashboard/pages/PlatformDashboardPage.vue`；注册：`src/features/platform/dashboard/iam-resource.registry.ts`。
- Package：`platform-dashboard.manage`；Permission：`platform-dashboard.view`。

| resource_element         | 实际回调 → binding/API                                                                                                         | 事件 → 请求              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| `dms.dashboard.page`     | useDashboard.watch(isWelcomeOnlySession) → refresh → getDashboardData：setTimeout(260) 后返回 dashboardData 常量；不是生产统计 | mount → ∅<br>refresh → ∅ |
| `dms.dashboard.local`    | createOrder/查看/跟踪仅 notification 演示；更多无 handler；不发生业务请求                                                      | click → ∅                |
| `dms.dashboard.vehicles` | $router.push('/vms/overview')；目标页面仍为静态样本                                                                            | click → ∅                |

### 欢迎 — platform-welcome

- 路由：`/platform/welcome`；资源：`DMS.DASHBOARD.WELCOME`（button_page，parent=DMS.DASHBOARD）。
- 生产绑定：`src/features/platform/dashboard/pages/PlatformWelcomePage.vue`；注册：`src/features/platform/dashboard/iam-resource.registry.ts`。
- Package：`platform-welcome.manage`；Permission：`platform-welcome.view`。

| resource_element              | 实际回调 → binding/API                                                | 事件 → 请求              |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------ |
| `dms.dashboard.welcome.page`  | getDashboardAccessContext → getStoredAuthSession 本地读；欢迎文案渲染 | mount → ∅<br>refresh → ∅ |
| `dms.dashboard.welcome.local` | 无业务事件处理器；纯展示                                              | click → ∅                |

### TMS 运输管理 — tms-overview

- 路由：`/tms/overview`；资源：`TMS.OVERVIEW`（menu，parent=TMS）。
- 生产绑定：`src/features/tms/overview/pages/TmsOverviewPage.vue`；注册：`src/features/tms/overview/iam-resource.registry.ts`。
- Package：`tms-overview.manage`；Permission：`tms-overview.view`。

| resource_element     | 实际回调 → binding/API                                             | 事件 → 请求              |
| -------------------- | ------------------------------------------------------------------ | ------------------------ |
| `tms.overview.page`  | metrics/modules 本地样本 → SubsystemWorkspace；无生产统计          | mount → ∅<br>refresh → ∅ |
| `tms.overview.local` | 生产无to；DEV才有orders/dispatch/trips占位RouterLink，不发业务请求 | click → ∅                |

### 课程管理 — training-course-management

- 路由：`/iam/training/courses`；资源：`IAM.TRAINING.COURSES`（menu，parent=IAM.TRAINING）。
- 生产绑定：`src/features/training/content-exam/pages/CourseManagementPage.vue`；注册：`src/features/training/content-exam/iam-resource.registry.ts`。
- Package：`training-course-management.manage`；Permission：`training-course-management.view`、`training-course-management.create`、`training-course-management.edit`、`training-course-management.status`、`training-course-management.copy`。

| resource_element                    | 实际回调 → binding/API                                                                                                                                                                                                       | 事件 → 请求                                                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `iam.training.courses.page`         | 生产 Page → useContentPages 专门化 courses → useTrainingContent.watch(scope,allowed,query) → fetchList → options.api.query                                                                                                   | mount → TrainingCourse/Query                                                                                                       |
| `iam.training.courses.query`        | search/reset/handleSearchKeyup/paginate/refresh → useTrainingContentView.load → runtime.load；URL改变由 watcher 查询，否则直接 fetchList                                                                                     | search → TrainingCourse/Query<br>reset → TrainingCourse/Query<br>refresh → TrainingCourse/Query<br>paginate → TrainingCourse/Query |
| `iam.training.courses.detail`       | openDetail → runtime.detail → options.api.detail                                                                                                                                                                             | open → TrainingCourse/Detail                                                                                                       |
| `iam.training.courses.local`        | 表单字段/选项/排序/选择/关闭/取消/丢弃本地状态；不请求服务                                                                                                                                                                   | click → ∅<br>close → ∅<br>cancel → ∅                                                                                               |
| `iam.training.courses.create`       | openForm(create) 初始化；saveCourse → runtime.save → options.api.create → fetchList                                                                                                                                          | open → ∅<br>submit → TrainingCourse/Create, TrainingCourse/Query                                                                   |
| `iam.training.courses.edit`         | openForm(edit) → runtime.detail；保存 → options.api.update → fetchList                                                                                                                                                       | open → TrainingCourse/Detail<br>submit → TrainingCourse/Update, TrainingCourse/Query                                               |
| `iam.training.courses.status`       | openStatus本地；confirmStatus → runtime.changeStatus → options.api.changeStatus → fetchList                                                                                                                                  | open → ∅<br>confirm → TrainingCourse/ChangeStatus, TrainingCourse/Query                                                            |
| `iam.training.courses.copy`         | openCopy本地；copyCourse → runtime.copy → courses.copy → fetchList                                                                                                                                                           | open → ∅<br>confirm → TrainingCourse/Copy, TrainingCourse/Query                                                                    |
| `iam.training.courses.createUpload` | FileUploader.handleChange/run → AppLayout fileTransferKey provider → createDmsFileTransferGateway.createTask → createDmsUploadTask.run：Upload后VIDEO ValidateVideo；retry复用任务，成功Upload可被缓存；移除仅abort/清空引用 | upload → dms/File/Upload, dms/File/ValidateVideo<br>retry → dms/File/Upload, dms/File/ValidateVideo<br>remove → ∅                  |
| `iam.training.courses.editUpload`   | 同 createUpload；仅对应编辑 Button，不调用 GetAccessUrl                                                                                                                                                                      | upload → dms/File/Upload, dms/File/ValidateVideo<br>retry → dms/File/Upload, dms/File/ValidateVideo<br>remove → ∅                  |

### 题库管理 — training-question-bank

- 路由：`/iam/training/questions`；资源：`IAM.TRAINING.QUESTIONS`（menu，parent=IAM.TRAINING）。
- 生产绑定：`src/features/training/content-exam/pages/QuestionBankPage.vue`；注册：`src/features/training/content-exam/iam-resource.registry.ts`。
- Package：`training-question-bank.manage`；Permission：`training-question-bank.view`、`training-question-bank.create`、`training-question-bank.edit`、`training-question-bank.status`。

| resource_element                | 实际回调 → binding/API                                                                                                                   | 事件 → 请求                                                                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `iam.training.questions.page`   | 生产 Page → useContentPages 专门化 questions → useTrainingContent.watch(scope,allowed,query) → fetchList → options.api.query             | mount → TrainingQuestion/Query                                                                                                             |
| `iam.training.questions.query`  | search/reset/handleSearchKeyup/paginate/refresh → useTrainingContentView.load → runtime.load；URL改变由 watcher 查询，否则直接 fetchList | search → TrainingQuestion/Query<br>reset → TrainingQuestion/Query<br>refresh → TrainingQuestion/Query<br>paginate → TrainingQuestion/Query |
| `iam.training.questions.detail` | openDetail → runtime.detail → options.api.detail                                                                                         | open → TrainingQuestion/Detail                                                                                                             |
| `iam.training.questions.local`  | 表单字段/选项/排序/选择/关闭/取消/丢弃本地状态；不请求服务                                                                               | click → ∅<br>close → ∅<br>cancel → ∅                                                                                                       |
| `iam.training.questions.create` | openForm(create) 初始化；saveQuestion → runtime.save → options.api.create → fetchList                                                    | open → ∅<br>submit → TrainingQuestion/Create, TrainingQuestion/Query                                                                       |
| `iam.training.questions.edit`   | openForm(edit) → runtime.detail；保存 → options.api.update → fetchList                                                                   | open → TrainingQuestion/Detail<br>submit → TrainingQuestion/Update, TrainingQuestion/Query                                                 |
| `iam.training.questions.status` | openStatus本地；confirmStatus → runtime.changeStatus → options.api.changeStatus → fetchList                                              | open → ∅<br>confirm → TrainingQuestion/ChangeStatus, TrainingQuestion/Query                                                                |

### 试卷管理 — training-paper-management

- 路由：`/iam/training/papers`；资源：`IAM.TRAINING.PAPERS`（menu，parent=IAM.TRAINING）。
- 生产绑定：`src/features/training/content-exam/pages/PaperManagementPage.vue`；注册：`src/features/training/content-exam/iam-resource.registry.ts`。
- Package：`training-paper-management.manage`；Permission：`training-paper-management.view`、`training-paper-management.create`、`training-paper-management.edit`、`training-paper-management.status`。

| resource_element                    | 实际回调 → binding/API                                                                                                                   | 事件 → 请求                                                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `iam.training.papers.page`          | 生产 Page → useContentPages 专门化 papers → useTrainingContent.watch(scope,allowed,query) → fetchList → options.api.query                | mount → TrainingPaper/Query                                                                                                    |
| `iam.training.papers.query`         | search/reset/handleSearchKeyup/paginate/refresh → useTrainingContentView.load → runtime.load；URL改变由 watcher 查询，否则直接 fetchList | search → TrainingPaper/Query<br>reset → TrainingPaper/Query<br>refresh → TrainingPaper/Query<br>paginate → TrainingPaper/Query |
| `iam.training.papers.detail`        | openDetail → runtime.detail → options.api.detail                                                                                         | open → TrainingPaper/Detail                                                                                                    |
| `iam.training.papers.local`         | 表单字段/选项/排序/选择/关闭/取消/丢弃本地状态；不请求服务                                                                               | click → ∅<br>close → ∅<br>cancel → ∅                                                                                           |
| `iam.training.papers.create`        | openForm(create) 初始化并调用 prepareForm 加载候选；savePaper → runtime.save → options.api.create → fetchList                            | open → TrainingQuestion/Query<br>submit → TrainingPaper/Create, TrainingPaper/Query                                            |
| `iam.training.papers.edit`          | openForm(edit) → runtime.detail + prepareForm Question.Query；保存 → options.api.update → fetchList                                      | open → TrainingPaper/Detail, TrainingQuestion/Query<br>submit → TrainingPaper/Update, TrainingPaper/Query                      |
| `iam.training.papers.status`        | openStatus本地；confirmStatus → runtime.changeStatus → options.api.changeStatus → fetchList                                              | open → ∅<br>confirm → TrainingPaper/ChangeStatus, TrainingPaper/Query                                                          |
| `iam.training.papers.createOptions` | searchOptions → runtime.searchOptions → trainingContentApi.questions.query；prepareForm 同候选链                                         | search → TrainingQuestion/Query<br>paginate → TrainingQuestion/Query                                                           |
| `iam.training.papers.editOptions`   | 同 createOptions；考试表单 edit prepareForm 额外 Paper.Detail 已在 edit.open 声明                                                        | search → TrainingQuestion/Query<br>paginate → TrainingQuestion/Query                                                           |

### 考试配置管理 — training-exam-configuration

- 路由：`/iam/training/exams`；资源：`IAM.TRAINING.EXAMS`（menu，parent=IAM.TRAINING）。
- 生产绑定：`src/features/training/content-exam/pages/ExamConfigurationPage.vue`；注册：`src/features/training/content-exam/iam-resource.registry.ts`。
- Package：`training-exam-configuration.manage`；Permission：`training-exam-configuration.view`、`training-exam-configuration.create`、`training-exam-configuration.edit`、`training-exam-configuration.status`。

| resource_element                   | 实际回调 → binding/API                                                                                                                   | 事件 → 请求                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `iam.training.exams.page`          | 生产 Page → useContentPages 专门化 exams → useTrainingContent.watch(scope,allowed,query) → fetchList → options.api.query                 | mount → TrainingExam/Query                                                                                                 |
| `iam.training.exams.query`         | search/reset/handleSearchKeyup/paginate/refresh → useTrainingContentView.load → runtime.load；URL改变由 watcher 查询，否则直接 fetchList | search → TrainingExam/Query<br>reset → TrainingExam/Query<br>refresh → TrainingExam/Query<br>paginate → TrainingExam/Query |
| `iam.training.exams.detail`        | openDetail → runtime.detail → options.api.detail                                                                                         | open → TrainingExam/Detail                                                                                                 |
| `iam.training.exams.local`         | 表单字段/选项/排序/选择/关闭/取消/丢弃本地状态；不请求服务                                                                               | click → ∅<br>close → ∅<br>cancel → ∅                                                                                       |
| `iam.training.exams.create`        | openForm(create) 初始化并调用 prepareForm 加载候选；saveConfiguration → runtime.save → options.api.create → fetchList                    | open → TrainingPaper/Query<br>submit → TrainingExam/Create, TrainingExam/Query                                             |
| `iam.training.exams.edit`          | openForm(edit) → runtime.detail + prepareForm Paper.Detail + Paper.Query；保存 → options.api.update → fetchList                          | open → TrainingExam/Detail, TrainingPaper/Detail, TrainingPaper/Query<br>submit → TrainingExam/Update, TrainingExam/Query  |
| `iam.training.exams.status`        | openStatus本地；confirmStatus → runtime.changeStatus → options.api.changeStatus → fetchList                                              | open → ∅<br>confirm → TrainingExam/ChangeStatus, TrainingExam/Query                                                        |
| `iam.training.exams.createOptions` | searchOptions → runtime.searchOptions → trainingContentApi.papers.query；prepareForm 同候选链                                            | search → TrainingPaper/Query<br>paginate → TrainingPaper/Query                                                             |
| `iam.training.exams.editOptions`   | 同 createOptions；考试表单 edit prepareForm 额外 Paper.Detail 已在 edit.open 声明                                                        | search → TrainingPaper/Query<br>paginate → TrainingPaper/Query                                                             |

### 培训计划 — training-plan-management

- 路由：`/iam/training/plans`；资源：`IAM.TRAINING.PLANS`（menu，parent=IAM.TRAINING）。
- 生产绑定：`src/features/training/operations-archive/pages/TrainingPlanManagementPage.vue`；注册：`src/features/training/operations-archive/iam-resource.registry.ts`。
- Package：`training-plan-management.manage`；Permission：`training-plan-management.view`、`training-plan-management.create`、`training-plan-management.edit`、`training-plan-management.publish`、`training-plan-management.delete`。

| resource_element             | 实际回调 → binding/API                                                                                        | 事件 → 请求                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `iam.training.plans.page`    | onMounted(load) → trainingOperationsApi.queryPlans                                                            | mount → TrainingPlan/Query                                                                                                 |
| `iam.training.plans.query`   | search/reset/changePage/emit(retry) → binding.load → queryPlans                                               | search → TrainingPlan/Query<br>reset → TrainingPlan/Query<br>refresh → TrainingPlan/Query<br>paginate → TrainingPlan/Query |
| `iam.training.plans.local`   | 表单字段/选项/排序/选择/关闭/取消/丢弃本地状态；不请求服务                                                    | click → ∅<br>close → ∅                                                                                                     |
| `iam.training.plans.detail`  | openDetail → emit(openDetail) → binding.openDetail → router.push(plan-detail)，目标页负责自身加载             | click → ∅                                                                                                                  |
| `iam.training.plans.create`  | openForm(create) 本地；savePlan → emit(save) → binding.save → createPlan → load；STANDING 分支 warning 后返回 | open → ∅<br>submit → TrainingPlan/Create, TrainingPlan/Query                                                               |
| `iam.training.plans.edit`    | openForm(edit) 使用当前行本地初始化；savePlan → binding.save → updatePlan → load                              | open → ∅<br>submit → TrainingPlan/Update, TrainingPlan/Query                                                               |
| `iam.training.plans.publish` | openConfirm(publish) 本地；confirm → emit(publish) → binding.publish → publishPlan → load                     | open → ∅<br>submit → TrainingPlan/Publish, TrainingPlan/Query                                                              |
| `iam.training.plans.delete`  | openConfirm(delete) 本地；confirm → emit(delete) → binding.remove → deletePlan → load                         | open → ∅<br>submit → TrainingPlan/Delete, TrainingPlan/Query                                                               |

### 培训计划详情 — training-plan-detail

- 路由：`/iam/training/plans/:planId`；资源：`IAM.TRAINING.PLANS.DETAIL`（button_page，parent=IAM.TRAINING.PLANS）。
- 生产绑定：`src/features/training/operations-archive/pages/TrainingPlanDetailPage.vue`；注册：`src/features/training/operations-archive/iam-resource.registry.ts`。
- Package：`training-plan-detail.manage`；Permission：`training-plan-detail.view`、`training-plan-detail.createTask`、`training-plan-detail.startTask`、`training-plan-detail.deleteTask`、`training-plan-detail.addEmployees`、`training-plan-detail.exitEmployee`、`training-plan-detail.exitEmployees`、`training-plan-detail.rejoinEmployee`。

| resource_element                              | 实际回调 → binding/API                                                                                                                                   | 事件 → 请求                                                                                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `iam.training.planDetail.page`                | onMounted/watch(planId)/emit(retry) → load → getPlan；依 canViewTasks/canViewEmployees 分别 loadTasks/loadEmployees                                      | mount → TrainingPlan/Detail, TrainingTask/Query, TrainingPlanEmployee/Query<br>refresh → TrainingPlan/Detail, TrainingTask/Query, TrainingPlanEmployee/Query |
| `iam.training.planDetail.tasks`               | 分页 emit(queryTasks) → loadTasks → queryTasks                                                                                                           | paginate → TrainingTask/Query                                                                                                                                |
| `iam.training.planDetail.employees`           | 分页 emit(queryPlanEmployees) → loadEmployees → queryPlanEmployees                                                                                       | paginate → TrainingPlanEmployee/Query                                                                                                                        |
| `iam.training.planDetail.history`             | openEmployeeHistory → emit(employeeHistory) → loadEmployeeHistory → getPlanEmployeeHistory                                                               | open → TrainingPlanEmployee/History                                                                                                                          |
| `iam.training.planDetail.local`               | 表单字段/选项/排序/选择/关闭/取消/丢弃本地状态；不请求服务                                                                                               | click → ∅<br>close → ∅                                                                                                                                       |
| `iam.training.planDetail.candidateOnly`       | openOnboarding/submitOnboarding/stopOnboarding/retryOnboardingJob → 本地或 emit；生产 binding 未传监听，不声明 Function                                  | open → ∅<br>submit → ∅<br>retry → ∅                                                                                                                          |
| `iam.training.planDetail.taskDetail`          | openTaskIfAllowed/emit(openTask) → binding.openTask → router.push(task-detail)                                                                           | click → ∅                                                                                                                                                    |
| `iam.training.planDetail.createTask`          | openTaskForm → emit(loadTaskOptions) → searchCourses/searchExams/loadOccupiedPeriods；submitTask → createTask → API.createTask → loadTasks + refreshPlan | open → TrainingCourse/Query, TrainingExam/Query, TrainingTask/Query<br>submit → TrainingTask/Create, TrainingTask/Query, TrainingPlan/Detail                 |
| `iam.training.planDetail.startTask`           | openTaskConfirm(start) 本地；confirmTaskAction → emit(startTask) → API.startTask → loadTasks + refreshPlan                                               | open → ∅<br>submit → TrainingTask/Start, TrainingTask/Query, TrainingPlan/Detail                                                                             |
| `iam.training.planDetail.deleteTask`          | openTaskConfirm(delete) 本地；confirmTaskAction → emit(deleteTask) → API.deleteTask → loadTasks + refreshPlan                                            | open → ∅<br>submit → TrainingTask/Delete, TrainingTask/Query, TrainingPlan/Detail                                                                            |
| `iam.training.planDetail.addEmployees`        | openEmployeeForm → searchEmployees('')；submitEmployees → addEmployees → batchAddPlanEmployees → loadEmployees + refreshPlan                             | open → Membership/QueryUsers<br>submit → TrainingPlanEmployee/BatchAdd, TrainingPlanEmployee/Query, TrainingPlan/Detail                                      |
| `iam.training.planDetail.exitEmployee`        | emit(exitEmployees,[row]) → exitEmployees 长度=1 → exitPlanEmployee → loadEmployees + refreshPlan                                                        | open → ∅<br>submit → TrainingPlanEmployee/Exit, TrainingPlanEmployee/Query, TrainingPlan/Detail                                                              |
| `iam.training.planDetail.exitEmployees`       | emit(exitEmployees,selectedEmployees) → 长度=1用exitPlanEmployee，否则batchExitPlanEmployees；再loadEmployees + refreshPlan                              | open → ∅<br>submit → TrainingPlanEmployee/Exit, TrainingPlanEmployee/BatchExit, TrainingPlanEmployee/Query, TrainingPlan/Detail                              |
| `iam.training.planDetail.rejoinEmployee`      | emit(rejoinEmployee) → API.rejoinPlanEmployee → loadEmployees + refreshPlan                                                                              | open → ∅<br>submit → TrainingPlanEmployee/Rejoin, TrainingPlanEmployee/Query, TrainingPlan/Detail                                                            |
| `iam.training.planDetail.createCourseOptions` | el-select.remote-method → emit(searchCourses) → binding.searchCourses → queryCourses                                                                     | search → TrainingCourse/Query                                                                                                                                |
| `iam.training.planDetail.createExamOptions`   | el-select.remote-method → emit(searchExams) → binding.searchExams → queryExams                                                                           | search → TrainingExam/Query                                                                                                                                  |
| `iam.training.planDetail.employeeOptions`     | el-select.remote-method → emit(searchEmployees) → binding.searchEmployees → queryTenantEmployees                                                         | search → Membership/QueryUsers                                                                                                                               |

### 培训任务详情 — training-task-detail

- 路由：`/iam/training/plans/:planId/tasks/:taskId`；资源：`IAM.TRAINING.PLANS.DETAIL.TASK`（button_page，parent=IAM.TRAINING.PLANS.DETAIL）。
- 生产绑定：`src/features/training/operations-archive/pages/TrainingTaskDetailPage.vue`；注册：`src/features/training/operations-archive/iam-resource.registry.ts`。
- Package：`training-task-detail.manage`；Permission：`training-task-detail.view`、`training-task-detail.edit`、`training-task-detail.start`、`training-task-detail.delete`。

| resource_element                        | 实际回调 → binding/API                                                                                                                        | 事件 → 请求                                                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iam.training.taskDetail.page`          | onMounted/watch([planId,taskId])/retry → load → getTask；canViewTaskEmployees 才 queryEmployees                                               | mount → TrainingTask/Detail, TrainingTaskEmployee/Query<br>refresh → TrainingTask/Detail, TrainingTaskEmployee/Query                                       |
| `iam.training.taskDetail.employees`     | queryEmployeeList/resetEmployeeList/changeEmployeePage → emit(queryEmployees) → binding.queryEmployees → queryTaskEmployees                   | search → TrainingTaskEmployee/Query<br>reset → TrainingTaskEmployee/Query<br>refresh → TrainingTaskEmployee/Query<br>paginate → TrainingTaskEmployee/Query |
| `iam.training.taskDetail.personnel`     | coursePeople/examPeople → drilldown；TrainingPersonnelDrawer.pageChange → changeDrilldownPage → emit(drilldown) → queryTaskEmployees          | open → TrainingTaskEmployee/Query<br>paginate → TrainingTaskEmployee/Query                                                                                 |
| `iam.training.taskDetail.courseDetail`  | emit(openCourse) → binding.openCourse → getCourse；DetailDrawer关闭仅本地                                                                     | open → TrainingCourse/Detail                                                                                                                               |
| `iam.training.taskDetail.examDetail`    | emit(openExam) → binding.openExam → getExam；DetailDrawer关闭仅本地                                                                           | open → TrainingExam/Detail                                                                                                                                 |
| `iam.training.taskDetail.local`         | 表单字段/选项/排序/选择/关闭/取消/丢弃本地状态；不请求服务                                                                                    | click → ∅<br>close → ∅                                                                                                                                     |
| `iam.training.taskDetail.candidateOnly` | 返岗/管理员完成的 open/submit/search emit 无生产监听，can* 默认 false；不声明 Function                                                        | open → ∅<br>search → ∅<br>submit → ∅                                                                                                                       |
| `iam.training.taskDetail.back`          | emit(back) → router.push(plan-detail)，目标页负责加载                                                                                         | click → ∅                                                                                                                                                  |
| `iam.training.taskDetail.edit`          | openEdit → loadTaskOptions → searchCourses/searchExams；submitEdit → updateTask → API.updateTask → load(getTask + conditional queryEmployees) | open → TrainingCourse/Query, TrainingExam/Query<br>submit → TrainingTask/Update, TrainingTask/Detail, TrainingTaskEmployee/Query                           |
| `iam.training.taskDetail.start`         | openConfirm(start) 本地；submitConfirm → startTask → API.startTask → load                                                                     | open → ∅<br>submit → TrainingTask/Start, TrainingTask/Detail, TrainingTaskEmployee/Query                                                                   |
| `iam.training.taskDetail.delete`        | openConfirm(delete) 本地；submitConfirm → deleteTask → API.deleteTask → router.replace(plan-detail)，无本页刷新                               | open → ∅<br>submit → TrainingTask/Delete                                                                                                                   |
| `iam.training.taskDetail.courseOptions` | remote-method → emit(searchCourses) → queryCourses                                                                                            | search → TrainingCourse/Query                                                                                                                              |
| `iam.training.taskDetail.examOptions`   | remote-method → emit(searchExams) → queryExams                                                                                                | search → TrainingExam/Query                                                                                                                                |

### 培训概览 — training-operations-overview

- 路由：`/iam/training/overview`；资源：`IAM.TRAINING.OVERVIEW`（menu，parent=IAM.TRAINING）。
- 生产绑定：`src/features/training/operations-archive/pages/TrainingOperationsOverviewPage.vue`；注册：`src/features/training/operations-archive/iam-resource.registry.ts`。
- Package：`training-operations-overview.manage`；Permission：`training-operations-overview.view`。

| resource_element                   | 实际回调 → binding/API                                                                                                                   | 事件 → 请求                                                                                                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iam.training.overview.page`       | onMounted → loadOptions(queryPlans/queryTasks) + retry(loadOverview/loadTrends/loadIncomplete)                                           | mount → TrainingPlan/Query, TrainingTask/Query, TrainingOverview/Overview, TrainingOverview/Trends, TrainingOverview/Incomplete                                                                                               |
| `iam.training.overview.query`      | runQuery/reset → emit(query) → binding.query：filtersChanged 时三项并行，否则只 Incomplete                                               | search → TrainingOverview/Overview, TrainingOverview/Trends, TrainingOverview/Incomplete<br>reset → TrainingOverview/Overview, TrainingOverview/Trends, TrainingOverview/Incomplete                                           |
| `iam.training.overview.overview`   | emit(retry,'overview') → loadOverview → API.overview                                                                                     | retry → TrainingOverview/Overview                                                                                                                                                                                             |
| `iam.training.overview.trends`     | emit(retry,'trends') → loadTrends → API.trends                                                                                           | retry → TrainingOverview/Trends                                                                                                                                                                                               |
| `iam.training.overview.incomplete` | selectDrilldown/onPageChange → runQuery → binding.query：通常 Incomplete，但未提交筛选改变会三项刷新；retry(incomplete)严格只 Incomplete | select → TrainingOverview/Overview, TrainingOverview/Trends, TrainingOverview/Incomplete<br>retry → TrainingOverview/Incomplete<br>paginate → TrainingOverview/Overview, TrainingOverview/Trends, TrainingOverview/Incomplete |
| `iam.training.overview.local`      | 表单字段/选项/排序/选择/关闭/取消/丢弃本地状态；不请求服务                                                                               | click → ∅                                                                                                                                                                                                                     |

### 员工培训档案 — training-employee-archives

- 路由：`/iam/training/employee-archives`；资源：`IAM.TRAINING.EMPLOYEE_ARCHIVES`（menu，parent=IAM.TRAINING）。
- 生产绑定：`src/features/training/operations-archive/pages/EmployeeTrainingArchivePage.vue`；注册：`src/features/training/operations-archive/iam-resource.registry.ts`。
- Package：`training-employee-archives.manage`；Permission：`training-employee-archives.view`、`training-employee-archives.export`、`training-employee-archives.sensitiveExport`、`training-employee-archives.snapshot`。

| resource_element                        | 实际回调 → binding/API                                                                                                 | 事件 → 请求                                                                                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iam.training.archives.page`            | onMounted → loadOptions(queryPlans/queryTasks/queryOrganizations/queryPositions) + loadList(archives)                  | mount → TrainingArchive/Archives, TrainingPlan/Query, TrainingTask/Query, Organization/Query, Position/Query                                       |
| `iam.training.archives.query`           | runQuery/reset/paginate → binding.query → loadList → archives；retry(list)同                                           | search → TrainingArchive/Archives<br>reset → TrainingArchive/Archives<br>refresh → TrainingArchive/Archives<br>paginate → TrainingArchive/Archives |
| `iam.training.archives.detail`          | openDetail → emit(openDetail) → binding.openDetail → archiveDetail；返回中已含首屏tasks，不另调EmployeeTasks           | open → TrainingArchive/ArchiveDetail<br>retry → TrainingArchive/ArchiveDetail                                                                      |
| `iam.training.archives.tasks`           | queryDetailTasks分页/retry(tasks) → employeeTasks                                                                      | paginate → TrainingArchive/EmployeeTasks<br>retry → TrainingArchive/EmployeeTasks                                                                  |
| `iam.training.archives.taskDetail`      | openTask → emit(openTaskDetails) → binding.openTaskDetails → loadCourses + loadExams                                   | open → TrainingArchive/CourseResults, TrainingArchive/ExamHistory                                                                                  |
| `iam.training.archives.courses`         | retry(courses) → loadCourses → courseResults                                                                           | retry → TrainingArchive/CourseResults                                                                                                              |
| `iam.training.archives.exams`           | retry(exams) → loadExams → examHistory                                                                                 | retry → TrainingArchive/ExamHistory                                                                                                                |
| `iam.training.archives.snapshot`        | openSnapshot/重试 → binding.openExamSnapshot，独立 canViewExamSnapshot 检查 → examSnapshot                             | open → TrainingArchive/ExamSnapshot<br>retry → TrainingArchive/ExamSnapshot                                                                        |
| `iam.training.archives.export`          | exportVisible=true 本地；confirm → exportArchive(includeSensitive=false) → exportEmployeeArchives → Blob URL下载       | open → ∅<br>submit → TrainingExport/ExportEmployeeArchives                                                                                         |
| `iam.training.archives.sensitiveExport` | 确认 includeSensitive=true → exportEmployeeArchives；canExportExamMaterials 且勾选才 exportExamMaterials；Blob URL下载 | select → ∅<br>submit → TrainingExport/ExportEmployeeArchives, TrainingExport/ExportExamMaterials                                                   |
| `iam.training.archives.local`           | 表单字段/选项/排序/选择/关闭/取消/丢弃本地状态；不请求服务                                                             | click → ∅<br>close → ∅                                                                                                                             |

### 专项统计 — training-special-statistics

- 路由：`/iam/training/statistics`；资源：`IAM.TRAINING.STATISTICS`（menu，parent=IAM.TRAINING）。
- 生产绑定：`src/features/training/operations-archive/pages/TrainingStatisticsPage.vue`；注册：`src/features/training/operations-archive/iam-resource.registry.ts`。
- Package：`training-special-statistics.manage`；Permission：`training-special-statistics.view`、`training-special-statistics.export`、`training-special-statistics.auditExport`。

| resource_element                       | 实际回调 → binding/API                                                                             | 事件 → 请求                                                                                                                                                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iam.training.statistics.page`         | onMounted → loadOptions(Plan/Task/Organization/Position/Course/Exam Query) + load('task')          | mount → TrainingStatistics/TaskStatistics, TrainingPlan/Query, TrainingTask/Query, Organization/Query, Position/Query, TrainingCourse/Query, TrainingExam/Query                                                                                |
| `iam.training.statistics.taskQuery`    | runQuery/reset/paginate/retry 或 watch(activeTab) → binding.query → load('task') → taskStatistics  | search → TrainingStatistics/TaskStatistics<br>reset → TrainingStatistics/TaskStatistics<br>retry → TrainingStatistics/TaskStatistics<br>paginate → TrainingStatistics/TaskStatistics<br>tab → TrainingStatistics/TaskStatistics                |
| `iam.training.statistics.courseQuery`  | 同上，load('course') → courseStatistics                                                            | search → TrainingStatistics/CourseStatistics<br>reset → TrainingStatistics/CourseStatistics<br>retry → TrainingStatistics/CourseStatistics<br>paginate → TrainingStatistics/CourseStatistics<br>tab → TrainingStatistics/CourseStatistics      |
| `iam.training.statistics.examQuery`    | 同上，load('exam') → examStatistics                                                                | search → TrainingStatistics/ExamStatistics<br>reset → TrainingStatistics/ExamStatistics<br>retry → TrainingStatistics/ExamStatistics<br>paginate → TrainingStatistics/ExamStatistics<br>tab → TrainingStatistics/ExamStatistics                |
| `iam.training.statistics.overdueQuery` | 同上，load('overdue') → overdueStatistics                                                          | search → TrainingStatistics/OverdueStatistics<br>reset → TrainingStatistics/OverdueStatistics<br>retry → TrainingStatistics/OverdueStatistics<br>paginate → TrainingStatistics/OverdueStatistics<br>tab → TrainingStatistics/OverdueStatistics |
| `iam.training.statistics.resolveTask`  | openTask → binding.openTask：目标缺 trainingId 时先 getTask，否则跳过；再 router.push(task-detail) | open → TrainingTask/Detail                                                                                                                                                                                                                     |
| `iam.training.statistics.taskDetail`   | 导航目标声明 IAM.TRAINING.PLANS.DETAIL.TASK；点击由 resolveTask 元素承载；目标页独立加载           | click → ∅                                                                                                                                                                                                                                      |
| `iam.training.statistics.personnel`    | openPersonnel/changeDrilldownPage/retry → emit(drilldown) → loadPersonnel → queryTaskEmployees     | open → TrainingTaskEmployee/Query<br>retry → TrainingTaskEmployee/Query<br>paginate → TrainingTaskEmployee/Query                                                                                                                               |
| `iam.training.statistics.export`       | 打开确认本地；emit(export,'task') → exportCurrent → exportTaskLedger → Blob URL下载                | open → ∅<br>submit → TrainingExport/ExportTaskLedger                                                                                                                                                                                           |
| `iam.training.statistics.auditExport`  | 打开确认本地；emit(export,'exam') → exportCurrent → exportExamMaterials → Blob URL下载             | open → ∅<br>submit → TrainingExport/ExportExamMaterials                                                                                                                                                                                        |
| `iam.training.statistics.local`        | 表单字段/选项/排序/选择/关闭/取消/丢弃本地状态；不请求服务                                         | click → ∅<br>close → ∅                                                                                                                                                                                                                         |

### VMS 车辆管理 — vms-overview

- 路由：`/vms/overview`；资源：`VMS.OVERVIEW`（menu，parent=VMS）。
- 生产绑定：`src/features/vms/overview/pages/VmsOverviewPage.vue`；注册：`src/features/vms/overview/iam-resource.registry.ts`。
- Package：`vms-overview.manage`；Permission：`vms-overview.view`。

| resource_element     | 实际回调 → binding/API                                                        | 事件 → 请求              |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------ |
| `vms.overview.page`  | metrics/modules 本地样本 → SubsystemWorkspace；无生产统计                     | mount → ∅<br>refresh → ∅ |
| `vms.overview.local` | 生产无to；DEV才有drivers/certificates/maintenance占位RouterLink，不发业务请求 | click → ∅                |

## 精确 API → 权威 Function

| method + API                                            | Function resource_code                         | access |
| ------------------------------------------------------- | ---------------------------------------------- | ------ |
| `POST /dms/File/Upload`                                 | `DMS.FILE.UPLOAD`                              | write  |
| `POST /dms/File/ValidateVideo`                          | `DMS.FILE.VALIDATE_VIDEO`                      | read   |
| `POST /iam-admin/MemberRole/Assign`                     | `IAM.MEMBER_ROLE.ASSIGN`                       | write  |
| `POST /iam-admin/MemberRole/Query`                      | `IAM.MEMBER_ROLE.QUERY`                        | read   |
| `POST /iam-admin/MemberRole/Revoke`                     | `IAM.MEMBER_ROLE.REVOKE`                       | write  |
| `POST /iam-admin/Membership/QueryUsers`                 | `IAM.MEMBERSHIP.QUERY_USERS`                   | read   |
| `POST /iam-admin/Organization/Query`                    | `IAM.ORGANIZATION.QUERY`                       | read   |
| `POST /iam-admin/Position/Query`                        | `IAM.POSITION.QUERY`                           | read   |
| `POST /iam-admin/RolePermission/QueryRoles`             | `IAM.ROLE_PERMISSION.QUERY_ROLES`              | read   |
| `POST /iam-admin/Tenant/Query`                          | `IAM.TENANT.QUERY`                             | read   |
| `POST /iam-admin/TrainingArchive/ArchiveDetail`         | `IAM.TRAINING_ARCHIVE.ARCHIVE_DETAIL`          | read   |
| `POST /iam-admin/TrainingArchive/Archives`              | `IAM.TRAINING_ARCHIVE.ARCHIVES`                | read   |
| `POST /iam-admin/TrainingArchive/CourseResults`         | `IAM.TRAINING_ARCHIVE.COURSE_RESULTS`          | read   |
| `POST /iam-admin/TrainingArchive/EmployeeTasks`         | `IAM.TRAINING_ARCHIVE.EMPLOYEE_TASKS`          | read   |
| `POST /iam-admin/TrainingArchive/ExamHistory`           | `IAM.TRAINING_ARCHIVE.EXAM_HISTORY`            | read   |
| `POST /iam-admin/TrainingArchive/ExamSnapshot`          | `IAM.TRAINING_ARCHIVE.EXAM_SNAPSHOT`           | read   |
| `POST /iam-admin/TrainingCourse/ChangeStatus`           | `IAM.TRAINING_COURSE.CHANGE_STATUS`            | write  |
| `POST /iam-admin/TrainingCourse/Copy`                   | `IAM.TRAINING_COURSE.COPY`                     | write  |
| `POST /iam-admin/TrainingCourse/Create`                 | `IAM.TRAINING_COURSE.CREATE`                   | write  |
| `POST /iam-admin/TrainingCourse/Detail`                 | `IAM.TRAINING_COURSE.DETAIL`                   | read   |
| `POST /iam-admin/TrainingCourse/Query`                  | `IAM.TRAINING_COURSE.QUERY`                    | read   |
| `POST /iam-admin/TrainingCourse/Update`                 | `IAM.TRAINING_COURSE.UPDATE`                   | write  |
| `POST /iam-admin/TrainingExam/ChangeStatus`             | `IAM.TRAINING_EXAM.CHANGE_STATUS`              | write  |
| `POST /iam-admin/TrainingExam/Create`                   | `IAM.TRAINING_EXAM.CREATE`                     | write  |
| `POST /iam-admin/TrainingExam/Detail`                   | `IAM.TRAINING_EXAM.DETAIL`                     | read   |
| `POST /iam-admin/TrainingExam/Query`                    | `IAM.TRAINING_EXAM.QUERY`                      | read   |
| `POST /iam-admin/TrainingExam/Update`                   | `IAM.TRAINING_EXAM.UPDATE`                     | write  |
| `POST /iam-admin/TrainingExport/ExportEmployeeArchives` | `IAM.TRAINING_EXPORT.EXPORT_EMPLOYEE_ARCHIVES` | read   |
| `POST /iam-admin/TrainingExport/ExportExamMaterials`    | `IAM.TRAINING_EXPORT.EXPORT_EXAM_MATERIALS`    | read   |
| `POST /iam-admin/TrainingExport/ExportTaskLedger`       | `IAM.TRAINING_EXPORT.EXPORT_TASK_LEDGER`       | read   |
| `POST /iam-admin/TrainingOverview/Incomplete`           | `IAM.TRAINING_OVERVIEW.INCOMPLETE`             | read   |
| `POST /iam-admin/TrainingOverview/Overview`             | `IAM.TRAINING_OVERVIEW.OVERVIEW`               | read   |
| `POST /iam-admin/TrainingOverview/Trends`               | `IAM.TRAINING_OVERVIEW.TRENDS`                 | read   |
| `POST /iam-admin/TrainingPaper/ChangeStatus`            | `IAM.TRAINING_PAPER.CHANGE_STATUS`             | write  |
| `POST /iam-admin/TrainingPaper/Create`                  | `IAM.TRAINING_PAPER.CREATE`                    | write  |
| `POST /iam-admin/TrainingPaper/Detail`                  | `IAM.TRAINING_PAPER.DETAIL`                    | read   |
| `POST /iam-admin/TrainingPaper/Query`                   | `IAM.TRAINING_PAPER.QUERY`                     | read   |
| `POST /iam-admin/TrainingPaper/Update`                  | `IAM.TRAINING_PAPER.UPDATE`                    | write  |
| `POST /iam-admin/TrainingPlan/Create`                   | `IAM.TRAINING_PLAN.CREATE`                     | write  |
| `POST /iam-admin/TrainingPlan/Delete`                   | `IAM.TRAINING_PLAN.DELETE`                     | write  |
| `POST /iam-admin/TrainingPlan/Detail`                   | `IAM.TRAINING_PLAN.DETAIL`                     | read   |
| `POST /iam-admin/TrainingPlan/Publish`                  | `IAM.TRAINING_PLAN.PUBLISH`                    | write  |
| `POST /iam-admin/TrainingPlan/Query`                    | `IAM.TRAINING_PLAN.QUERY`                      | read   |
| `POST /iam-admin/TrainingPlan/Update`                   | `IAM.TRAINING_PLAN.UPDATE`                     | write  |
| `POST /iam-admin/TrainingPlanEmployee/BatchAdd`         | `IAM.TRAINING_PLAN_EMPLOYEE.BATCH_ADD`         | write  |
| `POST /iam-admin/TrainingPlanEmployee/BatchExit`        | `IAM.TRAINING_PLAN_EMPLOYEE.BATCH_EXIT`        | write  |
| `POST /iam-admin/TrainingPlanEmployee/Exit`             | `IAM.TRAINING_PLAN_EMPLOYEE.EXIT`              | write  |
| `POST /iam-admin/TrainingPlanEmployee/History`          | `IAM.TRAINING_PLAN_EMPLOYEE.HISTORY`           | read   |
| `POST /iam-admin/TrainingPlanEmployee/Query`            | `IAM.TRAINING_PLAN_EMPLOYEE.QUERY`             | read   |
| `POST /iam-admin/TrainingPlanEmployee/Rejoin`           | `IAM.TRAINING_PLAN_EMPLOYEE.REJOIN`            | write  |
| `POST /iam-admin/TrainingQuestion/ChangeStatus`         | `IAM.TRAINING_QUESTION.CHANGE_STATUS`          | write  |
| `POST /iam-admin/TrainingQuestion/Create`               | `IAM.TRAINING_QUESTION.CREATE`                 | write  |
| `POST /iam-admin/TrainingQuestion/Detail`               | `IAM.TRAINING_QUESTION.DETAIL`                 | read   |
| `POST /iam-admin/TrainingQuestion/Query`                | `IAM.TRAINING_QUESTION.QUERY`                  | read   |
| `POST /iam-admin/TrainingQuestion/Update`               | `IAM.TRAINING_QUESTION.UPDATE`                 | write  |
| `POST /iam-admin/TrainingStatistics/CourseStatistics`   | `IAM.TRAINING_STATISTICS.COURSE_STATISTICS`    | read   |
| `POST /iam-admin/TrainingStatistics/ExamStatistics`     | `IAM.TRAINING_STATISTICS.EXAM_STATISTICS`      | read   |
| `POST /iam-admin/TrainingStatistics/OverdueStatistics`  | `IAM.TRAINING_STATISTICS.OVERDUE_STATISTICS`   | read   |
| `POST /iam-admin/TrainingStatistics/TaskStatistics`     | `IAM.TRAINING_STATISTICS.TASK_STATISTICS`      | read   |
| `POST /iam-admin/TrainingTask/Create`                   | `IAM.TRAINING_TASK.CREATE`                     | write  |
| `POST /iam-admin/TrainingTask/Delete`                   | `IAM.TRAINING_TASK.DELETE`                     | write  |
| `POST /iam-admin/TrainingTask/Detail`                   | `IAM.TRAINING_TASK.DETAIL`                     | read   |
| `POST /iam-admin/TrainingTask/Query`                    | `IAM.TRAINING_TASK.QUERY`                      | read   |
| `POST /iam-admin/TrainingTask/Start`                    | `IAM.TRAINING_TASK.START`                      | write  |
| `POST /iam-admin/TrainingTask/Update`                   | `IAM.TRAINING_TASK.UPDATE`                     | write  |
| `POST /iam-admin/TrainingTaskEmployee/Query`            | `IAM.TRAINING_TASK_EMPLOYEE.QUERY`             | read   |

## 附加 AccessControl 审查

既有 RoleManagement 也纳入片段，但未扩大修改其 registry：角色详情/编辑打开使用当前行，没有 Detail 请求；queryRoles 为 QueryRoles；submitRole 为 CreateRole 或 UpdateRole 后 QueryRoles；submitStatus 为 ChangeRoleStatus 后 QueryRoles。生命周期同时读取 Tenant.Query，并经 getCurrentPageResourcesCached 检查角色授权入口（缓存 miss → CurrentPermissionResource.CurrentPageResources；命中则无网络）。导航只 router.push，不把目标页 API 混入源按钮。

## 核验与交接

- pnpm typecheck：通过（曾发现本次 Statistics 条件 marker 被模板分支收窄导致 TS2367，改为分支对应 marker 后重跑通过）。
- 本次拥有的 Vue/registry/routes 定向 eslint --max-warnings=0：通过。
- premium audit_project.py --mode strict --no-write：0 findings。
- readResourceRegistries + inspectResourceMarkers + snapshot.resolveEndpoint：最终复测为 29 页、498 个有效标记；新增接口均唯一映射（以当前检查器统计口径为准）。
- routes-communication 片段：schema、候选覆盖、源码 hash、依赖闭包、Function 精确匹配验证通过。shared provider 的依赖 hash 也包含在链中；任何依赖后续改变需复核/刷新。
- 未执行浏览器、未操作线上、未改后端。最终 build/UI build/Browser/Visual 结果请并入质量 Agent 报告。
