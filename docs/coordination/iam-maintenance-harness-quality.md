# IAM maintenance Harness 质量核对

日期：2026-09-27。范围：U4 截图差异、U5 培训概览横向溢出、U6 测试服务与工程质量，另提供 U1 用户管理通信审查片段。本专项没有修改 Approval Record、长期视觉基线或执行在线授权；仓库原有未提交视觉资产不属于本专项变更。

## 结论与已修复问题

- **U5 已修复并完成三视口复测。** 培训概览的说明条是 Dashboard flex 容器的直接子项，Element Plus 的 `width: 100%` 再叠加左右各 16px margin，实际将 Dashboard 撑宽 16px，越过 AppPage 的内边距后形成 4px 横向溢出。修复只在 `TrainingOverviewPageView.vue` 将该说明条设为 `width: auto`，保留说明全文、原间距、纵向滚动和页面密度。
- **U4 已完成分组定因，记录为独立视觉债务。** 历史 69 项对应 23 组 × 3 个视口，不能解读为 69 个独立代码缺陷。旧图存在共同的几何变化，也有已要求的业务内容变化。当前没有证据把它们全部归咎字体或运行环境。没有为了匹配旧图回退紧凑设计。
- **U6 已处理服务归属和 HMR 风险；不宣称全量质量全绿。** 专用端口为 4373/4374（静态 UI）、4375（无 HMR 的源码模块测试）、4380（生产路由）。完整浏览器初轮 **500 通过、82 失败、24 跳过**；其中 13 个测试契约失败经修复专项全部通过，69 个历史截图差异独立保留。完整 `pnpm quality` 的静态检查仍以主会话实际执行为准，不能把专项结果写成第二次全量通过。

## 原始证据与环境

本轮执行前完整复制了原 `test-results/`：

`C:/Users/75946/AppData/Local/Temp/iam-harness-quality-20260927/previous-test-results/`

该目录保留上一轮 366 通过、210 失败、24 跳过的失败截图、error-context 和 trace。上一轮实际产生 66 组截图附件：63 个 Preview 截图、2 个生产登录截图、1 个物流总览截图；此前完整环境的对应项目为 69 项，缺少的三个附件不能被当作已通过。

测试环境为 Windows、项目自带 Chromium、zh-CN、Asia/Shanghai、Light，视口为 1366×768、1440×900、1920×1080。Ego Skill 已读取，但本机 `ego-browser` 命令不可用，安装参考只支持自动安装 macOS；本次按已授权的项目 Playwright 工作流验证。

实测当前标题字体为系统 `Microsoft YaHei / MicrosoftYaHei-Bold`，正文计算值为 13px。仓库没有固定 Inter 字体文件，原 Approval 未记录浏览器/字体版本，因此跨环境字形差异不能完全排除；但本次 expected/actual 的筛选区高度、行距、侧栏宽度和字段内容均有明显变化，**不是单纯文字抗锯齿问题**。当前七个新权限页面在同一环境的批准截图通过，是反对“整批只是环境问题”的补充证据。

## U4：23 组历史视觉债务（不属于本轮系统资源授权范围）

分类：`D` 为当前 DESIGN / UX-CONTRACT 已明确的紧凑密度；`B` 为既有业务改造带来的内容/字段/动作变化；`F` 为可能叠加、但未被确认是根因的字体/环境因素；`R` 为本轮确认并修复的真实布局缺陷。

表中每一行覆盖三个标准视口。Revision 为 Approval 中的版本 → 当前 Page Contract 版本；版本失配本身已证明不能沿用旧批准结论，但不自动批准新视觉。

| 页面 / 检查来源                        | Revision     | expected → actual 的可见变化                           | 分类与处理                    |
| -------------------------------------- | ------------ | ------------------------------------------------------ | ----------------------------- |
| iam-group-profile / Preview            | 3 → 4        | 信息区与描述表整体更紧凑，区段起点上移                 | D+B；候选复核                 |
| iam-login / Preview                    | 3 → 3        | 登录控件、标题和身份路由示意节点收紧；内容语义一致     | D，F 未证实；候选复核         |
| iam-membership-management / Preview    | 4 → 15       | 筛选密度、成员操作三列排列；退役权限入口变化           | D+B；重点复核操作完整性       |
| iam-organization-management / Preview  | 2 → 6        | 树/详情分区更紧凑，描述行与操作位置收紧                | D+B；候选复核                 |
| iam-password-recovery / Preview        | 1 → 1        | 聚焦表单标题/输入/按钮纵向间距变化                     | D，F 未证实；候选复核         |
| iam-position-management / Preview      | 2 → 4        | 筛选与表格行更紧凑，岗位行序及资料展示变化             | D+B；候选复核                 |
| iam-role-assignments / Preview         | 2 → 5        | 角色上下文与成员表上移，查询区/表格密度变化            | D+B；候选复核                 |
| iam-role-management / Preview          | 2 → 7        | 行高、筛选高度和权限配置动作变化                       | D+B；重点复核退役/保留动作    |
| iam-tenant-context / Preview           | 2 → 2        | 认证上下文容器和候选 Tenant 卡片收紧                   | D，F 未证实；候选复核         |
| iam-tenant-management / Preview        | 3 → 5        | 筛选、表格行及分页收紧；字段内容仍可见                 | D+B；候选复核                 |
| platform-framework-shell / Preview     | 3 → 3        | 顶栏/侧栏、账户区、筛选和数据表一起收紧                | D；共享框架候选复核           |
| training-course-management / Preview   | 1 → 2        | 查询区和课程表行高收紧，行操作重新排布                 | D+B；候选复核                 |
| training-question-bank / Preview       | 1 → 2        | 查询与题目表更紧凑，表格整体上移                       | D+B；候选复核                 |
| training-paper-management / Preview    | 1 → 2        | 查询区、表头、数据行和分页更紧凑                       | D+B；候选复核                 |
| training-exam-configuration / Preview  | 1 → 2        | 考试配置查询和列表更紧凑                               | D+B；候选复核                 |
| training-plan-management / Preview     | 2 → 3        | 年度/常设类型筛选、常设计划数据和长期有效信息增加      | D+B；重点复核新业务内容       |
| training-plan-detail / Preview         | 1 → 2        | 常设计划、长期任务、自动纳入区和新动作替代旧年度样例   | D+B；重点复核新业务内容       |
| training-task-detail / Preview         | 1 → 2        | 长期任务、无完成期限、执行统计和新动作/说明出现        | D+B；重点复核新业务内容       |
| training-operations-overview / Preview | 2 → 3        | 统计说明、执行人次/去重员工等口径、指标数量和数据变化  | D+B+R；溢出已修复，候选复核   |
| training-employee-archives / Preview   | 2 → 3        | 执行轮次相关档案内容/样例增加，列表收紧                | D+B；重点复核新业务内容       |
| training-special-statistics / Preview  | 2 → 3        | 执行人次等指标、汇总数据与筛选布局变化                 | D+B；重点复核统计口径         |
| iam-login / Production                 | 共用登录基线 | 与 Preview 登录页相同的几何变化                        | D，F 未证实；与登录页一起复核 |
| platform-dashboard / Production        | Legacy       | 壳层收紧，运输路线图、状态区、运单表随内容宽度重新布局 | D；重点复核共享框架与图表     |

以上分组没有发现需要退回松散密度的依据。业务需求、当前实现与人工视觉批准是不同证据。对应资产是 **21 个 Preview 页面 × 3 视口，以及物流总览 Production × 3 视口**；登录 Production 与 Preview 共用 `iam-login` 三张基线。这里只记录资产影响范围，**不在本轮提出或执行基线审批**。

用户已明确本轮聚焦系统资源维护。主会话已撤回此前的视觉批准请求；没有获得更新 Preview、Approval 或基线的授权。这 69 项作为独立历史视觉债务保留，不能冒充本轮资源改造导致的回归，也不能为了全绿改视觉。

### 可快速审阅的对照图

以下 contact sheet 来自已保存的真实 expected/actual/diff，按页呈现 1366 视口；每行从左至右为旧基线、当前截图、差异图。原尺寸三视口附件保留在上方目录；对照图是评审索引，不是待覆盖基线。

- [对照 1：计划、档案、成员、框架](C:/Users/75946/AppData/Local/Temp/iam-harness-quality-20260927/comparison-stable-1.png)
- [对照 2：角色、考试、登录、概览](C:/Users/75946/AppData/Local/Temp/iam-harness-quality-20260927/comparison-stable-2.png)
- [对照 3：任务、岗位、题库、角色成员](C:/Users/75946/AppData/Local/Temp/iam-harness-quality-20260927/comparison-stable-3.png)
- [对照 4：课程、统计、集团、组织](C:/Users/75946/AppData/Local/Temp/iam-harness-quality-20260927/comparison-stable-4.png)
- [对照 5：试卷、计划详情、找回密码、Tenant 上下文](C:/Users/75946/AppData/Local/Temp/iam-harness-quality-20260927/comparison-stable-5.png)
- [对照 6：Tenant、生产登录、物流总览](C:/Users/75946/AppData/Local/Temp/iam-harness-quality-20260927/comparison-stable-6.png)

这些对照图对应本轮完整诊断的真实失败附件；逐项原尺寸路径见临时目录中的 `visual-stable-summary.json`（69 项 expected/actual/diff）。培训概览说明条另有三视口浏览器验证图：

- [培训概览修复后 1366](C:/Users/75946/AppData/Local/Temp/iam-harness-quality-20260927/overview-after-1366.png)
- [培训概览修复后 1440](C:/Users/75946/AppData/Local/Temp/iam-harness-quality-20260927/overview-after-1440.png)
- [培训概览修复后 1920](C:/Users/75946/AppData/Local/Temp/iam-harness-quality-20260927/overview-after-1920.png)

## U5 验证

测试流程：进入 `/iam/training/overview` → 检查 AppShell/AppPage 边界与纵向兜底；进入对应 Canonical Preview → 点击“当前逾期”指标 → 显示“当前逾期清单”。

- 修复前：1366 生产诊断测得 AppPage `clientWidth=1166`、`scrollWidth=1170`，Dashboard `clientWidth=1142`、`scrollWidth=1158`。专用服务上原容器检查可稳定复现失败。
- 修复后：三个标准视口的全生产路由边界用例全部通过。三个 Preview 的 document/AppPage 分别都是 `1366/1366`、`1440/1440`、`1920/1920`，无横向溢出。提示条左右 margin 仍为 16px。
- 三个 Preview 均有正确标题与内容，没有框架错误覆盖层、pageerror 或 warning/error；指标点击均切换为“当前逾期清单”。
- 证据：`containment-before.json`、`diagnostic.json`、`targeted-after.json`、`overview-browser-evidence.json`，均位于同一临时证据目录。

## U6 服务隔离与运行要求

原配置本地默认 `reuseExistingServer: true`，且多个 Preview 用例写死 4174，测试无法保证已复用服务的归属和生命周期。上一轮 4173 消失的具体进程退出原因没有进程日志，不能追溯性地声称已经证明；本轮修复的是可确认的生命周期风险。

本次最初选择的 4273/4274 检查发现属于用户另一个工程 `D:/bizProject/MTFP_Web`（PID 41684/37672），因此避开。没有停止该工程；运行中复查其两个进程仍监听。

现在：

- `tests/visual/helpers/testServers.ts` 统一四个测试服务地址；14 个 Preview 测试文件通过相同来源获取地址。
- `playwright.config.ts` 与 `playwright.production.config.ts` 均使用专用端口、`--strictPort`、`reuseExistingServer: false`，服务 stdout/stderr 可进入运行日志。冲突时立即失败，不接管或终止未知服务。
- 全量视觉测试读取 `dist/` 和 `dist-ui/` 静态产物。`pnpm quality` 和 CI 已先构建两者；单独运行视觉测试前必须先执行 `pnpm build`、`pnpm ui:build`，避免用旧产物验证新源码。
- 7 个既有浏览器模块用例需要直接导入 `/src`（5 个 HTTP、2 个 DMS）；单独用 4375 的受管源码测试服务，复用主 Vite 配置但 `hmr:false`、`watch:null`、独立缓存。其余 UI 仍用静态服务，未更改 Preview 域行为。模块专项 21 个三视口用例通过，未删减断言或增加 skip。
- 静态 Preview 不改变 Canonical Fixture/场景装载，UIDesign 没有 DEV/PROD 分支。visual 测试没有 `/reference/*` 依赖；生产 Reference 404 仍由专门的 production 路由测试覆盖。
- 普通视觉配置 `updateSnapshots: 'none'`，缺失基线也报失败。只有明确批准后的人工更新工作流才可显式使用更新命令。

本轮自管开发服务诊断中观察到其他实施工作改动 registry/培训组件触发 Vite reload，原始日志有时间戳。因此保留该轮为诊断证据，随后已用冻结的静态产物执行完整初轮，再对测试契约修复做定向复测；没有把开发服务诊断轮充当最终验收。

## 实际检查记录

| 检查                                                             | 结果                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------- |
| Premium strict audit                                             | 通过，0 findings；`premium-audit.json`                     |
| 修改范围 ESLint                                                  | 通过                                                       |
| 测试 TypeCheck                                                   | 通过                                                       |
| 培训概览全生产路由边界 + Permission unknown write 恢复（三视口） | 6 通过                                                     |
| 概览 Preview 字体/边界/交互实测（三视口）                        | 3 个视口通过，无 console/pageerror                         |
| 本轮完整视觉诊断                                                 | 501 通过、75 失败、24 跳过；69 截图差异、6 交互/上下文失败 |
| 6 个非截图失败在静态构建上的复测                                 | 16 通过、2 按原设计跳过；原 6 个失败位置全部通过           |
| 生产 / Preview Build                                             | 均通过，保留既有包体积 warning                             |
| 最终 `pnpm quality`                                              | 主会话在汇总改动后执行，结果另记                           |

`unknown write` 旧轮在 1440 的恢复跳转超时未在隔离服务专项及最终完整浏览器初轮的三个视口重现，原断言均通过；没有修改权限业务逻辑或降低断言。

静态复测使用 `static-recheck.json` / `static-recheck.log`，包含全路由边界、Tenant 图片向导、成员岗位回读、成员创建草稿恢复、组织负责人回显和培训试题/考试创建。2 个 skip 来自成员创建流程原有的仅 1440 视口策略，没有增加 skip 或放宽断言。路由实施 Agent 确认构建后只有 registry 的 permission_code 元数据规范化，没有业务执行路径变化。

最终工程质量中的历史视觉差异继续如实报告。它与系统资源声明完整性、在线授权效果各自独立；本轮不更改 Preview、Approval 或视觉基线。

## CurrentProfile 相关质量兼容

主会话将 Shell 的本人资料读取从业务 `Membership/QueryUsers` 改为无请求体的 `Auth/CurrentProfile`，本专项只调整测试证据：

- `iam-membership-query-contract.spec.ts` 两处进入业务页前的 Shell 就绪等待改为 CurrentProfile。实际 Tenant 候选与列表查询仍断言 QueryUsers，未改成自服务接口。
- `iam-login-production.spec.ts` 初始密码受限会话禁止调用集合加入 CurrentProfile，同时保留旧 QueryUsers 禁调检查。
- `dms-file-upload.spec.ts` 用户头像回显专项为 CurrentProfile 提供全部声明字段，断言 POST 且没有请求体；业务详情与编辑仍从 QueryUsers 返回对应头像，保留无 DMS Access 和无跨域 Authorization 泄露的断言。

三文件第一轮：72 通过、9 失败，其中 3 是历史登录截图差异，6 是两个已有源码模块测试在静态服务器无法导入 `/src`。随后将这 2 个 DMS 模块用例和 5 个 HTTP 模块用例移至独立、禁用 HMR/文件监视的源码测试服务，21 个三视口专项全通过。没有通过 skip、删除测试、宽松截图阈值或关闭权限断言处理失败。

证据：`current-profile-build.log`、`final-ui-build.log`、`current-profile-recheck.json`、`source-modules-recheck.json`、`production-routing-final.json`。生产路由专项 3/3 通过，包含正式构建 Reference 路由不注册。最终完整浏览器结果记录于 `visual-final.json` / `visual-final.log` / `visual-final-results/`。

### 完整初轮与定向修复结果

完整初轮运行 606 用例、耗时约 6 分钟：**500 通过、82 失败、24 跳过、0 flaky**。服务未中途退出。69 个失败为上述历史截图债务；其余 13 个失败均是测试契约/执行环境假设：

| 根因                                                            | 初轮失败 | 修复与复测                                                                                           |
| --------------------------------------------------------------- | -------: | ---------------------------------------------------------------------------------------------------- |
| 正式构建隐藏运输订单占位导航，旧测试期待可见                    |        3 | 明确断言“运输总览”可见、运输订单链接为 0；三视口通过                                                 |
| 缓存属于 AppShell 实例，旧测试用 `page.goto` 重载却期待继续复用 |        3 | 从侧栏进入角色列表，再点击真实“角色成员”SPA 入口；保留精确请求数组 `[10207, 10208]` 断言；三视口通过 |
| 治理 QueryUsers mock 将本人和目标用户都返回为 user_id=5         |        3 | 仅精确本人候选条件回退至标准会话 mock；目标用户仍为 5，精确 ButtonPage 入口断言保留；三视口通过      |
| 培训通配 mock 将无 body 的 CurrentProfile 误当分页业务请求      |        4 | 读取 body 前精确 fallback CurrentProfile，真实培训 body/分页断言保留；4 个原仅 1440 执行用例通过     |

附带检查其他通配 handler，`app-shell-content-contract.spec.ts` 同样精确 fallback CurrentProfile，防止错误形状资料 mock 掩盖正常 Shell；其三视口全部通过。`platform-framework-production.spec.ts` 的旧响应 fixture 补齐所有 CurrentProfile 声明字段，并再次三视口通过。

定向修复轮：**19 通过、8 跳过、0 失败**（`final-functional-recheck.json`）。8 个 skip 是培训合同冒烟原本只在 1440 执行的策略，没有新增 skip。未再跑第二次全量，不能据此宣称 `pnpm quality` 全绿。

CurrentProfile 三个场景在完整初轮均为 1366/1440/1920 全通过：成功加载且不查询业务用户；503 时显示登录身份并保持无 QueryUsers 回退；会话变化后丢弃旧响应。最后一项补齐响应字段后又经三视口专项通过。

[最终证据索引](C:/Users/75946/AppData/Local/Temp/iam-harness-quality-20260927/visual-final-summary.json) 记录初轮统计、全部 13 个失败到专项成功的逐项映射、9 个 CurrentProfile 场景/视口结果及 69 组 expected/actual/diff 的原尺寸路径。运行结束复查：4373/4374/4375 均由测试生命周期正常释放，用户原有 4273/4274 服务仍监听。

## U1 用户管理通信审查补充

独立片段：`docs/coordination/harness-evidence/membership-communication.json`。实际阅读 7 个指定源码并追父级/共享回调，覆盖 185 个候选、16 条通信链。两个类型文件无运行时通信。片段通过 v2 Schema 与当前 `validateCommunicationInventory` 校验；校验时片段外来源在内存中明确保留 pending，不改中央 inventory。

采用已支持 `.mjs/.cjs` 的 `discoverCommunications`、`communicationDependencies`、`communicationDependencyHash`；每个 source 绑定源码、候选集合与传递依赖哈希，各链绑定回调、请求、权威 Function 及依赖闭包。正式页面的顶层 `void load()` / 入口权限查询不属于扫描器现有 lifecycle 候选，已额外记录明确 callback 链，没有据此漏掉首屏通信。

审查明确区分：查询与本地分页；远程候选与选值草稿；租户归属草稿与最终确认；角色抽屉打开/刷新与分配/撤销写入。当前 `openUserEdit/openMemberEdit` 使用列表记录，不在打开时查询详情；独立详情操作及条件保存后回读才调用 `QueryUsers`。不能沿用旧文档的“打开编辑先刷新详情”说法。

shared/DMS 上传、目标有效权限页及其余 foundation 的候选分类由相应专项负责。这里只追必要只读依赖，不宣称依赖来源已全部人工复核或真实在线授权已验证。Shell CurrentProfile 变更完成后的最新源码已再次通过片段候选/依赖/Function 校验；后续若依赖再变，仍须复核，不能仅重签旧证据。
