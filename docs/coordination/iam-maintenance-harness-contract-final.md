# IAM 前端契约收尾与接手续办记录

> 系统资源会话已依据用户最新 harness/resume 授权接手并完成本页所列生成器收尾。下文暂停记录是历史断点，保留供追溯，不再代表当前生成器未完成状态。

## 系统资源会话续办结果

- 状态策略、Schema 2.0、模板状态继承与 rollout 已集成；rollout 文件与校验器纳入源内容哈希。生成、check、ready 均通过，99 个前端资源、94 个 Permission 模板、29 个 Package 模板、0 unresolved。
- 后端全宿主目录升级为 Schema 2.0；逐条比较 177 个 Function 定义语义完全相同后，使用正式 import 命令更新来源元数据，未重新批准或重扫通信证据。
- 清单独立报告 `runtime_activation_ready=false`、22 个 Legacy 入口和 7 个已有 V2 代码入口。六页优先切换协议的字段变更不能直接激活 V2；未修改业务页面、运行时守卫或角色授权。
- 专项新增/复用 11 个测试通过：状态混用、模板继承、未知/陈旧 Module 声明、阶段篡改/OR 补权拒绝、全登记路由分类、旧 Schema 拒绝及三个 Overview。
- 完整 Lint 通过，治理测试 91/91 通过，生产 TypeCheck 和 Build 通过。`pnpm quality` 首次在新增测试的 3 个 ESLint 问题处停止，问题修复后上述门禁独立全部通过；本轮未重跑整个浏览器/视觉套件，不称 quality 全绿、不更新视觉基线。既有对比度及构建包体警告未改。
- 资源维护 Skill 现直接消费 2.0 manifest，显式区分声明目标和只读依赖，不用旧兼容目录代替 Permission/Package 模板。

剩余在线工作是受控初始化、精确页面/按钮判权的实际迁移与普通用户允许/拒绝验收，不是继续补资源注册表。声明可维护与运行时已迁移必须继续分开报告。

---

日期：2026-09-27。工程：`D:/project/SS.Express.Web`。

> 本文件是交接断点，不是最终验收通过报告。本会话用户最后明确指令为“后续任务我交给系统资源会话处理”，因此已停止开发及执行中的子任务。本次仅整理已落盘内容，未恢复实现、测试、初始化或授权操作。

## 1. 首要注意

**生成器/Schema 已部分修改为 2.0，但现存 `artifacts/iam-maintenance.frontend.json` 仍为 1.0，当前二者尚未完成一致性验证。不得把旧产物的 `ready_for_sync=true` 当作本轮改造已通过，更不得据此自动初始化或授权。**

这些中间改动已保留，没有回滚。工作区另有之前任务的改动；不能把整个 `git diff` 都归于本轮，也不要整体重置。

## 2. 本轮已写入文件

| 文件 | 已写入内容 | 实际验证状态 |
| --- | --- | --- |
| `scripts/lib/iam-maintenance-model.mjs` | 增加 `validateDeclarationStates` / `declarationStatesReady`，分离生命周期、实现状态和运行时判权模型，校验模板继承及待迁移阻断 | 未运行 |
| `scripts/lib/iam-maintenance-manifest.mjs` | 改为 Schema 2.0；读取状态策略；登记来源 `state_source`；显式识别结构 Module；未知/陈旧声明拒绝；模板继承状态 | 未运行；尚未集成 rollout |
| `standards/schemas/iam-maintenance.frontend.schema.json` | 2.0 状态字段与策略来源；不再接受把 `implemented` 当 lifecycle | 未验证 |
| `standards/iam/resource-state-policy.json` | 登记资源规则；显式列出 DMS、IAM、IAM.TRAINING、TMS、VMS 五个结构 Module 及理由 | 未验证 |
| `standards/schemas/iam-resource-state-policy.schema.json` | 状态策略 Schema | 未验证 |
| `standards/iam/authorization-rollout.json` | 六个保留 IAM 基础页的 legacy 阶段、路由/注册表/旧判权符号/控件观察关系；禁止直接激活 | 未验证 |
| `scripts/lib/iam-authorization-rollout.mjs` | `buildAuthorizationRollout`、`validateAuthorizationRollout`；草案返回 `runtime_activation_ready=false` 及 Legacy/V2 路径 | 未运行、未集成 |
| `tests/governance/overview-resource-contract.test.mjs` | 三个 Overview 的默认 Module、可见性、排序、路由/注册一致性及 frontend-only 契约测试 | 子任务记录：6/6 通过；该文件 ESLint、Prettier、`pnpm resource-catalog:check` 通过 |

本轮未改 `src` 业务实现、注册表、中央通信审查证据、现有生成产物、Preview、审批、视觉基线、Skill 或数据库。

## 3. 已明确的契约方向

- `lifecycle`：`active / deprecated / retired`；不表达页面是否完成。
- `implementation_status`：`implemented / placeholder / pending-migration`；不表达在线授权是否生效。
- `runtime_authorization_model`：`legacy / v2 / not-applicable`；单独说明实际运行判权模型。
- 五个结构 Module 没有独立页面注册表，不应因此被误判为待迁移；必须通过显式策略声明，不能把所有未知项直接改成 active。
- 权限模板声明成熟、离线可同步、运行时可激活、数据库/普通用户已验收，是不同状态，不能互相替代。
- IAM/TMS/VMS Overview 原有实现已满足默认 Module 下的可见 Menu、`sort_order=1`；App 入口复用服务端目录排序，不需要另造排序或统计接口。

六个保留页为 `/iam/group`、`/iam/tenants`、`/iam/organizations`、`/iam/positions`、`/iam/members`、`/iam/roles`。本轮**没有**切换其运行时路由和按钮守卫。协议里的“禁止 V1/V2 OR 补权”只是约束草案，不能宣称现有混合判权实现已被消除。先前核对的 29 个已登记入口中，22 个仍为 Legacy、7 个已有 V2 代码；不能只处理六页就宣称全站已切换。

## 4. 未完成项与接手责任

| 未完成项 | 原因 / 接手动作 | 责任方 |
| --- | --- | --- |
| 状态分离的专项正反例测试、格式/Lint 检查 | 子任务在写测试前停止；需验证未知 Module、无效 lifecycle、pending 根资源、模板继承、旧 Schema 拒绝等 | 后续前端执行者 |
| rollout 专项测试、说明及 Manifest 集成 | 两个文件仅落盘；未证明其可执行，也未接入生成器/Schema/source hash | 后续前端执行者 |
| 受控 2.0 Manifest 重生成与哈希 | 生成器和 Schema 变更未验收；先审查、测试，再生成及检查，不机械更新旧产物 | 后续前端执行者 |
| 文档/CLI 状态输出对齐 | `standards/README.md` 尚有旧的 complete=false 描述；需区分离线 ready 与 runtime activation，不盲目改为全绿 | 后续前端执行者 |
| Skill 的 2.0 消费契约 | 消费者必须识别新字段及状态语义，不能沿用 lifecycle=implemented 或把 ready 当授权完成 | 系统资源会话 |
| 运行时安全切换及在线验收 | 六页及其他 Legacy 入口未迁移；需要精确页面/按钮守卫、受控 V2 初始化、普通用户允许/拒绝用例证据 | 系统资源会话协调前后端 |

不要只修改阶段字段、路由 meta 或环境开关就宣称已切换，也不要通过 V1/V2 任一命中即放行来补权。本轮没有运行全量 `pnpm quality`，没有新一轮浏览器/在线授权结果，不声称质量检查全绿；后续仍需执行适用工程门禁。视觉历史欠账与本轮资源契约问题分开记录，未经用户批准不得更新基线。

## 5. 保留产物与证据

本次交接时只读核对到的旧产物：

- Schema：`1.0`；99 个前端资源、94 个 Permission 模板、29 个 Package 模板。
- `complete=true`、`ready_for_sync=true`、`runtime_verified=false`、`database_verified=false`。这些是**旧产物字段**，不是本轮 2.0 修改的验证结果。
- `source_content_hash`：`5094d4c748d4c607f764746fad84fb2d53f60a193bc294b8441596a512fcbc51`。
- `content_hash`：`9fb0429e8b2a909335255edf73bd69a5d99b694bed182779273c7b29414bbba1`。

以下文件的本次 SHA-256 与本轮开始前记录一致，未重新人工扫描全部通信链：

| 证据 | SHA-256 |
| --- | --- |
| `standards/iam/communication-inventory.json` | `bb45da80724284b8deac61cab3b2134c97cd96af0404cbd6bc2aecefa335f0fa` |
| `standards/iam/backend-functions.snapshot.json` | `77c9247a2b1e759d733a4e5436b6a2be123b33e9fc96329a6489bd100a5ebe80` |
| `standards/iam/placeholder-evidence.json` | `97223889ba4fd6cb2d4b76326a202355e86e7607986bd5f5189ebc430d59656c` |

后续仍按实际源文件/策略哈希判断证据是否可复用；仅证据文件自身未变化不等于其所有输入永远有效。

## 6. 数据与授权边界

用户已说明旧 Resource、Permission、Package 和角色授权关联数据均已手动清理，后续为全新初始化；本交接步骤没有再读写数据库，也没有重复清理。此前仅批准 DMS/IAM/TMS/VMS 四 App 的只读核验，不等同于初始化或 SA 授权写入许可。新的在线操作及授权由系统资源会话依据其当前用户授权与核验结果安排。
