# 培训资源与考试规则：正式页面接口

## 来源与范围

2026-09-17 核对后端 `SS.Express.Platform/Src/RPC/Contracts/IAM/TrainingManagementContracts.cs`，以及 IAM 的 TrainingCourse、TrainingQuestion、TrainingPaper、TrainingExam Controller/Service 实现。

四个页面复用已确认的 Canonical Page View；生产 Binding 位于 `src/features/training/content-exam/pages/`，真实调用集中在同 Feature 的 `api/trainingContentApi.ts`。Preview 保留静态 Fixture，不访问业务接口。

本文更新至2026-10-24。本轮只更新前端及离线声明，不初始化数据库、同步在线资源或分配权限；在线维护由专门会话负责。以下最终题集契约覆盖文末早期验证记录中的旧组卷说明。

## 页面与接口

全部为 POST，统一服务前缀 `/iam-admin`。Host 继续使用项目服务配置，Authorization、错误响应与 request-id 由公共 HTTP 层处理。

| 页面         | 正式路由                  | component                                           | 接口与用途                                                                                                                                 |
| ------------ | ------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 课程管理     | `/iam/training/courses`   | `training/content-exam/pages/CourseManagementPage`  | `/TrainingCourse/Query` 查询分页；`Detail` 详情与编辑回填；`Create` 创建草稿；`Update` 修改；`Copy` 复制；`ChangeStatus` 启停              |
| 题库管理     | `/iam/training/questions` | `training/content-exam/pages/QuestionBankPage`      | `/TrainingQuestion/Query` 查询分页；`Detail` 读取选项答案解析；`Create` 创建；`Update` 修改；`ChangeStatus` 启停                           |
| 试卷管理     | `/iam/training/papers`    | `training/content-exam/pages/PaperManagementPage`   | `/TrainingPaper/Query, Detail, Create, Update, ChangeStatus, GeneratePreview`；另用 `/TrainingQuestion/Query` 分页选题及按题型读取可用数量 |
| 考试配置管理 | `/iam/training/exams`     | `training/content-exam/pages/ExamConfigurationPage` | `/TrainingExam/Query, Detail, Create, Update, ChangeStatus`；另用 `/TrainingPaper/Query, Detail` 选择启用试卷、保留原关联试卷              |

这些均为 Menu 页面；详情、创建、编辑是页内 Drawer，不增加独立 Page 路由。

## 写操作模型

### 2026-10-24 选题与最终题集契约

- 试卷选题抽屉复用 `POST /iam-admin/TrainingQuestion/Query`，传 `question_type, keyword, status=ACTIVE, page_index, page_size=20`。输入后显式搜索/Enter，IME组合不触发；按题型切换/分页也查询，关闭、替换请求或上下文变化作废旧响应。仅使用题干摘要字段，不额外获取正确答案/解析。
- 新建/编辑的候选查询与随机预览分别检查本页 create/update 精确能力。Question Query 的 `updated_at`、预览/详情的 `question_updated_at` 均保持原字符串，不截断精度。
- 多选题允许至少一个正确答案，至少三个选项，Create/Update DTO 不变；已核对本地后端实现同步放宽。是否部署到实际运行环境仍须联调确认。
- `POST /iam-admin/TrainingPaper/GeneratePreview` 只读、不保存试卷。请求为 `total_score` 及 `groups[{question_type,count,total_score}]`，零题型总分传 null。前端显式点击才调用，不在打开已有试卷、保存、读取详情时调用。服务器从当前 Tenant 的完整启用题库抽样，响应返回 `paper_mode,total_score,questions,groups`；不返回答案、解析。
- `questions` 每项包含 `question_id,question_type,question_text,question_status,question_score,sort_order,question_updated_at`。`groups` 每项包含 `question_type,count,total_score,question_score`。编辑状态使用这份具体题集，移除/替换不重新抽取；失败保留规则，关闭或上下文变化取消并作废旧结果。
- Create/Update 的 FIXED、RANDOM **统一提交 `questions[{question_id,question_score,sort_order,question_type,question_updated_at}]`**；不提交 `fixed_questions`、旧题量/单题分数字段或规则代替题集。至少1题、最多1000题，ID及排序不重复，每题分值为正且最多两位小数；同题型分值相同，合计等于目标总分。总分不超过1,000,000。题型总分按整数百分单位精确均分，不四舍五入或补尾差。
- Detail 返回上述具体 `questions`、`groups`、随机顺序开关及 `is_configuration_valid,configuration_invalid_reason`；Query 返回 `question_count` 摘要。RANDOM 只说明初稿来源，不表示读取或考试重新抽题。前端不按旧规则回退。
- 用户2026-10-24明确：旧数据将全部清除，不再兼容旧规则随机卷或同型不等分旧固定卷。清理由用户/后端负责，前端不清数据、不自动迁移。
- 后端校验实际题型、题目版本、Tenant、可用状态与试卷并发时间戳；原有停用题可按契约保留，新选/替换题必须启用。版本或可用性冲突保留草稿并显示错误，不自动换题、重抽、刷新版本或重试写入。错误包括 `PAPER_QUESTION_CHANGED`、`PAPER_QUESTION_UNAVAILABLE`、`PAPER_VERSION_CONFLICT`、`PAPER_SCORE_NOT_DIVISIBLE`、`PAPER_TOTAL_MISMATCH`、`PAPER_FINAL_SET_REQUIRED` 等，沿用公共错误信封。

来源：本地后端 `Src/RPC/Contracts/IAM/TrainingPaperSelectionContracts.cs`、`TrainingManagementContracts.cs`，`TrainingPaperController.cs`、`TrainingPaperServiceImpl.cs`、`.Selection.cs` 和 `TrainingPaperSelectionRules.cs`，以及 Admin.Api 权威 Function 目录。新 Function 为 `IAM.TRAINING_PAPER.GENERATE_PREVIEW`（read/business/composable，非 SA 专属）；仅加入实际调用的新建/编辑 Permission 模板，不加入普通查看。已导入本地权威快照，不代表在线资源已同步。

- 通用 Query：`page_index, page_size, keyword, status`；课程另含 `training_type, is_locked`，题目另含 `question_type`，试卷另含 `paper_mode`。
- Detail：`id`。
- Update：Create 的全部字段 + `id, updated_at`。
- ChangeStatus：`id, updated_at, target_status`（ACTIVE / DISABLED）。
- **updated_at 原字符串完整回传，不转 Date、不截断精度、不改用 version。**
- 课程：`course_name, training_type, introduction, planned_learning_seconds, video_file_id`。视频通过公共 DMS FileUploader 上传、校验并读取时长。后端最终校验视频有效性与计划时长。
- 复制课程：只有 `source_course_id`；副本名称由服务端生成。
- 题目：`question_type, question_text, explanation, options[]`。选项为 `option_code, option_text, is_correct, sort_order`。
- 试卷：`paper_name, paper_mode, total_score, random_question_order, random_option_order, questions[]`，最终题集格式和随机初稿契约见上节。
- 考试配置：`exam_name, paper_id, duration_seconds, pass_score, max_attempts, show_correct_answer, show_explanation`。

所有 DTO 字段定义在 `types/trainingContentContracts.ts`，以接口 snake_case 为准。Tenant 由认证上下文确定，页面不允许手填越租户参数。

## 与 Preview 的必要差异

- 题目列表响应不提供选项，选项数显示“—”；进入详情/编辑才读取真实选项与解析。
- 试卷、考试配置接口没有说明字段，正式编辑不显示该输入框。
- 考试配置响应没有试卷状态，不伪造 ACTIVE；编辑时读取原关联试卷详情，允许保留既有停用试卷，但新选择仅 ACTIVE。
- 课程接口不提供文件名称、大小、处理状态；正式详情自动从 DMS GetAccessUrl 读取真实名称、大小、缩略图并预加载，不自动播放，不以文件 ID 冒充名称或伪造处理状态。
- 试卷可用题量来自按题型的服务端 Query.total，不以当前页长度或 Fixture 数量替代。
- 查询和页码保存到 URL；新建/编辑成功打开返回的详情，后台刷新失败不会自动重发已完成的写请求。
- 保存失败保留输入，状态变更失败保留确认框；重复提交禁止，关闭脏表单需要确认。

## 待登记的权限点

运行时通过 CurrentPageResources 获取本页精确资源集合，旧 UI 常量仅经显式资源适配，不再调用 CurrentFunctions。未授权的写按钮禁用，未取得查看权限不请求业务列表。前端定义权限名不是授予权限，后端仍是最终授权方。

| 页面前缀                 | Function 后缀                                       |
| ------------------------ | --------------------------------------------------- |
| `iam:training:courses`   | `view`, `create`, `update`, `copy`, `change-status` |
| `iam:training:questions` | `view`, `create`, `update`, `change-status`         |
| `iam:training:papers`    | `view`, `create`, `update`, `change-status`         |
| `iam:training:exams`     | `view`, `create`, `update`, `change-status`         |

Query 与 Detail 可映射到各自 view Function；试卷维护还需要题目 Query 权限，考试配置维护还需要试卷 Query/Detail 权限，课程维护需要现有 DMS 上传及视频校验权限。后端按实际接口授权机制登记关联。

### 页面权限加载时序修复（2026-10-23）

- 课程、题库、试卷、考试配置共用 `useTrainingContent`。路由守卫等待目标页 CurrentPageResources 时会清空权限快照，但旧组件仍挂载；旧监听把未就绪当成拒绝访问，未发出业务请求就显示权限错误及列表失败。
- 控制器绑定注册表中的固定页面资源码；权限快照未就绪、属于其他页面或路由尚未提交时，只保持加载、停止请求并作废旧响应，不执行列表查询。成功路由提交后才用最终 URL 条件查询一次。真实无权限及权限服务异常继续由原守卫拦截，业务 Query 的真实失败仍显示错误并可重试。
- 导航目录加载不是业务数据范围变化。导航快照仍用于观察会话变化，但数据 scope 只绑定实际用户、Tenant 和会话版本，不因框架菜单初始化重复查询；读写操作仍检查本页精确权限，不从导航或 SA 身份补权。
- 两个同步清理监听合并：上下文变化或失去本页访问权限时立即取消请求、递增代次、清空旧结果/错误；卸载时注销权限订阅及 afterEach。共享权限快照增加本地 loadingReason（navigation/refresh），守卫显式标记 navigation；原地权限刷新仍等待新快照，但不等待不存在的路由提交。既有请求、Function、资源码和 Permission 模板不变，仅复核五处源码及其依赖通信证据，不写入数据库。
- 回归见 `tests/visual/training-permission-loading.spec.ts`：三视口慢权限响应、同页筛选及返回、权限缓存、快速切页、真实拒绝与失败重试；受控模拟接口不代表真实账户授权验收。Browser plugin 不可用，ego-browser CLI 未安装，使用项目 Playwright。

## 验证与审批边界

`tests/visual/training-content-production.spec.ts` 使用受控模拟接口验证正式 Binding；不代表已在真实后端完成联调。`training-content-exam-previews.spec.ts` 继续验证原型隔离和交互。

题库、试卷 Page Contract 本次更新至 revision 5；正式 Binding/API 与接口差异已登记。原 revision 1 的人工审批、截图基线没有自行覆盖或重新 approved。当前 production profile 仍需补充人工确认，并核验菜单/Function 登记、真实部署及授权；受控测试不能替代这些验收。

### 本次验证记录（2026-09-17）

- `pnpm quality`：Lint、标准/资源目录只读检查、39 项治理测试、生产/UIDesign/测试类型检查、生产与 UIDesign 构建通过。浏览器套件 365 项通过、18 项跳过、10 项失败；失败均为本次未修改的 IAM 页面与旧截图基线不一致，没有重录基线。
- 失败基线：`iam-application-resources`（1366）；`iam-membership-management`、`iam-role-function-permissions`、`iam-tenant-management`（各 1366/1440/1920）。四个培训页的 approved Preview 基线均通过。
- 最终定向复验：`pnpm exec playwright test tests/visual/training-content-production.spec.ts tests/visual/training-content-exam-previews.spec.ts`，29 项通过、16 项跳过。布局覆盖 1366×768、1440×900、1920×1080；生产写操作交互集中在 1440，其他视口跳过重复交互。
- 覆盖：四页 Query/Detail/Update、分页与浏览器返回、失败保留输入、脏表单关闭确认、权限禁用、课程 Copy、DMS Upload/ValidateVideo 后创建课程、题目/试卷/考试 Create、随机组卷题量与空分值、考试反馈开关独立提交、防重复提交及状态变更失败恢复。
- 最终 `pnpm lint`、`pnpm typecheck`、`pnpm test:typecheck`、`pnpm build` 通过；Premium 严格静态审计 0 项发现。抽查正式页面浏览器截图，没有新增横向溢出或布局断裂。
- 已知项目告警：主按钮既有颜色对比度 4.30:1；构建存在大 chunk 提醒。本次未改变全局 Token 或打包策略。
- 测试使用模拟接口，不写入真实业务数据；尚未验证真实账户授权、真实视频处理及真实服务端写入。
