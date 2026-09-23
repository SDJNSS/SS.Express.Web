# 培训运营与档案统计 API

本文档是前端 Page Contract 可引用的仓库内 Training API 索引，不替代后端 DTO。接口均为 `POST /iam-admin/{Controller}/{Action}`，使用统一响应包与 Bearer Token；Tenant 只取登录上下文，调用方不得覆盖。

## 契约依据

本次用户附带的 `iam-api-documentation.md` 经核对仅包含 IAM 基础能力，不包含 Training Controller、Training DTO 或本次常设培训接口，因此不作为 Training 契约来源。当前索引按以下后端实际实现维护：

- `D:/project/SS.Express.Platform/Doc/Engineering/training-standing-plan-api.md`
- `D:/project/SS.Express.Platform/Src/RPC/Contracts/IAM/TrainingOrchestrationContracts.cs`
- `D:/project/SS.Express.Platform/Src/RPC/Contracts/IAM/TrainingReportingContracts.cs`
- `D:/project/SS.Express.Platform/Src/IAM/Admin.Api/iam-resource-catalog.json`

若本索引与后端 contracts 不一致，以后端 contracts 为准并同步修订本文件；前端不得自行增加字段、枚举、接口或权限码。

## 计划与计划员工

| 用途                                   | Operation                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| 查询、详情、创建、编辑、发布、删除计划 | `TrainingPlan/Query`、`Detail`、`Create`、`Update`、`Publish`、`Delete`               |
| 查询计划员工及历史                     | `TrainingPlanEmployee/Query`、`History`                                               |
| 加入、退出、批量退出、重新加入员工     | `TrainingPlanEmployee/BatchAdd`、`Exit`、`BatchExit`、`Rejoin`                        |
| 选择 Tenant 用户                       | `Membership/QueryUsers`；提交 `user.id` 作为 `employee_id`，不得使用 `tenant_user_id` |

### 计划类型

`TrainingPlanListRequest` 新增可选 `plan_type`，并继续支持可选 `plan_year`。后端会分别按已传入的两个字段过滤；因此“全部类型”的默认查询必须同时省略 `plan_type` 与 `plan_year`，才能并存返回年度与常设计划。用户显式选择年度后再传 `plan_year`，前端不得额外对结果做客户端过滤。

计划创建/编辑及响应的关键字段：

| 字段         | 类型                           | 规则                                            |
| ------------ | ------------------------------ | ----------------------------------------------- |
| `plan_type`  | `ANNUAL \| STANDING`           | 旧调用方空值兼容为 `ANNUAL`；新页面必须显式提交 |
| `plan_year`  | `int?`                         | `STANDING` 必须为空                             |
| `plan_name`  | `string`                       | 两类计划均必需                                  |
| `start_at`   | `datetime`                     | 两类计划均必需                                  |
| `end_at`     | `datetime?`                    | `STANDING` 必须为空                             |
| `frequency`  | `MONTHLY \| QUARTERLY \| null` | `STANDING` 必须为空；年度计划沿用既有规则       |
| `updated_at` | `datetime`                     | 编辑、发布和删除时回传服务端值作乐观并发控制    |

`TrainingPlanResponse` 同时返回 `plan_type`、可空的年度/结束时间/频率，以及当前员工数和任务状态计数。`TrainingPlanDetailResponse` 额外返回 `historical_employee_count`。常设计划允许零员工配置与发布；年度计划继续遵守既有规则。

## 任务与长期任务

| 用途                                   | Operation                                                             |
| -------------------------------------- | --------------------------------------------------------------------- |
| 查询、详情、创建、编辑、删除、启动任务 | `TrainingTask/Query`、`Detail`、`Create`、`Update`、`Delete`、`Start` |
| 查询任务员工及聚合下钻                 | `TrainingTaskEmployee/Query`                                          |
| 课程/考试候选和只读详情                | `TrainingCourse/Query`、`Detail`；`TrainingExam/Query`、`Detail`      |

任务创建/编辑及响应的关键字段：

| 字段              | 类型                                | 规则                                                  |
| ----------------- | ----------------------------------- | ----------------------------------------------------- |
| `task_type`       | `MONTHLY \| QUARTERLY \| TEMPORARY` | 长期任务必须是 `TEMPORARY`                            |
| `period_key`      | `string`                            | 月度/季度任务显式提交；`TEMPORARY` 留空并由服务端生成 |
| `is_long_running` | `bool`                              | 仅常设计划的 `TEMPORARY` 任务可为 `true`              |
| `start_at`        | `datetime`                          | 必需                                                  |
| `deadline_at`     | `datetime?`                         | 长期任务必须为空                                      |
| `period_end_at`   | `datetime?`                         | 长期任务响应为空                                      |
| `content_version` | `int`                               | 服务端维护；新轮次固化当前版本，历史轮次不随任务更新  |
| `exam_id`         | `int64`                             | 每个执行轮次固化自己的考试快照                        |
| `request_id`      | `string`                            | 创建任务幂等键；不确定结果重试必须复用原值            |

长期任务无截止时间、不进入逾期或自动完成推进，零员工时可开放；完成率达到 100% 也保持可继续接收新轮次的 `ACTIVE` 状态。已开放长期任务可编辑，修改后的课程/考试只影响后续新分配轮次。被历史执行引用的考试配置不能原位编辑或停用，应新建考试配置后更新任务。

任务详情的课程人数继续使用 `required_employee_count`、`not_started_employee_count`、`learning_employee_count`、`completed_employee_count`、`completion_rate`；考试人数使用 `required_employee_count`、`not_started_employee_count`、`in_progress_employee_count`、`examined_employee_count`、`not_examined_employee_count`、`examination_rate`、`passed_employee_count`、`failed_employee_count`、`pass_rate`。这些统计均来自服务端。

## 任务员工与多轮执行

`TrainingTaskEmployee/Query` 使用 `TrainingTaskEmployeeListRequest`，支持任务、员工、是否必修、培训状态、课程状态、考试状态、员工名称以及课程/考试下钻条件。返回 `{ training_task_id, statistics, employees }`，其中每条 `TrainingTaskEmployeeResponse` 包含：

- 标识：`id`、`training_id`、`training_task_id`、`employee_id`；
- 执行：`execution_no`、`assignment_type`、`assignment_request_id`、`assigned_at`；
- 内容快照：`content_version`、`exam_id`；
- 状态：`is_required`、`status`、`excluded_at`、`ever_overdue`、`overdue_at`、`completed_at`；
- 真实学习考试：`total_learning_seconds`、`learned_course_count`、`course_count`、`course_learning_status`、`exam_status`、`final_employee_exam_id`、`final_score`、`final_passed`；
- 完成来源：`completion_source`（`NORMAL` / `ADMIN`）、`admin_completed_by`、`admin_completed_at`、`admin_completion_reason`；
- 服务端动作能力：`can_admin_complete`、`can_arrange_again`；
- 员工资料：`profile`。

`assignment_type` 固定为 `PLAN`、`ONBOARDING`、`RETURN_TO_WORK` 或 `MANUAL`。同一任务、同一员工可以存在多个 `execution_no`；页面不得按员工 ID 合并或覆盖历史轮次。

## 入职培训自动纳入

| Operation                          | 权限码                           | 请求/响应要点                                                      |
| ---------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `TrainingAutoEnrollment/QueryRule` | `iam:training:onboarding:view`   | 空请求；返回当前 Tenant 唯一规则或 `null`                          |
| `TrainingAutoEnrollment/SaveRule`  | `iam:training:onboarding:update` | `training_id`、`training_task_id`、`is_enabled`、可空 `updated_at` |
| `TrainingAutoEnrollment/QueryJobs` | `iam:training:onboarding:view`   | 分页，可按 `job_status`、`employee_id` 查询                        |
| `TrainingAutoEnrollment/RetryJob`  | `iam:training:onboarding:retry`  | `id`、`updated_at`；只重试指定失败作业                             |

规则响应字段为 `id`、`tenant_id`、`training_id`、`training_task_id`、`plan_name`、`task_name`、`rule_type`、`is_enabled`、`enabled_at`、`updated_at`。首次创建时 `updated_at=null`；更新既有规则时原样回传查询结果中的 `updated_at`。

作业响应字段为 `id`、`rule_id`、`tenant_user_id`、`employee_id`、`membership_created_at`、`status`、`attempt_count`、`next_retry_at`、`last_error`、`training_task_employee_id`、`updated_at`。这里的 `tenant_user_id` 是后台作业追踪字段，不改变前端人员选择和培训业务继续使用 `employee_id = iam_user.id` 的约定。

启用或切换目标会以服务端当前时间建立新基线，只发现 `enabled_at` 后首次生效的成员关系；不补录既有员工。恢复历史成员关系会由后端记录为 `SKIPPED`，不会被当成首次入职。停止接收新人不使用新接口，而是调用 `SaveRule` 将 `is_enabled=false`；既有员工执行不受影响。

## 返岗培训与管理员完成

### 安排返岗培训

- Operation：`TrainingTaskEmployee/ArrangeReturnToWork`
- 权限码：`iam:training:return-to-work:arrange`
- 请求：`training_task_id`、`employee_id`、`request_id`、`reason`
- 约束：目标为当前 Tenant 有效员工与已开放长期任务；每个新 `request_id` 创建新轮次，相同请求重试返回原轮次。

### 管理员完成指定轮次

- Operation：`TrainingTaskEmployee/AdminComplete`
- 权限码：`iam:training:task-employees:admin-complete`
- 请求：`training_task_employee_id`、`updated_at`、`request_id`、`reason`
- 约束：精确修改一条执行轮次，同时校验 Function、Tenant、乐观并发和幂等键；已完成记录不得重复操作。

两项操作均返回 `TrainingTaskEmployeeMutationResponse`：`training_task_employee_id`、`training_task_id`、`employee_id`、`execution_no`、`assignment_type`、`status`、`completion_source`、`completed_at`、`idempotent`、`updated_at`。

管理员完成只写培训完成状态、完成来源与审计信息，不创建或修改课程进度、学习时长、答题、分数或通过结果，也不自动办理复岗。前端按钮必须同时满足本地 Function 权限与记录级 `can_admin_complete=true`；失败时保留原因与幂等键供安全重试。

> Production Binding 阻断：当前后端 `TrainingTaskEmployeeAdminCompleteRequest` 要求回传 `updated_at`，但已核对的 `TrainingTaskEmployeeResponse` 尚未返回该字段。后端需在任务员工查询行中补充当前执行记录的 `updated_at`（ISO 8601），否则前端无法取得可信乐观锁值，不能通过自行生成时间戳规避并发校验。

## 概览、档案、统计与导出

| 页面         | Operation                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| 培训概览     | `TrainingOverview/Overview`、`Trends`、`Incomplete`                                                          |
| 员工培训档案 | `TrainingArchive/Archives`、`ArchiveDetail`、`EmployeeTasks`、`CourseResults`、`ExamHistory`、`ExamSnapshot` |
| 专项统计     | `TrainingStatistics/TaskStatistics`、`CourseStatistics`、`ExamStatistics`、`OverdueStatistics`               |
| 导出         | `TrainingExport/ExportTaskLedger`、`ExportEmployeeArchives`、`ExportExamMaterials`                           |

所有报表接口共用 `TrainingReportRequest`。除既有分页、关键字、计划/任务/员工/组织/岗位/时间/状态/课程/考试筛选外，新增：

- `execution_no`
- `assignment_type`
- `completion_source`
- `assigned_at_from`
- `assigned_at_to`

响应 `scope` 回显以上筛选。`TrainingPopulationStatisticsResponse.employee_task_count` 表示员工×任务执行次数，`distinct_employee_count` 表示去重员工数；其他人数默认均为执行人次，页面必须明确标注口径。

任务统计行、考试统计行与员工任务记录返回 `plan_type`、可空 `plan_year`、可空 `deadline_at`；员工任务记录继承完整多轮执行与管理员完成字段。课程结果和考试历史返回 `execution_no`、`assignment_type`、`content_version`，用于核对历史内容快照。员工计划历史返回 `plan_type` 与可空年度。

### 概览下钻

`TrainingOverview/Incomplete` 的 `drilldown_scope`：

- `INCOMPLETE`：当前未完成，与概览 `incomplete_count` 同口径；
- `CURRENT_OVERDUE`：当前逾期且未完成；
- `EVER_OVERDUE`：历史曾逾期。

长期任务无截止时间，不进入当前或曾逾期结果。人员任务行返回 `first_learning_at`。

### 员工档案

`TrainingArchive/Archives` 支持组织、岗位、最终是否通过及新增多轮执行筛选；档案行返回 `latest_training_at`。组织和岗位选项分别来自 `Organization/Query` 与 `Position/Query`，且必须限定当前 Tenant。档案详情保留每个返岗轮次以及管理员完成操作人、时间和原因，不得把同一员工的多轮执行折叠为一条。

### 专项统计

- `TaskStatistics` 返回任务分页明细和全量筛选范围的 `summary`；培训完成包含 `ADMIN`，但学习与考试字段仍使用真实记录。
- `CourseStatistics` 返回课程分页明细；人数下钻用 `TrainingTaskEmployee/Query` 并传对应 `course_id` 与学习状态。
- `ExamStatistics` 返回 `{ summary, items, total, page_index, page_size }`；人数下钻用 `TrainingTaskEmployee/Query` 并传对应 `exam_id` 与考试状态。
- `OverdueStatistics` 返回首次逾期分布与 `duration_distribution`；长期任务不进入逾期统计。稳定区间为 `LT_1_DAY`、`DAY_1_TO_3`、`DAY_3_TO_7`、`GTE_7_DAYS`。

### 导出口径

导出使用同一 `TrainingReportRequest` 筛选，并保留执行轮次、分配来源、完成来源和管理员完成审计字段。管理员完成计入培训完成，但不得把课程完成率、考试提交率、分数或通过率一并改写为 100%。

## 运行约束

- `updated_at` 是服务端乐观并发时间戳，前端以 ISO 8601 字符串原样回传，不自行生成或改写。
- `content_version`、`execution_no` 及服务端 ID 均以 DTO 类型传输；ID 遵守项目 `int64` 安全传输约束，不做精度有损转换。
- MONTHLY/QUARTERLY 任务必须提交合法 `period_key`；TEMPORARY 不提交周期键。
- 所有 `request_id` 都是幂等键；结果不确定或失败重试时复用原值，成功或明确放弃后才生成新值。
- 页面不得推导服务端业务状态；完成率、逾期、考试结果、是否可管理员完成及是否可再次安排均以响应为准。
- 普通任务完成率分母为当前应培训员工；长期任务即使完成率 100% 仍可保持开放。分母为 0 时按服务端结果展示 100%，并标注“当前无人需要培训”。
- 员工考试最终状态优先级为 `PASSED > FAILED > IN_PROGRESS > NOT_STARTED`。
- Tenant 切换必须取消或失效旧请求，并清空员工候选、计划/任务候选、分页、详情与抽屉状态。
