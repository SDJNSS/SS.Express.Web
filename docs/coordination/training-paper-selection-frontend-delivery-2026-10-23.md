# 题库与试卷选题改造：前端交付及资源维护说明

更新日期：2026-10-24。接收方：培训后端、系统资源维护会话。

本轮仅修改前端代码、页面契约和离线声明；未修改后端、部署服务、清理数据库、同步在线资源或授予权限。用户已确认旧数据全部清除，不再兼容旧规则型随机卷或同题型不同分值旧固定卷；清理由用户/后端执行，不由前端执行。

## 一 功能结果

- `/iam/training/questions`：增加只读题目 ID；多选题允许一个或多个正确答案，仍至少三个选项。已核对本地后端同步放宽，实际运行环境另行联调。
- `/iam/training/papers`：固定组卷改为“选择题目”抽屉，题型 Tab、题干搜索及服务端分页，跨页/Tab保留勾选。确认才修改主表单；取消保留原选择。已选题按题型展示完整题干和 ID，可移除、跨题型替换、组内排序。
- 按题型总分精确均分至两位小数，不要求整数分。例如1/4=0.25、9.99/3=3.33合法，10/3不合法；不四舍五入、不补尾差。题数变化只清空受影响题型的总分，跨型替换清空来源及目标分组，同型同题数替换保留分数。
- 随机组卷正式接入只读 `GeneratePreview`：一次生成具体初稿，可人工调整；实际题型数量随之更新。重新设置抽题规则需确认清空人工调整，之后显式预览才再次抽取。
- 固定和随机统一保存具体 `questions`；每题携带实际题型、原始更新时间及分数和顺序。打开已有试卷、保存和回读均不调用预览；两个随机顺序开关独立，不改变题集。
- 编辑已保存的随机题集时，原题停用造成可用题量减少，也不会把已保存题量强制压小或丢题；只有重新抽取初稿才受当前启用候选数量限制。
- 读取失败可重试；预览失败保留规则；保存冲突保留题集、分数和表单，不自动换题、重抽或刷新版本。关闭、卸载或上下文变化取消/作废旧查询；预览进行中禁止重复调用，但允许取消并放弃草稿。
- `/iam/training/exams` 继续引用试卷，不另建选题流程。真正考试及重考不重抽，属于后端考试执行链验收，本轮受控前端测试不能替代该验收。

## 二 当前正式源码

仓库根目录：`D:/project/SS.Express.Web`。

| 内容                | 当前正式来源                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 题库入口/唯一视图   | `src/features/training/content-exam/pages/QuestionBankPage.vue` / `components/QuestionBankPageView.vue`                                             |
| 试卷入口/唯一视图   | `src/features/training/content-exam/pages/PaperManagementPage.vue` / `components/PaperManagementPageView.vue`                                       |
| 选题/已选分组       | 同 Feature `components/PaperQuestionPicker.vue`、`PaperQuestionGroups.vue`                                                                          |
| 计分与草稿状态      | 同 Feature `adapters/paperComposition.ts`、`composables/usePaperComposition.ts`                                                                     |
| 生产通信、DTO、适配 | 同 Feature `composables/useContentPages.ts`、`api/trainingContentApi.ts`、`types/trainingContentContracts.ts`、`adapters/trainingContentAdapter.ts` |
| 资源及元素          | 同 Feature `iam-resource.registry.ts`                                                                                                               |
| Page Contract       | `docs/page-specs/training-question-bank.yaml`、`training-paper-management.yaml`，均 revision 5                                                      |

`preview/TrainingContentPreviewPage.vue`、`paperSelection.fixture.ts`、`trainingContent.fixture.ts` 仅用于隔离 UI Design；生产不使用样例生成器或 Mock 回退。维护者扫描当前正式入口、Canonical View及依赖，不扫描归档旧页，不将 Preview 当作生产功能。

## 三 实际按钮与元素变化

**不新增独立业务 Button，不删除或重命名既有资源码。** 保留两页 Menu及各自 `.BUTTON.CREATE`、`.BUTTON.EDIT`、`.BUTTON.STATUS`。试卷继续使用 `IAM.TRAINING.PAPERS` 及其既有新建/编辑资源，Permission模板为 `training-paper-management.create`、`.edit`。

| resource_element                              | 控件和场景                                                            | 通信及归属                                                                |
| --------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `iam.training.papers.createOptions`           | 新建时打开选题或替换抽屉、按题型/题干搜索、清除、翻页、重试           | 既有 TrainingQuestion/Query；归属 CREATE                                  |
| `iam.training.papers.editOptions`             | 编辑时打开选题或替换抽屉并查询启用候选，同上                          | 既有 TrainingQuestion/Query；归属 EDIT                                    |
| `iam.training.papers.createSelection`（新增） | 新建草稿的勾选、确认替换/取消、移除、分组配分、排序、重新设置规则确认 | 本地草稿操作；归属 CREATE，不另造 API；打开替换抽屉属于上面的 Options查询 |
| `iam.training.papers.editSelection`（新增）   | 编辑草稿的上述操作                                                    | 本地草稿操作；归属 EDIT                                                   |
| `iam.training.papers.createPreview`（新增）   | 新建随机卷显式生成初稿，失败后重试                                    | GeneratePreview；归属 CREATE                                              |
| `iam.training.papers.editPreview`（新增）     | 编辑随机卷经确认重设规则后生成初稿                                    | GeneratePreview；归属 EDIT                                                |

原内联“查询题目”与多选下拉由“选择题目”抽屉替代，不保留重复旧控件。子组件使用正式父页面传入的资源描述符，DOM保留资源码、元素码及用途/场景说明，不自行拼接业务资源编码。题目 ID展示、分组、分页和本地编辑不创建独立 Permission；不新增 PermissionPackage。

新建/编辑打开表单时分别查询三类启用题目的可用总数；选题每次只查询当前题型、关键词及页码，每页20条，不一次加载整个题库、不读取答案解析。数据限定当前会话 Tenant，候选与预览分别检查本页 create/update 精确能力。

## 四 Function 及权限组合增量

新增且已经后端权威目录核实的 Function：

| 字段          | 值                                                                  |
| ------------- | ------------------------------------------------------------------- |
| resource_code | `IAM.TRAINING_PAPER.GENERATE_PREVIEW`                               |
| Method/Path   | `POST /iam-admin/TrainingPaper/GeneratePreview`                     |
| 属性          | read / business / composable=true；非 SA 专属、非 high-risk、active |
| 实际消费者    | `training-paper-management.create` 和 `.edit`                       |
| 不应增加到    | 普通试卷查看 Permission、无调用关系的页面或角色                     |

原 `IAM.TRAINING_QUESTION.QUERY` 继续为新建/编辑提供候选与题量读取；原 TrainingPaper Query/Detail/Create/Update/ChangeStatus、题库写入等身份不变。新建/编辑保留原通信并增加预览读取，不将“组卷预览”误识别为查看试卷或保存试卷。

权威快照已离线导入，180个 Function，较本轮开始增加上述1个；另4个既有 Function仅有后端描述更新：TrainingPaper Create/Detail/Update及DMS Upload，身份、Method/Path、鉴权类别等未改变。DMS描述随权威目录同步，不表示本轮新增上传行为。

接口全文及来源见 `docs/api/training-content-exam-api.md`。保存模型为 `questions[{question_id,question_score,sort_order,question_type,question_updated_at}]`，**不是 `fixed_questions` 或旧随机规则字段**。Update另外携带试卷原始 `updated_at`。后端拒绝冲突时不自动重试写入。

## 五 离线证据及验收边界

本轮有界复核13个生产源码：新增40个通信候选、移除12个，退役4条原内联选题入口链；新建选题查询链与随机预览链。检查每个新回调和请求后，更新24份源码及66条链的依赖绑定；新请求仅增加上述正式预览端点，不能把批量刷新哈希当作全量业务验收。

当前离线声明为1,667个候选、0个未解释项，27个登记页面、67个业务 Button、94个 Permission模板。`ready_for_sync=true`仅说明离线声明完整；`runtime_activation_ready=false`，不表示在线同步、角色授权或实际环境已验收。

- 最终三视口定向源码回归122项通过、16项按原配置跳过，包含30项本轮选题、正式随机生成、跨型调整、版本冲突、保存回显、失败重试与关闭取消用例。替换按钮资源归属已单独断言；当前可用题数为0时仍保留原停用题集及正确题量的边界也通过。
- 已通过：计分纯逻辑3项，严格静态 UI 审计0项发现；三视口人工查看本轮草稿截图，无新增裁切或横向溢出，短视口底部操作可达。
- 待人工复审候选：`UIDesign/candidates/training-paper-selection-20261024/`，三视口随机编辑状态及来源说明；候选不等于批准，未复制到 baselines。
- `pnpm quality`：Lint、治理测试、生产/UIDesign/测试类型检查、生产与UIDesign构建、生产路由测试通过；全量浏览器909项中804通过、24跳过、81失败。逐项比对本轮改造前记录，81个失败身份完全一致、无新增失败：75项 approved Preview截图、3项登录页生产截图、3项平台总览截图，未重录基线。
- 最后补准替换入口标记、修正已有题量回显后，再次执行 Lint、三类类型检查、生产及UIDesign构建和上述138项定向回归，全部检查通过（浏览器122通过、16原配置跳过）。严格静态 UI审计0项发现；未以这些定向结果宣称全量基线或生产审批已通过。
- Production profile仍存在既有资源登记待核验，以及人工 Approval/基线版本与最新 Page Contract 不一致的阻断；没有自行批准或重录截图基线。原有视觉基线失败不能靠擅自更新截图消除。
- Browser插件不可用、ego-browser CLI未安装，使用工程 Playwright；测试使用受控模拟接口，不写真实业务数据。实际服务部署、正式权限配置及考试执行链仍需各负责方联调。

资源维护者按批准范围核对上述增量后更新在线资源及 Permission组合即可；不要据本文擅自删除业务数据、重置资源目录或自动扩展角色权限。
