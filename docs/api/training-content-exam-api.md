# 培训资源与考试规则：正式页面接口

## 来源与范围

2026-09-17 核对后端 `SS.Express.Platform/Src/RPC/Contracts/IAM/TrainingManagementContracts.cs`，以及 IAM 的 TrainingCourse、TrainingQuestion、TrainingPaper、TrainingExam Controller/Service 实现。

四个页面复用已确认的 Canonical Page View；生产 Binding 位于 `src/features/training/content-exam/pages/`，真实调用集中在同 Feature 的 `api/trainingContentApi.ts`。Preview 保留静态 Fixture，不访问业务接口。

本次不生成、不初始化权限资源 JSON。后端资源登记由用户另行安排。

## 页面与接口

全部为 POST，统一服务前缀 `/iam-admin`。Host 继续使用项目服务配置，Authorization、错误响应与 request-id 由公共 HTTP 层处理。

| 页面         | 正式路由                  | component                                           | 接口与用途                                                                                                                    |
| ------------ | ------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 课程管理     | `/iam/training/courses`   | `training/content-exam/pages/CourseManagementPage`  | `/TrainingCourse/Query` 查询分页；`Detail` 详情与编辑回填；`Create` 创建草稿；`Update` 修改；`Copy` 复制；`ChangeStatus` 启停 |
| 题库管理     | `/iam/training/questions` | `training/content-exam/pages/QuestionBankPage`      | `/TrainingQuestion/Query` 查询分页；`Detail` 读取选项答案解析；`Create` 创建；`Update` 修改；`ChangeStatus` 启停              |
| 试卷管理     | `/iam/training/papers`    | `training/content-exam/pages/PaperManagementPage`   | `/TrainingPaper/Query, Detail, Create, Update, ChangeStatus`；另用 `/TrainingQuestion/Query` 分页选题及按题型读取可用数量     |
| 考试配置管理 | `/iam/training/exams`     | `training/content-exam/pages/ExamConfigurationPage` | `/TrainingExam/Query, Detail, Create, Update, ChangeStatus`；另用 `/TrainingPaper/Query, Detail` 选择启用试卷、保留原关联试卷 |

这些均为 Menu 页面；详情、创建、编辑是页内 Drawer，不增加独立 Page 路由。

## 写操作模型

- 通用 Query：`page_index, page_size, keyword, status`；课程另含 `training_type, is_locked`，题目另含 `question_type`，试卷另含 `paper_mode`。
- Detail：`id`。
- Update：Create 的全部字段 + `id, updated_at`。
- ChangeStatus：`id, updated_at, target_status`（ACTIVE / DISABLED）。
- **updated_at 原字符串完整回传，不转 Date、不截断精度、不改用 version。**
- 课程：`course_name, training_type, introduction, planned_learning_seconds, video_file_id`。视频通过公共 DMS FileUploader 上传、校验并读取时长。后端最终校验视频有效性与计划时长。
- 复制课程：只有 `source_course_id`；副本名称由服务端生成。
- 题目：`question_type, question_text, explanation, options[]`。选项为 `option_code, option_text, is_correct, sort_order`。
- 试卷：`paper_name, paper_mode, total_score, random_question_order, random_option_order, fixed_questions[]`；固定题目为 `question_id, question_score, sort_order`；随机规则为 `single_choice_count/score, multiple_choice_count/score, true_false_count/score`。固定模式随机字段为 null；随机模式固定题目为空，题量为 0 的 score 为 null。
- 考试配置：`exam_name, paper_id, duration_seconds, pass_score, max_attempts, show_correct_answer, show_explanation`。

所有 DTO 字段定义在 `types/trainingContentContracts.ts`，以接口 snake_case 为准。Tenant 由认证上下文确定，页面不允许手填越租户参数。

## 与 Preview 的必要差异

- 题目列表响应不提供选项，选项数显示“—”；进入详情/编辑才读取真实选项与解析。
- 试卷、考试配置接口没有说明字段，正式编辑不显示该输入框。
- 考试配置响应没有试卷状态，不伪造 ACTIVE；编辑时读取原关联试卷详情，允许保留既有停用试卷，但新选择仅 ACTIVE。
- 课程接口不提供文件名称、大小、处理状态；正式详情展示文件 ID，缺失元数据明确标示，不伪造。
- 试卷可用题量来自按题型的服务端 Query.total，不以当前页长度或 Fixture 数量替代。
- 查询和页码保存到 URL；新建/编辑成功打开返回的详情，后台刷新失败不会自动重发已完成的写请求。
- 保存失败保留输入，状态变更失败保留确认框；重复提交禁止，关闭脏表单需要确认。

## 待登记的权限点

运行时通过框架 CurrentFunctions 读取权限，未授权的写按钮禁用，未取得查看权限不请求业务列表。前端定义权限名不是授予权限，后端仍是最终授权方。

| 页面前缀                 | Function 后缀                                       |
| ------------------------ | --------------------------------------------------- |
| `iam:training:courses`   | `view`, `create`, `update`, `copy`, `change-status` |
| `iam:training:questions` | `view`, `create`, `update`, `change-status`         |
| `iam:training:papers`    | `view`, `create`, `update`, `change-status`         |
| `iam:training:exams`     | `view`, `create`, `update`, `change-status`         |

Query 与 Detail 可映射到各自 view Function；试卷维护还需要题目 Query 权限，考试配置维护还需要试卷 Query/Detail 权限，课程维护需要现有 DMS 上传及视频校验权限。后端按实际接口授权机制登记关联。

## 验证与审批边界

`tests/visual/training-content-production.spec.ts` 使用受控模拟接口验证正式 Binding；不代表已在真实后端完成联调。`training-content-exam-previews.spec.ts` 继续验证原型隔离和交互。

Page Contract 升级到 revision 2，登记正式 Binding/API 和接口差异。原 revision 1 的人工审批、截图基线保持原样，没有自行覆盖或重新 approved。新 Contract 的 production profile 需补充人工确认；真实上线还需后端完成菜单/Function 登记与授权。

### 本次验证记录（2026-09-17）

- `pnpm quality`：Lint、标准/资源目录只读检查、39 项治理测试、生产/UIDesign/测试类型检查、生产与 UIDesign 构建通过。浏览器套件 365 项通过、18 项跳过、10 项失败；失败均为本次未修改的 IAM 页面与旧截图基线不一致，没有重录基线。
- 失败基线：`iam-application-resources`（1366）；`iam-membership-management`、`iam-role-function-permissions`、`iam-tenant-management`（各 1366/1440/1920）。四个培训页的 approved Preview 基线均通过。
- 最终定向复验：`pnpm exec playwright test tests/visual/training-content-production.spec.ts tests/visual/training-content-exam-previews.spec.ts`，29 项通过、16 项跳过。布局覆盖 1366×768、1440×900、1920×1080；生产写操作交互集中在 1440，其他视口跳过重复交互。
- 覆盖：四页 Query/Detail/Update、分页与浏览器返回、失败保留输入、脏表单关闭确认、权限禁用、课程 Copy、DMS Upload/ValidateVideo 后创建课程、题目/试卷/考试 Create、随机组卷题量与空分值、考试反馈开关独立提交、防重复提交及状态变更失败恢复。
- 最终 `pnpm lint`、`pnpm typecheck`、`pnpm test:typecheck`、`pnpm build` 通过；Premium 严格静态审计 0 项发现。抽查正式页面浏览器截图，没有新增横向溢出或布局断裂。
- 已知项目告警：主按钮既有颜色对比度 4.30:1；构建存在大 chunk 提醒。本次未改变全局 Token 或打包策略。
- 测试使用模拟接口，不写入真实业务数据；尚未验证真实账户授权、真实视频处理及真实服务端写入。
